function compartilharLoja(){
  var url=window.location.href,titulo=document.title;
  if(navigator.share){
    navigator.share({title:titulo,url:url}).catch(function(err){
      if(err&&err.name!=='AbortError') abrirSharePanel(url);
    });
    return;
  }
  abrirSharePanel(url);
}
function abrirSharePanel(url){
  var enc=encodeURIComponent(url);
  document.getElementById('shareUrlInput').value=url;
  document.getElementById('shareWpp').href='https://wa.me/?text='+enc;
  document.getElementById('shareTelegram').href='https://t.me/share/url?url='+enc;
  document.getElementById('sharePanel').classList.add('show');
  document.getElementById('shareBackdrop').classList.add('show');
}
function fecharSharePanel(){
  document.getElementById('sharePanel').classList.remove('show');
  document.getElementById('shareBackdrop').classList.remove('show');
}
function copiarShareUrl(){
  var url=document.getElementById('shareUrlInput').value;
  var execCopy=function(){
    var el=document.createElement('input');
    el.value=url;el.style.cssText='position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(el);el.select();
    try{document.execCommand('copy');toast('Link copiado!');}catch(e){}
    document.body.removeChild(el);
  };
  if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(url).then(function(){toast('Link copiado!');}).catch(execCopy);
  }else{execCopy();}
}
let carrinho = JSON.parse(localStorage.getItem('lc_'+CFG.lojaId)||'[]');
let tipoPed='', pagPed='', prodAtual=null;
let endResumoData=null;
let agendamento={data:null,diaSemana:null,slot:null};
let _skipPrefill=false;
/* snapshot do último pedido para o link de WhatsApp */
let _ultimoCarrinho=[], _ultimoTaxa=0, _ultimoDesconto=0, _ultimoTipo='', _ultimoPag='', _ultimoEndereco='', _ultimoAgendSlot='', _ultimoTrocoPrecisa=false, _ultimoTrocoVal=0, _ultimoNome='', _ultimoTel='';
const fmtR = v=>'R$ '+v.toFixed(2).replace('.',',');
/* ── Valor mínimo de pedido (entrega/retirada) ── */
function pedidoMinimoParaTipo(tipo){
  const isEntrega = tipo==='entrega'||tipo==='entrega_agendada';
  if(isEntrega) return CFG.pedidoMinEntregaAtivo ? (CFG.pedidoMinEntrega||0) : 0;
  return CFG.pedidoMinRetiradaAtivo ? (CFG.pedidoMinRetirada||0) : 0;
}
function pedidoMinimoMaisBaixo(){
  const valores=[];
  if(CFG.pedidoMinEntregaAtivo && CFG.pedidoMinEntrega>0) valores.push(CFG.pedidoMinEntrega);
  if(CFG.pedidoMinRetiradaAtivo && CFG.pedidoMinRetirada>0) valores.push(CFG.pedidoMinRetirada);
  return valores.length ? Math.min(...valores) : 0;
}
const salvar = ()=>localStorage.setItem('lc_'+CFG.lojaId,JSON.stringify(carrinho));

/* ── UI ─────────── */
function uiAtualizar(){
  const tot=carrinho.reduce((s,i)=>s+i.p*i.q,0), cnt=carrinho.reduce((s,i)=>s+i.q,0);
  const cartCountEl=document.getElementById('cartCount');
  if(cartCountEl) cartCountEl.textContent=(cnt===1?'1 item':cnt+' itens');
  document.getElementById('cartBarTotal').textContent=fmtR(tot);
  document.getElementById('cartBar').classList.toggle('show',cnt>0);
  document.querySelectorAll('[id^="pqty-"]').forEach(el=>{
    const id=parseInt(el.id.replace('pqty-',''));
    const q=carrinho.filter(i=>i.id===id).reduce((s,i)=>s+i.q,0);
    el.classList.toggle('d-none',q===0); el.textContent=q;
  });
}

/* ── Auth Modal ─────────── */
let _authDestino = 'pedidos'; // 'pedidos' ou 'pontos'
let _authCliente = null; // {id, nome, telefone, saldo}

function abrirAuthModal(destino){
  _authDestino = destino;
  /* se já autenticado nessa sessão, vai direto */
  if(_authCliente){
    _irAposAuth();
    return;
  }
  const titles = {pedidos:'Lista de pedidos', pontos:'Clube de Pontos'};
  const descs  = {
    pedidos:'Para ver seus pedidos ativos é necessário entrar com seu número de telefone.',
    pontos: 'Para consultar seus pontos e resgatar produtos, informe seu número de telefone.',
  };
  document.getElementById('authModalTitle').textContent = titles[destino]||'Entrar';
  document.getElementById('authModalDesc').textContent  = descs[destino]||'';
  /* limpar campo e dropdown */
  const authTel = document.getElementById('authTel');
  if(authTel) authTel.value = '';
  document.getElementById('authDropdown')?.classList.remove('show');
  document.getElementById('authModalOverlay').classList.add('show');
  document.getElementById('authModal').classList.add('show');
  document.body.style.overflow='hidden';
  setTimeout(()=>document.getElementById('authTel')?.focus(), 300);
}
function fecharAuthModal(){
  document.getElementById('authModalOverlay').classList.remove('show');
  document.getElementById('authModal').classList.remove('show');
  document.body.style.overflow='';
  /* retorna ao menu */
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('navMenu')?.classList.add('active');
}
function maskAuthTelInput(el){
  /* aceita apenas dígitos */
  let v = el.value.replace(/\D/g,'');
  if(v.length > 11) v = v.slice(0,11);
  /* aplica máscara */
  if(v.length > 6)      v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  else if(v.length > 2) v = v.replace(/(\d{2})(\d+)/, '($1) $2');
  el.value = v;
  /* habilita botão só quando número completo (10 ou 11 dígitos) */
  const digits = v.replace(/\D/g,'');
  const completo = digits.length >= 10;
  const btn = document.getElementById('authBtnEntrar');
  if(btn){
    btn.disabled = !completo;
    btn.style.opacity = completo ? '1' : '.5';
    btn.style.cursor  = completo ? 'pointer' : 'not-allowed';
  }
}
async function entrarAuth(){
  const tel=(document.getElementById('authTel')?.value||'').replace(/\D/g,'');
  if(tel.length < 10){toast('Informe o telefone completo');return;}
  const btn=document.getElementById('authBtnEntrar');
  if(btn){btn.disabled=true;btn.style.opacity='.7';btn.textContent='Verificando...';}
  try{
    const r=await fetch(`api/pedidos_por_cliente.php?tel=${encodeURIComponent(tel)}&loja_id=${CFG.lojaId}`);
    const d=await r.json();
    if(!d.ok){
      toast(d.msg||'Número não encontrado');
      if(btn){btn.disabled=false;btn.style.opacity='1';btn.textContent='Entrar';}
      return;
    }
    _authCliente=d.cliente;
    /* fechar modal com animação suave */
    const overlay=document.getElementById('authModalOverlay');
    const modal=document.getElementById('authModal');
    overlay.style.transition='opacity .3s';
    modal.style.transition='transform .3s,opacity .3s';
    overlay.style.opacity='0';
    modal.style.opacity='0';
    modal.style.transform='translate(-50%,-46%) scale(.96)';
    setTimeout(()=>{
      overlay.classList.remove('show');
      modal.classList.remove('show');
      overlay.style.opacity='';modal.style.opacity='';modal.style.transform='';
      document.body.style.overflow='';
      _irAposAuth(d);
    },280);
  }catch(e){toast('Erro de conexão');}
  if(btn){btn.disabled=false;btn.style.opacity='1';btn.textContent='Entrar';}
}
function _irAposAuth(dados){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  /* pré-carregar cashback e pontos sempre que autenticado */
  if(_authCliente){
    /* usa cashback_saldo já retornado pela API, sem requisição extra */
    const cbSaldoDB = parseFloat(_authCliente.cashback_saldo||0);
    if(cbSaldoDB > 0){
      cashbackSaldo = cbSaldoDB;
    } else {
      /* fallback: busca via API (para o caso de login por pontos) */
      carregarCashbackCliente(_authCliente.telefone||'');
    }
    _pontosClienteId = _authCliente.id;
    _pontosSaldo     = _authCliente.saldo;
    const nomeEl = document.getElementById('pontosClienteNome');
    const numEl  = document.getElementById('pontosBalanceNum');
    const pontosBuscaEl = document.getElementById('pontosBusca');
    const pontosConteudoEl = document.getElementById('pontosConteudo');
    if(nomeEl) nomeEl.textContent = _authCliente.nome;
    if(numEl)  numEl.textContent  = _authCliente.saldo.toLocaleString('pt-BR');
    if(pontosBuscaEl)    pontosBuscaEl.style.display    = 'none';
    if(pontosConteudoEl) pontosConteudoEl.style.display = '';
  }
  if(_authDestino==='pontos'){
    document.getElementById('navPontos')?.classList.add('active');
    abrirSheet('pontosSheet');
    carregarProdutosPontos();
  } else {
    document.getElementById('navPedidos')?.classList.add('active');
    abrirPedidosSheet(dados?.pedidos, _authCliente);
  }
}

/* ── Tab ─────────── */
function mostrarTab(tab){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  ALL_SHEETS.forEach(s=>{const el=document.getElementById(s);if(el)el.classList.remove('show');});
  document.getElementById('overlay').classList.remove('show');
  if(tab==='menu'){
    document.getElementById('navMenu').classList.add('active');
  } else if(tab==='pontos'){
    document.getElementById('navPontos').classList.add('active');
    abrirAuthModal('pontos');
  } else {
    document.getElementById('navPedidos').classList.add('active');
    abrirAuthModal('pedidos');
  }
}

/* ── Cashback no fluxo de pedido ─────────── */
async function verificarCashbackFluxo(telDigits){
  /* preserva cashback já aplicado pelo cliente — só atualiza o saldo */
  const cbUsandoAntes=cashbackUsando;
  const cbDescAntes=cashbackDescontado;
  cashbackSaldo=0;
  if(!cbUsandoAntes){ cashbackUsando=false; cashbackDescontado=0; }
  if(!CFG.cashbackAtivo || telDigits.length<10) return;
  try{
    const r=await fetch(`api/cashback_check.php?tel=${encodeURIComponent(telDigits)}&loja_id=${CFG.lojaId}`);
    const d=await r.json();
    if(d.ok && parseFloat(d.saldo||0)>0){
      cashbackSaldo=parseFloat(d.saldo);
      /* se o step 3 já estiver visível, mostra agora */
      if(document.getElementById('chk3')?.classList.contains('active')) exibirCashbackPagamento();
    }
  }catch(e){}
}

function exibirCashbackPagamento(){ /* mantida por compatibilidade — exibição agora é no Contato */ }
function ocultarCashbackPagamento(){
  const wrap=document.getElementById('contactCashbackWrap');
  if(wrap) wrap.style.display='none';
  cashbackSaldo=0;
}
function toggleCashbackPagamento(){ abrirCashbackModal(); }

/* ── Cashback (cliente autenticado via auth modal) ─────────── */
async function carregarCashbackCliente(tel){
  const digits = tel.replace(/\D/g,'');
  if(digits.length<10) return;
  try{
    const r=await fetch(`api/cashback_check.php?tel=${encodeURIComponent(digits)}&loja_id=${CFG.lojaId}`);
    const d=await r.json();
    if(d.ok && parseFloat(d.saldo||0)>0){
      cashbackSaldo=parseFloat(d.saldo);
      /* calcula validade se expiraDias vir na resposta */
      if(d.expira_em) _cbValidade=d.expira_em;
      else if(d.expiraDias>0){
        const exp=new Date(); exp.setDate(exp.getDate()+d.expiraDias);
        _cbValidade=`${String(exp.getDate()).padStart(2,'0')}/${String(exp.getMonth()+1).padStart(2,'0')}/${exp.getFullYear()}`;
      }
    } else {
      cashbackSaldo=0;
    }
  }catch(e){ cashbackSaldo=0; }
  if(document.getElementById('cartSheet')?.classList.contains('show')) renderCarrinho();
}

/* ── Benefit cards no carrinho (cashback + pontos) ── */
let _cbValidade=''; // data de validade do cashback

function renderBenefitCards(){
  let html='';
  if(CFG.cashbackAtivo && cashbackSaldo>0){
    const txt=cashbackUsando&&cashbackDescontado>0
      ?`<div class="cart-benefit-title">Você está utilizando ${fmtR(cashbackDescontado)}</div><div class="cart-benefit-sub">${_cbValidade?'Saldo válido até '+_cbValidade:''}</div>`
      :`<div class="cart-benefit-title">Cashback disponível de ${fmtR(cashbackSaldo)}</div><div class="cart-benefit-sub">${_cbValidade?'Saldo válido até '+_cbValidade:''}</div>`;
    const btnTxt=cashbackUsando&&cashbackDescontado>0?'Alterar':'Usar';
    html+=`<div class="cart-benefit-card cashback">
      <div class="cart-benefit-icon"><i class="bi bi-cash-coin"></i></div>
      <div class="cart-benefit-info">${txt}</div>
      <button class="cart-benefit-btn" onclick="abrirCashbackModal()">${btnTxt}</button>
    </div>`;
  }
  if(CFG.clubePontosAtivo && _authCliente && _pontosSaldo>0 && CFG.agendDeliveryAtivo!==undefined){
    html+=`<div class="cart-benefit-card pontos">
      <div class="cart-benefit-icon"><i class="bi bi-star-fill"></i></div>
      <div class="cart-benefit-info">
        <div class="cart-benefit-title">Clube de pontos</div>
        <div class="cart-benefit-sub">${_pontosSaldo} pontos disponíveis para resgatar</div>
      </div>
      <button class="cart-benefit-btn" onclick="abrirPontosDoCarrinho()">Usar</button>
    </div>`;
  }
  return html;
}
function abrirPontosDoCarrinho(){
  fecharSheet('cartSheet');
  setTimeout(()=>{
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('navPontos')?.classList.add('active');
    abrirSheet('pontosSheet');
    if(!_pontosProdutos.length) carregarProdutosPontos();
  },300);
}

/* ── Steps bar ── */
const STEP_LABELS=['Contato','Entrega','Agendamento','Pagamento','Distribuição\nde pagamento','Resumo'];
let _stepsCompleted=[]; // índices concluídos

function renderStepsBar(current){
  const dots=STEP_LABELS.map((label,i)=>{
    const done=_stepsCompleted.includes(i);
    const active=i===current;
    const dotClass=done?'done':(active?'active':'');
    const lblClass=done?'done':(active?'active':'');
    const inner=done?'<i class="bi bi-check2" style="font-size:.6rem"></i>':'';
    return `<div class="step-item">
      <div class="step-dot ${dotClass}">${inner}</div>
      <div class="step-label ${lblClass}">${label.replace('\n','<br>')}</div>
    </div>`;
  });
  /* desenha as linhas de progresso entre dots */
  const items=[];
  for(let i=0;i<STEP_LABELS.length;i++){
    items.push(dots[i]);
    if(i<STEP_LABELS.length-1){
      const lineColor=_stepsCompleted.includes(i)?'#7c3aed':'#e5e7eb';
      items.push(`<div style="flex:1;height:2px;background:${lineColor};margin-top:9px;z-index:0"></div>`);
    }
  }
  const bar=`<div class="steps-bar">${items.join('')}</div>`;
  ['stepsContact','stepsChk'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.innerHTML=bar;
  });
}

function marcarStepConcluido(idx){
  if(!_stepsCompleted.includes(idx)) _stepsCompleted.push(idx);
}

/* ── Modal de cashback ── */
function abrirCashbackModal(){
  const ov=document.getElementById('cashbackModalOverlay');
  document.getElementById('cbModalTotal').textContent=fmtR(cashbackSaldo);
  const valEl=document.getElementById('cbModalValidade');
  if(valEl) valEl.textContent=_cbValidade?'saldo válido até '+_cbValidade:'';
  const inp=document.getElementById('cbModalValor');
  if(inp) inp.value=(cashbackDescontado>0?cashbackDescontado:cashbackSaldo).toFixed(2).replace('.',',');
  ov.style.display='flex'; requestAnimationFrame(()=>ov.classList.add('show'));
}
function maskTrocoValor(el){
  let v=el.value.replace(/[^\d,\.]/g,'');
  const parts=v.split(/[,\.]/);
  if(parts.length>2) v=parts[0]+','+(parts.slice(1).join('').slice(0,2));
  else if(parts.length===2) v=parts[0]+','+(parts[1]||'').slice(0,2);
  el.value=v;
}
function parseTrocoValor(str){
  return parseFloat((str||'0').replace(/\./g,'').replace(',','.'))||0;
}
function maskCbValor(el){
  let v=el.value.replace(/[^\d,\.]/g,'');
  /* aceita apenas um separador decimal */
  const parts=v.split(/[,\.]/);
  if(parts.length>2) v=parts[0]+','+(parts.slice(1).join('').slice(0,2));
  else if(parts.length===2) v=parts[0]+','+(parts[1]||'').slice(0,2);
  el.value=v;
}
function fecharCashbackModal(){
  const ov=document.getElementById('cashbackModalOverlay');
  ov.classList.remove('show');
  setTimeout(()=>ov.style.display='none',300);
}
function atualizarBotaoCashbackContato(){
  const btn=document.getElementById('contactCashbackBtn');
  const lbl=document.getElementById('contactCashbackLbl');
  const valEl=document.getElementById('contactCashbackValor');
  if(!btn) return;
  if(cashbackUsando && cashbackDescontado>0){
    btn.textContent='Remover';
    btn.style.background='#dc2626';
    if(lbl) lbl.textContent='Usando cashback';
    if(valEl) valEl.textContent=`- ${fmtR(cashbackDescontado)} de ${fmtR(cashbackSaldo)}`;
  } else {
    btn.textContent='Usar';
    btn.style.background='#16a34a';
    if(lbl) lbl.textContent='Cashback disponível';
    if(valEl) valEl.textContent=fmtR(cashbackSaldo);
  }
}
function toggleCashbackContato(){
  if(cashbackUsando && cashbackDescontado>0){
    /* remove o cashback */
    cashbackUsando=false;
    cashbackDescontado=0;
    atualizarBotaoCashbackContato();
    atualizarTotalComCupom();
    toast('Cashback removido');
  } else {
    /* abre modal para aplicar */
    abrirCashbackModal();
  }
}
function confirmarCashbackModal(){
  const inp=document.getElementById('cbModalValor');
  const rawVal=(inp?.value||'').replace(/\./g,'').replace(',','.');
  const val=parseFloat(rawVal);
  if(!val||val<=0){toast('Informe um valor válido');return;}
  if(val>cashbackSaldo){toast(`Valor máximo disponível: ${fmtR(cashbackSaldo)}`);return;}
  cashbackDescontado=parseFloat(val.toFixed(2));
  cashbackUsando=true;
  fecharCashbackModal();
  /* atualiza botão e card no contato */
  const wrap=document.getElementById('contactCashbackWrap');
  if(wrap) wrap.style.display='';
  atualizarBotaoCashbackContato();
  /* re-renderiza carrinho se aberto */
  if(document.getElementById('cartSheet')?.classList.contains('show')) renderCarrinho();
  atualizarTotalComCupom();
  toast(`Cashback de ${fmtR(cashbackDescontado)} aplicado!`);
}

function toggleCashbackCart(){
  cashbackUsando=!cashbackUsando;
  if(cashbackUsando){
    const sub=carrinho.reduce((s,i)=>s+i.p*i.q,0);
    cashbackDescontado=Math.min(cashbackSaldo,sub);
  } else {
    cashbackDescontado=0;
  }
  renderCarrinho();
  atualizarTotalComCupom();
}

/* ── Pontos ─────────── */
let _pontosClienteId = null;
let _pontosSaldo = 0;
let _pontosProdutos = [];

function abrirPontosSheet(){
  abrirSheet('pontosSheet');
  /* pré-preencher telefone do contato se disponível */
  const telSalvo = localStorage.getItem('lc_tel') || '';
  const telEl = document.getElementById('pontosTel');
  if(telEl && telSalvo && !_pontosClienteId) telEl.value = telSalvo;
}

let _pontosSearchTimer = null;

function onPontosInput(el){
  const q = el.value.trim();
  clearTimeout(_pontosSearchTimer);
  const drop = document.getElementById('pontosDropdown');
  if(q.length < 3){ if(drop) drop.classList.remove('show'); return; }
  _pontosSearchTimer = setTimeout(()=>buscarClientesPontos(q), 350);
}

async function buscarClientesPontos(q){
  const drop = document.getElementById('pontosDropdown');
  if(!drop) return;
  drop.innerHTML = '<div class="pontos-dropdown-empty"><i class="bi bi-arrow-repeat"></i> Buscando...</div>';
  drop.classList.add('show');
  try{
    const r = await fetch(`api/pontos_buscar_cliente.php?q=${encodeURIComponent(q)}&loja_id=${CFG.lojaId}`);
    const d = await r.json();
    const lista = d.clientes || [];
    if(!lista.length){
      drop.innerHTML='<div class="pontos-dropdown-empty">Nenhum cliente encontrado</div>';
      return;
    }
    drop.innerHTML = lista.map(c=>`
      <div class="pontos-dropdown-item" onclick="selecionarClientePontos(${c.id},'${c.nome.replace(/'/g,"\\'")}','${c.telefone}',${c.saldo})">
        <div>
          <div class="pontos-dropdown-nome">${c.nome}</div>
          <div class="pontos-dropdown-tel">${c.telefone}</div>
        </div>
        <span class="pontos-dropdown-pts">${c.saldo.toLocaleString('pt-BR')} pts</span>
      </div>`).join('');
  }catch(e){
    drop.innerHTML='<div class="pontos-dropdown-empty">Erro ao buscar</div>';
  }
}

function selecionarClientePontos(id, nome, tel, saldo){
  /* preenche campo e fecha dropdown */
  const input = document.getElementById('pontosTel');
  if(input) input.value = `${nome} — ${tel}`;
  const drop = document.getElementById('pontosDropdown');
  if(drop) drop.classList.remove('show');
  /* atualiza estado */
  _pontosClienteId = id;
  _pontosSaldo = saldo;
  const pontosClienteNomeEl=document.getElementById('pontosClienteNome'); if(pontosClienteNomeEl) pontosClienteNomeEl.textContent = nome;
  document.getElementById('pontosBalanceNum').textContent = saldo.toLocaleString('pt-BR');
  const pontosNivelEl=document.getElementById('pontosNivel'); if(pontosNivelEl) pontosNivelEl.textContent = 'Bronze'; /* será atualizado abaixo */
  document.getElementById('pontosBusca').style.display = 'none';
  document.getElementById('pontosConteudo').style.display = '';
  /* buscar nível real e produtos */
  fetch(`api/pontos_saldo.php?tel=${encodeURIComponent(tel.replace(/\D/g,''))}&loja_id=${CFG.lojaId}`)
    .then(r=>r.json()).then(d=>{
      const nivelEl=document.getElementById('pontosNivel'); if(d.ok && nivelEl){ nivelEl.textContent = d.nivel || 'Bronze'; }
    }).catch(()=>{});
  carregarProdutosPontos();
}

/* fecha dropdown ao clicar fora */
document.addEventListener('click', e=>{
  if(!e.target.closest('.pontos-busca-wrap')){
    document.getElementById('pontosDropdown')?.classList.remove('show');
  }
});

async function buscarSaldoPontos(){
  /* mantida para compatibilidade mas agora usa o autocomplete */
  const q = (document.getElementById('pontosTel')?.value||'').trim();
  if(q.length>=3) await buscarClientesPontos(q);
}

async function carregarProdutosPontos(){
  const grid = document.getElementById('pontosGrid');
  if(!grid) return;
  grid.innerHTML = '<div class="pontos-loading"><i class="bi bi-arrow-repeat"></i> Carregando produtos...</div>';
  try{
    const r = await fetch(`api/pontos_produtos.php?loja_id=${CFG.lojaId}`);
    const d = await r.json();
    _pontosProdutos = d.produtos || [];
    renderPontosGrid(_pontosSaldo);
  }catch(e){
    grid.innerHTML = '<div class="pontos-empty"><i class="bi bi-exclamation-circle"></i><br>Erro ao carregar produtos.</div>';
  }
}

function renderPontosGrid(saldo){
  const grid = document.getElementById('pontosGrid');
  if(!grid) return;
  if(!_pontosProdutos.length){
    grid.innerHTML='<div class="pontos-empty" style="grid-column:1/-1"><i class="bi bi-gift"></i><br>Nenhum produto disponível para resgate no momento.</div>';
    return;
  }
  /* ordenar: disponíveis primeiro */
  const sorted = [..._pontosProdutos].sort((a,b)=>{
    const aOk = saldo >= a.pontos_custo;
    const bOk = saldo >= b.pontos_custo;
    if(aOk && !bOk) return -1;
    if(!aOk && bOk) return 1;
    return a.pontos_custo - b.pontos_custo;
  });
  grid.innerHTML = sorted.map(p=>{
    const pode = saldo >= p.pontos_custo;
    const falta = p.pontos_custo - saldo;
    const imgHtml = p.imagem
      ? `<img class="pontos-card-img" src="${p.imagem}" alt="" loading="lazy">`
      : `<div class="pontos-card-img-ph"><i class="bi bi-gift"></i></div>`;
    return `<div class="pontos-card ${pode?'disponivel':'bloqueado'}">
      <div class="pontos-card-img-wrap">
        ${imgHtml}
        ${pode
          ? `<button class="pontos-card-add" onclick="confirmarResgate(${p.id},'${p.nome.replace(/'/g,"\\'")}',${p.pontos_custo})"><i class="bi bi-plus"></i></button>`
          : `<button class="pontos-card-add" disabled><i class="bi bi-lock-fill" style="font-size:.75rem"></i></button>`
        }
      </div>
      <div class="pontos-card-custo">${p.pontos_custo.toLocaleString('pt-BR')} pts</div>
      <div class="pontos-card-nome">${p.nome}</div>
      ${!pode?`<div class="pontos-falta">Faltam ${falta.toLocaleString('pt-BR')} pts</div>`:''}
    </div>`;
  }).join('');
}

let _resgateAtual = null; // {produtoId, nomeProduto, custo, imagem}

function confirmarResgate(produtoId, nomeProduto, custo){
  if(!_pontosClienteId){ toast('Faça a consulta novamente'); return; }
  if(_pontosSaldo < custo){ toast('Pontos insuficientes'); return; }
  const jaTemResgate = carrinho.some(i=>i.obs==='[Resgate de pontos]');
  if(jaTemResgate){ toast('Você já tem 1 produto resgatado. Finalize o pedido antes de resgatar outro.'); return; }
  /* busca imagem do produto */
  const prodData = _pontosProdutos.find(p=>p.id===produtoId);
  const imagem = prodData?.imagem || '';
  _resgateAtual = {produtoId, nomeProduto, custo, imagem};
  /* preenche o diálogo */
  document.getElementById('confirmResgateNome').textContent = nomeProduto;
  document.getElementById('confirmResgateCtx').textContent  = custo.toLocaleString('pt-BR');
  const imgEl = document.getElementById('confirmResgateImg');
  if(imagem){
    imgEl.outerHTML = `<img id="confirmResgateImg" class="confirm-dialog-img" src="${imagem}" alt="">`;
  } else {
    if(imgEl.tagName==='IMG') imgEl.outerHTML=`<div id="confirmResgateImg" class="confirm-dialog-img-ph"><i class="bi bi-gift"></i></div>`;
  }
  /* abre diálogo */
  const ov=document.getElementById('confirmResgateOverlay');
  ov.style.display='flex'; requestAnimationFrame(()=>ov.classList.add('show'));
}
function fecharConfirmResgate(){
  const ov=document.getElementById('confirmResgateOverlay');
  ov.classList.remove('show');
  setTimeout(()=>{ ov.style.display='none'; _resgateAtual=null; }, 300);
}
async function executarResgate(){
  if(!_resgateAtual) return;
  const {produtoId, nomeProduto, custo, imagem} = _resgateAtual;
  const btn = document.getElementById('confirmResgateBtn');
  if(btn){ btn.disabled=true; btn.textContent='Processando...'; }
  try{
    const body = new URLSearchParams({cliente_id:_pontosClienteId, produto_id:produtoId, loja_id:CFG.lojaId});
    const r = await fetch('api/pontos_resgatar.php', {method:'POST', body});
    const d = await r.json();
    if(!d.ok){ toast(d.msg||'Erro ao resgatar'); if(btn){btn.disabled=false;btn.innerHTML='<i class="bi bi-gift"></i> Confirmar resgate';} return; }
    fecharConfirmResgate();
    _pontosSaldo = d.saldo_novo;
    document.getElementById('pontosBalanceNum').textContent = d.saldo_novo.toLocaleString('pt-BR');
    renderPontosGrid(_pontosSaldo);
    /* adiciona ao carrinho COM imagem */
    carrinho.push({id:produtoId, n:nomeProduto, p:0, img:imagem, q:1, obs:'[Resgate de pontos]', _pontos:custo});
    salvar(); uiAtualizar();
    toastCart(`${nomeProduto} adicionado ao carrinho!`);
  }catch(e){ toast('Erro de conexão'); }
  if(btn){ btn.disabled=false; btn.innerHTML='<i class="bi bi-gift"></i> Confirmar resgate'; }
}

function resetPontosBusca(){
  _pontosClienteId = null;
  _pontosSaldo = 0;
  _pontosProdutos = [];
  document.getElementById('pontosBusca').style.display = '';
  document.getElementById('pontosConteudo').style.display = 'none';
  document.getElementById('pontosTel').value = '';
}

/* ── Produto ─────── */
function abrirProdutoPorId(id){
  /* busca o produto no DOM pelo ID e abre o modal */
  const btn=document.querySelector(`[id^="prow-${id}"] .product-row-add`);
  if(btn){btn.click();return;}
  /* fallback: reabre carrinho */
  fecharSheet('cartSheet');toast('Edite o produto pela página do cardápio.');
}
function abrirProduto(id,d){
  const temAgendamento = CFG.agendDeliveryAtivo || CFG.agendRetiradaAtivo;
  if(!CFG.lojaAberta && !temAgendamento){toast('Loja fechada no momento!');return;}
  if(d.tipo!=='combo' && d.tem_variacoes==1){
    abrirVarModalLoja(id,d);
    return;
  }
  const qtdMin = Math.max(0, parseInt(d.quantidade_minima||0));
  const qtdInicial = qtdMin > 0 ? qtdMin : 1;
  prodAtual={...d,q:qtdInicial,passos:null};
  document.getElementById('pdNome2').textContent=d.nome;
  document.getElementById('pdDesc').textContent=d.descricao||'';
  document.getElementById('pdPreco').textContent=fmtR(d.preco_final);
  document.getElementById('pdQtd').textContent=qtdInicial;
  document.getElementById('pdObs').value='';
  const aviso = document.getElementById('pdQtdMinimaAviso');
  const avisoMsg = document.getElementById('pdQtdMinimaMsg');
  if(aviso && avisoMsg){
    if(qtdMin > 0){
      avisoMsg.textContent = 'Este produto tem quantidade mínima de ' + qtdMin + ' unidade' + (qtdMin > 1 ? 's' : '') + ' por pedido.';
      aviso.style.display = 'flex';
    } else {
      aviso.style.display = 'none';
    }
  }
  atualizarPdTotal();
  const pdPts=document.getElementById('pdPts');
  const ptsProd=parseInt(d.pontos_ganho||0);
  if(ptsProd>0){
    if(pdPts) pdPts.style.display='';
    const ptsVal=document.getElementById('pdPtsVal');
    if(ptsVal) ptsVal.textContent=ptsProd;
  } else {
    if(pdPts) pdPts.style.display='none';
  }
  const img=document.getElementById('pdImg');
  const ph=document.getElementById('pdImgPh');
  const verMaior=document.getElementById('pdVerMaior');
  if(d.imagem){img.src=d.imagem;img.classList.remove('d-none');if(ph)ph.classList.add('d-none');if(verMaior)verMaior.style.display='';}
  else{img.classList.add('d-none');if(ph)ph.classList.remove('d-none');if(verMaior)verMaior.style.display='none';}
  /* Combo: carrega passos via API */
  const comboSec = document.getElementById('pdComboSection');
  const addBtn = document.getElementById('pdAddBtn');
  if(d.tipo==='combo'){
    comboSec.style.display='';
    comboSec.innerHTML='<div style="text-align:center;padding:20px;color:#9ca3af;font-size:.83rem"><i class="bi bi-hourglass-split"></i> Carregando opções...</div>';
    if(addBtn){addBtn.disabled=true;addBtn.innerHTML='Aguarde...';}
    fetch(`api/combo_detalhe.php?id=${id}&loja_id=${CFG.lojaId}`)
      .then(r=>r.json())
      .then(data=>{
        if(data.ok && data.passos){
          prodAtual.passos=data.passos.map(p=>({...p,opcoes:p.opcoes.map(o=>({...o,qty:0}))}));
          renderComboPassos();
        } else {
          comboSec.style.display='none';
          if(addBtn){addBtn.disabled=false;addBtn.innerHTML='Adicionar <span id="pdTotal">'+fmtR(prodAtual.preco_final*prodAtual.q)+'</span>';}
        }
      })
      .catch(()=>{
        comboSec.style.display='none';
        if(addBtn){addBtn.disabled=false;addBtn.innerHTML='Adicionar <span id="pdTotal">'+fmtR(prodAtual.preco_final*prodAtual.q)+'</span>';}
      });
  } else {
    comboSec.style.display='none';
    comboSec.innerHTML='';
    if(addBtn){addBtn.disabled=false;addBtn.innerHTML='Adicionar <span id="pdTotal">'+fmtR(d.preco_final*qtdInicial)+'</span>';}
  }
  document.getElementById('prodModalOverlay').classList.add('show');
  const _modal=document.getElementById('prodModal');
  _modal.classList.add('show');
  if(d.tipo==='combo') _modal.classList.add('combo-mode');
  else _modal.classList.remove('combo-mode');
  document.body.style.overflow='hidden';
}
function fecharProdModal(){
  document.getElementById('prodModalOverlay').classList.remove('show');
  document.getElementById('prodModal').classList.remove('show');
  document.getElementById('pdImgWrap')?.closest('.prod-modal-top')?.classList.remove('img-expanded');
  document.body.style.overflow='';
  const comboSec=document.getElementById('pdComboSection');
  if(comboSec){comboSec.style.display='none';comboSec.innerHTML='';}
}
function toggleImgExpand(){
  document.getElementById('pdImgWrap')?.closest('.prod-modal-top')?.classList.toggle('img-expanded');
}
function pdQtd(d){if(!prodAtual)return;const min=Math.max(1,parseInt(prodAtual.quantidade_minima||0));prodAtual.q=Math.max(min,prodAtual.q+d);document.getElementById('pdQtd').textContent=prodAtual.q;atualizarPdTotal();}
function atualizarPdTotal(){
  if(!prodAtual)return;
  const el=document.getElementById('pdTotal');
  if(el)el.textContent=fmtR(prodAtual.preco_final*prodAtual.q);
}
function addCart(){
  if(!prodAtual)return;
  /* Combo: valida passos e serializa seleções */
  if(prodAtual.tipo==='combo' && prodAtual.passos){
    for(const passo of prodAtual.passos){
      if(passo.obrigatorio!=1) continue;
      const min=Math.max(1,parseInt(passo.min_itens||1));
      const total=passo.opcoes.reduce((s,o)=>s+o.qty,0);
      if(total<min){
        toast('Selecione ao menos '+min+' opção em "'+passo.nome+'"');
        return;
      }
    }
    const userObs=document.getElementById('pdObs').value.trim();
    const combosels=prodAtual.passos
      .flatMap(p=>p.opcoes.filter(o=>o.qty>0).map(o=>({id:parseInt(o.id),nome:o.nome,qtd:o.qty})));
    const comboLines=combosels.map(s=>s.nome+(s.qtd>1?' x'+s.qtd:'')).join('\n');
    const obs=combosels.length?('[combo]\n'+comboLines+(userObs?'\n'+userObs:'')):userObs;
    const idx=carrinho.findIndex(i=>i.id===prodAtual.id&&i.obs===obs);
    if(idx>=0){carrinho[idx].q+=prodAtual.q;}
    else carrinho.push({id:prodAtual.id,n:prodAtual.nome,p:prodAtual.preco_final,img:prodAtual.imagem,q:prodAtual.q,obs,uobs:userObs||undefined,combosels:combosels.length?combosels:undefined});
    salvar();uiAtualizar();fecharProdModal();toastCart(prodAtual.nome);
    return;
  }
  const qtdMin = Math.max(0, parseInt(prodAtual.quantidade_minima||0));
  if(qtdMin > 0 && prodAtual.q < qtdMin){
    toast('Quantidade mínima para este produto: ' + qtdMin + ' unidade' + (qtdMin > 1 ? 's' : '') + '.');
    return;
  }
  const obs=document.getElementById('pdObs').value.trim();
  const idx=carrinho.findIndex(i=>i.id===prodAtual.id&&i.obs===obs);
  if(idx>=0)carrinho[idx].q+=prodAtual.q;
  else{const pts=parseInt(prodAtual.pontos_ganho||0);carrinho.push({id:prodAtual.id,n:prodAtual.nome,p:prodAtual.preco_final,img:prodAtual.imagem,q:prodAtual.q,obs,pontos:pts||undefined});}
  salvar();uiAtualizar();fecharProdModal();toastCart(prodAtual.nome);
}

/* ── Combo passos ── */
function _escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function renderComboPassos(){
  const sec=document.getElementById('pdComboSection');
  if(!sec||!prodAtual||!prodAtual.passos)return;
  sec.innerHTML=prodAtual.passos.map((passo,pi)=>{
    const min=parseInt(passo.min_itens||0);
    const max=parseInt(passo.max_itens||0);
    const rep=passo.permite_repetir==1;
    const totalSel=passo.opcoes.reduce((s,o)=>s+o.qty,0);
    let sub='';
    if(min>0&&max>0&&min===max) sub=`Escolha exatamente ${min} ${min===1?'opção':'opções'}`;
    else if(min>0&&max>0) sub=`Escolha entre ${min} e ${max} opções`;
    else if(min>0) sub=`Escolha ao menos ${min} ${min===1?'opção':'opções'}`;
    else if(max>0) sub=`Escolha até ${max} ${max===1?'opção':'opções'}`;
    if(!rep) sub+=(sub?'. Opções não podem ser repetidas':'Opções não podem ser repetidas');
    const obrig=passo.obrigatorio==1;
    const badge=obrig?`<span style="font-size:.67rem;background:#fff3cd;color:#b45309;border-radius:4px;padding:1px 7px;font-weight:700">Obrigatório</span>`:'';
    const opcs=passo.opcoes.map((opc,oi)=>{
      const podeAdd=(max===0||totalSel<max)&&(rep||opc.qty===0);
      const podeSub=opc.qty>0;
      const imgHtml=opc.imagem
        ?`<img class="combo-opcao-img" src="${_escH(opc.imagem)}" alt="" loading="lazy">`
        :`<div class="combo-opcao-img-ph"><i class="bi bi-image"></i></div>`;
      return `<div class="combo-opcao-row">
        <div class="combo-opcao-info">
          <div class="combo-opcao-nome">${_escH(opc.nome)}</div>
          <div class="combo-opcao-inc">Incluído no valor do combo.</div>
        </div>
        ${imgHtml}
        <div class="combo-opcao-qty">
          <button class="co-btn" onclick="comboQty(${pi},${oi},-1)" ${podeSub?'':'disabled'}><i class="bi bi-dash"></i></button>
          <span class="combo-opcao-qty-num">${opc.qty}</span>
          <button class="co-btn" onclick="comboQty(${pi},${oi},1)" ${podeAdd?'':'disabled'}><i class="bi bi-plus"></i></button>
        </div>
      </div>`;
    }).join('');
    return `<div class="combo-passo">
      <div class="combo-passo-header">
        <div class="combo-passo-titulo">${_escH(passo.nome)}${badge}</div>
        ${sub?`<div class="combo-passo-sub">${sub}</div>`:''}
      </div>
      ${opcs}
    </div>`;
  }).join('');
  _validarComboBtn();
}
function comboQty(pi,oi,delta){
  if(!prodAtual||!prodAtual.passos)return;
  const passo=prodAtual.passos[pi];
  const opc=passo.opcoes[oi];
  const max=parseInt(passo.max_itens||0);
  const rep=passo.permite_repetir==1;
  const totalSel=passo.opcoes.reduce((s,o)=>s+o.qty,0);
  if(delta>0){
    if(max>0&&totalSel>=max)return;
    if(!rep&&opc.qty>0)return;
    opc.qty++;
  } else {
    if(opc.qty<=0)return;
    opc.qty--;
  }
  renderComboPassos();
}
function _validarComboBtn(){
  const btn=document.getElementById('pdAddBtn');
  if(!btn||!prodAtual||!prodAtual.passos)return;
  const valido=prodAtual.passos.every(p=>{
    if(p.obrigatorio!=1)return true;
    const min=Math.max(1,parseInt(p.min_itens||1));
    return p.opcoes.reduce((s,o)=>s+o.qty,0)>=min;
  });
  btn.disabled=!valido;
  btn.innerHTML=`Adicionar <span id="pdTotal">${fmtR(prodAtual.preco_final*prodAtual.q)}</span>`;
}

/* ── Variações + Extras (modal separado, sistema antigo produto_variacoes/produto_extras) ── */
let varModalAtual=null;
let varModalSelecionada=null;
let varModalExtrasSelecionados=[];
let varModalExtrasObrigatorio=false;
let varModalComplementoSelecionado=null;
let varModalComplementosObrigatorio=false;
let varModalListeners=false;

function _vincularVarModalListeners(){
  if(varModalListeners)return;
  varModalListeners=true;
  document.getElementById('varModalLista').addEventListener('click',(e)=>{
    const row=e.target.closest('.comp-radio-row');
    if(!row)return;
    const radio=row.querySelector('input[type="radio"]');
    if(radio)radio.checked=true;
    varModalSelecionada={id:row.dataset.id,nome:row.dataset.nome,preco:parseFloat(row.dataset.preco||0)};
    _atualizarVarModalBtn();
  });
  document.getElementById('varModalExtraLista').addEventListener('click',(e)=>{
    const row=e.target.closest('.comp-extra-row');
    if(!row)return;
    const nome=row.dataset.nome;
    const preco=parseFloat(row.dataset.preco||0);
    const btn=row.querySelector('.comp-extra-btn');
    const idx=varModalExtrasSelecionados.findIndex(x=>x.nome===nome);
    if(idx>=0){
      varModalExtrasSelecionados.splice(idx,1);
      if(btn){btn.classList.remove('active');btn.innerHTML='+';}
    } else {
      varModalExtrasSelecionados.push({nome,preco});
      if(btn){btn.classList.add('active');btn.innerHTML='<i class="bi bi-check-lg"></i>';}
    }
    _atualizarVarModalBtn();
  });
  document.getElementById('varModalComplementoLista').addEventListener('click',(e)=>{
    const row=e.target.closest('.comp-extra-row');
    if(!row)return;
    varModalComplementoSelecionado={nome:row.dataset.nome,preco:parseFloat(row.dataset.preco||0)};
    document.getElementById('varModalComplementoLista').querySelectorAll('.comp-extra-btn').forEach(b=>{b.classList.remove('active');b.innerHTML='+';});
    const btn=row.querySelector('.comp-extra-btn');
    if(btn){btn.classList.add('active');btn.innerHTML='<i class="bi bi-check-lg"></i>';}
    _atualizarVarModalBtn();
  });
}

function abrirVarModalLoja(id,d){
  varModalAtual={produtoId:id,nome:d.nome,imagem:d.imagem};
  varModalSelecionada=null;
  varModalExtrasSelecionados=[];
  varModalExtrasObrigatorio=false;
  varModalComplementoSelecionado=null;
  varModalComplementosObrigatorio=false;
  _vincularVarModalListeners();
  document.getElementById('varModalNome').textContent=d.nome;
  document.getElementById('varModalIdTxt').textContent='ID '+id;
  document.getElementById('varModalQtd').textContent='1';
  document.getElementById('varModalObs').value='';
  document.getElementById('varModalBusca').value='';
  const img=document.getElementById('varModalImg');
  const ph=document.getElementById('varModalImgPh');
  if(d.imagem){img.src=d.imagem;img.classList.remove('d-none');ph.classList.add('d-none');}
  else{img.classList.add('d-none');ph.classList.remove('d-none');}
  document.getElementById('varModalLista').innerHTML='<div style="padding:14px;color:#888;font-size:.82rem">Carregando...</div>';
  document.getElementById('varModalExtraSection').classList.add('d-none');
  document.getElementById('varModalComplementoSection').classList.add('d-none');
  const addBtn=document.getElementById('varModalAddBtn');
  addBtn.disabled=true;
  addBtn.textContent='Selecionar variação';
  document.getElementById('varModalOverlay').classList.add('show');
  document.getElementById('varModalLoja').classList.add('show');
  document.body.style.overflow='hidden';

  fetch(`api/produto_variacoes.php?produto_id=${id}&loja_id=${CFG.lojaId}`)
    .then(r=>r.json())
    .then(data=>{
      if(!data.ok){
        document.getElementById('varModalLista').innerHTML='<div style="padding:14px;color:#888;font-size:.82rem">Erro ao carregar opções.</div>';
        return;
      }
      varModalExtrasObrigatorio=!!data.extras_obrigatorio;
      varModalComplementosObrigatorio=!!data.complementos_itens_obrigatorio;
      renderVariacoesLoja(data.variacoes||[]);
      renderExtrasLoja(data.extras||[]);
      renderComplementosItensLoja(data.complementos_itens||[]);
    })
    .catch(()=>{
      document.getElementById('varModalLista').innerHTML='<div style="padding:14px;color:#888;font-size:.82rem">Erro ao carregar opções.</div>';
    });
}

function fecharVarModalLoja(){
  document.getElementById('varModalOverlay').classList.remove('show');
  document.getElementById('varModalLoja').classList.remove('show');
  document.body.style.overflow='';
}

function renderVariacoesLoja(lista){
  const badge=document.getElementById('varModalBadge');
  badge.style.display=lista.length?'':'none';
  const listaEl=document.getElementById('varModalLista');
  if(!lista.length){
    listaEl.innerHTML='<div style="padding:14px;color:#888;font-size:.82rem">Sem variações cadastradas.</div>';
    return;
  }
  listaEl.innerHTML=lista.map((v,i)=>{
    const nome=[v.tamanho,v.cor].filter(Boolean).join(' - ')||`Opção ${i+1}`;
    const preco=parseFloat(v.preco||0);
    return `<div class="comp-radio-row" data-id="${v.id}" data-nome="${_escH(nome)}" data-preco="${preco}">
      <label>
        <input type="radio" name="varModalRadio">
        <div>
          ${_escH(nome)}
          <small>R$ ${preco.toFixed(2).replace('.',',')}</small>
        </div>
      </label>
    </div>`;
  }).join('');
  filtrarVariacoesLoja();
}

function renderExtrasLoja(lista){
  const sec=document.getElementById('varModalExtraSection');
  const listaEl=document.getElementById('varModalExtraLista');
  varModalExtrasSelecionados=[];
  if(!lista.length){
    sec.classList.add('d-none');
    return;
  }
  sec.classList.remove('d-none');
  document.getElementById('varModalExtraBadge').style.display=varModalExtrasObrigatorio?'':'none';
  listaEl.innerHTML=lista.map(ext=>{
    const nome=ext.nome||'Extra';
    const preco=parseFloat(ext.preco||0);
    return `<div class="comp-extra-row" data-nome="${_escH(nome)}" data-preco="${preco}">
      <div>
        ${_escH(nome)}
        <small>R$ ${preco.toFixed(2).replace('.',',')}</small>
      </div>
      <button type="button" class="comp-extra-btn">+</button>
    </div>`;
  }).join('');
}

function renderComplementosItensLoja(lista){
  const sec=document.getElementById('varModalComplementoSection');
  const listaEl=document.getElementById('varModalComplementoLista');
  varModalComplementoSelecionado=null;
  if(!lista.length){
    sec.classList.add('d-none');
    return;
  }
  sec.classList.remove('d-none');
  document.getElementById('varModalComplementoBadge').style.display=varModalComplementosObrigatorio?'':'none';
  listaEl.innerHTML=lista.map(item=>{
    const nome=item.nome||'Complemento';
    const preco=parseFloat(item.preco||0);
    return `<div class="comp-extra-row" data-nome="${_escH(nome)}" data-preco="${preco}">
      <div>
        ${_escH(nome)}
        <small>R$ ${preco.toFixed(2).replace('.',',')}</small>
      </div>
      <button type="button" class="comp-extra-btn">+</button>
    </div>`;
  }).join('');
}

function filtrarVariacoesLoja(){
  const termo=(document.getElementById('varModalBusca').value||'').toLowerCase().trim();
  document.getElementById('varModalLista').querySelectorAll('.comp-radio-row').forEach(row=>{
    const nome=(row.dataset.nome||'').toLowerCase();
    row.style.display=!termo||nome.includes(termo)?'':'none';
  });
}

function varModalQtd(delta){
  const el=document.getElementById('varModalQtd');
  const atual=parseInt(el.textContent,10)||1;
  el.textContent=String(Math.max(1,atual+delta));
  _atualizarVarModalBtn();
}

function _atualizarVarModalBtn(){
  const btn=document.getElementById('varModalAddBtn');
  if(!varModalSelecionada){
    btn.disabled=true;
    btn.textContent='Selecionar variação';
    return;
  }
  const qtd=parseInt(document.getElementById('varModalQtd').textContent,10)||1;
  const extraValor=varModalExtrasSelecionados.reduce((s,e)=>s+e.preco,0);
  const complementoValor=varModalComplementoSelecionado?varModalComplementoSelecionado.preco:0;
  const total=(varModalSelecionada.preco+extraValor+complementoValor)*qtd;
  btn.disabled=false;
  btn.textContent=`Adicionar ${fmtR(total)}`;
}

function confirmarVariacaoLoja(){
  if(!varModalAtual||!varModalSelecionada)return;
  if(varModalExtrasObrigatorio && varModalExtrasSelecionados.length===0){
    toast('Selecione um extra.');
    return;
  }
  if(varModalComplementosObrigatorio && !varModalComplementoSelecionado){
    toast('Selecione um complemento.');
    return;
  }
  const qtd=parseInt(document.getElementById('varModalQtd').textContent,10)||1;
  const extraLabel=varModalExtrasSelecionados.length?varModalExtrasSelecionados.map(e=>` + ${e.nome}`).join(''):'';
  const complementoLabel=varModalComplementoSelecionado?` + ${varModalComplementoSelecionado.nome}`:'';
  const nome=`${varModalAtual.nome} - ${varModalSelecionada.nome}${extraLabel}${complementoLabel}`;
  const extraPrecoTotal=varModalExtrasSelecionados.reduce((s,e)=>s+e.preco,0);
  const preco=varModalSelecionada.preco+extraPrecoTotal+(varModalComplementoSelecionado?varModalComplementoSelecionado.preco:0);
  const obs=document.getElementById('varModalObs').value.trim();
  const varKey=varModalAtual.produtoId+'-var-'+varModalSelecionada.id+(varModalExtrasSelecionados.length?('-'+varModalExtrasSelecionados.map(e=>e.nome).join(',')):'')+(varModalComplementoSelecionado?('-'+varModalComplementoSelecionado.nome):'');
  const idx=carrinho.findIndex(i=>i.varKey===varKey&&i.obs===obs);
  if(idx>=0){carrinho[idx].q+=qtd;}
  else carrinho.push({id:varModalAtual.produtoId,n:nome,p:preco,img:varModalAtual.imagem,q:qtd,obs,varKey});
  salvar();uiAtualizar();fecharVarModalLoja();toastCart(nome);
}

/* ── Carrinho ─────── */
function abrirCarrinho(){
  if(!CFG.lojaAberta && !CFG.agendDeliveryAtivo && !CFG.agendRetiradaAtivo){toast('Loja fechada no momento!');return;}
  renderCarrinho();abrirSheet('cartSheet');
}
function renderCarrinho(){
  const body=document.getElementById('cartBody'), footer=document.getElementById('cartFooter');
  if(!carrinho.length){
    body.innerHTML='<div class="cart-empty"><i class="bi bi-bag"></i>Nenhum item adicionado</div>';
    footer.style.display='none';return;
  }
  footer.style.display='';
  const logoHtml=CFG.lojaPerfil
    ?`<img class="cart-store-logo-img" src="${CFG.lojaPerfil}" alt="">`
    :`<div class="cart-store-logo-txt">${CFG.nomeLoja.charAt(0)}</div>`;
  body.innerHTML=`
    <div class="cart-store-head">
      ${logoHtml}
      <div>
        <div class="cart-store-name">${CFG.nomeLoja}</div>
        <a class="cart-store-add" onclick="fecharSheet('cartSheet')">Adicionar mais itens</a>
      </div>
    </div>
    ${!CFG.lojaAberta?(CFG.agendDeliveryAtivo||CFG.agendRetiradaAtivo?`<div class="cart-closed-banner"><i class="bi bi-calendar-check-fill"></i><div><div class="cart-closed-title">Loja fechada — pedido agendado disponível</div><div class="cart-closed-desc">A loja está fechada agora, mas você pode fazer um pedido agendado. Escolha <strong>Entrega agendada</strong> ou <strong>Retirada agendada</strong> no checkout.</div></div></div>`:`<div class="cart-closed-banner"><i class="bi bi-exclamation-triangle-fill"></i><div><div class="cart-closed-title">Loja fechada no momento</div><div class="cart-closed-desc">Este estabelecimento está fechado no momento.</div></div></div>`):''}
    <div class="cart-items-title">Itens adicionados</div>
    ${carrinho.map((item,i)=>{
      const isResgate = item.obs==='[Resgate de pontos]';
      const pts=parseInt(item.pontos||0);
      return `<div class="cart-item">
        <div class="cart-item-img-wrap">
          ${item.img?`<img class="cart-item-img" src="${item.img}" alt="">`:`<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;color:#ddd;font-size:1.2rem"><i class="bi bi-image"></i></div>`}
          <button class="cart-item-edit-btn" onclick="abrirProdutoPorId(${item.id})"><i class="bi bi-pencil-fill"></i></button>
        </div>
        <div class="cart-item-info" style="flex:1">
          <div class="cart-item-name">${item.n}</div>
          <div class="cart-item-price">${isResgate?'<span style="color:#16a34a;font-size:.72rem;font-weight:700">🎁 Resgatado com pontos</span>':fmtR(item.p*item.q)}</div>
          ${CFG.clubePontosAtivo&&!isResgate&&pts>0?`<div class="cart-item-pts"><i class="bi bi-currency-dollar" style="font-size:.65rem"></i> +${pts} pts</div>`:''}
          ${!isResgate&&item.combosels&&item.combosels.length?`<div class="cart-combo-sels"><div class="cart-combo-title">Selecione as opções!</div>${item.combosels.map(s=>`<div class="cart-combo-row"><span class="cart-combo-qty">${s.qtd}</span>${s.nome}</div>`).join('')}</div>${item.uobs?`<div class="cart-item-obs">${item.uobs}</div>`:''}`:(!isResgate&&item.obs&&!item.obs.startsWith('[combo]')?`<div class="cart-item-obs">${item.obs}</div>`:'')}
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="altQ(${i},-1)"><i class="bi bi-dash"></i></button>
          <span class="cart-item-qty-num">${item.q}</span>
          ${isResgate
            ? `<button class="qty-btn" style="opacity:.3;cursor:not-allowed" disabled><i class="bi bi-plus"></i></button>`
            : `<button class="qty-btn plus" onclick="altQ(${i},1)"><i class="bi bi-plus"></i></button>`
          }
        </div>
      </div>`;
    }).join('')}
    <div id="cartCrossSellWrap"></div>
    ${renderBenefitCards()}
    <div class="cupons-section">
      <button class="cupons-toggle" id="cuponsToggle" onclick="toggleCupons()">
        <span><i class="bi bi-ticket-perforated" style="margin-right:6px"></i>Cupons</span>
        <i class="bi bi-chevron-down chevron"></i>
      </button>
      <div class="cupons-body" id="cuponsBody">
        <div style="font-size:.8rem;color:#aaa">Toque para ver cupons disponíveis.</div>
      </div>
    </div>`;
  const sub=carrinho.reduce((s,i)=>s+i.p*i.q,0);
  const cnt=carrinho.reduce((s,i)=>s+i.q,0);
  const cntTxt=cnt===1?'1 item':cnt+' itens';
  document.getElementById('cTotal').textContent=fmtR(sub);
  document.getElementById('cItemCount').textContent=cntTxt;
  /* atualiza contact sheet totals */
  const ct=document.getElementById('contactTotal'); if(ct) ct.textContent=fmtR(sub);
  const ci=document.getElementById('contactItemCount'); if(ci) ci.textContent=cntTxt;
  /* validação pedido mínimo */
  const minAlert=document.getElementById('minAlert');
  const minTxt=document.getElementById('minAlertTxt');
  const minBase=pedidoMinimoMaisBaixo();
  if(minBase>0&&sub<minBase){
    const falta=minBase-sub;
    if(minTxt) minTxt.textContent=`Pedido mínimo é ${fmtR(minBase)}. Faltam ${fmtR(falta)} para prosseguir.`;
    if(minAlert) minAlert.classList.remove('d-none');
  } else {
    if(minAlert) minAlert.classList.add('d-none');
  }
  carregarCrossSellSugestoes();
}
function carregarCrossSellSugestoes(){
  const wrap=document.getElementById('cartCrossSellWrap');
  if(!wrap) return;
  const ids=carrinho.map(i=>i.id).filter(Boolean).join(',');
  fetch(`api/cross_sell_sugestoes.php?produtos_ids=${ids}`)
    .then(r=>r.json())
    .then(d=>{
      if(!d.ok||!d.ativo||!d.produtos||!d.produtos.length){wrap.innerHTML='';return;}
      wrap.innerHTML=`
        <div class="cart-crosssell">
          <div class="cart-crosssell-title">Que tal adicionar também?</div>
          <div class="cart-crosssell-scroll">
            ${d.produtos.map(p=>`
              <div class="cart-crosssell-card">
                ${p.imagem?`<img class="cart-crosssell-img" src="${p.imagem}" alt="">`:`<div class="cart-crosssell-img" style="display:flex;align-items:center;justify-content:center;color:#ddd"><i class="bi bi-image"></i></div>`}
                <div class="cart-crosssell-nome">${p.nome}</div>
                <div class="cart-crosssell-preco">${fmtR(p.preco)}</div>
                <button class="cart-crosssell-add" onclick="adicionarSugestaoCrossSell(${p.id},'${p.nome.replace(/'/g,"\\'")}',${p.preco},'${(p.imagem||'').replace(/'/g,"\\'")}')">Adicionar</button>
              </div>
            `).join('')}
          </div>
        </div>`;
    })
    .catch(()=>{wrap.innerHTML='';});
}
function adicionarSugestaoCrossSell(id,nome,preco,imagem){
  const idx=carrinho.findIndex(i=>i.id===id&&!i.obs);
  if(idx>=0){carrinho[idx].q+=1;carrinho[idx].crossSell=true;}
  else carrinho.push({id,n:nome,p:preco,img:imagem||'',q:1,crossSell:true});
  salvar();uiAtualizar();renderCarrinho();toastCart(nome);
}
let cupomAplicado=null; // {codigo, tipo, desconto, valor}
async function toggleCupons(){
  const body=document.getElementById('cuponsBody');
  const toggle=document.getElementById('cuponsToggle');
  if(!body||!toggle) return;
  body.classList.toggle('show');
  toggle.classList.toggle('open');
  if(!body.classList.contains('show')) return;
  /* Recarrega sempre que abre para refletir cupons ativados/desativados */
  delete body.dataset.loaded;
  body.dataset.loaded='1';
  body.innerHTML='<div style="font-size:.8rem;color:#aaa">Carregando...</div>';
  try{
    const sub=carrinho.reduce((s,i)=>s+i.p*i.q,0);
    const r=await fetch(`api/cupons_publicos.php?loja_id=${CFG.lojaId}`);
    const d=await r.json();
    /* O campo de código SEMPRE aparece, mesmo sem cupons públicos */
    const inputHtml=`
      <div id="cupomInputWrap" style="display:flex;gap:8px;margin-bottom:12px">
        <input type="text" id="cupomCodigo" placeholder="Código do cupom" style="flex:1;border:1.5px solid #e5e7eb;border-radius:10px;padding:9px 12px;font-size:.84rem;font-family:inherit;outline:none;text-transform:uppercase">
        <button onclick="aplicarCupomManual()" style="background:var(--brown);color:#fff;border:0;border-radius:10px;padding:9px 14px;font-size:.82rem;font-weight:700;font-family:inherit;cursor:pointer">Aplicar</button>
      </div>`;
    const cupons=d.cupons||[];
    const listHtml=cupons.length
      ?`<div style="font-size:.72rem;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Disponíveis para você</div>
        ${cupons.map(c=>`
          <div style="display:flex;align-items:center;justify-content:space-between;border:1.5px dashed #e5e7eb;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fafafa">
            <div>
              <div style="font-size:.82rem;font-weight:700;color:#111">${c.codigo}</div>
              <div style="font-size:.72rem;color:#888">${c.desc_label}${c.minimo>0?' · Min '+fmtR(c.minimo):''}</div>
            </div>
            <button onclick="aplicarCupom('${c.codigo}')" style="background:var(--brown);color:#fff;border:0;border-radius:8px;padding:6px 12px;font-size:.76rem;font-weight:700;font-family:inherit;cursor:pointer">Usar</button>
          </div>`).join('')}`
      :'';
    body.innerHTML=inputHtml+listHtml;
  }catch(e){body.innerHTML='<div style="font-size:.8rem;color:#aaa">Erro ao carregar cupons.</div>';}
}
async function aplicarCupomManual(){
  const codigo=(document.getElementById('cupomCodigo')?.value||'').trim().toUpperCase();
  if(!codigo){toast('Digite o código do cupom');return;}
  await aplicarCupom(codigo);
}
async function aplicarCupom(codigo){
  const sub  = carrinho.reduce((s,i)=>s+i.p*i.q, 0);
  const taxa = endResumoData?.taxa || 0;
  const body = new URLSearchParams({
    codigo,
    subtotal:   sub,
    tipo:       tipoPed || '', /* vazio se ainda não escolheu entrega/retirada */
    taxa,
    loja_id:    CFG.lojaId,
    cliente_id: _authCliente?.id || 0,
    telefone:   _authCliente?.telefone || localStorage.getItem('lc_tel') || '',
  });
  try{
    const r = await fetch('api/cupons_validar.php', {method:'POST', body});
    const d = await r.json();
    if(!d.ok){ toast(d.msg || 'Cupom inválido'); return; }
    cupomAplicado = {codigo:d.codigo, tipo:d.tipo, desconto:d.desconto, valor:d.valor};
    toast(`Cupom "${d.codigo}" aplicado! -${fmtR(d.valor)}`);
    renderCarrinho();       /* atualiza o carrinho e oculta o cupom aplicado */
    atualizarTotalComCupom();
  }catch(e){ toast('Erro ao validar cupom. Tente novamente.'); }
}
function removerCupom(){
  cupomAplicado=null;
  atualizarTotalComCupom();
  toast('Cupom removido');
}

/* ── Banner de cupons disponíveis (topo da loja) ── */
let cuponsBannerCache=[];
async function verificarCupomBanner(){
  try{
    const r=await fetch(`api/cupons_publicos.php?loja_id=${CFG.lojaId}`);
    const d=await r.json();
    cuponsBannerCache=(d.ok&&Array.isArray(d.cupons))?d.cupons:[];
  }catch(e){ cuponsBannerCache=[]; }
  const banner=document.getElementById('profileAnnounce');
  if(!banner)return;
  if(cuponsBannerCache.length){
    const n=cuponsBannerCache.length;
    document.getElementById('profileAnnounceIcon').className='bi bi-ticket-perforated-fill';
    document.getElementById('profileAnnounceText').textContent=n===1
      ?'Você tem 1 cupom disponível! Toque para aproveitar.'
      :`Você tem ${n} cupons disponíveis! Toque para aproveitar.`;
    banner.classList.remove('d-none');
    banner.style.cursor='pointer';
    banner.onclick=abrirFluxoCupomBanner;
  }
  /* sem cupons: banner permanece oculto (não exibe mais a descrição da loja) */
}
function abrirFluxoCupomBanner(){
  if(!cuponsBannerCache.length)return;
  const nomeSalvo=(localStorage.getItem('lc_nome')||'').trim();
  const telSalvo=(localStorage.getItem('lc_tel')||'').replace(/\D/g,'');
  if(nomeSalvo&&telSalvo.length>=10){
    abrirCupomListModal();
  } else {
    abrirIdentCupomModal();
  }
}
function abrirIdentCupomModal(){
  document.getElementById('identCupomNome').value=localStorage.getItem('lc_nome')||'';
  document.getElementById('identCupomTel').value=localStorage.getItem('lc_tel')||'';
  document.getElementById('identCupomOverlay').classList.add('show');
  document.getElementById('identCupomModal').classList.add('show');
}
function fecharIdentCupomModal(){
  document.getElementById('identCupomOverlay').classList.remove('show');
  document.getElementById('identCupomModal').classList.remove('show');
}
function confirmarIdentCupom(){
  const nome=(document.getElementById('identCupomNome').value||'').trim();
  const tel=(document.getElementById('identCupomTel').value||'').replace(/\D/g,'');
  if(!nome){toast('Informe seu nome');return;}
  if(tel.length<10){toast('Informe um telefone válido');return;}
  localStorage.setItem('lc_nome',nome);
  localStorage.setItem('lc_tel',document.getElementById('identCupomTel').value);
  fecharIdentCupomModal();
  setTimeout(abrirCupomListModal,200);
}
function abrirCupomListModal(){
  const body=document.getElementById('cupomListBody');
  body.innerHTML=cuponsBannerCache.map(c=>`
    <div style="display:flex;align-items:center;justify-content:space-between;border:1.5px dashed #e5e7eb;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fafafa">
      <div>
        <div style="font-size:.82rem;font-weight:700;color:#111">${c.codigo}</div>
        <div style="font-size:.72rem;color:#888">${c.desc_label}${c.minimo>0?' · Min '+fmtR(c.minimo):''}</div>
      </div>
      <button onclick="usarCupomBanner('${c.codigo}')" style="background:var(--brown);color:#fff;border:0;border-radius:8px;padding:6px 12px;font-size:.76rem;font-weight:700;font-family:inherit;cursor:pointer">Usar</button>
    </div>`).join('');
  document.getElementById('cupomListOverlay').classList.add('show');
  document.getElementById('cupomListModal').classList.add('show');
}
function fecharCupomListModal(){
  document.getElementById('cupomListOverlay').classList.remove('show');
  document.getElementById('cupomListModal').classList.remove('show');
}
async function usarCupomBanner(codigo){
  await aplicarCupom(codigo);
  setTimeout(fecharCupomListModal,900);
}
function atualizarTotalComCupom(){
  const sub=carrinho.reduce((s,i)=>s+i.p*i.q,0);
  const desc=(cupomAplicado?cupomAplicado.valor:0)+(cashbackUsando?cashbackDescontado:0);
  const total=Math.max(0,sub-desc);
  const cntEl=document.getElementById('cItemCount');
  const cnt=carrinho.reduce((s,i)=>s+i.q,0);
  const cntTxt=cnt===1?'1 item':cnt+' itens';
  document.getElementById('cTotal').textContent=fmtR(total);
  document.getElementById('cartBarTotal').textContent=fmtR(sub);
  /* atualizar contact/chk totals */
  ['contactTotal','chkTotal'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=fmtR(total);});
  ['contactItemCount','chkItemCount','cItemCount'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=cntTxt;});
  const contactBd=document.getElementById('contactBreakdown');
  if(contactBd) contactBd.innerHTML=renderBreakdown(calcBreakdown(),false);
  const chkStep1Bd=document.getElementById('chkStep1Breakdown');
  if(chkStep1Bd) chkStep1Bd.innerHTML=renderBreakdown(calcBreakdown(),false);
  /* exibir linha de desconto cupom no footer */
  let descEl=document.getElementById('cupomDescRow');
  if(cupomAplicado){
    if(!descEl){
      const footer=document.getElementById('cartFooter');
      if(footer){
        descEl=document.createElement('div');
        descEl.id='cupomDescRow';
        descEl.style.cssText='display:flex;justify-content:space-between;font-size:.78rem;color:#7c3aed;margin-bottom:8px;font-weight:600';
        footer.insertBefore(descEl,footer.firstChild);
      }
    }
    if(descEl) descEl.innerHTML=`<span><i class="bi bi-tag-fill"></i> Cupom ${cupomAplicado.codigo}</span><span>-${fmtR(cupomAplicado.valor)} <button onclick="removerCupom()" style="border:0;background:transparent;color:#aaa;cursor:pointer;font-size:.75rem">✕</button></span>`;
  } else if(descEl){
    descEl.remove();
  }
}
function limparCarrinho(){
  if(!carrinho.length)return;
  /* devolver pontos de itens resgatados */
  carrinho.forEach(item=>{
    if(item.obs==='[Resgate de pontos]'&&_pontosClienteId&&(item._pontos||0)>0)
      devolverPontos(item._pontos);
  });
  carrinho=[];salvar();uiAtualizar();renderCarrinho();
}
function altQ(i,d){
  const item=carrinho[i];
  if(!item) return;
  item.q+=d;
  if(item.q<=0){
    /* devolver pontos se for resgate */
    if(item.obs==='[Resgate de pontos]' && _pontosClienteId){
      const custo=item._pontos||0;
      if(custo>0) devolverPontos(custo);
    }
    carrinho.splice(i,1);
  }
  salvar();uiAtualizar();renderCarrinho();
}
async function devolverPontos(custo){
  if(!_pontosClienteId||custo<=0) return;
  try{
    const body=new URLSearchParams({cliente_id:_pontosClienteId,pontos:custo,loja_id:CFG.lojaId});
    const r=await fetch('api/pontos_restaurar.php',{method:'POST',body});
    const d=await r.json();
    if(d.ok){
      _pontosSaldo=d.saldo_novo;
      const el=document.getElementById('pontosBalanceNum');
      if(el) el.textContent=d.saldo_novo.toLocaleString('pt-BR');
      renderPontosGrid(_pontosSaldo);
      toast('Pontos devolvidos: +'+custo+' pts');
    }
  }catch(e){}
}

/* ── Tipo de entrega (novo fluxo) ── */
const TIPO_IDS={entrega:'tcEntrega',entrega_agendada:'tcEntregaAg',retirada:'tcRetirada',retirada_agendada:'tcRetiradaAg'};
function selTipoNovo(tipo){
  tipoPed=tipo;
  /* atualiza radio cards */
  Object.entries(TIPO_IDS).forEach(([t,id])=>{
    const el=document.getElementById(id);
    if(el) el.classList.toggle('active',t===tipo);
  });
  /* mostra/oculta hint */
  document.getElementById('tipoHint')?.classList.toggle('d-none',true);
  /* resumos */
  const isEntrega=tipo==='entrega'||tipo==='entrega_agendada';
  const isRetirada=tipo==='retirada'||tipo==='retirada_agendada';
  const isAgendada=tipo==='entrega_agendada'||tipo==='retirada_agendada';
  /* mostra resumo endereço se já foi preenchido */
  const endEl=document.getElementById('endResumo');
  const retEl=document.getElementById('retResumo');
  const agEl =document.getElementById('agendResumo');
  if(endEl) endEl.classList.toggle('d-none',!(isEntrega&&endResumoData));
  if(retEl) retEl.classList.toggle('d-none',!isRetirada);
  if(agEl)  agEl.classList.toggle('d-none',!(isAgendada&&agendamento.slot));
  /* se entrega e ainda não tem endereço, abre endSheet */
  if(isEntrega&&!endResumoData){
    setTimeout(()=>abrirEnderecoSheet(),200);
  }
  /* se agendada e ainda não tem agendamento, abre agendSheet */
  if(isAgendada&&!agendamento.slot){
    if(!isEntrega||endResumoData) setTimeout(()=>abrirAgendamentoSheet(),200);
  }
  atualizarBtnContinuar();
}
function atualizarBtnContinuar(){
  const btn=document.getElementById('btnProxStep1');
  if(!btn) return;
  const isEntrega=tipoPed==='entrega'||tipoPed==='entrega_agendada';
  const isAgendada=tipoPed==='entrega_agendada'||tipoPed==='retirada_agendada';
  const ok=tipoPed&&
    (!isEntrega||endResumoData)&&
    (!isAgendada||agendamento.slot);
  btn.disabled=!ok;
  btn.style.opacity=ok?'1':'.5';
  atualizarChkStep1Breakdown();
}
function atualizarChkStep1Breakdown(){
  const el=document.getElementById('chkStep1Breakdown');
  if(!el) return;
  const sub=carrinho.reduce((s,i)=>s+i.p*i.q,0);
  const cnt=carrinho.reduce((s,i)=>s+i.q,0);
  const cntTxt=cnt===1?'1 item':cnt+' itens';
  const chkT=document.getElementById('chkTotal'); if(chkT) chkT.textContent=fmtR(sub);
  const chkI=document.getElementById('chkItemCount'); if(chkI) chkI.textContent=cntTxt;
  el.innerHTML=renderBreakdown(calcBreakdown(),false);
}
function toggleChkStep1Breakdown(){
  const el=document.getElementById('chkStep1Breakdown');
  const btn=document.getElementById('chkStep1BreakdownToggle');
  if(!el||!btn) return;
  const open=!el.classList.contains('d-none');
  el.classList.toggle('d-none',open);
  btn.querySelector('i').className='bi bi-chevron-'+(open?'down':'up');
}
function atualizarChkBreakdown(bd){
  const cnt=carrinho.reduce((s,i)=>s+i.q,0);
  const cntTxt=cnt===1?'1 item':cnt+' itens';
  const bdEl=document.getElementById('chkBreakdown'); if(bdEl) bdEl.innerHTML=renderBreakdown(bd,false);
  const totEl=document.getElementById('chkBreakdownTotal'); if(totEl) totEl.textContent=fmtR(bd.total);
  const cntEl=document.getElementById('chkBreakdownItemCount'); if(cntEl) cntEl.textContent=cntTxt;
}
function toggleChkBreakdown(){
  const el=document.getElementById('chkBreakdown');
  const btn=document.getElementById('chkBreakdownToggle');
  if(!el||!btn) return;
  const open=!el.classList.contains('d-none');
  el.classList.toggle('d-none',open);
  btn.querySelector('i').className='bi bi-chevron-'+(open?'down':'up');
}

/* ── Endereço sheet ── */
let _endSalvo=null; // endereço do banco do cliente autenticado

function abrirEnderecoSheet(){
  const savedCard=document.getElementById('endSavedCard');
  const formWrap=document.getElementById('endFormWrap');
  /* verifica se cliente autenticado tem endereço no banco */
  const cli=_authCliente;
  if(cli && cli.rua && !_skipPrefill){
    _endSalvo={rua:cli.rua,numero:cli.numero||'',bairro:cli.bairro||'',cidade:cli.cidade||'',estado:cli.estado||'',cep:cli.cep||'',comp:cli.complemento||''};
    const partes=[
      (cli.rua||'')+(cli.numero?', '+cli.numero:''),
      cli.bairro,
      (cli.cidade||'')+(cli.estado?'/'+cli.estado:''),
      cli.cep?'CEP '+cli.cep:''
    ].filter(Boolean);
    document.getElementById('endSavedText').textContent=partes.join(', ');
    /* calcular taxa para exibir */
    calcularTaxaEntrega(cli.bairro||'');
    setTimeout(()=>{
      const taxa=taxaAtual>0?'Taxa de entrega: '+fmtR(taxaAtual):'Entrega grátis';
      const taxaEl=document.getElementById('endSavedTaxa'); if(taxaEl) taxaEl.textContent=taxa;
    },400);
    if(savedCard) savedCard.style.display='';
    if(formWrap) formWrap.style.display='none';
    abrirSheet('endSheet'); return;
  }
  /* sem endereço no banco → pré-preencher pelo localStorage */
  if(savedCard) savedCard.style.display='none';
  if(formWrap) formWrap.style.display='';
  const tel=(cli?.telefone||document.getElementById('cTel')?.value||localStorage.getItem('lc_tel')||'');
  const saved=_skipPrefill?{}:JSON.parse(localStorage.getItem('lc_end_'+tel.replace(/\D/g,''))||'{}');
  if(saved.cep){
    const setV=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
    setV('eCep',saved.cep);
    if(saved.r||saved.b){
      const camposEl=document.getElementById('endCampos'); if(camposEl) camposEl.style.display='';
      setV('eRua',saved.r);setV('eNum',saved.n);setV('eBairro',saved.b);
      setV('eCidade',saved.cidade);setV('eComp',saved.c);
      const eEst=document.getElementById('eEstado'); if(eEst) eEst.value=saved.estado||'';
      calcularTaxaEntrega(saved.b);
    }
  }
  abrirSheet('endSheet');
}

function usarEnderecoSalvo(){
  if(!_endSalvo){confirmarEndereco();return;}
  const setV=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  setV('eCep',_endSalvo.cep);setV('eRua',_endSalvo.rua);setV('eNum',_endSalvo.numero);
  setV('eBairro',_endSalvo.bairro);setV('eCidade',_endSalvo.cidade);
  setV('eComp',_endSalvo.comp);
  const eEst=document.getElementById('eEstado'); if(eEst) eEst.value=_endSalvo.estado||'';
  const camposEl=document.getElementById('endCampos'); if(camposEl) camposEl.style.display='';
  calcularTaxaEntrega(_endSalvo.bairro||'');
  setTimeout(()=>confirmarEndereco(), 300);
}

function editarEndereco(){
  const savedCard=document.getElementById('endSavedCard');
  const formWrap=document.getElementById('endFormWrap');
  if(savedCard) savedCard.style.display='none';
  if(formWrap){ formWrap.style.display=''; }
  if(_endSalvo){
    const setV=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
    setV('eCep',_endSalvo.cep);setV('eRua',_endSalvo.rua);setV('eNum',_endSalvo.numero);
    setV('eBairro',_endSalvo.bairro);setV('eCidade',_endSalvo.cidade);
    setV('eComp',_endSalvo.comp);
    const eEst=document.getElementById('eEstado'); if(eEst) eEst.value=_endSalvo.estado||'';
    const camposEl=document.getElementById('endCampos'); if(camposEl) camposEl.style.display='';
    calcularTaxaEntrega(_endSalvo.bairro||'');
  }
}
function confirmarEndereco(){
  const rua=(document.getElementById('eRua')?.value||'').trim();
  const num=(document.getElementById('eNum')?.value||'').trim();
  const bairro=(document.getElementById('eBairro')?.value||'').trim();
  const cidade=(document.getElementById('eCidade')?.value||'').trim();
  const estado=(document.getElementById('eEstado')?.value||'').trim();
  const cep=(document.getElementById('eCep')?.value||'').replace(/\D/g,'');
  const comp=(document.getElementById('eComp')?.value||'').trim();
  if(!rua){toast('Informe a rua/avenida');return;}
  if(!num){toast('Informe o número');return;}
  if((CFG.taxaEntregaTipo||'fixa')==='bairro'){
    if(!bairro){toast('Informe o bairro');return;}
    if(!bairroEhAtendido(bairro)){
      calcularTaxaEntrega(bairro);
      abrirBairroAlert(bairro);
      return;
    }
  }
  const partes=[rua+(num?', '+num:''),comp||null,bairro,cidade+(estado?'/'+estado:''),cep?'CEP '+document.getElementById('eCep').value:''].filter(Boolean);
  const addr=partes.join(', ');
  const taxaLabel=taxaAtual>0?'Taxa de entrega: '+fmtR(taxaAtual):'Entrega grátis';
  /* salvar resumo */
  endResumoData={addr,taxa:taxaAtual};
  document.getElementById('endResumoAddr').textContent=addr;
  document.getElementById('endResumoTaxa').textContent=taxaLabel;
  document.getElementById('endResumo').classList.remove('d-none');
  /* salvar no localStorage */
  const tel=(document.getElementById('cTel')?.value||localStorage.getItem('lc_tel')||'').replace(/\D/g,'');
  if(tel) localStorage.setItem('lc_end_'+tel,JSON.stringify({cep:document.getElementById('eCep').value,r:rua,n:num,b:bairro,cidade,estado,c:comp}));
  fecharSheet('endSheet');
  /* se agendada, abrir agendamento */
  if(tipoPed==='entrega_agendada'&&!agendamento.slot) setTimeout(()=>abrirAgendamentoSheet(),300);
  atualizarBtnContinuar();
}

/* ── Modal: endereço manual (Não sei meu CEP) ── */
function abrirCepManual(){
  document.getElementById('cepManualOverlay')?.classList.add('show');
}
function fecharCepManual(event){
  if(event && event.target !== event.currentTarget) return;
  document.getElementById('cepManualOverlay')?.classList.remove('show');
}
function confirmarCepManual(){
  const rua=(document.getElementById('cmRua')?.value||'').trim();
  const num=(document.getElementById('cmNum')?.value||'').trim();
  const bairro=(document.getElementById('cmBairro')?.value||'').trim();
  const cidade=(document.getElementById('cmCidade')?.value||'').trim();
  const estado=(document.getElementById('cmEstado')?.value||'').trim();
  const comp=(document.getElementById('cmComp')?.value||'').trim();
  if(!rua){toast('Informe a rua/avenida');return;}
  if(!num){toast('Informe o número');return;}
  const setV=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  setV('eRua',rua);setV('eNum',num);setV('eBairro',bairro);setV('eCidade',cidade);setV('eEstado',estado);setV('eComp',comp);
  setV('eCep','');
  const campos=document.getElementById('endCampos'); if(campos) campos.style.display='';
  document.getElementById('cepManualOverlay')?.classList.remove('show');
  confirmarEndereco();
}

/* ── Agendamento sheet ── */
let agendDiaAtual=null;
function abrirAgendamentoSheet(){
  renderStepsBar(2); /* Agendamento */
  const horarios=tipoPed==='entrega_agendada'?CFG.agendDeliveryHorarios:CFG.agendRetiradaHorarios;
  const minTipo=tipoPed==='entrega_agendada'?CFG.agendDeliveryMinTipo:CFG.agendRetiradaMinTipo;
  const minVal=tipoPed==='entrega_agendada'?CFG.agendDeliveryMinVal:CFG.agendRetiradaMinVal;
  const maxVal=tipoPed==='entrega_agendada'?CFG.agendDeliveryMaxVal:CFG.agendRetiradaMaxVal;
  renderAgendDatas(horarios,minTipo,minVal,maxVal);
  document.getElementById('agendSlots').innerHTML='<div class="agend-empty">Selecione uma data acima</div>';
  agendamento.slot=null;
  const btn=document.getElementById('btnAgendConfirmar'); if(btn){btn.disabled=true;btn.style.opacity='.5';}
  abrirSheet('agendSheet');
}
const DIAS_NOMES=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
function renderAgendDatas(horarios,minTipo,minVal,maxVal){
  const container=document.getElementById('agendDates'); if(!container) return;
  /* calcular range de datas disponíveis */
  const agora=new Date();
  const minMs=minTipo==='horas'?minVal*3600000:minVal*86400000;
  const maxMs=maxVal*86400000;
  const dataMin=new Date(agora.getTime()+minMs);
  const dataMax=new Date(agora.getTime()+maxMs);
  const dias=[];
  const d=new Date(dataMin); d.setHours(0,0,0,0);
  while(d<=dataMax){
    /* chave no objeto: 1=Dom,2=Seg,...,7=Sáb (padrão do sistema) */
    const diaJS=d.getDay(); // 0=Dom,6=Sáb
    const diaKey=(diaJS===0?1:diaJS+1); // converter para chave 1-7
    if(horarios[diaKey]||horarios[String(diaKey)]){
      dias.push({date:new Date(d),diaKey,horario:horarios[diaKey]||horarios[String(diaKey)]});
    }
    d.setDate(d.getDate()+1);
  }
  if(!dias.length){container.innerHTML='<div class="agend-empty">Nenhuma data disponível</div>';return;}
  container.innerHTML=dias.map((dia,i)=>`
    <button class="agend-day-btn" onclick="selDiaAgend(${i})" data-idx="${i}">
      <div class="agend-day-num">${dia.date.getDate()}</div>
      <div class="agend-day-wk">${DIAS_NOMES[dia.date.getDay()]}</div>
    </button>`).join('');
  container._dias=dias; // guardar dados
}
function selDiaAgend(idx){
  const container=document.getElementById('agendDates'); if(!container) return;
  const dias=container._dias; if(!dias||!dias[idx]) return;
  agendDiaAtual=dias[idx];
  agendamento.data=dias[idx].date;
  agendamento.slot=null;
  const btn=document.getElementById('btnAgendConfirmar'); if(btn){btn.disabled=true;btn.style.opacity='.5';}
  /* highlight day */
  container.querySelectorAll('.agend-day-btn').forEach((b,i)=>b.classList.toggle('active',i===idx));
  /* render slots */
  renderAgendSlots(dias[idx].horario.inicio,dias[idx].horario.fim);
}
function renderAgendSlots(inicio,fim){
  const container=document.getElementById('agendSlots'); if(!container) return;
  const [hI,mI]=inicio.split(':').map(Number);
  const [hF,mF]=fim.split(':').map(Number);
  const slots=[];
  let cur=hI*60+mI;
  const end=hF*60+mF;
  while(cur+30<=end){
    const hA=String(Math.floor(cur/60)).padStart(2,'0');
    const mA=String(cur%60).padStart(2,'0');
    const hB=String(Math.floor((cur+30)/60)).padStart(2,'0');
    const mB=String((cur+30)%60).padStart(2,'0');
    slots.push(`${hA}:${mA} - ${hB}:${mB}`);
    cur+=30;
  }
  if(!slots.length){container.innerHTML='<div class="agend-empty">Sem horários disponíveis</div>';return;}
  container.innerHTML=slots.map(s=>`<button class="agend-slot" onclick="selSlotAgend(this,'${s}')">${s}</button>`).join('');
}
function selSlotAgend(el,slot){
  document.querySelectorAll('.agend-slot').forEach(b=>{
    b.classList.remove('active');
    b.innerHTML=b.textContent.replace(/<.*>/,'');
  });
  el.classList.add('active');
  el.innerHTML=`${slot} <i class="bi bi-check-circle-fill agend-slot-check"></i>`;
  agendamento.slot=slot;
  const btn=document.getElementById('btnAgendConfirmar');
  if(btn){btn.disabled=false;btn.style.opacity='1';}
  /* atualiza footer info */
  const footInfo=document.getElementById('agendFooterInfo');
  if(footInfo&&agendamento.data){
    const dateStr=agendamento.data.toLocaleDateString('pt-BR',{day:'numeric',month:'long'});
    footInfo.textContent=`Data de agendamento: ${dateStr} ${slot}`;
    footInfo.style.display='';
  }
}
function confirmarAgendamento(){
  if(!agendamento.data||!agendamento.slot){toast('Selecione data e horário');return;}
  const d=agendamento.data;
  const dateStr=d.toLocaleDateString('pt-BR',{day:'numeric',month:'long'});
  const txt=`${dateStr} ${agendamento.slot}`;
  document.getElementById('agendResumoTxt').textContent=txt;
  document.getElementById('agendResumo').classList.remove('d-none');
  fecharSheet('agendSheet');
  atualizarBtnContinuar();
}

/* ── Contato ─────── */
function abrirContato(){
  renderStepsBar(0); /* Contato = step 0 */
  const sub=carrinho.reduce((s,i)=>s+i.p*i.q,0);
  const minBase=pedidoMinimoMaisBaixo();
  if(minBase>0&&sub<minBase){toast('Pedido mínimo é '+fmtR(minBase)+'. Adicione mais itens.');return;}
  const nomeEl=document.getElementById('cNomeContact');
  const telEl=document.getElementById('cTelContact');
  if(!_skipPrefill){
    /* prioridade: cliente autenticado > localStorage */
    const nomePre = _authCliente?.nome || localStorage.getItem('lc_nome') || '';
    const telPre  = _authCliente?.telefone || localStorage.getItem('lc_tel') || '';
    if(nomeEl&&!nomeEl.value) nomeEl.value = nomePre;
    if(telEl&&!telEl.value)   telEl.value  = telPre;
  }
  const cnt=carrinho.reduce((s,i)=>s+i.q,0);
  const cntTxt=cnt===1?'1 item':cnt+' itens';
  const ct=document.getElementById('contactTotal'); if(ct) ct.textContent=fmtR(sub);
  const ci=document.getElementById('contactItemCount'); if(ci) ci.textContent=cntTxt;
  const contactBd=document.getElementById('contactBreakdown');
  if(contactBd) contactBd.innerHTML=renderBreakdown(calcBreakdown(),false);
  fecharSheet('cartSheet');
  setTimeout(()=>abrirSheet('contactSheet'),250);
}
function voltarDoContato(){
  fecharSheet('contactSheet');
  setTimeout(()=>abrirCarrinho(),250);
}
function continuarDoContato(){
  const nome=(document.getElementById('cNomeContact')?.value||'').trim();
  const tel=(document.getElementById('cTelContact')?.value||'').replace(/\D/g,'');
  if(!nome){toast('Informe seu nome');return;}
  if(tel.length<10){toast('Telefone inválido');return;}
  marcarStepConcluido(0); /* Contato concluído */
  /* copiar para campos ocultos usados por enviar() */
  const cNomeEl=document.getElementById('cNome'); if(cNomeEl) cNomeEl.value=document.getElementById('cNomeContact').value;
  const cTelEl=document.getElementById('cTel'); if(cTelEl) cTelEl.value=document.getElementById('cTelContact').value;
  localStorage.setItem('lc_nome',nome);
  localStorage.setItem('lc_tel',document.getElementById('cTelContact').value);
  /* cashback já foi verificado em verificarBeneficiosContato (digitação em tempo real)
     só verifica novamente se ainda não tem saldo carregado */
  if(CFG.cashbackAtivo && cashbackSaldo<=0) verificarCashbackFluxo(tel);
  fecharSheet('contactSheet');
  setTimeout(()=>{irStep(1);abrirSheet('chkSheet');},250);
}
function maskTelContact(el){
  let v=el.value.replace(/\D/g,'');
  if(v.length>11)v=v.slice(0,11);
  if(v.length>6)v=v.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3');
  else if(v.length>2)v=v.replace(/(\d{2})(\d+)/,'($1) $2');
  el.value=v;
}

let _beneficiosTimer=null;
async function verificarBeneficiosContato(telMask){
  const digits=(telMask||'').replace(/\D/g,'');
  const wrap=document.getElementById('contactCashbackWrap');
  if(digits.length<10){if(wrap)wrap.style.display='none';return;}
  clearTimeout(_beneficiosTimer);
  _beneficiosTimer=setTimeout(async()=>{
    if(!CFG.cashbackAtivo){if(wrap)wrap.style.display='none';return;}
    try{
      const r=await fetch(`api/cashback_check.php?tel=${encodeURIComponent(digits)}&loja_id=${CFG.lojaId}`);
      const d=await r.json();
      if(d.ok && parseFloat(d.saldo||0)>0){
        cashbackSaldo=parseFloat(d.saldo);
        if(d.expira_em) _cbValidade=d.expira_em;
        const valEl=document.getElementById('contactCashbackValor');
        if(valEl) valEl.textContent=fmtR(cashbackSaldo);
        if(wrap) wrap.style.display='';
      } else {
        cashbackSaldo=0;
        if(wrap) wrap.style.display='none';
      }
    }catch(e){}
  },500);
}

/* ── Checkout ─────── */
function abrirCheckout(){
  const sub=carrinho.reduce((s,i)=>s+i.p*i.q,0);
  const minBase=pedidoMinimoMaisBaixo();
  if(minBase>0&&sub<minBase){toast('Pedido mínimo é '+fmtR(minBase)+'. Adicione mais itens.');return;}
  fecharSheet('cartSheet');
  setTimeout(()=>{irStep(1);abrirSheet('chkSheet');},250);
}
/* ── Breakdown footer ── */
function calcBreakdown(){
  const sub=carrinho.reduce((s,i)=>s+i.p*i.q,0);
  const isEnt=tipoPed==='entrega'||tipoPed==='entrega_agendada';
  const taxa=isEnt&&endResumoData?taxaAtual:null; /* null = ainda não calculada */
  const cbUsar=cashbackUsando?cashbackDescontado:0;
  const cupDesc=cupomAplicado?cupomAplicado.valor:0;
  const total=Math.max(0,sub+(taxa||0)-cbUsar-cupDesc);
  const cbReceber=CFG.cashbackAtivo&&CFG.cashbackPct>0?Math.round(total*CFG.cashbackPct/100*100)/100:0;
  return {sub,taxa,cbUsar,cupDesc,total,cbReceber};
}
function renderBreakdown(bd,incluirTotal=true){
  const cnt=carrinho.reduce((s,i)=>s+i.q,0);
  let rows=`<div class="chk-breakdown-row"><span>Subtotal</span><span>${fmtR(bd.sub)}</span></div>`;
  if(bd.cbUsar>0) rows+=`<div class="chk-breakdown-row cashback"><span>Cashback usado</span><span>- ${fmtR(bd.cbUsar)}</span></div>`;
  if(bd.cupDesc>0) rows+=`<div class="chk-breakdown-row cashback"><span>Cupom</span><span>- ${fmtR(bd.cupDesc)}</span></div>`;
  const isEntregaTipo=tipoPed==='entrega'||tipoPed==='entrega_agendada';
  if(isEntregaTipo){
    const taxaTxt=bd.taxa===null?'<span class="chk-breakdown-taxa-spinner">A ser calculada</span>':fmtR(bd.taxa);
    rows+=`<div class="chk-breakdown-row"><span>Taxa de entrega</span><span>${taxaTxt}</span></div>`;
  }
  if(bd.cbReceber>0) rows+=`<div class="chk-breakdown-row ganho"><span>Cashback à receber (após 12 horas da compra)</span><span>${fmtR(bd.cbReceber)}</span></div>`;
  if(incluirTotal) rows+=`<div class="chk-breakdown-row total-row"><span>Total da compra / ${fmtR(bd.total)}</span><span>${cnt===1?'1 item':cnt+' itens'}</span></div>`;
  return rows;
}
function toggleContactBreakdown(){
  const el=document.getElementById('contactBreakdown');
  const btn=document.getElementById('contactBreakdownToggle');
  if(!el||!btn) return;
  const open=!el.classList.contains('d-none');
  el.classList.toggle('d-none',open);
  btn.querySelector('i').className='bi bi-chevron-'+(open?'down':'up');
}

function irStep(n){
  document.querySelectorAll('.chk-step').forEach(s=>s.classList.remove('active'));
  const stepEl=document.getElementById('chk'+n); if(stepEl) stepEl.classList.add('active');
  const titles={1:'Entrega',3:'Pagamento',4:'Confirmado!',5:'Resumo'};
  const titleEl=document.getElementById('chkTitle'); if(titleEl) titleEl.textContent=titles[n]||'';
  const footerStep1=document.getElementById('chkFooterStep1');
  const footerBreakdown=document.getElementById('chkFooterBreakdown');
  const btnProx=document.getElementById('btnProx');
  const foot=document.getElementById('chkFooter');
  /* oculta tudo */
  if(footerStep1) footerStep1.style.display='none';
  if(footerBreakdown) footerBreakdown.style.display='none';
  if(n===4){
    if(foot) foot.style.display='none';
    setTimeout(lancarParticulas, 400);
  } else if(n===1){
    if(foot) foot.style.display='';
    if(footerStep1) footerStep1.style.display='';
    atualizarChkStep1Breakdown();
    renderStepsBar(1); /* Entrega */
  } else if(n===3){
    if(foot) foot.style.display='';
    if(footerBreakdown) footerBreakdown.style.display='';
    const bd=calcBreakdown();
    atualizarChkBreakdown(bd);
    if(btnProx){btnProx.textContent='Revisar o pedido';btnProx.disabled=false;btnProx.style.opacity='1';}
    marcarStepConcluido(1);marcarStepConcluido(2);
    renderStepsBar(3); /* Pagamento */
    exibirCashbackPagamento();
  } else if(n===5){
    if(foot) foot.style.display='';
    if(footerBreakdown) footerBreakdown.style.display='';
    const bd=calcBreakdown();
    atualizarChkBreakdown(bd);
    if(btnProx){btnProx.textContent='Enviar pedido';btnProx.disabled=false;btnProx.style.opacity='1';}
    marcarStepConcluido(3);marcarStepConcluido(4);
    renderStepsBar(5); /* Resumo */
    renderResumo(bd);
  }
}

/* ── Resumo do pedido ── */
function renderResumo(bd){
  const body=document.getElementById('resumoBody'); if(!body) return;
  const logoH=CFG.lojaPerfil
    ?`<img class="cart-store-logo-img" src="${CFG.lojaPerfil}" alt="">`
    :`<div class="cart-store-logo-txt">${CFG.nomeLoja.charAt(0)}</div>`;
  const nome=_authCliente?.nome||(document.getElementById('cNome')?.value||_ultimoNome||'');
  const tel=_authCliente?.telefone||(document.getElementById('cTel')?.value||_ultimoTel||'');
  const isEnt=tipoPed==='entrega'||tipoPed==='entrega_agendada';
  const endereco=isEnt?endResumoData?.addr:CFG.enderecoLoja||'';
  const endLabel=isEnt?'Endereço para entrega do pedido':'Endereço para retirada do pedido';
  const pagLabel=({pix:'Pix',dinheiro:'Dinheiro',credito:'Cartão de crédito',debito:'Cartão de débito'})[pagPed]||pagPed||'';
  const pagIcon=({pix:'bi-qr-code',dinheiro:'bi-cash-stack',credito:'bi-credit-card-2-front',debito:'bi-credit-card'})[pagPed]||'bi-credit-card';
  const ptsTotal=Math.max(1,Math.round(bd.total));
  const agendStr=agendamento.slot?`Dia ${agendamento.data?agendamento.data.toLocaleDateString('pt-BR',{day:'numeric',month:'long'}):'?'} entre ${agendamento.slot.replace(' - ',' e ')}`:'';

  const enderecoParts=endereco?endereco.split(', '):[];
  const endLinha1=enderecoParts.slice(0,2).join(', ');
  const endLinha2=enderecoParts.slice(2).join(', ');

  const itensHtml=carrinho.map((item,idx)=>{
    const isR=item.obs==='[Resgate de pontos]';
    const pts=parseInt(item.pontos||0);
    const comboSelHtml=(!isR&&item.combosels&&item.combosels.length)
      ?`<div style="margin:3px 0 2px;padding-left:32px">${item.combosels.map(s=>`<div style="font-size:.71rem;color:#666;display:flex;gap:8px;padding:1px 0"><span style="font-weight:700;color:#999;min-width:12px">${s.qtd}</span>${s.nome}</div>`).join('')}</div>`
      :'';
    return `<div class="resumo-item-row">
      <div class="resumo-item-left">
        <span class="resumo-item-num">${item.q}</span>
        <span class="resumo-item-name">${item.n}</span>
      </div>
      <span class="resumo-item-price">${isR?'<span style="color:#16a34a;font-size:.72rem">Resgatado</span>':fmtR(item.p*item.q)}</span>
    </div>
    ${comboSelHtml}
    ${CFG.clubePontosAtivo&&!isR&&pts>0?`<div class="resumo-item-pts"><i class="bi bi-leaf-fill"></i> Acumule ${pts} pontos com este item</div>`:''}`;
  }).join('');

  const cntItens=carrinho.reduce((s,i)=>s+i.q,0);

  body.innerHTML=`
    <div class="cart-store-head">
      ${logoH}
      <div><div class="cart-store-name">${CFG.nomeLoja}</div>
      <a class="cart-store-add" onclick="fecharSheet('chkSheet')">Adicionar mais itens</a></div>
    </div>
    <div class="resumo-section">
      <div class="resumo-section-header">
        <span class="resumo-section-title">Seus dados</span>
        <button class="resumo-edit-btn" onclick="voltarDoChkSheet()">Editar</button>
      </div>
      <div class="resumo-row">
        <i class="bi bi-person resumo-row-icon"></i>
        <div class="resumo-row-text"><span class="resumo-row-name">${nome}</span><br><small style="color:#888">${tel}</small></div>
      </div>
    </div>
    ${endereco?`<div class="resumo-section">
      <div class="resumo-section-header">
        <span class="resumo-section-title">${endLabel}</span>
        ${isEnt?`<button class="resumo-edit-btn" onclick="abrirEnderecoSheet()">Editar</button>`:''}
      </div>
      <div class="resumo-row">
        <i class="bi bi-geo-alt resumo-row-icon"></i>
        <div class="resumo-row-text"><span class="resumo-row-name">${endLinha1}</span>${endLinha2?`<br><small style="color:#888">${endLinha2}</small>`:''}</div>
        ${!isEnt?`<button style="width:32px;height:32px;border:0;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.85rem;cursor:pointer;flex-shrink:0" onclick="window.open('https://maps.google.com/?q=${encodeURIComponent(endereco||CFG.enderecoLoja)}','_blank')"><i class="bi bi-map"></i></button>`:''}
      </div>
    </div>`:''}
    ${agendStr?`<div class="resumo-section">
      <div class="resumo-section-header">
        <span class="resumo-section-title">Agendamento</span>
        <button class="resumo-edit-btn" onclick="abrirAgendamentoSheet()">Editar</button>
      </div>
      <div class="resumo-row">
        <i class="bi bi-calendar-event resumo-row-icon"></i>
        <div class="resumo-row-text">Seu pedido foi agendado para<br><strong>${agendStr}</strong></div>
      </div>
    </div>`:''}
    <div class="resumo-section">
      <div class="resumo-section-header">
        <span class="resumo-section-title">Forma(s) de pagamento</span>
        <button class="resumo-edit-btn" onclick="irStep(3)">Editar</button>
      </div>
      <div class="resumo-row">
        <i class="bi ${pagIcon} resumo-row-icon"></i>
        <div class="resumo-row-text">
          <span class="resumo-row-name">${pagLabel}</span><br>
          <small style="color:#888">Forma de pagamento do pedido</small><br>
          <small>Valor: ${fmtR(bd.total)}</small>
          ${pagPed==='dinheiro'&&trocoPrecisa?`<br><small style="color:#374151">Troco para: ${fmtR(trocoVal)} (troco: ${fmtR(Math.max(0,trocoVal-bd.total))})</small>`:''}
          ${pagPed==='dinheiro'&&!trocoPrecisa?`<br><small style="color:#888">Sem troco</small>`:''}
        </div>
      </div>
    </div>
    <div class="resumo-section">
      <div class="resumo-section-header">
        <div><span class="resumo-section-title">Itens do pedido</span><div class="resumo-section-sub">${cntItens===1?'1 item':cntItens+' itens'} no seu pedido</div></div>
        <button class="resumo-toggle-btn" id="resumoItensToggle" onclick="toggleResumoItens(this)">
          <i class="bi bi-chevron-up"></i>
        </button>
      </div>
      <div id="resumoItensBody">${itensHtml}</div>
    </div>
    ${bd.cbUsar>0?`<div class="resumo-cashback-card">
      <div style="font-size:.82rem;font-weight:600;color:#15803d"><i class="bi bi-cash-coin" style="margin-right:6px"></i>Você está utilizando ${fmtR(bd.cbUsar)}</div>
      <button class="resumo-edit-btn" onclick="abrirCashbackModal()">Alterar</button>
    </div>`:''}
    <div class="resumo-section" style="border-bottom:0">
      <button class="cupons-toggle" id="resumoCuponsToggle" onclick="toggleResumoCupons()">
        <span><i class="bi bi-ticket-perforated" style="margin-right:6px"></i>Cupons</span>
        <i class="bi bi-chevron-down chevron"></i>
      </button>
      <div class="cupons-body" id="resumoCuponsBody">
        ${cupomAplicado?`<div style="display:flex;align-items:center;justify-content:space-between;background:#f5ede6;border-radius:10px;padding:10px 12px">
          <span style="font-size:.82rem;font-weight:700;color:var(--brown)"><i class="bi bi-tag-fill"></i> ${cupomAplicado.codigo} aplicado</span>
          <button class="resumo-edit-btn" onclick="removerCupom();renderResumo(calcBreakdown())">Remover</button>
        </div>`:`<div style="display:flex;gap:8px">
          <input type="text" id="resumoCupomCodigo" placeholder="Código do cupom" style="flex:1;border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 12px;font-size:.84rem;font-family:inherit;text-transform:uppercase;outline:none">
          <button class="cart-footer-btn" onclick="aplicarCupomResumo()">Aplicar</button>
        </div>`}
      </div>
    </div>
    <div class="resumo-termos">Ao enviar seu pedido, você concorda com os <a href="javascript:;">Termos de Serviço e Política de Uso de Dados</a> do estabelecimento.</div>
  `;
}
function toggleResumoCupons(){
  const btn=document.getElementById('resumoCuponsToggle');
  const body=document.getElementById('resumoCuponsBody');
  if(!btn||!body) return;
  btn.classList.toggle('open');
  body.classList.toggle('show');
}
async function aplicarCupomResumo(){
  const codigo=(document.getElementById('resumoCupomCodigo')?.value||'').trim().toUpperCase();
  if(!codigo){toast('Digite o código do cupom');return;}
  await aplicarCupom(codigo);
  renderResumo(calcBreakdown());
}
function toggleResumoItens(btn){
  const body=document.getElementById('resumoItensBody');
  if(!body) return;
  const open=body.style.display!=='none';
  body.style.display=open?'none':'';
  btn.querySelector('i').className='bi bi-chevron-'+(open?'down':'up');
}

function lancarParticulas(){
  const screen=document.getElementById('successScreen'); if(!screen) return;
  const colors=['#16a34a','#86efac','#7b5c3e','#fbbf24','#e63770','#c084fc'];
  const shapes=['●','★','♥','◆','▲'];
  for(let i=0;i<20;i++){
    const el=document.createElement('span');
    el.className='success-particle';
    const size=Math.random()*12+7;
    el.style.cssText=`left:${10+Math.random()*80}%;top:${35+Math.random()*35}%;font-size:${size}px;color:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${1.4+Math.random()}s;animation-delay:${Math.random()*.5}s;position:absolute;pointer-events:none;animation:floatUp ${1.4+Math.random()}s ease-out ${Math.random()*.5}s forwards;opacity:1;`;
    el.textContent=shapes[Math.floor(Math.random()*shapes.length)];
    screen.appendChild(el);
    setTimeout(()=>el.remove(),2500);
  }
}
function voltarDoChkSheet(){
  fecharSheet('chkSheet');
  setTimeout(()=>abrirSheet('contactSheet'),250);
}
function carregarSalvos(){
  try{
    const tel=localStorage.getItem('lc_tel')||'';
    if(tel){
      document.getElementById('cTel').value=tel;
      /* verificar cashback para telefone salvo */
      const digits=tel.replace(/\D/g,'');
      if(digits.length>=10) verificarCashback(digits);
    }
    const n=localStorage.getItem('lc_nome')||''; if(n) document.getElementById('cNome').value=n;
    if(tipoPed==='entrega'){
      const e=JSON.parse(localStorage.getItem('lc_end_'+tel.replace(/\D/g,''))||'{}');
      if(e.cep){ document.getElementById('eCep').value=e.cep; }
      if(e.r||e.b){
        document.getElementById('endCampos').style.display='';
        if(e.r)document.getElementById('eRua').value=e.r;
        if(e.n)document.getElementById('eNum').value=e.n;
        if(e.b)document.getElementById('eBairro').value=e.b;
        if(e.c)document.getElementById('eComp').value=e.c;
      }
    }
  }catch(e){}
}
/* ── Cashback ─── */
let cashbackSaldo=0, cashbackUsando=false, cashbackDescontado=0;
async function verificarCashback(tel){
  const box   = document.getElementById('cashbackBox');
  const disp  = document.getElementById('cashbackValorDisp');
  const btn   = document.getElementById('btnUsarCashback');
  cashbackSaldo=0; cashbackUsando=false; cashbackDescontado=0;
  if(box) box.classList.add('d-none');
  const digits = String(tel).replace(/\D/g,'');
  if(digits.length<10) return;
  /* estado de carregamento */
  if(box){ box.classList.remove('d-none'); }
  if(disp) disp.textContent='verificando...';
  if(btn)  btn.style.display='none';
  try{
    const url=`api/cashback_check.php?tel=${encodeURIComponent(digits)}&loja_id=${CFG.lojaId}`;
    const res=await fetch(url,{credentials:'include'});
    const d=await res.json();
    if(d.ok && parseFloat(d.saldo||0)>0){
      cashbackSaldo=parseFloat(d.saldo);
      if(disp) disp.textContent=fmtR(cashbackSaldo);
      if(btn)  btn.style.display='';
      if(box)  box.classList.remove('d-none');
    } else {
      if(box) box.classList.add('d-none');
    }
  }catch(e){
    if(box) box.classList.add('d-none');
  }
}
function toggleCashback(){
  cashbackUsando=!cashbackUsando;
  const btn=document.getElementById('btnUsarCashback');
  const info=document.getElementById('cashbackAplicadoInfo');
  const label=document.getElementById('cashbackDescontoLabel');
  if(cashbackUsando){
    const sub=carrinho.reduce((s,i)=>s+i.p*i.q,0);
    const taxa=tipoPed==='entrega'?taxaAtual:0;
    cashbackDescontado=Math.min(cashbackSaldo,sub+taxa);
    if(label) label.textContent=fmtR(cashbackDescontado);
    if(btn){btn.textContent='Remover';btn.style.background='#dc2626';}
    if(info) info.classList.remove('d-none');
  } else {
    cashbackDescontado=0;
    if(btn){btn.textContent='Usar';btn.style.background='#16a34a';}
    if(info) info.classList.add('d-none');
  }
}

let trocoPrecisa=false, trocoVal=0;
function selPag(t,el){
  pagPed=t;
  document.querySelectorAll('.pay-opt').forEach(o=>o.classList.remove('active'));
  el.classList.add('active');
  const tw=document.getElementById('trocoWrap');
  if(tw) tw.classList.toggle('d-none', t!=='dinheiro');
  if(t==='dinheiro'){
    const totalEl=document.getElementById('trocoTotalPedido');
    if(totalEl){
      const sub=carrinho.reduce((s,i)=>s+i.p*i.q,0);
      const taxa=tipoPed==='entrega'?taxaAtual:0;
      totalEl.textContent=fmtR(sub+taxa);
    }
  }
  trocoPrecisa=false; trocoVal=0;
}
function setTroco(sim){
  trocoPrecisa=sim;
  const btnS=document.getElementById('btnTrocoSim'), btnN=document.getElementById('btnTrocoNao');
  const vw=document.getElementById('trocoValorWrap');
  if(btnS) btnS.style.cssText+=(sim?';background:#f0fdf4;border-color:#86efac;color:#16a34a':';background:#fff;border-color:#e5e7eb;color:#111');
  if(btnN) btnN.style.cssText+=(sim?';background:#fff;border-color:#e5e7eb;color:#111':';background:#fff7ed;border-color:#fed7aa;color:#9a3412');
  if(vw) vw.classList.toggle('d-none', !sim);
  if(!sim){ const tv=document.getElementById('trocoValor'); if(tv) tv.value=''; trocoVal=0; }
}
function proxStep(){
  const cur=parseInt(document.querySelector('.chk-step.active')?.id?.replace('chk','')||1);
  if(cur===1){
    if(!tipoPed){toast('Escolha o tipo de entrega');return;}
    const isEntrega=tipoPed==='entrega'||tipoPed==='entrega_agendada';
    const isAgendada=tipoPed==='entrega_agendada'||tipoPed==='retirada_agendada';
    if(isEntrega&&!endResumoData){toast('Informe o endereço de entrega');return;}
    if(isAgendada&&!agendamento.slot){toast('Selecione um horário de agendamento');return;}
    const subAtual=carrinho.reduce((s,i)=>s+i.p*i.q,0);
    const minTipo=pedidoMinimoParaTipo(tipoPed);
    if(minTipo>0&&subAtual<minTipo){
      const falta=minTipo-subAtual;
      toast(`Pedido mínimo para ${isEntrega?'entrega':'retirada'} é ${fmtR(minTipo)}. Faltam ${fmtR(falta)}.`);
      return;
    }
    irStep(3);
  } else if(cur===3){
    if(!pagPed){toast('Selecione o pagamento');return;}
    /* captura troco antes de ir para o resumo */
    if(pagPed==='dinheiro'&&trocoPrecisa){
      trocoVal=parseTrocoValor(document.getElementById('trocoValor')?.value||'0');
    }
    irStep(5); /* vai para o resumo antes de enviar */
  } else if(cur===5){
    enviar();
  }
}
async function enviar(){
  /* snapshot antes de limpar */
  _ultimoCarrinho=[...carrinho];
  _ultimoTipo=tipoPed;
  _ultimoPag=pagPed;
  _ultimoTrocoPrecisa=trocoPrecisa;
  _ultimoTrocoVal=trocoVal;
  _ultimoEndereco=endResumoData?.addr||'';
  _ultimoAgendSlot=agendamento.slot||'';
  _ultimoNome=(_authCliente?.nome||document.getElementById('cNome')?.value||localStorage.getItem('lc_nome')||'').trim();
  _ultimoTel=(_authCliente?.telefone||document.getElementById('cTel')?.value||localStorage.getItem('lc_tel')||'').trim();
  const btn=document.getElementById('btnProx'); btn.disabled=true; btn.textContent='Enviando...';
  const tel=(document.getElementById('cTel')?.value||'').replace(/\D/g,'');
  const isEntrega=tipoPed==='entrega'||tipoPed==='entrega_agendada';
  const end=isEntrega?(endResumoData?.addr||''):'';
  const sub=carrinho.reduce((s,i)=>s+i.p*i.q,0);
  const taxa=isEntrega?taxaAtual:0;
  if(pagPed==='dinheiro'&&trocoPrecisa){
    trocoVal=parseTrocoValor(document.getElementById('trocoValor')?.value||'0');
  }
  const cupomDesc=cupomAplicado?cupomAplicado.valor:0;
  _ultimoTaxa=taxa; _ultimoDesconto=cashbackDescontado+cupomDesc;
  const totalFinal=Math.max(0,sub+taxa-cashbackDescontado-cupomDesc);
  /* tipo simplificado para o backend */
  const tipoBackend=tipoPed==='entrega_agendada'?'entrega':(tipoPed==='retirada_agendada'?'retirada':tipoPed);
  /* data/slot agendamento */
  const agendStr=agendamento.slot?JSON.stringify({data:agendamento.data?.toISOString().slice(0,10),slot:agendamento.slot}):'';
  const body=new URLSearchParams({loja_id:CFG.lojaId,cliente_nome:(document.getElementById('cNome')?.value||'').trim(),cliente_telefone:tel,tipo:tipoBackend,tipo_agendamento:tipoPed,agendamento:agendStr,forma_pagamento:pagPed,taxa_entrega:taxa,endereco:end,subtotal:sub,total:totalFinal,cashback_usar:cashbackUsando?'1':'0',cashback_valor:cashbackDescontado,cupom_codigo:cupomAplicado?.codigo||'',cupom_desconto:cupomDesc,troco_solicitado:trocoPrecisa?'1':'0',troco_valor:trocoVal,itens:JSON.stringify(carrinho.map(i=>({id:i.id,nome:i.n,preco:i.p,qtd:i.q,obs:i.obs||'',combosels:i.combosels||null,crossSell:i.crossSell?1:0})))});
  try{
    const res=await fetch('api/pedido_criar.php',{method:'POST',body});
    const d=await res.json();
    if(!d.ok){toast(d.msg||'Erro');btn.disabled=false;btn.textContent='Confirmar pedido';return;}
    /* salvar pedido no histórico local */
    const hist=JSON.parse(localStorage.getItem('lc_hist_'+CFG.lojaId)||'[]');
    const agendEntry=agendamento.slot?{data:agendamento.data?.toISOString().slice(0,10),slot:agendamento.slot}:null;
    hist.unshift({id:d.id,tipo:tipoPed,tipoAgendamento:tipoPed,pag:pagPed,total:sub+taxa,criado:new Date().toISOString(),agendamento:agendEntry});
    localStorage.setItem('lc_hist_'+CFG.lojaId,JSON.stringify(hist.slice(0,20)));
    track('pedido');
    carrinho=[];salvar();uiAtualizar();
    resetEstadoPedido();
    irStep(4);
    lancarParticulas();
    document.getElementById('confNum').textContent='#'+(d.codigo||d.id);
    /* usa snapshot (_ultimoTipo/_ultimoAgendSlot) pois resetEstadoPedido já limpou tipoPed */
    const isEnt=_ultimoTipo==='entrega'||_ultimoTipo==='entrega_agendada';
    const tempoTxt=_ultimoAgendSlot
      ?`Agendado para: ${_ultimoAgendSlot}`
      :(isEnt
        ?`Entrega em ${CFG.tEntMin}–${CFG.tEntMax} min`
        :`Pronto em ${CFG.tRetMin}–${CFG.tRetMax} min`);
    document.getElementById('confTempo').textContent=tempoTxt;
    if(pagPed==='pix'&&CFG.pixChave){document.getElementById('pixBoxConf').classList.remove('d-none'); document.getElementById('pixChaveConf').textContent=CFG.pixChave;}
  }catch(e){toast('Erro de conexão');btn.disabled=false;btn.textContent='Confirmar pedido';}
}
function resetEstadoPedido(){
  tipoPed='';pagPed='';endResumoData=null;agendamento={data:null,diaSemana:null,slot:null};cupomAplicado=null;
  cashbackSaldo=0;cashbackUsando=false;cashbackDescontado=0;_cbValidade='';
  _stepsCompleted=[];
  const cbWrap=document.getElementById('contactCashbackWrap'); if(cbWrap) cbWrap.style.display='none';
  taxaAtual=CFG.taxaEntrega;
  _skipPrefill=true;
  /* apagar localStorage para que a próxima sessão comece limpa */
  const savedTel=(localStorage.getItem('lc_tel')||'').replace(/\D/g,'');
  if(savedTel) localStorage.removeItem('lc_end_'+savedTel);
  localStorage.removeItem('lc_nome');
  localStorage.removeItem('lc_tel');
  /* resetar radio cards */
  document.querySelectorAll('.tipo-radio-card').forEach(c=>c.classList.remove('active'));
  document.getElementById('tipoHint')?.classList.remove('d-none');
  ['endResumo','retResumo','agendResumo'].forEach(id=>document.getElementById(id)?.classList.add('d-none'));
  /* limpar campos de endereço */
  ['eCep','eRua','eNum','eBairro','eCidade','eComp'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const est=document.getElementById('eEstado');if(est)est.value='';
  const campos=document.getElementById('endCampos');if(campos)campos.style.display='none';
  const taxa=document.getElementById('taxaInfoWrap');if(taxa)taxa.style.display='none';
  /* limpar contato */
  ['cNomeContact','cTelContact'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  /* resetar campos ocultos do envio */
  ['cNome','cTel'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  /* resetar pagamento */
  document.querySelectorAll('.pay-opt').forEach(o=>o.classList.remove('active'));
  const trocoW=document.getElementById('trocoWrap');if(trocoW)trocoW.classList.add('d-none');
  /* resetar cupons UI */
  const descEl=document.getElementById('cupomDescRow');if(descEl)descEl.remove();
  /* auto-reload após 10s se o usuário não clicar em Acompanhar */
  setTimeout(()=>{if(_skipPrefill) location.reload();}, 10000);
}
function enviarWppPedido(){
  const wpp = CFG.lojaWpp;
  if(!wpp){ toast('WhatsApp da loja não configurado'); return; }

  const pedidoId  = document.getElementById('confNum')?.textContent || '';
  const nome      = _ultimoNome || (document.getElementById('cNome')?.value||'').trim();
  const tel       = _ultimoTel  || (document.getElementById('cTel')?.value||'').trim();
  const sub       = _ultimoCarrinho.reduce((s,i)=>s+i.p*i.q, 0);
  const taxa      = _ultimoTaxa  || 0;
  const desconto  = _ultimoDesconto || 0;
  const total     = Math.max(0, sub + taxa - desconto);

  /* pagamento */
  const pagMap = {pix:'Pix', dinheiro:'Dinheiro', credito:'Cartão de Crédito', debito:'Cartão de Débito'};
  const pagLabel = pagMap[_ultimoPag] || _ultimoPag || '';

  /* tipo de entrega */
  const isEntrega  = _ultimoTipo === 'entrega' || _ultimoTipo === 'entrega_agendada';
  const isAgendado = _ultimoTipo === 'entrega_agendada' || _ultimoTipo === 'retirada_agendada';
  const tipoLabel  = isEntrega ? 'Entrega' : 'Retirada';
  const endereco   = isEntrega ? _ultimoEndereco : (CFG.enderecoLoja || '');

  /* tempo / agendamento */
  let tempoLinha = '';
  if(isAgendado && _ultimoAgendSlot){
    tempoLinha = `*Agendado para: ${_ultimoAgendSlot}*`;
  } else if(isEntrega){
    tempoLinha = `*Tempo estimado para entrega: Entre ${CFG.tEntMin} e ${CFG.tEntMax} minutos*`;
  } else {
    tempoLinha = `*Tempo estimado para retirada: Entre ${CFG.tRetMin} e ${CFG.tRetMax} minutos*`;
  }
  const endLabel = isEntrega ? 'Endereço para entrega' : 'Endereço para retirada';

  /* cashback e pontos */
  const cbPct     = parseFloat(CFG.cashbackPct || 0);
  const cbGanho   = CFG.cashbackAtivo && cbPct > 0 ? Math.round(total * cbPct / 100 * 100) / 100 : 0;
  const pts       = Math.round(total / 10); /* 1 ponto a cada R$10 */

  /* itens */
  const itensLinhas = _ultimoCarrinho.map(i=>{
    let l=`👉 ${i.q}x ${i.n}  ${fmtR(i.p*i.q)}`;
    if(i.combosels&&i.combosels.length) l+='\n'+i.combosels.map(s=>`   • ${s.qtd>1?s.qtd+'x ':''} ${s.nome}`).join('\n');
    if(i.uobs) l+=`\n   📝 ${i.uobs}`;
    else if(i.obs&&!i.obs.startsWith('[combo]')&&i.obs!=='[Resgate de pontos]') l+=`\n   📝 ${i.obs}`;
    return l;
  }).join('\n');

  /* link de acompanhamento */
  const lojaUrl = location.origin + location.pathname + location.search;

  /* monta mensagem */
  const L = []; // linhas
  L.push(`*NÚMERO DO PEDIDO*: ${pedidoId}`);
  L.push(``);
  L.push(`Nome Cardápio: ${CFG.nomeLoja}`);
  L.push(`Nome do cliente: ${nome}`);
  L.push(`Número do telefone:  ${tel}`);
  L.push(``);
  L.push(`Forma de pagamento: `);
  L.push(`- ${pagLabel}`);
  if(_ultimoPag === 'dinheiro'){
    if(_ultimoTrocoPrecisa && _ultimoTrocoVal > 0){
      L.push(`- Troco para: ${fmtR(_ultimoTrocoVal)} (troco: ${fmtR(Math.max(0,_ultimoTrocoVal - total))})`);
    } else {
      L.push(`- Sem troco`);
    }
  }
  L.push(`Tipo de entrega: ${tipoLabel}`);
  L.push(tempoLinha);
  if(endereco) L.push(`*${endLabel}: ${endereco}*`);
  if(taxa > 0) L.push(`*Taxa de entrega: ${fmtR(taxa)}*`);
  L.push(``);
  L.push(`*RESUMO DO PEDIDO*:`);
  L.push(itensLinhas);
  L.push(``);
  L.push(``);
  L.push(`*TOTAL*: ${fmtR(total)}`);
  if(cbGanho > 0) L.push(`*CASHBACK ganho*: ${fmtR(cbGanho)}`);
  if(CFG.clubePontosAtivo && pts > 0) L.push(`*Pontos a receber*: ${pts} pts`);

  /* PIX */
  if(_ultimoPag === 'pix' && CFG.pixChave){
    L.push(``);
    if(CFG.pixNome){
      L.push(` *Nome da chave Pix*: `);
      L.push(` 👉 *${CFG.pixNome}*`);
      L.push(``);
    }
    L.push(` *Chave Pix*: `);
    L.push(` 👉 *${CFG.pixChave}*`);
  }

  L.push(``);
  L.push(`Acompanhe seu pedido através do link abaixo:`);
  L.push(lojaUrl);

  const msg = L.join('\n');
  const url = `https://wa.me/55${wpp}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function irPedidos(){
  sessionStorage.setItem('lc_open_pedidos','1');
  fecharSheet('chkSheet');
  setTimeout(()=>location.reload(),200);
}
function copiarPix(){
  const chave=CFG.pixChave;
  const copiar=()=>{const el=document.createElement('input');el.value=chave;el.style.cssText='position:fixed;opacity:0';document.body.appendChild(el);el.select();document.execCommand('copy');document.body.removeChild(el);toast('Chave PIX copiada!');};
  if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(chave).then(()=>toast('Chave PIX copiada!')).catch(copiar);
  else copiar();
}

/* ── Pedidos ─────── */
const STATUS_LABELS={pendente:'Aguardando confirmação',aceito:'Confirmado',preparando:'Em preparo',entrega:'A caminho',finalizado:'Entregue!',cancelado:'Cancelado'};
const _avalDadosPedido={}; /* mapa pedidoId → {horario, itens} */
/* Set de pedidos já avaliados — persiste em localStorage */
const _avalFeitos=new Set(
  JSON.parse(localStorage.getItem('lc_aval_'+CFG.lojaId)||'[]')
);
let _pedidosPollTimer=null;
let _pedidosPollItems=null;
let _pedidosPollLastSig=null;
async function abrirPedidosSheet(pedidosDB, cliente){
  abrirSheet('pedidosSheet');
  const body=document.getElementById('pedidosBody');
  /* cabeçalho com nome do cliente se autenticado */
  const headerHtml = cliente
    ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 0 14px;border-bottom:1px solid #f0f0f0;margin-bottom:14px">
         <div style="width:36px;height:36px;border-radius:50%;background:var(--brown);display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:800;color:#fff;flex-shrink:0">${cliente.nome.charAt(0)}</div>
         <div><div style="font-size:.84rem;font-weight:700">${cliente.nome}</div><div style="font-size:.72rem;color:#888">${cliente.telefone}</div></div>
       </div>` : '';
  body.innerHTML = headerHtml + '<div class="loading-pedidos"><i class="bi bi-arrow-repeat"></i> Carregando...</div>';
  /* se veio da API, renderiza apenas os 5 últimos */
  if(pedidosDB && Array.isArray(pedidosDB)){
    if(!pedidosDB.length){
      body.innerHTML=headerHtml+'<div class="pedidos-empty"><i class="bi bi-bag"></i>Nenhum pedido encontrado.</div>';
      _pararPedidosPolling();
      return;
    }
    const ultimos5=pedidosDB.slice(0,5).map(p=>({id:p.id,tipo:p.tipo,pag:p.forma_pagamento,total:parseFloat(p.total||0),criado:p.criado_em}));
    const cards=await Promise.all(ultimos5.map(h=>fetchPedidoCard(h)));
    body.innerHTML=headerHtml+'<div id="pedidosCardsList">'+cards.join('')+'</div>';
    atualizarBadgePedidos(cards);
    _pedidosPollItems=ultimos5;
    _pedidosPollLastSig=JSON.stringify(cards);
    _iniciarPedidosPolling();
    return;
  }
  /* fallback: localStorage — apenas os 5 últimos deste dispositivo */
  const hist=JSON.parse(localStorage.getItem('lc_hist_'+CFG.lojaId)||'[]');
  if(!hist.length){
    body.innerHTML=headerHtml+'<div class="pedidos-empty"><i class="bi bi-bag"></i>Você ainda não fez nenhum pedido.<br><small style="font-size:.74rem;margin-top:8px;display:block">Para ver seu histórico completo, informe seu telefone.</small></div>';
    _pararPedidosPolling();
    return;
  }
  const ultimos5=hist.slice(0,5);
  const cards=await Promise.all(ultimos5.map(h=>fetchPedidoCard(h)));
  body.innerHTML=headerHtml+'<div id="pedidosCardsList">'+cards.join('')+'</div>';
  atualizarBadgePedidos(cards);
  _pedidosPollItems=ultimos5;
  _pedidosPollLastSig=JSON.stringify(cards);
  _iniciarPedidosPolling();
}
/* ── Atualização em tempo real do status do pedido (polling) ── */
function _iniciarPedidosPolling(){
  _pararPedidosPolling();
  _pedidosPollTimer=setInterval(_atualizarPedidosSheet, 12000);
}
function _pararPedidosPolling(){
  if(_pedidosPollTimer){clearInterval(_pedidosPollTimer);_pedidosPollTimer=null;}
}
async function _atualizarPedidosSheet(){
  if(document.visibilityState!=='visible') return;
  const sheet=document.getElementById('pedidosSheet');
  if(!sheet||!sheet.classList.contains('show')){_pararPedidosPolling();return;}
  if(!_pedidosPollItems||!_pedidosPollItems.length) return;
  const cards=await Promise.all(_pedidosPollItems.map(h=>fetchPedidoCard(h)));
  const sig=JSON.stringify(cards);
  if(sig===_pedidosPollLastSig) return;
  _pedidosPollLastSig=sig;
  const list=document.getElementById('pedidosCardsList');
  const body=document.getElementById('pedidosBody');
  if(list&&body){
    const scrollTop=body.scrollTop;
    list.innerHTML=cards.join('');
    body.scrollTop=scrollTop;
  }
  atualizarBadgePedidos(cards);
  /* para de consultar quando todos os pedidos exibidos já estão em estado final */
  if(cards.every(c=>/status-(finalizado|cancelado)/.test(c))) _pararPedidosPolling();
}
function atualizarBadgePedidos(cards){
  const pendentes=cards.filter(c=>c.includes('status-pendente')||c.includes('status-aceito')||c.includes('status-preparando')||c.includes('status-entrega')).length;
  const badge=document.getElementById('pedidosBadge');
  if(badge){if(pendentes>0){badge.textContent=pendentes;badge.classList.remove('d-none');}else{badge.classList.add('d-none');}}
}
async function fetchPedidoCard(h){
  try{
    /* passa cliente_id para validar propriedade do pedido */
    const cid=_authCliente?.id||0;
    const res=await fetch(`api/pedido_status.php?id=${h.id}${cid?'&cliente_id='+cid:''}`);
    const d=await res.json();
    if(!d.ok) return gerarCardSimples(h);
    const p=d.pedido;
    const st=p.status||'pendente';
    const label=STATUS_LABELS[st]||st;
    const total=parseFloat(p.total||0);
    const taxa=parseFloat(p.taxa_entrega||0);
    const desconto=parseFloat(p.desconto||0);
    const pag=({pix:'Transferência Pix',dinheiro:'Dinheiro',credito:'Cartão de crédito',debito:'Cartão de débito'})[p.forma_pagamento]||p.forma_pagamento||'';
    const isEntrega=(p.tipo||'').toLowerCase()==='entrega';
    /* agendamento: vem do DB (campo agendamento ou agendamento_em) ou do histórico local */
    const agendRaw=p.agendamento||p.agendamento_em||(h.agendamento?JSON.stringify(h.agendamento):null);
    const tipoAgend=p.tipo_agendamento||h.tipoAgendamento||'';
    /* detecta agendamento pelo tipo_agendamento OU pela presença do campo agendamento no DB */
    const isAgendado=tipoAgend==='entrega_agendada'||tipoAgend==='retirada_agendada'||!!agendRaw;
    let agendSlot='';
    if(agendRaw){
      try{
        /* tenta JSON {"data":"...","slot":"..."} salvo pelo loja.php */
        const ag=JSON.parse(agendRaw);
        agendSlot=ag.data?`${ag.data} ${ag.slot||''}`.trim():(ag.slot||'');
      }catch{
        /* datetime "YYYY-MM-DD HH:MM:SS" salvo pelo PDV — formata para legível */
        const raw=String(agendRaw);
        const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
        if(m) agendSlot=`${m[3]}/${m[2]}/${m[1]} às ${m[4]}:${m[5]}`;
        else agendSlot=raw;
      }
    }

    /* Previsão */
    const previsao = isAgendado&&agendSlot ? agendSlot
      : (isEntrega ? `${CFG.tEntMin} e ${CFG.tEntMax} minutos` : `${CFG.tRetMin} e ${CFG.tRetMax} minutos`);
    const labelPrevisao = isAgendado
      ? (isEntrega?'Entrega agendada para':'Retirada agendada para')
      : (isEntrega ? 'Previsão para entrega' : 'Previsão para retirada');

    /* horário */
    let horario='';
    if(p.criado_em){
      const dt=new Date(p.criado_em.replace(' ','T'));
      horario=`${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}:${String(dt.getSeconds()).padStart(2,'0')}`;
    }
    /* guarda dados para o modal de avaliação — após horario estar definido */
    if(typeof _avalDadosPedido!=='undefined') _avalDadosPedido[p.id]={horario,itens:d.itens||[]};

    /* itens */
    const itensHtml=d.itens?.length?d.itens.map(i=>{
      const obs=(i.observacoes||'').trim();
      const preco=parseFloat(i.preco||0)*parseInt(i.quantidade||1);
      return `<div class="pedido-row">
        <span style="flex:1">${i.quantidade}x ${i.produto_nome}${obs?`<br><small style="color:#aaa;font-size:.72rem">${obs}</small>`:''}</span>
        <span>${fmtR(preco)}</span>
      </div>`;
    }).join(''):'';

    /* cashback ganho neste pedido (se houver) */
    const somaItens=d.itens?.reduce((s,i)=>s+parseFloat(i.preco||0)*parseInt(i.quantidade||1),0)||0;
    const cbGanho=Math.round(Math.max(0,somaItens*((parseFloat(CFG.cashbackPct||0))/100))*100)/100;
    /* cashback usado */
    const cbCalc=Math.round(Math.max(0,somaItens+taxa-desconto-total)*100)/100;
    const cbUsado=parseFloat(p.cashback_usado||0)>0?parseFloat(p.cashback_usado):cbCalc;

    /* Descontos */
    const descontosHtml=(cbUsado>0.009||desconto>0)?`
      <div class="pedido-sec">
        <div class="pedido-sec-title">Descontos de valores</div>
        ${desconto>0?`<div class="pedido-row desconto"><span>Desconto</span><span>- ${fmtR(desconto)}</span></div>`:''}
        ${cbUsado>0.009?`<div class="pedido-row desconto"><span>Cashback usado</span><span>- ${fmtR(cbUsado)}</span></div>`:''}
      </div>`:'';

    const cashbackGanhoHtml=(st==='finalizado'&&cbGanho>0.009)?`<div class="pedido-row cashback" style="margin-top:2px"><span>Cashback ganho:</span><span>${fmtR(cbGanho)}</span></div>`:'';

    /* Troco */
    const isDin=(p.forma_pagamento||'').toLowerCase()==='dinheiro';
    const trocoV=parseFloat(p.troco||0);
    const trocoTroco=trocoV>0&&(trocoV-total)>0?trocoV-total:0;

    /* PIX */
    const pixHtml=(p.forma_pagamento==='pix'&&CFG.pixChave&&st!=='finalizado'&&st!=='cancelado')?`
      <div class="pedido-sec pedido-pix-box">
        <div class="pedido-pix-lbl">Chave Pix para transferência</div>
        <div class="pedido-pix-chave">${CFG.pixChave}</div>
        ${CFG.pixNome?`<div class="pedido-pix-nome">${CFG.pixNome}</div>`:''}
        <button class="btn-pix" onclick="copiarPix()"><i class="bi bi-clipboard"></i> Copiar chave pix</button>
      </div>`:'';

    /* Endereço */
    const endEndereco=isEntrega?(p.endereco_entrega||''):(CFG.enderecoLoja||'');
    const endLabel=isEntrega?'Endereço para entrega:':'Endereço para retirada:';
    const mapsUrl=isEntrega
      ?`https://maps.google.com/?q=${encodeURIComponent(endEndereco)}`
      :`https://maps.google.com/?q=${encodeURIComponent(CFG.enderecoLoja||CFG.nomeLoja)}`;
    const endHtml=endEndereco?`
      <div class="pedido-sec" style="overflow:hidden">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div>
            <div class="pedido-sec-label">${endLabel}</div>
            <div class="pedido-sec-value" style="margin-top:2px">${endEndereco}</div>
          </div>
          <button class="btn-mapa" onclick="window.open('${mapsUrl}','_blank')">Ver no mapa</button>
        </div>
      </div>`:'';

    return `<div class="pedido-card">
      <div class="pedido-card-head">
        <div class="pedido-card-num">N. pedido: ${p.codigo||p.id}</div>
        <span class="pedido-status-badge status-${st}"><span class="status-dot"></span>${label}</span>
      </div>

      ${st!=='cancelado'?`<div class="pedido-sec">
        <div class="pedido-sec-label">${labelPrevisao}</div>
        <div class="pedido-sec-value strong">${previsao}</div>
      </div>`:''}

      ${horario?`<div class="pedido-sec">
        <div class="pedido-sec-label">Horário do pedido</div>
        <div class="pedido-sec-value">${horario}</div>
      </div>`:''}

      ${pixHtml}

      <div class="pedido-sec">
        <div class="pedido-sec-title">Resumo</div>
        ${itensHtml}
        ${cashbackGanhoHtml}
      </div>

      ${descontosHtml}

      <div class="pedido-sec">
        <div class="pedido-sec-title">Pagamentos</div>
        ${isDin?`
          <div class="pedido-pag-dinheiro">
            <div class="pedido-pag-dinheiro-row"><span>${pag}</span><span>${fmtR(total)}</span></div>
            ${trocoV>0?`
              <div class="pedido-pag-dinheiro-row label-gray"><span>Cliente pagará com</span><span>${fmtR(trocoV)}</span></div>
              ${trocoTroco>0?`<div class="pedido-pag-dinheiro-row troco-row"><span>Troco no valor de</span><span>${fmtR(trocoTroco)}</span></div>`:''}
            `:`<div class="pedido-pag-dinheiro-row label-gray"><span>Sem troco</span><span></span></div>`}
          </div>
          <div class="pedido-row total" style="margin-top:6px"><span>Total</span><span>${fmtR(total)}</span></div>
        `:`
          <div class="pedido-row"><span>${pag}</span><span>${fmtR(total)}</span></div>
          <div class="pedido-row total"><span>Total</span><span>${fmtR(total)}</span></div>
        `}
      </div>

      ${endHtml}

      ${st==='finalizado'||st==='entregue'?(_avalFeitos.has(p.id)
        ?`<button class="btn-avaliar" disabled style="opacity:.5;cursor:not-allowed;background:#c0a88a">
           <i class="bi bi-check-circle-fill" style="color:#fff"></i> Pedido avaliado
         </button>`
        :`<button class="btn-avaliar" id="btn-aval-${p.id}"
           onclick="abrirModalAvaliacao(${p.id})">
           <i class="bi bi-star-fill" style="color:#f59e0b"></i> Avaliar pedido
         </button>`
      ):''}
    </div>`;
  }catch(e){return gerarCardSimples(h);}
}
/* ── Avaliação de Pedido ── */
let _avalPedidoId = null;
let _avalNota     = 0;

function abrirModalAvaliacao(id){
  _avalPedidoId = id;
  _avalNota     = 0;
  const dados   = _avalDadosPedido[id] || {};
  const horario = dados.horario || '';
  const itens   = dados.itens   || [];

  document.getElementById('avalTitle').textContent =
    `Como foi sua experiência em ${CFG.nomeLoja}?`;
  document.getElementById('avalSubtitle').textContent =
    horario ? `Pedido realizado em ${horario}` : `Pedido #${id}`;

  /* itens */
  const itensEl = document.getElementById('avalItens');
  if(itens.length){
    itensEl.style.display = '';
    itensEl.innerHTML = itens.map(i=>{
      const qty   = i.quantidade || i.q || 1;
      const nome  = i.produto_nome || i.n || '';
      const preco = (parseFloat(i.preco||0)||parseFloat(i.p||0)) * parseInt(qty);
      return `<div class="aval-item-row">
        <span class="aval-item-qty">${qty}x</span>
        <span class="aval-item-name">${nome}</span>
        <span class="aval-item-price">${fmtR(preco)}</span>
      </div>`;
    }).join('');
  } else {
    itensEl.style.display = 'none';
    itensEl.innerHTML = '';
  }

  /* reseta estrelas e textarea */
  document.getElementById('avalDescricao').value = '';
  _atualizarEstrelas(0);

  /* abre overlay */
  const ov = document.getElementById('avalOverlay');
  if(!ov) return;
  ov.style.display = 'flex';
  requestAnimationFrame(()=>ov.classList.add('show'));
}

/* mantém nome antigo para compatibilidade */
function avaliarPedido(id){ abrirModalAvaliacao(id); }

function fecharAvalModal(){
  const ov = document.getElementById('avalOverlay');
  if(!ov) return;
  ov.classList.remove('show');
  setTimeout(()=>{ ov.style.display='none'; }, 280);
}

function _atualizarEstrelas(nota){
  _avalNota = nota;
  document.querySelectorAll('.aval-star').forEach(s=>{
    s.classList.toggle('active', parseInt(s.dataset.v) <= nota);
  });
  const btn = document.getElementById('avalBtnSubmit');
  if(btn){ btn.disabled = nota<1; btn.style.opacity = nota>=1?'1':'.5'; }
}

function _hoverEstrelas(v){
  /* v=0 → restaura nota selecionada; v>0 → preview do hover */
  document.querySelectorAll('.aval-star').forEach(s=>{
    s.classList.toggle('active', parseInt(s.dataset.v) <= (v>0?v:_avalNota));
  });
}

async function enviarAvaliacao(){
  if(!_avalPedidoId || _avalNota<1){ toast('Selecione uma nota'); return; }
  const btn  = document.getElementById('avalBtnSubmit');
  const desc = document.getElementById('avalDescricao')?.value || '';
  if(btn){ btn.disabled=true; btn.textContent='Enviando...'; }
  try{
    const body = new URLSearchParams({
      pedido_id: _avalPedidoId,
      nota:      _avalNota,
      descricao: desc,
      loja_id:   CFG.lojaId,
    });
    const r = await fetch('api/avaliacao_salvar.php',{method:'POST',body});
    const d = await r.json();
    fecharAvalModal();
    toast(d.msg || (d.ok ? 'Avaliação enviada! Obrigado.' : 'Erro ao enviar'));
    if(d.ok){
      /* persiste no Set e localStorage */
      _avalFeitos.add(_avalPedidoId);
      localStorage.setItem('lc_aval_'+CFG.lojaId, JSON.stringify([..._avalFeitos]));
      /* atualiza o botão no DOM sem recarregar toda a lista */
      const btnEl = document.getElementById('btn-aval-'+_avalPedidoId);
      if(btnEl){
        btnEl.disabled = true;
        btnEl.style.opacity = '.5';
        btnEl.style.cursor  = 'not-allowed';
        btnEl.style.background = '#c0a88a';
        btnEl.innerHTML = '<i class="bi bi-check-circle-fill" style="color:#fff"></i> Pedido avaliado';
        btnEl.removeAttribute('onclick');
      }
    }
  }catch(e){ toast('Erro de conexão'); }
  if(btn){ btn.disabled=false; btn.textContent='Avaliar'; }
}
function gerarCardSimples(h){
  return `<div class="pedido-card"><div class="pedido-card-head"><div class="pedido-card-num">Pedido #${h.id}</div></div><div style="font-size:.84rem;font-weight:400;margin-top:4px">${fmtR(h.total)}</div></div>`;
}

/* ── Taxa de entrega ── */
let taxaAtual = CFG.taxaEntrega; // taxa corrente (pode mudar por bairro)
/* retorna false somente quando a taxa é por bairro e o bairro informado não está cadastrado */
function bairroEhAtendido(bairro){
  if((CFG.taxaEntregaTipo||'fixa')!=='bairro') return true;
  if(!bairro) return false;
  const taxasBairro = CFG.taxasBairro||{};
  return Object.keys(taxasBairro).some(k=>k.toLowerCase()===bairro.toLowerCase().trim());
}
function abrirBairroAlert(bairro){
  const nomeEl=document.getElementById('bairroAlertNome');
  if(nomeEl) nomeEl.textContent=bairro||'informado';
  const ov=document.getElementById('bairroAlertOverlay');
  if(!ov) return;
  ov.style.display='flex'; requestAnimationFrame(()=>ov.classList.add('show'));
}
function fecharBairroAlert(){
  const ov=document.getElementById('bairroAlertOverlay');
  if(!ov) return;
  ov.classList.remove('show');
  setTimeout(()=>{ ov.style.display='none'; }, 300);
}
function calcularTaxaEntrega(bairroParam){
  const tw   = document.getElementById('taxaInfoWrap');
  const ti   = document.getElementById('taxaInfo');
  const box  = document.getElementById('taxaInfoBox');
  const warn = document.getElementById('taxaBairroNaoAtendido');
  if(!tw) return;
  tw.style.display='';
  if(warn) warn.style.display='none';
  if(box) box.style.display='';

  if(CFG.taxaEntregaGratis){ taxaAtual=0; if(ti) ti.textContent='Entrega grátis! 🎉'; return; }

  const tipo = CFG.taxaEntregaTipo||'fixa';

  if(tipo==='bairro'){
    const bairro = bairroParam !== undefined ? bairroParam : (document.getElementById('eBairro')?.value||'');
    if(!bairro){ taxaAtual=0; if(ti) ti.textContent='Informe seu bairro para calcular a taxa.'; return; }
    /* busca case-insensitive */
    const taxasBairro = CFG.taxasBairro||{};
    const key = Object.keys(taxasBairro).find(k=>k.toLowerCase()===bairro.toLowerCase().trim());
    if(key!==undefined){
      taxaAtual = parseFloat(taxasBairro[key])||0;
      if(taxaAtual===0){ if(ti) ti.textContent='Entrega grátis para '+bairro+' 🎉'; }
      else { if(ti) ti.textContent='Taxa de entrega para '+bairro+': '+fmtR(taxaAtual); }
      if(box) box.style.background=taxaAtual===0?'#f0fdf4':'#eff6ff';
      if(box) box.style.color=taxaAtual===0?'#16a34a':'#1d4ed8';
    } else {
      taxaAtual = 0;
      if(box) box.style.display='none';
      if(warn) warn.style.display='';
    }
  } else {
    /* fixa ou dinâmica: usa valor padrão */
    taxaAtual = CFG.taxaEntrega||0;
    if(taxaAtual===0){ if(ti) ti.textContent='Entrega grátis!'; }
    else { if(ti) ti.textContent='Taxa de entrega: '+fmtR(taxaAtual); }
  }
}

/* recalcular ao mudar bairro manualmente */
document.addEventListener('input', e=>{
  if(e.target && e.target.id==='eBairro' && tipoPed==='entrega'){
    calcularTaxaEntrega(e.target.value);
  }
});

/* ── Info da Loja ── */
function abrirInfoLoja(){
  document.getElementById('infoModalOverlay').classList.add('show');
  document.getElementById('infoSheet').classList.add('show');
  document.body.style.overflow='hidden';
  infoTab('info',document.querySelector('.info-tab'));
  _atualizarLojaStatus();
}
function fecharInfoModal(){
  document.getElementById('infoModalOverlay').classList.remove('show');
  document.getElementById('infoSheet').classList.remove('show');
  document.body.style.overflow='';
}
function infoTab(id,btn){
  document.querySelectorAll('.info-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.info-panel').forEach(p=>p.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const p=document.getElementById('ip'+id.charAt(0).toUpperCase()+id.slice(1));
  if(p) p.classList.add('active');
}

/* ── Busca ─────── */
function toggleSearch(){
  const bar=document.getElementById('searchBar');
  const btn=document.getElementById('searchToggle');
  const inp=document.getElementById('searchInput');
  const show=bar.classList.toggle('show');
  btn.classList.toggle('active',show);
  if(show){ setTimeout(()=>inp?.focus(),100); }
  else { limparBusca(); }
}
function limparBusca(){
  const inp=document.getElementById('searchInput');
  if(inp) inp.value='';
  filtrarProdutos('');
  document.getElementById('searchClear')?.style.setProperty('display','none');
}
function filtrarProdutos(q){
  const termo=q.trim().toLowerCase();
  const clr=document.getElementById('searchClear');
  if(clr) clr.style.display=termo?'block':'none';
  let total=0;
  document.querySelectorAll('.product-row').forEach(row=>{
    const nome=row.querySelector('.product-row-name')?.textContent?.toLowerCase()||'';
    const desc=row.querySelector('.product-row-desc')?.textContent?.toLowerCase()||'';
    const match=!termo||nome.includes(termo)||desc.includes(termo);
    row.style.display=match?'':'none';
    if(match) total++;
  });
  /* mostrar/ocultar seções sem resultado */
  document.querySelectorAll('[data-cat-section]').forEach(sec=>{
    const vis=Array.from(sec.querySelectorAll('.product-row')).some(r=>r.style.display!=='none');
    sec.style.display=vis?'':'none';
  });
  const noRes=document.getElementById('noResult');
  if(noRes) noRes.style.display=total===0&&termo?'block':'none';
}

/* ── Scroll + observer ── */
function scrollToCat(id){
  const el=document.querySelector(`[data-cat-section="${id}"]`);
  if(el){const top=el.getBoundingClientRect().top+window.scrollY-100;window.scrollTo({top,behavior:'smooth'});}
  document.querySelectorAll('.cat-btn').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.cat)===id));
}
const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){const id=parseInt(e.target.dataset.catSection);document.querySelectorAll('.cat-btn').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.cat)===id));const btn=document.querySelector(`.cat-btn[data-cat="${id}"]`);if(btn)btn.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}});},{rootMargin:'-90px 0px -60% 0px',threshold:0});
document.querySelectorAll('[data-cat-section]').forEach(s=>obs.observe(s));

/* ── Sheets ── */
function abrirSheet(id){document.getElementById('overlay').classList.add('show');document.getElementById(id).classList.add('show');}
const ALL_SHEETS=['cartSheet','chkSheet','pedidosSheet','pontosSheet','contactSheet','endSheet','agendSheet'];
function fecharSheet(id){
  const el=document.getElementById(id); if(el) el.classList.remove('show');
  if(id==='pedidosSheet') _pararPedidosPolling();
  const outro=ALL_SHEETS.some(s=>s!==id&&document.getElementById(s)?.classList.contains('show'));
  if(!outro) document.getElementById('overlay').classList.remove('show');
}
function fecharTudo(){
  ALL_SHEETS.forEach(s=>{const el=document.getElementById(s);if(el)el.classList.remove('show');});
  document.getElementById('overlay').classList.remove('show');
  _pararPedidosPolling();
  fecharProdModal();
  fecharInfoModal();
  fecharAuthModal();
}

/* ── Utilitários ── */
function maskCep(el){
  let v=el.value.replace(/\D/g,'').slice(0,8);
  if(v.length>5) v=v.slice(0,5)+'-'+v.slice(5);
  el.value=v;
  if(v.replace(/\D/g,'').length===8) buscarCep(v.replace(/\D/g,''));
}
async function buscarCep(cep){
  const loading=document.getElementById('cepLoading');
  const campos=document.getElementById('endCampos');
  if(loading) loading.style.display='inline';
  try{
    const res=await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d=await res.json();
    if(d.erro){toast('CEP não encontrado');if(campos)campos.style.display='';if(loading)loading.style.display='none';return;}
    const setVal=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
    setVal('eRua', d.logradouro||'');
    setVal('eBairro', d.bairro||'');
    setVal('eCidade', d.localidade||'');
    setVal('eEstado', d.uf||'');
    setVal('eNum', '');
    if(campos) campos.style.display='';
    calcularTaxaEntrega(d.bairro||'');
    setTimeout(()=>document.getElementById('eNum')?.focus(),100);
  }catch(e){campos.style.display='';}
  if(loading) loading.style.display='none';
}
let _cbTimer=null;
function maskTel(el){let v=el.value.replace(/\D/g,'');
  /* verificar cashback quando telefone estiver completo */
  if(v.length>=10){
    clearTimeout(_cbTimer);
    _cbTimer=setTimeout(()=>verificarCashback(v.slice(0,11)),600);
  } else {
    /* limpar cashback se apagar o telefone */
    cashbackSaldo=0; cashbackUsando=false; cashbackDescontado=0;
    const box=document.getElementById('cashbackBox');
    if(box) box.classList.add('d-none');
  }if(v.length>11)v=v.slice(0,11);if(v.length>6)v=v.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3');else if(v.length>2)v=v.replace(/(\d{2})(\d+)/,'($1) $2');el.value=v;if(v.replace(/\D/g,'').length>=10&&tipoPed==='entrega'){const e=JSON.parse(localStorage.getItem('lc_end_'+v.replace(/\D/g,''))||'{}');if(e.r&&!document.getElementById('eRua').value){document.getElementById('eRua').value=e.r;document.getElementById('eNum').value=e.n||'';document.getElementById('eBairro').value=e.b||'';document.getElementById('eComp').value=e.c||'';}}};
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
let _toastCartTimer=null;
function toastCart(nome){
  const el=document.getElementById('toastCart');
  const nomeEl=document.getElementById('toastCartNome');
  if(!el) return;
  if(nomeEl) nomeEl.textContent=nome||'Produto adicionado';
  el.classList.add('show');
  clearTimeout(_toastCartTimer);
  _toastCartTimer=setTimeout(()=>el.classList.remove('show'), 2800);
}

uiAtualizar();

/* Scroll para o topo ao carregar */
window.scrollTo({top:0,behavior:'instant'});

/* ── Tracking de funil de conversão ── */
function track(tipo){
  try {
    const body = new URLSearchParams({tipo, loja_id: CFG.lojaId});
    if (navigator.sendBeacon) {
      navigator.sendBeacon('api/loja_tracking.php', body);
    } else {
      fetch('api/loja_tracking.php', {method:'POST', body, keepalive:true}).catch(()=>{});
    }
  } catch(e){}
}
(function(){

  /* 1. Visita — registra 1× por sessão */
  const sessKey = 'tr_visita_' + CFG.lojaId;
  if (!sessionStorage.getItem(sessKey)) {
    sessionStorage.setItem(sessKey, '1');
    track('visita');
  }

  /* 2. Visualização de item — ao abrir modal de produto */
  const _origAbrirProduto = window.abrirProduto;
  window.abrirProduto = function(id, d) {
    track('view_item');
    if (_origAbrirProduto) _origAbrirProduto(id, d);
  };

  /* 3. Carrinho — ao adicionar item */
  const _origAddCart = window.addCart;
  window.addCart = function() {
    track('carrinho');
    if (_origAddCart) _origAddCart();
  };
})();

/* Abrir pedidos se veio de um pedido confirmado */
if(sessionStorage.getItem('lc_open_pedidos')){
  sessionStorage.removeItem('lc_open_pedidos');
  setTimeout(()=>mostrarTab('pedidos'),600);
}

/* ── Atualização em tempo real do status da loja (horário de funcionamento) ── */
function _atualizarLojaStatus(){
  if(document.visibilityState!=='visible') return;
  fetch(`api/loja_status.php?loja_id=${CFG.lojaId}`)
    .then(r=>r.json())
    .then(d=>{
      if(!d.ok) return;
      const el=document.getElementById('storeStatus');
      const txt=document.getElementById('storeStatusText');
      if(!el||!txt) return;
      el.classList.toggle('open', d.aberto);
      el.classList.toggle('closed', !d.aberto);
      let novoTexto;
      if(d.aberto){
        novoTexto='Aberto agora';
      }else if(!d.receberPedidosAtivo){
        novoTexto='Loja não está recebendo pedidos no momento';
      }else{
        novoTexto='Fechado'+(d.proximoHorario?', abriremos '+d.proximoHorario:'');
      }
      if(txt.textContent!==novoTexto) txt.textContent=novoTexto;
      CFG.lojaAberta=d.aberto;
      CFG.entAtiva=d.entAtiva;
      CFG.retAtiva=d.retAtiva;

      /* Loja fechou/abriu enquanto o cliente navegava: mostra/oculta as opções
         de entrega e retirada imediatas (agendadas continuam sempre visíveis). */
      const tcEntrega=document.getElementById('tcEntrega');
      const tcRetirada=document.getElementById('tcRetirada');
      if(tcEntrega) tcEntrega.classList.toggle('d-none', !(d.aberto && d.entAtiva));
      if(tcRetirada) tcRetirada.classList.toggle('d-none', !(d.aberto && d.retAtiva));

      /* Se o cliente já tinha escolhido entrega/retirada imediata e a loja fechou
         agora, desfaz a seleção e avisa — ele precisa escolher uma opção agendada. */
      if(!d.aberto && (tipoPed==='entrega'||tipoPed==='retirada')){
        tipoPed='';
        Object.values(TIPO_IDS).forEach(id=>document.getElementById(id)?.classList.remove('active'));
        document.getElementById('tipoHint')?.classList.remove('d-none');
        atualizarBtnContinuar();
        if(typeof toast==='function') toast('A loja fechou agora. Escolha entrega ou retirada agendada.');
      }

      if(Array.isArray(d.semana)) _renderHorarioSemana(d.semana);

      if(d.catalogoVersao) _verificarNovaCatalogoVersao(d.catalogoVersao);
      if(Array.isArray(d.categoriasBloqueadas)) _verificarCategoriasBloqueadas(d.categoriasBloqueadas);
    })
    .catch(()=>{});
}

/* ── Catálogo (produtos/categorias) mudou no admin, OU uma categoria com
   agendamento passou do horário: atualiza a loja sem precisar que o cliente
   dê F5 manualmente ── */
let _catalogoVersaoAtual=CFG.catalogoVersao||'';
let _categoriasBloqueadasAtual=null;
let _catalogoBannerMostrado=false;
function _dispararAtualizacaoCatalogo(){
  if(_catalogoBannerMostrado) return;
  const semInteracao = carrinho.length===0 && !ALL_SHEETS.some(id=>document.getElementById(id)?.classList.contains('show'));
  if(semInteracao){
    window.location.reload();
    return;
  }
  _catalogoBannerMostrado=true;
  const b=document.createElement('div');
  b.className='catalogo-update-banner';
  b.innerHTML='<i class="bi bi-arrow-repeat"></i> Cardápio atualizado! Toque para ver as novidades.';
  b.onclick=()=>window.location.reload();
  document.body.appendChild(b);
  requestAnimationFrame(()=>b.classList.add('show'));
}
function _verificarNovaCatalogoVersao(versaoNova){
  if(!_catalogoVersaoAtual){ _catalogoVersaoAtual=versaoNova; return; }
  if(versaoNova===_catalogoVersaoAtual) return;
  _catalogoVersaoAtual=versaoNova;
  _dispararAtualizacaoCatalogo();
}
function _verificarCategoriasBloqueadas(lista){
  const chave=(lista||[]).join(',');
  if(_categoriasBloqueadasAtual===null){ _categoriasBloqueadasAtual=chave; return; }
  if(chave===_categoriasBloqueadasAtual) return;
  _categoriasBloqueadasAtual=chave;
  _dispararAtualizacaoCatalogo();
}
function _renderHorarioSemana(semana){
  const wrap=document.getElementById('ipHorario');
  if(!wrap) return;
  wrap.innerHTML=semana.map(function(dia){
    let direita;
    if(dia.aberto){
      direita=`<div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
        <span class="horario-card-hora">${dia.inicio} – ${dia.fim}</span>
        ${dia.fechaBreve?'<span style="font-size:.62rem;font-weight:700;background:#fef9c3;color:#854d0e;border-radius:999px;padding:2px 8px;white-space:nowrap">Fecha em breve</span>':''}
      </div>`;
    } else {
      direita='<span class="horario-card-fechado">Fechado</span>';
    }
    return `<div class="horario-card ${dia.hoje?'hoje':''}">
      <div class="horario-card-left">
        <div class="horario-card-dia">${dia.dia}</div>
        ${dia.hoje?'<span class="horario-hoje-badge">Hoje</span>':''}
      </div>
      ${direita}
    </div>`;
  }).join('');
}
setInterval(_atualizarLojaStatus, 20000);
verificarCupomBanner();
