(() => {
  const formCadastro = document.getElementById('mpFormCadastro');
  const modalEdit = document.getElementById('modalEditarMateriaPrima');
  const deleteModal = document.getElementById('modalExcluirMateriaPrima');
  const toastFlash = document.getElementById('mpToastFlash');
  const toastClose = document.getElementById('mpToastClose');
  let pendingDeleteId = null;
  let filterTimer = null;

  function moeda(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
  }

  function syncSubcategorias(categoriaSelect, subSelect) {
    if (!categoriaSelect || !subSelect) return;
    const categoriaId = categoriaSelect.value;
    Array.from(subSelect.options).forEach((opt) => {
      if (!opt.value) {
        opt.hidden = false;
        return;
      }
      opt.hidden = categoriaId !== '' && opt.dataset.categoria !== categoriaId;
    });
    if (subSelect.selectedOptions[0] && subSelect.selectedOptions[0].hidden) {
      subSelect.value = '';
    }
  }

  function setSelectValue(select, value) {
    if (!select) return;
    const target = String(value || '');
    Array.from(select.options).forEach((option) => {
      option.selected = option.value === target;
    });
    if (select.value !== target) {
      select.value = target;
    }
  }

  function setSelectByText(select, text) {
    if (!select) return false;
    const target = String(text || '').trim().toLowerCase();
    if (!target) return false;
    const match = Array.from(select.options).find((option) => option.textContent.trim().toLowerCase() === target);
    if (!match) return false;
    select.value = match.value;
    return true;
  }

  function bindCustomSelects(scope = document) {
    scope.querySelectorAll('[data-mp-custom-select]').forEach((wrap) => {
      const native = wrap.querySelector('.mp-custom-native');
      const trigger = wrap.querySelector('[data-mp-custom-trigger]');
      const label = wrap.querySelector('.mp-custom-label');
      const options = wrap.querySelectorAll('.mp-custom-option');
      if (!native || !trigger || !label || !options.length || wrap.dataset.bound === '1') return;
      wrap.dataset.bound = '1';

      const syncLabel = () => {
        const current = Array.from(options).find((option) => option.dataset.value === native.value);
        label.textContent = current ? (current.dataset.label || current.textContent.trim()) : 'Selecione';
        options.forEach((option) => {
          option.classList.toggle('active', option.dataset.value === native.value);
        });
      };

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        document.querySelectorAll('[data-mp-custom-select].open').forEach((item) => {
          if (item !== wrap) item.classList.remove('open');
        });
        wrap.classList.toggle('open');
      });

      options.forEach((option) => {
        option.addEventListener('click', () => {
          native.value = option.dataset.value || '0';
          syncLabel();
          wrap.classList.remove('open');
          native.dispatchEvent(new Event('change', { bubbles: true }));
          const filtersForm = native.closest('#mpFiltersForm');
          if (filtersForm) {
            submitFiltersAjax().catch((err) => console.error(err));
          }
        });
      });

      syncLabel();
    });
  }

  function initMateriaPrimaTableToggle() {
    const toggleBtn = document.getElementById('mpTableToggleBtn');
    const panel = document.getElementById('mpTablePanel');
    if (!toggleBtn || !panel || toggleBtn.dataset.mpToggleBound === '1') return;
    const icon = toggleBtn.querySelector('i');
    const text = toggleBtn.querySelector('span');
    const storageKey = 'cadMateriaPrimaTabelaVisivel';
    const syncState = (visible) => {
      panel.classList.toggle('is-hidden', !visible);
      if (icon) icon.className = visible ? 'bi bi-eye' : 'bi bi-eye-slash';
      if (text) text.textContent = visible ? 'Ocultar tabela' : 'Mostrar tabela';
      localStorage.setItem(storageKey, visible ? '1' : '0');
    };
    syncState(localStorage.getItem(storageKey) !== '0');
    toggleBtn.addEventListener('click', () => {
      syncState(panel.classList.contains('is-hidden'));
    });
    toggleBtn.dataset.mpToggleBound = '1';
  }

  function initMateriaPrimaTableToggle() {
    const toggleBtn = document.getElementById('mpTableToggleBtn');
    const panel = document.getElementById('mpTablePanel');
    if (!toggleBtn || !panel || toggleBtn.dataset.mpBound === '1') return;
    const icon = toggleBtn.querySelector('i');
    const text = toggleBtn.querySelector('span');
    const storageKey = 'cadMateriaPrimaTabelaVisivel';
    const syncState = (visible) => {
      panel.classList.toggle('is-hidden', !visible);
      if (icon) icon.className = visible ? 'bi bi-eye' : 'bi bi-eye-slash';
      if (text) text.textContent = visible ? 'Ocultar tabela' : 'Mostrar tabela';
      localStorage.setItem(storageKey, visible ? '1' : '0');
    };
    syncState(localStorage.getItem(storageKey) !== '0');
    toggleBtn.addEventListener('click', () => syncState(panel.classList.contains('is-hidden')));
    toggleBtn.dataset.mpBound = '1';
  }

  function fillEditForm(item) {
    const editCategoria = document.getElementById('mpEditCategoria');
    const editSubcategoria = document.getElementById('mpEditSubcategoria');
    const categoriaValue = String(item.categoria_id || '');
    const subcategoriaValue = String(item.subcategoria_id || '');
    document.getElementById('mpEditId').value = item.id || '';
    document.getElementById('mpEditNome').value = item.nome_produto || '';
    document.getElementById('mpEditData').value = item.data_compra || '';
    document.getElementById('mpEditFornecedor').value = item.fornecedor || '';
    document.getElementById('mpEditUnitario').value = item.valor_unitario || '0';
    document.getElementById('mpEditQuantidade').value = item.quantidade || '1';
    document.getElementById('mpEditUnidade').value = item.unidade || 'unidade';
    document.getElementById('mpEditDesconto').value = item.desconto || '0';
    setSelectValue(editCategoria, categoriaValue);
    if (!editCategoria.value && item.categoria_nome) {
      setSelectByText(editCategoria, item.categoria_nome);
    }
    syncSubcategorias(editCategoria, editSubcategoria);
    setSelectValue(editSubcategoria, subcategoriaValue);
    if (!editSubcategoria.value && item.subcategoria_nome) {
      setSelectByText(editSubcategoria, item.subcategoria_nome);
    }
    document.getElementById('mpEditObservacao').value = item.observacao || '';
  }

  async function fetchHtml(url) {
    const response = await fetch(url, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    if (!response.ok) throw new Error('Nao foi possivel atualizar a tabela.');
    return response.text();
  }

  async function refreshTableSection(url) {
    const html = await fetchHtml(url);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const next = doc.getElementById('mpTableSection');
    const current = document.getElementById('mpTableSection');
    if (!next || !current) return;
    current.replaceWith(next);
    bindDynamicSection();
    initMateriaPrimaTableToggle();
    window.history.replaceState({}, '', url);
  }

  function buildFilterUrl() {
    const form = document.getElementById('mpFiltersForm');
    if (!form) return window.location.href;
    const action = form.getAttribute('action');
    const baseUrl = action && action.trim() !== '' ? action : window.location.pathname;
    const url = new URL(baseUrl, window.location.origin);
    const formData = new FormData(form);
    formData.forEach((value, key) => {
      const str = String(value).trim();
      if (str !== '' && str !== '0') {
        url.searchParams.set(key, str);
      }
    });
    url.searchParams.delete('pagina');
    return url.toString();
  }

  async function submitFiltersAjax() {
    await refreshTableSection(buildFilterUrl());
  }

  function bindDynamicSection() {
    const filtersForm = document.getElementById('mpFiltersForm');
    const filterSearch = document.getElementById('mpFilterSearch');
    bindCustomSelects(document.getElementById('mpTableSection') || document);

    document.querySelectorAll('.js-mp-edit').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('ajax', 'materia_prima_item');
          url.searchParams.set('id', btn.dataset.id || '');
          const response = await fetch(url.toString(), {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          });
          const data = await response.json();
          if (!data.ok || !data.item) return;
          fillEditForm(data.item);
          bootstrap.Modal.getOrCreateInstance(modalEdit).show();
        } catch (error) {
          console.error(error);
        }
      });
    });

    document.querySelectorAll('.js-mp-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        pendingDeleteId = btn.dataset.id || null;
        bootstrap.Modal.getOrCreateInstance(deleteModal).show();
      });
    });

    filtersForm?.querySelectorAll('select, input[type="date"], .mp-custom-native').forEach((field) => {
      field.addEventListener('change', () => {
        if (typeof field.blur === 'function') {
          field.blur();
        }
        submitFiltersAjax().catch(console.error);
      });
    });

    filterSearch?.addEventListener('input', () => {
      const value = filterSearch.value.trim();
      window.clearTimeout(filterTimer);
      if (value !== '' && value.length < 3) return;
      filterTimer = window.setTimeout(() => {
        submitFiltersAjax().catch(console.error);
      }, 260);
    });

  }

  function updateCalc(scope) {
    const unit = Number(scope.querySelector('.js-mp-unitario')?.value || 0);
    const qtd = Number(scope.querySelector('.js-mp-quantidade')?.value || 0);
    const desconto = Number(scope.querySelector('.js-mp-desconto')?.value || 0);
    const bruto = unit * qtd;
    const liquido = Math.max(0, bruto - desconto);
    if (scope === formCadastro) {
      const elBruto = document.getElementById('mpCalcBruto');
      const elDesc = document.getElementById('mpCalcDesconto');
      const elLiq = document.getElementById('mpCalcLiquido');
      if (elBruto) elBruto.textContent = moeda(bruto);
      if (elDesc) elDesc.textContent = moeda(desconto);
      if (elLiq) elLiq.textContent = moeda(liquido);
    }
  }

  if (formCadastro) {
    formCadastro.addEventListener('input', () => updateCalc(formCadastro));
    syncSubcategorias(document.getElementById('mpCategoriaSelect'), document.getElementById('mpSubcategoriaSelect'));
    document.getElementById('mpCategoriaSelect')?.addEventListener('change', () => {
      syncSubcategorias(document.getElementById('mpCategoriaSelect'), document.getElementById('mpSubcategoriaSelect'));
    });
    updateCalc(formCadastro);
  }

  document.getElementById('mpEditCategoria')?.addEventListener('change', () => {
    syncSubcategorias(document.getElementById('mpEditCategoria'), document.getElementById('mpEditSubcategoria'));
  });

  document.getElementById('mpDeleteConfirmBtn')?.addEventListener('click', () => {
    if (!pendingDeleteId) return;
    document.getElementById('mpDeleteId').value = pendingDeleteId;
    document.getElementById('mpDeleteForm').submit();
  });

  deleteModal?.addEventListener('hidden.bs.modal', () => {
    pendingDeleteId = null;
  });

  if (toastFlash) {
    requestAnimationFrame(() => toastFlash.classList.add('show'));
    const hideToast = () => toastFlash.classList.remove('show');
    const autoHide = window.setTimeout(hideToast, 3400);
    toastClose?.addEventListener('click', () => {
      window.clearTimeout(autoHide);
      hideToast();
    });
  }

  bindDynamicSection();
  initMateriaPrimaTableToggle();

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const pageLink = target.closest('#mpTableSection .mp-page-btn[href]');
    if (pageLink instanceof HTMLAnchorElement) {
      const href = pageLink.getAttribute('href') || '#';
      if (href === '#' || pageLink.classList.contains('disabled')) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      refreshTableSection(new URL(href, window.location.href).toString()).catch(console.error);
      return;
    }
    if (target.closest('[data-mp-custom-select]')) return;
    document.querySelectorAll('[data-mp-custom-select].open').forEach((item) => item.classList.remove('open'));
  });
})();
