import { describe, it, expect } from 'vitest';

export interface ItemVendaDetalhado {
  id: string;
  descricao: string;
  categoria: 'CAMA_MESA_BANHO' | 'COZINHA' | 'DECORACAO' | 'ORGANIZACAO';
  tamanho?: string;
  cor_estampa?: string;
  tipo_fornecimento: 'PRONTA_ENTREGA' | 'ENCOMENDA';
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  valor_entrada: number;
  valor_financiado: number;
  valor_ja_pago: number;
  saldo_restante: number;
  status_quitacao: 'PENDENTE' | 'PAGO_PARCIAL' | 'QUITADO' | 'RETOMADO_INADIMPLENCIA';
}

export interface PagamentoDiario {
  id: string;
  data: string;
  valor: number;
  forma: 'PIX' | 'DINHEIRO' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO';
  observacao: string;
}

export interface FichaCrediarioDetalhada {
  cliente_id: string;
  cliente_nome: string;
  saldo_devedor_total: number;
  valor_parcela_padrao: number;
  dia_vencimento: number;
  status_ficha: 'ATIVO' | 'BLOQUEADO_INADIMPLENCIA' | 'QUITADO';
  itens: ItemVendaDetalhado[];
  pagamentos: PagamentoDiario[];
}

// ==========================================
// FUNÇÕES DE REGRA DE NEGÓCIO DO CREDIÁRIO
// ==========================================

export function criarItemVenda(params: {
  id: string;
  descricao: string;
  categoria: 'CAMA_MESA_BANHO' | 'COZINHA' | 'DECORACAO' | 'ORGANIZACAO';
  tamanho?: string;
  cor_estampa?: string;
  tipo_fornecimento: 'PRONTA_ENTREGA' | 'ENCOMENDA';
  quantidade: number;
  preco_unitario: number;
  valor_entrada?: number;
}): ItemVendaDetalhado {
  const subtotal = Number((params.quantidade * params.preco_unitario).toFixed(2));
  const valor_entrada = Number((params.valor_entrada ?? 0).toFixed(2));
  const valor_financiado = Number(Math.max(0, subtotal - valor_entrada).toFixed(2));

  return {
    id: params.id,
    descricao: params.descricao,
    categoria: params.categoria,
    tamanho: params.tamanho,
    cor_estampa: params.cor_estampa,
    tipo_fornecimento: params.tipo_fornecimento,
    quantidade: params.quantidade,
    preco_unitario: params.preco_unitario,
    subtotal,
    valor_entrada,
    valor_financiado,
    valor_ja_pago: 0,
    saldo_restante: valor_financiado,
    status_quitacao: valor_financiado === 0 ? 'QUITADO' : 'PENDENTE',
  };
}

export function aplicarAmortizacaoEmCascata(
  ficha: FichaCrediarioDetalhada,
  pagamento: PagamentoDiario
): {
  fichaAtualizada: FichaCrediarioDetalhada;
  valorEfetivamenteAbatido: number;
} {
  let montanteDisponivel = pagamento.valor;
  ficha.pagamentos.push(pagamento);

  for (const item of ficha.itens) {
    if (montanteDisponivel <= 0) break;
    if (item.status_quitacao === 'QUITADO' || item.status_quitacao === 'RETOMADO_INADIMPLENCIA') {
      continue;
    }

    const valorDevidoItem = Number(item.saldo_restante.toFixed(2));
    if (valorDevidoItem <= 0) continue;

    if (montanteDisponivel >= valorDevidoItem) {
      item.valor_ja_pago = Number((item.valor_ja_pago + valorDevidoItem).toFixed(2));
      item.saldo_restante = 0;
      item.status_quitacao = 'QUITADO';
      montanteDisponivel = Number((montanteDisponivel - valorDevidoItem).toFixed(2));
    } else {
      item.valor_ja_pago = Number((item.valor_ja_pago + montanteDisponivel).toFixed(2));
      item.saldo_restante = Number((valorDevidoItem - montanteDisponivel).toFixed(2));
      item.status_quitacao = 'PAGO_PARCIAL';
      montanteDisponivel = 0;
    }
  }

  // Recalcula o saldo total da ficha somando os saldos restantes ativos
  ficha.saldo_devedor_total = Number(
    ficha.itens
      .filter((it) => it.status_quitacao !== 'RETOMADO_INADIMPLENCIA')
      .reduce((acc, it) => acc + it.saldo_restante, 0)
      .toFixed(2)
  );

  if (ficha.saldo_devedor_total === 0 && ficha.status_ficha !== 'BLOQUEADO_INADIMPLENCIA') {
    ficha.status_ficha = 'QUITADO';
  }

  return {
    fichaAtualizada: ficha,
    valorEfetivamenteAbatido: Number((pagamento.valor - montanteDisponivel).toFixed(2)),
  };
}

export function executarRetomadaPorInadimplencia(
  ficha: FichaCrediarioDetalhada,
  itemId: string,
  dadosRetomada: {
    data_retomada: string;
    condicao_produto: 'INTACTO' | 'SEMINOVO_BAZAR' | 'DANIFICADO';
    observacao: string;
  }
): {
  itemRetomado: ItemVendaDetalhado;
  saldoCanceladoDaFicha: number;
  valorRetidoUso: number;
  estoqueDestino: string;
} {
  const item = ficha.itens.find((it) => it.id === itemId);
  if (!item) {
    throw new Error('Item não encontrado na ficha.');
  }

  if (item.status_quitacao === 'QUITADO') {
    throw new Error('Não é possível retomar item que já foi 100% quitado.');
  }

  const saldoCancelado = item.saldo_restante;
  const valorRetido = item.valor_ja_pago + item.valor_entrada;

  item.status_quitacao = 'RETOMADO_INADIMPLENCIA';
  item.saldo_restante = 0;

  // Abate da dívida total da cliente
  ficha.saldo_devedor_total = Number(
    Math.max(0, ficha.saldo_devedor_total - saldoCancelado).toFixed(2)
  );

  // Aplica trava de crédito na cliente
  ficha.status_ficha = 'BLOQUEADO_INADIMPLENCIA';

  return {
    itemRetomado: item,
    saldoCanceladoDaFicha: saldoCancelado,
    valorRetidoUso: valorRetido,
    estoqueDestino: dadosRetomada.condicao_produto === 'INTACTO' ? 'ESTOQUE_PRINCIPAL' : 'SEMINOVO_BAZAR',
  };
}

// ==========================================
// SUÍTE DE TESTES VITEST
// ==========================================

describe('Crediário Detalhado: Itens, Pagamentos Diários e Retomadas', () => {
  it('Cenário 1: deve criar itens detalhados com especificações e abater entrada no ato', () => {
    // Cliente compra 1 Jogo de Panelas (R$ 280) com R$ 30 de entrada e 1 Edredom (R$ 200) sem entrada
    const panela = criarItemVenda({
      id: 'item-1',
      descricao: 'Jogo de Panelas 5 Peças Cerâmica Antiaderente',
      categoria: 'COZINHA',
      cor_estampa: 'Vermelho Cereja',
      tipo_fornecimento: 'PRONTA_ENTREGA',
      quantidade: 1,
      preco_unitario: 280.0,
      valor_entrada: 30.0,
    });

    const edredom = criarItemVenda({
      id: 'item-2',
      descricao: 'Edredom Casal Queen Toque de Pluma',
      categoria: 'CAMA_MESA_BANHO',
      tamanho: 'Queen (1,58m x 1,98m)',
      cor_estampa: 'Floral Rosa Antigo',
      tipo_fornecimento: 'ENCOMENDA',
      quantidade: 1,
      preco_unitario: 200.0,
    });

    expect(panela.subtotal).toBe(280.0);
    expect(panela.valor_entrada).toBe(30.0);
    expect(panela.valor_financiado).toBe(250.0);
    expect(panela.saldo_restante).toBe(250.0);
    expect(panela.status_quitacao).toBe('PENDENTE');

    expect(edredom.subtotal).toBe(200.0);
    expect(edredom.valor_financiado).toBe(200.0);
    expect(edredom.saldo_restante).toBe(200.0);

    const saldoTotalFicha = panela.saldo_restante + edredom.saldo_restante;
    expect(saldoTotalFicha).toBe(450.0);
  });

  it('Cenário 2: deve amortizar em cascata (FIFO) nos itens e registrar diário com observações', () => {
    const panela = criarItemVenda({
      id: 'item-1',
      descricao: 'Jogo de Panelas',
      categoria: 'COZINHA',
      tipo_fornecimento: 'PRONTA_ENTREGA',
      quantidade: 1,
      preco_unitario: 280.0,
      valor_entrada: 30.0, // financiado: R$ 250
    });

    const edredom = criarItemVenda({
      id: 'item-2',
      descricao: 'Edredom Queen',
      categoria: 'CAMA_MESA_BANHO',
      tipo_fornecimento: 'PRONTA_ENTREGA',
      quantidade: 1,
      preco_unitario: 200.0, // financiado: R$ 200
    });

    const ficha: FichaCrediarioDetalhada = {
      cliente_id: 'cli-01',
      cliente_nome: 'Dona Maria da Silva',
      saldo_devedor_total: 450.0,
      valor_parcela_padrao: 100.0,
      dia_vencimento: 5,
      status_ficha: 'ATIVO',
      itens: [panela, edredom],
      pagamentos: [],
    };

    // 1º Pagamento: Dia 05/09 - R$ 150,00 via Pix (Salário)
    aplicarAmortizacaoEmCascata(ficha, {
      id: 'pgto-01',
      data: '2026-09-05',
      valor: 150.0,
      forma: 'PIX',
      observacao: 'Marido transferiu metade no dia do salário',
    });

    // Panela devia 250, pagou 150 -> falta 100
    expect(ficha.itens[0].valor_ja_pago).toBe(150.0);
    expect(ficha.itens[0].saldo_restante).toBe(100.0);
    expect(ficha.itens[0].status_quitacao).toBe('PAGO_PARCIAL');
    expect(ficha.itens[1].saldo_restante).toBe(200.0);
    expect(ficha.saldo_devedor_total).toBe(300.0);

    // 2º Pagamento: Dia 20/09 - R$ 100,00 em Dinheiro (Vale)
    aplicarAmortizacaoEmCascata(ficha, {
      id: 'pgto-02',
      data: '2026-09-20',
      valor: 100.0,
      forma: 'DINHEIRO',
      observacao: 'Pagamento referente ao vale no balcão',
    });

    // Panela agora atinge 250 de pagamento -> 100% QUITADA!
    expect(ficha.itens[0].valor_ja_pago).toBe(250.0);
    expect(ficha.itens[0].saldo_restante).toBe(0.0);
    expect(ficha.itens[0].status_quitacao).toBe('QUITADO');

    // Edredom continua intacto esperando os próximos pagamentos
    expect(ficha.itens[1].saldo_restante).toBe(200.0);
    expect(ficha.itens[1].status_quitacao).toBe('PENDENTE');
    expect(ficha.saldo_devedor_total).toBe(200.0);
    expect(ficha.pagamentos.length).toBe(2);
  });

  it('Cenário 3: deve suportar migração de ficha física com saldo inicial sem recadastrar passado', () => {
    // Cliente migrada da Ficha de Papel nº 142 com R$ 350 de saldo
    const itemMigracao = criarItemVenda({
      id: 'item-migrado-142',
      descricao: 'Saldo Inicial de Migração - Ficha Física nº 142 (Itens anteriores: lençol e panela)',
      categoria: 'CAMA_MESA_BANHO',
      tipo_fornecimento: 'PRONTA_ENTREGA',
      quantidade: 1,
      preco_unitario: 350.0,
    });

    const ficha: FichaCrediarioDetalhada = {
      cliente_id: 'cli-02',
      cliente_nome: 'Dona Francisca Migrada',
      saldo_devedor_total: 350.0,
      valor_parcela_padrao: 100.0,
      dia_vencimento: 5,
      status_ficha: 'ATIVO',
      itens: [itemMigracao],
      pagamentos: [],
    };

    expect(ficha.saldo_devedor_total).toBe(350.0);

    // Cliente faz o primeiro pagamento no digital de R$ 100
    aplicarAmortizacaoEmCascata(ficha, {
      id: 'pgto-digital-01',
      data: '2026-10-05',
      valor: 100.0,
      forma: 'PIX',
      observacao: 'Primeira parcela paga no sistema digital',
    });

    expect(ficha.saldo_devedor_total).toBe(250.0);
    expect(ficha.itens[0].saldo_restante).toBe(250.0);
  });

  it('Cenário 4: deve registrar retomada de produto por inadimplência, estornar saldo e bloquear cliente', () => {
    // Cliente comprou edredom de R$ 200, pagou R$ 50 no primeiro mês e acumulou 90 dias de atraso dos R$ 150 restantes
    const edredom = criarItemVenda({
      id: 'item-edredom-inadimplente',
      descricao: 'Edredom Queen Floral',
      categoria: 'CAMA_MESA_BANHO',
      tipo_fornecimento: 'PRONTA_ENTREGA',
      quantidade: 1,
      preco_unitario: 200.0,
    });

    const ficha: FichaCrediarioDetalhada = {
      cliente_id: 'cli-03',
      cliente_nome: 'Cliente Inadimplente Exemplo',
      saldo_devedor_total: 200.0,
      valor_parcela_padrao: 50.0,
      dia_vencimento: 10,
      status_ficha: 'ATIVO',
      itens: [edredom],
      pagamentos: [],
    };

    // Pagou R$ 50 no primeiro mês
    aplicarAmortizacaoEmCascata(ficha, {
      id: 'pgto-01',
      data: '2026-06-10',
      valor: 50.0,
      forma: 'DINHEIRO',
      observacao: 'Pagou primeira parcela',
    });

    expect(ficha.saldo_devedor_total).toBe(150.0);
    expect(ficha.itens[0].saldo_restante).toBe(150.0);

    // Executa a retomada do item por inadimplência
    const resultadoRetomada = executarRetomadaPorInadimplencia(
      ficha,
      'item-edredom-inadimplente',
      {
        data_retomada: '2026-09-22',
        condicao_produto: 'SEMINOVO_BAZAR',
        observacao: 'Cliente não teve como pagar. Produto recolhido na residência em bom estado.',
      }
    );

    // Saldo residual de R$ 150 deve ser cancelado da ficha
    expect(resultadoRetomada.saldoCanceladoDaFicha).toBe(150.0);
    expect(resultadoRetomada.valorRetidoUso).toBe(50.0);
    expect(resultadoRetomada.estoqueDestino).toBe('SEMINOVO_BAZAR');

    // Ficha zera saldo devedor e fica bloqueada para novos crediários
    expect(ficha.saldo_devedor_total).toBe(0.0);
    expect(ficha.status_ficha).toBe('BLOQUEADO_INADIMPLENCIA');
    expect(ficha.itens[0].status_quitacao).toBe('RETOMADO_INADIMPLENCIA');
    expect(ficha.itens[0].saldo_restante).toBe(0.0);
  });
});
