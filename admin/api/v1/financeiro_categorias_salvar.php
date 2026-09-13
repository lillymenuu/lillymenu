<?php
/*
 * Versao JSON (Bearer token) de admin/financeiro_categorias.php (acao
 * "save"/"save_parent") — cria ou atualiza uma categoria financeira.
 * Reaproveita FinancialCategoryController::store()/update(), que ja
 * validam (FinancialCategoryRequest) — nada disso e duplicado aqui.
 *
 * Diferente do legado (que so devolve a mensagem generica "Dados
 * invalidos." em qualquer falha de validacao, sem detalhar o campo),
 * aqui juntamos as mensagens de RequestValidationException::errors()
 * pra dar um retorno mais util ao usuario (ex.: "categoria pai deve ter
 * o mesmo tipo", "ja existe uma categoria com esse nome e tipo").
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/financial_module.php';
require_once __DIR__ . '/../../../controllers/FinancialCategoryController.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['admin_perfil'] = $auth['perfil'];
$_SESSION['loja_id'] = $lojaId;

financialEnsureModule($conn);
$tenantId = financialTenantId();

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
  $body = [];
}

$id = (int) ($body['id'] ?? 0);
$controller = new FinancialCategoryController();

try {
  if ($id > 0) {
    $item = $controller->update($conn, $tenantId, $id, $body);
    $msg = 'Categoria atualizada com sucesso.';
  } else {
    $item = $controller->store($conn, $tenantId, $body);
    $msg = 'Categoria criada com sucesso.';
  }
  echo json_encode([
    'ok' => true,
    'msg' => $msg,
    'item' => [
      'id' => (int) $item['id'],
      'name' => $item['name'],
      'type' => $item['type'],
      'parent_id' => $item['parent_id'] !== null ? (int) $item['parent_id'] : null,
      'active' => (int) $item['active'] === 1,
    ],
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (RequestValidationException $e) {
  http_response_code(422);
  $mensagem = implode(' ', array_values($e->errors())) ?: 'Dados inválidos.';
  echo json_encode(['ok' => false, 'msg' => $mensagem], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Dados inválidos.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
