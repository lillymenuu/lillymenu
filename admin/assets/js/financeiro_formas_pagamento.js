(function(){
  const apiUrl = './api/financial_payment_methods.php';
  const modalElement = document.getElementById('financialMethodModal');
  const modal = new bootstrap.Modal(modalElement);
  const deleteModalElement = document.getElementById('financialMethodDeleteModal');
  const deleteModal = new bootstrap.Modal(deleteModalElement);
  const openButton = document.getElementById('financial-open-method-modal');
  const modalTitle = document.getElementById('financial-method-modal-title');
  const form = document.getElementById('financial-method-form');
  const tableWrap = document.getElementById('financial-method-table');
  const submitButton = document.getElementById('financial-method-submit');
  const cancelButton = document.getElementById('financial-method-cancel');
  const idField = document.getElementById('financial-method-id');
  const nameField = document.getElementById('financial-method-name');
  const activeField = document.getElementById('financial-method-active');
  const deleteConfirmButton = document.getElementById('financial-method-delete-confirm');
  let pendingDeleteForm = null;

  function resetFormState() {
    form.reset();
    idField.value = '0';
    submitButton.innerHTML = 'Cadastrar forma';
    cancelButton.classList.add('d-none');
    modalTitle.textContent = 'Nova forma';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    formData.append('action', 'save');
    try {
      window.finModule.setLoading(submitButton, true);
      const json = await window.finModule.request(apiUrl, { method: 'POST', body: formData });
      tableWrap.innerHTML = json.table_html;
      window.finModule.showToast(json.msg || 'Forma de pagamento salva com sucesso.');
      modal.hide();
      resetFormState();
    } catch (error) {
      window.finModule.showToast(error.msg || 'Nao foi possivel salvar a forma de pagamento.', false);
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
    const editLink = event.target.closest('.js-fin-edit-method');
    if (!editLink) return;
    event.preventDefault();
    try {
      const json = await window.finModule.request(`${apiUrl}?${window.finModule.toQuery({ action: 'get', id: editLink.dataset.id })}`);
      const item = json.item || {};
      idField.value = item.id || 0;
      nameField.value = item.name || '';
      activeField.value = String(item.active ?? 1);
      modalTitle.textContent = 'Editar forma';
      submitButton.innerHTML = 'Salvar alteracoes';
      cancelButton.classList.remove('d-none');
      modal.show();
    } catch (error) {
      window.finModule.showToast(error.msg || 'Nao foi possivel carregar a forma de pagamento.', false);
    }
  });

  document.addEventListener('submit', async (event) => {
    const deleteForm = event.target.closest('.js-fin-delete-method');
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
      window.finModule.showToast(json.msg || 'Forma de pagamento removida com sucesso.');
      if (parseInt(idField.value || '0', 10) === parseInt(pendingDeleteForm.dataset.id || '0', 10)) {
        resetFormState();
        modal.hide();
      }
      deleteModal.hide();
    } catch (error) {
      window.finModule.showToast(error.msg || 'Nao foi possivel remover a forma de pagamento.', false);
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

  if (FINPAG_DATA.flash) {
    window.finModule.showToast(FINPAG_DATA.flash.msg, !!FINPAG_DATA.flash.ok);
  }
  if (FINPAG_DATA.editing) {
    cancelButton.classList.remove('d-none');
    modalTitle.textContent = 'Editar forma';
    modal.show();
  }
})();
