# 📋 PRD: Gestão Comercial & Crediário Enxovais Gabriel
**Documento de Requisitos de Produto (PRD)**  
**Versão:** 2.0  
**Data:** 22/08/2026  
**Status:** Aprovado para Implementação  

---

## 1. 🎯 Objetivos de Negócio

1. **Gestão Centralizada de Estoque e Encomendas:** Controlar o vasto acervo de produtos pronta-entrega (cama, mesa, banho, cozinha, decoração, organização) e as encomendas realizadas a fabricantes/distribuidores.
2. **Automação do Crediário Próprio (Fichas):** Extinguir as fichas de papel por uma conta-corrente digital onde novas compras são acumuladas no dividendo, mantendo a parcela combinada ou ajustando conforme negociação da vendedora.
3. **Cobrança Pontual e Humanizada:** Notificar clientes no dia exato de seu pagamento ou vale salarial com opções de pagamento Pix facilitadas e emitir recibos automáticos de amortização.
4. **Multi-Meios de Pagamento:** Suportar vendas em Crediário, Pix, Cartões e Dinheiro, além de modalidades mistas.

---

## 2. 👥 Perfis de Usuários e Permissões

| Perfil | Ações Permitidas |
| :--- | :--- |
| **Vendedora / Atendimento** | Consultar produtos e estoque, lançar vendas balcão/WhatsApp, abrir e consultar fichas de crediário, registrar pagamentos/amortizações, disparar mensagens de cobrança e recibo. |
| **Gerente / Administrador** | Cadastrar produtos e fornecedores, gerenciar limites de crediário, ajustar templates de mensagens WhatsApp, visualizar relatórios de faturamento, inadimplência e projeção de recebíveis. |

---

## 3. 📦 Épicos e Requisitos Funcionais

### Épico 1: Catálogo de Produtos e Controle de Estoque
* **RF1.1 - Cadastro de Produtos:** Código/SKU, nome, categoria (*Cama/Mesa/Banho*, *Cozinha*, *Decoração*, *Organização*, *Outros*), unidade de medida, preço de custo, preço de venda à vista, preço de venda a prazo (crediário).
* **RF1.2 - Controle de Saldo de Estoque:** Atualização automática de estoque na venda pronta-entrega, alerta de estoque baixo (estoque mínimo) e histórico de entradas de distribuidores.
* **RF1.3 - Gestão de Encomendas:** Venda de produtos sob encomenda gera card de acompanhamento: *Solicitado ao Fabricante*, *A Caminho*, *Recebido no Estoque*, *Entregue ao Cliente*.

### Épico 2: Gestão de Clientes e Fichas de Crediário
* **RF2.1 - Cadastro de Clientes:** Nome completo, WhatsApp (com validação DDI/DDD), CPF, endereço residencial e de entrega, ponto de referência, limite de crédito pré-aprovado e observações.
* **RF2.2 - Abertura e Gestão de Ficha:** Toda cliente que compra no crediário tem uma Ficha única vinculada ao seu cadastro.
* **RF2.3 - Saldo Devedor Acumulado (Dividendo):** O sistema mantém o saldo devedor consolidado da cliente somando todas as compras a prazo e subtraindo os pagamentos efetuados.
* **RF2.4 - Regra de Parcela Fixa Contínua:**
  - A ficha possui um `valor_parcela_padrao` (ex: R$ 100,00).
  - Quando uma nova compra a prazo é lançada (ex: + R$ 300,00), o dividendo aumenta e o sistema estende o prazo proporcionalmente mantendo a parcela de R$ 100,00.
  - **Negociação da Vendedora:** O sistema permite que a vendedora altere o `valor_parcela_padrao` se ela negociar com o cliente (ex: aumentar para R$ 150,00).
* **RF2.5 - Dia de Vencimento Sincronizado:**
  - A ficha define o dia do pagamento mensal (ex: dia 05) ou quinzenal/vale (ex: dia 20).
  - O sistema gera a agenda de parcelas com as datas calculadas com base nesse dia fixo.
* **RF2.6 - Extrato Completo de Movimentações:** Histórico detalhado de cada lançamento na ficha (Débito de Compra, Crédito de Pagamento, Estorno, Ajuste).

### Épico 3: Módulo de Vendas e Pagamentos
* **RF3.1 - Registro Rápido de Venda:** Seleção de cliente, inclusão de múltiplos itens (pronta-entrega ou encomenda), seleção da forma de pagamento (*Crediário*, *Pix*, *Cartão Crédito*, *Cartão Débito*, *Dinheiro*, *Misto*).
* **RF3.2 - Venda Mista / Entrada:** Suporte a entrada em dinheiro/Pix com o restante financiado na ficha de crediário.
* **RF3.3 - Amortização / Baixa de Pagamento:**
  - Baixa total de parcela ou pagamento avulso parcial (ex: cliente deve R$ 100, mas pagou R$ 60).
  - O sistema abate R$ 60 do dividendo total, quita parcialmente a parcela mais antiga e calcula o saldo remanescente.

### Épico 4: Automação de WhatsApp e Cobrança Humanizada
* **RF4.1 - Lembrete no Dia do Pagamento / Vale:** Notificação amigável enviada na manhã do dia acordado com os dados da parcela e chave Pix Copia-e-Cola.
* **RF4.2 - Recibo Digital Instantâneo:** Disparo automático logo após a confirmação do pagamento com extrato amigável: *"Recebemos R$ X,00. Seu saldo restante na ficha agora é R$ Y,00. Muito obrigado!"*.
* **RF4.3 - Notificação de Chegada de Encomenda:** Disparo automático informando que o produto encomendado chegou ao estoque e está pronto para entrega/retirada.

---

## 4. 🔒 Requisitos Não Funcionais (Segurança, Performance e Confiabilidade)

1. **Async Performance & Queue:** Disparos de WhatsApp e webhooks executados em filas assíncronas (BullMQ/Redis) com retry automático.
2. **Isolamento de Segurança & RLS:** Chaves de API protegidas em variáveis de ambiente e validação de sessão em todos os endpoints.
3. **Auditoria de Movimentações:** Nenhuma exclusão física de registros na ficha de crediário; toda alteração gera registro em `movimentacoes_ficha`.
4. **Mobile First & Alta Usabilidade:** Resposta de endpoints < 200ms para garantir fluidez no PWA mobile.
