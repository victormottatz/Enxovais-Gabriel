# Contexto e Regras do Projeto: LionIDE & Gestão do Ateliê

## 📌 1. Regra de Idioma e Didática (Obrigatório)
* Sempre responder em **Português do Brasil**, de forma didática, clara, acessível, bem estruturada e acompanhada de exemplos práticos sempre que necessário.

---

## 🧭 2. Guia Rápido de Arquitetura e Regras dos Agentes

Todos os agentes e ações executadas neste repositório seguem estritamente as regras consolidadas em [**`AGENTS.md`**](file:///x:/enxovais%20gabriel/AGENTS.md) e nos módulos de [**`.agents/rules/`**](file:///x:/enxovais%20gabriel/.agents/rules):

### 🛡️ 14 Leis de Engenharia (LionLab v2)
1. **Segurança:** Sem Service Role no frontend; zero mutação direta de banco pelo cliente (`rule-01`).
2. **Async First:** Zero chamadas bloqueantes em servidores/endpoints (`rule-02`).
3. **Multi-Tenant:** `company_id` estritamente originado de sessões autenticadas + RLS (`rule-03`).
4. **Cofre de Segredos:** Criptografia em repouso de tokens e API keys (`rule-04`).
5. **Hardening de Sessão:** Cookies HTTP-Only, Secure e SameSite Lax (`rule-05`).
6. **Arquitetura Limpa:** Desacoplamento entre Services e Routers / DRY (`rule-06`).
7. **Higiene de Credenciais:** Senhas com bcrypt fator 12 e tokens seguros (`rule-07`).
8. **Erros com Contexto:** Injeção de `X-Request-ID` e zero exceções ignoradas silenciosamente (`rule-08`).
9. **Dependências:** Apenas pacotes recentes (< 12 meses) e auditados contra vulnerabilidades (`rule-09`).
10. **TDD (Test-First):** Ciclo Red-Green-Refactor com no mínimo 80% de cobertura (`rule-10`).
11. **REST APIs:** Rotas no plural, métodos semânticos e respostas de erro uniformes (`rule-11`).
12. **Commits:** Conventional Commits (`feat:`, `fix:`, etc.) (`rule-12`).
13. **Isolamento de Ambientes:** Separação rígida de bancos Dev/Staging/Prod (`rule-13`).
14. **Documentação como Código:** Nomes claros, tipagem rigorosa e docstrings completas (`rule-14`).

---

## 🎨 3. Documentação e Design System Disponíveis
* **Documentação Técnica:** Especificações e PRDs organizados na pasta [`docs/`](file:///x:/enxovais%20gabriel/docs).
* **Design System & Protótipos:** Tokens e telas navegáveis em [`docs/design/`](file:///x:/enxovais%20gabriel/docs/design).
* **Usabilidade e Interfaces:** Interfaces para a usuária final seguem [**`gestao_enxoval_guidelines.md`**](file:///x:/enxovais%20gabriel/.agents/rules/gestao_enxoval_guidelines.md).
