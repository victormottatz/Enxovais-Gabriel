import { describe, it, expect } from 'vitest';
import { ImportacaoService } from '../services/importacao.service.js';

describe('ImportacaoService - Parser e Validador de CSV', () => {
  it('deve processar e validar com sucesso um CSV com separador ponto e vírgula', () => {
    const csvContent = `nome;whatsapp;cpf;endereco;ponto_referencia;limite_credito;dia_vencimento;tipo_ciclo;dia_vale_secundario;saldo_devedor_atual;valor_parcela;observacoes
Maria das Gracas;11987654321;123.456.789-00;Rua das Flores, 120;Padaria Estrela;1000,00;5;MENSAL_PAGAMENTO;;450,00;100,00;Cliente antiga
Ana Paula Oliveira;11976543210;;Av. Brasil, 450;;800,00;20;QUINZENAL_VALE;5;300,00;150,00;Paga vale dia 20`;

    const resultado = ImportacaoService.processarCSV(csvContent);

    expect(resultado.total).toBe(2);
    expect(resultado.validos).toBe(2);
    expect(resultado.comErros).toBe(0);

    const maria = resultado.itens[0];
    expect(maria.valido).toBe(true);
    expect(maria.dados.nome).toBe('Maria das Gracas');
    expect(maria.dados.whatsapp).toBe('5511987654321');
    expect(maria.dados.dia_vencimento).toBe(5);
    expect(maria.dados.saldo_devedor_atual).toBe(450.0);
    expect(maria.dados.valor_parcela).toBe(100.0);

    const ana = resultado.itens[1];
    expect(ana.valido).toBe(true);
    expect(ana.dados.tipo_ciclo).toBe('QUINZENAL_VALE');
    expect(ana.dados.dia_vale_secundario).toBe(5);
  });

  it('deve apontar erro em linhas com nome ausente ou WhatsApp inválido', () => {
    const csvInvalido = `nome;whatsapp;dia_vencimento;saldo_devedor_atual;valor_parcela
;11987654321;5;200,00;100,00
Joana Santos;123;5;150,00;50,00`;

    const resultado = ImportacaoService.processarCSV(csvInvalido);

    expect(resultado.total).toBe(2);
    expect(resultado.validos).toBe(0);
    expect(resultado.comErros).toBe(2);

    expect(resultado.itens[0].valido).toBe(false);
    expect(resultado.itens[0].erros).toContain('Nome da cliente é obrigatório e deve ter no mínimo 2 letras');

    expect(resultado.itens[1].valido).toBe(false);
    expect(resultado.itens[1].erros.some((e) => e.includes('WhatsApp'))).toBe(true);
  });

  it('deve lidar corretamente com separador por vírgula e formato numérico', () => {
    const csvVirgula = `nome,whatsapp,dia_vencimento,saldo_devedor_atual,valor_parcela
Francisca Souza,11999998888,10,650.50,150.00`;

    const resultado = ImportacaoService.processarCSV(csvVirgula);

    expect(resultado.total).toBe(1);
    expect(resultado.validos).toBe(1);
    expect(resultado.itens[0].dados.saldo_devedor_atual).toBe(650.5);
    expect(resultado.itens[0].dados.valor_parcela).toBe(150.0);
  });
});
