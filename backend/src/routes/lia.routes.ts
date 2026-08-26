import { Router } from 'express';
import { z } from 'zod';
import { LiaService } from '../services/lia.service.js';

export const liaRouter = Router();

const consultaSchema = z.object({
  pergunta: z.string().min(1, 'A pergunta não pode estar vazia'),
});

// POST /api/v1/lia/consulta
liaRouter.post('/consulta', async (req, res, next) => {
  try {
    const { pergunta } = consultaSchema.parse(req.body);
    const resultado = await LiaService.responderConsulta(pergunta);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/lia/resumo-diario
liaRouter.get('/resumo-diario', async (req, res, next) => {
  try {
    const resultado = await LiaService.responderConsulta('resumo geral');
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/lia/avaliar-cliente/:id
liaRouter.get('/avaliar-cliente/:id', async (req, res, next) => {
  try {
    const resultado = await LiaService.avaliarCliente(req.params.id);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});
