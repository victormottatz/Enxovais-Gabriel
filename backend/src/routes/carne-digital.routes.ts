import { Router } from 'express';
import { CarneDigitalService } from '../services/carne-digital.service.js';

export const carneDigitalRouter = Router();

// GET /api/v1/carne-digital/:token
carneDigitalRouter.get('/:token', async (req, res, next) => {
  try {
    const dados = await CarneDigitalService.getCarneByTokenOrId(req.params.token);
    res.json(dados);
  } catch (err) {
    next(err);
  }
});
