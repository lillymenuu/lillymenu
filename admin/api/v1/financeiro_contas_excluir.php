<?php
/*
 * Versao JSON (Bearer token) de admin/financeiro_contas.php (acao
 * "delete") — exclui uma conta financeira.
 *
 * A FK fk_financial_transactions_account e ON DELETE RESTRICT: excluir
 * uma conta com lancamentos vinculados sempre falhava no legado com o
 * erro cru do driver (SQLSTATE 23000/1451). Aqui capturamos esse caso
 * especifico pra devolver uma mensagem amigavel, sem mudar o
 * comportamento (ainda bloqueia a exclusao, so troca a mensagem) — mesmo
 * padrao de financeiro_categorias_excluir.php.
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
if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Conta inválida.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$controller = new FinancialAccountController();

try {
  $controller->destroy($conn, $tenantId, $id);
  echo json_encode(['ok' => true, 'msg' => 'Conta excluída com sucesso.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (PDOException $e) {
  http_response_code(422);
  if ((int) $e->getCode() === 23000) {
    $msg = 'Não é possível excluir: existem lançamentos vinculados a esta conta.';
  } else {
    $msg = 'Erro ao excluir conta.';
  }
  echo json_encode(['ok' => false, 'msg' => $msg], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Erro ao excluir conta.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
