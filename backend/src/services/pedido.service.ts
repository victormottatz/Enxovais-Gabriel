import { pool } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ConfiguracaoService } from './configuracao.service.js';
import { MessageTemplateService } from './message-template.service.js';
import { WhatsAppQueue } from '../queues/whatsapp.queue.js';
import { v4 as uuidv4 } from 'uuid';

export interface PedidoDTO {
  id: string;
  cliente_id: string;
  cliente_nome?: string;
  cliente_whatsapp?: string;
  descricao_itens: string;
  data_pedido: string;
  data_previsao_entrega: string;
  valor_total: string | number;
  valor_sinal: string | number;
  valor_restante: string | number;
  status_producao: 'FILA' | 'EM_PRODUCAO' | 'PRONTO_ENTREGA' | 'ENTREGUE';
  status_pagamento: 'AGUARDANDO_SINAL' | 'SINAL_PAGO' | 'PAGO_INTEGRAL';
  notificacao_boas_vindas_enviada: boolean;
  notificacao_pronto_enviada: boolean;
  foto_referencia_url?: string | null;
  created_at: string;
  updated_at: string;
}

export class PedidoService {
  /**
   * Cria um novo pedido e enfileira confirmação de boas-vindas
   */
  public static async create(data: {
    cliente_id: string;
    descricao_itens: string;
    data_previsao_entrega: string;
    valor_total: number;
    valor_sinal?: number;
    foto_referencia_url?: string;
  }): Promise<PedidoDTO> {
    const valorSinal = data.valor_sinal || 0;
    const statusPagamento = valorSinal > 0 ? 'SINAL_PAGO' : 'AGUARDANDO_SINAL';

    const result = await pool.query<PedidoDTO>(
      `INSERT INTO pedidos (
        cliente_id, descricao_itens, data_previsao_entrega, valor_total, valor_sinal, status_pagamento, foto_referencia_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.cliente_id,
        data.descricao_itens.trim(),
        data.data_previsao_entrega,
        data.valor_total,
        valorSinal,
        statusPagamento,
        data.foto_referencia_url || null,
      ]
    );

    const novoPedido = result.rows[0];

    // Agenda o envio de boas-vindas na fila
    this.enqueueBoasVindas(novoPedido.id, data.cliente_id).catch((err) =>
      console.error('Erro ao enfileirar boas-vindas:', err)
    );

    return novoPedido;
  }

  /**
   * Lista pedidos com suporte a filtros
   */
  public static async list(filters?: {
    status_producao?: string;
    apenasSemana?: boolean;
  }): Promise<PedidoDTO[]> {
    let query = `
      SELECT 
        p.*,
        c.nome as cliente_nome,
        c.whatsapp as cliente_whatsapp
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (filters?.status_producao) {
      params.push(filters.status_producao);
      query += ` AND p.status_producao = $${params.length}`;
    }

    if (filters?.apenasSemana) {
      query += ` AND p.status_producao != 'ENTREGUE' AND p.data_previsao_entrega <= (CURRENT_DATE + INTERVAL '14 days')`;
    }

    query += ` ORDER BY p.data_previsao_entrega ASC, p.created_at DESC`;

    const result = await pool.query<PedidoDTO>(query, params);
    return result.rows;
  }

  /**
   * Atualiza o status de produção e dispara ações de 1 clique
   */
  public static async updateStatus(
    id: string,
    novoStatus: 'FILA' | 'EM_PRODUCAO' | 'PRONTO_ENTREGA' | 'ENTREGUE'
  ): Promise<PedidoDTO> {
    const current = await pool.query<PedidoDTO>(
      `SELECT p.*, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp
       FROM pedidos p
       JOIN clientes c ON c.id = p.cliente_id
       WHERE p.id = $1`,
      [id]
    );

    if (current.rows.length === 0) {
      throw new AppError('Pedido não encontrado.', 404, 'PEDIDO_NOT_FOUND');
    }

    const pedido = current.rows[0];
    let novoStatusPagamento = pedido.status_pagamento;

    if (novoStatus === 'ENTREGUE') {
      novoStatusPagamento = 'PAGO_INTEGRAL';
    }

    const result = await pool.query<PedidoDTO>(
      `UPDATE pedidos
       SET status_producao = $1,
           status_pagamento = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [novoStatus, novoStatusPagamento, id]
    );

    const pedidoAtualizado = result.rows[0];

    // Se mudou para PRONTO_ENTREGA e ainda não foi notificado
    if (novoStatus === 'PRONTO_ENTREGA' && !pedido.notificacao_pronto_enviada) {
      this.enqueueProntoPix(pedido).catch((err) =>
        console.error('Erro ao enfileirar cobrança Pix:', err)
      );
    }

    return pedidoAtualizado;
  }

  /**
   * Enfileira disparo de boas-vindas com template renderizado
   */
  private static async enqueueBoasVindas(pedidoId: string, clienteId: string): Promise<void> {
    const config = await ConfiguracaoService.get();
    const clienteRes = await pool.query('SELECT nome, whatsapp FROM clientes WHERE id = $1', [clienteId]);
    const pedidoRes = await pool.query('SELECT * FROM pedidos WHERE id = $1', [pedidoId]);

    if (clienteRes.rows.length === 0 || pedidoRes.rows.length === 0) return;

    const cliente = clienteRes.rows[0];
    const pedido = pedidoRes.rows[0];

    const mensagemFormatada = MessageTemplateService.render(config.template_boas_vindas, {
      nome_cliente: cliente.nome,
      descricao_itens: pedido.descricao_itens,
      data_previsao_entrega: pedido.data_previsao_entrega,
      valor_total: pedido.valor_total,
      valor_sinal: pedido.valor_sinal,
      nome_atelie: config.nome_atelie,
    });

    WhatsAppQueue.enqueue({
      id: uuidv4(),
      phone: cliente.whatsapp,
      message: mensagemFormatada,
      pedidoId,
      tipoMensagem: 'BOAS_VINDAS',
      onSuccess: async () => {
        await pool.query('UPDATE pedidos SET notificacao_boas_vindas_enviada = TRUE WHERE id = $1', [pedidoId]);
      },
    });
  }

  /**
   * Enfileira disparo de pedido pronto + chave Pix Copia e Cola
   */
  private static async enqueueProntoPix(pedido: PedidoDTO): Promise<void> {
    const config = await ConfiguracaoService.get();

    const mensagemFormatada = MessageTemplateService.render(config.template_cobranca_pix, {
      nome_cliente: pedido.cliente_nome,
      descricao_itens: pedido.descricao_itens,
      valor_restante: pedido.valor_restante,
      chave_pix: config.chave_pix,
      nome_titular_pix: config.nome_titular_pix,
      nome_atelie: config.nome_atelie,
    });

    WhatsAppQueue.enqueue({
      id: uuidv4(),
      phone: pedido.cliente_whatsapp!,
      message: mensagemFormatada,
      pedidoId: pedido.id,
      tipoMensagem: 'PEDIDO_PRONTO_PIX',
      onSuccess: async () => {
        await pool.query('UPDATE pedidos SET notificacao_pronto_enviada = TRUE WHERE id = $1', [pedido.id]);
      },
    });
  }
}
