#!/bin/bash
# ==============================================================================
# Script de Deploy e Inicialização Rápida - Enxovais Gabriel VPS
# ==============================================================================

set -e

echo "🚀 Iniciando esteira de deploy - Enxovais Gabriel..."

# 1. Verifica se o Docker e Docker Compose estão instalados
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
fi

# 2. Cria arquivo .env se não existir
if [ ! -f .env ]; then
    echo "📋 Criando .env a partir de .env.example..."
    cp .env.example .env
fi

# 3. Executa build e sobe os containers
echo "📦 Construindo e iniciando containers Docker..."
docker compose up -d --build

# 4. Aguarda inicialização do PostgreSQL
echo "⏳ Aguardando banco de dados ficar saudável..."
sleep 5

# 5. Exibe status dos containers
echo "📊 Status dos serviços:"
docker compose ps

echo ""
echo "========================================================================"
echo "✅ Sistema Enxovais Gabriel iniciado com sucesso na VPS!"
echo "📍 Acesse no navegador: http://localhost:3000"
echo "📍 Evolution API (WhatsApp): http://localhost:8080"
echo "========================================================================"
