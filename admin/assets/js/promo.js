(function () {
  const modalEl = document.getElementById('modalPromo');
  const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

  const thumbEl = document.getElementById('promoProdutoThumb');
  const nomeEl = document.getElementById('promoProdutoNome');
  const precoEl = document.getElementById('promoProdutoPreco');
  const ativarInput = document.getElementById('promoAtivarInput');
  const precoInput = document.getElementById('promoPrecoInput');
  const diasInput = document.getElementById('promoDiasInput');
  const descInput = document.getElementById('promoDescricaoInput');
  const imagemPreview = document.getElementById('promoImagemPreview');
  const imagemBtn = document.getElementById('promoImagemBtn');
  const imagemInput = document.getElementById('promoImagemInput');
  const imagemRemoverBtn = document.getElementById('promoImagemRemoverBtn');
  const msgEl = document.getElementById('promoModalMsg');
  const salvarBtn = document.getElementById('promoSalvarBtn');

  let produtoAtual = null;
  let imagemBase64Nova = null;
  let imagemRemovida = false;

  window.abrirPromoModal = function (d) {
    produtoAtual = d;
    imagemBase64Nova = null;
    imagemRemovida = false;
    msgEl.textContent = '';
    msgEl.className = 'promo-modal-msg';

    nomeEl.textContent = d.nome;
    precoEl.textContent = 'R$ ' + Number(d.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    thumbEl.innerHTML = d.imagem ? `<img src="${escapeHtml(d.imagem)}" alt="">` : '<i class="bi bi-image"></i>';

    ativarInput.checked = !!d.em_promo;
    precoInput.value = d.preco_promocional ? Number(d.preco_promocional).toFixed(2).replace('.', ',') : '';
    diasInput.value = d.promo_dias || '';
    descInput.value = d.promo_descricao || '';

    if (d.promo_imagem) {
      imagemPreview.innerHTML = `<img src="${escapeHtml(d.promo_imagem)}" alt="">`;
      imagemRemoverBtn.classList.remove('d-none');
    } else {
      imagemPreview.innerHTML = '<i class="bi bi-image"></i>';
      imagemRemoverBtn.classList.add('d-none');
    }
    imagemInput.value = '';

    modal?.show();
  };

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  imagemBtn?.addEventListener('click', () => imagemInput?.click());

  imagemInput?.addEventListener('change', () => {
    const file = imagemInput.files && imagemInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      imagemBase64Nova = ev.target?.result || null;
      imagemRemovida = false;
      if (imagemBase64Nova) {
        imagemPreview.innerHTML = `<img src="${imagemBase64Nova}" alt="">`;
        imagemRemoverBtn.classList.remove('d-none');
      }
    };
    reader.readAsDataURL(file);
  });

  imagemRemoverBtn?.addEventListener('click', () => {
    imagemBase64Nova = null;
    imagemRemovida = true;
    imagemPreview.innerHTML = '<i class="bi bi-image"></i>';
    imagemRemoverBtn.classList.add('d-none');
  });

  window.salvarPromo = function () {
    if (!produtoAtual) return;
    const ativar = ativarInput.checked;
    if (ativar && !precoInput.value.trim()) {
      msgEl.textContent = 'Informe o preço promocional.';
      msgEl.className = 'promo-modal-msg error';
      return;
    }

    msgEl.textContent = '';
    salvarBtn.disabled = true;

    const body = new FormData();
    body.append('produto_id', produtoAtual.id);
    body.append('ativar', ativar ? '1' : '0');
    body.append('preco_promocional', precoInput.value.trim());
    body.append('promo_dias', diasInput.value.trim());
    body.append('promo_descricao', descInput.value.trim());
    if (imagemBase64Nova) body.append('promo_imagem_base64', imagemBase64Nova);
    if (imagemRemovida) body.append('promo_imagem_remover', '1');

    fetch('api/promo_salvar.php', { method: 'POST', body })
      .then((r) => r.json())
      .then((data) => {
        salvarBtn.disabled = false;
        if (data.ok) {
          window.location.reload();
        } else {
          msgEl.textContent = data.msg || 'Erro ao salvar promoção.';
          msgEl.className = 'promo-modal-msg error';
        }
      })
      .catch(() => {
        salvarBtn.disabled = false;
        msgEl.textContent = 'Erro ao salvar promoção.';
        msgEl.className = 'promo-modal-msg error';
      });
  };
})();
