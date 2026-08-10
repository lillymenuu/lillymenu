(function(){
  const flash = FINCAT_DATA.flash;
  const parentModalOpen = FINCAT_DATA.parentModalOpen;
  const categoryModalOpen = FINCAT_DATA.categoryModalOpen;
  const apiUrl = './api/financial_categories.php';
  const form = document.getElementById('financial-category-form');
  const cancelButton = document.getElementById('financial-category-cancel');
  const idField = document.getElementById('financial-category-id');
  const nameField = document.getElementById('financial-category-name');
  const typeField = document.getElementById('financial-category-type');
  const activeField = document.getElementById('financial-category-active');
  const parentField = document.getElementById('financial-category-parent');
  const typeFilterField = document.getElementById('financial-category-type-filter');
  const filterForm = document.getElementById('financial-category-filter-form');
  const submitButton = document.getElementById('financial-category-submit');
  const categoryModalEl = document.getElementById('categoryModal');
  const categoryModal = categoryModalEl ? new bootstrap.Modal(categoryModalEl) : null;
  const parentModalEl = document.getElementById('parentCategoryModal');
  const parentModal = parentModalEl ? new bootstrap.Modal(parentModalEl) : null;
  const deleteModalEl = document.getElementById('financialCategoryDeleteModal');
  const deleteModal = deleteModalEl ? new bootstrap.Modal(deleteModalEl) : null;
  const deleteConfirmButton = document.getElementById('financial-category-delete-confirm');
  const parentForm = document.getElementById('financial-parent-category-form');
  const parentIdField = document.getElementById('financial-parent-id');
  const parentNameField = document.getElementById('financial-parent-name');
  const parentTypeField = document.getElementById('financial-parent-type');
  const parentActiveField = document.getElementById('financial-parent-active');
  const parentSubmitButton = document.getElementById('financial-parent-submit');
  const parentResetButton = document.getElementById('financial-parent-reset');
  let pendingDeleteForm = null;

  if (flash && flash.msg) {
    window.addEventListener('load', () => {
      window.finModule.showToast(flash.msg, !!flash.ok);
      if (categoryModalOpen && categoryModal) {
        categoryModal.show();
      }
      if (parentModalOpen && parentModal) {
        parentModal.show();
      }
    }, { once: true });
  } else if (categoryModalOpen && categoryModal) {
    window.addEventListener('load', () => {
      categoryModal.show();
    }, { once: true });
  }

  function resetFormState() {
    idField.value = '0';
    nameField.value = '';
    typeField.value = 'income';
    activeField.value = '1';
    cancelButton.classList.add('d-none');
    submitButton.textContent = 'Cadastrar categoria';
    loadRootOptions(typeField.value || 'income', 0, 0);
    if (window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('edit');
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
    }
  }

  async function loadRootOptions(type, selectedId = 0, excludeId = 0) {
    const query = window.finModule.toQuery({ action: 'root-options', type, selected_id: selectedId, exclude_id: excludeId });
    const json = await window.finModule.request(`${apiUrl}?${query}`);
    parentField.innerHTML = json.root_options_html || '<option value="">Sem pai</option>';
  }

  typeFilterField.addEventListener('change', () => {
    filterForm.submit();
  });

  typeField.addEventListener('change', () => {
    loadRootOptions(typeField.value || 'income', 0, parseInt(idField.value || '0', 10)).catch((error) => {
      window.finModule.showToast(error.msg || 'Nao foi possivel atualizar as categorias pai.', false);
    });
  });

  cancelButton.addEventListener('click', (event) => {
    event.preventDefault();
    resetFormState();
    categoryModal?.hide();
  });

  function resetParentFormState() {
    if (!parentForm) return;
    parentForm.reset();
    parentIdField.value = '0';
    parentSubmitButton.textContent = 'Salvar categoria pai';
  }

  parentResetButton?.addEventListener('click', () => {
    resetParentFormState();
  });

  document.addEventListener('click', (event) => {
    const editButton = event.target.closest('.js-parent-category-edit');
    if (!editButton) return;
    parentIdField.value = editButton.dataset.id || '0';
    parentNameField.value = editButton.dataset.name || '';
    parentTypeField.value = editButton.dataset.type || 'income';
    parentActiveField.value = String(editButton.dataset.active || '1');
    parentSubmitButton.textContent = 'Salvar alterações';
    if (parentModal) {
      parentModal.show();
    }
  });

  parentModalEl?.addEventListener('hidden.bs.modal', () => {
    resetParentFormState();
  });

  document.addEventListener('submit', (event) => {
    const deleteForm = event.target.closest('.js-fin-delete-category');
    if (!deleteForm) return;
    event.preventDefault();
    pendingDeleteForm = deleteForm;
    deleteModal?.show();
  });

  deleteConfirmButton?.addEventListener('click', () => {
    if (!pendingDeleteForm) {
      deleteModal?.hide();
      return;
    }
    pendingDeleteForm.submit();
  });

  deleteModalEl?.addEventListener('hidden.bs.modal', () => {
    pendingDeleteForm = null;
  });
})();
