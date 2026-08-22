# 📖 Histórias de Usuário & Critérios de Aceite (User Stories)
**Projeto:** Enxovais Gabriel — Gestão Comercial, Estoque e Crediário Próprio  
**Versão:** 2.0  
**Data:** 22/08/2026  

---

## 🎯 Épico 1: Gestão de Produtos, Estoque e Encomendas

### US01: Consulta e Cadastro Rápido de Produtos
* **Como:** Vendedora da Enxovais Gabriel
* **Quero:** Consultar o estoque de um produto de utilidades domésticas (ex: jogo de cama casal, jogo de panelas) ou cadastrar novos itens
* **Para:** Informar imediatamente o cliente sobre a disponibilidade e preço à vista/prazo.
* **Critérios de Aceite:**
  1. Busca instantânea por nome, SKU ou categoria.
  2. Exibição clara de `Estoque Disponível`, `Preço à Vista` e `Preço a Prazo (Crediário)`.
  3. Se o item estiver zerado no estoque físico, exibir opção de "Aceitar Encomenda".

### US02: Gestão de Itens sob Encomenda
* **Como:** Gestora da loja
* **Quero:** Acompanhar as encomendas feitas a fabricantes e distribuidores
* **Para:** Saber quando os produtos chegam e avisar a cliente para entrega/retirada.
* **Critérios de Aceite:**
  1. Listagem agrupada por status: *Solicitada*, *A Caminho*, *Recebida no Estoque*.
  2. Ao marcar uma encomenda como *Recebida no Estoque*, o sistema oferece disparo automático de WhatsApp avisando a cliente.

---

## 🎯 Épico 2: Vendas e Crediário Próprio (Fichas de Clientes)

### US03: Venda a Prazo no Crediário com Parcela Mantida
* **Como:** Vendedora
* **Quero:** Lançar uma nova compra no crediário para uma cliente que já possui saldo devedor na ficha
* **Para:** Acumular o novo valor no dividendo total mantendo o valor da parcela mensal já combinada (alongando o prazo de quitação).
* **Critérios de Aceite:**
  1. O sistema soma o valor financiado ao `saldo_devedor_total`.
  2. O sistema gera as novas parcelas mantendo o `valor_parcela_padrao` (ex: R$ 100,00), estendendo as datas futuras com base no dia fixo da ficha (ex: todo dia 05).
  3. A vendedora pode, opcionalmente, digitar um novo valor de parcela caso tenha renegociado com a cliente no balcão.

### US04: Baixa de Pagamento e Amortização de Dividendo
* **Como:** Vendedora
* **Quero:** Registrar o recebimento de uma parcela ou pagamento parcial da cliente
* **Para:** Atualizar o dividendo da ficha e enviar imediatamente o recibo pelo WhatsApp.
* **Critérios de Aceite:**
  1. O sistema abate o valor recebido do `saldo_devedor_total`.
  2. As parcelas mais antigas em aberto são marcadas como `PAGO_TOTAL` ou `PAGO_PARCIAL`.
  3. É gerado um registro em `movimentacoes_ficha` do tipo `CREDITO_PAGAMENTO`.
  4. Disparo opcional/automático de mensagem WhatsApp com o recibo: *"Recebemos R$ X,00! Seu saldo restante na ficha é R$ Y,00."*

### US05: Painel de Cobrança por Dia do Pagamento / Vale
* **Como:** Vendedora / Cobradora
* **Quero:** Filtrar todas as fichas de clientes com vencimento no dia do pagamento (ex: dia 05) ou no dia do vale (ex: dia 20)
* **Para:** Realizar a rotina de envio de lembretes amigáveis com a chave Pix sem esquecer de ninguém.
* **Critérios de Aceite:**
  1. Visualização de cards com nome da cliente, WhatsApp, valor da parcela do mês e saldo devedor total.
  2. Botão de 1-toque para enviar mensagem formatada via WhatsApp com chave Pix Copia-e-Cola.
