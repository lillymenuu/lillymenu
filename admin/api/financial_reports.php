<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/financial_module.php';
require_once __DIR__ . '/../helpers/financial_views.php';
require_once __DIR__ . '/../../controllers/FinancialReportController.php';

header('Content-Type: application/json; charset=utf-8');

function financialReportsJson(array $payload, int $status = 200): void
{
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

financialEnsureModule($conn);
$tenantId = financialTenantId();
$controller = new FinancialReportController();

try {
  $action = (string) ($_GET['action'] ?? 'dashboard');

  if ($action === 'dre') {
    $ano = (int) ($_GET['ano'] ?? financialCurrentYear());
    $rows = [];
    for ($m = 1; $m <= 12; $m++) {
      $rows[$m] = $controller->monthlySummary($conn, $tenantId, ['reference_month' => $m, 'reference_year' => $ano]);
    }
    financialReportsJson([
      'ok' => true,
      'table_html' => financialRenderDreTable($rows, $ano),
    ]);
  }

  $mes = max(1, min(12, (int) ($_GET['mes'] ?? financialCurrentMonth())));
  $ano = (int) ($_GET['ano'] ?? financialCurrentYear());
  financialSyncCurrentMonthSalesIfNeeded($conn, $tenantId, $mes, $ano);
  $resumoMensal = $controller->monthlySummary($conn, $tenantId, ['reference_month' => $mes, 'reference_year' => $ano]);
  $dashboard = $controller->dashboard($conn, $tenantId, ['reference_month' => $mes, 'reference_year' => $ano]);
  $dre = $controller->dre($conn, $tenantId, ['reference_month' => $mes, 'reference_year' => $ano]);

  financialReportsJson([
    'ok' => true,
    'content_html' => financialRenderDashboardContent($resumoMensal, $dashboard, $dre),
  ]);
} catch (Throwable $e) {
  financialReportsJson(['ok' => false, 'msg' => $e->getMessage()], 422);
}
