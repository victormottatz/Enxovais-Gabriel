import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool(
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
        connectionTimeoutMillis: 5000,
      }
);

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool de conexões do PostgreSQL:', err);
});

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome VARCHAR(150) NOT NULL,
          whatsapp VARCHAR(20) NOT NULL,
          cpf VARCHAR(14),
          endereco TEXT,
          ponto_referencia TEXT,
          limite_credito NUMERIC(10, 2) NOT NULL DEFAULT 1000.00 CHECK (limite_credito >= 0),
          observacoes TEXT,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (nome);
      CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp ON clientes (whatsapp);

      CREATE TABLE IF NOT EXISTS produtos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          codigo_sku VARCHAR(50) UNIQUE,
          nome VARCHAR(150) NOT NULL,
          descricao TEXT,
          categoria VARCHAR(50) NOT NULL DEFAULT 'OUTROS',
          preco_custo NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (preco_custo >= 0),
          preco_venda_vista NUMERIC(10, 2) NOT NULL CHECK (preco_venda_vista >= 0),
          preco_venda_crediario NUMERIC(10, 2) NOT NULL CHECK (preco_venda_crediario >= 0),
          estoque_atual INT NOT NULL DEFAULT 0 CHECK (estoque_atual >= 0),
          estoque_minimo INT NOT NULL DEFAULT 2 CHECK (estoque_minimo >= 0),
          permite_encomenda BOOLEAN NOT NULL DEFAULT TRUE,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos (nome);

      CREATE TABLE IF NOT EXISTS fichas_crediario (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cliente_id UUID NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
          saldo_devedor_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (saldo_devedor_total >= 0),
          valor_parcela_padrao NUMERIC(10, 2) NOT NULL DEFAULT 100.00 CHECK (valor_parcela_padrao > 0),
          dia_vencimento_padrao INT NOT NULL DEFAULT 5 CHECK (dia_vencimento_padrao BETWEEN 1 AND 31),
          tipo_ciclo VARCHAR(30) NOT NULL DEFAULT 'MENSAL_PAGAMENTO' CHECK (tipo_ciclo IN ('MENSAL_PAGAMENTO', 'QUINZENAL_VALE')),
          dia_vale_secundario INT CHECK (dia_vale_secundario BETWEEN 1 AND 31),
          status_ficha VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status_ficha IN ('ATIVO', 'BLOQUEADO', 'QUITADO')),
          observacoes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vendas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
          tipo_venda VARCHAR(30) NOT NULL DEFAULT 'PRONTA_ENTREGA' CHECK (tipo_venda IN ('PRONTA_ENTREGA', 'ENCOMENDA', 'MISTA')),
          forma_pagamento VARCHAR(30) NOT NULL CHECK (forma_pagamento IN ('CREDIARIO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'MISTO')),
          valor_total NUMERIC(10, 2) NOT NULL CHECK (valor_total > 0),
          valor_entrada NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (valor_entrada >= 0),
          valor_financiado_ficha NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (valor_financiado_ficha >= 0),
          status_venda VARCHAR(30) NOT NULL DEFAULT 'CONCLUIDA' CHECK (status_venda IN ('CONCLUIDA', 'AGUARDANDO_ENCOMENDA', 'CANCELADA')),
          observacoes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS itens_venda (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
          produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
          descricao_item VARCHAR(200) NOT NULL,
          quantidade INT NOT NULL CHECK (quantidade > 0),
          preco_unitario NUMERIC(10, 2) NOT NULL CHECK (preco_unitario >= 0),
          subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
          tipo_item VARCHAR(30) NOT NULL DEFAULT 'ESTOQUE_LOCAL' CHECK (tipo_item IN ('ESTOQUE_LOCAL', 'ENCOMENDA')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS encomendas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item_venda_id UUID NOT NULL REFERENCES itens_venda(id) ON DELETE CASCADE,
          fornecedor_nome VARCHAR(100),
          data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
          data_previsao_chegada DATE,
          data_recebimento DATE,
          status_encomenda VARCHAR(30) NOT NULL DEFAULT 'SOLICITADA' CHECK (status_encomenda IN ('SOLICITADA', 'A_CAMINHO', 'RECEBIDA_ESTOQUE', 'ENTREGUE_CLIENTE')),
          codigo_rastreio_fornecedor VARCHAR(100),
          observacoes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS pedidos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
          descricao_itens TEXT NOT NULL,
          data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
          data_previsao_entrega DATE,
          valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (valor_total >= 0),
          valor_sinal NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (valor_sinal >= 0),
          valor_restante NUMERIC(10, 2) GENERATED ALWAYS AS (valor_total - valor_sinal) STORED,
          status_producao VARCHAR(30) NOT NULL DEFAULT 'FILA' CHECK (status_producao IN ('FILA', 'EM_PRODUCAO', 'PRONTO_ENTREGA', 'ENTREGUE')),
          status_pagamento VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO_SINAL' CHECK (status_pagamento IN ('AGUARDANDO_SINAL', 'SINAL_PAGO', 'PAGO_INTEGRAL')),
          notificacao_boas_vindas_enviada BOOLEAN NOT NULL DEFAULT FALSE,
          notificacao_pronto_enviada BOOLEAN NOT NULL DEFAULT FALSE,
          foto_referencia_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos (cliente_id);
      CREATE INDEX IF NOT EXISTS idx_pedidos_status_producao ON pedidos (status_producao);

      CREATE TABLE IF NOT EXISTS movimentacoes_ficha (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ficha_id UUID NOT NULL REFERENCES fichas_crediario(id) ON DELETE CASCADE,
          venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
          tipo_movimentacao VARCHAR(30) NOT NULL CHECK (tipo_movimentacao IN ('DEBITO_COMPRA', 'CREDITO_PAGAMENTO', 'AJUSTE_PARCELA', 'ESTORNO')),
          valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
          saldo_anterior NUMERIC(10, 2) NOT NULL,
          saldo_posterior NUMERIC(10, 2) NOT NULL,
          descricao VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS parcelas_crediario (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ficha_id UUID NOT NULL REFERENCES fichas_crediario(id) ON DELETE CASCADE,
          numero_parcela INT NOT NULL CHECK (numero_parcela > 0),
          valor_parcela NUMERIC(10, 2) NOT NULL CHECK (valor_parcela > 0),
          data_vencimento DATE NOT NULL,
          data_pagamento DATE,
          valor_pago NUMERIC(10, 2) DEFAULT 0.00 CHECK (valor_pago >= 0),
          status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO_TOTAL', 'PAGO_PARCIAL', 'ATRASADO', 'CANCELADO')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS configuracoes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          chave_pix VARCHAR(100) NOT NULL,
          nome_titular_pix VARCHAR(150) NOT NULL,
          nome_loja VARCHAR(100) NOT NULL DEFAULT 'Enxovais Gabriel',
          template_venda_crediario TEXT NOT NULL,
          template_lembrete_pagamento TEXT NOT NULL,
          template_recibo_pagamento TEXT NOT NULL,
          template_encomenda_chegou TEXT NOT NULL,
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
    `);

    // Inserir configuração padrão se não existir
    await client.query(`
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
          'contato@enxovaisgabriel.com.br', 
          'Enxovais Gabriel & Cia', 
          'Enxovais Gabriel',
          'Olá, {nome_cliente}! ✨\\nSua compra na *{nome_loja}* foi registrada com sucesso no seu crediário!\\n\\n🛍️ *Itens:* {descricao_itens}\\n💰 *Valor desta Compra:* R$ {valor_compra}\\n📊 *Saldo Total na sua Ficha:* R$ {saldo_total}\\n📅 *Sua Parcela:* R$ {valor_parcela} (todo dia {dia_vencimento})\\n\\nAgradecemos imensamente pela preferência e confiança! 🏠❤️',
          'Olá, {nome_cliente}! Tudo bem? 🥰\\nPassando para lembrar que hoje é o dia do seu pagamento/vale na *{nome_loja}*.\\n\\n💳 *Valor da sua Parcela:* R$ {valor_parcela}\\n📊 *Saldo Restante na Ficha:* R$ {saldo_total}\\n\\nVocê pode realizar o pagamento direto pelo Pix abaixo:\\nChave Pix ({nome_titular_pix}): {chave_pix}\\n(Copia e cola)\\n{chave_pix}\\n\\nAssim que realizar o Pix, envie o comprovante por aqui. Muito obrigado! 💖',
          'Olá, {nome_cliente}! Pagamento confirmado com sucesso! 🎉\\n\\n💵 *Valor Recebido:* R$ {valor_pago}\\n📉 *Seu Novo Saldo Restante:* R$ {saldo_restante}\\n📅 *Próximo Vencimento:* {proximo_vencimento}\\n\\nObrigado por manter sua ficha em dia com a *{nome_loja}*! Tenha um ótimo dia! ✨',
          'Olá, {nome_cliente}! Temos uma ótima notícia! 📦✨\\n\\nO seu pedido sob encomenda (*{descricao_itens}*) acabou de chegar ao nosso estoque e já está prontinho para você!\\n\\nEntre em contato para combinarmos a entrega ou retirada. Agradecemos o carinho e a paciência! 💖'
      WHERE NOT EXISTS (SELECT 1 FROM configuracoes);
    `);

    // Alimentar banco de dados com dados fictícios caso esteja vazio
    await seedInitialDataIfEmpty(client);

    console.log('✅ [PostgreSQL] Schema, tabelas e dados iniciais verificados com sucesso.');
  } finally {
    client.release();
  }
}

/**
 * Alimenta o banco de dados com produtos, clientes e fichas de crediário realistas
 */
export async function seedInitialDataIfEmpty(client: pg.PoolClient): Promise<void> {
  const { rows: clientesExistentes } = await client.query('SELECT COUNT(*)::int as total FROM clientes');
  if (clientesExistentes[0].total > 0) {
    return; // Banco já possui dados
  }

  console.log('🌱 [PostgreSQL] Banco vazio detectado. Populando com catálogo e fichas fictícias...');

  // 1. Cadastrar Catálogo de Produtos e Utilidades
  const produtosQuery = `
    INSERT INTO produtos (codigo_sku, nome, descricao, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo, permite_encomenda)
    VALUES
      ('EDR-QN-01', 'Edredom Casal Queen Dupla Face Soft Touch', 'Edredom aveludado dupla face em micropercal 300 fios', 'CAMA', 85.00, 160.00, 180.00, 12, 3, true),
      ('JGC-CS-02', 'Jogo de Cama Casal 4 Peças Microfibra Algodão', 'Contém 1 lençol de cima, 1 lençol c/ elástico e 2 fronhas', 'CAMA', 38.00, 75.00, 85.00, 20, 5, true),
      ('LNC-QN-03', 'Jogo de Lençol Queen 300 Fios Toque de Pluma', 'Jogo completo com elástico reforçado para colchão até 35cm', 'CAMA', 55.00, 110.00, 125.00, 8, 2, true),
      ('TOA-BN-01', 'Jogo de Toalhas Banho 4 Peças Fio Penteado', '2 toalhas de banho gigantes e 2 toalhas de rosto 100% algodão', 'CAMA', 42.00, 85.00, 95.00, 15, 4, true),
      ('COB-SL-01', 'Cobreleito Solteiro Patchwork com Porta Travesseiro', 'Estampas florais e geométricas com acabamento ultrassônico', 'CAMA', 45.00, 90.00, 100.00, 7, 2, true),
      ('PAN-5P-01', 'Jogo de Panelas 5 Peças Antiaderente Teflon Extra', 'Alumínio reforçado com cabos em baquelite antitérmico', 'COZINHA', 95.00, 190.00, 220.00, 6, 2, true),
      ('FAQ-24-01', 'Faqueiro Inox 24 Peças com Gaveteiro', 'Aço inoxidável de alto brilho com lâminas temperadas', 'COZINHA', 32.00, 65.00, 75.00, 14, 3, true),
      ('TAP-CZ-01', 'Jogo de Tapetes para Cozinha 3 Peças Passadeira', 'Base antiderrapante emborrachada lavável em máquina', 'COZINHA', 28.00, 55.00, 65.00, 10, 3, true),
      ('COR-SL-01', 'Cortina para Sala Blackout Tecido 3,00m x 2,50m', 'Bloqueia 85% da claridade com ilhós cromados', 'DECORACAO', 68.00, 135.00, 150.00, 9, 2, true),
      ('MAN-CS-01', 'Manta Microfibra Casal Confort Aveludada', 'Toque macio, quentinha e compacta para lavar', 'CAMA', 30.00, 60.00, 70.00, 18, 4, true),
      ('ORG-30-01', 'Organizador Multiuso com Travas 30 Litros', 'Caixa transparente reforçada com alças e travas laterais', 'ORGANIZACAO', 18.00, 38.00, 45.00, 25, 5, true),
      ('MAN-MS-01', 'Toalha de Mesa 6 Cadeiras Impermeável Limpa Fácil', 'Tecido jacquard com tratamento hidro-repelente antimanchas', 'COZINHA', 35.00, 70.00, 80.00, 11, 3, true)
    RETURNING id, nome, preco_venda_crediario;
  `;
  const { rows: produtos } = await client.query(produtosQuery);

  // 2. Cadastrar Clientes Fictícias
  const clientesData = [
    {
      nome: 'Dona Francisca Silva',
      whatsapp: '5511998765432',
      cpf: '123.456.789-01',
      endereco: 'Rua das Flores, 120 - Jardim Primavera',
      ponto_referencia: 'Em frente à Padaria Central',
      limite_credito: 1500.00,
      observacoes: 'Cliente antiga e muito pontual no pagamento do dia 05',
      dia_vencimento: 5,
      parcela_padrao: 100.00,
      ciclo: 'MENSAL_PAGAMENTO'
    },
    {
      nome: 'Maria Aparecida Souza',
      whatsapp: '5511987654321',
      cpf: '234.567.890-12',
      endereco: 'Av. Brasil, 450 - Centro',
      ponto_referencia: 'Próximo ao Mercado Silva',
      limite_credito: 1000.00,
      observacoes: 'Recebe adiantamento dia 20 (vale da fábrica)',
      dia_vencimento: 20,
      parcela_padrao: 80.00,
      ciclo: 'QUINZENAL_VALE'
    },
    {
      nome: 'Ana Paula Santos',
      whatsapp: '5511976543210',
      cpf: '345.678.901-23',
      endereco: 'Rua São Paulo, 88 - Vila Nova',
      ponto_referencia: 'Casa amarela com portão de grade azul',
      limite_credito: 2000.00,
      observacoes: 'Gosta de encomendar jogos de cama queen bordados',
      dia_vencimento: 5,
      parcela_padrao: 150.00,
      ciclo: 'MENSAL_PAGAMENTO'
    },
    {
      nome: 'Luciana de Oliveira',
      whatsapp: '5511965432109',
      cpf: '456.789.012-34',
      endereco: 'Rua Minas Gerais, 304 - Bela Vista',
      ponto_referencia: 'Ao lado da Igreja Presbiteriana',
      limite_credito: 800.00,
      observacoes: 'Prefere receber lembrete no WhatsApp 1 dia antes',
      dia_vencimento: 20,
      parcela_padrao: 50.00,
      ciclo: 'QUINZENAL_VALE'
    },
    {
      nome: 'Tereza Cristina Rocha',
      whatsapp: '5511954321098',
      cpf: '567.890.123-45',
      endereco: 'Rua Amazonas, 72 - Cohab II',
      ponto_referencia: 'Bloco 4, Apartamento 12',
      limite_credito: 1200.00,
      observacoes: 'Ficha quitada recentemente, excelente pagadora',
      dia_vencimento: 10,
      parcela_padrao: 100.00,
      ciclo: 'MENSAL_PAGAMENTO'
    }
  ];

  for (let i = 0; i < clientesData.length; i++) {
    const c = clientesData[i];
    
    // Inserir Cliente
    const { rows: [cliente] } = await client.query(
      `INSERT INTO clientes (nome, whatsapp, cpf, endereco, ponto_referencia, limite_credito, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [c.nome, c.whatsapp, c.cpf, c.endereco, c.ponto_referencia, c.limite_credito, c.observacoes]
    );

    // Inserir Ficha de Crediário
    const { rows: [ficha] } = await client.query(
      `INSERT INTO fichas_crediario (cliente_id, saldo_devedor_total, valor_parcela_padrao, dia_vencimento_padrao, tipo_ciclo, status_ficha)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [cliente.id, 0.00, c.parcela_padrao, c.dia_vencimento, c.ciclo, i === 4 ? 'QUITADO' : 'ATIVO']
    );

    // Simular compras e parcelas para as 4 primeiras clientes
    if (i === 0) {
      // Dona Francisca: Compra de 1 Edredom Queen (R$ 180) + 1 Jogo Panelas (R$ 220) = R$ 400. Pagou R$ 100 amortizado -> Saldo R$ 300
      const prod1 = produtos[0]; // Edredom Queen
      const prod2 = produtos[5]; // Jogo Panelas

      const { rows: [venda] } = await client.query(
        `INSERT INTO vendas (cliente_id, tipo_venda, forma_pagamento, valor_total, valor_entrada, valor_financiado_ficha, status_venda)
         VALUES ($1, 'PRONTA_ENTREGA', 'CREDIARIO', 400.00, 0.00, 400.00, 'CONCLUIDA') RETURNING id`,
        [cliente.id]
      );

      await client.query(
        `INSERT INTO itens_venda (venda_id, produto_id, descricao_item, quantidade, preco_unitario, tipo_item)
         VALUES 
          ($1, $2, $3, 1, 180.00, 'ESTOQUE_LOCAL'),
          ($1, $4, $5, 1, 220.00, 'ESTOQUE_LOCAL')`,
        [venda.id, prod1.id, prod1.nome, prod2.id, prod2.nome]
      );

      // Movimentação 1: Compra inicial +400
      await client.query(
        `INSERT INTO movimentacoes_ficha (ficha_id, venda_id, tipo_movimentacao, valor, saldo_anterior, saldo_posterior, descricao)
         VALUES ($1, $2, 'DEBITO_COMPRA', 400.00, 0.00, 400.00, 'Compra no crediário: Edredom Queen + Jogo de Panelas')`,
        [ficha.id, venda.id]
      );

      // Movimentação 2: Pagamento amortizado -100
      await client.query(
        `INSERT INTO movimentacoes_ficha (ficha_id, tipo_movimentacao, valor, saldo_anterior, saldo_posterior, descricao)
         VALUES ($1, 'CREDITO_PAGAMENTO', 100.00, 400.00, 300.00, 'Pagamento mensal amortizado via Pix')`,
        [ficha.id]
      );

      // Atualizar saldo final da ficha
      await client.query(`UPDATE fichas_crediario SET saldo_devedor_total = 300.00 WHERE id = $1`, [ficha.id]);

      // Criar 3 parcelas de R$ 100
      await client.query(`
        INSERT INTO parcelas_crediario (ficha_id, numero_parcela, valor_parcela, data_vencimento, status)
        VALUES 
          ('${ficha.id}', 1, 100.00, '2026-09-05', 'PENDENTE'),
          ('${ficha.id}', 2, 100.00, '2026-10-05', 'PENDENTE'),
          ('${ficha.id}', 3, 100.00, '2026-11-05', 'PENDENTE')
      `);
    } else if (i === 1) {
      // Maria Aparecida: Compra de 1 Jogo Lençol Queen (R$ 125) + 1 Cortina (R$ 150) = R$ 275
      const prod3 = produtos[2]; // Jogo de Lençol Queen
      const prod4 = produtos[8]; // Cortina

      const { rows: [venda] } = await client.query(
        `INSERT INTO vendas (cliente_id, tipo_venda, forma_pagamento, valor_total, valor_entrada, valor_financiado_ficha, status_venda)
         VALUES ($1, 'PRONTA_ENTREGA', 'CREDIARIO', 275.00, 35.00, 240.00, 'CONCLUIDA') RETURNING id`,
        [cliente.id]
      );

      await client.query(
        `INSERT INTO itens_venda (venda_id, produto_id, descricao_item, quantidade, preco_unitario, tipo_item)
         VALUES 
          ($1, $2, $3, 1, 125.00, 'ESTOQUE_LOCAL'),
          ($1, $4, $5, 1, 150.00, 'ESTOQUE_LOCAL')`,
        [venda.id, prod3.id, prod3.nome, prod4.id, prod4.nome]
      );

      await client.query(
        `INSERT INTO movimentacoes_ficha (ficha_id, venda_id, tipo_movimentacao, valor, saldo_anterior, saldo_posterior, descricao)
         VALUES ($1, $2, 'DEBITO_COMPRA', 240.00, 0.00, 240.00, 'Compra no crediário (Entrada R$ 35,00 paga)')`,
        [ficha.id, venda.id]
      );

      await client.query(`UPDATE fichas_crediario SET saldo_devedor_total = 240.00 WHERE id = $1`, [ficha.id]);

      await client.query(`
        INSERT INTO parcelas_crediario (ficha_id, numero_parcela, valor_parcela, data_vencimento, status)
        VALUES 
          ('${ficha.id}', 1, 80.00, '2026-09-20', 'PENDENTE'),
          ('${ficha.id}', 2, 80.00, '2026-10-20', 'PENDENTE'),
          ('${ficha.id}', 3, 80.00, '2026-11-20', 'PENDENTE')
      `);
    } else if (i === 2) {
      // Ana Paula: Encomenda de 1 Jogo de Cama King Especial (R$ 210) + 2 Jogos de Toalhas (R$ 190) = R$ 400
      const prodToalha = produtos[3]; // Toalha de Banho

      const { rows: [venda] } = await client.query(
        `INSERT INTO vendas (cliente_id, tipo_venda, forma_pagamento, valor_total, valor_entrada, valor_financiado_ficha, status_venda)
         VALUES ($1, 'MISTA', 'CREDIARIO', 400.00, 0.00, 400.00, 'AGUARDANDO_ENCOMENDA') RETURNING id`,
        [cliente.id]
      );

      const { rows: [itemEnc] } = await client.query(
        `INSERT INTO itens_venda (venda_id, descricao_item, quantidade, preco_unitario, tipo_item)
         VALUES ($1, 'Jogo de Cama King Bordado Ponto Palito Especial 400 Fios', 1, 210.00, 'ENCOMENDA') RETURNING id`,
        [venda.id]
      );

      await client.query(
        `INSERT INTO itens_venda (venda_id, produto_id, descricao_item, quantidade, preco_unitario, tipo_item)
         VALUES ($1, $2, $3, 2, 95.00, 'ESTOQUE_LOCAL')`,
        [venda.id, prodToalha.id, prodToalha.nome]
      );

      // Registrar Encomenda vinculada
      await client.query(
        `INSERT INTO encomendas (item_venda_id, fornecedor_nome, data_pedido, data_previsao_chegada, status_encomenda, observacoes)
         VALUES ($1, 'Bordados & Cia Ibitinga', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', 'A_CAMINHO', 'Enviado via transportadora parceira')`,
        [itemEnc.id]
      );

      await client.query(
        `INSERT INTO movimentacoes_ficha (ficha_id, venda_id, tipo_movimentacao, valor, saldo_anterior, saldo_posterior, descricao)
         VALUES ($1, $2, 'DEBITO_COMPRA', 400.00, 0.00, 400.00, 'Compra crediário c/ encomenda: Jogo King Bordado + 2 Jogos Toalhas')`,
        [ficha.id, venda.id]
      );

      await client.query(`UPDATE fichas_crediario SET saldo_devedor_total = 400.00 WHERE id = $1`, [ficha.id]);

      await client.query(`
        INSERT INTO parcelas_crediario (ficha_id, numero_parcela, valor_parcela, data_vencimento, status)
        VALUES 
          ('${ficha.id}', 1, 150.00, '2026-09-05', 'PENDENTE'),
          ('${ficha.id}', 2, 150.00, '2026-10-05', 'PENDENTE'),
          ('${ficha.id}', 3, 100.00, '2026-11-05', 'PENDENTE')
      `);
    } else if (i === 3) {
      // Luciana de Oliveira: Compra de 1 Faqueiro (R$ 75) + 1 Jogo Tapete Cozinha (R$ 65) = R$ 140
      const prodFaq = produtos[6];
      const prodTap = produtos[7];

      const { rows: [venda] } = await client.query(
        `INSERT INTO vendas (cliente_id, tipo_venda, forma_pagamento, valor_total, valor_entrada, valor_financiado_ficha, status_venda)
         VALUES ($1, 'PRONTA_ENTREGA', 'CREDIARIO', 140.00, 0.00, 140.00, 'CONCLUIDA') RETURNING id`,
        [cliente.id]
      );

      await client.query(
        `INSERT INTO itens_venda (venda_id, produto_id, descricao_item, quantidade, preco_unitario, tipo_item)
         VALUES 
          ($1, $2, $3, 1, 75.00, 'ESTOQUE_LOCAL'),
          ($1, $4, $5, 1, 65.00, 'ESTOQUE_LOCAL')`,
        [venda.id, prodFaq.id, prodFaq.nome, prodTap.id, prodTap.nome]
      );

      await client.query(
        `INSERT INTO movimentacoes_ficha (ficha_id, venda_id, tipo_movimentacao, valor, saldo_anterior, saldo_posterior, descricao)
         VALUES ($1, $2, 'DEBITO_COMPRA', 140.00, 0.00, 140.00, 'Compra crediário: Faqueiro Inox 24 Pçs + Tapete Cozinha')`,
        [ficha.id, venda.id]
      );

      await client.query(`UPDATE fichas_crediario SET saldo_devedor_total = 140.00 WHERE id = $1`, [ficha.id]);

      await client.query(`
        INSERT INTO parcelas_crediario (ficha_id, numero_parcela, valor_parcela, data_vencimento, status)
        VALUES 
          ('${ficha.id}', 1, 50.00, '2026-09-20', 'PENDENTE'),
          ('${ficha.id}', 2, 50.00, '2026-10-20', 'PENDENTE'),
          ('${ficha.id}', 3, 40.00, '2026-11-20', 'PENDENTE')
      `);
    }
  }

  console.log('✅ [PostgreSQL] Dados fictícios de catálogo, clientes e crediário semeados com sucesso!');
}


