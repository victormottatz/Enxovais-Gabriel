---
name: appsheet-data-modeler
description: Guia de boas práticas e modelagem de dados para Fichas de Crediário, Catálogo de Utilidades Domésticas e Encomendas no Enxovais Gabriel.
---

# Modelagem de Dados & Crediário Próprio: Enxovais Gabriel

Esta skill orienta a estrutura de dados, regras de negócio do crediário contínuo e sincronização de planilhas/bancos de dados para o comércio de utilidades domésticas e enxovais.

---

## 1. Regras Fundamentais do Crediário em Dividendo Acumulado

1. **Conta-Corrente Única por Cliente:** Toda cliente que compra a prazo possui uma única ficha (`fichas_crediario`).
2. **Dividendo Contínuo:** Novas compras a prazo aumentam o `saldo_devedor_total`.
3. **Parcela Combinada Fixa:** O valor da parcela (`valor_parcela_padrao`) permanece constante (ex: R$ 100,00), alongando o número de meses, a menos que haja renegociação explícita da vendedora com a cliente.
4. **Ciclo Sincronizado com Renda:** Cada ficha possui um dia fixo de vencimento:
   - `MENSAL_PAGAMENTO` (ex: Dia 05 - dia do salário).
   - `QUINZENAL_VALE` (ex: Dia 20 - adiantamento / vale salarial + Dia 05).

---

## 2. Esquema das Tabelas Principais

### Tabela 1: `Clientes`
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | UUID / Key | Identificador único da cliente |
| `nome` | String | Nome completo da titular da ficha |
| `whatsapp` | Phone | Telefone tratado no padrão E.164 (`5511999999999`) |
| `cpf` | String (Opcional) | CPF da cliente |
| `endereco` | Text | Endereço residencial para entregas |
| `ponto_referencia` | Text | Referência de localização |
| `limite_credito` | Decimal (BRL) | Limite pré-aprovado de crediário (padrão R$ 1.000,00) |

### Tabela 2: `Fichas_Crediario` (Conta Corrente)
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | UUID / Key | Identificador único da ficha |
| `cliente_id` | Ref Clientes | Vinculação com o cliente |
| `saldo_devedor_total`| Decimal (BRL) | Saldo total acumulado a pagar |
| `valor_parcela_padrao`| Decimal (BRL) | Valor fixo mensal/quinzenal acordado |
| `dia_vencimento_padrao`| Integer | Dia do mês de vencimento (1 a 31) |
| `tipo_ciclo` | Enum | `MENSAL_PAGAMENTO` ou `QUINZENAL_VALE` |
| `dia_vale_secundario` | Integer | Dia do vale (se quinzenal) |
| `status_ficha` | Enum | `ATIVO`, `BLOQUEADO`, `QUITADO` |

### Tabela 3: `Movimentacoes_Ficha` (Extrato Auditável)
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | UUID / Key | Identificador da movimentação |
| `ficha_id` | Ref Fichas | Referência da ficha |
| `tipo_movimentacao` | Enum | `DEBITO_COMPRA`, `CREDITO_PAGAMENTO`, `AJUSTE_PARCELA`, `ESTORNO` |
| `valor` | Decimal (BRL) | Valor da operação |
| `saldo_anterior` | Decimal (BRL) | Saldo antes do lançamento |
| `saldo_posterior` | Decimal (BRL) | Saldo resultante após o lançamento |
| `descricao` | Text | Detalhe (ex: "Compra: Jogo de Panelas", "Pagamento Pix") |

---

## 3. Padrão de Importação em Lote de Fichas Físicas (Migração)

Para digitalizar fichas de papel sem cadastrar histórico antigo linha por linha:
1. Cadastrar o cliente com Nome, WhatsApp e Endereço.
2. Criar a ficha com o `saldo_devedor_total` atual, `valor_parcela_padrao` e `dia_vencimento_padrao`.
3. Inserir uma movimentação inicial do tipo `DEBITO_COMPRA` com descrição `"Saldo Inicial de Migração - Ficha Física"`.
