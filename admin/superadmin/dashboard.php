
<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/gerenciamento_module.php';
require_once __DIR__ . '/helpers.php';

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo 'Acesso restrito.';
  exit;
}

gerenciamentoEnsureModule($conn);

$lojas = buscarLojasComDetalhes($conn);

$cadastrosMes = [];
try {
  $stmt = $conn->query("
    SELECT DATE_FORMAT(criado_em, '%Y-%m') AS mes, COUNT(*) AS total
    FROM lojas
    GROUP BY DATE_FORMAT(criado_em, '%Y-%m')
    ORDER BY mes ASC
  ");
  $cadastrosMes = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
} catch (Exception $e) {
  $cadastrosMes = [];
}

$leads = buscarLeadsRecentes($conn);

$notificacoes = superadminNotificacoes($conn);
$notifCount = count($notificacoes);

$labelsMes = [];
$totaisMes = [];
foreach ($cadastrosMes as $row) {
  $labelsMes[] = $row['mes'];
  $totaisMes[] = (int) $row['total'];
}

$totalAtivas = 0;
$totalTrial = 0;
$expira7 = 0;
$expira15 = 0;
$expira30 = 0;
$expiradas = 0;
$comprovantesPendentes = 0;
$receitaMes = 0.0;

$hoje = new DateTime('today');
foreach ($lojas as &$l) {
  $l = resolverStatusLoja($l, $hoje);
  $status = $l['status_resolvido'];

  $hasAccess = ($status === 'ativa');
  if (!$l['status'] && !empty($l['ativo'])) {
    $hasAccess = true;
  }
  if ($hasAccess) {
    $totalAtivas++;
    $receitaMes += (float) ($l['plano_valor'] ?? 0);
  }
  if (!empty($l['comprovante_arquivo']) && in_array($l['cobranca_status'] ?? '', ['pendente', 'atrasado'], true)) {
    $comprovantesPendentes++;
  }
  if ($l['is_trial_periodo'] || $status === 'trial') {
    $totalTrial++;
  }

  if ($l['expira_dias'] !== null) {
    if ($l['expira_dias'] < 0) {
      $expiradas++;
    } else {
      if ($l['expira_dias'] <= 7) $expira7++;
      if ($l['expira_dias'] <= 15) $expira15++;
      if ($l['expira_dias'] <= 30) $expira30++;
    }
  }
}
unset($l);

$paginaAtual = 'Dashboard';
$chromeCssVer = filemtime(__DIR__ . '/assets/css/chrome.css');
$dashboardCssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$chromeJsVer = filemtime(__DIR__ . '/assets/js/chrome.js');
$dashboardJsVer = filemtime(__DIR__ . '/assets/js/dashboard.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard - Gerenciar lojas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<link rel="shortcut icon" href="../assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="../assets/img/favicon_store.png">

<link href="assets/css/chrome.css?v=<?= $chromeCssVer ?>" rel="stylesheet">
<link href="assets/css/dashboard.css?v=<?= $dashboardCssVer ?>" rel="stylesheet">
</head>
<body class="sidenav-dark">
<div class="layout">
<?php require __DIR__ . '/partials/sidebar.php'; ?>
  <main class="main">
<?php require __DIR__ . '/partials/header.php'; ?>

    <div id="dashboardView" class="view-section active">

     <?php $dashDots = '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>'; ?>

     <!-- Linha 1: visao geral (grafico de novas lojas/mes) + 4 KPIs principais -->
     <section class="dash-row">
      <div class="dash-card">
        <div class="dash-card-head">
          <div class="dash-card-title">Visão geral</div>
          <div class="dash-card-sort dash-pill">Últimos 12 meses</div>
        </div>
        <div class="dash-chart-wrap">
          <canvas id="chartVisaoGeral"></canvas>
        </div>
      </div>
      <div class="dash-kpis-2x2">
        <div class="stat-card">
          <div class="stat-card-head">
            <div class="stat-icon c-blue">
              <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M7 17v2h10v-2"/></svg>
            </div>
            <div class="stat-card-title">Lojas ativas</div>
            <span class="stat-dots"><?= $dashDots ?></span>
          </div>
          <div class="stat-value"><?= $totalAtivas ?></div>
          <div class="stat-extra">Ativas agora</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-head">
            <div class="stat-icon c-green">
              <svg viewBox="0 0 24 24"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div class="stat-card-title">Receita prevista/mês</div>
            <span class="stat-dots"><?= $dashDots ?></span>
          </div>
          <div class="stat-value">R$ <?= number_format($receitaMes, 2, ',', '.') ?></div>
          <div class="stat-extra">Soma dos planos ativos</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-head">
            <div class="stat-icon c-purple">
              <svg viewBox="0 0 24 24"><path d="M4 20V6"/><rect x="7" y="10" width="3" height="10"/><rect x="12" y="6" width="3" height="14"/><rect x="17" y="13" width="3" height="7"/></svg>
            </div>
            <div class="stat-card-title">Lojas em teste</div>
            <span class="stat-dots"><?= $dashDots ?></span>
          </div>
          <div class="stat-value"><?= $totalTrial ?></div>
          <div class="stat-extra">Período de teste</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-head">
            <div class="stat-icon c-orange">
              <svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M7 7v10"/><path d="M17 7v10"/><path d="M5 17h14"/><path d="M9 17v3"/><path d="M15 17v3"/></svg>
            </div>
            <div class="stat-card-title">Expiram em 7 dias</div>
            <span class="stat-dots"><?= $dashDots ?></span>
          </div>
          <div class="stat-value"><?= $expira7 ?></div>
          <div class="stat-extra">Vencem até 7 dias</div>
        </div>
      </div>
     </section>

     <!-- Linha 2: 2 KPIs restantes + donut "Lojas por status" -->
     <section class="dash-row dash-row-3">
      <div class="dash-kpis-2x2" style="grid-template-columns:1fr">
        <div class="stat-card">
          <div class="stat-card-head">
            <div class="stat-icon c-pink">
              <svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="4"/><path d="M17 11a3 3 0 100 6 3 3 0 000-6z"/><path d="M2 22c1.5-3 10.5-3 12 0"/><path d="M16 22c.5-2 5.5-2 6 0"/></svg>
            </div>
            <div class="stat-card-title">Expiradas</div>
            <span class="stat-dots"><?= $dashDots ?></span>
          </div>
          <div class="stat-value"><?= $expiradas ?></div>
          <div class="stat-extra">Lojas expiradas</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-head">
            <div class="stat-icon c-slate">
              <svg viewBox="0 0 24 24"><path d="M14 3v4a1 1 0 001 1h4"/><path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"/><path d="M9 13l2 2 4-4"/></svg>
            </div>
            <div class="stat-card-title">Comprovantes p/ revisar</div>
            <span class="stat-dots"><?= $dashDots ?></span>
          </div>
          <div class="stat-value"><?= $comprovantesPendentes ?></div>
          <div class="stat-extra">Aguardando aprovação</div>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-card-head">
          <div class="dash-card-title">Lojas por status</div>
        </div>
        <div class="dash-donut-wrap">
          <canvas id="chartStatusDonut"></canvas>
          <div class="dash-donut-center">
            <div class="num"><?= count($lojas) ?></div>
            <div class="lbl">Lojas</div>
          </div>
        </div>
        <div class="dash-donut-legend">
          <div class="dash-donut-legend-item"><span class="dot" style="background:#0ab39c"></span>Ativas<span class="val"><?= $totalAtivas ?></span></div>
          <div class="dash-donut-legend-item"><span class="dot" style="background:#f1963a"></span>Em teste<span class="val"><?= $totalTrial ?></span></div>
          <div class="dash-donut-legend-item"><span class="dot" style="background:#e63770"></span>Expiradas<span class="val"><?= $expiradas ?></span></div>
          <div class="dash-donut-legend-item"><span class="dot" style="background:#cbd5e1"></span>Outras<span class="val"><?= max(0, count($lojas) - $totalAtivas - $totalTrial - $expiradas) ?></span></div>
        </div>
      </div>
     </section>

     <!-- Linha 3: leads recentes + lojas em destaque -->
     <section class="dash-row dash-row-list">
      <div class="dash-card">
        <div class="dash-card-head">
          <div class="dash-card-title">Leads recentes</div>
          <div class="dash-card-sort">Últimos cadastros</div>
        </div>
        <div class="dash-list">
          <?php if (!$leads): ?>
            <div class="dash-list-empty">Nenhum lead recente.</div>
          <?php endif; ?>
          <?php foreach (array_slice($leads, 0, 4) as $lead): ?>
            <?php
              $leadNome = trim((string) ($lead['nome'] ?: ($lead['empresa'] ?? 'Lead')));
              $leadIniciais = dashIniciais($leadNome);
            ?>
            <div class="dash-list-item">
              <div class="dash-list-avatar"><?= htmlspecialchars($leadIniciais) ?></div>
              <div class="dash-list-info">
                <div class="dash-list-name"><?= htmlspecialchars($leadNome) ?></div>
                <div class="dash-list-sub"><?= htmlspecialchars((string) ($lead['email'] ?: ($lead['whatsapp'] ?? ''))) ?></div>
              </div>
              <span class="dash-list-extra"><?= !empty($lead['criado_em']) ? date('d/m', strtotime($lead['criado_em'])) : '-' ?></span>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-card-head">
          <div class="dash-card-title">Lojas em destaque</div>
          <div class="dash-card-sort">Maior receita</div>
        </div>
        <div class="dash-list">
          <?php
            $lojasDestaque = $lojas;
            usort($lojasDestaque, fn($a, $b) => (float) ($b['plano_valor'] ?? 0) <=> (float) ($a['plano_valor'] ?? 0));
            $lojasDestaque = array_slice($lojasDestaque, 0, 4);
          ?>
          <?php if (!$lojasDestaque): ?>
            <div class="dash-list-empty">Nenhuma loja cadastrada.</div>
          <?php endif; ?>
          <?php foreach ($lojasDestaque as $ld): ?>
            <?php
              $ldNome = trim((string) ($ld['nome'] ?? 'Loja'));
              $ldIniciais = dashIniciais($ldNome);
            ?>
            <div class="dash-list-item">
              <div class="dash-list-avatar"><?= htmlspecialchars($ldIniciais) ?></div>
              <div class="dash-list-info">
                <div class="dash-list-name"><?= htmlspecialchars($ldNome) ?></div>
                <div class="dash-list-sub"><?= htmlspecialchars((string) ($ld['plano_nome'] ?? 'Sem plano')) ?></div>
              </div>
              <span class="dash-list-extra">R$ <?= number_format((float) ($ld['plano_valor'] ?? 0), 2, ',', '.') ?></span>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
     </section>

     <!-- Linha 4: prazos de vencimento (real) + mapa decorativo (sem dado geografico real) -->
     <section class="dash-row dash-row-3">
      <div class="dash-card">
        <div class="dash-card-head">
          <div class="dash-card-title">Prazos de vencimento</div>
        </div>
        <div class="dash-chart-wrap" style="height:210px">
          <canvas id="chartExpira"></canvas>
        </div>
      </div>
      <div class="dash-card dash-map-card">
        <div class="dash-card-head">
          <div class="dash-card-title">Distribuição geográfica</div>
        </div>
        <div class="dash-map-placeholder">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="3"/><path d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z"/></svg>
          <span>Em breve — mapa de lojas por região</span>
        </div>
      </div>
     </section>

    <div class="dash-footer">
      <span>&copy; <?= date('Y') ?> LillyMenu — Painel do superadmin</span>
      
    </div>

    </div>

  </main>
</div>

<?php require __DIR__ . '/partials/modais_globais.php'; ?>

<script>
const LOJAS_CHART = <?= json_encode([
  'labelsMes'=>$labelsMes,'totaisMes'=>$totaisMes,
  'expira7'=>$expira7,'expira15'=>$expira15,'expira30'=>$expira30,'expiradas'=>$expiradas,
  'totalAtivas'=>$totalAtivas,'totalTrial'=>$totalTrial,
  'totalOutras'=>max(0, count($lojas) - $totalAtivas - $totalTrial - $expiradas),
]) ?>;
</script>
<script src="assets/js/chrome.js?v=<?= $chromeJsVer ?>"></script>
<script src="assets/js/dashboard.js?v=<?= $dashboardJsVer ?>"></script>
</body>
</html>

