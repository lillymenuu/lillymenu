(function () {
  'use strict';

  if (window.PDV_OFFLINE_ENABLED === false) return;

  const QUEUE_KEY = 'pdv_offline_queue_v1';
  const PING_URL = 'api/ping.php';
  const FAIL_THRESHOLD = 2;
  const INTERVAL_ONLINE = 15000;
  const INTERVAL_OFFLINE = 5000;
  const PING_TIMEOUT = 4000;

  const state = {
    online: true,
    consecutiveFails: 0,
    timerId: null,
  };
  let codigoLocalSeq = 0;

  function pdvUuid4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ─── Fila (localStorage) ──────────────────────────────────────────────────
  function queueLoad() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function queueSave(list) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  function queuePendentes() {
    return queueLoad().filter(i => i.status !== 'sincronizado');
  }

  function queueCount() {
    return queuePendentes().length;
  }

  function formDataParaObjeto(formData) {
    const obj = {};
    for (const [key, value] of formData.entries()) {
      obj[key] = value;
    }
    return obj;
  }

  function atualizarItem(uuid, patch) {
    const list = queueLoad();
    const idx = list.findIndex(i => i.offline_uuid === uuid);
    if (idx === -1) return;
    list[idx] = Object.assign({}, list[idx], patch);
    queueSave(list);
    atualizarBadge();
  }

  function removerItem(uuid) {
    queueSave(queueLoad().filter(i => i.offline_uuid !== uuid));
    atualizarBadge();
  }

  // ─── Validação: o que não pode ser vendido offline ─────────────────────────
  function validarPermitidoOffline(dados) {
    const tipo = dados.get('tipo');
    if (tipo === 'entrega') {
      return { ok: false, msg: 'Vendas com entrega exigem conexão para calcular o frete corretamente. Altere para retirada/mesa ou aguarde a internet voltar.' };
    }
    const cupom = (dados.get('cupom') || '').trim();
    if (cupom) {
      return { ok: false, msg: 'Cupons não podem ser aplicados offline. Remova o cupom para continuar.' };
    }
    const cashbackAplicado = dados.get('cashback_aplicado');
    const cashbackUsado = parseFloat(dados.get('cashback_usado') || '0');
    if (cashbackAplicado === '1' || cashbackUsado > 0) {
      return { ok: false, msg: 'Cashback/pontos não podem ser resgatados offline (saldo pode estar desatualizado). Remova o resgate para continuar.' };
    }
    return { ok: true };
  }

  function enfileirar(formData, resumo) {
    const validacao = validarPermitidoOffline(formData);
    if (!validacao.ok) {
      return { ok: false, msg: validacao.msg };
    }

    let uuid = formData.get('offline_uuid');
    if (!uuid) {
      uuid = pdvUuid4();
      formData.set('offline_uuid', uuid);
    }

    codigoLocalSeq += 1;
    const item = {
      offline_uuid: uuid,
      criado_em_local: new Date().toISOString(),
      status: 'pendente',
      erro_msg: null,
      tentativas: 0,
      codigo_local: codigoLocalSeq,
      payload: formDataParaObjeto(formData),
      resumo: resumo || {},
    };

    const list = queueLoad();
    list.push(item);
    if (!queueSave(list)) {
      return { ok: false, salvo: false, msg: 'Não foi possível salvar a venda localmente (armazenamento indisponível). Anote os dados manualmente.' };
    }
    atualizarBadge();
    return { ok: true, item };
  }

  // ─── Heartbeat de conectividade ────────────────────────────────────────────
  function ping() {
    if (!('AbortController' in window)) {
      return fetch(PING_URL, { cache: 'no-store' }).then(r => r.ok).catch(() => false);
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);
    return fetch(PING_URL, { cache: 'no-store', signal: controller.signal })
      .then(r => { clearTimeout(timeoutId); return r.ok; })
      .catch(() => { clearTimeout(timeoutId); return false; });
  }

  function heartbeatTick() {
    ping().then(ok => {
      if (ok) {
        state.consecutiveFails = 0;
        if (!state.online) setOnlineState(true);
      } else {
        state.consecutiveFails += 1;
        if (state.online && state.consecutiveFails >= FAIL_THRESHOLD) setOnlineState(false);
      }
      state.timerId = setTimeout(heartbeatTick, state.online ? INTERVAL_ONLINE : INTERVAL_OFFLINE);
    });
  }

  function forcarOffline() {
    state.consecutiveFails = FAIL_THRESHOLD;
    setOnlineState(false);
  }

  function setOnlineState(isOnline) {
    const mudou = state.online !== isOnline;
    state.online = isOnline;
    renderBanner();
    if (mudou && isOnline && queueCount() > 0) {
      setTimeout(abrirModalSync, 1000);
    }
  }

  function estaOffline() {
    return !state.online;
  }

  // ─── UI: banner + badge ────────────────────────────────────────────────────
  function renderBanner() {
    const banner = document.getElementById('pdvOfflineBanner');
    if (banner) banner.classList.toggle('d-none', state.online);
    aplicarBloqueiosOffline(!state.online);
  }

  function aplicarBloqueiosOffline(offline) {
    const seletores = [
      '#cupomInput', '#cupomAplicar', '#cupomResumoSelect',
      '#cashbackCliente', '#cashbackUsar', '#cashbackResumoAction',
      '[data-bs-target="#modalCliente"]',
    ];
    seletores.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.disabled = offline;
        el.classList.toggle('pdv-offline-locked', offline);
        if (offline) el.setAttribute('title', 'Indisponível em modo offline');
        else el.removeAttribute('title');
      });
    });
    ['#pontosSaldoWrap', '#pontosSaldoModalWrap'].forEach(sel => {
      const wrap = document.querySelector(sel);
      if (!wrap) return;
      wrap.querySelectorAll('input, button, select').forEach(el => { el.disabled = offline; });
    });
  }

  function atualizarBadge() {
    const badge = document.getElementById('pdvOfflineBadge');
    if (!badge) return;
    const n = queueCount();
    badge.querySelector('.pdv-offline-badge-count').textContent = n;
    badge.classList.toggle('d-none', n === 0);
  }

  // ─── Envio ao servidor (reaproveitado no fluxo normal e na sincronização) ──
  function enviarAoServidor(payloadObjOuFormData) {
    const body = payloadObjOuFormData instanceof FormData
      ? payloadObjOuFormData
      : new URLSearchParams(payloadObjOuFormData);
    return fetch('api/pdv_salvar.php', { method: 'POST', body })
      .then(r => r.json());
  }

  // ─── Modal de sincronização ─────────────────────────────────────────────────
  let syncModalInstance = null;
  function obterSyncModal() {
    if (syncModalInstance) return syncModalInstance;
    const el = document.getElementById('modalSyncOffline');
    if (!el || typeof bootstrap === 'undefined') return null;
    syncModalInstance = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
    return syncModalInstance;
  }

  function renderListaSync() {
    const lista = document.getElementById('syncOfflineLista');
    if (!lista) return;
    const itens = queuePendentes();
    if (!itens.length) {
      lista.innerHTML = '<div class="pdv-sync-empty">Nenhuma venda pendente.</div>';
      return;
    }
    lista.innerHTML = itens.map(item => {
      const r = item.resumo || {};
      const statusLabel = {
        pendente: 'Aguardando',
        sincronizando: 'Sincronizando...',
        erro: 'Erro',
      }[item.status] || item.status;
      const statusClasse = item.status === 'erro' ? 'is-erro' : (item.status === 'sincronizando' ? 'is-sync' : '');
      const acoes = item.status === 'erro'
        ? `<button type="button" class="pdv-sync-retry" data-retry="${item.offline_uuid}">Tentar novamente</button>
           <button type="button" class="pdv-sync-discard" data-discard="${item.offline_uuid}">Descartar</button>`
        : '';
      return `
        <div class="pdv-sync-item ${statusClasse}" data-uuid="${item.offline_uuid}">
          <div class="pdv-sync-item-info">
            <div class="pdv-sync-item-cliente">#${item.codigo_local} · ${r.clienteNome || 'Cliente'} · R$ ${(r.total || 0).toFixed(2).replace('.', ',')}</div>
            <div class="pdv-sync-item-status">${statusLabel}${item.erro_msg ? ' — ' + item.erro_msg : ''}</div>
          </div>
          <div class="pdv-sync-item-acoes">${acoes}</div>
        </div>`;
    }).join('');
  }

  function abrirModalSync() {
    if (!queueCount()) return;
    renderListaSync();
    const modal = obterSyncModal();
    if (modal) modal.show();
  }

  async function sincronizarFila() {
    const btn = document.getElementById('syncOfflineBtn');
    if (btn) btn.disabled = true;

    const fila = queuePendentes();
    for (const item of fila) {
      if (item.status === 'erro') continue;
      atualizarItem(item.offline_uuid, { status: 'sincronizando' });
      renderListaSync();
      try {
        const resp = await enviarAoServidor(item.payload);
        if (resp && resp.ok) {
          removerItem(item.offline_uuid);
        } else {
          atualizarItem(item.offline_uuid, { status: 'erro', erro_msg: (resp && resp.msg) || 'Falha ao sincronizar', tentativas: (item.tentativas || 0) + 1 });
        }
      } catch (e) {
        atualizarItem(item.offline_uuid, { status: 'pendente' });
        forcarOffline();
        break;
      }
      renderListaSync();
    }

    if (btn) btn.disabled = false;
    renderListaSync();
    if (typeof window.carregarPedidos === 'function') {
      try { window.carregarPedidos(); } catch (e) {}
    }
  }

  function retentarItem(uuid) {
    atualizarItem(uuid, { status: 'pendente', erro_msg: null });
    sincronizarFila();
  }

  function descartarItem(uuid) {
    if (!confirm('Descartar esta venda offline? Ela não será enviada ao servidor.')) return;
    removerItem(uuid);
    renderListaSync();
  }

  document.addEventListener('click', function (e) {
    const retryBtn = e.target.closest('[data-retry]');
    if (retryBtn) { retentarItem(retryBtn.getAttribute('data-retry')); return; }
    const discardBtn = e.target.closest('[data-discard]');
    if (discardBtn) { descartarItem(discardBtn.getAttribute('data-discard')); return; }
  });

  document.addEventListener('DOMContentLoaded', function () {
    const syncBtn = document.getElementById('syncOfflineBtn');
    if (syncBtn) syncBtn.addEventListener('click', sincronizarFila);

    const badge = document.getElementById('pdvOfflineBadge');
    if (badge) badge.addEventListener('click', abrirModalSync);

    atualizarBadge();
    renderBanner();
    heartbeatTick();
  });

  window.PdvOffline = {
    estaOffline: estaOffline,
    gerarUuid: pdvUuid4,
    enfileirar: enfileirar,
    forcarOffline: forcarOffline,
    abrirModalSync: abrirModalSync,
    contarPendentes: queueCount,
  };
})();
