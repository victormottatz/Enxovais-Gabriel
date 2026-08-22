import { pool } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';

export interface ProdutoDTO {
  id: string;
  codigo_sku?: string | null;
  nome: string;
  descricao?: string | null;
  categoria: 'CAMA_MESA_BANHO' | 'COZINHA' | 'DECORACAO' | 'ORGANIZACAO' | 'OUTROS';
  preco_custo: number;
  preco_venda_vista: number;
  preco_venda_crediario: number;
  estoque_atual: number;
  estoque_minimo: number;
  permite_encomenda: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export class ProdutoService {
  public static async create(data: {
    codigo_sku?: string;
    nome: string;
    descricao?: string;
    categoria?: 'CAMA_MESA_BANHO' | 'COZINHA' | 'DECORACAO' | 'ORGANIZACAO' | 'OUTROS';
    preco_custo?: number;
    preco_venda_vista: number;
    preco_venda_crediario: number;
    estoque_atual?: number;
    estoque_minimo?: number;
    permite_encomenda?: boolean;
  }): Promise<ProdutoDTO> {
    const result = await pool.query<ProdutoDTO>(
      `INSERT INTO produtos (
        codigo_sku, nome, descricao, categoria, preco_custo, 
        preco_venda_vista, preco_venda_crediario, estoque_atual, 
        estoque_minimo, permite_encomenda
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.codigo_sku?.trim() || null,
        data.nome.trim(),
        data.descricao?.trim() || null,
        data.categoria || 'OUTROS',
        data.preco_custo ?? 0.0,
        data.preco_venda_vista,
        data.preco_venda_crediario,
        data.estoque_atual ?? 0,
        data.estoque_minimo ?? 2,
        data.permite_encomenda ?? true,
      ]
    );

    return result.rows[0];
  }

  public static async list(filters?: {
    search?: string;
    categoria?: string;
    apenasEmEstoque?: boolean;
  }): Promise<ProdutoDTO[]> {
    let query = 'SELECT * FROM produtos WHERE ativo = true';
    const params: (string | number | boolean)[] = [];

    if (filters?.search && filters.search.trim().length > 0) {
      params.push(`%${filters.search.trim()}%`);
      query += ` AND (nome ILIKE $${params.length} OR codigo_sku ILIKE $${params.length})`;
    }

    if (filters?.categoria && filters.categoria.trim().length > 0) {
      params.push(filters.categoria.trim());
      query += ` AND categoria = $${params.length}`;
    }

    if (filters?.apenasEmEstoque) {
      query += ' AND estoque_atual > 0';
    }

    query += ' ORDER BY nome ASC';

    const result = await pool.query<ProdutoDTO>(query, params);
    return result.rows;
  }

  public static async getById(id: string): Promise<ProdutoDTO> {
    const result = await pool.query<ProdutoDTO>(
      'SELECT * FROM produtos WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Produto não encontrado.', 404, 'PRODUTO_NOT_FOUND');
    }

    return result.rows[0];
  }

  public static async updateEstoque(id: string, quantidadeDelta: number): Promise<ProdutoDTO> {
    const result = await pool.query<ProdutoDTO>(
      `UPDATE produtos 
       SET estoque_atual = GREATEST(0, estoque_atual + $1),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [quantidadeDelta, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Produto não encontrado.', 404, 'PRODUTO_NOT_FOUND');
    }

    return result.rows[0];
  }
}
