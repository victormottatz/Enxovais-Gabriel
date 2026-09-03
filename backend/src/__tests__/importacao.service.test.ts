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

  it('deve processar a planilha real da mãe (15 colunas, produtos, datas e aspas com ponto e vírgula)', () => {
    const csvMae = `nome;whatsapp;cpf;endereco; valor total da compra;ponto_referencia;limite_credito;dia_vencimento;tipo_ciclo;saldo_devedor_atual;valor_parcela;observacoes;produtos;data da venda;pagamento de parcelas
Edson Anderson;16993394464;;Ruth Castanheira 40 ,Balbo;340;perto do Heldi Supermercado;1000;15;mensal_PAGAMENTO;340;85;4  parcelas de 85 ;churrasqueira;26/08/2026;
Cacau amiga;16992261228;;Baldoino de souza Barros;360;Parque dos servidores;5000;;dia 10;270;90;;1 cobre leito queen;28/07/2026;10/08/26pg
Daniela Crist.Siq.cesar;16991011983;;Izalta Dos Santos Couto 35dutra;6 parcelas de 143,00;dutra 1;2.000;10;MENSAL_PAGAMENTO;858;143;deve 6 parcelas de 143;1 jogo de panelas cava600+1frigideira grande 3x85;;
Nilva amiga Inaura;16994208299;;;10parcelas de 200;Quintino;5000;10;mENSAL_PAGAMENTO;1860;200;10 parcelas;"coberdron ;toalhas ;cadeiras";26/set;`;

    const resultado = ImportacaoService.processarCSV(csvMae);

    expect(resultado.total).toBe(4);
    expect(resultado.validos).toBe(4);
    expect(resultado.comErros).toBe(0);

    // Edson
    const edson = resultado.itens[0];
    expect(edson.dados.nome).toBe('Edson Anderson');
    expect(edson.dados.whatsapp).toBe('5516993394464');
    expect(edson.dados.dia_vencimento).toBe(15);
    expect(edson.dados.saldo_devedor_atual).toBe(340);
    expect(edson.dados.valor_parcela).toBe(85);
    expect(edson.dados.produtos).toBe('churrasqueira');
    expect(edson.dados.data_venda).toBe('26/08/2026');

    // Cacau amiga - Vencimento extraído de tipo_ciclo "dia 10"
    const cacau = resultado.itens[1];
    expect(cacau.dados.nome).toBe('Cacau amiga');
    expect(cacau.dados.dia_vencimento).toBe(10);
    expect(cacau.dados.saldo_devedor_atual).toBe(270);
    expect(cacau.dados.produtos).toBe('1 cobre leito queen');
    expect(cacau.dados.pagamento_parcelas).toBe('10/08/26pg');

    // Daniela - Limite 2.000 formatado
    const daniela = resultado.itens[2];
    expect(daniela.dados.limite_credito).toBe(2000);
    expect(daniela.dados.produtos).toBe('1 jogo de panelas cava600+1frigideira grande 3x85');

    // Nilva - Aspas contendo ponto e vírgula sem quebrar colunas
    const nilva = resultado.itens[3];
    expect(nilva.dados.produtos).toBe('coberdron ;toalhas ;cadeiras');
    expect(nilva.dados.ponto_referencia).toBe('Quintino');
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

