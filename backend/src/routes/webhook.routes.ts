import { Router, Request, Response } from 'express';

export const webhookRouter = Router();

// POST /api/v1/webhook/evolution - Recebe eventos da Evolution API
webhookRouter.post('/evolution', async (req: Request, res: Response) => {
  const event = req.body?.event;
  const data = req.body?.data;

  console.log(`📡 [Webhook Evolution] Evento recebido: ${event}`);

  if (event === 'CONNECTION_UPDATE') {
    const state = data?.state;
    console.log(`🔄 [Webhook Evolution] Status da conexão alterado para: ${state}`);
  }

  if (event === 'MESSAGES_UPDATE') {
    const status = data?.status;
    console.log(`📩 [Webhook Evolution] Status da mensagem atualizado: ${status}`);
  }

  return res.status(200).json({ received: true });
});
