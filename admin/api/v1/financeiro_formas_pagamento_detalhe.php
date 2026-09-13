<?php
/*
 * Versao JSON de admin/financeiro_formas_pagamento.php para o novo
 * frontend Next.js (/financialpaymentmethods), trocando sessao por token
 * Bearer.
 *
 * Reaproveita PaymentMethodController::index() sem duplicar regra de
 * negocio. active=0 no filtro sinaliza onlyActive=false — mesma
 * convencao do legado (a lista mostra formas ativas e inativas).
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

$controller = new PaymentMethodController();
$formas = $controller->index($conn, $tenantId, ['active' => 0]);

$lista = array_map(function ($f) {
  return [
    'id' => (int) $f['id'],
    'name' => $f['name'],
    'active' => (int) $f['active'] === 1,
  ];
}, $formas);

echo json_encode([
  'ok' => true,
  'formas_pagamento' => $lista,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
