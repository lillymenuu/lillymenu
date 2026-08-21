<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/gerenciamento_module.php';
require_once __DIR__ . '/helpers/mercadopago.php';

gerenciamentoEnsureModule($conn);
garantirMercadopagoColunas($conn);

$lojaId = (int) ($_SESSION['loja_id'] ?? 0);
$lojaNome = config($conn, 'nome_loja', 'Minha loja');

$stmt = $conn->prepare("SELECT id, status, trial_inicio, trial_fim, ciclo_inicio, ciclo_fim, plano_id, criado_em FROM assinaturas WHERE loja_id = ? ORDER BY id DESC LIMIT 1");
$stmt->execute([$lojaId]);
$assinatura = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

$stmt = $conn->prepare("SELECT id, nome, valor FROM planos WHERE id = ? LIMIT 1");
$stmt->execute([(int) ($assinatura['plano_id'] ?? 1)]);
$plano = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['id' => 0, 'nome' => 'Mensal', 'valor' => 50.00];

$status = strtolower(trim((string) ($assinatura['status'] ?? 'trial')));
if ($status === 'ativo') {
  $status = 'ativa';
}
$trialFim = $assinatura['trial_fim'] ?? null;
$cicloFim = $assinatura['ciclo_fim'] ?? null;

$badgeTexto = 'Período de teste';
$badgeClasse = 'plan-badge--trial';
if ($status === 'ativa') {
  $badgeTexto = 'Assinatura ativa';
  $badgeClasse = 'plan-badge--ativa';
} elseif ($status === 'suspensa' || $status === 'cancelada') {
  $badgeTexto = $status === 'cancelada' ? 'Assinatura cancelada' : 'Assinatura suspensa';
  $badgeClasse = 'plan-badge--suspensa';
}

$validoAteLabel = '';
$validoAteData = '';
if ($status === 'trial' && $trialFim) {
  $validoAteLabel = 'Trial válido até';
  $validoAteData = date('d/m/y', strtotime($trialFim));
} elseif ($cicloFim) {
  $validoAteLabel = 'Válido até';
  $validoAteData = date('d/m/y', strtotime($cicloFim));
}

$assinaturaDesde = $assinatura['ciclo_inicio'] ?? ($assinatura['trial_inicio'] ?? ($assinatura['criado_em'] ?? null));
$assinaturaDesdeFmt = $assinaturaDesde ? date('d/m/Y', strtotime($assinaturaDesde)) : '-';

// Mesmos dados que admin/pagamento.php calcula, necessarios pro partial de
// renovacao (admin/partials/renovacao_pagamento.php) reaproveitado abaixo.
$cobrancaPendente = null;
if (!empty($assinatura['id'])) {
  $stmt = $conn->prepare("
    SELECT id, valor, vencimento, status, comprovante_arquivo, comprovante_enviado_em, motivo_rejeicao
    FROM cobrancas
    WHERE assinatura_id = ? AND status IN ('pendente','atrasado')
    ORDER BY id DESC LIMIT 1
  ");
  $stmt->execute([(int) $assinatura['id']]);
  $cobrancaPendente = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}
$comprovanteEnviado = $cobrancaPendente && !empty($cobrancaPendente['comprovante_arquivo']);

$stmt = $conn->prepare("SELECT chave, valor FROM configuracoes WHERE loja_id = 0 AND chave IN ('saas_pix_chave','saas_pix_nome','saas_whatsapp_numero')");
$stmt->execute();
$saasCfg = [];
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
  $saasCfg[$row['chave']] = $row['valor'];
}
$saasPixChave = $saasCfg['saas_pix_chave'] ?? '';
$saasPixNome = $saasCfg['saas_pix_nome'] ?? '';
$whatsNumeroSuporte = $saasCfg['saas_whatsapp_numero'] ?? '5585985049577';
$msgComprovante = "Ola, segue o comprovante do pagamento da mensalidade da loja {$lojaNome}.";
$whatsLink = 'https://wa.me/' . $whatsNumeroSuporte . '?text=' . urlencode($msgComprovante);
$uploadMsg = $_GET['msg'] ?? '';
$retornoUpload = 'plan-details';

// Planos disponiveis pra troca (exclui o atual).
$stmt = $conn->prepare("SELECT id, nome, valor FROM planos WHERE ativo = 1 AND landing_slug IS NOT NULL AND id <> ? ORDER BY valor ASC");
$stmt->execute([(int) ($assinatura['plano_id'] ?? 0)]);
$planosDisponiveis = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Perfil de cobranca (CPF/telefone) ja salvo, se houver.
$stmt = $conn->prepare("SELECT chave, valor FROM configuracoes WHERE loja_id = ? AND chave IN ('cobranca_cpf','cobranca_telefone')");
$stmt->execute([$lojaId]);
$perfilCfg = [];
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
  $perfilCfg[$row['chave']] = $row['valor'];
}
$cobrancaCpfAtual = $perfilCfg['cobranca_cpf'] ?? '';
$cobrancaTelefoneAtual = $perfilCfg['cobranca_telefone'] ?? '';

$temCobrancaPendente = $cobrancaPendente !== null;

$dashCssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$pagamentoCssVer = filemtime(__DIR__ . '/assets/css/pagamento.css');
$planDetailsCssVer = filemtime(__DIR__ . '/assets/css/plan-details.css');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Assinatura</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $dashCssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link href="./assets/css/pagamento.css?v=<?= $pagamentoCssVer ?>" rel="stylesheet">
<link href="./assets/css/plan-details.css?v=<?= $planDetailsCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy">

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="dash-page plan-details-page">
  <div class="settings-header">
    <div class="settings-title-wrap">
      <button class="dash-menu-btn" onclick="toggleSidebar()" aria-label="Abrir menu">
        <i class="bi bi-list"></i>
      </button>
      <div>
        <h1 class="settings-title">Detalhes do seu plano</h1>
        <div class="settings-subtitle">Acompanhe sua assinatura, histórico de pagamentos e troque de plano quando quiser.</div>
      </div>
    </div>
  </div>

  <div class="plan-card">
    <span class="plan-badge <?= $badgeClasse ?>"><?= htmlspecialchars($badgeTexto) ?></span>
    <div class="plan-card-nome"><?= htmlspecialchars($plano['nome']) ?></div>
    <?php if ($validoAteData !== ''): ?>
      <div class="plan-card-validade"><span class="plan-dot"></span><?= htmlspecialchars($validoAteLabel) ?>: <?= htmlspecialchars($validoAteData) ?></div>
    <?php endif; ?>

    <div class="plan-card-rows">
      <div class="plan-card-row"><span>Assinatura</span><strong><?= htmlspecialchars($assinaturaDesdeFmt) ?></strong></div>
      <div class="plan-card-row"><span>Valor mensal</span><strong>R$ <?= number_format((float) $plano['valor'], 2, ',', '.') ?></strong></div>
    </div>

    <button type="button" class="plan-action-btn" id="btnAbrirHistorico">
      <span><i class="bi bi-clock-history"></i> Histórico de transações</span>
      <i class="bi bi-chevron-right"></i>
    </button>
    <button type="button" class="plan-action-btn" id="btnTrocarPlano">
      <span><i class="bi bi-arrow-left-right"></i> Trocar de plano</span>
      <i class="bi bi-chevron-right"></i>
    </button>
  </div>

  <div class="plan-card d-none" id="trocarPlanoBox">
    <div class="plan-card-titulo">Trocar de plano</div>
    <?php if ($temCobrancaPendente): ?>
      <div class="pay-alert pay-alert-erro">Finalize o pagamento pendente antes de trocar de plano.</div>
    <?php elseif (!$planosDisponiveis): ?>
      <div class="plan-card-vazio">Nenhum outro plano disponível no momento.</div>
    <?php else: ?>
      <div class="plan-picker" id="planoPickerLista">
        <?php foreach ($planosDisponiveis as $p): ?>
          <label class="plan-picker-item">
            <input type="radio" name="planoTroca" value="<?= (int) $p['id'] ?>">
            <span class="plan-picker-nome"><?= htmlspecialchars($p['nome']) ?></span>
            <span class="plan-picker-valor">R$ <?= number_format((float) $p['valor'], 2, ',', '.') ?>/mês</span>
          </label>
        <?php endforeach; ?>
      </div>
      <div class="plan-picker-msg" id="trocarPlanoMsg"></div>
      <button type="button" class="pay-btn" id="btnConfirmarTrocaPlano">Confirmar troca</button>
    <?php endif; ?>
  </div>

  <div class="plan-card">
    <button type="button" class="pay-btn" id="btnRenovar">Renovar</button>
    <div class="d-none" id="renovacaoBox">
      <?php include __DIR__ . '/partials/renovacao_pagamento.php'; ?>
    </div>
  </div>

  <div class="plan-card">
    <div class="plan-card-titulo">Perfil de cobrança</div>
    <div class="plan-card-desc">Usado nos detalhes das suas transações.</div>
    <form id="formPerfilCobranca">
      <div class="row g-2 mt-1">
        <div class="col-sm-6">
          <label class="form-label">CPF</label>
          <input type="text" class="form-control" id="perfilCpf" name="cpf" placeholder="000.000.000-00" value="<?= htmlspecialchars($cobrancaCpfAtual) ?>">
        </div>
        <div class="col-sm-6">
          <label class="form-label">Telefone</label>
          <input type="text" class="form-control" id="perfilTelefone" name="telefone" placeholder="(00) 00000-0000" value="<?= htmlspecialchars($cobrancaTelefoneAtual) ?>">
        </div>
      </div>
      <button type="submit" class="pay-btn plan-perfil-btn">Salvar perfil</button>
      <div class="plan-picker-msg" id="perfilCobrancaMsg"></div>
    </form>
  </div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>

<!-- MODAL HISTORICO DE TRANSACOES -->
<div class="modal fade" id="modalHistoricoTransacoes" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Histórico de transações</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="plan-historico-sub">Você está vendo suas transações dos últimos 12 meses</div>
        <div id="historicoLista"><div class="plan-card-vazio">Carregando...</div></div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL DETALHES DA TRANSACAO (aninhado, abre por cima do historico) -->
<div class="modal fade" id="modalDetalheTransacao" tabindex="-1" style="z-index:1070">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Detalhes da transação</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body" id="detalheTransacaoBody">
        <div class="plan-card-vazio">Carregando...</div>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
function escapeHtml(v){
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatMoneyBR(v){
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDateBR(v){
  if (!v) return '-';
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
}
function formatDateTimeBR(v){
  if (!v) return '-';
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}

document.getElementById('btnRenovar')?.addEventListener('click', function(){
  document.getElementById('renovacaoBox').classList.toggle('d-none');
});

document.getElementById('btnTrocarPlano')?.addEventListener('click', function(){
  document.getElementById('trocarPlanoBox').classList.toggle('d-none');
});

<?php if ($uploadMsg !== ''): ?>
document.getElementById('renovacaoBox')?.classList.remove('d-none');
<?php endif; ?>

document.getElementById('btnConfirmarTrocaPlano')?.addEventListener('click', function(){
  const escolhido = document.querySelector('input[name="planoTroca"]:checked');
  const msgEl = document.getElementById('trocarPlanoMsg');
  if (!escolhido) {
    msgEl.textContent = 'Selecione um plano.';
    msgEl.className = 'plan-picker-msg plan-picker-msg--erro';
    return;
  }
  this.disabled = true;
  fetch('api/assinatura_trocar_plano.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ plano_id: escolhido.value })
  })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        msgEl.textContent = 'Plano alterado para ' + data.plano_nome + '! Atualizando...';
        msgEl.className = 'plan-picker-msg plan-picker-msg--ok';
        setTimeout(() => window.location.reload(), 1200);
      } else {
        msgEl.textContent = data.msg || 'Erro ao trocar de plano.';
        msgEl.className = 'plan-picker-msg plan-picker-msg--erro';
        document.getElementById('btnConfirmarTrocaPlano').disabled = false;
      }
    })
    .catch(() => {
      msgEl.textContent = 'Erro ao trocar de plano.';
      msgEl.className = 'plan-picker-msg plan-picker-msg--erro';
      document.getElementById('btnConfirmarTrocaPlano').disabled = false;
    });
});

document.getElementById('formPerfilCobranca')?.addEventListener('submit', function(e){
  e.preventDefault();
  const msgEl = document.getElementById('perfilCobrancaMsg');
  const dados = new FormData(this);
  fetch('api/assinatura_perfil_cobranca_salvar.php', { method: 'POST', body: dados })
    .then(r => r.json())
    .then(data => {
      msgEl.textContent = data.ok ? 'Perfil salvo com sucesso.' : (data.msg || 'Erro ao salvar.');
      msgEl.className = 'plan-picker-msg ' + (data.ok ? 'plan-picker-msg--ok' : 'plan-picker-msg--erro');
    })
    .catch(() => {
      msgEl.textContent = 'Erro ao salvar.';
      msgEl.className = 'plan-picker-msg plan-picker-msg--erro';
    });
});

const modalHistoricoEl = document.getElementById('modalHistoricoTransacoes');
const modalHistorico = new bootstrap.Modal(modalHistoricoEl);
const modalDetalheEl = document.getElementById('modalDetalheTransacao');
const modalDetalhe = new bootstrap.Modal(modalDetalheEl);

// Modal aninhado (detalhe abre por cima do historico) precisa do dialog E do
// backdrop com z-index maior que o modal de baixo, senao o Bootstrap nao
// empilha sozinho e o backdrop bloqueia os clicks no modal de cima.
modalDetalheEl.addEventListener('shown.bs.modal', () => {
  modalDetalheEl.style.zIndex = '1070';
  const bds = document.querySelectorAll('.modal-backdrop');
  if (bds.length > 0) bds[bds.length - 1].style.zIndex = '1065';
});

function statusBadgeHtml(status){
  const cls = status === 'pago' ? 'pago' : (status === 'atrasado' ? 'atrasado' : 'pendente');
  return `<span class="pay-historico-badge pay-historico-badge--${cls}">${escapeHtml(status)}</span>`;
}

document.getElementById('btnAbrirHistorico')?.addEventListener('click', () => {
  const lista = document.getElementById('historicoLista');
  lista.innerHTML = '<div class="plan-card-vazio">Carregando...</div>';
  modalHistorico.show();
  fetch('api/assinatura_historico.php')
    .then(r => r.json())
    .then(data => {
      if (!data.ok || !data.transacoes.length) {
        lista.innerHTML = '<div class="plan-card-vazio">Nenhuma transação encontrada.</div>';
        return;
      }
      lista.innerHTML = data.transacoes.map(t => `
        <div class="pay-historico-item plan-historico-item" data-cobranca-id="${t.id}" role="button">
          <div>
            <div class="pay-historico-valor">${formatMoneyBR(t.valor)}</div>
            <div class="pay-historico-meta">
              ${t.origem === 'mercadopago' ? 'Pix automático' : 'Comprovante manual'}
              &middot;
              ${t.pago_em ? 'pago em ' + formatDateBR(t.pago_em) : 'vencimento ' + formatDateBR(t.vencimento)}
            </div>
          </div>
          ${statusBadgeHtml(t.status)}
        </div>
      `).join('');
      lista.querySelectorAll('[data-cobranca-id]').forEach(el => {
        el.addEventListener('click', () => abrirDetalheTransacao(el.dataset.cobrancaId));
      });
    })
    .catch(() => { lista.innerHTML = '<div class="plan-card-vazio">Erro ao carregar histórico.</div>'; });
});

function abrirDetalheTransacao(cobrancaId){
  const body = document.getElementById('detalheTransacaoBody');
  body.innerHTML = '<div class="plan-card-vazio">Carregando...</div>';
  modalDetalhe.show();
  fetch('api/assinatura_transacao_detalhe.php?cobranca_id=' + encodeURIComponent(cobrancaId))
    .then(r => r.json())
    .then(data => {
      if (!data.ok) {
        body.innerHTML = '<div class="plan-card-vazio">' + escapeHtml(data.msg || 'Erro ao carregar transação.') + '</div>';
        return;
      }
      const t = data.transacao;
      const p = data.pagador;
      body.innerHTML = `
        <div class="detalhe-transacao-topo">
          <div class="detalhe-transacao-icone"><i class="bi bi-bank"></i></div>
          <div class="detalhe-transacao-valor">${formatMoneyBR(t.valor)}</div>
          <div class="detalhe-transacao-data">${t.pago_em ? 'Pago em ' + formatDateTimeBR(t.pago_em) : 'Vencimento ' + formatDateBR(t.vencimento)}</div>
        </div>
        <div class="detalhe-transacao-bloco">
          <div class="detalhe-transacao-bloco-titulo">Informações do pagamento</div>
          <div class="detalhe-transacao-linha"><span>Status</span><strong>${escapeHtml(t.status)}</strong></div>
          <div class="detalhe-transacao-linha"><span>Método</span><strong>${t.origem === 'mercadopago' ? 'Pix' : 'Comprovante manual'}</strong></div>
        </div>
        <div class="detalhe-transacao-bloco">
          <div class="detalhe-transacao-bloco-titulo">Itens</div>
          <div class="detalhe-transacao-linha"><span><?= htmlspecialchars($plano['nome']) ?></span><strong>${formatMoneyBR(t.valor)}</strong></div>
        </div>
        <div class="detalhe-transacao-bloco">
          <div class="detalhe-transacao-bloco-titulo">Perfil de pagamento</div>
          <div class="detalhe-transacao-linha"><span>Nome</span><strong>${escapeHtml(p.nome || '-')}</strong></div>
          <div class="detalhe-transacao-linha"><span>E-mail</span><strong>${escapeHtml(p.email || '-')}</strong></div>
          <div class="detalhe-transacao-linha"><span>CPF</span><strong>${escapeHtml(p.cpf || '-')}</strong></div>
          <div class="detalhe-transacao-linha"><span>Telefone</span><strong>${escapeHtml(p.telefone || '-')}</strong></div>
        </div>
      `;
    })
    .catch(() => { body.innerHTML = '<div class="plan-card-vazio">Erro ao carregar transação.</div>'; });
}
</script>
</body>
</html>
