import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  
  // PostgreSQL
  DATABASE_URL: z.string().optional(),
  POSTGRES_USER: z.string().default('enxoval_user'),
  POSTGRES_PASSWORD: z.string().default('enxoval_super_senha_segura_123'),
  POSTGRES_DB: z.string().default('enxoval_db'),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5432),

  // Evolution API
  EVOLUTION_SERVER_URL: z.string().default('http://localhost:8080'),
  EVOLUTION_API_KEY: z.string().default('B6D711FCDE4D4FD5936544120E713976'),
  EVOLUTION_INSTANCE_NAME: z.string().default('atelie_lucelia'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Erro na validação das variáveis de ambiente:', _env.error.format());
  throw new Error('Configuração de ambiente inválida.');
}

export const env = _env.data;
