import pg from 'pg';
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
  clientes: [],
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
  fichas_crediario: [],
  vendas: [],
  itens_venda: [],
  encomendas: [],
  pedidos: [],
  movimentacoes_ficha: [],
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
      whatsapp: params[1] || '',
      telefone: params[1] || '',
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

  if (qUpper.includes('SELECT') && qUpper.includes('FROM CLIENTES')) {
    if (qUpper.includes('WHERE ID =') || qUpper.includes('WHERE C.ID =') || qUpper.includes('WHERE CLIENTES.ID =')) {
      const id = params[0];
      const cli = memoryStore.clientes.find((c) => c.id === id);
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

    let ficha = memoryStore.fichas_crediario.find((f) => f.cliente_id === clienteId);
    if (ficha) {
      ficha.valor_parcela_padrao = parcela;
      ficha.dia_vencimento_padrao = diaVenc;
      ficha.saldo_devedor_total = saldo;
    } else {
      ficha = {
        id: uuidv4(),
        cliente_id: clienteId,
        saldo_devedor_total: saldo,
        valor_parcela_padrao: parcela,
        dia_vencimento_padrao: diaVenc,
        tipo_ciclo: diaVenc === 20 ? 'QUINZENAL_VALE' : 'MENSAL_PAGAMENTO',
        status_ficha: 'ATIVO',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.fichas_crediario.push(ficha);
    }
    return { rows: [ficha] };
  }

  if (qUpper.includes('SELECT') && qUpper.includes('FROM FICHAS_CREDIARIO')) {
    if (qUpper.includes('WHERE CLIENTE_ID =') || qUpper.includes('WHERE F.CLIENTE_ID =')) {
      const cliId = params[0];
      const ficha = memoryStore.fichas_crediario.find((f) => f.cliente_id === cliId);
      return { rows: ficha ? [ficha] : [] };
    }
    if (qUpper.includes('WHERE ID =') || qUpper.includes('WHERE F.ID =')) {
      const id = params[0];
      const ficha = memoryStore.fichas_crediario.find((f) => f.id === id);
      return { rows: ficha ? [ficha] : [] };
    }

    const rows = memoryStore.fichas_crediario.map((f) => {
      const cli = memoryStore.clientes.find((c) => c.id === f.cliente_id) || {};
      return {
        ...f,
        cliente_nome: cli.nome || 'Cliente',
        cliente_whatsapp: cli.whatsapp || cli.telefone || '',
        cliente_telefone: cli.telefone || cli.whatsapp || '',
        cliente_endereco: cli.endereco || '',
      };
    });
    return { rows };
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

  if (qUpper.includes('SELECT') && qUpper.includes('FROM VENDAS')) {
    return { rows: memoryStore.vendas };
  }

  // 6. Movimentações
  if (qUpper.includes('INSERT INTO MOVIMENTACOES_FICHA')) {
    const id = uuidv4();
    const novaMov = {
      id,
      ficha_id: params[0],
      venda_id: params[1] || null,
      tipo_movimentacao: params[2],
      valor: Number(params[3]) || 0,
      saldo_anterior: Number(params[4]) || 0,
      saldo_posterior: Number(params[5]) || 0,
      descricao: params[6] || '',
      created_at: new Date().toISOString(),
    };
    memoryStore.movimentacoes_ficha.push(novaMov);
    return { rows: [novaMov] };
  }

  if (qUpper.includes('SELECT') && qUpper.includes('FROM MOVIMENTACOES_FICHA')) {
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
          venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
          tipo_movimentacao VARCHAR(30) NOT NULL,
          valor NUMERIC(10, 2) NOT NULL,
          saldo_anterior NUMERIC(10, 2) NOT NULL,
          saldo_posterior NUMERIC(10, 2) NOT NULL,
          descricao VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

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

      console.log('✅ [PostgreSQL] Schema verificado e pronto para operações.');
    } finally {
      client.release();
    }
  } catch (error) {
    isPostgresConnected = false;
    console.log('ℹ️ [Database] Operando com Memory Store Resiliente (PostgreSQL offline no momento).');
  }
}
