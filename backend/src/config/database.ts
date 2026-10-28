import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from './env.js';

const { Pool } = pg;

export const rawPool = new Pool(
  env.DATABASE_URL
    ? { connectionString: env.DATABASE_URL }
    : {
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      database: env.POSTGRES_DB,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    }
);

let isPostgresConnected = false;

// Store em memória resiliente para modo offline/testes/desenvolvimento
export interface MemoryStore {
  clientes: any[];
  produtos: any[];
  fichas_crediario: any[];
  vendas: any[];
  itens_venda: any[];
  encomendas: any[];
  pedidos: any[];
  movimentacoes_ficha: any[];
  configuracoes: any[];
}

export const memoryStore: MemoryStore = {
  clientes: [
    {
      id: 'c1111111-1111-1111-1111-111111111111',
      nome: 'Dona Francisca Silva',
      whatsapp: '5518998765432',
      telefone: '18998765432',
      cpf: '123.456.789-01',
      endereco: 'Rua das Flores, 120 - Jardim Primavera',
      ponto_referencia: 'Em frente à Padaria Central',
      limite_credito: 1200.0,
      observacoes: 'Cliente fiel há 3 anos. Prefere cores florais e panela cerâmica.',
      ativo: true,
      created_at: '2026-08-01T10:00:00Z',
    },
    {
      id: 'c2222222-2222-2222-2222-222222222222',
      nome: 'Maria Aparecida Souza',
      whatsapp: '5518987654321',
      telefone: '18987654321',
      cpf: '234.567.890-12',
      endereco: 'Av. Brasil, 450 - Centro',
      ponto_referencia: 'Ao lado do Mercado Silva',
      limite_credito: 800.0,
      observacoes: 'Paga pontualmente no dia 20 no adiantamento/vale salarial.',
      ativo: true,
      created_at: '2026-08-10T14:30:00Z',
    },
    {
      id: 'c3333333-3333-3333-3333-333333333333',
      nome: 'Ana Paula Oliveira',
      whatsapp: '5518976543210',
      telefone: '18976543210',
      cpf: '345.678.901-23',
      endereco: 'Rua São João, 78 - Vila Nova',
      ponto_referencia: 'Casa amarela com portão branco',
      limite_credito: 1000.0,
      observacoes: 'Migrada da ficha de papel física nº 85.',
      ativo: true,
      created_at: '2026-08-15T09:00:00Z',
    },
    {
      id: 'c4444444-4444-4444-4444-444444444444',
      nome: 'Juliana Mendes',
      whatsapp: '5518965432109',
      telefone: '18965432109',
      cpf: '456.789.012-34',
      endereco: 'Rua Tiradentes, 890 - Bairro Alto',
      ponto_referencia: 'Ao lado da farmácia',
      limite_credito: 500.0,
      observacoes: '⚠️ Histórico de inadimplência. Produto recolhido em 22/09/2026. Apenas à vista.',
      ativo: true,
      created_at: '2026-07-01T11:00:00Z',
    },
    {
      id: 'c5555555-5555-5555-5555-555555555555',
      nome: 'Luciana Rocha',
      whatsapp: '5518991239876',
      telefone: '18991239876',
      cpf: '567.890.123-45',
      endereco: 'Rua Paraíba, 34 - Centro',
      ponto_referencia: 'Próximo à pracinha',
      limite_credito: 1500.0,
      observacoes: '100% quitada no momento! Excelente cliente para oferta de novidades.',
      ativo: true,
      created_at: '2026-08-20T16:00:00Z',
    },
  ],
  produtos: [
    { id: '1', codigo_sku: 'UTIL-001', nome: 'Churrasqueira Portátil Inox', categoria: 'OUTROS', preco_custo: 180.0, preco_venda_vista: 300.0, preco_venda_crediario: 340.0, estoque_atual: 8, estoque_minimo: 2, permite_encomenda: true, ativo: true },
    { id: '2', codigo_sku: 'CAMA-001', nome: 'Cobre-Leito Queen Estampado', categoria: 'CAMA_MESA_BANHO', preco_custo: 190.0, preco_venda_vista: 320.0, preco_venda_crediario: 360.0, estoque_atual: 10, estoque_minimo: 2, permite_encomenda: true, ativo: true },
    { id: '3', codigo_sku: 'CAMA-002', nome: 'Jogo de Lençol Casal 4 Peças (Algodão)', categoria: 'CAMA_MESA_BANHO', preco_custo: 90.0, preco_venda_vista: 150.0, preco_venda_crediario: 170.0, estoque_atual: 15, estoque_minimo: 3, permite_encomenda: true, ativo: true },
    { id: '4', codigo_sku: 'ELET-001', nome: 'Fritadeira Elétrica Air Fryer 4L', categoria: 'COZINHA', preco_custo: 280.0, preco_venda_vista: 480.0, preco_venda_crediario: 536.0, estoque_atual: 6, estoque_minimo: 2, permite_encomenda: true, ativo: true },
    { id: '5', codigo_sku: 'CAMA-003', nome: 'Cama Box / Colchão Casal Ortopédico', categoria: 'CAMA_MESA_BANHO', preco_custo: 450.0, preco_venda_vista: 750.0, preco_venda_crediario: 850.0, estoque_atual: 4, estoque_minimo: 1, permite_encomenda: true, ativo: true },
    { id: '6', codigo_sku: 'COZ-001', nome: 'Jogo de Panelas Cava Antiaderente (5 Peças)', categoria: 'COZINHA', preco_custo: 320.0, preco_venda_vista: 540.0, preco_venda_crediario: 600.0, estoque_atual: 5, estoque_minimo: 2, permite_encomenda: true, ativo: true },
    { id: '7', codigo_sku: 'COZ-002', nome: 'Frigideira Grande Antiaderente Profissional', categoria: 'COZINHA', preco_custo: 130.0, preco_venda_vista: 220.0, preco_venda_crediario: 255.0, estoque_atual: 8, estoque_minimo: 2, permite_encomenda: true, ativo: true },
    { id: '8', codigo_sku: 'CAMA-004', nome: 'Cobredon Aveludado Casal Dupla Face', categoria: 'CAMA_MESA_BANHO', preco_custo: 160.0, preco_venda_vista: 280.0, preco_venda_crediario: 320.0, estoque_atual: 12, estoque_minimo: 3, permite_encomenda: true, ativo: true },
    { id: '9', codigo_sku: 'COZ-003', nome: 'Panela de Pressão 10 Litros Reforçada', categoria: 'COZINHA', preco_custo: 150.0, preco_venda_vista: 240.0, preco_venda_crediario: 280.0, estoque_atual: 7, estoque_minimo: 2, permite_encomenda: true, ativo: true },
    { id: '10', codigo_sku: 'BANHO-001', nome: 'Conjunto Toalhas Banhão 4 Peças', categoria: 'CAMA_MESA_BANHO', preco_custo: 85.0, preco_venda_vista: 140.0, preco_venda_crediario: 160.0, estoque_atual: 20, estoque_minimo: 4, permite_encomenda: true, ativo: true },
    { id: '11', codigo_sku: 'ORG-001', nome: 'Conjunto Cadeiras Dobráveis Reforçadas (Par)', categoria: 'ORGANIZACAO', preco_custo: 140.0, preco_venda_vista: 240.0, preco_venda_crediario: 280.0, estoque_atual: 8, estoque_minimo: 2, permite_encomenda: true, ativo: true },
    { id: '12', codigo_sku: 'ORG-002', nome: 'Kit Potes Herméticos Cozinha (6 un)', categoria: 'ORGANIZACAO', preco_custo: 45.0, preco_venda_vista: 85.0, preco_venda_crediario: 95.0, estoque_atual: 20, estoque_minimo: 5, permite_encomenda: true, ativo: true },
    { id: '13', codigo_sku: 'COZ-004', nome: 'Escorredor de Louça Inox 2 Andares', categoria: 'COZINHA', preco_custo: 75.0, preco_venda_vista: 130.0, preco_venda_crediario: 145.0, estoque_atual: 8, estoque_minimo: 2, permite_encomenda: true, ativo: true },
    { id: '14', codigo_sku: 'DEC-001', nome: 'Cortina Corta Luz Blackout 2,80 x 1,80', categoria: 'DECORACAO', preco_custo: 90.0, preco_venda_vista: 160.0, preco_venda_crediario: 180.0, estoque_atual: 9, estoque_minimo: 2, permite_encomenda: true, ativo: true },
  ],
  fichas_crediario: [
    {
      id: 'f1111111-1111-1111-1111-111111111111',
      cliente_id: 'c1111111-1111-1111-1111-111111111111',
      saldo_devedor_total: 120.0,
      valor_parcela_padrao: 60.0,
      dia_vencimento_padrao: 5,
      tipo_ciclo: 'MENSAL_PAGAMENTO',
      status_ficha: 'ATIVO',
      created_at: '2026-08-01T10:00:00Z',
      updated_at: '2026-09-22T10:00:00Z',
    },
    {
      id: 'f2222222-2222-2222-2222-222222222222',
      cliente_id: 'c2222222-2222-2222-2222-222222222222',
      saldo_devedor_total: 240.0,
      valor_parcela_padrao: 80.0,
      dia_vencimento_padrao: 20,
      tipo_ciclo: 'QUINZENAL_VALE',
      status_ficha: 'ATIVO',
      created_at: '2026-08-10T14:30:00Z',
      updated_at: '2026-09-20T11:00:00Z',
    },
    {
      id: 'f3333333-3333-3333-3333-333333333333',
      cliente_id: 'c3333333-3333-3333-3333-333333333333',
      saldo_devedor_total: 250.0,
      valor_parcela_padrao: 100.0,
      dia_vencimento_padrao: 5,
      tipo_ciclo: 'MENSAL_PAGAMENTO',
      status_ficha: 'ATIVO',
      created_at: '2026-08-15T09:00:00Z',
      updated_at: '2026-09-05T15:00:00Z',
    },
    {
      id: 'f4444444-4444-4444-4444-444444444444',
      cliente_id: 'c4444444-4444-4444-4444-444444444444',
      saldo_devedor_total: 0.0,
      valor_parcela_padrao: 50.0,
      dia_vencimento_padrao: 10,
      tipo_ciclo: 'MENSAL_PAGAMENTO',
      status_ficha: 'BLOQUEADO',
      created_at: '2026-07-01T11:00:00Z',
      updated_at: '2026-09-22T09:00:00Z',
    },
    {
      id: 'f5555555-5555-5555-5555-555555555555',
      cliente_id: 'c5555555-5555-5555-5555-555555555555',
      saldo_devedor_total: 0.0,
      valor_parcela_padrao: 85.0,
      dia_vencimento_padrao: 5,
      tipo_ciclo: 'MENSAL_PAGAMENTO',
      status_ficha: 'QUITADO',
      created_at: '2026-08-20T16:00:00Z',
      updated_at: '2026-09-05T10:00:00Z',
    },
  ],
  vendas: [
    {
      id: 'v1111111-1111-1111-1111-111111111111',
      cliente_id: 'c1111111-1111-1111-1111-111111111111',
      tipo_venda: 'PRONTA_ENTREGA',
      forma_pagamento: 'CREDIARIO',
      valor_total: 280.0,
      valor_entrada: 0.0,
      valor_financiado_ficha: 280.0,
      status_venda: 'CONCLUIDA',
      observacoes: 'Jogo de panelas cerâmica vermelha',
      created_at: '2026-08-05T11:00:00Z',
    },
    {
      id: 'v1111111-1111-1111-1111-111111111112',
      cliente_id: 'c1111111-1111-1111-1111-111111111111',
      tipo_venda: 'PRONTA_ENTREGA',
      forma_pagamento: 'CREDIARIO',
      valor_total: 200.0,
      valor_entrada: 0.0,
      valor_financiado_ficha: 200.0,
      status_venda: 'CONCLUIDA',
      observacoes: 'Edredom Casal Queen Toque de Pluma Floral',
      created_at: '2026-08-20T15:30:00Z',
    },
    {
      id: 'v2222222-2222-2222-2222-222222222221',
      cliente_id: 'c2222222-2222-2222-2222-222222222222',
      tipo_venda: 'PRONTA_ENTREGA',
      forma_pagamento: 'CREDIARIO',
      valor_total: 320.0,
      valor_entrada: 0.0,
      valor_financiado_ficha: 320.0,
      status_venda: 'CONCLUIDA',
      observacoes: 'Cobredon Aveludado Casal Dupla Face',
      created_at: '2026-08-25T14:00:00Z',
    },
    {
      id: 'v3333333-3333-3333-3333-333333333331',
      cliente_id: 'c3333333-3333-3333-3333-333333333333',
      tipo_venda: 'PRONTA_ENTREGA',
      forma_pagamento: 'CREDIARIO',
      valor_total: 350.0,
      valor_entrada: 0.0,
      valor_financiado_ficha: 350.0,
      status_venda: 'CONCLUIDA',
      observacoes: 'Saldo Inicial de Migração - Ficha Física nº 85',
      created_at: '2026-08-15T09:00:00Z',
    },
  ],
  itens_venda: [
    {
      id: 'iv-001',
      venda_id: 'v1111111-1111-1111-1111-111111111111',
      descricao_item: 'Jogo de Panelas 5 Peças Cerâmica Antiaderente Cereja',
      quantidade: 1,
      preco_unitario: 280.0,
      subtotal: 280.0,
      tipo_item: 'ESTOQUE_LOCAL',
      created_at: '2026-08-05T11:00:00Z',
    },
    {
      id: 'iv-002',
      venda_id: 'v1111111-1111-1111-1111-111111111112',
      descricao_item: 'Edredom Casal Queen Toque de Pluma Floral Rosa',
      quantidade: 1,
      preco_unitario: 200.0,
      subtotal: 200.0,
      tipo_item: 'ESTOQUE_LOCAL',
      created_at: '2026-08-20T15:30:00Z',
    },
    {
      id: 'iv-003',
      venda_id: 'v2222222-2222-2222-2222-222222222221',
      descricao_item: 'Cobredon Aveludado Casal Dupla Face Geométrico',
      quantidade: 1,
      preco_unitario: 320.0,
      subtotal: 320.0,
      tipo_item: 'ESTOQUE_LOCAL',
      created_at: '2026-08-25T14:00:00Z',
    },
    {
      id: 'iv-004',
      venda_id: 'v3333333-3333-3333-3333-333333333331',
      descricao_item: 'Saldo Inicial de Migração - Ficha Física nº 85',
      quantidade: 1,
      preco_unitario: 350.0,
      subtotal: 350.0,
      tipo_item: 'ESTOQUE_LOCAL',
      created_at: '2026-08-15T09:00:00Z',
    },
  ],
  encomendas: [
    {
      id: 'enc-001',
      item_venda_id: 'iv-002',
      fornecedor_nome: 'Corttex Distribuidora',
      data_previsao_chegada: '2026-10-05',
      status_encomenda: 'A_CAMINHO',
      created_at: '2026-09-20T16:00:00Z',
    },
  ],
  pedidos: [],
  movimentacoes_ficha: [
    {
      id: 'm-001',
      ficha_id: 'f1111111-1111-1111-1111-111111111111',
      venda_id: 'v1111111-1111-1111-1111-111111111111',
      tipo_movimentacao: 'DEBITO_COMPRA',
      valor: 280.0,
      saldo_anterior: 0.0,
      saldo_posterior: 280.0,
      descricao: 'Compra a Prazo: Jogo de Panelas 5 Peças Cerâmica Cereja',
      created_at: '2026-08-05T11:00:00Z',
    },
    {
      id: 'm-002',
      ficha_id: 'f1111111-1111-1111-1111-111111111111',
      venda_id: 'v1111111-1111-1111-1111-111111111112',
      tipo_movimentacao: 'DEBITO_COMPRA',
      valor: 200.0,
      saldo_anterior: 280.0,
      saldo_posterior: 480.0,
      descricao: 'Compra a Prazo: Edredom Casal Queen Toque de Pluma Floral',
      created_at: '2026-08-20T15:30:00Z',
    },
    {
      id: 'm-003',
      ficha_id: 'f1111111-1111-1111-1111-111111111111',
      tipo_movimentacao: 'CREDITO_PAGAMENTO',
      valor: 150.0,
      saldo_anterior: 480.0,
      saldo_posterior: 330.0,
      descricao: 'Pagamento Pix recebido: Marido transferiu no dia do salário',
      created_at: '2026-09-05T12:30:00Z',
    },
    {
      id: 'm-004',
      ficha_id: 'f1111111-1111-1111-1111-111111111111',
      tipo_movimentacao: 'CREDITO_PAGAMENTO',
      valor: 100.0,
      saldo_anterior: 330.0,
      saldo_posterior: 230.0,
      descricao: 'Pagamento em Dinheiro no balcão: Vale quinzenal',
      created_at: '2026-09-20T14:15:00Z',
    },
    {
      id: 'm-005',
      ficha_id: 'f1111111-1111-1111-1111-111111111111',
      tipo_movimentacao: 'CREDITO_PAGAMENTO',
      valor: 110.0,
      saldo_anterior: 230.0,
      saldo_posterior: 120.0,
      descricao: 'Pagamento Pix recebido: Panela 100% quitada!',
      created_at: '2026-09-22T09:45:00Z',
    },
  ],
  configuracoes: [
    {
      id: '1',
      chave_pix: '18991234567',
      nome_titular_pix: 'Enxovais Gabriel',
      nome_loja: 'Enxovais Gabriel',
      nome_atelie: 'Enxovais Gabriel',
      template_boas_vindas: 'Olá, {nome_cliente}! Seu pedido de {descricao_itens} foi registrado na {nome_atelie}. Previsão de entrega: {data_previsao_entrega}.',
      template_cobranca_pix: 'Olá, {nome_cliente}! Seu pedido de {descricao_itens} está pronto! O saldo restante é R$ {valor_restante}. Chave Pix: {chave_pix} ({nome_titular_pix}).',
      template_venda_crediario: 'Olá, {nome_cliente}! Sua compra de R$ {valor_compra} foi registrada no crediário.',
      template_lembrete_pagamento: 'Olá, {nome_cliente}! Lembramos que hoje é dia de pagamento na Enxovais Gabriel.',
      template_recibo_pagamento: 'Olá, {nome_cliente}! Recebemos seu pagamento de R$ {valor_pago}. Novo saldo: R$ {saldo_restante}.',
      template_encomenda_chegou: 'Olá, {nome_cliente}! Sua encomenda chegou à loja!',
    },
  ],
};

// Mock query executor para quando PostgreSQL não estiver acessível
function executeMemoryQuery(queryText: string, params: any[] = []): { rows: any[] } {
  const q = queryText.trim();
  const qUpper = q.toUpperCase();

  // 1. Clientes
  if (qUpper.includes('INSERT INTO CLIENTES')) {
    const id = uuidv4();
    const novoCliente = {
      id,
      nome: params[0] || 'Cliente',
      whatsapp: params[1] ?? '',
      telefone: params[1] ?? '',
      cpf: params[2] || null,
      endereco: params[3] || null,
      ponto_referencia: params[4] || null,
      limite_credito: Number(params[5]) || 1000.00,
      observacoes: params[6] || null,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.clientes.push(novoCliente);
    return { rows: [novoCliente] };
  }

  if (qUpper.includes('UPDATE CLIENTES')) {
    const id = params[params.length - 1];
    const cli = memoryStore.clientes.find((c) => c.id === id);
    if (cli) {
      if (params.length === 8) {
        // atualizarCadastroRapidoFicha
        cli.nome = params[0] ?? cli.nome;
        cli.whatsapp = params[1] ?? cli.whatsapp;
        cli.telefone = params[1] ?? cli.telefone;
        cli.cpf = params[2] !== undefined ? params[2] : cli.cpf;
        cli.endereco = params[3] !== undefined ? params[3] : cli.endereco;
        cli.ponto_referencia = params[4] !== undefined ? params[4] : cli.ponto_referencia;
        cli.limite_credito = params[5] !== undefined ? Number(params[5]) : cli.limite_credito;
        cli.observacoes = params[6] !== undefined ? params[6] : cli.observacoes;
      } else if (params.length === 7) {
        // executarImportacao
        cli.nome = params[0] || cli.nome;
        cli.cpf = params[1] || cli.cpf;
        cli.endereco = params[2] || cli.endereco;
        cli.ponto_referencia = params[3] || cli.ponto_referencia;
        cli.observacoes = params[4] || cli.observacoes;
        cli.limite_credito = Number(params[5]) || cli.limite_credito;
      }
      cli.updated_at = new Date().toISOString();
      return { rows: [cli] };
    }
    return { rows: [] };
  }

  if (qUpper.includes('SELECT') && qUpper.includes('FROM CLIENTES')) {
    if (qUpper.includes('WHERE ID =') || qUpper.includes('WHERE C.ID =') || qUpper.includes('WHERE CLIENTES.ID =')) {
      const id = params[0];
      const cli = memoryStore.clientes.find((c) => c.id === id);
      return { rows: cli ? [cli] : [] };
    }

    if (qUpper.includes('WHERE OBSERVACOES LIKE')) {
      const pattern = String(params[0] || '').replace(/%/g, '').toLowerCase();
      const cli = memoryStore.clientes.find((c) => String(c.observacoes || '').toLowerCase().includes(pattern));
      return { rows: cli ? [cli] : [] };
    }

    if (qUpper.includes('WHERE LOWER(NOME) = LOWER')) {
      const targetName = String(params[0] || '').toLowerCase();
      const cli = memoryStore.clientes.find((c) => String(c.nome || '').toLowerCase() === targetName);
      return { rows: cli ? [cli] : [] };
    }

    if (qUpper.includes('WHERE WHATSAPP = $1 AND LOWER(NOME) = LOWER($2)')) {
      const targetZap = String(params[0] || '');
      const targetName = String(params[1] || '').toLowerCase();
      const cli = memoryStore.clientes.find(
        (c) => String(c.whatsapp || '') === targetZap && String(c.nome || '').toLowerCase() === targetName
      );
      return { rows: cli ? [cli] : [] };
    }

    if (qUpper.includes('WHERE WHATSAPP = $1')) {
      const targetZap = String(params[0] || '');
      const cli = memoryStore.clientes.find((c) => String(c.whatsapp || '') === targetZap);
      return { rows: cli ? [cli] : [] };
    }

    // Listagem com join de fichas
    const term = params[0] ? String(params[0]).replace(/%/g, '').toLowerCase() : '';
    let filtered = memoryStore.clientes.filter((c) => c.ativo !== false);
    if (term) {
      filtered = filtered.filter((c) =>
        (c.nome && c.nome.toLowerCase().includes(term)) ||
        (c.whatsapp && c.whatsapp.toLowerCase().includes(term))
      );
    }

    const rows = filtered.map((c) => {
      const ficha = memoryStore.fichas_crediario.find((f) => f.cliente_id === c.id);
      return {
        ...c,
        saldo_devedor_total: ficha ? ficha.saldo_devedor_total : 0.00,
        valor_parcela_padrao: ficha ? ficha.valor_parcela_padrao : 50.00,
        dia_vencimento_padrao: ficha ? ficha.dia_vencimento_padrao : 5,
        status_ficha: ficha ? ficha.status_ficha : 'ATIVO',
      };
    });
    return { rows };
  }

  // 2. Fichas de Crediário
  if (qUpper.includes('INSERT INTO FICHAS_CREDIARIO')) {
    const clienteId = params[0];
    const saldo = Number(params[1]) || 0.00;
    const parcela = Number(params[2]) || 50.00;
    const diaVenc = Number(params[3]) || 5;
    const tipoCiclo = params[4] || (diaVenc === 20 ? 'QUINZENAL_VALE' : 'MENSAL_PAGAMENTO');
    const diaValeSec = params[5] || null;
    const obsFicha = params[6] || null;

    let ficha = memoryStore.fichas_crediario.find((f) => f.cliente_id === clienteId);
    if (ficha) {
      ficha.valor_parcela_padrao = parcela;
      ficha.dia_vencimento_padrao = diaVenc;
      ficha.saldo_devedor_total = saldo;
      if (obsFicha) ficha.observacoes = obsFicha;
    } else {
      ficha = {
        id: uuidv4(),
        cliente_id: clienteId,
        saldo_devedor_total: saldo,
        valor_parcela_padrao: parcela,
        dia_vencimento_padrao: diaVenc,
        tipo_ciclo: tipoCiclo,
        dia_vale_secundario: diaValeSec,
        status_ficha: 'ATIVO',
        observacoes: obsFicha,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.fichas_crediario.push(ficha);
    }
    return { rows: [ficha] };
  }

  if (qUpper.includes('SELECT') && qUpper.includes('FROM FICHAS_CREDIARIO')) {
    const enrichFichaRow = (f: any) => {
      const cli = memoryStore.clientes.find((c) => c.id === f.cliente_id) || {};
      return {
        ...f,
        observacoes: f.observacoes || cli.observacoes || null,
        cliente_nome: cli.nome || 'Cliente',
        cliente_whatsapp: cli.whatsapp ?? cli.telefone ?? '',
        cliente_telefone: cli.telefone ?? cli.whatsapp ?? '',
        cliente_cpf: cli.cpf || null,
        cliente_endereco: cli.endereco || '',
        cliente_ponto_referencia: cli.ponto_referencia || null,
        cliente_limite_credito: cli.limite_credito ?? 1000,
        cliente_observacoes: cli.observacoes || null,
      };
    };

    if (qUpper.includes('WHERE F.ID = $1 OR F.CLIENTE_ID = $1') || qUpper.includes('WHERE ID = $1 OR CLIENTE_ID = $1')) {
      const id = params[0];
      const ficha = memoryStore.fichas_crediario.find((f) => f.id === id || f.cliente_id === id);
      return { rows: ficha ? [enrichFichaRow(ficha)] : [] };
    }
    if (qUpper.includes('WHERE CLIENTE_ID =') || qUpper.includes('WHERE F.CLIENTE_ID =')) {
      const cliId = params[0];
      const ficha = memoryStore.fichas_crediario.find((f) => f.cliente_id === cliId);
      return { rows: ficha ? [enrichFichaRow(ficha)] : [] };
    }
    if (qUpper.includes('WHERE ID =') || qUpper.includes('WHERE F.ID =')) {
      const id = params[0];
      const ficha = memoryStore.fichas_crediario.find((f) => f.id === id);
      return { rows: ficha ? [enrichFichaRow(ficha)] : [] };
    }

    let rows = memoryStore.fichas_crediario.map(enrichFichaRow);

    // Filtros opcionais da query de listFichas
    let pIdx = 0;
    if (qUpper.includes('F.DIA_VENCIMENTO_PADRAO =')) {
      const dia = Number(params[pIdx++]);
      rows = rows.filter((r) => Number(r.dia_vencimento_padrao) === dia || Number(r.dia_vale_secundario) === dia);
    }
    if (qUpper.includes('F.STATUS_FICHA =')) {
      const st = String(params[pIdx++]);
      rows = rows.filter((r) => r.status_ficha === st);
    }
    if (qUpper.includes('C.NOME ILIKE')) {
      const term = String(params[pIdx++] || '').replace(/%/g, '').toLowerCase();
      if (term) {
        rows = rows.filter(
          (r) =>
            String(r.cliente_nome || '').toLowerCase().includes(term) ||
            String(r.cliente_whatsapp || '').toLowerCase().includes(term) ||
            String(r.observacoes || '').toLowerCase().includes(term)
        );
      }
    }

    rows.sort((a, b) => (Number(b.saldo_devedor_total) - Number(a.saldo_devedor_total)) || String(a.cliente_nome).localeCompare(String(b.cliente_nome)));
    return { rows };
  }

  if (qUpper.includes('UPDATE FICHAS_CREDIARIO')) {
    const id = params[params.length - 1];
    let ficha = memoryStore.fichas_crediario.find((f) => f.id === id || f.cliente_id === id);
    if (ficha) {
      if (params.length === 6) {
        // atualizarCadastroRapidoFicha: [novoSaldo, novaParcela, novoDiaVenc, novoStatus, novasObs, atual.id]
        ficha.saldo_devedor_total = Number(params[0]);
        ficha.valor_parcela_padrao = Number(params[1]);
        ficha.dia_vencimento_padrao = Number(params[2]);
        ficha.status_ficha = params[3] || ficha.status_ficha;
        ficha.observacoes = params[4] !== undefined ? params[4] : ficha.observacoes;
      } else if (params.length === 7) {
        // executarImportacao
        ficha.saldo_devedor_total = Number(params[0]);
        ficha.valor_parcela_padrao = Number(params[1]);
        ficha.dia_vencimento_padrao = Number(params[2]);
        ficha.tipo_ciclo = params[3] || ficha.tipo_ciclo;
        ficha.dia_vale_secundario = params[4] || null;
        ficha.observacoes = params[5] || ficha.observacoes;
      } else if (params.length === 5) {
        // ajustarSaldoManual: [novoSaldo, valorParcela, diaVencimento, statusFicha, params.fichaId]
        ficha.saldo_devedor_total = Number(params[0]);
        ficha.valor_parcela_padrao = Number(params[1]);
        ficha.dia_vencimento_padrao = Number(params[2]);
        ficha.status_ficha = params[3] || ficha.status_ficha;
      } else if (params.length >= 1 && typeof params[0] === 'number') {
        ficha.saldo_devedor_total = params[0];
        if (params.length === 3 && typeof params[1] === 'string') {
          ficha.status_ficha = params[1];
        }
      }
      ficha.updated_at = new Date().toISOString();
      return { rows: [ficha] };
    }
    return { rows: [] };
  }

  // 3. Produtos
  if (qUpper.includes('INSERT INTO PRODUTOS')) {
    const id = uuidv4();
    const novoProduto = {
      id,
      codigo_sku: params[0] || `SKU-${Date.now()}`,
      nome: params[1] || 'Produto',
      descricao: params[2] || '',
      categoria: params[3] || 'OUTROS',
      preco_custo: Number(params[4]) || 0,
      preco_venda_vista: Number(params[5]) || 0,
      preco_venda_crediario: Number(params[6]) || 0,
      estoque_atual: Number(params[7]) || 10,
      estoque_minimo: Number(params[8]) || 2,
      permite_encomenda: params[9] !== undefined ? Boolean(params[9]) : true,
      foto_url: params[10] || null,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.produtos.push(novoProduto);
    return { rows: [novoProduto] };
  }

  if (qUpper.includes('UPDATE PRODUTOS')) {
    if (qUpper.includes('WHERE ID =')) {
      const id = params[params.length - 1];
      const prodIndex = memoryStore.produtos.findIndex((p) => p.id === id);
      if (prodIndex >= 0) {
        const prod = memoryStore.produtos[prodIndex];
        if (qUpper.includes('SET ATIVO = FALSE') || qUpper.includes('ATIVO = $') || qUpper.includes('ATIVO = FALSE')) {
          prod.ativo = false;
        } else if (qUpper.includes('ESTOQUE_ATUAL = GREATEST')) {
          const delta = Number(params[0]) || 0;
          prod.estoque_atual = Math.max(0, (prod.estoque_atual || 0) + delta);
        } else if (params.length >= 10) {
          prod.nome = params[0] !== undefined ? params[0] : prod.nome;
          prod.descricao = params[1] !== undefined ? params[1] : prod.descricao;
          prod.categoria = params[2] !== undefined ? params[2] : prod.categoria;
          prod.preco_custo = params[3] !== undefined ? Number(params[3]) : prod.preco_custo;
          prod.preco_venda_vista = params[4] !== undefined ? Number(params[4]) : prod.preco_venda_vista;
          prod.preco_venda_crediario = params[5] !== undefined ? Number(params[5]) : prod.preco_venda_crediario;
          prod.estoque_atual = params[6] !== undefined ? Number(params[6]) : prod.estoque_atual;
          prod.estoque_minimo = params[7] !== undefined ? Number(params[7]) : prod.estoque_minimo;
          prod.permite_encomenda = params[8] !== undefined ? Boolean(params[8]) : prod.permite_encomenda;
          prod.foto_url = params[9] !== undefined ? params[9] : prod.foto_url;
        }
        prod.updated_at = new Date().toISOString();
        return { rows: [prod] };
      }
      return { rows: [] };
    }
  }

  if (qUpper.includes('SELECT') && qUpper.includes('FROM PRODUTOS')) {
    if (qUpper.includes('WHERE ID =')) {
      const id = params[0];
      const prod = memoryStore.produtos.find((p) => p.id === id);
      return { rows: prod ? [prod] : [] };
    }
    return { rows: memoryStore.produtos.filter((p) => p.ativo !== false) };
  }

  // 4. Pedidos / Encomendas
  if (qUpper.includes('INSERT INTO ENCOMENDAS')) {
    const id = uuidv4();
    const novaEncomenda = {
      id,
      item_venda_id: params[0],
      fornecedor_nome: params[1] || 'Distribuidor Parceiro',
      data_previsao_chegada: params[2] || null,
      status_encomenda: 'SOLICITADA',
      created_at: new Date().toISOString(),
    };
    memoryStore.encomendas.push(novaEncomenda);
    return { rows: [novaEncomenda] };
  }

  if (qUpper.includes('SELECT') && qUpper.includes('FROM ENCOMENDAS')) {
    return { rows: memoryStore.encomendas };
  }

  if (qUpper.includes('INSERT INTO PEDIDOS')) {
    const id = uuidv4();
    const valorTotal = Number(params[3]) || 0;
    const valorSinal = Number(params[4]) || 0;
    const novoPedido = {
      id,
      cliente_id: params[0],
      descricao_itens: params[1] || '',
      data_previsao_entrega: params[2] || new Date().toISOString().split('T')[0],
      valor_total: valorTotal,
      valor_sinal: valorSinal,
      valor_restante: Math.max(0, valorTotal - valorSinal),
      status_pagamento: params[5] || (valorSinal > 0 ? 'SINAL_PAGO' : 'AGUARDANDO_SINAL'),
      foto_referencia_url: params[6] || null,
      status_producao: 'FILA',
      notificacao_boas_vindas_enviada: false,
      notificacao_pronto_enviada: false,
      data_pedido: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.pedidos.push(novoPedido);
    return { rows: [novoPedido] };
  }

  if (qUpper.includes('UPDATE PEDIDOS')) {
    const id = params[params.length - 1];
    const ped = memoryStore.pedidos.find((p) => p.id === id);
    if (ped) {
      if (qUpper.includes('NOTIFICACAO_BOAS_VINDAS_ENVIADA')) {
        ped.notificacao_boas_vindas_enviada = true;
      } else if (qUpper.includes('NOTIFICACAO_PRONTO_ENVIADA')) {
        ped.notificacao_pronto_enviada = true;
      } else {
        ped.status_producao = params[0] || ped.status_producao;
        ped.status_pagamento = params[1] || ped.status_pagamento;
      }
      ped.updated_at = new Date().toISOString();
      return { rows: [ped] };
    }
    return { rows: [] };
  }

  if (qUpper.includes('SELECT') && qUpper.includes('FROM PEDIDOS')) {
    const rows = memoryStore.pedidos.map((p) => {
      const cli = memoryStore.clientes.find((c) => c.id === p.cliente_id) || {};
      return {
        ...p,
        cliente_nome: cli.nome || 'Cliente',
        cliente_whatsapp: cli.whatsapp || cli.telefone || '',
      };
    });

    if (qUpper.includes('WHERE P.ID =') || qUpper.includes('WHERE ID =')) {
      const id = params[0];
      const found = rows.find((p) => p.id === id);
      return { rows: found ? [found] : [] };
    }

    if (qUpper.includes('WHERE CLIENTE_ID =')) {
      const cliId = params[0];
      return { rows: rows.filter((p) => p.cliente_id === cliId) };
    }

    return { rows };
  }

  // 5. Vendas
  if (qUpper.includes('INSERT INTO VENDAS')) {
    const id = uuidv4();
    const novaVenda = {
      id,
      cliente_id: params[0],
      tipo_venda: params[1] || 'PRONTA_ENTREGA',
      forma_pagamento: params[2],
      valor_total: Number(params[3]) || 0,
      valor_entrada: Number(params[4]) || 0,
      valor_financiado_ficha: Number(params[5]) || 0,
      status_venda: params[6] || 'CONCLUIDA',
      observacoes: params[7] || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.vendas.push(novaVenda);
    return { rows: [novaVenda] };
  }

  if (qUpper.includes('INSERT INTO ITENS_VENDA')) {
    const id = uuidv4();
    const novoItem = {
      id,
      venda_id: params[0],
      produto_id: params[1] || null,
      descricao_item: params[2] || '',
      quantidade: Number(params[3]) || 1,
      preco_unitario: Number(params[4]) || 0,
      tipo_item: params[5] || 'ESTOQUE_LOCAL',
      created_at: new Date().toISOString(),
    };
    memoryStore.itens_venda.push(novoItem);
    return { rows: [novoItem] };
  }

  if (qUpper.includes('SELECT') && qUpper.includes('FROM ITENS_VENDA')) {
    const clienteId = params[0];
    const vendasDoCliente = memoryStore.vendas.filter((v) => !clienteId || v.cliente_id === clienteId);
    const vendaIds = vendasDoCliente.map((v) => v.id);
    const itens = memoryStore.itens_venda
      .filter((it) => !clienteId || vendaIds.includes(it.venda_id))
      .map((it) => {
        const v = memoryStore.vendas.find((ven) => ven.id === it.venda_id);
        return {
          ...it,
          subtotal: it.subtotal || (it.quantidade * it.preco_unitario),
          data_venda: v ? v.created_at : it.created_at,
        };
      });
    return { rows: itens };
  }

  if (qUpper.includes('SELECT') && qUpper.includes('FROM VENDAS')) {
    if (qUpper.includes('WHERE V.ID =') || qUpper.includes('WHERE ID =')) {
      const id = params[0];
      const venda = memoryStore.vendas.find((v) => v.id === id);
      return { rows: venda ? [venda] : [] };
    }
    if (qUpper.includes('WHERE V.CLIENTE_ID =') || qUpper.includes('WHERE CLIENTE_ID =')) {
      const cliId = params[0];
      const vendasCliente = memoryStore.vendas.filter((v) => v.cliente_id === cliId);
      return { rows: vendasCliente };
    }
    return { rows: memoryStore.vendas };
  }

  // 6. Movimentações
  if (qUpper.includes('INSERT INTO MOVIMENTACOES_FICHA')) {
    const id = uuidv4();
    const novaMov: any = {
      id,
      ficha_id: params[0],
      cliente_id: null,
      venda_id: null,
      tipo_movimentacao: qUpper.includes('CREDITO_PAGAMENTO') ? 'CREDITO_PAGAMENTO' : 'DEBITO_COMPRA',
      valor: 0,
      saldo_anterior: 0,
      saldo_posterior: 0,
      descricao: '',
      data_movimentacao: new Date().toISOString().split('T')[0],
      forma_pagamento: qUpper.includes('CREDITO_PAGAMENTO') ? 'DINHEIRO' : 'CREDIARIO',
      numero_parcela_ref: null,
      observacoes: null,
      created_at: new Date().toISOString(),
    };

    if (params.length === 7) {
      novaMov.venda_id = params[1] || null;
      novaMov.tipo_movimentacao = params[2];
      novaMov.valor = Number(params[3]) || 0;
      novaMov.saldo_anterior = Number(params[4]) || 0;
      novaMov.saldo_posterior = Number(params[5]) || 0;
      novaMov.descricao = params[6] || '';
    } else if (params.length >= 9) {
      novaMov.cliente_id = params[1] || null;
      const hasVendaId = qUpper.includes('VENDA_ID');
      const offset = hasVendaId ? 1 : 0;
      if (hasVendaId) novaMov.venda_id = params[2] || null;
      novaMov.valor = Number(params[2 + offset]) || 0;
      novaMov.saldo_anterior = Number(params[3 + offset]) || 0;
      novaMov.saldo_posterior = Number(params[4 + offset]) || 0;
      novaMov.descricao = params[5 + offset] || '';
      novaMov.data_movimentacao = params[6 + offset] || novaMov.data_movimentacao;
      if (qUpper.includes('CREDITO_PAGAMENTO')) {
        novaMov.forma_pagamento = params[7 + offset] || 'DINHEIRO';
        novaMov.numero_parcela_ref = params[8 + offset] || null;
        novaMov.observacoes = params[9 + offset] || null;
      } else {
        novaMov.numero_parcela_ref = params[7 + offset] || null;
        novaMov.observacoes = params[8 + offset] || null;
      }
    } else {
      for (const p of params) {
        if (typeof p === 'number' && novaMov.valor === 0) novaMov.valor = p;
        else if (typeof p === 'string' && (p === 'DEBITO_COMPRA' || p === 'CREDITO_PAGAMENTO' || p === 'AJUSTE_PARCELA' || p === 'ESTORNO')) {
          novaMov.tipo_movimentacao = p;
        } else if (typeof p === 'string' && p.length > 5 && !novaMov.descricao) {
          novaMov.descricao = p;
        }
      }
    }

    memoryStore.movimentacoes_ficha.push(novaMov);
    return { rows: [novaMov] };
  }

  if (qUpper.includes('SELECT') && qUpper.includes('FROM MOVIMENTACOES_FICHA')) {
    if (qUpper.includes('WHERE FICHA_ID =') && params[0]) {
      return { rows: memoryStore.movimentacoes_ficha.filter((m) => m.ficha_id === params[0]) };
    }
    return { rows: memoryStore.movimentacoes_ficha };
  }

  // 7. Configurações
  if (qUpper.includes('SELECT') && qUpper.includes('FROM CONFIGURACOES')) {
    return { rows: memoryStore.configuracoes };
  }

  if (qUpper.includes('UPDATE CONFIGURACOES')) {
    if (memoryStore.configuracoes.length > 0) {
      const cfg = memoryStore.configuracoes[0];
      if (params.length >= 6) {
        cfg.chave_pix = params[0] || cfg.chave_pix;
        cfg.nome_titular_pix = params[1] || cfg.nome_titular_pix;
        cfg.nome_atelie = params[2] || cfg.nome_atelie;
        cfg.template_boas_vindas = params[3] || cfg.template_boas_vindas;
        cfg.template_cobranca_pix = params[4] || cfg.template_cobranca_pix;
      }
      return { rows: [cfg] };
    }
    return { rows: [] };
  }

  // 8. Parcelas de Crediário
  if (qUpper.includes('SELECT') && qUpper.includes('FROM PARCELAS_CREDIARIO')) {
    return { rows: [] };
  }

  if (qUpper.includes('UPDATE PARCELAS_CREDIARIO') || qUpper.includes('INSERT INTO PARCELAS_CREDIARIO')) {
    return { rows: [] };
  }

  // Comandos de controle transacional no MemoryStore
  if (qUpper === 'BEGIN' || qUpper === 'COMMIT' || qUpper === 'ROLLBACK') {
    return { rows: [] };
  }

  return { rows: [] };
}

export interface DbClient {
  query: <T = any>(text: string, params?: any[]) => Promise<{ rows: T[] }>;
  release: () => void;
}

// Pool interceptor com fallback automático
export const pool = {
  query: async <T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> => {
    if (isPostgresConnected) {
      try {
        const res = await rawPool.query(text, params);
        return res as unknown as { rows: T[] };
      } catch (err: any) {
        if (err?.code === 'ECONNREFUSED' || err?.message?.includes('Connection refused')) {
          isPostgresConnected = false;
          console.warn('⚠️ [Database] PostgreSQL desconectado. Alternando automaticamente para Memory Store.');
          return executeMemoryQuery(text, params) as any;
        }
        throw err;
      }
    }

    // Se o Postgres ainda não respondeu, tenta uma vez ou cai no fallback de memória
    try {
      const res = await rawPool.query(text, params);
      isPostgresConnected = true;
      return res as unknown as { rows: T[] };
    } catch {
      return executeMemoryQuery(text, params) as any;
    }
  },
  connect: async (): Promise<DbClient> => {
    try {
      const client = await rawPool.connect();
      isPostgresConnected = true;
      return client;
    } catch {
      isPostgresConnected = false;
      return {
        query: async <T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> => {
          return executeMemoryQuery(text, params) as any;
        },
        release: () => {},
      };
    }
  },
  on: (event: any, listener: (...args: any[]) => void) => {
    rawPool.on(event, listener);
  },
  end: async () => {
    try {
      return await rawPool.end();
    } catch {
      // Ignora erro de finalização de pool offline
    }
  },
};

export async function initDatabase(): Promise<void> {
  try {
    const client = await rawPool.connect();
    isPostgresConnected = true;
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

      // Criação de todas as tabelas essenciais se não existirem
      await client.query(`
        CREATE TABLE IF NOT EXISTS clientes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome VARCHAR(150) NOT NULL,
          whatsapp VARCHAR(20) NOT NULL,
          cpf VARCHAR(14),
          endereco TEXT,
          ponto_referencia TEXT,
          limite_credito NUMERIC(10, 2) NOT NULL DEFAULT 1000.00,
          observacoes TEXT,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS produtos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          codigo_sku VARCHAR(50),
          nome VARCHAR(150) NOT NULL,
          descricao TEXT,
          categoria VARCHAR(50) NOT NULL DEFAULT 'OUTROS',
          preco_custo NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
          preco_venda_vista NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
          preco_venda_crediario NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
          estoque_atual INT NOT NULL DEFAULT 0,
          estoque_minimo INT NOT NULL DEFAULT 2,
          permite_encomenda BOOLEAN NOT NULL DEFAULT TRUE,
          foto_url TEXT,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        ALTER TABLE produtos ADD COLUMN IF NOT EXISTS foto_url TEXT;

        CREATE TABLE IF NOT EXISTS fichas_crediario (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cliente_id UUID NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
          saldo_devedor_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
          valor_parcela_padrao NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
          dia_vencimento_padrao INT NOT NULL DEFAULT 5,
          tipo_ciclo VARCHAR(30) NOT NULL DEFAULT 'MENSAL_PAGAMENTO',
          dia_vale_secundario INT,
          status_ficha VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
          observacoes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS vendas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
          tipo_venda VARCHAR(30) NOT NULL DEFAULT 'PRONTA_ENTREGA',
          forma_pagamento VARCHAR(30) NOT NULL,
          valor_total NUMERIC(10, 2) NOT NULL,
          valor_entrada NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
          valor_financiado_ficha NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
          status_venda VARCHAR(30) NOT NULL DEFAULT 'CONCLUIDA',
          observacoes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS itens_venda (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
          produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
          descricao_item VARCHAR(200) NOT NULL,
          quantidade INT NOT NULL DEFAULT 1,
          preco_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
          tipo_item VARCHAR(30) NOT NULL DEFAULT 'ESTOQUE_LOCAL',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS encomendas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item_venda_id UUID NOT NULL REFERENCES itens_venda(id) ON DELETE CASCADE,
          fornecedor_nome VARCHAR(100),
          data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
          data_previsao_chegada DATE,
          data_recebimento DATE,
          status_encomenda VARCHAR(30) NOT NULL DEFAULT 'SOLICITADA',
          codigo_rastreio_fornecedor VARCHAR(100),
          observacoes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS movimentacoes_ficha (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ficha_id UUID NOT NULL REFERENCES fichas_crediario(id) ON DELETE CASCADE,
          cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
          venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
          tipo_movimentacao VARCHAR(30) NOT NULL,
          valor NUMERIC(10, 2) NOT NULL,
          saldo_anterior NUMERIC(10, 2) NOT NULL,
          saldo_posterior NUMERIC(10, 2) NOT NULL,
          descricao VARCHAR(255) NOT NULL,
          data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
          forma_pagamento VARCHAR(30) DEFAULT 'OUTRO',
          numero_parcela_ref VARCHAR(50),
          observacoes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        ALTER TABLE movimentacoes_ficha ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE;
        ALTER TABLE movimentacoes_ficha ADD COLUMN IF NOT EXISTS data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE;
        ALTER TABLE movimentacoes_ficha ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(30) DEFAULT 'OUTRO';
        ALTER TABLE movimentacoes_ficha ADD COLUMN IF NOT EXISTS numero_parcela_ref VARCHAR(50);
        ALTER TABLE movimentacoes_ficha ADD COLUMN IF NOT EXISTS observacoes TEXT;

        CREATE INDEX IF NOT EXISTS idx_movimentacoes_ficha_id ON movimentacoes_ficha (ficha_id);
        CREATE INDEX IF NOT EXISTS idx_movimentacoes_cliente_id ON movimentacoes_ficha (cliente_id);
        CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_ficha (data_movimentacao);

        CREATE TABLE IF NOT EXISTS parcelas_crediario (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ficha_id UUID NOT NULL REFERENCES fichas_crediario(id) ON DELETE CASCADE,
          numero_parcela INT NOT NULL,
          valor_parcela NUMERIC(10, 2) NOT NULL,
          data_vencimento DATE NOT NULL,
          data_pagamento DATE,
          valor_pago NUMERIC(10, 2) DEFAULT 0.00,
          status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS configuracoes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          chave_pix VARCHAR(100) NOT NULL DEFAULT '12345678900',
          nome_titular_pix VARCHAR(150) NOT NULL DEFAULT 'Enxovais Gabriel',
          nome_loja VARCHAR(100) NOT NULL DEFAULT 'Enxovais Gabriel',
          template_venda_crediario TEXT,
          template_lembrete_pagamento TEXT,
          template_recibo_pagamento TEXT,
          template_encomenda_chegou TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS logs_mensagens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
          venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
          ficha_id UUID REFERENCES fichas_crediario(id) ON DELETE SET NULL,
          telefone_destino VARCHAR(20) NOT NULL,
          tipo_mensagem VARCHAR(50) NOT NULL,
          status_envio VARCHAR(20) NOT NULL,
          detalhes_erro TEXT,
          payload_enviado TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Inserção de produtos padrão do catálogo e da planilha da mãe
        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Churrasqueira Portátil Inox', 'OUTROS', 180.00, 300.00, 340.00, 8, 2, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Churrasqueira Portátil Inox');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Cobre-Leito Queen Estampado', 'CAMA_MESA_BANHO', 190.00, 320.00, 360.00, 10, 2, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Cobre-Leito Queen Estampado');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Jogo de Lençol Casal 4 Peças (Algodão)', 'CAMA_MESA_BANHO', 90.00, 150.00, 170.00, 15, 3, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Jogo de Lençol Casal 4 Peças (Algodão)');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Fritadeira Elétrica Air Fryer 4L', 'COZINHA', 280.00, 480.00, 536.00, 6, 2, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Fritadeira Elétrica Air Fryer 4L');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Cama Box / Colchão Casal Ortopédico', 'CAMA_MESA_BANHO', 450.00, 750.00, 850.00, 4, 1, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Cama Box / Colchão Casal Ortopédico');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Jogo de Panelas Cava Antiaderente (5 Peças)', 'COZINHA', 320.00, 540.00, 600.00, 5, 2, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Jogo de Panelas Cava Antiaderente (5 Peças)');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Frigideira Grande Antiaderente Profissional', 'COZINHA', 130.00, 220.00, 255.00, 8, 2, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Frigideira Grande Antiaderente Profissional');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Cobredon Aveludado Casal Dupla Face', 'CAMA_MESA_BANHO', 160.00, 280.00, 320.00, 12, 3, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Cobredon Aveludado Casal Dupla Face');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Panela de Pressão 10 Litros Reforçada', 'COZINHA', 150.00, 240.00, 280.00, 7, 2, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Panela de Pressão 10 Litros Reforçada');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Conjunto Toalhas Banhão 4 Peças', 'CAMA_MESA_BANHO', 85.00, 140.00, 160.00, 20, 4, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Conjunto Toalhas Banhão 4 Peças');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Conjunto Cadeiras Dobráveis Reforçadas (Par)', 'ORGANIZACAO', 140.00, 240.00, 280.00, 8, 2, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Conjunto Cadeiras Dobráveis Reforçadas (Par)');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Kit Potes Herméticos Cozinha (6 un)', 'ORGANIZACAO', 45.00, 85.00, 95.00, 20, 5, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Kit Potes Herméticos Cozinha (6 un)');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Escorredor de Louça Inox 2 Andares', 'COZINHA', 75.00, 130.00, 145.00, 8, 2, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Escorredor de Louça Inox 2 Andares');

        INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
        SELECT 'Cortina Corta Luz Blackout 2,80 x 1,80', 'DECORACAO', 90.00, 160.00, 180.00, 9, 2, true
        WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Cortina Corta Luz Blackout 2,80 x 1,80');

        -- Garante que clientes sem WhatsApp ou familiares com o mesmo telefone possam ser salvos sem bloqueio de constraint
        ALTER TABLE clientes ALTER COLUMN whatsapp SET DEFAULT '';
        ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_whatsapp_key;
        DROP INDEX IF EXISTS idx_clientes_whatsapp_unique;
        ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_valor_total_check;
        ALTER TABLE vendas ADD CONSTRAINT vendas_valor_total_check CHECK (valor_total >= 0);

        -- Inserção de configuração padrão somente se a tabela estiver vazia
        INSERT INTO configuracoes (
          chave_pix,
          nome_titular_pix,
          nome_loja,
          template_venda_crediario,
          template_lembrete_pagamento,
          template_recibo_pagamento,
          template_encomenda_chegou
        )
        SELECT
          '12345678900',
          'Enxovais Gabriel',
          'Enxovais Gabriel',
          'Olá, {nome_cliente}! Sua compra de R$ {valor_compra} foi registrada no crediário.',
          'Olá, {nome_cliente}! Lembramos que hoje é dia de pagamento na Enxovais Gabriel.',
          'Olá, {nome_cliente}! Recebemos seu pagamento de R$ {valor_pago}. Novo saldo: R$ {saldo_restante}.',
          'Olá, {nome_cliente}! Sua encomenda chegou à loja!'
        WHERE NOT EXISTS (SELECT 1 FROM configuracoes);
      `);

      await seedFichasDigitalizadasPostgres(client);

      console.log('✅ [PostgreSQL] Schema verificado e pronto para operações.');
    } finally {
      client.release();
    }
  } catch (error) {
    isPostgresConnected = false;
    console.log('ℹ️ [Database] Operando com Memory Store Resiliente (PostgreSQL offline no momento).');
  }
}

function parseCsvLineSimple(line: string, sep = ';'): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result.map((c) => c.replace(/^["']|["']$/g, '').trim());
}

function resolveCsvDigitalizadasPath(): string | undefined {
  const possiblePaths = [
    path.resolve(process.cwd(), 'fichas_digitalizadas_completas.csv'),
    path.resolve(process.cwd(), '../fichas_digitalizadas_completas.csv'),
    path.resolve(process.cwd(), 'fotos fichas/fichas_digitalizadas_completas.csv'),
    path.resolve(process.cwd(), '../fotos fichas/fichas_digitalizadas_completas.csv'),
  ];
  return possiblePaths.find((p) => fs.existsSync(p));
}

async function seedFichasDigitalizadasPostgres(client: any): Promise<void> {
  try {
    const csvPath = resolveCsvDigitalizadasPath();
    if (!csvPath) return;

    const rawContent = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
    const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return;

    const existingRes = await client.query('SELECT observacoes FROM fichas_crediario');
    const existingObsList: string[] = (existingRes.rows || []).map((r: any) => String(r.observacoes || ''));

    const seenNames = new Map<string, number>();
    let inseridas = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = parseCsvLineSimple(lines[i], ';');
        if (cols.length < 10) continue;

        const [
          arquivos_origem,
          codigo_ficha,
          rawNome,
          rawWhatsapp,
          cpf,
          endereco,
          valor_total_compra,
          ponto_referencia,
          limite_credito,
          dia_vencimento,
          tipo_ciclo,
          saldo_devedor_atual,
          valor_parcela,
          observacoes,
          produtos,
          data_venda,
          pagamento_parcelas,
        ] = cols;

        if (!rawNome) continue;

        const nameKey = rawNome.toLowerCase().trim();
        const countName = (seenNames.get(nameKey) || 0) + 1;
        seenNames.set(nameKey, countName);
        const nomeFinal = countName > 1 && codigo_ficha ? `${rawNome.trim()} (Ficha ${codigo_ficha})` : rawNome.trim();

        // Verifica se já foi importada anteriormente pelo marcador da foto de origem
        const firstPhoto = (arquivos_origem || '').split('+')[0]?.trim();
        if (firstPhoto && existingObsList.some((obs) => obs.includes(firstPhoto))) {
          continue;
        }

        const digitsZap = (rawWhatsapp || '').replace(/\D/g, '');
        const zapFormatado =
          digitsZap.length >= 10 && digitsZap.length <= 11 && !digitsZap.startsWith('55')
            ? `55${digitsZap}`
            : digitsZap;

        const notas: string[] = [];
        if (codigo_ficha) notas.push(`Ficha Física: ${codigo_ficha}`);
        if (arquivos_origem) notas.push(`Fotos: ${arquivos_origem}`);
        if (observacoes) notas.push(observacoes);
        if (produtos) notas.push(`Produtos: ${produtos}`);
        if (valor_total_compra) notas.push(`Total Compra: ${valor_total_compra}`);
        if (data_venda) notas.push(`Data Compra: ${data_venda}`);
        if (pagamento_parcelas) notas.push(`Histórico Pgto: ${pagamento_parcelas}`);
        const obsUnificada = notas.join(' | ');

        const saldoNum = parseFloat((saldo_devedor_atual || '0').replace(',', '.')) || 0;
        const parcelaNum = parseFloat((valor_parcela || '100').replace(',', '.')) || 100;
        const limiteNum = parseFloat((limite_credito || '1000').replace(',', '.')) || 1000;
        const diaVencNum = Math.max(1, Math.min(31, parseInt(dia_vencimento || '10', 10) || 10));
        const cicloFinal = (tipo_ciclo || '').toUpperCase().includes('QUINZENAL') ? 'QUINZENAL_VALE' : 'MENSAL_PAGAMENTO';
        const statusFicha = saldoNum === 0 ? 'QUITADO' : 'ATIVO';

        const cliRes = await client.query(
          `INSERT INTO clientes (nome, whatsapp, cpf, endereco, ponto_referencia, limite_credito, observacoes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [nomeFinal, zapFormatado || '', cpf || null, endereco || '', ponto_referencia || null, limiteNum, obsUnificada]
        );
        const clienteId = cliRes.rows[0].id;

        const fichaRes = await client.query(
          `INSERT INTO fichas_crediario (cliente_id, saldo_devedor_total, valor_parcela_padrao, dia_vencimento_padrao, tipo_ciclo, status_ficha, observacoes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [clienteId, saldoNum, parcelaNum, diaVencNum, cicloFinal, statusFicha, obsUnificada]
        );
        const fichaId = fichaRes.rows[0].id;

        const parsedValor = parseFloat(String(valor_total_compra || '').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const valorCompraNum = Math.max(saldoNum, parsedValor);

        if (valorCompraNum > 0) {
          const jaPago = Math.max(0, Number((valorCompraNum - saldoNum).toFixed(2)));
          const vendaRes = await client.query(
            `INSERT INTO vendas (cliente_id, tipo_venda, forma_pagamento, valor_total, valor_entrada, valor_financiado_ficha, status_venda, observacoes)
             VALUES ($1, 'PRONTA_ENTREGA', 'CREDIARIO', $2, $3, $4, 'CONCLUIDA', $5)
             RETURNING id`,
            [clienteId, valorCompraNum, jaPago, saldoNum, obsUnificada]
          );
          const vendaId = vendaRes.rows[0]?.id || null;

          if (vendaId) {
            await client.query(
              `INSERT INTO itens_venda (venda_id, descricao_item, quantidade, preco_unitario, tipo_item)
               VALUES ($1, $2, 1, $3, 'ESTOQUE_LOCAL')`,
              [vendaId, (produtos || `Compra na Ficha Física ${codigo_ficha || ''}`).slice(0, 195), valorCompraNum]
            );
          }

          await client.query(
            `INSERT INTO movimentacoes_ficha (ficha_id, cliente_id, venda_id, tipo_movimentacao, valor, saldo_anterior, saldo_posterior, descricao, forma_pagamento, observacoes)
             VALUES ($1, $2, $3, 'DEBITO_COMPRA', $4, 0, $5, $6, 'CREDIARIO', $7)`,
            [
              fichaId,
              clienteId,
              vendaId,
              valorCompraNum,
              saldoNum,
              `Ficha Física ${codigo_ficha || ''}: ${produtos || 'Compra migrada'}`.slice(0, 240),
              obsUnificada,
            ]
          );
        }

        existingObsList.push(obsUnificada);
        inseridas++;
      } catch (itemErr) {
        console.warn(`⚠️ [PostgreSQL] Erro ao importar ficha linha ${i}:`, itemErr);
      }
    }

    if (inseridas > 0) {
      console.log(`✅ [PostgreSQL] ${inseridas} fichas digitalizadas importadas automaticamente para o banco.`);
    }
  } catch (err) {
    console.warn('⚠️ [PostgreSQL] Aviso ao importar seed de fichas digitalizadas:', err);
  }
}

function seedFichasDigitalizadasMemory(): void {
  try {
    const csvPath = resolveCsvDigitalizadasPath();
    if (!csvPath) return;

    const rawContent = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
    const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return;

    const seenNames = new Map<string, number>();

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLineSimple(lines[i], ';');
      if (cols.length < 10) continue;

      const [
        arquivos_origem,
        codigo_ficha,
        rawNome,
        rawWhatsapp,
        cpf,
        endereco,
        valor_total_compra,
        ponto_referencia,
        limite_credito,
        dia_vencimento,
        tipo_ciclo,
        saldo_devedor_atual,
        valor_parcela,
        observacoes,
        produtos,
        data_venda,
        pagamento_parcelas,
      ] = cols;

      if (!rawNome) continue;

      // Evita duplicar se já tiver sido carregado
      if (arquivos_origem && memoryStore.fichas_crediario.some((f) => String(f.observacoes || '').includes(arquivos_origem))) {
        continue;
      }

      const nameKey = rawNome.toLowerCase().trim();
      const countName = (seenNames.get(nameKey) || 0) + 1;
      seenNames.set(nameKey, countName);
      const nomeFinal = countName > 1 && codigo_ficha ? `${rawNome.trim()} (Ficha ${codigo_ficha})` : rawNome.trim();

      const digitsZap = (rawWhatsapp || '').replace(/\D/g, '');
      const zapFormatado =
        digitsZap.length >= 10 && digitsZap.length <= 11 && !digitsZap.startsWith('55')
          ? `55${digitsZap}`
          : digitsZap;

      const notas: string[] = [];
      if (codigo_ficha) notas.push(`Ficha Física: ${codigo_ficha}`);
      if (arquivos_origem) notas.push(`Fotos: ${arquivos_origem}`);
      if (observacoes) notas.push(observacoes);
      if (produtos) notas.push(`Produtos: ${produtos}`);
      if (valor_total_compra) notas.push(`Total Compra: ${valor_total_compra}`);
      if (data_venda) notas.push(`Data Compra: ${data_venda}`);
      if (pagamento_parcelas) notas.push(`Histórico Pgto: ${pagamento_parcelas}`);
      const obsUnificada = notas.join(' | ');

      const clienteId = `cli-dig-${String(i).padStart(3, '0')}`;
      const fichaId = `ficha-dig-${String(i).padStart(3, '0')}`;
      const saldoNum = parseFloat((saldo_devedor_atual || '0').replace(',', '.')) || 0;
      const parcelaNum = parseFloat((valor_parcela || '100').replace(',', '.')) || 100;
      const limiteNum = parseFloat((limite_credito || '1000').replace(',', '.')) || 1000;
      const diaVencNum = Math.max(1, Math.min(31, parseInt(dia_vencimento || '10', 10) || 10));

      memoryStore.clientes.push({
        id: clienteId,
        nome: nomeFinal,
        whatsapp: zapFormatado,
        telefone: digitsZap,
        cpf: cpf || null,
        endereco: endereco || '',
        ponto_referencia: ponto_referencia || null,
        limite_credito: limiteNum,
        observacoes: obsUnificada,
        ativo: true,
        created_at: '2026-10-28T12:00:00Z',
        updated_at: '2026-10-28T12:00:00Z',
      });

      memoryStore.fichas_crediario.push({
        id: fichaId,
        cliente_id: clienteId,
        saldo_devedor_total: saldoNum,
        valor_parcela_padrao: parcelaNum,
        dia_vencimento_padrao: diaVencNum,
        tipo_ciclo: (tipo_ciclo || '').toUpperCase().includes('QUINZENAL') ? 'QUINZENAL_VALE' : 'MENSAL_PAGAMENTO',
        status_ficha: saldoNum === 0 ? 'QUITADO' : 'ATIVO',
        observacoes: obsUnificada,
        created_at: '2026-10-28T12:00:00Z',
        updated_at: '2026-10-28T12:00:00Z',
      });

      const valorCompraNum = Math.max(
        saldoNum,
        parseFloat(String(valor_total_compra || '').replace(/[^\d.,]/g, '').replace(',', '.')) || saldoNum
      );

      if (valorCompraNum > 0 || produtos) {
        const vendaId = `venda-dig-${String(i).padStart(3, '0')}`;
        const itemId = `item-dig-${String(i).padStart(3, '0')}`;
        const jaPago = Math.max(0, Number((valorCompraNum - saldoNum).toFixed(2)));

        memoryStore.vendas.push({
          id: vendaId,
          cliente_id: clienteId,
          tipo_venda: 'PRONTA_ENTREGA',
          forma_pagamento: 'CREDIARIO',
          valor_total: valorCompraNum,
          valor_entrada: jaPago,
          valor_financiado_ficha: saldoNum,
          status_venda: 'CONCLUIDA',
          observacoes: obsUnificada,
          created_at: '2026-10-28T12:00:00Z',
        });

        memoryStore.itens_venda.push({
          id: itemId,
          venda_id: vendaId,
          descricao_item: produtos || `Compra na Ficha Física ${codigo_ficha || ''}`.trim(),
          quantidade: 1,
          preco_unitario: valorCompraNum,
          subtotal: valorCompraNum,
          tipo_item: 'ESTOQUE_LOCAL',
          created_at: '2026-10-28T12:00:00Z',
        });

        memoryStore.movimentacoes_ficha.push({
          id: `mov-dig-${String(i).padStart(3, '0')}`,
          ficha_id: fichaId,
          cliente_id: clienteId,
          venda_id: vendaId,
          tipo_movimentacao: 'DEBITO_COMPRA',
          valor: valorCompraNum,
          saldo_anterior: 0,
          saldo_posterior: saldoNum,
          descricao: `Ficha Física ${codigo_ficha || ''}: ${produtos || 'Compra migrada'}${pagamento_parcelas ? ' (' + pagamento_parcelas + ')' : ''}`.trim(),
          data_movimentacao: '2026-10-28',
          forma_pagamento: 'CREDIARIO',
          observacoes: obsUnificada,
          created_at: '2026-10-28T12:00:00Z',
        });
      }
    }
  } catch (err) {
    console.warn('⚠️ [Database] Falha ao carregar seed das fichas digitalizadas:', err);
  }
}

seedFichasDigitalizadasMemory();
