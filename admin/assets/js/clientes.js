
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

const btnNovoCliente = document.getElementById('btnNovoCliente');
const modalClienteEditEl = document.getElementById('modalClienteEdit');
const modalClienteEdit = modalClienteEditEl ? new bootstrap.Modal(modalClienteEditEl) : null;
const clienteEditTitulo = modalClienteEditEl ? modalClienteEditEl.querySelector('.modal-title') : null;
const modalClientePerfilEl = document.getElementById('modalClientePerfil');
const modalClientePerfil = modalClientePerfilEl ? new bootstrap.Modal(modalClientePerfilEl) : null;
const clientePerfilAvatar = document.getElementById('clientePerfilAvatar');
const clientePerfilNome = document.getElementById('clientePerfilNome');
const clientePerfilDesde = document.getElementById('clientePerfilDesde');
const clientePerfilCashback = document.getElementById('clientePerfilCashback');
const clientePerfilTicket = document.getElementById('clientePerfilTicket');
const clientePerfilFiado = document.getElementById('clientePerfilFiado');
const clientePerfilPedidos = document.getElementById('clientePerfilPedidos');
const clientePerfilUltimoPedido = document.getElementById('clientePerfilUltimoPedido');
const clientePerfilAvaliacao = document.getElementById('clientePerfilAvaliacao');
const clientePerfilTelefone = document.getElementById('clientePerfilTelefone');
const clientePerfilEndereco = document.getElementById('clientePerfilEndereco');
const clientePerfilEditar = document.getElementById('clientePerfilEditar');
const clientePerfilTabs = document.getElementById('clientePerfilTabs');
const clientePedidosPeriodo = document.getElementById('clientePedidosPeriodo');
const clientePedidosTipo = document.getElementById('clientePedidosTipo');
const clientePedidosLista = document.getElementById('clientePedidosLista');
const clientePedidosPaginacao = document.getElementById('clientePedidosPaginacao');
const modalPedidoDetalheEl = document.getElementById('modalPedidoDetalhe');
const modalPedidoDetalhe = modalPedidoDetalheEl ? new bootstrap.Modal(modalPedidoDetalheEl) : null;
const pedidoDetalheNumero = document.getElementById('pedidoDetalheNumero');
const pedidoDetalheTempo = document.getElementById('pedidoDetalheTempo');
const pedidoDetalheHorario = document.getElementById('pedidoDetalheHorario');
const pedidoDetalheStatus = document.getElementById('pedidoDetalheStatus');
const pedidoDetalheCliente = document.getElementById('pedidoDetalheCliente');
const pedidoDetalheTelefone = document.getElementById('pedidoDetalheTelefone');
const pedidoDetalheContato = document.getElementById('pedidoDetalheContato');
const pedidoDetalheWhatsapp = document.getElementById('pedidoDetalheWhatsapp');
const pedidoDetalheTipoTitulo = document.getElementById('pedidoDetalheTipoTitulo');
const pedidoDetalheEnderecoWrap = document.getElementById('pedidoDetalheEnderecoWrap');
const pedidoDetalheEndereco = document.getElementById('pedidoDetalheEndereco');
const pedidoDetalheTaxaWrap = document.getElementById('pedidoDetalheTaxaWrap');
const pedidoDetalheTaxa = document.getElementById('pedidoDetalheTaxa');
const pedidoDetalheEntregaLinks = document.getElementById('pedidoDetalheEntregaLinks');
const pedidoDetalheCopiarEndereco = document.getElementById('pedidoDetalheCopiarEndereco');
const pedidoDetalhePagamentos = document.getElementById('pedidoDetalhePagamentos');
const pedidoDetalheItens = document.getElementById('pedidoDetalheItens');
const pedidoDetalheSubtotal = document.getElementById('pedidoDetalheSubtotal');
const pedidoDetalheDesconto = document.getElementById('pedidoDetalheDesconto');
const pedidoDetalheTaxaResumo = document.getElementById('pedidoDetalheTaxaResumo');
const pedidoDetalheMaquininha = document.getElementById('pedidoDetalheMaquininha');
const pedidoDetalheCashback = document.getElementById('pedidoDetalheCashback');
const pedidoDetalheTotal = document.getElementById('pedidoDetalheTotal');
const pedidoDetalheLinhaDesconto = document.getElementById('pedidoDetalheLinhaDesconto');
const pedidoDetalheLinhaTaxa = document.getElementById('pedidoDetalheLinhaTaxa');
const pedidoDetalheLinhaMaquininha = document.getElementById('pedidoDetalheLinhaMaquininha');
const pedidoDetalheLinhaCashback = document.getElementById('pedidoDetalheLinhaCashback');
const pedidoDetalheEditar = document.getElementById('pedidoDetalheEditar');
const pedidoDetalheImprimir = document.getElementById('pedidoDetalheImprimir');
const pedidoDetalheCancelar = document.getElementById('pedidoDetalheCancelar');
const pedidoDetalheFinalizar = document.getElementById('pedidoDetalheFinalizar');
let clientePerfilAtual = null;
let clientePedidosPagina = 1;
let clientePedidosCarregado = false;
let pedidoDetalheAtual = null;
let pedidoModalParaAbrir = null;
let reabrirPerfilAposPedido = false;
const clienteEditId = document.getElementById('clienteEditId');
const clienteEditNome = document.getElementById('clienteEditNome');
const clienteEditTelefone = document.getElementById('clienteEditTelefone');
const clienteEditAniversario = document.getElementById('clienteEditAniversario');
const clienteEditCep = document.getElementById('clienteEditCep');
const clienteEditRua = document.getElementById('clienteEditRua');
const clienteEditNumero = document.getElementById('clienteEditNumero');
const clienteEditBairro = document.getElementById('clienteEditBairro');
const clienteEditCidade = document.getElementById('clienteEditCidade');
const clienteEditEstado = document.getElementById('clienteEditEstado');
const clienteEditComplemento = document.getElementById('clienteEditComplemento');
const clienteEditSalvar = document.getElementById('clienteEditSalvar');
const clienteEditNomeErro = document.getElementById('clienteEditNomeErro');
const clienteEditTelefoneErro = document.getElementById('clienteEditTelefoneErro');
const resultadosEl = document.getElementById('clientesResultados');
const skeletonEl = document.getElementById('clientesSkeleton');
const buscaInput = document.querySelector('input[name="busca"]');
const buscaForm = buscaInput ? buscaInput.closest('form') : null;
let buscaTimer = null;

function limparErrosCliente(){
  if (clienteEditNome) clienteEditNome.classList.remove('is-invalid');
  if (clienteEditTelefone) clienteEditTelefone.classList.remove('is-invalid');
  if (clienteEditNomeErro) clienteEditNomeErro.textContent = '';
  if (clienteEditTelefoneErro) clienteEditTelefoneErro.textContent = '';
}

function preencherClienteModal(data){
  if (clienteEditTitulo) {
    clienteEditTitulo.textContent = data.id ? 'Editar cliente' : 'Criar cliente';
  }
  if (clienteEditId) clienteEditId.value = data.id || '';
  if (clienteEditNome) clienteEditNome.value = data.nome || '';
  if (clienteEditTelefone) clienteEditTelefone.value = data.telefone || '';
  if (clienteEditAniversario) clienteEditAniversario.value = data.aniversario || '';
  if (clienteEditCep) clienteEditCep.value = data.cep || '';
  if (clienteEditRua) clienteEditRua.value = data.rua || '';
  if (clienteEditNumero) clienteEditNumero.value = data.numero || '';
  if (clienteEditBairro) clienteEditBairro.value = data.bairro || '';
  if (clienteEditCidade) clienteEditCidade.value = data.cidade || '';
  if (clienteEditEstado) clienteEditEstado.value = data.estado || '';
  if (clienteEditComplemento) clienteEditComplemento.value = data.complemento || '';
  limparErrosCliente();
}

function montarEnderecoClienteModal(){
  const cep = clienteEditCep ? clienteEditCep.value.trim() : '';
  const rua = clienteEditRua ? clienteEditRua.value.trim() : '';
  const numero = clienteEditNumero ? clienteEditNumero.value.trim() : '';
  const bairro = clienteEditBairro ? clienteEditBairro.value.trim() : '';
  const cidade = clienteEditCidade ? clienteEditCidade.value.trim() : '';
  const estado = clienteEditEstado ? clienteEditEstado.value.trim() : '';
  const complemento = clienteEditComplemento ? clienteEditComplemento.value.trim() : '';

  const partes = [];
  if (rua) partes.push(numero ? `${rua}, ${numero}` : rua);
  if (bairro) partes.push(bairro);
  const cidadeEstado = (cidade || estado) ? [cidade, estado].filter(Boolean).join(' / ') : '';
  if (cidadeEstado) partes.push(cidadeEstado);
  if (cep) partes.push(cep);
  if (complemento) partes.push(complemento);

  const endereco = partes.join(' - ');
  return { endereco, cep, rua, numero, bairro, cidade, estado, complemento };
}

function validarClienteModal(){
  let ok = true;
  const nome = clienteEditNome ? clienteEditNome.value.trim() : '';
  const telefone = clienteEditTelefone ? clienteEditTelefone.value.trim() : '';

  if (!nome) {
    if (clienteEditNome) clienteEditNome.classList.add('is-invalid');
    if (clienteEditNomeErro) clienteEditNomeErro.textContent = 'Informe o nome do cliente.';
    ok = false;
  }
  if (!telefone) {
    if (clienteEditTelefone) clienteEditTelefone.classList.add('is-invalid');
    if (clienteEditTelefoneErro) clienteEditTelefoneErro.textContent = 'Informe o telefone do cliente.';
    ok = false;
  }
  return ok;
}

function normalizarData(valor){
  if (!valor) return '';
  return valor.includes(' ') ? valor.replace(' ', 'T') : valor;
}

function formatarData(valor){
  if (!valor) return '';
  const data = new Date(normalizarData(valor));
  if (Number.isNaN(data.getTime())) return valor;
  const dia = String(data.getDate()).padStart(2,'0');
  const mes = String(data.getMonth() + 1).padStart(2,'0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(valor){
  if (!valor) return '-';
  const data = new Date(normalizarData(valor));
  if (Number.isNaN(data.getTime())) return valor;
  const dia = String(data.getDate()).padStart(2,'0');
  const mes = String(data.getMonth() + 1).padStart(2,'0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2,'0');
  const min = String(data.getMinutes()).padStart(2,'0');
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

function formatarMoeda(valor){
  const numero = Number(valor || 0);
  return `R$ ${numero.toFixed(2).replace('.',',')}`;
}

function tempoDesde(dataStr){
  if (!dataStr) return '-';
  const data = new Date(normalizarData(dataStr));
  if (Number.isNaN(data.getTime())) return '-';
  const diffMs = Date.now() - data.getTime();
  const minutos = Math.max(1, Math.floor(diffMs / 60000));
  if (minutos < 60) return `feito ha ${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `feito ha ${horas} horas`;
  const dias = Math.floor(horas / 24);
  return `feito ha ${dias} dias`;
}

function salvarClienteModal(){
  if (!validarClienteModal()) return;
  const enderecoPayload = montarEnderecoClienteModal();
  const payload = {
    id: clienteEditId ? clienteEditId.value : '',
    nome: clienteEditNome ? clienteEditNome.value.trim() : '',
    telefone: clienteEditTelefone ? clienteEditTelefone.value.trim() : '',
    aniversario: clienteEditAniversario ? clienteEditAniversario.value : '',
    cep: enderecoPayload.cep,
    rua: enderecoPayload.rua,
    numero: enderecoPayload.numero,
    bairro: enderecoPayload.bairro,
    cidade: enderecoPayload.cidade,
    estado: enderecoPayload.estado,
    complemento: enderecoPayload.complemento,
    endereco: enderecoPayload.endereco
  };
  const url = payload.id ? 'api/cliente_atualizar.php' : 'api/cliente_salvar.php';

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(res => {
    if (!res.ok) return;
    if (payload.id) {
      const row = document.querySelector(`tr[data-id=\"${payload.id}\"]`);
      if (row) {
        const nomeBtn = row.querySelector('.js-editar-cliente');
        if (nomeBtn) {
          nomeBtn.textContent = payload.nome;
          nomeBtn.dataset.nome = payload.nome;
          nomeBtn.dataset.telefone = payload.telefone;
          nomeBtn.dataset.endereco = payload.endereco;
          nomeBtn.dataset.aniversario = payload.aniversario;
          nomeBtn.dataset.cep = payload.cep;
          nomeBtn.dataset.rua = payload.rua;
          nomeBtn.dataset.numero = payload.numero;
          nomeBtn.dataset.bairro = payload.bairro;
          nomeBtn.dataset.cidade = payload.cidade;
          nomeBtn.dataset.estado = payload.estado;
          nomeBtn.dataset.complemento = payload.complemento;
        }
        const telefoneBtn = row.querySelector('.js-detalhe-cliente');
        if (telefoneBtn) {
          telefoneBtn.textContent = payload.telefone;
          telefoneBtn.dataset.nome = payload.nome;
          telefoneBtn.dataset.telefone = payload.telefone;
          telefoneBtn.dataset.endereco = payload.endereco;
          telefoneBtn.dataset.aniversario = payload.aniversario;
          telefoneBtn.dataset.cep = payload.cep;
          telefoneBtn.dataset.rua = payload.rua;
          telefoneBtn.dataset.numero = payload.numero;
          telefoneBtn.dataset.bairro = payload.bairro;
          telefoneBtn.dataset.cidade = payload.cidade;
          telefoneBtn.dataset.estado = payload.estado;
          telefoneBtn.dataset.complemento = payload.complemento;
        }
        const cols = row.querySelectorAll('td');
        if (cols[2]) cols[2].textContent = payload.aniversario ? formatarData(payload.aniversario) : 'Nao informado';
        if (cols[5]) cols[5].textContent = payload.endereco || '-';
      }
    } else {
      location.reload();
    }
    if (modalClienteEdit) modalClienteEdit.hide();
  });
}

if (btnNovoCliente && modalClienteEdit) {
  btnNovoCliente.addEventListener('click', () => {
    preencherClienteModal({ id: '', nome: '', telefone: '', endereco: '' });
    modalClienteEdit.show();
  });
}

function bindEditarCliente(){
  document.querySelectorAll('.js-editar-cliente').forEach(btn => {
    btn.addEventListener('click', () => {
      preencherClienteModal({
        id: btn.dataset.id || '',
        nome: btn.dataset.nome || '',
        telefone: btn.dataset.telefone || '',
        endereco: btn.dataset.endereco || '',
        aniversario: btn.dataset.aniversario || '',
        cep: btn.dataset.cep || '',
        rua: btn.dataset.rua || '',
        numero: btn.dataset.numero || '',
        bairro: btn.dataset.bairro || '',
        cidade: btn.dataset.cidade || '',
        estado: btn.dataset.estado || '',
        complemento: btn.dataset.complemento || ''
      });
      if (modalClienteEdit) modalClienteEdit.show();
    });
  });
}
bindEditarCliente();

function resetarTabsPerfil(){
  if (!clientePerfilTabs) return;
  clientePerfilTabs.querySelectorAll('.cliente-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('[data-tab-pane]').forEach(pane => pane.classList.remove('active'));
  const btn = clientePerfilTabs.querySelector('[data-tab="perfil"]');
  const pane = document.querySelector('[data-tab-pane="perfil"]');
  if (btn) btn.classList.add('active');
  if (pane) pane.classList.add('active');
}

function preencherPerfilModal(btn){
  if (!btn) return;
  const nome = btn.dataset.nome || '';
  const telefone = btn.dataset.telefone || '';
  const endereco = btn.dataset.endereco || '-';
  const criadoEm = btn.dataset.criadoEm || '';
  const totalPedidos = Number(btn.dataset.totalPedidos || 0);
  const totalGasto = Number(btn.dataset.totalGasto || 0);
  const cashbackSaldo = Number(btn.dataset.cashback || 0);
  const saldoFiado = Number(btn.dataset.saldoFiado || 0);
  const ticket = totalPedidos > 0 ? totalGasto / totalPedidos : 0;

  if (clientePerfilNome) clientePerfilNome.textContent = nome || 'Cliente';
  if (clientePerfilAvatar) clientePerfilAvatar.textContent = nome ? nome.trim().charAt(0).toUpperCase() : 'C';
  if (clientePerfilDesde) clientePerfilDesde.textContent = `Cliente desde: ${criadoEm ? formatarData(criadoEm) : '-'}`;
  if (clientePerfilTelefone) clientePerfilTelefone.textContent = telefone || '-';
  if (clientePerfilEndereco) clientePerfilEndereco.textContent = endereco || '-';
  if (clientePerfilPedidos) clientePerfilPedidos.textContent = totalPedidos;
  if (clientePerfilTicket) clientePerfilTicket.textContent = formatarMoeda(ticket);
  if (clientePerfilCashback) clientePerfilCashback.textContent = formatarMoeda(cashbackSaldo);
  if (clientePerfilFiado) clientePerfilFiado.textContent = formatarMoeda(saldoFiado);
  if (clientePerfilUltimoPedido) clientePerfilUltimoPedido.textContent = '-';
  if (clientePerfilAvaliacao) clientePerfilAvaliacao.textContent = 'Sem dados';

  clientePerfilAtual = {
    id: btn.dataset.id || '',
    nome,
    telefone,
    endereco: btn.dataset.endereco || '',
    aniversario: btn.dataset.aniversario || '',
    cep: btn.dataset.cep || '',
    rua: btn.dataset.rua || '',
    numero: btn.dataset.numero || '',
    bairro: btn.dataset.bairro || '',
    cidade: btn.dataset.cidade || '',
    estado: btn.dataset.estado || '',
    complemento: btn.dataset.complemento || ''
  };

  resetarTabsPerfil();
  clientePedidosCarregado = false;
  clientePedidosPagina = 1;
  if (clientePedidosPeriodo) clientePedidosPeriodo.value = '30';
  if (clientePedidosTipo) clientePedidosTipo.value = 'todos';

  const clienteId = btn.dataset.id || '';
  if (clienteId) {
    fetch(`api/pdv_cliente_stats.php?cliente_id=${clienteId}`)
      .then(r => r.json())
      .then(res => {
        if (!res || !res.ok) return;
        if (res.stats) {
          if (res.stats.total_pedidos !== undefined && clientePerfilPedidos) {
            clientePerfilPedidos.textContent = res.stats.total_pedidos;
          }
          if (res.stats.ticket_medio !== undefined && clientePerfilTicket) {
            clientePerfilTicket.textContent = formatarMoeda(res.stats.ticket_medio);
          }
          if (res.stats.cashback_saldo !== undefined && clientePerfilCashback) {
            clientePerfilCashback.textContent = formatarMoeda(res.stats.cashback_saldo);
          }
          if (res.stats.ultimo_pedido && clientePerfilUltimoPedido) {
            clientePerfilUltimoPedido.textContent = formatarDataHora(res.stats.ultimo_pedido.criado_em);
          }
        }
      })
      .catch(() => {});
  }
}

function bindDetalheCliente(){
  document.querySelectorAll('.js-detalhe-cliente').forEach(btn => {
    btn.addEventListener('click', () => {
      preencherPerfilModal(btn);
      if (modalClientePerfil) modalClientePerfil.show();
      carregarPedidosCliente(1);
    });
  });
}
bindDetalheCliente();

if (clienteEditSalvar) {
  clienteEditSalvar.addEventListener('click', salvarClienteModal);
}

if (clienteEditNome) {
  clienteEditNome.addEventListener('input', () => {
    clienteEditNome.classList.remove('is-invalid');
    if (clienteEditNomeErro) clienteEditNomeErro.textContent = '';
  });
}
if (clienteEditTelefone) {
  clienteEditTelefone.addEventListener('input', () => {
    clienteEditTelefone.classList.remove('is-invalid');
    if (clienteEditTelefoneErro) clienteEditTelefoneErro.textContent = '';
  });
}

function montarUrlBusca(pagina){
  const params = new URLSearchParams();
  const termo = buscaInput ? buscaInput.value.trim() : '';
  if (termo) params.set('busca', termo);
  params.set('pagina', pagina || 1);
  params.set('ajax', '1');
  return `clientes.php?${params.toString()}`;
}

function atualizarUrlBarra(pagina){
  if (!buscaInput) return;
  const params = new URLSearchParams();
  const termo = buscaInput.value.trim();
  if (termo) params.set('busca', termo);
  params.set('pagina', pagina || 1);
  const url = `clientes.php?${params.toString()}`;
  history.replaceState(null, '', url);
}

function carregarResultados(url, pagina){
  if (!resultadosEl) return;
  resultadosEl.classList.add('is-loading');
  if (skeletonEl) skeletonEl.classList.add('is-visible');
  fetch(url, { headers: { 'X-Requested-With':'XMLHttpRequest' } })
    .then(r => r.text())
    .then(html => {
      resultadosEl.innerHTML = html;
      resultadosEl.classList.remove('is-loading');
      if (skeletonEl) skeletonEl.classList.remove('is-visible');
      bindEditarCliente();
      bindDetalheCliente();
      atualizarUrlBarra(pagina);
    })
    .catch(() => {
      resultadosEl.classList.remove('is-loading');
      if (skeletonEl) skeletonEl.classList.remove('is-visible');
    });
}

if (buscaInput) {
  buscaInput.addEventListener('input', () => {
    clearTimeout(buscaTimer);
    const termo = buscaInput.value.trim();
    if (termo.length > 0 && termo.length < 2) {
      return;
    }
    buscaTimer = setTimeout(() => {
      carregarResultados(montarUrlBusca(1), 1);
    }, 300);
  });
}

if (buscaForm) {
  buscaForm.addEventListener('submit', e => {
    e.preventDefault();
    carregarResultados(montarUrlBusca(1), 1);
  });
}

if (resultadosEl) {
  resultadosEl.addEventListener('click', e => {
    const link = e.target.closest('.rc-page-btn');
    if (!link) return;
    e.preventDefault();
    const url = new URL(link.href, window.location.origin);
    const pagina = Number(url.searchParams.get('pagina') || 1);
    url.searchParams.set('ajax', '1');
    carregarResultados(url.toString(), pagina);
  });
}

function badgeTipoPedido(tipo){
  const valor = (tipo || '').toLowerCase();
  if (valor === 'entrega') return { label: 'Entrega', className: 'entrega' };
  if (valor === 'retirada') return { label: 'Retirada', className: 'retirada' };
  if (valor === 'mesa') return { label: 'Mesa', className: 'mesa' };
  return { label: tipo || 'Outro', className: 'retirada' };
}

function renderPaginacaoCompacta(paginaAtual, totalPaginas) {
  if (totalPaginas <= 1) return '';
  const prevDis = paginaAtual <= 1;
  const nextDis = paginaAtual >= totalPaginas;
  let html = '';
  html += `<button type="button" class="pg-arrow" ${prevDis ? 'disabled' : ''} data-page="${paginaAtual - 1}">&#8249;</button>`;

  if (totalPaginas <= 6) {
    for (let i = 1; i <= totalPaginas; i++) {
      html += `<button type="button" class="${i === paginaAtual ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
  } else {
    const delta = 1;
    const mid = [];
    for (let i = Math.max(2, paginaAtual - delta); i <= Math.min(totalPaginas - 1, paginaAtual + delta); i++) {
      mid.push(i);
    }
    html += `<button type="button" class="${paginaAtual === 1 ? 'active' : ''}" data-page="1">1</button>`;
    if (mid.length && mid[0] > 2) html += '<span class="pg-ellipsis">…</span>';
    mid.forEach(i => {
      html += `<button type="button" class="${i === paginaAtual ? 'active' : ''}" data-page="${i}">${i}</button>`;
    });
    if (mid.length && mid[mid.length - 1] < totalPaginas - 1) html += '<span class="pg-ellipsis">…</span>';
    html += `<button type="button" class="${paginaAtual === totalPaginas ? 'active' : ''}" data-page="${totalPaginas}">${totalPaginas}</button>`;
  }

  html += `<button type="button" class="pg-arrow" ${nextDis ? 'disabled' : ''} data-page="${paginaAtual + 1}">&#8250;</button>`;
  return html;
}

function renderPedidos(pedidos, paginas){
  if (!clientePedidosLista || !clientePedidosPaginacao) return;
  if (!pedidos || pedidos.length === 0) {
    clientePedidosLista.innerHTML = '<div class="cliente-pedidos-vazio">Nenhum pedido encontrado para os filtros selecionados.</div>';
    clientePedidosPaginacao.innerHTML = '';
    return;
  }
  clientePedidosLista.innerHTML = pedidos.map(p => {
    const badge = badgeTipoPedido(p.tipo);
    const resumo = p.resumo || 'Sem itens.';
    return `
      <div class="cliente-pedido-card js-pedido-detalhe" data-pedido-id="${p.id}">
        <div class="cliente-pedido-top">
          <div class="cliente-pedido-data">
            <i class="bi bi-calendar-event"></i>
            Pedido realizado em: <strong>${formatarDataHora(p.criado_em)}</strong>
          </div>
          <span class="pedido-badge ${badge.className}">${badge.label}</span>
        </div>
        <div class="cliente-pedido-resumo">
          <small>Resumo do pedido:</small><br>
          ${resumo}
        </div>
        <div class="cliente-pedido-total">
          <span>Total:</span>
          <strong>${formatarMoeda(p.total)}</strong>
        </div>
      </div>
    `;
  }).join('');

  const pages = Math.max(1, paginas || 1);
  clientePedidosPaginacao.innerHTML = renderPaginacaoCompacta(clientePedidosPagina, pages);
}

function carregarPedidosCliente(pagina){
  if (!clientePerfilAtual || !clientePerfilAtual.id) return;
  if (!clientePedidosLista) return;
  const periodo = clientePedidosPeriodo ? clientePedidosPeriodo.value : '30';
  const tipo = clientePedidosTipo ? clientePedidosTipo.value : 'todos';
  clientePedidosPagina = pagina || 1;
  clientePedidosLista.innerHTML = '<div class="cliente-pedidos-vazio">Carregando pedidos...</div>';
  fetch(`api/cliente_pedidos.php?cliente_id=${clientePerfilAtual.id}&periodo=${periodo}&tipo=${tipo}&pagina=${clientePedidosPagina}`)
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok) {
        renderPedidos([], 1);
        return;
      }
      renderPedidos(res.pedidos || [], res.paginas || 1);
      clientePedidosCarregado = true;
    })
    .catch(() => renderPedidos([], 1));
}

function mapStatusPedido(status){
  const valor = (status || '').toLowerCase();
  if (valor === 'pendente') return 'PENDENTE';
  if (valor === 'aceito') return 'ACEITO';
  if (valor === 'preparando') return 'EM PREPARO';
  if (valor === 'entrega') return 'SAIU PARA ENTREGA';
  if (valor === 'finalizado') return 'FINALIZADO';
  if (valor === 'cancelado') return 'CANCELADO';
  return status ? status.toUpperCase() : '-';
}

function formatarFormaPagamento(forma){
  const valor = (forma || '').toLowerCase();
  if (valor === 'pix') return 'Pix';
  if (valor === 'dinheiro') return 'Dinheiro';
  if (valor === 'credito') return 'Cartao de credito';
  if (valor === 'debito') return 'Cartao de debito';
  return forma || '-';
}

function prepararBotoesEntrega(tipo, endereco){
  const entrega = (tipo || '').toLowerCase() === 'entrega';
  if (pedidoDetalheEnderecoWrap) pedidoDetalheEnderecoWrap.style.display = entrega ? 'block' : 'none';
  if (pedidoDetalheTaxaWrap) pedidoDetalheTaxaWrap.style.display = entrega ? 'block' : 'none';
  if (pedidoDetalheEntregaLinks) pedidoDetalheEntregaLinks.style.display = entrega ? 'flex' : 'none';
  if (pedidoDetalheEndereco && entrega) pedidoDetalheEndereco.textContent = endereco || '-';
}

function preencherModalPedido(dados){
  const pedido = dados.pedido || {};
  const itens = dados.itens || [];
  const pagamentos = dados.pagamentos || [];
  pedidoDetalheAtual = pedido.id || null;

  if (pedidoDetalheNumero) pedidoDetalheNumero.textContent = `Pedido N. ${pedido.id || '-'}`;
  if (pedidoDetalheTempo) pedidoDetalheTempo.textContent = tempoDesde(pedido.criado_em);
  if (pedidoDetalheHorario) pedidoDetalheHorario.textContent = formatarDataHora(pedido.criado_em);
  if (pedidoDetalheStatus) pedidoDetalheStatus.textContent = mapStatusPedido(pedido.status);
  if (pedidoDetalheCliente) pedidoDetalheCliente.textContent = pedido.nome || '-';
  if (pedidoDetalheTelefone) pedidoDetalheTelefone.textContent = pedido.telefone || '-';

  const tipo = (pedido.tipo || '').toUpperCase() || 'RETIRADA';
  if (pedidoDetalheTipoTitulo) pedidoDetalheTipoTitulo.textContent = tipo;
  prepararBotoesEntrega(pedido.tipo, pedido.endereco_entrega || '');

  if (pedidoDetalheTaxa) pedidoDetalheTaxa.textContent = formatarMoeda(pedido.taxa_entrega || 0);
  if (pedidoDetalheTaxaResumo) pedidoDetalheTaxaResumo.textContent = formatarMoeda(pedido.taxa_entrega || 0);

  if (pedidoDetalheSubtotal) pedidoDetalheSubtotal.textContent = formatarMoeda(pedido.subtotal || 0);
  if (pedidoDetalheDesconto) pedidoDetalheDesconto.textContent = formatarMoeda(pedido.desconto || 0);
  if (pedidoDetalheMaquininha) pedidoDetalheMaquininha.textContent = formatarMoeda(pedido.taxa_maquininha || 0);
  let cashbackValor = Number(pedido.cashback_valor || 0);
  if (!cashbackValor) {
    const cashbackPercent = Number(pedido.cashback_percentual || 0);
    if (cashbackPercent > 0) {
      const subtotalBase = Number(pedido.subtotal || 0);
      const descontoBase = Number(pedido.desconto || 0);
      let baseCashback = subtotalBase > 0
        ? (subtotalBase - descontoBase)
        : (Number(pedido.total || 0) - Number(pedido.taxa_entrega || 0) - descontoBase);
      if (baseCashback < 0) baseCashback = 0;
      cashbackValor = baseCashback * (cashbackPercent / 100);
    }
  }
  if (pedidoDetalheCashback) pedidoDetalheCashback.textContent = formatarMoeda(cashbackValor);
  if (pedidoDetalheTotal) pedidoDetalheTotal.textContent = formatarMoeda(pedido.total || 0);

  if (pedidoDetalheLinhaDesconto) pedidoDetalheLinhaDesconto.style.display = pedido.desconto > 0 ? 'flex' : 'none';
  if (pedidoDetalheLinhaTaxa) pedidoDetalheLinhaTaxa.style.display = pedido.taxa_entrega > 0 ? 'flex' : 'none';
  if (pedidoDetalheLinhaMaquininha) pedidoDetalheLinhaMaquininha.style.display = pedido.taxa_maquininha > 0 ? 'flex' : 'none';
  if (pedidoDetalheLinhaCashback) pedidoDetalheLinhaCashback.style.display = cashbackValor > 0 ? 'flex' : 'none';

  if (pedidoDetalhePagamentos) {
    if (pagamentos.length) {
      pedidoDetalhePagamentos.innerHTML = pagamentos.map(p => `${formatarFormaPagamento(p.forma)} ${formatarMoeda(p.valor)}`).join('<br>');
    } else {
      pedidoDetalhePagamentos.textContent = `${formatarFormaPagamento(pedido.forma_pagamento)} ${formatarMoeda(pedido.total || 0)}`;
    }
  }

  if (pedidoDetalheItens) {
    if (!itens.length) {
      pedidoDetalheItens.innerHTML = '<div class="cliente-pedidos-vazio">Sem itens.</div>';
    } else {
      pedidoDetalheItens.innerHTML = itens.map(i => {
        const totalItem = Number(i.preco || 0) * Number(i.quantidade || 0);
        return `
          <div class="pedido-detalhe-item-row">
            <span>${i.quantidade}x ${i.produto_nome}</span>
            <strong>${formatarMoeda(totalItem)}</strong>
          </div>
        `;
      }).join('');
    }
  }

  if (pedidoDetalheEditar) {
    pedidoDetalheEditar.href = `pedido.php?id=${pedido.id}`;
  }

  if (pedidoDetalheContato) {
    const digits = (pedido.telefone || '').replace(/\D/g, '');
    pedidoDetalheContato.href = digits ? `tel:${digits}` : '#';
  }
  if (pedidoDetalheWhatsapp) {
    const digits = (pedido.telefone || '').replace(/\D/g, '');
    const whatsapp = digits ? (digits.length <= 11 ? `55${digits}` : digits) : '';
    pedidoDetalheWhatsapp.href = whatsapp ? `https://wa.me/${whatsapp}` : '#';
  }

  if (pedidoDetalheFinalizar) {
    pedidoDetalheFinalizar.style.display = pedido.status === 'finalizado' ? 'none' : 'inline-flex';
  }
  if (pedidoDetalheCancelar) {
    pedidoDetalheCancelar.style.display = pedido.status === 'cancelado' ? 'none' : 'inline-flex';
  }
}

function abrirModalPedidoAgora(id){
  if (!modalPedidoDetalhe) return;
  if (pedidoDetalheNumero) pedidoDetalheNumero.textContent = 'Pedido N. -';
  if (pedidoDetalheItens) pedidoDetalheItens.innerHTML = '<div class="cliente-pedidos-vazio">Carregando pedido...</div>';
  modalPedidoDetalhe.show();
  fetch(`api/pedido_detalhe.php?pedido_id=${id}`)
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok) return;
      preencherModalPedido(res);
    })
    .catch(() => {});
}

function abrirModalPedido(id){
  if (!modalPedidoDetalhe) return;
  const perfilAberto = modalClientePerfilEl && modalClientePerfilEl.classList.contains('show');
  if (perfilAberto && modalClientePerfil) {
    pedidoModalParaAbrir = id;
    reabrirPerfilAposPedido = true;
    modalClientePerfil.hide();
    return;
  }
  reabrirPerfilAposPedido = false;
  abrirModalPedidoAgora(id);
}

if (clientePerfilTabs) {
  clientePerfilTabs.addEventListener('click', e => {
    const btn = e.target.closest('.cliente-tab');
    if (!btn) return;
    const alvo = btn.dataset.tab;
    clientePerfilTabs.querySelectorAll('.cliente-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('[data-tab-pane]').forEach(pane => {
      pane.classList.toggle('active', pane.dataset.tabPane === alvo);
    });
    if (alvo === 'pedidos' && !clientePedidosCarregado) {
      carregarPedidosCliente(1);
    }
  });
}

if (clientePerfilEditar) {
  clientePerfilEditar.addEventListener('click', () => {
    if (!clientePerfilAtual) return;
    if (modalClientePerfil) modalClientePerfil.hide();
    preencherClienteModal(clientePerfilAtual);
    if (modalClienteEdit) modalClienteEdit.show();
  });
}

if (clientePedidosPeriodo) {
  clientePedidosPeriodo.addEventListener('change', () => carregarPedidosCliente(1));
}
if (clientePedidosTipo) {
  clientePedidosTipo.addEventListener('change', () => carregarPedidosCliente(1));
}
if (clientePedidosPaginacao) {
  clientePedidosPaginacao.addEventListener('click', e => {
    const btn = e.target.closest('button[data-page]');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page || 1);
    if (page > 0) carregarPedidosCliente(page);
  });
}

if (clientePedidosLista) {
  clientePedidosLista.addEventListener('click', e => {
    const card = e.target.closest('.js-pedido-detalhe');
    if (!card) return;
    const pedidoId = card.dataset.pedidoId;
    if (pedidoId) abrirModalPedido(pedidoId);
  });
}

if (pedidoDetalheCopiarEndereco) {
  pedidoDetalheCopiarEndereco.addEventListener('click', () => {
    if (!pedidoDetalheEndereco) return;
    const texto = pedidoDetalheEndereco.textContent.trim();
    if (!texto) return;
    navigator.clipboard?.writeText(texto);
  });
}

if (pedidoDetalheImprimir) {
  pedidoDetalheImprimir.addEventListener('click', () => window.print());
}

if (pedidoDetalheCancelar) {
  pedidoDetalheCancelar.addEventListener('click', () => {
    if (!pedidoDetalheAtual) return;
    fetch('api/pedidos_cancelar.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id: pedidoDetalheAtual })
    }).then(r => r.json()).then(res => {
      if (res && res.ok) {
        if (pedidoDetalheStatus) pedidoDetalheStatus.textContent = mapStatusPedido('cancelado');
        if (pedidoDetalheCancelar) pedidoDetalheCancelar.style.display = 'none';
      }
    });
  });
}

if (pedidoDetalheFinalizar) {
  pedidoDetalheFinalizar.addEventListener('click', () => {
    if (!pedidoDetalheAtual) return;
    fetch('api/pedidos_finalizar.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id: pedidoDetalheAtual })
    }).then(r => r.json()).then(res => {
      if (res && res.ok) {
        if (pedidoDetalheStatus) pedidoDetalheStatus.textContent = mapStatusPedido('finalizado');
        if (pedidoDetalheFinalizar) pedidoDetalheFinalizar.style.display = 'none';
      }
    });
  });
}

if (modalPedidoDetalheEl) {
  modalPedidoDetalheEl.addEventListener('shown.bs.modal', () => {});
  modalPedidoDetalheEl.addEventListener('hidden.bs.modal', () => {
    if (reabrirPerfilAposPedido && modalClientePerfil) {
      reabrirPerfilAposPedido = false;
      modalClientePerfil.show();
    }
  });
}

if (modalClientePerfilEl) {
  modalClientePerfilEl.addEventListener('hidden.bs.modal', () => {
    if (pedidoModalParaAbrir) {
      const id = pedidoModalParaAbrir;
      pedidoModalParaAbrir = null;
      abrirModalPedidoAgora(id);
    }
  });
}

