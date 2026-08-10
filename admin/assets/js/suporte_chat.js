(function () {
  const toggle = document.getElementById('suporteChatToggle');
  const panel = document.getElementById('suporteChatPanel');
  const closeBtn = document.getElementById('suporteChatClose');
  const badge = document.getElementById('suporteChatBadge');
  const body = document.getElementById('suporteChatBody');
  const form = document.getElementById('suporteChatForm');
  const input = document.getElementById('suporteChatInput');
  const anexoBtn = document.getElementById('suporteChatAnexoBtn');
  const anexoInput = document.getElementById('suporteChatAnexoInput');
  const anexoPreview = document.getElementById('suporteChatAnexoPreview');
  const anexoPreviewImg = document.getElementById('suporteChatAnexoPreviewImg');
  const anexoPreviewNome = document.getElementById('suporteChatAnexoPreviewNome');
  const anexoRemover = document.getElementById('suporteChatAnexoRemover');
  const statusEl = document.getElementById('suporteChatStatus');

  if (!toggle || !panel || !body || !form || !input) return;

  let aberto = false;
  let ultimoId = 0;
  let pollTimer = null;
  let arquivoSelecionado = null;
  let pollDigitandoTimer = null;
  let ultimoEnvioDigitando = 0;
  let digitandoStopTimer = null;

  const formatarHora = (iso) => {
    const data = new Date(iso.replace(' ', 'T'));
    if (isNaN(data.getTime())) return '';
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const renderMensagem = (msg) => {
    const el = document.createElement('div');
    el.className = 'suporte-msg suporte-msg--' + (msg.remetente === 'loja' ? 'loja' : 'suporte');
    const imagemHtml = msg.anexo_arquivo
      ? `<img class="suporte-msg-image" src="${escapeHtml(msg.anexo_arquivo)}" alt="Imagem enviada">`
      : '';
    const textoHtml = msg.mensagem ? `<div class="suporte-msg-bubble">${escapeHtml(msg.mensagem)}</div>` : '';
    el.innerHTML = `
      <div class="suporte-msg-content">
        ${imagemHtml}
        ${textoHtml}
        <div class="suporte-msg-hora">${formatarHora(msg.criado_em)}</div>
      </div>
    `;
    body.appendChild(el);
    if (Number(msg.id) > ultimoId) ultimoId = Number(msg.id);
  };

  body.addEventListener('click', (e) => {
    if (e.target.classList.contains('suporte-msg-image')) {
      window.open(e.target.src, '_blank');
    }
  });

  const scrollToBottom = () => {
    body.scrollTop = body.scrollHeight;
  };

  const atualizarBadge = (count) => {
    if (!badge) return;
    if (count > 0 && !aberto) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  };

  const carregarUnread = () => {
    if (aberto) return;
    fetch('api/suporte_unread.php')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) atualizarBadge(data.unread);
      })
      .catch(() => {});
  };

  const carregarMensagens = (inicial) => {
    fetch('api/suporte_mensagens.php' + (inicial ? '' : '?after_id=' + ultimoId))
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        if (inicial) body.innerHTML = '';
        data.mensagens.forEach(renderMensagem);
        if (data.mensagens.length) scrollToBottom();
      })
      .catch(() => {});
  };

  const iniciarPolling = () => {
    pararPolling();
    pollTimer = setInterval(() => carregarMensagens(false), 5000);
  };

  const pararPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  };

  const enviarDigitando = (ativo) => {
    const body = new URLSearchParams();
    body.append('ativo', ativo ? '1' : '0');
    fetch('api/suporte_digitando.php', { method: 'POST', body }).catch(() => {});
  };

  const verificarDigitandoOutro = () => {
    if (!statusEl) return;
    fetch('api/suporte_digitando.php')
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        if (data.digitando) {
          statusEl.textContent = 'Digitando...';
          statusEl.classList.add('digitando');
        } else {
          statusEl.textContent = 'On-line';
          statusEl.classList.remove('digitando');
        }
      })
      .catch(() => {});
  };

  const iniciarPollingDigitando = () => {
    pararPollingDigitando();
    verificarDigitandoOutro();
    pollDigitandoTimer = setInterval(verificarDigitandoOutro, 2500);
  };

  const pararPollingDigitando = () => {
    if (pollDigitandoTimer) clearInterval(pollDigitandoTimer);
    pollDigitandoTimer = null;
    if (digitandoStopTimer) clearTimeout(digitandoStopTimer);
    digitandoStopTimer = null;
    if (statusEl) {
      statusEl.textContent = 'On-line';
      statusEl.classList.remove('digitando');
    }
  };

  input.addEventListener('input', () => {
    const agora = Date.now();
    if (agora - ultimoEnvioDigitando > 2000) {
      ultimoEnvioDigitando = agora;
      enviarDigitando(true);
    }
    if (digitandoStopTimer) clearTimeout(digitandoStopTimer);
    digitandoStopTimer = setTimeout(() => {
      enviarDigitando(false);
      ultimoEnvioDigitando = 0;
    }, 2500);
  });

  const abrirChat = () => {
    aberto = true;
    panel.classList.add('show');
    atualizarBadge(0);
    carregarMensagens(true);
    iniciarPolling();
    iniciarPollingDigitando();
  };

  const fecharChat = () => {
    aberto = false;
    panel.classList.remove('show');
    pararPolling();
    pararPollingDigitando();
  };

  toggle.addEventListener('click', () => {
    if (aberto) fecharChat();
    else abrirChat();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', fecharChat);
  }

  const limparAnexo = () => {
    arquivoSelecionado = null;
    if (anexoInput) anexoInput.value = '';
    if (anexoPreview) anexoPreview.style.display = 'none';
  };

  anexoBtn?.addEventListener('click', () => anexoInput?.click());

  anexoInput?.addEventListener('change', () => {
    const file = anexoInput.files && anexoInput.files[0];
    if (!file) return;
    arquivoSelecionado = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (anexoPreviewImg && ev.target?.result) anexoPreviewImg.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    if (anexoPreviewNome) anexoPreviewNome.textContent = file.name;
    if (anexoPreview) anexoPreview.style.display = 'flex';
  });

  anexoRemover?.addEventListener('click', limparAnexo);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = input.value.trim();
    if (!texto && !arquivoSelecionado) return;
    const formData = new FormData();
    formData.append('mensagem', texto);
    if (arquivoSelecionado) formData.append('imagem', arquivoSelecionado);
    input.value = '';
    limparAnexo();
    if (digitandoStopTimer) clearTimeout(digitandoStopTimer);
    ultimoEnvioDigitando = 0;
    enviarDigitando(false);
    fetch('api/suporte_enviar.php', { method: 'POST', body: formData })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          renderMensagem(data.mensagem);
          scrollToBottom();
        } else {
          input.value = texto;
        }
      })
      .catch(() => {
        input.value = texto;
      });
  });

  carregarUnread();
  setInterval(carregarUnread, 15000);
})();
