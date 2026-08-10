window.finModule = (() => {
  function toQuery(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, value);
      }
    });
    return query.toString();
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        ...(options.headers || {})
      },
      ...options
    });
    const json = await response.json().catch(() => ({ ok: false, msg: 'Resposta invalida do servidor.' }));
    if (!response.ok) {
      if (!json.msg) {
        json.msg = 'Nao foi possivel concluir a operacao.';
      }
      throw json;
    }
    if (!json.ok) {
      throw json;
    }
    return json;
  }

  function showToast(message, ok = true) {
    const host = document.getElementById('fin-toast-host');
    if (!host) return;

    host.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = `fin-toast ${ok ? 'fin-toast-success' : 'fin-toast-error'} fin-toast-floating`;
    toast.innerHTML = `<i class="bi ${ok ? 'bi-check-circle' : 'bi-exclamation-triangle'}"></i><span>${message}</span>`;
    host.appendChild(toast);

    window.clearTimeout(host._toastTimer);
    host._toastTimer = window.setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  function setLoading(button, loading, loadingText = 'Salvando...') {
    if (!button) return;
    if (loading) {
      button.dataset.originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = loadingText;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
      }
    }
  }

  function resetForm(form) {
    form.reset();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    toQuery,
    request,
    showToast,
    setLoading,
    resetForm,
    escapeHtml
  };
})();
