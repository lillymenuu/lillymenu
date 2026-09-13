<?php
/*
 * Versao JSON (Bearer token) de admin/api/financial_transactions.php
 * (acao "delete") — exclui um lancamento e reverte o impacto no saldo da
 * conta (FinancialAccount::reverseImpact, dentro de
 * FinancialTransaction::delete).
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
if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Lançamento inválido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$controller = new FinancialTransactionController();

try {
  $controller->destroy($conn, $tenantId, $id);
  echo json_encode(['ok' => true, 'msg' => 'Lançamento excluído com sucesso.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Erro ao excluir lançamento.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
