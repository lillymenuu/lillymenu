<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';
require_once __DIR__ . '/../helpers/financial_module.php';
require_once __DIR__ . '/../helpers/cashback_module.php';
require_once __DIR__ . '/../helpers/pedido_estoque_module.php';
require_once __DIR__ . '/../../services/SaleFinancialIntegrationService.php';

exigirPerfil(['admin', 'gerente']);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

function statusPermitido(PDO $conn, $tabela, $statusPreferido, $statusFallback = 'pendente') {
  try {
    $stmt = $conn->query("SHOW COLUMNS FROM {$tabela} LIKE 'status'");
    $col = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : null;
    if (!$col || empty($col['Type'])) {
      return $statusPreferido;
    }
    $tipo = strtolower($col['Type']);
    if (strpos($tipo, 'enum(') !== 0) {
      return $statusPreferido;
    }
    preg_match_all("/'((?:\\\\'|[^'])*)'/", $col['Type'], $matches);
    $valores = array_map(function($v){
      return str_replace("\\'", "'", $v);
    }, $matches[1] ?? []);
    if (in_array($statusPreferido, $valores, true)) {
      return $statusPreferido;
    }
    if (in_array($statusFallback, $valores, true)) {
      return $statusFallback;
    }
    return $valores[0] ?? $statusFallback;
  } catch (Exception $e) {
    return $statusPreferido;
  }
}

$id = $_POST['id'] ?? null;
if (!$id) {
  echo json_encode(['ok'=>false]);
  exit;
}

$statusCanceladoPedidos = statusPermitido($conn, 'pedidos', 'cancelado', 'finalizado');
$statusCanceladoLog = statusPermitido($conn, 'pedido_status_log', 'cancelado', $statusCanceladoPedidos);

// DDL deve rodar ANTES da transação — DDL causa implicit commit no MySQL
comboEstoqueEnsureModule($conn);
estoqueVinculoEnsureModule($conn);

$conn->beginTransaction();
try {
  $stmtStatus = $conn->prepare("SELECT status FROM pedidos WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmtStatus->execute([$id, $lojaId]);
  $statusAtual = $stmtStatus->fetchColumn();

  if ($statusAtual === $statusCanceladoPedidos) {
    $conn->commit();
    echo json_encode(['ok'=>true]);
    exit;
  }

  $conn->prepare("UPDATE pedidos SET status = ? WHERE id = ? AND loja_id = ?")
       ->execute([$statusCanceladoPedidos, $id, $lojaId]);

  $conn->prepare("
    INSERT INTO pedido_status_log (pedido_id, status, loja_id)
    VALUES (?, ?, ?)
  ")->execute([$id, $statusCanceladoLog, $lojaId]);

  pedidoRestaurarEstoqueCancelado($conn, (int) $id, $lojaId);

  cashbackCancelarPendente($conn, (int) $id, $lojaId);

  $conn->commit();
  try {
    financialEnsureModule($conn);
    $financialIntegration = new SaleFinancialIntegrationService();
    $financialIntegration->reverseCanceledOrder($conn, $lojaId, (int) $id);
  } catch (Throwable $financeiroErro) {
    error_log('Erro ao reverter pedido cancelado no financeiro: ' . $financeiroErro->getMessage());
  }
  registrarOperacao($conn, 'pedido_cancelado', 'pedido:' . $id);
  echo json_encode(['ok'=>true]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok'=>false]);
}
