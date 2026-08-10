<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/motoboy_module.php';

motoboyEnsureModule($conn);
$lojaId = motoboyTenantId();
$action = (string) ($_REQUEST['action'] ?? 'list');

header('Content-Type: application/json; charset=utf-8');

try {
  if ($action === 'list') {
    $pedidoId = (int) ($_GET['pedido_id'] ?? 0);
    $selectedId = 0;
    if ($pedidoId > 0 && motoboyColumnExists($conn, 'pedidos', 'motoboy_id')) {
      $stmt = $conn->prepare("SELECT motoboy_id FROM pedidos WHERE id = ? AND loja_id = ? LIMIT 1");
      $stmt->execute([$pedidoId, $lojaId]);
      $selectedId = (int) $stmt->fetchColumn();
    }

    $stmt = $conn->prepare("
      SELECT id, nome, whatsapp
      FROM motoboys
      WHERE loja_id = ? AND ativo = 1
      ORDER BY nome ASC
    ");
    $stmt->execute([$lojaId]);
    echo json_encode([
      'ok' => true,
      'motoboys' => $stmt->fetchAll(PDO::FETCH_ASSOC),
      'selected_id' => $selectedId
    ]);
    exit;
  }

  if ($action === 'bind') {
    $pedidoId = (int) ($_POST['pedido_id'] ?? 0);
    $motoboyId = (int) ($_POST['motoboy_id'] ?? 0);
    if ($pedidoId <= 0) {
      throw new RuntimeException('Pedido invalido.');
    }

    $stmtPedido = $conn->prepare("SELECT id, tipo FROM pedidos WHERE id = ? AND loja_id = ? LIMIT 1");
    $stmtPedido->execute([$pedidoId, $lojaId]);
    $pedido = $stmtPedido->fetch(PDO::FETCH_ASSOC);
    if (!$pedido) {
      throw new RuntimeException('Pedido nao encontrado.');
    }
    if (($pedido['tipo'] ?? '') !== 'entrega') {
      throw new RuntimeException('Somente pedidos de entrega podem vincular motoboy.');
    }

    $motoboyNome = '';
    if ($motoboyId > 0) {
      $stmtMotoboy = $conn->prepare("SELECT nome FROM motoboys WHERE id = ? AND loja_id = ? LIMIT 1");
      $stmtMotoboy->execute([$motoboyId, $lojaId]);
      $motoboyNome = (string) ($stmtMotoboy->fetchColumn() ?: '');
      if ($motoboyNome === '') {
        throw new RuntimeException('Motoboy nao encontrado.');
      }
    }

    $stmt = $conn->prepare("UPDATE pedidos SET motoboy_id = ? WHERE id = ? AND loja_id = ?");
    $stmt->execute([$motoboyId > 0 ? $motoboyId : null, $pedidoId, $lojaId]);

    echo json_encode([
      'ok' => true,
      'msg' => $motoboyId > 0 ? 'Motoboy vinculado com sucesso.' : 'Motoboy desvinculado com sucesso.',
      'motoboy_nome' => $motoboyNome
    ]);
    exit;
  }

  throw new RuntimeException('Acao invalida.');
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}
