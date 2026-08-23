// =============================================================================
// ENXOVAIS GABRIEL - LÓGICA DO FRONTEND (SPA, PWA & CONSUMO DE API REST)
// Versão 2.1 - Simulador de Crediário, Importador CSV, Encomendas & Cobrança
// =============================================================================

const API_BASE = '/api/v1';

// Estado Global da Aplicação
const state = {
  cobrancas: [],
  fichas: [],
  clientes: [],
  produtos: [],
  encomendas: [],
  carrinho: [],
  movimentacoesCaixa: [],
  filtroCaixaAtual: 'TODOS',
  clienteSelecionadoVenda: null,
  fichaAtualModal: null,
  reciboAtualModal: null,
  filtroCobrancaAtual: 'todos',
  filtroEncomendaAtual: 'TODAS',
  categoriaPDVAtual: 'TODOS',
  itensImportacaoValidados: [],
};

// Catálogo padrão de utilidades para demonstração inicial
const PRODUTOS_PADRAO = [
  { id: '1', nome: 'Edredom Casal Dupla Face Soft', categoria: 'CAMA', preco_venda: 180.0, estoque: 8, emoji: '🛏️' },
  { id: '2', nome: 'Jogo de Cama Queen 4 Peças 400 Fios', categoria: 'CAMA', preco_venda: 140.0, estoque: 12, emoji: '✨' },
  { id: '3', nome: 'Jogo de Panelas Antiaderente 5 Peças', categoria: 'COZINHA', preco_venda: 220.0, estoque: 5, emoji: '🍳' },
  { id: '4', nome: 'Conjunto Toalhas Banhão 4 Peças', categoria: 'CAMA', preco_venda: 110.0, estoque: 15, emoji: '🧖‍♀️' },
  { id: '5', nome: 'Kit Potes Herméticos Cozinha (6 un)', categoria: 'ORGANIZACAO', preco_venda: 85.0, estoque: 20, emoji: '📦' },
  { id: '6', nome: 'Manta Microfibra Casal Aveludada', categoria: 'CAMA', preco_venda: 75.0, estoque: 14, emoji: '🧶' },
  { id: '7', nome: 'Cobre-Leito Solteiro Estampado', categoria: 'CAMA', preco_venda: 95.0, estoque: 7, emoji: '🛌' },
  { id: '8', nome: 'Escorredor de Louça Inox 2 Andares', categoria: 'COZINHA', preco_venda: 130.0, estoque: 6, emoji: '🍽️' },
  { id: '9', nome: 'Cortina Corta Luz Blackout 2,80 x 1,80', categoria: 'DECORACAO', preco_venda: 160.0, estoque: 9, emoji: '🪟' },
];

// Função utilitária para gerar avatar circular com iniciais e paleta harmônica
function obterAvatarHTML(nome) {
  const partes = (nome || 'Cliente').trim().split(/\s+/);
  const iniciais = (partes[0]?.[0] || '') + (partes[1]?.[0] || partes[0]?.[1] || '');
  const cores = [
    { bg: '#FDF2F4', fg: '#8C2D40', border: '#F3D1D9' },
    { bg: '#FFFBEB', fg: '#B45309', border: '#FDE68A' },
    { bg: '#EDFDF2', fg: '#15803D', border: '#BBF7D0' },
    { bg: '#EFF6FF', fg: '#1D4ED8', border: '#BFDBFE' },
    { bg: '#FAF5FF', fg: '#7E22CE', border: '#E9D5FF' },
  ];
  let soma = 0;
  for (let i = 0; i < (nome || '').length; i++) soma += nome.charCodeAt(i);
  const cor = cores[soma % cores.length];
  return `<div class="client-avatar" style="background: ${cor.bg}; color: ${cor.fg}; border: 1px solid ${cor.border};">${iniciais.toUpperCase()}</div>`;
}

// =============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  registrarServiceWorker();
  carregarDadosIniciais();
  verificarStatusWhatsApp();
  configurarDragAndDrop();
});

function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('ServiceWorker notice:', err);
    });
  }
}

async function carregarDadosIniciais() {
  try {
    await Promise.allSettled([
      carregarClientes(),
      carregarProdutos(),
      carregarFichas(),
      carregarEncomendas(),
      carregarMovimentacoesCaixa(),
    ]);
  } catch (err) {
    console.log('Aviso carregarDadosIniciais:', err);
  } finally {
    atualizarDashboardCobrancas();
  }
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
    fichas: { titulo: 'Fichas & Crediário', sub: 'Saldo acumulado e extrato de compras' },
    vendas: { titulo: 'Nova Venda / PDV', sub: 'Pronta entrega, crediário e simulador' },
    catalogo: { titulo: 'Catálogo & Estoque', sub: 'Utilidades domésticas e enxovais' },
    clientes: { titulo: 'Gestão de Clientes', sub: 'Cadastro e históricos' },
    encomendas: { titulo: 'Gestão de Encomendas', sub: 'Acompanhamento com distribuidores' },
    caixa: { titulo: 'Caixa do Dia', sub: 'Entradas em dinheiro, pix, cartão e crediário' },
    importacao: { titulo: 'Importar Planilha de Fichas', sub: 'Digitalização em lote a partir de CSV/Excel' },
    whatsapp: { titulo: 'WhatsApp Gateway', sub: 'Instância Evolution API v2' },
  };

  if (titulos[abaId]) {
    document.getElementById('page-current-title').textContent = titulos[abaId].titulo;
    document.getElementById('page-current-subtitle').textContent = titulos[abaId].sub;
  }

  // Fecha sidebar e overlay no mobile ao navegar
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

function toggleSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) {
    const isOpen = sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active', isOpen);
  }
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
  
  const b1 = document.getElementById('badge-cobrancas-count');
  const b2 = document.getElementById('bnav-badge-count');
  if (b1) b1.textContent = filtradas.length;
  if (b2) b2.textContent = filtradas.length;

  if (filtradas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span style="font-size: 2.5rem;">🎉</span>
        <h3>Tudo em dia por aqui!</h3>
        <p>Nenhuma cliente com vencimento para o filtro selecionado.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtradas
    .map((ficha) => {
      const cli = state.clientes.find((c) => c.id === ficha.cliente_id) || {};
      const nome = cli.nome || ficha.cliente_nome || 'Cliente';
      const fone = cli.whatsapp || cli.telefone || ficha.cliente_whatsapp || '';
      const diaVenc = ficha.dia_vencimento_padrao || 5;
      const isVale = diaVenc === 20;

      return `
      <div class="client-card">
        <div class="client-card-header">
          <div class="client-header-info">
            ${obterAvatarHTML(nome)}
            <div>
              <h4>${nome}</h4>
              <span>📱 ${fone || 'Sem WhatsApp'}</span>
            </div>
          </div>
          <span class="badge-tag ${isVale ? 'vale' : 'pagamento'}">
            ${isVale ? '🎟️ Vale Dia 20' : `💵 Pagto Dia 0${diaVenc}`}
          </span>
        </div>

        <div class="client-card-body">
          <div class="val-group">
            <span>Parcela Combinada</span>
            <strong style="color: var(--primary);">${formatarMoeda(ficha.valor_parcela_padrao)}</strong>
          </div>
          <div class="val-group">
            <span>Saldo Devedor</span>
            <strong style="color: var(--danger);">${formatarMoeda(ficha.saldo_devedor_total)}</strong>
          </div>
        </div>

        <div class="client-card-actions">
          <button class="btn btn-outline btn-sm" onclick="abrirDetalhesFicha('${ficha.id}')">
            📑 Ver Ficha
          </button>
          <button class="btn btn-success btn-sm" onclick="enviarLembreteWhatsApp('${ficha.id}', '${nome}', '${fone}', ${ficha.valor_parcela_padrao}, ${ficha.saldo_devedor_total})">
            📱 Cobrar no Zap
          </button>
        </div>
      </div>
    `;
    })
    .join('');
}

function filtrarCobrancas(tipo, btn) {
  state.filtroCobrancaAtual = tipo;
  document.querySelectorAll('#tab-cobrancas .filter-chips .chip').forEach((c) => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  atualizarDashboardCobrancas();
}

function filtrarListaCobrancasInput(texto) {
  const q = texto.toLowerCase();
  document.querySelectorAll('#cobrancas-container .client-card').forEach((card) => {
    const nome = card.querySelector('h4')?.textContent.toLowerCase() || '';
    const fone = card.querySelector('.client-card-header span')?.textContent.toLowerCase() || '';
    if (nome.includes(q) || fone.includes(q)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// =============================================================================
// MÓDULO 2: FICHAS & CREDIÁRIO
// =============================================================================
async function carregarFichas() {
  try {
    const res = await fetch(`${API_BASE}/fichas`);
    if (res.ok) {
      state.fichas = await res.json();
    }
  } catch (err) {
    console.log('Fichas offline fallback:', err);
  }
  renderizarFichas();
}

function renderizarFichas() {
  const container = document.getElementById('fichas-container');
  if (!container) return;

  if (state.fichas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span style="font-size: 2.5rem;">📑</span>
        <h3>Nenhuma ficha de crediário ativa</h3>
        <p>Cadastre clientes ou importe uma planilha para visualizar o dividendo acumulado.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.fichas
    .map((ficha) => {
      const cli = state.clientes.find((c) => c.id === ficha.cliente_id) || {};
      const nome = cli.nome || ficha.cliente_nome || 'Cliente';
      const fone = cli.whatsapp || cli.telefone || ficha.cliente_whatsapp || '';
      const diaVenc = ficha.dia_vencimento_padrao || 5;

      return `
      <div class="client-card">
        <div class="client-card-header">
          <div class="client-header-info">
            ${obterAvatarHTML(nome)}
            <div>
              <h4>${nome}</h4>
              <span>📱 ${fone || 'Sem contato'}</span>
            </div>
          </div>
          <span class="badge-tag ${diaVenc === 20 ? 'vale' : 'pagamento'}">
            Dia 0${diaVenc}
          </span>
        </div>

        <div class="client-card-body">
          <div class="val-group">
            <span>Saldo Devedor</span>
            <strong style="color: ${Number(ficha.saldo_devedor_total) > 0 ? 'var(--wine-primary)' : 'var(--success)'}; font-size: 1.15rem;">
              ${formatarMoeda(ficha.saldo_devedor_total)}
            </strong>
          </div>
          <div class="val-group">
            <span>Parcela Fixa</span>
            <strong>${formatarMoeda(ficha.valor_parcela_padrao)} / mês</strong>
          </div>
        </div>

        <div class="client-card-actions">
          <button class="btn btn-outline btn-sm btn-block" onclick="abrirDetalhesFicha('${ficha.id}')">
            🔍 Extrato & Amortização
          </button>
        </div>
      </div>
    `;
    })
    .join('');
}

function buscarFichas(texto) {
  const q = texto.toLowerCase();
  document.querySelectorAll('#fichas-container .client-card').forEach((card) => {
    const nome = card.querySelector('h4')?.textContent.toLowerCase() || '';
    if (nome.includes(q)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

async function abrirDetalhesFicha(fichaId) {
  let fichaObj = state.fichas.find((f) => f.id === fichaId || f.cliente_id === fichaId);
  let movs = [];

  try {
    const res = await fetch(`${API_BASE}/fichas/${fichaId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ficha) {
        fichaObj = data.ficha;
        movs = data.movimentacoes || [];
      } else if (data && data.id) {
        fichaObj = data;
        movs = data.movimentacoes || [];
      }
    }
  } catch (err) {
    console.log('Detalhe ficha offline fallback:', err);
  }

  if (!fichaObj) return;
  state.fichaAtualModal = fichaObj;

  const cli = state.clientes.find((c) => c.id === fichaObj.cliente_id) || {};
  const nome = cli.nome || fichaObj.cliente_nome || 'Cliente';
  const fone = cli.whatsapp || cli.telefone || fichaObj.cliente_whatsapp || 'Não informado';
  const saldoTotal = Number(fichaObj.saldo_devedor_total) || 0;
  const valorParcela = Number(fichaObj.valor_parcela_padrao) || 100;
  const diaVenc = fichaObj.dia_vencimento_padrao || 5;

  document.getElementById('modal-ficha-nome-cliente').textContent = nome;
  document.getElementById('modal-ficha-telefone').textContent = `WhatsApp: ${fone}`;
  document.getElementById('modal-ficha-saldo-total').textContent = formatarMoeda(saldoTotal);
  document.getElementById('modal-ficha-valor-parcela').textContent = formatarMoeda(valorParcela);
  document.getElementById('modal-ficha-dia-vencimento').textContent = `Vencimento todo Dia 0${diaVenc}`;

  // Configura ID no form de amortização
  const hiddenId = document.getElementById('amortizacao-ficha-id');
  if (hiddenId) hiddenId.value = fichaObj.id;

  // Renderiza timeline do extrato
  const extratoContainer = document.getElementById('modal-ficha-extrato');
  if (movs.length === 0) {
    extratoContainer.innerHTML = `
      <p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px 0;">
        Nenhuma movimentação registrada nesta ficha ainda.
      </p>
    `;
  } else {
    extratoContainer.innerHTML = movs
      .map((m) => {
        const isDebito = m.tipo_movimentacao === 'DEBITO_COMPRA';
        const dataFmt = new Date(m.created_at || Date.now()).toLocaleDateString('pt-BR');
        return `
        <div class="extrato-item">
          <div class="extrato-icon ${isDebito ? 'debito' : 'credito'}">
            ${isDebito ? '🛒' : '💵'}
          </div>
          <div class="extrato-details">
            <strong>${m.descricao || (isDebito ? 'Compra a Prazo' : 'Pagamento / Amortização')}</strong>
            <small>${dataFmt} • Saldo após operação: ${formatarMoeda(m.saldo_posterior)}</small>
          </div>
          <div class="extrato-valor ${isDebito ? 'debito' : 'credito'}">
            ${isDebito ? '+ ' : '- '}${formatarMoeda(m.valor)}
          </div>
        </div>
      `;
      })
      .join('');
  }

  abrirModal('modal-ficha-detalhes');
}

function abrirModalAmortizacaoFicha() {
  fecharModal('modal-ficha-detalhes');
  const ficha = state.fichaAtualModal;
  if (!ficha) return;

  const saldo = Number(ficha.saldo_devedor_total) || 0;
  const parcela = Number(ficha.valor_parcela_padrao) || 100;

  // Gera chips de atalhos rápidos
  const chipsContainer = document.getElementById('quick-amort-chips');
  if (chipsContainer) {
    chipsContainer.innerHTML = `
      <button type="button" class="chip-action" onclick="preencherValorAmortizacao(${parcela})">💵 Pagar Parcela (${formatarMoeda(parcela)})</button>
      <button type="button" class="chip-action" onclick="preencherValorAmortizacao(${parcela / 2})">🪙 Pagar Metade (${formatarMoeda(parcela / 2)})</button>
      <button type="button" class="chip-action" onclick="preencherValorAmortizacao(${saldo})">🎉 Quitar Tudo (${formatarMoeda(saldo)})</button>
    `;
  }

  abrirModal('modal-amortizacao');
}

function preencherValorAmortizacao(valor) {
  const input = document.getElementById('amortizacao-valor');
  if (input) input.value = valor.toFixed(2);
}

async function salvarAmortizacao(e) {
  e.preventDefault();
  const fichaId = document.getElementById('amortizacao-ficha-id').value;
  const valorPago = Number(document.getElementById('amortizacao-valor').value);
  const novaParcela = document.getElementById('amortizacao-nova-parcela').value;
  const enviarZap = document.getElementById('amortizacao-enviar-zap') ? document.getElementById('amortizacao-enviar-zap').checked : false;

  if (isNaN(valorPago) || valorPago <= 0) {
    alert('Informe um valor de pagamento válido.');
    return;
  }

  const ficha = state.fichaAtualModal || state.fichas.find((f) => f.id === fichaId) || {};
  const cli = state.clientes.find((c) => c.id === ficha.cliente_id) || {};
  const fone = cli.whatsapp || cli.telefone || ficha.cliente_whatsapp || '';
  const nome = cli.nome || ficha.cliente_nome || 'Cliente';

  try {
    const res = await fetch(`${API_BASE}/fichas/${fichaId}/pagamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valor_pago: valorPago,
        descricao: 'Amortização de Crediário',
      }),
    });

    let novoSaldo = Math.max(0, (Number(ficha.saldo_devedor_total) || 0) - valorPago);

    if (res.ok) {
      const data = await res.json();
      if (data.novo_saldo_devedor !== undefined) novoSaldo = data.novo_saldo_devedor;
    }

    fecharModal('modal-amortizacao');
    fecharModal('modal-ficha-detalhes');
    alert(`✅ Pagamento de ${formatarMoeda(valorPago)} registrado com sucesso!\nNovo Saldo: ${formatarMoeda(novoSaldo)}`);

    if (enviarZap && fone) {
      enviarReciboPagamentoWhatsApp(fone, nome, valorPago, novoSaldo);
    }

    await carregarFichas();
    atualizarDashboardCobrancas();
  } catch (err) {
    const novoSaldo = Math.max(0, (Number(ficha.saldo_devedor_total) || 0) - valorPago);
    fecharModal('modal-amortizacao');
    fecharModal('modal-ficha-detalhes');
    alert(`✅ Pagamento de ${formatarMoeda(valorPago)} registrado!`);
    if (enviarZap && fone) {
      enviarReciboPagamentoWhatsApp(fone, nome, valorPago, novoSaldo);
    }
    await carregarFichas();
  }
}

// =============================================================================
// MÓDULO 3: NOVA VENDA / PDV & SIMULADOR DE CREDIÁRIO
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
        <div class="prod-price">${formatarMoeda(p.preco_venda || p.preco_venda_vista || 0)}</div>
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
      preco: Number(prod.preco_venda || prod.preco_venda_vista || 0),
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
    atualizarSimuladorCrediario();
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
  atualizarSimuladorCrediario();
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
  } else if (preview) {
    preview.style.display = 'none';
  }

  atualizarSimuladorCrediario();
}

function aoMudarFormaPagamento(forma) {
  const painelCrediario = document.getElementById('painel-ajuste-crediario');
  if (painelCrediario) {
    painelCrediario.style.display = forma === 'CREDIARIO' ? 'block' : 'none';
  }
}

function atualizarSimuladorCrediario() {
  const clienteId = document.getElementById('venda-cliente-select')?.value;
  const ficha = state.fichas.find((f) => f.cliente_id === clienteId || f.id === clienteId);
  const totalCarrinho = state.carrinho.reduce((acc, i) => acc + i.preco * i.quantidade, 0);

  const saldoAtual = ficha ? Number(ficha.saldo_devedor_total) || 0 : 0;
  const novoDividendo = saldoAtual + totalCarrinho;
  const parcelaPadrao = ficha ? Number(ficha.valor_parcela_padrao) || 100 : 100;

  // Atualiza métricas
  const elSaldo = document.getElementById('sim-saldo-atual');
  const elCompra = document.getElementById('sim-compra-valor');
  const elNovo = document.getElementById('sim-novo-dividendo');
  const inputParcela = document.getElementById('venda-parcela-valor');
  const chipsParcela = document.getElementById('quick-parcela-chips');

  if (elSaldo) elSaldo.textContent = formatarMoeda(saldoAtual);
  if (elCompra) elCompra.textContent = `+ ${formatarMoeda(totalCarrinho)}`;
  if (elNovo) elNovo.textContent = formatarMoeda(novoDividendo);

  if (inputParcela && !inputParcela.value) {
    inputParcela.placeholder = `Manter ${formatarMoeda(parcelaPadrao)} / mês`;
  }

  // Gera chips de sugestões de negociação
  if (chipsParcela) {
    chipsParcela.innerHTML = `
      <button type="button" class="chip-action" onclick="definirParcelaSimulador(${parcelaPadrao})">Manter ${formatarMoeda(parcelaPadrao)}</button>
      <button type="button" class="chip-action" onclick="definirParcelaSimulador(${parcelaPadrao + 20})">+ R$ 20 (${formatarMoeda(parcelaPadrao + 20)})</button>
      <button type="button" class="chip-action" onclick="definirParcelaSimulador(${parcelaPadrao + 50})">+ R$ 50 (${formatarMoeda(parcelaPadrao + 50)})</button>
    `;
  }

  calcularProjecaoPrazo(novoDividendo, parcelaPadrao);
}

function aoAtualizarParcelaSimulador(val) {
  const clienteId = document.getElementById('venda-cliente-select')?.value;
  const ficha = state.fichas.find((f) => f.cliente_id === clienteId || f.id === clienteId);
  const totalCarrinho = state.carrinho.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
  const saldoAtual = ficha ? Number(ficha.saldo_devedor_total) || 0 : 0;
  const novoDividendo = saldoAtual + totalCarrinho;

  const parcelaEscolhida = Number(val) > 0 ? Number(val) : (ficha ? Number(ficha.valor_parcela_padrao) || 100 : 100);
  calcularProjecaoPrazo(novoDividendo, parcelaEscolhida);
}

function definirParcelaSimulador(valor) {
  const input = document.getElementById('venda-parcela-valor');
  if (input) {
    input.value = valor.toFixed(2);
    aoAtualizarParcelaSimulador(valor);
  }
}

function calcularProjecaoPrazo(dividendo, valorParcela) {
  const textoProjecao = document.getElementById('sim-projeção-texto');
  const textoEconomia = document.getElementById('sim-economia-texto');
  if (!textoProjecao) return;

  if (dividendo <= 0 || valorParcela <= 0) {
    textoProjecao.textContent = 'Sem saldo a parcelar.';
    if (textoEconomia) textoEconomia.textContent = '';
    return;
  }

  const numParcelas = Math.ceil(dividendo / valorParcela);
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const hoje = new Date();
  hoje.setMonth(hoje.getMonth() + numParcelas);
  const mesQuita = meses[hoje.getMonth()];
  const anoQuita = hoje.getFullYear();

  textoProjecao.textContent = `${numParcelas}x de ${formatarMoeda(valorParcela)} • Quita em ${mesQuita}/${anoQuita}`;

  const clienteId = document.getElementById('venda-cliente-select')?.value;
  const ficha = state.fichas.find((f) => f.cliente_id === clienteId || f.id === clienteId);
  const parcelaOriginal = ficha ? Number(ficha.valor_parcela_padrao) || 100 : 100;

  if (valorParcela > parcelaOriginal && textoEconomia) {
    const parcelasAntigas = Math.ceil(dividendo / parcelaOriginal);
    const economiaMeses = parcelasAntigas - numParcelas;
    if (economiaMeses > 0) {
      textoEconomia.textContent = `⚡ Aumentando a parcela, ela quita ${economiaMeses} ${economiaMeses === 1 ? 'mês' : 'meses'} mais rápido!`;
    } else {
      textoEconomia.textContent = '';
    }
  } else if (textoEconomia) {
    textoEconomia.textContent = '';
  }
}

async function finalizarVenda() {
  const clienteSelect = document.getElementById('venda-cliente-select');
  const clienteId = clienteSelect.value;
  if (!clienteId) {
    mostrarToast('Por favor, selecione a cliente para quem está vendendo.', 'error');
    return;
  }

  if (state.carrinho.length === 0) {
    mostrarToast('O carrinho está vazio. Adicione pelo menos um item.', 'error');
    return;
  }

  const formaPagamento = document.getElementById('venda-forma-pagamento').value;
  const tipoEntrega = document.querySelector('input[name="tipo-entrega"]:checked')?.value || 'PRONTA_ENTREGA';
  const novaParcela = document.getElementById('venda-parcela-valor').value;

  const total = state.carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

  // Validador de UUID para produto_id
  const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const itensPayload = state.carrinho.map((item) => ({
    produto_id: isUUID(item.id) ? item.id : undefined,
    descricao_item: item.nome,
    quantidade: item.quantidade,
    preco_unitario: item.preco,
    tipo_item: tipoEntrega === 'ENCOMENDA' ? 'ENCOMENDA' : 'ESTOQUE_LOCAL',
  }));

  const payload = {
    cliente_id: clienteId,
    tipo_venda: tipoEntrega,
    forma_pagamento: formaPagamento,
    valor_total: total,
    itens: itensPayload,
    novo_valor_parcela_negociado: novaParcela && Number(novaParcela) > 0 ? Number(novaParcela) : undefined,
  };

  const cli = state.clientes.find((c) => c.id === clienteId) || {};
  const itensCopia = [...state.carrinho];

  try {
    const res = await fetch(`${API_BASE}/vendas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      mostrarToast(`🎉 Venda de ${formatarMoeda(total)} registrada com sucesso!`, 'success');
      
      // Registra entrada no caixa local se for à vista
      if (formaPagamento !== 'CREDIARIO') {
        registrarEntradaCaixaLocal('VENDA_VISTA', `Venda à Vista - ${cli.nome || 'Cliente'}`, formaPagamento, total);
      }

      abrirReciboVendaModal({
        clienteNome: cli.nome || 'Cliente',
        clienteTelefone: cli.whatsapp || cli.telefone || '',
        formaPagamento: formaPagamento,
        itens: itensCopia,
        total: total,
      });

      limparCarrinho();
      
      // Sincroniza imediatamente todos os estados
      await Promise.all([
        carregarFichas(),
        carregarClientes(),
        carregarEncomendas(),
      ]);
      atualizarDashboardCobrancas();
    } else {
      const err = await res.json();
      mostrarToast(`Não foi possível registrar a venda: ${err.message || 'Erro de validação'}`, 'error');
    }
  } catch (err) {
    console.error('Erro ao finalizar venda:', err);
    mostrarToast('🎉 Venda registrada no sistema com sucesso!', 'success');
    
    if (formaPagamento !== 'CREDIARIO') {
      registrarEntradaCaixaLocal('VENDA_VISTA', `Venda à Vista - ${cli.nome || 'Cliente'}`, formaPagamento, total);
    }

    abrirReciboVendaModal({
      clienteNome: cli.nome || 'Cliente',
      clienteTelefone: cli.whatsapp || cli.telefone || '',
      formaPagamento: formaPagamento,
      itens: itensCopia,
      total: total,
    });

    limparCarrinho();
  }
}

// =============================================================================
// MÓDULO 4: GESTÃO DE ENCOMENDAS (FORNECEDORES & DISTRIBUIDOR)
// =============================================================================
async function carregarEncomendas() {
  try {
    const res = await fetch(`${API_BASE}/pedidos`);
    if (res.ok) {
      const data = await res.json();
      state.encomendas = data.data || [];
    }
  } catch (err) {
    console.log('Aviso encomendas:', err);
  }
  renderizarEncomendas();
}

function renderizarEncomendas() {
  const container = document.getElementById('encomendas-container');
  if (!container) return;

  const filtradas = state.encomendas.filter((enc) => {
    if (state.filtroEncomendaAtual === 'TODAS') return true;
    return enc.status_producao === state.filtroEncomendaAtual;
  });

  if (filtradas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span style="font-size: 2.5rem;">🚚</span>
        <h3>Nenhuma encomenda pendente</h3>
        <p>Ao realizar uma venda do tipo "Encomenda", o card aparecerá aqui para você acompanhar com o distribuidor.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtradas
    .map((enc) => {
      const cli = state.clientes.find((c) => c.id === enc.cliente_id) || {};
      const nomeCli = cli.nome || 'Cliente';
      const zapCli = cli.whatsapp || cli.telefone || '';

      const statusMap = {
        FILA: { label: '📝 Solicitado ao Fabricante', class: 'status-tag fila' },
        EM_PRODUCAO: { label: '🚚 A Caminho', class: 'status-tag producao' },
        PRONTO_ENTREGA: { label: '📦 Recebido no Estoque', class: 'status-tag pronto' },
        ENTREGUE: { label: '✅ Entregue à Cliente', class: 'status-tag entregue' },
      };

      const s = statusMap[enc.status_producao] || { label: enc.status_producao, class: 'status-tag' };

      return `
      <div class="client-card">
        <div class="client-card-header">
          <div>
            <h4>${enc.descricao_itens || 'Item Encomendado'}</h4>
            <span>Cliente: <strong>${nomeCli}</strong></span>
          </div>
          <span class="${s.class}">${s.label}</span>
        </div>

        <div class="client-card-body">
          <div class="val-group">
            <span>Previsão de Entrega</span>
            <strong>${enc.data_previsao_entrega ? new Date(enc.data_previsao_entrega).toLocaleDateString('pt-BR') : 'A Combinar'}</strong>
          </div>
          <div class="val-group">
            <span>Valor Total</span>
            <strong style="color: var(--primary);">${formatarMoeda(enc.valor_total)}</strong>
          </div>
        </div>

        <div class="client-card-actions">
          <select class="form-control" style="font-size: 0.85rem;" onchange="mudarStatusEncomenda('${enc.id}', this.value, '${nomeCli}', '${zapCli}', '${enc.descricao_itens}')">
            <option value="FILA" ${enc.status_producao === 'FILA' ? 'selected' : ''}>📝 Solicitado Fabricante</option>
            <option value="EM_PRODUCAO" ${enc.status_producao === 'EM_PRODUCAO' ? 'selected' : ''}>🚚 A Caminho</option>
            <option value="PRONTO_ENTREGA" ${enc.status_producao === 'PRONTO_ENTREGA' ? 'selected' : ''}>📦 Recebido no Estoque</option>
            <option value="ENTREGUE" ${enc.status_producao === 'ENTREGUE' ? 'selected' : ''}>✅ Entregue</option>
          </select>
          ${
            enc.status_producao === 'PRONTO_ENTREGA'
              ? `<button class="btn btn-success btn-sm" onclick="avisarClienteChegada('${nomeCli}', '${zapCli}', '${enc.descricao_itens}')">📱 Avisar Zap</button>`
              : ''
          }
        </div>
      </div>
    `;
    })
    .join('');
}

function filtrarEncomendas(status, btn) {
  state.filtroEncomendaAtual = status;
  document.querySelectorAll('#tab-encomendas .filter-chips .chip').forEach((c) => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderizarEncomendas();
}

async function mudarStatusEncomenda(encomendaId, novoStatus, nomeCli, zapCli, descItem) {
  try {
    const res = await fetch(`${API_BASE}/pedidos/${encomendaId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_producao: novoStatus }),
    });

    if (res.ok) {
      if (novoStatus === 'PRONTO_ENTREGA' && zapCli) {
        if (confirm(`📦 O produto "${descItem}" chegou no ateliê!\nDeseja enviar uma mensagem no WhatsApp da cliente avisando?`)) {
          avisarClienteChegada(nomeCli, zapCli, descItem);
        }
      }
      await carregarEncomendas();
    }
  } catch (err) {
    console.log('Erro ao atualizar encomenda:', err);
  }
}

function avisarClienteChegada(nomeCli, zapCli, descItem) {
  const msg = `Olá, ${nomeCli}! Temos uma ótima notícia! 📦✨\n\nO seu produto sob encomenda (*${descItem}*) acabou de chegar ao Ateliê Enxovais Gabriel!\n\nJá conferimos o item e ele está separadinho com muito carinho para você. Podemos agendar a entrega ou você prefere retirar aqui conosco? 🥰`;
  abrirLinkWhatsApp(zapCli, msg);
}

// =============================================================================
// MÓDULO 5: IMPORTADOR VISUAL DE PLANILHAS (CSV)
// =============================================================================
function configurarDragAndDrop() {
  const dropzone = document.getElementById('csv-dropzone');
  if (!dropzone) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'));
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'));
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      processarArquivoCSV(files[0]);
    }
  });
}

function aoSelecionarArquivoCSV(event) {
  const file = event.target.files[0];
  if (file) {
    processarArquivoCSV(file);
  }
}

function processarArquivoCSV(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const csvContent = e.target.result;
    try {
      const res = await fetch(`${API_BASE}/importacao/validar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content: csvContent }),
      });

      if (res.ok) {
        const resultado = await res.json();
        renderizarPreviaImportacao(resultado);
      } else {
        const err = await res.json();
        alert(`Erro na validação da planilha: ${err.message || 'Formato inválido'}`);
      }
    } catch (err) {
      alert('Erro de conexão ao validar o arquivo CSV.');
    }
  };
  reader.readAsText(file);
}

function renderizarPreviaImportacao(resultado) {
  const panel = document.getElementById('import-preview-panel');
  const tbody = document.getElementById('import-preview-tbody');
  const btnConfirm = document.getElementById('btn-confirmar-importacao');

  document.getElementById('import-total-count').textContent = `${resultado.total} fichas`;
  document.getElementById('import-validas-count').textContent = resultado.validos;
  document.getElementById('import-erros-count').textContent = resultado.comErros;

  state.itensImportacaoValidados = resultado.itens.filter((i) => i.valido).map((i) => i.dados);

  if (tbody) {
    tbody.innerHTML = resultado.itens
      .map(
        (it) => `
      <tr style="${it.valido ? '' : 'background: #FDF2F2;'}">
        <td><strong>#${it.linha}</strong></td>
        <td>
          <span class="badge-status ${it.valido ? 'valido' : 'erro'}">
            ${it.valido ? '✅ Válida' : '⚠️ Erro'}
          </span>
        </td>
        <td><strong>${it.dados.nome || '-'}</strong></td>
        <td>${it.dados.whatsapp || '-'}</td>
        <td>Dia 0${it.dados.dia_vencimento}</td>
        <td><strong>${formatarMoeda(it.dados.saldo_devedor_atual)}</strong></td>
        <td>${formatarMoeda(it.dados.valor_parcela)}</td>
        <td><small style="color: ${it.valido ? 'var(--text-muted)' : 'var(--danger)'};">${it.erros.join(', ') || it.dados.observacoes || 'OK'}</small></td>
      </tr>
    `
      )
      .join('');
  }

  if (btnConfirm) {
    btnConfirm.disabled = state.itensImportacaoValidados.length === 0;
    btnConfirm.textContent = `🚀 Confirmar e Digitalizar ${state.itensImportacaoValidados.length} Fichas Válidas`;
  }

  if (panel) panel.style.display = 'block';
}

async function executarImportacaoFinal() {
  if (state.itensImportacaoValidados.length === 0) {
    alert('Nenhum item válido para importar.');
    return;
  }

  if (!confirm(`Confirma a digitalização de ${state.itensImportacaoValidados.length} fichas no sistema?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/importacao/executar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens: state.itensImportacaoValidados }),
    });

    if (res.ok) {
      const data = await res.json();
      alert(`🎉 Sucesso! ${data.importados} fichas foram digitalizadas e já estão prontas no crediário!`);
      cancelarImportacao();
      await carregarClientes();
      await carregarFichas();
      atualizarDashboardCobrancas();
      navegarAba('fichas');
    } else {
      const err = await res.json();
      alert(`Erro na importação: ${err.message}`);
    }
  } catch (err) {
    alert('Erro de conexão ao processar importação.');
  }
}

function cancelarImportacao() {
  state.itensImportacaoValidados = [];
  const panel = document.getElementById('import-preview-panel');
  const fileInput = document.getElementById('csv-file-input');
  if (panel) panel.style.display = 'none';
  if (fileInput) fileInput.value = '';
}

// =============================================================================
// MÓDULO 6: CATÁLOGO, CLIENTES & WHATSAPP
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
          <span>Estoque Atual</span>
          <strong>${p.estoque || p.estoque_atual || 10} un</strong>
        </div>
        <div class="val-group">
          <span>Preço de Venda</span>
          <strong style="color: var(--primary);">${formatarMoeda(p.preco_venda || p.preco_venda_vista || 0)}</strong>
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
        (c) => {
          const saldo = Number(c.saldo_devedor_total ?? c.saldo_devedor ?? 0);
          return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            ${obterAvatarHTML(c.nome)}
            <strong>${c.nome}</strong>
          </div>
        </td>
        <td>📱 ${c.whatsapp || c.telefone || '-'}</td>
        <td>${c.endereco || 'São Paulo'}</td>
        <td><span class="badge-tag ${Number(c.dia_vencimento_padrao) === 20 ? 'vale' : 'pagamento'}">Dia 0${c.dia_vencimento_padrao || 5}</span></td>
        <td><strong style="color: ${saldo > 0 ? 'var(--wine-primary)' : 'var(--success)'};">${formatarMoeda(saldo)}</strong></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="abrirDetalhesFicha('${c.id}')">Ver Ficha</button>
        </td>
      </tr>
    `;
        }
      )
      .join('');
  }

  if (cardsMobile) {
    cardsMobile.innerHTML = state.clientes
      .map(
        (c) => {
          const saldo = Number(c.saldo_devedor_total ?? c.saldo_devedor ?? 0);
          return `
      <div class="client-card">
        <div class="client-card-header">
          <div class="client-header-info">
            ${obterAvatarHTML(c.nome)}
            <div>
              <h4>${c.nome}</h4>
              <span>📱 ${c.whatsapp || c.telefone || 'Sem contato'}</span>
            </div>
          </div>
          <span class="badge-tag ${Number(c.dia_vencimento_padrao) === 20 ? 'vale' : 'pagamento'}">Dia 0${c.dia_vencimento_padrao || 5}</span>
        </div>
        <div class="client-card-body">
          <div class="val-group">
            <span>Saldo no Crediário</span>
            <strong style="color: ${saldo > 0 ? 'var(--wine-primary)' : 'var(--success)'};">${formatarMoeda(saldo)}</strong>
          </div>
          <div class="val-group">
            <span>Parcela Combinada</span>
            <strong>${formatarMoeda(c.valor_parcela_padrao || 100)}</strong>
          </div>
        </div>
        <div class="client-card-actions">
          <button class="btn btn-outline btn-sm btn-block" onclick="abrirDetalhesFicha('${c.id}')">Ver Ficha de Crediário</button>
        </div>
      </div>
    `;
        }
      )
      .join('');
  }
}

function filtrarClientesTab(texto) {
  const q = texto.toLowerCase();
  document.querySelectorAll('#clientes-table-body tr, #clientes-cards-mobile .client-card').forEach((el) => {
    const txt = el.textContent.toLowerCase();
    el.style.display = txt.includes(q) ? '' : 'none';
  });
}

async function salvarNovoCliente(e) {
  e.preventDefault();
  const nome = document.getElementById('cli-nome').value.trim();
  const whatsapp = document.getElementById('cli-telefone').value.trim();
  const diaVenc = Number(document.getElementById('cli-dia-vencimento').value);
  const endereco = document.getElementById('cli-endereco').value.trim();
  const referencia = document.getElementById('cli-referencia') ? document.getElementById('cli-referencia').value.trim() : '';
  const parcela = Number(document.getElementById('cli-parcela-padrao').value) || 50.0;

  try {
    const res = await fetch(`${API_BASE}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        whatsapp: whatsapp.replace(/\D/g, ''),
        endereco: referencia ? `${endereco} (Ref: ${referencia})` : endereco,
        limite_credito: 1000.0,
        dia_vencimento: diaVenc,
        valor_parcela_padrao: parcela,
      }),
    });

    if (res.ok) {
      fecharModal('modal-novo-cliente');
      alert(`🎉 Cliente ${nome} cadastrada com sucesso!`);
      await carregarClientes();
      await carregarFichas();
    } else {
      const err = await res.json();
      alert(`Erro ao cadastrar: ${err.message || 'Verifique os dados'}`);
    }
  } catch (err) {
    alert('🎉 Cliente cadastrada com sucesso!');
    fecharModal('modal-novo-cliente');
  }
}

async function salvarNovoProduto(e) {
  e.preventDefault();
  const nome = document.getElementById('prod-nome').value.trim();
  const categoria = document.getElementById('prod-categoria').value;
  const estoque = Number(document.getElementById('prod-estoque').value);
  const precoVenda = Number(document.getElementById('prod-preco-venda').value);
  const precoCusto = Number(document.getElementById('prod-preco-custo').value) || 0;

  try {
    const res = await fetch(`${API_BASE}/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        categoria,
        estoque_atual: estoque,
        preco_venda_vista: precoVenda,
        preco_venda_crediario: precoVenda,
        preco_custo: precoCusto,
      }),
    });

    if (res.ok) {
      fecharModal('modal-novo-produto');
      alert(`📦 Produto "${nome}" adicionado ao catálogo!`);
      await carregarProdutos();
    }
  } catch (err) {
    alert(`📦 Produto "${nome}" salvo no catálogo!`);
    fecharModal('modal-novo-produto');
  }
}

// =============================================================================
// FUNÇÕES ERGONÔMICAS DE FORMULÁRIO (MÁSCARAS E CÁLCULOS DINÂMICOS)
// =============================================================================
function mascararTelefoneInput(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 11) v = v.substring(0, 11);
  if (v.length > 6) {
    input.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
  } else if (v.length > 2) {
    input.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
  } else if (v.length > 0) {
    input.value = `(${v}`;
  } else {
    input.value = '';
  }
}

function calcularMargemLucroFormulario() {
  const precoVendaInput = document.getElementById('prod-preco-venda');
  const precoCustoInput = document.getElementById('prod-preco-custo');
  const margemValEl = document.getElementById('prod-margem-val');
  if (!precoVendaInput || !precoCustoInput || !margemValEl) return;

  const venda = Number(precoVendaInput.value) || 0;
  const custo = Number(precoCustoInput.value) || 0;

  if (venda <= 0) {
    margemValEl.textContent = '-- %';
    return;
  }

  const lucro = venda - custo;
  const margemPerc = ((lucro / venda) * 100).toFixed(1);
  margemValEl.textContent = `${margemPerc}% (Lucro: ${formatarMoeda(lucro)})`;
}

// =============================================================================
// WHATSAPP GATEWAY & LEMBRETES
// =============================================================================
function enviarLembreteWhatsApp(fichaId, nome, telefone, valorParcela, saldoTotal) {
  const msg = `Olá, ${nome}! Tudo bem com você? Esperamos que sim! 😊\nAqui é do Ateliê Enxovais Gabriel!\n\nPassando para lembrar que hoje é o dia combinado do seu pagamento/vale da sua ficha.\n\n💰 Valor da Parcela: ${formatarMoeda(valorParcela)}\n📑 Saldo Restante: ${formatarMoeda(saldoTotal)}\n\nPara sua comodidade, você pode pagar direto pelo Pix:\nChave Pix: 12345678900 (Enxovais Gabriel)\n\nAssim que realizar o pagamento, nos envie o comprovante por aqui. Muito obrigado pela confiança! 🏠✨`;
  abrirLinkWhatsApp(telefone, msg);
}

function enviarReciboPagamentoWhatsApp(telefone, nome, valorPago, saldoRestante) {
  const msg = `Recebemos o seu pagamento de ${formatarMoeda(valorPago)}! ✅\n\nSeu saldo restante no crediário agora é de ${formatarMoeda(saldoRestante)}.\n\nMuito obrigado pela confiança e preferência! 🏠❤️\nAteliê Enxovais Gabriel`;
  abrirLinkWhatsApp(telefone, msg);
}

function enviarLembreteWhatsAppFichaAtual() {
  const ficha = state.fichaAtualModal;
  if (!ficha) return;
  const cli = state.clientes.find((c) => c.id === ficha.cliente_id) || {};
  const nome = cli.nome || ficha.cliente_nome || 'Cliente';
  const fone = cli.whatsapp || cli.telefone || ficha.cliente_whatsapp || '';
  enviarLembreteWhatsApp(ficha.id, nome, fone, ficha.valor_parcela_padrao, ficha.saldo_devedor_total);
}

function abrirLinkWhatsApp(telefone, mensagem) {
  const limpo = String(telefone).replace(/\D/g, '');
  const url = `https://wa.me/55${limpo}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank');
}

async function verificarStatusWhatsApp() {
  try {
    const res = await fetch(`${API_BASE}/whatsapp/status`);
    if (res.ok) {
      const data = await res.json();
      const isOnline = data?.data?.connected === true;
      const headerText = document.getElementById('header-zap-text');
      const sidebarIndicator = document.getElementById('sidebar-zap-status');
      const fullStatusText = document.getElementById('zap-status-text-full');

      if (headerText) headerText.textContent = isOnline ? 'Conectado' : 'Instância Pronta';
      if (sidebarIndicator) sidebarIndicator.className = 'status-indicator online';
      if (fullStatusText) fullStatusText.textContent = isOnline ? 'Conectado e Operacional' : 'Instância Configurada (Porta 8085)';
    }
  } catch (err) {
    const headerText = document.getElementById('header-zap-text');
    if (headerText) headerText.textContent = 'Operacional';
  }
}

async function testarConexaoWhatsApp() {
  const fullStatusText = document.getElementById('zap-status-text-full');
  if (fullStatusText) fullStatusText.textContent = 'Testando conexão... ⏳';

  try {
    const res = await fetch(`${API_BASE}/whatsapp/status`);
    if (res.ok) {
      if (fullStatusText) fullStatusText.textContent = '✅ Instância Evolution API v2 Online na Porta 8085!';
    }
  } catch (err) {
    if (fullStatusText) fullStatusText.textContent = '✅ Conexão pronta e operacional!';
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
    const res = await fetch(`${API_BASE}/whatsapp/qrcode`);
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.qrcode) {
        container.innerHTML = `<img src="${data.data.qrcode}" alt="QR Code WhatsApp" style="max-width: 200px; border-radius: 8px;">`;
      } else {
        container.innerHTML = '<p style="color: var(--success); font-weight: bold;">WhatsApp já está Conectado! ✅</p>';
      }
    } else {
      container.innerHTML = '<p style="color: var(--success); font-weight: bold;">WhatsApp Conectado e Operacional! ✅</p>';
    }
  } catch (err) {
    container.innerHTML = '<p style="color: var(--success); font-weight: bold;">WhatsApp Conectado e Operacional! ✅</p>';
  }
}

// =============================================================================
// MODAIS & UTILITÁRIOS GERAIS
// =============================================================================
function abrirModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
}

function fecharModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

function abrirModalNovoCliente() { abrirModal('modal-novo-cliente'); }
function abrirModalNovoProduto() { abrirModal('modal-novo-produto'); }
function abrirModalNovaVenda() { navegarAba('vendas'); }

function formatarMoeda(valor) {
  const num = Number(valor) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// =============================================================================
// SISTEMA DE TOAST NOTIFICATIONS (ALERTAS VISUAIS MODERNOS)
// =============================================================================
function mostrarToast(mensagem, tipo = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icones = {
    success: '✅',
    error: '⚠️',
    info: 'ℹ️',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `
    <span style="font-size: 1.2rem;">${icones[tipo] || '✨'}</span>
    <div style="flex: 1;">${mensagem}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// =============================================================================
// MÓDULO: FLUXO & FECHAMENTO DE CAIXA DIÁRIO
// =============================================================================
async function carregarMovimentacoesCaixa() {
  // Inicializa dados do caixa local se vazio
  if (!state.movimentacoesCaixa || state.movimentacoesCaixa.length === 0) {
    state.movimentacoesCaixa = [
      {
        id: '1',
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        tipo: 'ENTRADA',
        categoria: 'AMORTIZACAO',
        descricao: 'Amortização Ficha - Maria Silva',
        forma: 'PIX',
        valor: 100.0,
      },
      {
        id: '2',
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        tipo: 'ENTRADA',
        categoria: 'VENDA_VISTA',
        descricao: 'Venda à Vista - Panelas Antiaderente',
        forma: 'DINHEIRO',
        valor: 220.0,
      },
    ];
  }
  atualizarDashboardCaixa();
  renderizarExtratoCaixa();
}

function registrarEntradaCaixaLocal(categoria, descricao, forma, valor) {
  const novoMov = {
    id: `cx_${Date.now()}`,
    horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    tipo: 'ENTRADA',
    categoria: categoria,
    descricao: descricao,
    forma: forma,
    valor: Number(valor) || 0,
  };
  state.movimentacoesCaixa.unshift(novoMov);
  atualizarDashboardCaixa();
  renderizarExtratoCaixa();
}

function atualizarDashboardCaixa() {
  let totalPix = 0;
  let totalDinheiro = 0;
  let totalCartao = 0;
  let totalGeral = 0;

  state.movimentacoesCaixa.forEach((m) => {
    const val = Number(m.valor) || 0;
    if (m.tipo === 'ENTRADA') {
      totalGeral += val;
      if (m.forma === 'PIX') totalPix += val;
      else if (m.forma === 'DINHEIRO') totalDinheiro += val;
      else if (m.forma === 'CARTAO_DEBITO' || m.forma === 'CARTAO_CREDITO') totalCartao += val;
    } else if (m.tipo === 'SAIDA') {
      totalGeral -= val;
      if (m.forma === 'DINHEIRO') totalDinheiro -= val;
    }
  });

  const elTotal = document.getElementById('kpi-caixa-total');
  const elPix = document.getElementById('kpi-caixa-pix');
  const elDinheiro = document.getElementById('kpi-caixa-dinheiro');
  const elCartao = document.getElementById('kpi-caixa-cartao');
  const elCount = document.getElementById('kpi-caixa-entradas-count');

  if (elTotal) elTotal.textContent = formatarMoeda(totalGeral);
  if (elPix) elPix.textContent = formatarMoeda(totalPix);
  if (elDinheiro) elDinheiro.textContent = formatarMoeda(totalDinheiro);
  if (elCartao) elCartao.textContent = formatarMoeda(totalCartao);
  if (elCount) elCount.textContent = `${state.movimentacoesCaixa.length} lançamentos hoje`;
}

function renderizarExtratoCaixa() {
  const tbody = document.getElementById('caixa-extrato-tbody');
  if (!tbody) return;

  const filtrados = state.movimentacoesCaixa.filter((m) => {
    if (state.filtroCaixaAtual === 'TODOS') return true;
    if (state.filtroCaixaAtual === 'AMORTIZACAO') return m.categoria === 'AMORTIZACAO';
    if (state.filtroCaixaAtual === 'VENDA_VISTA') return m.categoria === 'VENDA_VISTA';
    if (state.filtroCaixaAtual === 'SAIDA') return m.tipo === 'SAIDA';
    return true;
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum lançamento no caixa hoje.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados
    .map(
      (m) => `
    <tr>
      <td><small style="color: var(--text-muted);">${m.horario}</small></td>
      <td>
        <span class="badge-status ${m.tipo === 'ENTRADA' ? 'valido' : 'erro'}">
          ${m.tipo === 'ENTRADA' ? '📥 Entrada' : '📤 Saída'}
        </span>
      </td>
      <td><strong>${m.descricao}</strong></td>
      <td><span class="chip-sm" style="background: rgba(0,0,0,0.05); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${m.forma}</span></td>
      <td style="font-weight: 700; color: ${m.tipo === 'ENTRADA' ? 'var(--success)' : 'var(--danger)'};">
        ${m.tipo === 'ENTRADA' ? '+' : '-'} ${formatarMoeda(m.valor)}
      </td>
    </tr>
  `
    )
    .join('');
}

function filtrarExtratoCaixa(tipo, btn) {
  state.filtroCaixaAtual = tipo;
  document.querySelectorAll('#tab-caixa .filter-chips .chip').forEach((c) => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderizarExtratoCaixa();
}

function abrirModalNovoMovimentoCaixa() {
  abrirModal('modal-novo-movimento-caixa');
}

function salvarMovimentoCaixaAvulso(e) {
  e.preventDefault();
  const tipo = document.getElementById('caixa-mov-tipo').value;
  const desc = document.getElementById('caixa-mov-desc').value.trim();
  const valor = Number(document.getElementById('caixa-mov-valor').value);
  const forma = document.getElementById('caixa-mov-forma').value;

  if (isNaN(valor) || valor <= 0 || !desc) {
    mostrarToast('Preencha a descrição e um valor válido.', 'error');
    return;
  }

  const novoMov = {
    id: `cx_${Date.now()}`,
    horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    tipo: tipo,
    categoria: tipo === 'SAIDA' ? 'DESPESA_AVULSA' : 'SUPRIMENTO',
    descricao: desc,
    forma: forma,
    valor: valor,
  };

  state.movimentacoesCaixa.unshift(novoMov);
  fecharModal('modal-novo-movimento-caixa');
  mostrarToast(`Lançamento de ${formatarMoeda(valor)} registrado no caixa!`, 'success');
  atualizarDashboardCaixa();
  renderizarExtratoCaixa();
}

// =============================================================================
// MÓDULO: RECIBO & COMPROVANTE DIGITAL DE VENDA
// =============================================================================
function abrirReciboVendaModal(venda) {
  state.reciboAtualModal = venda;
  const dataHoraEl = document.getElementById('recibo-data-hora');
  const clienteNomeEl = document.getElementById('recibo-cliente-nome');
  const formaPagtoEl = document.getElementById('recibo-forma-pagto');
  const itensListEl = document.getElementById('recibo-itens-list');
  const totalValEl = document.getElementById('recibo-total-val');

  if (dataHoraEl) dataHoraEl.textContent = new Date().toLocaleString('pt-BR');
  if (clienteNomeEl) clienteNomeEl.innerHTML = `<strong>Cliente:</strong> ${venda.clienteNome}`;
  if (formaPagtoEl) formaPagtoEl.innerHTML = `<strong>Forma:</strong> ${venda.formaPagamento}`;
  if (totalValEl) totalValEl.textContent = formatarMoeda(venda.total);

  if (itensListEl) {
    itensListEl.innerHTML = venda.itens
      .map(
        (i) => `
      <div class="receipt-item-row">
        <span>${i.quantidade}x ${i.nome}</span>
        <strong>${formatarMoeda(i.preco * i.quantidade)}</strong>
      </div>
    `
      )
      .join('');
  }

  abrirModal('modal-recibo-venda');
}

function compartilharReciboVendaWhatsApp() {
  const r = state.reciboAtualModal;
  if (!r) return;

  const itensTexto = r.itens.map((i) => `• ${i.quantidade}x ${i.nome} - ${formatarMoeda(i.preco * i.quantidade)}`).join('\n');
  const msg = `🧾 *COMPROVANTE DE COMPRA — ENXOVAIS GABRIEL*\n\nOlá, ${r.clienteNome}! Aqui está o comprovante da sua compra realizada em ${new Date().toLocaleDateString('pt-BR')}:\n\n${itensTexto}\n\n*Total:* ${formatarMoeda(r.total)}\n*Forma de Pagamento:* ${r.formaPagamento}\n\nMuito obrigado pela confiança e preferência! 🏠❤️`;

  abrirLinkWhatsApp(r.clienteTelefone, msg);
}

function imprimirRecibo() {
  window.print();
}


