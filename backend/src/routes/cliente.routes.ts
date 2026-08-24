import { Router } from 'express';
import { z } from 'zod';
import { ClienteService } from '../services/cliente.service.js';

const router = Router();

const createClienteSchema = z.object({
  nome: z.string().min(2, 'Nome do cliente deve ter ao menos 2 caracteres'),
  whatsapp: z.string().min(8, 'Número de WhatsApp inválido'),
  cpf: z.string().optional(),
  endereco: z.string().optional(),
  ponto_referencia: z.string().optional(),
  limite_credito: z.number().min(0).optional(),
  observacoes: z.string().optional(),
  dia_vencimento: z.number().int().min(1).max(31).optional(),
  valor_parcela_padrao: z.number().min(0).optional(),
});

// GET /api/v1/clientes
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    const clientes = await ClienteService.list(search as string);
    res.json(clientes);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/clientes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const cliente = await ClienteService.getById(req.params.id);
    res.json(cliente);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/clientes
router.post('/', async (req, res, next) => {
  try {
    const validated = createClienteSchema.parse(req.body);
    const cliente = await ClienteService.create(validated);
    res.status(201).json(cliente);
  } catch (err) {
    next(err);
  }
});

export default router;
