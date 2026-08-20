const relatorioBody = document.getElementById('relatorioBody');
const formFiltro = document.getElementById('formFiltro');
const dataInicio = document.getElementById('dataInicio');
const dataFim = document.getElementById('dataFim');
const statusSelect = document.getElementById('statusSelect');
const tipoSelect = document.getElementById('tipoSelect');
const pagamentoSelect = document.getElementById('pagamentoSelect');
const periodoSelect = document.getElementById('periodoSelect');
const btnRangeCalendar = document.getElementById('btnRangeCalendar');
const rangePeriodo = document.getElementById('rangePeriodo');
const btnExportCsv = document.getElementById('btnExportCsv');
const btnExportPdf = document.getElementById('btnExportPdf');
let paginaAtual = RELATORIOS_DATA.paginaAtual;
let filtroTimer = null;
let chartProdutosInst = null;
let chartClientesInst = null;

function buildParams(pagina){
  const params = new URLSearchParams();
  const periodo = periodoSelect ? periodoSelect.value : '';
  const hoje = formatarDataInput(new Date());
  const inicioValor = dataInicio && dataInicio.value ? dataInicio.value : '';
  const fimValor = dataFim && dataFim.value ? dataFim.value : '';
  if (periodo === 'hoje' && (!inicioValor || !fimValor)) {
    params.set('inicio', hoje);
    params.set('fim', hoje);
  } else {
    if (inicioValor) params.set('inicio', inicioValor);
    if (fimValor) params.set('fim', fimValor);
  }
  if (statusSelect && statusSelect.value && statusSelect.value !== 'todos') {
    params.set('status', statusSelect.value);
  }
  if (tipoSelect && tipoSelect.value) params.set('tipo', tipoSelect.value);
  if (pagamentoSelect && pagamentoSelect.value) params.set('pagamento', pagamentoSelect.value);
  if (periodo) {
    params.set('periodo', periodo);
  }
  if (pagina) params.set('pagina', pagina);
  const relLimiteSelect = document.getElementById('relLimiteSelect');
  if (relLimiteSelect) params.set('limite', relLimiteSelect.value);
  return params;
}

function toggleSection(section, show){
  if (!section) return;
  section.style.display = show ? '' : 'none';
}

function atualizarSplitSection(section){
  if (!section) return;
  const cards = Array.from(section.querySelectorAll('.relatorio-card'));
  const algumVisivel = cards.some(card => card.style.display !== 'none');
  section.style.display = algumVisivel ? '' : 'none';
}

function atualizarVisibilidadePeriodo(){
  if (!rangePeriodo || !periodoSelect) return;
  const custom = periodoSelect.value === 'customizado';
  rangePeriodo.style.display = custom ? '' : 'none';
}

function formatarDataInput(data){
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function limparPeriodoInputs(){
  if (dataInicio) dataInicio.value = '';
  if (dataFim) dataFim.value = '';
}

function agendarAtualizacao(){
  if (filtroTimer) clearTimeout(filtroTimer);
  filtroTimer = setTimeout(() => {
    carregarRelatorio(1);
  }, 150);
}

function atualizarLinksExport(params){
  if (!btnExportCsv || !btnExportPdf) return;
  const query = params.toString();
  btnExportCsv.href = `api/relatorios_export_csv.php?${query}`;
  btnExportPdf.href = `api/relatorios_export_pdf.php?${query}`;
}

async function carregarRelatorio(pagina){
  if (!relatorioBody) return;
  const params = buildParams(pagina || 1);
  atualizarLinksExport(params);
  params.set('ajax', '1');

  relatorioBody.classList.add('is-loading');
  try {
    const res = await fetch(`relatorios?${params.toString()}`);
    const html = await res.text();
    relatorioBody.innerHTML = html;
    if (window.refreshCustomSelects) window.refreshCustomSelects(relatorioBody);
    const paginaNova = relatorioBody.querySelector('.relatorio-body-inner');
    paginaAtual = paginaNova ? Number(paginaNova.dataset.pagina || 1) : (pagina || 1);
    const urlParams = buildParams(paginaAtual);
    history.replaceState(null, '', `relatorios?${urlParams.toString()}`);
    carregarResumoApi();
  } catch (err) {
    console.warn('Falha ao carregar relatorio.', err);
  } finally {
    relatorioBody.classList.remove('is-loading');
  }
}

function formatarMoeda(valor){
  const numero = Number(valor || 0);
  return `R$ ${numero.toFixed(2).replace('.',',')}`;
}

function mapFormaPagamento(forma){
  const mapa = {
    pix: 'Transferencia Pix',
    dinheiro: 'Dinheiro',
    credito: 'Cartao de credito',
    debito: 'Cartao de debito',
    sem_pagamento: 'Sem pagamento registrado'
  };
  return mapa[forma] || forma || '-';
}

function renderMiniCards(el, lista, template){
  if (!el) return;
  if (!lista || !lista.length || typeof template !== 'function') {
    el.innerHTML = '';
    toggleSection(el.closest('.relatorio-section'), false);
    return;
  }
  toggleSection(el.closest('.relatorio-section'), true);
  el.innerHTML = lista.map(template).join('');
}

function truncateLabel(text, max){
  if (!text) return '';
  const limite = max || 18;
  return text.length > limite ? `${text.slice(0, limite - 1)}...` : text;
}

function dataLabelPlugin(){
  return {
    id: 'dataLabel',
    afterDatasetsDraw(chart){
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (meta.hidden) return;
        meta.data.forEach((element, index) => {
          const valor = dataset.data[index];
          if (valor === null || typeof valor === 'undefined') return;
          const pos = element.tooltipPosition();
          ctx.save();
          ctx.fillStyle = '#0f172a';
          ctx.font = '600 10px Manrope, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(valor, pos.x, pos.y - 8);
          ctx.restore();
        });
      });
    }
  };
}

function renderChartProdutos(lista){
  const canvas = document.getElementById('chartProdutos');
  if (!canvas || !window.Chart) return;
  if (chartProdutosInst) {
    chartProdutosInst.destroy();
    chartProdutosInst = null;
  }
  if (!lista || !lista.length) return;
  const dados = lista.slice(0, 10);
  const labels = dados.map(item => item.nome);
  const valores = dados.map(item => Number(item.quantidade || 0));
  chartProdutosInst = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Quantidade',
        data: valores,
        borderColor: '#c97240',
        backgroundColor: 'rgba(251,113,133,0.22)',
        fill: true,
        tension: 0.35,
        pointRadius: 6,
        pointHoverRadius: 7,
        pointBackgroundColor: '#c97240',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          callbacks: {
            title(items){
              return items[0] ? items[0].label : '';
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#6b7280',
            font: { size: 10 },
            callback(value){
              const label = this.getLabelForValue(value);
              return truncateLabel(label, 14);
            }
          },
          grid: { display: false }
        },
        y: {
          ticks: { color: '#6b7280', font: { size: 10 } },
          grid: { color: '#eef2f7' }
        }
      }
    },
    plugins: [dataLabelPlugin()]
  });
}

function renderChartClientes(lista){
  const canvas = document.getElementById('chartClientes');
  if (!canvas || !window.Chart) return;
  if (chartClientesInst) {
    chartClientesInst.destroy();
    chartClientesInst = null;
  }
  if (!lista || !lista.length) return;
  const dados = lista.slice(0, 10).sort((a, b) => Number(b.pedidos || 0) - Number(a.pedidos || 0));
  const labels = dados.map(item => item.nome);
  const valores = dados.map(item => Number(item.pedidos || 0));
  chartClientesInst = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Pedidos',
        data: valores,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,0.22)',
        fill: true,
        tension: 0.35,
        pointRadius: 6,
        pointHoverRadius: 7,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          callbacks: {
            title(items){
              return items[0] ? items[0].label : '';
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#6b7280',
            font: { size: 10 },
            callback(value){
              const label = this.getLabelForValue(value);
              return truncateLabel(label, 14);
            }
          },
          grid: { display: false }
        },
        y: {
          ticks: { color: '#6b7280', font: { size: 10 } },
          grid: { color: '#eef2f7' }
        }
      }
    },
    plugins: [dataLabelPlugin()]
  });
}

function renderDias(lista){
  const gridDias = document.getElementById('gridDias');
  if (!gridDias) return;
  if (!lista || !lista.length) {
    gridDias.innerHTML = '';
    toggleSection(gridDias.closest('.relatorio-section'), false);
    return;
  }
  toggleSection(gridDias.closest('.relatorio-section'), true);
  gridDias.innerHTML = lista.map(d => {
    const dia = d.dia || '';
    const diaFmt = dia ? dia.split('-').reverse().join('/') : '-';
    return `
      <div class="relatorio-day-card">
        <div class="relatorio-day-date">${diaFmt}</div>
        <div class="relatorio-day-meta">${d.pedidos || 0} pedidos</div>
        <div class="relatorio-day-total">${formatarMoeda(d.total || 0)}</div>
      </div>
    `;
  }).join('');
}

function renderLista(el, lista, template){
  if (!el) return;
  if (!lista || !lista.length) {
    el.innerHTML = '';
    const card = el.closest('.relatorio-card');
    toggleSection(card, false);
    atualizarSplitSection(el.closest('.relatorio-section'));
    return;
  }
  const card = el.closest('.relatorio-card');
  toggleSection(card, true);
  atualizarSplitSection(el.closest('.relatorio-section'));
  el.innerHTML = lista.map(template).join('');
}

function carregarResumoApi(){
  const params = buildParams();
  fetch(`api/relatorios.php?${params.toString()}`)
    .then(r => r.json())
    .then(d => {
      const vendasDia = d.vendas_dia || [];
      const produtos = d.produtos || [];
      const clientes = d.clientes || [];
      const vendasProdutos = d.vendas_produtos || [];
      const vendasPagamento = d.vendas_pagamento || [];
      const resumo = d.resumo || {};
      const clientesFrequencia = d.clientes_frequencia || clientes;
      const cancelados = Number(d.cancelados || 0);
      const canceladosValor = Number(d.cancelados_valor || 0);

      renderDias(vendasDia);
      renderChartProdutos(produtos);
      renderChartClientes(clientesFrequencia);
      renderMiniCards(document.getElementById('vendasProdutosCards'), vendasProdutos, p => {
        return `
          <div class="relatorio-mini-card">
            <div class="relatorio-mini-title">${p.nome}</div>
            <div class="relatorio-mini-meta">Total: <strong>${formatarMoeda(p.total || 0)}</strong></div>
            <div class="relatorio-mini-meta">Quantidade: <strong>${p.quantidade || 0}</strong></div>
          </div>
        `;
      });
      renderMiniCards(document.getElementById('vendasPagamentoCards'), vendasPagamento, p => {
        return `
          <div class="relatorio-mini-card">
            <div class="relatorio-mini-title">${mapFormaPagamento(p.forma)} </div>
            <div class="relatorio-mini-meta">Total: <strong>${formatarMoeda(p.total || 0)}</strong></div>
            <div class="relatorio-mini-meta">Quantidade: <strong>${p.quantidade || 0}</strong></div>
          </div>
        `;
      });

      const totaisPagamento = { pix: 0, credito: 0, debito: 0, dinheiro: 0 };
      vendasPagamento.forEach(p => {
        const forma = (p.forma || '').toLowerCase();
        if (totaisPagamento.hasOwnProperty(forma)) {
          totaisPagamento[forma] += Number(p.total || 0);
        }
      });
      const kpiPix = document.getElementById('kpiPix');
      const kpiCredito = document.getElementById('kpiCredito');
      const kpiDebito = document.getElementById('kpiDebito');
      const kpiDinheiro = document.getElementById('kpiDinheiro');
      if (kpiPix) kpiPix.textContent = formatarMoeda(totaisPagamento.pix);
      if (kpiCredito) kpiCredito.textContent = formatarMoeda(totaisPagamento.credito);
      if (kpiDebito) kpiDebito.textContent = formatarMoeda(totaisPagamento.debito);
      if (kpiDinheiro) kpiDinheiro.textContent = formatarMoeda(totaisPagamento.dinheiro);

      let pedidos = Number(resumo.total_pedidos || 0);
      let faturamento = Number(resumo.faturamento || 0);
      let taxaEntrega = Number(resumo.taxa_entrega || 0);
      if (!resumo.total_pedidos) {
        vendasDia.forEach(v => {
          pedidos += Number(v.pedidos || 0);
          faturamento += Number(v.total || 0);
        });
      }
      const fiadoRecebido = Number(d.fiado_recebido || 0);
      const kpiPedidos = document.getElementById('kpiPedidos');
      const kpiFaturamento = document.getElementById('kpiFaturamento');
      const kpiTicket = document.getElementById('kpiTicket');
      const kpiTaxaEntrega = document.getElementById('kpiTaxaEntrega');
      const kpiCancelados = document.getElementById('kpiCancelados');
      const kpiCanceladosValor = document.getElementById('kpiCanceladosValor');
      const kpiFiado = document.getElementById('kpiFiado');
      if (kpiPedidos) kpiPedidos.textContent = pedidos;
      if (kpiFaturamento) kpiFaturamento.textContent = formatarMoeda(faturamento + fiadoRecebido);
      if (kpiTicket) kpiTicket.textContent = formatarMoeda(pedidos > 0 ? faturamento / pedidos : 0);
      if (kpiTaxaEntrega) kpiTaxaEntrega.textContent = formatarMoeda(taxaEntrega);
      if (kpiFiado) kpiFiado.textContent = formatarMoeda(fiadoRecebido);
      if (kpiCancelados) kpiCancelados.textContent = cancelados;
      if (kpiCanceladosValor) kpiCanceladosValor.textContent = formatarMoeda(canceladosValor);
    })
    .catch(() => {
      renderDias([]);
      renderMiniCards(document.getElementById('vendasProdutosCards'), []);
      renderMiniCards(document.getElementById('vendasPagamentoCards'), []);
      renderChartProdutos([]);
      renderChartClientes([]);
      const kpiPix = document.getElementById('kpiPix');
      const kpiCredito = document.getElementById('kpiCredito');
      const kpiDebito = document.getElementById('kpiDebito');
      const kpiDinheiro = document.getElementById('kpiDinheiro');
      const kpiCancelados = document.getElementById('kpiCancelados');
      const kpiCanceladosValor = document.getElementById('kpiCanceladosValor');
      if (kpiPix) kpiPix.textContent = formatarMoeda(0);
      if (kpiCredito) kpiCredito.textContent = formatarMoeda(0);
      if (kpiDebito) kpiDebito.textContent = formatarMoeda(0);
      if (kpiDinheiro) kpiDinheiro.textContent = formatarMoeda(0);
      if (kpiCancelados) kpiCancelados.textContent = 0;
      if (kpiCanceladosValor) kpiCanceladosValor.textContent = formatarMoeda(0);
    });
}

if (formFiltro) {
  formFiltro.addEventListener('submit', e => {
    e.preventDefault();
    carregarRelatorio(1);
  });
}

if (dataInicio) {
  dataInicio.addEventListener('change', () => {
    if (periodoSelect) periodoSelect.value = 'customizado';
    atualizarVisibilidadePeriodo();
    if (dataInicio.value && dataFim && dataFim.value) {
      agendarAtualizacao();
    }
  });
  dataInicio.addEventListener('input', () => {
    if (periodoSelect) periodoSelect.value = 'customizado';
    atualizarVisibilidadePeriodo();
  });
}
if (dataFim) {
  dataFim.addEventListener('change', () => {
    if (periodoSelect) periodoSelect.value = 'customizado';
    atualizarVisibilidadePeriodo();
    if (dataFim.value && dataInicio && dataInicio.value) {
      agendarAtualizacao();
    }
  });
  dataFim.addEventListener('input', () => {
    if (periodoSelect) periodoSelect.value = 'customizado';
    atualizarVisibilidadePeriodo();
  });
}
if (tipoSelect) {
  tipoSelect.addEventListener('change', agendarAtualizacao);
}
document.addEventListener('change', e => {
  if (e.target && e.target.id === 'relLimiteSelect') carregarRelatorio(1);
});
if (periodoSelect) {
  periodoSelect.addEventListener('change', () => {
    atualizarVisibilidadePeriodo();
    if (periodoSelect.value === 'customizado') {
      limparPeriodoInputs();
      return;
    }
    limparPeriodoInputs();
    agendarAtualizacao();
  });
}
if (btnRangeCalendar) {
  btnRangeCalendar.addEventListener('click', () => {
    if (dataInicio) dataInicio.showPicker ? dataInicio.showPicker() : dataInicio.focus();
  });
}

document.querySelectorAll('.js-flatpickr').forEach((input) => {
  if (input.dataset.fpReady === '1') return;
  input.dataset.fpReady = '1';
  flatpickr(input, {
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'd/m/Y',
    locale: 'pt',
    allowInput: false,
    disableMobile: true,
    closeOnScroll: true,
    position: 'auto'
  });
});

atualizarLinksExport(buildParams(paginaAtual));
atualizarVisibilidadePeriodo();
const autoReloadHoje = periodoSelect && periodoSelect.value === 'hoje'
  && (!dataInicio || !dataInicio.value)
  && (!dataFim || !dataFim.value);
if (autoReloadHoje) {
  carregarRelatorio(1);
} else {
  carregarResumoApi();
}

document.addEventListener('click', e => {
  const pageBtn = e.target.closest('.rc-page-btn');
  if (pageBtn && relatorioBody && relatorioBody.contains(pageBtn)) {
    if (pageBtn.disabled) return;
    const page = Number(pageBtn.dataset.page || 1);
    carregarRelatorio(page);
    return;
  }

  const row = e.target.closest('.relatorio-row');
  if (row && relatorioBody && relatorioBody.contains(row)) {
    const id = row.dataset.pedidoId;
    if (id) abrirModalPedidoDetalhe(id);
  }
});

const modalPedidoDetalheEl = document.getElementById('modalPedidoDetalhe');
const modalPedidoDetalhe = modalPedidoDetalheEl ? new bootstrap.Modal(modalPedidoDetalheEl) : null;

const pedidoDetalheNumero = document.getElementById('pedidoDetalheNumero');
const pedidoDetalheTempo = document.getElementById('pedidoDetalheTempo');
  const pedidoDetalheHorario = document.getElementById('pedidoDetalheHorario');
  const pedidoDetalheStatus = document.getElementById('pedidoDetalheStatus');
  const pedidoDetalheCliente = document.getElementById('pedidoDetalheCliente');
  const pedidoDetalheTelefone = document.getElementById('pedidoDetalheTelefone');
  const pedidoDetalheStatsWrap = document.getElementById('pedidoDetalheStatsWrap');
  const pedidoDetalhePedidosFeitos = document.getElementById('pedidoDetalhePedidosFeitos');
  const pedidoDetalheTicketMedio = document.getElementById('pedidoDetalheTicketMedio');
  const pedidoDetalhePontos = document.getElementById('pedidoDetalhePontos');
  const pedidoDetalhePontosMetric = document.getElementById('pedidoDetalhePontosMetric');
  const pedidoDetalheCashbackTotal = document.getElementById('pedidoDetalheCashbackTotal');
  const pedidoDetalheCashbackMetric = document.getElementById('pedidoDetalheCashbackMetric');
  const pedidoDetalheCashbackExpira = document.getElementById('pedidoDetalheCashbackExpira');
  const pedidoDetalheCashbackExpirado = document.getElementById('pedidoDetalheCashbackExpirado');
  const pedidoDetalheVerCliente = document.getElementById('pedidoDetalheVerCliente');
  const modalClientePerfilEl = document.getElementById('modalClientePerfil');
  const modalClientePerfil = modalClientePerfilEl ? new bootstrap.Modal(modalClientePerfilEl) : null;
  const modalClienteEditEl = document.getElementById('modalClienteEdit');
  const modalClienteEdit = modalClienteEditEl ? new bootstrap.Modal(modalClienteEditEl) : null;
  const clienteEditTitulo = modalClienteEditEl ? modalClienteEditEl.querySelector('.modal-title') : null;
  const clienteEditId = document.getElementById('clienteEditId');
  const clienteEditNome = document.getElementById('clienteEditNome');
  const clienteEditTelefone = document.getElementById('clienteEditTelefone');
  const clienteEditAniversario = document.getElementById('clienteEditAniversario');
  const clienteEditCep = document.getElementById('clienteEditCep');
  const clienteEditRua = document.getElementById('clienteEditRua');
  const clienteEditNumero = document.getElementById('clienteEditNumero');
  const clienteEditBairro = document.getElementById('clienteEditBairro');
  const clienteEditCidade = document.getElementById('clienteEditCidade');
  const clienteEditEstado = document.getElementById('clienteEditEstado');
  const clienteEditComplemento = document.getElementById('clienteEditComplemento');
  const clienteEditSalvar = document.getElementById('clienteEditSalvar');
  const clienteEditNomeErro = document.getElementById('clienteEditNomeErro');
  const clienteEditTelefoneErro = document.getElementById('clienteEditTelefoneErro');
  const clientePerfilAvatar = document.getElementById('clientePerfilAvatar');
  const clientePerfilNome = document.getElementById('clientePerfilNome');
  const clientePerfilDesde = document.getElementById('clientePerfilDesde');
  const clientePerfilCashback = document.getElementById('clientePerfilCashback');
  const clientePerfilCashbackExpira = document.getElementById('clientePerfilCashbackExpira');
  const clientePerfilCashbackExpirado = document.getElementById('clientePerfilCashbackExpirado');
  const clientePerfilPontos = document.getElementById('clientePerfilPontos');
  const clientePerfilFiado = document.getElementById('clientePerfilFiado');
  const clientePerfilTicket = document.getElementById('clientePerfilTicket');
  const clientePerfilUltimoPedido = document.getElementById('clientePerfilUltimoPedido');
  const clientePerfilPedidos = document.getElementById('clientePerfilPedidos');
  const clientePerfilTelefone = document.getElementById('clientePerfilTelefone');
  const clientePerfilEndereco = document.getElementById('clientePerfilEndereco');
  const clientePerfilRegistrarFiado = document.getElementById('clientePerfilRegistrarFiado');
  const clientePerfilEditar = document.getElementById('clientePerfilEditar');
  const clientePerfilTabs = document.getElementById('clientePerfilTabs');
  const clientePedidosPeriodo = document.getElementById('clientePedidosPeriodo');
  const clientePedidosTipo = document.getElementById('clientePedidosTipo');
  const clientePedidosLista = document.getElementById('clientePedidosLista');
  const clientePedidosPaginacao = document.getElementById('clientePedidosPaginacao');
  const clientePontosLista = document.getElementById('clientePontosLista');
  const clientePontosPaginacao = document.getElementById('clientePontosPaginacao');
const pedidoDetalheContato = document.getElementById('pedidoDetalheContato');
const pedidoDetalheWhatsapp = document.getElementById('pedidoDetalheWhatsapp');
const pedidoDetalheTipoTitulo = document.getElementById('pedidoDetalheTipoTitulo');
const pedidoDetalheEnderecoWrap = document.getElementById('pedidoDetalheEnderecoWrap');
const pedidoDetalheEndereco = document.getElementById('pedidoDetalheEndereco');
const pedidoDetalheTaxaWrap = document.getElementById('pedidoDetalheTaxaWrap');
const pedidoDetalheTaxa = document.getElementById('pedidoDetalheTaxa');
const pedidoDetalheEntregaLinks = document.getElementById('pedidoDetalheEntregaLinks');
const pedidoDetalheCopiarEndereco = document.getElementById('pedidoDetalheCopiarEndereco');
const pedidoDetalheVincularEntregador = document.getElementById('pedidoDetalheVincularEntregador');
const pedidoDetalhePagamentos = document.getElementById('pedidoDetalhePagamentos');
const pedidoDetalheItens = document.getElementById('pedidoDetalheItens');
const pedidoDetalheSubtotal = document.getElementById('pedidoDetalheSubtotal');
const pedidoDetalheDesconto = document.getElementById('pedidoDetalheDesconto');
const pedidoDetalheTaxaResumo = document.getElementById('pedidoDetalheTaxaResumo');
const pedidoDetalheMaquininha = document.getElementById('pedidoDetalheMaquininha');
const pedidoDetalheCashback = document.getElementById('pedidoDetalheCashback');
const pedidoDetalheTotal = document.getElementById('pedidoDetalheTotal');
const pedidoDetalheLinhaDesconto = document.getElementById('pedidoDetalheLinhaDesconto');
const pedidoDetalheLinhaTaxa = document.getElementById('pedidoDetalheLinhaTaxa');
const pedidoDetalheLinhaMaquininha = document.getElementById('pedidoDetalheLinhaMaquininha');
const pedidoDetalheLinhaCashback = document.getElementById('pedidoDetalheLinhaCashback');
  const pedidoDetalheEditar = document.getElementById('pedidoDetalheEditar');
  const pedidoDetalheImprimir = document.getElementById('pedidoDetalheImprimir');
  const pedidoDetalheCancelar = document.getElementById('pedidoDetalheCancelar');
  const pedidoDetalheFinalizar = document.getElementById('pedidoDetalheFinalizar');
  let pedidoDetalheAtual = null;
  let clientePerfilAtual = null;
  let clientePedidosPagina = 1;
  let clientePedidosCarregado = false;
  let clientePontosPagina = 1;
  let clientePontosCarregado = false;
  let clientePerfilUltimoPedidoId = null;
  let clientePerfilReabrir = false;
const podeGerenciarPedidos = RELATORIOS_DATA.podeGerenciarPedidos;

function normalizarData(valor){
  if (!valor) return '';
  return valor.includes(' ') ? valor.replace(' ', 'T') : valor;
}

function formatarDataHora(valor){
  if (!valor) return '-';
  const data = new Date(normalizarData(valor));
  if (Number.isNaN(data.getTime())) return valor;
  const dia = String(data.getDate()).padStart(2,'0');
  const mes = String(data.getMonth() + 1).padStart(2,'0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2,'0');
  const min = String(data.getMinutes()).padStart(2,'0');
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

function tempoDesde(valor){
  if (!valor) return 'feito ha -';
  const data = new Date(normalizarData(valor));
  if (Number.isNaN(data.getTime())) return 'feito ha -';
  const minutos = Math.max(0, Math.floor((Date.now() - data.getTime()) / 60000));
  if (minutos < 60) return `feito ha ${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `feito ha ${horas}h ${resto}m`;
}

function mapStatusPedido(status){
  const mapa = {
    pendente: 'Pendente',
    aceito: 'Aceito',
    preparando: 'Em preparo',
    entrega: 'Saiu para entrega',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado'
  };
  return mapa[status] || status || '-';
}

  function formatarFormaPagamento(forma){
    const mapa = {
      pix: 'Transferencia Pix',
      dinheiro: 'Dinheiro',
      credito: 'Cartao de credito',
      debito: 'Cartao de debito'
    };
    return mapa[forma] || forma || '-';
  }

  function formatarData(valor){
    if (!valor) return '-';
    const data = new Date(normalizarData(valor));
    if (Number.isNaN(data.getTime())) return valor;
    const dia = String(data.getDate()).padStart(2,'0');
    const mes = String(data.getMonth() + 1).padStart(2,'0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  function limparErrosCliente(){
    if (clienteEditNome) clienteEditNome.classList.remove('is-invalid');
    if (clienteEditTelefone) clienteEditTelefone.classList.remove('is-invalid');
    if (clienteEditNomeErro) clienteEditNomeErro.textContent = '';
    if (clienteEditTelefoneErro) clienteEditTelefoneErro.textContent = '';
  }

  function preencherClienteModal(data){
    if (clienteEditTitulo) {
      clienteEditTitulo.textContent = data.id ? 'Editar cliente' : 'Criar cliente';
    }
    if (clienteEditId) clienteEditId.value = data.id || '';
    if (clienteEditNome) clienteEditNome.value = data.nome || '';
    if (clienteEditTelefone) clienteEditTelefone.value = formatarTelefone(data.telefone || '');
    if (clienteEditAniversario) clienteEditAniversario.value = data.aniversario || '';
    if (clienteEditCep) clienteEditCep.value = data.cep || '';
    if (clienteEditRua) clienteEditRua.value = data.rua || data.endereco || '';
    if (clienteEditNumero) clienteEditNumero.value = data.numero || '';
    if (clienteEditBairro) clienteEditBairro.value = data.bairro || '';
    if (clienteEditCidade) clienteEditCidade.value = data.cidade || '';
    if (clienteEditEstado) clienteEditEstado.value = data.estado || '';
    if (clienteEditComplemento) clienteEditComplemento.value = data.complemento || '';
    limparErrosCliente();
  }

  function formatarTelefone(valor){
    const digits = (valor || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  }

  function aplicarMascaraTelefone(input){
    if (!input) return;
    const pos = input.selectionStart || 0;
    input.value = formatarTelefone(input.value);
    if (input === document.activeElement) {
      const delta = input.value.length - pos;
      const novaPos = Math.max(0, pos + delta);
      input.setSelectionRange(novaPos, novaPos);
    }
  }

  function montarEnderecoClienteModal(){
    const cep = clienteEditCep ? clienteEditCep.value.trim() : '';
    const rua = clienteEditRua ? clienteEditRua.value.trim() : '';
    const numero = clienteEditNumero ? clienteEditNumero.value.trim() : '';
    const bairro = clienteEditBairro ? clienteEditBairro.value.trim() : '';
    const cidade = clienteEditCidade ? clienteEditCidade.value.trim() : '';
    const estado = clienteEditEstado ? clienteEditEstado.value.trim() : '';
    const complemento = clienteEditComplemento ? clienteEditComplemento.value.trim() : '';

    const partes = [];
    if (rua !== '') partes.push(numero !== '' ? `${rua}, ${numero}` : rua);
    if (bairro !== '') partes.push(bairro);
    const cidadeEstado = `${cidade}${estado ? ` / ${estado}` : ''}`.trim();
    if (cidadeEstado !== '') partes.push(cidadeEstado);
    if (cep !== '') partes.push(cep);
    if (complemento !== '') partes.push(complemento);

    return {
      cep,
      rua,
      numero,
      bairro,
      cidade,
      estado,
      complemento,
      endereco: partes.join(' - ')
    };
  }

  function validarClienteModal(){
    let ok = true;
    const nome = clienteEditNome ? clienteEditNome.value.trim() : '';
    const telefone = clienteEditTelefone ? clienteEditTelefone.value.trim() : '';

    if (!nome) {
      if (clienteEditNome) clienteEditNome.classList.add('is-invalid');
      if (clienteEditNomeErro) clienteEditNomeErro.textContent = 'Informe o nome do cliente.';
      ok = false;
    }
    if (!telefone) {
      if (clienteEditTelefone) clienteEditTelefone.classList.add('is-invalid');
      if (clienteEditTelefoneErro) clienteEditTelefoneErro.textContent = 'Informe o telefone do cliente.';
      ok = false;
    }
    return ok;
  }

  function salvarClienteModal(){
    if (!validarClienteModal()) return;
    const enderecoPayload = montarEnderecoClienteModal();
    const payload = {
      id: clienteEditId ? clienteEditId.value : '',
      nome: clienteEditNome ? clienteEditNome.value.trim() : '',
      telefone: clienteEditTelefone ? clienteEditTelefone.value.trim() : '',
      aniversario: clienteEditAniversario ? clienteEditAniversario.value : '',
      cep: enderecoPayload.cep,
      rua: enderecoPayload.rua,
      numero: enderecoPayload.numero,
      bairro: enderecoPayload.bairro,
      cidade: enderecoPayload.cidade,
      estado: enderecoPayload.estado,
      complemento: enderecoPayload.complemento,
      endereco: enderecoPayload.endereco
    };
    const url = payload.id ? 'api/cliente_atualizar.php' : 'api/cliente_salvar.php';

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok) return;
      if (modalClienteEdit) modalClienteEdit.hide();
      if (clientePerfilNome) clientePerfilNome.textContent = payload.nome;
      if (clientePerfilAvatar) {
        const letra = payload.nome.trim().charAt(0).toUpperCase();
        clientePerfilAvatar.textContent = letra || 'C';
      }
      if (clientePerfilTelefone) clientePerfilTelefone.textContent = payload.telefone;
      if (clientePerfilEndereco) clientePerfilEndereco.textContent = payload.endereco || '-';
      if (clientePerfilAtual) {
        clientePerfilAtual = { ...clientePerfilAtual, ...payload };
      }
    });
  }

  function abrirModalClienteEdit(clienteId){
    if (!modalClienteEdit) return;
    const id = clienteId || (clientePerfilAtual ? clientePerfilAtual.id : '');
    const basePayload = {
      id,
      nome: clientePerfilNome ? clientePerfilNome.textContent.trim() : '',
      telefone: clientePerfilTelefone ? clientePerfilTelefone.textContent.trim() : '',
      endereco: clientePerfilEndereco ? clientePerfilEndereco.textContent.trim() : ''
    };
    preencherClienteModal(basePayload);
    clientePerfilReabrir = false;
    if (modalClientePerfil) {
      modalClientePerfil.hide();
      clientePerfilReabrir = true;
    }
    modalClienteEdit.show();
    if (!id) return;
    fetch(`api/cliente_detalhe.php?cliente_id=${id}`)
      .then(r => r.json())
      .then(res => {
        if (!res || !res.ok || !res.cliente) return;
        preencherClienteModal(res.cliente);
      })
      .catch(() => {});
  }

  function abrirModalClientePerfil(clienteId, baseInfo = {}){
    if (!modalClientePerfil || !clienteId) return;
    clientePerfilAtual = { id: clienteId };
    clientePedidosCarregado = false;
    clientePedidosPagina = 1;
    clientePontosCarregado = false;
    clientePontosPagina = 1;
    if (clientePedidosPeriodo) clientePedidosPeriodo.value = '30';
    if (clientePedidosTipo) clientePedidosTipo.value = 'todos';
    if (clientePedidosLista) clientePedidosLista.innerHTML = '';
    if (clientePedidosPaginacao) clientePedidosPaginacao.innerHTML = '';
    if (clientePontosLista) clientePontosLista.innerHTML = '';
    if (clientePontosPaginacao) clientePontosPaginacao.innerHTML = '';
    if (clientePerfilTabs) {
      clientePerfilTabs.querySelectorAll('.cliente-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === 'perfil');
      });
      document.querySelectorAll('#modalClientePerfil [data-tab-pane]').forEach(pane => {
        pane.classList.toggle('active', pane.dataset.tabPane === 'perfil');
      });
    }
    if (clientePerfilNome) clientePerfilNome.textContent = baseInfo.nome || 'Cliente';
    if (clientePerfilAvatar) {
      const letra = (baseInfo.nome || 'C').trim().charAt(0).toUpperCase();
      clientePerfilAvatar.textContent = letra || 'C';
    }
    if (clientePerfilDesde) clientePerfilDesde.textContent = 'Cliente desde: -';
    if (clientePerfilTelefone) clientePerfilTelefone.textContent = baseInfo.telefone || '-';
    if (clientePerfilEndereco) clientePerfilEndereco.textContent = baseInfo.endereco || '-';
    if (clientePerfilCashback) clientePerfilCashback.textContent = 'R$ 0,00';
    if (clientePerfilTicket) clientePerfilTicket.textContent = 'R$ 0,00';
    if (clientePerfilUltimoPedido) clientePerfilUltimoPedido.textContent = '-';
    if (clientePerfilPedidos) clientePerfilPedidos.textContent = '0';
    if (clientePerfilPontos) clientePerfilPontos.textContent = 'Sem dados';
    if (clientePerfilFiado) clientePerfilFiado.textContent = 'R$ 0,00';
    if (clientePerfilCashbackExpira) clientePerfilCashbackExpira.classList.add('d-none');
    if (clientePerfilCashbackExpirado) clientePerfilCashbackExpirado.classList.add('d-none');

    if (clientePerfilEditar) {
      clientePerfilEditar.onclick = () => abrirModalClienteEdit(clienteId);
    }
    if (clientePerfilRegistrarFiado) {
      clientePerfilRegistrarFiado.onclick = () => window.open(`clientes.php?cliente_id=${clienteId}`, '_blank');
    }

    modalClientePerfil.show();

    fetch(`api/pdv_cliente_stats.php?cliente_id=${clienteId}`)
      .then(r => r.json())
      .then(res => {
        if (!res || !res.ok) return;
        const cliente = res.cliente || {};
        const stats = res.stats || {};
        if (clientePerfilNome) clientePerfilNome.textContent = cliente.nome || baseInfo.nome || 'Cliente';
        if (clientePerfilAvatar) {
          const letra = (cliente.nome || baseInfo.nome || 'C').trim().charAt(0).toUpperCase();
          clientePerfilAvatar.textContent = letra || 'C';
        }
        if (clientePerfilDesde) clientePerfilDesde.textContent = `Cliente desde: ${cliente.criado_em ? formatarData(cliente.criado_em) : '-'}`;
        if (clientePerfilTelefone) clientePerfilTelefone.textContent = cliente.telefone || baseInfo.telefone || '-';
        if (clientePerfilEndereco) {
          const endereco = stats.ultimo_endereco || cliente.endereco || baseInfo.endereco || '-';
          clientePerfilEndereco.textContent = endereco || '-';
        }
        if (clientePerfilCashback) clientePerfilCashback.textContent = formatarMoeda(stats.cashback_saldo || 0);
        if (clientePerfilPontos) {
          const pontosValor = stats.pontos;
          clientePerfilPontos.textContent = (pontosValor === undefined || pontosValor === null)
            ? 'Sem dados'
            : `${pontosValor} pts`;
        }
        if (clientePerfilTicket) clientePerfilTicket.textContent = formatarMoeda(stats.ticket_medio || 0);
        if (clientePerfilUltimoPedido) {
          clientePerfilUltimoPedido.textContent = stats.ultimo_pedido
            ? formatarData(stats.ultimo_pedido.criado_em)
            : '-';
        }
        if (clientePerfilPedidos) clientePerfilPedidos.textContent = stats.total_pedidos || 0;
        clientePerfilUltimoPedidoId = stats.ultimo_pedido ? stats.ultimo_pedido.id : null;
        if (clientePerfilCashbackExpira) {
          if ((stats.cashback_saldo || 0) > 0 && stats.cashback_expira_em) {
            clientePerfilCashbackExpira.textContent = `Expira em ${formatarData(stats.cashback_expira_em)}`;
            clientePerfilCashbackExpira.classList.remove('d-none');
          } else {
            clientePerfilCashbackExpira.classList.add('d-none');
          }
        }
        if (clientePerfilCashbackExpirado) {
          if ((stats.cashback_saldo || 0) <= 0 && stats.cashback_expirado) {
            clientePerfilCashbackExpirado.classList.remove('d-none');
          } else {
            clientePerfilCashbackExpirado.classList.add('d-none');
          }
        }
      })
      .catch(() => {});
  }

  function badgeTipoPedido(tipo){
    const valor = (tipo || '').toLowerCase();
    if (valor === 'entrega') return { label: 'Entrega', className: 'entrega' };
    if (valor === 'retirada') return { label: 'Retirada', className: 'retirada' };
    if (valor === 'mesa') return { label: 'Mesa', className: 'mesa' };
    return { label: tipo || 'Outro', className: 'retirada' };
  }

  function renderPedidos(pedidos, paginas){
    if (!clientePedidosLista || !clientePedidosPaginacao) return;
    if (!pedidos || pedidos.length === 0) {
      clientePedidosLista.innerHTML = '<div class="cliente-pedidos-vazio">Nenhum pedido encontrado para os filtros selecionados.</div>';
      clientePedidosPaginacao.innerHTML = '';
      return;
    }
    clientePedidosLista.innerHTML = pedidos.map(p => {
      const badge = badgeTipoPedido(p.tipo);
      const resumo = p.resumo || 'Sem itens.';
      return `
        <div class="cliente-pedido-card js-pedido-detalhe" data-pedido-id="${p.id}">
          <div class="cliente-pedido-top">
            <div class="cliente-pedido-data">
              <i class="bi bi-calendar-event"></i>
              Pedido realizado em: <strong>${formatarDataHora(p.criado_em)}</strong>
            </div>
            <span class="pedido-badge ${badge.className}">${badge.label}</span>
          </div>
          <div class="cliente-pedido-resumo">
            <small>Resumo do pedido:</small><br>
            ${resumo}
          </div>
          <div class="cliente-pedido-total">
            <span>Total:</span>
            <strong>${formatarMoeda(p.total)}</strong>
          </div>
        </div>
      `;
    }).join('');

    const pages = Math.max(1, paginas || 1);
    const prevDisabled = clientePedidosPagina <= 1;
    const nextDisabled = clientePedidosPagina >= pages;
    let html = '';
    html += `<button type="button" ${prevDisabled ? 'disabled' : ''} data-page="${clientePedidosPagina - 1}">&lt;</button>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button type="button" class="${i === clientePedidosPagina ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button type="button" ${nextDisabled ? 'disabled' : ''} data-page="${clientePedidosPagina + 1}">&gt;</button>`;
    clientePedidosPaginacao.innerHTML = html;
  }

  function carregarPedidosCliente(pagina){
    if (!clientePerfilAtual || !clientePerfilAtual.id) return;
    if (!clientePedidosLista) return;
    const periodo = clientePedidosPeriodo ? clientePedidosPeriodo.value : '30';
    const tipo = clientePedidosTipo ? clientePedidosTipo.value : 'todos';
    clientePedidosPagina = pagina || 1;
    clientePedidosLista.innerHTML = '<div class="cliente-pedidos-vazio">Carregando pedidos...</div>';
    fetch(`api/cliente_pedidos.php?cliente_id=${clientePerfilAtual.id}&periodo=${periodo}&tipo=${tipo}&pagina=${clientePedidosPagina}`)
      .then(r => r.json())
      .then(res => {
        if (!res || !res.ok) {
          renderPedidos([], 1);
          return;
        }
        renderPedidos(res.pedidos || [], res.paginas || 1);
        clientePedidosCarregado = true;
      })
      .catch(() => renderPedidos([], 1));
  }

  function badgeTipoPontos(tipo){
    const valor = (tipo || '').toLowerCase();
    if (valor === 'resgate' || valor === 'expirado') return { label: 'Resgate', className: 'resgate' };
    if (valor === 'ganho') return { label: 'Ganho', className: 'ganho' };
    if (valor === 'ajuste') return { label: 'Ajuste', className: 'ganho' };
    return { label: 'Pontos', className: 'ganho' };
  }

  function renderPontosHistorico(itens, paginas){
    if (!clientePontosLista || !clientePontosPaginacao) return;
    if (!itens || itens.length === 0) {
      clientePontosLista.innerHTML = '<div class="cliente-pedidos-vazio">Nenhum historico de pontos encontrado.</div>';
      clientePontosPaginacao.innerHTML = '';
      return;
    }
    clientePontosLista.innerHTML = itens.map(item => {
      const badge = badgeTipoPontos(item.tipo);
      const sinal = (item.tipo === 'resgate' || item.tipo === 'expirado') ? '-' : '+';
      const pontosTxt = `${sinal}${Math.abs(Number(item.pontos || 0))} pts`;
      const pedidoTxt = item.pedido_id ? `Pedido #${item.pedido_id}` : 'Movimentacao manual';
      return `
        <div class="cliente-pontos-card">
          <div class="cliente-pontos-top">
            <span class="cliente-pontos-badge ${badge.className}">${badge.label}</span>
            <span>${formatarData(item.criado_em)}</span>
          </div>
          <div class="cliente-pontos-info">
            <strong>${pontosTxt}</strong>
            <span>${pedidoTxt}</span>
          </div>
          <div class="cliente-pontos-desc">Saldo: ${item.saldo_depois} pts</div>
        </div>
      `;
    }).join('');

    const pages = Math.max(1, paginas || 1);
    const prevDisabled = clientePontosPagina <= 1;
    const nextDisabled = clientePontosPagina >= pages;
    let html = '';
    html += `<button type="button" ${prevDisabled ? 'disabled' : ''} data-page="${clientePontosPagina - 1}">&lt;</button>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button type="button" class="${i === clientePontosPagina ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button type="button" ${nextDisabled ? 'disabled' : ''} data-page="${clientePontosPagina + 1}">&gt;</button>`;
    clientePontosPaginacao.innerHTML = html;
  }

  function carregarPontosCliente(pagina){
    if (!clientePerfilAtual || !clientePerfilAtual.id) return;
    if (!clientePontosLista) return;
    clientePontosPagina = pagina || 1;
    clientePontosLista.innerHTML = '<div class="cliente-pedidos-vazio">Carregando historico de pontos...</div>';
    fetch(`api/cliente_pontos.php?cliente_id=${clientePerfilAtual.id}&pagina=${clientePontosPagina}`)
      .then(r => r.json())
      .then(res => {
        if (!res || !res.ok) {
          renderPontosHistorico([], 1);
          return;
        }
        renderPontosHistorico(res.pontos || [], res.paginas || 1);
        clientePontosCarregado = true;
      })
      .catch(() => renderPontosHistorico([], 1));
  }

function mostrarAvisoModal(msg, titulo){
  const modalEl = document.getElementById('modalAvisoGestor');
  if (!modalEl) return;
  const tituloEl = document.getElementById('modalAvisoGestorTitulo');
  const msgEl = document.getElementById('modalAvisoGestorMsg');
  if (tituloEl) tituloEl.textContent = titulo || 'Aviso';
  if (msgEl) msgEl.textContent = msg || '';
  (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).show();
  /* Se ja existir outro modal aberto por tras (ex.: detalhe do pedido), o Bootstrap
     as vezes cria o novo backdrop com z-index abaixo do modal anterior, deixando o
     fundo sem escurecer. Forca o backdrop e o modal deste aviso pra cima de tudo. */
  setTimeout(() => {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    const ultimoBackdrop = backdrops[backdrops.length - 1];
    if (ultimoBackdrop) ultimoBackdrop.style.zIndex = 1070;
    modalEl.style.zIndex = 1075;
  }, 0);
}

function imprimirPedido(id){
  if (!id || typeof impressaoQZ === 'undefined') return;
  const btn = pedidoDetalheImprimir;
  const icon = btn ? btn.querySelector('i') : null;
  const classeOriginal = icon ? icon.className : '';
  if (btn) btn.disabled = true;
  if (icon) icon.className = 'bi bi-arrow-repeat spin-icon';
  const lojaNome = (typeof LOJA_NOME_IMPRESSAO !== 'undefined') ? LOJA_NOME_IMPRESSAO : '';
  impressaoQZ.imprimirManual(id, lojaNome, 'cozinha')
    .catch(e => {
      console.warn('Falha ao imprimir pedido:', e);
      mostrarAvisoModal(e && e.message ? e.message : 'Não foi possível imprimir o pedido. Verifique se o QZ Tray está aberto e a impressora está configurada em Configurações > Impressão.');
    })
    .finally(() => {
      if (btn) btn.disabled = false;
      if (icon) icon.className = classeOriginal;
    });
}

function preencherModalPedido(dados){
  if (!dados || !dados.pedido) return;
  const pedido = dados.pedido || {};
  const itens = dados.itens || [];
    const pagamentos = dados.pagamentos || [];
    const stats = dados.cliente_stats || dados.stats || {};
  const tipo = (pedido.tipo || '').toLowerCase();
  const entrega = tipo === 'entrega';
  const endereco = pedido.endereco_entrega || pedido.endereco || pedido.rua || '-';

  pedidoDetalheAtual = pedido.id || null;
  if (pedidoDetalheNumero) pedidoDetalheNumero.textContent = `Pedido N. ${pedido.codigo || pedido.id || '-'}`;
  if (pedidoDetalheTempo) pedidoDetalheTempo.textContent = tempoDesde(pedido.criado_em);
  if (pedidoDetalheHorario) pedidoDetalheHorario.textContent = formatarDataHora(pedido.criado_em);
    if (pedidoDetalheStatus) {
      pedidoDetalheStatus.textContent = mapStatusPedido(pedido.status);
      const statusClasse = (pedido.status || '').toLowerCase();
      pedidoDetalheStatus.classList.remove(
        'status-pendente',
        'status-aceito',
        'status-preparando',
        'status-entrega',
        'status-finalizado',
        'status-cancelado'
      );
      if (statusClasse) pedidoDetalheStatus.classList.add(`status-${statusClasse}`);
    }
    if (pedidoDetalheCliente) pedidoDetalheCliente.textContent = pedido.nome || '-';
    if (pedidoDetalheTelefone) pedidoDetalheTelefone.textContent = pedido.telefone || '-';

    if (pedidoDetalheStatsWrap) {
      const feitos = Number(stats.pedidos_feitos || 0);
      const ticket = Number(stats.ticket_medio || 0);
      const pontos = stats.pontos !== undefined && stats.pontos !== null ? Number(stats.pontos) : 0;
      const cashbackSaldo = Number(stats.cashback_saldo ?? stats.cashback_total ?? 0);
      const cashbackExpiraEm = stats.cashback_expira_em || null;
      const cashbackExpirado = Boolean(stats.cashback_expirado);
      if (pedidoDetalhePedidosFeitos) pedidoDetalhePedidosFeitos.textContent = feitos || 0;
      if (pedidoDetalheTicketMedio) pedidoDetalheTicketMedio.textContent = formatarMoeda(ticket || 0);
      if (pedidoDetalhePontos) pedidoDetalhePontos.textContent = Number.isNaN(pontos) ? '0' : pontos;
      if (pedidoDetalhePontosMetric) pedidoDetalhePontosMetric.style.display = 'flex';
      if (pedidoDetalheCashbackTotal) pedidoDetalheCashbackTotal.textContent = formatarMoeda(cashbackSaldo || 0);
      if (pedidoDetalheCashbackMetric) {
        pedidoDetalheCashbackMetric.style.display = cashbackSaldo > 0 ? 'flex' : 'none';
      }
      if (pedidoDetalheCashbackExpira) {
        if (cashbackSaldo > 0 && cashbackExpiraEm) {
          const dataExpira = formatarDataHora(`${cashbackExpiraEm} 00:00:00`).split(' ')[0];
          pedidoDetalheCashbackExpira.textContent = `Expira em ${dataExpira}`;
          pedidoDetalheCashbackExpira.classList.remove('d-none');
        } else {
          pedidoDetalheCashbackExpira.classList.add('d-none');
        }
      }
      if (pedidoDetalheCashbackExpirado) {
        if (cashbackSaldo <= 0 && cashbackExpirado) {
          pedidoDetalheCashbackExpirado.classList.remove('d-none');
        } else {
          pedidoDetalheCashbackExpirado.classList.add('d-none');
        }
      }
      pedidoDetalheStatsWrap.style.display = pedido.id ? 'block' : 'none';
    }

    if (pedidoDetalheTipoTitulo) {
      pedidoDetalheTipoTitulo.textContent = entrega ? 'ENTREGA' : 'RETIRADA';
      const tipoClasse = tipo ? tipo : 'outro';
      pedidoDetalheTipoTitulo.classList.remove('entrega','retirada','mesa','outro');
      pedidoDetalheTipoTitulo.classList.add(['entrega','retirada','mesa'].includes(tipoClasse) ? tipoClasse : 'outro');
    }
    if (pedidoDetalheEnderecoWrap) pedidoDetalheEnderecoWrap.style.display = entrega ? 'block' : 'none';
    if (pedidoDetalheTaxaWrap) pedidoDetalheTaxaWrap.style.display = entrega ? 'block' : 'none';
    if (pedidoDetalheEntregaLinks) pedidoDetalheEntregaLinks.style.display = entrega ? 'flex' : 'none';
    if (pedidoDetalheEndereco && entrega) pedidoDetalheEndereco.textContent = endereco || '-';

  const taxaEntrega = Number(pedido.taxa_entrega || 0);
  if (pedidoDetalheTaxa) pedidoDetalheTaxa.textContent = formatarMoeda(taxaEntrega);
  if (pedidoDetalheTaxaResumo) pedidoDetalheTaxaResumo.textContent = formatarMoeda(taxaEntrega);

  if (pedidoDetalheSubtotal) pedidoDetalheSubtotal.textContent = formatarMoeda(pedido.subtotal || pedido.total || 0);
  if (pedidoDetalheDesconto) pedidoDetalheDesconto.textContent = formatarMoeda(pedido.desconto || 0);
  if (pedidoDetalheMaquininha) pedidoDetalheMaquininha.textContent = formatarMoeda(pedido.taxa_maquininha || 0);
  let cashbackValor = Number(pedido.cashback_valor || 0);
  if (!cashbackValor) {
    const cashbackPercent = Number(pedido.cashback_percentual || 0);
    if (cashbackPercent > 0) {
      const subtotalBase = Number(pedido.subtotal || 0);
      const descontoBase = Number(pedido.desconto || 0);
      let baseCashback = subtotalBase > 0
        ? (subtotalBase - descontoBase)
        : (Number(pedido.total || 0) - Number(pedido.taxa_entrega || 0) - descontoBase);
      if (baseCashback < 0) baseCashback = 0;
      cashbackValor = baseCashback * (cashbackPercent / 100);
    }
  }
  if (pedidoDetalheCashback) pedidoDetalheCashback.textContent = formatarMoeda(cashbackValor);
  if (pedidoDetalheTotal) pedidoDetalheTotal.textContent = formatarMoeda(pedido.total || 0);

  if (pedidoDetalheLinhaDesconto) pedidoDetalheLinhaDesconto.style.display = Number(pedido.desconto || 0) > 0 ? 'flex' : 'none';
  if (pedidoDetalheLinhaTaxa) pedidoDetalheLinhaTaxa.style.display = taxaEntrega > 0 ? 'flex' : 'none';
  if (pedidoDetalheLinhaMaquininha) pedidoDetalheLinhaMaquininha.style.display = Number(pedido.taxa_maquininha || 0) > 0 ? 'flex' : 'none';
  if (pedidoDetalheLinhaCashback) pedidoDetalheLinhaCashback.style.display = cashbackValor > 0 ? 'flex' : 'none';

  if (pedidoDetalhePagamentos) {
    if (pagamentos.length) {
      pedidoDetalhePagamentos.innerHTML = pagamentos.map(p => `${formatarFormaPagamento(p.forma)} ${formatarMoeda(p.valor)}`).join('<br>');
    } else {
      pedidoDetalhePagamentos.textContent = `${formatarFormaPagamento(pedido.forma_pagamento)} ${formatarMoeda(pedido.total || 0)}`;
    }
  }

  if (pedidoDetalheItens) {
    if (!itens.length) {
      pedidoDetalheItens.innerHTML = '<div class="pedido-detalhe-item-row">Sem itens.</div>';
    } else {
      pedidoDetalheItens.innerHTML = itens.map(i => {
        const totalItem = Number(i.preco || 0) * Number(i.quantidade || 0);
        return `
          <div class="pedido-detalhe-item-row">
            <span>${i.quantidade}x ${i.produto_nome}</span>
            <strong>${formatarMoeda(totalItem)}</strong>
          </div>
        `;
      }).join('');
    }
  }

  if (pedidoDetalheEditar) {
    pedidoDetalheEditar.href = `pdv.php?pedido_id=${pedido.id}`;
    pedidoDetalheEditar.style.display = podeGerenciarPedidos ? 'inline-flex' : 'none';
  }

  if (pedidoDetalheImprimir) {
    pedidoDetalheImprimir.dataset.pedidoId = pedido.id || '';
  }

  if (pedidoDetalheContato) {
    const digits = (pedido.telefone || '').replace(/\D/g, '');
    pedidoDetalheContato.href = digits ? `tel:${digits}` : '#';
  }
    if (pedidoDetalheWhatsapp) {
      const digits = (pedido.telefone || '').replace(/\D/g, '');
      const whatsapp = digits ? (digits.length <= 11 ? `55${digits}` : digits) : '';
      pedidoDetalheWhatsapp.href = whatsapp ? `https://wa.me/${whatsapp}` : '#';
    }
    if (pedidoDetalheVerCliente) {
      pedidoDetalheVerCliente.onclick = () => {
        if (!pedido.cliente_id) return;
        abrirModalClientePerfil(pedido.cliente_id, {
          nome: pedido.nome || '',
          telefone: pedido.telefone || '',
          endereco: pedido.endereco_entrega || pedido.endereco || ''
        });
      };
    }

  const statusAtual = (pedido.status || '').toLowerCase();
  if (pedidoDetalheCancelar) {
    pedidoDetalheCancelar.style.display = (podeGerenciarPedidos && statusAtual !== 'cancelado' && statusAtual !== 'finalizado')
      ? 'inline-flex'
      : 'none';
  }
  if (pedidoDetalheFinalizar) {
    pedidoDetalheFinalizar.style.display = (podeGerenciarPedidos && statusAtual !== 'finalizado' && statusAtual !== 'cancelado')
      ? 'inline-flex'
      : 'none';
  }
}

function abrirModalPedidoDetalhe(id){
  if (!modalPedidoDetalhe) return;
  if (pedidoDetalheItens) pedidoDetalheItens.innerHTML = '<div class="pedido-detalhe-item-row">Carregando pedido...</div>';
  modalPedidoDetalhe.show();
  fetch(`api/pedido_detalhe.php?pedido_id=${id}`)
    .then(r => r.json())
    .then(d => {
      if (!d || !d.ok) return;
      preencherModalPedido(d);
    })
    .catch(() => {});
}

if (pedidoDetalheCopiarEndereco) {
  pedidoDetalheCopiarEndereco.addEventListener('click', () => {
    if (!pedidoDetalheEndereco) return;
    const texto = pedidoDetalheEndereco.textContent.trim();
    if (!texto) return;
    navigator.clipboard?.writeText(texto);
  });
}

if (pedidoDetalheVincularEntregador) {
  pedidoDetalheVincularEntregador.addEventListener('click', () => {
    alert('Funcao em breve.');
  });
}

if (pedidoDetalheImprimir) {
  pedidoDetalheImprimir.addEventListener('click', () => {
    const id = pedidoDetalheImprimir.dataset.pedidoId || pedidoDetalheAtual;
    if (id) imprimirPedido(id);
  });
}

if (pedidoDetalheCancelar) {
  pedidoDetalheCancelar.addEventListener('click', () => {
    if (!podeGerenciarPedidos || !pedidoDetalheAtual) return;
    fetch('api/pedidos_cancelar.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id: pedidoDetalheAtual })
    }).then(r => r.json()).then(res => {
      if (res && res.ok) {
        if (pedidoDetalheStatus) pedidoDetalheStatus.textContent = mapStatusPedido('cancelado');
        if (pedidoDetalheCancelar) pedidoDetalheCancelar.style.display = 'none';
        if (pedidoDetalheFinalizar) pedidoDetalheFinalizar.style.display = 'none';
        carregarRelatorio(paginaAtual);
      }
    });
  });
}

if (pedidoDetalheFinalizar) {
  pedidoDetalheFinalizar.addEventListener('click', () => {
    if (!podeGerenciarPedidos || !pedidoDetalheAtual) return;
    fetch('api/pedidos_finalizar.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id: pedidoDetalheAtual })
    }).then(r => r.json()).then(res => {
      if (res && res.ok) {
        if (pedidoDetalheStatus) pedidoDetalheStatus.textContent = mapStatusPedido('finalizado');
        if (pedidoDetalheFinalizar) pedidoDetalheFinalizar.style.display = 'none';
        if (pedidoDetalheCancelar) pedidoDetalheCancelar.style.display = 'none';
        carregarRelatorio(paginaAtual);
      }
    });
  });
}

if (modalPedidoDetalheEl) {
  modalPedidoDetalheEl.addEventListener('shown.bs.modal', () => {});
  modalPedidoDetalheEl.addEventListener('hidden.bs.modal', () => {});
}
if (clienteEditSalvar) {
  clienteEditSalvar.addEventListener('click', salvarClienteModal);
}
if (clienteEditNome) {
  clienteEditNome.addEventListener('input', () => {
    clienteEditNome.classList.remove('is-invalid');
    if (clienteEditNomeErro) clienteEditNomeErro.textContent = '';
  });
}
if (clienteEditTelefone) {
  clienteEditTelefone.addEventListener('input', () => {
    clienteEditTelefone.classList.remove('is-invalid');
    if (clienteEditTelefoneErro) clienteEditTelefoneErro.textContent = '';
    aplicarMascaraTelefone(clienteEditTelefone);
  });
  clienteEditTelefone.addEventListener('blur', () => aplicarMascaraTelefone(clienteEditTelefone));
}
if (modalClienteEditEl) {
  modalClienteEditEl.addEventListener('hidden.bs.modal', () => {
    if (clientePerfilReabrir && modalClientePerfil) {
      modalClientePerfil.show();
    }
    clientePerfilReabrir = false;
  });
}
if (clientePerfilTabs) {
  clientePerfilTabs.addEventListener('click', e => {
    const btn = e.target.closest('.cliente-tab');
    if (!btn) return;
    const alvo = btn.dataset.tab;
    clientePerfilTabs.querySelectorAll('.cliente-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#modalClientePerfil [data-tab-pane]').forEach(pane => {
      pane.classList.toggle('active', pane.dataset.tabPane === alvo);
    });
    if (alvo === 'pedidos' && !clientePedidosCarregado) {
      carregarPedidosCliente(1);
    }
    if (alvo === 'pontos' && !clientePontosCarregado) {
      carregarPontosCliente(1);
    }
  });
}
if (clientePedidosPeriodo) {
  clientePedidosPeriodo.addEventListener('change', () => carregarPedidosCliente(1));
}
if (clientePedidosTipo) {
  clientePedidosTipo.addEventListener('change', () => carregarPedidosCliente(1));
}
if (clientePedidosPaginacao) {
  clientePedidosPaginacao.addEventListener('click', e => {
    const btn = e.target.closest('button[data-page]');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page || 1);
    if (page > 0) carregarPedidosCliente(page);
  });
}
if (clientePontosPaginacao) {
  clientePontosPaginacao.addEventListener('click', e => {
    const btn = e.target.closest('button[data-page]');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page || 1);
    if (page > 0) carregarPontosCliente(page);
  });
}
if (clientePedidosLista) {
  clientePedidosLista.addEventListener('click', e => {
    const card = e.target.closest('.js-pedido-detalhe');
    if (!card) return;
    const pedidoId = card.dataset.pedidoId;
    if (pedidoId) abrirModalPedidoDetalhe(pedidoId);
  });
}
