<?php
session_start();
date_default_timezone_set('America/Fortaleza');
require_once '../config/database.php';
require_once '../helpers/loja_context.php';
require_once '../helpers/storage.php';

$pedidoId = (int)($_GET['id'] ?? 0);
$token    = trim($_GET['token'] ?? '');
$lojaId   = definirLojaIdSessao($conn);

if (!$pedidoId) { header('Location: loja.php'); exit; }

/* buscar nome da loja */
function cfgPub(PDO $db, int $lid, string $k, $d=''): string {
  $s=$db->prepare("SELECT valor FROM configuracoes WHERE chave=? AND loja_id=? LIMIT 1");
  $s->execute([$k,$lid]); $v=$s->fetchColumn();
  return $v!==false?(string)$v:(string)$d;
}
$nomeLoja   = cfgPub($conn,$lojaId,'nome_loja','Loja');
$perfilLoja = cfgPub($conn,$lojaId,'loja_perfil','');
$wpCliente  = cfgPub($conn,$lojaId,'whatsapp_cliente_ativo','0') === '1';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pedido #<?= $pedidoId ?> — <?= htmlspecialchars($nomeLoja) ?></title>
<meta name="theme-color" content="#f43f5e">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Manrope',sans-serif;background:#f5f5f5;color:#111827;min-height:100vh}
:root{--pink:#f43f5e}

.track-header{
  background:var(--pink);
  color:#fff;
  padding:20px 20px 60px;
  text-align:center;
  position:relative;
}
.track-header-logo{
  width:56px;height:56px;border-radius:50%;
  object-fit:cover;
  background:rgba(255,255,255,.2);
  margin:0 auto 10px;
  display:block;
}
.track-header-loja{font-size:.82rem;opacity:.85;margin-bottom:4px}
.track-header-num{font-size:1.5rem;font-weight:800}

.track-card{
  background:#fff;
  border-radius:22px 22px 0 0;
  margin-top:-30px;
  padding:24px 20px;
  min-height:calc(100vh - 120px);
}

/* status steps */
.status-steps{display:flex;flex-direction:column;gap:0;margin-bottom:24px}
.status-step{
  display:flex;align-items:flex-start;gap:14px;
  padding-bottom:16px;
  position:relative;
}
.status-step:not(:last-child)::before{
  content:'';
  position:absolute;
  left:15px;top:32px;
  width:2px;
  height:calc(100% - 16px);
  background:#e5e7eb;
}
.status-step.done::before{background:var(--pink)}
.step-icon{
  width:32px;height:32px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;
  font-size:.9rem;
  background:#f3f4f6;color:#9ca3af;
  border:2px solid #e5e7eb;
  position:relative;z-index:1;
}
.status-step.done .step-icon{background:#dcfce7;color:#16a34a;border-color:#86efac}
.status-step.active .step-icon{background:var(--pink);color:#fff;border-color:var(--pink);box-shadow:0 4px 12px rgba(244,63,94,.3)}
.step-info{padding-top:4px}
.step-label{font-size:.84rem;font-weight:700;color:#374151}
.status-step.active .step-label{color:var(--pink)}
.step-sub{font-size:.74rem;color:#9ca3af;margin-top:2px}
.status-step.active .step-sub{color:#6b7280}

/* resumo */
.resumo-card{
  background:#f9fafb;border-radius:14px;
  padding:14px 16px;margin-bottom:16px;
}
.resumo-title{font-size:.78rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px}
.resumo-row{
  display:flex;justify-content:space-between;
  font-size:.82rem;color:#374151;
  margin-bottom:6px;
}
.resumo-row:last-child{margin-bottom:0}
.resumo-row.total{font-size:.9rem;font-weight:700;color:#111827;border-top:1px solid #e5e7eb;padding-top:8px;margin-top:4px}

/* spinner */
.spin{
  width:24px;height:24px;border-radius:50%;
  border:3px solid #e5e7eb;border-top-color:var(--pink);
  animation:spin .8s linear infinite;
  display:inline-block;
}
@keyframes spin{to{transform:rotate(360deg)}}

.badge-status{
  display:inline-flex;align-items:center;gap:6px;
  border-radius:999px;padding:6px 14px;
  font-size:.8rem;font-weight:700;
  margin-bottom:20px;
}
.badge-pendente{background:#fef9c3;color:#854d0e}
.badge-aceito{background:#dbeafe;color:#1e40af}
.badge-preparando{background:#fef3c7;color:#92400e}
.badge-entrega{background:#ede9fe;color:#5b21b6}
.badge-finalizado{background:#dcfce7;color:#166534}
.badge-cancelado{background:#fee2e2;color:#991b1b}

.btn-voltar{
  display:flex;align-items:center;gap:6px;
  background:var(--pink);color:#fff;border:0;
  border-radius:999px;padding:12px 20px;
  font-size:.86rem;font-weight:700;font-family:'Manrope',sans-serif;
  cursor:pointer;width:100%;justify-content:center;margin-top:8px;
}
</style>
</head>
<body>

<div class="track-header">
  <?php
    /* corrigir caminho da logo */
    $perfilLojaFull = storage_url_relativa($perfilLoja);
  ?>
  <?php if ($perfilLojaFull): ?>
    <img class="track-header-logo" src="<?= htmlspecialchars($perfilLojaFull) ?>" alt="<?= htmlspecialchars($nomeLoja) ?>">
  <?php else: ?>
    <div class="track-header-logo" style="display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800">
      <?= mb_substr($nomeLoja,0,1,'UTF-8') ?>
    </div>
  <?php endif; ?>
  <div class="track-header-loja"><?= htmlspecialchars($nomeLoja) ?></div>
  <div class="track-header-num">Pedido #<?= $pedidoId ?></div>
</div>

<div class="track-card">
  <div id="statusBadge" class="badge-status badge-pendente">
    <span class="spin"></span>
    <span id="statusLabel">Carregando...</span>
  </div>

  <div class="status-steps" id="statusSteps">
    <div class="status-step" id="step-pendente">
      <div class="step-icon"><i class="bi bi-clock"></i></div>
      <div class="step-info">
        <div class="step-label">Pedido recebido</div>
        <div class="step-sub">Aguardando confirmação da loja</div>
      </div>
    </div>
    <div class="status-step" id="step-aceito">
      <div class="step-icon"><i class="bi bi-check-lg"></i></div>
      <div class="step-info">
        <div class="step-label">Pedido confirmado</div>
        <div class="step-sub">A loja aceitou seu pedido</div>
      </div>
    </div>
    <div class="status-step" id="step-preparando">
      <div class="step-icon"><i class="bi bi-bag-check"></i></div>
      <div class="step-info">
        <div class="step-label">Em preparo</div>
        <div class="step-sub">Sua encomenda está sendo preparada</div>
      </div>
    </div>
    <div class="status-step" id="step-entrega">
      <div class="step-icon"><i class="bi bi-bicycle"></i></div>
      <div class="step-info">
        <div class="step-label" id="stepEntregaLabel">A caminho</div>
        <div class="step-sub" id="stepEntregaSub">Saiu para entrega</div>
      </div>
    </div>
    <div class="status-step" id="step-finalizado">
      <div class="step-icon"><i class="bi bi-star"></i></div>
      <div class="step-info">
        <div class="step-label">Entregue!</div>
        <div class="step-sub">Pedido concluído. Bom apetite!</div>
      </div>
    </div>
  </div>

  <div class="resumo-card" id="pedidoResumo" style="display:none">
    <div class="resumo-title">Resumo do pedido</div>
    <div id="resumoItens"></div>
    <div class="resumo-row total"><span>Total</span><span id="resumoTotal">—</span></div>
  </div>

  <button class="btn-voltar" onclick="window.location.href='loja.php'">
    <i class="bi bi-arrow-left"></i> Fazer novo pedido
  </button>
</div>

<script>
const PEDIDO_ID = <?= $pedidoId ?>;
const ORDER_STATUS_MAP = {
  pendente:   {label:'Aguardando confirmação',badge:'badge-pendente',ordem:0},
  aceito:     {label:'Pedido confirmado',     badge:'badge-aceito',  ordem:1},
  preparando: {label:'Em preparo',            badge:'badge-preparando',ordem:2},
  entrega:    {label:'A caminho',             badge:'badge-entrega', ordem:3},
  finalizado: {label:'Entregue!',             badge:'badge-finalizado',ordem:4},
  cancelado:  {label:'Cancelado',             badge:'badge-cancelado', ordem:-1},
};
const STEP_ORDER = ['pendente','aceito','preparando','entrega','finalizado'];
let ultimoStatus = '';

async function consultarStatus(){
  try {
    const res = await fetch(`api/pedido_status.php?id=${PEDIDO_ID}`);
    const d   = await res.json();
    if(!d||!d.ok||!d.pedido) return;
    const p = d.pedido;
    const status = (p.status||'pendente').toLowerCase();
    if(status === ultimoStatus) return;
    ultimoStatus = status;
    atualizarStatus(status, p, d.itens||[]);
  } catch(e){}
}

function atualizarStatus(status, pedido, itens){
  const info = ORDER_STATUS_MAP[status] || {label:status,badge:'badge-pendente',ordem:0};
  /* badge */
  const badge = document.getElementById('statusBadge');
  badge.className = 'badge-status '+info.badge;
  badge.innerHTML = (status==='finalizado'?'<i class="bi bi-check-circle-fill"></i>':'<span class="spin"></span>')+
    `<span>${info.label}</span>`;
  document.getElementById('statusLabel').textContent = info.label;
  /* steps */
  const ordemAtual = info.ordem;
  STEP_ORDER.forEach((s,i)=>{
    const el = document.getElementById('step-'+s);
    if(!el) return;
    el.classList.remove('done','active');
    if(i < ordemAtual)      el.classList.add('done');
    else if(i===ordemAtual) el.classList.add('active');
  });
  /* tipo entrega/retirada */
  if((pedido.tipo||'').toLowerCase()==='retirada'){
    document.getElementById('stepEntregaLabel').textContent='Pronto para retirar';
    document.getElementById('stepEntregaSub').textContent='Seu pedido está pronto!';
  }
  /* resumo */
  if(itens.length){
    document.getElementById('pedidoResumo').style.display='';
    document.getElementById('resumoItens').innerHTML = itens.map(i=>`
      <div class="resumo-row"><span>${i.quantidade}x ${i.produto_nome}</span><span>R$ ${(i.preco*i.quantidade).toFixed(2).replace('.',',')}</span></div>
    `).join('');
    document.getElementById('resumoTotal').textContent='R$ '+parseFloat(pedido.total||0).toFixed(2).replace('.',',');
  }
  /* parar polling se finalizado ou cancelado */
  if(status==='finalizado'||status==='cancelado'){
    clearInterval(polling);
  }
}

consultarStatus();
const polling = setInterval(consultarStatus, 6000);
</script>
</body>
</html>
