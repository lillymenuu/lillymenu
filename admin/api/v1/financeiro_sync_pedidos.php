<?php
/*
 * Versao JSON (Bearer token) de admin/api/financeiro_sync_pedidos.php —
 * sincroniza pedidos finalizados sem lancamento financeiro correspondente.
 * Porta 1:1, so trocando sessao por Bearer token.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/financial_module.php';
require_once __DIR__ . '/../../../services/SaleFinancialIntegrationService.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['admin_perfil'] = $auth['perfil'];
$_SESSION['loja_id'] = $lojaId;

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
  $body = [];
}

$modo = $body['modo'] ?? 'mes';
$mes  = (int) ($body['mes'] ?? date('n'));
$ano  = (int) ($body['ano'] ?? date('Y'));

financialEnsureModule($conn);

$svc = new SaleFinancialIntegrationService();

try {
  if ($modo === 'todos') {
    $stmt = $conn->prepare("
      SELECT DISTINCT YEAR(p.criado_em) AS ano, MONTH(p.criado_em) AS mes
      FROM pedidos p
      WHERE p.loja_id = ?
        AND p.status = 'finalizado'
        AND p.total > 0
        AND NOT EXISTS (
          SELECT 1 FROM financial_transactions ft
          WHERE ft.tenant_id = p.loja_id
            AND ft.order_id = p.id
            AND ft.type = 'income'
        )
      ORDER BY ano ASC, mes ASC
    ");
    $stmt->execute([$lojaId]);
    $periodos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalCriados = 0;
    $totalAtualizados = 0;
    $totalPedidos = 0;
    $mesesSincronizados = [];

    foreach ($periodos as $periodo) {
      $result = $svc->syncFinalizedOrdersForPeriod($conn, $lojaId, (int) $periodo['mes'], (int) $periodo['ano']);
      $totalCriados += (int) ($result['created'] ?? 0);
      $totalAtualizados += (int) ($result['updated'] ?? 0);
      $totalPedidos += (int) ($result['orders'] ?? 0);
      $mesesSincronizados[] = $periodo['mes'] . '/' . $periodo['ano'];
    }

    echo json_encode([
      'ok' => true,
      'modo' => 'todos',
      'periodos' => $mesesSincronizados,
      'created' => $totalCriados,
      'updated' => $totalAtualizados,
      'orders' => $totalPedidos,
      'msg' => "Sincronizados {$totalPedidos} pedido(s) — {$totalCriados} lançamento(s) criado(s).",
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  } else {
    $result = $svc->syncFinalizedOrdersForPeriod($conn, $lojaId, $mes, $ano);
    echo json_encode([
      'ok' => true,
      'modo' => 'mes',
      'mes' => $mes,
      'ano' => $ano,
      'created' => $result['created'] ?? 0,
      'updated' => $result['updated'] ?? 0,
      'orders' => $result['orders'] ?? 0,
      'msg' => "Sincronizados {$result['orders']} pedido(s) de {$mes}/{$ano} — {$result['created']} lançamento(s) criado(s).",
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  }
} catch (Throwable $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
