<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/financial_module.php';
require_once __DIR__ . '/../helpers/financial_views.php';
require_once __DIR__ . '/../../controllers/FinancialCategoryController.php';

header('Content-Type: application/json; charset=utf-8');

function financialCategoriesJson(array $payload, int $status = 200): void
{
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

financialEnsureModule($conn);
$tenantId = financialTenantId();
$controller = new FinancialCategoryController();

try {
  $action = (string) ($_REQUEST['action'] ?? 'list');

  if ($action === 'get') {
    $id = (int) ($_GET['id'] ?? 0);
    $item = $controller->show($conn, $tenantId, $id);
    if (!$item) {
      financialCategoriesJson(['ok' => false, 'msg' => 'Categoria nao encontrada.'], 404);
    }
    $roots = FinancialCategory::roots($conn, $tenantId, $item['type'] ?? null, false);
    financialCategoriesJson([
      'ok' => true,
      'item' => $item,
      'root_options_html' => financialRenderCategoryParentOptions($roots, (int) ($item['parent_id'] ?? 0), (int) $id),
    ]);
  }

  if ($action === 'root-options') {
    $type = (string) ($_GET['type'] ?? '');
    $excludeId = (int) ($_GET['exclude_id'] ?? 0);
    $selectedId = (int) ($_GET['selected_id'] ?? 0);
    $roots = FinancialCategory::roots($conn, $tenantId, $type ?: null, false);
    financialCategoriesJson([
      'ok' => true,
      'root_options_html' => financialRenderCategoryParentOptions($roots, $selectedId, $excludeId),
    ]);
  }

  if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int) ($_POST['id'] ?? 0);
    $item = $id > 0
      ? $controller->update($conn, $tenantId, $id, $_POST)
      : $controller->store($conn, $tenantId, $_POST);

    $typeFilter = trim((string) ($_POST['type_filter'] ?? ''));
    $items = $controller->index($conn, $tenantId, ['type' => $typeFilter ?: null, 'active' => 0]);
    $roots = FinancialCategory::roots($conn, $tenantId, $item['type'] ?? null, false);

    financialCategoriesJson([
      'ok' => true,
      'msg' => $id > 0 ? 'Categoria atualizada com sucesso.' : 'Categoria cadastrada com sucesso.',
      'item' => $item,
      'table_html' => financialRenderCategoriesTable($conn, $tenantId, $items),
      'root_options_html' => financialRenderCategoryParentOptions($roots, (int) ($item['parent_id'] ?? 0), (int) ($item['id'] ?? 0)),
    ]);
  }

  if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int) ($_POST['id'] ?? 0);
    $controller->destroy($conn, $tenantId, $id);
    $typeFilter = trim((string) ($_POST['type_filter'] ?? ''));
    $items = $controller->index($conn, $tenantId, ['type' => $typeFilter ?: null, 'active' => 0]);
    $roots = FinancialCategory::roots($conn, $tenantId, null, false);

    financialCategoriesJson([
      'ok' => true,
      'msg' => 'Categoria removida com sucesso.',
      'table_html' => financialRenderCategoriesTable($conn, $tenantId, $items),
      'root_options_html' => financialRenderCategoryParentOptions($roots),
    ]);
  }

  $typeFilter = trim((string) ($_GET['type'] ?? ''));
  $items = $controller->index($conn, $tenantId, ['type' => $typeFilter ?: null, 'active' => 0]);
  financialCategoriesJson([
    'ok' => true,
    'table_html' => financialRenderCategoriesTable($conn, $tenantId, $items),
  ]);
} catch (Throwable $e) {
  financialCategoriesJson(['ok' => false, 'msg' => $e->getMessage()], 422);
}
