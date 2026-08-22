// Configuração da API
const API_BASE = '/api/v1';

// Estado global simples
let fichasCarregadas = [];
let produtosCarregados = [];
let clientesCarregados = [];
let filtroVencimentoAtual = 'todos';

// Formatação Monetária
function formatMoney(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  carregarDadosIniciais();
});

async function carregarDadosIniciais() {
  await Promise.all([
    carregarFichas(),
    carregarClientesSelect(),
    carregarProdutos()
  ]);
}

// =============================================================================
// NAVEGAÇÃO ENTRE ABAS
// =============================================================================
function trocarAba(abaId, elementoBotao) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

  const tabAlvo = document.getElementById(`tab-${abaId}`);
  if (tabAlvo) {
    tabAlvo.classList.add('active');
  }

  if (elementoBotao) {
    elementoBotao.classList.add('active');
  }

  if (abaId === 'cobrancas' || abaId === 'fichas') {
    carregarFichas();
  } else if (abaId === 'estoque') {
    carregarProdutos();
  }
}

// =============================================================================
// COBRANÇAS E FICHAS DE CREDIÁRIO
// =============================================================================
async function carregarFichas() {
  try {
    const res = await fetch(`${API_BASE}/fichas`);
    if (!res.ok) throw new Error('Erro ao carregar fichas');
    fichasCarregadas = await res.json();

    atualizarMetricas();
    renderizarCobrancas();
    renderizarFichas(fichasCarregadas);
  } catch (err) {
    console.error(err);
  }
}

function atualizarMetricas() {
  const totalDividendo = fichasCarregadas.reduce((acc, f) => acc + Number(f.saldo_devedor_total), 0);
  const receberHoje = fichasCarregadas
    .filter(f => f.status_ficha === 'ATIVO' && Number(f.saldo_devedor_total) > 0)
    .reduce((acc, f) => acc + Number(f.valor_parcela_padrao), 0);

  document.getElementById('metric-total-dividendo').innerText = formatMoney(totalDividendo);
  document.getElementById('metric-receber-hoje').innerText = formatMoney(receberHoje);
}

function filtrarCobrancas(dia, botao) {
  filtroVencimentoAtual = dia;
  document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
  if (botao) botao.classList.add('active');
  renderizarCobrancas();
}

function renderizarCobrancas() {
  const container = document.getElementById('lista-cobrancas');
  if (!container) return;

  let filtradas = fichasCarregadas.filter(f => Number(f.saldo_devedor_total) > 0);

  if (filtroVencimentoAtual !== 'todos') {
    const diaNum = Number(filtroVencimentoAtual);
    filtradas = filtradas.filter(f => f.dia_vencimento_padrao === diaNum || f.dia_vale_secundario === diaNum);
  }

  if (filtradas.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <p style="font-size: 2rem; margin-bottom: 8px;">🎉</p>
        <p>Nenhuma cobrança pendente para este filtro.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtradas.map(f => `
    <div class="card-item">
      <div class="card-header-flex">
        <div>
          <div class="client-name">${f.cliente_nome || 'Cliente'}</div>
          <div class="client-phone">📱 ${f.cliente_whatsapp || 'Sem telefone'}</div>
        </div>
        <span class="tag-status ${f.status_ficha === 'QUITADO' ? 'quitado' : 'active'}">
          ${f.status_ficha} (Dia ${f.dia_vencimento_padrao})
        </span>
      </div>

      <div class="card-finance-info">
        <div class="finance-col">
          <span>Saldo no Dividendo</span>
          <strong class="highlight">${formatMoney(f.saldo_devedor_total)}</strong>
        </div>
        <div class="finance-col">
          <span>Parcela do Mês</span>
          <strong>${formatMoney(f.valor_parcela_padrao)}</strong>
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-whatsapp" onclick="enviarLembreteWhatsApp('${f.id}', '${f.cliente_nome}', '${f.cliente_whatsapp}', ${f.valor_parcela_padrao}, ${f.saldo_devedor_total})">
          💬 Cobrar WhatsApp
        </button>
        <button class="btn btn-primary" onclick="abrirModalPagamento('${f.id}', '${f.cliente_nome}', ${f.saldo_devedor_total}, ${f.valor_parcela_padrao})">
          💵 Baixa
        </button>
      </div>
    </div>
  `).join('');
}

function buscarFichas(termo) {
  const filtradas = fichasCarregadas.filter(f => 
    (f.cliente_nome && f.cliente_nome.toLowerCase().includes(termo.toLowerCase())) ||
    (f.cliente_whatsapp && f.cliente_whatsapp.includes(termo))
  );
  renderizarFichas(filtradas);
}

function renderizarFichas(lista) {
  const container = document.getElementById('lista-fichas');
  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma ficha encontrada.</p>`;
    return;
  }

  container.innerHTML = lista.map(f => `
    <div class="card-item">
      <div class="card-header-flex">
        <div>
          <div class="client-name">${f.cliente_nome}</div>
          <div class="client-phone">📱 ${f.cliente_whatsapp}</div>
        </div>
        <span class="tag-status ${f.status_ficha === 'QUITADO' ? 'quitado' : 'active'}">${f.status_ficha}</span>
      </div>
      <div class="card-finance-info">
        <div class="finance-col">
          <span>Dividendo Total</span>
          <strong class="highlight">${formatMoney(f.saldo_devedor_total)}</strong>
        </div>
        <div class="finance-col">
          <span>Parcela Atual</span>
          <strong>${formatMoney(f.valor_parcela_padrao)}</strong>
        </div>
        <div class="finance-col">
          <span>Dia Venc.</span>
          <strong>Todo dia ${f.dia_vencimento_padrao}</strong>
        </div>
      </div>
      <button class="btn btn-outline" onclick="abrirModalPagamento('${f.id}', '${f.cliente_nome}', ${f.saldo_devedor_total}, ${f.valor_parcela_padrao})">
        💵 Lançar Pagamento / Amortização
      </button>
    </div>
  `).join('');
}

// =============================================================================
// PAGAMENTOS / BAIXA NA FICHA
// =============================================================================
function abrirModalPagamento(fichaId, clienteNome, saldoAtual, parcelaPadrao) {
  document.getElementById('pagamento-ficha-id').value = fichaId;
  document.getElementById('modal-pagamento-titulo').innerText = `💵 Baixa de Pagamento: ${clienteNome}`;
  document.getElementById('pagamento-saldo-atual').innerText = formatMoney(saldoAtual);
  document.getElementById('pagamento-parcela-valor').innerText = formatMoney(parcelaPadrao);
  document.getElementById('pagamento-valor-pago').value = parcelaPadrao;
  document.getElementById('modal-pagamento').classList.add('active');
}

function fecharModalPagamento() {
  document.getElementById('modal-pagamento').classList.remove('active');
}

async function confirmarPagamento(e) {
  e.preventDefault();
  const fichaId = document.getElementById('pagamento-ficha-id').value;
  const valorPago = parseFloat(document.getElementById('pagamento-valor-pago').value);
  const descricao = document.getElementById('pagamento-descricao').value;

  try {
    const res = await fetch(`${API_BASE}/fichas/${fichaId}/pagamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valor_pago: valorPago,
        descricao: descricao || 'Pagamento na ficha'
      })
    });

    if (!res.ok) throw new Error('Erro ao processar pagamento');
    const data = await res.json();

    alert(`✅ Pagamento confirmado com sucesso!\nNovo saldo restante: ${formatMoney(data.saldoRestante)}`);
    fecharModalPagamento();
    await carregarFichas();
  } catch (err) {
    alert('❌ ' + err.message);
  }
}

// Disparo de Lembrete WhatsApp
function enviarLembreteWhatsApp(fichaId, nome, telefone, valorParcela, saldoTotal) {
  const mensagem = `Olá, ${nome}! Tudo bem? 🥰\nPassando para lembrar que hoje é o dia do seu pagamento/vale na *Enxovais Gabriel*.\n\n💳 *Parcela do Mês:* ${formatMoney(valorParcela)}\n📊 *Saldo Restante na Ficha:* ${formatMoney(saldoTotal)}\n\nVocê pode realizar o Pix diretamente para a nossa chave. Muito obrigado! ✨`;
  
  const zapUrl = `https://api.whatsapp.com/send?phone=${telefone.replace(/\D/g, '')}&text=${encodeURIComponent(mensagem)}`;
  window.open(zapUrl, '_blank');
}

// =============================================================================
// VENDAS
// =============================================================================
async function carregarClientesSelect() {
  try {
    const res = await fetch(`${API_BASE}/clientes`);
    if (!res.ok) return;
    clientesCarregados = await res.json();
    const select = document.getElementById('venda-cliente-id');
    if (select) {
      select.innerHTML = '<option value="">Selecione a cliente...</option>' + 
        clientesCarregados.map(c => `<option value="${c.id}">${c.nome} (${c.whatsapp})</option>`).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

function toggleCrediarioFields(forma) {
  const groupEntrada = document.getElementById('group-entrada');
  const groupParcela = document.getElementById('group-renegociar-parcela');

  if (forma === 'MISTO') {
    groupEntrada.style.display = 'block';
    groupParcela.style.display = 'block';
  } else if (forma === 'CREDIARIO') {
    groupEntrada.style.display = 'none';
    groupParcela.style.display = 'block';
  } else {
    groupEntrada.style.display = 'none';
    groupParcela.style.display = 'none';
  }
}

async function salvarVenda(e) {
  e.preventDefault();
  const clienteId = document.getElementById('venda-cliente-id').value;
  const descricaoItens = document.getElementById('venda-descricao-itens').value;
  const tipoItem = document.getElementById('venda-tipo-item').value;
  const formaPagamento = document.getElementById('venda-forma-pagamento').value;
  const valorTotal = parseFloat(document.getElementById('venda-valor-total').value);
  const valorEntrada = parseFloat(document.getElementById('venda-valor-entrada').value) || 0;
  const parcelaNegociada = parseFloat(document.getElementById('venda-parcela-negociada').value) || undefined;

  const payload = {
    cliente_id: clienteId,
    forma_pagamento: formaPagamento,
    valor_total: valorTotal,
    valor_entrada: valorEntrada,
    novo_valor_parcela_negociado: parcelaNegociada,
    itens: [
      {
        descricao_item: descricaoItens,
        quantidade: 1,
        preco_unitario: valorTotal,
        tipo_item: tipoItem
      }
    ]
  };

  try {
    const res = await fetch(`${API_BASE}/vendas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Falha ao registrar venda');
    alert('✅ Venda concluída com sucesso!');
    document.getElementById('form-venda').reset();
    trocarAba('cobrancas', document.querySelector('.nav-item'));
  } catch (err) {
    alert('❌ ' + err.message);
  }
}

// =============================================================================
// ESTOQUE & PRODUTOS
// =============================================================================
async function carregarProdutos() {
  try {
    const res = await fetch(`${API_BASE}/produtos`);
    if (!res.ok) return;
    produtosCarregados = await res.json();
    renderizarProdutos();
  } catch (err) {
    console.error(err);
  }
}

function renderizarProdutos() {
  const container = document.getElementById('lista-produtos');
  if (!container) return;

  if (produtosCarregados.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum produto cadastrado.</p>`;
    return;
  }

  container.innerHTML = produtosCarregados.map(p => `
    <div class="card-item">
      <div class="card-header-flex">
        <div>
          <div class="client-name">${p.nome}</div>
          <div class="client-phone">Categoria: ${p.categoria}</div>
        </div>
        <span class="tag-status ${p.estoque_atual > p.estoque_minimo ? 'quitado' : 'active'}">
          Estoque: ${p.estoque_atual} un
        </span>
      </div>
      <div class="card-finance-info">
        <div class="finance-col">
          <span>À Vista</span>
          <strong>${formatMoney(p.preco_venda_vista)}</strong>
        </div>
        <div class="finance-col">
          <span>Crediário</span>
          <strong class="highlight">${formatMoney(p.preco_venda_crediario)}</strong>
        </div>
      </div>
    </div>
  `).join('');
}

function abrirModalProduto() {
  document.getElementById('modal-produto').classList.add('active');
}

function fecharModalProduto() {
  document.getElementById('modal-produto').classList.remove('active');
}

async function salvarProduto(e) {
  e.preventDefault();
  const nome = document.getElementById('prod-nome').value;
  const categoria = document.getElementById('prod-categoria').value;
  const precoVista = parseFloat(document.getElementById('prod-preco-vista').value);
  const precoCrediario = parseFloat(document.getElementById('prod-preco-crediario').value);
  const estoque = parseInt(document.getElementById('prod-estoque').value, 10);
  const estoqueMin = parseInt(document.getElementById('prod-estoque-min').value, 10);

  try {
    const res = await fetch(`${API_BASE}/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        categoria,
        preco_venda_vista: precoVista,
        preco_venda_crediario: precoCrediario,
        estoque_atual: estoque,
        estoque_minimo: estoqueMin
      })
    });

    if (!res.ok) throw new Error('Erro ao salvar produto');
    alert('✅ Produto cadastrado com sucesso!');
    fecharModalProduto();
    document.getElementById('form-produto').reset();
    await carregarProdutos();
  } catch (err) {
    alert('❌ ' + err.message);
  }
}
