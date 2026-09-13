<?php
/*
 * Versao JSON de admin/financeiro_categorias.php para o novo frontend
 * Next.js (/financialcategories), trocando sessao por token Bearer.
 *
 * Reaproveita FinancialCategoryController::index() sem duplicar regra de
 * negocio — so devolve JSON em vez de HTML pronto. Ao contrario do legado
 * (que pagina a lista em PHP), devolve a lista inteira: categorias
 * financeiras normalmente sao poucas dezenas no maximo, entao paginacao
 * so adicionaria complexidade sem necessidade real.
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

$tipo = trim((string) ($_GET['tipo'] ?? ''));
if ($tipo !== 'income' && $tipo !== 'expense') {
  $tipo = '';
}

$controller = new FinancialCategoryController();
// active=0 no filtro sinaliza onlyActive=false no controller (mesmo
// comportamento do admin legado: a lista mostra ativas e inativas).
$categorias = $controller->index($conn, $tenantId, ['type' => $tipo ?: null, 'active' => 0]);

$nomesPorId = [];
foreach ($categorias as $c) {
  $nomesPorId[(int) $c['id']] = $c['name'];
}

$lista = array_map(function ($c) use ($nomesPorId) {
  $parentId = $c['parent_id'] !== null ? (int) $c['parent_id'] : null;
  return [
    'id' => (int) $c['id'],
    'name' => $c['name'],
    'type' => $c['type'],
    'parent_id' => $parentId,
    'parent_name' => $parentId !== null ? ($nomesPorId[$parentId] ?? null) : null,
    'active' => (int) $c['active'] === 1,
  ];
}, $categorias);

echo json_encode([
  'ok' => true,
  'tipo' => $tipo,
  'categorias' => $lista,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
