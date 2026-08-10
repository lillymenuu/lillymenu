function toggleSidebar(){
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  if(window.innerWidth <= 991){
    sidebar.classList.toggle('show');
    overlay.style.display = sidebar.classList.contains('show') ? 'block' : 'none';
  }else{
    sidebar.classList.toggle('collapsed');
  }
}




let modalProducao;
let modalNovoEstoque;
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
      if (estoqueVinculados) {
        estoqueVinculados.innerHTML = '<div class="estoque-list-item">Nenhum item vinculado.</div>';
      }
      if (estoqueAdicionais) {
        estoqueAdicionais.innerHTML = '<div class="estoque-list-item">Nenhum item vinculado.</div>';
      }
    });
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
  });
