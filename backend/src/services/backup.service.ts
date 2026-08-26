import { pool } from '../config/database.js';

export interface BackupPayload {
  data_geracao: string;
  versao_schema: string;
  estatisticas: {
    total_clientes: number;
    total_produtos: number;
    total_fichas: number;
    total_vendas: number;
    total_parcelas: number;
  };
  dados: {
    clientes: unknown[];
    fichas_crediario: unknown[];
    parcelas_crediario: unknown[];
    produtos: unknown[];
    vendas: unknown[];
    itens_venda: unknown[];
    movimentacoes_ficha: unknown[];
    configuracoes: unknown[];
  };
}

export class BackupService {
  /**
   * Gera um dump consolidado de todas as tabelas em formato JSON estruturado
   */
  public static async gerarBackupCompleto(): Promise<BackupPayload> {
    const clientesRes = await pool.query('SELECT * FROM clientes ORDER BY created_at ASC');
    const fichasRes = await pool.query('SELECT * FROM fichas_crediario ORDER BY created_at ASC');
    const parcelasRes = await pool.query('SELECT * FROM parcelas_crediario ORDER BY created_at ASC');
    const produtosRes = await pool.query('SELECT * FROM produtos ORDER BY created_at ASC');
    const vendasRes = await pool.query('SELECT * FROM vendas ORDER BY created_at ASC');
    const itensRes = await pool.query('SELECT * FROM itens_venda ORDER BY created_at ASC');
    const movRes = await pool.query('SELECT * FROM movimentacoes_ficha ORDER BY created_at ASC');
    const configRes = await pool.query('SELECT * FROM configuracoes LIMIT 1');

    return {
      data_geracao: new Date().toISOString(),
      versao_schema: '1.0.0',
      estatisticas: {
        total_clientes: clientesRes.rows.length,
        total_produtos: produtosRes.rows.length,
        total_fichas: fichasRes.rows.length,
        total_vendas: vendasRes.rows.length,
        total_parcelas: parcelasRes.rows.length,
      },
      dados: {
        clientes: clientesRes.rows,
        fichas_crediario: fichasRes.rows,
        parcelas_crediario: parcelasRes.rows,
        produtos: produtosRes.rows,
        vendas: vendasRes.rows,
        itens_venda: itensRes.rows,
        movimentacoes_ficha: movRes.rows,
        configuracoes: configRes.rows,
      },
    };
  }
}
