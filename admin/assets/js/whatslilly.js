(() => {
  'use strict';

  // ─── Estado ─────────────────────────────────────────────────────────────────
  let conversaAtiva  = null;
  let lastMsgId      = 0;
  let pollTimer      = null;
  let pedidosData    = [];

  // Seleção de contatos
  let modoSelContatos      = false;
  let contatosSelecionados = new Set();

  // Seleção de mensagens
  let modoSelMsgs         = false;
  let mensagensSelecionadas = new Set();

  // ─── Elementos ──────────────────────────────────────────────────────────────
  const contactsList   = document.getElementById('wlContactsList');
  const searchInput    = document.getElementById('wlBusca');
  const emptyState     = document.getElementById('wlEmptyState');
  const chatActive     = document.getElementById('wlChatActive');
  const messagesArea   = document.getElementById('wlMessagesArea');
  const chatInput      = document.getElementById('wlInput');
  const sendBtn        = document.getElementById('wlSendBtn');
  const btnPix         = document.getElementById('wlBtnPix');
  const inputBar       = document.getElementById('wlInputBar');
  const headerName     = document.getElementById('wlHeaderName');
  const headerNum      = document.getElementById('wlHeaderNum');
  const headerAvatar   = document.getElementById('wlHeaderAvatar');
  const ordersDrawer   = document.getElementById('wlOrdersDrawer');
  const drawerBody     = document.getElementById('wlDrawerBody');
  const modalOverlay   = document.getElementById('wlModalOverlay');
  const modalNumero    = document.getElementById('wlModalNumero');
  const modalNome      = document.getElementById('wlModalNome');
  const btnNovaConversa = document.getElementById('wlBtnNova');
  const contactsPanel  = document.querySelector('.wl-contacts-panel');

  // ─── Utilidades ─────────────────────────────────────────────────────────────
  function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }

  function timeAgo(dtStr) {
    if (!dtStr) return '';
    const dt  = new Date(dtStr.replace(' ', 'T'));
    const now = new Date();
    const isToday = dt.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = dt.toDateString() === yesterday.toDateString();
    if (isToday)     return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (isYesterday) return 'ontem';
    const diff = Math.floor((now - dt) / 86400000);
    if (diff < 7)    return dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.','');
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  function avatarColor(str) {
    const colors = ['#00a884','#0277bd','#7b1fa2','#c62828','#6a1b9a','#0288d1','#2e7d32','#e65100'];
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
  }

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Carregar conversas ──────────────────────────────────────────────────────
  async function carregarConversas(busca = '') {
    try {
      const r = await fetch(`api/whats_api.php?action=conversas&busca=${encodeURIComponent(busca)}`);
      const d = await r.json();
      if (!d.ok) return;
      renderContatos(d.data);
      atualizarBadgeSidebar(d.total_nao_lidas);
    } catch (e) {}
  }

  function renderContatos(lista) {
    if (!lista.length) {
      contactsList.innerHTML = `
        <div class="wl-empty-contacts">
          <i class="bi bi-chat-dots"></i>
          <p>Nenhuma conversa ainda.<br>Clique em + para iniciar.</p>
        </div>`;
      return;
    }

    contactsList.innerHTML = lista.map(c => {
      const nome   = c.nome || c.numero;
      const ini    = initials(nome);
      const cor    = avatarColor(c.numero);
      const badge  = c.nao_lidas > 0 ? `<span class="wl-badge">${c.nao_lidas}</span>` : '';
      const ativo  = conversaAtiva?.id == c.id ? ' active' : '';
      const selecionado = contatosSelecionados.has(parseInt(c.id)) ? ' wl-selecionado' : '';

      return `
        <div class="wl-contact-item${ativo}${selecionado}" data-id="${c.id}" data-nome="${escHtml(nome)}" data-num="${escHtml(c.numero)}">
          <div class="wl-avatar-wrap">
            <div class="wl-sel-check"><i class="bi bi-check-lg"></i></div>
            <div class="wl-avatar" style="background:${cor}">${ini}</div>
            <span class="wl-avatar-wa"><i class="bi bi-whatsapp"></i></span>
          </div>
          <div class="wl-contact-info">
            <div class="wl-contact-name">${escHtml(nome)}</div>
            <div class="wl-contact-last">${escHtml(c.ultimo_msg || '')}</div>
          </div>
          <div class="wl-contact-meta">
            <span class="wl-contact-time">${timeAgo(c.ultimo_msg_em)}</span>
            ${badge}
          </div>
        </div>`;
    }).join('');

    contactsList.querySelectorAll('.wl-contact-item').forEach(el => {
      el.addEventListener('click', () => {
        if (modoSelContatos) {
          toggleSelecaoContato(parseInt(el.dataset.id), el);
          return;
        }
        abrirConversa(parseInt(el.dataset.id), el.dataset.nome, el.dataset.num);
      });
    });
  }

  // ─── Abrir conversa ──────────────────────────────────────────────────────────
  async function abrirConversa(id, nome, numero) {
    // Sai do modo seleção se estiver ativo
    if (modoSelMsgs) cancelarModoSelMsgs();

    conversaAtiva = { id, nome, numero };
    lastMsgId = 0;
    pedidosData = [];

    ordersDrawer?.classList.remove('open');

    const cor = avatarColor(numero);
    headerAvatar.textContent = initials(nome);
    headerAvatar.style.background = cor;
    headerName.textContent = nome;
    headerNum.textContent  = numero;

    emptyState.style.display  = 'none';
    chatActive.style.display  = 'flex';

    messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px;">Carregando...</div>';

    document.querySelectorAll('.wl-contact-item').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.id) === id);
    });

    try {
      const r = await fetch(`api/whats_api.php?action=mensagens&conversa_id=${id}`);
      const d = await r.json();
      if (!d.ok) { messagesArea.innerHTML = '<div style="padding:20px;color:#ef4444">Erro ao carregar.</div>'; return; }

      pedidosData = d.pedidos || [];
      renderMensagens(d.mensagens, true);
      if (d.mensagens.length) lastMsgId = d.mensagens[d.mensagens.length - 1].id;
    } catch (e) {
      messagesArea.innerHTML = '<div style="padding:20px;color:#ef4444">Falha na conexão.</div>';
    }

    carregarConversas(searchInput?.value || '');

    clearInterval(pollTimer);
    pollTimer = setInterval(poll, 4000);
  }

  // ─── Renderizar mensagens ─────────────────────────────────────────────────────
  function renderMensagens(msgs, limpar = false) {
    if (limpar) messagesArea.innerHTML = '';

    if (!msgs.length && limpar) {
      messagesArea.innerHTML = `
        <div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px;">
          Nenhuma mensagem ainda.<br>Envie a primeira mensagem!
        </div>`;
      return;
    }

    let lastData = '';

    msgs.forEach(m => {
      const data = m.data_fmt || '';
      if (data && data !== lastData) {
        const div = document.createElement('div');
        div.className = 'wl-date-divider';
        div.textContent = data;
        messagesArea.appendChild(div);
        lastData = data;
      }

      const wrap = criarBolhaWrap(m);
      messagesArea.appendChild(wrap);
    });

    scrollBottom();
  }

  function criarBolhaWrap(m) {
    const wrap = document.createElement('div');
    wrap.className = `wl-bubble-wrap ${m.direcao}`;
    if (m.id) wrap.dataset.msgId = m.id;
    if (m.falhou) wrap.classList.add('wl-falhou');

    const indicator = `<div class="wl-bubble-sel-indicator"><i class="bi bi-check-lg"></i></div>`;
    const avisoFalha = m.falhou
      ? `<div class="wl-bubble-erro" title="${escHtml(m.erro || 'Mensagem não entregue')}"><i class="bi bi-exclamation-triangle-fill"></i> Não entregue ao cliente</div>`
      : '';

    if (m.tipo === 'pedido') {
      wrap.innerHTML = indicator + renderBolhaPedido(m);
    } else {
      wrap.innerHTML = indicator + `
        <div class="wl-bubble">
          ${escHtml(m.mensagem).replace(/\n/g, '<br>')}
          <div class="wl-bubble-time">${escHtml(m.hora || '')}</div>
        </div>
        ${avisoFalha}`;
    }

    wrap.addEventListener('click', () => {
      if (!modoSelMsgs || !m.id) return;
      const id = parseInt(m.id);
      if (mensagensSelecionadas.has(id)) {
        mensagensSelecionadas.delete(id);
        wrap.classList.remove('wl-selecionado');
      } else {
        mensagensSelecionadas.add(id);
        wrap.classList.add('wl-selecionado');
      }
      atualizarBarraSelMsgs();
    });

    return wrap;
  }

  function renderBolhaPedido(m) {
    const html = escHtml(m.mensagem)
      .replace(/\*([^*\r\n]+)\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>');

    return `
      <div class="wl-bubble wl-bubble-pedido">
        <div class="wl-pedido-body">${html}</div>
        <div class="wl-bubble-time wl-bubble-time-pedido">${escHtml(m.hora || '')}</div>
      </div>`;
  }

  function scrollBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  // ─── Polling ─────────────────────────────────────────────────────────────────
  async function poll() {
    if (!conversaAtiva) return;
    try {
      const r = await fetch(`api/whats_api.php?action=poll&conversa_id=${conversaAtiva.id}&after_id=${lastMsgId}`);
      const d = await r.json();
      if (!d.ok) return;

      if (d.mensagens?.length) {
        renderMensagens(d.mensagens, false);
        lastMsgId = d.mensagens[d.mensagens.length - 1].id;
        carregarConversas(searchInput?.value || '');
      }

      atualizarBadgeSidebar(d.total_nao_lidas);
    } catch (e) {}
  }

  // ─── Enviar mensagem ──────────────────────────────────────────────────────────
  async function enviarMensagem() {
    if (!conversaAtiva) return;
    const texto = chatInput.value.trim();
    if (!texto) return;

    sendBtn.disabled = true;
    chatInput.value  = '';
    chatInput.style.height = '';

    const body = new FormData();
    body.append('action', 'enviar');
    body.append('conversa_id', conversaAtiva.id);
    body.append('mensagem', texto);

    try {
      const r = await fetch('api/whats_api.php', { method: 'POST', body });
      const d = await r.json();
      if (d.ok) {
        const fakeMsg = {
          id:       d.id,
          direcao:  'saida',
          tipo:     'texto',
          mensagem: texto,
          hora:     d.hora || '',
          data_fmt: d.data_fmt || '',
          falhou:   !d.enviado,
          erro:     d.erro || '',
        };
        const wrap = criarBolhaWrap(fakeMsg);
        messagesArea.appendChild(wrap);
        if (d.id) lastMsgId = d.id;
        scrollBottom();
        carregarConversas(searchInput?.value || '');
      }
    } catch (e) {}

    sendBtn.disabled = false;
    chatInput.focus();
  }

  // ─── Atalho de chave Pix ────────────────────────────────────────────────────
  function inserirChavePix() {
    if (!conversaAtiva) return;

    const chave = btnPix?.dataset.pixChave || '';
    const nome  = btnPix?.dataset.pixNome  || '';

    if (!chave) {
      alert('Nenhuma chave Pix cadastrada. Configure em Configurações > Formas de pagamento.');
      return;
    }

    const linhas = ['*Chave Pix:*', chave];
    if (nome) linhas.push('', '*Nome:*', nome);
    const texto = linhas.join('\n');

    chatInput.value = chatInput.value ? `${chatInput.value}\n${texto}` : texto;
    autoResize(chatInput);
    chatInput.focus();
  }

  // ─── Modal de confirmação customizado ────────────────────────────────────────
  let confirmCallback = null;

  function confirmarAcao(titulo, mensagem, onConfirm) {
    document.getElementById('wlConfirmTitle').textContent = titulo;
    document.getElementById('wlConfirmMsg').textContent   = mensagem;
    confirmCallback = onConfirm;
    document.getElementById('wlConfirmOverlay').classList.add('open');
  }

  function fecharConfirm() {
    document.getElementById('wlConfirmOverlay').classList.remove('open');
    confirmCallback = null;
  }

  document.getElementById('wlConfirmCancel')?.addEventListener('click', fecharConfirm);
  document.getElementById('wlConfirmOk')?.addEventListener('click', () => {
    const cb = confirmCallback;
    fecharConfirm();
    if (cb) cb();
  });
  document.getElementById('wlConfirmOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('wlConfirmOverlay')) fecharConfirm();
  });

  // ─── Seleção de contatos ──────────────────────────────────────────────────────
  function ativarModoSelContatos() {
    modoSelContatos = true;
    contatosSelecionados.clear();
    contactsPanel.classList.add('wl-sel-mode');
    document.getElementById('wlPanelTitle').style.display = 'none';
    document.getElementById('wlPanelBtns').style.display  = 'none';
    document.getElementById('wlContSelState').classList.add('ativo');
    atualizarBarraSelContatos();
  }

  function cancelarModoSelContatos() {
    modoSelContatos = false;
    contatosSelecionados.clear();
    contactsPanel.classList.remove('wl-sel-mode');
    document.getElementById('wlPanelTitle').style.display = '';
    document.getElementById('wlPanelBtns').style.display  = '';
    document.getElementById('wlContSelState').classList.remove('ativo');
    document.querySelectorAll('.wl-contact-item.wl-selecionado').forEach(el => el.classList.remove('wl-selecionado'));
  }

  function toggleSelecaoContato(id, el) {
    if (contatosSelecionados.has(id)) {
      contatosSelecionados.delete(id);
      el.classList.remove('wl-selecionado');
    } else {
      contatosSelecionados.add(id);
      el.classList.add('wl-selecionado');
    }
    atualizarBarraSelContatos();
  }

  function atualizarBarraSelContatos() {
    const n = contatosSelecionados.size;
    document.getElementById('wlContSelCount').textContent =
      n === 0 ? 'Selecionar conversas' : `${n} selecionada${n !== 1 ? 's' : ''}`;
    document.getElementById('wlContSelDelete').disabled = n === 0;
  }

  function excluirContatosSelecionados() {
    const ids = [...contatosSelecionados];
    if (!ids.length) return;

    const n = ids.length;
    const plural = n !== 1;
    confirmarAcao(
      `Excluir conversa${plural ? 's' : ''}`,
      `Tem certeza que deseja excluir ${n} conversa${plural ? 's' : ''} e todas as suas mensagens? Essa ação não pode ser desfeita.`,
      () => _confirmarExclusaoContatos(ids)
    );
  }

  async function _confirmarExclusaoContatos(ids) {
    const delBtn = document.getElementById('wlContSelDelete');
    delBtn.disabled = true;
    delBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Excluindo...';

    try {
      const r = await fetch('api/whats_api.php?action=excluir_conversas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const d = await r.json();
      if (d.ok) {
        if (conversaAtiva && ids.includes(conversaAtiva.id)) {
          conversaAtiva = null;
          clearInterval(pollTimer);
          chatActive.style.display = 'none';
          emptyState.style.display = '';
        }
        cancelarModoSelContatos();
        await carregarConversas(searchInput?.value || '');
      }
    } catch (e) {}

    delBtn.disabled = false;
    delBtn.innerHTML = '<i class="bi bi-trash3-fill"></i> Excluir';
  }

  // ─── Seleção de mensagens ──────────────────────────────────────────────────────
  function ativarModoSelMsgs() {
    modoSelMsgs = true;
    mensagensSelecionadas.clear();
    messagesArea.classList.add('wl-sel-mode');
    document.getElementById('wlMsgSelBar').classList.add('ativo');
    inputBar.style.display = 'none';
    document.getElementById('wlBtnSelecionarMsgs').style.display = 'none';
    atualizarBarraSelMsgs();
  }

  function cancelarModoSelMsgs() {
    modoSelMsgs = false;
    mensagensSelecionadas.clear();
    messagesArea.classList.remove('wl-sel-mode');
    document.getElementById('wlMsgSelBar').classList.remove('ativo');
    inputBar.style.display = '';
    document.getElementById('wlBtnSelecionarMsgs').style.display = '';
    document.querySelectorAll('.wl-bubble-wrap.wl-selecionado').forEach(el => el.classList.remove('wl-selecionado'));
  }

  function atualizarBarraSelMsgs() {
    const n = mensagensSelecionadas.size;
    document.getElementById('wlMsgSelCount').textContent =
      n === 0 ? 'Selecionar mensagens' : `${n} mensagem${n !== 1 ? 'ns' : ''} selecionada${n !== 1 ? 's' : ''}`;
    document.getElementById('wlMsgSelDelete').disabled = n === 0;
  }

  function excluirMensagensSelecionadas() {
    const ids = [...mensagensSelecionadas];
    if (!ids.length) return;

    const n = ids.length;
    const plural = n !== 1;
    confirmarAcao(
      `Excluir mensagen${plural ? 's' : ''}`,
      `Tem certeza que deseja excluir ${n} mensagem${plural ? 'ns' : ''} selecionada${plural ? 's' : ''}? Essa ação não pode ser desfeita.`,
      () => _confirmarExclusaoMensagens(ids)
    );
  }

  async function _confirmarExclusaoMensagens(ids) {
    const delBtn = document.getElementById('wlMsgSelDelete');
    delBtn.disabled = true;
    delBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>';

    try {
      const r = await fetch('api/whats_api.php?action=excluir_mensagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const d = await r.json();
      if (d.ok) {
        ids.forEach(id => {
          const el = messagesArea.querySelector(`[data-msg-id="${id}"]`);
          if (el) el.remove();
        });
        cancelarModoSelMsgs();
      }
    } catch (e) {}

    delBtn.disabled = false;
    delBtn.innerHTML = '<i class="bi bi-trash3-fill"></i> Excluir';
  }

  // ─── Drawer de pedidos ────────────────────────────────────────────────────────
  function toggleOrdersDrawer() {
    const open = ordersDrawer.classList.toggle('open');
    if (open) renderDrawerPedidos();
  }

  function renderDrawerPedidos() {
    if (!pedidosData.length) {
      drawerBody.innerHTML = '<div class="wl-no-orders">Nenhum pedido encontrado.</div>';
      return;
    }

    const statusMap = {
      pendente: 'Pendente', aceito: 'Aceito', preparando: 'Preparando',
      entrega: 'Em entrega', finalizado: 'Finalizado', cancelado: 'Cancelado',
    };

    drawerBody.innerHTML = pedidosData.map(p => `
      <div class="wl-order-row">
        <div class="wl-order-row-top">
          <span class="wl-order-id">#${p.id}</span>
          <span class="wl-order-val">R$ ${parseFloat(p.total).toFixed(2).replace('.', ',')}</span>
        </div>
        <div style="margin-top:4px;display:flex;align-items:center;justify-content:space-between;">
          <span class="wl-order-date">${p.criado_fmt || ''}</span>
          <span class="wl-status-badge wl-status-${p.status}">${statusMap[p.status] || p.status}</span>
        </div>
      </div>
    `).join('');
  }

  // ─── Badge sidebar ────────────────────────────────────────────────────────────
  function atualizarBadgeSidebar(total) {
    const badge = document.getElementById('wlSidebarBadge');
    if (!badge) return;
    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : total;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // ─── Modal nova conversa ──────────────────────────────────────────────────────
  function abrirModal() {
    modalNumero.value = '';
    modalNome.value   = '';
    modalOverlay.classList.add('open');
    modalNumero.focus();
  }

  function fecharModal() {
    modalOverlay.classList.remove('open');
  }

  async function confirmarNovaConversa() {
    const numero = modalNumero.value.trim();
    const nome   = modalNome.value.trim();
    if (!numero) { modalNumero.focus(); return; }

    const body = new FormData();
    body.append('action', 'nova_conversa');
    body.append('numero', numero);
    body.append('nome', nome);

    try {
      const r = await fetch('api/whats_api.php', { method: 'POST', body });
      const d = await r.json();
      fecharModal();
      if (d.ok) {
        await carregarConversas();
        abrirConversa(d.conversa_id, d.nome || numero, numero);
      }
    } catch (e) { fecharModal(); }
  }

  // ─── Auto-resize textarea ─────────────────────────────────────────────────────
  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  // ─── Bind events ──────────────────────────────────────────────────────────────
  sendBtn?.addEventListener('click', enviarMensagem);
  btnPix?.addEventListener('click', inserirChavePix);

  chatInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
    if (e.key === 'Escape') {
      chatInput.value = '';
      autoResize(chatInput);
    }
  });

  chatInput?.addEventListener('input', () => autoResize(chatInput));

  searchInput?.addEventListener('input', () => carregarConversas(searchInput.value));

  btnNovaConversa?.addEventListener('click', abrirModal);

  document.getElementById('wlModalCancel')?.addEventListener('click', fecharModal);
  document.getElementById('wlModalConfirm')?.addEventListener('click', confirmarNovaConversa);

  modalOverlay?.addEventListener('click', e => { if (e.target === modalOverlay) fecharModal(); });

  modalNumero?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmarNovaConversa(); });

  document.getElementById('wlBtnPedidos')?.addEventListener('click', toggleOrdersDrawer);

  document.getElementById('wlDrawerClose')?.addEventListener('click', () => {
    ordersDrawer.classList.remove('open');
  });

  // Seleção de contatos
  document.getElementById('wlBtnSelecionarContatos')?.addEventListener('click', ativarModoSelContatos);
  document.getElementById('wlContSelCancel')?.addEventListener('click', cancelarModoSelContatos);
  document.getElementById('wlContSelDelete')?.addEventListener('click', excluirContatosSelecionados);

  // Seleção de mensagens
  document.getElementById('wlBtnSelecionarMsgs')?.addEventListener('click', ativarModoSelMsgs);
  document.getElementById('wlMsgSelCancel')?.addEventListener('click', cancelarModoSelMsgs);
  document.getElementById('wlMsgSelDelete')?.addEventListener('click', excluirMensagensSelecionadas);

  // ─── Init ─────────────────────────────────────────────────────────────────────
  carregarConversas();

  setInterval(() => {
    if (!conversaAtiva) carregarConversas(searchInput?.value || '');
  }, 10000);

})();
