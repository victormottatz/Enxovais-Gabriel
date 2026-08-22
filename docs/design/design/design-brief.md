# Design Brief

## Direcao Visual

**Direcao:** dark tech-utility com identidade Lionclaw (laranja #f97316 sobre preto profundo), tipografia Inter, mono JetBrains Mono
**Densidade:** dense

## Tokens

### Cores

| Token | Valor |
|-------|-------|
| bg | #0a0a0a |
| surface | #141414 |
| card | #1a1a1a |
| surface3 | #202020 |
| border | #262626 |
| borderStrong | #333333 |
| fg | #e8e8e8 |
| muted | #7a7a7a |
| accent | #f97316 |
| accentStrong | #ea580c |
| success | #22c55e |
| warning | #eab308 |
| danger | #ef4444 |
| info | #3b82f6 |

### Tipografia

| Token | Valor |
|-------|-------|
| body | Inter, SF Pro Text, system-ui, sans-serif |
| mono | JetBrains Mono, ui-monospace, Menlo, monospace |
| display | Inter (peso 600-700) |

### Espacamento

| Token | Valor |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 24px |
| 2xl | 32px |

### Radii

| Token | Valor |
|-------|-------|
| sm | 4px |
| md | 6px |
| lg | 10px |
| xl | 14px |

## Mapa de Telas

- **Login Anthropic** (`login`) — rota: `#login` — stories: US-16, US-17
- **Welcome (sem pasta aberta)** (`welcome`) — rota: `#welcome` — stories: US-01, US-16, US-17
- **Workspace IDE** (`workspace`) — rota: `#workspace` — stories: US-01, US-02, US-03, US-04, US-05, US-06, US-16
- **Agent Manager** (`agent-manager`) — rota: `#agent-manager` — stories: US-07, US-10, US-11, US-12, US-13, US-15
- **Novo Agente** (`new-agent`) — rota: `#new-agent` — stories: US-07, US-08, US-09
- **Nova Skill** (`new-skill`) — rota: `#new-skill` — stories: US-10
- **Novo MCP Server** (`new-mcp`) — rota: `#new-mcp` — stories: US-14

## Navegacao Principal

- **Explorador** (`nav-explorer`) -> tela `workspace` — stories: US-01, US-04
- **Agente** (`nav-agent-chat`) -> tela `workspace` — stories: US-03, US-06
- **Agent Manager** (`nav-agent-manager`) -> tela `agent-manager` — stories: US-07, US-10, US-12
- **Agentes** (`nav-tab-agents`) -> tela `agent-manager` — stories: US-07, US-09
- **Skills** (`nav-tab-skills`) -> tela `agent-manager` — stories: US-10, US-11
- **MCP Servers** (`nav-tab-mcp`) -> tela `agent-manager` — stories: US-12, US-13, US-14, US-15

## Componentes Principais

- **Titlebar com menu nativo** (`comp-titlebar`) — tipo: `chrome`
- **Activity bar VS Code** (`comp-activity-bar`) — tipo: `nav`
- **Explorer file tree** (`comp-file-tree`) — tipo: `list`
- **Tab do editor** (`comp-editor-tab`) — tipo: `tab`
- **Bloco de codigo com syntax highlight** (`comp-code-block`) — tipo: `display`
- **Terminal integrado** (`comp-terminal`) — tipo: `display`
- **Mensagem de chat (user/agent)** (`comp-chat-message`) — tipo: `display`
- **Arvore de tarefas/subagentes em tempo real** (`comp-task-tree`) — tipo: `display`
- **Input do chat com modelo, plan e mic** (`comp-agent-input`) — tipo: `form`
- **Banner de status Anthropic** (`comp-auth-banner`) — tipo: `display`
- **Abas do Agent Manager** (`comp-am-tabs`) — tipo: `nav`
- **Toggle de escopo Projeto/Global** (`comp-scope-toggle`) — tipo: `form`
- **Card de subagente** (`comp-agent-card`) — tipo: `card`
- **Card de skill com toggle** (`comp-skill-card`) — tipo: `card`
- **Agrupamento de skills por categoria** (`comp-skill-category`) — tipo: `list`
- **Linha de MCP server na tabela** (`comp-mcp-row`) — tipo: `row`
- **Pill de status do MCP** (`comp-mcp-status-pill`) — tipo: `display`
- **Toggle switch** (`comp-toggle`) — tipo: `form`
- **Cartao de radio para escolha de modelo/esforco/etc** (`comp-radio-card`) — tipo: `form`
- **Checklist de tools permitidas** (`comp-tool-checklist`) — tipo: `form`
- **Picker de icone do agente** (`comp-icon-picker`) — tipo: `form`
- **Modal de confirmacao de commit com diff** (`comp-commit-modal`) — tipo: `modal`
- **Formulario de login Anthropic** (`comp-login-form`) — tipo: `form`
- **Toast de notificacao** (`comp-toast`) — tipo: `display`
- **Status bar inferior** (`comp-statusbar`) — tipo: `chrome`

## Deltas

- **ux-decision** (`delta-001`) — impacto: low
  Tela de login Anthropic adicionada como primeira tela do SPA para validar o estado de autenticacao (US-16) antes de qualquer outro fluxo. No produto desktop final esse fluxo aconteceria nas configuracoes do Claude Code, mas como o briefing exigiu 'login com form real que muda de tela ao submit', expomos um gate explicito.
- **ux-decision** (`delta-002`) — impacto: low
  Modal de confirmacao de commit (US-05) renderizado como overlay dentro do screen 'workspace' em vez de screen propria, porque o usuario nao sai do workspace para aprovar; e um estado modal.
- **ux-decision** (`delta-003`) — impacto: low
  Cada workspace recente na tela Welcome reabre direto no workspace (UX-01) sem passo intermediario. O briefing nao detalhou esse fluxo; foi assumido pelo padrao de IDEs (VS Code/Cursor).
- **ux-decision** (`delta-004`) — impacto: low
  Status 'Autenticando' do MCP (US-13) e implementado como estado transiente na coluna de acao, com toast de progresso. A UI volta automaticamente para 'Conectado' quando o fluxo OAuth termina.
- **scope-included** (`delta-005`) — impacto: low
  Toggle global 'Sincronizar com Claude Code' na tela MCP forca releitura das integracoes herdadas (RF-35). Util quando o usuario instala um MCP via Claude Code em paralelo.
- **non-functional-visualized** (`delta-006`) — impacto: low
  US-17 (branding) e US-18 (distribuicao desktop) sao requisitos transversais aplicados a TODA a UI (paleta, fonte Inter, mencao 'LionIDE' em titlebar/statusbar/About). Nao tem screen dedicada porque sao observaveis em qualquer screen.
