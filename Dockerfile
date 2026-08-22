FROM node:22-alpine AS builder

WORKDIR /app

# Copia dependências do backend e instala
COPY backend/package*.json backend/tsconfig.json ./
RUN npm ci

# Copia código fonte do backend e compila TypeScript
COPY backend/src/ ./src/
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Instala dependências de produção
COPY backend/package*.json ./
RUN npm ci --only=production

# Copia o código compilado do backend
COPY --from=builder /app/dist ./dist

# Copia os arquivos estáticos do Frontend PWA
COPY frontend/ /frontend/

EXPOSE 3000

CMD ["node", "dist/server.js"]
