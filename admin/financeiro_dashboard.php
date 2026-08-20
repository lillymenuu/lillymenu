<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.financeiro');
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/financial_module.php';
require_once __DIR__ . '/helpers/financial_views.php';
require_once __DIR__ . '/../controllers/FinancialReportController.php';

financialEnsureModule($conn);
$tenantId = financialTenantId();
$flash = financialFlashGet();
$lojaNome = config($conn, 'nome_loja', 'Will Delivery');
$_SESSION['loja_nome'] = $lojaNome;
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$finCssVer = filemtime(__DIR__ . '/assets/css/financial_module.css');
$finJsVer = filemtime(__DIR__ . '/assets/js/financial_module.js');
$financeiroDashboardCssVer = filemtime(__DIR__ . '/assets/css/financeiro_dashboard.css');
$financeiroDashboardJsVer = filemtime(__DIR__ . '/assets/js/financeiro_dashboard.js');

$mes = (int) ($_GET['mes'] ?? financialCurrentMonth());
$ano = (int) ($_GET['ano'] ?? financialCurrentYear());
$mes = max(1, min(12, $mes));
financialSyncCurrentMonthSalesIfNeeded($conn, $tenantId, $mes, $ano);
$anos = financialYearOptions($conn, $tenantId);
if (!in_array($ano, $anos, true)) {
  $anos[] = $ano;
  rsort($anos);
}

$report = new FinancialReportController();
$resumoMensal = $report->monthlySummary($conn, $tenantId, ['reference_month' => $mes, 'reference_year' => $ano]);
$dashboard = $report->dashboard($conn, $tenantId, ['reference_month' => $mes, 'reference_year' => $ano]);
$dre = $report->dre($conn, $tenantId, ['reference_month' => $mes, 'reference_year' => $ano]);
$dashboardHtml = financialRenderDashboardContent($resumoMensal, $dashboard, $dre);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Financeiro - Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
  <link href="./assets/css/financial_module.css?v=<?= $finCssVer ?>" rel="stylesheet">
  <link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
  <link href="./assets/css/financeiro_dashboard.css?v=<?= $financeiroDashboardCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy fin-body">
<?php include __DIR__ . '/partials/sidebar.php'; ?>
<div class="fin-page">
  <div id="fin-toast-host" class="fin-toast-host"></div>
  <div class="fin-header">
    <div>
      <h1 class="fin-title">Dashboard financeiro</h1>
      <div class="fin-subtitle">Visao consolidada das receitas, despesas e resultado da sua loja.</div>
    </div>
    <form class="fin-actions" method="get" id="financial-dashboard-filter-form">
      <div class="field">
        <label>Mês</label>
        <select name="mes" class="fin-select">
          <?php for ($m = 1; $m <= 12; $m++): ?>
            <option value="<?= $m ?>" <?= $m === $mes ? 'selected' : '' ?>><?= financialMonthLabel($m) ?></option>
          <?php endfor; ?>
        </select>
      </div>
      <div class="field">
        <label>Ano</label>
        <select name="ano" class="fin-select">
          <?php foreach ($anos as $itemAno): ?>
            <option value="<?= (int) $itemAno ?>" <?= (int) $itemAno === $ano ? 'selected' : '' ?>><?= (int) $itemAno ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </form>
  </div>

  <?php if ($flash): ?>
    <div class="fin-toast <?= !empty($flash['ok']) ? 'fin-toast-success' : 'fin-toast-error' ?>">
      <i class="bi <?= !empty($flash['ok']) ? 'bi-check-circle' : 'bi-exclamation-triangle' ?>"></i>
      <span><?= htmlspecialchars((string) ($flash['msg'] ?? '')) ?></span>
    </div>
  <?php endif; ?>

  <div id="financial-dashboard-content"><?= $dashboardHtml ?></div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>
</main>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/financial_module.js?v=<?= $finJsVer ?>"></script>
<script src="./assets/js/financeiro_dashboard.js?v=<?= $financeiroDashboardJsVer ?>"></script>
</body>
</html>
