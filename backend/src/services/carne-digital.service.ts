import { pool } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';

export interface CarneDigitalDTO {
  cliente_nome: string;
  cliente_whatsapp: string;
  saldo_devedor_total: number;
  valor_parcela_padrao: number;
  dia_vencimento_padrao: number;
  status_ficha: string;
  chave_pix: string;
  nome_titular_pix: string;
  nome_loja: string;
  parcelas: Array<{
    id: string;
    numero_parcela: number;
    valor_parcela: number;
    data_vencimento: string;
    data_pagamento?: string | null;
    valor_pago: number;
    status: string;
  }>;
  vendas: Array<{
    id: string;
    valor_total: number;
    forma_pagamento: string;
    created_at: string;
  }>;
}

export class CarneDigitalService {
  /**
   * Obtém os dados completos do carnê a partir do ID da ficha ou ID do cliente
   */
  public static async getCarneByTokenOrId(identifier: string): Promise<CarneDigitalDTO> {
    const fichaRes = await pool.query(
      `SELECT f.*, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp, c.id as cliente_id
       FROM fichas_crediario f
       JOIN clientes c ON c.id = f.cliente_id
       WHERE f.id::text = $1 OR c.id::text = $1`,
      [identifier]
    );

    if (fichaRes.rows.length === 0) {
      throw new AppError('Carnê digital não encontrado.', 404, 'CARNE_NOT_FOUND');
    }

    const ficha = fichaRes.rows[0];

    // Busca configurações Pix da loja
    const configRes = await pool.query('SELECT chave_pix, nome_titular_pix, nome_loja FROM configuracoes LIMIT 1');
    const config = configRes.rows[0] || {
      chave_pix: '18991234567',
      nome_titular_pix: 'Enxovais Gabriel',
      nome_loja: 'Enxovais Gabriel',
    };

    // Busca parcelas da ficha
    const parcelasRes = await pool.query(
      `SELECT id, numero_parcela, valor_parcela, data_vencimento, data_pagamento, valor_pago, status
       FROM parcelas_crediario
       WHERE ficha_id = $1
       ORDER BY data_vencimento ASC, numero_parcela ASC`,
      [ficha.id]
    );

    // Busca histórico de vendas
    const vendasRes = await pool.query(
      `SELECT id, valor_total, forma_pagamento, created_at
       FROM vendas
       WHERE cliente_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [ficha.cliente_id]
    );

    return {
      cliente_nome: ficha.cliente_nome,
      cliente_whatsapp: ficha.cliente_whatsapp,
      saldo_devedor_total: Number(ficha.saldo_devedor_total),
      valor_parcela_padrao: Number(ficha.valor_parcela_padrao),
      dia_vencimento_padrao: Number(ficha.dia_vencimento_padrao),
      status_ficha: ficha.status_ficha,
      chave_pix: config.chave_pix,
      nome_titular_pix: config.nome_titular_pix,
      nome_loja: config.nome_loja,
      parcelas: parcelasRes.rows.map((p) => ({
        ...p,
        valor_parcela: Number(p.valor_parcela),
        valor_pago: Number(p.valor_pago || 0),
      })),
      vendas: vendasRes.rows.map((v) => ({
        ...v,
        valor_total: Number(v.valor_total),
      })),
    };
  }
}
