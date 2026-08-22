---
name: make-whatsapp-automator
description: Padrões e templates para automações no Make.com integrando Google Sheets e WhatsApp para o Ateliê de Enxovais.
---

# Make.com & WhatsApp Automation Skill

Esta skill descreve como montar os cenários de automação no Make.com conectando o Google Sheets às notificações no WhatsApp de forma humanizada e segura.

## 1. Cenários Principais de Automação

### Cenário 1: Lembrete Gentil de Pagamento Restante
* **Gatilho (Trigger):** Watch Rows no Google Sheets (quando `Status_Producao` mudar para `Pronto p/ Entrega` e `Valor_Restante` > 0) OU Agendamento Diário às 09:00 verificando pedidos prontos para retirada/entrega.
* **Ação:** Disparo de mensagem via API do WhatsApp.
* **Modelo da Mensagem:**
```text
Olá, {Nome_Cliente}! Tudo bem com você? 🥰
Aqui é a Lucelia do Ateliê de Enxovais!

Passando com muita alegria para avisar que o seu pedido ({Descricao_Itens}) já está prontinho e embalado com todo carinho! ✨

Para a entrega/retirada, o saldo restante é de R$ {Valor_Restante}.
Você pode realizar o pagamento direto pelo Pix abaixo:

Chave Pix: {Chave_Pix}
(Copia e cola)
{Pix_Copia_Cola}

Qualquer dúvida ou para combinarmos o melhor horário de entrega, me avise por aqui! Muito obrigada! 💖
```

---

### Cenário 2: Confirmação de Pedido Fechado
* **Gatilho:** Inclusão de nova linha na tabela `Pedidos`.
* **Ação:** Disparo automático de boas-vindas e resumo dos detalhes combinados.
* **Modelo da Mensagem:**
```text
Oi {Nome_Cliente}, que felicidade fazer parte desse momento especial! 👶🧶

Seu pedido foi registrado com sucesso em nosso ateliê:
📝 Encomenda: {Descricao_Itens}
📅 Previsão de entrega: {Data_Previsao_Entrega}
💰 Valor Total: R$ {Valor_Total} (Sinal confirmado: R$ {Valor_Sinal})

Assim que as peças entrarem na fase final de acabamento, eu te aviso! Um abraço carinhoso! 💕
```

---

## 2. Boas Práticas Técnicas no Make.com

1. **Validação de Número:** Tratar o número de telefone no Make para garantir formato DDI + DDD + Número (ex: `5511999999999`).
2. **Prevenção de Spam / Duplicidade:** Criar uma coluna de controle no Google Sheets chamada `Status_Notificacao` para marcar "Notificado" e não reenviar repetidamente.
3. **Tratamento de Erros:** Adicionar um módulo *Error Handler (Resume/Commit)* para registrar falhas de envio em uma aba de logs caso o WhatsApp esteja fora do ar ou o número seja inválido.
