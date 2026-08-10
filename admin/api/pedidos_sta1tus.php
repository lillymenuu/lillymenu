<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id     = $_POST['id'] ?? 0;
$status = $_POST['status'] ?? '';

$permitidos = ['recebido','producao','entrega','finalizado','cancelado'];

if (!$id || !in_array($status, $permitidos)) {
  http_response_code(400);
  echo json_encode(['ok' => false]);
  exit;
}

$stmt = $conn->prepare(
  "UPDATE pedidos SET status = ? WHERE id = ? AND loja_id = ?"
);
$stmt->execute([$status, $id, $lojaId]);

echo json_encode(['ok' => true, 'status' => $status]);
?>
