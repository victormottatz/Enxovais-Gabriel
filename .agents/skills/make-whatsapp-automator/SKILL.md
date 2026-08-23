---
name: make-whatsapp-automator
description: Padrões e templates para automações de mensagens WhatsApp no Enxovais Gabriel (Lembretes de Vale/Pagamento, Recibos de Amortização e Avisos de Encomendas).
---

# Automações de WhatsApp: Enxovais Gabriel

Esta skill padroniza os templates de mensagens, rotinas de agendamento e fluxos de notificação via WhatsApp para o comércio e crediário próprio.

---

## 1. Cenários Principais de Notificação

### Cenário 1: Lembrete no Dia do Pagamento (Dia 05) ou Dia do Vale (Dia 20)
* **Gatilho (Trigger):** Agendamento diário às 08:30 buscando fichas ativas com vencimento no dia de hoje.
* **Modelo da Mensagem:**
```text
Olá, {Nome_Cliente}! Tudo bem com você? Esperamos que sim! 😊
Aqui é do Ateliê Enxovais Gabriel!

Passando para lembrar que hoje ({Data_Hoje}) é o dia do seu pagamento/vale combinado da sua ficha.

💰 Valor da Parcela: R$ {Valor_Parcela}
📑 Saldo Total Restante: R$ {Saldo_Devedor}

Para sua comodidade, você pode pagar direto pelo Pix:
Chave Pix: {Chave_Pix}
(Copia e cola)
{Pix_Copia_Cola}

Assim que realizar o pagamento, nos envie o comprovante por aqui para atualizarmos seu saldo e enviarmos seu recibo. Muito obrigado pela confiança! 🏠✨
```

---

### Cenário 2: Recibo Instantâneo de Amortização / Pagamento Efetuado
* **Gatilho:** Confirmação de baixa de pagamento (total ou parcial) na ficha da cliente.
* **Modelo da Mensagem:**
```text
Olá, {Nome_Cliente}! Recebemos seu pagamento com sucesso! 🎉

🧾 *RECIBO DE PAGAMENTO*
💵 Valor Pago: R$ {Valor_Pago}
📅 Data: {Data_Pagamento}
📑 *Novo Saldo Restante na Ficha: R$ {Novo_Saldo_Devedor}*

Agradecemos muito pela sua pontualidade e preferência! Qualquer dúvida ou precisando de novas utilidades para o seu lar, estamos à disposição! 💖
```

---

### Cenário 3: Aviso de Chegada de Encomenda do Fornecedor
* **Gatilho:** Status da encomenda alterado para `RECEBIDO_ESTOQUE`.
* **Modelo da Mensagem:**
```text
Olá, {Nome_Cliente}! Temos uma ótima notícia! 📦✨

O seu produto sob encomenda (*{Nome_Produto}*) acabou de chegar ao nosso ateliê!

Já conferimos o item e ele está separadinho com muito carinho para você. 
Podemos agendar a sua entrega ou você prefere retirar aqui conosco? Aguardo seu retorno! 🥰
```

---

## 2. Boas Práticas Técnicas
1. **Higienização do Telefone:** Garantir código do país (`55`) + DDD + 9 dígitos (total de 12 a 13 dígitos numéricos).
2. **Chave Pix em Linha Exclusiva:** O código copia-e-cola deve sempre estar isolado para facilitar a cópia com um toque no celular.
3. **Fila Assíncrona:** Todos os disparos devem passar por fila (BullMQ/Redis) com controle de taxa para evitar bloqueios no WhatsApp.
