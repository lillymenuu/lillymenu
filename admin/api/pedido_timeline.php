<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$pedidoId = $_GET['pedido_id'] ?? null;
if (!$pedidoId) {
  echo json_encode([]);
  exit;
}

$stmt = $conn->prepare("
  SELECT l.status, l.criado_em
  FROM pedido_status_log l
  JOIN pedidos p ON p.id = l.pedido_id AND p.loja_id = l.loja_id
  WHERE l.pedido_id = ? AND l.loja_id = ?
  ORDER BY criado_em ASC
");
$stmt->execute([$pedidoId, $lojaId]);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
