<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/financial_module.php';
require_once __DIR__ . '/../helpers/financial_views.php';
require_once __DIR__ . '/../../controllers/FinancialAccountController.php';

header('Content-Type: application/json; charset=utf-8');

function financialAccountsJson(array $payload, int $status = 200): void
{
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

financialEnsureModule($conn);
$tenantId = financialTenantId();
$controller = new FinancialAccountController();

try {
  $action = (string) ($_REQUEST['action'] ?? 'list');

  if ($action === 'get') {
    $item = $controller->show($conn, $tenantId, (int) ($_GET['id'] ?? 0));
    if (!$item) {
      financialAccountsJson(['ok' => false, 'msg' => 'Conta nao encontrada.'], 404);
    }
    financialAccountsJson(['ok' => true, 'item' => $item]);
  }

  if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int) ($_POST['id'] ?? 0);
    $item = $id > 0
      ? $controller->update($conn, $tenantId, $id, $_POST)
      : $controller->store($conn, $tenantId, $_POST);
    $items = $controller->index($conn, $tenantId, ['active' => 0]);
    financialAccountsJson([
      'ok' => true,
      'msg' => $id > 0 ? 'Conta atualizada com sucesso.' : 'Conta criada com sucesso.',
      'item' => $item,
      'table_html' => financialRenderAccountsTable($items, $conn, $tenantId),
    ]);
  }

  if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller->destroy($conn, $tenantId, (int) ($_POST['id'] ?? 0));
    $items = $controller->index($conn, $tenantId, ['active' => 0]);
    financialAccountsJson([
      'ok' => true,
      'msg' => 'Conta removida com sucesso.',
      'table_html' => financialRenderAccountsTable($items, $conn, $tenantId),
    ]);
  }

  $items = $controller->index($conn, $tenantId, ['active' => 0]);
  financialAccountsJson([
    'ok' => true,
    'table_html' => financialRenderAccountsTable($items, $conn, $tenantId),
  ]);
} catch (Throwable $e) {
  financialAccountsJson(['ok' => false, 'msg' => $e->getMessage()], 422);
}
