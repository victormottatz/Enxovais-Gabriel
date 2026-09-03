# Workflow Operacional: Enxovais Gabriel (v2.0)

Este documento mapeia os fluxos operacionais de ponta a ponta do **Enxovais Gabriel** — comércio de utilidades domésticas, artigos para o lar e enxovais —, cobrindo vendas à pronta-entrega, encomendas com fornecedores, crediário próprio (fichas de dividendo acumulado) e automações de WhatsApp.

---

## 🔄 Visão Geral dos 4 Fluxos Principais

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      FLUXOS OPERACIONAIS GABRIEL                       │
 └────────────────────────────────────────────────────────────────────────┘
          │                   │                     │                  │
          ▼                   ▼                     ▼                  ▼
  [1. Venda Balcão/Rota] [2. Encomenda Fornec.] [3. Cobrança/Vale]  [4. Amortização/Pix]
  - Pronta-entrega       - Solicitação ao distr. - Lembrete Dia 05  - Baixa no sistema
  - Baixa imediata       - Chegada no ateliê     - Lembrete Dia 20  - Recibo WhatsApp
  - À vista ou Ficha     - Notificação cliente   - Pix Copia e Cola - Saldo atualizado
```

---

## 📋 1. Fluxo de Venda Pronta-Entrega (Balcão / Rota)

* **Objetivo:** Registrar a saída imediata de produtos de cama, mesa, banho e utilidades domésticas.
* **Responsável:** Vendedora / Atendente.

```
[Cliente escolhe produtos] 
         │
         ▼
[Abertura da Venda no Sistema/PWA]
         │
         ├─► SE À VISTA (Pix / Dinheiro / Cartão):
         │       └─► Registra recebimento total ──► Baixa no estoque ──► Venda Concluída!
         │
         └─► SE NO CREDIÁRIO PRÓPRIO (Ficha):
                 ├─► Localiza ou cadastra a cliente (Nome + WhatsApp + Endereço)
                 ├─► Define entrada/sinal (se houver)
                 ├─► Adiciona o valor restante ao Dividendo Acumulado da Ficha
                 ├─► Mantém a parcela combinada (ex: R$ 100/mês ou R$ 50/vale)
                 └─► Baixa no estoque ──► Dispara confirmação via WhatsApp
```

---

## 📦 2. Fluxo de Vendas sob Encomenda (Fornecedor ➔ Cliente)

* **Objetivo:** Atender pedidos especiais de itens não disponíveis em estoque físico.
* **Responsáveis:** Vendedora + Sistema de Notificações.

```
[1. Captação do Pedido] ──► Cliente escolhe catálogo/modelo sob encomenda
         │
         ▼
[2. Registro da Encomenda] ──► Sistema registra: Produto + Fornecedor + Previsão
         │                     └─► Status: "SOLICITADO_AO_FORNECEDOR"
         ▼
[3. Chegada do Produto] ──► Mercadoria recebida e conferida no ateliê
         │                  └─► Vendedora altera status para: "RECEBIDO_ESTOQUE"
         ▼
[4. Notificação Automática] ──► Disparo WhatsApp para a cliente:
         │                      "Seu produto {Nome_Produto} acabou de chegar!"
         ▼
[5. Entrega e Acerto] ──► Cliente retira ou recebe em rota
                          └─► Liquidação à vista ou inclusão na Ficha de Crediário
```

---

## ⏰ 3. Fluxo de Cobrança e Lembretes de Vencimento (Dia do Pagamento & Vale)

* **Objetivo:** Garantir previsibilidade de caixa respeitando as datas de recebimento de renda das clientes.
* **Responsáveis:** Rotina Automática (Make.com / Sistema) + Vendedora.

```
[Disparo Diário às 08:30]
         │
         ▼
[Varredura no Banco de Dados]
  Busca clientes com fichas ATIVAS e vencimento no dia:
  • Dia 05: Vencimento Salarial Mensal
  • Dia 20: Vencimento do Vale Salarial Quinzenal
         │
         ▼
[Envio da Notificação Afetuosa via WhatsApp]
  • Nome da cliente
  • Valor da parcela combinada
  • Saldo devedor total acumulado
  • Chave Pix Copia e Cola destacada em linha única
         │
         ▼
[Acompanhamento no Painel]
  • Lista de "Cobranças do Dia" sinalizada em amarelo no sistema
```

---

## 🧾 4. Fluxo de Amortização de Crediário e Recibo Instantâneo

* **Objetivo:** Registrar o recebimento (total ou parcial) e fornecer segurança e transparência imediata à cliente.
* **Responsáveis:** Vendedora + Webhook de Confirmação.

```
[Cliente realiza pagamento (Pix ou Dinheiro)]
         │
         ▼
[Lançamento no Sistema / PWA]
  1. Vendedora seleciona a Ficha da Cliente.
  2. Informa o valor amortizado (ex: R$ 100,00).
  3. Sistema subtrai do `saldo_devedor_total` e gera registro de movimentação (`CREDITO_PAGAMENTO`).
         │
         ▼
[Disparo Imediato do Recibo via WhatsApp]
  "Olá, {Nome_Cliente}! Recebemos seu pagamento de R$ {Valor_Pago}! 🎉
   Novo saldo restante da sua ficha: R$ {Novo_Saldo_Devedor}."
         │
         ▼
[Atualização de Status]
  • Se saldo > 0: Ficha permanece ATIVA com novo saldo.
  • Se saldo == 0: Status atualizado para QUITADO (com opção de reabertura em novas compras).
```

---

## 🎯 Regras de Ouro do Workflow Operacional

1. **Agilidade no Balcão:** Qualquer operação de venda ou baixa deve ser concluída em menos de 3 toques no celular.
2. **Transparência Total:** A cliente sempre sabe exatamente o valor de sua parcela fixa e seu saldo restante após cada movimentação.
3. **Tom Humanizado e Respeitoso:** As mensagens de cobrança e recibos tratam a cliente com carinho, proximidade e clareza.

