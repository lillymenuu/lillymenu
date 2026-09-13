<?php
/*
 * Versao JSON (Bearer token) de admin/financeiro_contas.php (acao "save")
 * — cria ou atualiza uma conta financeira. Reaproveita
 * FinancialAccountController::store()/update(), que ja validam
 * (FinancialAccountRequest) — nada disso e duplicado aqui.
 *
 * Assim como em financeiro_categorias_salvar.php, juntamos as mensagens
 * de RequestValidationException::errors() em vez de devolver so o
 * generico "Dados invalidos." do legado.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/financial_module.php';
require_once __DIR__ . '/../../../controllers/FinancialAccountController.php';

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
$controller = new FinancialAccountController();

try {
  if ($id > 0) {
    $item = $controller->update($conn, $tenantId, $id, $body);
    $msg = 'Conta atualizada com sucesso.';
  } else {
    $item = $controller->store($conn, $tenantId, $body);
    $msg = 'Conta criada com sucesso.';
  }
  echo json_encode([
    'ok' => true,
    'msg' => $msg,
    'item' => [
      'id' => (int) $item['id'],
      'name' => $item['name'],
      'initial_balance' => (float) $item['initial_balance'],
      'current_balance' => (float) $item['current_balance'],
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
