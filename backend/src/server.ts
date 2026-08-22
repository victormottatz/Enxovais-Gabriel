import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';

async function startServer() {
  try {
    // Testa conexão com PostgreSQL
    const client = await pool.connect();
    console.log('✅ [PostgreSQL] Conexão com banco de dados estabelecida com sucesso.');
    client.release();

    app.listen(env.PORT, () => {
      console.log(`🚀 [Gestão Enxoval API] Servidor rodando na porta ${env.PORT} em modo ${env.NODE_ENV}`);
      console.log(`📍 Health check disponível em: http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Falha crítica ao inicializar o servidor:', error);
    process.exit(1);
  }
}

startServer();
