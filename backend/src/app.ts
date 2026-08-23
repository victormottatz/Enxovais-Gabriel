import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
import { pedidoRouter } from './routes/pedido.routes.js';
import importacaoRouter from './routes/importacao.routes.js';

export const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Localiza o diretório do frontend com fallback resiliente
function resolveFrontendPath(): string {
  const possiblePaths = [
    process.env.FRONTEND_PATH,
    '/frontend',
    '/app/frontend',
    path.resolve(process.cwd(), 'frontend'),
    path.resolve(__dirname, '../../frontend'),
    path.resolve(__dirname, '../frontend'),
  ].filter((p): p is string => Boolean(p));

  for (const candidate of possiblePaths) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }

  return possiblePaths[0] || '/frontend';
}

const frontendPath = resolveFrontendPath();

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
    frontend_path: frontendPath,
    time: new Date().toISOString(),
    request_id: req.requestId,
  });
});

// Rotas da API v1
app.use('/api/v1/clientes', clienteRouter);
app.use('/api/v1/produtos', produtoRouter);
app.use('/api/v1/vendas', vendaRouter);
app.use('/api/v1/fichas', fichaCrediarioRouter);
app.use('/api/v1/pedidos', pedidoRouter);
app.use('/api/v1/importacao', importacaoRouter);
app.use('/api/v1/configuracoes', configuracaoRouter);
app.use('/api/v1/whatsapp', whatsappRouter);
app.use('/api/v1/webhook', webhookRouter);

// Rota Principal e Fallback SPA para o Frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }

  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head><title>Enxovais Gabriel</title><meta charset="utf-8"></head>
      <body style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h2>Enxovais Gabriel - API Online ✅</h2>
        <p>Acesse o Healthcheck em <a href="/health">/health</a> ou as rotas em /api/v1</p>
      </body>
    </html>
  `);
});

// Middleware de Erros Centralizado (sempre o último)
app.use(errorMiddleware);
