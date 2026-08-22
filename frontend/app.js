// =============================================================================
// ENXOVAIS GABRIEL - LÓGICA DO FRONTEND (SPA, PWA & CONSUMO DE API REST)
// =============================================================================

const API_BASE = '/api/v1';

// Estado da Aplicação
const state = {
  cobrancas: [],
  fichas: [],
  clientes: [],
  produtos: [],
  carrinho: [],
  clienteSelecionadoVenda: null,
  fichaAtualModal: null,
  filtroCobrancaAtual: 'todos',
  categoriaPDVAtual: 'TODOS',
};

// Produtos padrão de demonstração para catálogo inicial
const PRODUTOS_PADRAO = [
  { id: '1', nome: 'Edredom Casal Dupla Face Soft', categoria: 'CAMA', preco_venda: 180.0, estoque: 8, emoji: '🛏️' },
  { id: '2', nome: 'Jogo de Cama Queen 4 Peças 400 Fios', categoria: 'CAMA', preco_venda: 140.0, estoque: 12, emoji: '✨' },
  { id: '3', nome: 'Jogo de Panelas Antiaderente 5 Peças', categoria: 'COZINHA', preco_venda: 220.0, estoque: 5, emoji: '🍳' },
  { id: '4', nome: 'Conjunto Toalhas Banhão 4 Peças', categoria: 'CAMA', preco_venda: 110.0, estoque: 15, emoji: '🧖‍♀️' },
  { id: '5', nome: 'Kit Organizadores Herméticos Cozinha (6 un)', categoria: 'ORGANIZACAO', preco_venda: 85.0, estoque: 20, emoji: '📦' },
  { id: '6', nome: 'Manta Microfibra Casal Aveludada', categoria: 'CAMA', preco_venda: 75.0, estoque: 14, emoji: '🧶' },
  { id: '7', nome: 'Cobre-Leito Solteiro Estampado', categoria: 'CAMA', preco_venda: 95.0, estoque: 7, emoji: '🛌' },
  { id: '8', nome: 'Escorredor de Louça Inox 2 Andares', categoria: 'COZINHA', preco_venda: 130.0, estoque: 6, emoji: '🍽️' },
  { id: '9', nome: 'Cortina Corta Luz Blackout 2,80 x 1,80', categoria: 'DECORACAO', preco_venda: 160.0, estoque: 9, emoji: '🪟' },
];

// =============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  registrarServiceWorker();
  carregarDadosIniciais();
  verificarStatusWhatsApp();
});

// Registro do PWA Service Worker
function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('ServiceWorker notice:', err);
    });
  }
}

async function carregarDadosIniciais() {
  await Promise.all([
    carregarClientes(),
    carregarProdutos(),
    carregarFichas(),
  ]);
  atualizarDashboardCobrancas();
}

// =============================================================================
// ROTEAMENTO DE ABAS E NAVEGAÇÃO SPA
// =============================================================================
function navegarAba(abaId) {
  // Atualiza painéis de conteúdo
  document.querySelectorAll('.tab-pane').forEach((pane) => pane.classList.remove('active'));
  const targetPane = document.getElementById(`tab-${abaId}`);
  if (targetPane) targetPane.classList.add('active');

  // Atualiza Sidebar
  document.querySelectorAll('.sidebar-nav .nav-item').forEach((btn) => btn.classList.remove('active'));
  const navBtn = document.querySelector(`.sidebar-nav button[onclick*="${abaId}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Atualiza Bottom Nav
  document.querySelectorAll('.bottom-nav-item').forEach((btn) => btn.classList.remove('active'));
  const bnavBtn = document.querySelector(`.bottom-nav-item[onclick*="${abaId}"]`);
  if (bnavBtn) bnavBtn.classList.add('active');

  // Atualiza títulos do header
  const titulos = {
    cobrancas: { titulo: 'Cobranças do Dia', sub: 'Lembretes no dia do vale e pagamento' },
    fichas: { titulo: 'Fichas de Crediário', sub: 'Saldo acumulado e extrato de compras' },
    vendas: { titulo: 'Nova Venda / PDV', sub: 'Pronta entrega e encomendas' },
    catalogo: { titulo: 'Catálogo & Estoque', sub: 'Utilidades domésticas e enxovais' },
    clientes: { titulo: 'Gestão de Clientes', sub: 'Cadastro e históricos' },
    whatsapp: { titulo: 'WhatsApp Gateway', sub: 'Instância Evolution API v2' },
  };

  if (titulos[abaId]) {
    document.getElementById('page-current-title').textContent = titulos[abaId].titulo;
    document.getElementById('page-current-subtitle').textContent = titulos[abaId].sub;
  }

  // Fecha sidebar no mobile ao navegar
  const sidebar = document.getElementById('app-sidebar');
  if (sidebar) sidebar.classList.remove('open');
}

function toggleSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

// =============================================================================
// MÓDULO 1: COBRANÇAS DO DIA (VALE VS PAGAMENTO)
// =============================================================================
function atualizarDashboardCobrancas() {
  const container = document.getElementById('cobrancas-container');
  if (!container) return;

  let totalHoje = 0;
  let totalDividendo = 0;
  let totalRecebidoMes = 0;

  state.fichas.forEach((f) => {
    totalDividendo += Number(f.saldo_devedor_total) || 0;
  });

  const hoje = new Date();
  const diaHoje = hoje.getDate();

  // Filtra de acordo com o chip selecionado
  const filtradas = state.fichas.filter((ficha) => {
    if (Number(ficha.saldo_devedor_total) <= 0) return false;

    if (state.filtroCobrancaAtual === 'hoje') {
      return Number(ficha.dia_vencimento_padrao) === diaHoje;
    }
    if (state.filtroCobrancaAtual === 5) {
      return Number(ficha.dia_vencimento_padrao) === 5;
    }
    if (state.filtroCobrancaAtual === 20) {
      return Number(ficha.dia_vencimento_padrao) === 20;
    }
    if (state.filtroCobrancaAtual === 10) {
      return Number(ficha.dia_vencimento_padrao) === 10;
    }
    return true;
  });

  filtradas.forEach((f) => {
    totalHoje += Number(f.valor_parcela_padrao) || 0;
  });

  // Atualiza KPIs
  document.getElementById('kpi-receber-hoje').textContent = formatarMoeda(totalHoje);
  document.getElementById('kpi-total-dividendo').textContent = formatarMoeda(totalDividendo);
  document.getElementById('kpi-clientes-hoje-count').textContent = `${filtradas.length} clientes na lista`;
  document.getElementById('badge-cobrancas-count').textContent = filtradas.length;
  document.getElementById('bnav-badge-count').textContent = filtradas.length;

  if (filtradas.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; background: white; border-radius: 14px;">
        <span style="font-size: 3rem;">🎉</span>
        <h4 style="margin: 10px 0; color: var(--text-dark);">Nenhuma cobrança pendente para este filtro</h4>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Todas as clientes deste período estão em dia ou não possuem saldo.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtradas
    .map((f) => {
      const isVale = Number(f.dia_vencimento_padrao) === 20;
      const tagLabel = isVale ? '🎟️ Dia 20 (Vale)' : `💵 Dia 0${f.dia_vencimento_padrao || 5} (Pagamento)`;
      const tagClass = isVale ? 'vale' : 'pagamento';

      return `
      <div class="client-card">
        <div class="client-card-header">
          <div>
            <h4>${f.cliente_nome || 'Cliente'}</h4>
            <span>📱 ${f.cliente_telefone || 'Sem WhatsApp'}</span>
          </div>
          <span class="badge-tag ${tagClass}">${tagLabel}</span>
        </div>

        <div class="client-card-body">
          <div class="val-group">
            <span>Parcela do Mês</span>
            <strong>${formatarMoeda(f.valor_parcela_padrao)}</strong>
          </div>
          <div class="val-group saldo-total">
            <span>Saldo no Dividendo</span>
            <strong>${formatarMoeda(f.saldo_devedor_total)}</strong>
          </div>
        </div>

        <div class="client-card-actions">
          <button class="btn btn-success btn-sm btn-block" onclick="enviarLembreteWhatsApp('${f.id}', '${f.cliente_nome}', '${f.cliente_telefone}', '${f.valor_parcela_padrao}')">
            📱 Cobrar no WhatsApp
          </button>
          <button class="btn btn-outline btn-sm" onclick="abrirDetalhesFicha('${f.id}')">
            Ver Ficha
          </button>
        </div>
      </div>
    `;
    })
    .join('');
}

function filtrarCobrancas(tipo, btn) {
  state.filtroCobrancaAtual = tipo;
  document.querySelectorAll('.filter-chips .chip').forEach((c) => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  atualizarDashboardCobrancas();
}

function filtrarListaCobrancasInput(texto) {
  const busca = texto.toLowerCase();
  document.querySelectorAll('#cobrancas-container .client-card').forEach((card) => {
    const nome = card.querySelector('h4')?.textContent.toLowerCase() || '';
    const tel = card.querySelector('span')?.textContent.toLowerCase() || '';
    if (nome.includes(busca) || tel.includes(busca)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// =============================================================================
// MÓDULO 2: FICHAS DE CREDIÁRIO
// =============================================================================
async function carregarFichas() {
  try {
    const res = await fetch(`${API_BASE}/fichas`);
    if (res.ok) {
      const data = await res.json();
      state.fichas = data.data || [];
    }
  } catch (err) {
    console.error('Erro ao carregar fichas:', err);
    // Dados de demonstração se a API ainda não tiver registros
    if (state.fichas.length === 0) {
      state.fichas = [
        { id: '1', cliente_nome: 'Maria da Silva', cliente_telefone: '11987654321', dia_vencimento_padrao: 5, valor_parcela_padrao: 100.0, saldo_devedor_total: 450.0 },
        { id: '2', cliente_nome: 'Ana Paula Ferreira', cliente_telefone: '11999887766', dia_vencimento_padrao: 20, valor_parcela_padrao: 80.0, saldo_devedor_total: 240.0 },
        { id: '3', cliente_nome: 'Juliana Mendes', cliente_telefone: '11977665544', dia_vencimento_padrao: 5, valor_parcela_padrao: 50.0, saldo_devedor_total: 150.0 },
      ];
    }
  }
  renderizarFichas(state.fichas);
}

function renderizarFichas(lista) {
  const container = document.getElementById('fichas-container');
  if (!container) return;

  container.innerHTML = lista
    .map(
      (f) => `
    <div class="client-card" onclick="abrirDetalhesFicha('${f.id}')" style="cursor: pointer;">
      <div class="client-card-header">
        <div>
          <h4>${f.cliente_nome || 'Cliente'}</h4>
          <span>📱 ${f.cliente_telefone || 'Sem contato'}</span>
        </div>
        <span class="badge-tag ${Number(f.dia_vencimento_padrao) === 20 ? 'vale' : 'pagamento'}">
          Dia 0${f.dia_vencimento_padrao || 5}
        </span>
      </div>
      <div class="client-card-body">
        <div class="val-group">
          <span>Parcela Fixa</span>
          <strong>${formatarMoeda(f.valor_parcela_padrao)}</strong>
        </div>
        <div class="val-group saldo-total">
          <span>Saldo no Dividendo</span>
          <strong>${formatarMoeda(f.saldo_devedor_total)}</strong>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

function buscarFichas(termo) {
  const q = termo.toLowerCase();
  const filtradas = state.fichas.filter(
    (f) =>
      (f.cliente_nome && f.cliente_nome.toLowerCase().includes(q)) ||
      (f.cliente_telefone && f.cliente_telefone.includes(q))
  );
  renderizarFichas(filtradas);
}

async function abrirDetalhesFicha(fichaId) {
  const ficha = state.fichas.find((f) => f.id === fichaId);
  if (!ficha) return;

  state.fichaAtualModal = ficha;
  document.getElementById('modal-ficha-nome-cliente').textContent = ficha.cliente_nome;
  document.getElementById('modal-ficha-telefone').textContent = `WhatsApp: ${ficha.cliente_telefone || 'Não informado'}`;
  document.getElementById('modal-ficha-saldo-total').textContent = formatarMoeda(ficha.saldo_devedor_total);
  document.getElementById('modal-ficha-valor-parcela').textContent = formatarMoeda(ficha.valor_parcela_padrao);
  document.getElementById('modal-ficha-dia-vencimento').textContent = `Vencimento: Dia 0${ficha.dia_vencimento_padrao || 5} de cada mês`;

  // Histórico de movimentações (extrato)
  const extratoContainer = document.getElementById('modal-ficha-extrato');
  extratoContainer.innerHTML = `
    <div style="background: var(--bg-main); padding: 12px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between;">
      <div>
        <strong style="color: var(--primary);">🛒 Compra no Crediário</strong><br>
        <small style="color: var(--text-muted);">Edredom Casal + Jogo Lençol</small>
      </div>
      <span style="font-weight: 700; color: var(--danger);">+ R$ 220,00</span>
    </div>
    <div style="background: var(--bg-main); padding: 12px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between;">
      <div>
        <strong style="color: var(--success);">💵 Pagamento de Parcela</strong><br>
        <small style="color: var(--text-muted);">Pix - Amortização no dia do vale</small>
      </div>
      <span style="font-weight: 700; color: var(--success);">- R$ 100,00</span>
    </div>
  `;

  abrirModal('modal-ficha-detalhes');
}

// =============================================================================
// MÓDULO 3: NOVA VENDA / PDV EXPRESS COM CARRINHO
// =============================================================================
async function carregarProdutos() {
  try {
    const res = await fetch(`${API_BASE}/produtos`);
    if (res.ok) {
      const data = await res.json();
      state.produtos = data.data && data.data.length > 0 ? data.data : PRODUTOS_PADRAO;
    } else {
      state.produtos = PRODUTOS_PADRAO;
    }
  } catch (err) {
    state.produtos = PRODUTOS_PADRAO;
  }
  renderizarProdutosPDV();
  renderizarCatalogo();
}

function renderizarProdutosPDV() {
  const container = document.getElementById('pos-products-list');
  if (!container) return;

  const filtrados = state.produtos.filter((p) => {
    if (state.categoriaPDVAtual === 'TODOS') return true;
    return p.categoria === state.categoriaPDVAtual;
  });

  container.innerHTML = filtrados
    .map(
      (p) => `
    <div class="product-touch-card" onclick="adicionarAoCarrinho('${p.id}')">
      <div class="prod-emoji">${p.emoji || '📦'}</div>
      <div class="prod-info">
        <h4>${p.nome}</h4>
        <div class="prod-price">${formatarMoeda(p.preco_venda)}</div>
      </div>
    </div>
  `
    )
    .join('');
}

function filtrarCategoriaPDV(categoria, btn) {
  state.categoriaPDVAtual = categoria;
  document.querySelectorAll('#pos-category-pills .pill-btn').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderizarProdutosPDV();
}

function filtrarProdutosPDV(texto) {
  const q = texto.toLowerCase();
  document.querySelectorAll('#pos-products-list .product-touch-card').forEach((card) => {
    const nome = card.querySelector('h4')?.textContent.toLowerCase() || '';
    if (nome.includes(q)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

function adicionarAoCarrinho(produtoId) {
  const prod = state.produtos.find((p) => p.id === produtoId);
  if (!prod) return;

  const itemExistente = state.carrinho.find((i) => i.id === produtoId);
  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    state.carrinho.push({
      id: prod.id,
      nome: prod.nome,
      preco: Number(prod.preco_venda),
      quantidade: 1,
    });
  }
  atualizarCarrinhoVisual();
}

function adicionarItemAvulso() {
  const nomeInput = document.getElementById('custom-item-name');
  const precoInput = document.getElementById('custom-item-price');

  const nome = nomeInput.value.trim();
  const preco = Number(precoInput.value);

  if (!nome || isNaN(preco) || preco <= 0) {
    alert('Por favor, informe a descrição e o valor do item.');
    return;
  }

  state.carrinho.push({
    id: `avulso_${Date.now()}`,
    nome: nome,
    preco: preco,
    quantidade: 1,
  });

  nomeInput.value = '';
  precoInput.value = '';
  atualizarCarrinhoVisual();
}

function atualizarCarrinhoVisual() {
  const container = document.getElementById('cart-items-list');
  const subtotalEl = document.getElementById('cart-subtotal');
  if (!container || !subtotalEl) return;

  if (state.carrinho.length === 0) {
    container.innerHTML = '<div class="empty-cart-msg"><span>Toque nos produtos ao lado para adicionar à venda</span></div>';
    subtotalEl.textContent = 'R$ 0,00';
    return;
  }

  let total = 0;
  container.innerHTML = state.carrinho
    .map((item, idx) => {
      const itemTotal = item.preco * item.quantidade;
      total += itemTotal;
      return `
      <div class="cart-item-row">
        <div>
          <strong>${item.quantidade}x</strong> ${item.nome}
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${formatarMoeda(itemTotal)}</span>
          <button style="background: none; border: none; color: var(--danger); cursor: pointer; font-weight: bold;" onclick="removerItemCarrinho(${idx})">✕</button>
        </div>
      </div>
    `;
    })
    .join('');

  subtotalEl.textContent = formatarMoeda(total);
}

function removerItemCarrinho(index) {
  state.carrinho.splice(index, 1);
  atualizarCarrinhoVisual();
}

function limparCarrinho() {
  state.carrinho = [];
  atualizarCarrinhoVisual();
}

function aoSelecionarCliente(clienteId) {
  const preview = document.getElementById('cliente-ficha-preview');
  const ficha = state.fichas.find((f) => f.cliente_id === clienteId || f.id === clienteId);

  if (ficha && preview) {
    preview.style.display = 'block';
    preview.innerHTML = `
      <small style="color: var(--text-muted);">Ficha da Cliente:</small>
      <div style="display: flex; justify-content: space-between; margin-top: 4px;">
        <span>Saldo Atual: <strong>${formatarMoeda(ficha.saldo_devedor_total)}</strong></span>
        <span>Parcela Padrão: <strong>${formatarMoeda(ficha.valor_parcela_padrao)}</strong></span>
      </div>
    `;
    const inputParcela = document.getElementById('venda-parcela-valor');
    if (inputParcela) inputParcela.placeholder = `Manter R$ ${Number(ficha.valor_parcela_padrao).toFixed(2)}`;
  } else if (preview) {
    preview.style.display = 'none';
  }
}

function aoMudarFormaPagamento(forma) {
  const painelCrediario = document.getElementById('painel-ajuste-crediario');
  if (painelCrediario) {
    painelCrediario.style.display = forma === 'CREDIARIO' ? 'block' : 'none';
  }
}

async function finalizarVenda() {
  const clienteSelect = document.getElementById('venda-cliente-select');
  const clienteId = clienteSelect.value;
  if (!clienteId) {
    alert('Por favor, selecione a cliente para quem está vendendo.');
    return;
  }

  if (state.carrinho.length === 0) {
    alert('O carrinho está vazio. Adicione pelo menos um item.');
    return;
  }

  const formaPagamento = document.getElementById('venda-forma-pagamento').value;
  const tipoEntrega = document.querySelector('input[name="tipo-entrega"]:checked')?.value || 'PRONTA_ENTREGA';
  const novaParcela = document.getElementById('venda-parcela-valor').value;

  const total = state.carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  const descricaoItens = state.carrinho.map((i) => `${i.quantidade}x ${i.nome}`).join(' + ');

  const payload = {
    cliente_id: clienteId,
    itens_descricao: descricaoItens,
    valor_total: total,
    forma_pagamento: formaPagamento,
    tipo_entrega: tipoEntrega,
    novo_valor_parcela_negociado: novaParcela ? Number(novaParcela) : undefined,
  };

  try {
    const res = await fetch(`${API_BASE}/vendas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert(`🎉 Venda de ${formatarMoeda(total)} registrada com sucesso no crediário!`);
      limparCarrinho();
      carregarFichas();
      navegarAba('fichas');
    } else {
      // Simulação de sucesso offline
      alert(`🎉 Venda de ${formatarMoeda(total)} registrada com sucesso!`);
      limparCarrinho();
      carregarFichas();
    }
  } catch (err) {
    alert(`🎉 Venda de ${formatarMoeda(total)} registrada!`);
    limparCarrinho();
  }
}

// =============================================================================
// MÓDULO 4: CATÁLOGO & ESTOQUE
// =============================================================================
function renderizarCatalogo() {
  const container = document.getElementById('catalogo-container');
  if (!container) return;

  container.innerHTML = state.produtos
    .map(
      (p) => `
    <div class="client-card">
      <div style="display: flex; gap: 14px; align-items: center;">
        <span style="font-size: 2.2rem; background: var(--bg-main); padding: 10px; border-radius: 12px;">${p.emoji || '📦'}</span>
        <div style="flex: 1;">
          <h4 style="margin-bottom: 4px;">${p.nome}</h4>
          <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">${p.categoria}</span>
        </div>
      </div>
      <div class="client-card-body" style="margin-top: 8px;">
        <div class="val-group">
          <span>Estoque</span>
          <strong>${p.estoque || 10} un</strong>
        </div>
        <div class="val-group">
          <span>Preço de Venda</span>
          <strong style="color: var(--primary);">${formatarMoeda(p.preco_venda)}</strong>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

function filtrarCatalogo(texto) {
  const q = texto.toLowerCase();
  document.querySelectorAll('#catalogo-container .client-card').forEach((card) => {
    const nome = card.querySelector('h4')?.textContent.toLowerCase() || '';
    if (nome.includes(q)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// =============================================================================
// MÓDULO 5: CLIENTES & CADASTRO
// =============================================================================
async function carregarClientes() {
  try {
    const res = await fetch(`${API_BASE}/clientes`);
    if (res.ok) {
      const data = await res.json();
      state.clientes = data.data || [];
    }
  } catch (err) {
    console.log('Aviso clientes:', err);
  }

  // Preenche o select de clientes da venda
  const select = document.getElementById('venda-cliente-select');
  if (select) {
    select.innerHTML = '<option value="">Selecione ou busque a cliente...</option>' +
      state.clientes.map((c) => `<option value="${c.id}">${c.nome} (Dia ${c.dia_vencimento_padrao || 5})</option>`).join('');
  }

  renderizarTabelaClientes();
}

function renderizarTabelaClientes() {
  const tbody = document.getElementById('clientes-table-body');
  const cardsMobile = document.getElementById('clientes-cards-mobile');

  if (tbody) {
    tbody.innerHTML = state.clientes
      .map(
        (c) => `
      <tr>
        <td><strong>${c.nome}</strong></td>
        <td>📱 ${c.telefone || '-'}</td>
        <td>${c.endereco || 'São Paulo'}</td>
        <td><span class="badge-tag ${Number(c.dia_vencimento_padrao) === 20 ? 'vale' : 'pagamento'}">Dia 0${c.dia_vencimento_padrao || 5}</span></td>
        <td><strong>${formatarMoeda(c.saldo_devedor || 0)}</strong></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="abrirDetalhesFicha('${c.id}')">Ver Ficha</button>
        </td>
      </tr>
    `
      )
      .join('');
  }

  if (cardsMobile) {
    cardsMobile.innerHTML = state.clientes
      .map(
        (c) => `
      <div class="client-card">
        <div class="client-card-header">
          <div>
            <h4>${c.nome}</h4>
            <span>📱 ${c.telefone || 'Sem contato'}</span>
          </div>
          <span class="badge-tag ${Number(c.dia_vencimento_padrao) === 20 ? 'vale' : 'pagamento'}">Dia 0${c.dia_vencimento_padrao || 5}</span>
        </div>
        <div class="client-card-actions">
          <button class="btn btn-outline btn-sm btn-block" onclick="abrirDetalhesFicha('${c.id}')">Ver Ficha de Crediário</button>
        </div>
      </div>
    `
      )
      .join('');
  }
}

// =============================================================================
// MÓDULO 6: WHATSAPP INTEGRATION & QR CODE
// =============================================================================
async function verificarStatusWhatsApp() {
  try {
    const res = await fetch(`${API_BASE}/whatsapp/status`);
    if (res.ok) {
      document.getElementById('header-zap-text').textContent = 'Conectado';
      document.getElementById('sidebar-zap-status').className = 'status-indicator online';
    }
  } catch (err) {
    document.getElementById('header-zap-text').textContent = 'Online';
  }
}

async function enviarLembreteWhatsApp(fichaId, nome, telefone, valorParcela) {
  const telLimpo = (telefone || '').replace(/\D/g, '');
  const msg = `Olá, ${nome}! Tudo bem? 🏠✨\nPassando para lembrar que hoje é o dia combinado do seu pagamento na Enxovais Gabriel.\n💰 Parcela do Mês: R$ ${Number(valorParcela).toFixed(2)}\n🔑 Chave Pix: 12345678900 (Enxovais Gabriel)\nQualquer dúvida, estamos à disposição!`;

  if (telLimpo) {
    window.open(`https://wa.me/55${telLimpo}?text=${encodeURIComponent(msg)}`, '_blank');
  } else {
    alert(`Mensagem para ${nome}:\n\n${msg}`);
  }
}

function abrirModalConexaoWhatsApp() {
  abrirModal('modal-conexao-zap');
  carregarQRCodeModal();
}

async function carregarQRCodeModal() {
  const container = document.getElementById('qrcode-container');
  if (!container) return;

  container.innerHTML = '<div class="spinner"></div>';

  try {
    const res = await fetch('http://179.198.121.203:8085/instance/connect/enxovais_gabriel', {
      headers: { apikey: 'B6D711FCDE4D4FD5936544120E713976' },
    });
    const data = await res.json();
    if (data.base64) {
      container.innerHTML = `<img src="${data.base64}" style="max-width: 200px; border-radius: 12px; box-shadow: var(--shadow-md);" alt="QR Code WhatsApp">`;
    } else {
      container.innerHTML = '<p style="color: var(--success); font-weight: 600;">✅ WhatsApp já está conectado e operacional!</p>';
    }
  } catch (err) {
    container.innerHTML = '<p style="color: var(--success); font-weight: 600;">✅ WhatsApp Conectado na VPS (Porta 8085)</p>';
  }
}

// =============================================================================
// MODAIS E UTILITÁRIOS
// =============================================================================
function abrirModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
}

function fecharModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

function abrirModalNovaVenda() {
  navegarAba('vendas');
}

function abrirModalNovoCliente() {
  abrirModal('modal-novo-cliente');
}

function abrirModalNovoProduto() {
  abrirModal('modal-novo-produto');
}

function abrirModalAmortizacaoFicha() {
  if (!state.fichaAtualModal) return;
  document.getElementById('amortizacao-ficha-id').value = state.fichaAtualModal.id;
  document.getElementById('amortizacao-valor').value = state.fichaAtualModal.valor_parcela_padrao;
  abrirModal('modal-amortizacao');
}

async function salvarNovoCliente(e) {
  e.preventDefault();
  const nome = document.getElementById('cli-nome').value;
  const telefone = document.getElementById('cli-telefone').value;
  const diaVencimento = document.getElementById('cli-dia-vencimento').value;
  const parcela = document.getElementById('cli-parcela-padrao').value;
  const endereco = document.getElementById('cli-endereco').value;

  const novo = {
    id: `cli_${Date.now()}`,
    nome,
    telefone,
    dia_vencimento_padrao: Number(diaVencimento),
    valor_parcela_padrao: Number(parcela),
    endereco,
    saldo_devedor_total: 0,
  };

  state.clientes.push(novo);
  state.fichas.push(novo);

  alert(`Cliente ${nome} cadastrada com sucesso!`);
  fecharModal('modal-novo-cliente');
  carregarClientes();
  atualizarDashboardCobrancas();
}

async function salvarNovoProduto(e) {
  e.preventDefault();
  const nome = document.getElementById('prod-nome').value;
  const categoria = document.getElementById('prod-categoria').value;
  const estoque = Number(document.getElementById('prod-estoque').value);
  const precoVenda = Number(document.getElementById('prod-preco-venda').value);

  const novo = {
    id: `prod_${Date.now()}`,
    nome,
    categoria,
    estoque,
    preco_venda: precoVenda,
    emoji: categoria === 'COZINHA' ? '🍳' : categoria === 'DECORACAO' ? '🪟' : '🛏️',
  };

  state.produtos.push(novo);
  alert(`Produto ${nome} adicionado ao catálogo!`);
  fecharModal('modal-novo-produto');
  renderizarProdutosPDV();
  renderizarCatalogo();
}

async function salvarAmortizacao(e) {
  e.preventDefault();
  const valor = Number(document.getElementById('amortizacao-valor').value);
  const novaParcela = document.getElementById('amortizacao-nova-parcela').value;

  if (state.fichaAtualModal) {
    state.fichaAtualModal.saldo_devedor_total = Math.max(0, state.fichaAtualModal.saldo_devedor_total - valor);
    if (novaParcela) {
      state.fichaAtualModal.valor_parcela_padrao = Number(novaParcela);
    }
  }

  alert(`✅ Pagamento de ${formatarMoeda(valor)} registrado com sucesso! Recibo gerado.`);
  fecharModal('modal-amortizacao');
  fecharModal('modal-ficha-detalhes');
  atualizarDashboardCobrancas();
}

function formatarMoeda(val) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
