FROM node:22-alpine AS builder

WORKDIR /app
ENV NODE_ENV=development

# Copia arquivos de configuração e instala dependências completas
COPY backend/package*.json backend/tsconfig.json ./
RUN npm install --include=dev

# Copia código fonte do backend e compila TypeScript
COPY backend/src/ ./src/
RUN npx tsc

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Instala apenas dependências de produção
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copia o código compilado
COPY --from=builder /app/dist ./dist

# Copia os arquivos estáticos do Frontend PWA
COPY frontend/ ./frontend/
COPY frontend/ /frontend/

# Cria pasta de uploads persistente
RUN mkdir -p /app/uploads/produtos

EXPOSE 3000

CMD ["node", "dist/server.js"]
