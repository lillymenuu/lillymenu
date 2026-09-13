<?php
/*
 * Versao JSON (Bearer token) de admin/financeiro_categorias.php (acao
 * "delete") — exclui uma categoria financeira.
 *
 * A FK fk_financial_transactions_category e ON DELETE RESTRICT: excluir
 * uma categoria com lancamentos vinculados sempre falhava no legado com
 * o erro cru do driver (SQLSTATE 23000/1451). Aqui capturamos esse caso
 * especifico pra devolver uma mensagem amigavel, sem mudar o
 * comportamento (ainda bloqueia a exclusao, so troca a mensagem).
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
if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Categoria inválida.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$controller = new FinancialCategoryController();

try {
  $controller->destroy($conn, $tenantId, $id);
  echo json_encode(['ok' => true, 'msg' => 'Categoria excluída com sucesso.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (PDOException $e) {
  http_response_code(422);
  if ((int) $e->getCode() === 23000) {
    $msg = 'Não é possível excluir: existem lançamentos vinculados a esta categoria.';
  } else {
    $msg = 'Erro ao excluir categoria.';
  }
  echo json_encode(['ok' => false, 'msg' => $msg], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Erro ao excluir categoria.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
