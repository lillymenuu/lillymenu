(function () {
  // Caminho salvo no banco pode ser um caminho local relativo a admin/ (precisa
  // subir um nivel daqui, admin/superadmin/) ou uma URL completa do R2 (usa direto).
  function urlAdminSub(caminho) {
    if (!caminho) return '';
    if (/^https?:\/\//i.test(caminho)) return caminho;
    return '../' + caminho.replace(/^\/+/, '');
  }

  const listEl = document.getElementById('suporteConversas');
  const listEmptyEl = document.getElementById('suporteConversasEmpty');
  const contatosListEl = document.getElementById('suporteContatos');
  const contatosEmptyEl = document.getElementById('suporteContatosEmpty');
  const tabEls = document.querySelectorAll('.suporte-side-tab[data-tab]');
  const tabPanels = {
    chat: document.getElementById('suporteTabChat'),
    contatos: document.getElementById('suporteTabContatos'),
  };
  const placeholderEl = document.getElementById('suporteChatPlaceholder');
  const activeEl = document.getElementById('suporteChatActive');
  const lojaNomeEl = document.getElementById('suporteChatLojaNome');
  const statusEl = document.getElementById('suporteChatStatus');
  const chatAvatarEl = document.getElementById('suporteChatAvatar');
  const chatBodyEl = document.getElementById('suporteAdminChatBody');
  const formEl = document.getElementById('suporteAdminChatForm');
  const inputEl = document.getElementById('suporteAdminChatInput');
  const navBadge = document.getElementById('suporteNavBadge');
  const searchEl = document.getElementById('suporteSearchConversas');
  const anexoBtn = document.getElementById('suporteAnexoBtn');
  const anexoInput = document.getElementById('suporteAnexoInput');
  const anexoPreview = document.getElementById('suporteAnexoPreview');
  const anexoPreviewImg = document.getElementById('suporteAnexoPreviewImg');
  const anexoPreviewNome = document.getElementById('suporteAnexoPreviewNome');
  const anexoRemover = document.getElementById('suporteAnexoRemover');
  const sideSettingsBtn = document.getElementById('suporteSideSettingsBtn');

  sideSettingsBtn?.addEventListener('click', () => {
    const modalPerfil = document.getElementById('perfilModal');
    if (modalPerfil && typeof abrirModal === 'function') abrirModal(modalPerfil);
  });

  if (!listEl) return;

  let lojaSelecionadaId = null;
  let lojaSelecionadaNome = '';
  let lojaSelecionadaLogo = '';
  let ultimoId = 0;
  let ultimaDataMsg = null;
  let pollChatTimer = null;
  let arquivoSelecionado = null;
  let termoBusca = '';
  let autoAbriuLojaUrl = false;
  let pollDigitandoTimer = null;
  let ultimoEnvioDigitando = 0;
  let digitandoStopTimer = null;

  const iniciais = (nome, max) => {
    max = max || 2;
    nome = (nome || '').trim();
    if (!nome) return 'A';
    const partes = nome.split(/\s+/).filter((p) => /[\p{L}\d]/u.test(p));
    if (!partes.length) return 'A';
    return partes.slice(0, max).map((p) => p.charAt(0).toUpperCase()).join('');
  };

  const meuAvatar = () => {
    const el = document.querySelector('#btnEditarPerfil .avatar');
    if (!el) return { foto: '', iniciais: 'A' };
    return { foto: el.dataset.foto || '', iniciais: el.dataset.iniciais || 'A' };
  };

  const avatarInnerHtml = (fotoUrl, texto) => {
    if (fotoUrl) return `<img src="${escapeHtml(fotoUrl)}" alt="">`;
    return escapeHtml(texto);
  };

  const formatarHora = (iso) => {
    const data = new Date(String(iso).replace(' ', 'T'));
    if (isNaN(data.getTime())) return '';
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarDataResumo = (iso) => {
    if (!iso) return '';
    const data = new Date(String(iso).replace(' ', 'T'));
    if (isNaN(data.getTime())) return '';
    const hoje = new Date();
    const mesmoDia = data.toDateString() === hoje.toDateString();
    return mesmoDia
      ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : data.toLocaleDateString('pt-BR');
  };

  const formatarDataSeparador = (iso) => {
    const data = new Date(String(iso).replace(' ', 'T'));
    if (isNaN(data.getTime())) return '';
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    if (data.toDateString() === hoje.toDateString()) return 'Hoje';
    if (data.toDateString() === ontem.toDateString()) return 'Ontem';
    return data.toLocaleDateString('pt-BR');
  };

  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const aplicarFiltroLista = () => {
    const termo = termoBusca.toLowerCase();
    document.querySelectorAll('#suporteConversas .suporte-admin-list-item, #suporteContatos .suporte-admin-list-item').forEach((item) => {
      const nome = (item.dataset.lojaNome || '').toLowerCase();
      item.style.display = !termo || nome.includes(termo) ? '' : 'none';
    });
  };

  searchEl?.addEventListener('input', () => {
    termoBusca = searchEl.value.trim();
    aplicarFiltroLista();
  });

  const renderMensagem = (msg) => {
    const dataChave = String(msg.criado_em).slice(0, 10);
    if (dataChave !== ultimaDataMsg) {
      ultimaDataMsg = dataChave;
      const sep = document.createElement('div');
      sep.className = 'suporte-chat-date-sep';
      sep.textContent = formatarDataSeparador(msg.criado_em);
      chatBodyEl.appendChild(sep);
    }
    const isOwn = msg.remetente === 'suporte';
    const el = document.createElement('div');
    el.className = 'suporte-msg suporte-msg--' + (isOwn ? 'loja' : 'suporte');
    let avatarInner;
    if (isOwn) {
      const meu = meuAvatar();
      avatarInner = avatarInnerHtml(meu.foto, meu.iniciais);
    } else {
      avatarInner = avatarInnerHtml(lojaSelecionadaLogo, iniciais(lojaSelecionadaNome));
    }
    const sideHtml = `<div class="suporte-msg-side"><div class="suporte-msg-avatar">${avatarInner}</div><div class="suporte-msg-hora">${formatarHora(msg.criado_em)}</div></div>`;
    const imagemHtml = msg.anexo_arquivo
      ? `<img class="suporte-msg-image" src="${escapeHtml(urlAdminSub(msg.anexo_arquivo))}" alt="Imagem enviada">`
      : '';
    const textoHtml = msg.mensagem ? `<div class="suporte-msg-bubble">${escapeHtml(msg.mensagem)}</div>` : '';
    const menuHtml = `<button type="button" class="suporte-msg-menu" aria-label="Mais opções"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>`;
    el.innerHTML = `
      ${sideHtml}
      <div class="suporte-msg-content">
        ${imagemHtml}
        ${textoHtml}
      </div>
      ${menuHtml}
    `;
    chatBodyEl.appendChild(el);
    if (Number(msg.id) > ultimoId) ultimoId = Number(msg.id);
  };

  chatBodyEl?.addEventListener('click', (e) => {
    if (e.target.classList.contains('suporte-msg-image')) {
      window.open(e.target.src, '_blank');
    }
  });

  const scrollToBottom = () => {
    chatBodyEl.scrollTop = chatBodyEl.scrollHeight;
  };

  const carregarConversas = () => {
    fetch('../api/suporte_conversas.php?apenas_com_mensagens=1')
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        listEl.querySelectorAll('.suporte-admin-list-item').forEach((el) => el.remove());
        let totalNaoLidas = 0;
        if (!data.conversas.length) {
          if (listEmptyEl) listEmptyEl.style.display = '';
        } else {
          if (listEmptyEl) listEmptyEl.style.display = 'none';
          data.conversas.forEach((c) => {
            totalNaoLidas += Number(c.nao_lidas) || 0;
            const logoUrl = urlAdminSub(c.logo);
            const item = document.createElement('div');
            item.className = 'suporte-admin-list-item' + (Number(c.loja_id) === lojaSelecionadaId ? ' active' : '');
            item.dataset.lojaId = c.loja_id;
            item.dataset.lojaNome = c.nome;
            item.dataset.lojaLogo = logoUrl;
            item.innerHTML = `
              <div class="suporte-admin-list-avatar"></div>
              <div class="suporte-admin-list-info">
                <div class="suporte-admin-list-nome"></div>
                <div class="suporte-admin-list-preview"></div>
              </div>
              <div class="suporte-admin-list-meta">
                <div class="suporte-admin-list-hora"></div>
                ${Number(c.nao_lidas) > 0 ? `<span class="suporte-admin-list-badge">${c.nao_lidas}</span>` : ''}
              </div>
            `;
            item.querySelector('.suporte-admin-list-avatar').innerHTML = avatarInnerHtml(logoUrl, iniciais(c.nome));
            item.querySelector('.suporte-admin-list-nome').textContent = c.nome;
            item.querySelector('.suporte-admin-list-preview').textContent = c.ultima_mensagem || (c.ultimo_anexo ? '📷 Imagem' : 'Sem mensagens ainda.');
            item.querySelector('.suporte-admin-list-hora').textContent = formatarDataResumo(c.ultima_em);
            listEl.appendChild(item);
          });
        }
        aplicarFiltroLista();
        if (navBadge) {
          if (totalNaoLidas > 0) {
            navBadge.textContent = totalNaoLidas > 9 ? '9+' : String(totalNaoLidas);
            navBadge.style.display = '';
          } else {
            navBadge.style.display = 'none';
          }
        }
        if (!autoAbriuLojaUrl) {
          const lojaIdUrl = new URLSearchParams(window.location.search).get('loja_id');
          if (lojaIdUrl) {
            const item = listEl.querySelector(`.suporte-admin-list-item[data-loja-id="${lojaIdUrl}"]`);
            if (item) {
              autoAbriuLojaUrl = true;
              selecionarLoja(item.dataset.lojaId, item.dataset.lojaNome, item.dataset.lojaLogo);
            }
          }
        }
      })
      .catch(() => {});
  };

  const ativarTab = (nome) => {
    tabEls.forEach((t) => t.classList.toggle('active', t.dataset.tab === nome));
    Object.keys(tabPanels).forEach((k) => {
      if (tabPanels[k]) tabPanels[k].style.display = k === nome ? '' : 'none';
    });
    if (nome === 'contatos') carregarContatos();
  };

  tabEls.forEach((t) => {
    t.addEventListener('click', () => ativarTab(t.dataset.tab));
  });

  const carregarContatos = () => {
    if (!contatosListEl) return;
    fetch('../api/suporte_conversas.php')
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        contatosListEl.querySelectorAll('.suporte-admin-list-item').forEach((el) => el.remove());
        if (!data.conversas.length) {
          if (contatosEmptyEl) contatosEmptyEl.style.display = '';
        } else {
          if (contatosEmptyEl) contatosEmptyEl.style.display = 'none';
          data.conversas.forEach((c) => {
            const logoUrl = urlAdminSub(c.logo);
            const item = document.createElement('div');
            item.className = 'suporte-admin-list-item' + (Number(c.loja_id) === lojaSelecionadaId ? ' active' : '');
            item.dataset.lojaId = c.loja_id;
            item.dataset.lojaNome = c.nome;
            item.dataset.lojaLogo = logoUrl;
            item.innerHTML = `
              <div class="suporte-admin-list-avatar"></div>
              <div class="suporte-admin-list-info">
                <div class="suporte-admin-list-nome"></div>
                <div class="suporte-admin-list-preview">Toque para iniciar uma conversa</div>
              </div>
            `;
            item.querySelector('.suporte-admin-list-avatar').innerHTML = avatarInnerHtml(logoUrl, iniciais(c.nome));
            item.querySelector('.suporte-admin-list-nome').textContent = c.nome;
            contatosListEl.appendChild(item);
          });
        }
        aplicarFiltroLista();
      })
      .catch(() => {});
  };

  contatosListEl?.addEventListener('click', (event) => {
    const item = event.target.closest('.suporte-admin-list-item');
    if (!item) return;
    selecionarLoja(item.dataset.lojaId, item.dataset.lojaNome, item.dataset.lojaLogo);
    ativarTab('chat');
  });

  const carregarMensagens = (inicial) => {
    if (!lojaSelecionadaId) return;
    fetch(`../api/suporte_mensagens.php?loja_id=${lojaSelecionadaId}` + (inicial ? '' : '&after_id=' + ultimoId))
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        if (inicial) chatBodyEl.innerHTML = '';
        data.mensagens.forEach(renderMensagem);
        if (data.mensagens.length) scrollToBottom();
      })
      .catch(() => {});
  };

  const pararPollingChat = () => {
    if (pollChatTimer) clearInterval(pollChatTimer);
    pollChatTimer = null;
  };

  const enviarDigitando = (ativo) => {
    if (!lojaSelecionadaId) return;
    const body = new URLSearchParams();
    body.append('loja_id', lojaSelecionadaId);
    body.append('ativo', ativo ? '1' : '0');
    fetch('../api/suporte_digitando.php', { method: 'POST', body }).catch(() => {});
  };

  const verificarDigitandoOutro = () => {
    if (!lojaSelecionadaId || !statusEl) return;
    fetch(`../api/suporte_digitando.php?loja_id=${lojaSelecionadaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        if (data.digitando) {
          statusEl.textContent = 'Digitando...';
          statusEl.classList.add('digitando');
        } else {
          statusEl.textContent = '';
          statusEl.classList.remove('digitando');
        }
      })
      .catch(() => {});
  };

  const pararPollingDigitando = () => {
    if (pollDigitandoTimer) clearInterval(pollDigitandoTimer);
    pollDigitandoTimer = null;
    if (digitandoStopTimer) clearTimeout(digitandoStopTimer);
    digitandoStopTimer = null;
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.classList.remove('digitando');
    }
  };

  inputEl?.addEventListener('input', () => {
    if (!lojaSelecionadaId) return;
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

  const limparAnexo = () => {
    arquivoSelecionado = null;
    if (anexoInput) anexoInput.value = '';
    if (anexoPreview) anexoPreview.style.display = 'none';
  };

  const selecionarLoja = (id, nome, logo) => {
    lojaSelecionadaId = Number(id);
    lojaSelecionadaNome = nome;
    lojaSelecionadaLogo = logo || '';
    ultimoId = 0;
    ultimaDataMsg = null;
    limparAnexo();
    listEl.querySelectorAll('.suporte-admin-list-item').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.lojaId) === lojaSelecionadaId);
    });
    if (placeholderEl) placeholderEl.style.display = 'none';
    if (activeEl) activeEl.style.display = 'flex';
    if (lojaNomeEl) lojaNomeEl.textContent = nome;
    if (chatAvatarEl) chatAvatarEl.innerHTML = avatarInnerHtml(lojaSelecionadaLogo, iniciais(nome));
    carregarMensagens(true);
    pararPollingChat();
    pollChatTimer = setInterval(() => carregarMensagens(false), 5000);
    pararPollingDigitando();
    verificarDigitandoOutro();
    pollDigitandoTimer = setInterval(verificarDigitandoOutro, 2500);
  };

  if (listEl) {
    listEl.addEventListener('click', (event) => {
      const item = event.target.closest('.suporte-admin-list-item');
      if (!item) return;
      selecionarLoja(item.dataset.lojaId, item.dataset.lojaNome, item.dataset.lojaLogo);
    });
  }

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

  if (formEl) {
    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!lojaSelecionadaId) return;
      const texto = inputEl.value.trim();
      if (!texto && !arquivoSelecionado) return;
      const formData = new FormData();
      formData.append('mensagem', texto);
      formData.append('loja_id', lojaSelecionadaId);
      if (arquivoSelecionado) formData.append('imagem', arquivoSelecionado);
      inputEl.value = '';
      limparAnexo();
      if (digitandoStopTimer) clearTimeout(digitandoStopTimer);
      ultimoEnvioDigitando = 0;
      enviarDigitando(false);
      fetch('../api/suporte_enviar.php', { method: 'POST', body: formData })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            renderMensagem(data.mensagem);
            scrollToBottom();
            carregarConversas();
          } else {
            inputEl.value = texto;
          }
        })
        .catch(() => {
          inputEl.value = texto;
        });
    });
  }

  carregarConversas();
  setInterval(() => {
    carregarConversas();
    if (lojaSelecionadaId) carregarMensagens(false);
  }, 8000);
})();
