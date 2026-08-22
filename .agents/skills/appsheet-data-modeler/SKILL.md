---
name: appsheet-data-modeler
description: Guia de boas práticas e modelagem de dados para Google Sheets integrado ao AppSheet no contexto do Ateliê de Enxovais.
---

# AppSheet & Google Sheets Data Modeler

Esta skill orienta a criação, normalização e configuração de planilhas do Google Sheets para atuarem perfeitamente como banco de dados no AppSheet.

## 1. Estrutura Padrão de Planilhas (Google Sheets)

Para evitar erros de sincronização e perda de dados, cada tabela deve seguir regras estritas:
1. **Primeira Linha:** Apenas os nomes exatos das colunas (sem mesclar células ou colocar títulos acima).
2. **Coluna Chave Primária:** Cada tabela deve iniciar com um ID único (ex: `ID_Cliente`, `ID_Pedido`) gerado via `UNIQUEID()` no AppSheet.
3. **Formatação Limpa:** Deixar as linhas de dados sem fórmulas complexas nas células; preferir *Virtual Columns* ou *App Formulas* no AppSheet.

---

## 2. Esquema das Tabelas Recomendadas

### Tabela 1: `Clientes`
| Coluna | Tipo no AppSheet | Descrição / Configuração |
| :--- | :--- | :--- |
| `ID_Cliente` | Text / Key | Chave primária (`UNIQUEID()`) |
| `Nome` | Name | Nome completo da cliente |
| `WhatsApp` | Phone | Telefone com DDD (permite clique direto para abrir conversa) |
| `Endereco` | Address / LongText | Endereço ou ponto de referência |
| `Observacoes` | LongText | Preferências de cores, nome do bebê, restrições |
| `Data_Cadastro` | Date | Data de inclusão (`TODAY()`) |

### Tabela 2: `Pedidos`
| Coluna | Tipo no AppSheet | Descrição / Configuração |
| :--- | :--- | :--- |
| `ID_Pedido` | Text / Key | Chave primária (`UNIQUEID()`) |
| `ID_Cliente` | Ref | Referência à tabela `Clientes` |
| `Data_Pedido` | Date | Data do fechamento (`TODAY()`) |
| `Data_Previsao_Entrega` | Date | Data combinada para entrega |
| `Descricao_Itens` | LongText | Resumo das peças (ex: "Kit berço 5 peças bordado urso") |
| `Valor_Total` | Price (BRL) | Valor total da encomenda |
| `Valor_Sinal` | Price (BRL) | Valor pago antecipadamente |
| `Valor_Restante` | Price (BRL) | Virtual Column: `[Valor_Total] - [Valor_Sinal]` |
| `Status_Producao` | Enum | Opções: `Fila de Espera`, `Cortando/Bordando`, `Costura Final`, `Pronto p/ Entrega`, `Entregue` |
| `Status_Pagamento` | Enum | Opções: `Aguardando Sinal`, `Sinal Pago`, `Pago Integral`, `Pendente Pagamento Final` |
| `Foto_Referencia` | Image | Foto enviada pela cliente ou do produto modelo |

---

## 3. Configurações de UX no AppSheet

1. **Ações Rápidas (Actions):**
   - Botão **"Conversar no WhatsApp"**: `CONCATENATE("https://wa.me/55", [WhatsApp])`
   - Botão **"Marcar como Pronto"**: Altera `Status_Producao` para `Pronto p/ Entrega` com 1 toque.
   - Botão **"Confirmar Pagamento Restante"**: Atualiza `Status_Pagamento` para `Pago Integral`.

2. **Visualizações (Views):**
   - **Visão 1: "Produção da Semana"** (Deck ou Card view filtrando pedidos com entrega nos próximos 7 dias).
   - **Visão 2: "Cobranças Pendentes"** (Tabela filtrando pedidos prontos/entregues com saldo devedor).
   - **Visão 3: "Clientes"** (Lista com busca rápida por nome ou telefone).
