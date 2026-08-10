(function(){
  const toastFlash = MOTOBOYS_DATA.toastFlash;
  if (toastFlash && window.finModule && typeof window.finModule.showToast === 'function') {
    window.finModule.showToast(toastFlash.msg || '', !!toastFlash.ok);
  }

  const modalEl = document.getElementById('motoboyModal');
  const modal = new bootstrap.Modal(modalEl);
  const deleteModal = new bootstrap.Modal(document.getElementById('motoboyDeleteModal'));
  const pedidoModalEl = document.getElementById('motoboyPedidoModal');
  const pedidoModal = pedidoModalEl ? new bootstrap.Modal(pedidoModalEl) : null;
  const openBtn = document.getElementById('motoboy-open-modal');
  const cancelBtn = document.getElementById('motoboy-cancel');
  const titleEl = document.getElementById('motoboy-modal-title');
  const idField = document.getElementById('motoboy-id');
  const nomeField = document.getElementById('motoboy-nome');
  const whatsField = document.getElementById('motoboy-whatsapp');
  const dataField = document.getElementById('motoboy-data');
  const ativoField = document.getElementById('motoboy-ativo');
  const submitBtn = document.getElementById('motoboy-submit');
  const deleteIdField = document.getElementById('motoboy-delete-id');
  const form = document.getElementById('motoboy-form');
  const pedidoNumero = document.getElementById('motoboyPedidoNumero');
  const pedidoTempo = document.getElementById('motoboyPedidoTempo');
  const pedidoHorario = document.getElementById('motoboyPedidoHorario');
  const pedidoStatus = document.getElementById('motoboyPedidoStatus');
  const pedidoCliente = document.getElementById('motoboyPedidoCliente');
  const pedidoTelefone = document.getElementById('motoboyPedidoTelefone');
  const pedidoTipo = document.getElementById('motoboyPedidoTipo');
  const pedidoEndereco = document.getElementById('motoboyPedidoEndereco');
  const pedidoTaxa = document.getElementById('motoboyPedidoTaxa');
  const pedidoMotoboy = document.getElementById('motoboyPedidoMotoboy');
  const pedidoPagamentos = document.getElementById('motoboyPedidoPagamentos');
  const pedidoItens = document.getElementById('motoboyPedidoItens');
  const pedidoSubtotal = document.getElementById('motoboyPedidoSubtotal');
  const pedidoTaxaResumo = document.getElementById('motoboyPedidoTaxaResumo');
  const pedidoTaxaLinha = document.getElementById('motoboyPedidoTaxaLinha');
  const pedidoTotal = document.getElementById('motoboyPedidoTotal');
  const pedidoImprimir = document.getElementById('motoboyPedidoImprimir');

  function resetMotoboyForm() {
    form.reset();
    idField.value = '0';
    titleEl.textContent = 'Novo motoboy';
    submitBtn.textContent = 'Salvar motoboy';
    ativoField.value = '1';
    dataField.value = MOTOBOYS_DATA.todayDate;
  }

  function maskWhatsapp(value) {
    const digits = String(value || '').replace(/\D+/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
    return digits;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  }

  function mapStatus(status) {
    const map = { pendente:'Pendente', aceito:'Aceito', preparando:'Preparando', entrega:'Saiu para entrega', finalizado:'Finalizado', cancelado:'Cancelado' };
    return map[String(status || '').toLowerCase()] || (status || '-');
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const normalized = String(dateStr).replace(' ', 'T');
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function tempoDesde(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(String(dateStr).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return '-';
    const diff = Math.max(0, Date.now() - d.getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'feito há 0 minutos';
    if (minutes < 60) return `feito há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `feito há ${hours} hora${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `feito há ${days} dia${days > 1 ? 's' : ''}`;
  }

  function imprimirPedido(id) {
    if (!id) return;
    window.open(`api/pedido_imprimir.php?id=${id}`, '_blank');
  }

  function preencherPedidoModal(data) {
    const pedido = data.pedido || {};
    const itens = Array.isArray(data.itens) ? data.itens : [];
    const pagamentos = Array.isArray(data.pagamentos) ? data.pagamentos : [];
    pedidoNumero.textContent = `Pedido N. ${pedido.codigo || pedido.id || '-'}`;
    pedidoTempo.textContent = tempoDesde(pedido.criado_em);
    pedidoHorario.textContent = formatDateTime(pedido.criado_em);
    pedidoStatus.textContent = mapStatus(pedido.status);
    pedidoCliente.textContent = pedido.nome || '-';
    pedidoTelefone.textContent = pedido.telefone || '-';
    pedidoTipo.textContent = ((pedido.tipo || '').toLowerCase() === 'retirada') ? 'RETIRADA' : 'ENTREGA';
    pedidoEndereco.textContent = pedido.endereco_entrega || '-';
    pedidoTaxa.textContent = formatMoney(pedido.taxa_entrega || 0);
    pedidoMotoboy.textContent = pedido.motoboy_nome || '-';
    pedidoPagamentos.innerHTML = pagamentos.length
      ? pagamentos.map((p) => `${p.forma || '-'} ${formatMoney(p.valor || 0)}`).join('<br>')
      : `${pedido.forma_pagamento || '-'} ${formatMoney(pedido.total || 0)}`;
    pedidoItens.innerHTML = itens.length
      ? itens.map((item) => `<div class="pedido-detalhe-item-row"><span>${item.quantidade}x ${item.produto_nome}</span><strong>${formatMoney((item.quantidade || 0) * (item.preco || 0))}</strong></div>`).join('')
      : '<div class="pedido-detalhe-item-row"><span>Sem itens.</span><strong>-</strong></div>';
    pedidoSubtotal.textContent = formatMoney(pedido.subtotal || pedido.total || 0);
    pedidoTaxaResumo.textContent = formatMoney(pedido.taxa_entrega || 0);
    pedidoTaxaLinha.style.display = Number(pedido.taxa_entrega || 0) > 0 ? 'flex' : 'none';
    pedidoTotal.textContent = formatMoney(pedido.total || 0);
    if (pedidoImprimir) {
      pedidoImprimir.onclick = () => imprimirPedido(pedido.id || '');
    }
  }

  function abrirPedidoModal(id) {
    if (!pedidoModal || !id) return;
    pedidoItens.innerHTML = '<div class="pedido-detalhe-item-row"><span>Carregando pedido...</span><strong>-</strong></div>';
    pedidoModal.show();
    fetch(`api/pedido_detalhe.php?pedido_id=${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json || !json.ok) return;
        preencherPedidoModal(json);
      })
      .catch(() => {});
  }

  openBtn?.addEventListener('click', () => {
    resetMotoboyForm();
    modal.show();
  });

  cancelBtn?.addEventListener('click', () => {
    resetMotoboyForm();
    modal.hide();
  });

  whatsField?.addEventListener('input', () => {
    whatsField.value = maskWhatsapp(whatsField.value);
  });
  document.getElementById('motoboy-periodo')?.addEventListener('change', (event) => {
    const isCustom = event.target.value === 'customizado';
    document.getElementById('motoboy-data-inicio-wrap')?.classList.toggle('d-none', !isCustom);
    document.getElementById('motoboy-data-fim-wrap')?.classList.toggle('d-none', !isCustom);
    if (!isCustom) {
      document.getElementById('motoboy-filter-form')?.submit();
    }
  });
  document.querySelectorAll('#motoboy-filter-form input[type="date"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (document.getElementById('motoboy-periodo')?.value === 'customizado') {
        document.getElementById('motoboy-filter-form')?.submit();
      }
    });
  });

  document.addEventListener('click', (event) => {
    const editBtn = event.target.closest('.js-motoboy-edit');
    if (editBtn) {
      idField.value = editBtn.dataset.id || '0';
      nomeField.value = editBtn.dataset.nome || '';
      whatsField.value = maskWhatsapp(editBtn.dataset.whatsapp || '');
      dataField.value = editBtn.dataset.data || MOTOBOYS_DATA.todayDate;
      ativoField.value = editBtn.dataset.ativo || '1';
      titleEl.textContent = 'Editar motoboy';
      submitBtn.textContent = 'Salvar alterações';
      modal.show();
      return;
    }

    const deleteBtn = event.target.closest('.js-motoboy-delete');
    if (deleteBtn) {
      deleteIdField.value = deleteBtn.dataset.id || '0';
      deleteModal.show();
      return;
    }

    const pedidoBtn = event.target.closest('.js-open-pedido');
    if (pedidoBtn) {
      abrirPedidoModal(pedidoBtn.dataset.pedidoId || '');
    }
  });
})();

// ── Entregas vinculadas – paginação AJAX ──────────────────────────────────
var estadoEntregas = {
  periodo:     MOTOBOYS_DATA.periodo,
  data_inicio: MOTOBOYS_DATA.dataInicio,
  data_fim:    MOTOBOYS_DATA.dataFim,
  page:        MOTOBOYS_DATA.page,
  per_page:    MOTOBOYS_DATA.perPage,
};

function _escEnt(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _calcCodigo(id, base) {
  id = parseInt(id)||0; base = parseInt(base)||0;
  return (base > 0 && id > base) ? Math.max(1, id - base) : id;
}
function _fmtMoney(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v||0));
}
function _fmtDateTime(dateStr) {
  if (!dateStr) return '-';
  var d = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function _renderEntregaRow(e, codigoBase) {
  var codigo   = _calcCodigo(e.id, codigoBase);
  var dataFmt  = _fmtDateTime(e.criado_em);
  var taxaFmt  = _fmtMoney(e.taxa_entrega || 0);
  var endereco = _escEnt(e.endereco_entrega || '').replace(/\n/g,'<br>');
  return '<tr>' +
    '<td><strong>#' + codigo + '</strong><small>' + _escEnt(dataFmt) + '</small></td>' +
    '<td><strong>' + _escEnt(e.cliente_nome||'') + '</strong><small>' + _escEnt(e.cliente_telefone||'') + '</small></td>' +
    '<td><div class="motoboy-address">' + endereco + '</div></td>' +
    '<td>' + taxaFmt + '</td>' +
    '<td><strong>' + _escEnt(e.motoboy_nome||'') + '</strong><small>' + _escEnt(e.motoboy_whatsapp||'') + '</small></td>' +
    '<td><button class="btn motoboy-detail-btn js-open-pedido" type="button" data-pedido-id="' + (parseInt(e.id)||0) + '" title="Visualizar pedido"><i class="bi bi-eye"></i></button></td>' +
    '</tr>';
}
function _renderEntregasPag(page, totalPages) {
  var el = document.getElementById('entregasPagination');
  if (!el) return;
  function btn(label, p, disabled, title) {
    return '<button class="rc-page-btn' + (disabled?' disabled':'') + '" ' +
      (disabled?'disabled ':'') +
      'onclick="carregarEntregas(' + p + ',estadoEntregas.per_page)" title="' + title + '">' + label + '</button>';
  }
  el.innerHTML =
    btn('«', 1, page<=1, 'Primeira') +
    btn('‹', Math.max(1,page-1), page<=1, 'Anterior') +
    '<span class="rc-page-label" id="entregasPagLabel">Página ' + page + ' de ' + totalPages + '</span>' +
    btn('›', Math.min(totalPages,page+1), page>=totalPages, 'Próxima') +
    btn('»', totalPages, page>=totalPages, 'Última');
}
function carregarEntregas(page, perPage) {
  estadoEntregas.page     = parseInt(page)    || 1;
  estadoEntregas.per_page = parseInt(perPage) || 10;
  var tbody = document.getElementById('entregasTableBody');
  var info  = document.getElementById('entregasInfo');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#9ca3af;font-size:.8rem">Carregando...</td></tr>';
  var params = new URLSearchParams({
    periodo:     estadoEntregas.periodo,
    data_inicio: estadoEntregas.data_inicio,
    data_fim:    estadoEntregas.data_fim,
    page:        estadoEntregas.page,
    per_page:    estadoEntregas.per_page,
  });
  fetch('api/motoboys_entregas.php?' + params)
    .then(function(r){ return r.json(); })
    .then(function(json){
      if (!json || !json.ok) return;
      estadoEntregas.page     = json.page;
      estadoEntregas.per_page = json.per_page;
      var sel = document.getElementById('entregasPerPage');
      if (sel) sel.value = json.per_page;
      if (info) info.textContent = 'Mostrando ' + json.mostrando_de + ' a ' + json.mostrando_ate + ' de ' + json.total + ' entrega(s)';
      if (tbody) {
        if (!json.entregas || !json.entregas.length) {
          tbody.innerHTML = '<tr><td colspan="6"><div class="fin-empty">Nenhuma entrega finalizada no período selecionado.</div></td></tr>';
        } else {
          tbody.innerHTML = json.entregas.map(function(e){ return _renderEntregaRow(e, json.codigo_base); }).join('');
        }
      }
      _renderEntregasPag(json.page, json.total_pages);
    })
    .catch(function(){
      if (tbody) tbody.innerHTML = '<tr><td colspan="6"><div class="fin-empty">Erro ao carregar entregas.</div></td></tr>';
    });
}
