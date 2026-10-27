import { describe, it, expect } from 'vitest';
import { ImportacaoService } from '../services/importacao.service.js';
import { FichaCrediarioService } from '../services/ficha-crediario.service.js';

describe('ImportacaoService - Histórico de Pagamentos e Compras Anteriores', () => {
  it('deve processar e validar corretamente um CSV de histórico de pagamentos e compras', () => {
    const csvContent = `whatsapp;nome;tipo;data;valor;forma_pagamento;parcela_ref;descricao;observacoes
11987654321;Maria das Gracas;PAGAMENTO;10/02/2026;100,00;PIX;Parcela 01/05;Amortização no Pix;Comprovante anexado
11987654321;Maria das Gracas;COMPRA_A_PRAZO;15/02/2026;350,00;;;Jogo Edredom Queen;Ficha física nº 12
11976543210;Ana Paula Oliveira;AMORTIZACAO;20/02/2026;150,00;DINHEIRO;Vale Quinzenal;Adiantamento em mãos;`;

    const resultado = ImportacaoService.processarCSVHistorico(csvContent);

    expect(resultado.total).toBe(3);
    expect(resultado.validos).toBe(3);
    expect(resultado.comErros).toBe(0);

    const item1 = resultado.itens[0];
    expect(item1.valido).toBe(true);
    expect(item1.dados.whatsapp).toBe('5511987654321');
    expect(item1.dados.tipo).toBe('PAGAMENTO');
    expect(item1.dados.data).toBe('2026-02-10');
    expect(item1.dados.valor).toBe(100.0);
    expect(item1.dados.forma_pagamento).toBe('PIX');
    expect(item1.dados.parcela_ref).toBe('Parcela 01/05');

    const item2 = resultado.itens[1];
    expect(item2.valido).toBe(true);
    expect(item2.dados.tipo).toBe('COMPRA_A_PRAZO');
    expect(item2.dados.data).toBe('2026-02-15');
    expect(item2.dados.valor).toBe(350.0);

    const item3 = resultado.itens[2];
    expect(item3.valido).toBe(true);
    expect(item3.dados.tipo).toBe('AMORTIZACAO');
    expect(item3.dados.data).toBe('2026-02-20');
    expect(item3.dados.valor).toBe(150.0);
    expect(item3.dados.forma_pagamento).toBe('DINHEIRO');
  });

  it('deve apontar erro em linhas sem WhatsApp ou com valor zerado/negativo', () => {
    const csvInvalido = `whatsapp;nome;tipo;data;valor
;Joana Silva;PAGAMENTO;10/02/2026;100,00
11999998888;Carlos Souza;PAGAMENTO;10/02/2026;0,00`;

    const resultado = ImportacaoService.processarCSVHistorico(csvInvalido);

    expect(resultado.total).toBe(2);
    expect(resultado.validos).toBe(0);
    expect(resultado.comErros).toBe(2);

    expect(resultado.itens[0].valido).toBe(false);
    expect(resultado.itens[0].erros.some((e) => e.includes('WhatsApp'))).toBe(true);

    expect(resultado.itens[1].valido).toBe(false);
    expect(resultado.itens[1].erros.some((e) => e.includes('maior que zero'))).toBe(true);
  });

  it('deve executar a gravação de pagamentos e compras calculando o saldo corretamente', async () => {
    const itensTeste = [
      {
        whatsapp: '18991230001',
        nome: 'Cliente Historico Teste',
        tipo: 'COMPRA_A_PRAZO' as const,
        data: '2026-01-10',
        valor: 500.0,
        descricao: 'Edredom e Colcha',
      },
      {
        whatsapp: '18991230001',
        nome: 'Cliente Historico Teste',
        tipo: 'PAGAMENTO' as const,
        data: '2026-02-05',
        valor: 150.0,
        forma_pagamento: 'PIX',
        parcela_ref: 'Parcela 01/05',
      },
    ];

    const resultado = await ImportacaoService.executarImportacaoHistorico(itensTeste);

    expect(resultado.importados).toBe(2);
    expect(resultado.detalhes[0].valor).toBe(500.0);
    expect(resultado.detalhes[0].tipo).toBe('COMPRA_A_PRAZO');
    expect(resultado.detalhes[0].novo_saldo).toBe(500.0);

    expect(resultado.detalhes[1].valor).toBe(150.0);
    expect(resultado.detalhes[1].tipo).toBe('PAGAMENTO');
    expect(resultado.detalhes[1].novo_saldo).toBe(350.0); // 500 - 150 = 350
  });

  it('deve importar fielmente o caso real da ficha física (Fabiana Amiga Indaiá - 2 Cobredons, 6x 170 com 3 pagas)', async () => {
    const csvFabiana = `whatsapp;nome;tipo;data;valor;forma_pagamento;parcela_ref;descricao;observacoes
16988479219;Fabiana Amiga (Indaiá);COMPRA_A_PRAZO;02/06/2026;1020,00;CREDIARIO;6 parcelas de 170;2 Cobredons;Ficha física nº 548LU - Rua Angelo Maioli, Bairro P. Ava.
16988479219;Fabiana Amiga (Indaiá);PAGAMENTO;10/07/2026;170,00;DINHEIRO;Parcela 01/06;Pagamento anotado na ficha;Pg 170 em 10/07
16988479219;Fabiana Amiga (Indaiá);PAGAMENTO;10/08/2026;170,00;DINHEIRO;Parcela 02/06;Pagamento anotado na ficha;Pg 170 em 10/08
16988479219;Fabiana Amiga (Indaiá);PAGAMENTO;10/09/2026;170,00;DINHEIRO;Parcela 03/06;Pagamento anotado na ficha;Pg 170 em 10/09`;

    const validacao = ImportacaoService.processarCSVHistorico(csvFabiana);
    expect(validacao.validos).toBe(4);
    expect(validacao.comErros).toBe(0);

    const execucao = await ImportacaoService.executarImportacaoHistorico(
      validacao.itens.map((i) => i.dados)
    );

    expect(execucao.importados).toBe(4);
    expect(execucao.detalhes[0].novo_saldo).toBe(1020.0);
    expect(execucao.detalhes[1].novo_saldo).toBe(850.0);
    expect(execucao.detalhes[2].novo_saldo).toBe(680.0);
    expect(execucao.detalhes[3].novo_saldo).toBe(510.0); // Restam R$ 510,00 (3 parcelas de 170)
  });

  it('deve lancar ficha de papel completa 1 a 1 pelo Modo Ficha de Papel Express (adicionarItemHistoricoManual com pagamentosAnteriores)', async () => {
    // Usa a ficha f5555555-5555-5555-5555-555555555555 (Luciana Rocha - saldo inicial 0)
    const fichaId = 'f5555555-5555-5555-5555-555555555555';
    const resultado = await FichaCrediarioService.adicionarItemHistoricoManual({
      fichaId,
      descricao: '2 Cobredons (6x 170)',
      valorTotal: 1020.0,
      dataCompra: '2026-06-02',
      observacoes: 'Ficha Física Nº 548LU',
      pagamentosAnteriores: [
        { data: '2026-07-10', valor: 170.0, formaPagamento: 'DINHEIRO', parcelaRef: 'Parcela 01/06' },
        { data: '2026-08-10', valor: 170.0, formaPagamento: 'DINHEIRO', parcelaRef: 'Parcela 02/06' },
        { data: '2026-09-10', valor: 170.0, formaPagamento: 'DINHEIRO', parcelaRef: 'Parcela 03/06' },
      ],
    });

    expect(resultado.saldoDevedorAtualizado).toBe(510.0);
    expect(resultado.statusQuitacaoItem).toBe('PAGO_PARCIAL');
  });
});
