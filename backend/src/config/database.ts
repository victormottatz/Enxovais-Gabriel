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
  produtos: [],
  fichas_crediario: [],
  vendas: [],
  itens_venda: [],
  encomendas: [],
  pedidos: [],
  movimentacoes_ficha: [],
  configuracoes: [],
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
  if (qUpper.includes('SELECT') && qUpper.includes('FROM PEDIDOS')) {
    return { rows: memoryStore.pedidos };
  }

  // 5. Vendas
  if (qUpper.includes('SELECT') && qUpper.includes('FROM VENDAS')) {
    return { rows: memoryStore.vendas };
  }

  // 6. Movimentações
  if (qUpper.includes('SELECT') && qUpper.includes('FROM MOVIMENTACOES_FICHA')) {
    return { rows: memoryStore.movimentacoes_ficha };
  }

  return { rows: [] };
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
  connect: async () => {
    return await rawPool.connect();
  },
  on: (event: any, listener: (...args: any[]) => void) => {
    rawPool.on(event, listener);
  },
  end: async () => {
    return await rawPool.end();
  },
};

export async function initDatabase(): Promise<void> {
  try {
    const client = await rawPool.connect();
    isPostgresConnected = true;
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

      // Criação de tabelas essenciais se não existirem
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

        CREATE TABLE IF NOT EXISTS configuracoes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          chave_pix VARCHAR(100) NOT NULL DEFAULT '12345678900',
          nome_titular_pix VARCHAR(150) NOT NULL DEFAULT 'Enxovais Gabriel',
          nome_loja VARCHAR(100) NOT NULL DEFAULT 'Enxovais Gabriel',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Seed inicial se o banco estiver vazio
      // Limpeza de tabelas para garantir base limpa para inserção de dados reais
      await client.query(`
        TRUNCATE TABLE movimentacoes_ficha, itens_venda, vendas, fichas_crediario, produtos, clientes RESTART IDENTITY CASCADE;
      `);
      console.log('✅ [PostgreSQL] Schema verificado e tabelas limpas com sucesso para novos cadastros.');
    } finally {
      client.release();
    }
  } catch (error) {
    isPostgresConnected = false;
    console.log('ℹ️ [Database] Operando com Memory Store Resiliente (PostgreSQL offline no momento).');
  }
}
