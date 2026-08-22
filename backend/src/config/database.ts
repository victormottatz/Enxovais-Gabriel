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
          'seu-pix-aqui@email.com', 
          'Enxovais Gabriel', 
          'Enxovais Gabriel',
          'Olá, {nome_cliente}! ✨\\nSua compra na *{nome_loja}* foi registrada com sucesso no seu crediário!\\n\\n🛍️ *Itens:* {descricao_itens}\\n💰 *Valor desta Compra:* R$ {valor_compra}\\n📊 *Saldo Total na sua Ficha:* R$ {saldo_total}\\n📅 *Sua Parcela:* R$ {valor_parcela} (todo dia {dia_vencimento})\\n\\nAgradecemos imensamente pela preferência e confiança! 🏠❤️',
          'Olá, {nome_cliente}! Tudo bem? 🥰\\nPassando para lembrar que hoje é o dia do seu pagamento/vale na *{nome_loja}*.\\n\\n💳 *Valor da sua Parcela:* R$ {valor_parcela}\\n📊 *Saldo Restante na Ficha:* R$ {saldo_total}\\n\\nVocê pode realizar o pagamento direto pelo Pix abaixo:\\nChave Pix ({nome_titular_pix}): {chave_pix}\\n(Copia e cola)\\n{chave_pix}\\n\\nAssim que realizar o Pix, envie o comprovante por aqui. Muito obrigado! 💖',
          'Olá, {nome_cliente}! Pagamento confirmado com sucesso! 🎉\\n\\n💵 *Valor Recebido:* R$ {valor_pago}\\n📉 *Seu Novo Saldo Restante:* R$ {saldo_restante}\\n📅 *Próximo Vencimento:* {proximo_vencimento}\\n\\nObrigado por manter sua ficha em dia com a *{nome_loja}*! Tenha um ótimo dia! ✨',
          'Olá, {nome_cliente}! Temos uma ótima notícia! 📦✨\\n\\nO seu pedido sob encomenda (*{descricao_itens}*) acabou de chegar ao nosso estoque e já está prontinho para você!\\n\\nEntre em contato para combinarmos a entrega ou retirada. Agradecemos o carinho e a paciência! 💖'
      WHERE NOT EXISTS (SELECT 1 FROM configuracoes);
    `);

    console.log('✅ [PostgreSQL] Schema e tabelas verificados com sucesso.');
  } finally {
    client.release();
  }
}

