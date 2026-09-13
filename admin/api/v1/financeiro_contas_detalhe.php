<?php
/*
 * Versao JSON de admin/financeiro_contas.php para o novo frontend Next.js
 * (/financialaccounts), trocando sessao por token Bearer.
 *
 * Reaproveita FinancialAccountController::index() sem duplicar regra de
 * negocio. active=0 no filtro sinaliza onlyActive=false — mesma
 * convencao do legado (a lista mostra contas ativas e inativas).
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

$controller = new FinancialAccountController();
$contas = $controller->index($conn, $tenantId, ['active' => 0]);

$lista = array_map(function ($c) {
  return [
    'id' => (int) $c['id'],
    'name' => $c['name'],
    'initial_balance' => (float) $c['initial_balance'],
    'current_balance' => (float) $c['current_balance'],
    'active' => (int) $c['active'] === 1,
  ];
}, $contas);

echo json_encode([
  'ok' => true,
  'contas' => $lista,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
