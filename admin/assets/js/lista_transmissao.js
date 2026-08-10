(function () {
  'use strict';

  const API = 'api/lista_transmissao_api.php';

  const grid = document.getElementById('ltGrid');
  const emptyState = document.getElementById('ltEmpty');
  const btnNova = document.getElementById('ltBtnNova');

  const modalListaEl = document.getElementById('ltModalLista');
  const modalLista = modalListaEl ? new bootstrap.Modal(modalListaEl) : null;
  const modalListaTitulo = document.getElementById('ltModalListaTitulo');
  const formLista = document.getElementById('ltFormLista');
  const inputId = document.getElementById('ltListaId');
  const inputNome = document.getElementById('ltListaNome');
  const buscaCliente = document.getElementById('ltBuscaCliente');
  const clienteLista = document.getElementById('ltClienteLista');
  const selecionadosCount = document.getElementById('ltSelecionadosCount');
  const btnSalvarLista = document.getElementById('ltBtnSalvarLista');

  const modalExcluirEl = document.getElementById('ltModalExcluir');
  const modalExcluir = modalExcluirEl ? new bootstrap.Modal(modalExcluirEl) : null;
  const excluirNomeEl = document.getElementById('ltExcluirNome');
  const btnConfirmarExcluir = document.getElementById('ltBtnConfirmarExcluir');

  const modalEnviarEl = document.getElementById('ltModalEnviar');
  const modalEnviar = modalEnviarEl ? new bootstrap.Modal(modalEnviarEl, { backdrop: 'static', keyboard: false }) : null;
  const enviarNomeEl = document.getElementById('ltEnviarNome');
  const enviarDestinoEl = document.getElementById('ltEnviarDestino');
  const textareaMensagem = document.getElementById('ltMensagem');
  const btnEnviar = document.getElementById('ltBtnEnviar');
  const progressoWrap = document.getElementById('ltProgressoWrap');
  const progressoFill = document.getElementById('ltProgressoFill');
  const progressoTexto = document.getElementById('ltProgressoTexto');

  let clientesElegiveis = null; // cache — carregado uma vez
  let excluirIdAtual = 0;
  let enviarListaAtual = null;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function toast(msg, ok) {
    if (window.finModule && typeof window.finModule.showToast === 'function') {
      window.finModule.showToast(msg, ok !== false);
    }
  }

  function esc(v) {
    return window.finModule && typeof window.finModule.escapeHtml === 'function'
      ? window.finModule.escapeHtml(v)
      : String(v ?? '');
  }

  // ─── Carregar e renderizar listas ──────────────────────────────────────────
  async function carregarListas() {
    const res = await fetch(`${API}?action=listar`);
    const data = await res.json();
    if (!data.ok) return;
    renderizarListas(data.listas || []);
  }

  function renderizarListas(listas) {
    if (!grid) return;
    if (!listas.length) {
      grid.innerHTML = '';
      if (emptyState) emptyState.classList.remove('d-none');
      return;
    }
    if (emptyState) emptyState.classList.add('d-none');
    grid.innerHTML = listas.map(l => `
      <div class="fin-card lt-card" data-id="${l.id}">
        <div class="lt-card-title">
          <div class="lt-card-nome">${esc(l.nome)}</div>
          <div class="lt-card-acoes">
            <button type="button" class="lt-icon-btn" data-acao="editar" title="Editar lista"><i class="bi bi-pencil"></i></button>
            <button type="button" class="lt-icon-btn lt-icon-danger" data-acao="excluir" title="Excluir lista"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
        <span class="fin-badge fin-badge-info"><i class="bi bi-people-fill" style="margin-right:5px;"></i>${l.total_membros} cliente${l.total_membros === 1 ? '' : 's'}</span>
        <div class="lt-card-footer">
          <button type="button" class="fin-btn fin-btn-primary fin-btn-sm" data-acao="enviar" style="width:100%;">
            <i class="bi bi-send-fill"></i> Enviar mensagem
          </button>
        </div>
      </div>
    `).join('');
  }

  grid?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-acao]');
    if (!btn) return;
    const card = btn.closest('.lt-card');
    const id = parseInt(card.dataset.id, 10);
    const nome = card.querySelector('.lt-card-nome').textContent;
    const totalMembros = card.querySelector('.fin-badge').textContent.trim();

    if (btn.dataset.acao === 'editar') abrirModalEditar(id);
    else if (btn.dataset.acao === 'excluir') abrirModalExcluir(id, nome);
    else if (btn.dataset.acao === 'enviar') abrirModalEnviar(id, nome, totalMembros);
  });

  // ─── Modal criar/editar lista ───────────────────────────────────────────────
  async function carregarClientesElegiveis() {
    if (clientesElegiveis) return clientesElegiveis;
    const res = await fetch(`${API}?action=clientes_elegiveis`);
    const data = await res.json();
    clientesElegiveis = data.ok ? (data.clientes || []) : [];
    return clientesElegiveis;
  }

  function renderizarClienteLista(clientes, marcados) {
    if (!clienteLista) return;
    if (!clientes.length) {
      clienteLista.innerHTML = '<div class="lt-cliente-vazio">Nenhum cliente com WhatsApp cadastrado.</div>';
      return;
    }
    const marcadosSet = new Set(marcados || []);
    clienteLista.innerHTML = clientes.map(c => `
      <label class="lt-cliente-item" data-nome="${esc(c.nome).toLowerCase()}" data-tel="${esc(c.telefone).toLowerCase()}">
        <input type="checkbox" value="${c.id}" ${marcadosSet.has(c.id) ? 'checked' : ''}>
        <div class="lt-cliente-info">
          <span class="lt-cliente-nome">${esc(c.nome)}</span>
          <span class="lt-cliente-tel">${esc(c.telefone)}</span>
        </div>
      </label>
    `).join('');
    atualizarContadorSelecionados();
  }

  function atualizarContadorSelecionados() {
    if (!clienteLista || !selecionadosCount) return;
    const n = clienteLista.querySelectorAll('input[type="checkbox"]:checked').length;
    selecionadosCount.textContent = `${n} cliente${n === 1 ? '' : 's'} selecionado${n === 1 ? '' : 's'}`;
  }

  clienteLista?.addEventListener('change', atualizarContadorSelecionados);

  buscaCliente?.addEventListener('input', () => {
    const termo = buscaCliente.value.trim().toLowerCase();
    clienteLista.querySelectorAll('.lt-cliente-item').forEach(item => {
      const bate = !termo || item.dataset.nome.includes(termo) || item.dataset.tel.includes(termo);
      item.style.display = bate ? '' : 'none';
    });
  });

  async function abrirModalNova() {
    if (!modalLista) return;
    formLista.reset();
    inputId.value = '0';
    modalListaTitulo.textContent = 'Nova lista';
    btnSalvarLista.textContent = 'Salvar lista';
    if (buscaCliente) buscaCliente.value = '';
    const clientes = await carregarClientesElegiveis();
    renderizarClienteLista(clientes, []);
    modalLista.show();
  }

  async function abrirModalEditar(id) {
    if (!modalLista) return;
    const res = await fetch(`${API}?action=detalhe&id=${id}`);
    const data = await res.json();
    if (!data.ok) {
      toast(data.msg || 'Não foi possível carregar a lista.', false);
      return;
    }
    formLista.reset();
    inputId.value = data.lista.id;
    inputNome.value = data.lista.nome;
    modalListaTitulo.textContent = 'Editar lista';
    btnSalvarLista.textContent = 'Salvar alterações';
    if (buscaCliente) buscaCliente.value = '';
    const clientes = await carregarClientesElegiveis();
    renderizarClienteLista(clientes, data.membros || []);
    modalLista.show();
  }

  btnNova?.addEventListener('click', abrirModalNova);

  formLista?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = inputNome.value.trim();
    if (!nome) {
      toast('Informe o nome da lista.', false);
      return;
    }
    const marcados = Array.from(clienteLista.querySelectorAll('input[type="checkbox"]:checked')).map(el => parseInt(el.value, 10));

    btnSalvarLista.disabled = true;
    try {
      const body = new URLSearchParams({
        action: 'salvar',
        id: inputId.value,
        nome: nome,
        clientes: JSON.stringify(marcados),
      });
      const res = await fetch(API, { method: 'POST', body });
      const data = await res.json();
      if (data.ok) {
        modalLista.hide();
        toast('Lista salva com sucesso.', true);
        carregarListas();
      } else {
        toast(data.msg || 'Erro ao salvar a lista.', false);
      }
    } catch (err) {
      toast('Erro de conexão ao salvar a lista.', false);
    } finally {
      btnSalvarLista.disabled = false;
    }
  });

  // ─── Excluir lista ──────────────────────────────────────────────────────────
  function abrirModalExcluir(id, nome) {
    if (!modalExcluir) return;
    excluirIdAtual = id;
    if (excluirNomeEl) excluirNomeEl.textContent = nome;
    modalExcluir.show();
  }

  btnConfirmarExcluir?.addEventListener('click', async () => {
    if (!excluirIdAtual) return;
    btnConfirmarExcluir.disabled = true;
    try {
      const body = new URLSearchParams({ action: 'excluir', id: excluirIdAtual });
      const res = await fetch(API, { method: 'POST', body });
      const data = await res.json();
      modalExcluir.hide();
      if (data.ok) {
        toast('Lista excluída.', true);
        carregarListas();
      } else {
        toast(data.msg || 'Erro ao excluir a lista.', false);
      }
    } finally {
      btnConfirmarExcluir.disabled = false;
    }
  });

  // ─── Enviar mensagem ────────────────────────────────────────────────────────
  function abrirModalEnviar(id, nome, totalMembrosTexto) {
    if (!modalEnviar) return;
    enviarListaAtual = id;
    if (enviarNomeEl) enviarNomeEl.textContent = nome;
    if (enviarDestinoEl) enviarDestinoEl.innerHTML = `Será enviado para <strong>${esc(totalMembrosTexto)}</strong> desta lista.`;
    if (textareaMensagem) textareaMensagem.value = '';
    if (progressoWrap) progressoWrap.classList.remove('is-active');
    if (progressoFill) progressoFill.style.width = '0%';
    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.innerHTML = '<i class="bi bi-send-fill"></i> Enviar';
    }
    modalEnviar.show();
  }

  function atualizarProgresso(atual, total, nomeAtual) {
    if (!progressoFill || !progressoTexto) return;
    const pct = total ? Math.round((atual / total) * 100) : 0;
    progressoFill.style.width = `${pct}%`;
    progressoTexto.textContent = nomeAtual
      ? `Enviando ${atual} de ${total}... (${nomeAtual})`
      : `${atual} de ${total} processado(s)`;
  }

  btnEnviar?.addEventListener('click', async () => {
    const mensagem = textareaMensagem.value.trim();
    if (!mensagem) {
      toast('Escreva uma mensagem antes de enviar.', false);
      return;
    }
    if (!enviarListaAtual) return;

    btnEnviar.disabled = true;
    btnEnviar.innerHTML = '<i class="bi bi-hourglass-split"></i> Enviando...';

    try {
      const bodyIniciar = new URLSearchParams({ action: 'envio_iniciar', lista_id: enviarListaAtual, mensagem });
      const resIniciar = await fetch(API, { method: 'POST', body: bodyIniciar });
      const dataIniciar = await resIniciar.json();

      if (!dataIniciar.ok) {
        toast(dataIniciar.msg || 'Não foi possível iniciar o envio.', false);
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = '<i class="bi bi-send-fill"></i> Enviar';
        return;
      }

      const { envio_id, destinatarios } = dataIniciar;
      if (progressoWrap) progressoWrap.classList.add('is-active');

      let enviados = 0;
      let falhas = 0;
      atualizarProgresso(0, destinatarios.length);

      for (const dest of destinatarios) {
        try {
          const bodyItem = new URLSearchParams({ action: 'envio_item', envio_id, cliente_id: dest.cliente_id });
          const resItem = await fetch(API, { method: 'POST', body: bodyItem });
          const dataItem = await resItem.json();
          if (dataItem.ok && dataItem.enviado) enviados++; else falhas++;
        } catch (e) {
          falhas++;
        }
        atualizarProgresso(enviados + falhas, destinatarios.length, dest.nome);
        await sleep(800);
      }

      const bodyFinalizar = new URLSearchParams({ action: 'envio_finalizar', envio_id });
      await fetch(API, { method: 'POST', body: bodyFinalizar });

      const resumoMsg = falhas
        ? `Envio concluído: ${enviados} enviada(s), ${falhas} falharam.`
        : `Mensagem enviada com sucesso para ${enviados} cliente${enviados === 1 ? '' : 's'}!`;
      toast(resumoMsg, falhas === 0);
      modalEnviar.hide();
    } catch (err) {
      toast('Erro de conexão durante o envio.', false);
    } finally {
      btnEnviar.disabled = false;
      btnEnviar.innerHTML = '<i class="bi bi-send-fill"></i> Enviar';
    }
  });

  carregarListas();
})();
