import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ConfiguracaoService } from '../services/configuracao.service.js';

export const configuracaoRouter = Router();

const updateConfigSchema = z.object({
  chave_pix: z.string().min(3).optional(),
  nome_titular_pix: z.string().min(2).optional(),
  nome_atelie: z.string().min(2).optional(),
  template_boas_vindas: z.string().min(10).optional(),
  template_cobranca_pix: z.string().min(10).optional(),
});

// GET /api/v1/configuracoes - Obter dados do ateliê e templates
configuracaoRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await ConfiguracaoService.get();
    return res.json({ success: true, data: config, request_id: req.requestId });
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/v1/configuracoes - Atualizar dados do ateliê
configuracaoRouter.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateConfigSchema.parse(req.body);
    const configAtualizada = await ConfiguracaoService.update(validatedData);
    return res.json({ success: true, data: configAtualizada, request_id: req.requestId });
  } catch (error) {
    return next(error);
  }
});
