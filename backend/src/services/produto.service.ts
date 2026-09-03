import { pool } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';

export interface ProdutoDTO {
  id: string;
  codigo_sku?: string | null;
  nome: string;
  descricao?: string | null;
  categoria: 'CAMA_MESA_BANHO' | 'COZINHA' | 'DECORACAO' | 'ORGANIZACAO' | 'OUTROS' | string;
  preco_custo: number;
  preco_venda_vista: number;
  preco_venda_crediario: number;
  estoque_atual: number;
  estoque_minimo: number;
  permite_encomenda: boolean;
  foto_url?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export class ProdutoService {
  public static async create(data: {
    codigo_sku?: string | null;
    nome: string;
    descricao?: string | null;
    categoria?: 'CAMA_MESA_BANHO' | 'COZINHA' | 'DECORACAO' | 'ORGANIZACAO' | 'OUTROS' | string;
    preco_custo?: number;
    preco_venda_vista: number;
    preco_venda_crediario: number;
    estoque_atual?: number;
    estoque_minimo?: number;
    permite_encomenda?: boolean;
    foto_url?: string | null;
  }): Promise<ProdutoDTO> {
    const precoCusto = data.preco_custo ?? 0.0;
    if (precoCusto > 0 && data.preco_venda_vista < precoCusto) {
      throw new AppError('Regra Comercial: O preço de venda à vista não pode ser inferior ao preço de custo.', 400, 'PRECO_ABAIXO_DO_CUSTO');
    }

    const result = await pool.query<ProdutoDTO>(
      `INSERT INTO produtos (
        codigo_sku, nome, descricao, categoria, preco_custo, 
        preco_venda_vista, preco_venda_crediario, estoque_atual, 
        estoque_minimo, permite_encomenda, foto_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        data.foto_url?.trim() || null,
      ]
    );

    return result.rows[0];
  }

  public static async update(
    id: string,
    data: {
      nome?: string;
      descricao?: string | null;
      categoria?: 'CAMA_MESA_BANHO' | 'COZINHA' | 'DECORACAO' | 'ORGANIZACAO' | 'OUTROS' | string;
      preco_custo?: number;
      preco_venda_vista?: number;
      preco_venda_crediario?: number;
      estoque_atual?: number;
      estoque_minimo?: number;
      permite_encomenda?: boolean;
      foto_url?: string | null;
    }
  ): Promise<ProdutoDTO> {
    // Busca o produto atual para manter dados não alterados
    const atual = await this.getById(id);

    const nome = data.nome !== undefined ? data.nome.trim() : atual.nome;
    const descricao = data.descricao !== undefined ? (data.descricao ? data.descricao.trim() : null) : atual.descricao;
    const categoria = data.categoria !== undefined ? data.categoria : atual.categoria;
    const preco_custo = data.preco_custo !== undefined ? data.preco_custo : atual.preco_custo;
    const preco_venda_vista = data.preco_venda_vista !== undefined ? data.preco_venda_vista : atual.preco_venda_vista;
    const preco_venda_crediario = data.preco_venda_crediario !== undefined ? data.preco_venda_crediario : atual.preco_venda_crediario;
    const estoque_atual = data.estoque_atual !== undefined ? data.estoque_atual : atual.estoque_atual;
    const estoque_minimo = data.estoque_minimo !== undefined ? data.estoque_minimo : atual.estoque_minimo;
    const permite_encomenda = data.permite_encomenda !== undefined ? data.permite_encomenda : atual.permite_encomenda;
    const foto_url = data.foto_url !== undefined ? (data.foto_url ? data.foto_url.trim() : null) : atual.foto_url;

    if (preco_custo > 0 && preco_venda_vista < preco_custo) {
      throw new AppError('Regra Comercial: O preço de venda à vista não pode ser inferior ao preço de custo.', 400, 'PRECO_ABAIXO_DO_CUSTO');
    }

    const result = await pool.query<ProdutoDTO>(
      `UPDATE produtos
       SET nome = $1,
           descricao = $2,
           categoria = $3,
           preco_custo = $4,
           preco_venda_vista = $5,
           preco_venda_crediario = $6,
           estoque_atual = $7,
           estoque_minimo = $8,
           permite_encomenda = $9,
           foto_url = $10,
           updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        nome,
        descricao,
        categoria,
        preco_custo,
        preco_venda_vista,
        preco_venda_crediario,
        estoque_atual,
        estoque_minimo,
        permite_encomenda,
        foto_url,
        id,
      ]
    );

    if (result.rows.length === 0) {
      throw new AppError('Produto não encontrado.', 404, 'PRODUTO_NOT_FOUND');
    }

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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      throw new AppError('Produto não encontrado.', 404, 'PRODUTO_NOT_FOUND');
    }

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

  public static async delete(id: string): Promise<void> {
    const result = await pool.query(
      `UPDATE produtos
       SET ativo = false, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Produto não encontrado.', 404, 'PRODUTO_NOT_FOUND');
    }
  }
}
