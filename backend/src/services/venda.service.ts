import { pool } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { FichaCrediarioService } from './ficha-crediario.service.js';
import { ProdutoService } from './produto.service.js';

export interface ItemVendaInput {
  produto_id?: string;
  descricao_item: string;
  quantidade: number;
  preco_unitario: number;
  tipo_item: 'ESTOQUE_LOCAL' | 'ENCOMENDA';
  fornecedor_nome?: string;
  data_previsao_chegada?: string;
}

export interface VendaInput {
  cliente_id: string;
  tipo_venda?: 'PRONTA_ENTREGA' | 'ENCOMENDA' | 'MISTA';
  forma_pagamento: 'CREDIARIO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'MISTO';
  valor_total: number;
  valor_entrada?: number;
  itens: ItemVendaInput[];
  novo_valor_parcela_negociado?: number;
  observacoes?: string;
}

export interface VendaDTO {
  id: string;
  cliente_id: string;
  cliente_nome?: string;
  tipo_venda: string;
  forma_pagamento: string;
  valor_total: number;
  valor_entrada: number;
  valor_financiado_ficha: number;
  status_venda: string;
  observacoes?: string | null;
  created_at: string;
}

export class VendaService {
  public static async create(input: VendaInput): Promise<{
    venda: VendaDTO;
    itens: unknown[];
    encomendasGeradas: number;
    fichaAtualizada?: unknown;
  }> {
    if (!input.itens || input.itens.length === 0) {
      throw new AppError('A venda deve conter ao menos um item.', 400, 'VENDA_EMPTY_ITEMS');
    }

    const valorEntrada = input.valor_entrada ?? 0.0;
    const valorFinanciado =
      input.forma_pagamento === 'CREDIARIO'
        ? input.valor_total
        : input.forma_pagamento === 'MISTO'
        ? Math.max(0, input.valor_total - valorEntrada)
        : 0.0;

    const temItensEncomenda = input.itens.some((it) => it.tipo_item === 'ENCOMENDA');
    const temItensEstoque = input.itens.some((it) => it.tipo_item === 'ESTOQUE_LOCAL');
    const tipoVendaCalculado =
      temItensEncomenda && temItensEstoque
        ? 'MISTA'
        : temItensEncomenda
        ? 'ENCOMENDA'
        : 'PRONTA_ENTREGA';

    const statusVenda = temItensEncomenda ? 'AGUARDANDO_ENCOMENDA' : 'CONCLUIDA';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Cria o registro da venda
      const vendaRes = await client.query<VendaDTO>(
        `INSERT INTO vendas (
          cliente_id, tipo_venda, forma_pagamento, valor_total,
          valor_entrada, valor_financiado_ficha, status_venda, observacoes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          input.cliente_id,
          input.tipo_venda || tipoVendaCalculado,
          input.forma_pagamento,
          input.valor_total,
          valorEntrada,
          valorFinanciado,
          statusVenda,
          input.observacoes || null,
        ]
      );

      const venda = vendaRes.rows[0];
      const itensCriados: unknown[] = [];
      let encomendasGeradas = 0;

      // 2. Cria cada item da venda, dá baixa no estoque ou cria encomenda
      for (const item of input.itens) {
        const itemRes = await client.query(
          `INSERT INTO itens_venda (
            venda_id, produto_id, descricao_item, quantidade, preco_unitario, tipo_item
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`,
          [
            venda.id,
            item.produto_id || null,
            item.descricao_item.trim(),
            item.quantidade,
            item.preco_unitario,
            item.tipo_item,
          ]
        );

        const itemCriado = itemRes.rows[0];
        itensCriados.push(itemCriado);

        if (item.tipo_item === 'ESTOQUE_LOCAL' && item.produto_id) {
          // Baixa imediata de estoque
          await client.query(
            `UPDATE produtos
             SET estoque_atual = GREATEST(0, estoque_atual - $1),
                 updated_at = NOW()
             WHERE id = $2`,
            [item.quantidade, item.produto_id]
          );
        } else if (item.tipo_item === 'ENCOMENDA') {
          // Registro na tabela de encomendas de fornecedor
          await client.query(
            `INSERT INTO encomendas (
              item_venda_id, fornecedor_nome, data_previsao_chegada, status_encomenda
            )
            VALUES ($1, $2, $3, 'SOLICITADA')`,
            [
              itemCriado.id,
              item.fornecedor_nome || 'Distribuidor Parceiro',
              item.data_previsao_chegada || null,
            ]
          );
          encomendasGeradas++;
        }
      }

      // 3. Se houver valor financiado na ficha (Crediário), processa dentro da mesma transação
      let fichaAtualizada: unknown = null;
      if (valorFinanciado > 0) {
        const ficha = await FichaCrediarioService.getOrCreateByClienteId(input.cliente_id, { client });
        const descricaoCompra = `Venda ${venda.id.substring(0, 8)} - ${input.itens.map((i) => i.descricao_item).join(', ')}`;

        const resultadoFicha = await FichaCrediarioService.adicionarCompraAoDividendo({
          fichaId: ficha.id,
          vendaId: venda.id,
          valorFinanciado,
          novoValorParcela: input.novo_valor_parcela_negociado,
          descricao: descricaoCompra,
          client,
        });

        fichaAtualizada = resultadoFicha.ficha;
      }

      // 4. Se todas as operações (venda, itens, estoque, encomendas e ficha) ocorreram com sucesso, efetua o COMMIT
      await client.query('COMMIT');

      return {
        venda,
        itens: itensCriados,
        encomendasGeradas,
        fichaAtualizada,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public static async list(filters?: {
    clienteId?: string;
    formaPagamento?: string;
    statusVenda?: string;
  }): Promise<VendaDTO[]> {
    let query = `
      SELECT v.*, c.nome as cliente_nome
      FROM vendas v
      JOIN clientes c ON c.id = v.cliente_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filters?.clienteId) {
      params.push(filters.clienteId);
      query += ` AND v.cliente_id = $${params.length}`;
    }

    if (filters?.formaPagamento) {
      params.push(filters.formaPagamento);
      query += ` AND v.forma_pagamento = $${params.length}`;
    }

    if (filters?.statusVenda) {
      params.push(filters.statusVenda);
      query += ` AND v.status_venda = $${params.length}`;
    }

    query += ' ORDER BY v.created_at DESC LIMIT 100';

    const result = await pool.query<VendaDTO>(query, params);
    return result.rows;
  }

  public static async getById(id: string): Promise<VendaDTO & { itens: unknown[]; encomendas: unknown[] }> {
    const vendaRes = await pool.query<VendaDTO>(
      `SELECT v.*, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp
       FROM vendas v
       JOIN clientes c ON c.id = v.cliente_id
       WHERE v.id = $1`,
      [id]
    );

    if (vendaRes.rows.length === 0) {
      throw new AppError('Venda não encontrada.', 404, 'VENDA_NOT_FOUND');
    }

    const itensRes = await pool.query(
      `SELECT iv.*, p.nome as produto_nome, p.codigo_sku
       FROM itens_venda iv
       LEFT JOIN produtos p ON p.id = iv.produto_id
       WHERE iv.venda_id = $1`,
      [id]
    );

    const encomendasRes = await pool.query(
      `SELECT e.*, iv.descricao_item
       FROM encomendas e
       JOIN itens_venda iv ON iv.id = e.item_venda_id
       WHERE iv.venda_id = $1`,
      [id]
    );

    return {
      ...vendaRes.rows[0],
      itens: itensRes.rows,
      encomendas: encomendasRes.rows,
    };
  }
}
