import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PedidoService } from '../services/pedido.service.js';

export const pedidoRouter = Router();

const createPedidoSchema = z.object({
  cliente_id: z.string().uuid('ID do cliente inválido.'),
  descricao_itens: z.string().min(3, 'Descreva as peças do enxoval.'),
  data_previsao_entrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de entrega deve estar no formato AAAA-MM-DD.'),
  valor_total: z.number().positive('Valor total deve ser maior que zero.'),
  valor_sinal: z.number().nonnegative('Valor do sinal não pode ser negativo.').optional().default(0),
  foto_referencia_url: z.string().url().optional(),
});

const updateStatusSchema = z.object({
  status_producao: z.enum(['FILA', 'EM_PRODUCAO', 'PRONTO_ENTREGA', 'ENTREGUE']),
});

// GET /api/v1/pedidos - Listar pedidos (com filtros)
pedidoRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status_producao = req.query.status_producao as string | undefined;
    const apenasSemana = req.query.apenasSemana === 'true';

    const pedidos = await PedidoService.list({ status_producao, apenasSemana });
    return res.json({ success: true, data: pedidos, request_id: req.requestId });
  } catch (error) {
    return next(error);
  }
});

// POST /api/v1/pedidos - Criar novo pedido
pedidoRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createPedidoSchema.parse(req.body);
    const novoPedido = await PedidoService.create(validatedData);
    return res.status(201).json({ success: true, data: novoPedido, request_id: req.requestId });
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/v1/pedidos/:id/status - Atualizar status de produção (e disparar Pix se pronto)
pedidoRouter.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status_producao } = updateStatusSchema.parse(req.body);
    const pedidoAtualizado = await PedidoService.updateStatus(req.params.id as string, status_producao);
    return res.json({ success: true, data: pedidoAtualizado, request_id: req.requestId });
  } catch (error) {
    return next(error);
  }
});
