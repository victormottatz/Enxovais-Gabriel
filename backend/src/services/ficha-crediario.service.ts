import { pool } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';

export interface FichaCrediarioDTO {
  id: string;
  cliente_id: string;
  cliente_nome?: string;
  cliente_whatsapp?: string;
  saldo_devedor_total: number;
  valor_parcela_padrao: number;
  dia_vencimento_padrao: number;
  tipo_ciclo: 'MENSAL_PAGAMENTO' | 'QUINZENAL_VALE';
  dia_vale_secundario?: number | null;
  status_ficha: 'ATIVO' | 'BLOQUEADO' | 'QUITADO';
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParcelaDTO {
  id: string;
  ficha_id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento?: string | null;
  valor_pago: number;
  status: 'PENDENTE' | 'PAGO_TOTAL' | 'PAGO_PARCIAL' | 'ATRASADO' | 'CANCELADO';
}

export interface MovimentacaoFichaDTO {
  id: string;
  ficha_id: string;
  venda_id?: string | null;
  tipo_movimentacao: 'DEBITO_COMPRA' | 'CREDITO_PAGAMENTO' | 'AJUSTE_PARCELA' | 'ESTORNO';
  valor: number;
  saldo_anterior: number;
  saldo_posterior: number;
  descricao: string;
  created_at: string;
}

export class FichaCrediarioService {
  /**
   * Obtém a ficha do cliente ou cria uma nova caso não exista.
   */
  public static async getOrCreateByClienteId(
    clienteId: string,
    options?: {
      valorParcelaPadrao?: number;
      diaVencimentoPadrao?: number;
      tipoCiclo?: 'MENSAL_PAGAMENTO' | 'QUINZENAL_VALE';
      diaValeSecundario?: number;
    }
  ): Promise<FichaCrediarioDTO> {
    const existing = await pool.query<FichaCrediarioDTO>(
      `SELECT f.*, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp
       FROM fichas_crediario f
       JOIN clientes c ON c.id = f.cliente_id
       WHERE f.cliente_id = $1`,
      [clienteId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const valorParcela = options?.valorParcelaPadrao ?? 100.0;
    const diaVencimento = options?.diaVencimentoPadrao ?? 5;
    const tipoCiclo = options?.tipoCiclo ?? 'MENSAL_PAGAMENTO';
    const diaVale = options?.diaValeSecundario ?? null;

    const inserted = await pool.query<FichaCrediarioDTO>(
      `INSERT INTO fichas_crediario (
        cliente_id, saldo_devedor_total, valor_parcela_padrao, 
        dia_vencimento_padrao, tipo_ciclo, dia_vale_secundario, status_ficha
      )
      VALUES ($1, 0.00, $2, $3, $4, $5, 'ATIVO')
      RETURNING *`,
      [clienteId, valorParcela, diaVencimento, tipoCiclo, diaVale]
    );

    return inserted.rows[0];
  }

  /**
   * Adiciona um débito de nova compra ao dividendo acumulado da ficha.
   * Mantém o valor da parcela acordada, recalculando o cronograma de parcelas futuras.
   */
  public static async adicionarCompraAoDividendo(params: {
    fichaId: string;
    vendaId: string;
    valorFinanciado: number;
    novoValorParcela?: number;
    descricao?: string;
  }): Promise<{ ficha: FichaCrediarioDTO; parcelasGeradas: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fichaRes = await client.query<FichaCrediarioDTO>(
        'SELECT * FROM fichas_crediario WHERE id = $1 FOR UPDATE',
        [params.fichaId]
      );

      if (fichaRes.rows.length === 0) {
        throw new AppError('Ficha de crediário não encontrada.', 404, 'FICHA_NOT_FOUND');
      }

      const fichaAtual = fichaRes.rows[0];
      const saldoAnterior = Number(fichaAtual.saldo_devedor_total);
      const novoSaldo = saldoAnterior + Number(params.valorFinanciado);
      const valorParcela = params.novoValorParcela ?? Number(fichaAtual.valor_parcela_padrao);

      // 1. Atualiza o saldo total e o valor da parcela se renegociado
      const updatedFichaRes = await client.query<FichaCrediarioDTO>(
        `UPDATE fichas_crediario
         SET saldo_devedor_total = $1,
             valor_parcela_padrao = $2,
             status_ficha = 'ATIVO',
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [novoSaldo, valorParcela, params.fichaId]
      );

      // 2. Registra a movimentação no extrato
      await client.query(
        `INSERT INTO movimentacoes_ficha (
          ficha_id, venda_id, tipo_movimentacao, valor,
          saldo_anterior, saldo_posterior, descricao
        )
        VALUES ($1, $2, 'DEBITO_COMPRA', $3, $4, $5, $6)`,
        [
          params.fichaId,
          params.vendaId,
          params.valorFinanciado,
          saldoAnterior,
          novoSaldo,
          params.descricao || 'Nova compra lançada no crediário',
        ]
      );

      // 3. Recalcula e sincroniza as parcelas pendentes com base no saldo e dia de vencimento
      const parcelasGeradas = await this.sincronizarParcelas(
        client,
        params.fichaId,
        novoSaldo,
        valorParcela,
        fichaAtual.dia_vencimento_padrao
      );

      await client.query('COMMIT');
      return { ficha: updatedFichaRes.rows[0], parcelasGeradas };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Registra o pagamento / amortização de valor na ficha do cliente.
   */
  public static async registrarPagamento(params: {
    fichaId: string;
    valorPago: number;
    descricao?: string;
  }): Promise<{ ficha: FichaCrediarioDTO; saldoRestante: number; recibo: string }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fichaRes = await client.query<FichaCrediarioDTO>(
        `SELECT f.*, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp
         FROM fichas_crediario f
         JOIN clientes c ON c.id = f.cliente_id
         WHERE f.id = $1 FOR UPDATE`,
        [params.fichaId]
      );

      if (fichaRes.rows.length === 0) {
        throw new AppError('Ficha de crediário não encontrada.', 404, 'FICHA_NOT_FOUND');
      }

      const ficha = fichaRes.rows[0];
      const saldoAnterior = Number(ficha.saldo_devedor_total);
      const valorAbatido = Math.min(Number(params.valorPago), saldoAnterior);
      const saldoPosterior = Math.max(0, saldoAnterior - valorAbatido);
      const novoStatus = saldoPosterior === 0 ? 'QUITADO' : 'ATIVO';

      // 1. Atualiza ficha
      const updatedFicha = await client.query<FichaCrediarioDTO>(
        `UPDATE fichas_crediario
         SET saldo_devedor_total = $1,
             status_ficha = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [saldoPosterior, novoStatus, params.fichaId]
      );

      // 2. Registra movimentação de crédito
      await client.query(
        `INSERT INTO movimentacoes_ficha (
          ficha_id, tipo_movimentacao, valor,
          saldo_anterior, saldo_posterior, descricao
        )
        VALUES ($1, 'CREDITO_PAGAMENTO', $2, $3, $4, $5)`,
        [
          params.fichaId,
          valorAbatido,
          saldoAnterior,
          saldoPosterior,
          params.descricao || 'Pagamento / Amortização recebida',
        ]
      );

      // 3. Dá baixa sequencial nas parcelas em aberto
      let valorRestanteParaAbater = valorAbatido;
      const parcelasAbertas = await client.query<ParcelaDTO>(
        `SELECT * FROM parcelas_crediario
         WHERE ficha_id = $1 AND status IN ('PENDENTE', 'PAGO_PARCIAL', 'ATRASADO')
         ORDER BY data_vencimento ASC`,
        [params.fichaId]
      );

      for (const parcela of parcelasAbertas.rows) {
        if (valorRestanteParaAbater <= 0) break;

        const valorDevidoParcela = Number(parcela.valor_parcela) - Number(parcela.valor_pago);

        if (valorRestanteParaAbater >= valorDevidoParcela) {
          // Quita totalmente esta parcela
          await client.query(
            `UPDATE parcelas_crediario
             SET valor_pago = valor_parcela,
                 data_pagamento = CURRENT_DATE,
                 status = 'PAGO_TOTAL',
                 updated_at = NOW()
             WHERE id = $1`,
            [parcela.id]
          );
          valorRestanteParaAbater -= valorDevidoParcela;
        } else {
          // Quita parcialmente
          const novoValorPago = Number(parcela.valor_pago) + valorRestanteParaAbater;
          await client.query(
            `UPDATE parcelas_crediario
             SET valor_pago = $1,
                 status = 'PAGO_PARCIAL',
                 updated_at = NOW()
             WHERE id = $2`,
            [novoValorPago, parcela.id]
          );
          valorRestanteParaAbater = 0;
        }
      }

      await client.query('COMMIT');

      const recibo = `Recibo confirmado para ${ficha.cliente_nome}. Valor recebido: R$ ${valorAbatido.toFixed(2)}. Saldo restante na ficha: R$ ${saldoPosterior.toFixed(2)}.`;

      return {
        ficha: updatedFicha.rows[0],
        saldoRestante: saldoPosterior,
        recibo,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Lista fichas de clientes filtrando por vencimento (dia do pagamento ou dia do vale).
   */
  public static async listFichas(filters?: {
    diaVencimento?: number;
    statusFicha?: string;
    search?: string;
  }): Promise<FichaCrediarioDTO[]> {
    let query = `
      SELECT f.*, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp
      FROM fichas_crediario f
      JOIN clientes c ON c.id = f.cliente_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filters?.diaVencimento) {
      params.push(filters.diaVencimento);
      query += ` AND (f.dia_vencimento_padrao = $${params.length} OR f.dia_vale_secundario = $${params.length})`;
    }

    if (filters?.statusFicha) {
      params.push(filters.statusFicha);
      query += ` AND f.status_ficha = $${params.length}`;
    }

    if (filters?.search && filters.search.trim().length > 0) {
      params.push(`%${filters.search.trim()}%`);
      query += ` AND (c.nome ILIKE $${params.length} OR c.whatsapp ILIKE $${params.length})`;
    }

    query += ' ORDER BY f.saldo_devedor_total DESC, c.nome ASC';

    const result = await pool.query<FichaCrediarioDTO>(query, params);
    return result.rows;
  }

  /**
   * Obtém detalhes completos da ficha: dados, parcelas e extrato de movimentações.
   */
  public static async getFichaDetalhada(id: string): Promise<{
    ficha: FichaCrediarioDTO;
    parcelas: ParcelaDTO[];
    movimentacoes: MovimentacaoFichaDTO[];
  }> {
    const fichaRes = await pool.query<FichaCrediarioDTO>(
      `SELECT f.*, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp, c.cpf as cliente_cpf
       FROM fichas_crediario f
       JOIN clientes c ON c.id = f.cliente_id
       WHERE f.id = $1 OR f.cliente_id = $1
       LIMIT 1`,
      [id]
    );

    if (fichaRes.rows.length === 0) {
      throw new AppError('Ficha de crediário não encontrada.', 404, 'FICHA_NOT_FOUND');
    }

    const ficha = fichaRes.rows[0];

    const parcelasRes = await pool.query<ParcelaDTO>(
      `SELECT * FROM parcelas_crediario
       WHERE ficha_id = $1
       ORDER BY data_vencimento ASC`,
      [ficha.id]
    );

    const movRes = await pool.query<MovimentacaoFichaDTO>(
      `SELECT * FROM movimentacoes_ficha
       WHERE ficha_id = $1
       ORDER BY created_at DESC`,
      [ficha.id]
    );

    return {
      ficha,
      parcelas: parcelasRes.rows,
      movimentacoes: movRes.rows,
    };
  }

  /**
   * Helper interno para gerar ou ajustar o cronograma de parcelas com base no saldo devedor.
   */
  private static async sincronizarParcelas(
    client: any,
    fichaId: string,
    saldoDevedorTotal: number,
    valorParcelaPadrao: number,
    diaVencimentoPadrao: number
  ): Promise<number> {
    // Remove parcelas pendentes futuras não pagas para reconstruir o cronograma limpo
    await client.query(
      `DELETE FROM parcelas_crediario
       WHERE ficha_id = $1 AND status = 'PENDENTE' AND valor_pago = 0`,
      [fichaId]
    );

    if (saldoDevedorTotal <= 0) {
      return 0;
    }

    const qtdParcelas = Math.ceil(saldoDevedorTotal / valorParcelaPadrao);
    const hoje = new Date();
    let parcelasCriadas = 0;

    for (let i = 1; i <= qtdParcelas; i++) {
      const dataVenc = new Date(hoje.getFullYear(), hoje.getMonth() + i, diaVencimentoPadrao);
      const valorDestaParcela =
        i === qtdParcelas
          ? saldoDevedorTotal - (qtdParcelas - 1) * valorParcelaPadrao
          : valorParcelaPadrao;

      await client.query(
        `INSERT INTO parcelas_crediario (
          ficha_id, numero_parcela, valor_parcela, data_vencimento, status
        )
        VALUES ($1, $2, $3, $4, 'PENDENTE')`,
        [fichaId, i, valorDestaParcela, dataVenc.toISOString().split('T')[0]]
      );
      parcelasCriadas++;
    }

    return parcelasCriadas;
  }
}
