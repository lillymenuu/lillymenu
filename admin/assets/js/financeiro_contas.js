(function(){
  const apiUrl = './api/financial_accounts.php';
  const modalElement = document.getElementById('financialAccountModal');
  const modal = new bootstrap.Modal(modalElement);
  const deleteModalElement = document.getElementById('financialAccountDeleteModal');
  const deleteModal = new bootstrap.Modal(deleteModalElement);
  const openButton = document.getElementById('financial-open-account-modal');
  const modalTitle = document.getElementById('financial-account-modal-title');
  const form = document.getElementById('financial-account-form');
  const tableWrap = document.getElementById('financial-account-table');
  const submitButton = document.getElementById('financial-account-submit');
  const cancelButton = document.getElementById('financial-account-cancel');
  const idField = document.getElementById('financial-account-id');
  const nameField = document.getElementById('financial-account-name');
  const initialField = document.getElementById('financial-account-initial');
  const currentField = document.getElementById('financial-account-current');
  const activeField = document.getElementById('financial-account-active');
  const deleteConfirmButton = document.getElementById('financial-account-delete-confirm');
  let pendingDeleteForm = null;

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

  function resetFormState() {
    form.reset();
    idField.value = '0';
    submitButton.innerHTML = 'Cadastrar conta';
    cancelButton.classList.add('d-none');
    initialField.value = '0,00';
    currentField.value = '0,00';
    modalTitle.textContent = 'Nova conta';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    formData.append('action', 'save');
    try {
      window.finModule.setLoading(submitButton, true);
      const json = await window.finModule.request(apiUrl, { method: 'POST', body: formData });
      tableWrap.innerHTML = json.table_html;
      window.finModule.showToast(json.msg || 'Conta salva com sucesso.');
      modal.hide();
      resetFormState();
    } catch (error) {
      window.finModule.showToast(error.msg || 'Nao foi possivel salvar a conta.', false);
    } finally {
      window.finModule.setLoading(submitButton, false);
    }
  });

  cancelButton.addEventListener('click', (event) => {
    event.preventDefault();
    resetFormState();
    modal.hide();
  });

  openButton.addEventListener('click', () => {
    resetFormState();
    modal.show();
  });

  document.addEventListener('click', async (event) => {
    const editLink = event.target.closest('.js-fin-edit-account');
    if (!editLink) return;
    event.preventDefault();
    try {
      const json = await window.finModule.request(`${apiUrl}?${window.finModule.toQuery({ action: 'get', id: editLink.dataset.id })}`);
      const item = json.item || {};
      idField.value = item.id || 0;
      nameField.value = item.name || '';
      initialField.value = item.initial_balance || '0.00';
      currentField.value = item.current_balance || item.initial_balance || '0.00';
      activeField.value = String(item.active ?? 1);
      initialField.value = maskMoney(initialField.value);
      currentField.value = maskMoney(currentField.value);
      modalTitle.textContent = 'Editar conta';
      submitButton.innerHTML = 'Salvar alteracoes';
      cancelButton.classList.remove('d-none');
      modal.show();
    } catch (error) {
      window.finModule.showToast(error.msg || 'Nao foi possivel carregar a conta.', false);
    }
  });

  document.addEventListener('submit', async (event) => {
    const deleteForm = event.target.closest('.js-fin-delete-account');
    if (!deleteForm) return;
    event.preventDefault();
    pendingDeleteForm = deleteForm;
    deleteModal.show();
  });

  deleteConfirmButton.addEventListener('click', async () => {
    if (!pendingDeleteForm) {
      deleteModal.hide();
      return;
    }
    const formData = new FormData(pendingDeleteForm);
    formData.append('action', 'delete');
    try {
      window.finModule.setLoading(deleteConfirmButton, true, 'Excluindo...');
      const json = await window.finModule.request(apiUrl, { method: 'POST', body: formData });
      tableWrap.innerHTML = json.table_html;
      window.finModule.showToast(json.msg || 'Conta removida com sucesso.');
      if (parseInt(idField.value || '0', 10) === parseInt(pendingDeleteForm.dataset.id || '0', 10)) {
        resetFormState();
        modal.hide();
      }
      deleteModal.hide();
    } catch (error) {
      window.finModule.showToast(error.msg || 'Nao foi possivel remover a conta.', false);
    } finally {
      window.finModule.setLoading(deleteConfirmButton, false);
    }
  });

  modalElement.addEventListener('hidden.bs.modal', () => {
    resetFormState();
  });

  deleteModalElement.addEventListener('hidden.bs.modal', () => {
    pendingDeleteForm = null;
  });

  bindMoneyMasks();
  if (FINCONTAS_DATA.flash) {
    window.finModule.showToast(FINCONTAS_DATA.flash.msg, !!FINCONTAS_DATA.flash.ok);
  }
  if (FINCONTAS_DATA.editing) {
    cancelButton.classList.remove('d-none');
    modalTitle.textContent = 'Editar conta';
    modal.show();
  }
})();
