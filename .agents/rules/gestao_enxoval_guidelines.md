# Diretrizes de Design e Usabilidade: Gestão Enxoval Pro (Ateliê da Lucelia)

## 1. Princípio Fundamental: "Tecnologia Invisível e Afetiva"
- **Usuária Principal:** Lucelia, artesã/proprietária que atua individualmente e tem forte resistência/dificuldade com softwares complexos.
- **Ambiente de Uso Principal:** Smartphone (uso mobile enquanto costura, atende no balcão ou responde clientes no WhatsApp).
- **Meta:** A ferramenta não pode parecer um "software de gestão corporativo", e sim um assistente simples e acolhedor do dia a dia.

---

## 2. Regras de Interface e Experiência do Usuário (UI/UX)
1. **Linguagem Amigável (Zero Jargões):**
   - ❌ *Evitar termos como:* "Lead", "Funil de Conversão", "Logística Reversa", "SKU", "Status: Inadimplente", "Database Query".
   - ✅ *Usar termos como:* "Cliente", "Pedido", "Em Costura", "Pronto para Entrega", "Aguardando Pagamento", "Lembrar Pagamento".

2. **Mobile First & Pouca Digitação:**
   - Priorizar campos de seleção rápida (Dropdowns / Enums / Botões de 1 clique).
   - Preenchimentos automáticos sempre que possível (data do dia atual, status padrão "Novo").
   - Apenas campos estritamente necessários no cadastro rápido (Nome, WhatsApp, Descrição do Enxoval, Valor Total, Sinal).

3. **Status Visuais Claros por Cores:**
   - 🟡 **Em Produção / Na Máquina:** Amarelo / Laranja
   - 🟢 **Pronto / Embalado:** Verde
   - 🔵 **Entregue:** Azul
   - 🔴 **Pagamento Pendente:** Vermelho suave / Alerta

---

## 3. Regras para Comunicação com Clientes (WhatsApp)
1. **Tom Afetuoso e Acolhedor:**
   - O relacionamento com mães, pais e famílias é emotivo e consultivo.
   - Mensagens de cobrança ou lembrete devem ser gentis, iniciando com saudação carinhosa e valorizando o enxoval do bebê.
2. **Facilidade no Pagamento:**
   - O código Pix Copia e Cola deve ser enviado em linha separada e destacada para que a cliente consiga copiar com facilidade no celular.
