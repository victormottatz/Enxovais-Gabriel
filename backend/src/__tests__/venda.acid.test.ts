import { describe, it, expect, beforeEach } from 'vitest';
import { VendaService, VendaInput } from '../services/venda.service.js';
import { memoryStore } from '../config/database.js';

describe('VendaService - Integridade Transacional (ACID)', () => {
  beforeEach(() => {
    // Reset da store em memória para ambiente de testes
    memoryStore.clientes = [
      {
        id: 'cli-test-01',
        nome: 'Maria da Silva',
        whatsapp: '18991234567',
        ativo: true,
      },
    ];
    memoryStore.produtos = [
      {
        id: 'prod-test-01',
        nome: 'Edredom Queen',
        estoque_atual: 10,
        preco_venda_crediario: 150.0,
        ativo: true,
      },
    ];
    memoryStore.fichas_crediario = [];
    memoryStore.vendas = [];
    memoryStore.itens_venda = [];
    memoryStore.encomendas = [];
    memoryStore.movimentacoes_ficha = [];
  });

  it('deve rejeitar venda vazia sem itens', async () => {
    const input: VendaInput = {
      cliente_id: 'cli-test-01',
      forma_pagamento: 'CREDIARIO',
      valor_total: 150.0,
      itens: [],
    };

    await expect(VendaService.create(input)).rejects.toThrow('A venda deve conter ao menos um item.');
  });

  it('deve calcular corretamente o tipo de venda como MISTA quando mescla estoque e encomenda', async () => {
    const input: VendaInput = {
      cliente_id: 'cli-test-01',
      forma_pagamento: 'PIX',
      valor_total: 250.0,
      itens: [
        {
          produto_id: 'prod-test-01',
          descricao_item: 'Edredom Queen',
          quantidade: 1,
          preco_unitario: 150.0,
          tipo_item: 'ESTOQUE_LOCAL',
        },
        {
          descricao_item: 'Jogo de Lençol Sob Encomenda',
          quantidade: 1,
          preco_unitario: 100.0,
          tipo_item: 'ENCOMENDA',
          fornecedor_nome: 'Distribuidor Cama & Banho',
        },
      ],
    };

    const resultado = await VendaService.create(input);
    expect(resultado.venda).toBeDefined();
    expect(resultado.venda.tipo_venda).toBe('MISTA');
    expect(resultado.venda.status_venda).toBe('AGUARDANDO_ENCOMENDA');
    expect(resultado.encomendasGeradas).toBe(1);
  });
});
