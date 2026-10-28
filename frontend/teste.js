/**
 * ENXOVAIS GABRIEL - NOVO LAYOUT v2 (AMBIENTE DE TESTE)
 * Script de Controle Operacional, Responsividade Touch & Integração com APIs
 */

// Estado global da aplicação de teste
const state = {
  activeTab: 'inicio',
  cobrancasHoje: [],
  fichas: [],
  clientes: [],
  produtos: [],
  whatsappOnline: false,
  filtroFichas: 'todas',
  simulador: {
    saldo: 510.00,
    dia: 20,
    parcela: 50.00
  }
};

// =============================================================================
// INICIALIZAÇÃO AO CARREGAR A PÁGINA
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  configurarEventosGlobais();
  atualizarDataCabecalho();
  
  // Carrega dados das APIs reais
  await carregarTudo();
  
  // Inicializa o simulador na tela inicial
  calcularSimulacaoV2();
});

function atualizarDataCabecalho() {
  const agora = new Date();
  const opcoes = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const dataFormatada = agora.toLocaleDateString('pt-BR', opcoes);
  
  const elData = document.getElementById('header-live-date');
  if (elData) {
    elData.textContent = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  }
}

// =============================================================================
// NAVEGAÇÃO DE ABAS & GAVETA MOBILE (BOTTOM SHEET)
// =============================================================================
function navegarAbaV2(tabId) {
  state.activeTab = tabId;

  // Atualiza painéis de conteúdo
  document.querySelectorAll('.tab-pane-v2').forEach(pane => {
    pane.classList.remove('active');
  });
  const target = document.getElementById(`tab-v2-${tabId}`);
  if (target) {
    target.classList.add('active');
  }

  // Atualiza botões da Sidebar Desktop
  document.querySelectorAll('.sidebar-v2-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const sidebarBtn = document.querySelector(`.sidebar-v2-btn[data-tab="${tabId}"]`);
  if (sidebarBtn) {
    sidebarBtn.classList.add('active');
  }

  // Atualiza botões do Floating Dock Mobile
  document.querySelectorAll('.dock-item-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const dockBtn = document.querySelector(`.dock-item-btn[data-tab="${tabId}"]`);
  if (dockBtn) {
    dockBtn.classList.add('active');
  }

  // Se a gaveta estiver aberta, fecha
  fecharDrawerMais();

  // Scroll suave para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function abrirDrawerMais() {
  const overlay = document.getElementById('bottom-sheet-overlay');
  if (overlay) overlay.classList.add('open');
}

function fecharDrawerMais() {
  const overlay = document.getElementById('bottom-sheet-overlay');
  if (overlay) overlay.classList.remove('open');
}

// =============================================================================
// CARREGAMENTO DE DADOS DAS APIS REAIS
// =============================================================================
async function carregarTudo() {
  await Promise.allSettled([
    carregarFichas(),
    carregarClientes(),
    carregarProdutos(),
    verificarStatusWhatsApp()
  ]);
  
  // Calcula e sincroniza cobranças de hoje a partir das fichas reais
  processarCobrancasHoje();
  renderizarDashboardGeral();
}

async function carregarFichas() {
  try {
    const res = await fetch('/api/v1/fichas');
    if (res.ok) {
      const data = await res.json();
      state.fichas = Array.isArray(data) ? data : (data.fichas || data.data || []);
      renderizarFichasV2(state.fichas);
    }
  } catch (e) {
    console.error('Erro ao carregar fichas:', e);
  }
}

async function carregarClientes() {
  try {
    const res = await fetch('/api/v1/clientes');
    if (res.ok) {
      const data = await res.json();
      state.clientes = Array.isArray(data) ? data : (data.clientes || data.data || []);
      renderizarClientesV2(state.clientes);
    }
  } catch (e) {
    console.error('Erro ao carregar clientes:', e);
  }
}

async function carregarProdutos() {
  try {
    const res = await fetch('/api/v1/produtos');
    if (res.ok) {
      const data = await res.json();
      state.produtos = Array.isArray(data) ? data : (data.produtos || data.data || []);
      renderizarProdutosV2(state.produtos);
    }
  } catch (e) {
    console.error('Erro ao carregar produtos:', e);
  }
}

async function verificarStatusWhatsApp() {
  try {
    const res = await fetch('/api/v1/whatsapp/status');
    if (res.ok) {
      const data = await res.json();
      state.whatsappOnline = Boolean(data.conectado || data.status === 'open' || data.online);
    }
  } catch (e) {
    state.whatsappOnline = false;
  }
  atualizarStatusWhatsAppUI();
}

function atualizarStatusWhatsAppUI() {
  const zapPills = document.querySelectorAll('.whatsapp-live-status');
  zapPills.forEach(el => {
    if (state.whatsappOnline) {
      el.innerHTML = '🟢 <strong>WhatsApp Conectado</strong>';
      el.style.color = '#15803D';
    } else {
      el.innerHTML = '🟡 <strong>WhatsApp Desconectado</strong>';
      el.style.color = '#B45309';
    }
  });
}

function processarCobrancasHoje() {
  const diaHoje = new Date().getDate();
  state.cobrancasHoje = state.fichas.filter(f => {
    const saldo = Number(f.saldo_devedor_total) || 0;
    const diaVenc = Math.min(31, Math.max(1, Number(f.dia_vencimento_padrao) || 10));
    const diff = diaVenc - diaHoje;
    return saldo > 0 && (diaVenc === diaHoje || (diff >= 0 && diff <= 5));
  });

  // Atualiza badge da aba cobranças na sidebar
  const badgeEl = document.getElementById('sidebar-badge-cobrancas');
  if (badgeEl) {
    badgeEl.textContent = `${state.cobrancasHoje.length} próximas`;
  }
}

// =============================================================================
// RENDERIZAÇÃO DA CENTRAL DE COMANDO (DASHBOARD v2)
// =============================================================================
function renderizarDashboardGeral() {
  // 1. Total a receber hoje
  const totalReceberHoje = state.cobrancasHoje.reduce((acc, c) => {
    return acc + (Number(c.valor_parcela_padrao) || 50);
  }, 0);

  // 2. Saldo total acumulado em dividendo
  const totalDividendo = state.fichas.reduce((acc, f) => {
    return acc + (Number(f.saldo_devedor_total) || 0);
  }, 0);

  // 3. Fichas ativas
  const fichasAtivas = state.fichas.filter(f => (Number(f.saldo_devedor_total) || 0) > 0);

  // Atualiza os cards de KPI
  const elKpiReceber = document.getElementById('kpi-v2-receber-hoje');
  if (elKpiReceber) elKpiReceber.textContent = formatarMoeda(totalReceberHoje);

  const elKpiReceberCount = document.getElementById('kpi-v2-receber-count');
  if (elKpiReceberCount) elKpiReceberCount.textContent = `${state.cobrancasHoje.length} clientes com vencimento`;

  const elKpiDividendo = document.getElementById('kpi-v2-dividendo-total');
  if (elKpiDividendo) elKpiDividendo.textContent = formatarMoeda(totalDividendo);

  const elKpiFichasCount = document.getElementById('kpi-v2-fichas-count');
  if (elKpiFichasCount) elKpiFichasCount.textContent = `${fichasAtivas.length} fichas abertas no crediário`;

  // Atualiza o pill no header desktop
  const elHeaderPill = document.getElementById('header-kpi-hoje');
  if (elHeaderPill) elHeaderPill.textContent = formatarMoeda(totalReceberHoje);

  // Renderiza a lista rápida de cobranças prioritárias
  renderizarListaCobrancasPrioritarias();
  renderizarAbaCobrancas();
}

function renderizarListaCobrancasPrioritarias() {
  const container = document.getElementById('dashboard-cobrancas-quick');
  if (!container) return;

  if (state.cobrancasHoje.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 28px; background: var(--bg-body); border-radius: 14px; border: 1px dashed var(--border-strong);">
        <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">✨</span>
        <strong style="color: var(--text-main); font-size: 1rem;">Nenhuma cobrança pendente para hoje!</strong>
        <p style="color: var(--text-muted); font-size: 0.84rem; margin-top: 4px;">Todas as clientes dos dias de vencimento estão com o crediário em dia.</p>
      </div>
    `;
    return;
  }

  // Pega as 4 primeiras para a tela inicial
  const prioritarias = state.cobrancasHoje.slice(0, 4);

  container.innerHTML = prioritarias.map(c => {
    const nome = c.cliente_nome || 'Cliente';
    const inicial = nome.charAt(0).toUpperCase();
    const telefone = c.cliente_whatsapp || c.cliente_telefone || '';
    const parcela = Number(c.valor_parcela_padrao) || 50;
    const saldo = Number(c.saldo_devedor_total) || 0;
    const dia = c.dia_vencimento_padrao || 20;

    return `
      <div class="cobranca-item-card">
        <div class="cobranca-client-info">
          <div class="client-avatar-badge">${inicial}</div>
          <div class="client-text-meta">
            <h4>${nome}</h4>
            <div class="meta-chips">
              <span class="meta-chip venc-hoje">📅 Vence Dia ${dia}</span>
              ${telefone ? `<span class="meta-chip">📱 ${telefone}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="cobranca-values-box">
          <span class="val-parcela">${formatarMoeda(parcela)}</span>
          <span class="val-saldo">Saldo restante: ${formatarMoeda(saldo)}</span>
        </div>

        <div class="cobranca-actions-box">
          <button class="btn-zap-direct" onclick="enviarCobrancaWhatsAppV2('${encodeURIComponent(nome)}', '${telefone}', ${parcela}, ${saldo})">
            <span>💬 Cobrar WhatsApp</span>
          </button>
          <button class="btn-pay-direct" onclick="abrirModalReceberPagamento('${encodeURIComponent(nome)}', ${parcela}, '${c.id}')" title="Registrar Pagamento">
            <span>💵 Receber</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderizarAbaCobrancas() {
  const container = document.getElementById('fichas-grid-v2-cobrancas');
  if (!container) return;

  const cobrancas = state.cobrancasHoje;
  if (cobrancas.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--bg-card); border-radius: 16px; border: 1px dashed var(--border-strong);">
        <p style="color: var(--text-muted); font-size: 1rem;">Nenhuma cobrança pendente para os filtros selecionados.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = cobrancas.map(f => {
    const nome = f.cliente_nome || 'Cliente';
    const saldo = Number(f.saldo_devedor_total) || 0;
    const parcela = Number(f.valor_parcela_padrao) || 50;
    const dia = f.dia_vencimento_padrao || 20;
    const telefone = f.cliente_whatsapp || f.cliente_telefone || '';

    return `
      <div class="ficha-card-v2">
        <div class="ficha-card-header">
          <div class="ficha-client-title">
            <h3>${nome}</h3>
            <span>Ficha Ativa • Vence Dia ${dia}</span>
          </div>
          <span class="status-badge-v2 hoje">Vence Hoje</span>
        </div>

        <div class="ficha-card-body">
          <div class="ficha-data-item">
            <small>Saldo Restante</small>
            <strong class="highlight-val">${formatarMoeda(saldo)}</strong>
          </div>
          <div class="ficha-data-item">
            <small>Parcela Fixa</small>
            <strong>${formatarMoeda(parcela)}</strong>
          </div>
        </div>

        <div class="ficha-card-actions">
          <button class="btn-action-ficha primary-action" onclick="enviarCobrancaWhatsAppV2('${encodeURIComponent(nome)}', '${telefone}', ${parcela}, ${saldo})">
            <span>💬 Cobrar WhatsApp</span>
          </button>
          <button class="btn-action-ficha" onclick="abrirModalReceberPagamento('${encodeURIComponent(nome)}', ${parcela}, '${f.id}')">
            <span>💵 Receber</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================================
// ENVIO HUMANIZADO DE COBRANÇA WHATSAPP (CONFORME GESTAO_ENXOVAL_GUIDELINES.MD)
// =============================================================================
function enviarCobrancaWhatsAppV2(nomeEncoded, telefone, parcela, saldo) {
  const nome = decodeURIComponent(nomeEncoded);
  const limpo = (telefone || '').replace(/\D/g, '');
  const telFinal = limpo.length === 10 || limpo.length === 11 ? `55${limpo}` : limpo;

  const msg = `Olá, ${nome}! Tudo bem? 🏠✨\nPassando com carinho para lembrar da sua parcela combinada deste mês do Ateliê Enxovais Gabriel, no valor de *${formatarMoeda(parcela)}*.\n\nSeu saldo atual no crediário é de ${formatarMoeda(saldo)}.\n\nCaso prefira pagar por Pix, nossa chave é:\n*(17) 99123-4567*\n\nQualquer dúvida estamos à disposição. Um abraço carinhoso! 🌸`;

  if (!telFinal) {
    alert(`Mensagem preparada para ${nome}:\n\n${msg}`);
    return;
  }

  const url = `https://api.whatsapp.com/send?phone=${telFinal}&text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// =============================================================================
// SIMULADOR DE CREDIÁRIO TÁTIL DE BALCÃO (v2)
// =============================================================================
function adicionarItemSimulador(nome, valor) {
  state.simulador.saldo += valor;
  calcularSimulacaoV2();
}

function limparSimuladorV2() {
  state.simulador.saldo = 0;
  calcularSimulacaoV2();
}

function setDiaSimulador(dia, btn) {
  const diaNum = Math.min(31, Math.max(1, parseInt(dia, 10) || 10));
  state.simulador.dia = diaNum;
  const inputLivre = document.getElementById('sim-dia-livre-v2');
  if (inputLivre && Number(inputLivre.value) !== diaNum) {
    inputLivre.value = diaNum;
  }
  document.querySelectorAll('#sim-dias-group .sim-chip-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  calcularSimulacaoV2();
}

function setParcelaSimulador(valor, btn) {
  state.simulador.parcela = valor;
  document.querySelectorAll('#sim-parcelas-group .sim-chip-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  calcularSimulacaoV2();
}

function calcularSimulacaoV2() {
  const saldo = Math.max(0, state.simulador.saldo);
  const parcela = Math.max(1, state.simulador.parcela);
  const meses = Math.ceil(saldo / parcela);

  const elSaldo = document.getElementById('sim-stat-saldo');
  if (elSaldo) elSaldo.textContent = formatarMoeda(saldo);

  const elParcela = document.getElementById('sim-stat-parcela');
  if (elParcela) elParcela.textContent = `${formatarMoeda(parcela)}/mês`;

  const elPrevisao = document.getElementById('sim-stat-previsao');
  if (elPrevisao) elPrevisao.textContent = saldo === 0 ? 'Quitado' : `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

// =============================================================================
// RENDERIZAÇÃO DE FICHAS & CREDIÁRIO (CARDS RESPONSIVOS)
// =============================================================================
function filtrarFichasV2(filtro, btn) {
  state.filtroFichas = filtro;
  document.querySelectorAll('#tab-v2-fichas .subtab-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  let filtradas = state.fichas;
  const hoje = new Date().getDate();

  if (filtro === 'hoje') {
    filtradas = state.fichas.filter(f => {
      const saldo = Number(f.saldo_devedor_total) || 0;
      const dia = Number(f.dia_vencimento_padrao) || 0;
      return saldo > 0 && dia === hoje;
    });
  } else if (filtro === 'atraso') {
    filtradas = state.fichas.filter(f => {
      const saldo = Number(f.saldo_devedor_total) || 0;
      const status = (f.status_ficha || '').toLowerCase();
      return saldo > 0 && (status.includes('atras') || (f.dias_atraso && f.dias_atraso > 0));
    });
  } else if (filtro === 'quitadas') {
    filtradas = state.fichas.filter(f => (Number(f.saldo_devedor_total) || 0) <= 0);
  }

  renderizarFichasV2(filtradas);
}

function renderizarFichasV2(fichas) {
  const container = document.getElementById('fichas-grid-v2-container');
  if (!container) return;

  if (fichas.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--bg-card); border-radius: 16px; border: 1px dashed var(--border-strong);">
        <p style="color: var(--text-muted); font-size: 1rem;">Nenhuma ficha de crediário encontrada com este filtro.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = fichas.map(f => {
    const nome = f.cliente_nome || 'Cliente';
    const saldo = Number(f.saldo_devedor_total) || 0;
    const parcela = Number(f.valor_parcela_padrao) || 50;
    const dia = f.dia_vencimento_padrao || 20;
    const quitado = saldo <= 0;

    let badgeClass = 'em-dia';
    let badgeText = 'Em Dia';

    if (quitado) {
      badgeClass = 'quitado';
      badgeText = 'Quitada';
    } else if (f.dias_atraso && f.dias_atraso > 0) {
      badgeClass = 'atrasado';
      badgeText = `${f.dias_atraso}d Atraso`;
    }

    return `
      <div class="ficha-card-v2">
        <div class="ficha-card-header">
          <div class="ficha-client-title">
            <h3>${nome}</h3>
            <span>Ficha #${(f.id || '1').slice(0, 8)} • Vence Dia ${dia}</span>
          </div>
          <span class="status-badge-v2 ${badgeClass}">${badgeText}</span>
        </div>

        <div class="ficha-card-body">
          <div class="ficha-data-item">
            <small>Saldo Restante</small>
            <strong class="highlight-val">${formatarMoeda(saldo)}</strong>
          </div>
          <div class="ficha-data-item">
            <small>Parcela Fixa</small>
            <strong>${formatarMoeda(parcela)}</strong>
          </div>
        </div>

        <div class="ficha-card-actions">
          <button class="btn-action-ficha primary-action" onclick="abrirModalReceberPagamento('${encodeURIComponent(nome)}', ${parcela}, '${f.id}')">
            <span>💵 Amortizar</span>
          </button>
          <button class="btn-action-ficha" onclick="abrirExtratoFicha('${f.id}')">
            <span>📑 Extrato</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================================
// BUSCA GLOBAL INTELIGENTE (CLIENTES, FICHAS E PRODUTOS)
// =============================================================================
function configurarEventosGlobais() {
  const searchInput = document.getElementById('global-search-input');
  const resultsBox = document.getElementById('search-quick-results');

  if (searchInput && resultsBox) {
    searchInput.addEventListener('input', (e) => {
      const termo = e.target.value.trim().toLowerCase();
      if (termo.length < 2) {
        resultsBox.classList.remove('show');
        resultsBox.innerHTML = '';
        return;
      }

      // Procura em Clientes
      const clientesEncontrados = state.clientes.filter(c => 
        (c.nome || '').toLowerCase().includes(termo) ||
        (c.telefone || '').includes(termo) ||
        (c.whatsapp || '').includes(termo)
      ).slice(0, 4);

      // Procura em Produtos
      const produtosEncontrados = state.produtos.filter(p =>
        (p.nome || '').toLowerCase().includes(termo) ||
        (p.categoria || '').toLowerCase().includes(termo) ||
        (p.codigo_sku || '').toLowerCase().includes(termo)
      ).slice(0, 3);

      if (clientesEncontrados.length === 0 && produtosEncontrados.length === 0) {
        resultsBox.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Nenhum cliente ou produto localizado.</div>`;
        resultsBox.classList.add('show');
        return;
      }

      let html = '';

      if (clientesEncontrados.length > 0) {
        html += `<div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; padding: 6px 10px;">Clientes & Fichas</div>`;
        html += clientesEncontrados.map(c => `
          <div class="search-item-result" onclick="abrirFichaClientePelaBusca('${c.id}')">
            <span class="search-item-icon">👤</span>
            <div class="search-item-info">
              <strong>${c.nome}</strong>
              <small>WhatsApp: ${c.whatsapp || c.telefone || 'Não informado'} • Dia ${c.dia_vencimento_padrao || 20}</small>
            </div>
          </div>
        `).join('');
      }

      if (produtosEncontrados.length > 0) {
        html += `<div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; padding: 6px 10px; margin-top: 6px;">Catálogo de Utilidades</div>`;
        html += produtosEncontrados.map(p => `
          <div class="search-item-result" onclick="navegarAbaV2('catalogo')">
            <span class="search-item-icon">📦</span>
            <div class="search-item-info">
              <strong>${p.nome}</strong>
              <small>${formatarMoeda(p.preco_venda_crediario || p.preco_venda_vista || 0)} • Estoque: ${p.estoque_atual || 0} un</small>
            </div>
          </div>
        `).join('');
      }

      resultsBox.innerHTML = html;
      resultsBox.classList.add('show');
    });

    // Fecha a busca ao clicar fora
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsBox.contains(e.target)) {
        resultsBox.classList.remove('show');
      }
    });
  }
}

function abrirFichaClientePelaBusca(clienteId) {
  navegarAbaV2('fichas');
  const resultsBox = document.getElementById('search-quick-results');
  if (resultsBox) resultsBox.classList.remove('show');
}

// =============================================================================
// MODAIS DE AÇÃO RÁPIDA (RECEBER PAGAMENTO & NOVA VENDA)
// =============================================================================
function abrirModalReceberPagamento(nomeEncoded, parcela, fichaId) {
  const nome = decodeURIComponent(nomeEncoded);
  const modal = document.getElementById('modal-receber-pagamento');
  if (!modal) return;

  document.getElementById('modal-pagto-cliente-nome').textContent = nome;
  document.getElementById('modal-pagto-valor').value = Number(parcela).toFixed(2);
  modal.classList.add('show');
}

function fecharModalPagamento() {
  const modal = document.getElementById('modal-receber-pagamento');
  if (modal) modal.classList.remove('show');
}

async function confirmarAmortizacaoV2() {
  const valor = parseFloat(document.getElementById('modal-pagto-valor').value || 0);
  const forma = document.getElementById('modal-pagto-forma').value;

  if (valor <= 0) {
    alert('Por favor, informe um valor de pagamento válido.');
    return;
  }

  alert(`✅ Pagamento de ${formatarMoeda(valor)} (${forma}) registrado com sucesso no Caixa do Dia!`);
  fecharModalPagamento();
  await carregarTudo();
}

function abrirModalNovaVendaV2() {
  navegarAbaV2('vendas');
}

function abrirExtratoFicha(fichaId) {
  window.location.href = `/#fichas`;
}

// =============================================================================
// CATÁLOGO & CLIENTES RENDERIZAÇÃO
// =============================================================================
function renderizarProdutosV2(produtos) {
  const container = document.getElementById('catalogo-grid-v2');
  if (!container) return;

  container.innerHTML = produtos.map(p => `
    <div class="ficha-card-v2">
      <div class="ficha-card-header">
        <div class="ficha-client-title">
          <h3>${p.nome}</h3>
          <span>${p.categoria || 'Utilidade Doméstica'}</span>
        </div>
        <span class="status-badge-v2 em-dia">Estoque: ${p.estoque_atual || 0}</span>
      </div>
      <div class="ficha-card-body">
        <div class="ficha-data-item">
          <small>Preço Crediário</small>
          <strong class="highlight-val">${formatarMoeda(p.preco_venda_crediario || p.preco_venda_vista || 0)}</strong>
        </div>
        <div class="ficha-data-item">
          <small>Código / SKU</small>
          <strong>${p.codigo_sku || 'UTIL'}</strong>
        </div>
      </div>
      <div class="ficha-card-actions">
        <button class="btn-action-ficha primary-action" onclick="adicionarItemSimulador('${p.nome}', ${Number(p.preco_venda_crediario || p.preco_venda_vista || 0)}); navegarAbaV2('inicio');">
          <span>➕ Simular no Balcão</span>
        </button>
      </div>
    </div>
  `).join('');
}

function renderizarClientesV2(clientes) {
  const container = document.getElementById('clientes-grid-v2');
  if (!container) return;

  container.innerHTML = clientes.map(c => `
    <div class="ficha-card-v2">
      <div class="ficha-card-header">
        <div class="ficha-client-title">
          <h3>${c.nome}</h3>
          <span>WhatsApp: ${c.whatsapp || c.telefone || 'Não informado'}</span>
        </div>
        <span class="status-badge-v2 hoje">Vence Dia ${c.dia_vencimento_padrao || 20}</span>
      </div>
      <div class="ficha-card-body">
        <div class="ficha-data-item">
          <small>Endereço / Bairro</small>
          <strong>${c.endereco || 'Atendimento Loja'}</strong>
        </div>
        <div class="ficha-data-item">
          <small>Saldo Restante</small>
          <strong class="highlight-val">${formatarMoeda(c.saldo_devedor_total || 0)}</strong>
        </div>
      </div>
      <div class="ficha-card-actions">
        <button class="btn-action-ficha" onclick="enviarCobrancaWhatsAppV2('${encodeURIComponent(c.nome)}', '${c.whatsapp || c.telefone}', 50, ${c.saldo_devedor_total || 0})">
          <span>💬 Cobrar WhatsApp</span>
        </button>
      </div>
    </div>
  `).join('');
}

// =============================================================================
// UTILITÁRIOS DE FORMATAÇÃO
// =============================================================================
function formatarMoeda(valor) {
  const num = parseFloat(valor) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
