import { Router } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ProdutoService } from '../services/produto.service.js';
import { AppError } from '../middlewares/error.middleware.js';

const router = Router();

// Garante que o diretório de uploads exista
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'produtos');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const createProdutoSchema = z.object({
  codigo_sku: z.string().optional(),
  nome: z.string().min(2, 'Nome do produto é obrigatório'),
  descricao: z.string().optional().nullable(),
  categoria: z.string().optional(),
  preco_custo: z.number().min(0).optional(),
  preco_venda_vista: z.number().min(0, 'Preço de venda à vista deve ser positivo'),
  preco_venda_crediario: z.number().min(0, 'Preço de venda no crediário deve ser positivo'),
  estoque_atual: z.number().int().min(0).optional(),
  estoque_minimo: z.number().int().min(0).optional(),
  permite_encomenda: z.boolean().optional(),
  foto_url: z.string().optional().nullable(),
});

const updateProdutoSchema = z.object({
  nome: z.string().min(2).optional(),
  descricao: z.string().optional().nullable(),
  categoria: z.string().optional(),
  preco_custo: z.number().min(0).optional(),
  preco_venda_vista: z.number().min(0).optional(),
  preco_venda_crediario: z.number().min(0).optional(),
  estoque_atual: z.number().int().min(0).optional(),
  estoque_minimo: z.number().int().min(0).optional(),
  permite_encomenda: z.boolean().optional(),
  foto_url: z.string().optional().nullable(),
});

const uploadFotoSchema = z.object({
  imagem_base64: z.string().min(10, 'Dados da imagem são obrigatórios'),
  nome_arquivo: z.string().optional(),
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

// POST /api/v1/produtos/upload-foto
router.post('/upload-foto', async (req, res, next) => {
  try {
    const validated = uploadFotoSchema.parse(req.body);
    let base64Data = validated.imagem_base64;

    // Detecta tipo MIME da imagem
    let ext = '.jpg';
    if (base64Data.startsWith('data:image/png;base64,')) {
      ext = '.png';
      base64Data = base64Data.replace('data:image/png;base64,', '');
    } else if (base64Data.startsWith('data:image/jpeg;base64,')) {
      ext = '.jpg';
      base64Data = base64Data.replace('data:image/jpeg;base64,', '');
    } else if (base64Data.startsWith('data:image/webp;base64,')) {
      ext = '.webp';
      base64Data = base64Data.replace('data:image/webp;base64,', '');
    } else if (base64Data.startsWith('data:image/gif;base64,')) {
      ext = '.gif';
      base64Data = base64Data.replace('data:image/gif;base64,', '');
    } else if (base64Data.includes(';base64,')) {
      const match = base64Data.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
      if (match && match[1]) {
        ext = `.${match[1]}`;
      }
      base64Data = base64Data.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // Validação de tamanho: Máximo 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      throw new AppError('A imagem excede o tamanho máximo permitido de 5MB.', 400, 'FILE_TOO_LARGE');
    }

    const fileName = `prod_${uuidv4()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/produtos/${fileName}`;

    res.status(201).json({
      success: true,
      foto_url: publicUrl,
      filename: fileName,
      size_bytes: buffer.length,
    });
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

// PATCH / PUT /api/v1/produtos/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const validated = updateProdutoSchema.parse(req.body);
    const produto = await ProdutoService.update(req.params.id, validated);
    res.json(produto);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = updateProdutoSchema.parse(req.body);
    const produto = await ProdutoService.update(req.params.id, validated);
    res.json(produto);
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

// DELETE /api/v1/produtos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await ProdutoService.delete(req.params.id);
    res.json({ success: true, message: 'Produto desativado com sucesso.' });
  } catch (err) {
    next(err);
  }
});

export default router;

