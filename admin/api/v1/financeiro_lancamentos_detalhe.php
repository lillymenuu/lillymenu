<?php
/*
 * Versao JSON de admin/financeiro_lancamentos.php para o novo frontend
 * Next.js (/financialtransactions), trocando sessao por token Bearer.
 *
 * Reaproveita os mesmos controllers/models/services do legado
 * (FinancialTransactionController, FinancialCategoryController,
 * FinancialAccountController, PaymentMethodController) sem duplicar
 * validacao ou regra de negocio — so devolve JSON em vez de HTML pronto.
 *
 * A paginacao do legado e feita 100% em PHP sobre a lista ja filtrada (sem
 * LIMIT/OFFSET no SQL) — replicado aqui exatamente igual, inclusive o
 * per_page fixo em 5.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/financial_module.php';
require_once __DIR__ . '/../../../controllers/FinancialTransactionController.php';
require_once __DIR__ . '/../../../controllers/FinancialCategoryController.php';
require_once __DIR__ . '/../../../controllers/FinancialAccountController.php';
require_once __DIR__ . '/../../../controllers/PaymentMethodController.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['admin_perfil'] = $auth['perfil'];
$_SESSION['loja_id'] = $lojaId;

financialEnsureModule($conn);
$tenantId = financialTenantId();

$mes = (int) ($_GET['mes'] ?? financialCurrentMonth());
$ano = (int) ($_GET['ano'] ?? financialCurrentYear());
$mes = max(1, min(12, $mes));
$tipo = trim((string) ($_GET['tipo'] ?? ''));
$categoriaId = (int) ($_GET['categoria_id'] ?? 0);
$contaId = (int) ($_GET['conta_id'] ?? 0);
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 5;

financialSyncCurrentMonthSalesIfNeeded($conn, $tenantId, $mes, $ano);

$anos = financialYearOptions($conn, $tenantId);
if (!in_array($ano, $anos, true)) {
  $anos[] = $ano;
  rsort($anos);
}

$filters = array_filter([
  'reference_month' => $mes,
  'reference_year' => $ano,
  'type' => $tipo !== '' ? $tipo : null,
  'category_id' => $categoriaId > 0 ? $categoriaId : null,
  'account_id' => $contaId > 0 ? $contaId : null,
]);

$categoryController = new FinancialCategoryController();
$accountController = new FinancialAccountController();
$methodController = new PaymentMethodController();
$transactionController = new FinancialTransactionController();

$categorias = $categoryController->index($conn, $tenantId, ['active' => 1]);
$contas = $accountController->index($conn, $tenantId, ['active' => 1]);
$formasPagamento = $methodController->index($conn, $tenantId, ['active' => 1]);
$transacoes = $transactionController->index($conn, $tenantId, $filters);

$totalItens = count($transacoes);
$totalPaginas = max(1, (int) ceil($totalItens / $perPage));
if ($page > $totalPaginas) {
  $page = $totalPaginas;
}
$visiveis = array_slice($transacoes, ($page - 1) * $perPage, $perPage);

// Lookup em lote (evita N+1) — categorias/contas/formas de pagamento
// referenciadas pelas linhas visiveis, incluindo inativas (podem ter sido
// desativadas depois do lancamento ser criado).
function financeiroLookupEmLote(PDO $conn, string $tabela, array $ids, int $tenantId): array {
  $ids = array_values(array_unique(array_filter($ids)));
  if (!$ids) {
    return [];
  }
  $placeholders = implode(',', array_fill(0, count($ids), '?'));
  $stmt = $conn->prepare("SELECT * FROM {$tabela} WHERE tenant_id = ? AND id IN ({$placeholders})");
  $stmt->execute(array_merge([$tenantId], $ids));
  $mapa = [];
  foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $mapa[(int) $row['id']] = $row;
  }
  return $mapa;
}

$catIds = array_map(fn($t) => (int) $t['category_id'], $visiveis);
$accIds = array_map(fn($t) => (int) $t['account_id'], $visiveis);
$pmIds = array_map(fn($t) => (int) ($t['payment_method_id'] ?? 0), $visiveis);

$catMap = financeiroLookupEmLote($conn, 'financial_categories', $catIds, $tenantId);
$accMap = financeiroLookupEmLote($conn, 'financial_accounts', $accIds, $tenantId);
$pmMap = financeiroLookupEmLote($conn, 'payment_methods', $pmIds, $tenantId);

$lancamentos = array_map(function ($t) use ($catMap, $accMap, $pmMap) {
  $categoriaId = (int) $t['category_id'];
  $contaId = (int) $t['account_id'];
  $pmId = (int) ($t['payment_method_id'] ?? 0);
  return [
    'id' => (int) $t['id'],
    'type' => $t['type'],
    'description' => $t['description'],
    'amount' => (float) $t['amount'],
    'transaction_date' => $t['transaction_date'],
    'reference_month' => (int) $t['reference_month'],
    'reference_year' => (int) $t['reference_year'],
    'notes' => $t['notes'],
    'account_id' => $contaId,
    'account_name' => $accMap[$contaId]['name'] ?? null,
    'category_id' => $categoriaId,
    'category_name' => $catMap[$categoriaId]['name'] ?? null,
    'payment_method_id' => $pmId ?: null,
    'payment_method_name' => $pmId ? ($pmMap[$pmId]['name'] ?? null) : null,
    'order_id' => $t['order_id'] !== null ? (int) $t['order_id'] : null,
  ];
}, $visiveis);

echo json_encode([
  'ok' => true,
  'mes' => $mes,
  'ano' => $ano,
  'anos' => array_values(array_map('intval', $anos)),
  'tipo' => $tipo,
  'categoria_id' => $categoriaId,
  'conta_id' => $contaId,
  'page' => $page,
  'per_page' => $perPage,
  'total' => $totalItens,
  'total_paginas' => $totalPaginas,
  'lancamentos' => $lancamentos,
  'categorias' => array_map(fn($c) => ['id' => (int) $c['id'], 'name' => $c['name'], 'type' => $c['type']], $categorias),
  'contas' => array_map(fn($a) => ['id' => (int) $a['id'], 'name' => $a['name']], $contas),
  'formas_pagamento' => array_map(fn($p) => ['id' => (int) $p['id'], 'name' => $p['name']], $formasPagamento),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
