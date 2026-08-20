<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';
require_once __DIR__ . '/../helpers/financial_module.php';
require_once __DIR__ . '/../helpers/config.php';
require_once __DIR__ . '/../helpers/cashback_module.php';
require_once __DIR__ . '/../helpers/caixa_module.php';
require_once __DIR__ . '/../helpers/pedido_estoque_module.php';
require_once __DIR__ . '/../../services/SaleFinancialIntegrationService.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = $_POST['id'] ?? null;
$status = $_POST['status'] ?? null;

if (!$id || !$status) {
  echo json_encode(['ok'=>false]);
  exit;
}

// DDL deve rodar ANTES da transação — DDL causa implicit commit no MySQL
cashbackEnsureModule($conn);
comboEstoqueEnsureModule($conn);
estoqueVinculoEnsureModule($conn);

$conn->beginTransaction();

try {
  // Estoque so deve ser reposto quando o pedido esta REALMENTE virando
  // cancelado agora (nao repor de novo se ja estava cancelado — evita duplicar
  // entrada de estoque num duplo clique/retry).
  $stmtStatusAtual = $conn->prepare("SELECT status FROM pedidos WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmtStatusAtual->execute([$id, $lojaId]);
  $statusAntes = $stmtStatusAtual->fetchColumn();

  // atualiza pedido
  $stmt = $conn->prepare("UPDATE pedidos SET status = ? WHERE id = ? AND loja_id = ?");
  $stmt->execute([$status, $id, $lojaId]);

  // registra histórico
  $stmt = $conn->prepare("
    INSERT INTO pedido_status_log (pedido_id, status, loja_id)
    VALUES (?, ?, ?)
  ");
  $stmt->execute([$id, $status, $lojaId]);

  if ($status === 'cancelado' && $statusAntes !== 'cancelado') {
    pedidoRestaurarEstoqueCancelado($conn, (int) $id, $lojaId);
  }

  $conn->commit();

  if ($status === 'finalizado') {
    caixaAtribuirPedidoFinalizado($conn, (int) $id, $lojaId);
    cashbackPromoverPendente($conn, (int) $id, $lojaId);
  } elseif ($status === 'cancelado') {
    cashbackCancelarPendente($conn, (int) $id, $lojaId);
  }

  try {
    financialEnsureModule($conn);
    $financialIntegration = new SaleFinancialIntegrationService();
    if ($status === 'finalizado') {
      $financialIntegration->syncFinalizedOrder($conn, $lojaId, (int) $id);
    } elseif ($status === 'cancelado') {
      $financialIntegration->reverseCanceledOrder($conn, $lojaId, (int) $id);
    }
  } catch (Throwable $financeiroErro) {
    error_log('Erro ao sincronizar pedido no financeiro via pedidos_status: ' . $financeiroErro->getMessage());
  }
  registrarOperacao($conn, 'pedido_status', 'pedido:' . $id, [
    'status' => $status
  ]);
  echo json_encode(['ok'=>true]);

} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok'=>false]);
}
