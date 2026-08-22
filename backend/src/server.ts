import { app } from './app.js';
import { env } from './config/env.js';
import { initDatabase } from './config/database.js';

async function startServer() {
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 [Gestão Enxoval API] Servidor rodando na porta ${env.PORT} em modo ${env.NODE_ENV}`);
    console.log(`📍 Health check disponível em: http://localhost:${env.PORT}/health`);
  });

  // Inicializa o banco de dados em background sem travar o Express
  try {
    await initDatabase();
  } catch (error) {
    console.error('⚠️ [PostgreSQL] Aviso: Conexão inicial com banco de dados falhou, o servidor continuará online:', error);
  }

  return server;
}

startServer();

