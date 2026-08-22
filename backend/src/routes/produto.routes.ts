import { Router } from 'express';
import { z } from 'zod';
import { ProdutoService } from '../services/produto.service.js';

const router = Router();

const createProdutoSchema = z.object({
  codigo_sku: z.string().optional(),
  nome: z.string().min(2, 'Nome do produto é obrigatório'),
  descricao: z.string().optional(),
  categoria: z
    .enum(['CAMA_MESA_BANHO', 'COZINHA', 'DECORACAO', 'ORGANIZACAO', 'OUTROS'])
    .optional(),
  preco_custo: z.number().min(0).optional(),
  preco_venda_vista: z.number().min(0, 'Preço de venda à vista deve ser positivo'),
  preco_venda_crediario: z.number().min(0, 'Preço de venda no crediário deve ser positivo'),
  estoque_atual: z.number().int().min(0).optional(),
  estoque_minimo: z.number().int().min(0).optional(),
  permite_encomenda: z.boolean().optional(),
});

const updateEstoqueSchema = z.object({
  quantidade_delta: z.number().int(),
});

// GET /api/v1/produtos
router.get('/', async (req, res, next) => {
  try {
    const { search, categoria, apenas_em_estoque } = req.query;
    const produtos = await ProdutoService.list({
      search: search as string,
      categoria: categoria as string,
      apenasEmEstoque: apenas_em_estoque === 'true',
    });
    res.json(produtos);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/produtos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const produto = await ProdutoService.getById(req.params.id);
    res.json(produto);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/produtos
router.post('/', async (req, res, next) => {
  try {
    const validated = createProdutoSchema.parse(req.body);
    const produto = await ProdutoService.create(validated);
    res.status(201).json(produto);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/produtos/:id/estoque
router.patch('/:id/estoque', async (req, res, next) => {
  try {
    const validated = updateEstoqueSchema.parse(req.body);
    const produto = await ProdutoService.updateEstoque(req.params.id, validated.quantidade_delta);
    res.json(produto);
  } catch (err) {
    next(err);
  }
});

export default router;
