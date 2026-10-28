import { describe, it, expect } from 'vitest';
import { FichaCrediarioService } from '../services/ficha-crediario.service';

describe('Regras de Negócio do Crediário (Ficha de Cliente)', () => {
  // Simulação das regras matemáticas e de amortização
  function calcularAmortizacao(saldoAtual: number, valorPago: number) {
    const valorAbatido = Math.min(valorPago, saldoAtual);
    const saldoRestante = Math.max(0, saldoAtual - valorAbatido);
    return { valorAbatido, saldoRestante, status: saldoRestante === 0 ? 'QUITADO' : 'ATIVO' };
  }

  function calcularNovasParcelas(saldoTotal: number, valorParcelaPadrao: number) {
    const qtdParcelas = Math.ceil(saldoTotal / valorParcelaPadrao);
    const parcelas: { numero: number; valor: number }[] = [];

    for (let i = 1; i <= qtdParcelas; i++) {
      const valor =
        i === qtdParcelas
          ? saldoTotal - (qtdParcelas - 1) * valorParcelaPadrao
          : valorParcelaPadrao;
      parcelas.push({ numero: i, valor: Number(valor.toFixed(2)) });
    }

    return parcelas;
  }

  it('deve manter o valor da parcela fixa e alongar o prazo ao adicionar nova compra', () => {
    // Cliente devia R$ 200 em parcelas de R$ 100 (2 parcelas)
    // Comprou mais R$ 300 de colchas/panelas -> saldo total R$ 500
    const saldoTotal = 500.0;
    const valorParcela = 100.0;

    const parcelas = calcularNovasParcelas(saldoTotal, valorParcela);

    expect(parcelas.length).toBe(5);
    expect(parcelas[0].valor).toBe(100.0);
    expect(parcelas[4].valor).toBe(100.0);
  });

  it('deve renegociar o valor da parcela quando a vendedora combinar novo valor', () => {
    // Cliente comprou R$ 600 e combinou parcela de R$ 150
    const saldoTotal = 600.0;
    const valorParcelaRenegociada = 150.0;

    const parcelas = calcularNovasParcelas(saldoTotal, valorParcelaRenegociada);

    expect(parcelas.length).toBe(4);
    expect(parcelas.every((p) => p.valor === 150.0)).toBe(true);
  });

  it('deve abater o pagamento parcial e manter o saldo restante com precisão', () => {
    const { valorAbatido, saldoRestante, status } = calcularAmortizacao(450.0, 100.0);

    expect(valorAbatido).toBe(100.0);
    expect(saldoRestante).toBe(350.0);
    expect(status).toBe('ATIVO');
  });

  it('deve quitar a ficha se o pagamento cobrir todo o saldo devedor', () => {
    const { valorAbatido, saldoRestante, status } = calcularAmortizacao(250.0, 250.0);

    expect(valorAbatido).toBe(250.0);
    expect(saldoRestante).toBe(0.0);
    expect(status).toBe('QUITADO');
  });

  describe('Cálculo Seguro de Dia Livre de Vencimento (1 a 31)', () => {
    it('deve respeitar qualquer dia escolhido pela cliente (ex: dia 07, 14, 23, 28)', () => {
      const d7 = FichaCrediarioService.calcularDataVencimentoMensal(2026, 4, 7); // Maio 2026
      expect(d7).toBe('2026-05-07');

      const d23 = FichaCrediarioService.calcularDataVencimentoMensal(2026, 7, 23); // Agosto 2026
      expect(d23).toBe('2026-08-23');
    });

    it('deve ajustar dia 31 para 28/29 em Fevereiro sem pular para Março', () => {
      // 2026 não é bissexto -> Fev tem 28 dias
      const fev2026 = FichaCrediarioService.calcularDataVencimentoMensal(2026, 1, 31);
      expect(fev2026).toBe('2026-02-28');

      // 2028 é bissexto -> Fev tem 29 dias
      const fev2028 = FichaCrediarioService.calcularDataVencimentoMensal(2028, 1, 31);
      expect(fev2028).toBe('2028-02-29');
    });

    it('deve ajustar dia 31 para 30 em meses de 30 dias (Abril, Junho, Setembro, Novembro)', () => {
      const abril = FichaCrediarioService.calcularDataVencimentoMensal(2026, 3, 31); // Abril (3)
      expect(abril).toBe('2026-04-30');

      const junho = FichaCrediarioService.calcularDataVencimentoMensal(2026, 5, 31); // Junho (5)
      expect(junho).toBe('2026-06-30');
    });
  });

  describe('Diagnóstico de Alertas e Inconsistências nas Fichas Digitalizadas', () => {
    it('deve identificar ficha sem WhatsApp e sem endereço como incompleta com campos de foco', () => {
      const diag = FichaCrediarioService.diagnosticarAlertasFicha({
        cliente_nome: 'Aline Rocha',
        cliente_whatsapp: '',
        cliente_endereco: '',
        saldo_devedor_total: 120,
        valor_parcela_padrao: 127,
        dia_vencimento_padrao: 30,
        observacoes: 'Origem: IMG_6332.jpg | Código: 503 LU',
      });

      expect(diag.tem_pendencia).toBe(true);
      expect(diag.alertas.some((a) => a.codigo === 'SEM_WHATSAPP' && a.campo === 'whatsapp')).toBe(true);
      expect(diag.alertas.some((a) => a.codigo === 'SEM_ENDERECO' && a.campo === 'endereco')).toBe(true);
    });

    it('deve retornar sem pendências quando a ficha possui todos os dados essenciais preenchidos', () => {
      const diag = FichaCrediarioService.diagnosticarAlertasFicha({
        cliente_nome: 'Kesly Tauane de Oliveira Silva',
        cliente_whatsapp: '5516981904093',
        cliente_endereco: 'Rua Teodora Fernandi Grifo, 75 - Alexandre Balbo',
        saldo_devedor_total: 564,
        valor_parcela_padrao: 94,
        dia_vencimento_padrao: 11,
        observacoes: 'Origem: IMG_6296.jpg',
      });

      expect(diag.tem_pendencia).toBe(false);
      expect(diag.alertas.length).toBe(0);
    });

    it('deve listar as 182 fichas digitalizadas importadas e permitir completar dados via edição rápida', async () => {
      const todas = await FichaCrediarioService.listFichas();
      expect(todas.length).toBeGreaterThanOrEqual(182);

      const comPendencias = await FichaCrediarioService.listFichas({ apenasPendencias: true });
      expect(comPendencias.length).toBeGreaterThanOrEqual(19);

      const fichaSemZap = comPendencias.find((f) =>
        f.alertas?.some((a) => a.codigo === 'SEM_WHATSAPP')
      );
      expect(fichaSemZap).toBeDefined();

      if (fichaSemZap) {
        const atualizada = await FichaCrediarioService.atualizarCadastroRapidoFicha({
          fichaId: fichaSemZap.id,
          whatsapp: '16991234567',
          endereco: 'Rua das Palmeiras, 500 - Centro',
        });
        expect(atualizada.cliente_whatsapp).toBe('5516991234567');
        expect(atualizada.cliente_endereco).toBe('Rua das Palmeiras, 500 - Centro');
        expect(atualizada.alertas?.some((a) => a.codigo === 'SEM_WHATSAPP')).toBe(false);
        expect(atualizada.alertas?.some((a) => a.codigo === 'SEM_ENDERECO')).toBe(false);
      }
    });
  });
});
