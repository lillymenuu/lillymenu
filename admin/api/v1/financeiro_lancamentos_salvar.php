<?php
/*
 * Versao JSON (Bearer token) de admin/api/financial_transactions.php
 * (acao "save") — cria ou atualiza um lancamento financeiro. Reaproveita
 * FinancialTransactionController::store()/update(), que ja validam
 * (FinancialTransactionRequest) e cuidam do impacto no saldo da conta
 * (FinancialAccount::applyImpact/reverseImpact) — nada disso e duplicado
 * aqui.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/financial_module.php';
require_once __DIR__ . '/../../../controllers/FinancialTransactionController.php';

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
$controller = new FinancialTransactionController();

try {
  if ($id > 0) {
    $item = $controller->update($conn, $tenantId, $id, $body);
    $msg = 'Lançamento atualizado com sucesso.';
  } else {
    $item = $controller->store($conn, $tenantId, $body);
    $msg = 'Lançamento criado com sucesso.';
  }
  echo json_encode(['ok' => true, 'msg' => $msg, 'item' => $item], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Dados inválidos.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
