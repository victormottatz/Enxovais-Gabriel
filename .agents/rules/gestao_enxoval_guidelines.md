# 🏠 Diretrizes de Design, Usabilidade e Crediário: Enxovais Gabriel (v2.0)

## 1. 🎯 Princípio Fundamental: "Tecnologia Descomplicada, Ágil e Humanizada"
- **Perfil Operacional:** Vendedoras e gestoras de atendimento balcão, rota e WhatsApp.
- **Contexto de Negócio:** Comércio revendedor de **utilidades domésticas e artigos para o lar** (cama, mesa, banho, cozinha, decoração, organização) com:
  1. Vendas à pronta-entrega (baixa direta de estoque).
  2. Vendas sob encomenda com fornecedores/distribuidores.
  3. **Crediário Próprio em Ficha:** Dividendo acumulado contínuo, valor de parcela fixa e vencimentos casados com o fluxo de renda da cliente (dia do salário ou dia do vale).
- **Ambiente de Uso Principal:** Smartphone e tablet de balcão (PWA Mobile First) e desktop.
- **Meta:** A ferramenta deve ser extremamente ágil, didática e eliminar qualquer atrito de cálculo de parcelas ou cobrança.

---

## 2. 📱 Regras de Interface e Experiência do Usuário (UI/UX)
1. **Linguagem Amigável (Zero Jargões):**
   - ❌ *Evitar termos como:* "Lead", "Funil de Conversão", "SKU ID", "Payload", "Status: Inadimplente", "Amortização Contábil".
   - ✅ *Usar termos como:* "Cliente", "Ficha", "Saldo no Dividendo", "Parcela Combinada", "Dia do Pagamento (05)", "Dia do Vale (20)", "Encomenda", "Chegou no Estoque".

2. **Mobile First & Alta Eficiência no Balcão:**
   - **Botões Grandes e Táteis:** Mínimo de 48px de altura em botões e seletores touch.
   - **Simulador de Crediário em Tempo Real:** Ao adicionar itens a prazo, calcular na hora o impacto no dividendo e número de parcelas restantes.
   - **Preenchimento Rápido com Atalhos:** Sugestões rápidas de valores de amortização (ex: *Pagar Parcela R$ 100*, *Pagar R$ 50*, *Quitar Ficha*).

3. **Status Visuais Claros por Cores:**
   - 🟢 **Em Dia / Quitado:** Verde suave
   - 🟡 **Vence Hoje (Lembrar):** Dourado / Amarelo
   - 🔴 **Vencido / Em Atraso:** Terracota / Vermelho suave
   - 🔵 **Encomenda Solicitada / A Caminho:** Azul clássico

---

## 3. 💬 Regras para Comunicação com Clientes (WhatsApp)
1. **Cobrança Pontual e Respeitosa:**
   - As cobranças devem ocorrer pontualmente na data acordada (**dia do vale ou dia do pagamento**).
   - O tom deve ser acolhedor, transparente e com chave Pix Copia-e-Cola destacada em linha única.

2. **Recibos Instantâneos com Saldo Atualizado:**
   - Toda vez que a cliente realizar um pagamento, enviar imediatamente o extrato simplificado:
     > *"Recebemos seu pagamento de R$ {Valor_Pago}. Seu saldo restante na ficha agora é R$ {Novo_Saldo}. Muito obrigado pela preferência!"*
