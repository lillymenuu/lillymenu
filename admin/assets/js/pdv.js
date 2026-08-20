  const campoTaxaMaquininha = document.getElementById('campoTaxaMaquininha');
  const taxaMaquininhaPercent = document.getElementById('taxaMaquininhaPercent');
  const avisoPermissaoDesconto = document.getElementById('avisoPermissaoDesconto');
const campoEndereco = document.getElementById('campoEndereco');
const campoBairro = document.getElementById('campoBairro');
const campoCep = document.getElementById('campoCep');
const campoComplemento = document.getElementById('campoComplemento');
const campoPreviewEndereco = document.getElementById('campoPreviewEndereco');
const campoPrevisao = document.getElementById('campoPrevisao');
const campoTaxa = document.getElementById('campoTaxa');
const camposEntrega = document.querySelectorAll('.pdv-entrega');
const camposRetirada = document.querySelectorAll('.pdv-retirada');
const tipoPedido = document.getElementById('tipoPedido');
const pdvSideDetails = document.getElementById('pdvSideDetails');
const pdvSideSummary = document.getElementById('pdvSideSummary');
const pdvSummaryDetails = document.getElementById('pdvSummaryDetails');
const tipoPedidoSelect = document.getElementById('tipoPedidoSelect');
const tipoPedidoBtn = document.getElementById('tipoPedidoBtn');
const tipoPedidoLabel = document.getElementById('tipoPedidoLabel');
const tipoPedidoMenu = document.getElementById('tipoPedidoMenu');
const clienteBuscaBox = document.getElementById('clienteBuscaBox');
const inputBusca = document.getElementById('clienteBusca');
const lista = document.getElementById('listaClientes');
const clienteBuscaRecentesBtn = document.getElementById('clienteBuscaRecentesBtn');
const clienteIdInput = document.getElementById('clienteId');
const retiradaBuscaWrap = document.getElementById('retiradaBuscaWrap');
const pdvSideEl = document.querySelector('.pdv-side');
const cardInfo = document.getElementById('cardClienteInfo');
const btnClienteDetalhe = document.getElementById('btnClienteDetalhe');
const btnClienteLimpar = document.getElementById('btnClienteLimpar');
const clienteResumoNome = document.getElementById('clienteResumoNome');
const clienteResumoTelefone = document.getElementById('clienteResumoTelefone');
const clientePontosSaldoEl = document.getElementById('clientePontosSaldo');
const pontosSaldoWrap = document.getElementById('pontosSaldoWrap');
const clientePontosSaldoModal = document.getElementById('clientePontosSaldoModal');
const pontosSaldoModalWrap = document.getElementById('pontosSaldoModalWrap');

if (lista && lista.parentElement !== document.body) {
  document.body.appendChild(lista);
}
const clientePontosSaldoSelect = document.getElementById('clientePontosSaldoSelect');
const pontosSaldoSelectWrap = document.getElementById('pontosSaldoSelectWrap');
const avisoPontosCliente = document.getElementById('pdvAvisoPontosCliente');
let clienteNomeInput = null;
let clienteTelefoneInput = null;
let clienteEnderecoInput = null;
let clienteModalBusca = null;
let listaClientesModal = null;
let clienteModalRecentesBtn = null;
let btnClienteContinuar = null;
let ultimoItensCliente = [];
let clienteCashbackSaldo = 0;
let clienteCashbackExpiraEm = '';
let cashbackValorSolicitado = 0;
let clientePontosSaldo = 0;
let retiradaBuscaExpandida = false;
const formaPagamento = document.getElementById('formaPagamento');
const trocoInput = document.getElementById('trocoInput');
const trocoTexto = document.getElementById('trocoTexto');
const linhaValorPago = document.getElementById('linhaValorPago');
const linhaTroco = document.getElementById('linhaTroco');
const linhaDesconto = document.getElementById('linhaDesconto');
const descontoResumo = document.getElementById('descontoResumo');
const linhaPontosResgate = document.getElementById('linhaPontosResgate');
const pontosResgateResumo = document.getElementById('pontosResgateResumo');
const linhaTaxaMaquininha = document.getElementById('linhaTaxaMaquininha');
const taxaMaquininhaResumo = document.getElementById('taxaMaquininhaResumo');
const trocoLabel = document.getElementById('trocoLabel');
const valorPagoResumo = document.getElementById('valorPagoResumo');
const trocoResumo = document.getElementById('trocoResumo');
const taxaEntregaInput = document.getElementById('taxaEntrega');
const taxaEditadaInput = document.getElementById('taxaEditada');
const taxaSugestao = document.getElementById('taxaSugestao');
const enderecoRua = document.getElementById('enderecoRua');
const enderecoBairro = document.getElementById('enderecoBairro');
const enderecoCep = document.getElementById('enderecoCep');
if (enderecoCep) enderecoCep.value = aplicarMascaraCep(enderecoCep.value);
const enderecoComplemento = document.getElementById('enderecoComplemento');
const enderecoNumero = document.getElementById('enderecoNumero');
const enderecoCidade = document.getElementById('enderecoCidade');
const enderecoDistancia = document.getElementById('enderecoDistancia');
const enderecoAgendamento = document.getElementById('enderecoAgendamento');
const enderecoPreview = document.getElementById('enderecoPreview');
const previsaoEntrega = document.getElementById('previsaoEntrega');
const enderecoHidden = document.getElementById('enderecoEntrega');
const cardEntregaInfo = document.getElementById('cardEntregaInfo');
const blocoAgendamento = document.getElementById('blocoAgendamento');
const agendamentoSubtitle = document.querySelector('.pdv-schedule-subtitle');
const entregaResumoPlaceholder = document.getElementById('entregaResumoPlaceholder');
const entregaResumoRua = document.getElementById('entregaResumoRua');
const entregaResumoBairro = document.getElementById('entregaResumoBairro');
const entregaResumoCep = document.getElementById('entregaResumoCep');
const entregaResumoComplemento = document.getElementById('entregaResumoComplemento');
const entregaResumoTaxa = document.getElementById('entregaResumoTaxa');
const btnEntregaEditar = document.getElementById('btnEntregaEditar');
const btnEntregaLimpar = document.getElementById('btnEntregaLimpar');
let modalEntregaEl = null;
let modalEntrega = null;
let modalAgendamentoEl = null;
let modalAgendamento = null;
let btnAgendamento = null;
let btnAgendamentoLimpar = null;
let agendamentoData = null;
let agendamentoHora = null;
let agendamentoSalvar = null;
let agendamentoLimpar = null;
let agendamentoDias = null;
let agendamentoHoras = null;
let agendamentoHorasEmpty = null;
let agendamentoDiasPrev = null;
let agendamentoDiasNext = null;
let entregaClienteBusca = null;
let entregaClienteTelefone = null;
let entregaClienteNome = null;
let entregaClienteTelefoneErro = null;
let entregaClienteNomeErro = null;
let entregaListaClientes = null;
let entregaClienteRecentesBtn = null;
let entregaCepModal = null;
let entregaDistanciaKm = null;
let entregaDistanciaWrap = null;
let entregaRuaModal = null;
let entregaNumeroModal = null;
let entregaBairroModal = null;
let entregaCidadeModal = null;
let entregaComplementoModal = null;
let entregaTaxaEditar = null;
let entregaTaxaValor = null;
let entregaTaxaLabel = null;
let entregaTaxaInfo = null;
let entregaContinuar = null;
let modalPagamentoEl = null;
let modalPagamento = null;
let modalCashbackEl = null;
let modalCashback = null;
let cashbackModalSaldo = null;
let cashbackModalValidade = null;
let cashbackModalValor = null;
let cashbackModalUsar = null;
let pagamentoOpcoes = null;
let pagamentoOpcoesButtons = [];
let pagamentoValorTotal = null;
let pagamentoTotalTexto = null;
let pagamentoRestanteTexto = null;
let pagamentoValorPago = null;
let pagamentoDinheiroCampo = null;
let btnPagamentoFinalizar = null;
let pagamentoSplit = null;
let pagamentoSplitLabel1 = null;
let pagamentoSplitLabel2 = null;
let pagamentoSplitValor1 = null;
let pagamentoSplitValor2 = null;
let pagamentosSelecionados = [];
let salvandoPedido = false;
let btnPagamentoTextoOriginal = null;
let pagamentoRegistrados = null;
let pagamentoRegistradosLista = null;
let pagamentoSplitRow1 = null;
let pagamentoSplitRow2 = null;
let dinheiroRecebido = 0;
let btnAbrirDesconto = null;
let descontoBadge = null;
let modalDescontoEl = null;
let modalDesconto = null;
let descontoToggle = null;
let descontoValorModal = null;
let cupomInput = null;
let cupomAplicar = null;
let cupomRemover = null;
let cupomMsg = null;
let descontoPreview = null;
let descontoLimpar = null;
let descontoAplicar = null;
let descontoTipoSelecionado = 'valor';
let cupomFreteAtivo = false;
let taxaEntregaOriginal = null;
let retornoPagamentoModalDesconto = false;
let modalTrocoEl = null;
let modalTroco = null;
let trocoValorInput = null;
let trocoTotalTexto = null;
let trocoResumoLinha = null;
let trocoResumoLabel = null;
let trocoCalculadoTexto = null;
let trocoNaoPreciso = null;
let trocoContinuar = null;
let retornoPagamentoModal = false;

const parseNumero = (valor) => {
  if (valor === null || valor === undefined) return 0;
  const texto = valor.toString().replace(',', '.');
  const numero = parseFloat(texto);
  return Number.isFinite(numero) ? numero : 0;
};

const taxasBairro = {};
Object.entries(taxasBairroRaw || {}).forEach(([bairro, taxa]) => {
  const key = normalizarTexto(bairro);
  taxasBairro[key] = parseNumero(taxa);
});
const taxasDinamicasOrdenadas = (Array.isArray(taxasDinamicas) ? taxasDinamicas : [])
  .map(item => ({
    distancia_km: parseNumero(item.distancia_km),
    valor: parseNumero(item.valor),
    tipo: (item.tipo || 'fixa'),
    tempo_min: item.tempo_min,
    tempo_max: item.tempo_max
  }))
  .filter(item => item.distancia_km > 0)
  .sort((a, b) => a.distancia_km - b.distancia_km);
let taxaEntregaTipoAtual = taxaEntregaTipo;
const tipoAtualEntrega = String(taxaEntregaTipoAtual || '').toLowerCase().trim();
if (!tipoAtualEntrega) {
  taxaEntregaTipoAtual = 'dinamica';
}

function normalizarTexto(texto){
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function formatarDinheiro(valor){
  return 'R$ ' + Number(valor || 0).toFixed(2).replace('.',',');
}

function aplicarMascaraMoeda(valor){
  const digits = String(valor || '').replace(/\D/g, '');
  if (!digits) return '0,00';
  const numero = Number(digits) / 100;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseValorMonetario(valor){
  const normalizado = String(valor || '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const numero = parseFloat(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function aplicarMascaraTelefone(valor){
  const digits = (valor || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function aplicarMascaraCep(valor){
  const digits = (valor || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function aplicarMascaraTelefoneBusca(valor){
  const texto = (valor || '').toString();
  if (/[a-zA-ZÀ-ÿ]/.test(texto)) return texto;
  const digits = texto.replace(/\D/g, '');
  if (!digits) return texto;
  return aplicarMascaraTelefone(digits);
}

let cepLookupTimer = null;
let ultimoCepConsultado = '';
let cepLookupEmAndamento = false;
let ultimaDistanciaCalculada = 0;
let distanciaAtualEntrega = 0;
let ultimaTaxaEntregaApi = null;

function numeroEntregaPreenchido(origem){
  const numeroForm = enderecoNumero ? enderecoNumero.value.trim() : '';
  const numeroModal = entregaNumeroModal ? entregaNumeroModal.value.trim() : '';
  if (origem === 'modal') return numeroModal.length > 0;
  if (origem === 'form') return numeroForm.length > 0;
  return (numeroForm.length > 0 || numeroModal.length > 0);
}

function agendarBuscaCep(valor, origem){
  const cepLimpo = (valor || '').replace(/\D/g, '');
  if (cepLimpo.length !== 8) {
    ultimaTaxaEntregaApi = null;
    return;
  }
  if (cepLimpo === ultimoCepConsultado && ultimaDistanciaCalculada > 0) return;
  if (cepLookupTimer) clearTimeout(cepLookupTimer);
  cepLookupTimer = setTimeout(() => {
    buscarEnderecoPorCep(cepLimpo, origem);
  }, 350);
}

function buscarEnderecoPorCep(cepLimpo, origem){
  if (!cepLimpo || cepLimpo.length !== 8) return;
  ultimoCepConsultado = cepLimpo;
  const limparDistancia = () => {
    if (enderecoDistancia) enderecoDistancia.value = '';
    if (entregaDistanciaKm) entregaDistanciaKm.value = '';
  };
  const aplicarResultado = (payload) => {
    const rua = payload.logradouro || '';
    const bairro = payload.bairro || '';
    const cidade = payload.cidade || '';
    const cepFormatado = aplicarMascaraCep(cepLimpo);
    const distancia = parseNumero(payload.distancia_km);
    const taxaDireta = payload.taxa_entrega !== undefined && payload.taxa_entrega !== null
      ? parseNumero(payload.taxa_entrega)
      : null;
    const podeCalcularTaxa = numeroEntregaPreenchido(origem === 'modal' ? 'modal' : 'form');
    ultimaTaxaEntregaApi = taxaDireta;

    if (origem === 'modal') {
      if (entregaRuaModal && rua) entregaRuaModal.value = rua;
      if (entregaBairroModal && bairro) entregaBairroModal.value = bairro;
      if (entregaCidadeModal && cidade) entregaCidadeModal.value = cidade;
      if (entregaCepModal) entregaCepModal.value = cepFormatado;
      if (enderecoRua && rua) enderecoRua.value = rua;
      if (enderecoBairro && bairro) enderecoBairro.value = bairro;
      if (enderecoCidade && cidade) enderecoCidade.value = cidade;
      if (enderecoCep) enderecoCep.value = cepFormatado;
    } else {
      if (enderecoRua && rua) enderecoRua.value = rua;
      if (enderecoBairro && bairro) enderecoBairro.value = bairro;
      if (enderecoCidade && cidade) enderecoCidade.value = cidade;
      if (enderecoCep) enderecoCep.value = cepFormatado;
      if (entregaRuaModal && rua) entregaRuaModal.value = rua;
      if (entregaBairroModal && bairro) entregaBairroModal.value = bairro;
      if (entregaCidadeModal && cidade) entregaCidadeModal.value = cidade;
      if (entregaCepModal) entregaCepModal.value = cepFormatado;
    }

    if (Number.isFinite(distancia) && distancia > 0) {
      const valorDist = Number(distancia).toFixed(2);
      ultimaDistanciaCalculada = Number(distancia);
      distanciaAtualEntrega = Number(distancia);
      if (enderecoDistancia) enderecoDistancia.value = valorDist;
      if (entregaDistanciaKm) entregaDistanciaKm.value = valorDist;
    } else {
      ultimaDistanciaCalculada = 0;
      distanciaAtualEntrega = 0;
      limparDistancia();
    }

    syncEntregaModalToForm();
    if (tipoPedido && tipoPedido.value === 'entrega') {
      if (!podeCalcularTaxa && !(entregaTaxaEditar && entregaTaxaEditar.checked)) {
        taxaEntregaInput.value = '0.00';
        if (entregaTaxaValor) entregaTaxaValor.value = taxaEntregaInput.value || '';
        if (entregaTaxaLabel) entregaTaxaLabel.textContent = formatarDinheiro(taxaEntregaInput.value || 0);
      }
      const tipoTaxaAtual = String(taxaEntregaTipoAtual || '').toLowerCase().trim();
      const usarTaxaDireta = taxaDireta !== null && ['dinamica', 'area', 'bairro'].includes(tipoTaxaAtual);
      if (podeCalcularTaxa && usarTaxaDireta && !(entregaTaxaEditar && entregaTaxaEditar.checked)) {
        taxaEntregaInput.value = Number(taxaDireta || 0).toFixed(2);
        if (entregaTaxaValor) entregaTaxaValor.value = taxaEntregaInput.value || '';
        if (entregaTaxaLabel) entregaTaxaLabel.textContent = formatarDinheiro(taxaEntregaInput.value || 0);
      }
      if (podeCalcularTaxa && ['dinamica', 'area'].includes(tipoTaxaAtual) && !usarTaxaDireta) {
        const resultado = obterTaxaDinamica(distanciaAtualEntrega, false);
        if (resultado && !(entregaTaxaEditar && entregaTaxaEditar.checked)) {
          taxaEntregaInput.value = Number(resultado.valor || 0).toFixed(2);
          if (entregaTaxaValor) entregaTaxaValor.value = taxaEntregaInput.value || '';
          if (entregaTaxaLabel) entregaTaxaLabel.textContent = formatarDinheiro(taxaEntregaInput.value || 0);
        }
      }
    }
    if (tipoPedido && tipoPedido.value === 'entrega' && !(entregaTaxaEditar && entregaTaxaEditar.checked)) {
      const tipoTaxaAtual = String(taxaEntregaTipoAtual || '').toLowerCase().trim();
      const usarTaxaDireta = taxaDireta !== null && ['dinamica', 'area', 'bairro'].includes(tipoTaxaAtual);
      if (usarTaxaDireta) {
        atualizarCampoDistancia();
        atualizarEnderecoResumo();
        atualizarEntregaResumo();
        atualizarTotal();
        return;
      }
      const params = new URLSearchParams();
      params.set('subtotal', calcularSubtotalAtual());
      params.set('tipo', 'entrega');
      if (distanciaAtualEntrega > 0) {
        params.set('distancia_km', distanciaAtualEntrega.toFixed(2));
      }
      if (enderecoHidden && enderecoHidden.value) {
        params.set('endereco', enderecoHidden.value);
      }
      fetch('api/pdv_calculo.php', { method: 'POST', body: params })
        .then(r => r.json())
        .then(resp => {
          if (resp && typeof resp.taxa !== 'undefined') {
            taxaEntregaInput.value = Number(resp.taxa || 0).toFixed(2);
            if (entregaTaxaValor) entregaTaxaValor.value = taxaEntregaInput.value || '';
            if (entregaTaxaLabel) entregaTaxaLabel.textContent = formatarDinheiro(taxaEntregaInput.value || 0);
          }
        })
        .catch(() => {});
    }
    atualizarCampoDistancia();
    atualizarTaxaPorBairro();
    atualizarEnderecoResumo();
    atualizarEntregaResumo();
  };

  cepLookupEmAndamento = true;
  fetch(`api/cep_lookup.php?cep=${encodeURIComponent(cepLimpo)}`)
    .then(r => r.json())
    .then(d => {
      if (d && d.ok) {
        aplicarResultado({
          logradouro: d.logradouro || '',
          bairro: d.bairro || '',
          cidade: d.cidade || '',
          distancia_km: d.distancia_km,
          taxa_entrega: d.taxa_entrega
        });
        return;
      }
      throw new Error('fallback');
    })
    .catch(() => {
      fetch(`../api/cep_lookup.php?cep=${encodeURIComponent(cepLimpo)}`)
        .then(r => r.json())
        .then(d => {
          if (d && d.ok) {
            aplicarResultado({
              logradouro: d.logradouro || '',
              bairro: d.bairro || '',
              cidade: d.cidade || '',
              distancia_km: d.distancia_km,
              taxa_entrega: d.taxa_entrega
            });
            return;
          }
          throw new Error('fallback-public');
        })
        .catch(() => {
          fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
        .then(r => r.json())
        .then(dados => {
          if (!dados || dados.erro) return;
          aplicarResultado({
            logradouro: dados.logradouro || '',
            bairro: dados.bairro || '',
            cidade: dados.localidade || ''
          });
        })
        .catch(() => {});
        });
    })
    .finally(() => {
      cepLookupEmAndamento = false;
    });
}

function escapeHtml(texto){
  return (texto || '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatarDataHora(valor){
  if (!valor) return '';
  const raw = valor.toString().replace(' ', 'T');
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return valor;
  const dia = String(d.getDate()).padStart(2,'0');
  const mes = String(d.getMonth() + 1).padStart(2,'0');
  const hora = String(d.getHours()).padStart(2,'0');
  const min = String(d.getMinutes()).padStart(2,'0');
  return `${dia}/${mes} ${hora}:${min}`;
}

function formatarDataHoraHumana(valor){
  if (!valor) return '';
  const raw = valor.toString().replace(' ', 'T');
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return valor;
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const dia = d.getDate();
  const mes = meses[d.getMonth()] || '';
  const hora = String(d.getHours()).padStart(2,'0');
  const min = String(d.getMinutes()).padStart(2,'0');
  return `${dia} de ${mes} ${hora}:${min}h`;
}

function formatarDataHumana(valor){
  if (!valor) return '';
  const raw = valor.toString().replace(' ', 'T');
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return valor;
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  return `${d.getDate()} de ${meses[d.getMonth()] || ''} de ${d.getFullYear()}`;
}

function obterAgendamentoConfig(){
  const tipo = tipoPedido ? tipoPedido.value : 'retirada';
  if (!agendamentoConfig) return null;
  if (tipo === 'entrega') return agendamentoConfig.entrega;
  if (tipo === 'retirada') return agendamentoConfig.retirada;
  return null;
}

function minutosAgendamento(tipo, valor){
  const numero = parseInt(valor, 10);
  if (Number.isNaN(numero) || numero <= 0) return 0;
  return (tipo === 'horas' ? numero : numero * 24) * 60;
}

function formatarDataLocal(data){
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarHoraLocal(data){
  const hora = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');
  return `${hora}:${min}`;
}

function calcularJanelaAgendamento(cfg){
  const agora = new Date();
  const minMinutos = minutosAgendamento(cfg.min_tipo, cfg.min_valor);
  const maxMinutos = minutosAgendamento(cfg.max_tipo, cfg.max_valor);
  const minDate = minMinutos > 0 ? new Date(agora.getTime() + minMinutos * 60000) : agora;
  const maxDate = maxMinutos > 0 ? new Date(agora.getTime() + maxMinutos * 60000) : null;
  return { minDate, maxDate };
}

function obterHorarioDia(cfg, data){
  if (!cfg || !cfg.horarios) return null;
  const dia = data.getDay() + 1;
  return cfg.horarios[dia] || cfg.horarios[String(dia)] || null;
}

const diasSemanaCurtos = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function mesmaData(a, b){
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function parseHoraMinutos(valor){
  if (!valor) return NaN;
  const partes = valor.split(':');
  const hora = parseInt(partes[0], 10);
  const min = parseInt(partes[1], 10);
  if (Number.isNaN(hora) || Number.isNaN(min)) return NaN;
  return hora * 60 + min;
}

function gerarHorariosIntervalo(inicio, fim, passo){
  const inicioMin = parseHoraMinutos(inicio);
  const fimMin = parseHoraMinutos(fim);
  if (Number.isNaN(inicioMin) || Number.isNaN(fimMin) || fimMin < inicioMin) {
    return [];
  }
  const horarios = [];
  const step = passo || 30;
  for (let min = inicioMin; min <= fimMin; min += step) {
    const hora = String(Math.floor(min / 60)).padStart(2, '0');
    const mins = String(min % 60).padStart(2, '0');
    horarios.push(`${hora}:${mins}`);
  }
  return horarios;
}

function listarDiasAgendamento(cfg){
  const dias = [];
  if (!cfg) return dias;
  const { minDate, maxDate } = calcularJanelaAgendamento(cfg);
  const inicio = minDate ? new Date(minDate) : new Date();
  const fim = maxDate ? new Date(maxDate) : new Date(inicio);
  if (!maxDate) fim.setDate(fim.getDate() + 14);
  inicio.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);
  if (fim < inicio) return dias;
  let atual = new Date(inicio);
  let contador = 0;
  while (atual <= fim && contador < 30) {
    const horarioDia = obterHorarioDia(cfg, atual);
    const disponivel = !!(horarioDia && horarioDia.inicio && horarioDia.fim);
    if (disponivel) {
      dias.push({
        data: new Date(atual),
        dataStr: formatarDataLocal(atual),
        dia: String(atual.getDate()).padStart(2, '0'),
        semana: diasSemanaCurtos[atual.getDay()],
        disponivel: true
      });
    }
    atual.setDate(atual.getDate() + 1);
    contador++;
  }
  return dias;
}

function limparHorariosAgendamento(mensagem){
  if (agendamentoHoras) agendamentoHoras.innerHTML = '';
  if (agendamentoHorasEmpty) {
    agendamentoHorasEmpty.textContent = '';
    agendamentoHorasEmpty.classList.add('d-none');
  }
}

function renderizarHorariosAgendamento(data){
  if (!agendamentoHoras) return;
  const cfg = obterAgendamentoConfig();
  if (!cfg || !data) {
    limparHorariosAgendamento();
    return;
  }
  const horarioDia = obterHorarioDia(cfg, data);
  if (!horarioDia || !horarioDia.inicio || !horarioDia.fim) {
    limparHorariosAgendamento('');
    return;
  }
  let horarios = gerarHorariosIntervalo(horarioDia.inicio, horarioDia.fim, 30);
  const { minDate, maxDate } = calcularJanelaAgendamento(cfg);
  if (minDate && mesmaData(data, minDate)) {
    const minHora = formatarHoraLocal(minDate);
    horarios = horarios.filter(h => h >= minHora);
  }
  if (maxDate && mesmaData(data, maxDate)) {
    const maxHora = formatarHoraLocal(maxDate);
    horarios = horarios.filter(h => h <= maxHora);
  }
  if (!horarios.length) {
    limparHorariosAgendamento('');
    return;
  }
  if (agendamentoHorasEmpty) agendamentoHorasEmpty.classList.add('d-none');
  agendamentoHoras.innerHTML = '';
  horarios.forEach(horario => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pdv-schedule-time';
    if (agendamentoHora && agendamentoHora.value === horario) {
      btn.classList.add('is-active');
    }
    btn.textContent = horario;
    btn.addEventListener('click', () => {
      if (agendamentoHora) agendamentoHora.value = horario;
      agendamentoHoras.querySelectorAll('.pdv-schedule-time').forEach(el => el.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
    agendamentoHoras.appendChild(btn);
  });
}

function renderizarDiasAgendamento(){
  if (!agendamentoDias) return;
  const cfg = obterAgendamentoConfig();
  if (!cfg || !cfg.ativo) {
    agendamentoDias.innerHTML = '';
    limparHorariosAgendamento();
    return;
  }
  const dias = listarDiasAgendamento(cfg);
  agendamentoDias.innerHTML = '';
  let selecionadoData = null;
  dias.forEach(info => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pdv-schedule-day';
    btn.innerHTML = `
      <span class="pdv-schedule-day-num">${info.dia}</span>
      <span class="pdv-schedule-day-week">${info.semana}</span>
    `;
    if (agendamentoData && agendamentoData.value === info.dataStr) {
      btn.classList.add('is-active');
      selecionadoData = info.data;
    }
    btn.addEventListener('click', () => {
      if (agendamentoData) agendamentoData.value = info.dataStr;
      if (agendamentoHora) agendamentoHora.value = '';
      agendamentoDias.querySelectorAll('.pdv-schedule-day').forEach(el => el.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderizarHorariosAgendamento(info.data);
    });
    agendamentoDias.appendChild(btn);
  });
  if (selecionadoData) {
    renderizarHorariosAgendamento(selecionadoData);
  } else {
    limparHorariosAgendamento();
  }
}

function rolarDiasAgendamento(direcao){
  if (!agendamentoDias) return;
  agendamentoDias.scrollBy({ left: direcao * 160, behavior: 'smooth' });
}

function ajustarLimitesAgendamento(){
  if (!agendamentoData || !agendamentoHora) return;
  agendamentoData.min = '';
  agendamentoData.max = '';
  agendamentoHora.min = '';
  agendamentoHora.max = '';

  const cfg = obterAgendamentoConfig();
  if (!cfg || !cfg.ativo) return;

  const { minDate, maxDate } = calcularJanelaAgendamento(cfg);
  if (minDate) agendamentoData.min = formatarDataLocal(minDate);
  if (maxDate) agendamentoData.max = formatarDataLocal(maxDate);

  if (!agendamentoData.value) return;
  const dataSelecionada = new Date(`${agendamentoData.value}T00:00`);
  if (Number.isNaN(dataSelecionada.getTime())) return;

  const horarioDia = obterHorarioDia(cfg, dataSelecionada);
  let minHora = horarioDia ? horarioDia.inicio : '';
  let maxHora = horarioDia ? horarioDia.fim : '';
  if (minDate && formatarDataLocal(minDate) === agendamentoData.value) {
    const horaMinima = formatarHoraLocal(minDate);
    if (!minHora || horaMinima > minHora) minHora = horaMinima;
  }
  if (maxDate && formatarDataLocal(maxDate) === agendamentoData.value) {
    const horaMaxima = formatarHoraLocal(maxDate);
    if (!maxHora || horaMaxima < maxHora) maxHora = horaMaxima;
  }
  if (minHora) agendamentoHora.min = minHora;
  if (maxHora) agendamentoHora.max = maxHora;
}

function atualizarDisponibilidadeAgendamento(){
  const cfg = obterAgendamentoConfig();
  const ativo = !!(cfg && cfg.ativo);
  if (blocoAgendamento) {
    blocoAgendamento.classList.toggle('d-none', !ativo);
  }
  if (btnAgendamento) {
    btnAgendamento.disabled = !ativo;
  }
  if (!ativo && enderecoAgendamento) {
    enderecoAgendamento.value = '';
  }
  atualizarAgendamentoResumo();
  ajustarLimitesAgendamento();
  renderizarDiasAgendamento();
}

function validarAgendamento(){
  const cfg = obterAgendamentoConfig();
  if (!cfg || !cfg.ativo) {
    return { ok: false, msg: 'Agendamento indisponivel para este tipo de pedido.' };
  }
  let data = agendamentoData ? agendamentoData.value : '';
  let hora = agendamentoHora ? agendamentoHora.value : '';
  if (!data && enderecoAgendamento && enderecoAgendamento.value) {
    const partes = enderecoAgendamento.value.toString().replace(' ', 'T').split('T');
    data = partes[0] || '';
    hora = (partes[1] || '').slice(0, 5);
  }
  if (!data) {
    return { ok: true };
  }
  if (!hora) {
    return { ok: false, msg: 'Informe o horario do agendamento.' };
  }
  const agendado = new Date(`${data}T${hora}`);
  if (Number.isNaN(agendado.getTime())) {
    return { ok: false, msg: 'Data ou horario invalido.' };
  }
  const { minDate, maxDate } = calcularJanelaAgendamento(cfg);
  if (minDate && agendado < minDate) {
    return { ok: false, msg: 'Agendamento antes do permitido.' };
  }
  if (maxDate && agendado > maxDate) {
    return { ok: false, msg: 'Agendamento acima do limite permitido.' };
  }
  const horarioDia = obterHorarioDia(cfg, agendado);
  const horariosCfg = cfg.horarios || {};
  if (Object.keys(horariosCfg).length && !horarioDia) {
    return { ok: false, msg: 'Dia indisponivel para agendamento.' };
  }
  if (horarioDia) {
    const inicio = horarioDia.inicio;
    const fim = horarioDia.fim;
    if (hora < inicio || hora > fim) {
      return { ok: false, msg: `Horario permitido entre ${inicio} e ${fim}.` };
    }
  }
  return { ok: true };
}

function atualizarAgendamentoResumo(){
  const resumo = document.getElementById('agendamentoResumo');
  const subtitulo = document.querySelector('#blocoAgendamento .pdv-retirada-subtitle');
  if (!resumo) return;
  const cfg = obterAgendamentoConfig();
  if (!cfg || !cfg.ativo) {
    resumo.textContent = 'Agendamento indisponivel';
    resumo.classList.remove('is-empty');
    if (subtitulo) subtitulo.classList.remove('is-hidden');
    if (btnAgendamento) {
      btnAgendamento.setAttribute('aria-label', 'Agendar pedido');
      btnAgendamento.innerHTML = '<i class="bi bi-calendar3"></i>';
    }
    if (btnAgendamentoLimpar) btnAgendamentoLimpar.classList.add('d-none');
    return;
  }
  const possuiHorario = !!(enderecoAgendamento && enderecoAgendamento.value);
  resumo.textContent = possuiHorario
    ? formatarDataHoraHumana(enderecoAgendamento.value)
    : 'Sem horario';
  resumo.classList.toggle('is-empty', !possuiHorario);
  if (subtitulo) subtitulo.classList.toggle('is-hidden', possuiHorario);
  if (btnAgendamento) {
    btnAgendamento.setAttribute('aria-label', possuiHorario ? 'Editar agendamento' : 'Agendar pedido');
    btnAgendamento.innerHTML = possuiHorario
      ? '<i class="bi bi-pencil"></i>'
      : '<i class="bi bi-calendar3"></i>';
  }
  if (btnAgendamentoLimpar) {
    btnAgendamentoLimpar.classList.toggle('d-none', !possuiHorario);
  }
}

function atualizarEntregaResumo(){
  if (!cardEntregaInfo || tipoPedido.value !== 'entrega') return;

  const rua = enderecoRua.value.trim();
  const numero = enderecoNumero ? enderecoNumero.value.trim() : '';
  const bairro = enderecoBairro.value.trim();
  const cidade = enderecoCidade ? enderecoCidade.value.trim() : '';
  const cep = enderecoCep.value.trim();
  const complemento = enderecoComplemento.value.trim();

  const linhaRua = rua ? (numero ? `${rua}, ${numero}` : rua) : '';
  const linhaBairro = [bairro, cidade].filter(Boolean).join(', ');
  const linhaCep = cep ? `CEP ${cep}` : '';
  const linhaComplemento = complemento ? complemento : '';
  const temEndereco = linhaRua || linhaBairro || linhaCep || linhaComplemento;

  if (entregaResumoPlaceholder) {
    entregaResumoPlaceholder.classList.toggle('d-none', temEndereco);
  }
  if (entregaResumoRua) {
    entregaResumoRua.textContent = linhaRua;
    entregaResumoRua.classList.toggle('d-none', !linhaRua);
  }
  if (entregaResumoBairro) {
    entregaResumoBairro.textContent = linhaBairro;
    entregaResumoBairro.classList.toggle('d-none', !linhaBairro);
  }
  if (entregaResumoCep) {
    entregaResumoCep.textContent = linhaCep;
    entregaResumoCep.classList.toggle('d-none', !linhaCep);
  }
  if (entregaResumoComplemento) {
    entregaResumoComplemento.textContent = linhaComplemento;
    entregaResumoComplemento.classList.toggle('d-none', !linhaComplemento);
  }
  if (entregaResumoTaxa) {
    entregaResumoTaxa.textContent = formatarDinheiro(taxaEntregaInput.value || 0);
  }
}

let toastTimer = null;
function mostrarToast(mensagem, tipo=''){
  const toast = document.getElementById('pdvToast');
  if (!toast) return;
  toast.textContent = mensagem;
  toast.classList.toggle('warn', tipo === 'warn');
  toast.classList.add('show');
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    toast.classList.remove('show', 'warn');
  }, 2500);
}

function atualizarResumoItens(){
  const container = document.getElementById('resumoItens');
  if (!container) return;
  const summaryCard = container.closest('.pdv-summary');
  const linhas = document.querySelectorAll('#listaProdutos .pdv-cart-row');
  if (!linhas.length) {
    container.classList.remove('is-capped');
    container.innerHTML = '<div class="pdv-summary-empty"><i class="bi bi-box-seam"></i>Nenhum produto adicionado</div>';
    if (summaryCard) summaryCard.classList.remove('has-items');
    if (cupomResumoContainer) cupomResumoContainer.classList.add('d-none');
    atualizarResgateCards();
    return;
  }
  container.classList.toggle('is-capped', linhas.length >= 3);
  if (summaryCard) summaryCard.classList.add('has-items');
  if (cupomResumoContainer) cupomResumoContainer.classList.remove('d-none');
  container.innerHTML = '';
  linhas.forEach(row => {
    const nomeInput = row.querySelector('[name="produto_nome[]"]');
    const idInput = row.querySelector('[name="produto_id[]"]');
    const qtdInput = row.querySelector('[name="qtd[]"]');
    const precoInput = row.querySelector('[name="preco[]"]');
    const obsInput = row.querySelector('[name="observacoes[]"]');
    const usarPontosInput = row.querySelector('[name="usar_pontos[]"]');
    const nome = nomeInput ? nomeInput.value : '';
    const produtoId = row.dataset.produtoId || (idInput ? idInput.value : '');
    const qtd = qtdInput ? parseInt(qtdInput.value, 10) || 0 : 0;
    const preco = precoInput ? parseFloat(precoInput.value) || 0 : 0;
    const obs = obsInput ? obsInput.value.trim() : '';
    const pontosCusto = parseInt(row.dataset.pontosCusto || '0', 10) || 0;
    const usandoPontos = usarPontosInput && usarPontosInput.value === '1';
    const totalItem = qtd * preco;
    const pontosTotalItem = pontosCusto * qtd;
    const podeResgatar = clubePontosAtivo && pontosCusto > 0;
    const clienteSelecionado = clienteIdInput && clienteIdInput.value;

    let obsHtml = '';
    const ehComboItem = obs.startsWith('[combo]\n');
    const ehComplementosItem = obs.startsWith('[complementos]\n');
    if (ehComboItem || ehComplementosItem) {
      const prefixoItem = ehComboItem ? '[combo]\n' : '[complementos]\n';
      const rotuloItem = ehComboItem ? 'Seleções do combo:' : 'Complementos:';
      const linhas = obs.substring(prefixoItem.length).split('\n').filter(l => l.trim());
      obsHtml = `<div class="pdv-summary-obs pdv-summary-combo"><span class="pdv-summary-obs-label">${rotuloItem}</span>${linhas.map(l => `<div class="pdv-summary-combo-line">${escapeHtml(l)}</div>`).join('')}</div>`;
    } else if (obs) {
      obsHtml = `<div class="pdv-summary-obs"><span class="pdv-summary-obs-label">Observação:</span> ${escapeHtml(obs)}</div>`;
    }

    const item = document.createElement('div');
    item.className = 'pdv-summary-item';
    item.innerHTML = `
      <div class="pdv-summary-info">
        <div class="pdv-summary-name">${qtd}x ${escapeHtml(nome)}</div>
        ${obsHtml}
        ${podeResgatar ? `<div class="pdv-summary-meta ${usandoPontos ? 'is-active' : ''}">Resgate ${pontosTotalItem} pts</div>` : ''}
      </div>
      <div class="pdv-summary-price">${formatarDinheiro(totalItem)}</div>
      <div class="pdv-summary-actions">
        ${podeResgatar ? `<button type="button" class="pdv-summary-btn points${usandoPontos ? ' active' : ''}${!clienteSelecionado ? ' disabled' : ''}" onclick="toggleResgateItem('${produtoId}')">
          <i class="bi bi-stars"></i>
        </button>` : ''}
        <button type="button" class="pdv-summary-btn edit" onclick="editarItemResumo('${produtoId}')">
          <i class="bi bi-pencil"></i>
        </button>
        <button type="button" class="pdv-summary-btn remove" onclick="removerItemResumo('${produtoId}')">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;
    container.appendChild(item);
  });
  atualizarResgateCards();
}

function toggleResgateItem(produtoKey){
  const row = document.querySelector(`#listaProdutos .pdv-cart-row[data-produto-id="${produtoKey}"]`);
  if (!row) return;
  if (!clubePontosAtivo) {
    mostrarToast('Clube de pontos desabilitado.', 'warn');
    return;
  }
  const custo = parseInt(row.dataset.pontosCusto || '0', 10) || 0;
  if (custo <= 0) return;
  const usarInput = row.querySelector('[name="usar_pontos[]"]');
  const qtdInput = row.querySelector('[name="qtd[]"]');
  const qtd = qtdInput ? parseInt(qtdInput.value, 10) || 0 : 0;
  const usando = usarInput && usarInput.value === '1';

  if (!usando) {
    if (!validarResgateLinha(row, qtd)) return;
    aplicarResgateLinha(row, true);
  } else {
    aplicarResgateLinha(row, false);
  }

  atualizarTotal();
  atualizarResumoItens();
}

function atualizarResgateCards(){
  const ativos = new Set();
  document.querySelectorAll('#listaProdutos .pdv-cart-row').forEach(row => {
    const usarInput = row.querySelector('[name="usar_pontos[]"]');
    if (!usarInput || usarInput.value !== '1') return;
    const idInput = row.querySelector('[name="produto_id[]"]');
    const id = idInput ? String(idInput.value) : '';
    if (id) ativos.add(id);
  });
  document.querySelectorAll('.pdv-product-card').forEach(card => {
    const id = String(card.dataset.id || '');
    card.classList.toggle('is-resgate', ativos.has(id));
  });
}

function calcularReservas(){
  const reservas = {};
  document.querySelectorAll('#listaProdutos .pdv-cart-row').forEach(row => {
    const idInput = row.querySelector('[name="produto_id[]"]');
    const qtdInput = row.querySelector('[name="qtd[]"]');
    const id = idInput ? parseInt(idInput.value, 10) : 0;
    const qtd = qtdInput ? parseInt(qtdInput.value, 10) : 0;
    if (!id || !qtd) return;
    reservas[id] = (reservas[id] || 0) + qtd;
  });
  return reservas;
}

function obterEstoqueRestante(card, reservas = null){
  if (!card) return 0;
  const inicial = parseInt(card.dataset.estoque || 0, 10) || 0;
  const reservaAtual = reservas || calcularReservas();
  const reservado = calcularReservaGrupo(card.dataset.id, reservaAtual);
  return inicial - reservado;
}

function atualizarEstoqueCarrinho(mostrarAviso = false){
  const reservas = calcularReservas();
  produtoCards.forEach(card => {
    const restante = obterEstoqueRestante(card, reservas);
    const anterior = card.dataset.estoqueRestante !== undefined
      ? parseInt(card.dataset.estoqueRestante, 10)
      : (parseInt(card.dataset.estoque || 0, 10) || 0);
    card.dataset.estoqueRestante = restante;

    const estoqueEl = card.querySelector('.pdv-product-stock');
    const textoEl = card.querySelector('.pdv-product-stock-text');
    const iconEl = estoqueEl ? estoqueEl.querySelector('i') : null;

    if (estoqueEl && textoEl) {
      estoqueEl.classList.toggle('is-ok', restante > 0);
      estoqueEl.classList.toggle('is-empty', restante <= 0);
      if (iconEl) {
        iconEl.className = restante > 0 ? 'bi bi-box-seam' : 'bi bi-exclamation-circle';
      }
      textoEl.textContent = restante > 0 ? `${restante} em estoque` : 'Sem estoque';
    }

    card.classList.toggle('is-out', restante <= 0);
    card.setAttribute('aria-disabled', restante <= 0 ? 'true' : 'false');
    if (card.classList.contains('active') && restante <= 0) {
      card.classList.remove('active');
      produtoSelecionadoNome.textContent = 'Nenhum';
    }

    if (mostrarAviso && anterior > 0 && restante <= 0) {
      mostrarToast(`Ultima unidade adicionada. Estoque zerou para ${card.dataset.nome || 'produto'}.`, 'warn');
    }
  });
}

function validarEstoqueItens(){
  const reservas = calcularReservas();
  const gruposVerificados = new Set();
  for (const [id, qtd] of Object.entries(reservas)) {
    const card = document.querySelector(`.pdv-product-card[data-id="${id}"]`);
    if (!card) continue;
    const grupoId = produtoParaGrupo[id];
    const chave = grupoId ? ('g' + grupoId) : ('p' + id);
    if (gruposVerificados.has(chave)) continue;
    gruposVerificados.add(chave);
    const inicial = parseInt(card.dataset.estoque || 0, 10) || 0;
    const totalReservado = calcularReservaGrupo(id, reservas);
    if (totalReservado > inicial) {
      const nome = card.dataset.nome || 'Produto';
      mostrarToast(`${nome} sem estoque suficiente. Disponivel: ${Math.max(0, inicial)}.`, 'warn');
      return false;
    }
  }
  return true;
}

function removerItemCarrinho(btn){
  const row = btn.closest('.pdv-cart-row');
  if (row) row.remove();
  atualizarTotal();
  atualizarEstoqueCarrinho();
}

function atualizarQuantidadeItem(input){
  if (!input) return;
  if (parseInt(input.value, 10) < 1) {
    input.value = 1;
  }
  atualizarTotal();
  atualizarEstoqueCarrinho();
}

function atualizarTaxaMaquininhaVisivel(){
  let temCartao = false;
  if (pagamentoDividido.checked) {
    temCartao = ['credito','debito'].includes(formaPagamento1.value) ||
      ['credito','debito'].includes(formaPagamento2.value);
  } else {
    temCartao = ['credito','debito'].includes(formaPagamento.value);
  }
  campoTaxaMaquininha.classList.toggle('d-none', !temCartao);
  if (!temCartao) {
    taxaMaquininhaPercent.value = '0';
  }
}

function atualizarVisibilidadePagamento(){
  const dividido = pagamentoDividido.checked;
  blocoSplit.classList.toggle('d-none', !dividido);
  campoFormaPagamento.classList.toggle('d-none', dividido);

  const dinheiro = formaPagamento.value === 'dinheiro';
  campoValorPago.classList.toggle('d-none', dividido || !dinheiro);
  linhaValorPago.classList.toggle('d-none', dividido || !dinheiro);
  linhaTroco.classList.toggle('d-none', dividido || !dinheiro);

  if (dividido || !dinheiro) {
    trocoInput.value = '';
    trocoTexto.textContent = 'Troco: ' + formatarDinheiro(0);
    trocoLabel.textContent = 'Troco';
    if (valorPagoResumo) {
      valorPagoResumo.innerText = formatarDinheiro(0);
    }
    if (trocoResumo) {
      trocoResumo.innerText = formatarDinheiro(0);
    }
  }

  if (dividido && document.activeElement === pagamentoDividido) {
    valorPagamento1.focus();
  } else if (!dividido && dinheiro && document.activeElement === formaPagamento) {
    trocoInput.focus();
  }

  atualizarTaxaMaquininhaVisivel();
  atualizarTotal();
}

formaPagamento.addEventListener('change', atualizarVisibilidadePagamento);
pagamentoDividido.addEventListener('change', atualizarVisibilidadePagamento);
formaPagamento1.addEventListener('change', () => {
  atualizarTaxaMaquininhaVisivel();
  atualizarTotal();
});
formaPagamento2.addEventListener('change', () => {
  atualizarTaxaMaquininhaVisivel();
  atualizarTotal();
});
valorPagamento1.addEventListener('input', atualizarTotal);
valorPagamento2.addEventListener('input', atualizarTotal);
descontoTipo.addEventListener('change', atualizarTotal);
descontoValor.addEventListener('input', atualizarTotal);
if (cashbackToggle) {
  cashbackToggle.addEventListener('change', atualizarTotal);
}
if (cashbackUsarToggle) {
  cashbackUsarToggle.addEventListener('change', () => {
    if (!cashbackUsarToggle.checked) {
      cashbackValorSolicitado = 0;
      if (cashbackUsadoInput) cashbackUsadoInput.value = '0';
    }
    atualizarTotal();
  });
}
if (cashbackResumoAction) {
  cashbackResumoAction.addEventListener('click', abrirModalCashback);
}
taxaMaquininhaPercent.addEventListener('input', atualizarTotal);

function syncEntregaFormToModal(){
  if (!entregaRuaModal) return;
  entregaRuaModal.value = enderecoRua.value || '';
  entregaNumeroModal.value = enderecoNumero ? enderecoNumero.value || '' : '';
  entregaBairroModal.value = enderecoBairro.value || '';
  entregaCidadeModal.value = enderecoCidade ? enderecoCidade.value || '' : '';
  entregaCepModal.value = aplicarMascaraCep(enderecoCep.value || '');
  entregaComplementoModal.value = enderecoComplemento.value || '';
  if (entregaDistanciaKm && enderecoDistancia) {
    entregaDistanciaKm.value = enderecoDistancia.value || '';
  }
  if (entregaTaxaValor) {
    entregaTaxaValor.value = taxaEntregaInput.value || '';
  }
  if (entregaTaxaEditar && entregaTaxaValor) {
    entregaTaxaValor.classList.toggle('d-none', !entregaTaxaEditar.checked);
  }
  if (entregaTaxaInfo && entregaTaxaEditar) {
    entregaTaxaInfo.classList.toggle('is-editing', entregaTaxaEditar.checked);
  }
  if (entregaTaxaLabel) {
    entregaTaxaLabel.textContent = formatarDinheiro(taxaEntregaInput.value || 0);
  }
}

function obterCashbackMaximoPedido(){
  const subtotal = calcularSubtotalAtual();
  const taxa = parseFloat((taxaEntregaInput && taxaEntregaInput.value) || 0);
  const descontoInput = parseFloat((descontoValor && descontoValor.value) || 0);
  let descontoAtual = 0;
  if (descontoInput > 0) {
    descontoAtual = descontoTipo && descontoTipo.value === 'percent'
      ? subtotal * (descontoInput / 100)
      : descontoInput;
  }
  return Math.max(0, Math.min(clienteCashbackSaldo, (subtotal + taxa - descontoAtual)));
}

function abrirModalCashback(){
  if (!cashbackUsarToggle || cashbackUsarToggle.disabled) return;
  if (!modalCashbackEl) return;
  if (!modalCashback) {
    modalCashback = new bootstrap.Modal(modalCashbackEl);
  }
  const maximo = obterCashbackMaximoPedido();
  if (cashbackModalSaldo) cashbackModalSaldo.textContent = formatarDinheiro(clienteCashbackSaldo);
  atualizarCashbackValidade(clienteCashbackExpiraEm);
  if (cashbackModalValor) {
    const valorAtual = cashbackUsarToggle.checked ? (cashbackValorSolicitado || maximo) : 0;
    /* formata com máscara R$ */
    const num = Math.round(Math.max(0, valorAtual) * 100);
    const c = String(num).padStart(3, '0');
    const parte = c.slice(-2);
    const reais = (c.slice(0, -2).replace(/^0+/, '') || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    cashbackModalValor.value = 'R$ ' + reais + ',' + parte;
    /* atualiza botão */
    if (cashbackModalUsar) {
      cashbackModalUsar.textContent = valorAtual > 0 ? 'Usar R$ ' + reais + ',' + parte : 'Usar';
    }
  }
  modalCashback.show();
  window.setTimeout(() => {
    if (cashbackModalValor) cashbackModalValor.focus();
  }, 140);
}

function aplicarCashbackSelecionado(){
  if (!cashbackUsarToggle || !cashbackModalValor) return;
  const maximo = obterCashbackMaximoPedido();
  let valor = parseValorMonetario(cashbackModalValor.value || 0);
  if (Number.isNaN(valor) || valor < 0) valor = 0;
  if (valor > maximo) valor = maximo;
  cashbackValorSolicitado = valor;
  cashbackUsarToggle.checked = valor > 0;
  if (cashbackUsadoInput) {
    cashbackUsadoInput.value = valor > 0 ? valor.toFixed(2) : '0';
  }
  atualizarTotal();
  if (modalCashback) modalCashback.hide();
}

function syncEntregaModalToForm(){
  if (!entregaRuaModal) return;
  enderecoRua.value = entregaRuaModal.value || '';
  if (enderecoNumero) enderecoNumero.value = entregaNumeroModal.value || '';
  enderecoBairro.value = entregaBairroModal.value || '';
  if (enderecoCidade) enderecoCidade.value = entregaCidadeModal.value || '';
  enderecoCep.value = aplicarMascaraCep(entregaCepModal.value || '');
  enderecoComplemento.value = entregaComplementoModal.value || '';
  if (enderecoDistancia && entregaDistanciaKm) {
    enderecoDistancia.value = entregaDistanciaKm.value || '';
  }

  if (entregaTaxaEditar && entregaTaxaEditar.checked) {
    if (entregaTaxaValor) {
      taxaEntregaInput.value = entregaTaxaValor.value || '0';
    }
    if (entregaTaxaLabel) {
      entregaTaxaLabel.textContent = formatarDinheiro(taxaEntregaInput.value || 0);
    }
  } else {
    atualizarTaxaPorBairro();
  }

  atualizarEnderecoResumo();
  atualizarPrevisaoEntrega();
  atualizarTotal();
  atualizarEntregaResumo();
}

function abrirModalAgendamento(){
  if (!modalAgendamentoEl) return;
  if (!modalAgendamento) {
    modalAgendamento = new bootstrap.Modal(modalAgendamentoEl);
  }
  const cfg = obterAgendamentoConfig();
  if (!cfg || !cfg.ativo) {
    mostrarToast('Agendamento indisponivel.', 'warn');
    return;
  }
  if (agendamentoSubtitle && tipoPedido) {
    agendamentoSubtitle.textContent = tipoPedido.value === 'entrega'
      ? 'Escolha a data e o horario de entrega.'
      : 'Escolha a data e o horario de retirada.';
  }
  const valor = enderecoAgendamento ? enderecoAgendamento.value || '' : '';
  if (agendamentoData) agendamentoData.value = '';
  if (agendamentoHora) agendamentoHora.value = '';
  if (valor) {
    const raw = valor.toString().replace(' ', 'T');
    const partes = raw.split('T');
    if (agendamentoData && partes[0]) agendamentoData.value = partes[0];
    if (agendamentoHora && partes[1]) agendamentoHora.value = partes[1].slice(0, 5);
  }
  ajustarLimitesAgendamento();
  renderizarDiasAgendamento();
  if (modalAgendamento) modalAgendamento.show();
}

function salvarAgendamento(){
  if (!enderecoAgendamento) return;
  const validacao = validarAgendamento();
  if (!validacao.ok) {
    mostrarToast(validacao.msg || 'Agendamento invalido.', 'warn');
    return;
  }
  const data = agendamentoData ? agendamentoData.value : '';
  const hora = agendamentoHora ? agendamentoHora.value : '';
  if (data) {
    enderecoAgendamento.value = `${data}T${hora || '00:00'}`;
  } else {
    enderecoAgendamento.value = '';
  }
  atualizarPrevisaoEntrega();
  atualizarAgendamentoResumo();
  if (modalAgendamento) modalAgendamento.hide();
}

function limparAgendamento(){
  if (agendamentoData) agendamentoData.value = '';
  if (agendamentoHora) agendamentoHora.value = '';
  if (enderecoAgendamento) enderecoAgendamento.value = '';
  atualizarPrevisaoEntrega();
  atualizarAgendamentoResumo();
  if (modalAgendamento) modalAgendamento.hide();
}

function abrirModalEntrega(){
  if (!modalEntregaEl) return;
  if (!modalEntrega) {
    modalEntrega = new bootstrap.Modal(modalEntregaEl);
  }
  syncEntregaFormToModal();
  if (entregaClienteBusca) {
    entregaClienteBusca.value = inputBusca.value || '';
  }
  if (modalEntrega) modalEntrega.show();
}

window.pdvHandleTipoChange = function(selectEl){
  if (!selectEl) return;
  const entrega = selectEl.value === 'entrega';
  toggleEntregaCampos(entrega);
  atualizarSideDetalhes();
  if (retiradaBuscaWrap) {
    if (selectEl.value === 'retirada') {
      retiradaBuscaExpandida = false;
      retiradaBuscaWrap.classList.add('pdv-retirada-collapsed');
    } else {
      retiradaBuscaExpandida = false;
      retiradaBuscaWrap.classList.remove('pdv-retirada-collapsed');
    }
  }
  if (selectEl.value === 'retirada' && inputBusca) {
    inputBusca.focus();
    ocultarListaClientesPrincipal();
  }
  if (entrega) {
    abrirModalEntrega();
  } else if (formaPagamento) {
    formaPagamento.focus();
  }
};
if (tipoPedido) {
  const handler = () => pdvHandleTipoChange(tipoPedido);
  tipoPedido.addEventListener('change', handler);
  tipoPedido.addEventListener('input', handler);
}
if (pdvModoModal && pdvUsaPlaceholderTipo && tipoPedido) {
  tipoPedido.value = '';
  toggleEntregaCampos(false);
}
atualizarSideDetalhes();

function atualizarTipoLabel(){
  if (!tipoPedidoLabel || !tipoPedido) return;
  const opt = tipoPedido.options[tipoPedido.selectedIndex];
  const texto = (opt && opt.value) ? opt.textContent.trim() : 'Escolha o tipo do pedido';
  tipoPedidoLabel.textContent = texto;
  atualizarTipoMenuSelecionado();
}

function atualizarTipoMenuSelecionado(){
  if (!tipoPedidoMenu || !tipoPedido) return;
  const valor = tipoPedido.value || '';
  tipoPedidoMenu.querySelectorAll('.pdv-type-option').forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-value') === valor);
  });
}

if (tipoPedidoSelect) {
  const tipoPedidoCard = tipoPedidoSelect.closest('.pdv-card');
  const abrirMenuTipo = (e) => {
    if (e) e.stopPropagation();
    if (tipoPedidoSelect.classList.contains('use-native') && !pdvModoModal) return;
    const aberto = tipoPedidoSelect.classList.toggle('is-open');
    if (tipoPedidoCard) tipoPedidoCard.classList.toggle('pdv-card-open', aberto);
    setTimeout(() => {
      const abertoAgora = tipoPedidoSelect.classList.contains('is-open');
      if (abertoAgora && tipoPedidoMenu && getComputedStyle(tipoPedidoMenu).display === 'none') {
        tipoPedidoSelect.classList.add('use-native');
        if (tipoPedido) tipoPedido.focus();
      }
    }, 0);
  };
  if (tipoPedidoBtn) {
    tipoPedidoBtn.addEventListener('click', abrirMenuTipo);
  }
  tipoPedidoSelect.addEventListener('click', abrirMenuTipo);
  document.addEventListener('click', (e) => {
    if (!tipoPedidoSelect.contains(e.target)) {
      tipoPedidoSelect.classList.remove('is-open');
      if (tipoPedidoCard) tipoPedidoCard.classList.remove('pdv-card-open');
    }
  });
  atualizarTipoMenuSelecionado();
}
if (retiradaBuscaWrap) {
  retiradaBuscaWrap.addEventListener('click', (e) => {
    if (e.target.closest('.pdv-retirada-search')) return;
    if (e.target.closest('.pdv-icon-btn')) return;
    retiradaBuscaWrap.classList.remove('pdv-retirada-collapsed');
    retiradaBuscaExpandida = true;
    const input = retiradaBuscaWrap.querySelector('#clienteBusca');
    if (input) input.focus();
  });
}
if (tipoPedidoMenu && tipoPedido) {
  tipoPedidoMenu.querySelectorAll('.pdv-type-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const value = btn.getAttribute('data-value');
      tipoPedido.value = value;
      tipoPedido.dispatchEvent(new Event('change', { bubbles: true }));
      atualizarTipoLabel();
      if (tipoPedidoSelect) tipoPedidoSelect.classList.remove('is-open');
    });
  });
}
if (tipoPedido) {
  tipoPedido.addEventListener('change', atualizarTipoLabel);
}
atualizarTipoLabel();

  toggleEntregaCampos(tipoPedido.value === 'entrega');
  atualizarVisibilidadePagamento();
  aplicarPermissoes();
  atualizarDisponibilidadeAgendamento();

taxaEntregaInput.addEventListener('input', atualizarTotal);
trocoInput.addEventListener('input', atualizarTotal);

enderecoRua.addEventListener('input', () => {
  atualizarEnderecoResumo();
  atualizarPrevisaoEntrega();
});
enderecoBairro.addEventListener('input', () => {
  atualizarTaxaPorBairro();
  atualizarEnderecoResumo();
});
enderecoCep.addEventListener('input', () => {
  enderecoCep.value = aplicarMascaraCep(enderecoCep.value);
  atualizarEnderecoResumo();
  agendarBuscaCep(enderecoCep.value, 'form');
});
  enderecoComplemento.addEventListener('input', atualizarEnderecoResumo);
  enderecoAgendamento.addEventListener('input', () => {
    atualizarPrevisaoEntrega();
    atualizarAgendamentoResumo();
  });

  function toggleEntregaCampos(entrega){
  camposEntrega.forEach(el => el.classList.add('d-none'));
  camposRetirada.forEach(el => el.classList.toggle('d-none', entrega));
  if (cardEntregaInfo) cardEntregaInfo.classList.toggle('d-none', !entrega);
  if (!entrega) {
    enderecoRua.value = '';
    enderecoBairro.value = '';
    enderecoCep.value = '';
    enderecoComplemento.value = '';
    if (enderecoNumero) enderecoNumero.value = '';
    if (enderecoCidade) enderecoCidade.value = '';
    ultimaDistanciaCalculada = 0;
    distanciaAtualEntrega = 0;
    enderecoHidden.value = '';
    if (enderecoPreview) enderecoPreview.textContent = 'Endereco incompleto';
    taxaEntregaInput.value = '0';
    if (taxaSugestao) taxaSugestao.textContent = '';
    if (cupomFreteAtivo) {
      limparCupom('Cupom de frete removido.');
    }
  } else {
    if (!taxaEntregaInput.value || Number(taxaEntregaInput.value) === 0) {
      taxaEntregaInput.value = '0.00';
    }
    atualizarCampoDistancia();
    atualizarTaxaPorBairro();
    atualizarEnderecoResumo();
    syncEntregaFormToModal();
    atualizarEntregaResumo();
  }
    atualizarDisponibilidadeAgendamento();
    atualizarPrevisaoEntrega();
    atualizarTotal();
  }

  function atualizarSideDetalhes(){
    const ocultar = !tipoPedido || !tipoPedido.value;
    if (pdvSideDetails) pdvSideDetails.classList.toggle('d-none', ocultar);
    if (pdvSideSummary) pdvSideSummary.classList.remove('d-none');
    atualizarResumoVisibilidade();
    if (retiradaBuscaWrap) {
      const isRetirada = tipoPedido && tipoPedido.value === 'retirada';
      if (isRetirada && !retiradaBuscaExpandida) {
        retiradaBuscaWrap.classList.add('pdv-retirada-collapsed');
      } else {
        retiradaBuscaWrap.classList.remove('pdv-retirada-collapsed');
      }
    }
  }

  function atualizarResumoVisibilidade(){
    const temItens = document.querySelectorAll('#listaProdutos .pdv-cart-row').length > 0;
    const tipoSelecionado = tipoPedido && tipoPedido.value;
    if (pdvSummaryDetails) pdvSummaryDetails.classList.toggle('d-none', !tipoSelecionado || !temItens);
  }

  function aplicarPermissoes(){
    if (podeAplicarDesconto) return;

    if (cupomCodigo) {
      cupomCodigo.value = '';
      cupomCodigo.disabled = true;
      cupomCodigo.placeholder = 'Restrito';
    }
    if (cupomInput) {
      cupomInput.value = '';
      cupomInput.disabled = true;
    }
    if (cupomResumoSelect) {
      cupomResumoSelect.value = '';
      cupomResumoSelect.disabled = true;
    }
    if (cupomAplicar) cupomAplicar.disabled = true;
    if (cupomRemover) cupomRemover.disabled = true;
    if (cupomMsg) {
      cupomMsg.textContent = 'Restrito para gerencia.';
      cupomMsg.classList.add('is-error');
    }
    if (descontoTipo) descontoTipo.disabled = true;
    if (descontoValor) {
      descontoValor.value = '0';
      descontoValor.disabled = true;
    }
    if (taxaMaquininhaPercent) {
      taxaMaquininhaPercent.value = '0';
      taxaMaquininhaPercent.disabled = true;
    }
    if (avisoPermissaoDesconto) {
      avisoPermissaoDesconto.classList.remove('d-none');
    }
    atualizarTaxaMaquininhaVisivel();
    atualizarTotal();
  }

function obterTaxaDinamica(distancia, porKm = false){
  if (!taxasDinamicasOrdenadas.length) return null;
  let distanciaBase = parseNumero(distancia);
  if (!Number.isFinite(distanciaBase) || distanciaBase <= 0) {
    return null;
  }
  let regra = null;
  for (const item of taxasDinamicasOrdenadas) {
    if (distanciaBase <= item.distancia_km) {
      regra = item;
      break;
    }
  }
  if (!regra) {
    regra = taxasDinamicasOrdenadas[taxasDinamicasOrdenadas.length - 1];
  }
  if (!regra) return null;
  let valor = Number(regra.valor || 0);
  if (porKm) {
    valor = valor * Math.max(distanciaBase, 1);
  }
  return { valor, regra };
}

function atualizarCampoDistancia(){
  const precisaDistancia = ['dinamica', 'area'].includes(String(taxaEntregaTipoAtual || '').toLowerCase());
  if (entregaDistanciaWrap) {
    entregaDistanciaWrap.classList.toggle('d-none', !precisaDistancia);
  }
}

function aplicarTaxaEntregaAutomatica(subtotal){
  if (tipoPedido.value !== 'entrega') return;

  const subtotalAtual = typeof subtotal === 'number' ? subtotal : calcularSubtotalAtual();
  const freteGratisAtivo = taxaEntregaGratis && pedidoMinimoEntrega > 0 && subtotalAtual >= pedidoMinimoEntrega;
  if (!numeroEntregaPreenchido() && !(entregaTaxaEditar && entregaTaxaEditar.checked)) {
    taxaEntregaInput.value = '0.00';
    if (entregaTaxaValor) entregaTaxaValor.value = taxaEntregaInput.value || '';
    if (taxaSugestao) taxaSugestao.textContent = 'Informe o numero para calcular a taxa.';
    if (entregaTaxaLabel) entregaTaxaLabel.textContent = formatarDinheiro(taxaEntregaInput.value || 0);
    return;
  }

  let taxaCalculada = 0;
  let aviso = '';

  const tipoTaxa = String(taxaEntregaTipoAtual || '').toLowerCase().trim();
  if (['dinamica', 'area'].includes(tipoTaxa)
    && ultimaTaxaEntregaApi !== null
    && !(entregaTaxaEditar && entregaTaxaEditar.checked)
  ) {
    taxaCalculada = Number(ultimaTaxaEntregaApi || 0);
    aviso = `Taxa dinamica: ${formatarDinheiro(taxaCalculada)}`;
  } else if (cupomFreteAtivo) {
    taxaCalculada = 0;
    aviso = 'Frete gratis aplicado.';
  } else if (tipoTaxa === 'sem') {
    taxaCalculada = 0;
    aviso = 'Sem taxa de entrega.';
  } else if (tipoTaxa === 'fixa') {
    taxaCalculada = Number(taxaPadraoEntrega || 0);
    if (taxaCalculada > 0) {
      aviso = `Taxa fixa: ${formatarDinheiro(taxaCalculada)}`;
    }
  } else if (tipoTaxa === 'bairro') {
    const chave = normalizarTexto(enderecoBairro.value);
    if (chave && Object.prototype.hasOwnProperty.call(taxasBairro, chave)) {
      taxaCalculada = Number(taxasBairro[chave] || 0);
      aviso = `Taxa por bairro: ${formatarDinheiro(taxaCalculada)}`;
    } else if (chave) {
      aviso = 'Bairro sem taxa cadastrada.';
      const params = new URLSearchParams();
      params.set('subtotal', calcularSubtotalAtual());
      params.set('tipo', 'entrega');
      if (enderecoHidden && enderecoHidden.value) {
        params.set('endereco', enderecoHidden.value);
      }
      fetch('api/pdv_calculo.php', { method: 'POST', body: params })
        .then(r => r.json())
        .then(resp => {
          if (resp && typeof resp.taxa !== 'undefined' && !(entregaTaxaEditar && entregaTaxaEditar.checked)) {
            taxaEntregaInput.value = Number(resp.taxa || 0).toFixed(2);
            if (entregaTaxaValor) {
              entregaTaxaValor.value = taxaEntregaInput.value || '';
            }
            if (entregaTaxaLabel) {
              entregaTaxaLabel.textContent = formatarDinheiro(taxaEntregaInput.value || 0);
            }
          }
        })
        .catch(() => {});
    } else {
      aviso = 'Informe o bairro para calcular a taxa.';
    }
  } else if (tipoTaxa === 'dinamica' || tipoTaxa === 'area') {
    const cepLimpo = (enderecoCep && enderecoCep.value ? enderecoCep.value : '').replace(/\D/g, '');
    let distanciaAtual = distanciaAtualEntrega > 0
      ? distanciaAtualEntrega
      : parseNumero(enderecoDistancia && enderecoDistancia.value ? enderecoDistancia.value : 0);
    if (distanciaAtual <= 0 && ultimaDistanciaCalculada > 0) {
      distanciaAtual = ultimaDistanciaCalculada;
    }
    if (cepLimpo.length === 8 && distanciaAtual <= 0 && !cepLookupEmAndamento) {
      buscarEnderecoPorCep(cepLimpo, 'form');
    }
    const usarPorKm = tipoTaxa === 'area';
    const resultado = obterTaxaDinamica(distanciaAtual, usarPorKm);
    if (resultado) {
      taxaCalculada = Number(resultado.valor || 0);
      aviso = `Taxa dinamica: ${formatarDinheiro(taxaCalculada)} · Dist: ${distanciaAtual.toFixed(2).replace('.',',')}km`;
    } else {
      aviso = 'Informe a distancia para calcular a taxa.';
    }
  }

  if (freteGratisAtivo) {
    taxaCalculada = 0;
    aviso = `Frete gratis aplicado (min ${formatarDinheiro(pedidoMinimoEntrega)})`;
  } else if (taxaEntregaGratis && pedidoMinimoEntrega > 0) {
    const complemento = `Frete gratis acima de ${formatarDinheiro(pedidoMinimoEntrega)}`;
    aviso = aviso ? `${aviso} · ${complemento}` : complemento;
  }

  if (entregaTaxaEditar) {
    entregaTaxaEditar.disabled = freteGratisAtivo;
    if (freteGratisAtivo) {
      entregaTaxaEditar.checked = false;
    }
  }
  if (taxaEditadaInput) {
    taxaEditadaInput.value = entregaTaxaEditar && entregaTaxaEditar.checked ? '1' : '0';
  }
  if (entregaTaxaValor) {
    entregaTaxaValor.classList.toggle('d-none', !(entregaTaxaEditar && entregaTaxaEditar.checked));
  }

  const podeAtualizar = !(entregaTaxaEditar && entregaTaxaEditar.checked);
  if (podeAtualizar || freteGratisAtivo) {
    taxaEntregaInput.value = taxaCalculada.toFixed(2);
    if (entregaTaxaValor) {
      entregaTaxaValor.value = taxaEntregaInput.value || '';
    }
  }

  if (taxaSugestao) {
    taxaSugestao.textContent = aviso || '';
  }
  if (entregaTaxaLabel) {
    entregaTaxaLabel.textContent = formatarDinheiro(taxaEntregaInput.value || 0);
  }
}

function atualizarTaxaPorBairro(){
  if (tipoPedido.value !== 'entrega') return;
  aplicarTaxaEntregaAutomatica();
  atualizarTotal();
}

function atualizarEnderecoResumo(){
  if (tipoPedido.value !== 'entrega') return;
  const rua = enderecoRua.value.trim();
  const numero = enderecoNumero ? enderecoNumero.value.trim() : '';
  const bairro = enderecoBairro.value.trim();
  const cidade = enderecoCidade ? enderecoCidade.value.trim() : '';
  const cep = enderecoCep.value.trim();
  const complemento = enderecoComplemento.value.trim();

  const partes = [];
  if (rua) partes.push(numero ? `${rua}, ${numero}` : rua);
  if (bairro) partes.push(`Bairro: ${bairro}`);
  if (cidade) partes.push(`Cidade: ${cidade}`);
  if (cep) partes.push(`CEP: ${cep}`);
  if (complemento) partes.push(`Complemento: ${complemento}`);

  const completo = partes.join(' | ');
  enderecoHidden.value = completo;
  enderecoPreview.textContent = completo || 'Endereco incompleto';
  atualizarEntregaResumo();
}

function atualizarPrevisaoEntrega(){
  if (tipoPedido.value !== 'entrega') {
    previsaoEntrega.textContent = `${tempoRetiradaMin} min`;
    return;
  }
  const cfg = obterAgendamentoConfig();
  if (cfg && cfg.ativo && enderecoAgendamento.value) {
    previsaoEntrega.textContent = `Agendado para ${formatarDataHora(enderecoAgendamento.value)}`;
    return;
  }
  const totalMin = Number(tempoPreparoMin) + Number(tempoEntregaMin);
  const horario = new Date(Date.now() + totalMin * 60000);
  const hora = String(horario.getHours()).padStart(2,'0');
  const min = String(horario.getMinutes()).padStart(2,'0');
  previsaoEntrega.textContent = `${totalMin} min (aprox ${hora}:${min})`;
}

function mostrarNovoCliente(){
  document.getElementById('novoCliente').classList.toggle('d-none');
}

const produtoSelecionadoNome = document.getElementById('produtoSelecionadoNome');
const pdvVariacoesMap = window.PDV_VARIACOES || {};
const pdvExtrasMap = window.PDV_EXTRAS || {};
const pdvExtrasObrig = window.PDV_EXTRAS_OBRIG || {};
const pdvComplementosItensMap = window.PDV_COMPLEMENTOS_ITENS || {};
const pdvComplementosItensObrig = window.PDV_COMPLEMENTOS_ITENS_OBRIG || {};
const produtoCards = document.querySelectorAll('.pdv-product-card');

// Mapa produto_id -> grupo_id, usado pra refletir em tempo real no card de um
// produto quando outro produto vinculado ao mesmo estoque compartilhado e
// adicionado ao carrinho (ver calcularReservaGrupo). Reconstruido a cada poll
// de estoque pra acompanhar vinculos criados/removidos com o PDV ja aberto.
let produtoParaGrupo = {};
function reconstruirMapaGrupos(){
  produtoParaGrupo = {};
  produtoCards.forEach(card => {
    const grupoId = parseInt(card.dataset.grupo || 0, 10) || 0;
    if (grupoId > 0) {
      produtoParaGrupo[card.dataset.id] = grupoId;
    }
  });
}
reconstruirMapaGrupos();

function calcularReservaGrupo(produtoId, reservas){
  const grupoId = produtoParaGrupo[produtoId];
  if (!grupoId) return reservas[produtoId] || 0;
  let total = 0;
  produtoCards.forEach(card => {
    if (parseInt(card.dataset.grupo || 0, 10) === grupoId) {
      total += reservas[card.dataset.id] || 0;
    }
  });
  return total;
}
const produtoBusca = document.getElementById('produtoBusca');
const categoriaTabs = document.querySelectorAll('.pdv-tab');
const pdvFiltroPromo = document.getElementById('pdvFiltroPromo');
const categoriaTituloEl = document.getElementById('pdvCategoriaTitulo');
const pdvProductsGrid = document.getElementById('pdvProductsGrid');
const pdvViewToggleBtn = document.getElementById('pdvViewToggleBtn');
const pdvViewToggleIcon = document.getElementById('pdvViewToggleIcon');
const PDV_VIEW_KEY = 'pdv_product_view_mode';
const PDV_VIEW_MODES = [
  { key:'grid', cls:'pdv-view-grid', icon:'bi-grid-3x3-gap', title:'Grade padrao' },
  { key:'compact', cls:'pdv-view-compact', icon:'bi-grid', title:'Grade compacta' }
];
let categoriaAtiva = 'all';
let modalVariacoes = null;
let variacaoProdutoCard = null;
let variacaoSelecionada = null;
let extrasSelecionados = [];
let extrasObrigatorio = false;
let variacaoProdutoId = null;
let variacaoLista = document.getElementById('variacaoLista');
let variacaoBusca = document.getElementById('variacaoBusca');
let variacaoQtd = document.getElementById('variacaoQtd');
let variacaoPlus = document.getElementById('variacaoPlus');
let variacaoMinus = document.getElementById('variacaoMinus');
let variacaoAddBtn = document.getElementById('variacaoAddBtn');
let variacaoProdutoNome = document.getElementById('variacaoProdutoNome');
let variacaoProdutoImagem = document.getElementById('variacaoProdutoImagem');
let variacaoProdutoIdEl = document.getElementById('variacaoProdutoId');
let variacaoCount = document.getElementById('variacaoCount');
let extraSection = document.getElementById('extraSection');
let extraLista = document.getElementById('extraLista');
let extraObrigatorioEl = document.getElementById('extraObrigatorio');
let complementoItemSelecionado = null;
let complementosItensObrigatorio = false;
let complementoItensSection = document.getElementById('complementoItensSection');
let complementoItensLista = document.getElementById('complementoItensLista');
let complementoItensObrigatorioEl = document.getElementById('complementoItensObrigatorio');
let observacoesClienteModal = document.getElementById('observacoesClienteModal');
let observacoesClienteInput = document.getElementById('observacoesCliente');

function vincularControlesVariacao(){
  if (!variacaoLista) variacaoLista = document.getElementById('variacaoLista');
  if (!variacaoBusca) variacaoBusca = document.getElementById('variacaoBusca');
  if (!variacaoQtd) variacaoQtd = document.getElementById('variacaoQtd');
  if (!variacaoPlus) variacaoPlus = document.getElementById('variacaoPlus');
  if (!variacaoMinus) variacaoMinus = document.getElementById('variacaoMinus');
  if (!variacaoAddBtn) variacaoAddBtn = document.getElementById('variacaoAddBtn');
  if (!extraLista) extraLista = document.getElementById('extraLista');
  if (!complementoItensLista) complementoItensLista = document.getElementById('complementoItensLista');
  if (!observacoesClienteModal) observacoesClienteModal = document.getElementById('observacoesClienteModal');
  if (!observacoesClienteInput) observacoesClienteInput = document.getElementById('observacoesCliente');

  if (variacaoLista && !variacaoLista.dataset.boundClick) {
    variacaoLista.addEventListener('click', (event) => {
      const row = event.target.closest('.pdv-variacao-row');
      if (!row) return;
      const radio = row.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      variacaoSelecionada = {
        id: row.dataset.id,
        nome: row.dataset.nome,
        preco: parseFloat(row.dataset.preco || 0)
      };
      atualizarVariacaoTotal();
    });
    variacaoLista.dataset.boundClick = '1';
  }

  if (extraLista && !extraLista.dataset.boundClick) {
    extraLista.addEventListener('click', (event) => {
      const row = event.target.closest('.pdv-extra-row');
      if (!row) return;
      const nome = row.dataset.nome || 'Extra';
      const preco = parseFloat(row.dataset.preco || 0);
      const btn = row.querySelector('.pdv-extra-btn');
      const idx = extrasSelecionados.findIndex(e => e.nome === nome);
      if (idx >= 0) {
        extrasSelecionados.splice(idx, 1);
        if (btn) { btn.classList.remove('active'); btn.innerHTML = '+'; }
      } else {
        extrasSelecionados.push({ nome, preco });
        if (btn) { btn.classList.add('active'); btn.innerHTML = '<i class="bi bi-check-lg"></i>'; }
      }
      atualizarVariacaoTotal();
    });
    extraLista.dataset.boundClick = '1';
  }

  if (complementoItensLista && !complementoItensLista.dataset.boundClick) {
    complementoItensLista.addEventListener('click', (event) => {
      const row = event.target.closest('.pdv-extra-row');
      if (!row) return;
      const nome = row.dataset.nome || 'Complemento';
      const preco = parseFloat(row.dataset.preco || 0);
      complementoItemSelecionado = { nome, preco };
      complementoItensLista.querySelectorAll('.pdv-extra-btn').forEach(btn => btn.classList.remove('active'));
      const btn = row.querySelector('.pdv-extra-btn');
      if (btn) btn.classList.add('active');
      atualizarVariacaoTotal();
    });
    complementoItensLista.dataset.boundClick = '1';
  }

  if (variacaoBusca && !variacaoBusca.dataset.boundInput) {
    variacaoBusca.addEventListener('input', () => {
      filtrarVariacoes();
    });
    variacaoBusca.dataset.boundInput = '1';
  }

  if (variacaoMinus && !variacaoMinus.dataset.boundClick) {
    variacaoMinus.addEventListener('click', () => {
      if (!variacaoQtd) return;
      const atual = parseInt(variacaoQtd.textContent, 10) || 1;
      variacaoQtd.textContent = String(Math.max(1, atual - 1));
      atualizarVariacaoTotal();
    });
    variacaoMinus.dataset.boundClick = '1';
  }

  if (variacaoPlus && !variacaoPlus.dataset.boundClick) {
    variacaoPlus.addEventListener('click', () => {
      if (!variacaoQtd) return;
      const atual = parseInt(variacaoQtd.textContent, 10) || 1;
      variacaoQtd.textContent = String(atual + 1);
      atualizarVariacaoTotal();
    });
    variacaoPlus.dataset.boundClick = '1';
  }

  if (variacaoAddBtn && !variacaoAddBtn.dataset.boundClick) {
    variacaoAddBtn.addEventListener('click', () => {
      if (!variacaoSelecionada || !variacaoProdutoCard) {
        mostrarToast('Selecione uma variacao.', 'warn');
        return;
      }
      if (extrasObrigatorio && extrasSelecionados.length === 0) {
        mostrarToast('Selecione um extra.', 'warn');
        return;
      }
      if (complementosItensObrigatorio && !complementoItemSelecionado) {
        mostrarToast('Selecione um complemento.', 'warn');
        return;
      }
      if (!variacaoQtd) return;
      const qtd = parseInt(variacaoQtd.textContent, 10) || 1;
      const baseId = variacaoProdutoCard.dataset.id;
      const rowKey = `${baseId}-var-${variacaoSelecionada.id}`;
      const extraLabel = extrasSelecionados.length ? extrasSelecionados.map(e => ` + ${e.nome}`).join('') : '';
      const complementoLabel = complementoItemSelecionado ? ` + ${complementoItemSelecionado.nome}` : '';
      const nome = `${variacaoProdutoCard.dataset.nome} - ${variacaoSelecionada.nome}${extraLabel}${complementoLabel}`;
      const linha = document.querySelector(`#listaProdutos .pdv-cart-row[data-produto-id="${rowKey}"]`);
      if (linha) {
        const qtdInput = linha.querySelector('[name="qtd[]"]');
        const atual = qtdInput ? parseInt(qtdInput.value, 10) || 0 : 0;
        const usarPontosInput = linha.querySelector('[name="usar_pontos[]"]');
        if (usarPontosInput && usarPontosInput.value === '1') {
          if (!validarResgateLinha(linha, atual + qtd)) {
            return;
          }
        }
        if (qtdInput) qtdInput.value = atual + qtd;
        atualizarTotal();
        atualizarEstoqueCarrinho(true);
        atualizarQtdCards();
        if (variacaoModoResgate) {
          if (validarResgateLinha(linha, parseInt(qtdInput.value, 10) || 0)) {
            aplicarResgateLinha(linha, true);
          }
          variacaoModoResgate = false;
          atualizarTotal();
          atualizarResumoItens();
        }
      } else {
        const extrasValor = extrasSelecionados.reduce((s, e) => s + e.preco, 0);
        const precoBase = variacaoSelecionada.preco + extrasValor + (complementoItemSelecionado ? complementoItemSelecionado.preco : 0);
        const pontosCusto = variacaoProdutoCard
          ? (parseInt(variacaoProdutoCard.dataset.pontosCusto || '0', 10) || 0)
          : 0;
        inserirItemNoCarrinho(nome, qtd, precoBase, '', baseId, rowKey, pontosCusto);
        if (variacaoModoResgate) {
          const novaLinha = document.querySelector(`#listaProdutos .pdv-cart-row[data-produto-id="${rowKey}"]`);
          if (novaLinha) {
            const qtdNova = parseInt(novaLinha.querySelector('[name="qtd[]"]')?.value || '0', 10) || 0;
            if (!validarResgateLinha(novaLinha, qtdNova)) {
              novaLinha.remove();
            } else {
              aplicarResgateLinha(novaLinha, true);
            }
          }
          variacaoModoResgate = false;
          atualizarTotal();
          atualizarResumoItens();
        }
      }
      if (modalVariacoes) modalVariacoes.hide();
      variacaoProdutoCard = null;
      variacaoSelecionada = null;
      extrasSelecionados = [];
      complementoItemSelecionado = null;
    });
    variacaoAddBtn.dataset.boundClick = '1';
  }

  if (observacoesClienteModal && !observacoesClienteModal.dataset.boundInput) {
    observacoesClienteModal.addEventListener('input', () => {
      if (!observacoesClienteInput) return;
      observacoesClienteInput.value = observacoesClienteModal.value || '';
    });
    observacoesClienteModal.dataset.boundInput = '1';
  }
}

function abrirModalVariacoes(card, modoResgate = false){
  const id = card.dataset.id;
  if (!id) return;
  variacaoModoResgate = !!modoResgate;
  variacaoProdutoId = id;
  variacaoProdutoCard = card;
  vincularControlesVariacao();
  if (!variacaoLista) variacaoLista = document.getElementById('variacaoLista');
  if (!variacaoBusca) variacaoBusca = document.getElementById('variacaoBusca');
  if (!variacaoQtd) variacaoQtd = document.getElementById('variacaoQtd');
  if (!variacaoPlus) variacaoPlus = document.getElementById('variacaoPlus');
  if (!variacaoMinus) variacaoMinus = document.getElementById('variacaoMinus');
  if (!variacaoAddBtn) variacaoAddBtn = document.getElementById('variacaoAddBtn');
  if (!variacaoProdutoNome) variacaoProdutoNome = document.getElementById('variacaoProdutoNome');
  if (!variacaoProdutoImagem) variacaoProdutoImagem = document.getElementById('variacaoProdutoImagem');
  if (!variacaoProdutoIdEl) variacaoProdutoIdEl = document.getElementById('variacaoProdutoId');
  if (!variacaoCount) variacaoCount = document.getElementById('variacaoCount');
  if (!extraSection) extraSection = document.getElementById('extraSection');
  if (!extraLista) extraLista = document.getElementById('extraLista');
  if (!extraObrigatorioEl) extraObrigatorioEl = document.getElementById('extraObrigatorio');
  if (!complementoItensSection) complementoItensSection = document.getElementById('complementoItensSection');
  if (!complementoItensLista) complementoItensLista = document.getElementById('complementoItensLista');
  if (!complementoItensObrigatorioEl) complementoItensObrigatorioEl = document.getElementById('complementoItensObrigatorio');
  if (!observacoesClienteModal) observacoesClienteModal = document.getElementById('observacoesClienteModal');
  if (!observacoesClienteInput) observacoesClienteInput = document.getElementById('observacoesCliente');
  if (variacaoBusca) variacaoBusca.value = '';
  if (observacoesClienteModal && observacoesClienteInput) {
    observacoesClienteModal.value = observacoesClienteInput.value || '';
  }
  if (variacaoProdutoNome) {
    const nomeBase = card.dataset.nome || 'Produto';
    variacaoProdutoNome.textContent = nomeBase;
  }
  if (variacaoProdutoIdEl) variacaoProdutoIdEl.textContent = `ID ${id}`;
  if (variacaoCount) {
    variacaoCount.textContent = '';
  }
  if (variacaoProdutoImagem) {
    const img = card.querySelector('.pdv-product-thumb img');
    variacaoProdutoImagem.src = img ? img.getAttribute('src') : '';
    variacaoProdutoImagem.style.display = img ? 'block' : 'none';
  }
  if (variacaoLista) variacaoLista.innerHTML = '<div class="pdv-variacao-row"><span>Carregando...</span></div>';
  if (!modalVariacoes) {
    const modalEl = document.getElementById('modalVariacoes');
    if (modalEl) modalVariacoes = new bootstrap.Modal(modalEl);
  }
  let variacoesInline = null;
  let extrasInline = null;
  let complementosItensInline = null;
  extrasObrigatorio = !!(pdvExtrasObrig && (pdvExtrasObrig[String(id)] || pdvExtrasObrig[Number(id)]));
  if (pdvExtrasMap) {
    extrasInline = pdvExtrasMap[String(id)] || pdvExtrasMap[Number(id)] || null;
  }
  complementosItensObrigatorio = !!(pdvComplementosItensObrig && (pdvComplementosItensObrig[String(id)] || pdvComplementosItensObrig[Number(id)]));
  if (pdvComplementosItensMap) {
    complementosItensInline = pdvComplementosItensMap[String(id)] || pdvComplementosItensMap[Number(id)] || null;
  }
  if (pdvVariacoesMap) {
    variacoesInline = pdvVariacoesMap[String(id)] || pdvVariacoesMap[Number(id)] || null;
  }
  if (card.dataset.variacoesJson) {
    try {
      variacoesInline = JSON.parse(card.dataset.variacoesJson);
    } catch (e) {
      variacoesInline = variacoesInline || null;
    }
  }
  if (variacaoCount) {
    const inlineTipo = Array.isArray(variacoesInline) ? `array(${variacoesInline.length})` : typeof variacoesInline;
    variacaoCount.textContent = `DEBUG: map=${pdvVariacoesMap ? Object.keys(pdvVariacoesMap).length : 0} · produto=${id} · inline=${inlineTipo}`;
  }
  if (Array.isArray(extrasInline) && extrasInline.length > 0) {
    renderExtrasModal(extrasInline);
  } else {
    esconderExtrasModal();
  }
  complementoItemSelecionado = null;
  if (Array.isArray(complementosItensInline) && complementosItensInline.length > 0) {
    renderComplementoItensModal(complementosItensInline);
  } else {
    esconderComplementoItensModal();
  }
  if (Array.isArray(variacoesInline) && variacoesInline.length > 0) {
    renderVariacoesModal(variacoesInline);
    if (modalVariacoes) modalVariacoes.show();
    return;
  }
  const basePath = window.location.pathname.replace(/\/pdv\.php.*$/i, '/');
  const apiUrl = new URL('api/produto_variacoes_get.php', window.location.origin + basePath);
  apiUrl.searchParams.set('id', id);
  apiUrl.searchParams.set('_', Date.now().toString());
  fetch(apiUrl.toString())
    .then(async r => {
      const text = await r.text();
      try {
        const res = JSON.parse(text);
        if (res && res.ok === false && res.msg) {
          mostrarToast(res.msg, 'warn');
          if (variacaoCount) variacaoCount.textContent = `DEBUG: Produto ${id} · ${res.msg}`;
        }
        const lista = Array.isArray(res)
          ? res
          : (res && Array.isArray(res.variacoes) ? res.variacoes : []);
        renderVariacoesModal(lista);
      } catch (e) {
        mostrarToast('Erro ao carregar variacoes.', 'warn');
        if (variacaoCount) variacaoCount.textContent = `Produto ${id} · resposta invalida`;
        if (variacaoLista) {
          variacaoLista.innerHTML = '<div class="pdv-variacao-row"><span>Erro ao carregar variacoes.</span></div>';
        }
      }
    })
    .catch(() => {
      mostrarToast('Erro ao carregar variacoes.', 'warn');
      if (variacaoCount) variacaoCount.textContent = `DEBUG: Produto ${id} · erro ao buscar`;
      renderVariacoesModal([]);
    });
  if (variacaoQtd) variacaoQtd.textContent = '1';
  if (modalVariacoes) modalVariacoes.show();
}

let modalComboPdv = null;
let comboAtual = null;

function abrirModalCombo(card){
  const id = card.dataset.id;
  if (!id) return;
  const nomeEl = document.getElementById('comboProdutoNome');
  const imgEl = document.getElementById('comboProdutoImagem');
  const listaEl = document.getElementById('comboPassosLista');
  const obsEl = document.getElementById('comboObs');
  if (nomeEl) nomeEl.textContent = card.dataset.nome || 'Combo';
  if (imgEl) {
    const img = card.querySelector('.pdv-product-thumb img');
    if (img) {
      imgEl.src = img.getAttribute('src');
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
    }
  }
  if (obsEl) obsEl.value = '';
  if (listaEl) listaEl.innerHTML = '<div class="pdv-combo-loading"><i class="bi bi-hourglass-split"></i> Carregando opcoes...</div>';

  if (!modalComboPdv) {
    const modalEl = document.getElementById('modalCombo');
    if (modalEl) modalComboPdv = new bootstrap.Modal(modalEl);
  }

  comboAtual = {
    id: parseInt(id, 10),
    nome: card.dataset.nome || 'Combo',
    preco: parseFloat(card.dataset.preco || 0) || 0,
    passos: []
  };
  validarComboBtnPdv();

  const basePath = window.location.pathname.replace(/\/pdv\.php.*$/i, '/');
  const apiUrl = new URL('api/combo_get.php', window.location.origin + basePath);
  apiUrl.searchParams.set('id', id);
  apiUrl.searchParams.set('_', Date.now().toString());
  fetch(apiUrl.toString())
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok || !Array.isArray(res.passos)) {
        if (listaEl) listaEl.innerHTML = '<div class="pdv-combo-loading">Nao foi possivel carregar este combo.</div>';
        return;
      }
      comboAtual.passos = res.passos.map(p => ({ ...p, opcoes: (p.opcoes || []).map(o => ({ ...o, qty: 0 })) }));
      renderComboPassosPdv();
    })
    .catch(() => {
      if (listaEl) listaEl.innerHTML = '<div class="pdv-combo-loading">Erro ao carregar combo.</div>';
    });

  if (modalComboPdv) modalComboPdv.show();
}

function renderComboPassosPdv(){
  const listaEl = document.getElementById('comboPassosLista');
  if (!listaEl || !comboAtual) return;
  listaEl.innerHTML = comboAtual.passos.map((passo, pi) => {
    const min = parseInt(passo.min_itens || 0, 10);
    const max = parseInt(passo.max_itens || 0, 10);
    const rep = passo.permite_repetir == 1;
    const totalSel = passo.opcoes.reduce((s, o) => s + o.qty, 0);
    let sub = '';
    if (min > 0 && max > 0 && min === max) sub = `Escolha exatamente ${min} ${min === 1 ? 'opcao' : 'opcoes'}`;
    else if (min > 0 && max > 0) sub = `Escolha entre ${min} e ${max} opcoes`;
    else if (min > 0) sub = `Escolha ao menos ${min} ${min === 1 ? 'opcao' : 'opcoes'}`;
    else if (max > 0) sub = `Escolha ate ${max} ${max === 1 ? 'opcao' : 'opcoes'}`;
    if (!rep) sub += (sub ? '. Opcoes nao podem ser repetidas' : 'Opcoes nao podem ser repetidas');
    const obrig = passo.obrigatorio == 1;
    const badge = obrig ? '<span class="pdv-combo-badge-obrig">Obrigatorio</span>' : '';
    const opcs = passo.opcoes.map((opc, oi) => {
      const esgotado = !!opc.esgotado;
      const podeAdd = !esgotado && (max === 0 || totalSel < max) && (rep || opc.qty === 0);
      const podeSub = opc.qty > 0;
      const imgHtml = opc.imagem
        ? `<img class="pdv-combo-opcao-img" src="${escapeHtml(opc.imagem)}" alt="">`
        : `<div class="pdv-combo-opcao-img-ph"><i class="bi bi-image"></i></div>`;
      return `<div class="pdv-combo-opcao-row${esgotado ? ' esgotado' : ''}">
        <div class="pdv-combo-opcao-info">
          <div class="pdv-combo-opcao-nome">${escapeHtml(opc.nome)}</div>
          <div class="pdv-combo-opcao-inc">${esgotado ? '<span class="pdv-combo-badge-esgotado">Esgotado</span>' : 'Incluido no valor do combo.'}</div>
        </div>
        ${imgHtml}
        <div class="pdv-combo-opcao-qty">
          <button type="button" class="pdv-combo-qty-btn" onclick="comboQtyPdv(${pi},${oi},-1)" ${podeSub ? '' : 'disabled'}><i class="bi bi-dash"></i></button>
          <span>${opc.qty}</span>
          <button type="button" class="pdv-combo-qty-btn" onclick="comboQtyPdv(${pi},${oi},1)" ${podeAdd ? '' : 'disabled'}><i class="bi bi-plus"></i></button>
        </div>
      </div>`;
    }).join('');
    return `<div class="pdv-combo-passo">
      <div class="pdv-combo-passo-header">
        <div class="pdv-combo-passo-titulo">${escapeHtml(passo.nome)}${badge}</div>
        ${sub ? `<div class="pdv-combo-passo-sub">${sub}</div>` : ''}
      </div>
      ${opcs}
    </div>`;
  }).join('');
  validarComboBtnPdv();
}

function comboQtyPdv(pi, oi, delta){
  if (!comboAtual || !comboAtual.passos) return;
  const passo = comboAtual.passos[pi];
  const opc = passo.opcoes[oi];
  const max = parseInt(passo.max_itens || 0, 10);
  const rep = passo.permite_repetir == 1;
  const totalSel = passo.opcoes.reduce((s, o) => s + o.qty, 0);
  if (delta > 0) {
    if (opc.esgotado) return;
    if (max > 0 && totalSel >= max) return;
    if (!rep && opc.qty > 0) return;
    opc.qty++;
  } else {
    if (opc.qty <= 0) return;
    opc.qty--;
  }
  renderComboPassosPdv();
}

function validarComboBtnPdv(){
  const addBtn = document.getElementById('comboAddBtn');
  if (!addBtn || !comboAtual) return;
  const valido = comboAtual.passos.every(p => {
    if (p.obrigatorio != 1) return true;
    const min = Math.max(1, parseInt(p.min_itens || 1, 10));
    return p.opcoes.reduce((s, o) => s + o.qty, 0) >= min;
  });
  addBtn.disabled = !valido;
  addBtn.textContent = `Adicionar ${formatarDinheiro(comboAtual.preco)}`;
}

function confirmarAdicionarCombo(){
  if (!comboAtual) return;
  for (const passo of comboAtual.passos) {
    if (passo.obrigatorio != 1) continue;
    const min = Math.max(1, parseInt(passo.min_itens || 1, 10));
    const totalSel = passo.opcoes.reduce((s, o) => s + o.qty, 0);
    if (totalSel < min) {
      mostrarToast(`Selecione ao menos ${min} opcao em "${passo.nome}"`, 'warn');
      return;
    }
  }
  const obsEl = document.getElementById('comboObs');
  const userObs = obsEl ? obsEl.value.trim() : '';
  const combosels = comboAtual.passos
    .flatMap(p => p.opcoes.filter(o => o.qty > 0).map(o => ({ id: parseInt(o.id, 10), nome: o.nome, qtd: o.qty })));
  const comboLines = combosels.map(s => s.nome + (s.qtd > 1 ? ' x' + s.qtd : '')).join('\n');
  const obs = combosels.length ? ('[combo]\n' + comboLines + (userObs ? '\n' + userObs : '')) : userObs;
  const rowKey = `combo-${comboAtual.id}-${Date.now()}`;
  inserirItemNoCarrinho(comboAtual.nome, 1, comboAtual.preco, obs, String(comboAtual.id), rowKey, 0, combosels.length ? combosels : null);
  if (modalComboPdv) modalComboPdv.hide();
  mostrarToast(`${comboAtual.nome} adicionado ao pedido.`);
}


function renderVariacoesModal(lista){
  if (!variacaoLista) variacaoLista = document.getElementById('variacaoLista');
  if (!variacaoCount) variacaoCount = document.getElementById('variacaoCount');
  if (!variacaoLista) return;
  variacaoSelecionada = null;
  if (!Array.isArray(lista)) {
    variacaoLista.innerHTML = `<pre style="white-space:pre-wrap;padding:12px;margin:0;">${JSON.stringify(lista)}</pre>`;
    if (variacaoCount) variacaoCount.textContent = 'DEBUG: lista nao e array';
    return;
  }
  if (variacaoCount) {
    variacaoCount.textContent = `DEBUG: Variacoes encontradas: ${lista.length}`;
  }
  if (!lista.length) {
    const idInfo = variacaoProdutoId ? ` (ID ${variacaoProdutoId})` : '';
    variacaoLista.innerHTML = `
      <div class="pdv-variacao-row">
        <span>Sem variacoes cadastradas para este produto${idInfo}.</span>
      </div>
    `;
    if (variacaoAddBtn) {
      variacaoAddBtn.textContent = 'Adicionar R$ 0,00';
      variacaoAddBtn.disabled = true;
    }
    return;
  }
  let html = '';
  lista.forEach((v, idx) => {
    const nome = [v.tamanho, v.cor].filter(Boolean).join(' - ') || `Opcao ${idx + 1}`;
    const preco = parseFloat(v.preco || 0);
    html += `
      <div class="pdv-variacao-row" data-nome="${nome}" data-preco="${preco}" data-id="${v.id}">
        <label>
          <div>
            ${nome}
            <small>R$ ${preco.toFixed(2)}</small>
          </div>
          <input type="radio" name="variacaoEscolhida">
        </label>
      </div>
    `;
  });
  variacaoLista.innerHTML = html;
  filtrarVariacoes();
  if (variacaoAddBtn) {
    variacaoAddBtn.textContent = 'Selecionar variacao';
    variacaoAddBtn.disabled = true;
  }
}

function atualizarVariacaoTotal(){
  if (!variacaoSelecionada || !variacaoAddBtn || !variacaoQtd) return;
  const qtd = parseInt(variacaoQtd.textContent, 10) || 1;
  const extraValor = extrasSelecionados.reduce((s, e) => s + e.preco, 0);
  const complementoValor = complementoItemSelecionado ? complementoItemSelecionado.preco : 0;
  const total = (variacaoSelecionada.preco + extraValor + complementoValor) * qtd;
  variacaoAddBtn.textContent = `Adicionar ${formatarDinheiro(total)}`;
  variacaoAddBtn.disabled = false;
}

function filtrarVariacoes(){
  if (!variacaoLista || !variacaoBusca) return;
  const termo = (variacaoBusca.value || '').toLowerCase().trim();
  variacaoLista.querySelectorAll('.pdv-variacao-row').forEach(row => {
    const nome = (row.dataset.nome || '').toLowerCase();
    row.style.display = !termo || nome.includes(termo) ? '' : 'none';
  });
}

function esconderExtrasModal(){
  if (extraSection) extraSection.classList.add('d-none');
  extrasSelecionados = [];
  extrasObrigatorio = false;
  if (modalVariacoes) {
    const modalEl = document.getElementById('modalVariacoes');
    if (modalEl) modalEl.classList.remove('has-extras');
  }
}

function renderExtrasModal(lista){
  if (!extraSection) return;
  if (!extraLista) extraLista = document.getElementById('extraLista');
  extrasSelecionados = [];
  if (!Array.isArray(lista) || !lista.length || !extraLista) {
    extraSection.classList.add('d-none');
    const modalEl = document.getElementById('modalVariacoes');
    if (modalEl) modalEl.classList.remove('has-extras');
    return;
  }
  extraSection.classList.remove('d-none');
  const modalEl = document.getElementById('modalVariacoes');
  if (modalEl) modalEl.classList.add('has-extras');
  if (extraObrigatorioEl) {
    extraObrigatorioEl.style.display = extrasObrigatorio ? '' : 'none';
  }
  let html = '';
  lista.forEach((ext) => {
    const nome = ext.nome || 'Extra';
    const preco = parseFloat(ext.preco || 0);
    html += `
      <div class="pdv-extra-row" data-nome="${nome}" data-preco="${preco}">
        <div>
          ${nome}
          <small>R$ ${preco.toFixed(2)}</small>
        </div>
        <button type="button" class="pdv-extra-btn">+</button>
      </div>
    `;
  });
  extraLista.innerHTML = html;
}

function esconderComplementoItensModal(){
  if (complementoItensSection) complementoItensSection.classList.add('d-none');
  complementoItemSelecionado = null;
  complementosItensObrigatorio = false;
}

function renderComplementoItensModal(lista){
  if (!complementoItensSection) return;
  if (!complementoItensLista) complementoItensLista = document.getElementById('complementoItensLista');
  complementoItemSelecionado = null;
  if (!Array.isArray(lista) || !lista.length || !complementoItensLista) {
    complementoItensSection.classList.add('d-none');
    return;
  }
  complementoItensSection.classList.remove('d-none');
  if (complementoItensObrigatorioEl) {
    complementoItensObrigatorioEl.style.display = complementosItensObrigatorio ? '' : 'none';
  }
  let html = '';
  lista.forEach((item) => {
    const nome = item.nome || 'Complemento';
    const preco = parseFloat(item.preco || 0);
    html += `
      <div class="pdv-extra-row" data-nome="${nome}" data-preco="${preco}">
        <div>
          ${nome}
          <small>R$ ${preco.toFixed(2)}</small>
        </div>
        <button type="button" class="pdv-extra-btn">+</button>
      </div>
    `;
  });
  complementoItensLista.innerHTML = html;
}

function filtrarProdutos(){
  const termo = (produtoBusca.value || '').toLowerCase().trim();
  const somentePromo = pdvFiltroPromo ? pdvFiltroPromo.checked : false;

  produtoCards.forEach(card => {
    const nome = (card.dataset.nome || '').toLowerCase();
    const categoria = card.dataset.categoria || 'sem';
    const matchTermo = !termo || nome.includes(termo);
    const matchCategoria =
      categoriaAtiva === 'all' ||
      (categoriaAtiva === 'sem' ? categoria === 'sem' : categoria === categoriaAtiva);
    const matchPromo = !somentePromo || card.classList.contains('promo');

    const visivel = matchTermo && matchCategoria && matchPromo;
    card.classList.toggle('d-none', !visivel);
    if (!visivel && card.classList.contains('active')) {
      card.classList.remove('active');
    }
  });

  const ativoVisivel = document.querySelector('.pdv-product-card.active:not(.d-none)');
  if (produtoSelecionadoNome) {
    produtoSelecionadoNome.textContent = ativoVisivel ? ativoVisivel.dataset.nome : 'Nenhum';
  }
  atualizarLayoutAreaProdutos();
  atualizarQtdCards();
}

function atualizarLayoutAreaProdutos(){
  const area = document.querySelector('.pdv-products-area');
  if (!area) return;
  const visiveis = Array.from(document.querySelectorAll('.pdv-product-card')).filter(card => {
    if (card.classList.contains('d-none')) return false;
    if (card.hidden) return false;
    if (card.style.display === 'none') return false;
    return true;
  }).length;
  area.classList.toggle('is-capped', visiveis > 8);
}

function aplicarModoVisualizacaoProdutos(modeKey){
  if (!pdvProductsGrid) return;
  const modo = PDV_VIEW_MODES.find(item => item.key === modeKey) || PDV_VIEW_MODES[0];
  PDV_VIEW_MODES.forEach(item => pdvProductsGrid.classList.remove(item.cls));
  pdvProductsGrid.classList.add(modo.cls);
  if (pdvViewToggleIcon) {
    pdvViewToggleIcon.className = `bi ${modo.icon}`;
  }
  if (pdvViewToggleBtn) {
    pdvViewToggleBtn.title = modo.title;
    pdvViewToggleBtn.setAttribute('aria-label', modo.title);
    pdvViewToggleBtn.classList.toggle('is-active', modo.key !== 'grid');
    pdvViewToggleBtn.dataset.mode = modo.key;
  }
  try {
    localStorage.setItem(PDV_VIEW_KEY, modo.key);
  } catch (_) {}
}

function alternarModoVisualizacaoProdutos(){
  const atual = pdvViewToggleBtn?.dataset.mode || 'grid';
  const indiceAtual = Math.max(0, PDV_VIEW_MODES.findIndex(item => item.key === atual));
  const proximo = PDV_VIEW_MODES[(indiceAtual + 1) % PDV_VIEW_MODES.length];
  aplicarModoVisualizacaoProdutos(proximo.key);
}

function selecionarProdutoCard(card, autoAdicionar = false){
  if (!card) return;
  if (card.classList.contains('is-out')) {
    mostrarToast('Produto sem estoque.', 'warn');
    return;
  }
  if (card.dataset.combo === '1') {
    abrirModalCombo(card);
    return;
  }
  if (card.dataset.variacoes === '1') {
    if (pdvModoModal) {
      abrirModalVariacoes(card, false);
    } else {
      mostrarToast('Produto possui variacoes. Use pelo gestor de pedidos.', 'warn');
    }
    return;
  }
  produtoCards.forEach(c => c.classList.remove('active'));
  card.classList.add('active');
  if (produtoSelecionadoNome) {
    produtoSelecionadoNome.textContent = card.dataset.nome;
  }
  atualizarQtdCards();
  if (autoAdicionar) {
    adicionarProduto();
  }
}

function atualizarQtdCards(){
  produtoCards.forEach(card => {
    const el = card.querySelector('.pdv-qty-value');
    if (!el) return;
    const qtd = obterQuantidadeCarrinho(card.dataset.id || '');
    if ('value' in el) {
      el.value = String(qtd || 0);
    } else {
      el.textContent = String(qtd || 0);
    }
  });
}

function definirQuantidadeProdutoCard(card, qtdDesejada){
  if (!card) return;
  const id = card.dataset.id || '';
  if (!id) return;

  if (card.dataset.variacoes === '1') {
    atualizarQtdCards();
    mostrarToast('Para produtos com variação, use o botão + para escolher a opção.', 'warn');
    return;
  }

  const atual = obterQuantidadeCarrinho(id);
  let novaQtd = parseInt(qtdDesejada, 10);
  if (!Number.isFinite(novaQtd) || Number.isNaN(novaQtd)) novaQtd = 0;
  novaQtd = Math.max(0, novaQtd);

  if (novaQtd === atual) {
    atualizarQtdCards();
    return;
  }

  if (novaQtd > atual) {
    adicionarProdutoCard(card, novaQtd - atual);
  } else {
    removerProdutoCard(card, atual - novaQtd);
  }
}

let modalEditarItem = null;
let modalDetalhesItem = null;
let linhaEditando = null;
let editItemNome = null;
let editItemPreco = null;
let editItemQtd = null;
let editItemObs = null;
let editItemSalvar = null;
let editItemPlus = null;
let editItemMinus = null;
let editItemProdutoId = null;
let editItemDetalhesBtn = null;
let detItemNome = null;
let detItemObs = null;
let detItemSalvar = null;
let variacaoModoResgate = false;

function abrirModalEditarItem(produtoKey){
  const row = document.querySelector(`#listaProdutos .pdv-cart-row[data-produto-id="${produtoKey}"]`);
  if (!row) return;
  linhaEditando = row;
  const nomeInput = row.querySelector('[name="produto_nome[]"]');
  const qtdInput = row.querySelector('[name="qtd[]"]');
  const precoInput = row.querySelector('[name="preco[]"]');
  const obsInput = row.querySelector('[name="observacoes[]"]');
  const idInput = row.querySelector('[name="produto_id[]"]');
  const nome = nomeInput ? nomeInput.value : 'Produto';
  const qtd = qtdInput ? parseInt(qtdInput.value, 10) || 1 : 1;
  const preco = precoInput ? parseFloat(precoInput.value) || 0 : 0;
  const produtoId = idInput ? idInput.value : '';

  if (editItemNome) editItemNome.textContent = nome;
  if (editItemPreco) editItemPreco.textContent = formatarDinheiro(preco);
  if (editItemQtd) editItemQtd.textContent = String(qtd);
  if (editItemObs) editItemObs.value = obsInput ? obsInput.value : '';
  if (editItemProdutoId) editItemProdutoId.value = produtoId;
  if (editItemSalvar) {
    editItemSalvar.textContent = `Editar ${formatarDinheiro(preco * qtd)}`;
  }

  /* popular imagem e estoque do produto */
  const editImg = document.getElementById('editItemImg');
  const editImgIcon = document.getElementById('editItemImgIcon');
  const editEstoque = document.getElementById('editItemEstoque');
  const card = produtoId ? document.querySelector(`.pdv-product-card[data-id="${produtoId}"]`) : null;
  const imgSrc = card ? (card.querySelector('.pdv-product-thumb img')?.src || '') : '';

  if (editEstoque && card) {
    const estoque = parseInt(card.dataset.estoque || '0', 10);
    const noCarrinho = obterQuantidadeCarrinho(produtoId) - qtd;
    const disponivel = Math.max(0, estoque - noCarrinho);
    if (estoque <= 0) {
      editEstoque.textContent = 'Sem estoque';
      editEstoque.className = 'pdv-edit-estoque sem-estoque';
    } else {
      editEstoque.textContent = `${disponivel} em estoque`;
      editEstoque.className = 'pdv-edit-estoque';
    }
  } else if (editEstoque) {
    editEstoque.textContent = '';
  }
  if (editImg && editImgIcon) {
    if (imgSrc) {
      editImg.src = imgSrc;
      editImg.style.display = 'block';
      editImgIcon.style.display = 'none';
    } else {
      editImg.style.display = 'none';
      editImgIcon.style.display = '';
    }
  }

  if (!modalEditarItem) {
    const modalEl = document.getElementById('modalEditarItem');
    if (modalEl) modalEditarItem = new bootstrap.Modal(modalEl);
  }
  if (modalEditarItem) modalEditarItem.show();
}

function ajustarQtdModal(delta){
  if (!linhaEditando) return;
  const produtoId = editItemProdutoId ? editItemProdutoId.value : '';
  const card = produtoId ? document.querySelector(`.pdv-product-card[data-id="${produtoId}"]`) : null;
  const qtdAtual = editItemQtd ? parseInt(editItemQtd.textContent, 10) || 1 : 1;
  let novo = qtdAtual + delta;
  if (novo < 1) novo = 1;

  if (card && delta > 0) {
    const totalCarrinho = obterQuantidadeCarrinho(produtoId);
    const max = Math.max(0, (parseInt(card.dataset.estoque || 0, 10) || 0) - (totalCarrinho - qtdAtual));
    if (novo > max) {
      mostrarToast(`Estoque insuficiente. Disponivel: ${max}.`, 'warn');
      return;
    }
  }
  const usarPontosInput = linhaEditando.querySelector('[name="usar_pontos[]"]');
  if (usarPontosInput && usarPontosInput.value === '1') {
    if (!validarResgateLinha(linhaEditando, novo)) {
      return;
    }
  }

  if (editItemQtd) editItemQtd.textContent = String(novo);
  const precoInput = linhaEditando.querySelector('[name="preco[]"]');
  const preco = precoInput ? parseFloat(precoInput.value) || 0 : 0;
  if (editItemSalvar) {
    editItemSalvar.textContent = `Editar ${formatarDinheiro(preco * novo)}`;
  }

  /* atualizar estoque em tempo real */
  const editEstoque = document.getElementById('editItemEstoque');
  if (editEstoque && card) {
    const estoque = parseInt(card.dataset.estoque || '0', 10);
    const qtdOriginal = parseInt(linhaEditando.querySelector('[name="qtd[]"]')?.value || '1', 10);
    const outrosNoCarrinho = Math.max(0, obterQuantidadeCarrinho(produtoId) - qtdOriginal);
    const disponivel = Math.max(0, estoque - outrosNoCarrinho - novo);
    if (estoque <= 0) {
      editEstoque.textContent = 'Sem estoque';
      editEstoque.className = 'pdv-edit-estoque sem-estoque';
    } else {
      editEstoque.textContent = `${disponivel} em estoque`;
      editEstoque.className = 'pdv-edit-estoque';
    }
  }
}

function salvarEdicaoItem(){
  if (!linhaEditando) return;
  const qtdInput = linhaEditando.querySelector('[name="qtd[]"]');
  const obsInput = linhaEditando.querySelector('[name="observacoes[]"]');
  const usarPontosInput = linhaEditando.querySelector('[name="usar_pontos[]"]');
  const novoQtd = editItemQtd ? parseInt(editItemQtd.textContent, 10) || 1 : 1;
  const qtdAtual = qtdInput ? parseInt(qtdInput.value, 10) || 1 : 1;
  if (usarPontosInput && usarPontosInput.value === '1') {
    if (!validarResgateLinha(linhaEditando, novoQtd)) {
      if (editItemQtd) editItemQtd.textContent = String(qtdAtual);
      return;
    }
  }
  if (qtdInput) qtdInput.value = novoQtd;
  if (obsInput && editItemObs) obsInput.value = editItemObs.value;
  atualizarTotal();
  atualizarEstoqueCarrinho();
  atualizarQtdCards();
  if (modalEditarItem) modalEditarItem.hide();
}

function editarItemResumo(produtoKey){
  abrirModalEditarItem(produtoKey);
}

function abrirModalDetalhesItem(){
  if (!linhaEditando) return;
  const nome = editItemNome ? editItemNome.textContent : 'Produto';
  if (detItemNome) detItemNome.textContent = nome;
  if (detItemObs) {
    detItemObs.value = editItemObs ? editItemObs.value : '';
  }
  if (!modalDetalhesItem) {
    const modalEl = document.getElementById('modalDetalhesItem');
    if (modalEl) modalDetalhesItem = new bootstrap.Modal(modalEl);
  }
  if (modalDetalhesItem) modalDetalhesItem.show();
}

function salvarDetalhesItem(){
  if (!linhaEditando) return;
  if (editItemObs && detItemObs) {
    editItemObs.value = detItemObs.value;
  }
  const obsInput = linhaEditando.querySelector('[name="observacoes[]"]');
  if (obsInput && detItemObs) obsInput.value = detItemObs.value;
  if (modalDetalhesItem) modalDetalhesItem.hide();
}

function removerItemResumo(produtoKey){
  const row = document.querySelector(`#listaProdutos .pdv-cart-row[data-produto-id="${produtoKey}"]`);
  if (!row) return;
  row.remove();
  atualizarTotal();
  atualizarEstoqueCarrinho();
  atualizarQtdCards();
}

function obterQuantidadeCarrinho(produtoId){
  let total = 0;
  document.querySelectorAll('#listaProdutos .pdv-cart-row').forEach(row => {
    const idInput = row.querySelector('[name="produto_id[]"]');
    const qtdInput = row.querySelector('[name="qtd[]"]');
    const id = idInput ? String(idInput.value) : '';
    const qtd = qtdInput ? parseInt(qtdInput.value, 10) : 0;
    if (id === String(produtoId) && qtd > 0) total += qtd;
  });
  return total;
}

function adicionarProdutoCard(card, qtd = 1){
  if (!card) return;
  if (card.classList.contains('is-out')) {
    mostrarToast('Produto sem estoque.', 'warn');
    return;
  }
  const restante = obterEstoqueRestante(card);
  if (restante <= 0) {
    mostrarToast(`Sem estoque para ${card.dataset.nome || 'produto'}.`, 'warn');
    return;
  }
  if (qtd > restante) {
    mostrarToast(`Estoque insuficiente. Disponivel: ${restante}.`, 'warn');
    return;
  }
  const id = card.dataset.id || '';
  const linha = document.querySelector(`#listaProdutos .pdv-cart-row[data-produto-id="${id}"]`);
  if (linha) {
    const qtdInput = linha.querySelector('[name="qtd[]"]');
    const atual = qtdInput ? parseInt(qtdInput.value, 10) || 0 : 0;
    const usarPontosInput = linha.querySelector('[name="usar_pontos[]"]');
    if (usarPontosInput && usarPontosInput.value === '1') {
      if (!validarResgateLinha(linha, atual + qtd)) {
        return;
      }
    }
    if (qtdInput) qtdInput.value = atual + qtd;
    atualizarTotal();
    atualizarEstoqueCarrinho(true);
    atualizarQtdCards();
    return;
  }
  const pontosCusto = parseInt(card.dataset.pontosCusto || '0', 10) || 0;
  inserirItemNoCarrinho(card.dataset.nome, qtd, parseFloat(card.dataset.preco), '', id, '', pontosCusto);
}

function resgatarProdutoCard(card){
  if (!card) return;
  if (!clubePontosAtivo) {
    mostrarToast('Clube de pontos desabilitado.', 'warn');
    return;
  }
  if (!clienteIdInput || !clienteIdInput.value) {
    mostrarToast('Selecione um cliente para resgatar.', 'warn');
    return;
  }
  const custo = parseInt(card.dataset.pontosCusto || '0', 10) || 0;
  if (custo <= 0) return;

  if (card.dataset.variacoes === '1') {
    abrirModalVariacoes(card, true);
    return;
  }

  const id = card.dataset.id || '';
  let linha = document.querySelector(`#listaProdutos .pdv-cart-row[data-produto-id="${id}"]`);
  if (linha) {
    const qtdInput = linha.querySelector('[name="qtd[]"]');
    const atual = qtdInput ? parseInt(qtdInput.value, 10) || 0 : 0;
    const novo = atual + 1;
    if (!validarResgateLinha(linha, novo)) {
      return;
    }
    if (qtdInput) qtdInput.value = novo;
    aplicarResgateLinha(linha, true);
  } else {
    inserirItemNoCarrinho(card.dataset.nome, 1, parseFloat(card.dataset.preco), '', id, '', custo);
    linha = document.querySelector(`#listaProdutos .pdv-cart-row[data-produto-id="${id}"]`);
    if (!linha || !validarResgateLinha(linha, 1)) {
      if (linha) linha.remove();
      atualizarTotal();
      atualizarQtdCards();
      return;
    }
    aplicarResgateLinha(linha, true);
  }
  atualizarTotal();
  atualizarResumoItens();
  atualizarQtdCards();
  atualizarBotoesResgateCard();
}

function removerProdutoCard(card, qtd = 1){
  if (!card) return;
  const id = card.dataset.id || '';
  const linha = document.querySelector(`#listaProdutos .pdv-cart-row[data-produto-id="${id}"]`);
  if (!linha) {
    atualizarQtdCards();
    return;
  }
  const qtdInput = linha.querySelector('[name="qtd[]"]');
  const atual = qtdInput ? parseInt(qtdInput.value, 10) || 0 : 0;
  const novo = atual - qtd;
  if (novo <= 0) {
    linha.remove();
  } else if (qtdInput) {
    qtdInput.value = novo;
  }
  atualizarTotal();
  atualizarEstoqueCarrinho();
  atualizarQtdCards();
}

function ativarCategoria(categoria){
  categoriaAtiva = categoria;
  categoriaTabs.forEach(t => {
    t.classList.toggle('active', t.dataset.categoria === categoria);
  });
  if (categoriaTituloEl) {
    const tab = Array.from(categoriaTabs).find(t => t.dataset.categoria === categoria);
    const label = tab ? (tab.dataset.label || tab.textContent.replace(/\d+/g, '').trim()) : 'Produtos';
    categoriaTituloEl.textContent = label;
  }
}

function tentarSelecionarProduto(termo, autoAdicionar = false){
  const codigo = (termo || '').trim();
  if (!codigo) return false;
  const lower = codigo.toLowerCase();
  let encontrado = null;

  if (/^\d+$/.test(codigo)) {
    encontrado = Array.from(produtoCards).find(card =>
      card.dataset.id === codigo || card.dataset.codigo === codigo
    );
  }

  if (!encontrado) {
    encontrado = Array.from(produtoCards).find(card =>
      (card.dataset.nome || '').toLowerCase() === lower
    );
  }

  if (!encontrado) {
    const candidatos = Array.from(produtoCards).filter(card =>
      (card.dataset.nome || '').toLowerCase().includes(lower)
    );
    if (candidatos.length === 1) {
      encontrado = candidatos[0];
    }
  }

  if (!encontrado) return false;
  if (encontrado.classList.contains('is-out')) {
    mostrarToast('Produto sem estoque.', 'warn');
    return false;
  }

  const categoria = encontrado.dataset.categoria || 'sem';
  if (categoriaAtiva !== 'all' && categoriaAtiva !== categoria) {
    ativarCategoria(categoria);
  }
  produtoBusca.value = '';
  filtrarProdutos();
  selecionarProdutoCard(encontrado, autoAdicionar);
  return true;
}

produtoCards.forEach(card => {
  card.addEventListener('click', () => {
    if (card.classList.contains('is-out')) {
      mostrarToast('Produto sem estoque.', 'warn');
      return;
    }
    selecionarProdutoCard(card);
  });

  const minusBtn = card.querySelector('.pdv-qty-btn.minus');
  const plusBtn = card.querySelector('.pdv-qty-btn.plus');
  const qtyInput = card.querySelector('.pdv-qty-input');
  if (qtyInput) {
    let qtyDebounceTimer = null;
    if (card.dataset.variacoes === '1') {
      qtyInput.readOnly = true;
      qtyInput.classList.add('is-readonly');
      qtyInput.title = 'Use o botão + para escolher a variação';
    }
    if (card.dataset.combo === '1') {
      qtyInput.readOnly = true;
      qtyInput.classList.add('is-readonly');
      qtyInput.title = 'Use o botão + para montar o combo';
    }
    qtyInput.addEventListener('click', event => {
      event.stopPropagation();
    });
    qtyInput.addEventListener('input', event => {
      event.stopPropagation();
      qtyInput.value = String(qtyInput.value || '').replace(/\D+/g, '').slice(0, 3);
      if (qtyDebounceTimer) clearTimeout(qtyDebounceTimer);
      qtyDebounceTimer = setTimeout(() => {
        definirQuantidadeProdutoCard(card, qtyInput.value || '0');
      }, 120);
    });
    const aplicarQtdDigitada = () => {
      if (qtyDebounceTimer) {
        clearTimeout(qtyDebounceTimer);
        qtyDebounceTimer = null;
      }
      definirQuantidadeProdutoCard(card, qtyInput.value || '0');
    };
    qtyInput.addEventListener('blur', aplicarQtdDigitada);
    qtyInput.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        aplicarQtdDigitada();
        qtyInput.blur();
      }
    });
  }
  if (minusBtn) {
    minusBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      removerProdutoCard(card, 1);
    });
  }
  if (plusBtn) {
    plusBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (card.dataset.combo === '1') {
        abrirModalCombo(card);
        return;
      }
      if (card.dataset.variacoes === '1') {
        abrirModalVariacoes(card, false);
        return;
      }
      adicionarProdutoCard(card, 1);
    });
  }
});

categoriaTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    ativarCategoria(tab.dataset.categoria);
    filtrarProdutos();
  });
});

produtoBusca.addEventListener('input', filtrarProdutos);
if (pdvFiltroPromo) {
  pdvFiltroPromo.addEventListener('change', filtrarProdutos);
}
if (pdvViewToggleBtn) {
  pdvViewToggleBtn.addEventListener('click', alternarModoVisualizacaoProdutos);
  let modoInicial = 'grid';
  try {
    modoInicial = localStorage.getItem(PDV_VIEW_KEY) || 'grid';
  } catch (_) {}
  aplicarModoVisualizacaoProdutos(modoInicial);
}
produtoBusca.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const ok = tentarSelecionarProduto(produtoBusca.value, true);
    if (ok) {
      focarProdutoBusca();
    }
  }
});
filtrarProdutos();
atualizarEstoqueCarrinho();
atualizarQtdCards();

// Atualiza o estoque dos cards sozinho — sem isso, uma venda feita em outra
// aba do PDV ou na loja publica enquanto essa tela fica aberta so aparecia
// depois de um F5 manual.
function atualizarEstoquePdvPoll(){
  fetch('api/estoque_list.php')
    .then(r => r.json())
    .then(lista => {
      if (!Array.isArray(lista)) return;
      lista.forEach(item => {
        const card = document.querySelector(`.pdv-product-card[data-id="${item.id}"]`);
        if (!card || card.dataset.combo === '1') return;
        card.dataset.estoque = String(parseInt(item.quantidade, 10) || 0);
        card.dataset.grupo = String(parseInt(item.grupo_id, 10) || 0);
      });
      reconstruirMapaGrupos();
      atualizarEstoqueCarrinho(true);
    })
    .catch(() => {});
}
setInterval(atualizarEstoquePdvPoll, 10000);

const modalAvulsoEl = document.getElementById('modalAvulso');
const avulsoNome = document.getElementById('avulsoNome');
const avulsoPreco = document.getElementById('avulsoPreco');
const avulsoObs = document.getElementById('avulsoObs');
const avulsoQtd = document.getElementById('avulsoQtd');
const avulsoMinus = document.getElementById('avulsoMinus');
const avulsoPlus = document.getElementById('avulsoPlus');
const avulsoAddBtn = document.getElementById('avulsoAddBtn');
let modalAvulso = null;

function obterAvulsoEls(){
  return {
    modal: document.getElementById('modalAvulso'),
    nome: document.getElementById('avulsoNome'),
    preco: document.getElementById('avulsoPreco'),
    obs: document.getElementById('avulsoObs'),
    qtd: document.getElementById('avulsoQtd'),
    addBtn: document.getElementById('avulsoAddBtn')
  };
}

function atualizarAvulsoTotal(){
  const els = obterAvulsoEls();
  if (!els.addBtn || !els.qtd || !els.preco) return;
  const qtd = parseInt(els.qtd.textContent || '1', 10) || 1;
  const preco = parseFloat(els.preco.value || '0') || 0;
  els.addBtn.textContent = `Adicionar ao pedido ${formatarDinheiro(preco * qtd)}`;
}

function avulsoAlterarQtd(delta){
  const els = obterAvulsoEls();
  if (!els.qtd) return;
  const atual = parseInt(els.qtd.textContent || '1', 10) || 1;
  els.qtd.textContent = Math.max(1, atual + delta);
  atualizarAvulsoTotal();
}

function avulsoAdicionar(){
  const els = obterAvulsoEls();
  let nome = (els.nome ? els.nome.value : '').trim();
  const preco = parseFloat(els.preco ? els.preco.value : '0') || 0;
  const qtd = parseInt(els.qtd ? els.qtd.textContent : '1', 10) || 1;
  const obs = (els.obs ? els.obs.value : '').trim();
  if (!nome) {
    mostrarToast('Informe o nome do produto.', 'warn');
    return;
  }
  if (!/\\s-\\s*avulso$/i.test(nome)) {
    nome = `${nome} - avulso`;
    if (els.nome) els.nome.value = nome;
  }
  if (preco <= 0) {
    mostrarToast('Informe o preco do produto.', 'warn');
    return;
  }
  const rowKey = `avulso-${Date.now()}`;
  inserirItemNoCarrinho(nome, qtd, preco, obs, '', rowKey);
  fecharAvulsoModal();
}

window.avulsoAlterarQtd = avulsoAlterarQtd;
window.avulsoAdicionar = avulsoAdicionar;
window.fecharAvulsoModal = fecharAvulsoModal;

document.addEventListener('show.bs.modal', (event) => {
  const modalEl = event && event.target;
  if (!modalEl || modalEl.id !== 'modalAvulso') return;
  const els = obterAvulsoEls();
  if (els.nome) els.nome.value = '';
  if (els.preco) els.preco.value = '';
  if (els.obs) els.obs.value = '';
  if (els.qtd) els.qtd.textContent = '1';
  atualizarAvulsoTotal();
});

if (avulsoMinus && !avulsoMinus.dataset.inline) {
  avulsoMinus.addEventListener('click', () => avulsoAlterarQtd(-1));
}
if (avulsoPlus && !avulsoPlus.dataset.inline) {
  avulsoPlus.addEventListener('click', () => avulsoAlterarQtd(1));
}
document.addEventListener('input', (event) => {
  if (event.target && event.target.id === 'avulsoPreco') {
    atualizarAvulsoTotal();
  }
});
if (avulsoAddBtn && !avulsoAddBtn.dataset.inline) {
  avulsoAddBtn.addEventListener('click', avulsoAdicionar);
}

function fecharAvulsoModal(){
  const els = obterAvulsoEls();
  if (!els.modal) return;
  try {
    const instance = bootstrap.Modal.getInstance(els.modal) || new bootstrap.Modal(els.modal);
    instance.hide();
    return;
  } catch (e) {}
  els.modal.classList.remove('show');
  els.modal.style.display = 'none';
  els.modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('padding-right');
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
}

function inserirItemNoCarrinho(nome, qtd, preco, obs='', id='', rowKey='', pontosCusto = 0, combosels = null){
  const safeNome = escapeHtml(nome);
  const safeObs = escapeHtml(obs);
  const safeId = escapeHtml(id);
  const safeKey = escapeHtml(rowKey || id);
  const pontos = Number(pontosCusto || 0) || 0;
  const precoBase = Number(preco || 0) || 0;
  const safeCombosels = combosels ? escapeHtml(JSON.stringify(combosels)) : '';
  document.getElementById('listaProdutos').insertAdjacentHTML('beforeend',`
    <div class="pdv-cart-row" data-produto-id="${safeKey}" data-pontos-custo="${pontos}" data-preco-base="${precoBase.toFixed(2)}" data-usa-pontos="0">
      <input type="hidden" name="produto_nome[]" value="${safeNome}">
      <input type="hidden" name="produto_id[]" value="${safeId}">
      <input type="hidden" name="observacoes[]" value="${safeObs}">
      <input type="hidden" name="qtd[]" value="${qtd}">
      <input type="hidden" name="preco[]" value="${preco}">
      <input type="hidden" name="usar_pontos[]" value="0">
      <input type="hidden" name="combosels[]" value="${safeCombosels}">
    </div>
  `);
  atualizarTotal();
  atualizarEstoqueCarrinho(true);
  atualizarQtdCards();
}

function adicionarProduto(){
  const selecionado = document.querySelector('.pdv-product-card.active');
  if(!selecionado) {
    mostrarToast('Selecione um produto', 'warn');
    return;
  }
  if (selecionado.classList.contains('is-out')) {
    mostrarToast('Produto sem estoque.', 'warn');
    return;
  }
  if (selecionado.dataset.variacoes === '1') {
    abrirModalVariacoes(selecionado, false);
    return;
  }

  adicionarProdutoCard(selecionado, 1);
  focarProdutoBusca();
}

function obterPagamentosSplit(){
  const pagamentos = [];
  const valor1 = parseFloat(valorPagamento1.value || 0);
  const valor2 = parseFloat(valorPagamento2.value || 0);

  if (valor1 > 0) {
    pagamentos.push({ forma: formaPagamento1.value, valor: valor1 });
  }
  if (valor2 > 0) {
    pagamentos.push({ forma: formaPagamento2.value, valor: valor2 });
  }
  return pagamentos;
}

function calcularSubtotalAtual(){
  let subtotal = 0;
  const precos = document.querySelectorAll('[name="preco[]"]');

  document.querySelectorAll('[name="qtd[]"]').forEach((q,i)=>{
    subtotal += Number(q.value) * Number(precos[i].value);
  });

  return subtotal;
}

function atualizarTotal(){
  const subtotal = calcularSubtotalAtual();
  if (tipoPedido && tipoPedido.value === 'entrega') {
    aplicarTaxaEntregaAutomatica(subtotal);
  }

  const taxa = parseFloat(taxaEntregaInput.value || 0);
  const descontoInput = parseFloat(descontoValor.value || 0);
  let desconto = 0;
  if (descontoInput > 0) {
    desconto = descontoTipo.value === 'percent'
      ? subtotal * (descontoInput / 100)
      : descontoInput;
  }

  const baseCashbackUso = subtotal + taxa - desconto;
  let cashbackUsado = 0;
  const cashbackMaximoAtual = Math.max(0, Math.min(clienteCashbackSaldo, baseCashbackUso));
  if (cashbackValorSolicitado > cashbackMaximoAtual) {
    cashbackValorSolicitado = cashbackMaximoAtual;
  }
  if (cashbackUsarToggle && cashbackUsarToggle.checked) {
    const desejado = cashbackValorSolicitado > 0 ? cashbackValorSolicitado : cashbackMaximoAtual;
    cashbackUsado = Math.min(cashbackMaximoAtual, desejado);
  }
  if (cashbackUsado < 0) cashbackUsado = 0;

  let base = baseCashbackUso - cashbackUsado;
  if (base < 0) base = 0;

  let taxaMaquininha = 0;
  let pagamentos = [];
  let dinheiroPago = 0;
  let pagamentosTotal = 0;

  if (pagamentoDividido.checked) {
    pagamentos = obterPagamentosSplit();
    pagamentosTotal = pagamentos.reduce((acc,p)=>acc + p.valor,0);
    dinheiroPago = pagamentos
      .filter(p => p.forma === 'dinheiro')
      .reduce((acc,p)=>acc + p.valor,0);
    const cartaoTotal = pagamentos
      .filter(p => ['credito','debito'].includes(p.forma))
      .reduce((acc,p)=>acc + p.valor,0);
    taxaMaquininha = cartaoTotal * (parseFloat(taxaMaquininhaPercent.value || 0) / 100);
  } else {
    const forma = formaPagamento.value;
    if (['credito','debito'].includes(forma)) {
      taxaMaquininha = base * (parseFloat(taxaMaquininhaPercent.value || 0) / 100);
    }
    if (forma === 'dinheiro') {
      const valorAplicado = parseFloat((pagamentoSplitValor1 && pagamentoSplitValor1.value) || 0);
      dinheiroPago = valorAplicado > 0 ? valorAplicado : parseFloat(trocoInput.value || 0);
      pagamentosTotal = dinheiroPago;
    }
  }

  total = base + taxaMaquininha;

  const subtotalEl = document.getElementById('subtotalPedido');
  const taxaEl = document.getElementById('taxaResumo');
  const totalEl = document.getElementById('totalPedido');

  let cashbackValor = 0;
  if (cashbackConfig && cashbackConfig.ativo && cashbackToggle && cashbackToggle.checked) {
    const perc = Number(cashbackConfig.percentual || 0);
    const cashbackBase = Math.max(0, subtotal - desconto);
    cashbackValor = perc > 0 ? cashbackBase * (perc / 100) : 0;
  }

  if (subtotalEl) {
    subtotalEl.innerText = formatarDinheiro(subtotal);
  }
  if (taxaEl) {
    taxaEl.innerText = formatarDinheiro(taxa);
  }
  if (totalEl) {
    totalEl.innerText = formatarDinheiro(total);
  }
  if (cashbackResumo) {
    cashbackResumo.innerText = formatarDinheiro(cashbackValor);
  }
  if (cashbackPreviewCliente) {
    const mostrarPreview = !!(cashbackToggle && cashbackToggle.checked && cashbackValor > 0);
    cashbackPreviewCliente.textContent = mostrarPreview
      ? `O cliente receberá ${formatarDinheiro(cashbackValor)} de cashback`
      : '';
    cashbackPreviewCliente.classList.toggle('d-none', !mostrarPreview);
  }
  if (linhaCashback) {
    linhaCashback.classList.add('d-none');
  }
  if (cashbackAplicado) {
    cashbackAplicado.value = cashbackValor > 0 ? '1' : '0';
  }
  if (cashbackUsadoResumo) {
    cashbackUsadoResumo.innerText = formatarDinheiro(cashbackUsado);
  }
  if (linhaCashbackUsado) {
    linhaCashbackUsado.classList.toggle('d-none', cashbackUsado <= 0.0001);
  }
  if (cashbackUsadoInput) {
    cashbackUsadoInput.value = cashbackUsado > 0 ? cashbackUsado.toFixed(2) : '0';
  }
  if (linhaTaxaResumo) {
    linhaTaxaResumo.classList.toggle('d-none', taxa <= 0.0001);
  }
  if (cashbackResumoActionWrap) {
    const mostrarAcaoCashback = !!(clienteIdInput && clienteIdInput.value && clienteCashbackSaldo > 0);
    cashbackResumoActionWrap.classList.toggle('d-none', !mostrarAcaoCashback);
  }
  if (cashbackResumoAction) {
    cashbackResumoAction.classList.toggle('is-active', cashbackUsado > 0);
  }
  if (cashbackResumoActionValor) {
    cashbackResumoActionValor.textContent = formatarDinheiro(clienteCashbackSaldo);
  }

  const pontosResgatados = calcularPontosResgateAtual();
  if (pontosResgateResumo) {
    pontosResgateResumo.textContent = `${pontosResgatados} pts`;
  }
  if (linhaPontosResgate) {
    linhaPontosResgate.classList.toggle('d-none', pontosResgatados <= 0);
  }

  if (linhaDesconto) {
    linhaDesconto.classList.toggle('d-none', desconto <= 0);
    descontoResumo.innerText = formatarDinheiro(desconto);
  }
  if (linhaTaxaMaquininha) {
    linhaTaxaMaquininha.classList.toggle('d-none', taxaMaquininha <= 0);
    taxaMaquininhaResumo.innerText = formatarDinheiro(taxaMaquininha);
  }

  atualizarResumoItens();
  atualizarBadgeDesconto();
  atualizarOpcaoResgatePagamento();

  const mostrarDinheiro = pagamentoDividido.checked
    ? dinheiroPago > 0
    : (formaPagamento.value === 'dinheiro' && dinheiroPago > 0);
  linhaValorPago.classList.toggle('d-none', !mostrarDinheiro);
  linhaTroco.classList.toggle('d-none', !mostrarDinheiro);

  if (mostrarDinheiro) {
    const dinheiroRecebidoAtual = dinheiroRecebido > 0 ? dinheiroRecebido : dinheiroPago;
    if (pagamentoDividido.checked) {
      const restante = Math.max(0, total - (pagamentosTotal - dinheiroPago));
      const diferenca = dinheiroRecebidoAtual - restante;
      valorPagoResumo.innerText = formatarDinheiro(dinheiroRecebidoAtual);
      if (diferenca < 0) {
        trocoLabel.textContent = 'Falta';
        trocoTexto.textContent = 'Falta: ' + formatarDinheiro(Math.abs(diferenca));
        trocoResumo.innerText = formatarDinheiro(Math.abs(diferenca));
      } else {
        trocoLabel.textContent = 'Troco';
        trocoTexto.textContent = 'Troco: ' + formatarDinheiro(diferenca);
        trocoResumo.innerText = formatarDinheiro(diferenca);
      }
    } else {
      valorPagoResumo.innerText = formatarDinheiro(dinheiroRecebidoAtual);
      const diferenca = dinheiroRecebidoAtual - total;
      if (diferenca < 0) {
        trocoLabel.textContent = 'Falta';
        trocoTexto.textContent = 'Falta: ' + formatarDinheiro(Math.abs(diferenca));
        trocoResumo.innerText = formatarDinheiro(Math.abs(diferenca));
      } else {
        trocoLabel.textContent = 'Troco';
        trocoTexto.textContent = 'Troco: ' + formatarDinheiro(diferenca);
        trocoResumo.innerText = formatarDinheiro(diferenca);
      }
    }
  }

  atualizarResumoVisibilidade();
}

function coletarItens(){
  const itens = [];
  const nomes = document.querySelectorAll('[name="produto_nome[]"]');
  const ids = document.querySelectorAll('[name="produto_id[]"]');
  const qtds = document.querySelectorAll('[name="qtd[]"]');
  const precos = document.querySelectorAll('[name="preco[]"]');
  const observacoes = document.querySelectorAll('[name="observacoes[]"]');
  const usarPontos = document.querySelectorAll('[name="usar_pontos[]"]');
  const combosels = document.querySelectorAll('[name="combosels[]"]');

  nomes.forEach((n, i) => {
    const qtd = parseInt(qtds[i].value, 10);
    const preco = parseFloat(precos[i].value);
    if (!n.value || !qtd || Number.isNaN(preco)) return;
    const obs = observacoes[i] ? observacoes[i].value.trim() : '';
    const id = ids[i] ? parseInt(ids[i].value, 10) : 0;
    const usar = usarPontos[i] && usarPontos[i].value === '1' ? 1 : 0;
    const item = { id: Number.isNaN(id) ? 0 : id, nome: n.value, qtd, preco, observacoes: obs, usar_pontos: usar };
    if (combosels[i] && combosels[i].value) {
      try {
        const sels = JSON.parse(combosels[i].value);
        if (Array.isArray(sels) && sels.length) item.combosels = sels;
      } catch (e) {}
    }
    itens.push(item);
  });

  return itens;
}

function atualizarResumoPagamentoModal(){
  const totalAtual = total || 0;
  if (pagamentoTotalTexto) pagamentoTotalTexto.textContent = formatarDinheiro(totalAtual);
  /* calcula restante = total - soma dos pagamentos registrados */
  const v1 = parseFloat((pagamentoSplitValor1 && pagamentoSplitValor1.value) || 0);
  const v2 = parseFloat((pagamentoSplitValor2 && pagamentoSplitValor2.value) || 0);
  const pago = v1 + v2;
  const restante = Math.max(0, totalAtual - pago);
  if (pagamentoRestanteTexto) pagamentoRestanteTexto.textContent = formatarDinheiro(restante);
  /* só atualiza o input se não houver pagamentos registrados */
  if (pagamentosSelecionados.length === 0 && pagamentoValorTotal) {
    pagamentoValorTotal.value = formatarDinheiro(totalAtual);
  }
}

function nomeFormaPagamento(forma){
  const mapa = {
    pix: 'Transferencia Pix',
    dinheiro: 'Dinheiro',
    credito: 'Credito',
    debito: 'Debito',
    voucher: 'Voucher',
    resgate: 'Resgate',
    fiado: 'Fiado',
    outro: 'Outro'
  };
  return mapa[forma] || forma || '-';
}

function atualizarListaPagamentosRegistrados(){
  if (!pagamentoRegistrados || !pagamentoRegistradosLista) return;
  if (pagamentosSelecionados.length === 0) {
    pagamentoRegistrados.classList.add('d-none');
    pagamentoRegistradosLista.innerHTML = '';
    return;
  }
  const valor1 = parseFloat((pagamentoSplitValor1 && pagamentoSplitValor1.value) || 0);
  const valor2 = parseFloat((pagamentoSplitValor2 && pagamentoSplitValor2.value) || 0);
  pagamentoRegistradosLista.innerHTML = pagamentosSelecionados.map((forma, idx) => {
      const valor = idx === 0 ? valor1 : valor2;
      return `
        <div class="pdv-payment-registered-item" data-pay="${forma}">
          <span class="pdv-payment-registered-pill">${nomeFormaPagamento(forma)}</span>
          <span class="pdv-payment-registered-value">${formatarDinheiro(valor)}</span>
          <button type="button" class="pdv-payment-registered-remove" data-remove="${idx}">
            <i class="bi bi-x"></i>
          </button>
        </div>
      `;
    }).join('');
  pagamentoRegistrados.classList.remove('d-none');
}

function atualizarBotaoPagamentoFinalizar(){
  if (!btnPagamentoFinalizar) return;
  const ativo = pagamentosSelecionados.length > 0;
  btnPagamentoFinalizar.disabled = !ativo;
}

function podeUsarResgatePagamento(){
  if (!clubePontosAtivo) return false;
  const pontosResgatados = calcularPontosResgateAtual();
  if (pontosResgatados <= 0) return false;
  if (!clienteIdInput || !clienteIdInput.value) return false;
  if (total > 0.009) return false;
  return obterPontosDisponiveis() >= pontosResgatados;
}

function atualizarOpcaoResgatePagamento(){
  if (!pagamentoOpcoes) return;
  const btn = pagamentoOpcoes.querySelector('[data-pay="resgate"]');
  if (!btn) return;
  const ok = podeUsarResgatePagamento();
  btn.classList.toggle('disabled', !ok);
  btn.setAttribute('aria-disabled', ok ? 'false' : 'true');
  if (!ok && pagamentosSelecionados.includes('resgate')) {
    pagamentosSelecionados = pagamentosSelecionados.filter(p => p !== 'resgate');
    atualizarPagamentoSelecionado();
  }
}

function atualizarBadgeDesconto(){
  if (!descontoBadge || !descontoTipo || !descontoValor) return;
  const valor = parseFloat(descontoValor.value || 0);
  if (!valor || valor <= 0) {
    descontoBadge.textContent = 'Sem desconto';
    return;
  }
  descontoBadge.textContent = descontoTipo.value === 'percent'
    ? `${valor.toFixed(2)}%`
    : formatarDinheiro(valor);
}

function definirTipoDescontoModal(tipo){
  descontoTipoSelecionado = tipo === 'percent' ? 'percent' : 'valor';
  if (!descontoToggle) return;
  descontoToggle.querySelectorAll('.pdv-discount-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === descontoTipoSelecionado);
  });
  if (descontoValorModal) {
    descontoValorModal.placeholder = descontoTipoSelecionado === 'percent'
      ? 'ex: 10%'
      : 'ex: R$ 10,00';
  }
}

function atualizarPreviewDescontoModal(){
  if (!descontoPreview || !descontoValorModal) return;
  const subtotal = calcularSubtotalAtual();
  let valor = parseFloat(descontoValorModal.value || 0);
  if (Number.isNaN(valor) || valor < 0) valor = 0;
  if (descontoTipoSelecionado === 'percent') {
    if (valor > 100) valor = 100;
    descontoPreview.textContent = formatarDinheiro(subtotal * (valor / 100));
  } else {
    descontoPreview.textContent = formatarDinheiro(valor);
  }
}

function atualizarCupomMsg(msg, ok){
  if (!cupomMsg) return;
  cupomMsg.textContent = msg;
  cupomMsg.classList.toggle('is-error', !ok);
}

function limparCupom(msg){
  if (cupomCodigo) cupomCodigo.value = '';
  if (cupomInput) cupomInput.value = '';
  if (cupomResumoSelect) cupomResumoSelect.value = '';
  if (cupomFreteAtivo) {
    if (taxaEntregaInput) {
      const valor = taxaEntregaOriginal !== null ? taxaEntregaOriginal : '0.00';
      taxaEntregaInput.value = valor;
      if (taxaEntregaOriginal === null) {
        atualizarTaxaPorBairro();
      }
    }
    cupomFreteAtivo = false;
    taxaEntregaOriginal = null;
    if (typeof atualizarEntregaResumo === 'function') {
      atualizarEntregaResumo();
    }
    if (taxaSugestao) taxaSugestao.textContent = '';
  }
  atualizarCupomMsg(msg || 'Cupom removido.', true);
}

function aplicarCupomCodigo(){
  if (!cupomInput || !cupomCodigo) return;
  const codigo = cupomInput.value.trim().toUpperCase();
  if (!codigo) {
    atualizarCupomMsg('Informe o codigo do cupom.', false);
    return;
  }
  cupomInput.value = codigo;
  if (!podeAplicarDesconto) {
    atualizarCupomMsg('Sem permissao para aplicar cupom.', false);
    return;
  }
  const subtotal = calcularSubtotalAtual();
  const tipo = tipoPedido ? tipoPedido.value : '';
  const taxa = parseFloat(taxaEntregaInput ? taxaEntregaInput.value : 0);
  const clienteId = clienteIdInput ? clienteIdInput.value : '';
  const params = new URLSearchParams();
  params.set('codigo', codigo);
  params.set('subtotal', subtotal.toFixed(2));
  params.set('tipo', tipo);
  params.set('taxa', Number.isNaN(taxa) ? '0' : taxa.toFixed(2));
  if (clienteId) params.set('cliente_id', clienteId);

  atualizarCupomMsg('Validando cupom...', true);
  fetch('api/cupons_validar.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  })
    .then(r => r.json())
    .then(resp => {
      if (!resp || !resp.ok) {
        atualizarCupomMsg(resp && resp.msg ? resp.msg : 'Cupom invalido.', false);
        return;
      }
      if (cupomCodigo) cupomCodigo.value = resp.codigo || codigo;
      if (cupomResumoSelect) cupomResumoSelect.value = resp.codigo || codigo;
      if (descontoTipo) descontoTipo.value = resp.tipo === 'valor' ? 'valor' : 'percent';
      descontoTipoSelecionado = descontoTipo ? descontoTipo.value : descontoTipoSelecionado;
      if (resp.tipo === 'frete') {
        cupomFreteAtivo = true;
        taxaEntregaOriginal = taxaEntregaOriginal === null ? (taxaEntregaInput ? taxaEntregaInput.value : null) : taxaEntregaOriginal;
        if (taxaEntregaInput) taxaEntregaInput.value = '0';
        if (taxaSugestao) taxaSugestao.textContent = 'Frete gratis aplicado.';
        if (typeof atualizarEntregaResumo === 'function') {
          atualizarEntregaResumo();
        }
        if (descontoTipo) descontoTipo.value = 'valor';
        descontoTipoSelecionado = 'valor';
        if (descontoValor) descontoValor.value = '0';
        if (descontoValorModal) descontoValorModal.value = '';
      } else {
        if (cupomFreteAtivo) {
          if (taxaEntregaInput) {
            const valor = taxaEntregaOriginal !== null ? taxaEntregaOriginal : '0.00';
            taxaEntregaInput.value = valor;
            if (taxaEntregaOriginal === null) {
              atualizarTaxaPorBairro();
            }
          }
          taxaEntregaOriginal = null;
          cupomFreteAtivo = false;
          if (typeof atualizarEntregaResumo === 'function') {
            atualizarEntregaResumo();
          }
        }
        if (descontoValor) descontoValor.value = Number(resp.desconto || 0).toFixed(2);
        if (descontoValorModal) descontoValorModal.value = descontoValor.value;
      }
      definirTipoDescontoModal(descontoTipoSelecionado);
      atualizarPreviewDescontoModal();
      atualizarTotal();
      atualizarBadgeDesconto();
      atualizarCupomMsg(resp.msg || 'Cupom aplicado.', true);
    })
    .catch(() => {
      atualizarCupomMsg('Erro ao validar cupom.', false);
    });
}

function abrirModalDesconto(){
  if (!modalDesconto && modalDescontoEl) {
    modalDesconto = new bootstrap.Modal(modalDescontoEl);
  }
  if (!modalDesconto) return;
  const permitido = !!podeAplicarDesconto;
  if (!permitido) {
    mostrarToast('Sem permissao para aplicar desconto.', 'warn');
  }
  if (descontoAplicar) descontoAplicar.disabled = !permitido;
  if (descontoValorModal) descontoValorModal.disabled = !permitido;
  retornoPagamentoModalDesconto = false;
  if (modalPagamentoEl && modalPagamentoEl.classList.contains('show')) {
    retornoPagamentoModalDesconto = true;
    modalPagamentoEl.addEventListener('hidden.bs.modal', () => {
      definirTipoDescontoModal(descontoTipo ? descontoTipo.value : 'valor');
      if (descontoValorModal) {
        descontoValorModal.value = descontoValor ? descontoValor.value : '';
      }
      atualizarPreviewDescontoModal();
      modalDesconto.show();
    }, { once: true });
    modalPagamento.hide();
    return;
  }
  definirTipoDescontoModal(descontoTipo ? descontoTipo.value : 'valor');
  if (descontoValorModal) {
    descontoValorModal.value = descontoValor ? descontoValor.value : '';
  }
  if (cupomInput && cupomCodigo) {
    cupomInput.value = cupomCodigo.value || '';
    if (cupomCodigo.value) {
      atualizarCupomMsg('Cupom aplicado.', true);
    } else {
      atualizarCupomMsg('Use um codigo ativo para aplicar o desconto.', true);
    }
  }
  atualizarPreviewDescontoModal();
  modalDesconto.show();
}

function atualizarDescontoConcedidoLinha(){
  const linha = document.getElementById('descontoConcedidoLinha');
  const span  = document.getElementById('descontoConcedidoValor');
  if (!linha || !span) return;
  const tipo  = descontoTipo ? descontoTipo.value : '';
  const val   = parseFloat((descontoValor && descontoValor.value) || 0);
  if (!val || val <= 0) {
    linha.classList.add('d-none');
    return;
  }
  let descCalc = 0;
  if (tipo === 'percent') {
    descCalc = (total || 0) * (val / 100);
  } else {
    descCalc = val;
  }
  span.textContent = formatarDinheiro(descCalc);
  linha.classList.remove('d-none');
}

function aplicarDescontoModal(){
  if (!descontoTipo || !descontoValor) return;
  let valor = descontoValorModal
    ? (parseFloat(descontoValorModal.dataset.valorNum||'0') || parseFloat((descontoValorModal.value||'').replace(/[^\d,]/g,'').replace(',','.')) || 0)
    : 0;
  if (Number.isNaN(valor) || valor < 0) valor = 0;
  if (descontoTipoSelecionado === 'percent' && valor > 100) valor = 100;
  descontoTipo.value = descontoTipoSelecionado;
  descontoValor.value = valor.toFixed(2);
  if (cupomCodigo && cupomCodigo.value) {
    limparCupom('Cupom removido para aplicar desconto manual.');
  }
  atualizarTotal();
  atualizarResumoPagamentoModal();
  atualizarBadgeDesconto();
  atualizarDescontoConcedidoLinha();
  if (modalDesconto) modalDesconto.hide();
  /* retorna ao modal de pagamento */
  if (modalPagamento) {
    setTimeout(() => modalPagamento.show(), 300);
  }
}

function obterValorDinheiroAplicado(){
  if (!pagamentosSelecionados.includes('dinheiro')) return 0;
  if (pagamentosSelecionados.length === 2) {
    const idx = pagamentosSelecionados.indexOf('dinheiro');
    if (idx === 0) {
      return parseFloat((pagamentoSplitValor1 && pagamentoSplitValor1.value) || 0);
    }
    return parseFloat((pagamentoSplitValor2 && pagamentoSplitValor2.value) || 0);
  }
  return parseFloat((pagamentoSplitValor1 && pagamentoSplitValor1.value) || 0);
}

function definirFormaPagamentoModal(forma){
  if (!formaPagamento) return;
  formaPagamento.value = forma;
  if (pagamentoDividido) pagamentoDividido.checked = false;
  if (blocoSplit) blocoSplit.classList.add('d-none');
  if (pagamentoDinheiroCampo) {
    pagamentoDinheiroCampo.classList.add('d-none');
  }
  if (pagamentoValorPago && forma === 'dinheiro') {
    pagamentoValorPago.value = total.toFixed(2);
  }
  pagamentoOpcoesButtons.forEach(btn => {
    const ativo = btn.dataset.pay === forma;
    btn.classList.toggle('active', ativo);
  });
  atualizarVisibilidadePagamento();
  atualizarResumoPagamentoModal();
  atualizarListaPagamentosRegistrados();
}

function abrirModalTroco(){
  if (!modalTroco) return;
  retornoPagamentoModal = false;
  if (modalPagamentoEl && modalPagamentoEl.classList.contains('show')) {
    retornoPagamentoModal = true;
    modalPagamento.hide();
  }
  if (trocoValorInput) {
    const aplicado = obterValorDinheiroAplicado() || total;
    const valorInicial = dinheiroRecebido > 0 ? dinheiroRecebido : aplicado;
    trocoValorInput.value = valorInicial.toFixed(2);
  }
  atualizarTrocoModal();
  modalTroco.show();
}

/* retorna o valor atual digitado no campo do modal */
function getValorInputPagamento(){
  if (!pagamentoValorTotal) return total || 0;
  const digits = pagamentoValorTotal.value.replace(/\D/g,'');
  return (parseInt(digits,10)||0)/100;
}
/* atualiza o campo input com o restante */
function setInputPagamento(valor){
  if (!pagamentoValorTotal) return;
  const digits = Math.round(Math.max(0, valor)*100);
  const c = String(digits).padStart(3,'0');
  const parte = c.slice(-2);
  const reais = (c.slice(0,-2).replace(/^0+/,'')||'0').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  pagamentoValorTotal.value = 'R$ '+reais+','+parte;
  if (pagamentoRestanteTexto){
    pagamentoRestanteTexto.textContent = formatarDinheiro(Math.max(0,(total||0)-valor));
  }
}

function atualizarPagamentoSelecionado(){
  if (!pagamentoOpcoes) return;
  /* highlight botões */
  pagamentoOpcoesButtons.forEach(btn => {
    btn.classList.toggle('active', pagamentosSelecionados.includes(btn.dataset.pay));
  });
  if (!pagamentosSelecionados.includes('dinheiro')) dinheiroRecebido = 0;

  /* mostra/oculta "Restante a cobrar" */
  const elRestante = pagamentoRestanteTexto ? pagamentoRestanteTexto.closest('.pdv-payment-remaining') : null;
  if (elRestante) elRestante.classList.toggle('d-none', pagamentosSelecionados.length > 0);

  if (pagamentosSelecionados.length === 0){
    if (pagamentoSplitValor1) pagamentoSplitValor1.value = '';
    if (pagamentoSplitValor2) pagamentoSplitValor2.value = '';
    if (pagamentoRegistrados) pagamentoRegistrados.classList.add('d-none');
    setInputPagamento(total||0);
    atualizarBotaoPagamentoFinalizar();
    return;
  }

  const valorDigitado = getValorInputPagamento();

  if (pagamentosSelecionados.length === 1){
    const forma = pagamentosSelecionados[0];
    if (formaPagamento) formaPagamento.value = forma;
    if (formaPagamento1) formaPagamento1.value = forma;
    if (pagamentoSplitLabel1) pagamentoSplitLabel1.textContent = nomeFormaPagamento(forma);
    const v1 = forma === 'resgate' ? 0 : valorDigitado;
    if (pagamentoSplitValor1) pagamentoSplitValor1.value = v1.toFixed(2);
    if (pagamentoSplitValor2) pagamentoSplitValor2.value = '';
    if (valorPagamento1) valorPagamento1.value = v1.toFixed(2);
    /* reseta input para o restante */
    setInputPagamento(Math.max(0,(total||0)-v1));
    atualizarListaPagamentosRegistrados();
    atualizarBotaoPagamentoFinalizar();
    return;
  }

  /* 2 formas */
  const v1 = parseFloat((pagamentoSplitValor1&&pagamentoSplitValor1.value)||0);
  const v2 = valorDigitado;
  if (pagamentoSplitValor2) pagamentoSplitValor2.value = v2.toFixed(2);
  if (pagamentoSplitLabel1) pagamentoSplitLabel1.textContent = nomeFormaPagamento(pagamentosSelecionados[0]);
  if (pagamentoSplitLabel2) pagamentoSplitLabel2.textContent = nomeFormaPagamento(pagamentosSelecionados[1]);
  if (formaPagamento1) formaPagamento1.value = pagamentosSelecionados[0];
  if (formaPagamento2) formaPagamento2.value = pagamentosSelecionados[1];
  if (valorPagamento1) valorPagamento1.value = v1.toFixed(2);
  if (valorPagamento2) valorPagamento2.value = v2.toFixed(2);
  /* reseta input para o restante */
  setInputPagamento(Math.max(0,(total||0)-v1-v2));
  atualizarListaPagamentosRegistrados();
  atualizarBotaoPagamentoFinalizar();
}

function definirValorDinheiro(valor){
  dinheiroRecebido = valor;
  if (trocoInput) trocoInput.value = valor.toFixed(2);
  if (pagamentoValorPago) pagamentoValorPago.value = valor.toFixed(2);
  atualizarResumoPagamentoModal();
}

function abrirModalPagamento(){
  atualizarTotal();
  const clienteId = document.getElementById('clienteId').value;
  if (!clienteId) {
    mostrarToast('Selecione um cliente', 'warn');
    return;
  }
  const itens = coletarItens();
  if (!itens.length) {
    mostrarToast('Adicione pelo menos um produto', 'warn');
    return;
  }
  if (!validarEstoqueItens()) {
    return;
  }
  if (!caixaAtual || caixaAtual.status !== 'aberto') {
    mostrarToast('Caixa fechado. Abra o caixa para iniciar um novo pedido.', 'warn');
    abrirModalCaixa();
    return;
  }
  if (Number(caixaAtual.dia_anterior || 0) === 1) {
    mostrarToast('Feche o caixa do dia anterior e abra o caixa de hoje para criar pedidos.', 'warn');
    abrirModalCaixa();
    return;
  }
  if (modalPagamento) {
    pagamentosSelecionados = [];
    dinheiroRecebido = 0;
    if (pagamentoDividido) pagamentoDividido.checked = false;
    if (pagamentoSplitValor1) pagamentoSplitValor1.value = '';
    if (pagamentoSplitValor2) pagamentoSplitValor2.value = '';
    if (pagamentoValorPago) pagamentoValorPago.value = '';
    if (trocoInput) trocoInput.value = '';
    if (trocoValorInput) trocoValorInput.value = '';
    atualizarPagamentoSelecionado();
    atualizarDescontoConcedidoLinha();
    modalPagamento.show();
  }
}

function sincronizarPagamentoModal(){
  if (!formaPagamento) return;
  const dinheiroAplicado = obterValorDinheiroAplicado();
  const dinheiroRecebidoFinal = dinheiroRecebido > 0 ? dinheiroRecebido : dinheiroAplicado;
  if (pagamentosSelecionados.length === 2) {
    if (pagamentoDividido) pagamentoDividido.checked = true;
    if (formaPagamento1) formaPagamento1.value = pagamentosSelecionados[0];
    if (formaPagamento2) formaPagamento2.value = pagamentosSelecionados[1];
    if (valorPagamento1 && pagamentoSplitValor1) valorPagamento1.value = pagamentoSplitValor1.value || '0';
    if (valorPagamento2 && pagamentoSplitValor2) valorPagamento2.value = pagamentoSplitValor2.value || '0';
    trocoInput.value = dinheiroAplicado > 0 ? dinheiroRecebidoFinal.toFixed(2) : '';
  } else if (pagamentosSelecionados.length === 1) {
    if (pagamentoDividido) pagamentoDividido.checked = false;
    if (formaPagamento1) formaPagamento1.value = pagamentosSelecionados[0];
    formaPagamento.value = pagamentosSelecionados[0];
    if (valorPagamento1 && pagamentoSplitValor1) {
      const valorBase = formaPagamento.value === 'resgate' ? '0' : total.toFixed(2);
      valorPagamento1.value = pagamentoSplitValor1.value || valorBase;
    }
    trocoInput.value = formaPagamento.value === 'dinheiro'
      ? dinheiroRecebidoFinal.toFixed(2)
      : '';
  } else {
    if (pagamentoDividido) pagamentoDividido.checked = false;
    formaPagamento.value = 'pix';
    trocoInput.value = '';
  }
  atualizarTotal();
}

function atualizarTrocoModal(){
  if (!trocoTotalTexto || !trocoCalculadoTexto || !trocoResumoLinha || !trocoResumoLabel) return;
  const totalAtual = total || 0;
  const aplicado = obterValorDinheiroAplicado() || totalAtual;
  trocoTotalTexto.textContent = formatarDinheiro(aplicado);
  const recebido = parseFloat((trocoValorInput && trocoValorInput.value) || 0);
  const diff = recebido - aplicado;
  if (diff >= 0) {
    trocoResumoLabel.textContent = 'Troco';
    trocoCalculadoTexto.textContent = formatarDinheiro(diff);
    trocoResumoLinha.classList.add('is-positive');
    trocoResumoLinha.classList.remove('is-negative');
  } else {
    trocoResumoLabel.textContent = 'Falta';
    trocoCalculadoTexto.textContent = formatarDinheiro(Math.abs(diff));
    trocoResumoLinha.classList.add('is-negative');
    trocoResumoLinha.classList.remove('is-positive');
  }
}

function iniciarSalvarPedidoUI(){
  document.body.classList.add('pdv-saving');
  if (modalPagamentoEl) {
    modalPagamentoEl.classList.remove('show');
  }
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('padding-right');
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
}

function resetarSalvarPedidoUI(){
  salvandoPedido = false;
  if (btnPagamentoFinalizar && btnPagamentoTextoOriginal) {
    btnPagamentoFinalizar.textContent = btnPagamentoTextoOriginal;
  }
  if (btnPagamentoFinalizar) {
    btnPagamentoFinalizar.disabled = false;
  }
  document.body.classList.remove('pdv-saving');
}

function redirecionarGestorPedidos(){
  const destino = 'gestor_pedidos.php';
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = destino;
      return;
    }
  } catch (e) {}
  try {
    if (window.parent && window.parent !== window.self) {
      window.parent.location.href = destino;
      return;
    }
  } catch (e) {}
  window.location.href = destino;
}

function notificarPedidoFinalizado(resposta){
  const payload = { type: 'pdv:pedido-finalizado', payload: resposta || {} };
  try {
    if (window.parent && window.parent !== window) {
      if (typeof window.parent.pdvPedidoFinalizado === 'function') {
        window.parent.pdvPedidoFinalizado(resposta || {});
      } else {
        window.parent.postMessage(payload, window.location.origin);
      }
    }
  } catch (e) {}
  try {
    if (window.top && window.top !== window) {
      window.top.postMessage(payload, window.location.origin);
    }
  } catch (e) {}
}

function salvarPedido(){
  if (salvandoPedido) return;
  salvandoPedido = true;
  if (btnPagamentoFinalizar) {
    if (btnPagamentoTextoOriginal === null) {
      btnPagamentoTextoOriginal = btnPagamentoFinalizar.textContent;
    }
    btnPagamentoFinalizar.disabled = true;
    btnPagamentoFinalizar.textContent = 'Processando...';
  }
  atualizarTotal();

  const clienteId = document.getElementById('clienteId').value;
  if (!clienteId) {
    mostrarToast('Selecione um cliente', 'warn');
    resetarSalvarPedidoUI();
    return;
  }

  const itens = coletarItens();
  if (!itens.length) {
    mostrarToast('Adicione pelo menos um produto', 'warn');
    resetarSalvarPedidoUI();
    return;
  }
  if (!validarEstoqueItens()) {
    resetarSalvarPedidoUI();
    return;
  }

  const tipo = tipoPedido.value;
  atualizarEnderecoResumo();
  let endereco = (document.getElementById('enderecoEntrega').value || '').trim();
  if (tipo === 'entrega') {
    const rua = enderecoRua.value.trim();
    const bairro = enderecoBairro.value.trim();
    const cep = enderecoCep.value.trim();
    const cepLimpo = cep.replace(/\D/g,'');

    if (!rua || !bairro || !cep) {
      mostrarToast('Preencha endereco, bairro e CEP', 'warn');
      resetarSalvarPedidoUI();
      return;
    }
    if (cepLimpo.length !== 8) {
      mostrarToast('CEP invalido', 'warn');
      resetarSalvarPedidoUI();
      return;
    }
    if (!endereco) {
      mostrarToast('Endereco incompleto', 'warn');
      resetarSalvarPedidoUI();
      return;
    }
  }
  if (enderecoAgendamento && enderecoAgendamento.value) {
    const validacao = validarAgendamento();
    if (!validacao.ok) {
      mostrarToast(validacao.msg || 'Agendamento invalido.', 'warn');
      resetarSalvarPedidoUI();
      return;
    }
  }

  const pagamento = formaPagamento.value;
  let pagamentos = [];

  if (pagamentoDividido.checked) {
    pagamentos = obterPagamentosSplit();
    if (pagamentos.length < 2) {
      mostrarToast('Informe dois pagamentos para dividir', 'warn');
      resetarSalvarPedidoUI();
      return;
    }
  } else {
    let valor = total;
    const valorDigitado = parseFloat((pagamentoSplitValor1 && pagamentoSplitValor1.value) || 0);
    if (valorDigitado > 0) {
      valor = valorDigitado;
    }
    pagamentos = [{ forma: pagamento, valor }];
  }

  const totalPagamentos = pagamentos.reduce((acc,p)=>acc + p.valor,0);
  if (Math.abs(totalPagamentos - total) > 0.01) {
    mostrarToast('A soma dos pagamentos precisa ser igual ao total', 'warn');
    resetarSalvarPedidoUI();
    return;
  }

  const dinheiroPago = pagamentos
    .filter(p => p.forma === 'dinheiro')
    .reduce((acc,p)=>acc + p.valor,0);
  const dinheiroRecebidoFinal = dinheiroPago > 0
    ? (dinheiroRecebido > 0 ? dinheiroRecebido : dinheiroPago)
    : 0;

  if (dinheiroPago > 0 && dinheiroRecebidoFinal + 0.0001 < dinheiroPago) {
    mostrarToast('Valor em dinheiro insuficiente', 'warn');
    resetarSalvarPedidoUI();
    return;
  }

  if (!caixaAtual || caixaAtual.status !== 'aberto') {
    mostrarToast('Caixa fechado. Abra o caixa para iniciar um novo pedido.', 'warn');
    abrirModalCaixa();
    resetarSalvarPedidoUI();
    return;
  }
  if (Number(caixaAtual.dia_anterior || 0) === 1) {
    mostrarToast('Feche o caixa do dia anterior e abra o caixa de hoje para criar pedidos.', 'warn');
    abrirModalCaixa();
    resetarSalvarPedidoUI();
    return;
  }

  const dados = new FormData(document.getElementById('formPDV'));
  dados.set('itens', JSON.stringify(itens));
  dados.set('pagamento', pagamentos[0] ? pagamentos[0].forma : pagamento);
  dados.set('pagamento_dividido', pagamentoDividido.checked ? '1' : '0');
  dados.set('pagamentos', JSON.stringify(pagamentos));
  dados.set('valor_pago', dinheiroPago > 0 ? dinheiroRecebidoFinal.toFixed(2) : '');
    dados.set('cupom', cupomCodigo.value.trim().toUpperCase());
    dados.set('desconto_tipo', descontoTipo.value);
    dados.set('desconto_valor', descontoValor.value || 0);
    dados.set('taxa_maquininha_percent', taxaMaquininhaPercent.value || 0);
  dados.set('cashback_aplicado', cashbackAplicado ? cashbackAplicado.value : '0');
  dados.set('cashback_usado', cashbackUsadoInput ? cashbackUsadoInput.value : '0');
  dados.set('endereco', endereco);
  dados.set('agendamento', enderecoAgendamento ? enderecoAgendamento.value : '');
  dados.set('caixa_id', caixaAtual && caixaAtual.status === 'aberto' ? caixaAtual.id : '');
    if (modoEdicao) {
      dados.set('pedido_edicao_id', pedidoEdicaoId);
    }
  if (window.PdvOffline && !dados.get('offline_uuid')) {
    dados.set('offline_uuid', window.PdvOffline.gerarUuid());
  }

  if (!modoEdicao && window.PdvOffline && window.PdvOffline.estaOffline()) {
    salvarPedidoOffline(dados);
    return;
  }

  iniciarSalvarPedidoUI();
  enviarPedidoOnline(dados);
}

function enviarPedidoOnline(dados){
  fetch('api/pdv_salvar.php',{
    method:'POST',
    body:dados
  })
    .then(r=>r.json())
    .then(async res=>{
      if(!res.ok){
        mostrarToast(res.msg || 'Erro ao salvar pedido', 'warn');
        resetarSalvarPedidoUI();
        return;
      }
      // Precisa terminar (await) ANTES de redirecionar — se a página navegar embora
      // enquanto a impressão ainda está em andamento (conexão QZ Tray, envio do
      // comando), o comando de impressão é perdido no meio do caminho.
      if (typeof impressaoQZ !== 'undefined' && res.pedido_id) {
        const lojaNomeImpressao = (typeof LOJA_NOME_IMPRESSAO !== 'undefined') ? LOJA_NOME_IMPRESSAO : '';
        try {
          // Timeout de segurança: se a impressão travar (ex: popup do QZ Tray sem
          // resposta), não pode travar o checkout pra sempre — desiste e segue o fluxo.
          await Promise.race([
            impressaoQZ.imprimirAutomaticoPedido('pdv', res.pedido_id, lojaNomeImpressao),
            new Promise(resolve => setTimeout(resolve, 6000)),
          ]);
        } catch (e) {
          console.warn('Falha na impressão automática:', e);
        }
      }
      if (pdvModoModal) {
        resetarSalvarPedidoUI();
        notificarPedidoFinalizado(res);
        /* Rede de seguranca: se por qualquer motivo a comunicacao com a pagina pai
           nao fechar o modal (ex.: pdvPedidoFinalizado falhar silenciosamente),
           forca o fechamento chamando fecharPdvModal/carregarPedidos diretamente.
           Chamar de novo aqui e inofensivo caso o fechamento ja tenha ocorrido. */
        setTimeout(() => {
          try {
            if (window.parent && window.parent !== window) {
              if (typeof window.parent.fecharPdvModal === 'function') {
                window.parent.fecharPdvModal();
              }
              if (typeof window.parent.carregarPedidos === 'function') {
                window.parent.carregarPedidos();
              }
            }
          } catch (e) {}
        }, 800);
        return;
      }
      redirecionarGestorPedidos();
      setTimeout(redirecionarGestorPedidos, 300);
      setTimeout(() => {
        if (document.body.classList.contains('pdv-saving')) {
          resetarSalvarPedidoUI();
        }
      }, 2000);
    })
    .catch(() => {
      if (!modoEdicao && window.PdvOffline) {
        window.PdvOffline.forcarOffline();
        salvarPedidoOffline(dados);
        return;
      }
      resetarSalvarPedidoUI();
    });
}

function salvarPedidoOffline(dados){
  if (!window.PdvOffline) {
    mostrarToast('Sem conexao e modulo offline indisponivel.', 'warn');
    resetarSalvarPedidoUI();
    return;
  }
  const resumo = {
    clienteNome: (clienteResumoNome && clienteResumoNome.textContent) || 'Cliente',
    total: total,
    qtdItens: coletarItens().reduce((acc,i)=>acc+(i.qtd||1),0)
  };
  const resultado = window.PdvOffline.enfileirar(dados, resumo);
  if (!resultado.ok) {
    mostrarToast(resultado.msg || 'Nao foi possivel salvar a venda offline.', 'warn');
    resetarSalvarPedidoUI();
    return;
  }
  mostrarToast(`Venda registrada offline (#${resultado.item.codigo_local}). Sera sincronizada quando a internet voltar.`);
  resetarSalvarPedidoUI();
  limparCarrinho();
  limparClienteSelecionado();
}

function voltarGestor(){
  document.body.classList.add('fade-out');
  setTimeout(()=>location.href='gestor_pedidos.php',300);
}

function focarElemento(el){
  if (!el) return;
  el.focus();
  if (typeof el.select === 'function') {
    el.select();
  }
}

function focarProdutoBusca(){
  focarElemento(produtoBusca);
}


function definirFocoInicial(){
  if (!clienteIdInput.value) {
    focarElemento(inputBusca);
  } else {
    focarProdutoBusca();
  }
}

function toggleFullscreen(){
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function atualizarBotaoFullscreen(){
  if (!btnFullscreen) return;
  const ativo = !!document.fullscreenElement;
  btnFullscreen.innerHTML = ativo
    ? '<i class="bi bi-fullscreen-exit"></i> Sair'
    : '<i class="bi bi-arrows-fullscreen"></i> Tela cheia';
}

function abrirModalCaixa(){
  if (!modalCaixa) return;
  const aberto = caixaAtual && caixaAtual.status === 'aberto';
  caixaFormAbrir.classList.toggle('d-none', aberto);
  caixaFormFechar.classList.toggle('d-none', !aberto);
  tituloCaixa.textContent = aberto ? 'Fechar caixa' : 'Abrir caixa';

  if (aberto) {
    caixaAbertoEm.textContent = caixaAtual.aberto_em
      ? formatarDataHora(caixaAtual.aberto_em)
      : '-';
    caixaSaldoInicialInfo.value = formatarDinheiro(caixaAtual.saldo_inicial || 0);
    caixaSaldoFinal.value = '';
    caixaObsFechar.value = '';
  } else {
    caixaSaldoInicial.value = '';
    caixaObsAbrir.value = '';
  }

  bootstrap.Modal.getOrCreateInstance(modalCaixa).show();
}

function atualizarResumoCaixa(){
  const aberto = caixaAtual && caixaAtual.status === 'aberto';
  if (caixaResumo) {
    caixaResumo.textContent = aberto ? 'Aberto' : 'Fechado';
  }
  if (caixaStatusDot) {
    caixaStatusDot.classList.toggle('aberto', aberto);
    caixaStatusDot.classList.toggle('fechado', !aberto);
  }
  if (caixaResumoModal) {
    caixaResumoModal.textContent = aberto ? 'Aberto' : 'Fechado';
  }
  if (caixaStatusDotModal) {
    caixaStatusDotModal.classList.toggle('aberto', aberto);
    caixaStatusDotModal.classList.toggle('fechado', !aberto);
  }
  if (caixaBadgeModal) {
    caixaBadgeModal.classList.toggle('is-open', aberto);
  }
  if (operadorPillModal) {
    operadorPillModal.classList.toggle('is-open', aberto);
  }
  if (btnCaixa) {
    btnCaixa.textContent = aberto ? 'Fechar caixa' : 'Abrir caixa';
  }
  atualizarBotaoFinalizarPedido();
}

function atualizarBotaoFinalizarPedido(){
  if (!btnFinalizarPedido) return;
  const aberto = caixaAtual && caixaAtual.status === 'aberto';
  const diaAnterior = aberto && (Number(caixaAtual.dia_anterior || 0) === 1);
  const podeFinalizar = aberto && !diaAnterior;
  btnFinalizarPedido.disabled = !podeFinalizar;
  btnFinalizarPedido.classList.toggle('is-disabled', !podeFinalizar);
  if (!aberto) {
    btnFinalizarPedido.title = 'Abra o caixa para finalizar o pedido';
  } else if (diaAnterior) {
    btnFinalizarPedido.title = 'Feche o caixa do dia anterior e abra o caixa de hoje';
  } else {
    btnFinalizarPedido.title = '';
  }
  if (avisoCaixaFechado) {
    avisoCaixaFechado.classList.toggle('d-none', podeFinalizar);
    avisoCaixaFechado.textContent = (!aberto)
      ? 'Caixa fechado. Abra o caixa para finalizar o pedido.'
      : 'Feche o caixa do dia anterior e abra o caixa de hoje para finalizar o pedido.';
  }
}

function carregarCaixaStatus(){
  fetch('api/caixa_status.php')
    .then(r => r.json())
    .then(res => {
      caixaAtual = res.ok ? (res.caixa || null) : null;
      atualizarResumoCaixa();
    })
    .catch(() => {
      caixaAtual = null;
      atualizarResumoCaixa();
    });
}

function salvarCaixa(){
  const aberto = caixaAtual && caixaAtual.status === 'aberto';
  if (aberto) {
    const saldoFinal = parseFloat(caixaSaldoFinal.value || 0);
    fetch('api/caixa_fechar.php', {
      method: 'POST',
      body: new URLSearchParams({
        caixa_id: caixaAtual.id,
        saldo_final: saldoFinal.toFixed(2),
        observacoes: caixaObsFechar.value.trim()
      })
    })
      .then(r => r.json())
      .then(res => {
        if (!res.ok) {
          mostrarToast(res.msg || 'Nao foi possivel fechar o caixa', 'warn');
          return;
        }
        bootstrap.Modal.getInstance(modalCaixa).hide();
        carregarCaixaStatus();
      });
  } else {
    const saldoInicial = parseFloat(caixaSaldoInicial.value || 0);
    fetch('api/caixa_abrir.php', {
      method: 'POST',
      body: new URLSearchParams({
        saldo_inicial: saldoInicial.toFixed(2),
        observacoes: caixaObsAbrir.value.trim()
      })
    })
      .then(r => r.json())
      .then(res => {
        if (!res.ok) {
          mostrarToast(res.msg || 'Nao foi possivel abrir o caixa', 'warn');
          return;
        }
        bootstrap.Modal.getInstance(modalCaixa).hide();
        caixaAtual = res.caixa || null;
        atualizarResumoCaixa();
      });
  }
}

let leitorBuffer = '';
let leitorTimer = null;
let leitorUltimo = 0;

function registrarLeitor(e){
  const alvo = e.target;
  if (alvo && ['INPUT','TEXTAREA','SELECT'].includes(alvo.tagName)) {
    return;
  }
  if (e.key === 'Enter') {
    if (leitorBuffer.length >= 4) {
      tentarSelecionarProduto(leitorBuffer, true);
    }
    leitorBuffer = '';
    return;
  }
  if (e.key.length !== 1) return;

  const agora = Date.now();
  if (agora - leitorUltimo > 80) {
    leitorBuffer = '';
  }
  leitorUltimo = agora;
  leitorBuffer += e.key;

  clearTimeout(leitorTimer);
  leitorTimer = setTimeout(() => {
    if (leitorBuffer.length >= 6) {
      tentarSelecionarProduto(leitorBuffer, true);
    }
    leitorBuffer = '';
  }, 120);
}

function registrarAtalhos(e){
  if (e.key === 'F2') {
    e.preventDefault();
    focarProdutoBusca();
    return;
  }
  if (e.key === 'F3') {
    e.preventDefault();
    focarElemento(inputBusca);
    return;
  }
  if (e.key === 'F4') {
    e.preventDefault();
    toggleFullscreen();
    return;
  }
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    if (!document.querySelector('.modal.show')) {
      abrirModalPagamento();
    }
  }
}

if (btnFullscreen) {
  btnFullscreen.addEventListener('click', toggleFullscreen);
}
if (btnCaixa) {
  btnCaixa.addEventListener('click', abrirModalCaixa);
}
if (btnFinalizarPedido) {
  btnFinalizarPedido.addEventListener('click', abrirModalPagamento);
}

document.addEventListener('fullscreenchange', atualizarBotaoFullscreen);
document.addEventListener('keydown', e => {
  registrarAtalhos(e);
  registrarLeitor(e);
});

atualizarBotaoFullscreen();
carregarCaixaStatus();

document.addEventListener('DOMContentLoaded', () => {
  modalCaixa = document.getElementById('modalCaixa');
  caixaFormAbrir = document.getElementById('caixaFormAbrir');
  caixaFormFechar = document.getElementById('caixaFormFechar');
  caixaSaldoInicial = document.getElementById('caixaSaldoInicial');
  caixaSaldoInicialInfo = document.getElementById('caixaSaldoInicialInfo');
  caixaSaldoFinal = document.getElementById('caixaSaldoFinal');
  caixaObsAbrir = document.getElementById('caixaObsAbrir');
  caixaObsFechar = document.getElementById('caixaObsFechar');
  caixaAbertoEm = document.getElementById('caixaAbertoEm');
  btnCaixaSalvar = document.getElementById('btnCaixaSalvar');
  tituloCaixa = document.getElementById('tituloCaixa');

  if (btnCaixaSalvar) {
    btnCaixaSalvar.addEventListener('click', salvarCaixa);
  }

  clienteNomeInput = document.getElementById('clienteNome');
  clienteTelefoneInput = document.getElementById('clienteTelefone');
  clienteEnderecoInput = document.getElementById('clienteEndereco');
  if (clienteTelefoneInput) {
    clienteTelefoneInput.value = aplicarMascaraTelefone(clienteTelefoneInput.value);
  }
  clienteModalBusca = document.getElementById('clienteModalBusca');
  listaClientesModal = document.getElementById('listaClientesModal');
  clienteModalRecentesBtn = document.getElementById('clienteModalRecentesBtn');
  btnClienteContinuar = document.getElementById('btnClienteContinuar');
  if (clienteNomeInput) {
    clienteNomeInput.addEventListener('input', () => {
      clienteNomeInput.classList.remove('is-invalid');
      marcarClienteComoNovo();
    });
  }
  if (clienteTelefoneInput) {
    clienteTelefoneInput.addEventListener('input', () => {
      clienteTelefoneInput.value = aplicarMascaraTelefone(clienteTelefoneInput.value);
      clienteTelefoneInput.classList.remove('is-invalid');
      marcarClienteComoNovo();
    });
  }
  const modalClienteEl = document.getElementById('modalCliente');
  if (modalClienteEl) {
    modalClienteEl.addEventListener('show.bs.modal', () => {
      const atual = obterClientePorId(clienteIdInput ? clienteIdInput.value : '');
      if (atual) {
        preencherModalCliente(atual);
        atualizarPontosSaldoCliente(atual.pontos || 0);
      } else {
        atualizarPontosSaldoCliente(0);
      }
      if (clienteModalBusca) clienteModalBusca.classList.remove('is-invalid');
      if (clienteNomeInput) clienteNomeInput.classList.remove('is-invalid');
      if (clienteTelefoneInput) clienteTelefoneInput.classList.remove('is-invalid');
    });
  }
  if (clienteModalBusca && listaClientesModal) {
    const mostrarRecentesClienteModal = () => {
      const recentes = clientesRecentes(5);
      renderListaClientes(listaClientesModal, recentes, selecionarClienteModal);
    };

    clienteModalBusca.addEventListener('input', () => {
      const masked = aplicarMascaraTelefoneBusca(clienteModalBusca.value);
      if (masked !== clienteModalBusca.value) {
        clienteModalBusca.value = masked;
      }
      const resultados = filtrarClientes(clienteModalBusca.value).slice(0, 5);
      renderListaClientes(listaClientesModal, resultados, selecionarClienteModal);
      marcarClienteComoNovo();
    });
    clienteModalBusca.addEventListener('focus', () => {
      if (!clienteModalBusca.value.trim()) {
        mostrarRecentesClienteModal();
      }
    });
    clienteModalBusca.addEventListener('click', () => {
      if (!clienteModalBusca.value.trim()) {
        mostrarRecentesClienteModal();
      }
    });
    clienteModalBusca.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    });
    if (clienteModalRecentesBtn) {
      clienteModalRecentesBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (!listaClientesModal.classList.contains('d-none')) {
          listaClientesModal.classList.add('d-none');
          return;
        }
        mostrarRecentesClienteModal();
      });
    }
  }
  if (btnClienteContinuar) {
    btnClienteContinuar.addEventListener('click', continuarClienteModal);
  }

  modalAgendamentoEl = document.getElementById('modalAgendamento');
  btnAgendamento = document.getElementById('btnAgendamento');
  btnAgendamentoLimpar = document.getElementById('btnAgendamentoLimpar');
  agendamentoData = document.getElementById('agendamentoData');
  agendamentoHora = document.getElementById('agendamentoHora');
  agendamentoSalvar = document.getElementById('agendamentoSalvar');
  agendamentoLimpar = document.getElementById('agendamentoLimpar');
  agendamentoDias = document.getElementById('agendamentoDias');
  agendamentoHoras = document.getElementById('agendamentoHoras');
  agendamentoHorasEmpty = document.getElementById('agendamentoHorasEmpty');
  agendamentoDiasPrev = document.getElementById('agendamentoDiasPrev');
  agendamentoDiasNext = document.getElementById('agendamentoDiasNext');
  if (modalAgendamentoEl) {
    modalAgendamento = new bootstrap.Modal(modalAgendamentoEl);
  }
  if (btnAgendamento) {
    btnAgendamento.addEventListener('click', abrirModalAgendamento);
  }
  if (btnAgendamentoLimpar) {
    btnAgendamentoLimpar.addEventListener('click', limparAgendamento);
  }
  if (agendamentoSalvar) {
    agendamentoSalvar.addEventListener('click', salvarAgendamento);
  }
  if (agendamentoLimpar) {
    agendamentoLimpar.addEventListener('click', limparAgendamento);
  }
  if (agendamentoDiasPrev) {
    agendamentoDiasPrev.addEventListener('click', () => rolarDiasAgendamento(-1));
  }
  if (agendamentoDiasNext) {
    agendamentoDiasNext.addEventListener('click', () => rolarDiasAgendamento(1));
  }
  if (agendamentoData) {
    agendamentoData.addEventListener('change', ajustarLimitesAgendamento);
  }
  if (agendamentoHora) {
    agendamentoHora.addEventListener('change', ajustarLimitesAgendamento);
  }

  modalEntregaEl = document.getElementById('modalEntrega');
  entregaClienteBusca = document.getElementById('entregaClienteBusca');
  entregaClienteTelefone = document.getElementById('entregaClienteTelefone');
  entregaClienteNome = document.getElementById('entregaClienteNome');
  entregaClienteTelefoneErro = document.getElementById('entregaTelefoneErro');
  entregaClienteNomeErro = document.getElementById('entregaNomeErro');
  entregaListaClientes = document.getElementById('entregaListaClientes');
  entregaClienteRecentesBtn = document.getElementById('entregaClienteRecentesBtn');
  entregaCepModal = document.getElementById('entregaCepModal');
  entregaDistanciaKm = document.getElementById('entregaDistanciaKm');
  entregaDistanciaWrap = document.getElementById('entregaDistanciaWrap');
  entregaRuaModal = document.getElementById('entregaRuaModal');
  entregaNumeroModal = document.getElementById('entregaNumeroModal');
  entregaBairroModal = document.getElementById('entregaBairroModal');
  entregaCidadeModal = document.getElementById('entregaCidadeModal');
  entregaComplementoModal = document.getElementById('entregaComplementoModal');
  entregaTaxaEditar = document.getElementById('entregaTaxaEditar');
  entregaTaxaValor = document.getElementById('entregaTaxaValor');
  entregaTaxaLabel = document.getElementById('entregaTaxaLabel');
  entregaTaxaInfo = document.getElementById('entregaTaxaInfo');
  entregaContinuar = document.getElementById('entregaContinuar');
  atualizarCampoDistancia();
  if (entregaClienteTelefone) {
    entregaClienteTelefone.value = aplicarMascaraTelefone(entregaClienteTelefone.value);
  }
  if (entregaCepModal) {
    entregaCepModal.value = aplicarMascaraCep(entregaCepModal.value);
  }
  if (modalEntregaEl) {
    modalEntrega = new bootstrap.Modal(modalEntregaEl);
  }

  modalPagamentoEl = document.getElementById('modalPagamento');
  modalCashbackEl = document.getElementById('modalCashback');
  cashbackModalSaldo = document.getElementById('cashbackModalSaldo');
  cashbackModalValidade = document.getElementById('cashbackModalValidade');
  cashbackModalValor = document.getElementById('cashbackModalValor');
  cashbackModalUsar = document.getElementById('cashbackModalUsar');
  pagamentoOpcoes = document.getElementById('pagamentoOpcoes');
  if (pagamentoOpcoes) {
    pagamentoOpcoesButtons = Array.from(pagamentoOpcoes.querySelectorAll('.pdv-payment-option'));
  }
  pagamentoValorTotal = document.getElementById('pagamentoValorTotal');
  pagamentoTotalTexto = document.getElementById('pagamentoTotalTexto');
  pagamentoRestanteTexto = document.getElementById('pagamentoRestanteTexto');

  /* máscara monetária + atualização do Restante a cobrar */
  function aplicarMascaraMoeda(el) {
    let digits = el.value.replace(/\D/g, '');
    let num = parseInt(digits, 10) || 0;
    if (num > 9999999) num = 9999999; // limite R$ 99.999,99
    const centavos = String(num).padStart(3, '0');
    const parte = centavos.slice(-2);
    const reais = centavos.slice(0, -2).replace(/^0+/, '') || '0';
    const reaisFmt = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    el.value = 'R$ ' + reaisFmt + ',' + parte;
    // atualiza restante
    if (pagamentoRestanteTexto) {
      const valor = num / 100;
      const restante = Math.max(0, (total || 0) - valor);
      pagamentoRestanteTexto.textContent = formatarDinheiro(restante);
    }
  }
  function valorMascara(el) {
    return parseInt(el.value.replace(/\D/g, ''), 10) / 100 || 0;
  }
  window.valorMascara = valorMascara;
  if (pagamentoValorTotal) {
    pagamentoValorTotal.addEventListener('input', function(){ aplicarMascaraMoeda(this); });
    pagamentoValorTotal.addEventListener('focus', function(){ this.select(); });
    pagamentoValorTotal.addEventListener('keydown', function(e){
      // permite: dígitos, backspace, delete, tab, esc, setas
      if (!/^\d$/.test(e.key) && !['Backspace','Delete','Tab','Escape','ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
        e.preventDefault();
      }
    });
  }

  /* botão Desconto na grade redireciona para o modal de desconto */
  const btnDescontoGrid = document.getElementById('btnDescontoGrid');
  if (btnDescontoGrid) {
    btnDescontoGrid.addEventListener('click', () => {
      if (typeof abrirModalDesconto === 'function') abrirModalDesconto();
      else if (btnAbrirDesconto) btnAbrirDesconto.click();
    });
  }
  pagamentoValorPago = document.getElementById('pagamentoValorPago');
  pagamentoDinheiroCampo = document.getElementById('pagamentoDinheiroCampo');
  btnPagamentoFinalizar = document.getElementById('btnPagamentoFinalizar');
  pagamentoSplit = document.getElementById('pagamentoSplit');
  pagamentoSplitLabel1 = document.getElementById('pagamentoSplitLabel1');
  pagamentoSplitLabel2 = document.getElementById('pagamentoSplitLabel2');
  pagamentoSplitValor1 = document.getElementById('pagamentoSplitValor1');
  pagamentoSplitValor2 = document.getElementById('pagamentoSplitValor2');
  pagamentoRegistrados = document.getElementById('pagamentoRegistrados');
  pagamentoRegistradosLista = document.getElementById('pagamentoRegistradosLista');
  pagamentoSplitRow1 = document.getElementById('pagamentoSplitRow1');
  pagamentoSplitRow2 = document.getElementById('pagamentoSplitRow2');
  btnAbrirDesconto = document.getElementById('btnAbrirDesconto');
  descontoBadge = document.getElementById('descontoBadge');
  modalDescontoEl = document.getElementById('modalDesconto');
  descontoToggle = document.getElementById('descontoToggle');
  descontoValorModal = document.getElementById('descontoValorModal');
  cupomInput = document.getElementById('cupomInput');
  cupomAplicar = document.getElementById('cupomAplicar');
  cupomRemover = document.getElementById('cupomRemover');
  cupomMsg = document.getElementById('cupomMsg');
  descontoPreview = document.getElementById('descontoPreview');
  descontoLimpar = document.getElementById('descontoLimpar');
  descontoAplicar = document.getElementById('descontoAplicar');
  aplicarPermissoes();
  if (modalCashbackEl) {
    modalCashback = new bootstrap.Modal(modalCashbackEl);
    modalCashbackEl.addEventListener('shown.bs.modal', () => {
      if (cashbackModalValor) cashbackModalValor.focus();
    });
  }
  if (cashbackModalUsar) {
    cashbackModalUsar.addEventListener('click', aplicarCashbackSelecionado);
  }
  if (cashbackModalValor) {
    function aplicarMascaraCashback() {
      let digits = cashbackModalValor.value.replace(/\D/g, '');
      let num = parseInt(digits, 10) || 0;
      if (num > 9999999) num = 9999999;
      const c = String(num).padStart(3, '0');
      const parte = c.slice(-2);
      const reais = (c.slice(0, -2).replace(/^0+/, '') || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      cashbackModalValor.value = 'R$ ' + reais + ',' + parte;
      /* atualiza o botão "Usar" com o valor */
      if (cashbackModalUsar) {
        const valorNum = num / 100;
        cashbackModalUsar.textContent = valorNum > 0
          ? 'Usar R$ ' + reais + ',' + parte
          : 'Usar';
      }
    }
    cashbackModalValor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); aplicarCashbackSelecionado(); return; }
      if (!/^\d$/.test(e.key) && !['Backspace','Delete','Tab','Escape','ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
        e.preventDefault();
      }
    });
    cashbackModalValor.addEventListener('input', aplicarMascaraCashback);
    cashbackModalValor.addEventListener('focus', () => {
      window.setTimeout(() => cashbackModalValor.select(), 0);
    });
  }
  if (modalPagamentoEl) {
    if (pdvModoModal) {
      modalPagamentoEl.classList.remove('fade');
      modalPagamentoEl.classList.add('pdv-no-anim');
    }
    modalPagamento = new bootstrap.Modal(modalPagamentoEl);
    modalPagamentoEl.addEventListener('show.bs.modal', () => {
      atualizarResumoPagamentoModal();
      atualizarBotaoPagamentoFinalizar();
      atualizarOpcaoResgatePagamento();
    });
  }
  if (modalDescontoEl) {
    modalDesconto = new bootstrap.Modal(modalDescontoEl);
    modalDescontoEl.addEventListener('hidden.bs.modal', () => {
      if (retornoPagamentoModalDesconto && modalPagamento) {
        modalPagamento.show();
      }
      retornoPagamentoModalDesconto = false;
    });
  }
  if (btnAbrirDesconto) {
    btnAbrirDesconto.addEventListener('click', abrirModalDesconto);
    atualizarBadgeDesconto();
  }
  if (descontoToggle) {
    descontoToggle.addEventListener('click', e => {
      const btn = e.target.closest('.pdv-discount-pill');
      if (!btn) return;
      definirTipoDescontoModal(btn.dataset.type || 'valor');
      atualizarPreviewDescontoModal();
    });
  }
  if (descontoValorModal) {
    /* máscara monetária no campo de desconto */
    descontoValorModal.addEventListener('keydown', function(e){
      if (!/^\d$/.test(e.key) && !['Backspace','Delete','Tab','Escape','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
        e.preventDefault();
      }
    });
    descontoValorModal.addEventListener('input', function(){
      let digits = this.value.replace(/\D/g,'');
      let num = parseInt(digits,10)||0;
      if(num>9999999) num=9999999;
      const c=String(num).padStart(3,'0');
      const parte=c.slice(-2);
      const reais=(c.slice(0,-2).replace(/^0+/,'')||'0').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
      this.value='R$ '+reais+','+parte;
      const valorNum = num/100;
      this.dataset.valorNum=String(valorNum);
      /* validação: desconto maior que o total */
      const aviso = document.getElementById('descontoAviso');
      const btnAplicar = document.getElementById('descontoAplicar');
      const totalAtual = total||0;
      let ultrapassou = false;
      if(descontoTipoSelecionado==='percent'){
        const descCalc = totalAtual*(valorNum/100);
        ultrapassou = descCalc > totalAtual;
      } else {
        ultrapassou = valorNum > totalAtual;
      }
      if(aviso) aviso.classList.toggle('d-none', !ultrapassou);
      if(btnAplicar) btnAplicar.disabled = ultrapassou;
      atualizarPreviewDescontoModal();
    });
    descontoValorModal.addEventListener('focus', function(){ this.select(); });
    descontoValorModal.addEventListener('input', atualizarPreviewDescontoModal);
  }
  if (descontoLimpar) {
    descontoLimpar.addEventListener('click', () => {
      if (descontoValorModal) descontoValorModal.value = '';
      definirTipoDescontoModal('valor');
      atualizarPreviewDescontoModal();
      if (descontoTipo) descontoTipo.value = 'valor';
      if (descontoValor) descontoValor.value = '0';
      if (cupomCodigo && cupomCodigo.value) {
        limparCupom('Cupom removido.');
      }
      atualizarTotal();
      atualizarResumoPagamentoModal();
      atualizarBadgeDesconto();
      if (modalDesconto) modalDesconto.hide();
    });
  }
  if (descontoAplicar) {
    descontoAplicar.addEventListener('click', aplicarDescontoModal);
  }
  /* botão × para remover desconto concedido */
  const btnRemoverDesconto = document.getElementById('btnRemoverDesconto');
  if (btnRemoverDesconto) {
    btnRemoverDesconto.addEventListener('click', () => {
      if (descontoTipo) descontoTipo.value = 'valor';
      if (descontoValor) descontoValor.value = '0';
      if (descontoValorModal) { descontoValorModal.value = ''; descontoValorModal.dataset.valorNum = '0'; }
      atualizarTotal();
      atualizarResumoPagamentoModal();
      atualizarBadgeDesconto();
      atualizarDescontoConcedidoLinha();
    });
  }
  if (cupomAplicar) {
    cupomAplicar.addEventListener('click', aplicarCupomCodigo);
  }
  if (cupomInput) {
    cupomInput.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      aplicarCupomCodigo();
    });
  }
  if (cupomResumoSelect) {
    const syncCupomResumoState = () => {
      if (!cupomResumoContainer) return;
      cupomResumoContainer.classList.toggle('is-active', document.activeElement === cupomResumoSelect);
    };
    cupomResumoSelect.addEventListener('focus', syncCupomResumoState);
    cupomResumoSelect.addEventListener('blur', syncCupomResumoState);
    cupomResumoSelect.addEventListener('change', () => {
      const codigo = (cupomResumoSelect.value || '').trim().toUpperCase();
      if (!codigo) {
        if (cupomCodigo && cupomCodigo.value) {
          limparCupom('Cupom removido.');
          if (descontoTipo) descontoTipo.value = 'valor';
          if (descontoValor) descontoValor.value = '0';
          if (descontoValorModal) descontoValorModal.value = '';
          atualizarTotal();
          atualizarResumoPagamentoModal();
          atualizarBadgeDesconto();
        }
        if (cupomInput) cupomInput.value = '';
        return;
      }
      if (cupomInput) cupomInput.value = codigo;
      aplicarCupomCodigo();
    });
  }
  if (cupomRemover) {
    cupomRemover.addEventListener('click', () => {
      if (cupomCodigo && cupomCodigo.value) {
        limparCupom('Cupom removido.');
      }
      if (descontoTipo) descontoTipo.value = 'valor';
      if (descontoValor) descontoValor.value = '0';
      if (descontoValorModal) descontoValorModal.value = '';
      atualizarTotal();
      atualizarBadgeDesconto();
    });
  }
  if (pagamentoOpcoes) {
    pagamentoOpcoes.addEventListener('click', e => {
      const btn = e.target.closest('.pdv-payment-option');
      if (!btn || btn.classList.contains('disabled')) return;
      const forma = btn.dataset.pay;
      if (!forma) return;
      /* Desconto: só abre o modal, não registra como forma de pagamento */
      if (forma === 'desconto') {
        abrirModalDesconto();
        return;
      }
      if (forma === 'resgate') {
        pagamentosSelecionados = ['resgate'];
        atualizarPagamentoSelecionado();
        return;
      }
      if (forma === 'fiado') {
        pagamentosSelecionados = ['fiado'];
        atualizarPagamentoSelecionado();
        return;
      }
      if (pagamentosSelecionados.includes('fiado')) {
        pagamentosSelecionados = pagamentosSelecionados.filter(p => p !== 'fiado');
      }
      if (pagamentosSelecionados.includes('resgate')) {
        pagamentosSelecionados = pagamentosSelecionados.filter(p => p !== 'resgate');
      }
      if (pagamentosSelecionados.includes(forma)) {
        pagamentosSelecionados = pagamentosSelecionados.filter(p => p !== forma);
      } else if (pagamentosSelecionados.length < 2) {
        pagamentosSelecionados.push(forma);
      } else {
        pagamentosSelecionados = [pagamentosSelecionados[0], forma];
      }
      atualizarPagamentoSelecionado();
      if (pagamentosSelecionados.includes('dinheiro')) {
        abrirModalTroco();
      }
    });
  }

  if (pagamentoRegistradosLista) {
    pagamentoRegistradosLista.addEventListener('click', e => {
      const btn = e.target.closest('.pdv-payment-registered-remove');
      if (!btn) return;
      const idx = parseInt(btn.dataset.remove || '0', 10);
      if (!Number.isNaN(idx)) {
        pagamentosSelecionados.splice(idx, 1);
        atualizarPagamentoSelecionado();
      }
    });
  }
  if (pagamentoValorPago) {
    pagamentoValorPago.addEventListener('input', atualizarResumoPagamentoModal);
  }
  if (pagamentoSplitValor1) {
    pagamentoSplitValor1.addEventListener('input', () => {
      if (valorPagamento1) valorPagamento1.value = pagamentoSplitValor1.value;
      atualizarResumoPagamentoModal();
      atualizarListaPagamentosRegistrados();
    });
  }
  if (pagamentoSplitValor2) {
    pagamentoSplitValor2.addEventListener('input', () => {
      if (valorPagamento2) valorPagamento2.value = pagamentoSplitValor2.value;
      atualizarResumoPagamentoModal();
      atualizarListaPagamentosRegistrados();
    });
  }
  if (btnPagamentoFinalizar) {
    btnPagamentoFinalizar.addEventListener('click', () => {
      if (pagamentosSelecionados.length === 0) {
        mostrarToast('Selecione uma forma de pagamento', 'warn');
        return;
      }
      const resgateSelecionado = pagamentosSelecionados.length === 1 && pagamentosSelecionados[0] === 'resgate';
      if (resgateSelecionado) {
        if (!podeUsarResgatePagamento()) {
          mostrarToast('Resgate indisponivel para este pedido.', 'warn');
          return;
        }
        if (pagamentoSplitValor1) pagamentoSplitValor1.value = '0';
        if (valorPagamento1) valorPagamento1.value = '0';
        sincronizarPagamentoModal();
        if (modalPagamento) modalPagamento.hide();
        salvarPedido();
        return;
      }
      const fiadoSelecionado = pagamentosSelecionados.length === 1 && pagamentosSelecionados[0] === 'fiado';
      if (fiadoSelecionado) {
        if (!clienteIdInput || !clienteIdInput.value) {
          mostrarToast('Selecione um cliente para registrar fiado.', 'warn');
          return;
        }
        if (pagamentoSplitValor1) pagamentoSplitValor1.value = total.toFixed(2);
        if (valorPagamento1) valorPagamento1.value = total.toFixed(2);
        sincronizarPagamentoModal();
        if (modalPagamento) modalPagamento.hide();
        salvarPedido();
        return;
      }
      if (pagamentosSelecionados.length === 1) {
        const valor = parseFloat((pagamentoSplitValor1 && pagamentoSplitValor1.value) || 0);
        if (valor <= 0) {
          mostrarToast('Informe o valor do pagamento', 'warn');
          return;
        }
        if (Math.abs(valor - total) > 0.01) {
          mostrarToast('O valor informado precisa ser igual ao total', 'warn');
          return;
        }
      }
      if (pagamentosSelecionados.length === 2) {
        const valor1 = parseFloat((pagamentoSplitValor1 && pagamentoSplitValor1.value) || 0);
        const valor2 = parseFloat((pagamentoSplitValor2 && pagamentoSplitValor2.value) || 0);
        const totalPag = valor1 + valor2;
        if (valor1 <= 0 || valor2 <= 0) {
          mostrarToast('Informe o valor das duas formas de pagamento', 'warn');
          return;
        }
        if (Math.abs(totalPag - total) > 0.01) {
          mostrarToast('A soma dos pagamentos precisa ser igual ao total', 'warn');
          return;
        }
      }
      const dinheiroAplicado = obterValorDinheiroAplicado();
      if (dinheiroAplicado > 0) {
        if (dinheiroRecebido <= 0) {
          dinheiroRecebido = dinheiroAplicado;
        }
        if (dinheiroRecebido + 0.0001 < dinheiroAplicado) {
          mostrarToast('Valor em dinheiro insuficiente', 'warn');
          return;
        }
      }
      sincronizarPagamentoModal();
      if (modalPagamento) modalPagamento.hide();
      salvarPedido();
    });
  }

  modalTrocoEl = document.getElementById('modalTroco');
  trocoValorInput = document.getElementById('trocoValorInput');
  trocoTotalTexto = document.getElementById('trocoTotalTexto');
  trocoResumoLinha = document.getElementById('trocoResumoLinha');
  trocoResumoLabel = document.getElementById('trocoResumoLabel');
  trocoCalculadoTexto = document.getElementById('trocoCalculadoTexto');
  trocoNaoPreciso = document.getElementById('trocoNaoPreciso');
  trocoContinuar = document.getElementById('trocoContinuar');
  if (modalTrocoEl) {
    modalTroco = new bootstrap.Modal(modalTrocoEl);
    modalTrocoEl.addEventListener('hidden.bs.modal', () => {
      if (retornoPagamentoModal && modalPagamento) {
        modalPagamento.show();
      }
      retornoPagamentoModal = false;
    });
  }
  if (trocoValorInput) {
    trocoValorInput.addEventListener('input', atualizarTrocoModal);
  }
  if (trocoNaoPreciso) {
    trocoNaoPreciso.addEventListener('click', () => {
      const aplicado = obterValorDinheiroAplicado() || total;
      if (trocoValorInput) {
        trocoValorInput.value = aplicado.toFixed(2);
      }
      definirValorDinheiro(aplicado);
      atualizarTrocoModal();
      atualizarResumoPagamentoModal();
      atualizarTotal();
      if (modalTroco) modalTroco.hide();
    });
  }
  if (trocoContinuar) {
    trocoContinuar.addEventListener('click', () => {
      const valor = parseFloat((trocoValorInput && trocoValorInput.value) || 0);
      if (valor <= 0) {
        mostrarToast('Informe a quantia recebida', 'warn');
        return;
      }
      const aplicado = obterValorDinheiroAplicado() || total;
      if (aplicado <= 0) {
        mostrarToast('Informe o valor do dinheiro no pagamento', 'warn');
        return;
      }
      if (valor + 0.0001 < aplicado) {
        mostrarToast('Valor insuficiente para cobrir o dinheiro', 'warn');
        return;
      }
      definirValorDinheiro(valor);
      atualizarTrocoModal();
      atualizarResumoPagamentoModal();
      atualizarTotal();
      retornoPagamentoModal = true;
      if (modalTroco) modalTroco.hide();
    });
  }
  if (entregaClienteBusca && entregaListaClientes) {
    const mostrarRecentes = () => {
      const recentes = clientesRecentes(5);
      renderListaClientes(entregaListaClientes, recentes, selecionarCliente);
    };
    entregaClienteBusca.addEventListener('input', () => {
      const masked = aplicarMascaraTelefoneBusca(entregaClienteBusca.value);
      if (masked !== entregaClienteBusca.value) {
        entregaClienteBusca.value = masked;
      }
      const resultados = filtrarClientes(entregaClienteBusca.value).slice(0, 5);
      renderListaClientes(entregaListaClientes, resultados, selecionarCliente);
      marcarClienteEntregaComoNovo();
    });

    entregaClienteBusca.addEventListener('focus', () => {
      if (!entregaClienteBusca.value.trim()) {
        mostrarRecentes();
      }
    });

    entregaClienteBusca.addEventListener('click', () => {
      if (!entregaClienteBusca.value.trim()) {
        mostrarRecentes();
      }
    });

    entregaClienteBusca.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    });

    if (entregaClienteRecentesBtn) {
      entregaClienteRecentesBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (!entregaListaClientes.classList.contains('d-none')) {
          entregaListaClientes.classList.add('d-none');
          return;
        }
        mostrarRecentes();
      });
    }
  }
  if (entregaClienteNome) {
    entregaClienteNome.addEventListener('input', () => {
      entregaClienteNome.classList.remove('is-invalid');
      if (entregaClienteNomeErro) entregaClienteNomeErro.textContent = '';
      marcarClienteEntregaComoNovo();
    });
  }
  if (entregaClienteTelefone) {
    entregaClienteTelefone.addEventListener('input', () => {
      entregaClienteTelefone.value = aplicarMascaraTelefone(entregaClienteTelefone.value);
      entregaClienteTelefone.classList.remove('is-invalid');
      if (entregaClienteTelefoneErro) entregaClienteTelefoneErro.textContent = '';
      marcarClienteEntregaComoNovo();
    });
  }

  editItemNome = document.getElementById('editItemNome');
  editItemPreco = document.getElementById('editItemPreco');
  editItemQtd = document.getElementById('editItemQtd');
  editItemObs = document.getElementById('editItemObs');
  editItemSalvar = document.getElementById('editItemSalvar');
  editItemPlus = document.getElementById('editItemPlus');
  editItemMinus = document.getElementById('editItemMinus');
  editItemProdutoId = document.getElementById('editItemProdutoId');
  editItemDetalhesBtn = document.getElementById('editItemDetalhesBtn');
  detItemNome = document.getElementById('detItemNome');
  detItemObs = document.getElementById('detItemObs');
  detItemSalvar = document.getElementById('detItemSalvar');

  if (editItemPlus) {
    editItemPlus.addEventListener('click', () => ajustarQtdModal(1));
  }
  if (editItemMinus) {
    editItemMinus.addEventListener('click', () => ajustarQtdModal(-1));
  }
  if (editItemSalvar) {
    editItemSalvar.addEventListener('click', salvarEdicaoItem);
  }
  if (editItemDetalhesBtn) {
    editItemDetalhesBtn.addEventListener('click', abrirModalDetalhesItem);
  }
  if (detItemSalvar) {
    detItemSalvar.addEventListener('click', salvarDetalhesItem);
  }

  if (entregaRuaModal) {
    entregaRuaModal.addEventListener('input', syncEntregaModalToForm);
  }
  if (entregaNumeroModal) {
    entregaNumeroModal.addEventListener('input', () => {
      syncEntregaModalToForm();
      aplicarTaxaEntregaAutomatica();
      atualizarTotal();
    });
  }
  if (entregaBairroModal) {
    entregaBairroModal.addEventListener('input', () => {
      syncEntregaModalToForm();
    });
  }
  if (entregaCidadeModal) {
    entregaCidadeModal.addEventListener('input', syncEntregaModalToForm);
  }
  if (entregaCepModal) {
    entregaCepModal.addEventListener('input', () => {
      entregaCepModal.value = aplicarMascaraCep(entregaCepModal.value);
      syncEntregaModalToForm();
      agendarBuscaCep(entregaCepModal.value, 'modal');
    });
  }
  if (entregaDistanciaKm) {
    entregaDistanciaKm.addEventListener('input', () => {
      syncEntregaModalToForm();
    });
  }
  if (entregaComplementoModal) {
    entregaComplementoModal.addEventListener('input', syncEntregaModalToForm);
  }
  if (entregaTaxaEditar) {
    entregaTaxaEditar.addEventListener('change', () => {
      if (!entregaTaxaValor) return;
      entregaTaxaValor.classList.toggle('d-none', !entregaTaxaEditar.checked);
      if (entregaTaxaInfo) {
        entregaTaxaInfo.classList.toggle('is-editing', entregaTaxaEditar.checked);
      }
      if (taxaEditadaInput) {
        taxaEditadaInput.value = entregaTaxaEditar.checked ? '1' : '0';
      }
      if (!entregaTaxaEditar.checked) {
        atualizarTaxaPorBairro();
      } else if (entregaTaxaValor) {
        entregaTaxaValor.value = taxaEntregaInput.value || '';
      }
    });
  }
  if (entregaTaxaValor) {
    entregaTaxaValor.addEventListener('input', () => {
      if (entregaTaxaEditar && entregaTaxaEditar.checked) {
        taxaEntregaInput.value = entregaTaxaValor.value || '0';
        if (entregaTaxaLabel) {
          entregaTaxaLabel.textContent = formatarDinheiro(taxaEntregaInput.value || 0);
        }
        atualizarTotal();
      }
    });
  }
  if (entregaContinuar) {
    entregaContinuar.addEventListener('click', continuarEntregaModal);
  }
});



function salvarCliente() {
  const nome = clienteNomeInput ? clienteNomeInput.value : '';
  const telefone = clienteTelefoneInput ? clienteTelefoneInput.value : '';
  const endereco = clienteEnderecoInput ? clienteEnderecoInput.value : '';

  if (!nome || !telefone) return;

  fetch('api/cliente_salvar.php', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ nome, telefone, endereco })
  })
  .then(r => r.json())
  .then(res => {
    if (res.ok) {
      const novo = { id: res.id, nome, telefone, endereco, cashback_saldo: 0, pontos: 0 };
      clientes.push(novo);

      inputBusca.value = nome;
      clienteIdInput.value = res.id;

      atualizarDetalhesCliente(nome, telefone, endereco || '-');
      atualizarResumoCliente(nome, telefone);
      atualizarCashbackSaldoCliente(0);
      atualizarCashbackValidade('');
      atualizarPontosSaldoCliente(0);
      atualizarAvisoPontosCliente();
      mostrarClienteSelecionado();
      ocultarListaClientesPrincipal();
      if (clienteModalBusca) clienteModalBusca.value = nome;

      if (clienteNomeInput) clienteNomeInput.value = '';
      if (clienteTelefoneInput) clienteTelefoneInput.value = '';
      if (clienteEnderecoInput) clienteEnderecoInput.value = '';

      carregarDadosCliente(res.id);

      const modalEl = document.getElementById('modalCliente');
      if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      }
      focarProdutoBusca();
    }
  });
}

const el = id => document.getElementById(id);

if (btnClienteDetalhe) {
  btnClienteDetalhe.addEventListener('click', e => {
    e.preventDefault();
    abrirModalEntrega();
  });
}
if (btnClienteLimpar) {
  btnClienteLimpar.addEventListener('click', limparClienteSelecionado);
}
if (btnEntregaEditar) {
  btnEntregaEditar.addEventListener('click', abrirModalEntrega);
}
if (btnEntregaLimpar) {
  btnEntregaLimpar.addEventListener('click', () => {
    if (enderecoRua) enderecoRua.value = '';
    if (enderecoNumero) enderecoNumero.value = '';
    if (enderecoBairro) enderecoBairro.value = '';
    if (enderecoCidade) enderecoCidade.value = '';
    if (enderecoCep) enderecoCep.value = '';
    if (enderecoComplemento) enderecoComplemento.value = '';
    if (enderecoDistancia) enderecoDistancia.value = '';
    if (enderecoHidden) enderecoHidden.value = '';
    if (enderecoPreview) enderecoPreview.textContent = 'Endereco incompleto';
    if (entregaRuaModal) entregaRuaModal.value = '';
    if (entregaNumeroModal) entregaNumeroModal.value = '';
    if (entregaBairroModal) entregaBairroModal.value = '';
    if (entregaCidadeModal) entregaCidadeModal.value = '';
    if (entregaCepModal) entregaCepModal.value = '';
    if (entregaDistanciaKm) entregaDistanciaKm.value = '';
    if (entregaComplementoModal) entregaComplementoModal.value = '';
    taxaEntregaInput.value = '0.00';
    if (entregaTaxaValor) entregaTaxaValor.value = taxaEntregaInput.value;
    if (entregaTaxaLabel) entregaTaxaLabel.textContent = formatarDinheiro(taxaEntregaInput.value || 0);
    atualizarEnderecoResumo();
    atualizarEntregaResumo();
    atualizarTotal();
  });
}

function atualizarResumoCliente(nome, telefone){
  if (clienteResumoNome) clienteResumoNome.textContent = nome || '-';
  if (clienteResumoTelefone) {
    clienteResumoTelefone.textContent = telefone ? ` - ${telefone}` : '';
  }
}

function atualizarCashbackSaldoCliente(saldo, saldoTotal, carenciaHoras){
  clienteCashbackSaldo = Number(saldo || 0);
  const total = Number(saldoTotal !== undefined ? saldoTotal : saldo || 0);
  const horas = Number(carenciaHoras || 12);
  const emCarencia = total - clienteCashbackSaldo;
  const notaCarencia = emCarencia > 0.009
    ? ` (+${formatarDinheiro(emCarencia)} em carência, libera em até ${horas}h)`
    : '';
  if (cashbackUsoLabel) {
    cashbackUsoLabel.textContent = `Usar cashback (${formatarDinheiro(clienteCashbackSaldo)})${notaCarencia}`;
  }
  if (cashbackResumoActionValor) {
    cashbackResumoActionValor.textContent = formatarDinheiro(clienteCashbackSaldo);
  }
  const habilitar = clienteCashbackSaldo > 0;
  if (cashbackUsarToggle) {
    cashbackUsarToggle.disabled = !habilitar;
    if (!habilitar) cashbackUsarToggle.checked = false;
  }
  if (cashbackUsadoInput && !habilitar) cashbackUsadoInput.value = '0';
  if (!habilitar) cashbackValorSolicitado = 0;
  if (cashbackResumoActionWrap) {
    cashbackResumoActionWrap.classList.toggle('d-none', !habilitar);
  }
  if (cashbackResumoAction) {
    cashbackResumoAction.classList.toggle('is-active', !!(cashbackUsarToggle && cashbackUsarToggle.checked && habilitar));
  }
  atualizarTotal();
}

function atualizarCashbackValidade(expiraEm){
  clienteCashbackExpiraEm = expiraEm || '';
  if (cashbackModalValidade) {
    cashbackModalValidade.textContent = clienteCashbackExpiraEm ? `Válido até ${formatarDataHumana(clienteCashbackExpiraEm)}` : '';
    cashbackModalValidade.classList.toggle('d-none', !clienteCashbackExpiraEm);
  }
}

function obterPontosDisponiveis(){
  return Math.max(0, Number(clientePontosSaldo || 0));
}

function calcularPontosResgateAtual(excluirRow = null){
  let total = 0;
  document.querySelectorAll('#listaProdutos .pdv-cart-row').forEach(row => {
    if (excluirRow && row === excluirRow) return;
    const usarInput = row.querySelector('[name="usar_pontos[]"]');
    if (!usarInput || usarInput.value !== '1') return;
    const qtdInput = row.querySelector('[name="qtd[]"]');
    const qtd = qtdInput ? parseInt(qtdInput.value, 10) || 0 : 0;
    const custo = parseInt(row.dataset.pontosCusto || '0', 10) || 0;
    if (qtd > 0 && custo > 0) {
      total += custo * qtd;
    }
  });
  return total;
}

function validarResgateLinha(row, novaQtd){
  if (!row || !clubePontosAtivo) return false;
  const custo = parseInt(row.dataset.pontosCusto || '0', 10) || 0;
  if (custo <= 0) return false;
  if (!clienteIdInput || !clienteIdInput.value) {
    mostrarToast('Selecione um cliente para usar pontos.', 'warn');
    return false;
  }
  const pontosDisponiveis = obterPontosDisponiveis();
  const outros = calcularPontosResgateAtual(row);
  const pontosNecessarios = outros + (custo * (novaQtd || 0));
  if (pontosNecessarios > pontosDisponiveis) {
    mostrarToast(`Pontos insuficientes. Saldo: ${pontosDisponiveis} pts.`, 'warn');
    return false;
  }
  return true;
}

function aplicarResgateLinha(row, usar){
  if (!row) return;
  const usarInput = row.querySelector('[name="usar_pontos[]"]');
  const precoInput = row.querySelector('[name="preco[]"]');
  const precoBase = row.dataset.precoBase !== undefined
    ? parseFloat(row.dataset.precoBase || 0)
    : (precoInput ? parseFloat(precoInput.value || 0) : 0);

  if (row.dataset.precoBase === undefined) {
    row.dataset.precoBase = Number(precoBase || 0).toFixed(2);
  }

  if (usar) {
    if (precoInput) precoInput.value = '0';
    if (usarInput) usarInput.value = '1';
    row.dataset.usaPontos = '1';
  } else {
    if (precoInput) precoInput.value = row.dataset.precoBase || String(precoBase || 0);
    if (usarInput) usarInput.value = '0';
    row.dataset.usaPontos = '0';
  }
}

function ajustarResgatesPorSaldo(){
  const saldo = obterPontosDisponiveis();
  const totalAtual = calcularPontosResgateAtual();
  if (totalAtual <= saldo) return;
  document.querySelectorAll('#listaProdutos .pdv-cart-row').forEach(row => {
    const usarInput = row.querySelector('[name="usar_pontos[]"]');
    if (usarInput && usarInput.value === '1') {
      aplicarResgateLinha(row, false);
    }
  });
  atualizarTotal();
  atualizarResumoItens();
  mostrarToast('Resgates removidos: saldo de pontos insuficiente.', 'warn');
}

function atualizarPontosSaldoCliente(saldo){
  clientePontosSaldo = Number(saldo || 0);
  if (clientePontosSaldoEl) {
    clientePontosSaldoEl.textContent = `${Math.max(0, clientePontosSaldo)} pts`;
  }
  if (pontosSaldoWrap) {
    pontosSaldoWrap.classList.toggle('d-none', !clubePontosAtivo || Math.max(0, clientePontosSaldo) <= 0);
  }
  if (clientePontosSaldoModal) {
    clientePontosSaldoModal.textContent = `${Math.max(0, clientePontosSaldo)} pts`;
  }
  if (pontosSaldoModalWrap) {
    pontosSaldoModalWrap.classList.toggle('d-none', !clubePontosAtivo);
  }
  if (clientePontosSaldoSelect) {
    clientePontosSaldoSelect.textContent = `${Math.max(0, clientePontosSaldo)} pts`;
  }
  if (pontosSaldoSelectWrap) {
    pontosSaldoSelectWrap.classList.toggle('d-none', !clubePontosAtivo);
  }
  atualizarBotoesResgateCard();
  ajustarResgatesPorSaldo();
}

function atualizarAvisoPontosCliente(){
  if (!avisoPontosCliente) return;
  const temCliente = clienteIdInput && clienteIdInput.value;
  const deveMostrar = clubePontosAtivo && temProdutosComPontos && !temCliente;
  avisoPontosCliente.classList.toggle('d-none', !deveMostrar);
}

function atualizarBotoesResgateCard(){
  const saldo = obterPontosDisponiveis();
  const temCliente = clienteIdInput && clienteIdInput.value;
  document.querySelectorAll('.pdv-product-card').forEach(card => {
    const btn = card.querySelector('.pdv-product-resgate-btn');
    const custo = parseInt(card.dataset.pontosCusto || '0', 10) || 0;
    const ganho = parseInt(card.dataset.pontosGanho || '0', 10) || 0;
    const temPontos = custo > 0 || ganho > 0;
    card.classList.toggle('has-pontos', temPontos && clubePontosAtivo);
    card.dataset.saldoPontos = clubePontosAtivo ? String(saldo) : '0';
    if (!btn) return;
    let tooltip = '';
    let desabilitar = false;
    if (!clubePontosAtivo || custo <= 0) {
      desabilitar = true;
      tooltip = 'Resgate indisponivel';
    } else if (!temCliente) {
      desabilitar = true;
      tooltip = 'Selecione cliente';
    } else if (saldo < custo) {
      desabilitar = true;
      tooltip = 'Saldo insuficiente';
    } else {
      desabilitar = false;
      tooltip = `Resgatar ${custo} pts`;
    }
    btn.disabled = desabilitar;
    btn.dataset.tooltip = tooltip;
  });
}

function obterClientePorId(id){
  if (!id) return null;
  return clientes.find(c => String(c.id) === String(id)) || null;
}

function preencherModalCliente(c){
  if (!c) return;
  if (clienteModalBusca) clienteModalBusca.value = c.nome || '';
  if (clienteNomeInput) clienteNomeInput.value = c.nome || '';
  if (clienteTelefoneInput) clienteTelefoneInput.value = aplicarMascaraTelefone(c.telefone || '');
}

function mostrarClienteSelecionado(){
  if (retiradaBuscaWrap) retiradaBuscaWrap.classList.add('d-none');
  if (cardInfo) cardInfo.classList.remove('d-none');
}

function marcarClienteComoNovo(){
  if (clienteIdInput && clienteIdInput.value) {
    clienteIdInput.value = '';
    if (retiradaBuscaWrap) retiradaBuscaWrap.classList.remove('d-none');
    if (cardInfo) cardInfo.classList.add('d-none');
  }
  atualizarAvisoPontosCliente();
}

function limparClienteSelecionado(){
  if (clienteIdInput) clienteIdInput.value = '';
  if (inputBusca) inputBusca.value = '';
  ocultarListaClientesPrincipal();
  if (retiradaBuscaWrap) {
    const deveMostrar = tipoPedido && tipoPedido.value !== 'entrega';
    retiradaBuscaWrap.classList.toggle('d-none', !deveMostrar);
  }
  if (cardInfo) cardInfo.classList.add('d-none');
  atualizarResumoCliente('-', '');
  atualizarDetalhesCliente('-', '-', '-');
  atualizarCashbackSaldoCliente(0);
  atualizarCashbackValidade('');
  atualizarPontosSaldoCliente(0);
  atualizarAvisoPontosCliente();
  if (clienteModalBusca) clienteModalBusca.value = '';
  if (clienteNomeInput) clienteNomeInput.value = '';
  if (clienteTelefoneInput) clienteTelefoneInput.value = '';
  if (entregaClienteBusca) entregaClienteBusca.value = '';
  if (entregaClienteNome) entregaClienteNome.value = '';
  if (entregaClienteTelefone) entregaClienteTelefone.value = '';
}

function validarCamposClienteModal(){
  let ok = true;
  const nome = clienteNomeInput ? clienteNomeInput.value.trim() : '';
  const telefone = clienteTelefoneInput ? clienteTelefoneInput.value.trim() : '';

  if (clienteNomeInput) {
    if (!nome) {
      clienteNomeInput.classList.add('is-invalid');
      ok = false;
    } else {
      clienteNomeInput.classList.remove('is-invalid');
    }
  }
  if (clienteTelefoneInput) {
    if (!telefone) {
      clienteTelefoneInput.classList.add('is-invalid');
      ok = false;
    } else {
      clienteTelefoneInput.classList.remove('is-invalid');
    }
  }

  if (!ok) {
    mostrarToast('Preencha nome e telefone do cliente.', 'warn');
  }
  return ok;
}

function selecionarClienteModal(c){
  if (!c) return;
  if (clienteIdInput) clienteIdInput.value = c.id;
  if (inputBusca) inputBusca.value = c.nome || '';
  preencherModalCliente(c);
  atualizarDetalhesCliente(c.nome, c.telefone, c.endereco || '-');
  if (c.endereco) {
    preencherEnderecoCliente(c.endereco);
  }
  atualizarResumoCliente(c.nome, c.telefone);
  atualizarCashbackSaldoCliente(c.cashback_saldo || 0);
  atualizarCashbackValidade('');
  atualizarPontosSaldoCliente(c.pontos || 0);
  atualizarAvisoPontosCliente();
  mostrarClienteSelecionado();
  if (listaClientesModal) listaClientesModal.classList.add('d-none');
  ocultarListaClientesPrincipal();
  if (entregaListaClientes) entregaListaClientes.classList.add('d-none');
  if (entregaClienteBusca) entregaClienteBusca.value = c.nome || '';
  if (entregaClienteNome) entregaClienteNome.value = c.nome || '';
  if (entregaClienteTelefone) entregaClienteTelefone.value = aplicarMascaraTelefone(c.telefone || '');
  carregarDadosCliente(c.id);
}

function continuarClienteModal(){
  const nome = clienteNomeInput ? clienteNomeInput.value.trim() : '';
  const telefone = clienteTelefoneInput ? clienteTelefoneInput.value.trim() : '';
  if (clienteIdInput && clienteIdInput.value) {
    if (!nome || !telefone) {
      mostrarToast('Selecione um cliente valido.', 'warn');
      return;
    }
    const modalEl = document.getElementById('modalCliente');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    return;
  }
  if (!validarCamposClienteModal()) return;
  salvarCliente();
}

function marcarClienteEntregaComoNovo(){
  if (clienteIdInput && clienteIdInput.value) {
    clienteIdInput.value = '';
    if (cardInfo) cardInfo.classList.add('d-none');
  }
  atualizarAvisoPontosCliente();
}

function montarEnderecoClienteEntrega(){
  const rua = enderecoRua.value.trim();
  const numero = enderecoNumero ? enderecoNumero.value.trim() : '';
  const bairro = enderecoBairro.value.trim();
  const cidade = enderecoCidade ? enderecoCidade.value.trim() : '';
  const cep = enderecoCep.value.trim();
  const complemento = enderecoComplemento.value.trim();

  const partes = [];
  if (rua) partes.push(numero ? `${rua}, ${numero}` : rua);
  if (bairro) partes.push(bairro);
  if (cidade) partes.push(cidade);
  if (cep) partes.push(cep);
  if (complemento) partes.push(complemento);
  return partes.join(', ');
}

function validarTelefoneEntrega(telefone){
  const digits = (telefone || '').replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}

function validarCamposEntregaCliente(){
  let ok = true;
  const nome = entregaClienteNome ? entregaClienteNome.value.trim() : '';
  const telefone = entregaClienteTelefone ? entregaClienteTelefone.value.trim() : '';

  if (entregaClienteNome) {
    if (!nome) {
      entregaClienteNome.classList.add('is-invalid');
      if (entregaClienteNomeErro) {
        entregaClienteNomeErro.textContent = 'Informe o nome do cliente.';
      }
      ok = false;
    } else {
      entregaClienteNome.classList.remove('is-invalid');
      if (entregaClienteNomeErro) entregaClienteNomeErro.textContent = '';
    }
  }

  if (entregaClienteTelefone) {
    if (!telefone) {
      entregaClienteTelefone.classList.add('is-invalid');
      if (entregaClienteTelefoneErro) {
        entregaClienteTelefoneErro.textContent = 'Informe o telefone do cliente.';
      }
      ok = false;
    } else if (!validarTelefoneEntrega(telefone)) {
      entregaClienteTelefone.classList.add('is-invalid');
      if (entregaClienteTelefoneErro) {
        entregaClienteTelefoneErro.textContent = 'Telefone invalido.';
      }
      ok = false;
    } else {
      entregaClienteTelefone.classList.remove('is-invalid');
      if (entregaClienteTelefoneErro) entregaClienteTelefoneErro.textContent = '';
    }
  }

  if (!ok) {
    mostrarToast('Preencha os dados do cliente corretamente.', 'warn');
  }
  return ok;
}

function salvarClienteEntrega(){
  const nome = entregaClienteNome ? entregaClienteNome.value.trim() : '';
  const telefone = entregaClienteTelefone ? entregaClienteTelefone.value.trim() : '';
  const endereco = montarEnderecoClienteEntrega();

  return fetch('api/cliente_salvar.php', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ nome, telefone, endereco })
  })
  .then(r => r.json())
  .then(res => {
    if (!res.ok) {
      mostrarToast('Nao foi possivel cadastrar o cliente.', 'warn');
      return false;
    }
    const novo = { id: res.id, nome, telefone, endereco };
    clientes.push(novo);
    selecionarCliente(novo);
    return true;
  })
  .catch(() => {
    mostrarToast('Erro ao cadastrar cliente.', 'warn');
    return false;
  });
}

function continuarEntregaModal(){
  if (!validarCamposEntregaCliente()) return;
  syncEntregaModalToForm();
  if (!clienteIdInput || !clienteIdInput.value) {
    return salvarClienteEntrega().then(ok => {
      if (!ok) return;
      atualizarEntregaResumo();
      if (modalEntrega) modalEntrega.hide();
    });
  }
  atualizarEntregaResumo();
  if (modalEntrega) modalEntrega.hide();
}

function atualizarDetalhesCliente(nome, telefone, endereco){
  if (nome !== null && nome !== undefined) {
    document.querySelectorAll('#infoNome').forEach(el => {
      el.textContent = nome || '-';
    });
    if (entregaClienteBusca) entregaClienteBusca.value = nome || '';
    if (entregaClienteNome) entregaClienteNome.value = nome || '';
  }
  if (telefone !== null && telefone !== undefined) {
    document.querySelectorAll('#infoTelefone').forEach(el => {
      el.textContent = telefone || '-';
    });
    if (entregaClienteTelefone) entregaClienteTelefone.value = aplicarMascaraTelefone(telefone || '');
  }
  if (endereco !== null && endereco !== undefined) {
    document.querySelectorAll('#infoEndereco').forEach(el => {
      el.textContent = endereco || '-';
    });
  }
}

function parseEnderecoTexto(endereco){
  if (!endereco) return {};
  let texto = endereco.trim();
  if (!texto) return {};

  const resultado = { rua: '', numero: '', bairro: '', cidade: '', cep: '', complemento: '' };

  const normalizarCep = (valor) => {
    if (!valor) return '';
    const cepLimpo = valor.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;
    }
    return valor.trim();
  };

  const tokens = texto.split(/\s\|\s|\s-\s/).map(p => p.trim()).filter(Boolean);
  const livres = [];

  tokens.forEach(token => {
    const lower = token.toLowerCase();
    const value = token.replace(/^(bairro|cidade|cep|complemento|numero)\s*[:\-]?\s*/i, '').trim();
    if (lower.startsWith('bairro')) {
      if (!resultado.bairro) resultado.bairro = value;
      return;
    }
    if (lower.startsWith('cidade')) {
      if (!resultado.cidade) resultado.cidade = value;
      return;
    }
    if (lower.startsWith('cep')) {
      if (!resultado.cep) resultado.cep = value;
      return;
    }
    if (lower.startsWith('complemento')) {
      if (!resultado.complemento) resultado.complemento = value;
      return;
    }
    if (lower.startsWith('numero')) {
      if (!resultado.numero) resultado.numero = value;
      return;
    }
    livres.push(token);
  });

  if (!resultado.cep) {
    const cepMatch = texto.match(/\b\d{5}-?\d{3}\b/);
    if (cepMatch) resultado.cep = cepMatch[0];
  }

  if (livres.length) resultado.rua = livres[0];
  if (!resultado.bairro && livres.length > 1) resultado.bairro = livres[1];
  if (!resultado.cidade && livres.length > 2) resultado.cidade = livres[2];
  if (!resultado.complemento && livres.length > 3) resultado.complemento = livres.slice(3).join(' - ');

  if (resultado.rua) {
    const partesRua = resultado.rua.split(',').map(p => p.trim()).filter(Boolean);
    if (partesRua.length >= 2) {
      const numeroParte = partesRua[1];
      const numeroMatch = numeroParte.match(/^(\d+[a-zA-Z]?)[\s\-\.]*(.*)$/);
      resultado.rua = partesRua[0];
      if (!resultado.numero && numeroMatch) {
        resultado.numero = numeroMatch[1];
      }
      const resto = numeroMatch ? numeroMatch[2].trim() : '';
      if (resto && !resultado.bairro) {
        resultado.bairro = resto;
      }
      if (!resultado.bairro && partesRua.length >= 3) {
        resultado.bairro = partesRua[2];
      }
    } else if (!resultado.numero) {
      const numeroMatch = resultado.rua.match(/(?:^|\s)(\d+[a-zA-Z]?)\s*$/);
      if (numeroMatch) {
        resultado.numero = numeroMatch[1];
        resultado.rua = resultado.rua.replace(numeroMatch[0], '').trim();
      }
    }
  }

  if (resultado.bairro && !resultado.cidade && resultado.bairro.includes(' - ')) {
    const subpartes = resultado.bairro.split(' - ').map(p => p.trim()).filter(Boolean);
    if (subpartes.length >= 2) {
      resultado.bairro = subpartes[0];
      resultado.cidade = subpartes[1];
    }
  }

  if (resultado.cidade) {
    resultado.cidade = resultado.cidade.split('/')[0].trim();
  }

  resultado.cep = normalizarCep(resultado.cep);

  return resultado;
}

function preencherEnderecoCliente(endereco, apenasSeVazio = false){
  if (!endereco) return;
  const jaPreenchido = [
    entregaRuaModal,
    entregaBairroModal,
    entregaCepModal
  ].some(el => el && el.value && el.value.trim());
  if (apenasSeVazio && jaPreenchido) return;

  const dados = parseEnderecoTexto(endereco);
  if (dados.rua) {
    if (entregaRuaModal) entregaRuaModal.value = dados.rua;
    if (enderecoRua) enderecoRua.value = dados.rua;
  }
  if (dados.numero) {
    if (entregaNumeroModal) entregaNumeroModal.value = dados.numero;
    if (enderecoNumero) enderecoNumero.value = dados.numero;
  }
  if (dados.bairro) {
    if (entregaBairroModal) entregaBairroModal.value = dados.bairro;
    if (enderecoBairro) enderecoBairro.value = dados.bairro;
  }
  if (dados.cidade) {
    if (entregaCidadeModal) entregaCidadeModal.value = dados.cidade;
    if (enderecoCidade) enderecoCidade.value = dados.cidade;
  }
  if (dados.cep) {
    const cepFormatado = aplicarMascaraCep(dados.cep);
    if (entregaCepModal) entregaCepModal.value = cepFormatado;
    if (enderecoCep) enderecoCep.value = cepFormatado;
    agendarBuscaCep(cepFormatado, 'form');
  }

  syncEntregaModalToForm();
  atualizarTaxaPorBairro();
  atualizarEntregaResumo();
}

function limparCarrinho(){
  document.getElementById('listaProdutos').innerHTML = '';
  atualizarTotal();
  atualizarEstoqueCarrinho();
}

function obterIdProdutoPorNome(nome){
  const alvo = normalizarTexto(nome);
  if (!alvo) return '';
  const card = Array.from(produtoCards).find(c => normalizarTexto(c.dataset.nome) === alvo);
  return card ? card.dataset.id : '';
}

  function repetirUltimoPedido(){
    if (!ultimoItensCliente.length) return;
    if (document.querySelectorAll('#listaProdutos .pdv-cart-row').length) {
      const ok = confirm('Deseja substituir os itens atuais pelo ultimo pedido?');
    if (!ok) return;
  }
  limparCarrinho();
  ultimoItensCliente.forEach(i => {
    const nomeProduto = i.produto_nome || i.nome || '';
    const idProduto = i.produto_id || i.id || obterIdProdutoPorNome(nomeProduto);
    const card = idProduto ? document.querySelector(`.pdv-product-card[data-id="${idProduto}"]`) : null;
    if (card) {
      const restante = obterEstoqueRestante(card);
      const qtdDesejada = i.quantidade || i.qtd || 0;
      if (restante <= 0) {
        mostrarToast(`Sem estoque para ${nomeProduto}.`, 'warn');
        return;
      }
      if (qtdDesejada > restante) {
        mostrarToast(`Estoque insuficiente para ${nomeProduto}. Disponivel: ${restante}.`, 'warn');
        return;
      }
    }
      const pontosCusto = card ? (parseInt(card.dataset.pontosCusto || '0', 10) || 0) : 0;
      inserirItemNoCarrinho(
        nomeProduto,
        i.quantidade || i.qtd,
        i.preco,
        i.observacoes || '',
        idProduto,
        '',
        pontosCusto
      );
    });
  }

  function ajustarEstoqueParaEdicao(itens){
    if (pedidoEdicaoAplicado || !itens || !itens.length) return;
    const ajustes = {};
    itens.forEach(i => {
      const produtoId = i.produto_id || i.id;
      const qtd = Number(i.quantidade || i.qtd || 0);
      if (!produtoId || qtd <= 0) return;
      ajustes[produtoId] = (ajustes[produtoId] || 0) + qtd;
    });
    Object.entries(ajustes).forEach(([id, qtd]) => {
      const card = document.querySelector(`.pdv-product-card[data-id="${id}"]`);
      if (!card) return;
      const base = parseInt(card.dataset.estoque || 0, 10) || 0;
      card.dataset.estoque = base + qtd;
    });
    pedidoEdicaoAplicado = true;
    atualizarEstoqueCarrinho();
  }

  function aplicarPedidoEdicao(dados){
    if (!dados || !dados.pedido) return;
    const pedido = dados.pedido || {};
    const itens = dados.itens || [];
    const pagamentos = dados.pagamentos || [];
    const tipo = (pedido.tipo || 'retirada').toLowerCase();

    const cliente = obterClientePorId(pedido.cliente_id);
    if (cliente) {
      selecionarClienteModal(cliente);
    } else {
      if (clienteIdInput) clienteIdInput.value = pedido.cliente_id || '';
      if (inputBusca) inputBusca.value = pedido.nome || '';
      atualizarDetalhesCliente(pedido.nome || '-', pedido.telefone || '-', pedido.endereco || '-');
      atualizarResumoCliente(pedido.nome || '-', pedido.telefone || '');
      mostrarClienteSelecionado();
    }

  if (tipoPedido) {
    tipoPedido.value = tipo;
    if (!tipoPedido.value && tipoPedido.options.length) {
      tipoPedido.value = tipoPedido.options[0].value;
    }
    toggleEntregaCampos(tipoPedido.value === 'entrega');
    atualizarSideDetalhes();
  }

    if (tipo === 'entrega') {
      if (taxaEntregaInput) taxaEntregaInput.value = Number(pedido.taxa_entrega || 0).toFixed(2);
      if (pedido.endereco_entrega) {
        preencherEnderecoCliente(pedido.endereco_entrega);
      }
      atualizarEnderecoResumo();
      atualizarEntregaResumo();
      syncEntregaFormToModal();
    }

    if (cupomCodigo) cupomCodigo.value = pedido.cupom || '';
    if (cupomInput && cupomCodigo) {
      cupomInput.value = cupomCodigo.value || '';
    }
    if (cupomResumoSelect && cupomCodigo) {
      cupomResumoSelect.value = cupomCodigo.value || '';
    }
    if (descontoTipo) descontoTipo.value = 'valor';
    if (descontoValor) descontoValor.value = Number(pedido.desconto || 0).toFixed(2);
    if (taxaMaquininhaPercent) {
      const base = Number(pedido.subtotal || 0) + Number(pedido.taxa_entrega || 0) - Number(pedido.desconto || 0);
      const taxa = Number(pedido.taxa_maquininha || 0);
      taxaMaquininhaPercent.value = base > 0 && taxa > 0
        ? ((taxa / base) * 100).toFixed(2)
        : '0';
    }

    if (pagamentos.length > 1) {
      pagamentoDividido.checked = true;
      atualizarVisibilidadePagamento();
      const p1 = pagamentos[0] || {};
      const p2 = pagamentos[1] || {};
      if (formaPagamento1) formaPagamento1.value = p1.forma || 'pix';
      if (valorPagamento1) valorPagamento1.value = Number(p1.valor || 0).toFixed(2);
      if (formaPagamento2) formaPagamento2.value = p2.forma || 'pix';
      if (valorPagamento2) valorPagamento2.value = Number(p2.valor || 0).toFixed(2);
    } else {
      pagamentoDividido.checked = false;
      if (formaPagamento) {
        formaPagamento.value = pedido.forma_pagamento || (pagamentos[0] && pagamentos[0].forma) || 'pix';
      }
      atualizarVisibilidadePagamento();
      if (formaPagamento && formaPagamento.value === 'dinheiro' && trocoInput) {
        trocoInput.value = pedido.valor_pago ? Number(pedido.valor_pago).toFixed(2) : '';
      }
    }
    atualizarTaxaMaquininhaVisivel();

    limparCarrinho();
    ajustarEstoqueParaEdicao(itens);
    itens.forEach(i => {
      const nomeProduto = i.produto_nome || i.nome || '';
      const qtdProduto = Number(i.quantidade || i.qtd || 0);
      const precoProduto = Number(i.preco || 0);
      const obsProduto = i.observacoes || '';
      const idProduto = i.produto_id || i.id || obterIdProdutoPorNome(nomeProduto);
      if (!nomeProduto || qtdProduto <= 0) return;
      const card = idProduto ? document.querySelector(`.pdv-product-card[data-id="${idProduto}"]`) : null;
      const pontosCusto = card ? (parseInt(card.dataset.pontosCusto || '0', 10) || 0) : 0;
      inserirItemNoCarrinho(nomeProduto, qtdProduto, precoProduto, obsProduto, idProduto, '', pontosCusto);
    });

    atualizarTotal();
    focarProdutoBusca();
  }

  function carregarPedidoEdicao(id){
    if (!id) return;
    fetch(`api/pedido_detalhe.php?pedido_id=${id}`)
      .then(r => r.json())
      .then(res => {
        if (!res || !res.ok) {
          mostrarToast('Pedido nao encontrado para edicao.', 'warn');
          return;
        }
        aplicarPedidoEdicao(res);
      })
      .catch(() => {
        mostrarToast('Nao foi possivel carregar o pedido.', 'warn');
      });
  }

function renderFavoritos(lista){
  const container = el('clienteFavoritos');
  if (!container) return;
  container.innerHTML = '';
  if (!lista || !lista.length) {
    container.innerHTML = '<span class="text-muted small">Sem favoritos</span>';
    return;
  }
  lista.forEach(f => {
    const chip = document.createElement('span');
    chip.className = 'pdv-chip';
    chip.textContent = `${f.produto_nome} (${f.total_qtd})`;
    container.appendChild(chip);
  });
}

function renderHistorico(lista){
  const container = el('clienteHistorico');
  if (!container) return;
  container.innerHTML = '';
  if (!lista || !lista.length) {
    container.innerHTML = '<span class="text-muted small">Sem historico</span>';
    return;
  }
  lista.forEach(p => {
    const linha = document.createElement('div');
    linha.className = 'pdv-history-item';
    const data = p.criado_em ? formatarDataHora(p.criado_em) : '';
    linha.innerHTML = `<span>#${p.id} ${p.tipo || ''} ${data}</span><strong>${formatarDinheiro(p.total)}</strong>`;
    container.appendChild(linha);
  });
}

function carregarDadosCliente(clienteId){
  fetch(`api/pdv_cliente_stats.php?cliente_id=${clienteId}`)
    .then(r => r.json())
    .then(d => {
      if (!d.ok) return;

      const stats = d.stats || {};
      const totalPedidosEl = el('clienteTotalPedidos');
      const ticketMedioEl = el('clienteTicketMedio');
      const ultimoPedidoEl = el('clienteUltimoPedido');

      if (totalPedidosEl) totalPedidosEl.textContent = stats.total_pedidos ?? 0;
      if (ticketMedioEl) ticketMedioEl.textContent = formatarDinheiro(stats.ticket_medio || 0);

      if (stats.ultimo_pedido) {
        const data = stats.ultimo_pedido.criado_em
          ? formatarDataHora(stats.ultimo_pedido.criado_em)
          : '';
        if (ultimoPedidoEl) {
          ultimoPedidoEl.textContent =
            `#${stats.ultimo_pedido.id} - ${formatarDinheiro(stats.ultimo_pedido.total)} ${data}`;
        }
      } else if (ultimoPedidoEl) {
        ultimoPedidoEl.textContent = '-';
      }

      if (stats.ultimo_endereco) {
        atualizarDetalhesCliente(null, null, stats.ultimo_endereco);
        preencherEnderecoCliente(stats.ultimo_endereco, true);
      }
      if (stats.cashback_saldo !== undefined) {
        const saldoLiberado = stats.cashback_saldo_liberado !== undefined ? stats.cashback_saldo_liberado : stats.cashback_saldo;
        atualizarCashbackSaldoCliente(saldoLiberado || 0, stats.cashback_saldo || 0, stats.cashback_carencia_horas);
      }
      atualizarCashbackValidade(stats.cashback_expira_em || '');
      const pontosSaldo = stats.pontos !== undefined ? stats.pontos : 0;
      atualizarPontosSaldoCliente(pontosSaldo || 0);

      ultimoItensCliente = d.ultimo_itens || [];
      const repetirBtn = el('btnRepetirPedido');
      if (repetirBtn) {
        repetirBtn.classList.toggle('d-none', !ultimoItensCliente.length);
        repetirBtn.onclick = repetirUltimoPedido;
      }

      renderFavoritos(d.favoritos || []);
      renderHistorico(d.historico || []);
    });
}

function filtrarClientes(termo){
  const texto = normalizarTexto(termo);
  if (!texto) return clientes.slice(0, 10);
  const termoTel = texto.replace(/\D/g, '');
  return clientes.filter(c => {
    const nome = normalizarTexto(c.nome || '');
    const tel = (c.telefone || '').replace(/\D/g, '');
    if (nome.includes(texto)) return true;
    if (termoTel && tel.includes(termoTel)) return true;
    return false;
  }).slice(0, 10);
}

function clientesRecentes(limit = 10){
  if (!Array.isArray(clientes)) return [];
  return clientes
    .slice()
    .sort((a, b) => {
      const da = a.ultimo_pedido ? new Date(a.ultimo_pedido.replace(' ', 'T')).getTime() : 0;
      const db = b.ultimo_pedido ? new Date(b.ultimo_pedido.replace(' ', 'T')).getTime() : 0;
      return db - da;
    })
    .slice(0, limit);
}

function atualizarEstadoSetaRecentesCliente(){
  if (!clienteBuscaRecentesBtn || !lista) return;
  const aberta = !lista.classList.contains('d-none');
  clienteBuscaRecentesBtn.classList.toggle('is-open', aberta);
  clienteBuscaRecentesBtn.setAttribute('aria-expanded', aberta ? 'true' : 'false');
  if (retiradaBuscaWrap) retiradaBuscaWrap.classList.toggle('is-open', aberta);
  if (aberta) posicionarListaClientesPrincipal();
}

function ocultarListaClientesPrincipal(){
  if (lista) lista.classList.add('d-none');
  if (lista) {
    lista.style.top = '0px';
    lista.style.left = '0px';
    lista.style.width = '';
  }
  atualizarEstadoSetaRecentesCliente();
}

function posicionarListaClientesPrincipal(){
  if (!lista || lista.classList.contains('d-none') || !clienteBuscaBox) return;
  const rect = clienteBuscaBox.getBoundingClientRect();
  const gap = 8;
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
  const spaceBelow = Math.max(120, viewportH - rect.bottom - 18);
  lista.style.left = `${Math.round(rect.left)}px`;
  lista.style.top = `${Math.round(rect.bottom + gap)}px`;
  lista.style.width = `${Math.round(rect.width)}px`;
  lista.style.maxHeight = `${Math.min(190, spaceBelow)}px`;
}

window.pdvBuscarClienteInput = function(inputEl){
  if (!inputEl) return;
  if (retiradaBuscaWrap) {
    retiradaBuscaExpandida = true;
    retiradaBuscaWrap.classList.remove('pdv-retirada-collapsed');
  }
  const masked = aplicarMascaraTelefoneBusca(inputEl.value);
  if (masked !== inputEl.value) {
    inputEl.value = masked;
  }
  const termo = String(inputEl.value || '').trim();
  if (!termo) {
    const recentes = clientesRecentes(5);
    renderListaClientes(lista, recentes, selecionarCliente);
    return;
  }
  const resultados = filtrarClientes(inputEl.value);
  renderListaClientes(lista, resultados, selecionarCliente);
};

function renderListaClientes(listaEl, resultados, onSelect){
  if (!listaEl) return;
  listaEl.innerHTML = '';
  if (!resultados.length) {
    const vazio = document.createElement('div');
    vazio.className = 'list-group-item text-muted';
    vazio.textContent = clientes && clientes.length
      ? 'Nenhum cliente encontrado.'
      : 'Nenhum cliente cadastrado.';
    listaEl.appendChild(vazio);
    listaEl.classList.remove('d-none');
    if (listaEl === lista) {
      atualizarEstadoSetaRecentesCliente();
      posicionarListaClientesPrincipal();
    }
    return;
  }
  resultados.forEach(c => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-group-item list-group-item-action';
    const tel = c.telefone ? aplicarMascaraTelefone(String(c.telefone)) : '';
    item.textContent = tel ? `${c.nome} - ${tel}` : `${c.nome}`;
    item.onclick = () => onSelect(c);
    listaEl.appendChild(item);
  });
  listaEl.classList.remove('d-none');
  if (listaEl === lista) {
    atualizarEstadoSetaRecentesCliente();
    posicionarListaClientesPrincipal();
  }
}

function selecionarCliente(c){
  if (!c) return;
  inputBusca.value = c.nome;
  clienteIdInput.value = c.id;
  atualizarDetalhesCliente(c.nome, c.telefone, c.endereco || '-');
  if (c.endereco) {
    preencherEnderecoCliente(c.endereco);
  }
  atualizarResumoCliente(c.nome, c.telefone);
  atualizarCashbackSaldoCliente(c.cashback_saldo || 0);
  atualizarCashbackValidade('');
  atualizarPontosSaldoCliente(c.pontos || 0);
  atualizarAvisoPontosCliente();
  mostrarClienteSelecionado();
  ocultarListaClientesPrincipal();
  if (entregaListaClientes) entregaListaClientes.classList.add('d-none');
  if (entregaClienteBusca) entregaClienteBusca.value = c.nome || '';
  if (entregaClienteNome) entregaClienteNome.value = c.nome || '';
  if (entregaClienteTelefone) entregaClienteTelefone.value = aplicarMascaraTelefone(c.telefone || '');
  if (clienteModalBusca) clienteModalBusca.value = c.nome || '';
  if (clienteNomeInput) clienteNomeInput.value = c.nome || '';
  if (clienteTelefoneInput) clienteTelefoneInput.value = aplicarMascaraTelefone(c.telefone || '');
  carregarDadosCliente(c.id);
  const modalEl = document.getElementById('modalCliente');
  const modalAberto = modalEl && modalEl.classList.contains('show');
  if (!modalAberto) {
    focarProdutoBusca();
  }
}

if (inputBusca) {
  inputBusca.addEventListener('input', () => {
    window.pdvBuscarClienteInput(inputBusca);
  });
  inputBusca.addEventListener('focus', () => {
    window.pdvBuscarClienteInput(inputBusca);
  });
}

if (clienteBuscaBox && inputBusca) {
  clienteBuscaBox.addEventListener('click', (e) => {
    if (e.target.closest('#clienteBuscaRecentesBtn')) return;
    inputBusca.focus();
  });
}

if (inputBusca) {
  inputBusca.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  });
}

if (clienteBuscaRecentesBtn) {
  clienteBuscaRecentesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (retiradaBuscaWrap) {
      retiradaBuscaExpandida = true;
      retiradaBuscaWrap.classList.remove('pdv-retirada-collapsed');
    }
    if (lista && !lista.classList.contains('d-none')) {
      ocultarListaClientesPrincipal();
      return;
    }
    const recentes = clientesRecentes(5);
    renderListaClientes(lista, recentes, selecionarCliente);
  });
}


document.addEventListener('click', e => {
  const resgateBtn = e.target.closest('.pdv-product-resgate-btn');
  if (resgateBtn) {
    e.preventDefault();
    e.stopPropagation();
    const card = resgateBtn.closest('.pdv-product-card');
    if (card) resgatarProdutoCard(card);
    return;
  }
  if (!e.target.closest('#clienteBusca') && !e.target.closest('#listaClientes') && !e.target.closest('#clienteBuscaRecentesBtn')) {
    ocultarListaClientesPrincipal();
  }
  if (!e.target.closest('#entregaClienteBusca') && !e.target.closest('#entregaListaClientes') && !e.target.closest('#entregaClienteRecentesBtn')) {
    if (entregaListaClientes) entregaListaClientes.classList.add('d-none');
  }
  if (!e.target.closest('#clienteModalBusca') && !e.target.closest('#listaClientesModal') && !e.target.closest('#clienteModalRecentesBtn')) {
    if (listaClientesModal) listaClientesModal.classList.add('d-none');
  }
});

document.addEventListener('focusin', e => {
  const alvo = e.target;
  if (alvo && alvo.id === 'clienteBusca' && window.pdvBuscarClienteInput) {
    window.pdvBuscarClienteInput(alvo);
  }
});
document.addEventListener('input', e => {
  const alvo = e.target;
  if (alvo && alvo.id === 'clienteBusca' && window.pdvBuscarClienteInput) {
    window.pdvBuscarClienteInput(alvo);
  }
});

window.addEventListener('resize', posicionarListaClientesPrincipal);
window.addEventListener('scroll', posicionarListaClientesPrincipal, true);
if (pdvSideEl) {
  pdvSideEl.addEventListener('scroll', posicionarListaClientesPrincipal, { passive: true });
}

atualizarEstadoSetaRecentesCliente();

if (modoEdicao) {
  window.addEventListener('load', () => carregarPedidoEdicao(pedidoEdicaoId));
}

definirFocoInicial();
atualizarAvisoPontosCliente();
atualizarBotoesResgateCard();



