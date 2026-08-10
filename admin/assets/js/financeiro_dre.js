(function(){
  const apiUrl = './api/financial_reports.php';
  const form = document.getElementById('financial-dre-filter-form');
  const tableWrap = document.getElementById('financial-dre-table');

  async function refreshDre() {
    const formData = new FormData(form);
    const query = window.finModule.toQuery({ action: 'dre', ano: formData.get('ano') });
    const json = await window.finModule.request(`${apiUrl}?${query}`);
    tableWrap.innerHTML = json.table_html;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await refreshDre();
    } catch (error) {
      window.finModule.showToast(error.msg || 'Nao foi possivel atualizar a DRE.', false);
    }
  });

  form.querySelector('select').addEventListener('change', () => {
    refreshDre().catch((error) => window.finModule.showToast(error.msg || 'Nao foi possivel atualizar a DRE.', false));
  });
})();
