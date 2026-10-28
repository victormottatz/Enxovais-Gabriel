# 📋 Manual Rápido: Como Passar as Fichas de Papel para a Planilha e Exportar em CSV

Este guia prático mostra, passo a passo, como ler uma **ficha física do Enxovais Gabriel**, digitar na planilha (Excel ou Google Planilhas) e salvar no formato `.CSV` para importar tudo de uma vez no sistema.

---

## 🎯 Qual planilha devo usar?

Você tem **2 opções** no sistema (na aba **📥 Importar Fichas**), e pode escolher a que achar mais prática:

1. **📄 Planilha 1 — Fichas Iniciais (`template_fichas_crediario.csv`):**
   * **Quando usar:** Quando você quer cadastrar a cliente rapidamente já com o **saldo que falta pagar hoje** (sem precisar digitar pagamento por pagamento antigo em linhas separadas).
2. **📜 Planilha 2 — Histórico Detalhado (`template_historico_pagamentos.csv`):**
   * **Quando usar:** Quando você quer que o extrato mostre **a compra original + cada pagamento antigo linha por linha** (ex.: dia 10/07 pagou R$ 170, dia 10/08 pagou R$ 170...).

---

## 🔍 Passo 1: Como Ler a Ficha de Papel (Exemplo Real da Foto)

Vamos usar como exemplo a ficha física nº **548LU** da **Fabiana Amiga (Indaiá)**:

```text
┌──────────────────────────────────────────────────────────┐
│ (548LU)          Enxovais Gabriel        16. 99197-3982  │
│                                                          │
│ Nome: FABIANA AMIGA (INDAIÁ)                             │
│ Rua: ANGELO MAIOLI          Bairro: P. AVA.              │
│ Fone: 16 98847 9219                                      │
│ OBJETO: 2 COBREDONS — 6 PARCELAS DE 170                  │
│ Data: 02/06/26                                           │
├────────────────┬───────────────────────┬─────────────────┤
│ DATA           │ PAGO                  │ RESTA           │
├────────────────┼───────────────────────┼─────────────────┤
│ 10/07          │ Pg 170                │ (850)           │
│ 10/08          │ Pg 170                │ (680)           │
│ 10/09          │ Pg 170                │ (510)           │
└────────────────┴───────────────────────┴─────────────────┘
```

### Contas rápidas dessa ficha:
* **Valor Total da Compra:** `6 x 170 = R$ 1.020,00`
* **Total Já Pago (3 parcelas):** `3 x 170 = R$ 510,00`
* **Saldo Devedor Atual (O que falta pagar hoje):** `R$ 510,00`
* **Dia de Vencimento:** Dia `10` de cada mês
* **Valor da Parcela Combinada:** `R$ 170,00`

---

## 💻 Passo 2: Como Preencher na Planilha

### Opção A: Usando a Planilha 1 (Rápida — 1 Linha por Ficha)
Abra o arquivo [`template_fichas_crediario.csv`](file:///x:/enxovais%20gabriel/frontend/template_fichas_crediario.csv) no Excel ou Google Planilhas e preencha **uma única linha para cada ficha**:

| Coluna da Planilha | O que digitar (Exemplo Fabiana) | Dica Importante |
| :--- | :--- | :--- |
| **`nome`** | `Fabiana Amiga (Indaiá)` | Nome como está na ficha |
| **`whatsapp`** | `16988479219` | Sempre **DDD + 9 dígitos** (sem espaços ou pontos) |
| **`cpf`** | *(deixe em branco se não tiver)* | Opcional |
| **`endereco`** | `Rua Angelo Maioli` | Rua e número |
| **`valor total da compra`** | `1020` | Valor total original da compra |
| **`ponto_referencia`** | `Bairro P. Ava.` | Bairro ou referência |
| **`limite_credito`** | `1500` | Se deixar em branco, o sistema usa `1000` |
| **`dia_vencimento`** | `10` | **Qualquer dia do mês escolhido pela cliente (de `1` a `31`)** — não precisa ser apenas dia 05 ou 20 |
| **`tipo_ciclo`** | `MENSAL_PAGAMENTO` | Opcional — o sistema aceita qualquer dia (`1` a `31`) automaticamente |
| **`saldo_devedor_atual`** | `510` | **Quanto falta ela pagar hoje** |
| **`valor_parcela`** | `170` | Valor de cada parcela mensal |
| **`observacoes`** | `Ficha 548LU - 6 parcelas de 170` | Qualquer anotação extra da ficha |
| **`produtos`** | `2 Cobredons` | O que está escrito no campo "OBJETO" |
| **`data da venda`** | `02/06/2026` | Data da compra (`DD/MM/AAAA`) |
| **`pagamento de parcelas`** | `10/07 pg 170, 10/08 pg 170, 10/09 pg 170` | Resumo dos pagamentos antigos anotados |

---

### Opção B: Usando a Planilha 2 (Histórico Detalhado — Linha por Linha)
Se você quiser que o sistema lance a compra de R$ 1.020,00 e dê baixa individual nas 3 parcelas de R$ 170,00 no extrato, abra o arquivo [`template_historico_pagamentos.csv`](file:///x:/enxovais%20gabriel/frontend/template_historico_pagamentos.csv) e preencha assim:

| `whatsapp` | `nome` | `tipo` | `data` | `valor` | `forma_pagamento` | `parcela_ref` | `descricao` | `observacoes` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `16988479219` | Fabiana Amiga (Indaiá) | `COMPRA_A_PRAZO` | `02/06/2026` | `1020,00` | `CREDIARIO` | `6 parcelas de 170` | `2 Cobredons` | `Ficha 548LU` |
| `16988479219` | Fabiana Amiga (Indaiá) | `PAGAMENTO` | `10/07/2026` | `170,00` | `DINHEIRO` | `Parcela 01/06` | `Pagamento na ficha` | `Pg 170 em 10/07` |
| `16988479219` | Fabiana Amiga (Indaiá) | `PAGAMENTO` | `10/08/2026` | `170,00` | `DINHEIRO` | `Parcela 02/06` | `Pagamento na ficha` | `Pg 170 em 10/08` |
| `16988479219` | Fabiana Amiga (Indaiá) | `PAGAMENTO` | `10/09/2026` | `170,00` | `DINHEIRO` | `Parcela 03/06` | `Pagamento na ficha` | `Pg 170 em 10/09` |

> **⚠️ Atenção para não duplicar o saldo:**
> * Se você cadastrar a cliente na **Planilha 1** já com `saldo_devedor_atual = 510`, **não** lance de novo os pagamentos de `10/07`, `10/08` e `10/09` na **Planilha 2**, senão o sistema vai abater R$ 510 de novo e zerar a ficha!
> * Use a **Planilha 2** quando quiser reconstruir a conta desde a compra original (`COMPRA_A_PRAZO` de `1020,00` seguida dos `PAGAMENTO`s de `170,00`), ou para lançar pagamentos avulsos recebidos depois.

---

## 💾 Passo 3: Como Exportar / Salvar em `.CSV`

### Opção 1: No Google Planilhas (Recomendado — Mais Fácil e Não Desconfigura Acentos)
1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma planilha em branco (ou vá em **Arquivo > Importar** e suba o modelo do sistema).
2. Digite todas as fichas nas linhas abaixo do cabeçalho (nunca apague a Linha 1 com os nomes das colunas!).
3. Quando terminar, clique no menu superior em:
   **Arquivo** ➔ **Fazer download** ➔ **Valores separados por vírgulas (.csv)**.
4. Pronto! O arquivo será salvo na sua pasta de *Downloads*.

### Opção 2: No Microsoft Excel (Computador)
1. Abra o arquivo modelo no Excel e preencha os dados das fichas.
2. Clique em **Arquivo** ➔ **Salvar Como** (ou **Exportar**).
3. Escolha a pasta onde quer salvar.
4. No campo **"Tipo"** (logo abaixo do nome do arquivo), clique na setinha e escolha:
   **`CSV UTF-8 (Delimitado por vírgulas) (*.csv)`** *(ou `CSV (separado por vírgulas) (*.csv)`)*.
5. Clique em **Salvar**. Se o Excel perguntar se deseja manter esse formato, clique em **Sim**.

---

## 🚀 Passo 4: Como Importar no Sistema Enxovais Gabriel

1. Abra o sistema do **Enxovais Gabriel** e clique no menu lateral **"📥 Importar Fichas"**.
2. Escolha o botão correspondente ao modelo que você preencheu:
   * **📑 Importar Fichas & Clientes** (se usou a Planilha 1)
   * **📜 Importar Histórico de Pagamentos / Compras** (se usou a Planilha 2)
3. **Arraste o arquivo `.csv`** para dentro da caixa pontilhada (ou clique nela para escolher o arquivo).
4. Confira a **Tabela de Pré-Visualização** que aparece na tela:
   * Linhas com **✅ Válido (Verde)** estão prontas.
   * Se alguma linha ficar **❌ Com Erro (Vermelho)**, o sistema dirá exatamente o motivo (ex.: telefone sem DDD).
5. Clique no botão **"🚀 Confirmar e Digitalizar"**.
6. **Dica de Ouro no Papel:** Assim que confirmar no sistema, faça um traço ou escreva **`OK SISTEMA`** no canto da ficha de papel para saber que aquela cliente já foi migrada!
