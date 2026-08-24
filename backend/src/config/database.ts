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
  clientes: [
    {
      id: 'c1111111-1111-1111-1111-111111111111',
      nome: 'Dona Francisca Silva',
      whatsapp: '5511998765432',
      telefone: '11998765432',
      cpf: '123.456.789-01',
      endereco: 'Rua das Flores, 120 - Jardim Primavera',
      ponto_referencia: 'Em frente à Padaria Central',
      limite_credito: 1500.00,
      observacoes: 'Cliente antiga e muito pontual no pagamento do dia 05',
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'c2222222-2222-2222-2222-222222222222',
      nome: 'Maria Aparecida Souza',
      whatsapp: '5511987654321',
      telefone: '11987654321',
      cpf: '234.567.890-12',
      endereco: 'Av. Brasil, 450 - Centro',
      ponto_referencia: 'Próximo ao Mercado Silva',
      limite_credito: 1000.00,
      observacoes: 'Recebe adiantamento dia 20 (vale da fábrica)',
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  produtos: [
    {
      id: 'p1111111-1111-1111-1111-111111111111',
      codigo_sku: 'EDR-QN-01',
      nome: 'Edredom Casal Queen Dupla Face Soft Touch',
      descricao: 'Edredom aveludado dupla face em micropercal 300 fios',
      categoria: 'CAMA',
      preco_custo: 85.00,
      preco_venda_vista: 160.00,
      preco_venda_crediario: 180.00,
      preco_venda: 180.00,
      estoque_atual: 12,
      estoque: 12,
      emoji: '🛏️',
      ativo: true,
    },
    {
      id: 'p2222222-2222-2222-2222-222222222222',
      codigo_sku: 'PAN-5P-01',
      nome: 'Jogo de Panelas 5 Peças Antiaderente Teflon Extra',
      descricao: 'Alumínio reforçado com cabos em baquelite antitérmico',
      categoria: 'COZINHA',
      preco_custo: 95.00,
      preco_venda_vista: 190.00,
      preco_venda_crediario: 220.00,
      preco_venda: 220.00,
      estoque_atual: 6,
      estoque: 6,
      emoji: '🍳',
      ativo: true,
    },
  ],
  fichas_crediario: [
    {
      id: 'f1111111-1111-1111-1111-111111111111',
      cliente_id: 'c1111111-1111-1111-1111-111111111111',
      saldo_devedor_total: 300.00,
      valor_parcela_padrao: 100.00,
      dia_vencimento_padrao: 5,
      tipo_ciclo: 'MENSAL_PAGAMENTO',
      status_ficha: 'ATIVO',
      created_at: new Date().toISOString(),
    },
    {
      id: 'f2222222-2222-2222-2222-222222222222',
      cliente_id: 'c2222222-2222-2222-2222-222222222222',
      saldo_devedor_total: 240.00,
      valor_parcela_padrao: 80.00,
      dia_vencimento_padrao: 20,
      tipo_ciclo: 'QUINZENAL_VALE',
      status_ficha: 'ATIVO',
      created_at: new Date().toISOString(),
    },
  ],
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
      ativo: true,
      created_at: new Date().toISOString(),
    };
    memoryStore.produtos.push(novoProduto);
    return { rows: [novoProduto] };
  }

  if (qUpper.includes('SELECT') && qUpper.includes('FROM PRODUTOS')) {
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
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

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
      const countResult = await client.query('SELECT COUNT(*) FROM clientes;');
      const totalClientes = parseInt(countResult.rows[0]?.count || '0', 10);

      if (totalClientes === 0) {
        console.log('🌱 [PostgreSQL] Inserindo clientes e dados iniciais de demonstração...');
        
        // 1. Clientes
        const c1 = await client.query(`
          INSERT INTO clientes (nome, whatsapp, cpf, endereco, ponto_referencia, limite_credito, observacoes)
          VALUES ('Dona Francisca Silva', '5511998765432', '123.456.789-01', 'Rua das Flores, 120 - Jardim Primavera', 'Em frente à Padaria Central', 1500.00, 'Cliente antiga e muito pontual no pagamento do dia 05')
          RETURNING id;
        `);
        const c2 = await client.query(`
          INSERT INTO clientes (nome, whatsapp, cpf, endereco, ponto_referencia, limite_credito, observacoes)
          VALUES ('Maria Aparecida Souza', '5511987654321', '234.567.890-12', 'Av. Brasil, 450 - Centro', 'Próximo ao Mercado Silva', 1000.00, 'Recebe adiantamento dia 20 (vale da fábrica)')
          RETURNING id;
        `);
        const c3 = await client.query(`
          INSERT INTO clientes (nome, whatsapp, cpf, endereco, ponto_referencia, limite_credito, observacoes)
          VALUES ('Ana Paula Oliveira', '5511976543210', '345.678.901-23', 'Rua São João, 78 - Vila Nova', 'Casa amarela com portão branco', 1200.00, 'Prefere pagar todo dia 05 via Pix')
          RETURNING id;
        `);
        const c4 = await client.query(`
          INSERT INTO clientes (nome, whatsapp, cpf, endereco, ponto_referencia, limite_credito, observacoes)
          VALUES ('Juliana Mendes', '5511965432109', '456.789.012-34', 'Rua Tiradentes, 890 - Bairro Alto', 'Ao lado da farmácia', 800.00, 'Recebe adiantamento dia 20')
          RETURNING id;
        `);

        // 2. Fichas de Crediário
        if (c1.rows[0]?.id) {
          await client.query(`
            INSERT INTO fichas_crediario (cliente_id, saldo_devedor_total, valor_parcela_padrao, dia_vencimento_padrao, tipo_ciclo)
            VALUES ($1, 300.00, 100.00, 5, 'MENSAL_PAGAMENTO');
          `, [c1.rows[0].id]);
        }
        if (c2.rows[0]?.id) {
          await client.query(`
            INSERT INTO fichas_crediario (cliente_id, saldo_devedor_total, valor_parcela_padrao, dia_vencimento_padrao, tipo_ciclo)
            VALUES ($1, 240.00, 80.00, 20, 'QUINZENAL_VALE');
          `, [c2.rows[0].id]);
        }
        if (c3.rows[0]?.id) {
          await client.query(`
            INSERT INTO fichas_crediario (cliente_id, saldo_devedor_total, valor_parcela_padrao, dia_vencimento_padrao, tipo_ciclo)
            VALUES ($1, 450.00, 150.00, 5, 'MENSAL_PAGAMENTO');
          `, [c3.rows[0].id]);
        }
        if (c4.rows[0]?.id) {
          await client.query(`
            INSERT INTO fichas_crediario (cliente_id, saldo_devedor_total, valor_parcela_padrao, dia_vencimento_padrao, tipo_ciclo)
            VALUES ($1, 160.00, 80.00, 20, 'QUINZENAL_VALE');
          `, [c4.rows[0].id]);
        }

        // 3. Produtos
        await client.query(`
          INSERT INTO produtos (codigo_sku, nome, descricao, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual)
          VALUES 
            ('EDR-QN-01', 'Edredom Casal Queen Dupla Face Soft Touch', 'Edredom aveludado dupla face em micropercal 300 fios', 'CAMA', 85.00, 160.00, 180.00, 8),
            ('JGC-QN-02', 'Jogo de Cama Queen 4 Peças 400 Fios', '100% Algodão acetinado toque acetinado', 'CAMA', 65.00, 120.00, 140.00, 12),
            ('PAN-5P-01', 'Jogo de Panelas 5 Peças Antiaderente Teflon Extra', 'Alumínio reforçado com cabos em baquelite antitérmico', 'COZINHA', 95.00, 190.00, 220.00, 5),
            ('TOA-BN-04', 'Conjunto Toalhas Banhão 4 Peças', 'Gramatura 500g/m² 100% algodão', 'CAMA', 50.00, 95.00, 110.00, 15),
            ('POT-HR-05', 'Kit Potes Herméticos Cozinha (6 un)', 'Vidro borossilicato com tampa de bambu', 'ORGANIZACAO', 40.00, 75.00, 85.00, 20);
        `);

        console.log('✅ [PostgreSQL] Schema, tabelas e dados iniciais verificados com sucesso.');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    isPostgresConnected = false;
    console.log('ℹ️ [Database] Operando com Memory Store Resiliente (PostgreSQL offline no momento).');
  }
}
