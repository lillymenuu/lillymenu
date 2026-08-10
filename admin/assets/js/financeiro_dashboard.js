(function(){
  const apiUrl = './api/financial_reports.php';
  const form = document.getElementById('financial-dashboard-filter-form');
  const content = document.getElementById('financial-dashboard-content');

  async function refreshDashboard() {
    const formData = new FormData(form);
    const query = window.finModule.toQuery({
      action: 'dashboard',
      mes: formData.get('mes'),
      ano: formData.get('ano')
    });
    const json = await window.finModule.request(`${apiUrl}?${query}`);
    content.innerHTML = json.content_html;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await refreshDashboard();
    } catch (error) {
      window.finModule.showToast(error.msg || 'Nao foi possivel atualizar o dashboard.', false);
    }
  });

  form.querySelectorAll('select').forEach((select) => {
    select.addEventListener('change', () => {
      refreshDashboard().catch((error) => window.finModule.showToast(error.msg || 'Nao foi possivel atualizar o dashboard.', false));
    });
  });
})();
