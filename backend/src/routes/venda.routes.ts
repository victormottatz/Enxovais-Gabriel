import { Router } from 'express';
import { z } from 'zod';
import { VendaService } from '../services/venda.service.js';

const router = Router();

const itemVendaSchema = z.object({
  produto_id: z.string().uuid().optional(),
  descricao_item: z.string().min(2, 'Descrição do item é obrigatória'),
  quantidade: z.number().int().positive('Quantidade deve ser maior que zero'),
  preco_unitario: z.number().min(0, 'Preço unitário deve ser positivo'),
  tipo_item: z.enum(['ESTOQUE_LOCAL', 'ENCOMENDA']),
  fornecedor_nome: z.string().optional(),
  data_previsao_chegada: z.string().optional(),
});

const createVendaSchema = z.object({
  cliente_id: z.string().uuid('ID do cliente inválido'),
  tipo_venda: z.enum(['PRONTA_ENTREGA', 'ENCOMENDA', 'MISTA']).optional(),
  forma_pagamento: z.enum(['CREDIARIO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'MISTO']),
  valor_total: z.number().positive('Valor total da venda deve ser maior que zero'),
  valor_entrada: z.number().min(0).optional(),
  itens: z.array(itemVendaSchema).min(1, 'A venda deve ter ao menos um item'),
  novo_valor_parcela_negociado: z.number().positive().optional(),
  observacoes: z.string().optional(),
});

// GET /api/v1/vendas
router.get('/', async (req, res, next) => {
  try {
    const { cliente_id, forma_pagamento, status_venda } = req.query;
    const vendas = await VendaService.list({
      clienteId: cliente_id as string,
      formaPagamento: forma_pagamento as string,
      statusVenda: status_venda as string,
    });
    res.json(vendas);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/vendas/:id
router.get('/:id', async (req, res, next) => {
  try {
    const venda = await VendaService.getById(req.params.id);
    res.json(venda);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/vendas
router.post('/', async (req, res, next) => {
  try {
    const validated = createVendaSchema.parse(req.body);
    const resultado = await VendaService.create(validated);
    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
});

export default router;
