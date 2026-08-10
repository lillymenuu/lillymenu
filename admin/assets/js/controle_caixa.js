const caixaAtual = CAIXA_DATA.caixaAtual;
const btnCaixa = document.getElementById('btnCaixa');
const modalCaixaEl = document.getElementById('modalCaixa');
const modalCaixa = modalCaixaEl ? new bootstrap.Modal(modalCaixaEl) : null;
const modalCaixaDetalheEl = document.getElementById('modalCaixaDetalhe');
const modalCaixaDetalhe = modalCaixaDetalheEl ? new bootstrap.Modal(modalCaixaDetalheEl) : null;
const modalEditarAberturaEl = document.getElementById('modalEditarAbertura');
const modalEditarAbertura = modalEditarAberturaEl ? new bootstrap.Modal(modalEditarAberturaEl) : null;
const caixaFormAbrir = document.getElementById('caixaFormAbrir');
const caixaFormFechar = document.getElementById('caixaFormFechar');
const caixaOperador = document.getElementById('caixaOperador');
const caixaSaldoInicial = document.getElementById('caixaSaldoInicial');
const caixaObsAbrir = document.getElementById('caixaObsAbrir');
const caixaAbertoEm = document.getElementById('caixaAbertoEm');
const caixaSaldoInicialInfo = document.getElementById('caixaSaldoInicialInfo');
const caixaSaldoFinal = document.getElementById('caixaSaldoFinal');
const caixaObsToggle = document.getElementById('caixaObsToggle');
const caixaObsFecharWrap = document.getElementById('caixaObsFecharWrap');
const caixaObsFechar = document.getElementById('caixaObsFechar');
const btnCaixaSalvar = document.getElementById('btnCaixaSalvar');
const btnCaixaCancelar = document.getElementById('btnCaixaCancelar');
const btnCaixaCalculadora = document.getElementById('btnCaixaCalculadora');
const tituloCaixa = document.getElementById('tituloCaixa');
const formSuprimento = document.getElementById('formSuprimento');
const formSangria = document.getElementById('formSangria');
const btnResumoPrint = document.getElementById('btnResumoPrint');
const btnAddMovimentacao = document.getElementById('btnAddMovimentacao');
const caixaMovFormWrap = document.getElementById('caixaMovFormWrap');
const btnEditarAbertura = document.getElementById('btnEditarAbertura');
const caixaEditarOperadorInfo = document.getElementById('caixaEditarOperadorInfo');
const caixaEditarSaldoInfo = document.getElementById('caixaEditarSaldoInfo');
const caixaEditarDataInput = document.getElementById('caixaEditarDataInput');
const caixaEditarHoraInput = document.getElementById('caixaEditarHoraInput');
const btnSalvarEditarAbertura = document.getElementById('btnSalvarEditarAbertura');
const filtroPeriodo = document.getElementById('filtroPeriodo');
const filtroTurno = document.getElementById('filtroTurno');
const campoPeriodoCustom = document.getElementById('campoPeriodoCustom');
const caixaOpenPills = document.querySelectorAll('.caixa-open-pill[data-forma]');
const caixaOpenMovTableBody = document.getElementById('caixaOpenMovTableBody');
const caixaOpenMovEmpty = document.getElementById('caixaOpenMovEmpty');
const caixaOpenEntradaStat = document.getElementById('caixaOpenEntradaStat');
const caixaOpenSaidaStat = document.getElementById('caixaOpenSaidaStat');
const caixaOpenSaldoStat = document.getElementById('caixaOpenSaldoStat');
const caixaDetalheSub = document.getElementById('caixaDetalheSub');
const caixaDetalheTop = document.getElementById('caixaDetalheTop');
const caixaDetalheEntrada = document.getElementById('caixaDetalheEntrada');
const caixaDetalheSaida = document.getElementById('caixaDetalheSaida');
const caixaDetalheSaldo = document.getElementById('caixaDetalheSaldo');
const caixaDetalheFormas = document.getElementById('caixaDetalheFormas');
const caixaDetalheTableBody = document.getElementById('caixaDetalheTableBody');
const caixaDetalhePaginationInfo = document.getElementById('caixaDetalhePaginationInfo');
const caixaDetalhePaginationNav = document.getElementById('caixaDetalhePaginationNav');
let caixaDetalheLinhasAtual = [];
let caixaDetalhePaginaAtual = 1;
const caixaDetalhePorPagina = 4;
const caixaTotalVendasAtual = CAIXA_DATA.totalVendasAtual;

function formatarDinheiro(valor){
  const numero = Number(valor || 0);
  return numero.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

function formatarDinheiroInput(valor){
  const numero = Number(valor || 0);
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseDinheiroInput(valor){
  const texto = String(valor || '').trim();
  if (!texto) return 0;
  const normalizado = texto.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function aplicarMascaraDinheiroInput(campo){
  if (!campo) return;
  const digitos = String(campo.value || '').replace(/\D/g, '');
  const numero = digitos ? (Number(digitos) / 100) : 0;
  campo.value = numero
    ? numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
}

function syncCaixaObsToggle(){
  const ativo = !!(caixaObsToggle && caixaObsToggle.checked);
  if (caixaObsFecharWrap) {
    caixaObsFecharWrap.classList.toggle('d-none', !ativo);
  }
  if (!ativo && caixaObsFechar) {
    caixaObsFechar.value = '';
  }
}

function normalizarData(valor){
  if (!valor) return '';
  return valor.includes(' ') ? valor.replace(' ', 'T') : valor;
}

function mostrarToast(msg, tipo){
  const toast = document.getElementById('caixaToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.background = tipo === 'ok' ? '#16a34a' : '#111827';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function atualizarVisibilidadePeriodo(){
  if (!campoPeriodoCustom) return;
  const custom = filtroPeriodo && filtroPeriodo.value === 'customizado';
  const turno = filtroTurno && filtroTurno.value !== '0';
  campoPeriodoCustom.style.display = custom && !turno ? 'block' : 'none';
}

function enviarMovimento(tipo, form){
  if (!form) return;
  if (!caixaAtual || caixaAtual.status !== 'aberto') {
    mostrarToast('Caixa fechado. Abra o caixa para registrar ajustes.');
    return;
  }
  const valor = form.querySelector('[name="valor"]');
  const obs = form.querySelector('[name="observacoes"]');
  const numero = parseFloat(valor ? valor.value : 0);
  if (!numero || numero <= 0) {
    mostrarToast('Informe um valor valido.');
    return;
  }
  fetch('api/caixa_movimentar.php', {
    method:'POST',
    headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      tipo,
      valor: numero,
      observacoes: obs ? obs.value.trim() : ''
    })
  })
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok) {
        mostrarToast(res && res.msg ? res.msg : 'Nao foi possivel registrar a movimentacao.');
        return;
      }
      mostrarToast('Movimentacao registrada.', 'ok');
      setTimeout(() => location.reload(), 500);
    });
}

function abrirModalCaixa(){
  if (!modalCaixa) return;
  const aberto = caixaAtual && caixaAtual.status === 'aberto';
  if (tituloCaixa) {
    tituloCaixa.textContent = aberto ? 'Fechar caixa' : 'Abrir caixa';
  }
  if (btnCaixaSalvar) {
    btnCaixaSalvar.textContent = aberto ? 'Salvar' : 'Confirmar';
  }
  if (btnCaixaCancelar) {
    btnCaixaCancelar.classList.toggle('d-none', !aberto);
  }
  if (btnCaixaCalculadora) {
    btnCaixaCalculadora.classList.toggle('d-none', aberto);
  }
  if (caixaFormAbrir && caixaFormFechar) {
    caixaFormAbrir.classList.toggle('d-none', aberto);
    caixaFormFechar.classList.toggle('d-none', !aberto);
  }
  if (aberto) {
    if (caixaAbertoEm) {
      caixaAbertoEm.textContent = caixaAtual.aberto_em
        ? new Date(normalizarData(caixaAtual.aberto_em)).toLocaleString('pt-BR')
        : '-';
    }
    if (caixaSaldoInicialInfo) {
      caixaSaldoInicialInfo.value = formatarDinheiro(caixaAtual.saldo_inicial || 0);
    }
    if (caixaSaldoFinal) caixaSaldoFinal.value = Number(caixaTotalVendasAtual || 0).toFixed(2);
    if (caixaObsToggle) caixaObsToggle.checked = false;
    if (caixaObsFechar) caixaObsFechar.value = '';
    syncCaixaObsToggle();
  } else {
    if (caixaOperador) caixaOperador.value = CAIXA_DATA.operadorId;
    if (caixaSaldoInicial) caixaSaldoInicial.value = '';
    if (caixaObsAbrir) caixaObsAbrir.value = '';
    if (window.syncCustomSelect && caixaOperador) {
      window.syncCustomSelect(caixaOperador);
    }
  }
  modalCaixa.show();
}

function salvarCaixa(){
  if (!modalCaixa) return;
  const aberto = caixaAtual && caixaAtual.status === 'aberto';
  if (aberto) {
    const saldoFinal = parseFloat(caixaSaldoFinal ? caixaSaldoFinal.value : 0);
    fetch('api/caixa_fechar.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        caixa_id: caixaAtual.id,
        saldo_final: isNaN(saldoFinal) ? 0 : saldoFinal,
        observacoes: caixaObsFechar ? caixaObsFechar.value.trim() : ''
      })
    })
      .then(r => r.json())
      .then(res => {
        if (!res || !res.ok) {
          mostrarToast(res && res.msg ? res.msg : 'Nao foi possivel fechar o caixa');
          return;
        }
        mostrarToast('Caixa fechado com sucesso', 'ok');
        setTimeout(() => location.reload(), 600);
      });
    return;
  }

  const saldoInicial = parseDinheiroInput(caixaSaldoInicial ? caixaSaldoInicial.value : 0);
  fetch('api/caixa_abrir.php', {
    method:'POST',
    headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      operador_id: caixaOperador ? caixaOperador.value : '',
      saldo_inicial: isNaN(saldoInicial) ? 0 : saldoInicial,
      observacoes: caixaObsAbrir ? caixaObsAbrir.value.trim() : ''
    })
  })
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok) {
        mostrarToast(res && res.msg ? res.msg : 'Nao foi possivel abrir o caixa');
        return;
      }
      mostrarToast('Caixa aberto com sucesso', 'ok');
      setTimeout(() => location.reload(), 600);
    });
}

if (btnCaixa) {
  btnCaixa.addEventListener('click', abrirModalCaixa);
}
if (btnCaixaSalvar) {
  btnCaixaSalvar.addEventListener('click', salvarCaixa);
}
if (caixaObsToggle) {
  caixaObsToggle.addEventListener('change', syncCaixaObsToggle);
}
if (btnCaixaCalculadora) {
  btnCaixaCalculadora.addEventListener('click', () => {
    if (caixaSaldoInicial) caixaSaldoInicial.focus();
    mostrarToast('Informe manualmente o valor inicial do caixa.');
  });
}

if (caixaSaldoInicial) {
  caixaSaldoInicial.addEventListener('input', () => aplicarMascaraDinheiroInput(caixaSaldoInicial));
  caixaSaldoInicial.addEventListener('blur', () => {
    if (!caixaSaldoInicial.value) return;
    const numero = parseDinheiroInput(caixaSaldoInicial.value);
    caixaSaldoInicial.value = formatarDinheiroInput(numero);
  });
}

function labelFormaCaixaJs(forma){
  switch ((forma || '').toLowerCase()) {
    case 'pix': return 'Pix';
    case 'dinheiro': return 'Dinheiro';
    case 'credito': return 'Crédito';
    case 'debito': return 'Débito';
    case 'voucher': return 'Voucher';
    case 'manual': return 'Manual';
    default: return 'Outros';
  }
}

function renderCaixaDetalheTop(caixa){
  if (!caixaDetalheTop) return;
  const aberto = caixa?.aberto_em ? new Date(normalizarData(caixa.aberto_em)).toLocaleString('pt-BR') : '-';
  const fechado = caixa?.fechado_em ? new Date(normalizarData(caixa.fechado_em)).toLocaleString('pt-BR') : '-';
  const status = (caixa?.status || '').toLowerCase() === 'aberto' ? 'Aberto' : 'Fechado';
  caixaDetalheTop.innerHTML = `
    <div class="caixa-detail-chip"><div class="caixa-detail-chip-label">Caixa</div><div class="caixa-detail-chip-value">#${caixa?.id || '-'}</div></div>
    <div class="caixa-detail-chip"><div class="caixa-detail-chip-label">Status</div><div class="caixa-detail-chip-value">${status}</div></div>
    <div class="caixa-detail-chip"><div class="caixa-detail-chip-label">Aberto em</div><div class="caixa-detail-chip-value">${aberto}</div></div>
    <div class="caixa-detail-chip"><div class="caixa-detail-chip-label">Fechado em</div><div class="caixa-detail-chip-value">${fechado}</div></div>
  `;
  if (caixaDetalheSub) {
    caixaDetalheSub.textContent = `Operador: ${caixa?.operador || '-'} • Saldo inicial: ${formatarDinheiro(caixa?.saldo_inicial || 0)}`;
  }
}

function renderCaixaDetalheFormas(formas){
  if (!caixaDetalheFormas) return;
  const itens = Object.entries(formas || {});
  if (!itens.length) {
    caixaDetalheFormas.innerHTML = '<div class="caixa-detail-line"><span>Nenhuma forma registrada</span><strong>R$ 0,00</strong></div>';
    return;
  }
  caixaDetalheFormas.innerHTML = itens.map(([forma, total]) => `
    <div class="caixa-detail-line">
      <span>${labelFormaCaixaJs(forma)}</span>
      <strong>${formatarDinheiro(total)}</strong>
    </div>
  `).join('');
}

function renderCaixaDetalhePaginacao(){
  if (!caixaDetalhePaginationInfo || !caixaDetalhePaginationNav) return;
  const total = caixaDetalheLinhasAtual.length;
  const totalPaginas = Math.max(1, Math.ceil(total / caixaDetalhePorPagina));
  if (caixaDetalhePaginaAtual > totalPaginas) caixaDetalhePaginaAtual = totalPaginas;
  const inicio = total ? ((caixaDetalhePaginaAtual - 1) * caixaDetalhePorPagina) + 1 : 0;
  const fim = total ? Math.min(caixaDetalhePaginaAtual * caixaDetalhePorPagina, total) : 0;
  caixaDetalhePaginationInfo.textContent = `Mostrando ${inicio}–${fim} de ${total} movimentações`;
  caixaDetalhePaginationNav.innerHTML = '';
  const mk = (label, page, active = false, disabled = false) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `caixa-detail-page-btn${active ? ' active' : ''}`;
    btn.textContent = label;
    btn.disabled = disabled;
    btn.addEventListener('click', () => {
      if (disabled || page === caixaDetalhePaginaAtual) return;
      caixaDetalhePaginaAtual = page;
      renderCaixaDetalheLinhas(caixaDetalheLinhasAtual);
    });
    caixaDetalhePaginationNav.appendChild(btn);
  };
  mk('‹', Math.max(1, caixaDetalhePaginaAtual - 1), false, caixaDetalhePaginaAtual === 1 || total === 0);
  for (let i = 1; i <= totalPaginas; i++) {
    mk(String(i), i, i === caixaDetalhePaginaAtual, false);
  }
  mk('›', Math.min(totalPaginas, caixaDetalhePaginaAtual + 1), false, caixaDetalhePaginaAtual === totalPaginas || total === 0);
}

function renderCaixaDetalheLinhas(linhas){
  if (!caixaDetalheTableBody) return;
  caixaDetalheLinhasAtual = Array.isArray(linhas) ? linhas : [];
  if (!caixaDetalheLinhasAtual.length) {
    caixaDetalheTableBody.innerHTML = '<tr><td colspan="6" class="caixa-detail-empty">Nenhuma movimentação encontrada para este caixa.</td></tr>';
    renderCaixaDetalhePaginacao();
    return;
  }
  const inicio = (caixaDetalhePaginaAtual - 1) * caixaDetalhePorPagina;
  const itensPagina = caixaDetalheLinhasAtual.slice(inicio, inicio + caixaDetalhePorPagina);
  caixaDetalheTableBody.innerHTML = itensPagina.map((item) => {
    const direcao = (item.direcao || 'entrada') === 'saida' ? 'Saída' : 'Entrada';
    const badgeClass = direcao === 'Saída' ? 'sangria' : 'suprimento';
    const origemClass = String(item.origem || '').toUpperCase() === 'LILLY' ? 'lilly' : 'manual';
    const data = item.criado_em ? `${new Date(normalizarData(item.criado_em)).toLocaleDateString('pt-BR')} às ${new Date(normalizarData(item.criado_em)).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}` : '-';
    return `
      <tr>
        <td>${labelFormaCaixaJs(item.forma || 'outro')}</td>
        <td>${data}</td>
        <td><span class="caixa-move-badge ${badgeClass}">${direcao}</span></td>
        <td>${item.observacoes || '-'}</td>
        <td>${formatarDinheiro(item.valor || 0)}</td>
        <td><span class="caixa-origin-badge ${origemClass}">${item.origem || 'MANUAL'}</span></td>
      </tr>
    `;
  }).join('');
  renderCaixaDetalhePaginacao();
}

async function abrirDetalheCaixa(caixaId){
  if (!modalCaixaDetalhe || !caixaId) return;
  caixaDetalhePaginaAtual = 1;
  if (caixaDetalheSub) caixaDetalheSub.textContent = 'Carregando informações do turno selecionado...';
  if (caixaDetalheTop) caixaDetalheTop.innerHTML = '<div class="caixa-detail-chip"><div class="caixa-detail-chip-label">Caixa</div><div class="caixa-detail-chip-value">Carregando...</div></div>';
  if (caixaDetalheEntrada) caixaDetalheEntrada.textContent = 'R$ 0,00';
  if (caixaDetalheSaida) caixaDetalheSaida.textContent = 'R$ 0,00';
  if (caixaDetalheSaldo) caixaDetalheSaldo.textContent = 'R$ 0,00';
  if (caixaDetalheFormas) caixaDetalheFormas.innerHTML = '<div class="caixa-detail-line"><span>Carregando</span><strong>...</strong></div>';
  if (caixaDetalheTableBody) caixaDetalheTableBody.innerHTML = '<tr><td colspan="6" class="caixa-detail-empty">Carregando movimentações...</td></tr>';
  if (caixaDetalhePaginationInfo) caixaDetalhePaginationInfo.textContent = 'Mostrando 0–0 de 0 movimentações';
  if (caixaDetalhePaginationNav) caixaDetalhePaginationNav.innerHTML = '';
  modalCaixaDetalhe.show();
  try {
    const response = await fetch(`api/caixa_detalhe.php?caixa_id=${encodeURIComponent(caixaId)}`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    const res = await response.json();
    if (!res || !res.ok) {
      mostrarToast(res && res.msg ? res.msg : 'Não foi possível carregar o caixa.');
      if (caixaDetalheTableBody) caixaDetalheTableBody.innerHTML = '<tr><td colspan="6" class="caixa-detail-empty">Não foi possível carregar as movimentações.</td></tr>';
      return;
    }
    renderCaixaDetalheTop(res.caixa || {});
    if (caixaDetalheEntrada) caixaDetalheEntrada.textContent = formatarDinheiro(res.resumo?.entrada || 0);
    if (caixaDetalheSaida) caixaDetalheSaida.textContent = formatarDinheiro(res.resumo?.saida || 0);
    if (caixaDetalheSaldo) caixaDetalheSaldo.textContent = formatarDinheiro(res.resumo?.saldo || 0);
    renderCaixaDetalheFormas(res.formas || {});
    renderCaixaDetalheLinhas(res.linhas || []);
  } catch (e) {
    mostrarToast('Não foi possível carregar o caixa.');
    if (caixaDetalheTableBody) caixaDetalheTableBody.innerHTML = '<tr><td colspan="6" class="caixa-detail-empty">Não foi possível carregar as movimentações.</td></tr>';
  }
}

function atualizarFiltroMovimentacoesCaixa(forma = 'todos'){
  if (!caixaOpenMovTableBody) return;
  const rows = Array.from(caixaOpenMovTableBody.querySelectorAll('tr[data-forma]'));
  if (!rows.length) return;

  let entrada = 0;
  let visiveis = 0;

  rows.forEach(row => {
    const rowForma = (row.dataset.forma || 'outro').toLowerCase();
    const mostrar = forma === 'todos' || rowForma === forma;
    row.classList.toggle('d-none', !mostrar);
    if (!mostrar) return;
    visiveis += 1;
    const valor = parseFloat(row.dataset.valor || '0') || 0;
    entrada += valor;
  });

  if (caixaOpenMovEmpty) {
    caixaOpenMovEmpty.classList.toggle('d-none', visiveis > 0);
  }
  if (caixaOpenEntradaStat) {
    caixaOpenEntradaStat.innerHTML = `<i class="bi bi-arrow-up"></i>${formatarDinheiro(entrada)}`;
  }
  if (caixaOpenSaidaStat) {
    caixaOpenSaidaStat.innerHTML = `<i class="bi bi-arrow-down"></i>${formatarDinheiro(0)}`;
  }
  if (caixaOpenSaldoStat) {
    caixaOpenSaldoStat.innerHTML = `<i class="bi bi-graph-up-arrow"></i>${formatarDinheiro(entrada)}`;
  }
}
if (caixaOpenPills.length) {
  caixaOpenPills.forEach(btn => {
    btn.addEventListener('click', () => {
      caixaOpenPills.forEach(item => item.classList.toggle('active', item === btn));
      atualizarFiltroMovimentacoesCaixa(btn.dataset.forma || 'todos');
    });
  });
  atualizarFiltroMovimentacoesCaixa('todos');
}
if (btnResumoPrint) {
  btnResumoPrint.addEventListener('click', () => window.print());
}
if (btnAddMovimentacao) {
  btnAddMovimentacao.addEventListener('click', () => {
    if (!caixaMovFormWrap) return;
    caixaMovFormWrap.classList.toggle('d-none');
    caixaMovFormWrap.scrollIntoView({ behavior:'smooth', block:'nearest' });
  });
}
if (btnEditarAbertura) {
  btnEditarAbertura.addEventListener('click', () => {
    if (!caixaAtual || !caixaAtual.id) {
      mostrarToast('Nenhum caixa aberto para editar.');
      return;
    }
    const base = normalizarData(caixaAtual.aberto_em || '');
    const [dataParte, horaParteCompleta] = base.split('T');
    const horaParte = (horaParteCompleta || '').slice(0, 5);
    if (caixaEditarOperadorInfo) {
      caixaEditarOperadorInfo.textContent = caixaAtual.operador || '—';
    }
    if (caixaEditarSaldoInfo) {
      caixaEditarSaldoInfo.textContent = formatarDinheiro(caixaAtual.saldo_inicial || 0);
    }
    if (caixaEditarDataInput) {
      caixaEditarDataInput.value = dataParte
        ? new Date(`${dataParte}T00:00:00`).toLocaleDateString('pt-BR')
        : '';
    }
    if (caixaEditarHoraInput) {
      caixaEditarHoraInput.value = horaParte;
    }
    if (modalEditarAbertura) {
      modalEditarAbertura.show();
    }
  });
}
if (btnSalvarEditarAbertura) {
  btnSalvarEditarAbertura.addEventListener('click', async () => {
    if (!caixaAtual || !caixaAtual.id || !caixaEditarHoraInput) {
      mostrarToast('Nenhum caixa aberto para editar.');
      return;
    }
    const base = normalizarData(caixaAtual.aberto_em || '');
    const [dataParte] = base.split('T');
    const novaHora = (caixaEditarHoraInput.value || '').trim();
    if (!dataParte || !novaHora) {
      mostrarToast('Informe o novo horário de abertura.');
      caixaEditarHoraInput.focus();
      return;
    }
    const novo = `${dataParte} ${novaHora}:00`;
    try {
      const response = await fetch('api/caixa_editar_abertura.php', {
        method:'POST',
        headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          caixa_id: caixaAtual.id,
          aberto_em: novo
        })
      });
      const res = await response.json();
      if (!res || !res.ok) {
        mostrarToast(res && res.msg ? res.msg : 'Nao foi possivel editar o horario.');
        return;
      }
      mostrarToast('Horario de abertura atualizado.', 'ok');
      if (modalEditarAbertura) modalEditarAbertura.hide();
      setTimeout(() => location.reload(), 500);
    } catch (e) {
      mostrarToast('Nao foi possivel editar o horario.');
    }
  });
}
document.addEventListener('click', async (event) => {
  const rowBtn = event.target.closest('.caixa-history-rowbtn[data-caixa-id]');
  if (rowBtn) {
    event.preventDefault();
    abrirDetalheCaixa(rowBtn.dataset.caixaId);
    return;
  }
  const link = event.target.closest('.caixa-history-page[data-ajax="1"]');
  if (!link) return;
  event.preventDefault();
  const wrap = document.getElementById('caixaHistoricoFechadoWrap');
  if (!wrap) return;
  try {
    wrap.style.opacity = '.55';
    const response = await fetch(link.href, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    const html = await response.text();
    wrap.innerHTML = html;
    wrap.style.opacity = '1';
    const url = new URL(link.href, window.location.origin);
    url.searchParams.delete('historico_ajax');
    window.history.replaceState({}, '', url.toString());
  } catch (e) {
    wrap.style.opacity = '1';
    mostrarToast('Nao foi possivel atualizar o historico.');
  }
});
if (formSuprimento) {
  formSuprimento.addEventListener('submit', event => {
    event.preventDefault();
    enviarMovimento('suprimento', formSuprimento);
  });
}
if (formSangria) {
  formSangria.addEventListener('submit', event => {
    event.preventDefault();
    enviarMovimento('sangria', formSangria);
  });
}
if (filtroPeriodo || filtroTurno) {
  atualizarVisibilidadePeriodo();
  if (filtroPeriodo) {
    filtroPeriodo.addEventListener('change', atualizarVisibilidadePeriodo);
  }
  if (filtroTurno) {
    filtroTurno.addEventListener('change', atualizarVisibilidadePeriodo);
  }
}

function buildCustomSelect(select){
  if (!select || select.dataset.customBuilt === '1') return;
  select.dataset.customBuilt = '1';
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';
  const parent = select.parentElement;
  parent.insertBefore(wrapper, select);
  wrapper.appendChild(select);
  select.style.display = 'none';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-select-trigger';
  const left = document.createElement('span');
  left.className = 'select-left';

  const iconClass = select.dataset.icon;
  if (iconClass) {
    const icon = document.createElement('i');
    icon.className = `bi ${iconClass}`;
    icon.classList.add('select-icon');
    left.appendChild(icon);
  }

  const value = document.createElement('span');
  value.className = 'custom-select-value';
  left.appendChild(value);
  trigger.appendChild(left);

  const arrow = document.createElement('span');
  arrow.className = 'select-arrow';
  arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
  trigger.appendChild(arrow);

  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';

  const renderOptions = () => {
    menu.innerHTML = '';
    Array.from(select.options).forEach((opt) => {
      const item = document.createElement('div');
      item.className = 'custom-option' + (opt.selected ? ' selected' : '');
      item.dataset.value = opt.value;
      item.textContent = opt.textContent;
      item.addEventListener('click', () => {
        select.value = opt.value;
        value.textContent = opt.textContent;
        menu.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
        item.classList.add('selected');
        wrapper.classList.remove('open');
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      menu.appendChild(item);
    });
  };

  const syncValue = () => {
    const selected = select.options[select.selectedIndex];
    value.textContent = selected ? selected.textContent : 'Selecionar';
    menu.querySelectorAll('.custom-option').forEach(o => {
      o.classList.toggle('selected', o.dataset.value === select.value);
    });
  };

  renderOptions();
  syncValue();

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.custom-select.open').forEach(cs => {
      if (cs !== wrapper) cs.classList.remove('open');
    });
    wrapper.classList.toggle('open');
  });

  select.addEventListener('change', syncValue);
  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);
}

window.syncCustomSelect = function(select){
  if (!select) return;
  const wrapper = select.closest('.custom-select');
  const value = wrapper ? wrapper.querySelector('.custom-select-value') : null;
  const menu = wrapper ? wrapper.querySelector('.custom-select-menu') : null;
  if (!wrapper || !value || !menu) return;
  const selected = select.options[select.selectedIndex];
  value.textContent = selected ? selected.textContent : 'Selecionar';
  menu.querySelectorAll('.custom-option').forEach(o => {
    o.classList.toggle('selected', o.dataset.value === select.value);
  });
};

document.addEventListener('click', (e) => {
  document.querySelectorAll('.custom-select.open').forEach(cs => {
    if (!cs.contains(e.target)) cs.classList.remove('open');
  });
});

document.querySelectorAll('select.js-custom-select').forEach(buildCustomSelect);

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
