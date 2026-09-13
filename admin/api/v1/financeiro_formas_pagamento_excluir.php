<?php
/*
 * Versao JSON (Bearer token) de admin/financeiro_formas_pagamento.php
 * (acao "delete") — exclui uma forma de pagamento.
 *
 * Ao contrario de contas/categorias, a FK
 * fk_financial_transactions_payment_method e ON DELETE SET NULL (nao
 * RESTRICT) — excluir uma forma de pagamento com lancamentos vinculados
 * sempre funciona, so zera payment_method_id nesses lancamentos. Por
 * isso nao ha tratamento especial de erro de FK aqui, diferente de
 * financeiro_contas_excluir.php/financeiro_categorias_excluir.php.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/financial_module.php';
require_once __DIR__ . '/../../../controllers/PaymentMethodController.php';

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
  echo json_encode(['ok' => false, 'msg' => 'Forma de pagamento inválida.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$controller = new PaymentMethodController();

try {
  $controller->destroy($conn, $tenantId, $id);
  echo json_encode(['ok' => true, 'msg' => 'Forma de pagamento excluída com sucesso.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Erro ao excluir forma de pagamento.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
