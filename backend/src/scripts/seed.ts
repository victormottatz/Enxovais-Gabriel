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
    `);

    console.log('🎉 [Seed] Alimentação de dados de demonstração concluída com segurança!');
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSeed();

