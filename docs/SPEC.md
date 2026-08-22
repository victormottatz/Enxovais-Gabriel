# 🛠️ Especificação Técnica e Arquitetura: Gestão Comercial & Crediário
**Projeto:** Enxovais Gabriel — Gestão Comercial, Estoque e Fichas de Crediário  
**Versão:** 2.0  
**Data:** 22/08/2026  

---

## 1. 🏗️ Arquitetura de Alto Nível

```
┌────────────────────────────────────────────────────────┐
│                   Cliente PWA Mobile                   │
│   (Catálogo, Vendas, Fichas de Crediário, Cobranças)   │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JSON)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Backend Express / Node.js (TS)              │
│  ├── Middlewares (Request-ID, Auth, Error Handler)     │
│  ├── Routes (/produtos, /vendas, /fichas, /whatsapp)   │
│  ├── Services (Produto, Venda, FichaCrediario, etc)    │
│  └── Queues (BullMQ / Redis para Mensageria)           │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  PostgreSQL Relacional   │  │   Evolution API WhatsApp  │
│  (Estoque, Fichas,       │  │   (VPS Privada dedicada)  │
│   Vendas, Parcelas)      │  └──────────────────────────┘
└──────────────────────────┘
```

---

## 2. 🗄️ Esquema Relacional de Banco de Dados (PostgreSQL)

### 2.1 Tabela `produtos`
```sql
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_sku VARCHAR(50) UNIQUE,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50) NOT NULL, -- 'CAMA_MESA_BANHO', 'COZINHA', 'DECORACAO', 'ORGANIZACAO', 'OUTROS'
    preco_custo NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (preco_custo >= 0),
    preco_venda_vista NUMERIC(10, 2) NOT NULL CHECK (preco_venda_vista >= 0),
    preco_venda_crediario NUMERIC(10, 2) NOT NULL CHECK (preco_venda_crediario >= 0),
    estoque_atual INT NOT NULL DEFAULT 0 CHECK (estoque_atual >= 0),
    estoque_minimo INT NOT NULL DEFAULT 2 CHECK (estoque_minimo >= 0),
    permite_encomenda BOOLEAN NOT NULL DEFAULT TRUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Tabela `clientes`
```sql
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    cpf VARCHAR(14),
    endereco TEXT,
    ponto_referencia TEXT,
    limite_credito NUMERIC(10, 2) NOT NULL DEFAULT 1000.00,
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.3 Tabela `fichas_crediario`
```sql
CREATE TABLE IF NOT EXISTS fichas_crediario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
    saldo_devedor_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (saldo_devedor_total >= 0),
    valor_parcela_padrao NUMERIC(10, 2) NOT NULL DEFAULT 100.00 CHECK (valor_parcela_padrao > 0),
    dia_vencimento_padrao INT NOT NULL DEFAULT 5 CHECK (dia_vencimento_padrao BETWEEN 1 AND 31),
    tipo_ciclo VARCHAR(30) NOT NULL DEFAULT 'MENSAL_PAGAMENTO' CHECK (tipo_ciclo IN ('MENSAL_PAGAMENTO', 'QUINZENAL_VALE')),
    dia_vale_secundario INT CHECK (dia_vale_secundario BETWEEN 1 AND 31),
    status_ficha VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status_ficha IN ('ATIVO', 'BLOQUEADO', 'QUITADO')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.4 Tabela `vendas`
```sql
CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    tipo_venda VARCHAR(30) NOT NULL DEFAULT 'PRONTA_ENTREGA' CHECK (tipo_venda IN ('PRONTA_ENTREGA', 'ENCOMENDA', 'MISTA')),
    forma_pagamento VARCHAR(30) NOT NULL CHECK (forma_pagamento IN ('CREDIARIO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'MISTO')),
    valor_total NUMERIC(10, 2) NOT NULL CHECK (valor_total > 0),
    valor_entrada NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (valor_entrada >= 0),
    valor_financiado_ficha NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (valor_financiado_ficha >= 0),
    status_venda VARCHAR(30) NOT NULL DEFAULT 'CONCLUIDA' CHECK (status_venda IN ('CONCLUIDA', 'AGUARDANDO_ENCOMENDA', 'CANCELADA')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.5 Tabela `itens_venda`
```sql
CREATE TABLE IF NOT EXISTS itens_venda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
    descricao_item VARCHAR(200) NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10, 2) NOT NULL CHECK (preco_unitario >= 0),
    subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
    tipo_item VARCHAR(30) NOT NULL DEFAULT 'ESTOQUE_LOCAL' CHECK (tipo_item IN ('ESTOQUE_LOCAL', 'ENCOMENDA')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.6 Tabela `encomendas`
```sql
CREATE TABLE IF NOT EXISTS encomendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_venda_id UUID NOT NULL REFERENCES itens_venda(id) ON DELETE CASCADE,
    fornecedor_nome VARCHAR(100),
    data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
    data_previsao_chegada DATE,
    data_recebimento DATE,
    status_encomenda VARCHAR(30) NOT NULL DEFAULT 'SOLICITADA' CHECK (status_encomenda IN ('SOLICITADA', 'A_CAMINHO', 'RECEBIDA_ESTOQUE', 'ENTREGUE_CLIENTE')),
    codigo_rastreio_fornecedor VARCHAR(100),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.7 Tabela `movimentacoes_ficha`
```sql
CREATE TABLE IF NOT EXISTS movimentacoes_ficha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ficha_id UUID NOT NULL REFERENCES fichas_crediario(id) ON DELETE CASCADE,
    venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
    tipo_movimentacao VARCHAR(30) NOT NULL CHECK (tipo_movimentacao IN ('DEBITO_COMPRA', 'CREDITO_PAGAMENTO', 'AJUSTE_PARCELA', 'ESTORNO')),
    valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
    saldo_anterior NUMERIC(10, 2) NOT NULL,
    saldo_posterior NUMERIC(10, 2) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.8 Tabela `parcelas_crediario`
```sql
CREATE TABLE IF NOT EXISTS parcelas_crediario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ficha_id UUID NOT NULL REFERENCES fichas_crediario(id) ON DELETE CASCADE,
    numero_parcela INT NOT NULL CHECK (numero_parcela > 0),
    valor_parcela NUMERIC(10, 2) NOT NULL CHECK (valor_parcela > 0),
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    valor_pago NUMERIC(10, 2) DEFAULT 0.00 CHECK (valor_pago >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO_TOTAL', 'PAGO_PARCIAL', 'ATRASADO', 'CANCELADO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. 🌐 Endpoints RESTful da API

### Produtos e Estoque (`/api/v1/produtos`)
* `GET /api/v1/produtos` - Listar catálogo com filtros por categoria e busca por nome/SKU.
* `POST /api/v1/produtos` - Cadastrar novo item de utilidades/enxovais.
* `PATCH /api/v1/produtos/:id/estoque` - Ajuste manual de saldo de estoque.

### Vendas (`/api/v1/vendas`)
* `GET /api/v1/vendas` - Histórico de vendas com filtros por data, cliente e tipo.
* `POST /api/v1/vendas` - Registrar venda (com baixa de estoque, geração de encomenda se aplicável e lançamento no crediário).

### Fichas de Crediário (`/api/v1/fichas`)
* `GET /api/v1/fichas` - Listar fichas com busca por cliente e alertas de vencimento do dia.
* `GET /api/v1/fichas/:id` - Detalhes da ficha, saldo devedor, parcelas e extrato.
* `POST /api/v1/fichas/:id/pagamento` - Registrar pagamento (abatimento de dividendo, quitação de parcelas e recibo).
* `PATCH /api/v1/fichas/:id/renegociar-parcela` - Ajustar valor da parcela combinada e recalcular cronograma.

### Encomendas (`/api/v1/encomendas`)
* `GET /api/v1/encomendas` - Listar itens encomendados a fornecedores e prazos.
* `PATCH /api/v1/encomendas/:id/status` - Atualizar status da encomenda (ex: de 'A_CAMINHO' para 'RECEBIDA_ESTOQUE').
