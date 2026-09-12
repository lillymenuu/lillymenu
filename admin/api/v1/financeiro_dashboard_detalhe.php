<?php
/*
 * Versao JSON de admin/financeiro_dashboard.php para o novo frontend
 * Next.js (/financialdashboard), trocando sessao por token Bearer.
 *
 * O legado renderiza o dashboard como HTML pronto no servidor
 * (financialRenderDashboardContent) e o JS so troca innerHTML; aqui devolvemos
 * os dados brutos (resumo mensal, contas, receita por forma de pagamento,
 * despesa por categoria, DRE do mes) pra o React montar a tela.
 *
 * financialTenantId() (em financial_module.php) le $_SESSION['loja_id'] —
 * por isso setamos a sessao a partir do Bearer token antes de chamar
 * qualquer helper financeiro, mesmo padrao ja usado nos outros endpoints v1.
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
$filtros = ['reference_month' => $mes, 'reference_year' => $ano];
$resumoMensal = $report->monthlySummary($conn, $tenantId, $filtros);
$dashboard = $report->dashboard($conn, $tenantId, $filtros);
$dre = $report->dre($conn, $tenantId, $filtros);

echo json_encode([
  'ok' => true,
  'mes' => $mes,
  'ano' => $ano,
  'anos' => array_values(array_map('intval', $anos)),
  'resumo_mensal' => $resumoMensal,
  'dashboard' => $dashboard,
  'dre' => $dre,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
