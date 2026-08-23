import { pool, initDatabase } from '../config/database.js';

async function runSeed() {
  console.log('🚀 Iniciando script de alimentação com dados fictícios...');
  try {
    await initDatabase();
    console.log('🎉 Alimentação de dados concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao semear dados fictícios:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSeed();
