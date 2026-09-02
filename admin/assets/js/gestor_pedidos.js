/* Notificação sonora e toast de novo pedido: ver partials/sidebar.php (global, todas as telas) */

const perfilOperador = GESTOR_DATA.perfilOperador;
const podeGerenciarPedidos = ['admin','gerente'].includes(perfilOperador);
const colunas={pendente:'Pendente',aceito:'Aceito',preparando:'Preparando',entrega:'Entrega'};
const agendamentoHorarios = GESTOR_DATA.agendamentoHorarios;
let filtro='todos',ultimoSnapshot='',pausado=false;
let pedidosCache = [];
const filtrosKanban = {
  pendente: { tipo: 'todos', hoje: false },
  aceito: { tipo: 'todos', hoje: false },
  preparando: { tipo: 'todos', hoje: false },
  entrega: { tipo: 'todos', hoje: false }
};
const modalPedidoDetalheEl = document.getElementById('modalPedidoDetalhe');
let modalPedidoDetalhe = modalPedidoDetalheEl ? new bootstrap.Modal(modalPedidoDetalheEl) : null;

/* Garante estado limpo do Bootstrap antes de reabrir o modal — evita o modal
   ficar "preso" (achando que ja esta aberto) depois de um hide() programatico,
   o que faria show() nao fazer nada na proxima vez sem um refresh da pagina. */
function reabrirModalPedidoDetalhe(){
  if (!modalPedidoDetalheEl) return null;
  try {
    const instanciaExistente = bootstrap.Modal.getInstance(modalPedidoDetalheEl);
    if (instanciaExistente) instanciaExistente.dispose();
  } catch (e) {}
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('padding-right');
  document.body.style.removeProperty('overflow');
  modalPedidoDetalhe = new bootstrap.Modal(modalPedidoDetalheEl);
  return modalPedidoDetalhe;
}
const motoboysDisponiveis = GESTOR_DATA.motoboysDisponiveis;
function fecharModalNovoPedido(){
  if (typeof window.fecharPdvModal === 'function') {
    window.fecharPdvModal();
  }
}

function pdvPedidoFinalizado(){
  fecharModalNovoPedido();
  setTimeout(carregarPedidos, 50);
}

window.pdvPedidoFinalizado = pdvPedidoFinalizado;
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data && event.data.type === 'pdv:pedido-finalizado') {
    pdvPedidoFinalizado(event.data.payload || {});
  }
});
const pedidoDetalheNumero = document.getElementById('pedidoDetalheNumero');
const pedidoDetalheTempo = document.getElementById('pedidoDetalheTempo');
const pedidoDetalheHorario = document.getElementById('pedidoDetalheHorario');
const pedidoDetalheStatus = document.getElementById('pedidoDetalheStatus');
const pedidoDetalheCliente = document.getElementById('pedidoDetalheCliente');
const pedidoDetalheTelefone = document.getElementById('pedidoDetalheTelefone');
const pedidoDetalheStatsWrap = document.getElementById('pedidoDetalheStatsWrap');
const pedidoDetalhePedidosFeitos = document.getElementById('pedidoDetalhePedidosFeitos');
const pedidoDetalheTicketMedio = document.getElementById('pedidoDetalheTicketMedio');
const pedidoDetalhePontos = document.getElementById('pedidoDetalhePontos');
const pedidoDetalhePontosMetric = document.getElementById('pedidoDetalhePontosMetric');
const pedidoDetalheCashbackTotal = document.getElementById('pedidoDetalheCashbackTotal');
const pedidoDetalheCashbackMetric = document.getElementById('pedidoDetalheCashbackMetric');
const pedidoDetalheCashbackExpira = document.getElementById('pedidoDetalheCashbackExpira');
const pedidoDetalheCashbackExpirado = document.getElementById('pedidoDetalheCashbackExpirado');
const pedidoDetalheVerCliente = document.getElementById('pedidoDetalheVerCliente');
const pedidoDetalheContato = document.getElementById('pedidoDetalheContato');
const pedidoDetalheWhatsapp = document.getElementById('pedidoDetalheWhatsapp');
const pedidoDetalheTipoTitulo = document.getElementById('pedidoDetalheTipoTitulo');
const pedidoDetalheEnderecoWrap = document.getElementById('pedidoDetalheEnderecoWrap');
const pedidoDetalheEndereco = document.getElementById('pedidoDetalheEndereco');
const pedidoDetalheAgendamentoWrap = document.getElementById('pedidoDetalheAgendamentoWrap');
const pedidoDetalheAgendamentoTitulo = document.getElementById('pedidoDetalheAgendamentoTitulo');
const pedidoDetalheAgendamentoOrigem = document.getElementById('pedidoDetalheAgendamentoOrigem');
const pedidoDetalheAgendamentoBox = document.getElementById('pedidoDetalheAgendamentoBox');
const pedidoDetalheTaxaWrap = document.getElementById('pedidoDetalheTaxaWrap');
const pedidoDetalheTaxa = document.getElementById('pedidoDetalheTaxa');
const pedidoDetalheMotoboyWrap = document.getElementById('pedidoDetalheMotoboyWrap');
const pedidoDetalheMotoboy = document.getElementById('pedidoDetalheMotoboy');
const pedidoDetalheEntregaLinks = document.getElementById('pedidoDetalheEntregaLinks');
const pedidoDetalheCopiarEndereco = document.getElementById('pedidoDetalheCopiarEndereco');
const pedidoDetalheVincularEntregador = document.getElementById('pedidoDetalheVincularEntregador');
const pedidoDetalhePagamentos = document.getElementById('pedidoDetalhePagamentos');
const pedidoDetalheObsWrap = document.getElementById('pedidoDetalheObsWrap');
const pedidoDetalheObsTexto = document.getElementById('pedidoDetalheObsTexto');
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
let pedidoDetalheAtual = null;
let pedidoDetalheUltimoPayload = null;
const modalPedidoMotoboyEl = document.getElementById('modalPedidoMotoboy');
const modalPedidoMotoboy = modalPedidoMotoboyEl ? new bootstrap.Modal(modalPedidoMotoboyEl) : null;
const modalPedidoAlertaMotoboyEl = document.getElementById('modalPedidoAlertaMotoboy');
const modalPedidoAlertaMotoboy = modalPedidoAlertaMotoboyEl ? new bootstrap.Modal(modalPedidoAlertaMotoboyEl) : null;
const pedidoMotoboyPedido = document.getElementById('pedidoMotoboyPedido');
const pedidoMotoboySelect = document.getElementById('pedidoMotoboySelect');
const pedidoMotoboySalvar = document.getElementById('pedidoMotoboySalvar');
const pedidoAlertaContinuarSemMotoboy = document.getElementById('pedidoAlertaContinuarSemMotoboy');
const pedidoAlertaVincularMotoboy = document.getElementById('pedidoAlertaVincularMotoboy');
let pedidoAlertaMotoboySelect = document.getElementById('pedidoAlertaMotoboySelect');
const pedidoAlertaMotoboyErro = document.getElementById('pedidoAlertaMotoboyErro');
let pedidoAguardandoVinculoEntrega = null;

const modalClientePerfilEl = document.getElementById('modalClientePerfil');
const modalClientePerfil = modalClientePerfilEl ? new bootstrap.Modal(modalClientePerfilEl) : null;
const modalClienteEditEl = document.getElementById('modalClienteEdit');
const modalClienteEdit = modalClienteEditEl ? new bootstrap.Modal(modalClienteEditEl) : null;
const clienteEditTitulo = modalClienteEditEl ? modalClienteEditEl.querySelector('.modal-title') : null;
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
const clientePerfilAvatar = document.getElementById('clientePerfilAvatar');
const clientePerfilNome = document.getElementById('clientePerfilNome');
const clientePerfilDesde = document.getElementById('clientePerfilDesde');
const clientePerfilCashback = document.getElementById('clientePerfilCashback');
const clientePerfilCashbackExpira = document.getElementById('clientePerfilCashbackExpira');
const clientePerfilCashbackExpirado = document.getElementById('clientePerfilCashbackExpirado');
const clientePerfilPontos = document.getElementById('clientePerfilPontos');
const clientePerfilFiado = document.getElementById('clientePerfilFiado');
const clientePerfilTicket = document.getElementById('clientePerfilTicket');
const clientePerfilUltimoPedido = document.getElementById('clientePerfilUltimoPedido');
const clientePerfilPedidos = document.getElementById('clientePerfilPedidos');
const clientePerfilTelefone = document.getElementById('clientePerfilTelefone');
const clientePerfilEndereco = document.getElementById('clientePerfilEndereco');
const clientePerfilRegistrarFiado = document.getElementById('clientePerfilRegistrarFiado');
const clientePerfilEditar = document.getElementById('clientePerfilEditar');
const clientePerfilTabs = document.getElementById('clientePerfilTabs');
const clientePedidosPeriodo = document.getElementById('clientePedidosPeriodo');
const clientePedidosTipo = document.getElementById('clientePedidosTipo');
const clientePedidosLista = document.getElementById('clientePedidosLista');
const clientePedidosPaginacao = document.getElementById('clientePedidosPaginacao');
const clientePontosLista = document.getElementById('clientePontosLista');
const clientePontosPaginacao = document.getElementById('clientePontosPaginacao');

let clientePerfilAtual = null;
let clientePedidosPagina = 1;
let clientePedidosCarregado = false;
let clientePontosPagina = 1;
let clientePontosCarregado = false;
let clientePerfilUltimoPedidoId = null;
let clientePerfilReabrir = false;
let clientePerfilReabrirPedido = false;

/* ===== UTIL ===== */
function tempoNoStatus(d){
  if(!d) return '';
  const m=Math.floor((new Date()-new Date(d))/60000);
  const h=Math.floor(m/60);
  return m>30?`<span class="atrasado">?? ${h>0?h+'h ':''}${m%60}m</span>`:`?? ${h>0?h+'h ':''}${m%60}m`;
}

function normalizarData(valor){
  if (!valor) return '';
  return valor.includes(' ') ? valor.replace(' ', 'T') : valor;
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

function formatarData(valor){
  if (!valor) return '-';
  const data = new Date(normalizarData(valor));
  if (Number.isNaN(data.getTime())) return valor;
  const dia = String(data.getDate()).padStart(2,'0');
  const mes = String(data.getMonth() + 1).padStart(2,'0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function formatarMoeda(valor){
  const numero = Number(valor || 0);
  return `R$ ${numero.toFixed(2).replace('.',',')}`;
}

function formatarHora(valor){
  if (!valor) return '--:--';
  const data = new Date(normalizarData(valor));
  if (Number.isNaN(data.getTime())) return '--:--';
  const hora = String(data.getHours()).padStart(2,'0');
  const min = String(data.getMinutes()).padStart(2,'0');
  return `${hora}:${min}`;
}

function abrirModalClientePerfil(clienteId, baseInfo = {}){
  if (!modalClientePerfil || !clienteId) return;
  if (modalPedidoDetalhe) modalPedidoDetalhe.hide();
  clientePerfilAtual = { id: clienteId };
  clientePedidosCarregado = false;
  clientePedidosPagina = 1;
  clientePontosCarregado = false;
  clientePontosPagina = 1;
  if (clientePedidosPeriodo) clientePedidosPeriodo.value = '30';
  if (clientePedidosTipo) clientePedidosTipo.value = 'todos';
  if (clientePedidosLista) clientePedidosLista.innerHTML = '';
  if (clientePedidosPaginacao) clientePedidosPaginacao.innerHTML = '';
  if (clientePontosLista) clientePontosLista.innerHTML = '';
  if (clientePontosPaginacao) clientePontosPaginacao.innerHTML = '';
  if (clientePerfilTabs) {
    clientePerfilTabs.querySelectorAll('.cliente-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === 'perfil');
    });
    document.querySelectorAll('#modalClientePerfil [data-tab-pane]').forEach(pane => {
      pane.classList.toggle('active', pane.dataset.tabPane === 'perfil');
    });
  }
  if (clientePerfilNome) clientePerfilNome.textContent = baseInfo.nome || 'Cliente';
  if (clientePerfilAvatar) {
    const letra = (baseInfo.nome || 'C').trim().charAt(0).toUpperCase();
    clientePerfilAvatar.textContent = letra || 'C';
  }
  if (clientePerfilDesde) clientePerfilDesde.textContent = 'Cliente desde: -';
  if (clientePerfilTelefone) clientePerfilTelefone.textContent = baseInfo.telefone || '-';
  if (clientePerfilEndereco) clientePerfilEndereco.textContent = baseInfo.endereco || '-';
  if (clientePerfilCashback) clientePerfilCashback.textContent = 'R$ 0,00';
  if (clientePerfilTicket) clientePerfilTicket.textContent = 'R$ 0,00';
  if (clientePerfilUltimoPedido) clientePerfilUltimoPedido.textContent = '-';
  if (clientePerfilPedidos) clientePerfilPedidos.textContent = '0';
  if (clientePerfilPontos) clientePerfilPontos.textContent = 'Sem dados';
  if (clientePerfilFiado) clientePerfilFiado.textContent = 'R$ 0,00';
  if (clientePerfilCashbackExpira) clientePerfilCashbackExpira.classList.add('d-none');
  if (clientePerfilCashbackExpirado) clientePerfilCashbackExpirado.classList.add('d-none');

  if (clientePerfilEditar) {
    clientePerfilEditar.onclick = () => {
      abrirModalClienteEdit(clienteId);
    };
  }
  if (clientePerfilRegistrarFiado) {
    clientePerfilRegistrarFiado.onclick = () => window.open(`clientes.php?cliente_id=${clienteId}`, '_blank');
  }

  modalClientePerfil.show();

  fetch(`api/pdv_cliente_stats.php?cliente_id=${clienteId}`)
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok) return;
      const cliente = res.cliente || {};
      const stats = res.stats || {};
      if (clientePerfilNome) clientePerfilNome.textContent = cliente.nome || baseInfo.nome || 'Cliente';
      if (clientePerfilAvatar) {
        const letra = (cliente.nome || baseInfo.nome || 'C').trim().charAt(0).toUpperCase();
        clientePerfilAvatar.textContent = letra || 'C';
      }
      if (clientePerfilDesde) clientePerfilDesde.textContent = `Cliente desde: ${cliente.criado_em ? formatarData(cliente.criado_em) : '-'}`;
      if (clientePerfilTelefone) clientePerfilTelefone.textContent = cliente.telefone || baseInfo.telefone || '-';
      if (clientePerfilEndereco) {
        const endereco = stats.ultimo_endereco || cliente.endereco || baseInfo.endereco || '-';
        clientePerfilEndereco.textContent = endereco || '-';
      }

      if (clientePerfilCashback) clientePerfilCashback.textContent = formatarMoeda(stats.cashback_saldo || 0);
      if (clientePerfilPontos) {
        const pontosValor = stats.pontos;
        clientePerfilPontos.textContent = (pontosValor === undefined || pontosValor === null)
          ? 'Sem dados'
          : `${pontosValor} pts`;
      }
      if (clientePerfilTicket) clientePerfilTicket.textContent = formatarMoeda(stats.ticket_medio || 0);
      if (clientePerfilUltimoPedido) {
        clientePerfilUltimoPedido.textContent = stats.ultimo_pedido
          ? formatarData(stats.ultimo_pedido.criado_em)
          : '-';
      }
      if (clientePerfilPedidos) clientePerfilPedidos.textContent = stats.total_pedidos || 0;
      clientePerfilUltimoPedidoId = stats.ultimo_pedido ? stats.ultimo_pedido.id : null;

      if (clientePerfilCashbackExpira) {
        if ((stats.cashback_saldo || 0) > 0 && stats.cashback_expira_em) {
          clientePerfilCashbackExpira.textContent = `Expira em ${formatarData(stats.cashback_expira_em)}`;
          clientePerfilCashbackExpira.classList.remove('d-none');
        } else {
          clientePerfilCashbackExpira.classList.add('d-none');
        }
      }
      if (clientePerfilCashbackExpirado) {
        if ((stats.cashback_saldo || 0) <= 0 && stats.cashback_expirado) {
          clientePerfilCashbackExpirado.classList.remove('d-none');
        } else {
          clientePerfilCashbackExpirado.classList.add('d-none');
        }
      }
    })
    .catch(() => {});
}

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
  if (clienteEditTelefone) clienteEditTelefone.value = formatarTelefone(data.telefone || '');
  if (clienteEditAniversario) clienteEditAniversario.value = data.aniversario || '';
  if (clienteEditCep) clienteEditCep.value = data.cep || '';
  if (clienteEditRua) clienteEditRua.value = data.rua || data.endereco || '';
  if (clienteEditNumero) clienteEditNumero.value = data.numero || '';
  if (clienteEditBairro) clienteEditBairro.value = data.bairro || '';
  if (clienteEditCidade) clienteEditCidade.value = data.cidade || '';
  if (clienteEditEstado) clienteEditEstado.value = data.estado || '';
  if (clienteEditComplemento) clienteEditComplemento.value = data.complemento || '';
  limparErrosCliente();
}

function abrirModalClienteEdit(clienteId){
  if (!modalClienteEdit) return;
  const id = clienteId || (clientePerfilAtual ? clientePerfilAtual.id : '');
  const basePayload = {
    id,
    nome: clientePerfilNome ? clientePerfilNome.textContent.trim() : '',
    telefone: clientePerfilTelefone ? clientePerfilTelefone.textContent.trim() : '',
    endereco: clientePerfilEndereco ? clientePerfilEndereco.textContent.trim() : ''
  };
  preencherClienteModal(basePayload);
  clientePerfilReabrir = false;
  if (modalClientePerfil) {
    modalClientePerfil.hide();
    clientePerfilReabrir = true;
  }
  modalClienteEdit.show();
  if (!id) return;
  fetch(`api/cliente_detalhe.php?cliente_id=${id}`)
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok || !res.cliente) return;
      preencherClienteModal(res.cliente);
    })
    .catch(() => {});
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
  if (rua !== '') partes.push(numero !== '' ? `${rua}, ${numero}` : rua);
  if (bairro !== '') partes.push(bairro);
  const cidadeEstado = `${cidade}${estado ? ` / ${estado}` : ''}`.trim();
  if (cidadeEstado !== '') partes.push(cidadeEstado);
  if (cep !== '') partes.push(cep);
  if (complemento !== '') partes.push(complemento);

  return {
    cep,
    rua,
    numero,
    bairro,
    cidade,
    estado,
    complemento,
    endereco: partes.join(' - ')
  };
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

function formatarTelefone(valor){
  const digits = (valor || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}

function aplicarMascaraTelefone(input){
  if (!input) return;
  const pos = input.selectionStart || 0;
  input.value = formatarTelefone(input.value);
  if (input === document.activeElement) {
    const delta = input.value.length - pos;
    const novaPos = Math.max(0, pos + delta);
    input.setSelectionRange(novaPos, novaPos);
  }
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
    if (!res || !res.ok) return;
    if (modalClienteEdit) modalClienteEdit.hide();
    if (clientePerfilNome) clientePerfilNome.textContent = payload.nome;
    if (clientePerfilAvatar) {
      const letra = payload.nome.trim().charAt(0).toUpperCase();
      clientePerfilAvatar.textContent = letra || 'C';
    }
    if (clientePerfilTelefone) clientePerfilTelefone.textContent = payload.telefone;
    if (clientePerfilEndereco) clientePerfilEndereco.textContent = payload.endereco || '-';
    if (clientePerfilAtual) {
      clientePerfilAtual = { ...clientePerfilAtual, ...payload };
    }
  });
}

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
    aplicarMascaraTelefone(clienteEditTelefone);
  });
  clienteEditTelefone.addEventListener('blur', () => aplicarMascaraTelefone(clienteEditTelefone));
}
if (modalClienteEditEl) {
  modalClienteEditEl.addEventListener('hidden.bs.modal', () => {
    if (clientePerfilReabrir && modalClientePerfil) {
      modalClientePerfil.show();
    }
    clientePerfilReabrir = false;
  });
}

function badgeTipoPedido(tipo){
  const valor = (tipo || '').toLowerCase();
  if (valor === 'entrega') return { label: 'Entrega', className: 'entrega' };
  if (valor === 'retirada') return { label: 'Retirada', className: 'retirada' };
  if (valor === 'mesa') return { label: 'Mesa', className: 'mesa' };
  return { label: tipo || 'Outro', className: 'retirada' };
}

function numerosPaginacao(atual, total){
  const vizinhanca = 1;
  const paginas = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= atual - vizinhanca && i <= atual + vizinhanca)) {
      paginas.push(i);
    }
  }
  const comReticencias = [];
  let anterior = 0;
  paginas.forEach(i => {
    if (anterior && i - anterior > 1) comReticencias.push('...');
    comReticencias.push(i);
    anterior = i;
  });
  return comReticencias;
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
  const prevDisabled = clientePedidosPagina <= 1;
  const nextDisabled = clientePedidosPagina >= pages;
  let html = '';
  html += `<button type="button" ${prevDisabled ? 'disabled' : ''} data-page="${clientePedidosPagina - 1}">&lt;</button>`;
  numerosPaginacao(clientePedidosPagina, pages).forEach(item => {
    if (item === '...') {
      html += `<span class="cliente-pedidos-pagination-dots">...</span>`;
    } else {
      html += `<button type="button" class="${item === clientePedidosPagina ? 'active' : ''}" data-page="${item}">${item}</button>`;
    }
  });
  html += `<button type="button" ${nextDisabled ? 'disabled' : ''} data-page="${clientePedidosPagina + 1}">&gt;</button>`;
  clientePedidosPaginacao.innerHTML = html;
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

function badgeTipoPontos(tipo){
  const valor = (tipo || '').toLowerCase();
  if (valor === 'resgate' || valor === 'expirado') return { label: 'Resgate', className: 'resgate' };
  if (valor === 'ganho') return { label: 'Ganho', className: 'ganho' };
  if (valor === 'ajuste') return { label: 'Ajuste', className: 'ganho' };
  return { label: 'Pontos', className: 'ganho' };
}

function renderPontosHistorico(itens, paginas){
  if (!clientePontosLista || !clientePontosPaginacao) return;
  if (!itens || itens.length === 0) {
    clientePontosLista.innerHTML = '<div class="cliente-pedidos-vazio">Nenhum historico de pontos encontrado.</div>';
    clientePontosPaginacao.innerHTML = '';
    return;
  }
  clientePontosLista.innerHTML = itens.map(item => {
    const badge = badgeTipoPontos(item.tipo);
    const sinal = (item.tipo === 'resgate' || item.tipo === 'expirado') ? '-' : '+';
    const pontosTxt = `${sinal}${Math.abs(Number(item.pontos || 0))} pts`;
    const pedidoTxt = item.pedido_id ? `Pedido #${item.pedido_id}` : 'Movimentacao manual';
    return `
      <div class="cliente-pontos-card">
        <div class="cliente-pontos-top">
          <span class="cliente-pontos-badge ${badge.className}">${badge.label}</span>
          <span>${formatarData(item.criado_em)}</span>
        </div>
        <div class="cliente-pontos-info">
          <strong>${pontosTxt}</strong>
          <span>${pedidoTxt}</span>
        </div>
        <div class="cliente-pontos-desc">Saldo: ${item.saldo_depois} pts</div>
      </div>
    `;
  }).join('');

  const pages = Math.max(1, paginas || 1);
  const prevDisabled = clientePontosPagina <= 1;
  const nextDisabled = clientePontosPagina >= pages;
  let html = '';
  html += `<button type="button" ${prevDisabled ? 'disabled' : ''} data-page="${clientePontosPagina - 1}">&lt;</button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button type="button" class="${i === clientePontosPagina ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button type="button" ${nextDisabled ? 'disabled' : ''} data-page="${clientePontosPagina + 1}">&gt;</button>`;
  clientePontosPaginacao.innerHTML = html;
}

function carregarPontosCliente(pagina){
  if (!clientePerfilAtual || !clientePerfilAtual.id) return;
  if (!clientePontosLista) return;
  clientePontosPagina = pagina || 1;
  clientePontosLista.innerHTML = '<div class="cliente-pedidos-vazio">Carregando historico de pontos...</div>';
  fetch(`api/cliente_pontos.php?cliente_id=${clientePerfilAtual.id}&pagina=${clientePontosPagina}`)
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok) {
        renderPontosHistorico([], 1);
        return;
      }
      renderPontosHistorico(res.pontos || [], res.paginas || 1);
      clientePontosCarregado = true;
    })
    .catch(() => renderPontosHistorico([], 1));
}
function minutosDesde(valor){
  if (!valor) return 0;
  const data = new Date(normalizarData(valor));
  if (Number.isNaN(data.getTime())) return 0;
  return Math.floor((Date.now() - data.getTime()) / 60000);
}

function formatarDataLocal(data){
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2,'0');
  const dia = String(data.getDate()).padStart(2,'0');
  return `${ano}-${mes}-${dia}`;
}

function obterHorarioFimAgendamento(tipo, data){
  const lista = agendamentoHorarios && agendamentoHorarios[tipo] ? agendamentoHorarios[tipo] : {};
  const dia = data.getDay() + 1;
  const info = lista[dia] || lista[String(dia)];
  return info && info.fim ? info.fim : '';
}

function textoOrigemPedido(origem){
  const valor = (origem || '').toString().toLowerCase();
  if (!valor) return 'Pedido feito pelo balcão';
  const map = {
    pdv:      'Pedido feito pelo balcão',
    balcao:   'Pedido feito pelo balcão',
    loja:     'Pedido feito pela loja',
    online:   'Pedido feito pela loja',
    site:     'Pedido feito pela loja',
    lilly:    'Pedido feito pelo cardápio',
    ifood:    'Pedido feito pelo iFood',
    '99food': 'Pedido feito pelo 99Food',
    keeta:    'Pedido feito pelo Keeta',
  };
  return map[valor] || 'Pedido feito pelo balcão';
}

function obterAgendamentoPedido(pedido){
  if (!pedido) return '';
  if (pedido.agendamento) return pedido.agendamento;
  if (pedido.agendamento_em) return pedido.agendamento_em;
  if (pedido.agendamento_data && pedido.agendamento_hora) {
    return `${pedido.agendamento_data} ${pedido.agendamento_hora}`;
  }
  const endereco = pedido.endereco_entrega || pedido.endereco || '';
  const match = endereco.match(/Agendamento:\s*([^|]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return '';
}

function limparEnderecoAgendamento(endereco){
  if (!endereco) return '';
  return endereco.replace(/\s*\|?\s*Agendamento:.*$/i, '').trim();
}

/* Endereco completo salvo no pedido junta rua+numero,complemento,bairro,
   cidade/UF,CEP separados por ", " (ver confirmarEndereco em loja.js) — aqui
   so interessa rua, numero e bairro pro card do kanban, sem cidade/CEP. */
function enderecoResumidoCard(enderecoCompleto){
  const limpo = limparEnderecoAgendamento(enderecoCompleto || '');
  if (!limpo) return '';
  const partes = limpo.split(',').map(s => s.trim()).filter(Boolean);
  const rua = partes[0] || '';
  const numero = partes[1] || '';
  const bairro = partes[2] || '';
  const ruaNumero = [rua, numero].filter(Boolean).join(', ');
  return [ruaNumero, bairro].filter(Boolean).join(' - ');
}

function montarTextoAgendamento(tipo, agendamentoRaw){
  if (!agendamentoRaw) return '';
  const agendamentoData = new Date(normalizarData(agendamentoRaw));
  const inicioTexto = formatarDataHora(agendamentoRaw);
  let ateTexto = '';
  if (!Number.isNaN(agendamentoData.getTime())) {
    const fimHora = obterHorarioFimAgendamento(tipo, agendamentoData);
    if (fimHora) {
      const dataFim = `${formatarDataLocal(agendamentoData)} ${fimHora}`;
      ateTexto = ` ate ${formatarDataHora(dataFim)}`;
    }
  }
  return `Agendado para: ${inicioTexto}${ateTexto}`;
}


function iconeTipoPedido(tipo){
  const valor = (tipo || '').toLowerCase();
  if (valor === 'entrega') return 'bi-truck';
  if (valor === 'retirada') return 'bi-bag';
  return 'bi-shop';
}

function copiarCodigoPedido(id){
  if (!id) return;
  const texto = `#${id}`;
  navigator.clipboard?.writeText(texto);
}

function mostrarAvisoModal(msg, titulo){
  const modalEl = document.getElementById('modalAvisoGestor');
  if (!modalEl) return;
  const tituloEl = document.getElementById('modalAvisoGestorTitulo');
  const msgEl = document.getElementById('modalAvisoGestorMsg');
  if (tituloEl) tituloEl.textContent = titulo || 'Aviso';
  if (msgEl) msgEl.textContent = msg || '';
  (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).show();
  /* Se ja existir outro modal aberto por tras (ex.: detalhe do pedido), o Bootstrap
     as vezes cria o novo backdrop com z-index abaixo do modal anterior, deixando o
     fundo sem escurecer. Forca o backdrop e o modal deste aviso pra cima de tudo. */
  setTimeout(() => {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    const ultimoBackdrop = backdrops[backdrops.length - 1];
    if (ultimoBackdrop) ultimoBackdrop.style.zIndex = 1070;
    modalEl.style.zIndex = 1075;
  }, 0);
}

function dispararImpressaoManual(id, btn){
  if (!id || typeof impressaoQZ === 'undefined') return;
  const icon = btn ? btn.querySelector('i') : null;
  const classeOriginal = icon ? icon.className : '';
  if (btn) btn.disabled = true;
  if (icon) icon.className = 'bi bi-arrow-repeat spin-icon';
  const lojaNome = (typeof LOJA_NOME_IMPRESSAO !== 'undefined') ? LOJA_NOME_IMPRESSAO : '';
  impressaoQZ.imprimirManual(id, lojaNome, 'cozinha')
    .catch(e => {
      console.warn('Falha ao imprimir pedido:', e);
      mostrarAvisoModal(e && e.message ? e.message : 'Não foi possível imprimir o pedido. Verifique se o QZ Tray está aberto e a impressora está configurada em Configurações > Impressão.');
    })
    .finally(() => {
      if (btn) btn.disabled = false;
      if (icon) icon.className = classeOriginal;
    });
}

function imprimirPedidoCard(id, btn){
  dispararImpressaoManual(id, btn);
}

function vincularEntregador(id){
  if (!id) return;
  verPedido(id);
}

function abrirModalMotoboy(pedido){
  if (!pedido || !modalPedidoMotoboy || !pedidoMotoboySelect) return;
  pedidoMotoboyPedido.textContent = `Pedido #${pedido.id || '-'}`;
  const selectedId = Number(pedido.motoboy_id || 0);
  const preencherMotoboys = (lista, currentSelectedId) => {
    const itens = Array.isArray(lista) ? lista : [];
    const options = [
      `<option value="" ${Number(currentSelectedId || 0) === 0 ? 'selected' : ''}>Sem motoboy vinculado</option>`
    ];
    itens.forEach(item => {
      const selected = Number(currentSelectedId || 0) === Number(item.id) ? 'selected' : '';
      options.push(`<option value="${item.id}" ${selected}>${String(item.nome || '')}  -  ${String(item.whatsapp || '')}</option>`);
    });
    pedidoMotoboySelect.innerHTML = options.join('');
    pedidoMotoboySelect.value = String(currentSelectedId || '');
  };
  preencherMotoboys(motoboysDisponiveis, selectedId);
  document.body.classList.add('motoboy-linking-open');
  modalPedidoMotoboy.show();
  fetch(`api/motoboys.php?action=list&pedido_id=${pedido.id}&_=${Date.now()}`)
    .then(r => r.json())
    .then(json => {
      if (!json || !json.ok) return;
      preencherMotoboys(json.motoboys || [], Number(json.selected_id || selectedId));
    })
    .catch(() => {});
}
if (modalPedidoMotoboyEl) {
  modalPedidoMotoboyEl.addEventListener('hidden.bs.modal', () => {
    document.body.classList.remove('motoboy-linking-open');
  });
}
/* Reset do campo de motoboy do modal de alerta. Tentativas anteriores (mudar
   .value/.selectedIndex; clonar o <select>, em vários momentos diferentes;
   remover a animação do modal inteira; reconstruir via innerHTML; forçar
   display:none->reflow->'') não resolveram de forma definitiva — a caixa
   fechada do <select> às vezes continua desenhando a opção escolhida da vez
   anterior, mesmo com o valor real do campo comprovadamente correto por
   baixo (confirmado ao vivo, repetidas vezes).

   Pista que faltava: o OUTRO modal de motoboy deste sistema (abrirModalMotoboy
   / preencherMotoboys, logo acima) TAMBÉM anima com fade e NUNCA teve esse
   bug — ou seja, a animação nunca foi a causa. A diferença real é que aquele
   modal reconstrói o <select> DUAS vezes: uma na hora (síncrono, com os dados
   já em cache) e outra de novo pouco depois, quando uma chamada de rede
   (fetch) termina — nesse momento o modal já está visível há alguns
   milissegundos. É essa SEGUNDA reconstrução, com o modal já pintado na
   tela, que aparentemente é o que garante o repaint correto — não a técnica
   em si (innerHTML), que essa função já usava sem sucesso sozinha. Por isso
   o reset abaixo roda duas vezes: uma vez já (síncrono) e outra de novo um
   instante depois (setTimeout), reproduzindo o mesmo padrão de tempo do
   modal que nunca teve esse problema. */
function resetAlertaMotoboySelect(){
  if (!pedidoAlertaMotoboySelect) return;
  const itens = Array.isArray(motoboysDisponiveis) ? motoboysDisponiveis : [];
  const options = ['<option value="" selected>Selecione um motoboy</option>'];
  itens.forEach(item => {
    options.push(`<option value="${item.id}">${String(item.nome || '')}  -  ${String(item.whatsapp || '')}</option>`);
  });
  pedidoAlertaMotoboySelect.innerHTML = options.join('');
  pedidoAlertaMotoboySelect.value = '';
  pedidoAlertaMotoboySelect.classList.remove('erro');

  /* Este <select> é convertido num dropdown customizado por buildCustomSelect
     (admin/partials/sidebar.php), que renderiza uma vez e nunca se resincroniza
     sozinho depois (pula selects com data-custom-built="1"). Sem desfazer e
     reconstruir o wrapper aqui, o texto exibido fica travado na última opção
     que o usuário clicou, mesmo com o <select> real já correto — mesmo bug já
     resolvido em impressoras_config.js (atualizarSelectCustomizado). */
  const wrapper = pedidoAlertaMotoboySelect.closest('.custom-select');
  if (wrapper && wrapper.parentElement) {
    wrapper.parentElement.insertBefore(pedidoAlertaMotoboySelect, wrapper);
    wrapper.remove();
  }
  pedidoAlertaMotoboySelect.style.display = '';
  delete pedidoAlertaMotoboySelect.dataset.customBuilt;
  if (typeof window.refreshCustomSelects === 'function') {
    window.refreshCustomSelects(document);
  }

  if (pedidoAlertaMotoboyErro) pedidoAlertaMotoboyErro.classList.add('d-none');
  if (pedidoAlertaVincularMotoboy) pedidoAlertaVincularMotoboy.disabled = false;
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

function formatarFormasPagamentoKanban(pedido){
  const pagamentos = Array.isArray(pedido?.pagamentos) ? pedido.pagamentos : [];
  if (pagamentos.length) {
    const formas = [];
    pagamentos.forEach(item => {
      const label = formatarFormaPagamento(item?.forma || '');
      if (label && !formas.includes(label)) {
        formas.push(label);
      }
    });
    if (formas.length) {
      return formas.map(label => `<strong>${label}</strong>`).join('');
    }
  }
  const fallback = pedido?.forma_pagamento ? formatarFormaPagamento(pedido.forma_pagamento) : '-';
  return `<strong>${fallback}</strong>`;
}

function prepararBotoesEntrega(tipo, endereco){
  const entrega = (tipo || '').toLowerCase() === 'entrega';
  if (pedidoDetalheEnderecoWrap) pedidoDetalheEnderecoWrap.style.display = entrega ? 'block' : 'none';
  if (pedidoDetalheTaxaWrap) pedidoDetalheTaxaWrap.style.display = entrega ? 'block' : 'none';
  if (pedidoDetalheEntregaLinks) pedidoDetalheEntregaLinks.style.display = entrega ? 'flex' : 'none';
  if (pedidoDetalheEndereco && entrega) {
    const texto = limparEnderecoAgendamento(endereco || '');
    pedidoDetalheEndereco.textContent = texto || '-';
  }
}

/* ===== FILTRO ===== */
function setFiltro(v,btn){
  filtro=v;
  document.querySelectorAll('.diggy-filter.active').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if (pedidosCache && pedidosCache.length) {
    renderKanban(pedidosCache);
  } else {
    carregarPedidos();
  }
}

/* ===== LOAD ===== */
function labelTipoKanban(tipo){
  const valor = (tipo || '').toLowerCase();
  if (valor === 'entrega') return 'Entrega';
  if (valor === 'retirada') return 'Retirada';
  if (valor === 'mesa') return 'Mesa';
  return 'Todos';
}

function proximoTipoKanban(atual){
  const ordem = ['todos','entrega','retirada','mesa'];
  const idx = ordem.indexOf((atual || 'todos'));
  return ordem[(idx + 1) % ordem.length];
}

function renderKanban(pedidos){
  const kanban=document.getElementById('kanban');
  if (!kanban) return;
  kanban.innerHTML='';

  const hojeLocal = (() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${d.getFullYear()}-${m}-${day}`;
  })();

  for(const status in colunas){
    const col=document.createElement('div');
    col.className='kanban-col';
    col.dataset.status=status;

    col.addEventListener('dragover',e=>{e.preventDefault();col.classList.add('drag-over')});
    col.addEventListener('dragleave',()=>col.classList.remove('drag-over'));
    col.addEventListener('drop',e=>{
      e.preventDefault();
      col.classList.remove('drag-over');
      atualizarStatus(e.dataTransfer.getData('text/plain'),status);
    });

    const filtroCol = filtrosKanban[status] || { tipo:'todos', hoje:false };

    const listaColuna = pedidos.filter(p=>{
      if(p.status!==status) return false;
      if(filtro==='entrega' && p.tipo!=='entrega') return false;
      if(filtro==='retirada' && p.tipo!=='retirada') return false;
      if(filtro==='hoje' && p.criado_em && !p.criado_em.startsWith(hojeLocal)) return false;
      if(filtroCol.tipo !== 'todos' && p.tipo !== filtroCol.tipo) return false;
      if(filtroCol.hoje && p.criado_em && !p.criado_em.startsWith(hojeLocal)) return false;
      return true;
    });

    const subtotal = listaColuna.reduce((acc,p)=>acc + Number(p.total || 0), 0);
    const filtrosAtivos = [];
    if (filtroCol.tipo && filtroCol.tipo !== 'todos') filtrosAtivos.push(labelTipoKanban(filtroCol.tipo));
    if (filtroCol.hoje) filtrosAtivos.push('Hoje');
    const filtrosHtml = filtrosAtivos.length
      ? `<div class="kanban-filters">${filtrosAtivos.map(t=>`<span class="kanban-filter-pill">${t}</span>`).join('')}</div>`
      : '';

    col.innerHTML = `
      <div class="kanban-header">
        <div class="kanban-title-wrap">
          <span class="kanban-title">${colunas[status]}</span>
          <span class="kanban-count">${listaColuna.length}</span>
          <span class="kanban-subtotal">${formatarMoeda(subtotal)}</span>
          ${filtrosHtml}
        </div>
        <div class="kanban-header-tools">
          <button class="kanban-header-btn js-kanban-filter ${filtroCol.hoje ? 'is-active' : ''}" type="button" data-status="${status}" data-filter="hoje" aria-label="Filtro hoje">
            <i class="bi bi-three-dots-vertical"></i>
          </button>
          <button class="kanban-header-btn js-kanban-filter ${filtroCol.tipo !== 'todos' ? 'is-active' : ''}" type="button" data-status="${status}" data-filter="tipo" aria-label="Filtro tipo">
            <i class="bi bi-funnel"></i>
          </button>
        </div>
      </div>
    `;

    listaColuna.forEach(p=>col.appendChild(cardPedido(p)));
    kanban.appendChild(col);
  }
}

function carregarPedidos(){
  if(pausado) return;
  fetch('api/pedidos_kanban.php').then(r=>r.json()).then(pedidos=>{
    const snap = JSON.stringify( pedidos.map(p=>({
      id: p.id,
      status: p.status,
      total: p.total,
      tipo: p.tipo,
      pagamento: p.forma_pagamento,
      pagamentos: Array.isArray(p.pagamentos) ? p.pagamentos.map(pg => `${pg.forma}:${pg.valor}`) : []
    })));

    if(snap===ultimoSnapshot) return;
    ultimoSnapshot=snap;

    pedidosCache = pedidos || [];
    renderKanban(pedidosCache);
  });
}

/* ===== CARD ===== */
function cardPedido(p){
  const d=document.createElement('div');
  d.className='card-pedido';
  d.draggable=true;

  d.addEventListener('dragstart',e=>{
    pausado=true;
    d.classList.add('dragging');
    d.dataset.dragging='1';
    e.dataTransfer.setData('text/plain',p.id);
  });
  d.addEventListener('dragend',()=>{
    pausado=false;
    d.classList.remove('dragging');
    delete d.dataset.dragging;
  });

  const tipo = (p.tipo || 'retirada').toLowerCase();
  const tipoUpper = tipo.toUpperCase();
  const tipoIcon = iconeTipoPedido(tipo);
  const tipoClasse = ['entrega','retirada','mesa'].includes(tipo) ? tipo : 'outro';
  const horaPedido = formatarHora(p.criado_em);
  const referenciaTempo = p.status_em || p.criado_em;
  const atrasoMin = minutosDesde(referenciaTempo);
  const badgeClass = atrasoMin >= 30 ? 'is-late' : '';
  const telefone = p.telefone || '-';
  const pagamento = formatarFormasPagamentoKanban(p);
  const total = formatarMoeda(p.total);
  const proximo = proximoStatus(p.status);
  const agendamentoRaw = obterAgendamentoPedido(p) ? normalizarData(obterAgendamentoPedido(p)) : '';
  let agendamentoHtml = '';
  if (agendamentoRaw) {
    const agendamentoData = new Date(agendamentoRaw);
    const inicioTexto = formatarDataHora(agendamentoRaw);
    let ateTexto = '';
    if (!Number.isNaN(agendamentoData.getTime())) {
      const fimHora = obterHorarioFimAgendamento(tipo, agendamentoData);
      if (fimHora) {
        const dataFim = `${formatarDataLocal(agendamentoData)} ${fimHora}`;
        ateTexto = ` ate ${formatarDataHora(dataFim)}`;
      }
    }
    agendamentoHtml = `
      <div class="card-agendamento">
        <div class="card-agendamento-title">
          <i class="bi bi-calendar-event" style="font-size:.7rem"></i>
          ${tipoUpper} AGENDADA
        </div>
        <div class="card-agendamento-box">${inicioTexto}${ateTexto}</div>
      </div>
    `;
  }

  const entregaLink = tipo === 'entrega'
    ? `<button class="card-pedido-link ${p.motoboy_nome ? 'has-motoboy' : ''}" type="button" onclick="vincularEntregador(${p.id})">${p.motoboy_nome ? `Entregador: ${p.motoboy_nome}<small>Alterar vinculo</small>` : 'Vincular entregador'}</button>`
    : '';

  let botaoMover = '';
  const statusAtual = (p.status || '').toLowerCase();
  if (statusAtual === 'entrega') {
    botaoMover = `<button class="card-pedido-action status-entrega" type="button" onclick="finalizarPedido(${p.id})">Mover para finalizado</button>`;
  } else if (proximo) {
    const labelMap = {
      pendente: 'Aceitar pedido',
      aceito: 'Iniciar preparo',
      preparando: 'Sair para entrega'
    };
    const classMap = {
      pendente: 'status-pendente',
      aceito: 'status-aceito',
      preparando: 'status-preparando'
    };
    const label = labelMap[statusAtual] || `Mover para ${colunas[proximo]}`;
    const classe = classMap[statusAtual] || 'status-pendente';
    botaoMover = `<button class="card-pedido-action ${classe}" type="button" onclick="atualizarStatus(${p.id},'${proximo}')">${label}</button>`;
  }

  /* ── código do pedido ── */
  const codigoPedido = p.codigo ? `#${p.codigo}` : `#${p.id}`;

  /* ── agendamento ── */
  if (agendamentoRaw) {
    const agendamentoData = new Date(agendamentoRaw);
    const inicioTexto = formatarDataHora(agendamentoRaw);
    let ateTexto = '';
    if (!Number.isNaN(agendamentoData.getTime())) {
      const fimHora = obterHorarioFimAgendamento(tipo, agendamentoData);
      if (fimHora) {
        const dataFim = `${formatarDataLocal(agendamentoData)} ${fimHora}`;
        ateTexto = ` até ${formatarDataHora(dataFim)}`;
      }
    }
    agendamentoHtml = `
      <div class="card-agendamento">
        <div class="card-agendamento-title">
          <i class="bi bi-clock" style="font-size:.7rem"></i>
          ${tipoUpper} AGENDADA
        </div>
        <div class="card-agendamento-box">${inicioTexto}${ateTexto}</div>
      </div>
    `;
  }

  /* ── botões de ação por status ── */
  let acoesHtml = '';
  if (statusAtual === 'entrega') {
    acoesHtml = `<button class="card-btn-finalizar" type="button" onclick="finalizarPedido(${p.id})">Mover para finalizado</button>`;
  } else if (statusAtual === 'pendente') {
    acoesHtml = `<div class="card-pedido-actions">
      <button class="card-btn-recusar" type="button" onclick="recusarPedidoCard(${p.id})">Recusar pedido</button>
      <button class="card-btn-aceitar" type="button" onclick="atualizarStatus(${p.id},'aceito')">Aceitar pedido</button>
    </div>`;
  } else if (proximo) {
    const labelMap = { aceito:'Iniciar preparo', preparando:'Sair para entrega' };
    const label = labelMap[statusAtual] || `Mover para ${colunas[proximo]||proximo}`;
    acoesHtml = `<button class="card-btn-avancar" type="button" onclick="atualizarStatus(${p.id},'${proximo}')">${label}</button>`;
  }

  const obsCliente = (p.observacoes_cliente || '').toString().trim();
  const obsHtml = obsCliente
    ? `<div class="card-pedido-obs"><i class="bi bi-chat-text" style="margin-right:5px"></i>${obsCliente}</div>`
    : '';

  const isLoja = ['loja','online','site'].includes(String(p.origem||'').toLowerCase());
  const enderecoResumido = tipo === 'entrega' ? enderecoResumidoCard(p.endereco_entrega || p.endereco || '') : '';
  const enderecoHtml = enderecoResumido
    ? `<div class="card-pedido-endereco">
        <i class="bi bi-geo-alt"></i>
        <span title="${enderecoResumido.replace(/"/g,'&quot;')}">${enderecoResumido}</span>
        <span class="card-pedido-endereco-icon"><i class="bi bi-bicycle"></i></span>
      </div>`
    : '';

  d.innerHTML = `
    <div class="card-pedido-header">
      <div class="card-pedido-id">${tipo === 'entrega' ? '<i class="bi bi-bicycle"></i>' : ''}Pedido ${codigoPedido}</div>
      <div class="card-pedido-tools">
        <button class="card-icon-btn" type="button" title="Imprimir" onclick="event.stopPropagation();imprimirPedidoCard(${p.id},this)">
          <i class="bi bi-printer"></i>
        </button>
        <span class="card-time-badge ${atrasoMin>=30?'is-late':'ok'}">
          <i class="bi bi-clock" style="font-size:.65rem"></i>${horaPedido}
        </span>
      </div>
    </div>
    <div class="card-pedido-tipo ${tipoClasse}">
      <i class="bi ${tipoIcon}"></i>
      ${tipoUpper}
    </div>
    ${isLoja?'<div class="card-badge-site"><i class="bi bi-shop"></i> Pedido feito pela loja</div>':''}
    ${agendamentoHtml}
    <div class="card-pedido-info">
      <div class="card-pedido-row">
        <span class="value" style="font-weight:600">${p.nome}</span>
        <span class="value" style="color:#6b7280">${telefone}</span>
      </div>
      ${enderecoHtml}
      <div class="card-pedido-row">
        <span class="label">Total</span>
        <span class="value">${total}</span>
      </div>
      <div class="card-pedido-row card-pedido-row--top">
        <span class="label">Pagamento</span>
        <div class="card-pedido-payment-list">${pagamento}</div>
      </div>
    </div>
    ${obsHtml}
    ${entregaLink}
    ${acoesHtml}
  `;

  d.addEventListener('click', e => {
    if (d.dataset.dragging === '1') return;
    if (e.target.closest('button') || e.target.closest('a')) return;
    verPedido(p.id);
  });
  return d;
}

/* ===== STATUS ===== */
function proximoStatus(s){const o=['pendente','aceito','preparando','entrega'];return o[o.indexOf(s)+1]??null}
function obterPedidoCachePorId(id){
  return Array.isArray(pedidosCache)
    ? pedidosCache.find(p => Number(p.id || 0) === Number(id || 0)) || null
    : null;
}
function atualizarStatusDireto(id,s){
  fetch('api/pedidos_status.php',{method:'POST',body:new URLSearchParams({id,status:s})}).then(carregarPedidos);
}
function atualizarStatus(id,s){
  const statusDestino = String(s || '').toLowerCase();
  const pedido = obterPedidoCachePorId(id);
  if (
    statusDestino === 'entrega' &&
    pedido &&
    String(pedido.tipo || '').toLowerCase() === 'entrega' &&
    !Number(pedido.motoboy_id || 0) &&
    modalPedidoAlertaMotoboy
  ) {
    pedidoAguardandoVinculoEntrega = Number(id || 0);
    resetAlertaMotoboySelect();
    modalPedidoAlertaMotoboy.show();
    return;
  }
  atualizarStatusDireto(id,s);
}
function finalizarPedido(id){fetch('api/pedidos_finalizar.php',{method:'POST',body:new URLSearchParams({id})}).then(carregarPedidos)}
let _recusarId=null, _cancelarId=null;

function recusarPedidoCard(id){
  _recusarId=id; _cancelarId=null;
  document.getElementById('recusarTitle').textContent     = 'Recusar pedido?';
  document.getElementById('recusarPedidoNum').textContent = '#'+id;
  document.getElementById('recusarSub').innerHTML         =
    'O pedido <strong class="recusar-pedido-num">#'+id+'</strong> será marcado como <strong>cancelado</strong> e não poderá ser revertido.';
  document.getElementById('recusarBtnConfirmar').textContent = 'Recusar pedido';
  document.getElementById('recusarOverlay').classList.add('show');
}

function fecharRecusarModal(){
  document.getElementById('recusarOverlay').classList.remove('show');
  _recusarId=null; _cancelarId=null;
}

async function confirmarRecusa(){
  const idRecusar = _recusarId;
  const idCancelar = _cancelarId;

  /* fecha o modal e força re-render completo no próximo carregarPedidos */
  fecharRecusarModal();
  pausado = false;
  ultimoSnapshot = ''; /* força re-render independente dos dados */

  try {
    if(idRecusar){
      await fetch('api/pedidos_status.php', {
        method: 'POST',
        body: new URLSearchParams({id: idRecusar, status: 'cancelado'})
      });
    } else if(idCancelar){
      await fetch('api/pedidos_cancelar.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({id: idCancelar})
      });
      /* fecha o modal de detalhe */
      try { if(modalPedidoDetalhe) modalPedidoDetalhe.hide(); } catch(e){}
      if(pedidoDetalheCancelar) pedidoDetalheCancelar.style.display = 'none';
      if(pedidoDetalheFinalizar) pedidoDetalheFinalizar.style.display = 'none';
      /* limpa backdrop/estado do Bootstrap que às vezes fica preso ao fechar o
         modal programaticamente, bloqueando cliques nos cards até dar refresh */
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      document.body.style.removeProperty('overflow');
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    }
  } catch(e) {
    /* ignora erros de rede — sempre recarrega abaixo */
  }

  /* garante re-render sem depender do snapshot */
  pausado = false;
  ultimoSnapshot = '';
  await carregarPedidos();
}

/* ===== MODAL ===== */
function preencherModalPedido(d){
  const pedido = d.pedido || {};
  const itens = d.itens || [];
  const pagamentos = d.pagamentos || [];
  const stats = d.cliente_stats || {};
  pedidoDetalheAtual = pedido.id || null;

  if (pedidoDetalheNumero) pedidoDetalheNumero.textContent = `Pedido N. ${pedido.codigo || pedido.id || '-'}`;
  if (pedidoDetalheTempo) pedidoDetalheTempo.textContent = tempoDesde(pedido.criado_em);
  if (pedidoDetalheHorario) pedidoDetalheHorario.textContent = formatarDataHora(pedido.criado_em);
  if (pedidoDetalheStatus) {
    const statusClasse = (pedido.status || '').toLowerCase();
    /* bolinha colorida por status */
    const dotCores = {
      pendente:'#f59e0b', aceito:'#3b82f6', preparando:'#f97316',
      entrega:'#8b5cf6', finalizado:'#16a34a', cancelado:'#dc2626'
    };
    const dotCor = dotCores[statusClasse] || '#aaa';
    pedidoDetalheStatus.innerHTML = `<span style="width:9px;height:9px;border-radius:50%;background:${dotCor};display:inline-block;flex-shrink:0"></span> ${mapStatusPedido(pedido.status)}`;
    pedidoDetalheStatus.style.display='inline-flex';
    pedidoDetalheStatus.style.alignItems='center';
    pedidoDetalheStatus.style.gap='6px';
    pedidoDetalheStatus.classList.remove(
      'status-pendente','status-aceito','status-preparando',
      'status-entrega','status-finalizado','status-cancelado'
    );
    if (statusClasse) pedidoDetalheStatus.classList.add(`status-${statusClasse}`);
  }
  if (pedidoDetalheCliente) pedidoDetalheCliente.textContent = pedido.nome || '-';
  if (pedidoDetalheTelefone) pedidoDetalheTelefone.textContent = pedido.telefone || '-';

  if (pedidoDetalheStatsWrap) {
    const feitos = Number(stats.pedidos_feitos || 0);
    const ticket = Number(stats.ticket_medio || 0);
    const pontos = stats.pontos !== undefined && stats.pontos !== null ? Number(stats.pontos) : 0;
    const cashbackSaldo = Number(stats.cashback_saldo ?? stats.cashback_total ?? 0);
    const cashbackExpiraEm = stats.cashback_expira_em || null;
    const cashbackExpirado = Boolean(stats.cashback_expirado);
    if (pedidoDetalhePedidosFeitos) pedidoDetalhePedidosFeitos.textContent = feitos || 0;
    if (pedidoDetalheTicketMedio) pedidoDetalheTicketMedio.textContent = formatarMoeda(ticket || 0);
    if (pedidoDetalhePontos) pedidoDetalhePontos.textContent = Number.isNaN(pontos) ? '0' : pontos;
    if (pedidoDetalhePontosMetric) {
      pedidoDetalhePontosMetric.style.display = pontos > 0 ? 'flex' : 'none';
    }
    if (pedidoDetalheCashbackTotal) pedidoDetalheCashbackTotal.textContent = formatarMoeda(cashbackSaldo || 0);
    if (pedidoDetalheCashbackMetric) {
      pedidoDetalheCashbackMetric.style.display = cashbackSaldo > 0 ? 'flex' : 'none';
    }
    if (pedidoDetalheCashbackExpira) {
      if (cashbackSaldo > 0 && cashbackExpiraEm) {
        const dataExpira = formatarDataHora(`${cashbackExpiraEm} 00:00:00`).split(' ')[0];
        pedidoDetalheCashbackExpira.textContent = `Expira em ${dataExpira}`;
        pedidoDetalheCashbackExpira.classList.remove('d-none');
      } else {
        pedidoDetalheCashbackExpira.classList.add('d-none');
      }
    }
    if (pedidoDetalheCashbackExpirado) {
      if (cashbackSaldo <= 0 && cashbackExpirado) {
        pedidoDetalheCashbackExpirado.classList.remove('d-none');
      } else {
        pedidoDetalheCashbackExpirado.classList.add('d-none');
      }
    }
    pedidoDetalheStatsWrap.style.display = pedido.id ? 'block' : 'none';
  }
  const agendamentoPedido = obterAgendamentoPedido(pedido);
  if (pedidoDetalheAgendamentoWrap && pedidoDetalheAgendamentoBox) {
    if (agendamentoPedido) {
      pedidoDetalheAgendamentoWrap.classList.remove('d-none');
      const tipoAg = (pedido.tipo || 'retirada').toLowerCase();
      const titulo = `${tipoAg.toUpperCase()} AGENDADA`;
      if (pedidoDetalheAgendamentoTitulo) {
        pedidoDetalheAgendamentoTitulo.textContent = titulo;
      }
      const origemTexto = textoOrigemPedido(pedido.origem);
      if (pedidoDetalheAgendamentoOrigem) {
        pedidoDetalheAgendamentoOrigem.textContent = origemTexto ? `- ${origemTexto}` : '';
      }
      pedidoDetalheAgendamentoBox.textContent = montarTextoAgendamento(tipoAg, agendamentoPedido);
    } else {
      pedidoDetalheAgendamentoWrap.classList.add('d-none');
      if (pedidoDetalheAgendamentoBox) pedidoDetalheAgendamentoBox.textContent = 'Agendado para: -';
    }
  }

  const tipoRaw = (pedido.tipo || 'retirada').toLowerCase();
  const tipoUpper = tipoRaw.toUpperCase();
  if (pedidoDetalheTipoTitulo) {
    const origemTexto = textoOrigemPedido(pedido.origem);
    const origemHtml = origemTexto ? `<span class="pedido-detalhe-origem">- ${origemTexto}</span>` : '';
    pedidoDetalheTipoTitulo.innerHTML = `<i class="bi ${iconeTipoPedido(tipoRaw)}"></i> ${tipoUpper}${origemHtml}`;
  }
  prepararBotoesEntrega(pedido.tipo, pedido.endereco_entrega || '');
  if (pedidoDetalheMotoboyWrap && pedidoDetalheMotoboy) {
    if ((pedido.tipo || '').toLowerCase() === 'entrega' && pedido.motoboy_nome) {
      pedidoDetalheMotoboy.textContent = pedido.motoboy_nome;
      pedidoDetalheMotoboyWrap.classList.remove('d-none');
    } else {
      pedidoDetalheMotoboy.textContent = '-';
      pedidoDetalheMotoboyWrap.classList.add('d-none');
    }
  }

  if (pedidoDetalheTaxa) pedidoDetalheTaxa.textContent = formatarMoeda(pedido.taxa_entrega || 0);
  if (pedidoDetalheTaxaResumo) pedidoDetalheTaxaResumo.textContent = formatarMoeda(pedido.taxa_entrega || 0);

  if (pedidoDetalheSubtotal) pedidoDetalheSubtotal.textContent = formatarMoeda(pedido.subtotal || 0);
  if (pedidoDetalheDesconto) pedidoDetalheDesconto.textContent = formatarMoeda(pedido.desconto || 0);
  if (pedidoDetalheMaquininha) pedidoDetalheMaquininha.textContent = formatarMoeda(pedido.taxa_maquininha || 0);
  let cashbackUsado = Number(pedido.cashback_usado || 0);
  if (cashbackUsado <= 0) {
    const subtotalBase = Number(pedido.subtotal || 0);
    const taxaBase = Number(pedido.taxa_entrega || 0);
    const descontoBase = Number(pedido.desconto || 0);
    const maquininhaBase = Number(pedido.taxa_maquininha || 0);
    const totalBase = Number(pedido.total || 0);
    const cashbackCalculado = subtotalBase + taxaBase - descontoBase + maquininhaBase - totalBase;
    if (cashbackCalculado > 0.0001) {
      cashbackUsado = cashbackCalculado;
    }
  }
  if (pedidoDetalheCashback) pedidoDetalheCashback.textContent = formatarMoeda(cashbackUsado);
  if (pedidoDetalheTotal) pedidoDetalheTotal.textContent = formatarMoeda(pedido.total || 0);

  if (pedidoDetalheLinhaDesconto) pedidoDetalheLinhaDesconto.style.display = Number(pedido.desconto || 0) > 0 ? 'flex' : 'none';
  if (pedidoDetalheLinhaTaxa) pedidoDetalheLinhaTaxa.style.display = Number(pedido.taxa_entrega || 0) > 0 ? 'flex' : 'none';
  if (pedidoDetalheLinhaMaquininha) pedidoDetalheLinhaMaquininha.style.display = Number(pedido.taxa_maquininha || 0) > 0 ? 'flex' : 'none';
  if (pedidoDetalheLinhaCashback) pedidoDetalheLinhaCashback.style.display = cashbackUsado > 0 ? 'flex' : 'none';

  if (pedidoDetalhePagamentos) {
    const valorPago = parseFloat(pedido.valor_pago || 0);
    const trocoDb   = parseFloat(pedido.troco    || 0);

    const temDinheiro = (pedido.forma_pagamento||'').toLowerCase() === 'dinheiro'
      || pagamentos.some(p => (p.forma||'').toLowerCase() === 'dinheiro');

    let pagarCom = 0, trocoReal = 0;
    if (temDinheiro) {
      if (valorPago > 0) {
        pagarCom  = valorPago;
        trocoReal = trocoDb;
      } else if (trocoDb > 0) {
        pagarCom  = trocoDb;
        trocoReal = Math.max(0, trocoDb - (pedido.total || 0));
      }
    }

    const trocoHtml = pagarCom > 0
      ? `<div style="display:flex;justify-content:space-between;font-size:.82rem;color:#6b7280;margin-top:2px">
           <span>Cliente pagará com</span><span>${formatarMoeda(pagarCom)}</span>
         </div>
         ${trocoReal > 0 ? `<div style="display:flex;justify-content:space-between;font-size:.82rem;font-weight:600;color:#374151;margin-top:1px">
           <span>Troco no valor de</span><span>${formatarMoeda(trocoReal)}</span>
         </div>` : ''}`
      : '';

    let pagHtml = '';

    if (pagamentos.length) {
      const linhas = pagamentos.map(p => {
        const isEsseDinheiro = (p.forma||'').toLowerCase() === 'dinheiro';
        return `<div style="display:flex;justify-content:space-between;font-size:.84rem;color:#374151;margin-bottom:2px">
          <span>${formatarFormaPagamento(p.forma)}</span><span>${formatarMoeda(p.valor)}</span>
        </div>${isEsseDinheiro ? trocoHtml : ''}`;
      });
      pagHtml = `<div style="background:#f9fafb;border-radius:10px;padding:10px 12px">${linhas.join('')}</div>`;
    } else {
      const formaPrincipal = formatarFormaPagamento(pedido.forma_pagamento);
      const totalFmt = formatarMoeda(pedido.total || 0);
      if (temDinheiro && pagarCom > 0) {
        pagHtml = `<div style="background:#f9fafb;border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:2px">
          <div style="display:flex;justify-content:space-between;font-size:.84rem;color:#374151">
            <span>${formaPrincipal}</span><span>${totalFmt}</span>
          </div>
          ${trocoHtml}
        </div>`;
      } else {
        pagHtml = `${formaPrincipal} ${totalFmt}`;
        if (temDinheiro) pagHtml += `<br><span style="font-size:.8rem;color:#6b7280">Sem troco</span>`;
      }
    }

    pedidoDetalhePagamentos.innerHTML = pagHtml;
  }
  if (pedidoDetalheObsWrap && pedidoDetalheObsTexto) {
    const obsCliente = (pedido.observacoes_cliente || '').trim();
    if (obsCliente) {
      pedidoDetalheObsWrap.classList.remove('d-none');
      pedidoDetalheObsTexto.textContent = obsCliente;
    } else {
      pedidoDetalheObsWrap.classList.add('d-none');
    }
  }

  if (pedidoDetalheItens) {
    if (!itens.length) {
      pedidoDetalheItens.innerHTML = '<div class="pedido-detalhe-item-row">Sem itens.</div>';
    } else {
      pedidoDetalheItens.innerHTML = itens.map(i => {
        const totalItem = Number(i.preco || 0) * Number(i.quantidade || 0);
        const obs = (i.observacoes || '').trim();
        let obsHtml = '';
        const ehCombo = obs.startsWith('[combo]\n');
        const ehComplementos = obs.startsWith('[complementos]\n');
        if (ehCombo || ehComplementos) {
          const prefixo = ehCombo ? '[combo]\n' : '[complementos]\n';
          const rotulo = ehCombo ? 'Seleções do combo:' : 'Complementos:';
          const linhas = obs.substring(prefixo.length).split('\n').filter(l => l.trim());
          obsHtml = `<div style="margin-top:5px">
            <div style="font-size:.72rem;font-weight:700;color:#555;margin-bottom:3px">${rotulo}</div>
            ${linhas.map(l=>`<div style="font-size:.72rem;color:#666;display:flex;align-items:center;gap:6px;padding:1px 0"><i class="bi bi-check2" style="color:#9ca3af;font-size:.75rem;flex-shrink:0"></i>${l.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`).join('')}
          </div>`;
        } else if (obs) {
          obsHtml = `<div style="font-size:.75rem;color:#6b7280;margin-top:4px"><strong>Obs:</strong> ${obs.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
        }
        return `
          <div class="pedido-detalhe-item-row">
            <span>${i.quantidade}x ${i.produto_nome}${obsHtml ? `<br>${obsHtml}` : ''}</span>
            <strong>${formatarMoeda(totalItem)}</strong>
          </div>
        `;
      }).join('');
    }
  }

  if (pedidoDetalheEditar) {
    pedidoDetalheEditar.dataset.pedidoId = pedido.id || '';
    pedidoDetalheEditar.style.display = podeGerenciarPedidos ? 'inline-flex' : 'none';
  }

  if (pedidoDetalheImprimir) {
    pedidoDetalheImprimir.dataset.pedidoId = pedido.id || '';
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
  if (pedidoDetalheVerCliente) {
    const clienteId = pedido.cliente_id || '';
    pedidoDetalheVerCliente.onclick = () => {
      if (!clienteId) return;
      abrirModalClientePerfil(clienteId, {
        nome: pedido.nome || '',
        telefone: pedido.telefone || '',
        endereco: pedido.endereco_entrega || pedido.endereco || ''
      });
    };
  }
  if (pedidoDetalheVincularEntregador) {
    pedidoDetalheVincularEntregador.textContent = pedido.motoboy_nome ? 'Alterar motoboy' : 'Vincular entregador';
    pedidoDetalheVincularEntregador.onclick = () => abrirModalMotoboy(pedido);
  }

  const statusAtual = (pedido.status || '').toLowerCase();
  if (pedidoDetalheCancelar) {
    pedidoDetalheCancelar.style.display = (podeGerenciarPedidos && statusAtual !== 'cancelado' && statusAtual !== 'finalizado')
      ? 'inline-flex'
      : 'none';
  }
  if (pedidoDetalheFinalizar) {
    pedidoDetalheFinalizar.style.display = (podeGerenciarPedidos && statusAtual !== 'finalizado' && statusAtual !== 'cancelado')
      ? 'inline-flex'
      : 'none';
  }
}

function abrirModalPedidoDetalhe(id){
  if (!modalPedidoDetalheEl) return;
  const modal = reabrirModalPedidoDetalhe();
  if (!modal) return;
  if (pedidoDetalheItens) pedidoDetalheItens.innerHTML = '<div class="pedido-detalhe-item-row">Carregando pedido...</div>';
  modal.show();
  fetch(`api/pedido_detalhe.php?pedido_id=${id}`)
    .then(r => r.json())
    .then(d => {
      if (!d || !d.ok) return;
      preencherModalPedido(d);
      pedidoDetalheUltimoPayload = d;
    })
    .catch(() => {});
}

function verPedido(id){
  abrirModalPedidoDetalhe(id);
}

(function(){
  const params = new URLSearchParams(window.location.search);
  const pedidoParam = params.get('pedido') || params.get('pedido_id');
  if (!pedidoParam) return;
  const id = parseInt(pedidoParam, 10);
  if (!id || Number.isNaN(id)) return;
  setTimeout(() => {
    if (typeof abrirModalPedidoDetalhe === 'function') {
      abrirModalPedidoDetalhe(id);
    }
  }, 250);
  params.delete('pedido');
  params.delete('pedido_id');
  const qs = params.toString();
  const novaUrl = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
  window.history.replaceState(null, '', novaUrl);
})();

if (pedidoDetalheCopiarEndereco) {
  pedidoDetalheCopiarEndereco.addEventListener('click', () => {
    if (!pedidoDetalheEndereco) return;
    const texto = pedidoDetalheEndereco.textContent.trim();
    if (!texto) return;
    navigator.clipboard?.writeText(texto);
  });
}

if (pedidoMotoboySalvar) {
  pedidoMotoboySalvar.addEventListener('click', () => {
    if (!pedidoDetalheAtual || !pedidoMotoboySelect) return;
    const body = new URLSearchParams({
      action: 'bind',
      pedido_id: String(pedidoDetalheAtual),
      motoboy_id: String(pedidoMotoboySelect.value || '')
    });
    fetch('api/motoboys.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body
    }).then(r => r.json()).then(res => {
      if (!res || !res.ok) return;
      const motoboyId = Number(pedidoMotoboySelect.value || 0);
      const motoboyNome = res.motoboy_nome || '';
      if (pedidoDetalheUltimoPayload && pedidoDetalheUltimoPayload.pedido && Number(pedidoDetalheUltimoPayload.pedido.id || 0) === Number(pedidoDetalheAtual)) {
        pedidoDetalheUltimoPayload.pedido.motoboy_id = motoboyId || null;
        pedidoDetalheUltimoPayload.pedido.motoboy_nome = motoboyNome || null;
      }
      if (Array.isArray(pedidosCache)) {
        pedidosCache = pedidosCache.map((pedidoItem) => {
          if (Number(pedidoItem.id || 0) !== Number(pedidoDetalheAtual)) return pedidoItem;
          return {
            ...pedidoItem,
            motoboy_id: motoboyId || null,
            motoboy_nome: motoboyNome || null
          };
        });
        renderKanban(pedidosCache);
      }
      if (modalPedidoMotoboy) modalPedidoMotoboy.hide();
      if (pedidoAguardandoVinculoEntrega && Number(pedidoAguardandoVinculoEntrega) === Number(pedidoDetalheAtual)) {
        const pedidoMover = pedidoAguardandoVinculoEntrega;
        pedidoAguardandoVinculoEntrega = null;
        atualizarStatusDireto(pedidoMover, 'entrega');
      }
      abrirModalPedidoDetalhe(pedidoDetalheAtual);
      setTimeout(() => carregarPedidos(), 180);
    }).catch(() => {});
  });
}

if (pedidoAlertaContinuarSemMotoboy) {
  pedidoAlertaContinuarSemMotoboy.addEventListener('click', () => {
    if (!pedidoAguardandoVinculoEntrega) return;
    const pedidoMover = pedidoAguardandoVinculoEntrega;
    pedidoAguardandoVinculoEntrega = null;
    if (modalPedidoAlertaMotoboy) modalPedidoAlertaMotoboy.hide();
    atualizarStatusDireto(pedidoMover, 'entrega');
  });
}

if (pedidoAlertaVincularMotoboy) {
  pedidoAlertaVincularMotoboy.addEventListener('click', () => {
    if (pedidoAlertaMotoboyErro) pedidoAlertaMotoboyErro.classList.add('d-none');
    pedidoAlertaMotoboySelect?.classList.remove('erro');
    if (!pedidoAguardandoVinculoEntrega) {
      /* estado interno perdeu a referência do pedido (ex: modal reaberto sem
         passar por atualizarStatus()) — fecha em vez de ficar sem reagir. */
      if (modalPedidoAlertaMotoboy) modalPedidoAlertaMotoboy.hide();
      return;
    }
    const pedidoId = Number(pedidoAguardandoVinculoEntrega || 0);
    const motoboyId = Number(pedidoAlertaMotoboySelect?.value || 0);
    if (!pedidoId) return;
    if (!motoboyId) {
      /* antes falhava em silêncio (parecia botão travado) — agora avisa o motivo */
      if (pedidoAlertaMotoboyErro) {
        pedidoAlertaMotoboyErro.textContent = 'Selecione um motoboy para vincular.';
        pedidoAlertaMotoboyErro.classList.remove('d-none');
      }
      pedidoAlertaMotoboySelect?.classList.add('erro');
      pedidoAlertaMotoboySelect?.focus();
      return;
    }
    if (pedidoAlertaVincularMotoboy.disabled) return; /* evita duplo-clique disparar duas vezes */
    pedidoAlertaVincularMotoboy.disabled = true;
    const body = new URLSearchParams({
      action: 'bind',
      pedido_id: String(pedidoId),
      motoboy_id: String(motoboyId)
    });
    fetch('api/motoboys.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body
    }).then(r => r.json()).then(res => {
      if (!res || !res.ok) {
        pedidoAlertaVincularMotoboy.disabled = false;
        if (pedidoAlertaMotoboyErro) {
          pedidoAlertaMotoboyErro.textContent = (res && res.msg) || 'Não foi possível vincular o motoboy. Tente novamente.';
          pedidoAlertaMotoboyErro.classList.remove('d-none');
        }
        return;
      }
      const motoboyNome = res.motoboy_nome || '';
      if (Array.isArray(pedidosCache)) {
        pedidosCache = pedidosCache.map((pedidoItem) => {
          if (Number(pedidoItem.id || 0) !== pedidoId) return pedidoItem;
          return {
            ...pedidoItem,
            motoboy_id: motoboyId,
            motoboy_nome: motoboyNome || null
          };
        });
        renderKanban(pedidosCache);
      }
      if (pedidoDetalheUltimoPayload && pedidoDetalheUltimoPayload.pedido && Number(pedidoDetalheUltimoPayload.pedido.id || 0) === pedidoId) {
        pedidoDetalheUltimoPayload.pedido.motoboy_id = motoboyId;
        pedidoDetalheUltimoPayload.pedido.motoboy_nome = motoboyNome || null;
      }
      pedidoAguardandoVinculoEntrega = null;
      if (modalPedidoAlertaMotoboy) modalPedidoAlertaMotoboy.hide();
      atualizarStatusDireto(pedidoId, 'entrega');
      if (pedidoDetalheAtual && Number(pedidoDetalheAtual) === pedidoId) {
        abrirModalPedidoDetalhe(pedidoId);
      }
    }).catch(() => {
      pedidoAlertaVincularMotoboy.disabled = false;
      if (pedidoAlertaMotoboyErro) {
        pedidoAlertaMotoboyErro.textContent = 'Erro de conexão. Tente novamente.';
        pedidoAlertaMotoboyErro.classList.remove('d-none');
      }
    });
  });
}

if (pedidoDetalheImprimir) {
  pedidoDetalheImprimir.addEventListener('click', () => {
    const id = pedidoDetalheImprimir.dataset.pedidoId || pedidoDetalheAtual;
    if (id) imprimirPedido(id);
  });
}
if (pedidoDetalheEditar) {
  pedidoDetalheEditar.addEventListener('click', () => {
    const id = pedidoDetalheEditar.dataset.pedidoId || pedidoDetalheAtual;
    if (id) abrirPdvPedidoEditar(id);
  });
}

if (clientePerfilTabs) {
  clientePerfilTabs.addEventListener('click', e => {
    const btn = e.target.closest('.cliente-tab');
    if (!btn) return;
    const alvo = btn.dataset.tab;
    clientePerfilTabs.querySelectorAll('.cliente-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#modalClientePerfil [data-tab-pane]').forEach(pane => {
      pane.classList.toggle('active', pane.dataset.tabPane === alvo);
    });
    if (alvo === 'pedidos' && !clientePedidosCarregado) {
      carregarPedidosCliente(1);
    }
    if (alvo === 'pontos' && !clientePontosCarregado) {
      carregarPontosCliente(1);
    }
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
if (clientePontosPaginacao) {
  clientePontosPaginacao.addEventListener('click', e => {
    const btn = e.target.closest('button[data-page]');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page || 1);
    if (page > 0) carregarPontosCliente(page);
  });
}
if (clientePedidosLista) {
  clientePedidosLista.addEventListener('click', e => {
    const card = e.target.closest('.js-pedido-detalhe');
    if (!card) return;
    const pedidoId = card.dataset.pedidoId;
    if (!pedidoId) return;
    clientePerfilReabrirPedido = false;
    if (modalClientePerfil && modalClientePerfilEl?.classList.contains('show')) {
      clientePerfilReabrirPedido = true;
      modalClientePerfil.hide();
    }
    setTimeout(() => abrirModalPedidoDetalhe(pedidoId), 120);
  });
}

if (pedidoDetalheCancelar) {
  pedidoDetalheCancelar.addEventListener('click', () => {
    if (!podeGerenciarPedidos || !pedidoDetalheAtual) return;
    abrirModalCancelarDetalhe(pedidoDetalheAtual);
  });
}

function abrirModalCancelarDetalhe(id){
  _recusarId   = null;        /* não é recusa do card */
  _cancelarId  = id;
  document.getElementById('recusarPedidoNum').textContent = '#' + id;
  document.getElementById('recusarTitle').textContent     = 'Cancelar pedido?';
  document.getElementById('recusarSub').innerHTML         =
    'O pedido <strong class="recusar-pedido-num">#'+id+'</strong> será marcado como <strong>cancelado</strong> e não poderá ser revertido.';
  document.getElementById('recusarBtnConfirmar').textContent = 'Cancelar pedido';
  document.getElementById('recusarOverlay').classList.add('show');
}

if (pedidoDetalheFinalizar) {
  pedidoDetalheFinalizar.addEventListener('click', () => {
    if (!podeGerenciarPedidos || !pedidoDetalheAtual) return;
    fetch('api/pedidos_finalizar.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id: pedidoDetalheAtual })
    }).then(r => r.json()).then(res => {
      if (res && res.ok) {
        if (pedidoDetalheStatus) pedidoDetalheStatus.textContent = mapStatusPedido('finalizado');
        if (pedidoDetalheFinalizar) pedidoDetalheFinalizar.style.display = 'none';
        if (pedidoDetalheCancelar) pedidoDetalheCancelar.style.display = 'none';
        carregarPedidos();
      }
    });
  });
}
if (modalPedidoDetalheEl) {
  modalPedidoDetalheEl.addEventListener('hidden.bs.modal', () => {
    if (clientePerfilReabrirPedido && modalClientePerfil) {
      modalClientePerfil.show();
    }
    clientePerfilReabrirPedido = false;

    if (window.buscaPedidoSuspensa) {
      window.buscaPedidoSuspensa = false;
      const modalBuscarEl = document.getElementById('modalBuscarPedido');
      bootstrap.Modal.getInstance(modalBuscarEl)?.show();
    }
  });
}
function abrirWhats(id){fetch(`api/pdv_whatsapp.php?pedido_id=${id}`).then(r=>r.json()).then(w=>{if(w.ok)window.open(w.url,'_blank')})}
function imprimirPedido(id){
  dispararImpressaoManual(id, pedidoDetalheImprimir);
}

document.addEventListener('DOMContentLoaded',()=>{
    carregarPedidos();
  setInterval(carregarPedidos,5000);
});

const kanbanEl = document.getElementById('kanban');
if (kanbanEl) {
  kanbanEl.addEventListener('click', e => {
    const btn = e.target.closest('.js-kanban-filter');
    if (!btn) return;
    const status = btn.dataset.status;
    const tipoFiltro = btn.dataset.filter;
    if (!status || !filtrosKanban[status]) return;
    if (tipoFiltro === 'tipo') {
      filtrosKanban[status].tipo = proximoTipoKanban(filtrosKanban[status].tipo);
    }
    if (tipoFiltro === 'hoje') {
      filtrosKanban[status].hoje = !filtrosKanban[status].hoje;
    }
    if (pedidosCache && pedidosCache.length) {
      renderKanban(pedidosCache);
    } else {
      carregarPedidos();
    }
  });
}


function novoPedido() {
  if (typeof window.abrirPdvModal === 'function') {
    window.abrirPdvModal();
    return;
  }
  window.location.href = 'pdv.php';
}

function abrirPdvPedidoEditar(pedidoId){
  if (!pedidoId) return;
  if (typeof window.abrirPdvModal === 'function') {
    if (modalPedidoDetalhe) modalPedidoDetalhe.hide();
    window.abrirPdvModal(pedidoId);
    return;
  }
  window.location.href = `pdv.php?pedido_id=${pedidoId}`;
}

/* ===== BUSCAR PEDIDO ===== */
function criarCardBuscaPedido(p){
  const d = document.createElement('div');
  d.className = 'card-pedido card-pedido-busca';

  const tipo = (p.tipo || 'retirada').toLowerCase();
  const tipoUpper = tipo.toUpperCase();
  const tipoIcon = iconeTipoPedido(tipo);
  const tipoClasse = ['entrega','retirada','mesa'].includes(tipo) ? tipo : 'outro';
  const horaPedido = formatarHora(p.criado_em);
  const telefone = p.telefone || '-';
  const pagamento = formatarFormasPagamentoKanban(p);
  const total = formatarMoeda(p.total);
  const codigoPedido = p.codigo ? `#${p.codigo}` : `#${p.id}`;

  d.innerHTML = `
    <div class="card-pedido-header">
      <div class="card-pedido-id"><i class="bi bi-hash"></i> Pedido ${codigoPedido}</div>
      <span class="card-time-badge">
        <i class="bi bi-clock" style="font-size:.65rem"></i>${horaPedido}
      </span>
    </div>
    <div class="card-pedido-tipo ${tipoClasse}">
      <i class="bi ${tipoIcon}"></i>
      ${tipoUpper}
    </div>
    <div class="card-pedido-info">
      <div class="card-pedido-row">
        <span class="value" style="font-weight:600">${p.nome || '-'}</span>
        <span class="value" style="color:#6b7280">${telefone}</span>
      </div>
      <div class="card-pedido-row">
        <span class="label">Total</span>
        <span class="value">${total}</span>
      </div>
      <div class="card-pedido-row card-pedido-row--top">
        <span class="label">Pagamento</span>
        <div class="card-pedido-payment-list">${pagamento}</div>
      </div>
    </div>
  `;

  d.addEventListener('click', () => {
    const modalEl = document.getElementById('modalBuscarPedido');
    const instance = bootstrap.Modal.getInstance(modalEl);
    if (instance) {
      window.buscaPedidoSuspensa = true;
      instance.hide();
    }
    verPedido(p.id);
  });
  return d;
}

(function(){
  const searchWrap = document.getElementById('gestorSearchWrap');
  const modalBuscarEl = document.getElementById('modalBuscarPedido');
  const buscarInput = document.getElementById('buscarPedidoInput');
  const buscarResultados = document.getElementById('buscarPedidoResultados');
  if (!searchWrap || !modalBuscarEl || !buscarInput || !buscarResultados) return;

  const modalBuscar = new bootstrap.Modal(modalBuscarEl);
  const emptyStateHtml = buscarResultados.innerHTML;
  let debounceTimer = null;
  let buscaAtual = 0;

  function abrirBusca(){
    modalBuscar.show();
    setTimeout(() => buscarInput.focus(), 200);
  }
  searchWrap.addEventListener('click', abrirBusca);

  modalBuscarEl.addEventListener('shown.bs.modal', () => {
    searchWrap.classList.add('is-active');
  });
  modalBuscarEl.addEventListener('hidden.bs.modal', () => {
    searchWrap.classList.remove('is-active');
    if (window.buscaPedidoSuspensa) {
      return;
    }
    buscarInput.value = '';
    buscarResultados.innerHTML = emptyStateHtml;
  });

  buscarInput.addEventListener('input', () => {
    const termo = buscarInput.value.trim();
    clearTimeout(debounceTimer);
    if (!termo) {
      buscarResultados.innerHTML = emptyStateHtml;
      return;
    }
    debounceTimer = setTimeout(() => executarBuscaPedido(termo), 300);
  });

  function executarBuscaPedido(termo){
    const idBusca = ++buscaAtual;
    buscarResultados.innerHTML = '<div class="buscar-pedido-loading">Buscando pedidos...</div>';
    fetch(`api/pedidos_buscar.php?q=${encodeURIComponent(termo)}`)
      .then(r => r.json())
      .then(pedidos => {
        if (idBusca !== buscaAtual) return;
        renderResultadosBusca(Array.isArray(pedidos) ? pedidos : []);
      })
      .catch(() => {
        if (idBusca !== buscaAtual) return;
        buscarResultados.innerHTML = `
          <div class="buscar-pedido-empty">
            <div class="buscar-pedido-empty-icon"><i class="bi bi-exclamation-triangle"></i></div>
            <div class="buscar-pedido-empty-title">Erro ao buscar</div>
            <div class="buscar-pedido-empty-desc">Não foi possível buscar pedidos agora. Tente novamente.</div>
          </div>
        `;
      });
  }

  function renderResultadosBusca(pedidos){
    if (!pedidos.length) {
      buscarResultados.innerHTML = `
        <div class="buscar-pedido-empty">
          <div class="buscar-pedido-empty-icon"><i class="bi bi-emoji-frown"></i></div>
          <div class="buscar-pedido-empty-title">Nenhum pedido encontrado</div>
          <div class="buscar-pedido-empty-desc">Verifique o número do pedido, o nome ou o telefone informado e tente novamente.</div>
        </div>
      `;
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'buscar-pedido-grid';
    pedidos.forEach(p => grid.appendChild(criarCardBuscaPedido(p)));
    buscarResultados.innerHTML = '';
    buscarResultados.appendChild(grid);
  }
})();





