(function () {
  const form = document.getElementById('notifForm');
  if (!form) return;

  const tituloInput = document.getElementById('notifTitulo');
  const mensagemInput = document.getElementById('notifMensagem');
  const linkInput = document.getElementById('notifLink');
  const imageBtn = document.getElementById('notifImageBtn');
  const imageInput = document.getElementById('notifImageInput');
  const imageRemover = document.getElementById('notifImageRemover');
  const imagePreview = document.getElementById('notifImagePreview');
  const modoRadios = form.querySelectorAll('input[name="modo"]');
  const agendadoWrap = document.getElementById('notifAgendadoWrap');
  const agendadoInput = document.getElementById('notifAgendadoPara');
  const submitBtn = document.getElementById('notifSubmitBtn');
  const formMsg = document.getElementById('notifFormMsg');

  const previewTitulo = document.getElementById('notifPreviewTitulo');
  const previewMensagem = document.getElementById('notifPreviewMensagem');
  const previewImageWrap = document.getElementById('notifPreviewImage');
  const previewImageEl = previewImageWrap ? previewImageWrap.querySelector('img') : null;
  const previewLinkBtn = document.getElementById('notifPreviewLinkBtn');

  const atualizarPreviewTexto = () => {
    previewTitulo.textContent = tituloInput.value.trim() || 'Título da notificação';
    previewMensagem.textContent = mensagemInput.value.trim() || 'A mensagem escrita aqui vai aparecer assim para o lojista.';
    if (previewLinkBtn) previewLinkBtn.style.display = linkInput && linkInput.value.trim() ? '' : 'none';
  };
  tituloInput?.addEventListener('input', atualizarPreviewTexto);
  mensagemInput?.addEventListener('input', atualizarPreviewTexto);
  linkInput?.addEventListener('input', atualizarPreviewTexto);

  imageBtn?.addEventListener('click', () => imageInput?.click());

  const limparImagem = () => {
    if (imageInput) imageInput.value = '';
    if (imagePreview) imagePreview.innerHTML = '<span>Sem imagem</span>';
    if (imageRemover) imageRemover.style.display = 'none';
    if (previewImageWrap) previewImageWrap.style.display = 'none';
    if (previewImageEl) previewImageEl.src = '';
  };

  imageInput?.addEventListener('change', () => {
    const file = imageInput.files && imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result;
      if (!src) return;
      if (imagePreview) imagePreview.innerHTML = `<img src="${src}" alt="">`;
      if (previewImageEl) previewImageEl.src = src;
      if (previewImageWrap) previewImageWrap.style.display = '';
    };
    reader.readAsDataURL(file);
    if (imageRemover) imageRemover.style.display = '';
  });

  imageRemover?.addEventListener('click', limparImagem);

  const atualizarModo = () => {
    const modo = form.querySelector('input[name="modo"]:checked')?.value || 'agora';
    if (agendadoWrap) agendadoWrap.style.display = modo === 'programar' ? '' : 'none';
    if (agendadoInput) agendadoInput.required = modo === 'programar';
    if (submitBtn) {
      submitBtn.textContent = modo === 'programar' ? 'Programar envio' : 'Enviar para todas as lojas';
    }
  };
  modoRadios.forEach((r) => r.addEventListener('change', atualizarModo));
  atualizarModo();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    formMsg.textContent = '';
    formMsg.className = 'notif-form-msg';

    const modo = form.querySelector('input[name="modo"]:checked')?.value || 'agora';
    if (modo === 'programar' && !agendadoInput.value) {
      formMsg.textContent = 'Escolha a data e hora do envio.';
      formMsg.className = 'notif-form-msg error';
      return;
    }

    const formData = new FormData(form);
    submitBtn.disabled = true;
    fetch('../api/notificacao_broadcast_salvar.php', { method: 'POST', body: formData })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          formMsg.textContent = modo === 'programar' ? 'Notificação programada com sucesso.' : 'Notificação enviada com sucesso.';
          formMsg.className = 'notif-form-msg success';
          setTimeout(() => window.location.reload(), 900);
        } else {
          formMsg.textContent = data.msg || 'Erro ao salvar notificação.';
          formMsg.className = 'notif-form-msg error';
          submitBtn.disabled = false;
        }
      })
      .catch(() => {
        formMsg.textContent = 'Erro ao salvar notificação.';
        formMsg.className = 'notif-form-msg error';
        submitBtn.disabled = false;
      });
  });
})();

(function () {
  const confirmModal = document.getElementById('notifConfirmModal');
  const confirmTitulo = document.getElementById('notifConfirmTitulo');
  const confirmMsg = document.getElementById('notifConfirmMsg');
  const btnConfirmOk = document.getElementById('notifConfirmOk');
  const btnConfirmCancelar = document.getElementById('notifConfirmCancelar');
  if (!confirmModal) return;

  let formPendente = null;

  const fecharConfirm = () => {
    formPendente = null;
    confirmModal.classList.remove('show');
    confirmModal.setAttribute('aria-hidden', 'true');
  };

  document.querySelectorAll('.notif-form-confirmavel').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      formPendente = form;
      if (confirmTitulo) confirmTitulo.textContent = form.dataset.confirmTitulo || 'Confirmar ação';
      if (confirmMsg) confirmMsg.textContent = form.dataset.confirmMsg || 'Tem certeza que deseja continuar?';
      if (btnConfirmOk) btnConfirmOk.textContent = form.dataset.confirmBtn || 'Confirmar';
      confirmModal.classList.add('show');
      confirmModal.setAttribute('aria-hidden', 'false');
    });
  });

  btnConfirmOk?.addEventListener('click', () => {
    if (formPendente) formPendente.submit();
  });
  btnConfirmCancelar?.addEventListener('click', fecharConfirm);
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) fecharConfirm();
  });
})();
