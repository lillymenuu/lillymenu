(() => {
  const listaEl = document.getElementById('listaImpressoras');
  const listaVaziaEl = document.getElementById('listaImpressorasVazio');
  const modalEditarEl = document.getElementById('modalImpressoraEditar');
  const modalListaEl = document.getElementById('modal-impressao');
  if (!listaEl || !modalEditarEl || typeof impressaoQZ === 'undefined') return;

  const lojaNome = (typeof LOJA_NOME_IMPRESSAO !== 'undefined') ? LOJA_NOME_IMPRESSAO : 'LillyMenu';
  let vinhaDaLista = false;

  /* Garante estado limpo do Bootstrap antes de reabrir um modal — evita o modal
     ficar "preso" (achando que já está aberto) depois de um hide() programático,
     o que faria show() não fazer nada na próxima vez sem um refresh da página.
     Mesmo padrão já usado em gestor_pedidos.js pro mesmo tipo de bug. */
  function reabrirModal(modalEl) {
    if (!modalEl) return null;
    try {
      const instanciaExistente = bootstrap.Modal.getInstance(modalEl);
      if (instanciaExistente) instanciaExistente.dispose();
    } catch (e) {}
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('overflow');
    return new bootstrap.Modal(modalEl);
  }

  // As duas telas (lista e edição) são modais separados do Bootstrap — abrir um em
  // cima do outro sem fechar o de baixo causa problemas de clique (backdrop empilhado).
  // Por isso sempre fechamos a lista antes de abrir a edição, e reabrimos ao voltar.
  modalEditarEl.addEventListener('hidden.bs.modal', () => {
    if (vinhaDaLista && modalListaEl) {
      renderLista();
      reabrirModal(modalListaEl)?.show();
    }
    vinhaDaLista = false;
  });

  const campoId = document.getElementById('impressoraId');
  const campoNome = document.getElementById('impressoraNome');
  const campoSistema = document.getElementById('impressoraSistema');
  const campoErro = document.getElementById('impressoraEditarErro');
  const titulo = document.getElementById('impressoraEditarTitulo');
  const btnApagar = document.getElementById('btnImpressoraApagar');
  const infoTipoImpressao = document.getElementById('impressoraTipoInfo');

  // .settings-error só aparece com a classe "show" (CSS global da página) —
  // sem isso a mensagem fica no DOM mas invisível, parecendo que "nada acontece".
  function mostrarErroImpressora(html) {
    campoErro.innerHTML = html;
    campoErro.classList.add('show');
  }
  function limparErroImpressora() {
    campoErro.innerHTML = '';
    campoErro.classList.remove('show');
  }

  function radioValor(nome) {
    const el = modalEditarEl.querySelector(`input[name="${nome}"]:checked`);
    return el ? el.value : null;
  }
  function setRadioValor(nome, valor) {
    const el = modalEditarEl.querySelector(`input[name="${nome}"][value="${valor}"]`);
    if (el) el.checked = true;
  }

  function atualizarInfoTipoImpressao() {
    const tipo = radioValor('impressoraTipoImpressao');
    infoTipoImpressao.innerHTML = tipo === 'completa'
      ? '<strong>Impressão completa</strong><br>Todos os dados serão impressos: itens, valores, formas de pagamento e dados do cliente.'
      : '<strong>Impressão simples</strong><br>Só os itens do pedido, ideal para cupom de cozinha.';
  }
  modalEditarEl.querySelectorAll('input[name="impressoraTipoImpressao"]').forEach(el => {
    el.addEventListener('change', atualizarInfoTipoImpressao);
  });

  function renderLista() {
    const perfis = impressaoQZ.listarPerfis();
    listaVaziaEl.style.display = perfis.length ? 'none' : '';
    listaEl.querySelectorAll('.impressora-item').forEach(el => el.remove());

    perfis.forEach(perfil => {
      const usoLabel = { cozinha: 'Cozinha', pdv: 'PDV', ambos: 'Cozinha + PDV' }[perfil.usoPara] || perfil.usoPara;
      const div = document.createElement('div');
      div.className = 'impressora-item';
      div.innerHTML = `
        <div class="impressora-item-head">
          <strong>${escapeHtml(perfil.nome)}</strong>
          <span class="impressora-badge">Vinculado a este computador</span>
        </div>
        <div class="impressora-item-info">
          Impressão automática: <strong>${perfil.impressaoAutomatica ? 'Habilitado' : 'Desabilitado'}</strong>
          &nbsp;•&nbsp; Número de cópias: <strong>${perfil.copias}</strong>
          &nbsp;•&nbsp; Tamanho: <strong>${perfil.papel}</strong>
        </div>
        <div class="impressora-item-info">
          Uso: <strong>${usoLabel}</strong>
          &nbsp;•&nbsp; Modo: <strong>${perfil.tipoImpressao === 'completa' ? 'Completa' : 'Simples'}</strong>
        </div>
        <div class="impressora-item-actions">
          <button type="button" class="btn-diggy-ghost" data-acao="apagar">Apagar impressora</button>
          <button type="button" class="btn-diggy-ghost" data-acao="teste">Imprimir teste</button>
          <button type="button" class="btn-diggy-primary" data-acao="editar">Editar</button>
        </div>
      `;
      div.querySelector('[data-acao="editar"]').addEventListener('click', () => abrirModal(perfil));
      div.querySelector('[data-acao="apagar"]').addEventListener('click', () => apagarPerfil(perfil));
      div.querySelector('[data-acao="teste"]').addEventListener('click', () => testarPerfil(perfil));
      listaEl.appendChild(div);
    });
  }

  function escapeHtml(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // A página tem um sistema que troca <select> nativos por um dropdown customizado
  // (buildCustomSelect, em partials/sidebar.php), construído uma vez e nunca
  // reconstruído depois (ele mesmo pula selects com data-custom-built="1"). Como o
  // <select> de impressoras é preenchido DEPOIS (resposta assíncrona do QZ Tray),
  // preciso desfazer a conversão (devolver o <select> pro lugar, remover o wrapper)
  // antes de mandar reconstruir — senão o dropdown visual nunca pega as opções novas.
  function atualizarSelectCustomizado() {
    const wrapper = campoSistema.closest('.custom-select');
    if (wrapper && wrapper.parentElement) {
      wrapper.parentElement.insertBefore(campoSistema, wrapper);
      wrapper.remove();
    }
    campoSistema.style.display = '';
    delete campoSistema.dataset.customBuilt;
    if (typeof window.refreshCustomSelects === 'function') {
      window.refreshCustomSelects(modalEditarEl);
    }
  }

  async function popularImpressorasSistema(selecionada) {
    campoSistema.innerHTML = '<option value="">Conectando ao QZ Tray...</option>';
    limparErroImpressora();
    try {
      const impressoras = await impressaoQZ.listarImpressorasSistema();
      campoSistema.innerHTML = '<option value="">Selecione...</option>' +
        impressoras.map(nome => `<option value="${escapeHtml(nome)}">${escapeHtml(nome)}</option>`).join('');
      if (selecionada) campoSistema.value = selecionada;
      if (!impressoras.length) {
        mostrarErroImpressora('O QZ Tray conectou, mas não encontrou nenhuma impressora instalada neste computador.');
      }
    } catch (e) {
      console.error('Falha ao listar impressoras via QZ Tray:', e);
      campoSistema.innerHTML = '<option value="">Nenhuma impressora encontrada</option>';
      mostrarErroImpressora('Não foi possível conectar ao QZ Tray. Causa mais comum: o certificado do QZ Tray nunca foi aceito neste navegador.<br>' +
        '1) Abra <a href="https://localhost:8181" target="_blank" rel="noopener">https://localhost:8181</a> numa nova aba, aceite o aviso de "conexão não segura/certificado inválido".<br>' +
        '2) Confirme que o ícone do QZ Tray está ativo perto do relógio do Windows.<br>' +
        '3) Volte aqui e clique em "Atualizar lista".<br>' +
        '<span style="color:#94a3b8">Detalhe técnico: ' + escapeHtml((e && e.message) || String(e)) + '</span>');
    }
    atualizarSelectCustomizado();
  }

  function abrirModal(perfil) {
    limparErroImpressora();
    if (perfil) {
      titulo.textContent = 'Editando impressora';
      campoId.value = perfil.id;
      campoNome.value = perfil.nome;
      setRadioValor('impressoraTipo', perfil.tipo || 'nao_fiscal');
      setRadioValor('impressoraUso', perfil.usoPara || 'cozinha');
      setRadioValor('impressoraPapel', perfil.papel || '50mm');
      setRadioValor('impressoraCopias', String(perfil.copias || 1));
      setRadioValor('impressoraTipoImpressao', perfil.tipoImpressao || 'simples');
      document.getElementById('impressoraAutomatica').checked = !!perfil.impressaoAutomatica;
      btnApagar.style.display = '';
      popularImpressorasSistema(perfil.qzPrinterName);
    } else {
      titulo.textContent = 'Adicionando impressora';
      campoId.value = '';
      campoNome.value = '';
      setRadioValor('impressoraTipo', 'nao_fiscal');
      setRadioValor('impressoraUso', 'cozinha');
      setRadioValor('impressoraPapel', '50mm');
      setRadioValor('impressoraCopias', '1');
      setRadioValor('impressoraTipoImpressao', 'simples');
      document.getElementById('impressoraAutomatica').checked = false;
      btnApagar.style.display = 'none';
      popularImpressorasSistema();
    }
    atualizarInfoTipoImpressao();
    if (modalListaEl && modalListaEl.classList.contains('show')) {
      vinhaDaLista = true;
      modalListaEl.addEventListener('hidden.bs.modal', () => reabrirModal(modalEditarEl)?.show(), { once: true });
      bootstrap.Modal.getInstance(modalListaEl)?.hide();
    } else {
      reabrirModal(modalEditarEl)?.show();
    }
  }

  function coletarPerfilDoFormulario() {
    return {
      id: campoId.value || null,
      nome: campoNome.value.trim(),
      qzPrinterName: campoSistema.value,
      tipo: radioValor('impressoraTipo') || 'nao_fiscal',
      usoPara: radioValor('impressoraUso') || 'cozinha',
      papel: radioValor('impressoraPapel') || '50mm',
      copias: parseInt(radioValor('impressoraCopias') || '1', 10),
      tipoImpressao: radioValor('impressoraTipoImpressao') || 'simples',
      impressaoAutomatica: document.getElementById('impressoraAutomatica').checked,
    };
  }

  document.getElementById('btnImpressoraAdicionar')?.addEventListener('click', () => abrirModal(null));
  document.getElementById('btnImpressoraAtualizarLista')?.addEventListener('click', () => popularImpressorasSistema(campoSistema.value));

  document.getElementById('btnImpressoraSalvar')?.addEventListener('click', () => {
    const perfil = coletarPerfilDoFormulario();
    limparErroImpressora();
    if (!perfil.nome) {
      mostrarErroImpressora('Informe um nome para a impressora.');
      return;
    }
    if (!perfil.qzPrinterName) {
      mostrarErroImpressora('Selecione a impressora do sistema.');
      return;
    }
    impressaoQZ.salvarPerfil(perfil);
    renderLista();
    bootstrap.Modal.getInstance(modalEditarEl)?.hide();
    mostrarToast('Impressora salva com sucesso.', true);
  });

  async function apagarPerfil(perfil) {
    if (!confirm(`Apagar a impressora "${perfil.nome}"?`)) return;
    impressaoQZ.excluirPerfil(perfil.id);
    renderLista();
    mostrarToast('Impressora removida.', true);
  }
  document.getElementById('btnImpressoraApagar')?.addEventListener('click', () => {
    const id = campoId.value;
    if (!id) return;
    const perfil = impressaoQZ.listarPerfis().find(p => p.id === id);
    if (!perfil) return;
    if (!confirm(`Apagar a impressora "${perfil.nome}"?`)) return;
    impressaoQZ.excluirPerfil(id);
    renderLista();
    bootstrap.Modal.getInstance(modalEditarEl)?.hide();
    mostrarToast('Impressora removida.', true);
  });

  async function testarPerfil(perfil) {
    try {
      await impressaoQZ.imprimirTeste(perfil, lojaNome);
      mostrarToast('Teste enviado para a impressora.', true);
    } catch (e) {
      mostrarToast('Falha ao imprimir teste: ' + (e.message || e), false);
    }
  }
  document.getElementById('btnImpressoraTeste')?.addEventListener('click', () => {
    const perfil = coletarPerfilDoFormulario();
    if (!perfil.qzPrinterName) {
      mostrarErroImpressora('Selecione a impressora do sistema antes de testar.');
      return;
    }
    testarPerfil(perfil);
  });

  // Dados fictícios pra pré-visualizar o formato do cupom sem precisar de um pedido real.
  function dadosExemploPedido() {
    return {
      pedido: {
        id: 215,
        tipo: 'entrega',
        endereco_entrega: 'Rua das Flores, 123, Apto 4, Bairro Centro, Fortaleza/CE, CEP 60543364',
        criado_em: new Date().toISOString().slice(0, 19).replace('T', ' '),
        subtotal: 13.00,
        taxa_entrega: 3.00,
        total: 15.71,
        nome: 'Sarah',
        telefone: '(85) 99236-9399',
        forma_pagamento: 'pix',
        valor_pago: 15.71,
        troco: 0,
        motoboy_nome: null,
      },
      itens: [
        { produto_nome: 'Bolo Mesclado', quantidade: 1, preco: 13.00, observacoes: '', pontos: 1 },
      ],
      pagamentos: [
        { forma: 'pix', valor: 15.71 },
      ],
      pontos_a_receber: 1,
      pedidos_na_loja: 2,
      cashback_usado: 0.29,
      cashback_ganho: 0.12,
      id_curto: '0215-2bfec8e2',
      loja_nome: lojaNome,
      loja_cnpj: '50.496.490/0001-37',
    };
  }

  const modalPreviewEl = document.getElementById('modalImpressoraPreview');
  const previewConteudo = document.getElementById('impressoraPreviewConteudo');

  function mostrarPreview(html) {
    previewConteudo.innerHTML = html;
    if (modalEditarEl.classList.contains('show')) {
      modalEditarEl.addEventListener('hidden.bs.modal', () => reabrirModal(modalPreviewEl)?.show(), { once: true });
      bootstrap.Modal.getInstance(modalEditarEl)?.hide();
    } else {
      reabrirModal(modalPreviewEl)?.show();
    }
  }

  modalPreviewEl?.addEventListener('hidden.bs.modal', () => {
    reabrirModal(modalEditarEl)?.show();
  });

  document.getElementById('btnImpressoraVisualizar')?.addEventListener('click', () => {
    const perfil = coletarPerfilDoFormulario();
    if (!perfil.papel) perfil.papel = '50mm';
    if (!perfil.tipoImpressao) perfil.tipoImpressao = 'completa';
    const html = impressaoQZ.visualizarPedido(dadosExemploPedido(), perfil, lojaNome);
    mostrarPreview(html);
  });

  document.getElementById('modal-impressao')?.addEventListener('show.bs.modal', renderLista);

  renderLista();
})();
