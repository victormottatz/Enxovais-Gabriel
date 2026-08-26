import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger.js';
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
import { liaRouter } from './routes/lia.routes.js';

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
const uploadsPath = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Middlewares Globais
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(requestIdMiddleware);

// Servir arquivos estáticos do Frontend PWA e pasta de Uploads
app.use(express.static(frontendPath));
app.use('/uploads', express.static(uploadsPath));

// Painel Interativo de Inspeção de APIs (Swagger UI)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rota de Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Enxovais Gabriel - Gestão Comercial e Crediário API',
    frontend_path: frontendPath,
    uploads_path: uploadsPath,
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
app.use('/api/v1/lia', liaRouter);

// Rota Principal e Fallback SPA para o Frontend
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/health') ||
    req.path.startsWith('/api-docs') ||
    req.path.startsWith('/uploads')
  ) {
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
