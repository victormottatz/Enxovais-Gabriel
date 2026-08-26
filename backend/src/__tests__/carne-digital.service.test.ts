import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CarneDigitalService } from '../services/carne-digital.service.js';
import { pool } from '../config/database.js';

describe('CarneDigitalService (Visualização Web do Cliente)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar os dados formatados do carnê para um token válido', async () => {
    vi.spyOn(pool, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes('FROM fichas_crediario f')) {
        return {
          rows: [
            {
              id: 'f1',
              cliente_id: 'c1',
              cliente_nome: 'Dona Maria',
              cliente_whatsapp: '5518991234567',
              saldo_devedor_total: '200.00',
              valor_parcela_padrao: '50.00',
              dia_vencimento_padrao: 10,
              status_ficha: 'ATIVO',
            },
          ],
        } as any;
      }
      if (sql.includes('FROM configuracoes')) {
        return {
          rows: [
            {
              chave_pix: '18991234567',
              nome_titular_pix: 'Lucélia Gabriel',
              nome_loja: 'Enxovais Gabriel',
            },
          ],
        } as any;
      }
      if (sql.includes('FROM parcelas_crediario')) {
        return {
          rows: [
            {
              id: 'p1',
              numero_parcela: 1,
              valor_parcela: '50.00',
              data_vencimento: '2026-09-10',
              data_pagamento: null,
              valor_pago: '0.00',
              status: 'PENDENTE',
            },
          ],
        } as any;
      }
      return { rows: [] } as any;
    });

    const carne = await CarneDigitalService.getCarneByTokenOrId('f1');

    expect(carne.cliente_nome).toBe('Dona Maria');
    expect(carne.saldo_devedor_total).toBe(200);
    expect(carne.chave_pix).toBe('18991234567');
    expect(carne.parcelas).toHaveLength(1);
    expect(carne.parcelas[0].status).toBe('PENDENTE');
  });

  it('deve lançar erro 404 quando o carnê não for encontrado', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as any);

    await expect(CarneDigitalService.getCarneByTokenOrId('id-inexistente')).rejects.toThrow('Carnê digital não encontrado.');
  });
});
