(function(){
  const apiUrl = './api/financial_transactions.php';
  const modalElement = document.getElementById('financialTransactionModal');
  const modal = new bootstrap.Modal(modalElement);
  const deleteModalElement = document.getElementById('financialDeleteModal');
  const deleteModal = new bootstrap.Modal(deleteModalElement);
  const openButton = document.getElementById('financial-open-transaction-modal');
  const modalTitle = document.getElementById('financial-transaction-modal-title');
  const form = document.getElementById('financial-transaction-form');
  const filterForm = document.getElementById('financial-transaction-filter-form');
  const tableWrap = document.getElementById('financial-transaction-table');
  const submitButton = document.getElementById('financial-transaction-submit');
  const cancelButton = document.getElementById('financial-transaction-cancel');
  const idField = document.getElementById('financial-transaction-id');
  const typeField = document.getElementById('financial-transaction-type');
  const dateField = document.getElementById('financial-transaction-date');
  const descriptionField = document.getElementById('financial-transaction-description');
  const amountField = document.getElementById('financial-transaction-amount');
  const accountField = document.getElementById('financial-transaction-account');
  const categoryField = document.getElementById('financial-transaction-category');
  const methodField = document.getElementById('financial-transaction-method');
  const refMonthField = document.getElementById('financial-transaction-ref-month');
  const refYearField = document.getElementById('financial-transaction-ref-year');
  const notesField = document.getElementById('financial-transaction-notes');
  const deleteConfirmButton = document.getElementById('financial-delete-confirm');
  const categoryOptions = Array.from(categoryField.options).map((option) => ({
    value: option.value,
    label: option.textContent,
    type: option.dataset.type || '',
  }));
  let currentPage = 1;
  let pendingDeleteId = 0;

  function currentFilters() {
    return {
      mes: document.getElementById('financial-filter-month').value,
      ano: document.getElementById('financial-filter-year').value,
      tipo: document.getElementById('financial-filter-type').value,
      categoria_id: document.getElementById('financial-filter-category').value,
      conta_id: document.getElementById('financial-filter-account').value,
      page: currentPage,
    };
  }

  function maskMoney(value) {
    const digits = String(value || '').replace(/\D+/g, '');
    const normalized = digits === '' ? '0' : digits;
    const intValue = parseInt(normalized, 10) || 0;
    return (intValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function bindMoneyMasks() {
    document.querySelectorAll('.js-fin-money-mask').forEach((input) => {
      if (input.dataset.maskBound === '1') return;
      input.dataset.maskBound = '1';
      input.addEventListener('input', () => {
        input.value = maskMoney(input.value);
      });
      input.addEventListener('focus', () => {
        if (!input.value) input.value = '0,00';
      });
    });
  }

  function applyCategoryFilter(selectedValue = null) {
    const previousValue = (selectedValue === null) ? (categoryField.value || '') : (selectedValue === '__reset__' ? '' : selectedValue);
    categoryField.innerHTML = '<option value="">Selecione</option>';
    categoryOptions.forEach((option) => {
      if (!option.value) return;
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      node.dataset.type = option.type;
      if (String(previousValue) === String(option.value)) {
        node.selected = true;
      }
      categoryField.appendChild(node);
    });
  }

  function syncTypeWithCategory() {
    const selected = categoryField.options[categoryField.selectedIndex];
    const optionType = selected ? (selected.dataset.type || '') : '';
    if (optionType === 'income' || optionType === 'expense') {
      typeField.value = optionType;
    }
  }

  function resetFormState() {
    idField.value = '0';
    submitButton.innerHTML = 'Salvar lançamento';
    modalTitle.textContent = 'Novo lançamento';
    typeField.value = 'income';
    descriptionField.value = '';
    amountField.value = '';
    accountField.value = '';
    methodField.value = '';
    notesField.value = '';
    dateField.value = FINLANC_DATA.today;
    refMonthField.value = FINLANC_DATA.currentMonth;
    refYearField.value = FINLANC_DATA.currentYear;
    categoryField.value = '';
    applyCategoryFilter('__reset__');
  }

  async function loadTable(page = currentPage) {
    currentPage = Math.max(1, parseInt(page || '1', 10));
    const params = { action: 'list', ...currentFilters(), page: currentPage };
    const json = await window.finModule.request(`${apiUrl}?${window.finModule.toQuery(params)}`);
    tableWrap.innerHTML = json.table_html;
  }
  /* expõe globalmente para os botões de paginação gerados pelo PHP */
  window._finLoadTable = loadTable;

  filterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      currentPage = 1;
      await loadTable(1);
    } catch (error) {
      window.finModule.showToast(error.msg || 'Nao foi possivel atualizar a tabela.', false);
    }
  });

  filterForm.querySelectorAll('select').forEach((select) => {
    select.addEventListener('change', () => {
      currentPage = 1;
      loadTable(1).catch((error) => window.finModule.showToast(error.msg || 'Nao foi possivel aplicar o filtro.', false));
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    formData.set('action', 'save');
    Object.entries(currentFilters()).forEach(([key, value]) => formData.set(key, value));
    try {
      window.finModule.setLoading(submitButton, true, 'Salvando...');
      const json = await window.finModule.request(apiUrl, {
        method: 'POST',
        body: formData
      });
      window.finModule.showToast(json.msg || 'Lançamento salvo com sucesso.');
      resetFormState();
      modal.hide();
      currentPage = 1;
      loadTable(1).catch(() => {});
    } catch (error) {
      window.finModule.showToast(error.msg || 'Nao foi possivel salvar o lançamento.', false);
    } finally {
      window.finModule.setLoading(submitButton, false);
    }
  });

  typeField.addEventListener('change', () => {
    const currentCategory = categoryField.value || '';
    applyCategoryFilter(currentCategory);
  });
  categoryField.addEventListener('change', () => {
    syncTypeWithCategory();
  });
  openButton.addEventListener('click', () => {
    resetFormState();
    modal.show();
  });

  modalElement.addEventListener('hidden.bs.modal', () => {
    resetFormState();
  });

  document.addEventListener('click', async (event) => {
    /* paginação — botões com data-fin-page (gerados pelo PHP dentro do table_html) */
    const pageButton = event.target.closest('[data-fin-page]');
    if (pageButton && tableWrap && tableWrap.contains(pageButton)) {
      event.preventDefault();
      const p = parseInt(pageButton.dataset.finPage || '1', 10);
      loadTable(p).catch((error) => window.finModule.showToast(error.msg || 'Nao foi possivel trocar a pagina.', false));
      return;
    }

    const editLink = event.target.closest('.js-fin-edit-transaction');
    if (!editLink) return;
    event.preventDefault();
    try {
      const json = await window.finModule.request(`${apiUrl}?${window.finModule.toQuery({ action: 'get', id: editLink.dataset.id })}`);
      const item = json.item || {};
      idField.value = item.id || 0;
      typeField.value = item.type || 'income';
      applyCategoryFilter(item.category_id || '');
      dateField.value = item.transaction_date || FINLANC_DATA.today;
      descriptionField.value = item.description || '';
      amountField.value = maskMoney(item.amount || '');
      accountField.value = item.account_id || '';
      categoryField.value = item.category_id || '';
      methodField.value = item.payment_method_id || '';
      refMonthField.value = item.reference_month || FINLANC_DATA.currentMonth;
      refYearField.value = item.reference_year || FINLANC_DATA.currentYear;
      notesField.value = item.notes || '';
      modalTitle.textContent = 'Editar lançamento';
      submitButton.innerHTML = 'Salvar alterações';
      modal.show();
    } catch (error) {
      window.finModule.showToast(error.msg || 'Não foi possivel carregar o lançamento.', false);
    }
  });

  document.addEventListener('submit', async (event) => {
    const deleteForm = event.target.closest('.js-fin-delete-transaction');
    if (!deleteForm) return;
    event.preventDefault();
    pendingDeleteId = parseInt(deleteForm.dataset.id || '0', 10);
    deleteModal.show();
  });

  deleteConfirmButton.addEventListener('click', async () => {
    if (!pendingDeleteId) {
      deleteModal.hide();
      return;
    }
    const formData = new FormData();
    formData.set('action', 'delete');
    formData.set('id', String(pendingDeleteId));
    Object.entries(currentFilters()).forEach(([key, value]) => formData.set(key, value));
    try {
      window.finModule.setLoading(deleteConfirmButton, true, 'Excluindo...');
      const json = await window.finModule.request(apiUrl, { method: 'POST', body: formData });
      tableWrap.innerHTML = json.table_html;
      if (parseInt(idField.value || '0', 10) === pendingDeleteId) {
        resetFormState();
        modal.hide();
      }
      deleteModal.hide();
      pendingDeleteId = 0;
    } catch (error) {
      window.finModule.showToast(error.msg || 'Nao foi possivel excluir o lançamento.', false);
    } finally {
      window.finModule.setLoading(deleteConfirmButton, false);
    }
  });

  deleteModalElement.addEventListener('hidden.bs.modal', () => {
    pendingDeleteId = 0;
  });

  applyCategoryFilter(categoryField.value || '');
  syncTypeWithCategory();
  bindMoneyMasks();
  if (FINLANC_DATA.flash) {
    window.finModule.showToast(FINLANC_DATA.flash.msg, !!FINLANC_DATA.flash.ok);
  }
  if (FINLANC_DATA.editing) {
    modal.show();
    modalTitle.textContent = 'Editar lancamento';
    submitButton.innerHTML = 'Salvar alteracoes';
  }
})();

/* ── Sincronizar pedidos sem lançamento ── */
document.addEventListener('DOMContentLoaded', function(){
  const btn = document.getElementById('btnSyncPedidos');
  if (!btn) return;

  // Inicializa lazy para garantir que os elementos existem no DOM
  let mConfirm = null;
  let mResult  = null;
  function getConfirm(){ if(!mConfirm) mConfirm = new bootstrap.Modal(document.getElementById('syncConfirmModal')); return mConfirm; }
  function getResult(){  if(!mResult)  mResult  = new bootstrap.Modal(document.getElementById('syncResultModal'));  return mResult; }

  btn.addEventListener('click', () => getConfirm().show());

  const btnExec = document.getElementById('syncExecutar');
  if (btnExec) {
    btnExec.addEventListener('click', async function(){
      getConfirm().hide();
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Sincronizando...';
      btnExec.disabled = true;

      try {
        const fd = new FormData();
        fd.set('modo', 'todos');
        const r = await fetch('api/financeiro_sync_pedidos.php', { method: 'POST', body: fd });
        const d = await r.json();

        if (d.ok) {
          document.getElementById('syncResOrders').textContent  = d.orders  ?? 0;
          document.getElementById('syncResCriados').textContent = d.created ?? 0;
          document.getElementById('syncResAtuali').textContent  = d.updated ?? 0;
          const meses = d.periodos && d.periodos.length ? d.periodos.join(', ') : 'Nenhum';
          document.getElementById('syncResMeses').textContent    = meses;
          document.getElementById('syncResultIcon').className    = 'bi bi-check-circle-fill';
          document.getElementById('syncResultIcon').style.color  = '#9C5523';
          document.getElementById('syncResultTitulo').textContent = 'Sincronização concluída!';
          document.getElementById('syncResultMsgErro').style.display = 'none';
          document.getElementById('syncResultStats').style.display   = '';
        } else {
          document.getElementById('syncResultIcon').className    = 'bi bi-exclamation-circle-fill';
          document.getElementById('syncResultIcon').style.color  = '#dc2626';
          document.getElementById('syncResultTitulo').textContent    = 'Erro na sincronização';
          document.getElementById('syncResultMsgErro').textContent   = d.msg || 'Erro desconhecido.';
          document.getElementById('syncResultMsgErro').style.display = '';
          document.getElementById('syncResultStats').style.display   = 'none';
        }
        getResult().show();
      } catch(e) {
        document.getElementById('syncResultIcon').className    = 'bi bi-exclamation-circle-fill';
        document.getElementById('syncResultIcon').style.color  = '#dc2626';
        document.getElementById('syncResultTitulo').textContent    = 'Erro de comunicação';
        document.getElementById('syncResultMsgErro').textContent   = e.message;
        document.getElementById('syncResultMsgErro').style.display = '';
        document.getElementById('syncResultStats').style.display   = 'none';
        getResult().show();
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sincronizar pedidos';
        btnExec.disabled = false;
      }
    });
  }

  const resultModal = document.getElementById('syncResultModal');
  if (resultModal) {
    resultModal.addEventListener('hidden.bs.modal', () => window.location.reload());
  }
});
