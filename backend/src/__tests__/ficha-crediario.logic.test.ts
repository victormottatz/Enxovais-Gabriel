import { describe, it, expect } from 'vitest';

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
});
