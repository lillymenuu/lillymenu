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
$lojaNome = config($conn, 'nome_loja', 'Will Delivery');
$_SESSION['loja_nome'] = $lojaNome;
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$finCssVer = filemtime(__DIR__ . '/assets/css/financial_module.css');
$finJsVer = filemtime(__DIR__ . '/assets/js/financial_module.js');
$financeiroDreCssVer = filemtime(__DIR__ . '/assets/css/financeiro_dre.css');
$financeiroDreJsVer = filemtime(__DIR__ . '/assets/js/financeiro_dre.js');
$ano = (int) ($_GET['ano'] ?? financialCurrentYear());
$anos = financialYearOptions($conn, $tenantId);
if (!in_array($ano, $anos, true)) {
  $anos[] = $ano;
  rsort($anos);
}
$report = new FinancialReportController();

$rows = [];
for ($m = 1; $m <= 12; $m++) {
  $rows[$m] = $report->monthlySummary($conn, $tenantId, ['reference_month' => $m, 'reference_year' => $ano]);
}
$dreTableHtml = financialRenderDreTable($rows, $ano);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Financeiro - DRE</title>
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
  <link href="./assets/css/financeiro_dre.css?v=<?= $financeiroDreCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy fin-body">
<?php include __DIR__ . '/partials/sidebar.php'; ?>
<div class="fin-page">
  <div id="fin-toast-host" class="fin-toast-host"></div>
  <div class="fin-header">
    <div><h1 class="fin-title">DRE</h1><div class="fin-subtitle">Demonstrativo de resultado do exercicio organizado por mês.</div></div>
    <form method="get" class="fin-actions" id="financial-dre-filter-form">
      <div class="field"><label>Ano</label><select class="fin-select" name="ano"><?php foreach ($anos as $itemAno): ?><option value="<?= (int) $itemAno ?>" <?= (int) $itemAno === $ano ? 'selected' : '' ?>><?= (int) $itemAno ?></option><?php endforeach; ?></select></div>
    </form>
  </div>
  <div class="fin-card">
    <div class="fin-card-head"><div><h2 class="fin-card-title">Tabela DRE</h2><div class="fin-card-subtitle">Receita bruta, despesas, lucro liquido e margem por competencia.</div></div></div>
    <div class="fin-card-body" id="financial-dre-table"><?= $dreTableHtml ?></div>
  </div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>
</main>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/financial_module.js?v=<?= $finJsVer ?>"></script>
<script src="./assets/js/financeiro_dre.js?v=<?= $financeiroDreJsVer ?>"></script>
</body>
</html>
