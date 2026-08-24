import { pool } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { WhatsAppService } from './whatsapp.service.js';

export interface ClienteDTO {
  id: string;
  nome: string;
  whatsapp: string;
  cpf?: string | null;
  endereco?: string | null;
  ponto_referencia?: string | null;
  limite_credito: number;
  observacoes?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export class ClienteService {
  public static async create(data: {
    nome: string;
    whatsapp: string;
    cpf?: string;
    endereco?: string;
    ponto_referencia?: string;
    limite_credito?: number;
    observacoes?: string;
    dia_vencimento?: number;
    valor_parcela_padrao?: number;
  }): Promise<ClienteDTO> {
    const formattedPhone = WhatsAppService.sanitizePhone(data.whatsapp);

    const result = await pool.query<ClienteDTO>(
      `INSERT INTO clientes (
        nome, whatsapp, cpf, endereco, ponto_referencia, limite_credito, observacoes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.nome.trim(),
        formattedPhone,
        data.cpf?.trim() || null,
        data.endereco?.trim() || null,
        data.ponto_referencia?.trim() || null,
        data.limite_credito ?? 1000.0,
        data.observacoes?.trim() || null,
      ]
    );

    // Cria automaticamente a ficha de crediário inicial zerada com os dados combinados
    const cliente = result.rows[0];
    const diaVenc = data.dia_vencimento ?? 5;
    const valorParcela = data.valor_parcela_padrao ?? 50.0;

    await pool.query(
      `INSERT INTO fichas_crediario (cliente_id, saldo_devedor_total, valor_parcela_padrao, dia_vencimento_padrao)
       VALUES ($1, 0.00, $2, $3)
       ON CONFLICT (cliente_id) DO UPDATE SET
         valor_parcela_padrao = EXCLUDED.valor_parcela_padrao,
         dia_vencimento_padrao = EXCLUDED.dia_vencimento_padrao`,
      [cliente.id, valorParcela, diaVenc]
    );

    return cliente;
  }

  public static async list(search?: string): Promise<ClienteDTO[]> {
    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      const result = await pool.query<ClienteDTO>(
        `SELECT c.*, f.saldo_devedor_total, f.valor_parcela_padrao, f.dia_vencimento_padrao, f.status_ficha
         FROM clientes c
         LEFT JOIN fichas_crediario f ON f.cliente_id = c.id
         WHERE c.ativo = true AND (c.nome ILIKE $1 OR c.whatsapp ILIKE $1 OR c.cpf ILIKE $1)
         ORDER BY c.nome ASC`,
        [term]
      );
      return result.rows;
    }

    const result = await pool.query<ClienteDTO>(
      `SELECT c.*, f.saldo_devedor_total, f.valor_parcela_padrao, f.dia_vencimento_padrao, f.status_ficha
       FROM clientes c
       LEFT JOIN fichas_crediario f ON f.cliente_id = c.id
       WHERE c.ativo = true
       ORDER BY c.nome ASC LIMIT 100`
    );
    return result.rows;
  }

  public static async getById(id: string): Promise<ClienteDTO & { ficha?: unknown; vendas: unknown[] }> {
    const clienteResult = await pool.query<ClienteDTO>(
      'SELECT * FROM clientes WHERE id = $1',
      [id]
    );

    if (clienteResult.rows.length === 0) {
      throw new AppError('Cliente não encontrado.', 404, 'CLIENTE_NOT_FOUND');
    }

    const fichaResult = await pool.query(
      'SELECT * FROM fichas_crediario WHERE cliente_id = $1',
      [id]
    );

    const vendasResult = await pool.query(
      `SELECT id, tipo_venda, forma_pagamento, valor_total, valor_entrada, valor_financiado_ficha, status_venda, created_at
       FROM vendas
       WHERE cliente_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    return {
      ...clienteResult.rows[0],
      ficha: fichaResult.rows[0] || null,
      vendas: vendasResult.rows,
    };
  }
}
