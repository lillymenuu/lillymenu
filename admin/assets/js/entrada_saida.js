function getEntradaSaidaTopDom() {
  return {
    tipoInput: document.getElementById('esTipoInput'),
    categoriaSelect: document.getElementById('esCategoriaSelect'),
    subcategoriaSelect: document.getElementById('esSubcategoriaSelect'),
    descricaoInput: document.getElementById('esDescricaoInput'),
    autocompleteWrap: document.getElementById('esAutocompleteWrap'),
    autocompleteMenu: document.getElementById('esMateriasPrimasMenu'),
    materiaPrimaIdInput: document.getElementById('esMateriaPrimaId'),
    valorInput: document.getElementById('esValorInput'),
    quantidadeInput: document.getElementById('esQuantidadeInput'),
    descontoInput: document.getElementById('esDescontoInput'),
    totalInput: document.getElementById('esTotalLancamento'),
    tipoBtns: Array.from(document.querySelectorAll('.es-type-btn'))
  };
}

const modalEditarBanco = document.getElementById('modalEditarBanco');
const modalEditarLancamento = document.getElementById('modalEditarLancamento');
const filtrosAutoForm = document.querySelector('.es-filters');
const esDeleteForm = document.getElementById('esDeleteForm');
const esDeleteAction = document.getElementById('esDeleteAction');
const esDeleteId = document.getElementById('esDeleteId');

function moedaPreview(valor){
  return 'R$ ' + Number(valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function atualizarTotalLancamento(valorEl, qtdEl, descontoEl, totalEl) {
  if (!valorEl || !qtdEl || !descontoEl || !totalEl) return;
  const valor = Number(valorEl.value || 0);
  const quantidade = Number(qtdEl.value || 0);
  const desconto = Number(descontoEl.value || 0);
  const total = Math.max(0, (valor * quantidade) - desconto);
  totalEl.value = moedaPreview(total);
}

function selecionarOpcao(selectEl, value) {
  if (!selectEl) return false;
  const targetValue = String(value || '');
  let found = false;
  Array.from(selectEl.options).forEach((opt) => {
    const match = String(opt.value) === targetValue;
    if (match) {
      opt.hidden = false;
      opt.selected = true;
      found = true;
    } else if (opt.selected) {
      opt.selected = false;
    }
  });
  selectEl.value = found ? targetValue : '';
  selectEl.dispatchEvent(new Event('change', { bubbles: true }));
  return found;
}

function filtrarMateriaPrimaLista() {
  const { autocompleteWrap, autocompleteMenu, descricaoInput } = getEntradaSaidaTopDom();
  if (!autocompleteWrap || !autocompleteMenu || !descricaoInput) return;
  const term = descricaoInput.value.trim().toLowerCase();
  let visible = 0;
  autocompleteMenu.querySelectorAll('[data-es-mp-item]').forEach((item) => {
    const text = `${item.dataset.nome || ''} ${item.dataset.fornecedor || ''} ${item.dataset.value || ''}`.toLowerCase();
    const show = term === '' || text.includes(term);
    item.style.display = show ? '' : 'none';
    item.classList.remove('active');
    if (show) visible++;
  });
  let empty = autocompleteMenu.querySelector('.es-autocomplete-empty');
  if (!empty) {
    empty = document.createElement('div');
    empty.className = 'es-autocomplete-empty';
    empty.textContent = 'Nenhuma matéria-prima encontrada.';
    autocompleteMenu.appendChild(empty);
  }
  empty.style.display = visible === 0 ? 'block' : 'none';
  autocompleteWrap.classList.toggle('open', visible > 0 || term !== '');
}

function aplicarMateriaPrimaItem(item) {
  const {
    descricaoInput,
    materiaPrimaIdInput,
    valorInput,
    quantidadeInput,
    descontoInput,
    totalInput,
    categoriaSelect,
    subcategoriaSelect,
    autocompleteWrap
  } = getEntradaSaidaTopDom();
  if (!item || !descricaoInput) return;
  const categoriaId = String(item.dataset.categoriaId || '');
  const subcategoriaId = String(item.dataset.subcategoriaId || '');
  descricaoInput.value = item.dataset.value || item.dataset.nome || '';
  if (materiaPrimaIdInput) materiaPrimaIdInput.value = item.dataset.id || '';
  if (valorInput) valorInput.value = item.dataset.valor || '0';
  if (quantidadeInput) quantidadeInput.value = item.dataset.quantidade || '1';
  if (descontoInput) descontoInput.value = item.dataset.desconto || '0';
  syncTipoLancamento('saida');
  selecionarOpcao(categoriaSelect, categoriaId);
  syncSubcategorias();
  selecionarOpcao(subcategoriaSelect, subcategoriaId);
  autocompleteWrap?.classList.remove('open');
  atualizarTotalLancamento(valorInput, quantidadeInput, descontoInput, totalInput);
}

function aplicarMateriaPrimaSelecionada() {
  const { descricaoInput, autocompleteMenu, materiaPrimaIdInput, valorInput, quantidadeInput, descontoInput, totalInput } = getEntradaSaidaTopDom();
  if (!descricaoInput) return;
  const exact = autocompleteMenu?.querySelector(`[data-es-mp-item][data-value="${CSS.escape(descricaoInput.value)}"]`);
  if (!exact) {
    if (materiaPrimaIdInput) materiaPrimaIdInput.value = '';
    atualizarTotalLancamento(valorInput, quantidadeInput, descontoInput, totalInput);
    return;
  }
  aplicarMateriaPrimaItem(exact);
}

function syncCategoriasPorTipo(tipo){
  const { categoriaSelect } = getEntradaSaidaTopDom();
  if (!categoriaSelect) return;
  Array.from(categoriaSelect.options).forEach((opt) => {
    if (!opt.value) {
      opt.hidden = false;
      return;
    }
    const optTipo = opt.dataset.tipo || 'ambos';
    opt.hidden = !(optTipo === tipo || optTipo === 'ambos');
  });
  if (categoriaSelect.selectedOptions[0] && categoriaSelect.selectedOptions[0].hidden) {
    categoriaSelect.value = '';
  }
}

function syncSubcategorias(){
  const { categoriaSelect, subcategoriaSelect } = getEntradaSaidaTopDom();
  if (!subcategoriaSelect || !categoriaSelect) return;
  const categoriaId = categoriaSelect.value;
  Array.from(subcategoriaSelect.options).forEach((opt) => {
    if (!opt.value) {
      opt.hidden = false;
      return;
    }
    opt.hidden = categoriaId ? opt.dataset.categoria !== categoriaId : false;
  });
  if (subcategoriaSelect.selectedOptions[0] && subcategoriaSelect.selectedOptions[0].hidden) {
    subcategoriaSelect.value = '';
  }
}

function syncSubcategoriasModal(categoriaEl, subcategoriaEl){
  if (!categoriaEl || !subcategoriaEl) return;
  const categoriaId = categoriaEl.value;
  Array.from(subcategoriaEl.options).forEach((opt) => {
    if (!opt.value) {
      opt.hidden = false;
      return;
    }
    opt.hidden = categoriaId ? opt.dataset.categoria !== categoriaId : false;
  });
  if (subcategoriaEl.selectedOptions[0] && subcategoriaEl.selectedOptions[0].hidden) {
    subcategoriaEl.value = '';
  }
}

function syncCategoriasModalPorTipo(tipoEl, categoriaEl, subcategoriaEl) {
  if (!tipoEl || !categoriaEl) return;
  const tipo = String(tipoEl.value || 'entrada').toLowerCase();
  Array.from(categoriaEl.options).forEach((opt) => {
    if (!opt.value) {
      opt.hidden = false;
      return;
    }
    const optTipo = opt.dataset.tipo || 'ambos';
    opt.hidden = !(optTipo === tipo || optTipo === 'ambos');
  });
  if (categoriaEl.selectedOptions[0] && categoriaEl.selectedOptions[0].hidden) {
    categoriaEl.value = '';
  }
  syncSubcategoriasModal(categoriaEl, subcategoriaEl);
}

function syncTipoLancamento(tipo){
  const { tipoInput, tipoBtns } = getEntradaSaidaTopDom();
  if (!tipoInput) return;
  tipoInput.value = tipo;
  tipoBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.esTipo === tipo));
  syncCategoriasPorTipo(tipo);
  syncSubcategorias();
}

function initEntradaSaidaTopForm() {
  const {
    tipoInput,
    categoriaSelect,
    descricaoInput,
    autocompleteMenu,
    materiaPrimaIdInput,
    valorInput,
    quantidadeInput,
    descontoInput,
    totalInput,
    tipoBtns
  } = getEntradaSaidaTopDom();

  tipoBtns.forEach((btn) => {
    if (btn.dataset.esBound === '1') return;
    btn.addEventListener('click', () => syncTipoLancamento(btn.dataset.esTipo));
    btn.dataset.esBound = '1';
  });

  if (categoriaSelect && categoriaSelect.dataset.esBound !== '1') {
    categoriaSelect.addEventListener('change', syncSubcategorias);
    categoriaSelect.dataset.esBound = '1';
  }

  if (descricaoInput && descricaoInput.dataset.esBound !== '1') {
    descricaoInput.addEventListener('focus', filtrarMateriaPrimaLista);
    descricaoInput.addEventListener('input', () => {
      const topDom = getEntradaSaidaTopDom();
      if (topDom.materiaPrimaIdInput) topDom.materiaPrimaIdInput.value = '';
      filtrarMateriaPrimaLista();
      aplicarMateriaPrimaSelecionada();
    });
    descricaoInput.addEventListener('change', aplicarMateriaPrimaSelecionada);
    descricaoInput.dataset.esBound = '1';
  }

  [...(autocompleteMenu?.querySelectorAll('[data-es-mp-item]') || [])].forEach((item) => {
    if (item.dataset.esBound === '1') return;
    item.addEventListener('click', () => aplicarMateriaPrimaItem(item));
    item.dataset.esBound = '1';
  });

  [valorInput, quantidadeInput, descontoInput].forEach((field) => {
    if (!field || field.dataset.esBound === '1') return;
    field.addEventListener('input', () => {
      const topDom = getEntradaSaidaTopDom();
      atualizarTotalLancamento(topDom.valorInput, topDom.quantidadeInput, topDom.descontoInput, topDom.totalInput);
    });
    field.dataset.esBound = '1';
  });

  syncTipoLancamento(tipoInput ? tipoInput.value : 'entrada');
  aplicarMateriaPrimaSelecionada();
  atualizarTotalLancamento(valorInput, quantidadeInput, descontoInput, totalInput);
}

function initEntradaSaidaToast() {
  const toastFlash = document.getElementById('esToastFlash') || document.querySelector('#esFlashWrap .es-notice');
  const toastClose = document.getElementById('esToastClose');
  if (!toastFlash || toastFlash.dataset.esToastBound === '1') return;
  requestAnimationFrame(() => toastFlash.classList.add('show'));
  const hideToast = () => toastFlash.classList.remove('show');
  const timer = window.setTimeout(hideToast, 3800);
  toastClose?.addEventListener('click', () => {
    window.clearTimeout(timer);
    hideToast();
  });
  toastFlash.dataset.esToastBound = '1';
}

function initEntradaSaidaTableToggle() {
  const toggleBtn = document.getElementById('esTableToggleBtn');
  const panel = document.getElementById('esTablePanel');
  if (!toggleBtn || !panel || toggleBtn.dataset.esBound === '1') return;
  const icon = toggleBtn.querySelector('i');
  const text = toggleBtn.querySelector('span');
  const storageKey = 'entradaSaidaTabelaVisivel';
  const syncState = (visible) => {
    panel.classList.toggle('is-hidden', !visible);
    if (icon) {
      icon.className = visible ? 'bi bi-eye' : 'bi bi-eye-slash';
    }
    if (text) {
      text.textContent = visible ? 'Ocultar tabela' : 'Mostrar tabela';
    }
    localStorage.setItem(storageKey, visible ? '1' : '0');
  };
  syncState(localStorage.getItem(storageKey) !== '0');
  toggleBtn.addEventListener('click', () => {
    syncState(panel.classList.contains('is-hidden'));
  });
  toggleBtn.dataset.esBound = '1';
}

initEntradaSaidaTopForm();
initEntradaSaidaToast();
initEntradaSaidaTableToggle();
window.initEntradaSaidaTopForm = initEntradaSaidaTopForm;
window.initEntradaSaidaToast = initEntradaSaidaToast;
window.initEntradaSaidaTableToggle = initEntradaSaidaTableToggle;

document.querySelectorAll('.js-editar-banco').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('editarBancoId').value = btn.dataset.id || '';
    document.getElementById('editarBancoNome').value = btn.dataset.nome || '';
    document.getElementById('editarBancoSaldo').value = btn.dataset.saldo || '0';
    bootstrap.Modal.getOrCreateInstance(modalEditarBanco).show();
  });
});

const editarLancamentoCategoria = document.getElementById('editarLancamentoCategoria');
const editarLancamentoSubcategoria = document.getElementById('editarLancamentoSubcategoria');
const editarLancamentoValor = document.getElementById('editarLancamentoValor');
const editarLancamentoQuantidade = document.getElementById('editarLancamentoQuantidade');
const editarLancamentoDesconto = document.getElementById('editarLancamentoDesconto');
const editarLancamentoTotal = document.getElementById('editarLancamentoTotal');
function preencherModalEditarLancamento(btn) {
  if (!btn) return;
  const idEl = document.getElementById('editarLancamentoId');
  const tipoEl = document.getElementById('editarLancamentoTipo');
  const dataEl = document.getElementById('editarLancamentoData');
  const descricaoEl = document.getElementById('editarLancamentoDescricao');
  const valorEl = document.getElementById('editarLancamentoValor');
  const quantidadeEl = document.getElementById('editarLancamentoQuantidade');
  const descontoEl = document.getElementById('editarLancamentoDesconto');
  const totalEl = document.getElementById('editarLancamentoTotal');
  const formaEl = document.getElementById('editarLancamentoForma');
  const categoriaEl = document.getElementById('editarLancamentoCategoria');
  const subcategoriaEl = document.getElementById('editarLancamentoSubcategoria');
  const bancoEl = document.getElementById('editarLancamentoBanco');
  const tipoRegistro = String(btn.dataset.tipo || 'entrada').toLowerCase().trim() === 'saida' ? 'saida' : 'entrada';

  if (idEl) idEl.value = btn.dataset.id || '';
  selecionarOpcao(tipoEl, tipoRegistro);
  if (dataEl) dataEl.value = btn.dataset.data || '';
  if (descricaoEl) descricaoEl.value = btn.dataset.descricao || '';
  if (valorEl) valorEl.value = btn.dataset.valor || '0';
  if (quantidadeEl) quantidadeEl.value = btn.dataset.quantidade || '1';
  if (descontoEl) descontoEl.value = btn.dataset.desconto || '0';

  selecionarOpcao(formaEl, btn.dataset.formaId || '');
  syncCategoriasModalPorTipo(tipoEl, categoriaEl, subcategoriaEl);
  selecionarOpcao(categoriaEl, btn.dataset.categoriaId || '');
  syncSubcategoriasModal(categoriaEl, subcategoriaEl);
  selecionarOpcao(subcategoriaEl, btn.dataset.subcategoriaId || '');
  selecionarOpcao(bancoEl, btn.dataset.bancoId || '');

  if (totalEl) {
    totalEl.value = moedaPreview(btn.dataset.total || btn.dataset.valor || 0);
  }
  atualizarTotalLancamento(valorEl, quantidadeEl, descontoEl, totalEl);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditarLancamento')).show();
}
if (editarLancamentoCategoria) {
  editarLancamentoCategoria.addEventListener('change', () => syncSubcategoriasModal(editarLancamentoCategoria, editarLancamentoSubcategoria));
}
const editarLancamentoTipo = document.getElementById('editarLancamentoTipo');
if (editarLancamentoTipo) {
  editarLancamentoTipo.addEventListener('change', () => {
    syncCategoriasModalPorTipo(editarLancamentoTipo, editarLancamentoCategoria, editarLancamentoSubcategoria);
  });
}
[editarLancamentoValor, editarLancamentoQuantidade, editarLancamentoDesconto].forEach((field) => {
  field?.addEventListener('input', () => atualizarTotalLancamento(editarLancamentoValor, editarLancamentoQuantidade, editarLancamentoDesconto, editarLancamentoTotal));
});

document.querySelectorAll('.js-editar-lancamento').forEach((btn) => {
  btn.addEventListener('click', () => {
    preencherModalEditarLancamento(btn);
  });
});

document.querySelectorAll('.js-editar-forma').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('formaActionInput').value = 'editar_forma';
    document.getElementById('formaIdInput').value = btn.dataset.id || '';
    document.getElementById('formaNomeInput').value = btn.dataset.nome || '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalForma')).show();
  });
});

document.querySelectorAll('.js-editar-categoria').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('categoriaActionInput').value = 'editar_categoria';
    document.getElementById('categoriaIdInput').value = btn.dataset.id || '';
    document.getElementById('categoriaNomeInput').value = btn.dataset.nome || '';
    document.getElementById('categoriaTipoInput').value = btn.dataset.tipo || 'ambos';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCategoria')).show();
  });
});

document.querySelectorAll('.js-editar-subcategoria').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('subcategoriaActionInput').value = 'editar_subcategoria';
    document.getElementById('subcategoriaIdInput').value = btn.dataset.id || '';
    document.getElementById('subcategoriaNomeInput').value = btn.dataset.nome || '';
    document.getElementById('subcategoriaCategoriaInput').value = btn.dataset.categoriaId || '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalSubcategoria')).show();
  });
});

document.querySelectorAll('.js-es-delete').forEach((btn) => {
  btn.addEventListener('click', () => {
    const msg = btn.dataset.confirm || 'Confirmar exclusão?';
    if (!window.confirm(msg)) return;
    if (!esDeleteForm || !esDeleteAction || !esDeleteId) return;
    esDeleteAction.value = btn.dataset.action || '';
    esDeleteId.value = btn.dataset.id || '';
    esDeleteForm.submit();
  });
});

['modalForma','modalCategoria','modalSubcategoria'].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('hidden.bs.modal', () => {
    const form = el.querySelector('form');
    if (!form) return;
    form.reset();
    if (id === 'modalForma') {
      document.getElementById('formaActionInput').value = 'salvar_forma';
      document.getElementById('formaIdInput').value = '';
    } else if (id === 'modalCategoria') {
      document.getElementById('categoriaActionInput').value = 'salvar_categoria';
      document.getElementById('categoriaIdInput').value = '';
      document.getElementById('categoriaTipoInput').value = 'entrada';
    } else if (id === 'modalSubcategoria') {
      document.getElementById('subcategoriaActionInput').value = 'salvar_subcategoria';
      document.getElementById('subcategoriaIdInput').value = '';
    }
  });
});

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest('#esAutocompleteWrap')) return;
  autocompleteWrap?.classList.remove('open');
});

if (filtrosAutoForm) {
  let filtroTimer = null;
  filtrosAutoForm.querySelectorAll('input, select').forEach((campo) => {
    const handler = () => {
      clearTimeout(filtroTimer);
      filtroTimer = setTimeout(() => filtrosAutoForm.submit(), campo.tagName === 'INPUT' ? 280 : 0);
    };
    campo.addEventListener('input', handler);
    campo.addEventListener('change', handler);
  });
}

(function abrirModalDaQuery(){
  const params = new URLSearchParams(window.location.search);
  const modal = params.get('modal');
  if (!modal) return;
  const ids = {
    banco: 'modalBanco',
    forma: 'modalForma',
    categoria: 'modalCategoria',
    subcategoria: 'modalSubcategoria'
  };
  const target = ids[modal];
  if (!target) return;
  const el = document.getElementById(target);
  if (!el) return;
  bootstrap.Modal.getOrCreateInstance(el).show();
})();
(() => {
  const PARTIAL_IDS = ['esFlashWrap','esStatsWrap','esTopWrap','esTableWrap','modalBanco','modalEditarBanco','modalForma','modalCategoria','modalSubcategoria','modalEditarLancamento','esDeleteForm'];
  const FORM_SELECTOR = '#formLancamentoES, #modalBanco form, #modalEditarBanco form, #modalForma form, #modalCategoria form, #modalSubcategoria form, #modalEditarLancamento form, #esDeleteForm';
  let filtroTimer = null;
  let pendingDelete = null;

  function resetEditarLancamentoForm() {
    const form = document.querySelector('#modalEditarLancamento form');
    if (!form) return;
    form.reset();
    const idEl = document.getElementById('editarLancamentoId');
    const tipoEl = document.getElementById('editarLancamentoTipo');
    const formaEl = document.getElementById('editarLancamentoForma');
    const categoriaEl = document.getElementById('editarLancamentoCategoria');
    const subcategoriaEl = document.getElementById('editarLancamentoSubcategoria');
    const bancoEl = document.getElementById('editarLancamentoBanco');
    const qtdEl = document.getElementById('editarLancamentoQuantidade');
    if (idEl) idEl.value = '';
    if (tipoEl) tipoEl.value = 'entrada';
    if (formaEl) formaEl.value = '';
    if (categoriaEl) categoriaEl.value = '';
    if (subcategoriaEl) subcategoriaEl.value = '';
    if (bancoEl) bancoEl.value = '';
    if (qtdEl) qtdEl.value = '1';
    if (categoriaEl && subcategoriaEl) syncModalSubcategoria(categoriaEl, subcategoriaEl);
  }

  function replacePartial(id, doc) {
    const current = document.getElementById(id);
    const next = doc.getElementById(id);
    if (current && next) current.replaceWith(next);
  }

  async function fetchHtml(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      ...options
    });
    const html = await response.text();
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function isSuccess(doc) {
    return !!doc.querySelector('#esFlashWrap .es-toast.ok, #esFlashWrap .es-notice.ok');
  }

  function syncTopCategoria() {
    const tipoInput = document.getElementById('esTipoInput');
    const categoriaSelect = document.getElementById('esCategoriaSelect');
    const subcategoriaSelect = document.getElementById('esSubcategoriaSelect');
    if (!tipoInput || !categoriaSelect || !subcategoriaSelect) return;
    const tipo = tipoInput.value || 'entrada';
    Array.from(categoriaSelect.options).forEach((opt) => {
      if (!opt.value) {
        opt.hidden = false;
        return;
      }
      const optTipo = opt.dataset.tipo || 'ambos';
      opt.hidden = !(optTipo === tipo || optTipo === 'ambos');
    });
    if (categoriaSelect.selectedOptions[0] && categoriaSelect.selectedOptions[0].hidden) categoriaSelect.value = '';
    const categoriaId = categoriaSelect.value;
    Array.from(subcategoriaSelect.options).forEach((opt) => {
      if (!opt.value) {
        opt.hidden = false;
        return;
      }
      opt.hidden = categoriaId ? opt.dataset.categoria !== categoriaId : false;
    });
    if (subcategoriaSelect.selectedOptions[0] && subcategoriaSelect.selectedOptions[0].hidden) subcategoriaSelect.value = '';
  }

  function syncModalSubcategoria(categoriaEl, subcategoriaEl) {
    if (!categoriaEl || !subcategoriaEl) return;
    const categoriaId = categoriaEl.value;
    Array.from(subcategoriaEl.options).forEach((opt) => {
      if (!opt.value) {
        opt.hidden = false;
        return;
      }
      opt.hidden = categoriaId ? opt.dataset.categoria !== categoriaId : false;
    });
    if (subcategoriaEl.selectedOptions[0] && subcategoriaEl.selectedOptions[0].hidden) subcategoriaEl.value = '';
  }

  async function refreshSections(doc, ids = PARTIAL_IDS) {
    ids.forEach((id) => replacePartial(id, doc));
    syncTopCategoria();
    if (typeof window.initEntradaSaidaTopForm === 'function') window.initEntradaSaidaTopForm();
    if (typeof window.initEntradaSaidaToast === 'function') window.initEntradaSaidaToast();
    if (typeof window.initEntradaSaidaTableToggle === 'function') window.initEntradaSaidaTableToggle();
  }

  async function submitPostAjax(form) {
    if (!form) return;
    const modalEl = form.closest('.modal');
    const doc = await fetchHtml(form.getAttribute('action') || window.location.href, {
      method: 'POST',
      body: new FormData(form)
    });
    const ok = isSuccess(doc);
    if (modalEl && ok) {
      const modal = bootstrap.Modal.getInstance(modalEl) || bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.hide();
    }
    await refreshSections(doc);
  }

  async function submitFiltersAjax(url) {
    const doc = await fetchHtml(url, { method: 'GET' });
    await refreshSections(doc, ['esTableWrap']);
    history.replaceState({}, '', url);
  }

  function buildFiltersUrl(form) {
    return `${window.location.pathname}?${new URLSearchParams(new FormData(form)).toString()}`;
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.matches('.es-filters')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      submitFiltersAjax(buildFiltersUrl(form));
      return;
    }
    if (form.id === 'formLancamentoES') {
      return;
    }
    if (!form.matches(FORM_SELECTOR)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitPostAjax(form);
  }, true);

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const filtros = target.closest('.es-filters');
    if (!filtros) return;
    if (target.id === 'esBuscaInput') {
      const termo = target.value.trim();
      if (termo !== '' && termo.length < 3) return;
    }
    clearTimeout(filtroTimer);
    filtroTimer = setTimeout(() => {
      submitFiltersAjax(buildFiltersUrl(filtros));
    }, target.tagName === 'INPUT' ? 280 : 0);
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id !== 'esBuscaInput') return;
    if (event.key !== 'Enter') return;
    const filtros = target.closest('.es-filters');
    if (!filtros) return;
    event.preventDefault();
    event.stopPropagation();
    clearTimeout(filtroTimer);
    submitFiltersAjax(buildFiltersUrl(filtros));
  });

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === 'esCategoriaSelect') {
      syncTopCategoria();
      return;
    }
    if (target.id === 'editarLancamentoCategoria') {
      syncModalSubcategoria(document.getElementById('editarLancamentoCategoria'), document.getElementById('editarLancamentoSubcategoria'));
      return;
    }
    const filtros = target.closest('.es-filters');
    if (filtros) {
      clearTimeout(filtroTimer);
      submitFiltersAjax(buildFiltersUrl(filtros));
    }
  });

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('button, a');
    if (!btn) return;

    if (btn.classList.contains('es-type-btn')) {
      const tipoInput = document.getElementById('esTipoInput');
      if (tipoInput) tipoInput.value = btn.dataset.esTipo || 'entrada';
      document.querySelectorAll('.es-type-btn').forEach((item) => item.classList.toggle('active', item === btn));
      syncTopCategoria();
      return;
    }

    if (btn.matches('#esTableWrap .es-page-btn[href]') && btn.getAttribute('href') !== '#' && !btn.classList.contains('disabled')) {
      event.preventDefault();
      submitFiltersAjax(btn.href);
      return;
    }

    if (btn.classList.contains('js-editar-banco')) {
      document.getElementById('editarBancoId').value = btn.dataset.id || '';
      document.getElementById('editarBancoNome').value = btn.dataset.nome || '';
      document.getElementById('editarBancoSaldo').value = btn.dataset.saldo || '0';
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditarBanco')).show();
      return;
    }

    if (btn.classList.contains('js-editar-forma')) {
      document.getElementById('formaActionInput').value = 'editar_forma';
      document.getElementById('formaIdInput').value = btn.dataset.id || '';
      document.getElementById('formaNomeInput').value = btn.dataset.nome || '';
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalForma')).show();
      return;
    }

    if (btn.classList.contains('js-editar-categoria')) {
      document.getElementById('categoriaActionInput').value = 'editar_categoria';
      document.getElementById('categoriaIdInput').value = btn.dataset.id || '';
      document.getElementById('categoriaNomeInput').value = btn.dataset.nome || '';
      document.getElementById('categoriaTipoInput').value = btn.dataset.tipo || 'ambos';
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCategoria')).show();
      return;
    }

    if (btn.classList.contains('js-editar-subcategoria')) {
      document.getElementById('subcategoriaActionInput').value = 'editar_subcategoria';
      document.getElementById('subcategoriaIdInput').value = btn.dataset.id || '';
      document.getElementById('subcategoriaNomeInput').value = btn.dataset.nome || '';
      document.getElementById('subcategoriaCategoriaInput').value = btn.dataset.categoriaId || '';
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalSubcategoria')).show();
      return;
    }

    if (btn.classList.contains('js-editar-lancamento')) {
      resetEditarLancamentoForm();
      preencherModalEditarLancamento(btn);
      return;
    }

    if (btn.classList.contains('js-es-delete')) {
      event.preventDefault();
      pendingDelete = {
        action: btn.dataset.action || '',
        id: btn.dataset.id || '',
        message: btn.dataset.confirm || 'Tem certeza que deseja excluir este registro?'
      };
      const textEl = document.getElementById('esConfirmDeleteText');
      if (textEl) textEl.textContent = pendingDelete.message;
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalConfirmarExclusao')).show();
    }
  });

  const confirmDeleteBtn = document.getElementById('esConfirmDeleteBtn');
  if (confirmDeleteBtn && !confirmDeleteBtn.dataset.boundDelete) {
    confirmDeleteBtn.dataset.boundDelete = '1';
    confirmDeleteBtn.addEventListener('click', () => {
      if (!pendingDelete) return;
      const form = document.getElementById('esDeleteForm');
      document.getElementById('esDeleteAction').value = pendingDelete.action || '';
      document.getElementById('esDeleteId').value = pendingDelete.id || '';
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalConfirmarExclusao')).hide();
      submitPostAjax(form);
      pendingDelete = null;
    });
  }

  document.addEventListener('hidden.bs.modal', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;
    if (el.id === 'modalEditarLancamento') {
      resetEditarLancamentoForm();
      return;
    }
    if (!['modalForma','modalCategoria','modalSubcategoria'].includes(el.id)) return;
    const form = el.querySelector('form');
    if (form) form.reset();
    if (el.id === 'modalForma') {
      document.getElementById('formaActionInput').value = 'salvar_forma';
      document.getElementById('formaIdInput').value = '';
    } else if (el.id === 'modalCategoria') {
      document.getElementById('categoriaActionInput').value = 'salvar_categoria';
      document.getElementById('categoriaIdInput').value = '';
      document.getElementById('categoriaTipoInput').value = 'entrada';
    } else if (el.id === 'modalSubcategoria') {
      document.getElementById('subcategoriaActionInput').value = 'salvar_subcategoria';
      document.getElementById('subcategoriaIdInput').value = '';
    }
  });

  syncTopCategoria();
})();
