import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiaService } from '../services/lia.service.js';
import { pool } from '../config/database.js';

describe('LiaService (Copiloto Inteligente & Consultas Factuais)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve responder consulta de inadimplentes quando solicitado', async () => {
    const mockQuery = vi.spyOn(pool, 'query').mockResolvedValueOnce({
      rows: [
        {
          id: '1',
          nome: 'Maria Silva',
          whatsapp: '5518999991111',
          saldo_devedor_total: '350.00',
          valor_parcela_padrao: '50.00',
          dia_vencimento_padrao: 5,
          parcelas_atrasadas: '2',
          vencimento_mais_antigo: '2026-01-05',
        },
      ],
    } as any);

    const resultado = await LiaService.responderConsulta('Quem são os clientes atrasados?');

    expect(resultado.tipo_consulta).toBe('INADIMPLENTES');
    expect(resultado.resposta).toContain('Maria Silva');
    expect(resultado.resposta).toContain('R$ 350.00');
    expect(mockQuery).toHaveBeenCalled();
  });

  it('deve responder consulta de valores a receber no crediário', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({
      rows: [
        {
          total_crediario_ativo: '14500.00',
          total_fichas_abertas: '38',
        },
      ],
    } as any);

    const resultado = await LiaService.responderConsulta('Quanto temos a receber este mês?');

    expect(resultado.tipo_consulta).toBe('A_RECEBER');
    expect(resultado.resposta).toContain('R$ 14500.00');
    expect(resultado.resposta).toContain('38 fichas');
  });

  it('deve responder consulta de estoque baixo', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({
      rows: [
        {
          id: 'p1',
          nome: 'Jogo de Lençol Casal 4 Peças',
          categoria: 'CAMA_MESA_BANHO',
          estoque_atual: 1,
          estoque_minimo: 3,
          preco_venda_vista: 180.0,
        },
      ],
    } as any);

    const resultado = await LiaService.responderConsulta('Quais produtos estão com estoque acabando?');

    expect(resultado.tipo_consulta).toBe('ESTOQUE_BAIXO');
    expect(resultado.resposta).toContain('Jogo de Lençol Casal');
    expect(resultado.resposta).toContain('Restam **1** un.');
  });
});
