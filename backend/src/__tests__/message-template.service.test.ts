import { describe, it, expect } from 'vitest';
import { MessageTemplateService } from '../services/message-template.service.js';

describe('MessageTemplateService (Crediário & Utilidades)', () => {
  it('deve formatar valores monetários para padrão pt-BR corretamente', () => {
    expect(MessageTemplateService.formatCurrency(150)).toBe('150,00');
    expect(MessageTemplateService.formatCurrency(1250.75)).toBe('1.250,75');
    expect(MessageTemplateService.formatCurrency('89.9')).toBe('89,90');
    expect(MessageTemplateService.formatCurrency(0)).toBe('0,00');
  });

  it('deve formatar datas para DD/MM/AAAA', () => {
    expect(MessageTemplateService.formatDate('2026-09-05')).toBe('05/09/2026');
  });

  it('deve renderizar template de lembrete de cobrança no dia do vale/pagamento', () => {
    const template =
      'Olá, {nome_cliente}! Hoje é o dia do seu pagamento na {nome_loja}. Parcela: R$ {valor_parcela}. Saldo devedor: R$ {saldo_total}. Pix: {chave_pix}';

    const result = MessageTemplateService.render(template, {
      nome_cliente: 'Maria da Silva',
      nome_loja: 'Enxovais Gabriel',
      valor_parcela: 100.0,
      saldo_total: 450.0,
      chave_pix: 'pix@enxovaisgabriel.com',
    });

    expect(result).toBe(
      'Olá, Maria da Silva! Hoje é o dia do seu pagamento na Enxovais Gabriel. Parcela: R$ 100,00. Saldo devedor: R$ 450,00. Pix: pix@enxovaisgabriel.com'
    );
  });

  it('deve renderizar recibo instantâneo com saldo restante', () => {
    const template =
      'Pagamento recebido de R$ {valor_pago}! Seu novo saldo restante é R$ {saldo_restante}. Próximo vencimento: {proximo_vencimento}.';

    const result = MessageTemplateService.render(template, {
      valor_pago: 100.0,
      saldo_restante: 350.0,
      proximo_vencimento: '2026-10-05',
    });

    expect(result).toBe(
      'Pagamento recebido de R$ 100,00! Seu novo saldo restante é R$ 350,00. Próximo vencimento: 05/10/2026.'
    );
  });
});
