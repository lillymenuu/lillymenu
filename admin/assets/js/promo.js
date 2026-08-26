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

window.avisoPromoBloqueada = function () {
  toast('Desative a promoção ativa antes de ativar outra.');
};

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast-custom';
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function toastSucessoTopo(msg) {
  const t = document.createElement('div');
  t.className = 'toast-sucesso-topo';
  t.innerHTML = '<i class="bi bi-check-circle-fill"></i> ' + msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 250);
  }, 2500);
}

(function () {
  const modalEl = document.getElementById('modalFlyers');
  if (!modalEl) return;

  const msgEl = document.getElementById('flyerModalMsg');
  const salvarBtn = document.getElementById('flyerSalvarBtn');
  const ativoToggle = document.getElementById('flyerAtivoToggle');
  const listEl = document.getElementById('flyerList');
  const atuais = Array.isArray(window.LOJA_FLYERS_ATUAIS) ? window.LOJA_FLYERS_ATUAIS : [];

  function itens() {
    return Array.from(listEl.querySelectorAll('.flyer-field'));
  }

  function estadoDe(wrapper) {
    if (!wrapper._flyerState) {
      wrapper._flyerState = { urlAtual: null, base64Novo: null, removido: false };
    }
    return wrapper._flyerState;
  }

  function preencherPreview(wrapper) {
    const estado = estadoDe(wrapper);
    const preview = wrapper.querySelector('.flyer-imagem-preview');
    const removerBtn = wrapper.querySelector('.flyer-remover-btn');
    if (estado.base64Novo) {
      preview.innerHTML = `<img src="${estado.base64Novo}" alt="">`;
      removerBtn.classList.remove('d-none');
    } else if (estado.urlAtual && !estado.removido) {
      preview.innerHTML = `<img src="${estado.urlAtual}" alt="">`;
      removerBtn.classList.remove('d-none');
    } else {
      preview.innerHTML = '<i class="bi bi-image"></i>';
      removerBtn.classList.add('d-none');
    }
  }

  function atualizarLabels() {
    itens().forEach((wrapper, i) => {
      wrapper.querySelector('.flyer-field-label').textContent = 'Imagem ' + (i + 1);
    });
  }

  itens().forEach((wrapper, i) => {
    estadoDe(wrapper).urlAtual = atuais[i] || null;
    preencherPreview(wrapper);

    const btn = wrapper.querySelector('.flyer-anexar-btn');
    const input = wrapper.querySelector('.flyer-file-input');
    const removerBtn = wrapper.querySelector('.flyer-remover-btn');
    const handle = wrapper.querySelector('.flyer-drag-handle');

    btn?.addEventListener('click', () => input?.click());

    input?.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const estado = estadoDe(wrapper);
        estado.base64Novo = ev.target?.result || null;
        estado.removido = false;
        preencherPreview(wrapper);
      };
      reader.readAsDataURL(file);
    });

    removerBtn?.addEventListener('click', () => {
      const estado = estadoDe(wrapper);
      estado.base64Novo = null;
      estado.removido = true;
      input.value = '';
      preencherPreview(wrapper);
    });

    handle?.addEventListener('dragstart', (e) => {
      wrapper.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    });
    handle?.addEventListener('dragend', () => {
      wrapper.classList.remove('dragging');
      atualizarLabels();
    });
  });

  listEl?.addEventListener('dragover', (e) => {
    e.preventDefault();
    const dragging = listEl.querySelector('.flyer-field.dragging');
    if (!dragging) return;
    const proximo = itens().find((el) => {
      if (el === dragging) return false;
      const box = el.getBoundingClientRect();
      return e.clientY < box.top + box.height / 2;
    });
    if (proximo) {
      listEl.insertBefore(dragging, proximo);
    } else {
      listEl.appendChild(dragging);
    }
  });

  ativoToggle?.addEventListener('change', () => {
    const ativo = ativoToggle.checked;
    ativoToggle.disabled = true;

    fetch('api/flyers_toggle.php', {
      method: 'POST',
      body: new URLSearchParams({ ativo: ativo ? '1' : '0' })
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          ativoToggle.checked = !ativo;
          toast('Erro ao atualizar os slides.');
          return;
        }
        toastSucessoTopo(ativo ? 'Slides habilitados' : 'Slides desabilitados');
      })
      .catch(() => {
        ativoToggle.checked = !ativo;
        toast('Erro ao atualizar os slides.');
      })
      .finally(() => {
        ativoToggle.disabled = false;
      });
  });

  window.salvarFlyers = function () {
    msgEl.textContent = '';
    salvarBtn.disabled = true;

    const body = new FormData();
    itens().forEach((wrapper, i) => {
      const n = i + 1;
      const estado = estadoDe(wrapper);
      if (estado.removido) {
        body.append(`flyer_${n}_remover`, '1');
      } else if (estado.base64Novo) {
        body.append(`flyer_${n}_base64`, estado.base64Novo);
      } else if (estado.urlAtual) {
        body.append(`flyer_${n}_url`, estado.urlAtual);
      }
    });

    fetch('api/flyers_salvar.php', { method: 'POST', body })
      .then((r) => r.json())
      .then((data) => {
        salvarBtn.disabled = false;
        if (data.ok) {
          const flyers = Array.isArray(data.flyers) ? data.flyers : [];
          itens().forEach((wrapper, i) => {
            const estado = estadoDe(wrapper);
            estado.urlAtual = flyers[i] || null;
            estado.base64Novo = null;
            estado.removido = false;
            wrapper.querySelector('.flyer-file-input').value = '';
            preencherPreview(wrapper);
          });
          atualizarLabels();
          bootstrap.Modal.getInstance(modalEl)?.hide();
          toastSucessoTopo('Slides salvos com sucesso');
        } else {
          msgEl.textContent = data.msg || 'Erro ao salvar o flyer.';
          msgEl.className = 'promo-modal-msg error';
        }
      })
      .catch(() => {
        salvarBtn.disabled = false;
        msgEl.textContent = 'Erro ao salvar o flyer.';
        msgEl.className = 'promo-modal-msg error';
      });
  };
})();
