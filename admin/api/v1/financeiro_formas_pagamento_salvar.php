<?php
/*
 * Versao JSON (Bearer token) de admin/financeiro_formas_pagamento.php
 * (acao "save") — cria ou atualiza uma forma de pagamento. Reaproveita
 * PaymentMethodController::store()/update(), que ja validam
 * (PaymentMethodRequest) — nada disso e duplicado aqui.
 *
 * Mesmo padrao de financeiro_contas_salvar.php: junta as mensagens de
 * RequestValidationException::errors() em vez do generico "Dados
 * invalidos." do legado.
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
$controller = new PaymentMethodController();

try {
  if ($id > 0) {
    $item = $controller->update($conn, $tenantId, $id, $body);
    $msg = 'Forma de pagamento atualizada com sucesso.';
  } else {
    $item = $controller->store($conn, $tenantId, $body);
    $msg = 'Forma de pagamento criada com sucesso.';
  }
  echo json_encode([
    'ok' => true,
    'msg' => $msg,
    'item' => [
      'id' => (int) $item['id'],
      'name' => $item['name'],
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
