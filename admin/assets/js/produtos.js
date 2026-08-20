function formatarDinheiroInput(valor){
  const numero = Number(valor || 0);
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseDinheiroInput(valor){
  const texto = String(valor || '').trim();
  if (!texto) return 0;
  const normalizado = texto.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function aplicarMascaraDinheiroInput(campo){
  if (!campo) return;
  const digitos = String(campo.value || '').replace(/\D/g, '');
  const numero = digitos ? (Number(digitos) / 100) : 0;
  campo.value = numero
    ? numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
}

function atualizarPontosUi(){
  if (!produtoPontosGanho || !produtoPontosCusto) return;
  const ganhoAtivo = pontosGanhoAtivo ? pontosGanhoAtivo.checked : false;
  const custoAtivo = pontosCustoAtivo ? pontosCustoAtivo.checked : false;
  produtoPontosGanho.disabled = !clubePontosAtivo || !ganhoAtivo;
  produtoPontosCusto.disabled = !clubePontosAtivo || !custoAtivo;
  if (!ganhoAtivo) produtoPontosGanho.value = '';
  if (!custoAtivo) produtoPontosCusto.value = '';
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  modalProduto = new bootstrap.Modal(
    document.getElementById('modalProduto')
  );
  if (modalProdutoImagemEl) {
    modalProdutoImagem = new bootstrap.Modal(modalProdutoImagemEl);
    modalProdutoImagemEl.addEventListener('shown.bs.modal', () => {
      if (produtoCropImg && produtoCropImg.complete) {
        setTimeout(ajustarCropInicial, 30);
      }
    });
    modalProdutoImagemEl.addEventListener('hidden.bs.modal', () => {
      if (produtoCropImg) produtoCropImg.src = '';
      cropState.dragging = false;
      if (retomarModalProduto && modalProduto) {
        modalProduto.show();
        retomarModalProduto = false;
      }
    });
  }

  if (pontosGanhoAtivo) pontosGanhoAtivo.addEventListener('change', atualizarPontosUi);
  if (pontosCustoAtivo) pontosCustoAtivo.addEventListener('change', atualizarPontosUi);
  atualizarPontosUi();
  if (produtoPreco) produtoPreco.addEventListener('input', () => aplicarMascaraDinheiroInput(produtoPreco));
  if (produtoPrecoPromo) produtoPrecoPromo.addEventListener('input', () => aplicarMascaraDinheiroInput(produtoPrecoPromo));
  const modalCategoriaEl = document.getElementById('modalCategoria');
  if (modalCategoriaEl) {
    modalCategoria = new bootstrap.Modal(modalCategoriaEl);
  }
  const modalReordenarEl = document.getElementById('modalReordenarCategorias');
  if (modalReordenarEl) {
    modalReordenar = new bootstrap.Modal(modalReordenarEl);
  }
  const modalReordenarItensEl = document.getElementById('modalReordenarItens');
  if (modalReordenarItensEl) {
    modalReordenarItens = new bootstrap.Modal(modalReordenarItensEl);
  }
  const modalEstoqueEl = document.getElementById('modalEstoque');
  if (modalEstoqueEl) {
    modalEstoque = new bootstrap.Modal(modalEstoqueEl);
    // Bootstrap nao incrementa z-index sozinho pra modais empilhados: sem isso, o
    // backdrop deste modal fica no mesmo nivel do modalProduto por tras E do proprio
    // modalEstoque, bloqueando cliques nele mesmo (mesmo padrao usado no combo wizard,
    // ex.: modalCriandoPasso, pra abrir um modal por cima de outro ja aberto).
    modalEstoqueEl.addEventListener('shown.bs.modal', () => {
      modalEstoqueEl.style.zIndex = '1070';
      const bds = document.querySelectorAll('.modal-backdrop');
      if (bds.length > 0) bds[bds.length - 1].style.zIndex = '1065';
    });
  }
  const modalVincularEstoqueEl = document.getElementById('modalVincularEstoque');
  if (modalVincularEstoqueEl) {
    modalVincularEstoque = new bootstrap.Modal(modalVincularEstoqueEl);
    // Abre por cima do modalEstoque (ja empilhado sobre o modalProduto) — precisa
    // ficar num nivel ainda mais alto, mesmo padrao do modalSelecionarOpcoes (combo).
    modalVincularEstoqueEl.addEventListener('shown.bs.modal', () => {
      modalVincularEstoqueEl.style.zIndex = '1085';
      const bds = document.querySelectorAll('.modal-backdrop');
      if (bds.length > 0) bds[bds.length - 1].style.zIndex = '1080';
    });
  }
  const btnVincularEstoqueEl = document.getElementById('btnVincularEstoque');
  if (btnVincularEstoqueEl) {
    btnVincularEstoqueEl.addEventListener('click', _estVinculoAbrir);
  }
  const estVinculoSearchEl = document.getElementById('estVinculoSearch');
  if (estVinculoSearchEl) {
    estVinculoSearchEl.addEventListener('input', _estVinculoFiltrar);
  }

  if (produtoImagemCard && produtoImagemInput) {
    produtoImagemCard.addEventListener('click', () => {
      produtoImagemInput.click();
    });
  }
  if (produtoImagemRemoveBtn) {
    produtoImagemRemoveBtn.addEventListener('click', event => {
      event.stopPropagation();
      if (produtoImagemBase64) produtoImagemBase64.value = '';
      if (produtoImagemRemover) produtoImagemRemover.value = '1';
      atualizarPreviewImagem('');
    });
  }
  if (produtoImagemInput) {
    produtoImagemInput.addEventListener('change', () => {
      const file = produtoImagemInput.files && produtoImagemInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        abrirCropModal(String(e.target.result || ''));
      };
      reader.readAsDataURL(file);
      produtoImagemInput.value = '';
    });
  }
  if (produtoVariacoes && produtoVariacoesPanel) {
    const atualizarVariacoesUI = () => {
      const habilitado = produtoVariacoes.checked;
      produtoVariacoesPanel.classList.toggle('d-none', !habilitado);
      // "Escolha seu extra" e "Escolha o tipo" ficam junto do mesmo switch de
      // variacoes, ocultos por padrao ate o produto ser marcado como "possui
      // diferentes precos, tamanhos ou cores".
      if (produtoExtrasPanel) produtoExtrasPanel.classList.toggle('d-none', !habilitado);
      if (produtoComplementoPrecoPanel) produtoComplementoPrecoPanel.classList.toggle('d-none', !habilitado);
    };
    produtoVariacoes.addEventListener('change', atualizarVariacoesUI);
    atualizarVariacoesUI();
  }
  if (modalVariacoesProdutoEl) {
    modalVariacoesProduto = new bootstrap.Modal(modalVariacoesProdutoEl);
    modalVariacoesProdutoEl.addEventListener('shown.bs.modal', () => {
      variacoesModalAberto = true;
    });
    modalVariacoesProdutoEl.addEventListener('hidden.bs.modal', () => {
      if (!variacoesModalLista) return;
      const coletadas = coletarVariacoesModal();
      if (coletadas.length || !variacoesAtual.length) {
        variacoesAtual = coletadas;
        atualizarResumoVariacoes();
      }
      variacoesModalAberto = false;
    });
  }
  if (modalExtrasProdutoEl) {
    modalExtrasProduto = new bootstrap.Modal(modalExtrasProdutoEl);
    modalExtrasProdutoEl.addEventListener('shown.bs.modal', () => {
      extrasModalAberto = true;
    });
    modalExtrasProdutoEl.addEventListener('hidden.bs.modal', () => {
      if (!extrasModalLista) return;
      extrasAtual = coletarExtrasModal();
      atualizarResumoExtras();
      extrasModalAberto = false;
    });
  }
  if (modalComplementosPrecoEl) {
    modalComplementosPreco = new bootstrap.Modal(modalComplementosPrecoEl);
    modalComplementosPrecoEl.addEventListener('hidden.bs.modal', () => {
      if (!complementoPrecoModalLista) return;
      complementosPrecoAtual = coletarComplementoPrecoModal();
      _atualizarResumoComplementoPreco();
    });
  }
  if (modalVariacoesProdutoEl) modalVariacoesProdutoEl.addEventListener('shown.bs.modal', _escurecerBackdropAninhado);
  if (modalExtrasProdutoEl) modalExtrasProdutoEl.addEventListener('shown.bs.modal', _escurecerBackdropAninhado);
  if (modalComplementosPrecoEl) modalComplementosPrecoEl.addEventListener('shown.bs.modal', _escurecerBackdropAninhado);
  if (btnGerenciarVariacoes) {
    btnGerenciarVariacoes.addEventListener('click', () => {
      renderVariacoesModalProduto();
      if (modalVariacoesProduto) modalVariacoesProduto.show();
    });
  }
  if (btnGerenciarExtras) {
    btnGerenciarExtras.addEventListener('click', () => {
      renderExtrasModalProduto();
      if (modalExtrasProduto) modalExtrasProduto.show();
    });
  }
  if (btnGerenciarComplementoPreco) {
    btnGerenciarComplementoPreco.addEventListener('click', () => {
      renderComplementoPrecoModalProduto();
      if (modalComplementosPreco) modalComplementosPreco.show();
    });
  }
  if (btnAddComplementoPrecoModal) {
    btnAddComplementoPrecoModal.addEventListener('click', () => {
      complementosPrecoAtual.push({ nome: '', preco: '', obrigatorio: 0 });
      renderComplementoPrecoModalProduto();
    });
  }
  if (btnSalvarComplementoPreco) {
    btnSalvarComplementoPreco.addEventListener('click', () => {
      const coletados = coletarComplementoPrecoModal();
      if (coletados.length && !coletados.some(v => v.obrigatorio)) {
        toast('Marque pelo menos um tipo como obrigatorio.');
        return;
      }
      complementosPrecoAtual = coletados;
      _atualizarResumoComplementoPreco();
      if (modalComplementosPreco) modalComplementosPreco.hide();
      toast('Tipos atualizados.');
    });
  }
  if (complementoPrecoModalLista) {
    complementoPrecoModalLista.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-complemento-preco-remove]');
      if (!btn) return;
      const row = btn.closest('.produto-variacao-row[data-complemento-preco]');
      if (!row) return;
      const idx = parseInt(row.dataset.complementoPreco, 10);
      if (!Number.isNaN(idx)) {
        complementosPrecoAtual = coletarComplementoPrecoModal();
        complementosPrecoAtual.splice(idx, 1);
        renderComplementoPrecoModalProduto();
      }
    });
  }
  if (btnAddVariacaoModal) {
    btnAddVariacaoModal.addEventListener('click', () => {
      variacoesAtual.push({ tamanho: '', cor: '', preco: '' });
      renderVariacoesModalProduto();
    });
  }
  if (btnAddExtraModal) {
    btnAddExtraModal.addEventListener('click', () => {
      extrasAtual.push({ nome: '', preco: '', obrigatorio: 0 });
      renderExtrasModalProduto();
    });
  }
  if (btnSalvarVariacoes) {
    btnSalvarVariacoes.addEventListener('click', () => {
      variacoesAtual = coletarVariacoesModal();
      atualizarResumoVariacoes();
      if (modalVariacoesProduto) modalVariacoesProduto.hide();
      toast('Variacoes atualizadas.');
    });
  }
  if (btnSalvarExtras) {
    btnSalvarExtras.addEventListener('click', () => {
      extrasAtual = coletarExtrasModal();
      atualizarResumoExtras();
      if (modalExtrasProduto) modalExtrasProduto.hide();
    });
  }
  if (variacoesModalLista) {
    variacoesModalLista.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-variacao-remove]');
      if (!btn) return;
      const row = btn.closest('.produto-variacao-row[data-variacao]');
      if (!row) return;
      const idx = parseInt(row.dataset.variacao, 10);
      if (!Number.isNaN(idx)) {
        variacoesAtual = coletarVariacoesModal();
        variacoesAtual.splice(idx, 1);
        renderVariacoesModalProduto();
      }
    });
  }
  if (extrasModalLista) {
    extrasModalLista.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-extra-remove]');
      if (!btn) return;
      const row = btn.closest('.produto-variacao-row[data-extra]');
      if (!row) return;
      const idx = parseInt(row.dataset.extra, 10);
      if (!Number.isNaN(idx)) {
        extrasAtual = coletarExtrasModal();
        extrasAtual.splice(idx, 1);
        renderExtrasModalProduto();
      }
    });
  }
  if (produtoCropZoom) {
    produtoCropZoom.addEventListener('input', () => {
      definirZoomCrop(parseFloat(produtoCropZoom.value));
    });
  }
  if (produtoCropSalvar) {
    produtoCropSalvar.addEventListener('click', confirmarCropImagem);
  }
  if (produtoCropFrame) {
    produtoCropFrame.addEventListener('pointerdown', e => {
      e.preventDefault();
      cropState.dragging = true;
      cropState.startX = e.clientX - cropState.x;
      cropState.startY = e.clientY - cropState.y;
      produtoCropFrame.setPointerCapture(e.pointerId);
    });
    produtoCropFrame.addEventListener('pointermove', e => {
      if (!cropState.dragging) return;
      cropState.x = e.clientX - cropState.startX;
      cropState.y = e.clientY - cropState.startY;
      limitarCrop();
      aplicarCropTransform();
    });
    produtoCropFrame.addEventListener('pointerup', e => {
      cropState.dragging = false;
      produtoCropFrame.releasePointerCapture(e.pointerId);
    });
    produtoCropFrame.addEventListener('pointercancel', () => {
      cropState.dragging = false;
    });
    produtoCropFrame.addEventListener('wheel', e => {
      e.preventDefault();
      if (!produtoCropZoom) return;
      const atual = parseFloat(produtoCropZoom.value) || 1;
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const novo = Math.min(3, Math.max(1, atual + delta));
      produtoCropZoom.value = String(novo);
      definirZoomCrop(novo);
    }, { passive: false });
  }

  if (buscaProduto) {
    buscaProduto.addEventListener('keyup', filtrarProdutos);
  }
  if (filtroPromo) {
    filtroPromo.addEventListener('change', filtrarProdutos);
  }

  if (modoCards.length) {
    modoCards.forEach(card => {
      card.addEventListener('click', () => {
        selecionarModoCategoria(card.dataset.value);
      });
    });
  }

  if (ordenarLista) {
    iniciarReordenacaoCategorias();
  }

  if (produtoToggles.length) {
    produtoToggles.forEach(toggle => {
      toggle.addEventListener('change', () => atualizarDisponibilidadeProduto(toggle));
    });
  }

  if (comboToggles.length) {
    comboToggles.forEach(toggle => {
      toggle.addEventListener('change', () => atualizarDisponibilidadeCombo(toggle));
    });
  }

  if (categoriaToggles.length) {
    categoriaToggles.forEach(toggle => {
      toggle.addEventListener('change', () => atualizarDisponibilidadeCategoria(toggle));
    });
  }

  if (produtoPromoDesativado) {
    produtoPromoDesativado.addEventListener('change', atualizarPromo);
    atualizarPromo();
  }

  if (produtoQtdMinimaAtivo) {
    produtoQtdMinimaAtivo.addEventListener('change', function() {
      if (produtoQtdMinimaField) produtoQtdMinimaField.classList.toggle('d-none', !this.checked);
      if (!this.checked && produtoQtdMinima) produtoQtdMinima.value = 0;
      else if (this.checked && produtoQtdMinima && Number(produtoQtdMinima.value) < 1) produtoQtdMinima.value = 1;
    });
  }

  if (produtoNome) {
    produtoNome.addEventListener('input', atualizarNomeEstoque);
  }

  // Atualiza os numeros de estoque dos cards sozinho — sem isso, uma venda
  // feita no PDV ou na loja publica enquanto essa tela fica aberta so
  // aparecia depois de um F5 manual.
  setInterval(atualizarEstoqueCardsPoll, 12000);
});

function atualizarEstoqueCardsPoll(){
  fetch('api/estoque_list.php')
    .then(r => r.json())
    .then(lista => {
      if (!Array.isArray(lista)) return;
      lista.forEach(item => {
        const card = document.querySelector(`.produto-card[data-id="${item.id}"]`);
        if (!card) return;
        const info = card.querySelector('.produto-estoque-info');
        if (!info) return;
        const qtd = parseInt(item.quantidade, 10) || 0;
        info.classList.toggle('is-ok', qtd > 0);
        info.innerHTML = `<i class="bi bi-box-seam"></i>${qtd} em estoque`;
      });
    })
    .catch(() => {});
}

/* ===== UX ===== */
function toast(msg){
  const t = document.createElement('div');
  t.className = 'toast-custom';
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function toastSucessoTopo(msg){
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

function parseNumero(valor){
  const texto = String(valor ?? '').replace(',', '.').trim();
  const numero = parseFloat(texto);
  return Number.isFinite(numero) ? numero : 0;
}

function formatarMoeda(valor){
  const numero = Number.isFinite(valor) ? valor : parseNumero(valor);
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(valor){
  const div = document.createElement('div');
  div.textContent = String(valor ?? '');
  return div.innerHTML;
}

function renderThumbHtml(imagem){
  const url = String(imagem ?? '').trim();
  return url ? `<img src="${escapeHtml(url)}" alt="">` : '<i class="bi bi-image"></i>';
}

function atualizarPreviewImagem(url){
  if (!produtoImagemPreview || !produtoImagemIcon) return;
  if (url) {
    produtoImagemPreview.src = url;
    produtoImagemPreview.classList.remove('d-none');
    produtoImagemIcon.classList.add('d-none');
    if (produtoImagemRemoveBtn) produtoImagemRemoveBtn.disabled = false;
  } else {
    produtoImagemPreview.src = '';
    produtoImagemPreview.classList.add('d-none');
    produtoImagemIcon.classList.remove('d-none');
    if (produtoImagemRemoveBtn) produtoImagemRemoveBtn.disabled = true;
  }
}

function limparImagemProduto(){
  if (produtoImagemBase64) produtoImagemBase64.value = '';
  if (produtoImagemRemover) produtoImagemRemover.value = '0';
  atualizarPreviewImagem('');
}

const cropState = {
  baseScale: 1,
  scale: 1,
  x: 0,
  y: 0,
  naturalW: 0,
  naturalH: 0,
  frameW: 0,
  frameH: 0,
  dragging: false,
  startX: 0,
  startY: 0
};

function aplicarCropTransform(){
  if (!produtoCropImg) return;
  produtoCropImg.style.transform = `translate(${cropState.x}px, ${cropState.y}px) scale(${cropState.scale})`;
}

function limitarCrop(){
  const imgW = cropState.naturalW * cropState.scale;
  const imgH = cropState.naturalH * cropState.scale;
  if (imgW <= cropState.frameW) {
    cropState.x = (cropState.frameW - imgW) / 2;
  } else {
    const minX = cropState.frameW - imgW;
    cropState.x = Math.min(0, Math.max(minX, cropState.x));
  }
  if (imgH <= cropState.frameH) {
    cropState.y = (cropState.frameH - imgH) / 2;
  } else {
    const minY = cropState.frameH - imgH;
    cropState.y = Math.min(0, Math.max(minY, cropState.y));
  }
}

function ajustarCropInicial(){
  if (!produtoCropFrame || !produtoCropImg) return;
  const rect = produtoCropFrame.getBoundingClientRect();
  cropState.frameW = rect.width || 320;
  cropState.frameH = rect.height || 320;
  cropState.naturalW = produtoCropImg.naturalWidth || rect.width;
  cropState.naturalH = produtoCropImg.naturalHeight || rect.height;
  cropState.baseScale = Math.max(cropState.frameW / cropState.naturalW, cropState.frameH / cropState.naturalH);
  cropState.scale = cropState.baseScale;
  cropState.x = (cropState.frameW - cropState.naturalW * cropState.scale) / 2;
  cropState.y = (cropState.frameH - cropState.naturalH * cropState.scale) / 2;
  if (produtoCropZoom) {
    produtoCropZoom.value = '1';
  }
  aplicarCropTransform();
}

function definirZoomCrop(zoom){
  const valor = Number.isFinite(zoom) ? zoom : 1;
  cropState.scale = cropState.baseScale * valor;
  limitarCrop();
  aplicarCropTransform();
}

function abrirCropModal(dataUrl){
  if (!produtoCropImg || !modalProdutoImagem) {
    if (produtoImagemBase64) produtoImagemBase64.value = dataUrl;
    if (produtoImagemRemover) produtoImagemRemover.value = '0';
    atualizarPreviewImagem(dataUrl);
    return;
  }
  if (modalProdutoEl && modalProdutoEl.classList.contains('show') && modalProduto) {
    retomarModalProduto = true;
    modalProduto.hide();
  } else {
    retomarModalProduto = false;
  }
  produtoCropImg.src = dataUrl;
  produtoCropImg.onload = () => {
    setTimeout(ajustarCropInicial, 50);
  };
  modalProdutoImagem.show();
}

function confirmarCropImagem(){
  if (!produtoCropImg || !produtoCropFrame || !produtoImagemBase64) return;
  const canvas = document.createElement('canvas');
  const tamanho = 800;
  canvas.width = tamanho;
  canvas.height = tamanho;
  const ctx = canvas.getContext('2d');
  const sx = -cropState.x / cropState.scale;
  const sy = -cropState.y / cropState.scale;
  const sw = cropState.frameW / cropState.scale;
  const sh = cropState.frameH / cropState.scale;
  ctx.drawImage(produtoCropImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  produtoImagemBase64.value = dataUrl;
  if (produtoImagemRemover) produtoImagemRemover.value = '0';
  atualizarPreviewImagem(dataUrl);
  if (modalProdutoImagem) modalProdutoImagem.hide();
}

function atualizarEstadoCategoria(bloco){
  if (!bloco) return;
  const grid = bloco.querySelector('.produtos-grid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.produto-card');
  let vazio = grid.querySelector('.produtos-vazio');
  if (cards.length === 0) {
    if (!vazio) {
      vazio = document.createElement('div');
      vazio.className = 'produtos-vazio';
      vazio.textContent = 'Nenhum produto nesta categoria.';
      grid.appendChild(vazio);
    }
    vazio.style.display = '';
  } else if (vazio) {
    vazio.style.display = 'none';
  }
}

function criarBlocoSemCategoria(){
  const conteudo = document.getElementById('produtosConteudo');
  if (!conteudo) return null;
  let bloco = document.querySelector('.categoria-bloco[data-categoria-id="sem"]');
  if (bloco) return bloco;

  bloco = document.createElement('section');
  bloco.className = 'categoria-bloco';
  bloco.dataset.categoriaId = 'sem';
  bloco.innerHTML = `
    <div class="categoria-head">
      <div class="categoria-left">
        <h2 class="categoria-title">Sem categoria</h2>
      </div>
      <div class="categoria-actions">
        <button class="btn btn-diggy-primary btn-sm" type="button" onclick="abrirModalProduto('')">
          <i class="bi bi-plus-circle me-1"></i>
          Adicionar produto
        </button>
      </div>
    </div>
    <div class="produtos-grid">
      <div class="produtos-vazio">Nenhum produto nesta categoria.</div>
    </div>
  `;
  conteudo.appendChild(bloco);
  const vazioGeral = document.querySelector('.produtos-empty');
  if (vazioGeral) vazioGeral.style.display = 'none';
  return bloco;
}

function _produtoVencido(dataValidade){
  if (!dataValidade) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return String(dataValidade) < hoje;
}

function atualizarCardProduto(dados){
  const id = dados.id;
  if (!id) return false;
  const card = document.querySelector(`.produto-card[data-id="${id}"]`);
  if (!card) return false;

  const nome = dados.nome || '';
  const preco = parseNumero(dados.preco);
  const precoPromo = parseNumero(dados.preco_promocional);
  const promoAtiva = dados.promo_ativa && precoPromo > 0;
  const ativo = dados.ativo === 1 || dados.ativo === true;

  if (Object.prototype.hasOwnProperty.call(dados, 'data_validade')) {
    card.dataset.validade = dados.data_validade || '';
    card.classList.toggle('produto-vencido', _produtoVencido(dados.data_validade));
  }

  card.dataset.nome = nome.toLowerCase();
  const nomeEl = card.querySelector('.produto-nome');
  if (nomeEl) nomeEl.textContent = nome;

  if (Object.prototype.hasOwnProperty.call(dados, 'imagem')) {
    const thumb = card.querySelector('.produto-thumb');
    if (thumb) {
      thumb.innerHTML = renderThumbHtml(dados.imagem);
    }
  }

  const statusDot = card.querySelector('.status-dot');
  const statusText = card.querySelector('.produto-status-text');
  const toggle = card.querySelector('.produto-toggle');
  if (statusDot) statusDot.classList.toggle('inativo', !ativo);
  if (statusText) statusText.textContent = ativo ? 'Ativo' : 'Inativo';
  if (toggle) toggle.checked = ativo;

  let badge = card.querySelector('.produto-badge-promo');
  if (promoAtiva) {
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'produto-badge-promo';
      badge.textContent = 'Promo';
      const status = card.querySelector('.produto-status');
      if (status) {
        status.before(badge);
      } else {
        card.appendChild(badge);
      }
    }
  } else if (badge) {
    badge.remove();
  }

  const pontosGanho = Number(dados.pontos_ganho || 0);
  const pontosCusto = Number(dados.pontos_custo || 0);
  let pontosEl = card.querySelector('.produto-pontos');
  if (pontosGanho > 0 || pontosCusto > 0) {
    if (!pontosEl) {
      pontosEl = document.createElement('div');
      pontosEl.className = 'produto-pontos';
    }
    pontosEl.innerHTML = `
      ${pontosGanho > 0 ? `<span class="produto-pontos-badge recompensa"><i class="bi bi-gift"></i> Recompensa ${pontosGanho} pts</span>` : ''}
      ${pontosCusto > 0 ? `<span class="produto-pontos-badge custo"><i class="bi bi-lightning-charge"></i> Custo: ${pontosCusto} pts</span>` : ''}
    `;
    const precoTarget = card.querySelector('.produto-preco-wrap') || card.querySelector('.produto-preco');
    if (precoTarget && pontosEl.previousSibling !== precoTarget) {
      precoTarget.after(pontosEl);
    } else if (!precoTarget && !pontosEl.parentElement) {
      card.appendChild(pontosEl);
    }
  } else if (pontosEl) {
    pontosEl.remove();
  }

  const estoqueInfo = card.querySelector('.produto-estoque-info');
  const precoWrap = card.querySelector('.produto-preco-wrap');
  const precoEl = card.querySelector('.produto-preco');

  if (promoAtiva) {
    const html = `
      <span class="produto-preco-old">R$ ${formatarMoeda(preco)}</span>
      <span class="produto-preco-promo">R$ ${formatarMoeda(precoPromo)}</span>
    `;
    if (precoWrap) {
      precoWrap.innerHTML = html;
    } else {
      if (precoEl) precoEl.remove();
      const wrap = document.createElement('div');
      wrap.className = 'produto-preco-wrap';
      wrap.innerHTML = html;
      if (estoqueInfo) {
        estoqueInfo.before(wrap);
      } else {
        card.appendChild(wrap);
      }
    }
  } else {
    const texto = `R$ ${formatarMoeda(preco)}`;
    if (precoEl) {
      precoEl.textContent = texto;
    } else {
      if (precoWrap) precoWrap.remove();
      const novo = document.createElement('div');
      novo.className = 'produto-preco';
      novo.textContent = texto;
      if (estoqueInfo) {
        estoqueInfo.before(novo);
      } else {
        card.appendChild(novo);
      }
    }
  }

  card.classList.toggle('promo', promoAtiva);

  const categoriaDestino = dados.categoria_id ? String(dados.categoria_id) : 'sem';
  let blocoDestino = document.querySelector(`.categoria-bloco[data-categoria-id="${categoriaDestino}"]`);
  if (!blocoDestino && categoriaDestino === 'sem') {
    blocoDestino = criarBlocoSemCategoria();
  }
  if (blocoDestino) {
    const blocoAtual = card.closest('.categoria-bloco');
    if (blocoAtual && blocoAtual !== blocoDestino) {
      const gridDestino = blocoDestino.querySelector('.produtos-grid');
      if (gridDestino) {
        gridDestino.appendChild(card);
      }
      atualizarEstadoCategoria(blocoAtual);
    }
    atualizarEstadoCategoria(blocoDestino);
  }

  return true;
}

function criarCardProduto(dados){
  if (!dados.id) return null;
  const promoAtiva = dados.promo_ativa && parseNumero(dados.preco_promocional) > 0;
  const ativo = dados.ativo === 1 || dados.ativo === true;
  const estoqueQtd = Number.isFinite(dados.estoque_quantidade) ? dados.estoque_quantidade : 0;
  const estoqueClasse = estoqueQtd > 0 ? ' is-ok' : '';
  const badgeHtml = promoAtiva ? '<div class="produto-badge-promo">Promo</div>' : '';
  const pontosGanho = Number(dados.pontos_ganho || 0);
  const pontosCusto = Number(dados.pontos_custo || 0);
  const pontosHtml = (pontosGanho > 0 || pontosCusto > 0)
    ? `<div class="produto-pontos">
        ${pontosGanho > 0 ? `<span class="produto-pontos-badge recompensa"><i class="bi bi-gift"></i> Recompensa ${pontosGanho} pts</span>` : ''}
        ${pontosCusto > 0 ? `<span class="produto-pontos-badge custo"><i class="bi bi-lightning-charge"></i> Custo: ${pontosCusto} pts</span>` : ''}
      </div>`
    : '';
  const precoHtml = promoAtiva
    ? `<div class="produto-preco-wrap"><span class="produto-preco-old">R$ ${formatarMoeda(dados.preco)}</span><span class="produto-preco-promo">R$ ${formatarMoeda(dados.preco_promocional)}</span></div>`
    : `<div class="produto-preco">R$ ${formatarMoeda(dados.preco)}</div>`;

  const vencido = _produtoVencido(dados.data_validade);
  const card = document.createElement('article');
  card.className = `produto-card${promoAtiva ? ' promo' : ''}${vencido ? ' produto-vencido' : ''}`;
  card.dataset.id = dados.id;
  card.dataset.nome = (dados.nome || '').toLowerCase();
  card.dataset.validade = dados.data_validade || '';
  card.innerHTML = `
    <div class="produto-thumb">
      ${renderThumbHtml(dados.imagem)}
    </div>
    <div class="produto-nome">${dados.nome || ''}</div>
    ${badgeHtml}
    <div class="produto-status">
      <span class="status-dot ${ativo ? '' : 'inativo'}"></span>
      <span class="produto-status-text">${ativo ? 'Ativo' : 'Inativo'}</span>
    </div>
    ${precoHtml}
    ${pontosHtml}
    <div class="produto-estoque-info${estoqueClasse}">
      <i class="bi bi-box-seam"></i>
      ${estoqueQtd} em estoque
    </div>
    <div class="produto-footer">
      <label class="switch" title="Disponivel no PDV">
        <input type="checkbox" class="produto-toggle" data-id="${dados.id}" ${ativo ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
      <button class="produto-edit" type="button" onclick="editarProduto(${dados.id})">
        <i class="bi bi-pencil"></i>
      </button>
    </div>
  `;

  const toggle = card.querySelector('.produto-toggle');
  if (toggle) {
    toggle.addEventListener('change', () => atualizarDisponibilidadeProduto(toggle));
  }

  return card;
}

function atualizarPromo(){
  if (!produtoPromoDesativado || !produtoPrecoPromo) return;
  const habilitado = produtoPromoDesativado.checked;
  produtoPrecoPromo.disabled = !habilitado;
  if (promoField) {
    promoField.classList.toggle('d-none', !habilitado);
  }
  if (!habilitado) {
    produtoPrecoPromo.value = '';
  }
}

function atualizarNomeEstoque(){
  if (!estoqueProdutoNome || !produtoNome) return;
  estoqueProdutoNome.textContent = produtoNome.value || 'Produto';
}

function atualizarQtdEstoque(qtd){
  if (!estoqueProdutoQtd) return;
  const quantidade = Number.isFinite(qtd) ? qtd : 0;
  estoqueProdutoQtd.textContent = `${quantidade} em estoque`;
  estoqueProdutoQtd.parentElement?.classList.toggle('is-ok', quantidade > 0);
}

function mostrarAbaDetalhes(){
  if (!produtoTabDetalhes) return;
  const tab = bootstrap.Tab.getOrCreateInstance(produtoTabDetalhes);
  tab.show();
}

function atualizarResumoVariacoes(){
  if (!variacoesResumo) return;
  if (!variacoesAtual.length) {
    variacoesResumo.textContent = 'Nenhuma variacao cadastrada.';
    return;
  }
  variacoesResumo.textContent =
    `${variacoesAtual.length} variacao${variacoesAtual.length > 1 ? 's' : ''} cadastrada${variacoesAtual.length > 1 ? 's' : ''}.`;
}

function atualizarResumoExtras(){
  if (!extrasResumo) return;
  if (!extrasAtual.length) {
    extrasResumo.textContent = 'Nenhum extra cadastrado.';
    return;
  }
  extrasResumo.textContent =
    `${extrasAtual.length} extra${extrasAtual.length > 1 ? 's' : ''} cadastrado${extrasAtual.length > 1 ? 's' : ''}.`;
}

function renderVariacoesModalProduto(){
  if (!variacoesModalLista) return;
  variacoesModalLista.innerHTML = '';
  if (!variacoesAtual.length) {
    variacoesModalLista.innerHTML = `
      <div class="produto-variacao-empty">
        Nenhuma variacao cadastrada.
      </div>
    `;
    return;
  }
  variacoesAtual.forEach((v, idx) => {
    const row = document.createElement('div');
    row.className = 'produto-variacao-row';
    row.dataset.variacao = String(idx);
    row.innerHTML = `
      <div class="produto-variacao-field">
        <label>Tamanho</label>
        <input type="text" value="${v.tamanho ?? ''}" placeholder="Ex.: 500ml" data-variacao-field="tamanho">
      </div>
      <div class="produto-variacao-field">
        <label>Cor</label>
        <input type="text" value="${v.cor ?? ''}" placeholder="Ex.: Vermelho" data-variacao-field="cor">
      </div>
      <div class="produto-variacao-field">
        <label>Preco</label>
        <input type="number" step="0.01" value="${v.preco ?? ''}" placeholder="0,00" data-variacao-field="preco">
      </div>
      <button type="button" class="produto-variacao-remove" data-variacao-remove>
        <i class="bi bi-trash"></i>
      </button>
    `;
    variacoesModalLista.appendChild(row);
  });
}

function renderExtrasModalProduto(){
  if (!extrasModalLista) return;
  extrasModalLista.innerHTML = '';
  if (!extrasAtual.length) {
    extrasModalLista.innerHTML = `
      <div class="produto-variacao-empty">
        Nenhum extra cadastrado.
      </div>
    `;
    return;
  }
  extrasAtual.forEach((v, idx) => {
    const row = document.createElement('div');
    row.className = 'produto-variacao-row';
    row.dataset.extra = String(idx);
    row.innerHTML = `
      <div class="produto-variacao-field">
        <label>Nome</label>
        <input type="text" value="${v.nome ?? ''}" placeholder="Ex.: Extra de morango" data-extra-field="nome">
      </div>
      <div class="produto-variacao-field">
        <label>Preco</label>
        <input type="number" step="0.01" value="${v.preco ?? ''}" placeholder="0,00" data-extra-field="preco">
      </div>
      <div class="produto-variacao-field">
        <label class="form-switch m-0 produto-variacao-obrig-switch">
          <input type="checkbox" class="form-check-input" data-extra-field="obrigatorio" ${v.obrigatorio ? 'checked' : ''}>
          <span>Obrigatorio</span>
        </label>
      </div>
      <button type="button" class="produto-variacao-remove" data-extra-remove>
        <i class="bi bi-trash"></i>
      </button>
    `;
    extrasModalLista.appendChild(row);
  });
}

function coletarVariacoesModal(){
  if (!variacoesModalLista) return [];
  const linhas = Array.from(variacoesModalLista.querySelectorAll('.produto-variacao-row[data-variacao]'));
  const lista = [];
  linhas.forEach(row => {
    const tamanho = row.querySelector('[data-variacao-field="tamanho"]')?.value.trim() || '';
    const cor = row.querySelector('[data-variacao-field="cor"]')?.value.trim() || '';
    const precoRaw = row.querySelector('[data-variacao-field="preco"]')?.value || '';
    const preco = parseFloat(precoRaw);
    if (!tamanho && !cor && !precoRaw) return;
    lista.push({ tamanho, cor, preco: isNaN(preco) ? 0 : preco });
  });
  return lista;
}

function coletarExtrasModal(){
  if (!extrasModalLista) return [];
  const linhas = Array.from(extrasModalLista.querySelectorAll('.produto-variacao-row[data-extra]'));
  const lista = [];
  linhas.forEach(row => {
    const nome = row.querySelector('[data-extra-field="nome"]')?.value.trim() || '';
    const precoRaw = row.querySelector('[data-extra-field="preco"]')?.value || '';
    const obrigatorio = row.querySelector('[data-extra-field="obrigatorio"]')?.checked ? 1 : 0;
    const preco = parseFloat(precoRaw);
    if (!nome && !precoRaw) return;
    lista.push({ nome, preco: isNaN(preco) ? 0 : preco, obrigatorio });
  });
  return lista;
}

function renderComplementoPrecoModalProduto(){
  if (!complementoPrecoModalLista) return;
  complementoPrecoModalLista.innerHTML = '';
  if (!complementosPrecoAtual.length) {
    complementoPrecoModalLista.innerHTML = `
      <div class="produto-variacao-empty">
        Nenhum tipo cadastrado.
      </div>
    `;
    return;
  }
  complementosPrecoAtual.forEach((v, idx) => {
    const row = document.createElement('div');
    row.className = 'produto-variacao-row';
    row.dataset.complementoPreco = String(idx);
    row.innerHTML = `
      <div class="produto-variacao-field">
        <label>Nome</label>
        <input type="text" value="${v.nome ?? ''}" placeholder="Ex.: Massa amanteigada" data-complemento-preco-field="nome">
      </div>
      <div class="produto-variacao-field">
        <label>Preco</label>
        <input type="number" step="0.01" value="${v.preco ?? ''}" placeholder="0,00" data-complemento-preco-field="preco">
      </div>
      <div class="produto-variacao-field">
        <label class="form-switch m-0 produto-variacao-obrig-switch">
          <input type="checkbox" class="form-check-input" data-complemento-preco-field="obrigatorio" ${v.obrigatorio ? 'checked' : ''}>
          <span>Obrigatorio</span>
        </label>
      </div>
      <button type="button" class="produto-variacao-remove" data-complemento-preco-remove>
        <i class="bi bi-trash"></i>
      </button>
    `;
    complementoPrecoModalLista.appendChild(row);
  });
}

function coletarComplementoPrecoModal(){
  if (!complementoPrecoModalLista) return [];
  const linhas = Array.from(complementoPrecoModalLista.querySelectorAll('.produto-variacao-row[data-complemento-preco]'));
  const lista = [];
  linhas.forEach(row => {
    const nome = row.querySelector('[data-complemento-preco-field="nome"]')?.value.trim() || '';
    const precoRaw = row.querySelector('[data-complemento-preco-field="preco"]')?.value || '';
    const obrigatorio = row.querySelector('[data-complemento-preco-field="obrigatorio"]')?.checked ? 1 : 0;
    const preco = parseFloat(precoRaw);
    if (!nome && !precoRaw) return;
    lista.push({ nome, preco: isNaN(preco) ? 0 : preco, obrigatorio });
  });
  return lista;
}

function setReorderHover(lista, item){
  if (!lista) return;
  const atual = lista.querySelector('.reorder-item.is-over');
  if (atual && atual !== item) atual.classList.remove('is-over');
  if (item) item.classList.add('is-over');
}

function limparReorderHover(lista){
  if (!lista) return;
  const atual = lista.querySelector('.reorder-item.is-over');
  if (atual) atual.classList.remove('is-over');
}

function iniciarReordenacaoCategorias(){
  if (!ordenarLista) return;
  ordenarLista.querySelectorAll('.reorder-item').forEach(item => {
    item.addEventListener('dragstart', () => {
      item.classList.add('dragging');
      limparReorderHover(ordenarLista);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      limparReorderHover(ordenarLista);
      atualizarNumeracaoCategorias();
    });
  });

  if (!ordenarLista.dataset.reorderInit) {
    ordenarLista.addEventListener('dragover', (event) => {
      event.preventDefault();
      const dragging = ordenarLista.querySelector('.dragging');
      if (!dragging) return;
      const afterElement = getDragAfterElement(ordenarLista, event.clientY);
      setReorderHover(ordenarLista, afterElement || null);
      if (afterElement == null) {
        ordenarLista.appendChild(dragging);
      } else {
        ordenarLista.insertBefore(dragging, afterElement);
      }
    });

    ordenarLista.addEventListener('drop', () => limparReorderHover(ordenarLista));
    ordenarLista.dataset.reorderInit = '1';
  }
}

function getDragAfterElement(container, y){
  const elements = [...container.querySelectorAll('.reorder-item:not(.dragging)')];
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function atualizarNumeracaoCategorias(){
  if (!ordenarLista) return;
  ordenarLista.querySelectorAll('.reorder-item').forEach((item, index) => {
    const numero = item.querySelector('.reorder-num');
    if (numero) {
      numero.textContent = `${index + 1} -`;
    }
  });
}

function iniciarReordenacaoItens(){
  if (!ordenarItensLista) return;
  ordenarItensLista.querySelectorAll('.reorder-item').forEach(item => {
    item.addEventListener('dragstart', () => {
      item.classList.add('dragging');
      limparReorderHover(ordenarItensLista);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      limparReorderHover(ordenarItensLista);
      atualizarNumeracaoItens();
    });
  });

  if (!ordenarItensLista.dataset.reorderInit) {
    ordenarItensLista.addEventListener('dragover', (event) => {
      event.preventDefault();
      const dragging = ordenarItensLista.querySelector('.dragging');
      if (!dragging) return;
      const afterElement = getDragAfterElement(ordenarItensLista, event.clientY);
      setReorderHover(ordenarItensLista, afterElement || null);
      if (afterElement == null) {
        ordenarItensLista.appendChild(dragging);
      } else {
        ordenarItensLista.insertBefore(dragging, afterElement);
      }
    });

    ordenarItensLista.addEventListener('drop', () => limparReorderHover(ordenarItensLista));
    ordenarItensLista.dataset.reorderInit = '1';
  }
}

function atualizarNumeracaoItens(){
  if (!ordenarItensLista) return;
  ordenarItensLista.querySelectorAll('.reorder-item').forEach((item, index) => {
    const numero = item.querySelector('.reorder-num');
    if (numero) {
      numero.textContent = `${index + 1} -`;
    }
  });
}

function abrirModalReordenarItens(categoriaId){
  if (!modalReordenarItens || !ordenarItensLista) return;
  const bloco = document.querySelector(`.categoria-bloco[data-categoria-id="${categoriaId}"]`);
  if (!bloco) {
    toast('Categoria nao encontrada');
    return;
  }

  categoriaAtualReordenar = categoriaId;
  if (ordenarItensCategoria) {
    const nomeCategoria = bloco.querySelector('.categoria-title')?.textContent || '';
    ordenarItensCategoria.textContent = nomeCategoria ? `Categoria: ${nomeCategoria}` : '';
  }

  ordenarItensLista.innerHTML = '';
  bloco.querySelectorAll('.produto-card').forEach((card, index) => {
    const id = card.dataset.id;
    const nome = card.querySelector('.produto-nome')?.textContent || '';
    const item = document.createElement('div');
    item.className = 'reorder-item';
    item.draggable = true;
    item.dataset.id = id;
    item.innerHTML = `<span class="reorder-num">${index + 1} -</span><span class="reorder-nome">${nome}</span>`;
    ordenarItensLista.appendChild(item);
  });

  iniciarReordenacaoItens();
  modalReordenarItens.show();
}

function salvarReordenacaoItens(){
  if (!ordenarItensLista || !categoriaAtualReordenar) return;
  const ids = [...ordenarItensLista.querySelectorAll('.reorder-item')]
    .map(item => item.dataset.id)
    .filter(Boolean);

  fetch('api/produtos_reordenar.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoria_id: categoriaAtualReordenar, ordem: ids })
  })
    .then(r => r.json())
    .then(resp => {
      if (resp.ok) {
        if (modalReordenarItens) modalReordenarItens.hide();
        window.location.reload();
      } else {
        if (resp.error === 'missing_column') {
          toast('Coluna ordem ausente na tabela de produtos');
        } else {
          toast('Erro ao salvar ordem dos produtos');
        }
      }
    })
    .catch(() => toast('Erro ao salvar ordem dos produtos'));
}

function abrirModalReordenarCategorias(){
  if (!modalReordenar) return;
  atualizarNumeracaoCategorias();
  modalReordenar.show();
}

function salvarReordenacaoCategorias(){
  if (!ordenarLista) return;
  const ids = [...ordenarLista.querySelectorAll('.reorder-item')]
    .map(item => item.dataset.id)
    .filter(Boolean);

  fetch('api/categorias_reordenar.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ordem: ids })
  })
    .then(r => r.json())
    .then(resp => {
      if (resp.ok) {
        if (modalReordenar) modalReordenar.hide();
        window.location.reload();
      } else {
        toast('Erro ao salvar ordem');
      }
    })
    .catch(() => toast('Erro ao salvar ordem'));
}

function atualizarDisponibilidadeProduto(input){
  const id = input.dataset.id;
  if (!id) return;
  const ativo = input.checked ? 1 : 0;
  input.disabled = true;

  fetch('api/produtos_toggle.php', {
    method: 'POST',
    body: new URLSearchParams({ id, ativo })
  })
    .then(r => r.json())
    .then(resp => {
      if (!resp.ok) {
        input.checked = !input.checked;
        toast('Erro ao atualizar produto');
        return;
      }
      const card = input.closest('.produto-card');
      if (!card) return;
      const dot = card.querySelector('.status-dot');
      const text = card.querySelector('.produto-status-text');
      if (dot) {
        dot.classList.toggle('inativo', !input.checked);
      }
      if (text) {
        text.textContent = input.checked ? 'Ativo' : 'Inativo';
      }
    })
    .catch(() => {
      input.checked = !input.checked;
      toast('Erro ao atualizar produto');
    })
    .finally(() => {
      input.disabled = false;
    });
}

function atualizarDisponibilidadeCombo(input){
  const id = input.dataset.id;
  if (!id) return;
  const ativo = input.checked ? 1 : 0;
  input.disabled = true;

  fetch('api/combo_toggle.php', {
    method: 'POST',
    body: new URLSearchParams({ id, ativo })
  })
    .then(r => r.json())
    .then(resp => {
      if (!resp.ok) {
        input.checked = !input.checked;
        toast('Erro ao atualizar combo');
        return;
      }
      toastSucessoTopo(input.checked ? 'Combo habilitado' : 'Combo desabilitado');
    })
    .catch(() => {
      input.checked = !input.checked;
      toast('Erro ao atualizar combo');
    })
    .finally(() => {
      input.disabled = false;
    });
}

function atualizarDisponibilidadeCategoria(input){
  const id = input.dataset.id;
  if (!id) return;
  const ativo = input.checked ? 1 : 0;
  input.disabled = true;

  fetch('api/categorias_toggle.php', {
    method: 'POST',
    body: new URLSearchParams({ id, ativo })
  })
    .then(r => r.json())
    .then(resp => {
      if (!resp.ok) {
        input.checked = !input.checked;
        toast('Erro ao atualizar categoria');
        return;
      }
      const bloco = input.closest('.categoria-bloco');
      const badge = bloco ? bloco.querySelector('.categoria-badge') : null;
      if (badge) {
        badge.textContent = input.checked ? 'ativa' : 'inativa';
        badge.classList.toggle('badge-ativa', input.checked);
        badge.classList.toggle('badge-inativa', !input.checked);
      }
    })
    .catch(() => {
      input.checked = !input.checked;
      toast('Erro ao atualizar categoria');
    })
    .finally(() => {
      input.disabled = false;
    });
}

function abrirModalEstoque(){
  if (!modalEstoque || !estoqueProdutoId) return;
  const id = produtoId.value;
  if (!id) {
    toast('Selecione um produto primeiro');
    return;
  }

  estoqueProdutoId.value = id;
  carregarProdutosVinculados(id);

  fetch(`api/estoque_get.php?produto_id=${encodeURIComponent(id)}`)
    .then(r => r.json())
    .then(resp => {
      if (!resp.ok) {
        toast('Erro ao carregar estoque');
        return;
      }
      if (estoqueQuantidade) estoqueQuantidade.value = resp.quantidade ?? 0;
      if (estoqueMinimo) estoqueMinimo.value = resp.quantidade_minima ?? 0;
      carregarHistoricoEstoque(id);
      modalEstoque.show();
    })
    .catch(() => toast('Erro ao carregar estoque'));
}

/* ===== ESTOQUE VINCULADO (varios produtos, um so estoque) ===== */
var estVinculoState = { produtoId: null, produtos: [], filtered: [], selectedIds: [] };

function carregarProdutosVinculados(produtoId){
  const el = document.getElementById('estoqueVinculadosLista');
  if (!el) return;
  const vazio = '<div class="estoque-vinculado-row estoque-vinculado-empty">Nenhum item vinculado.</div>';
  el.innerHTML = '<div class="estoque-vinculado-row estoque-vinculado-empty">Carregando...</div>';
  fetch(`api/estoque_vinculo_produtos.php?produto_id=${encodeURIComponent(produtoId)}`)
    .then(r => r.json())
    .then(resp => {
      if (!resp.ok) {
        el.innerHTML = vazio;
        return;
      }
      const vinculados = resp.produtos.filter(p => p.vinculado);
      el.innerHTML = vinculados.length
        ? vinculados.map(p => `<div class="estoque-vinculado-row">${escapeHtml(p.nome)}</div>`).join('')
        : vazio;
    })
    .catch(() => { el.innerHTML = vazio; });
}

function _estVinculoAbrir(){
  if (!estoqueProdutoId || !estoqueProdutoId.value) {
    toast('Salve o estoque do produto antes de vincular outros itens.');
    return;
  }
  estVinculoState.produtoId = estoqueProdutoId.value;
  estVinculoState.selectedIds = [];
  const searchEl = document.getElementById('estVinculoSearch');
  if (searchEl) searchEl.value = '';
  const grid = document.getElementById('estVinculoGrid');
  if (grid) grid.innerHTML = '<div class="text-center py-4" style="grid-column:1/-1;color:#9ca3af;font-size:13px">Carregando produtos...</div>';
  if (modalVincularEstoque) modalVincularEstoque.show();

  fetch(`api/estoque_vinculo_produtos.php?produto_id=${encodeURIComponent(estVinculoState.produtoId)}`)
    .then(r => r.json())
    .then(resp => {
      if (!resp.ok) {
        if (grid) grid.innerHTML = '<div class="text-center py-4" style="grid-column:1/-1;color:#9ca3af;font-size:13px">Erro ao carregar produtos</div>';
        return;
      }
      estVinculoState.produtos = resp.produtos || [];
      estVinculoState.filtered = estVinculoState.produtos;
      estVinculoState.selectedIds = estVinculoState.produtos.filter(p => p.vinculado).map(p => p.id);
      _estVinculoRenderGrid();
      _estVinculoAtualizarContador();
    })
    .catch(() => {
      if (grid) grid.innerHTML = '<div class="text-center py-4" style="grid-column:1/-1;color:#9ca3af;font-size:13px">Erro de comunicação</div>';
    });
}

function _estVinculoRenderGrid(){
  const grid = document.getElementById('estVinculoGrid');
  if (!grid) return;
  const prods = estVinculoState.filtered;
  if (!prods.length) {
    grid.innerHTML = '<div class="text-center py-4" style="grid-column:1/-1;color:#9ca3af;font-size:13px">Nenhum produto encontrado</div>';
    return;
  }
  grid.innerHTML = prods.map(p => {
    const sel = estVinculoState.selectedIds.indexOf(p.id) >= 0;
    const thumb = p.imagem
      ? `<img src="${escapeHtml(p.imagem)}" alt="">`
      : '<div class="opcoes-item-thumb"><i class="bi bi-bag"></i></div>';
    return `<div class="opcoes-item${sel ? ' selected' : ''}" data-id="${p.id}" onclick="_estVinculoToggle(this,${p.id})">
      ${thumb}
      <span class="opcoes-item-name">${escapeHtml(p.nome)}</span>
      <div class="opcoes-item-check">${sel ? '<i class="bi bi-check" style="font-size:11px"></i>' : ''}</div>
    </div>`;
  }).join('');
}

function _estVinculoToggle(el, id){
  const idx = estVinculoState.selectedIds.indexOf(id);
  if (idx >= 0) {
    estVinculoState.selectedIds.splice(idx, 1);
    el.classList.remove('selected');
    el.querySelector('.opcoes-item-check').innerHTML = '';
  } else {
    estVinculoState.selectedIds.push(id);
    el.classList.add('selected');
    el.querySelector('.opcoes-item-check').innerHTML = '<i class="bi bi-check" style="font-size:11px"></i>';
  }
  _estVinculoAtualizarContador();
}

function _estVinculoFiltrar(){
  const searchEl = document.getElementById('estVinculoSearch');
  const termo = (searchEl && searchEl.value || '').toLowerCase();
  estVinculoState.filtered = estVinculoState.produtos.filter(p => !termo || p.nome.toLowerCase().indexOf(termo) >= 0);
  _estVinculoRenderGrid();
}

function _estVinculoSelecionarTodos(){
  estVinculoState.filtered.forEach(p => {
    if (estVinculoState.selectedIds.indexOf(p.id) < 0) estVinculoState.selectedIds.push(p.id);
  });
  _estVinculoRenderGrid();
  _estVinculoAtualizarContador();
}

function _estVinculoDesmarcarTodos(){
  const filteredIds = estVinculoState.filtered.map(p => p.id);
  estVinculoState.selectedIds = estVinculoState.selectedIds.filter(id => filteredIds.indexOf(id) < 0);
  _estVinculoRenderGrid();
  _estVinculoAtualizarContador();
}

function _estVinculoAtualizarContador(){
  const el = document.getElementById('estVinculoContador');
  if (el) el.textContent = estVinculoState.selectedIds.length > 0 ? estVinculoState.selectedIds.length + ' selecionado(s)' : '';
}

function _estVinculoSalvar(){
  fetch('api/estoque_vinculo_save.php', {
    method: 'POST',
    body: new URLSearchParams({
      produto_id: estVinculoState.produtoId,
      produto_ids: estVinculoState.selectedIds.join(',')
    })
  })
    .then(r => r.json())
    .then(resp => {
      if (!resp.ok) {
        toast(resp.msg || 'Erro ao vincular itens');
        return;
      }
      if (modalVincularEstoque) modalVincularEstoque.hide();
      carregarProdutosVinculados(estVinculoState.produtoId);
      toastSucessoTopo('Itens vinculados com sucesso');
    })
    .catch(() => toast('Erro ao vincular itens'));
}

function carregarHistoricoEstoque(produtoId){
  if (!estoqueHistoricoLista) return;
  estoqueHistoricoLista.innerHTML = '';
  fetch(`api/estoque_historico.php?produto_id=${encodeURIComponent(produtoId)}`)
    .then(r => r.json())
    .then(resp => {
      if (!resp.ok || !Array.isArray(resp.movimentos)) {
        estoqueHistoricoLista.innerHTML = '<div class="produto-empty">Sem movimentacoes recentes.</div>';
        return;
      }
      if (resp.movimentos.length === 0) {
        estoqueHistoricoLista.innerHTML = '<div class="produto-empty">Sem movimentacoes recentes.</div>';
        return;
      }
      const itens = resp.movimentos.map(m => {
        const tipoClasse = m.tipo === 'entrada' ? 'entrada' : 'saida';
        return `
          <div class="estoque-historico-item">
            <span class="tipo ${tipoClasse}">${m.tipo}</span>
            <span>${m.quantidade}</span>
            <span class="info">${m.data} - ${m.origem || '-'}</span>
          </div>
        `;
      }).join('');
      estoqueHistoricoLista.innerHTML = itens;
    })
    .catch(() => {
      estoqueHistoricoLista.innerHTML = '<div class="produto-empty">Sem movimentacoes recentes.</div>';
    });
}

function salvarEstoque(){
  if (!estoqueProdutoId) return;
  const id = estoqueProdutoId.value;
  const quantidade = estoqueQuantidade ? estoqueQuantidade.value : '0';
  const minimo = estoqueMinimo ? estoqueMinimo.value : '0';

  fetch('api/estoque_update.php', {
    method: 'POST',
    body: new URLSearchParams({
      produto_id: id,
      quantidade,
      quantidade_minima: minimo
    })
  })
    .then(r => r.json())
    .then(resp => {
      if (!resp.ok) {
        toast('Erro ao salvar estoque');
        return;
      }
      atualizarQtdEstoque(Number(quantidade));
      const card = document.querySelector(`.produto-card[data-id="${id}"]`);
      if (card) {
        const info = card.querySelector('.produto-estoque-info');
        if (info) {
          const qtdNum = Number(quantidade) || 0;
          info.classList.toggle('is-ok', qtdNum > 0);
          info.innerHTML = `<i class="bi bi-box-seam"></i>${qtdNum} em estoque`;
        }
      }
      carregarHistoricoEstoque(id);
      if (modalEstoque) modalEstoque.hide();
    })
    .catch(() => toast('Erro ao salvar estoque'));
}

function deletarEstoque(){
  if (!estoqueProdutoId) return;
  const id = estoqueProdutoId.value;

  showConfirm(
    'Atenção',
    'Essa ação é irreversível e não poderá ser desfeita.',
    'Deletar',
    function() {
      fetch('api/estoque_delete.php', {
        method: 'POST',
        body: new URLSearchParams({ produto_id: id })
      })
        .then(r => r.json())
        .then(resp => {
          if (!resp.ok) {
            toast('Erro ao deletar estoque');
            return;
          }
          if (estoqueQuantidade) estoqueQuantidade.value = 0;
          if (estoqueMinimo) estoqueMinimo.value = 0;
          atualizarQtdEstoque(0);
          const card = document.querySelector(`.produto-card[data-id="${id}"]`);
          if (card) {
            const info = card.querySelector('.produto-estoque-info');
            if (info) {
              info.classList.remove('is-ok');
              info.innerHTML = `<i class="bi bi-box-seam"></i>0 em estoque`;
            }
          }
          if (modalEstoque) modalEstoque.hide();
        })
        .catch(() => toast('Erro ao deletar estoque'));
    }
  );
}

function selecionarModoCategoria(valor){
  if (!categoriaModo) return;
  categoriaModo.value = valor;
  modoCards.forEach(card => {
    card.classList.toggle('active', card.dataset.value === valor);
  });
}

function abrirModalCategoria(){
  if (!formCategoria || !modalCategoria) return;
  formCategoria.reset();
  if (categoriaId) categoriaId.value = '';
  if (categoriaAtivo) categoriaAtivo.checked = true;
  selecionarModoCategoria('vertical');
  if (categoriaModalTitle) categoriaModalTitle.textContent = 'Criar categoria';
  if (categoriaSalvarBtn) categoriaSalvarBtn.textContent = 'Adicionar';
  modalCategoria.show();
}

function excluirCategoria(id, nome) {
  showConfirm(
    'Excluir categoria',
    'Deseja excluir a categoria "' + nome + '"? Os produtos desta categoria não serão excluídos.',
    'Excluir',
    function() {
      fetch('api/categoria_deletar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'id=' + encodeURIComponent(id)
      })
      .then(function(r){ return r.json(); })
      .then(function(resp){
        if(resp.ok){
          var bloco = document.querySelector('.categoria-bloco[data-categoria-id="' + id + '"]');
          if(bloco) bloco.remove();
          toast('Categoria excluída com sucesso.');
        } else {
          toast(resp.msg || 'Erro ao excluir categoria.');
        }
      })
      .catch(function(){ toast('Erro de comunicação.'); });
    }
  );
}

function editarCategoria(id){
  if (!modalCategoria || !formCategoria) return;
  fetch('api/categorias_get.php?id=' + encodeURIComponent(id))
    .then(r => r.json())
    .then(cat => {
      if (!cat || !cat.id) {
        toast('Categoria nao encontrada');
        return;
      }
      if (categoriaId) categoriaId.value = cat.id;
      if (categoriaNome) categoriaNome.value = cat.nome || '';
      if (categoriaAtivo) categoriaAtivo.checked = cat.ativo == 1;
      selecionarModoCategoria(cat.modo_exibicao || 'vertical');
      if (categoriaModalTitle) categoriaModalTitle.textContent = 'Editar categoria';
      if (categoriaSalvarBtn) categoriaSalvarBtn.textContent = 'Salvar';
      modalCategoria.show();
    })
    .catch(() => toast('Erro ao carregar categoria'));
}

function reordenarItens(id){
  abrirModalReordenarItens(id);
}

function salvarCategoria(){
  if (!formCategoria) return;
  const nome = (categoriaNome?.value || '').trim();
  if (!nome) {
    toast('Informe o nome da categoria');
    return;
  }

  const dados = new FormData(formCategoria);
  if (categoriaAtivo && !categoriaAtivo.checked) dados.set('ativo', 0);

  fetch('api/categorias_save.php', { method: 'POST', body: dados })
    .then(r => r.json())
    .then(resp => {
      if (resp.ok) {
        if (modalCategoria) modalCategoria.hide();
        window.location.reload();
      } else {
        toast('Erro ao salvar categoria');
      }
    })
    .catch(() => toast('Erro ao salvar categoria'));
}

function filtrarProdutos(){
  if (!buscaProduto) return;
  const termo = buscaProduto.value.trim().toLowerCase();
  const somentePromo = filtroPromo ? filtroPromo.checked : false;
  const blocos = document.querySelectorAll('.categoria-bloco');
  let encontrou = false;

  blocos.forEach(bloco => {
    let visivelNoBloco = false;
    const cards = bloco.querySelectorAll('.produto-card');
    cards.forEach(card => {
      const nome = (card.dataset.nome || '').toLowerCase();
      const matchTermo = termo === '' || nome.includes(termo);
      const matchPromo = !somentePromo || card.classList.contains('promo');
      const match = matchTermo && matchPromo;
      card.style.display = match ? '' : 'none';
      if (match) {
        visivelNoBloco = true;
        encontrou = true;
      }
    });

    const vazio = bloco.querySelector('.produtos-vazio');
    if (vazio) {
      vazio.style.display = termo === '' ? '' : 'none';
    }
    bloco.style.display = visivelNoBloco || termo === '' ? '' : 'none';
  });

  const estadoVazio = document.querySelector('.produtos-empty');
  if (estadoVazio && termo !== '') {
    estadoVazio.style.display = encontrou ? 'none' : '';
  }
}

/* ===== CATEGORIAS ===== */
function carregarCategorias(selected=''){
  if (!produtoCategoria) return;
  const alvo = (selected !== null && selected !== undefined && selected !== '' && selected !== 'sem')
    ? String(selected) : '';
  produtoCategoria.value = alvo;
  _categoriaSelecionada = alvo;
}

/* ===== NOVO ===== */
function abrirModalProduto(categoriaId = ''){
  formProduto.reset();
  produtoId.value = '';
  carregarCategorias(categoriaId); // carregarCategorias já sincroniza o hidden
  if (produtoCodigo) produtoCodigo.value = '';
  if (produtoDescricao) produtoDescricao.value = '';
  if (produtoPromoDesativado) produtoPromoDesativado.checked = false;
  if (produtoPrecoPromo) produtoPrecoPromo.value = '';
  if (produtoPontosGanho) produtoPontosGanho.value = '';
  if (produtoPontosCusto) produtoPontosCusto.value = '';
  if (pontosGanhoAtivo) pontosGanhoAtivo.checked = false;
  if (pontosCustoAtivo) pontosCustoAtivo.checked = false;
  if (produtoVariacoes) produtoVariacoes.checked = false;
  // .checked = false nao dispara "change" sozinho, entao os paineis
  // (variacoes/extras/tipo) precisam ser escondidos aqui explicitamente.
  if (produtoVariacoesPanel) produtoVariacoesPanel.classList.add('d-none');
  if (produtoExtrasPanel) produtoExtrasPanel.classList.add('d-none');
  if (produtoComplementoPrecoPanel) produtoComplementoPrecoPanel.classList.add('d-none');
  variacoesAtual = [];
  atualizarResumoVariacoes();
  extrasAtual = [];
  atualizarResumoExtras();
  complementosPrecoAtual = [];
  _atualizarResumoComplementoPreco();
  if (produtoCatalogo) produtoCatalogo.checked = true;
  if (produtoMesa) produtoMesa.checked = true;
  if (produtoAtivo) produtoAtivo.checked = true;
  if (produtoApenasAgendamento) produtoApenasAgendamento.checked = false;
  if (produtoQtdMinimaAtivo) produtoQtdMinimaAtivo.checked = false;
  if (produtoQtdMinima) produtoQtdMinima.value = 0;
  if (produtoQtdMinimaField) produtoQtdMinimaField.classList.add('d-none');
  atualizarPromo();
  atualizarNomeEstoque();
  atualizarQtdEstoque(0);
  if (pontosGanhoAtivo && produtoPontosGanho) {
    pontosGanhoAtivo.checked = Number(produtoPontosGanho.value || 0) > 0;
  }
  if (pontosCustoAtivo && produtoPontosCusto) {
    pontosCustoAtivo.checked = Number(produtoPontosCusto.value || 0) > 0;
  }
  atualizarPontosUi();
  if (tituloModalProduto) {
    tituloModalProduto.innerText = 'Novo produto - detalhes';
  }
  if (btnExcluirProduto) {
    btnExcluirProduto.classList.add('d-none');
  }
  limparImagemProduto();
  mostrarAbaDetalhes();
  modalProduto.show();
}

/* ===== EDITAR ===== */
function editarProduto(id){
  fetch('api/produtos_get.php?id=' + id + '&_=' + Date.now(), { cache: 'no-store' })
    .then(r => r.json())
    .then(p => {
      produtoId.value = p.id;
      produtoNome.value = p.nome;
      complementosPrecoAtual = Array.isArray(p.complementos_itens) ? p.complementos_itens : [];
      _atualizarResumoComplementoPreco();
      if (produtoCodigo) produtoCodigo.value = p.codigo ?? '';
      if (produtoDescricao) produtoDescricao.value = p.descricao ?? '';
      produtoPreco.value = formatarDinheiroInput(p.preco);
      produtoAtivo.checked = p.ativo == 1;
      if (produtoPrecoPromo) produtoPrecoPromo.value = p.preco_promocional ? formatarDinheiroInput(p.preco_promocional) : '';
      if (produtoPontosGanho) produtoPontosGanho.value = p.pontos_ganho ?? '';
      if (produtoPontosCusto) produtoPontosCusto.value = p.pontos_custo ?? '';
      if (pontosGanhoAtivo && produtoPontosGanho) {
        pontosGanhoAtivo.checked = Number(produtoPontosGanho.value || 0) > 0;
      }
      if (pontosCustoAtivo && produtoPontosCusto) {
        pontosCustoAtivo.checked = Number(produtoPontosCusto.value || 0) > 0;
      }
      atualizarPontosUi();
      if (produtoPromoDesativado) {
        produtoPromoDesativado.checked =
          p.promo_desativado === undefined ? false : p.promo_desativado == 0;
      }
      variacoesAtual = Array.isArray(p.variacoes) ? p.variacoes : [];
      atualizarResumoVariacoes();
      extrasAtual = Array.isArray(p.extras) ? p.extras : [];
      atualizarResumoExtras();
      const temComplementosItensExistentes = Array.isArray(p.complementos_itens) && p.complementos_itens.length > 0;
      if (produtoVariacoes) {
        produtoVariacoes.checked =
          p.tem_variacoes === undefined ? false : p.tem_variacoes == 1;
        // Extras e tipos ficam junto do switch de variacoes, mas se o produto ja
        // tiver extras/tipos cadastrados de antes, mantem cada painel visivel pra
        // nao esconder dado ja existente do lojista (checagem independente por painel).
        if (produtoVariacoesPanel) {
          produtoVariacoesPanel.classList.toggle('d-none', !produtoVariacoes.checked);
        }
        if (produtoExtrasPanel) {
          produtoExtrasPanel.classList.toggle('d-none', !(produtoVariacoes.checked || extrasAtual.length > 0));
        }
        if (produtoComplementoPrecoPanel) {
          produtoComplementoPrecoPanel.classList.toggle('d-none', !(produtoVariacoes.checked || temComplementosItensExistentes));
        }
      }
      if (produtoCatalogo) {
        produtoCatalogo.checked =
          p.disponivel_catalogo === undefined ? true : p.disponivel_catalogo != 0;
      }
      if (produtoMesa) {
        produtoMesa.checked =
          p.disponivel_mesa === undefined ? true : p.disponivel_mesa != 0;
      }
      if (produtoImagemBase64) produtoImagemBase64.value = '';
      if (produtoImagemRemover) produtoImagemRemover.value = '0';
      atualizarPreviewImagem(p.imagem || '');
      atualizarQtdEstoque(Number(p.estoque_quantidade || 0));
      carregarCategorias(p.categoria_id);
      if (produtoApenasAgendamento) produtoApenasAgendamento.checked = p.apenas_agendamento == 1;
      const dias = Array.isArray(p.dias_semana) ? p.dias_semana
        : (typeof p.dias_semana === 'string' ? JSON.parse(p.dias_semana || '[]') : []);
      const diasEl2 = document.getElementById('produtoDiasSemana');
      const iniEl2  = document.getElementById('produtoHorarioIni');
      const fimEl2  = document.getElementById('produtoHorarioFim');
      if (diasEl2) diasEl2.value = JSON.stringify(dias);
      if (iniEl2)  iniEl2.value  = p.horario_ini || '';
      if (fimEl2)  fimEl2.value  = p.horario_fim || '';
      _atualizarResumoCronograma(dias, p.horario_ini || '', p.horario_fim || '');
      const dataFabricacaoEl = document.getElementById('produtoDataFabricacao');
      const dataValidadeEl = document.getElementById('produtoDataValidade');
      if (dataFabricacaoEl) dataFabricacaoEl.value = p.data_fabricacao || '';
      if (dataValidadeEl) dataValidadeEl.value = p.data_validade || '';
      const qtdMin = Number(p.quantidade_minima || 0);
      if (produtoQtdMinimaAtivo) produtoQtdMinimaAtivo.checked = qtdMin > 0;
      if (produtoQtdMinima) produtoQtdMinima.value = qtdMin > 0 ? qtdMin : 1;
      if (produtoQtdMinimaField) produtoQtdMinimaField.classList.toggle('d-none', qtdMin <= 0);
      if (tituloModalProduto) {
        tituloModalProduto.innerText = `${p.nome || 'Produto'} - detalhes`;
      }
      if (btnExcluirProduto) {
        btnExcluirProduto.classList.remove('d-none');
      }
      atualizarPromo();
      atualizarNomeEstoque();
      mostrarAbaDetalhes();
      modalProduto.show();
    });
}

/* ===== SALVAR ===== */
function salvarProduto(){
  const dados = new FormData(formProduto);
  const idAtual = produtoId ? produtoId.value : '';
  // Garante que o ID correto está no payload (nunca salva sem ID para update)
  if (idAtual) dados.set('id', idAtual);
  // Preco/preco promocional exibem mascara "7,50" na tela; o backend espera numero.
  dados.set('preco', parseDinheiroInput(produtoPreco.value));
  // Força valores explícitos para evitar coleta incorreta pelo FormData
  dados.set('categoria_id', _categoriaSelecionada);
  dados.set('apenas_agendamento', (produtoApenasAgendamento && produtoApenasAgendamento.checked) ? 1 : 0);
  dados.set('quantidade_minima', (produtoQtdMinimaAtivo && produtoQtdMinimaAtivo.checked)
    ? (produtoQtdMinima ? Math.max(1, parseInt(produtoQtdMinima.value) || 1) : 1) : 0);
  if (!produtoAtivo.checked) dados.set('ativo', 0);
  if (produtoPromoDesativado) {
    dados.set('promo_desativado', produtoPromoDesativado.checked ? 0 : 1);
  }
  if (produtoPrecoPromo) {
    dados.set('preco_promocional', produtoPrecoPromo.value ? parseDinheiroInput(produtoPrecoPromo.value) : '');
  }
  if (produtoVariacoes) {
    dados.set('tem_variacoes', produtoVariacoes.checked ? 1 : 0);
  }
  if (produtoCatalogo) {
    dados.set('disponivel_catalogo', produtoCatalogo.checked ? 1 : 0);
  }
  if (produtoMesa) {
    dados.set('disponivel_mesa', produtoMesa.checked ? 1 : 0);
  }
  const ganhoAtivo = pontosGanhoAtivo ? pontosGanhoAtivo.checked : false;
  const custoAtivo = pontosCustoAtivo ? pontosCustoAtivo.checked : false;
  if (produtoPontosGanho) {
    dados.set('pontos_ganho', ganhoAtivo ? (produtoPontosGanho.value || 0) : 0);
  }
  if (produtoPontosCusto) {
    dados.set('pontos_custo', custoAtivo ? (produtoPontosCusto.value || 0) : 0);
  }
  if (ganhoAtivo && produtoPontosGanho && Number(produtoPontosGanho.value || 0) <= 0) {
    toast('Informe os pontos de ganho.');
    return;
  }
  if (custoAtivo && produtoPontosCusto && Number(produtoPontosCusto.value || 0) <= 0) {
    toast('Informe os pontos de troca.');
    return;
  }
  if (produtoVariacoes && produtoVariacoes.checked && variacoesModalLista) {
    const temLinhas = !!variacoesModalLista.querySelector('.produto-variacao-row[data-variacao]');
    if (variacoesModalAberto || temLinhas) {
      variacoesAtual = coletarVariacoesModal();
      atualizarResumoVariacoes();
    }
  }
  const variacoes = produtoVariacoes && produtoVariacoes.checked ? variacoesAtual : [];
  if (produtoVariacoes && produtoVariacoes.checked && variacoes.length === 0) {
    toast('Informe ao menos uma variacao antes de salvar.');
    return;
  }
  if (extrasModalLista) {
    const temExtras = !!extrasModalLista.querySelector('.produto-variacao-row[data-extra]');
    if (extrasModalAberto || temExtras) {
      extrasAtual = coletarExtrasModal();
      atualizarResumoExtras();
    }
  }
  const extras = extrasAtual || [];
  dados.set('extras_json', JSON.stringify(extras));
  dados.set('variacoes_json', JSON.stringify(variacoes));
  dados.set('complementos_itens_json', JSON.stringify(complementosPrecoAtual || []));
  if (variacoes.length > 0 && produtoVariacoes) {
    produtoVariacoes.checked = true;
    dados.set('tem_variacoes', 1);
  }

  fetch('api/produtos_save.php', { method: 'POST', body: dados })
    .then(r => r.json())
    .then(resp => {
      if (resp.ok) {
        modalProduto.hide();
        if (resp.action === 'update') {
          toastSucessoTopo('Produto alterado com sucesso');
        } else if (resp.action === 'insert') {
          toastSucessoTopo('Produto cadastrado com sucesso');
        }
        if (produtoVariacoes && produtoVariacoes.checked) {
          const totalVariacoes = Number.isFinite(Number(resp.variacoes_count))
            ? Number(resp.variacoes_count)
            : 0;
          toast(`Variacoes salvas: ${totalVariacoes}`);
        }
          const produtoSalvo = {
          id: produtoId.value || resp.id,
          nome: produtoNome.value.trim(),
          preco: parseDinheiroInput(produtoPreco.value),
          preco_promocional: produtoPrecoPromo ? parseDinheiroInput(produtoPrecoPromo.value) : '',
          promo_ativa: produtoPromoDesativado ? produtoPromoDesativado.checked : false,
          ativo: produtoAtivo.checked ? 1 : 0,
          categoria_id: produtoCategoria ? produtoCategoria.value : '',
          estoque_quantidade: parseNumero(estoqueQuantidade ? estoqueQuantidade.value : 0),
          imagem: resp.imagem,
          pontos_ganho: produtoPontosGanho ? Number(produtoPontosGanho.value || 0) : 0,
          pontos_custo: produtoPontosCusto ? Number(produtoPontosCusto.value || 0) : 0,
          data_validade: document.getElementById('produtoDataValidade') ? document.getElementById('produtoDataValidade').value : ''
        };
        const atualizado = atualizarCardProduto(produtoSalvo);
        if (!atualizado && resp.action === 'insert' && resp.id) {
          const categoriaDestino = produtoSalvo.categoria_id ? String(produtoSalvo.categoria_id) : 'sem';
          let blocoDestino = document.querySelector(`.categoria-bloco[data-categoria-id="${categoriaDestino}"]`);
          if (!blocoDestino && categoriaDestino === 'sem') {
            blocoDestino = criarBlocoSemCategoria();
          }
          const grid = blocoDestino ? blocoDestino.querySelector('.produtos-grid') : null;
          const card = criarCardProduto(produtoSalvo);
          if (grid && card) {
            grid.appendChild(card);
            atualizarEstadoCategoria(blocoDestino);
          } else {
            window.location.reload();
          }
        } else if (!atualizado && resp.action === 'insert') {
          window.location.reload();
        }
        filtrarProdutos();
        if (resp.variacoes_status === 'missing') {
          toast('Tabela de variacoes nao encontrada. Execute o SQL de variacoes.');
        }
      } else {
        toast(resp.msg || 'Erro ao salvar');
      }
    });
}

function excluirProduto(){
  const id = produtoId.value;
  if (!id) return;
  const nome = produtoNome ? produtoNome.value.trim() : '';
  showConfirm(
    'Excluir produto',
    'Deseja excluir "' + (nome || 'este produto') + '"? Esta ação não pode ser desfeita.',
    'Excluir',
    function() {
      fetch('api/produtos_delete.php', {
        method: 'POST',
        body: new URLSearchParams({ id })
      })
        .then(r => r.json())
        .then(resp => {
          if (resp.ok) {
            modalProduto.hide();
            window.location.reload();
          } else {
            toast('Erro ao deletar produto');
          }
        })
        .catch(() => toast('Erro ao deletar produto'));
    }
  );
}

/* ===== ATUALIZAR LISTA ===== */
function atualizarTabela(){
  window.location.reload();
}

/* ===== TRANSFERIR PRODUTO ===== */
let _modalTransferirProduto;
function abrirTransferirProduto(){
  const id = produtoId ? produtoId.value : '';
  if (!id) { toast('Salve o produto antes de transferir.'); return; }
  const catAtual = produtoCategoria ? String(produtoCategoria.value) : '';
  document.querySelectorAll('.transferir-item').forEach(item => {
    item.querySelector('input').checked = false;
    item.classList.toggle('atual', item.dataset.catId === catAtual);
  });
  if (!_modalTransferirProduto) {
    _modalTransferirProduto = new bootstrap.Modal(document.getElementById('modalTransferirProduto'), { backdrop: false });
  }
  _modalTransferirProduto.show();
}
function fecharTransferirProduto(){
  if (_modalTransferirProduto) _modalTransferirProduto.hide();
}
function confirmarTransferencia(){
  const id = produtoId ? produtoId.value : '';
  const sel = document.querySelector('input[name="transferir_cat"]:checked');
  if (!sel) { toast('Selecione uma categoria de destino.'); return; }
  fetch('api/produto_transferir.php', {
    method: 'POST',
    body: new URLSearchParams({ id, categoria_id: sel.value })
  })
    .then(r => r.json())
    .then(resp => {
      if (resp.ok) {
        fecharTransferirProduto();
        modalProduto.hide();
        toast('Produto transferido com sucesso!');
        setTimeout(() => window.location.reload(), 700);
      } else {
        toast(resp.msg || 'Erro ao transferir produto.');
      }
    })
    .catch(() => toast('Erro ao transferir produto.'));
}

/* ===== DUPLICAR PRODUTO ===== */
function duplicarProduto(){
  const id = produtoId ? produtoId.value : '';
  const nome = produtoNome ? produtoNome.value.trim() : '';
  if (!id) { toast('Salve o produto antes de duplicar.'); return; }
  showConfirm(
    'Duplicar produto',
    'Deseja duplicar "' + (nome || 'este produto') + '"? Uma cópia será criada na mesma categoria.',
    'Duplicar',
    function(){
      fetch('api/produto_duplicar.php', {
        method: 'POST',
        body: new URLSearchParams({ id })
      })
        .then(r => r.json())
        .then(resp => {
          if (resp.ok) {
            modalProduto.hide();
            toast('Produto duplicado com sucesso!');
            setTimeout(() => window.location.reload(), 700);
          } else {
            toast(resp.msg || 'Erro ao duplicar produto.');
          }
        })
        .catch(() => toast('Erro ao duplicar produto.'));
    }
  );
}
/* ================================================================
   COMBO WIZARD
   ================================================================ */
var _cwComboModal, _cwPassoModal, _cwOpcoesModal;
function _getModalEl(id) { return document.getElementById(id); }
function _getCwCombo()  { if(!_cwComboModal)  _cwComboModal  = new bootstrap.Modal(_getModalEl('modalCriandoCombo'),{backdrop:'static'}); return _cwComboModal; }
function _getCwPasso()  { if(!_cwPassoModal)  _cwPassoModal  = new bootstrap.Modal(_getModalEl('modalCriandoPasso'),{backdrop:'static',keyboard:false}); return _cwPassoModal; }
function _getCwOpcoes() { if(!_cwOpcoesModal) _cwOpcoesModal = new bootstrap.Modal(_getModalEl('modalSelecionarOpcoes')); return _cwOpcoesModal; }

var cwState = {
  step:1, comboId:null, categoriaId:'',
  nome:'', descricao:'', imagemBase64:null,
  tipoPreco:'por_combo', preco:0, precoPromo:null, promoAtiva:false,
  passos:[]
};
var cwPassoState = {
  step:1, passoId:null,
  nome:'', descricao:'',
  obrigatorio:1, minItens:1, maxItens:1, permiteRepetir:0,
  opcoes:[]
};
var cwOpcoesState = {
  produtos:[], filtered:[], categorias:[],
  selectedIds:[], loaded:false
};

/* ----- open/reset ----- */
function abrirModalCombo(categoriaId) {
  cwState = {step:1, comboId:null, categoriaId:categoriaId||'', nome:'', descricao:'', imagemBase64:null, tipoPreco:'por_combo', preco:0, precoPromo:null, promoAtiva:false, passos:[]};
  _cwComboRender(1);
  _getCwCombo().show();
}
function editarCombo(id) {
  fetch('api/combo_get.php?id=' + id)
    .then(function(r){ return r.json(); })
    .then(function(resp){
      if(!resp.ok){ toast(resp.msg||'Erro ao carregar combo'); return; }
      var c = resp.combo;
      ecState = {
        comboId: c.id,
        categoriaId: c.categoria_id||'',
        nome: c.nome,
        descricao: c.descricao||'',
        imagemBase64: null, imagemRemover: false, imagemAtual: c.imagem||null,
        tipoPreco: c.tipo_preco||'por_combo',
        preco: parseFloat(c.preco)||0,
        precoPromo: c.preco_promocional ? parseFloat(c.preco_promocional) : null,
        promoAtiva: !parseInt(c.promo_desativado) && parseFloat(c.preco_promocional)>0,
        ativo: parseInt(c.ativo),
        passos: resp.passos.map(function(p){
          return {
            id: p.id, nome: p.nome, descricao: p.descricao||'',
            obrigatorio: parseInt(p.obrigatorio),
            minItens: parseInt(p.min_itens), maxItens: parseInt(p.max_itens),
            permiteRepetir: parseInt(p.permite_repetir), opcoes: p.opcoes
          };
        })
      };
      document.getElementById('ecTitulo').textContent = c.nome;
      document.getElementById('ecNome').value = c.nome;
      document.getElementById('ecDescricao').value = c.descricao||'';
      document.getElementById('ecAtivo').checked = parseInt(c.ativo)===1;
      var prev = document.getElementById('ecImagemPreview');
      var icon = document.getElementById('ecImagemIcon');
      if(c.imagem){ if(prev){prev.src=c.imagem;prev.style.display='block';} if(icon) icon.style.display='none'; }
      else { if(prev){prev.src='';prev.style.display='none';} if(icon) icon.style.display=''; }
      ecSetTipoPreco(c.tipo_preco||'por_combo');
      var precoEl = document.getElementById('ecPreco');
      var promoEl = document.getElementById('ecPrecoPromo');
      var promoTog = document.getElementById('ecPromoToggle');
      var promoFld = document.getElementById('ecPromoField');
      if(precoEl) precoEl.value = ecState.preco > 0 ? ecState.preco.toFixed(2).replace('.',',') : '0,00';
      if(ecState.promoAtiva){
        if(promoTog) promoTog.checked=true;
        if(promoFld) promoFld.classList.remove('d-none');
        if(promoEl && ecState.precoPromo) promoEl.value = ecState.precoPromo.toFixed(2).replace('.',',');
      } else {
        if(promoTog) promoTog.checked=false;
        if(promoFld) promoFld.classList.add('d-none');
        if(promoEl) promoEl.value = '0,00';
      }
      ecSwitchTab('info');
      _getEcModal().show();
    })
    .catch(function(){ toast('Erro ao carregar combo'); });
}
function deletarCombo(id, btn) {
  showConfirm('Excluir combo', 'Esta ação não pode ser desfeita.', 'Excluir', function(){
    btn.disabled = true;
    fetch('api/combo_delete.php', {method:'POST', body: new URLSearchParams({combo_id:id})})
      .then(r=>r.json()).then(resp=>{
        if(resp.ok){ window.location.reload(); }
        else{ toast(resp.msg||'Erro ao excluir combo'); btn.disabled=false; }
      }).catch(()=>{ toast('Erro de comunicação'); btn.disabled=false; });
  });
}

/* ----- render combo step ----- */
function _cwComboRender(step) {
  cwState.step = step;
  var bars = {1:'#7c3aed', 2:'linear-gradient(to right,#9C5523 60%,#7c3aed 60%)', 3:'#9C5523'};
  var descs = {
    1:'Defina as informações principais do combo.',
    2:'Configure o valor de venda do combo.',
    3:'Monte os passos e produtos que compõem o combo.'
  };
  var icons = {1:'bi-file-earmark-text', 2:'bi-tag', 3:'bi-layers'};
  document.getElementById('cwComboCounter').textContent = step+'/3';
  document.getElementById('cwComboBar').style.background = bars[step];
  document.getElementById('cwComboDesc').textContent = descs[step];
  for(var i=1;i<=3;i++){
    var tab = document.getElementById('cwComboTab'+i);
    tab.classList.remove('active','done');
    var ic = tab.querySelector('.cwp-tab-icon i');
    if(i<step){ tab.classList.add('done'); ic.className='bi bi-check-lg'; }
    else if(i===step){ tab.classList.add('active'); ic.className='bi '+icons[i]; }
    else{ ic.className='bi '+icons[i]; }
    document.getElementById('cwComboStep'+i).classList.toggle('d-none', i!==step);
  }
  var btn    = document.getElementById('cwComboBtnAvancar');
  var btnSec = document.getElementById('cwComboBtnSecundario');
  if(step===3){
    btn.textContent='Finalizar criação de combo'; btn.onclick=_cwFinalizarCombo;
    btnSec.textContent='Criar passo'; btnSec.onclick=_cwAbrirPasso; btnSec.classList.remove('d-none');
  } else {
    btn.textContent='Salvar e avançar'; btn.onclick=_cwComboAvancar;
    btnSec.classList.add('d-none');
  }
  // Pre-fill step 2 fields when arriving with existing data
  if(step===2){
    var precoEl2 = document.getElementById('cwComboPreco');
    var promoEl2 = document.getElementById('cwComboPrecoPromo');
    var promoTog2 = document.getElementById('cwComboPromoToggle');
    var promoFld2 = document.getElementById('cwComboPromoField');
    if(precoEl2) precoEl2.value = cwState.preco > 0 ? cwState.preco.toFixed(2).replace('.',',') : '0,00';
    if(cwState.promoAtiva){
      if(promoTog2) promoTog2.checked = true;
      if(promoFld2) promoFld2.classList.remove('d-none');
      if(promoEl2 && cwState.precoPromo) promoEl2.value = parseFloat(cwState.precoPromo).toFixed(2).replace('.',',');
    } else {
      if(promoTog2) promoTog2.checked = false;
      if(promoFld2) promoFld2.classList.add('d-none');
      if(promoEl2) promoEl2.value = '0,00';
    }
    // Sync pricing type card UI
    document.querySelectorAll('.combo-preco-card').forEach(function(card){
      card.classList.toggle('active', card.dataset.tipo===cwState.tipoPreco);
    });
    var cc = document.getElementById('cwPorComboCheck');
    var ci = document.getElementById('cwPorItemCheck');
    if(cc) cc.className = cwState.tipoPreco==='por_combo' ? 'bi bi-check-circle-fill' : 'bi bi-circle';
    if(ci) ci.className = cwState.tipoPreco==='por_item'  ? 'bi bi-check-circle-fill' : 'bi bi-circle';
    var pCampo = document.getElementById('cwComboPrecoCampo');
    if(pCampo) pCampo.classList.toggle('d-none', cwState.tipoPreco==='por_item');
  }
  if(step===3) _cwRenderPassos();
}

/* ----- combo step advance ----- */
function _cwComboAvancar() {
  if(cwState.step===1){
    var nome = document.getElementById('cwComboNome').value.trim();
    if(!nome){ toast('Informe o nome do combo.'); return; }
    cwState.nome = nome;
    cwState.descricao = document.getElementById('cwComboDescricao').value.trim();
    _cwComboRender(2);
  } else if(cwState.step===2){
    var precoRaw = document.getElementById('cwComboPreco').value.replace(/\./g,'').replace(',','.');
    cwState.preco = parseFloat(precoRaw)||0;
    if(cwState.tipoPreco==='por_combo' && cwState.preco<=0){ toast('Informe um preço válido.'); return; }
    if(cwState.promoAtiva){
      var pr = document.getElementById('cwComboPrecoPromo').value.replace(/\./g,'').replace(',','.');
      cwState.precoPromo = parseFloat(pr)||0;
    } else { cwState.precoPromo = null; }
    _cwSalvarCombo();
  }
}

function _cwSalvarCombo() {
  var btn = document.getElementById('cwComboBtnAvancar');
  btn.disabled=true; btn.textContent='Salvando...';
  var fd = new FormData();
  if(cwState.comboId) fd.append('id', cwState.comboId);
  fd.append('categoria_id', cwState.categoriaId);
  fd.append('nome', cwState.nome);
  fd.append('descricao', cwState.descricao);
  fd.append('tipo_preco', cwState.tipoPreco);
  fd.append('preco', cwState.preco);
  if(cwState.precoPromo!=null) fd.append('preco_promocional', cwState.precoPromo);
  fd.append('promo_desativado', cwState.promoAtiva ? 0 : 1);
  if(cwState.imagemBase64) fd.append('imagem_base64', cwState.imagemBase64);
  fetch('api/combo_save.php',{method:'POST',body:fd})
    .then(r=>r.json()).then(resp=>{
      btn.disabled=false;
      if(resp.ok){ cwState.comboId=resp.combo_id; _cwComboRender(3); }
      else{ toast(resp.msg||'Erro ao salvar combo.'); btn.textContent='Salvar e avançar'; }
    }).catch(()=>{ btn.disabled=false; btn.textContent='Salvar e avançar'; toast('Erro de comunicação.'); });
}

/* ----- passos list ----- */
function _cwRenderPassos() {
  var c = document.getElementById('cwComboPassosList');
  if(!c) return;
  if(cwState.passos.length===0){
    c.innerHTML='<div class="combo-empty-passos"><i class="bi bi-layers"></i><p>Nenhum passo configurado</p><p>Configure as etapas do combo para definir as opções de escolha</p></div>';
    return;
  }
  var ordenar = '<div class="text-end mb-2"><button class="btn btn-link btn-sm p-0 text-muted" style="font-size:12px;text-decoration:none" onclick="void(0)"><i class="bi bi-arrow-down-up me-1"></i>Ordenar passos</button></div>';
  var rows = cwState.passos.map(function(p,i){
    var meta = p.minItens+'-'+p.maxItens+' iten'+(p.maxItens>1?'s':'')+'s • '+p.opcoes.length+' opç'+(p.opcoes.length===1?'ão':'ões')+' disponíve'+(p.opcoes.length===1?'l':'is');
    return '<div class="combo-passo-item" style="cursor:pointer">'
      +'<div class="combo-passo-item-info"><div class="combo-passo-item-nome">'+_cwEsc(p.nome)+'</div>'
      +'<div class="combo-passo-item-meta">'+meta+'</div></div>'
      +'<i class="bi bi-chevron-right text-muted" style="font-size:12px"></i>'
      +'</div>';
  }).join('');
  c.innerHTML = ordenar + rows;
}

function _cwFinalizarCombo() {
  if(!cwState.comboId){ toast('Salve o combo primeiro.'); return; }
  _getCwCombo().hide();
  window.location.reload();
}

function _cwDeletarPasso(idx) {
  var p = cwState.passos[idx];
  if(!p) return;
  showConfirm('Remover passo', 'O passo "' + (p.nome||'') + '" será removido do combo.', 'Remover', function() {
    if(p.id){
      fetch('api/combo_passo_delete.php',{method:'POST',body:new URLSearchParams({passo_id:p.id})})
        .then(r=>r.json()).then(resp=>{
          if(resp.ok){ cwState.passos.splice(idx,1); _cwRenderPassos(); }
          else toast(resp.msg||'Erro ao deletar passo');
        }).catch(()=>toast('Erro de comunicação'));
    } else {
      cwState.passos.splice(idx,1); _cwRenderPassos();
    }
  });
}

/* ================================================================
   PASSO WIZARD
   ================================================================ */
function _cwAbrirPasso() {
  cwPassoState = {step:1, passoId:null, nome:'', descricao:'', obrigatorio:1, minItens:1, maxItens:1, permiteRepetir:0, opcoes:[]};
  _cwPassoRender(1);
  _getCwPasso().show();
  _getModalEl('modalCriandoPasso').addEventListener('shown.bs.modal', function(){
    _getModalEl('modalCriandoPasso').style.zIndex='1070';
    var bds = document.querySelectorAll('.modal-backdrop');
    if(bds.length>0) bds[bds.length-1].style.zIndex='1065';
    document.body.classList.add('modal-open');
  },{once:true});
}

function _cwPassoRender(step) {
  cwPassoState.step = step;
  var bars = {1:'#7c3aed', 2:'linear-gradient(to right,#9C5523 60%,#7c3aed 60%)', 3:'#9C5523'};
  var icons = {1:'bi-file-earmark-text', 2:'bi-arrow-down-up', 3:'bi-bag'};
  document.getElementById('cwPassoCounter').textContent = step+'/3';
  document.getElementById('cwPassoBar').style.background = bars[step];
  for(var i=1;i<=3;i++){
    var tab = document.getElementById('cwPassoTab'+i);
    tab.classList.remove('active','done');
    var ic = tab.querySelector('.cwp-tab-icon i');
    if(i<step){ tab.classList.add('done'); ic.className='bi bi-check-lg'; }
    else if(i===step){ tab.classList.add('active'); ic.className='bi '+icons[i]; }
    else{ ic.className='bi '+icons[i]; }
    document.getElementById('cwPassoStep'+i).classList.toggle('d-none', i!==step);
  }
  var btn        = document.getElementById('cwPassoBtnAvancar');
  var btnAdcionar = document.getElementById('cwPassoBtnAdcionar');
  if(step<3){
    btn.textContent='Avançar para o próximo passo'; btn.onclick=_cwPassoAvancar;
    btnAdcionar.classList.add('d-none');
  } else {
    btn.textContent='Finalizar criação de passo'; btn.onclick=_cwFinalizarPasso;
    btn.disabled = cwPassoState.opcoes.length===0;
    btnAdcionar.classList.remove('d-none');
    _cwRenderPassoOpcoes();
  }
}

function _cwPassoAvancar() {
  if(cwPassoState.step===1){
    var nome = document.getElementById('cwPassoNome').value.trim();
    if(!nome){ toast('Informe o nome do passo.'); return; }
    cwPassoState.nome = nome;
    cwPassoState.descricao = document.getElementById('cwPassoDescricao').value.trim();
    _cwPassoRender(2);
  } else if(cwPassoState.step===2){
    cwPassoState.obrigatorio = document.getElementById('cwPassoObrigatorio').checked ? 1 : 0;
    cwPassoState.minItens = parseInt(document.getElementById('cwPassoMin').value)||0;
    cwPassoState.maxItens = parseInt(document.getElementById('cwPassoMax').value)||1;
    if(cwPassoState.obrigatorio && cwPassoState.minItens<1) cwPassoState.minItens=1;
    if(cwPassoState.minItens>cwPassoState.maxItens){ toast('A quantidade mínima não pode ser maior que a máxima.'); return; }
    cwPassoState.permiteRepetir = document.getElementById('cwPassoRepetir').checked ? 1 : 0;
    _cwPassoRender(3);
  }
}

function _cwRenderPassoOpcoes() {
  var c = document.getElementById('cwPassoOpcoes');
  if(!c) return;
  var btnFinalizar = document.getElementById('cwPassoBtnAvancar');
  if(cwPassoState.opcoes.length===0){
    c.innerHTML='<div class="combo-empty-passos"><i class="bi bi-bag"></i>'
      +'<p>Nenhuma opção vinculada neste passo</p>'
      +'<p>Adicione pelo menos um item (produto) às opções do combo para continuar.</p></div>'
      +'<div class="p-3 rounded" style="background:#fffbeb;border:1px solid #fde68a;font-size:12px;color:#92400e">'
      +'<strong>Para finalizar a criação</strong><br>'
      +'Você precisa <strong>adicionar pelo menos uma opção</strong> neste passo. Clique em <strong>Adicionar opções</strong> para continuar.'
      +'</div>';
    if(btnFinalizar) btnFinalizar.disabled=true;
  } else {
    var grid = cwPassoState.opcoes.map(function(o){
      var thumb = o.imagem
        ? '<img src="'+_cwEsc(o.imagem)+'" style="width:48px;height:48px;border-radius:10px;object-fit:cover;flex-shrink:0">'
        : '<div style="width:48px;height:48px;border-radius:10px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="bi bi-bag" style="color:#9ca3af"></i></div>';
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:#f8f9fa;border:1px solid #e5e7eb;border-radius:10px">'
        +thumb
        +'<span style="font-size:12px;font-weight:500;line-height:1.3">'+_cwEsc(o.nome)+'</span>'
        +'</div>';
    }).join('');
    c.innerHTML='<div class="fw-semibold mb-2" style="font-size:13px">Opções vinculadas neste passo</div>'
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'+grid+'</div>';
    if(btnFinalizar) btnFinalizar.disabled=false;
  }
}

function _cwFinalizarPasso() {
  if(cwPassoState.opcoes.length===0){ toast('Adicione pelo menos uma opção ao passo.'); return; }
  var btn = document.getElementById('cwPassoBtnAvancar');
  btn.disabled=true; btn.textContent='Salvando...';
  var comboId = cwPassoState.fromEditModal ? ecState.comboId : cwState.comboId;
  var fd = new FormData();
  if(cwPassoState.passoId) fd.append('passo_id', cwPassoState.passoId);
  fd.append('combo_id', comboId);
  fd.append('nome', cwPassoState.nome);
  fd.append('descricao', cwPassoState.descricao);
  fd.append('obrigatorio', cwPassoState.obrigatorio);
  fd.append('min_itens', cwPassoState.minItens);
  fd.append('max_itens', cwPassoState.maxItens);
  fd.append('permite_repetir', cwPassoState.permiteRepetir);
  fd.append('produto_ids', cwPassoState.opcoes.map(function(o){return o.id;}).join(','));
  fetch('api/combo_passo_save.php',{method:'POST',body:fd})
    .then(r=>r.json()).then(resp=>{
      btn.disabled=false;
      if(resp.ok){
        var novoPasso = {id:resp.passo_id, nome:cwPassoState.nome, descricao:cwPassoState.descricao, obrigatorio:cwPassoState.obrigatorio, minItens:cwPassoState.minItens, maxItens:cwPassoState.maxItens, permiteRepetir:cwPassoState.permiteRepetir, opcoes:cwPassoState.opcoes.slice()};
        _getCwPasso().hide();
        if(cwPassoState.fromEditModal){
          ecState.passos.push(novoPasso);
          ecRenderPassos();
          setTimeout(function(){
            document.body.classList.add('modal-open');
            document.getElementById('modalEditarCombo').style.zIndex='1055';
          },100);
        } else {
          cwState.passos.push(novoPasso);
          _cwRenderPassos();
          setTimeout(function(){
            document.body.classList.add('modal-open');
            _getModalEl('modalCriandoCombo').style.zIndex='1055';
          },100);
        }
      } else { toast(resp.msg||'Erro ao salvar passo.'); btn.disabled=false; btn.textContent='Finalizar criação de passo'; }
    }).catch(()=>{ btn.disabled=false; btn.textContent='Finalizar criação de passo'; toast('Erro de comunicação.'); });
}

/* ================================================================
   OPCOES PICKER
   ================================================================ */
function _cwAbrirOpcoes() {
  cwOpcoesState.fromEditPasso = false;
  cwOpcoesState.selectedIds = cwPassoState.opcoes.map(function(o){return o.id;});
  // Garante campos habilitados antes de abrir
  var srch = document.getElementById('cwOpcoesSearch');
  var catF = document.getElementById('cwOpcoesCatFiltro');
  if(srch){ srch.disabled=false; srch.value=''; }
  if(catF){ catF.disabled=false; catF.value='0'; }
  _getCwOpcoes().show();
  _getModalEl('modalSelecionarOpcoes').addEventListener('shown.bs.modal', function(){
    _getModalEl('modalSelecionarOpcoes').style.zIndex='1085';
    var bds = document.querySelectorAll('.modal-backdrop');
    if(bds.length>0) bds[bds.length-1].style.zIndex='1080';
    document.body.classList.add('modal-open');
    _cwCarregarOpcoesProdutos();
  },{once:true});
}

function _cwCarregarOpcoesProdutos() {
  var c = document.getElementById('cwOpcoesGrid');
  if(c) c.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:32px 0"><div class="spinner-border spinner-border-sm" style="color:#9C5523"></div></div>';
  fetch('api/combo_opcoes_produtos.php')
    .then(function(r){ return r.json(); })
    .then(function(resp){
      if(resp.ok){
        cwOpcoesState.produtos   = resp.produtos   || [];
        cwOpcoesState.filtered   = resp.produtos   || [];
        cwOpcoesState.categorias = resp.categorias || [];
        cwOpcoesState.loaded     = true;

        // Popula o select de categorias diretamente
        var sel = document.getElementById('cwOpcoesCatFiltro');
        if(sel){
          var opts = '<option value="0">Filtrar por categoria</option>';
          cwOpcoesState.categorias.forEach(function(cat){
            opts += '<option value="' + cat.id + '">' + String(cat.nome||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</option>';
          });
          sel.innerHTML = opts;
        }

        _cwRenderOpcoesGrid();
        _cwAtualizarContador();
      } else {
        if(c) c.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:32px 0;color:#9ca3af;font-size:13px">Erro ao carregar produtos</div>';
      }
    })
    .catch(function(){
      if(c) c.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:32px 0;color:#9ca3af;font-size:13px">Erro de comunicação</div>';
    });
}

function _cwPopulateCatFilter() {
  var sel = document.getElementById('cwOpcoesCatFiltro');
  sel.innerHTML = '<option value="0">Filtrar por categoria</option>'
    + cwOpcoesState.categorias.map(function(c){ return '<option value="'+c.id+'">'+_cwEsc(c.nome)+'</option>'; }).join('');
}

function _cwFiltrarOpcoes() {
  var search = (document.getElementById('cwOpcoesSearch').value||'').toLowerCase();
  var catId  = parseInt(document.getElementById('cwOpcoesCatFiltro').value)||0;
  cwOpcoesState.filtered = cwOpcoesState.produtos.filter(function(p){
    var mS = !search || p.nome.toLowerCase().indexOf(search)>=0;
    var mC = !catId  || p.categoria_id==catId;
    return mS && mC;
  });
  _cwRenderOpcoesGrid();
}

function _cwRenderOpcoesGrid() {
  var c = document.getElementById('cwOpcoesGrid');
  var prods = cwOpcoesState.filtered;
  if(!prods.length){ c.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:32px 0;color:#9ca3af;font-size:13px">Nenhum produto encontrado</div>'; return; }
  c.innerHTML = prods.map(function(p){
    var sel = cwOpcoesState.selectedIds.indexOf(p.id)>=0;
    var thumb = p.imagem
      ? '<img src="'+_cwEsc(p.imagem)+'" alt="">'
      : '<div class="opcoes-item-thumb"><i class="bi bi-bag"></i></div>';
    return '<div class="opcoes-item'+(sel?' selected':'')+'" data-id="'+p.id+'" onclick="_cwToggleOpcao(this,'+p.id+')">'
      +thumb
      +'<span class="opcoes-item-name">'+_cwEsc(p.nome)+'</span>'
      +'<div class="opcoes-item-check">'+(sel?'<i class="bi bi-check" style="font-size:11px"></i>':'')+'</div>'
      +'</div>';
  }).join('');
}

function _cwToggleOpcao(el, id) {
  var idx = cwOpcoesState.selectedIds.indexOf(id);
  if(idx>=0){
    cwOpcoesState.selectedIds.splice(idx,1);
    el.classList.remove('selected');
    el.querySelector('.opcoes-item-check').innerHTML='';
  } else {
    cwOpcoesState.selectedIds.push(id);
    el.classList.add('selected');
    el.querySelector('.opcoes-item-check').innerHTML='<i class="bi bi-check" style="font-size:11px"></i>';
  }
  _cwAtualizarContador();
}

function _selecionarTodasOpcoes() {
  cwOpcoesState.filtered.forEach(function(p){
    if(cwOpcoesState.selectedIds.indexOf(p.id)<0) cwOpcoesState.selectedIds.push(p.id);
  });
  _cwRenderOpcoesGrid(); _cwAtualizarContador();
}

function _desmarcarTodasOpcoes() {
  var filteredIds = cwOpcoesState.filtered.map(function(p){ return p.id; });
  cwOpcoesState.selectedIds = cwOpcoesState.selectedIds.filter(function(id){
    return filteredIds.indexOf(id) < 0;
  });
  _cwRenderOpcoesGrid(); _cwAtualizarContador();
}

function _cwAtualizarContador() {
  var el = document.getElementById('cwOpcoesContador');
  if(el) el.textContent = cwOpcoesState.selectedIds.length > 0
    ? cwOpcoesState.selectedIds.length+' selecionado(s)'
    : '';
}

function _salvarOpcoesEscolhidas() {
  var opcoesSelecionadas = cwOpcoesState.selectedIds.map(function(id){
    var p = cwOpcoesState.produtos.find(function(x){return x.id==id;});
    return p ? {id:p.id, nome:p.nome, preco:p.preco, imagem:p.imagem} : null;
  }).filter(Boolean);

  // Captura o contexto ANTES de esconder o modal (listeners de hidden podem mudar o estado)
  var isFromEditPasso  = cwOpcoesState.fromEditPasso;
  var isFromEditModal  = cwPassoState.fromEditModal;

  document.getElementById('modalSelecionarOpcoes').addEventListener('hidden.bs.modal', function() {
    document.body.classList.add('modal-open');

    if (isFromEditPasso) {
      cwOpcoesState.fromEditPasso = false;
      _epState.opcoes = opcoesSelecionadas;
      epRenderOpcoes();
      document.getElementById('modalEditarPasso').style.zIndex = '1070';
      var bds = document.querySelectorAll('.modal-backdrop');
      if (bds.length > 0) bds[bds.length - 1].style.zIndex = '1065';
    } else {
      cwPassoState.opcoes = opcoesSelecionadas;
      _cwRenderPassoOpcoes();
      // Restaura z-index correto conforme origem do modal
      var mZi = isFromEditModal ? '1080' : '1055';
      var bZi = isFromEditModal ? '1075' : '1040';
      document.getElementById('modalCriandoPasso').style.zIndex = mZi;
      var bds = document.querySelectorAll('.modal-backdrop');
      if (bds.length > 0) bds[bds.length - 1].style.zIndex = bZi;
      var btn = document.getElementById('cwPassoBtnAvancar');
      if (btn && cwPassoState.opcoes.length > 0) btn.disabled = false;
    }
  }, { once: true });

  _getCwOpcoes().hide();
}

function _opcoesTab(btn, type) {
  document.querySelectorAll('.opcoes-picker-tab').forEach(function(t){t.classList.remove('active');});
  btn.classList.add('active');
  if (type === 'produtos') {
    var srch = document.getElementById('cwOpcoesSearch');
    var catF = document.getElementById('cwOpcoesCatFiltro');
    if (srch) { srch.disabled = false; srch.value = ''; }
    if (catF) { catF.disabled = false; catF.value = '0'; }
    if (cwOpcoesState.loaded) {
      cwOpcoesState.filtered = cwOpcoesState.produtos.slice();
      _cwRenderOpcoesGrid();
      _cwAtualizarContador();
    }
  }
}
function _opcoesTabEmBreve(btn) {
  _opcoesTab(btn, 'embreve');
  document.getElementById('cwOpcoesGrid').innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#9ca3af;font-size:13px"><i class="bi bi-clock" style="font-size:28px;display:block;margin-bottom:10px"></i>Em breve</div>';
  document.getElementById('cwOpcoesSearch').disabled=true;
  document.getElementById('cwOpcoesCatFiltro').disabled=true;
}

/* ----- money mask ----- */
function _cwMoneyMask(el) {
  el.addEventListener('input', function(){
    var v = this.value.replace(/\D/g,'');
    if(!v){ this.value='0,00'; return; }
    v = parseInt(v,10).toString();
    while(v.length<3) v='0'+v;
    var cents = v.slice(-2);
    var reais = v.slice(0,-2).replace(/(\d)(?=(\d{3})+$)/g,'$1.');
    this.value = reais+','+cents;
  });
}

function _cwEsc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _escurecerBackdropAninhado() {
  var bds = document.querySelectorAll('.modal-backdrop');
  if (bds.length > 0) bds[bds.length - 1].style.zIndex = '1060';
}

function _atualizarResumoComplementoPreco() {
  var el = document.getElementById('complementoPrecoResumo');
  if (!el) return;
  var n = complementosPrecoAtual.length;
  el.textContent = n
    ? (n + (n === 1 ? ' tipo cadastrado.' : ' tipos cadastrados.'))
    : 'Nenhum tipo cadastrado.';
}

/* ----- DOMContentLoaded wiring ----- */
document.addEventListener('DOMContentLoaded', function(){
  // Money masks
  var precoEl = document.getElementById('cwComboPreco');
  var promoEl = document.getElementById('cwComboPrecoPromo');
  if(precoEl) _cwMoneyMask(precoEl);
  if(promoEl) _cwMoneyMask(promoEl);

  // Image upload
  var imgArea  = document.getElementById('cwComboImagemArea');
  var imgBtn   = document.getElementById('cwComboImagemBtn');
  var imgInput = document.getElementById('cwComboImagemInput');
  var imgPrev  = document.getElementById('cwComboImagemPreview');
  var imgIcon  = document.getElementById('cwComboImagemIcon');
  if(imgArea) imgArea.addEventListener('click', function(){ imgInput && imgInput.click(); });
  if(imgBtn)  imgBtn.addEventListener('click', function(e){ e.stopPropagation(); imgInput && imgInput.click(); });
  if(imgInput) imgInput.addEventListener('change', function(){
    var file = this.files[0]; if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      cwState.imagemBase64 = ev.target.result;
      imgPrev.src = ev.target.result; imgPrev.style.display='block';
      if(imgIcon) imgIcon.style.display='none';
    };
    reader.readAsDataURL(file);
  });

  // Pricing type cards
  document.querySelectorAll('.combo-preco-card').forEach(function(card){
    card.addEventListener('click', function(){
      document.querySelectorAll('.combo-preco-card').forEach(function(c){ c.classList.remove('active'); });
      this.classList.add('active');
      cwState.tipoPreco = this.dataset.tipo;
      document.getElementById('cwPorComboCheck').className = cwState.tipoPreco==='por_combo' ? 'bi bi-check-circle-fill' : 'bi bi-circle';
      document.getElementById('cwPorItemCheck').className  = cwState.tipoPreco==='por_item'  ? 'bi bi-check-circle-fill' : 'bi bi-circle';
      document.getElementById('cwComboPrecoCampo').classList.toggle('d-none', cwState.tipoPreco==='por_item');
    });
  });

  // Promo toggle
  var promoTog = document.getElementById('cwComboPromoToggle');
  var promoFld = document.getElementById('cwComboPromoField');
  if(promoTog) promoTog.addEventListener('change', function(){
    cwState.promoAtiva = this.checked;
    if(promoFld) promoFld.classList.toggle('d-none', !this.checked);
  });

  // Passo obrigatorio toggle
  var passoObr = document.getElementById('cwPassoObrigatorio');
  if(passoObr) passoObr.addEventListener('change', function(){
    var desc = document.getElementById('cwPassoObrigatorioDesc');
    if(desc) desc.textContent = this.checked
      ? 'Sim, o cliente deve selecionar pelo menos um item.'
      : 'Não, o cliente pode pular este passo.';
    var minEl = document.getElementById('cwPassoMin');
    if(!this.checked && minEl) minEl.value = 0;
    else if(this.checked && minEl && parseInt(minEl.value)<1) minEl.value=1;
  });

  // Opcoes search/filter
  var srch = document.getElementById('cwOpcoesSearch');
  var catF = document.getElementById('cwOpcoesCatFiltro');
  if(srch) srch.addEventListener('input', _cwFiltrarOpcoes);
  if(catF) catF.addEventListener('change', _cwFiltrarOpcoes);

  // Passo close button
  var passFechar = document.getElementById('cwPassoBtnFechar');
  if(passFechar) passFechar.addEventListener('click', function(){
    _getCwPasso().hide();
    setTimeout(function(){
      document.body.classList.add('modal-open');
      if(cwPassoState.fromEditModal){
        document.getElementById('modalEditarCombo').style.zIndex='1055';
      } else {
        _getModalEl('modalCriandoCombo').style.zIndex='1055';
      }
    },200);
  });

  // Combo modal closed: reset instances so they're re-created fresh
  var comboModalEl = _getModalEl('modalCriandoCombo');
  if(comboModalEl) comboModalEl.addEventListener('hidden.bs.modal', function(){
    _cwComboModal = null;
  });
  var passoModalEl = _getModalEl('modalCriandoPasso');
  if(passoModalEl) passoModalEl.addEventListener('hidden.bs.modal', function(){
    _cwPassoModal = null;
  });
  var opcoesModalEl = _getModalEl('modalSelecionarOpcoes');
  if(opcoesModalEl) opcoesModalEl.addEventListener('hidden.bs.modal', function(){
    _cwOpcoesModal = null;
    // Reseta estado para forçar reload dos produtos na próxima abertura
    cwOpcoesState.loaded = false;
    cwOpcoesState.produtos = [];
    cwOpcoesState.filtered = [];
    cwOpcoesState.categorias = [];
    // Reseta apenas os campos de busca (NÃO o select — suas opções vêm do PHP)
    var catF = document.getElementById('cwOpcoesCatFiltro');
    if(catF) catF.value = '0';
    var srch = document.getElementById('cwOpcoesSearch');
    if(srch) { srch.value = ''; srch.disabled = false; }
  });
});

/* ================================================================
   EDIT COMBO MODAL (ec*)
   ================================================================ */
var _ecComboModal, _epPassoModal;
function _getEcModal(){
  if(!_ecComboModal) _ecComboModal = new bootstrap.Modal(document.getElementById('modalEditarCombo'),{backdrop:'static'});
  return _ecComboModal;
}
function _getEpModal(){
  if(!_epPassoModal) _epPassoModal = new bootstrap.Modal(document.getElementById('modalEditarPasso'),{backdrop:'static',keyboard:false});
  return _epPassoModal;
}

var ecState = {
  comboId:null, categoriaId:'',
  nome:'', descricao:'',
  imagemBase64:null, imagemRemover:false, imagemAtual:null,
  tipoPreco:'por_combo', preco:0, precoPromo:null, promoAtiva:false,
  ativo:1, passos:[]
};

var _epState = {
  idx:-1, passoId:null,
  nome:'', descricao:'',
  obrigatorio:1, minItens:1, maxItens:1, permiteRepetir:0,
  opcoes:[]
};

function ecSwitchTab(tab){
  ['info','preco','passos'].forEach(function(t){
    var cap = t.charAt(0).toUpperCase()+t.slice(1);
    var btn  = document.getElementById('ecTabBtn'+cap);
    var pane = document.getElementById('ecTab'+cap);
    if(btn)  btn.classList.toggle('active', t===tab);
    if(pane) pane.classList.toggle('d-none', t!==tab);
  });
  var excluirBtn = document.getElementById('ecBtnExcluirCombo');
  var criarBtn   = document.getElementById('ecBtnCriarPasso');
  var salvarBtn  = document.getElementById('ecBtnSalvar');
  if(excluirBtn) excluirBtn.classList.remove('d-none');
  if(criarBtn)  criarBtn.classList.toggle('d-none', tab!=='passos');
  if(salvarBtn) salvarBtn.classList.toggle('d-none', tab==='passos');
  if(tab==='passos') ecRenderPassos();
}

/* ===== MODAL DE CONFIRMAÇÃO ===== */
var _confirmModal = null;
var _confirmCb    = null;

function showConfirm(title, msg, okLabel, onOk) {
  document.getElementById('confirmTitle').textContent = title || 'Confirmar';
  document.getElementById('confirmMsg').textContent   = msg   || 'Esta ação não pode ser desfeita.';
  document.getElementById('confirmOkBtn').textContent = okLabel || 'Confirmar';
  _confirmCb = onOk;
  if (!_confirmModal) {
    _confirmModal = new bootstrap.Modal(document.getElementById('modalConfirm'));
  }
  document.getElementById('modalConfirm').addEventListener('shown.bs.modal', function() {
    var bds = document.querySelectorAll('.modal-backdrop');
    if (bds.length > 0) bds[bds.length - 1].style.zIndex = '1105';
    document.body.classList.add('modal-open');
  }, { once: true });
  document.getElementById('modalConfirm').addEventListener('hidden.bs.modal', function() {
    _confirmModal = null;
    document.body.classList.add('modal-open');
  }, { once: true });
  _confirmModal.show();
}

document.addEventListener('DOMContentLoaded', function() {
  var okBtn  = document.getElementById('confirmOkBtn');
  var canBtn = document.getElementById('confirmCancelBtn');
  if (okBtn) okBtn.addEventListener('click', function() {
    var cb = _confirmCb; _confirmCb = null;
    if (_confirmModal) _confirmModal.hide();
    if (cb) cb();
  });
  if (canBtn) canBtn.addEventListener('click', function() {
    _confirmCb = null;
    if (_confirmModal) _confirmModal.hide();
  });
});

/* ===== ORDENAR PASSOS ===== */
var _ordenarPassos = [];
var _ordenarDragIdx = null;
var _ordenarModal = null;

function abrirOrdenarPassos() {
  if (!ecState.passos || ecState.passos.length < 2) {
    toast('Adicione pelo menos dois passos para ordenar.');
    return;
  }
  _ordenarPassos = ecState.passos.slice();
  _renderOrdenarLista();
  if (!_ordenarModal) {
    _ordenarModal = new bootstrap.Modal(document.getElementById('modalOrdenarPassos'), { backdrop: 'static' });
  }
  document.getElementById('modalOrdenarPassos').addEventListener('shown.bs.modal', function() {
    document.getElementById('modalOrdenarPassos').style.zIndex = '1090';
    var bds = document.querySelectorAll('.modal-backdrop');
    if (bds.length > 0) bds[bds.length - 1].style.zIndex = '1085';
    document.body.classList.add('modal-open');
  }, { once: true });
  document.getElementById('modalOrdenarPassos').addEventListener('hidden.bs.modal', function() {
    _ordenarModal = null;
    document.body.classList.add('modal-open');
    document.getElementById('modalEditarCombo').style.zIndex = '1055';
  }, { once: true });
  _ordenarModal.show();
}

function _renderOrdenarLista() {
  var c = document.getElementById('ordenarPassosLista');
  if (!c) return;
  c.innerHTML = _ordenarPassos.map(function(p, i) {
    var nOpc = p.opcoes ? p.opcoes.length : 0;
    var meta = nOpc + ' opç' + (nOpc === 1 ? 'ão' : 'ões') + ' disponíve' + (nOpc === 1 ? 'l' : 'is');
    return '<div class="ordenar-passo-item" draggable="true" data-idx="' + i + '">'
      + '<span class="ordenar-handle"><i class="bi bi-grip-vertical"></i></span>'
      + '<div style="flex:1;min-width:0">'
      + '<div class="ordenar-etapa-row">Etapa ' + (i + 1)
      + ' <span class="ordenar-badge">' + (p.minItens||1) + '–' + (p.maxItens||1) + ' itens</span></div>'
      + '<div class="ordenar-nome">' + _cwEsc(p.nome) + '</div>'
      + '<div class="ordenar-meta">' + meta + '</div>'
      + '</div>'
      + '</div>';
  }).join('');

  var items = c.querySelectorAll('.ordenar-passo-item');
  items.forEach(function(item) {
    item.addEventListener('dragstart', function(e) {
      _ordenarDragIdx = parseInt(this.dataset.idx);
      this.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', function() {
      this.classList.remove('dragging');
      c.querySelectorAll('.ordenar-passo-item').forEach(function(el) { el.classList.remove('drag-over'); });
    });
    item.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (parseInt(this.dataset.idx) !== _ordenarDragIdx) {
        c.querySelectorAll('.ordenar-passo-item').forEach(function(el) { el.classList.remove('drag-over'); });
        this.classList.add('drag-over');
      }
    });
    item.addEventListener('drop', function(e) {
      e.preventDefault();
      var to = parseInt(this.dataset.idx);
      if (to === _ordenarDragIdx) return;
      var moved = _ordenarPassos.splice(_ordenarDragIdx, 1)[0];
      _ordenarPassos.splice(to, 0, moved);
      _renderOrdenarLista();
    });
  });
}

function salvarOrdemPassos() {
  var btn = document.getElementById('btnSalvarOrdem');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
  var ids = _ordenarPassos.map(function(p) { return p.id; }).join(',');
  fetch('api/combo_passos_reordenar.php', {
    method: 'POST',
    body: new URLSearchParams({ combo_id: ecState.comboId, passo_ids: ids })
  })
  .then(function(r) { return r.json(); })
  .then(function(resp) {
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    if (resp.ok) {
      ecState.passos = _ordenarPassos.slice();
      ecRenderPassos();
      if (_ordenarModal) _ordenarModal.hide();
    } else {
      toast(resp.msg || 'Erro ao salvar ordem.');
    }
  })
  .catch(function() {
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    toast('Erro de comunicação.');
  });
}

function ecRenderPassos(){
  var c = document.getElementById('ecPassosList');
  if(!c) return;
  if(ecState.passos.length===0){
    c.innerHTML='<div class="combo-empty-passos"><i class="bi bi-layers"></i><p>Nenhum passo configurado</p><p>Clique em "Criar passo" para adicionar um passo ao combo.</p></div>';
    return;
  }
  c.innerHTML = ecState.passos.map(function(p,i){
    var nOpc = p.opcoes ? p.opcoes.length : 0;
    var meta = p.minItens+'-'+p.maxItens+' iten'+(p.maxItens>1?'s':'')+'s • '+nOpc+' opç'+(nOpc===1?'ão':'ões')+' disponíve'+(nOpc===1?'l':'is');
    return '<div class="combo-passo-item" onclick="ecAbrirEditarPasso('+i+')">'
      +'<div class="combo-passo-item-info">'
      +'<div class="combo-passo-item-nome">'+_cwEsc(p.nome)+'</div>'
      +'<div class="combo-passo-item-meta">'+meta+'</div>'
      +'</div>'
      +'<i class="bi bi-chevron-right" style="font-size:13px;color:#9ca3af;flex-shrink:0"></i>'
      +'</div>';
  }).join('');
}

function ecSetTipoPreco(tipo){
  ecState.tipoPreco = tipo;
  var pc = document.getElementById('ecPorComboCard');
  var pi = document.getElementById('ecPorItemCard');
  var pcc = document.getElementById('ecPorComboCheck');
  var pic = document.getElementById('ecPorItemCheck');
  if(pc)  pc.classList.toggle('active', tipo==='por_combo');
  if(pi)  pi.classList.toggle('active', tipo==='por_item');
  if(pcc) pcc.className = tipo==='por_combo' ? 'bi bi-check-circle-fill' : 'bi bi-circle';
  if(pic) pic.className = tipo==='por_item'  ? 'bi bi-check-circle-fill' : 'bi bi-circle';
  var pCampo = document.getElementById('ecPrecoCampo');
  if(pCampo) pCampo.classList.toggle('d-none', tipo==='por_item');
}

function ecRemoverImagem(e){
  e.stopPropagation();
  ecState.imagemBase64 = null;
  ecState.imagemRemover = true;
  var prev = document.getElementById('ecImagemPreview');
  var icon = document.getElementById('ecImagemIcon');
  if(prev){ prev.src=''; prev.style.display='none'; }
  if(icon) icon.style.display='';
}

function ecSalvarCombo(){
  var nome = (document.getElementById('ecNome').value||'').trim();
  if(!nome){ toast('Informe o nome do combo.'); return; }
  ecState.nome = nome;
  ecState.descricao = (document.getElementById('ecDescricao').value||'').trim();
  ecState.ativo = document.getElementById('ecAtivo').checked ? 1 : 0;
  var precoRaw = (document.getElementById('ecPreco').value||'0').replace(/\./g,'').replace(',','.');
  ecState.preco = parseFloat(precoRaw)||0;
  ecState.promoAtiva = document.getElementById('ecPromoToggle').checked;
  if(ecState.promoAtiva){
    var pr = (document.getElementById('ecPrecoPromo').value||'0').replace(/\./g,'').replace(',','.');
    ecState.precoPromo = parseFloat(pr)||0;
  } else {
    ecState.precoPromo = null;
  }
  var btn = document.getElementById('ecBtnSalvar');
  btn.disabled=true; btn.textContent='Salvando...';
  var fd = new FormData();
  if(ecState.comboId) fd.append('id', ecState.comboId);
  fd.append('categoria_id', ecState.categoriaId);
  fd.append('nome', ecState.nome);
  fd.append('descricao', ecState.descricao);
  fd.append('tipo_preco', ecState.tipoPreco);
  fd.append('preco', ecState.preco);
  if(ecState.precoPromo!=null) fd.append('preco_promocional', ecState.precoPromo);
  fd.append('promo_desativado', ecState.promoAtiva ? 0 : 1);
  fd.append('ativo', ecState.ativo);
  if(ecState.imagemRemover) fd.append('imagem_remover','1');
  if(ecState.imagemBase64) fd.append('imagem_base64', ecState.imagemBase64);
  fetch('api/combo_save.php',{method:'POST',body:fd})
    .then(r=>r.json())
    .then(function(resp){
      btn.disabled=false; btn.textContent='Salvar';
      if(resp.ok){ toast('Combo salvo.'); _getEcModal().hide(); window.location.reload(); }
      else toast(resp.msg||'Erro ao salvar combo.');
    })
    .catch(function(){ btn.disabled=false; btn.textContent='Salvar'; toast('Erro de comunicação.'); });
}

function ecExcluirCombo(){
  if(!ecState.comboId) return;
  showConfirm(
    'Excluir combo',
    'Esta ação não pode ser desfeita. O combo e todos os seus passos serão removidos permanentemente.',
    'Excluir',
    function(){
      fetch('api/combo_delete.php',{method:'POST',body:new URLSearchParams({combo_id:ecState.comboId})})
        .then(r=>r.json())
        .then(function(resp){
          if(resp.ok){ _getEcModal().hide(); window.location.reload(); }
          else toast(resp.msg||'Erro ao excluir combo.');
        })
        .catch(function(){ toast('Erro de comunicação.'); });
    }
  );
}

function ecAbrirCriarPasso(){
  cwPassoState = {step:1, passoId:null, nome:'', descricao:'', obrigatorio:1, minItens:1, maxItens:1, permiteRepetir:0, opcoes:[], fromEditModal:true};
  _cwPassoRender(1);
  _getCwPasso().show();
  document.getElementById('modalCriandoPasso').addEventListener('shown.bs.modal',function(){
    document.getElementById('modalCriandoPasso').style.zIndex='1080';
    var bds = document.querySelectorAll('.modal-backdrop');
    if(bds.length>0) bds[bds.length-1].style.zIndex='1075';
    document.body.classList.add('modal-open');
  },{once:true});
}

function ecAbrirEditarPasso(idx){
  var p = ecState.passos[idx];
  if(!p) return;
  _epState = {
    idx:idx, passoId:p.id||null,
    nome:p.nome, descricao:p.descricao||'',
    obrigatorio:p.obrigatorio, minItens:p.minItens, maxItens:p.maxItens,
    permiteRepetir:p.permiteRepetir||0, opcoes:p.opcoes ? p.opcoes.slice() : []
  };
  document.getElementById('epTitulo').textContent = p.nome;
  document.getElementById('epNome').value = p.nome;
  document.getElementById('epDescricao').value = p.descricao||'';
  document.getElementById('epObrigatorio').checked = !!p.obrigatorio;
  document.getElementById('epMin').value = p.minItens||1;
  document.getElementById('epMax').value = p.maxItens||1;
  var desc = document.getElementById('epObrigatorioDesc');
  if(desc) desc.textContent = p.obrigatorio ? 'Sim, o cliente deve selecionar pelo menos um item.' : 'Não, o cliente pode pular este passo.';
  epSwitchTab('config');
  _getEpModal().show();
  document.getElementById('modalEditarPasso').addEventListener('shown.bs.modal',function(){
    document.getElementById('modalEditarPasso').style.zIndex='1070';
    var bds = document.querySelectorAll('.modal-backdrop');
    if(bds.length>0) bds[bds.length-1].style.zIndex='1065';
    document.body.classList.add('modal-open');
  },{once:true});
}

function epSwitchTab(tab){
  ['config','opcoes'].forEach(function(t){
    var cap  = t.charAt(0).toUpperCase()+t.slice(1);
    var btn  = document.getElementById('epTabBtn'+cap);
    var pane = document.getElementById('epTab'+cap);
    if(btn)  btn.classList.toggle('active', t===tab);
    if(pane) pane.classList.toggle('d-none', t!==tab);
  });
  var addBtn = document.getElementById('epBtnAdcionar');
  if(addBtn) addBtn.classList.toggle('d-none', tab!=='opcoes');
  if(tab==='opcoes') epRenderOpcoes();
}

/* ===== CRONOGRAMA DE DISPONIBILIDADE ===== */
let _modalCronograma = null;
const _diasNomes = { dom:'Domingo', seg:'Segunda', ter:'Terça', qua:'Quarta', qui:'Quinta', sex:'Sexta', sab:'Sábado' };

function abrirCronograma() {
  if (!_modalCronograma) {
    _modalCronograma = new bootstrap.Modal(document.getElementById('modalCronograma'), { backdrop: false });
  }
  const diasEl = document.getElementById('produtoDiasSemana');
  const dias = JSON.parse(diasEl ? diasEl.value || '[]' : '[]');
  document.querySelectorAll('.cronograma-day-btn').forEach(btn => {
    btn.classList.toggle('ativo', dias.includes(btn.dataset.dia));
  });
  const ini = document.getElementById('produtoHorarioIni');
  const fim = document.getElementById('produtoHorarioFim');
  document.getElementById('cronogramaHorarioIni').value = ini ? ini.value : '';
  document.getElementById('cronogramaHorarioFim').value = fim ? fim.value : '';
  _modalCronograma.show();
}

function salvarCronograma() {
  const dias = [];
  document.querySelectorAll('.cronograma-day-btn.ativo').forEach(btn => dias.push(btn.dataset.dia));
  const horIni = document.getElementById('cronogramaHorarioIni').value;
  const horFim = document.getElementById('cronogramaHorarioFim').value;
  const diasEl = document.getElementById('produtoDiasSemana');
  const iniEl  = document.getElementById('produtoHorarioIni');
  const fimEl  = document.getElementById('produtoHorarioFim');
  if (diasEl) diasEl.value = JSON.stringify(dias);
  if (iniEl)  iniEl.value  = horIni;
  if (fimEl)  fimEl.value  = horFim;
  _atualizarResumoCronograma(dias, horIni, horFim);
  if (_modalCronograma) _modalCronograma.hide();
}

function _atualizarResumoCronograma(dias, horIni, horFim) {
  const el  = document.getElementById('cronogramaResumo');
  const txt = document.getElementById('cronogramaResumoTxt');
  if (!el) return;
  if (!dias || dias.length === 0) { el.style.display = 'none'; return; }
  const nomeDias = dias.map(d => _diasNomes[d] || d).join(', ');
  let resumo = nomeDias;
  if (horIni || horFim) resumo += ' · ' + (horIni || '--:--') + ' até ' + (horFim || '--:--');
  if (txt) txt.textContent = resumo;
  el.style.display = 'block';
}

function limparCronograma() {
  const diasEl = document.getElementById('produtoDiasSemana');
  const iniEl  = document.getElementById('produtoHorarioIni');
  const fimEl  = document.getElementById('produtoHorarioFim');
  if (diasEl) diasEl.value = '[]';
  if (iniEl)  iniEl.value  = '';
  if (fimEl)  fimEl.value  = '';
  _atualizarResumoCronograma([], '', '');
}

/* ── Cronograma de disponibilidade por CATEGORIA ── */
let _modalCronogramaCategoria = null;
function abrirModalCronogramaCategoria(btn) {
  if (!_modalCronogramaCategoria) {
    _modalCronogramaCategoria = new bootstrap.Modal(document.getElementById('modalCronogramaCategoria'), { backdrop: 'static' });
  }
  const categoriaId = btn.dataset.categoriaId || '';
  let dias = [];
  try { dias = JSON.parse(btn.dataset.diasSemana || '[]') || []; } catch (e) { dias = []; }
  document.getElementById('cronogramaCatId').value = categoriaId;
  document.querySelectorAll('#cronogramaCatDays .cronograma-day-btn').forEach(dayBtn => {
    dayBtn.classList.toggle('ativo', dias.includes(dayBtn.dataset.dia));
  });
  document.getElementById('cronogramaCatHorarioIni').value = btn.dataset.horarioIni || '';
  document.getElementById('cronogramaCatHorarioFim').value = btn.dataset.horarioFim || '';
  _modalCronogramaCategoria.show();
}

function limparCronogramaCategoria() {
  document.querySelectorAll('#cronogramaCatDays .cronograma-day-btn.ativo').forEach(b => b.classList.remove('ativo'));
  document.getElementById('cronogramaCatHorarioIni').value = '';
  document.getElementById('cronogramaCatHorarioFim').value = '';
}

function salvarCronogramaCategoria() {
  const categoriaId = document.getElementById('cronogramaCatId').value;
  const dias = [];
  document.querySelectorAll('#cronogramaCatDays .cronograma-day-btn.ativo').forEach(b => dias.push(b.dataset.dia));
  const horaInicio = document.getElementById('cronogramaCatHorarioIni').value;
  const horaFim = document.getElementById('cronogramaCatHorarioFim').value;

  if (!categoriaId) { toast('Categoria invalida.'); return; }
  const semNenhumDado = !dias.length && !horaInicio && !horaFim;
  if (!semNenhumDado) {
    if (!dias.length) { toast('Selecione ao menos um dia da semana.'); return; }
    if (!horaInicio || !horaFim) { toast('Informe o horario inicial e final.'); return; }
  }

  const params = new URLSearchParams();
  params.set('categoria_id', categoriaId);
  params.set('dias', dias.join(','));
  params.set('hora_inicio', horaInicio);
  params.set('hora_fim', horaFim);

  fetch('api/categoria_agendamento_save.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  })
    .then(r => r.json())
    .then(resp => {
      if (!resp || !resp.ok) { toast((resp && resp.msg) || 'Erro ao salvar agendamento.'); return; }
      const gatilhoBtn = document.querySelector('.categoria-actions [data-categoria-id="' + categoriaId + '"]');
      if (gatilhoBtn) {
        gatilhoBtn.dataset.diasSemana = JSON.stringify(dias);
        gatilhoBtn.dataset.horarioIni = horaInicio;
        gatilhoBtn.dataset.horarioFim = horaFim;
      }
      toastSucessoTopo('Agendamento salvo com sucesso');
      if (_modalCronogramaCategoria) _modalCronogramaCategoria.hide();
    })
    .catch(() => toast('Erro de comunicação.'));
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.cronograma-day-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('ativo'));
  });

  const cronEl = document.getElementById('modalCronograma');
  const prodContent = document.querySelector('#modalProduto .modal-content');
  if (cronEl && prodContent) {
    cronEl.addEventListener('show.bs.modal', () => {
      prodContent.classList.add('cronograma-ativo');
    });
    cronEl.addEventListener('hidden.bs.modal', () => {
      prodContent.classList.remove('cronograma-ativo');
    });
  }
});

function epRenderOpcoes(){
  var c = document.getElementById('epOpcoesList');
  if(!c) return;
  if(_epState.opcoes.length===0){
    c.innerHTML='<div class="combo-empty-passos"><i class="bi bi-bag"></i><p>Nenhuma opção vinculada neste passo</p><p>Clique em "Adicionar opções" para vincular produtos.</p></div>';
    return;
  }
  c.innerHTML='<div class="fw-semibold mb-3" style="font-size:13px">Opções vinculadas neste passo</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px">'
    +_epState.opcoes.map(function(o,i){
      var thumb = o.imagem
        ? '<img src="'+_cwEsc(o.imagem)+'" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0">'
        : '<div style="width:44px;height:44px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#9ca3af"><i class="bi bi-bag"></i></div>';
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:10px">'
        +thumb+'<span style="flex:1;font-size:13px;font-weight:500">'+_cwEsc(o.nome)+'</span>'
        +'<button type="button" class="combo-passo-item-del" onclick="epRemoverOpcao('+i+')" title="Remover"><i class="bi bi-x-lg"></i></button>'
        +'</div>';
    }).join('')
    +'</div>';
}

function epRemoverOpcao(idx){
  _epState.opcoes.splice(idx,1);
  epRenderOpcoes();
}

function epAbrirOpcoes(){
  cwOpcoesState.selectedIds = _epState.opcoes.map(function(o){return o.id;});
  cwOpcoesState.fromEditPasso = true;
  var srch = document.getElementById('cwOpcoesSearch');
  var catF = document.getElementById('cwOpcoesCatFiltro');
  if(srch){ srch.disabled=false; srch.value=''; }
  if(catF){ catF.disabled=false; catF.value='0'; }
  _getCwOpcoes().show();
  document.getElementById('modalSelecionarOpcoes').addEventListener('shown.bs.modal',function(){
    document.getElementById('modalSelecionarOpcoes').style.zIndex='1085';
    var bds = document.querySelectorAll('.modal-backdrop');
    if(bds.length>0) bds[bds.length-1].style.zIndex='1080';
    document.body.classList.add('modal-open');
    _cwCarregarOpcoesProdutos();
  },{once:true});
}

function epSalvarPasso(){
  var nome = (document.getElementById('epNome').value||'').trim();
  if(!nome){ toast('Informe o nome do passo.'); return; }
  _epState.nome = nome;
  _epState.descricao = (document.getElementById('epDescricao').value||'').trim();
  _epState.obrigatorio = document.getElementById('epObrigatorio').checked ? 1 : 0;
  _epState.minItens = parseInt(document.getElementById('epMin').value)||0;
  _epState.maxItens = parseInt(document.getElementById('epMax').value)||1;
  if(_epState.obrigatorio && _epState.minItens<1) _epState.minItens=1;
  if(_epState.minItens>_epState.maxItens){ toast('A quantidade mínima não pode ser maior que a máxima.'); return; }
  var salvarBtn = document.querySelector('#modalEditarPasso .btn-diggy-primary');
  if(salvarBtn){ salvarBtn.disabled=true; salvarBtn.textContent='Salvando...'; }
  var fd = new FormData();
  if(_epState.passoId) fd.append('passo_id', _epState.passoId);
  fd.append('combo_id', ecState.comboId);
  fd.append('nome', _epState.nome);
  fd.append('descricao', _epState.descricao);
  fd.append('obrigatorio', _epState.obrigatorio);
  fd.append('min_itens', _epState.minItens);
  fd.append('max_itens', _epState.maxItens);
  fd.append('permite_repetir', _epState.permiteRepetir||0);
  fd.append('produto_ids', _epState.opcoes.map(function(o){return o.id;}).join(','));
  fetch('api/combo_passo_save.php',{method:'POST',body:fd})
    .then(r=>r.json())
    .then(function(resp){
      if(salvarBtn){ salvarBtn.disabled=false; salvarBtn.textContent='Salvar'; }
      if(resp.ok){
        var updated = {id:resp.passo_id, nome:_epState.nome, descricao:_epState.descricao, obrigatorio:_epState.obrigatorio, minItens:_epState.minItens, maxItens:_epState.maxItens, permiteRepetir:_epState.permiteRepetir||0, opcoes:_epState.opcoes.slice()};
        if(_epState.idx>=0 && _epState.idx<ecState.passos.length){ ecState.passos[_epState.idx]=updated; }
        else{ ecState.passos.push(updated); }
        _getEpModal().hide();
        ecRenderPassos();
        setTimeout(function(){
          document.body.classList.add('modal-open');
          document.getElementById('modalEditarCombo').style.zIndex='1055';
        },100);
        toast('Passo salvo.');
      } else toast(resp.msg||'Erro ao salvar passo.');
    })
    .catch(function(){
      if(salvarBtn){ salvarBtn.disabled=false; salvarBtn.textContent='Salvar'; }
      toast('Erro de comunicação.');
    });
}

function epExcluirPasso(){
  if(!_epState.passoId){
    if(_epState.idx>=0) ecState.passos.splice(_epState.idx,1);
    _getEpModal().hide();
    ecRenderPassos();
    return;
  }
  showConfirm(
    'Excluir passo',
    'Esta ação não pode ser desfeita. O passo e todas as suas opções serão removidos.',
    'Excluir',
    function() {
      fetch('api/combo_passo_delete.php',{method:'POST',body:new URLSearchParams({passo_id:_epState.passoId})})
        .then(r=>r.json())
        .then(function(resp){
          if(resp.ok){
            ecState.passos.splice(_epState.idx,1);
            _getEpModal().hide();
            ecRenderPassos();
            setTimeout(function(){ document.body.classList.add('modal-open'); document.getElementById('modalEditarCombo').style.zIndex='1055'; },150);
          } else toast(resp.msg||'Erro ao excluir passo.');
        })
        .catch(function(){ toast('Erro de comunicação.'); });
    }
  );
}

/* ---- DOMContentLoaded for edit modals ---- */
document.addEventListener('DOMContentLoaded', function(){
  var ecPrecoEl = document.getElementById('ecPreco');
  var ecPromoEl = document.getElementById('ecPrecoPromo');
  if(ecPrecoEl) _cwMoneyMask(ecPrecoEl);
  if(ecPromoEl) _cwMoneyMask(ecPromoEl);

  var ecImgInput = document.getElementById('ecImagemInput');
  var ecImgArea  = document.getElementById('ecImagemArea');
  if(ecImgArea) ecImgArea.addEventListener('click', function(e){
    if(e.target.closest('#ecImagemDelBtn')) return;
    ecImgInput && ecImgInput.click();
  });
  if(ecImgInput) ecImgInput.addEventListener('change', function(){
    var file = this.files[0]; if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      ecState.imagemBase64 = ev.target.result;
      ecState.imagemRemover = false;
      var prev = document.getElementById('ecImagemPreview');
      var icon = document.getElementById('ecImagemIcon');
      if(prev){ prev.src=ev.target.result; prev.style.display='block'; }
      if(icon) icon.style.display='none';
    };
    reader.readAsDataURL(file);
    this.value='';
  });

  var ecPromoTog = document.getElementById('ecPromoToggle');
  var ecPromoFld = document.getElementById('ecPromoField');
  if(ecPromoTog) ecPromoTog.addEventListener('change', function(){
    ecState.promoAtiva = this.checked;
    if(ecPromoFld) ecPromoFld.classList.toggle('d-none', !this.checked);
  });

  var epObr = document.getElementById('epObrigatorio');
  if(epObr) epObr.addEventListener('change', function(){
    _epState.obrigatorio = this.checked ? 1 : 0;
    var desc = document.getElementById('epObrigatorioDesc');
    if(desc) desc.textContent = this.checked ? 'Sim, o cliente deve selecionar pelo menos um item.' : 'Não, o cliente pode pular este passo.';
    var minEl = document.getElementById('epMin');
    if(!this.checked && minEl) minEl.value=0;
    else if(this.checked && minEl && parseInt(minEl.value)<1) minEl.value=1;
  });

  var epFechBtn = document.getElementById('epBtnFechar');
  if(epFechBtn) epFechBtn.addEventListener('click', function(){
    _getEpModal().hide();
    setTimeout(function(){
      document.body.classList.add('modal-open');
      document.getElementById('modalEditarCombo').style.zIndex='1055';
    },200);
  });

  var ecModalEl = document.getElementById('modalEditarCombo');
  if(ecModalEl) ecModalEl.addEventListener('hidden.bs.modal', function(){
    _ecComboModal = null;
  });
  var epModalEl = document.getElementById('modalEditarPasso');
  if(epModalEl) epModalEl.addEventListener('hidden.bs.modal', function(){
    _epPassoModal = null;
  });
});

