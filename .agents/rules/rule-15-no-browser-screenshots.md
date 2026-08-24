# Regra 15: Proibição de Navegador Automático & Solicitação de Prints do Usuário

## 🚫 Diretriz Inegociável

1. **Nunca Abrir ou Controlar Navegador Automaticamente:**
   - O agente **JAMAIS** deve utilizar ferramentas de automação de navegador (ex.: `browser_subagent`, subagentes com controle de navegador, automações que abram janelas gráficas de browser) para inspeção ou testes visuais.
   - Toda e qualquer validação visual e de interface (UI/UX) deve ser solicitada diretamente ao usuário.

2. **Protocolo de Inspeção Visual com o Usuário:**
   - Sempre que uma alteração visual, de layout, alinhamento, cores, modais, formulários ou responsividade for desenvolvida ou corrigida:
     - O agente deve **instruir o usuário de forma didática e clara** a abrir a tela correspondente no seu próprio navegador.
     - O agente deve **solicitar ao usuário que tire e envie prints/capturas de tela** do resultado visual observado.
     - Explicar exatamente o que deve ser observado na tela (ex.: "Verifique se o card de cliente aparece na lista", "Confira se o modal fechou corretamente").

3. **Validação Técnica Local:**
   - Testes automatizados de API e lógica devem rodar via linha de comando/headless (`vitest`, testes de endpoints REST), sem abrir instâncias visuais de navegador em background pelo agente.
