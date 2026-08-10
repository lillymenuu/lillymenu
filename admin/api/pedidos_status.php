<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';
require_once __DIR__ . '/../helpers/financial_module.php';
require_once __DIR__ . '/../helpers/config.php';
require_once __DIR__ . '/../helpers/cashback_module.php';
require_once __DIR__ . '/../helpers/caixa_module.php';
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

$conn->beginTransaction();

try {
  // atualiza pedido
  $stmt = $conn->prepare("UPDATE pedidos SET status = ? WHERE id = ? AND loja_id = ?");
  $stmt->execute([$status, $id, $lojaId]);

  // registra histórico
  $stmt = $conn->prepare("
    INSERT INTO pedido_status_log (pedido_id, status, loja_id)
    VALUES (?, ?, ?)
  ");
  $stmt->execute([$id, $status, $lojaId]);

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
