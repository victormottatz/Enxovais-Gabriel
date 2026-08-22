# 🚀 Guia Completo de Deploy na VPS: Enxovais Gabriel
**Projeto:** Gestão Comercial, Estoque & Crediário Próprio em VPS Linux Proprietária  
**Versão:** 2.0  
**Data:** 22/08/2026  

---

## 🏗️ 1. O Que Roda na VPS?

Ao subir os containers pelo Docker Compose, você terá 4 serviços integrados em uma rede isolada de alta performance:

```
┌────────────────────────────────────────────────────────┐
│               🖥️ VPS Linux (Ubuntu / Debian)           │
│                                                        │
│  ├── 🐘 enxoval_postgres      (PostgreSQL 16)          │
│  ├── ⚡ enxoval_redis         (Redis 7)                │
│  ├── 📱 enxoval_evolution_api (Evolution API v2.1)     │
│  └── 🚀 enxoval_backend       (API + Frontend PWA)     │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ 2. Pré-Requisitos na VPS

1. **Servidor Linux:** Ubuntu 22.04 LTS ou 24.04 LTS (qualquer VPS Hostinger, Hetzner, DigitalOcean, etc.).
2. **Docker e Docker Compose instalados:**
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. **Portas Abertas no Firewall (UFW):**
   * `80` (HTTP) e `443` (HTTPS - Nginx)
   * `3000` (Sistema PWA & API Backend)
   * `8080` (Evolution API WhatsApp - gerenciar conexões)

---

## 📋 3. Passo a Passo de Execução na VPS

### Passo 1: Enviar os Arquivos para a VPS
No terminal da sua VPS (ou via Git / SCP), clone ou crie a pasta do projeto:
```bash
git clone https://seu-repositorio.git /root/enxovais-gabriel
cd /root/enxovais-gabriel
```

### Passo 2: Configurar o Arquivo `.env`
Copie o modelo de variáveis de ambiente:
```bash
cp .env.example .env
```
Edite o arquivo `.env` com suas senhas seguras:
```bash
nano .env
```
> **Dica de Segurança:** Altere `POSTGRES_PASSWORD`, `REDIS_PASSWORD` e gere uma nova `EVOLUTION_API_KEY`.

---

### Passo 3: Iniciar Toda a Stack com 1 Comando
Execute o build e a inicialização dos containers em background:
```bash
docker compose up -d --build
```

### Passo 4: Verificar a Saúde dos Containers
```bash
docker compose ps
```
Você verá os 4 serviços rodando com status `Up` ou `healthy`:
* `enxoval_postgres`
* `enxoval_redis`
* `enxoval_evolution_api`
* `enxoval_backend`

---

## 📱 4. Conectar o WhatsApp da Loja (QR Code)

1. No terminal ou via Postman/navegador, crie a instância de WhatsApp na Evolution API:
   ```bash
   curl -X POST "http://IP_DA_SUA_VPS:8080/instance/create" \
     -H "Content-Type: application/json" \
     -H "apikey: B6D711FCDE4D4FD5936544120E713976" \
     -d '{
       "instanceName": "enxovais_gabriel",
       "qrcode": true
     }'
   ```

2. Obtenha o QR Code para leitura no celular:
   ```bash
   curl -X GET "http://IP_DA_SUA_VPS:8080/instance/connect/enxovais_gabriel" \
     -H "apikey: B6D711FCDE4D4FD5936544120E713976"
   ```

3. Abra o WhatsApp no celular da loja $\rightarrow$ **Aparelhos Conectados** $\rightarrow$ **Conectar um Aparelho** $\rightarrow$ Escaneie o QR Code retornado.

4. **Pronto!** O sistema agora dispara lembretes de vale/pagamento e recibos de pagamento automaticamente.

---

## 🌐 5. Acessar o Sistema e Instalar no Celular

* **Acesso Web:** Abra no navegador do celular ou computador: `http://IP_DA_SUA_VPS:3000`
* **Instalação como Aplicativo Nativo (PWA):**
  * No Google Chrome do celular: Toque nos três pontinhos no canto superior $\rightarrow$ **"Adicionar à tela inicial"** ou **"Instalar aplicativo"**.
  * No Safari (iPhone): Toque no botão de Compartilhar $\rightarrow$ **"Adicionar à Tela de Início"**.

---

## 🔒 6. Configuração de Domínio e SSL Grátis (HTTPS) com Nginx

Para acessar por um domínio próprio (ex: `app.enxovaisgabriel.com.br`) com certificado SSL gratuito:

1. Instale o Nginx e o Certbot na VPS:
   ```bash
   sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
   ```

2. Crie a configuração do Nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/enxovais
   ```
   Cole o conteúdo:
   ```nginx
   server {
       server_name app.seudominio.com.br;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Ative o site e gere o certificado SSL gratuito Let's Encrypt:
   ```bash
   sudo ln -s /etc/nginx/sites-available/enxovais /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d app.seudominio.com.br
   ```
