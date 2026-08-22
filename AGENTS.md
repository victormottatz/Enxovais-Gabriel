# Diretrizes Mestras do Agente (AGENTS.md)

Este documento é a fonte única de verdade para a atuação de qualquer agente de IA neste repositório.

---

## 📌 1. Princípios Fundamentais e Regras Inegociáveis

1. **Idioma e Didática Obrigatórios:**
   * Todas as respostas, explicações, planos e revisões de código DEVEM ser entregues em **Português do Brasil**, de forma didática, clara e estruturada.
2. **Rigor de Engenharia e Segurança:**
   * Toda e qualquer implementação de código DEVE respeitar rigorosamente as **14 Leis para IDEs Agênticas (LionLab v2)** detalhadas na Seção 3.
3. **Consistência de Documentação:**
   * O ecossistema do projeto é baseado nos documentos de arquitetura, requisitos e design localizados na pasta [`docs/`](file:///x:/enxovais%20gabriel/docs).

---

## 📚 2. Mapa de Referência do Repositório

```
x:\enxovais gabriel\
├── AGENTS.md                                   <-- Este documento (Regras Mestras)
├── GEMINI.md                                   <-- Contexto e Regras do Chat
├── .agents\
│   ├── rules\                                  <-- 15 Regras Modulares
│   │   ├── gestao_enxoval_guidelines.md        <-- Usabilidade e interfaces acessíveis
│   │   ├── rule-01-security-isolation.md       <-- Isolamento de Segurança
│   │   ├── rule-02-async-performance.md        <-- Performance Async
│   │   ├── rule-03-multi-tenant-shield.md      <-- Blindagem Multi-Tenant
│   │   ├── rule-04-secrets-vault.md            <-- Cofre de Segredos & Criptografia
│   │   ├── rule-05-session-hardening.md        <-- Hardening de Sessão
│   │   ├── rule-06-clean-architecture.md       <-- Arquitetura Limpa
│   │   ├── rule-07-credential-hygiene.md       <-- Higiene de Credenciais
│   │   ├── rule-08-error-handling.md           <-- Tratamento de Erros com Contexto
│   │   ├── rule-09-dependency-hygiene.md       <-- Higiene de Dependências
│   │   ├── rule-10-test-first.md               <-- TDD / Testes Antes do Código
│   │   ├── rule-11-api-consistency.md          <-- Consistência de API REST
│   │   ├── rule-12-commit-discipline.md        <-- Conventional Commits
│   │   ├── rule-13-env-isolation.md            <-- Isolamento de Ambientes
│   │   └── rule-14-documentation-code.md       <-- Documentação como Código
│   ├── workflows\
│   │   └── workflow_operacional.md             <-- Workflows do projeto
│   └── skills\
│       ├── appsheet-data-modeler\SKILL.md      <-- Modelagem de dados e interfaces
│       └── make-whatsapp-automator\SKILL.md    <-- Automações de mensagens e Webhooks
└── docs\                                       <-- Documentação Oficial de Produto
    ├── README.md                               <-- Índice Geral dos Docs
    ├── discovery20260520_221254.md             <-- Discovery e Posicionamento
    ├── PRD20260520_221254.md                   <-- Requisitos de Produto (PRD)
    ├── SPEC.md                                 <-- Especificação Técnica e Arquitetura
    ├── stories-requisitos20260520_221254.md    <-- User Stories e Critérios de Aceite
    └── design\                                 <-- Design System e Protótipo Visual
        ├── design-brief.md
        ├── artifact.html
        └── design-contract.json
```

---

## 🛡️ 3. As 14 Leis para IDEs Agênticas (LionLab v2)

| # | Lei | Regra Prática para o Agente |
| :-: | :--- | :--- |
| **01** | **Isolamento de Segurança** | Jamais expor chaves `SERVICE_ROLE` no frontend. Zero escrita direta no banco pelo cliente; toda mutação passa por rotas de API com validação de sessão. |
| **02** | **Performance Async** | Todo I/O (Banco, Redis, APIs de IA) deve ser estritamente `async`/`await`. Proibido código bloqueante (`time.sleep()`, `requests`). Tarefas pesadas delegadas a Workers. |
| **03** | **Blindagem Multi-Tenant** | Toda query deve conter `.eq('company_id', company_id)` extraído exclusivamente da sessão autenticada. Habilitar RLS em todas as tabelas SQL. |
| **04** | **Cofre de Segredos** | Criptografar API Keys de terceiros em repouso. Sanitizar logs (zero PII, emails, tokens impressos em console). |
| **05** | **Hardening de Sessão** | Cookies de sessão com `httpOnly: true`, `secure: true`, `sameSite: 'lax'`. Cleanup e redirecionamento no middleware em caso de expiração. |
| **06** | **Arquitetura Limpa** | Separar estritamente Services (regras de negócio) de Routers (validação de entrada e delegação). Princípio DRY obrigatório. |
| **07** | **Higiene de Credenciais** | Hashing com `bcrypt` (custo 12). Validação de senhas fortes (8+ chars, maiúscula, minúscula, número). Tokens gerados com `secrets.token_urlsafe(32)`. |
| **08** | **Tratamento de Erros** | Proibido `except: pass` ou captura silenciosa. Injetar `X-Request-ID` em todas as requisições para rastreabilidade de ponta a ponta. Mensagens amigáveis para usuários e logs detalhados para engenharia. |
| **09** | **Higiene de Dependências** | Apenas pacotes com release < 12 meses, alta popularidade e sem vulnerabilidades conhecidas (`pip-audit` / `npm audit`). Evitar pacotes para funções triviais. |
| **10** | **Testes Primeiro (TDD)** | Ciclo Red-Green-Refactor obrigatório. Mínimo 80% de cobertura em regras de negócio com testes para edge cases (nulos, limites, arrays vazios). |
| **11** | **Consistência de API REST** | Rotas no plural, métodos HTTP semânticos (GET, POST, PATCH, DELETE) e payload de erro padronizado com `code`, `message` e `request_id`. |
| **12** | **Disciplina de Commits** | Padrão Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`). Primeira linha com no máximo 72 caracteres. |
| **13** | **Isolamento de Ambientes** | Bancos de dados e credenciais estritamente isolados entre Dev, Staging e Produção. Bloqueio de seeds em ambiente produtivo. |
| **14** | **Documentação como Código** | Nomes descritivos, funções atômicas e pequenas, docstrings completas (args, returns, raises) e type hinting rigoroso em todas as linguagens. |

---

## 🎯 4. Diretriz de Usabilidade e Aplicações Finais
* Em qualquer entrega voltada para a usuária final (painéis mobile, formulários, mensagens de WhatsApp), aplicar as diretrizes de [**`gestao_enxoval_guidelines.md`**](file:///x:/enxovais%20gabriel/.agents/rules/gestao_enxoval_guidelines.md): interfaces simples, botões grandes, zero jargões técnicos e tom acolhedor e humanizado.
