
const ctx = document.getElementById('graficoPedidos');
const chartCaption = document.getElementById('chartCaption');
const metricSelect = document.getElementById('metricSelect');
const periodoSelect = document.getElementById('periodoSelect');
const periodoSelectBtn = document.getElementById('periodoSelectBtn');
const metricSelectBtn = document.getElementById('metricSelectBtn');
const statAcessosLabel = document.getElementById('statAcessosLabel');
const statAcessosValor = document.getElementById('statAcessosValor');
const statPedidosLabel = document.getElementById('statPedidosLabel');
const statPedidosValor = document.getElementById('statPedidosValor');
const statReceitaLabel = document.getElementById('statReceitaLabel');
const statReceitaValor = document.getElementById('statReceitaValor');

function fecharSelects(){
  document.querySelectorAll('.dash-select.open').forEach(el => {
    el.classList.remove('open');
    const btn = el.querySelector('.dash-select-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
}

function initDashSelect(selectId, btnId){
  const select = document.getElementById(selectId);
  const btn = document.getElementById(btnId);
  if (!select || !btn) return;
  const wrap = btn.closest('.dash-select');
  const menu = wrap ? wrap.querySelector('.dash-select-menu') : null;
  const sync = () => {
    const opt = select.options[select.selectedIndex];
    if (opt) btn.textContent = opt.textContent.trim();
    if (menu) {
      menu.querySelectorAll('button[data-value]').forEach(item => {
        item.classList.toggle('is-selected', item.dataset.value === select.value);
      });
    }
  };
  sync();
  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (!wrap) return;
    const isOpen = wrap.classList.contains('open');
    fecharSelects();
    wrap.classList.toggle('open', !isOpen);
    btn.setAttribute('aria-expanded', (!isOpen).toString());
  });
  if (menu) {
    menu.addEventListener('click', e => {
      const item = e.target.closest('button[data-value]');
      if (!item) return;
      select.value = item.dataset.value;
      select.dispatchEvent(new Event('change'));
      sync();
      fecharSelects();
    });
  }
  select.addEventListener('change', sync);
}

document.addEventListener('click', () => fecharSelects());

initDashSelect('periodoSelect', 'periodoSelectBtn');
initDashSelect('metricSelect', 'metricSelectBtn');

const datasetsMap = {
  pedidos: {
    label: 'Pedidos',
    data: seriePedidos,
    borderColor: '#6366f1',
    fillColor: { start:'rgba(99,102,241,0.28)', end:'rgba(99,102,241,0)' }
  },
  faturamento: {
    label: 'Faturamento',
    data: serieValores,
    borderColor: '#9C5523',
    fillColor: { start:'rgba(156,85,35,0.22)', end:'rgba(156,85,35,0)' }
  }
};

Chart.defaults.font.family = 'Manrope, sans-serif';
Chart.defaults.color = '#64748b';

function criarGradiente(fillColor){
  const canvas = ctx;
  const grafCtx = canvas.getContext('2d');
  const grad = grafCtx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 320);
  const c = typeof fillColor === 'object' ? fillColor : { start: fillColor, end: 'rgba(255,255,255,0)' };
  grad.addColorStop(0, c.start);
  grad.addColorStop(1, c.end);
  return grad;
}

function formatarMoeda(valor){
  const numero = Number(valor || 0);
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function atualizarLegenda(tipo){
  const texto = tipo === 'pedidos'
    ? `Voce esta vendo os pedidos recebidos na sua loja nos ultimos ${periodoAtual} dias`
    : `Voce esta vendo o faturamento recebido na sua loja nos ultimos ${periodoAtual} dias`;
  if (chartCaption) {
    chartCaption.textContent = texto;
  }
}

function atualizarGrafico(tipo){
  /* Animação suave ao trocar métricas */
  const dataset = datasetsMap[tipo];
  grafico.data.datasets[0].data = dataset.data;
  grafico.data.datasets[0].label = dataset.label;
  grafico.data.datasets[0].borderColor = dataset.borderColor;
  grafico.data.datasets[0].backgroundColor = criarGradiente(dataset.fillColor);
  grafico.data.datasets[0].pointBackgroundColor = dataset.borderColor;
  grafico.data.datasets[0].pointHoverBorderColor = dataset.borderColor;
  grafico.update({ duration: 600, easing: 'easeInOutCubic' });
}

function atualizarStats(payload){
  if (statAcessosLabel) {
    statAcessosLabel.textContent = `acessos ao seu menu nos ultimos ${periodoAtual} dias`;
  }
  if (statPedidosLabel) {
    statPedidosLabel.textContent = `vendas realizadas nos ultimos ${periodoAtual} dias`;
  }
  if (statReceitaLabel) {
    statReceitaLabel.textContent = `recebeu em vendas nos ultimos ${periodoAtual} dias`;
  }
  if (statAcessosValor && payload && payload.acessos_menu !== undefined) {
    statAcessosValor.textContent = payload.acessos_menu;
  }
  if (statPedidosValor && payload && payload.total_pedidos !== undefined) {
    statPedidosValor.textContent = payload.total_pedidos;
  }
  if (statReceitaValor && payload && payload.total_receita !== undefined) {
    statReceitaValor.textContent = formatarMoeda(payload.total_receita);
  }
}

const pluginLabels = {
  id: 'valueLabels',
  afterDatasetsDraw(chart){
    const { ctx: chartCtx } = chart;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data) return;

    chartCtx.save();
    chartCtx.font = '11px Manrope, sans-serif';
    chartCtx.textAlign = 'center';
    chartCtx.textBaseline = 'middle';

    meta.data.forEach((point, index) => {
      const valor = dataset.data[index];
      if (valor === null || valor === undefined) return;
      const texto = dataset.label === 'Faturamento'
        ? `R$ ${Number(valor).toFixed(0)}`
        : `${valor}`;
      const paddingX = 6;
      const paddingY = 4;
      const metrics = chartCtx.measureText(texto);
      const width = metrics.width + paddingX * 2;
      const height = 18;
      const x = point.x;
      const y = point.y - 14;
      const radius = 6;

      chartCtx.fillStyle = dataset.borderColor;
      chartCtx.beginPath();
      chartCtx.moveTo(x - width / 2 + radius, y - height / 2);
      chartCtx.lineTo(x + width / 2 - radius, y - height / 2);
      chartCtx.quadraticCurveTo(x + width / 2, y - height / 2, x + width / 2, y - height / 2 + radius);
      chartCtx.lineTo(x + width / 2, y + height / 2 - radius);
      chartCtx.quadraticCurveTo(x + width / 2, y + height / 2, x + width / 2 - radius, y + height / 2);
      chartCtx.lineTo(x - width / 2 + radius, y + height / 2);
      chartCtx.quadraticCurveTo(x - width / 2, y + height / 2, x - width / 2, y + height / 2 - radius);
      chartCtx.lineTo(x - width / 2, y - height / 2 + radius);
      chartCtx.quadraticCurveTo(x - width / 2, y - height / 2, x - width / 2 + radius, y - height / 2);
      chartCtx.closePath();
      chartCtx.fill();

      chartCtx.fillStyle = '#fff';
      chartCtx.fillText(texto, x, y + 0.5);
    });

    chartCtx.restore();
  }
};

let grafico = new Chart(ctx, {
  type: 'line',
  data: {
    labels,
    datasets: [{
      ...datasetsMap.pedidos,
      backgroundColor: criarGradiente(datasetsMap.pedidos.fillColor),
      fill: true,
      tension: 0.45,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderWidth: 2.5,
      pointBackgroundColor: datasetsMap.pedidos.borderColor,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 900,
      easing: 'easeInOutQuart',
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,.05)', drawBorder: false },
        border: { display: false },
        ticks: { font: { size: 11 }, padding: 8 }
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 11 }, padding: 4 }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,.88)',
        titleColor: '#f1f5f9',
        bodyColor: '#e2e8f0',
        padding: 12,
        cornerRadius: 10,
        displayColors: false,
        titleFont: { size: 12, weight: '700' },
        bodyFont: { size: 13, weight: '800' },
        callbacks: {
          label: (ctx) => ` ${ctx.formattedValue}`
        }
      }
    }
  },
  plugins: [pluginLabels]
});

metricSelect.addEventListener('change', () => {
  const tipo = metricSelect.value;
  atualizarGrafico(tipo);
  atualizarLegenda(tipo);
});

async function carregarPeriodo(novoPeriodo){
  if (!periodoSelect) return;
  periodoSelect.disabled = true;
  metricSelect.disabled = true;
  if (periodoSelectBtn) periodoSelectBtn.disabled = true;
  if (metricSelectBtn) metricSelectBtn.disabled = true;

  try {
    const response = await fetch(`./api/dashboard_metrics.php?periodo=${encodeURIComponent(novoPeriodo)}`, {
      headers: { 'Accept': 'application/json' }
    });
    const payload = await response.json();
    if (!payload || !payload.ok) {
      throw new Error('Resposta invalida');
    }

    periodoAtual = payload.periodo || Number(novoPeriodo);
    labels = payload.labels || [];
    seriePedidos = payload.pedidos || [];
    serieValores = payload.valores || [];

    datasetsMap.pedidos.data = seriePedidos;
    datasetsMap.faturamento.data = serieValores;

    grafico.data.labels = labels;
    atualizarGrafico(metricSelect.value);
    atualizarLegenda(metricSelect.value);
    atualizarStats(payload);
  } catch (err) {
    console.warn('Falha ao atualizar o periodo, recarregando.', err);
    const params = new URLSearchParams(window.location.search);
    params.set('periodo', novoPeriodo);
    window.location.search = params.toString();
  } finally {
    periodoSelect.disabled = false;
    metricSelect.disabled = false;
    if (periodoSelectBtn) periodoSelectBtn.disabled = false;
    if (metricSelectBtn) metricSelectBtn.disabled = false;
  }
}

periodoSelect.addEventListener('change', () => {
  carregarPeriodo(periodoSelect.value);
});

atualizarLegenda(metricSelect.value);

const btnCopiarLink = document.getElementById('btnCopiarLink');
const linkLojaInput = document.getElementById('linkLojaInput');
if (btnCopiarLink && linkLojaInput) {
  btnCopiarLink.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(linkLojaInput.value);
      btnCopiarLink.innerHTML = '<i class="bi bi-check2"></i>';
      setTimeout(() => {
        btnCopiarLink.innerHTML = '<i class="bi bi-clipboard"></i>';
      }, 1200);
    } catch (e) {
      linkLojaInput.select();
      document.execCommand('copy');
    }
  });
}

const versiculoTexto = document.getElementById('versiculoTexto');
const versiculoRef = document.getElementById('versiculoRef');
const versiculoMeta = document.getElementById('versiculoMeta');
const shareIg = document.querySelector('.dash-verse-share .share-ig');
const shareCopy = document.querySelector('.dash-verse .share-copy');
const btnVersoGostou = document.getElementById('btnVersoGostou');
const btnVersoNaoGostou = document.getElementById('btnVersoNaoGostou');
let versiculoAtual = {
  data: versiculoTexto?.dataset?.data || '',
  texto: versiculoTexto?.dataset?.texto || '',
  referencia: versiculoTexto?.dataset?.ref || ''
};

function formatarDataExtenso(data){
  if (!(data instanceof Date)) return '';
  const texto = data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  return texto;
}

if (versiculoMeta) {
  versiculoMeta.textContent = formatarDataExtenso(new Date());
}

async function carregarVersiculo(){
  if (!versiculoTexto) return;
  try {
    const response = await fetch('./api/versiculo_dia.php?force=1', { cache: 'no-store' });
    const payload = await response.json();
    if (payload && payload.ok) {
      const versoTexto = payload.texto || 'Versiculo indisponivel.';
      versiculoAtual = {
        data: payload.data || '',
        texto: versoTexto,
        referencia: payload.referencia || ''
      };
      const temAspas = /^["â€œâ€'â€˜â€™]/.test(versoTexto.trim());
      versiculoTexto.textContent = temAspas ? versoTexto : `"${versoTexto}"`;
      if (versiculoRef) {
        const ref = payload.referencia || '';
        versiculoRef.textContent = ref ? ref : '';
        versiculoRef.href = ref
          ? `https://www.bibliaon.com/busca/?q=${encodeURIComponent(ref)}`
          : 'https://www.bibliaon.com/versiculo_do_dia/';
      }
      if (versiculoMeta) {
        const dataTexto = formatarDataExtenso(new Date());
        versiculoMeta.textContent = dataTexto;
      }
      if (btnVersoGostou && btnVersoNaoGostou) {
        btnVersoGostou.classList.toggle('is-active', payload.reacao === 'gostou');
        btnVersoNaoGostou.classList.toggle('is-active', payload.reacao === 'nao_gostou');
      }
      if (shareIg) {
        shareIg.href = 'https://www.instagram.com/';
        shareIg.dataset.shareTexto = `${versoTexto} ${versiculoRef?.textContent || ''}`.trim();
        shareIg.dataset.shareUrl = versiculoRef?.href || 'https://www.bibliaon.com/versiculo_do_dia/';
      }
      return;
    }
    if (!versiculoTexto.dataset.hasCache || versiculoTexto.dataset.hasCache === '0') {
      versiculoTexto.textContent = payload?.msg || 'Versiculo indisponivel.';
    }
  } catch (err) {
    if (!versiculoTexto.dataset.hasCache || versiculoTexto.dataset.hasCache === '0') {
      versiculoTexto.textContent = 'Sem conexao para atualizar.';
    }
  }
}

window.addEventListener('online', carregarVersiculo);
carregarVersiculo();

if (shareIg) {
  shareIg.addEventListener('click', async () => {
    const texto = shareIg.dataset.shareTexto || versiculoTexto?.textContent || '';
    const url = shareIg.dataset.shareUrl || versiculoRef?.href || '';
    const mensagem = `${texto} ${url}`.trim();
    if (mensagem) {
      try {
        await navigator.clipboard.writeText(mensagem);
      } catch (err) {
        const tmp = document.createElement('textarea');
        tmp.value = mensagem;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }
    }
    const toast = document.createElement('div');
    toast.className = 'toast-custom';
    toast.textContent = 'Copiado!';
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('fade-out'), 1300);
    setTimeout(() => toast.remove(), 1700);
  });
}

if (shareCopy) {
  shareCopy.addEventListener('click', async () => {
    const textoBase = versiculoAtual?.texto || versiculoTexto?.textContent || '';
    const texto = textoBase.replace(/^["â€œâ€'â€˜â€™]/, '').replace(/["â€œâ€'â€˜â€™]$/, '').trim();
    const ref = (versiculoAtual?.referencia || versiculoRef?.textContent || '').trim();
    const mensagem = ref ? `${texto} ${ref}`.trim() : texto;
    if (mensagem) {
      try {
        await navigator.clipboard.writeText(mensagem);
      } catch (err) {
        const tmp = document.createElement('textarea');
        tmp.value = mensagem;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }
      const toast = document.createElement('div');
      toast.className = 'toast-custom';
      toast.textContent = 'Copiado!';
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add('fade-out'), 1300);
      setTimeout(() => toast.remove(), 1700);
    }
  });
}

async function carregarReacaoAtual(){
  if (!versiculoAtual.data) return;
  try {
    const response = await fetch(`./api/versiculo_reacao_get.php?data=${encodeURIComponent(versiculoAtual.data)}`);
    const payload = await response.json();
    if (payload && payload.ok && btnVersoGostou && btnVersoNaoGostou) {
      btnVersoGostou.classList.toggle('is-active', payload.reacao === 'gostou');
      btnVersoNaoGostou.classList.toggle('is-active', payload.reacao === 'nao_gostou');
    }
  } catch (err) {
    console.warn('Falha ao carregar reacao.', err);
  }
}

carregarReacaoAtual();

async function registrarReacaoVersiculo(tipo){
  if (!tipo) return;
  const params = new URLSearchParams();
  params.set('reacao', tipo);
  if (versiculoAtual.data) params.set('data', versiculoAtual.data);
  if (versiculoAtual.referencia) params.set('referencia', versiculoAtual.referencia);
  if (versiculoAtual.texto) params.set('texto', versiculoAtual.texto);

  try {
    const response = await fetch('./api/versiculo_reacao.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const payload = await response.json();
    if (!payload || !payload.ok) {
      throw new Error(payload?.msg || 'Erro ao salvar');
    }
    if (btnVersoGostou && btnVersoNaoGostou) {
      btnVersoGostou.classList.toggle('is-active', tipo === 'gostou');
      btnVersoNaoGostou.classList.toggle('is-active', tipo === 'nao_gostou');
    }
  } catch (err) {
    console.warn('Falha ao registrar reacao do versiculo.', err);
  }
}

function animarBotaoVerso(btn){
  btn.classList.remove('verse-clicked');
  void btn.offsetWidth;
  btn.classList.add('verse-clicked');
  btn.addEventListener('animationend', () => btn.classList.remove('verse-clicked'), {once:true});
}
if (btnVersoGostou) {
  btnVersoGostou.addEventListener('click', () => { animarBotaoVerso(btnVersoGostou); registrarReacaoVersiculo('gostou'); });
}
if (btnVersoNaoGostou) {
  btnVersoNaoGostou.addEventListener('click', () => { animarBotaoVerso(btnVersoNaoGostou); registrarReacaoVersiculo('nao_gostou'); });
}

/* Garante que o sidebar sempre inicia no topo */
(function(){
  const sb = document.getElementById('sidebar');
  if (sb) sb.scrollTop = 0;
})();

/* ══ FUNIL DE CONVERSÃO ══ */
const FUNIL_CORES = [
  { id:'fgA', c1:'#7c3aed', c2:'#a78bfa' },
  { id:'fgB', c1:'#4f46e5', c2:'#818cf8' },
  { id:'fgC', c1:'#2563eb', c2:'#60a5fa' },
  { id:'fgD', c1:'#0891b2', c2:'#67e8f9' },
];

function funilWave(pct, cor) {
  /*
   * ViewBox fixo: 400 × 200
   * A onda começa na esquerda numa altura proporcional ao %
   * e desce suavemente em curva S até a direita.
   * pct=100 → top≈12px   pct=0 → top≈195px
   */
  const VW = 400, VH = 200;
  const topMin = 12, topMax = 195;
  const y = topMin + ((100 - pct) / 100) * (topMax - topMin);

  /* Bezier que cria a curva S suave do print */
  const cp1x = VW * 0.30, cp1y = y - 14;
  const cp2x = VW * 0.65, cp2y = y + 18;
  const endY  = Math.min(VH - 2, y + 8);

  const path = `M0,${y.toFixed(1)} C${cp1x},${cp1y.toFixed(1)} ${cp2x},${cp2y.toFixed(1)} ${VW},${endY.toFixed(1)} L${VW},${VH} L0,${VH} Z`;

  return `<svg class="funil-wave" viewBox="0 0 ${VW} ${VH}" height="100%"
      style="display:block;width:100%;flex:1;min-height:60px"
      preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${cor.id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${cor.c1}" stop-opacity=".88"/>
        <stop offset="100%" stop-color="${cor.c2}" stop-opacity=".70"/>
      </linearGradient>
    </defs>
    <path d="${path}" fill="url(#${cor.id})"/>
  </svg>`;
}

async function carregarFunil() {
  const dias  = '7';
  const grid  = document.getElementById('funilGrid');
  const badge = document.getElementById('funilBadge');
  if (!grid) return;
  grid.innerHTML = '<div class="funil-loading"><i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite;display:inline-block"></i> Carregando...</div>';
  if (badge) badge.style.display = 'none';
  try {
    const r = await fetch(`api/funil_conversao.php?dias=${dias}`, {credentials:'same-origin'});
    const d = await r.json();
    if (!d.ok) { grid.innerHTML='<div class="funil-loading" style="color:#e11d48">Erro ao carregar dados.</div>'; return; }

    const etapas = [
      { label:'Visitas',               val:d.visitas,   pct:100,            desc:`${d.visitas.toLocaleString('pt-BR')} acessos na sua loja` },
      { label:'Visualizações de itens',val:d.views,     pct:d.pct_views,    desc:`${d.views.toLocaleString('pt-BR')} pessoas visualizaram algum item` },
      { label:'Carrinho',              val:d.carrinhos, pct:d.pct_carrinhos,desc:`${d.carrinhos.toLocaleString('pt-BR')} pessoas adicionaram algum item` },
      { label:'Pedidos',               val:d.pedidos,   pct:d.pct_pedidos,  desc:`${d.pedidos.toLocaleString('pt-BR')} pessoas realizaram o pedido` },
    ];

    grid.innerHTML = etapas.map((e,i) => {
      const cor = FUNIL_CORES[i];
      return `<div class="funil-card">
        <div class="funil-card-top">
          <span class="funil-card-label">${e.label}</span>
          <span class="funil-card-pct">${e.pct}%</span>
        </div>
        <div class="funil-card-value">${e.val.toLocaleString('pt-BR')}</div>
        <div class="funil-card-desc">${e.desc}</div>
        ${funilWave(e.pct, cor)}
      </div>`;
    }).join('');

    /* Badge de taxa de conversão */
    const pctEl = document.getElementById('funilBadgePct');
    const subEl = document.getElementById('funilBadgeSub');
    if (pctEl) pctEl.textContent = `${d.conversao}%`;
    if (subEl) subEl.textContent = `nos últimos ${dias} dias`;
    if (badge) badge.style.display = '';

  } catch(e) {
    grid.innerHTML='<div class="funil-loading" style="color:#e11d48">Erro de conexão.</div>';
  }
}

carregarFunil();
/* ── Busca de páginas do sistema ── */
(function(){
  const paginas = [
    { nome:'Dashboard',             url:'dashboard.php',               icone:'bi-speedometer2' },
    { nome:'Pedidos',               url:'pedidos.php',                 icone:'bi-bag' },
    { nome:'Gestor de Pedidos',     url:'gestor_pedidos.php',          icone:'bi-kanban' },
    { nome:'Produtos',              url:'produtos.php',                icone:'bi-box-seam' },
    { nome:'Clientes',              url:'clientes.php',                icone:'bi-people' },
    { nome:'Estoque',               url:'estoque.php',                 icone:'bi-archive' },
    { nome:'Orçamentos',            url:'orcamentos.php',              icone:'bi-file-earmark-text' },
    { nome:'Cupons',                url:'cupons.php',                  icone:'bi-ticket-perforated' },
    { nome:'Configurações',         url:'configuracoes.php',           icone:'bi-gear' },
    { nome:'Controle de Caixa',     url:'controle_caixa.php',         icone:'bi-cash-coin' },
    { nome:'Financeiro Dashboard',  url:'financeiro_dashboard.php',    icone:'bi-graph-up-arrow' },
    { nome:'Lançamentos',           url:'financeiro_lancamentos.php',  icone:'bi-journal-text' },
    { nome:'DRE',                   url:'financeiro_dre.php',          icone:'bi-bar-chart-line' },
    { nome:'Relatórios',            url:'relatorios.php',              icone:'bi-file-earmark-bar-graph' },
    { nome:'Relatório Clientes',    url:'relatorios_clientes.php',     icone:'bi-person-lines-fill' },
    { nome:'Relatório Fidelidade',  url:'relatorios_fidelidade.php',   icone:'bi-star' },
    { nome:'Lojas',                 url:'superadmin/dashboard.php',    icone:'bi-shop' },
    { nome:'PDV',                   url:'pdv.php',                     icone:'bi-display' },
    { nome:'Avaliações',            url:'avaliacoes.php',              icone:'bi-chat-square-text' },
  ];

  const input    = document.getElementById('dashNavSearchInput');
  const dropdown = document.getElementById('dashNavDropdown');
  const wrap     = document.getElementById('dashNavSearchWrap');
  if (!input || !dropdown) return;

  let activeIdx = -1;

  function render(lista) {
    if (!lista.length) {
      dropdown.innerHTML = '<div class="dash-nav-search-empty">Nenhuma página encontrada.</div>';
      dropdown.classList.add('show');
      return;
    }
    dropdown.innerHTML = lista.map((p, i) =>
      `<a class="dash-nav-search-item" href="${p.url}" data-idx="${i}">
         <i class="bi ${p.icone}"></i>
         <span>${p.nome}</span>
       </a>`
    ).join('');
    dropdown.classList.add('show');
    activeIdx = -1;
  }

  function fechar() {
    dropdown.classList.remove('show');
    activeIdx = -1;
  }

  input.addEventListener('input', () => {
    const termo = input.value.trim().toLowerCase();
    if (!termo) { fechar(); return; }
    const resultado = paginas.filter(p => p.nome.toLowerCase().includes(termo));
    render(resultado);
  });

  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.dash-nav-search-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0) { e.preventDefault(); items[activeIdx].click(); }
      return;
    } else if (e.key === 'Escape') {
      fechar(); return;
    }
    items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
    if (activeIdx >= 0) items[activeIdx].scrollIntoView({ block:'nearest' });
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target) && !dropdown.contains(e.target)) fechar();
  });

  // Mostrar todas ao focar sem texto
  input.addEventListener('focus', () => {
    if (!input.value.trim()) render(paginas);
  });
})();
