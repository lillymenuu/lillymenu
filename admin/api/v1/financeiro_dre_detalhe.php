<?php
/*
 * Versao JSON de admin/financeiro_dre.php para o novo frontend Next.js
 * (/financialdre), trocando sessao por token Bearer.
 *
 * O legado monta a tabela DRE chamando FinancialReportController::monthlySummary()
 * 12 vezes (uma por mes do ano filtrado) e renderiza HTML pronto
 * (financialRenderDreTable). Aqui devolvemos os mesmos 12 resultados crus em
 * JSON pra o React montar a tabela — reaproveitando monthlySummary() sem
 * duplicar nenhuma logica de agregacao.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/financial_module.php';
require_once __DIR__ . '/../../../controllers/FinancialReportController.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['admin_perfil'] = $auth['perfil'];
$_SESSION['loja_id'] = $lojaId;

financialEnsureModule($conn);
$tenantId = financialTenantId();

$ano = (int) ($_GET['ano'] ?? financialCurrentYear());

$anos = financialYearOptions($conn, $tenantId);
if (!in_array($ano, $anos, true)) {
  $anos[] = $ano;
  rsort($anos);
}

$report = new FinancialReportController();

$meses = [];
for ($m = 1; $m <= 12; $m++) {
  $meses[$m] = $report->monthlySummary($conn, $tenantId, ['reference_month' => $m, 'reference_year' => $ano]);
}

echo json_encode([
  'ok' => true,
  'ano' => $ano,
  'anos' => array_values(array_map('intval', $anos)),
  'meses' => $meses,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
