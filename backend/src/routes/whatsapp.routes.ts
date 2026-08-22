import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WhatsAppService } from '../services/whatsapp.service.js';

export const whatsappRouter = Router();

const sendCustomMessageSchema = z.object({
  phone: z.string().min(8, 'Telefone inválido.'),
  message: z.string().min(1, 'A mensagem não pode estar vazia.'),
  pedidoId: z.string().uuid().optional(),
});

// GET /api/v1/whatsapp/status - Checar status da conexão com WhatsApp
whatsappRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await WhatsAppService.getInstanceStatus();
    return res.json({ success: true, data: status, request_id: req.requestId });
  } catch (error) {
    return next(error);
  }
});

// POST /api/v1/whatsapp/send - Disparo avulso
whatsappRouter.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, message, pedidoId } = sendCustomMessageSchema.parse(req.body);
    const result = await WhatsAppService.sendTextMessage({
      phone,
      message,
      pedidoId,
      tipoMensagem: 'AVULSO',
    });
    return res.json({ success: result.success, data: result, request_id: req.requestId });
  } catch (error) {
    return next(error);
  }
});
