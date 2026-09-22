import { Router } from 'express';
import { z } from 'zod';
import { FichaCrediarioService } from '../services/ficha-crediario.service.js';

const router = Router();

const registrarPagamentoSchema = z.object({
  valor_pago: z.number().positive('O valor do pagamento deve ser maior que zero'),
  descricao: z.string().optional(),
});

const ajustarSaldoSchema = z.object({
  novo_saldo: z.number().min(0, 'O saldo devedor não pode ser negativo'),
  motivo: z.string().min(3, 'Informe o motivo do ajuste manual (mínimo 3 caracteres)'),
  novo_valor_parcela: z.number().positive().optional(),
  novo_dia_vencimento: z.number().int().min(1).max(31).optional(),
});

// GET /api/v1/fichas
router.get('/', async (req, res, next) => {
  try {
    const { dia_vencimento, status_ficha, search } = req.query;
    const fichas = await FichaCrediarioService.listFichas({
      diaVencimento: dia_vencimento ? parseInt(dia_vencimento as string, 10) : undefined,
      statusFicha: status_ficha as string,
      search: search as string,
    });
    res.json(fichas);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/fichas/:id
router.get('/:id', async (req, res, next) => {
  try {
    const fichaDetalhada = await FichaCrediarioService.getFichaDetalhada(req.params.id);
    res.json(fichaDetalhada);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/fichas/:id/pagamentos
router.post('/:id/pagamentos', async (req, res, next) => {
  try {
    const validated = registrarPagamentoSchema.parse(req.body);
    const resultado = await FichaCrediarioService.registrarPagamento({
      fichaId: req.params.id,
      valorPago: validated.valor_pago,
      descricao: validated.descricao,
    });
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/fichas/:id/ajustar-saldo
router.patch('/:id/ajustar-saldo', async (req, res, next) => {
  try {
    const validated = ajustarSaldoSchema.parse(req.body);
    const resultado = await FichaCrediarioService.ajustarSaldoManual({
      fichaId: req.params.id,
      novoSaldo: validated.novo_saldo,
      motivo: validated.motivo,
      novoValorParcela: validated.novo_valor_parcela,
      novoDiaVencimento: validated.novo_dia_vencimento,
    });
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/fichas/:id/historico-item
const historicoItemSchema = z.object({
  descricao: z.string().min(2, 'Informe o nome/descrição do produto'),
  valor_total: z.number().positive('O valor do produto deve ser maior que zero'),
  valor_ja_pago: z.number().min(0, 'O valor pago não pode ser negativo').optional(),
  data_compra: z.string().optional(),
  observacoes: z.string().optional(),
});

router.post('/:id/historico-item', async (req, res, next) => {
  try {
    const validated = historicoItemSchema.parse(req.body);
    const resultado = await FichaCrediarioService.adicionarItemHistoricoManual({
      fichaId: req.params.id,
      descricao: validated.descricao,
      valorTotal: validated.valor_total,
      valorJaPago: validated.valor_ja_pago,
      dataCompra: validated.data_compra,
      observacoes: validated.observacoes,
    });
    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
});

export default router;
