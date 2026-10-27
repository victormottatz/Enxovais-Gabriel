import { Router } from 'express';
import { z } from 'zod';
import { ImportacaoService } from '../services/importacao.service.js';

const router = Router();

const validarCsvSchema = z.object({
  csv_content: z.string().min(1, 'O conteúdo do CSV não pode estar vazio'),
});

const executarImportacaoSchema = z.object({
  itens: z.array(
    z.object({
      nome: z.string().min(2, 'Nome é obrigatório'),
      whatsapp: z.string().min(10, 'WhatsApp inválido'),
      cpf: z.string().optional().nullable(),
      endereco: z.string().optional().nullable(),
      ponto_referencia: z.string().optional().nullable(),
      valor_total_compra: z.string().optional().nullable(),
      limite_credito: z.number().optional().nullable(),
      dia_vencimento: z.number().min(1).max(31),
      tipo_ciclo: z.enum(['MENSAL_PAGAMENTO', 'QUINZENAL_VALE']),
      dia_vale_secundario: z.number().min(1).max(31).optional().nullable(),
      saldo_devedor_atual: z.number().min(0),
      valor_parcela: z.number().positive(),
      observacoes: z.string().optional().nullable(),
      produtos: z.string().optional().nullable(),
      data_venda: z.string().optional().nullable(),
      pagamento_parcelas: z.string().optional().nullable(),
    }).passthrough()
  ).min(1, 'Envie ao menos um item para importar'),
});

// POST /api/v1/importacao/validar - Valida e retorna pré-visualização das linhas
router.post('/validar', (req, res, next) => {
  try {
    const validated = validarCsvSchema.parse(req.body);
    const resultado = ImportacaoService.processarCSV(validated.csv_content);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/importacao/executar - Executa a gravação atômica dos itens válidos
router.post('/executar', async (req, res, next) => {
  try {
    const validated = executarImportacaoSchema.parse(req.body);
    const resultado = await ImportacaoService.executarImportacao(validated.itens as any);
    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
});

// Schemas para Histórico de Pagamentos e Amortizações Anteriores
const executarImportacaoHistoricoSchema = z.object({
  itens: z.array(
    z.object({
      whatsapp: z.string().min(10, 'WhatsApp é obrigatório'),
      nome: z.string().optional().nullable(),
      tipo: z.enum(['PAGAMENTO', 'COMPRA_A_PRAZO', 'AMORTIZACAO']),
      data: z.string().min(5, 'Data é obrigatória'),
      valor: z.number().positive('Valor deve ser maior que zero'),
      forma_pagamento: z.string().optional().nullable(),
      parcela_ref: z.string().optional().nullable(),
      descricao: z.string().optional().nullable(),
      observacoes: z.string().optional().nullable(),
    }).passthrough()
  ).min(1, 'Envie ao menos um lançamento histórico para importar'),
});

// POST /api/v1/importacao/historico/validar
router.post('/historico/validar', (req, res, next) => {
  try {
    const validated = validarCsvSchema.parse(req.body);
    const resultado = ImportacaoService.processarCSVHistorico(validated.csv_content);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/importacao/historico/executar
router.post('/historico/executar', async (req, res, next) => {
  try {
    const validated = executarImportacaoHistoricoSchema.parse(req.body);
    const resultado = await ImportacaoService.executarImportacaoHistorico(validated.itens as any);
    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
});

export default router;

