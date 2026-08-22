# Workflow Operacional: Da Venda à Entrega (Gestão Enxoval Pro)

Este workflow descreve o ciclo de vida completo de um pedido no Ateliê de Enxovais da Lucelia.

---

## 🔄 Visão Geral do Fluxo

```
[1. Captação & Venda]
         │  (Status do WhatsApp / Atendimento Carinhoso)
         ▼
[2. Cadastro Rápido no AppSheet]
         │  (Lucelia registra no celular: Cliente + Pedido + Sinal)
         ▼
[3. Confirmação Automática via Make]
         │  (WhatsApp da cliente recebe resumo com carinho)
         ▼
[4. Produção & Acompanhamento]
         │  (Lucelia visualiza "Produção da Semana" no app)
         ▼
[5. Finalização (Pedido Pronto)]
         │  (Lucelia clica em "Marcar como Pronto")
         ▼
[6. Disparo de Cobrança / Pix Restante via Make]
         │  (Cliente recebe aviso com chave Pix Copia e Cola)
         ▼
[7. Entrega e Fechamento]
         │  (Lucelia confirma pagamento e marca como "Entregue")
         ▼
[8. Pós-venda e Fidelização]
            (Solicitação de foto do bebê/quartinho)
```

---

## 📋 Detalhamento dos Passos

### Passo 1: Captação e Fechamento no WhatsApp
* **Responsável:** Lucelia.
* **Ação:** Postagem de fotos/vídeos nos Status do WhatsApp. Quando a cliente demonstra interesse, a Lucelia negocia via conversa individual e acerta o modelo e o valor do sinal.

### Passo 2: Registro no AppSheet (Mobile)
* **Responsável:** Lucelia.
* **Ação:** Abre o app no celular e clica no botão grande **"+ Novo Pedido"**:
  1. Seleciona cliente existente ou digita apenas Nome e Telefone.
  2. Descreve o enxoval em poucas palavras.
  3. Insere o Valor Total e o Sinal pago.
  4. Define a data de entrega combinada.

### Passo 3: Confirmação Automática
* **Responsável:** Make.com (Autônomo).
* **Ação:** Dispara uma mensagem afetuosa confirmando a encomenda e a data prevista.

### Passo 4: Controle de Produção
* **Responsável:** Lucelia.
* **Ação:** Consulta a aba *"Produção da Semana"* no app para saber exatamente quais peças cortar, bordar e costurar sem precisar folhear cadernos ou fichas de papel.

### Passo 5 & 6: Conclusão da Peça e Lembrete de Pagamento
* **Responsável:** Lucelia (1 clique) + Make.com.
* **Ação:** Ao terminar a peça, a Lucelia clica em **"Marcar como Pronto"**.
  * Se houver valor restante a ser pago, o Make.com envia automaticamente para a cliente a mensagem informando que a encomenda está pronta para entrega/retirada, acompanhada da chave Pix Copia e Cola.

### Passo 7: Entrega e Liquidação
* **Responsável:** Lucelia.
* **Ação:** Ao entregar o enxoval e receber o valor, clica no botão **"Confirmar Pagamento Restante"** e **"Entregue"**. O pedido é arquivado no histórico da cliente.
