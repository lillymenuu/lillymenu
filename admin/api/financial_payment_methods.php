<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/financial_module.php';
require_once __DIR__ . '/../helpers/financial_views.php';
require_once __DIR__ . '/../../controllers/PaymentMethodController.php';

header('Content-Type: application/json; charset=utf-8');

function financialMethodsJson(array $payload, int $status = 200): void
{
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

financialEnsureModule($conn);
$tenantId = financialTenantId();
$controller = new PaymentMethodController();

try {
  $action = (string) ($_REQUEST['action'] ?? 'list');

  if ($action === 'get') {
    $item = $controller->show($conn, $tenantId, (int) ($_GET['id'] ?? 0));
    if (!$item) {
      financialMethodsJson(['ok' => false, 'msg' => 'Forma de pagamento nao encontrada.'], 404);
    }
    financialMethodsJson(['ok' => true, 'item' => $item]);
  }

  if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int) ($_POST['id'] ?? 0);
    $item = $id > 0
      ? $controller->update($conn, $tenantId, $id, $_POST)
      : $controller->store($conn, $tenantId, $_POST);
    $items = $controller->index($conn, $tenantId, ['active' => 0]);
    financialMethodsJson([
      'ok' => true,
      'msg' => $id > 0 ? 'Forma de pagamento atualizada com sucesso.' : 'Forma de pagamento criada com sucesso.',
      'item' => $item,
      'table_html' => financialRenderPaymentMethodsTable($items),
    ]);
  }

  if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller->destroy($conn, $tenantId, (int) ($_POST['id'] ?? 0));
    $items = $controller->index($conn, $tenantId, ['active' => 0]);
    financialMethodsJson([
      'ok' => true,
      'msg' => 'Forma de pagamento removida com sucesso.',
      'table_html' => financialRenderPaymentMethodsTable($items),
    ]);
  }

  $items = $controller->index($conn, $tenantId, ['active' => 0]);
  financialMethodsJson([
    'ok' => true,
    'table_html' => financialRenderPaymentMethodsTable($items),
  ]);
} catch (Throwable $e) {
  financialMethodsJson(['ok' => false, 'msg' => $e->getMessage()], 422);
}
