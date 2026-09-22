import { pool, initDatabase } from '../config/database.js';

async function runSeed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ [Seed Bloqueado] O script de seed não pode ser executado em ambiente de produção (Lei 13 - Isolamento de Ambientes).');
    process.exit(1);
  }

  console.log('🚀 [Seed] Inicializando schema e inserindo dados de demonstração...');
  try {
    await initDatabase();

    // Insere produtos de demonstração caso a tabela esteja vazia
    await pool.query(`
      INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo)
      SELECT 'Edredom Casal Dupla Face Soft', 'CAMA_MESA_BANHO', 80.00, 160.00, 180.00, 8, 2
      WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Edredom Casal Dupla Face Soft');

      INSERT INTO produtos (nome, categoria, preco_custo, preco_venda_vista, preco_venda_crediario, estoque_atual, estoque_minimo)
      SELECT 'Jogo de Panelas Antiaderente 5 Peças', 'COZINHA', 110.00, 200.00, 220.00, 5, 2
      WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Jogo de Panelas Antiaderente 5 Peças');

      -- Clientes de demonstração
      INSERT INTO clientes (id, nome, whatsapp, cpf, endereco, ponto_referencia, limite_credito, observacoes)
      VALUES 
      ('c1111111-1111-1111-1111-111111111111', 'Dona Francisca Silva', '5518998765432', '123.456.789-01', 'Rua das Flores, 120 - Jardim Primavera', 'Em frente à Padaria Central', 1200.0, 'Cliente fiel há 3 anos. Prefere cores florais.'),
      ('c2222222-2222-2222-2222-222222222222', 'Maria Aparecida Souza', '5518987654321', '234.567.890-12', 'Av. Brasil, 450 - Centro', 'Ao lado do Mercado Silva', 800.0, 'Paga no dia 20 no adiantamento/vale salarial.'),
      ('c3333333-3333-3333-3333-333333333333', 'Ana Paula Oliveira', '5518976543210', '345.678.901-23', 'Rua São João, 78 - Vila Nova', 'Casa amarela com portão branco', 1000.0, 'Migrada da ficha de papel física nº 85.'),
      ('c4444444-4444-4444-4444-444444444444', 'Juliana Mendes', '5518965432109', '456.789.012-34', 'Rua Tiradentes, 890 - Bairro Alto', 'Ao lado da farmácia', 500.0, '⚠️ Histórico de inadimplência. Produto recolhido em 22/09/2026.'),
      ('c5555555-5555-5555-5555-555555555555', 'Luciana Rocha', '5518991239876', '567.890.123-45', 'Rua Paraíba, 34 - Centro', 'Próximo à pracinha', 1500.0, '100% quitada no momento!')
      ON CONFLICT (id) DO NOTHING;

      -- Fichas de Crediário
      INSERT INTO fichas_crediario (id, cliente_id, saldo_devedor_total, valor_parcela_padrao, dia_vencimento_padrao, tipo_ciclo, status_ficha)
      VALUES
      ('f1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 120.00, 60.00, 5, 'MENSAL_PAGAMENTO', 'ATIVO'),
      ('f2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 240.00, 80.00, 20, 'QUINZENAL_VALE', 'ATIVO'),
      ('f3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 250.00, 100.00, 5, 'MENSAL_PAGAMENTO', 'ATIVO'),
      ('f4444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', 0.00, 50.00, 10, 'MENSAL_PAGAMENTO', 'BLOQUEADO'),
      ('f5555555-5555-5555-5555-555555555555', 'c5555555-5555-5555-5555-555555555555', 0.00, 85.00, 5, 'MENSAL_PAGAMENTO', 'QUITADO')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('🎉 [Seed] Alimentação de dados de demonstração concluída com segurança!');
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
    process.exit(1);
  } finally {
    if (pool.end) await pool.end();
  }
}

runSeed();

