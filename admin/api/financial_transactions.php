<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/financial_module.php';
require_once __DIR__ . '/../helpers/financial_views.php';
require_once __DIR__ . '/../../controllers/FinancialTransactionController.php';

header('Content-Type: application/json; charset=utf-8');

function financialTransactionsJson(array $payload, int $status = 200): void
{
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

financialEnsureModule($conn);
$tenantId = financialTenantId();
$controller = new FinancialTransactionController();

try {
  $action = (string) ($_REQUEST['action'] ?? 'list');

  $mes = (int) ($_REQUEST['mes'] ?? financialCurrentMonth());
  $ano = (int) ($_REQUEST['ano'] ?? financialCurrentYear());
  $tipo = trim((string) ($_REQUEST['tipo'] ?? ''));
  $categoriaId = (int) ($_REQUEST['categoria_id'] ?? 0);
  $contaId = (int) ($_REQUEST['conta_id'] ?? 0);
  $page = max(1, (int) ($_REQUEST['page'] ?? 1));
  financialSyncCurrentMonthSalesIfNeeded($conn, $tenantId, $mes, $ano);
  $filters = array_filter([
    'reference_month' => $mes,
    'reference_year' => $ano,
    'type' => $tipo ?: null,
    'category_id' => $categoriaId ?: null,
    'account_id' => $contaId ?: null,
  ], static function ($value) {
    return $value !== null && $value !== '';
  });
  $query = [
    'mes' => $mes,
    'ano' => $ano,
    'tipo' => $tipo,
    'categoria_id' => $categoriaId,
    'conta_id' => $contaId,
    'page' => $page,
  ];

  if ($action === 'get') {
    $item = $controller->show($conn, $tenantId, (int) ($_GET['id'] ?? 0));
    if (!$item) {
      financialTransactionsJson(['ok' => false, 'msg' => 'Lancamento nao encontrado.'], 404);
    }
    financialTransactionsJson(['ok' => true, 'item' => $item]);
  }

  if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int) ($_POST['id'] ?? 0);
    $item = $id > 0
      ? $controller->update($conn, $tenantId, $id, $_POST)
      : $controller->store($conn, $tenantId, $_POST);
    $items = $controller->index($conn, $tenantId, $filters);
    financialTransactionsJson([
      'ok' => true,
      'msg' => $id > 0 ? 'Lancamento atualizado com sucesso.' : 'Lancamento criado com sucesso.',
      'item' => $item,
      'table_html' => financialRenderTransactionsTable($conn, $tenantId, $items, $query, 1, 5),
    ]);
  }

  if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller->destroy($conn, $tenantId, (int) ($_POST['id'] ?? 0));
    $items = $controller->index($conn, $tenantId, $filters);
    financialTransactionsJson([
      'ok' => true,
      'msg' => 'Lancamento excluido com sucesso.',
      'table_html' => financialRenderTransactionsTable($conn, $tenantId, $items, $query, $page, 5),
    ]);
  }

  $items = $controller->index($conn, $tenantId, $filters);
  financialTransactionsJson([
    'ok' => true,
    'table_html' => financialRenderTransactionsTable($conn, $tenantId, $items, $query, $page, 5),
  ]);
} catch (Throwable $e) {
  financialTransactionsJson(['ok' => false, 'msg' => $e->getMessage()], 422);
}
