import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import clienteRouter from './routes/cliente.routes.js';
import produtoRouter from './routes/produto.routes.js';
import vendaRouter from './routes/venda.routes.js';
import fichaCrediarioRouter from './routes/ficha-crediario.routes.js';
import { configuracaoRouter } from './routes/configuracao.routes.js';
import { whatsappRouter } from './routes/whatsapp.routes.js';
import { webhookRouter } from './routes/webhook.routes.js';

export const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, '../../frontend');

// Middlewares Globais
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);

// Servir arquivos estáticos do Frontend PWA
app.use(express.static(frontendPath));

// Rota de Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Enxovais Gabriel - Gestão Comercial e Crediário API',
    time: new Date().toISOString(),
    request_id: req.requestId,
  });
});

// Rotas da API v1
app.use('/api/v1/clientes', clienteRouter);
app.use('/api/v1/produtos', produtoRouter);
app.use('/api/v1/vendas', vendaRouter);
app.use('/api/v1/fichas', fichaCrediarioRouter);
app.use('/api/v1/configuracoes', configuracaoRouter);
app.use('/api/v1/whatsapp', whatsappRouter);
app.use('/api/v1/webhook', webhookRouter);

// Fallback SPA para o Frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Middleware de Erros Centralizado (sempre o último)
app.use(errorMiddleware);
