let modalProducao;
let modalNovoEstoque;
let modalVincularEstoque;
let estoqueLista = Array.isArray(estoqueInicial) ? estoqueInicial : [];

const estoqueCards = document.getElementById('estoqueCards');
const estoqueBusca = document.getElementById('estoqueBusca');
const estoqueOrdenar = document.getElementById('estoqueOrdenar');
const btnAdicionarEstoque = document.getElementById('btnAdicionarEstoque');
let producaoProdutoId = null;
let estoqueQuantidade = null;
let estoqueMinimo = null;
let estoqueVinculados = null;
let estoqueAdicionais = null;
let estoqueNovoTipo = null;
let estoqueNovoBusca = null;
let estoqueNovoLista = null;
let estoqueNovoTitulo = null;
let estoqueNovoLabel = null;
let estoqueNovoBody = null;
let estoqueNovoToggle = null;
let estoqueNovoBtn = null;
let estoqueNovoSelecionado = null;

function garantirRefsEstoqueModal(){
  if (!producaoProdutoId) producaoProdutoId = document.getElementById('producaoProdutoId');
  if (!estoqueQuantidade) estoqueQuantidade = document.getElementById('estoqueQuantidade');
  if (!estoqueMinimo) estoqueMinimo = document.getElementById('estoqueMinimo');
  if (!estoqueVinculados) estoqueVinculados = document.getElementById('estoqueVinculados');
  if (!estoqueAdicionais) estoqueAdicionais = document.getElementById('estoqueAdicionais');
}

function garantirRefsNovoEstoque(){
  if (!estoqueNovoTipo) estoqueNovoTipo = document.getElementById('estoqueNovoTipo');
  if (!estoqueNovoBusca) estoqueNovoBusca = document.getElementById('estoqueNovoBusca');
  if (!estoqueNovoLista) estoqueNovoLista = document.getElementById('estoqueNovoLista');
  if (!estoqueNovoTitulo) estoqueNovoTitulo = document.getElementById('estoqueNovoTitulo');
  if (!estoqueNovoLabel) estoqueNovoLabel = document.getElementById('estoqueNovoLabel');
  if (!estoqueNovoBody) estoqueNovoBody = document.getElementById('estoqueNovoBody');
  if (!estoqueNovoToggle) estoqueNovoToggle = document.getElementById('estoqueNovoToggle');
  if (!estoqueNovoBtn) estoqueNovoBtn = document.getElementById('btnConfirmarNovoEstoque');
}

function ordenarEstoque(lista, criterio){
  const copia = lista.slice();
  switch (criterio) {
    case 'quantidade_asc':
      return copia.sort((a, b) => (a.quantidade ?? 0) - (b.quantidade ?? 0));
    case 'nome_desc':
      return copia.sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
    case 'nome_asc':
      return copia.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    case 'quantidade_desc':
    default:
      return copia.sort((a, b) => (b.quantidade ?? 0) - (a.quantidade ?? 0));
  }
}

function renderEstoque(lista){
  if (!estoqueCards) return;
  estoqueCards.innerHTML = '';
  if (!lista.length) {
    estoqueCards.innerHTML = '<div class="estoque-empty">Nenhum item encontrado.</div>';
    return;
  }
  lista.forEach(item => {
    const quantidade = parseInt(item.quantidade, 10) || 0;
    const statusClasse = quantidade > 0 ? 'ok' : 'empty';
    const statusTexto = quantidade > 0 ? 'Em estoque' : 'Sem estoque';
    const unidadeTexto = quantidade === 1 ? 'unidade' : 'unidades';

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'estoque-card';
    card.innerHTML = `
      <div class="estoque-status ${statusClasse}">${statusTexto}</div>
      <div class="estoque-nome">${item.nome || 'Produto'}</div>
      <div class="estoque-qty"><strong>${quantidade}</strong><span>${unidadeTexto}</span></div>
      <div class="estoque-sub">em estoque</div>
    `;
    card.addEventListener('click', () => abrirProducao(item.id));
    estoqueCards.appendChild(card);
  });
}

function aplicarFiltros(){
  const termo = (estoqueBusca ? estoqueBusca.value : '').toLowerCase().trim();
  let lista = estoqueLista.slice();
  if (termo) {
    lista = lista.filter(item => (item.nome || '').toLowerCase().includes(termo));
  }
  const criterio = estoqueOrdenar ? estoqueOrdenar.value : 'quantidade_desc';
  renderEstoque(ordenarEstoque(lista, criterio));
}

function obterItensSemEstoque(){
  return estoqueLista.filter(item => (parseInt(item.quantidade, 10) || 0) <= 0);
}

function atualizarNovoEstoqueTipo(){
  if (!estoqueNovoTipo) return;
  const tipo = estoqueNovoTipo.value;
  if (estoqueNovoTitulo) estoqueNovoTitulo.textContent = tipo === 'adicional' ? 'Adicionais' : 'Produtos';
  if (estoqueNovoLabel) estoqueNovoLabel.textContent = tipo === 'adicional' ? 'Buscar adicional' : 'Buscar produto';
  if (estoqueNovoBusca) {
    estoqueNovoBusca.placeholder = tipo === 'adicional' ? 'Ex.: Adicional' : 'Ex.: Produto';
  }
}

function renderNovoEstoqueLista(){
  if (!estoqueNovoLista) return;
  const tipo = estoqueNovoTipo ? estoqueNovoTipo.value : 'produto';
  const termo = (estoqueNovoBusca ? estoqueNovoBusca.value : '').toLowerCase().trim();
  let lista = [];
  if (tipo === 'produto') {
    lista = obterItensSemEstoque();
  }
  if (termo) {
    lista = lista.filter(item => (item.nome || '').toLowerCase().includes(termo));
  }
  estoqueNovoLista.innerHTML = '';
  if (!lista.length) {
    const msg = tipo === 'adicional'
      ? 'Nenhum adicional sem estoque.'
      : 'Nenhum produto sem estoque.';
    estoqueNovoLista.innerHTML = `<div class="estoque-novo-empty">${msg}</div>`;
    if (estoqueNovoBtn) estoqueNovoBtn.disabled = true;
    return;
  }
  if (estoqueNovoBtn) estoqueNovoBtn.disabled = false;
  lista.forEach(item => {
    const label = document.createElement('label');
    label.className = 'estoque-novo-item';
    const checked = estoqueNovoSelecionado && String(estoqueNovoSelecionado) === String(item.id);
    label.innerHTML = `
      <input type="radio" name="novoEstoqueItem" value="${item.id}" ${checked ? 'checked' : ''}>
      <span>${item.nome || 'Produto'}</span>
    `;
    label.querySelector('input').addEventListener('change', e => {
      estoqueNovoSelecionado = e.target.value;
    });
    estoqueNovoLista.appendChild(label);
  });
}

function abrirModalNovoEstoque(){
  garantirRefsNovoEstoque();
  estoqueNovoSelecionado = null;
  atualizarNovoEstoqueTipo();
  renderNovoEstoqueLista();
  if (modalNovoEstoque) modalNovoEstoque.show();
}

function confirmarNovoEstoque(){
  garantirRefsNovoEstoque();
  if (!estoqueNovoSelecionado) {
    toast('Selecione um item.');
    return;
  }
  if (modalNovoEstoque) modalNovoEstoque.hide();
  abrirProducao(estoqueNovoSelecionado);
}

function abrirProducao(produtoId){
  garantirRefsEstoqueModal();
  const form = document.getElementById('formProducao');
  if (form) form.reset();
  if (producaoProdutoId) {
    if (produtoId) {
      producaoProdutoId.value = String(produtoId);
    } else if (estoqueLista.length) {
      producaoProdutoId.value = String(estoqueLista[0].id);
    }
  }
  if (!producaoProdutoId || !producaoProdutoId.value) {
    toast('Selecione um produto na lista.');
    return;
  }
  carregarEstoque(producaoProdutoId.value);
  if (modalProducao) modalProducao.show();
}

function carregarEstoque(produtoId){
  if (!produtoId) return;
  garantirRefsEstoqueModal();
  fetch(`api/estoque_get.php?produto_id=${encodeURIComponent(produtoId)}`)
    .then(r => r.json())
    .then(resp => {
      if (!resp || !resp.ok) return;
      if (estoqueQuantidade) estoqueQuantidade.value = resp.quantidade ?? 0;
      if (estoqueMinimo) estoqueMinimo.value = resp.quantidade_minima ?? 0;
      if (estoqueAdicionais) {
        estoqueAdicionais.innerHTML = '<div class="estoque-list-item estoque-list-empty">Nenhum item vinculado.</div>';
      }
      carregarProdutosVinculados(produtoId);
    });
}

/* ===== ESTOQUE VINCULADO (varios produtos, um so estoque) ===== */
var estVinculoState = { produtoId: null, produtos: [], filtered: [], selectedIds: [] };

function _estVinculoEsc(s){
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function carregarProdutosVinculados(produtoId){
  garantirRefsEstoqueModal();
  if (!estoqueVinculados) return;
  estoqueVinculados.innerHTML = '<div class="estoque-list-item">Carregando...</div>';
  fetch(`api/estoque_vinculo_produtos.php?produto_id=${encodeURIComponent(produtoId)}`)
    .then(r => r.json())
    .then(resp => {
      if (!resp.ok) {
        estoqueVinculados.innerHTML = '<div class="estoque-list-item estoque-list-empty">Nenhum item vinculado.</div>';
        return;
      }
      const vinculados = resp.produtos.filter(p => p.vinculado);
      estoqueVinculados.innerHTML = vinculados.length
        ? vinculados.map(p => `<div class="estoque-list-item">${_estVinculoEsc(p.nome)}</div>`).join('')
        : '<div class="estoque-list-item estoque-list-empty">Nenhum item vinculado.</div>';
    })
    .catch(() => {
      estoqueVinculados.innerHTML = '<div class="estoque-list-item estoque-list-empty">Nenhum item vinculado.</div>';
    });
}

function _estVinculoAbrir(){
  garantirRefsEstoqueModal();
  if (!producaoProdutoId || !producaoProdutoId.value) {
    toast('Salve o estoque do produto antes de vincular outros itens.');
    return;
  }
  estVinculoState.produtoId = producaoProdutoId.value;
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
      ? `<img src="${_estVinculoEsc(p.imagem)}" alt="">`
      : '<div class="opcoes-item-thumb"><i class="bi bi-bag"></i></div>';
    return `<div class="opcoes-item${sel ? ' selected' : ''}" data-id="${p.id}" onclick="_estVinculoToggle(this,${p.id})">
      ${thumb}
      <span class="opcoes-item-name">${_estVinculoEsc(p.nome)}</span>
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
      toast('Itens vinculados com sucesso');
    })
    .catch(() => toast('Erro ao vincular itens'));
}

function salvarEstoque(){
  const form = document.getElementById('formProducao');
  if (!form) return;
  garantirRefsEstoqueModal();
  const dados = new FormData(form);

  fetch('api/estoque_update.php', {
    method:'POST',
    body:dados
  })
  .then(r=>r.json())
  .then(resp=>{
    if(resp.ok){
      if (modalProducao) modalProducao.hide();
      atualizarEstoque();
      toast('Estoque atualizado com sucesso');
    }else{
      toast(resp.msg || 'Erro ao salvar estoque');
    }
  });
}

function deletarEstoque(){
  garantirRefsEstoqueModal();
  if (!producaoProdutoId || !producaoProdutoId.value) return;
  const dados = new FormData();
  dados.set('produto_id', producaoProdutoId.value);
  fetch('api/estoque_delete.php', {
    method:'POST',
    body:dados
  })
  .then(r=>r.json())
  .then(resp=>{
    if(resp && resp.ok){
      if (modalProducao) modalProducao.hide();
      atualizarEstoque();
      toast('Estoque deletado com sucesso');
    }else{
      toast(resp.msg || 'Erro ao deletar estoque');
    }
  });
}

function atualizarEstoque(){
  fetch('api/estoque_list.php')
    .then(r=>r.json())
    .then(lista=>{
      estoqueLista = Array.isArray(lista) ? lista : [];
      aplicarFiltros();
    });
}

function toast(msg){
  const el = document.getElementById('estoqueToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2400);
}

  document.addEventListener('DOMContentLoaded', () => {
    modalProducao = new bootstrap.Modal(
      document.getElementById('modalProducao')
    );
    modalNovoEstoque = new bootstrap.Modal(
      document.getElementById('modalNovoEstoque')
    );
    const modalVincularEstoqueEl = document.getElementById('modalVincularEstoque');
    if (modalVincularEstoqueEl) {
      modalVincularEstoque = new bootstrap.Modal(modalVincularEstoqueEl);
      // Abre por cima do modalProducao, ja aberto — precisa de um z-index maior
      // pro backdrop nao ficar entre os dois modais (Bootstrap nao empilha sozinho).
      modalVincularEstoqueEl.addEventListener('shown.bs.modal', () => {
        modalVincularEstoqueEl.style.zIndex = '1070';
        const bds = document.querySelectorAll('.modal-backdrop');
        if (bds.length > 0) bds[bds.length - 1].style.zIndex = '1065';
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
    garantirRefsEstoqueModal();
    garantirRefsNovoEstoque();
    aplicarFiltros();
    if (estoqueBusca) estoqueBusca.addEventListener('input', aplicarFiltros);
    if (estoqueOrdenar) estoqueOrdenar.addEventListener('change', aplicarFiltros);
    if (btnAdicionarEstoque) btnAdicionarEstoque.addEventListener('click', abrirModalNovoEstoque);
    if (estoqueNovoTipo) estoqueNovoTipo.addEventListener('change', () => {
      atualizarNovoEstoqueTipo();
      renderNovoEstoqueLista();
    });
    if (estoqueNovoBusca) estoqueNovoBusca.addEventListener('input', renderNovoEstoqueLista);
    if (estoqueNovoBtn) estoqueNovoBtn.addEventListener('click', confirmarNovoEstoque);
    if (estoqueNovoToggle) {
      estoqueNovoToggle.addEventListener('click', () => {
        if (!estoqueNovoBody) return;
        estoqueNovoBody.classList.toggle('d-none');
        const icon = estoqueNovoToggle.querySelector('i');
        if (icon) {
          icon.classList.toggle('bi-chevron-down');
          icon.classList.toggle('bi-chevron-up');
        }
      });
    }

    // Atualiza os numeros de estoque sozinho — sem isso, uma venda feita no
    // PDV ou na loja publica enquanto esta tela fica aberta so aparecia depois
    // de um F5 manual.
    setInterval(atualizarEstoque, 12000);
  });
