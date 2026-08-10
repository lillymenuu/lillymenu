<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$payload = json_decode(file_get_contents('php://input'), true);
$ordem = $payload['ordem'] ?? $_POST['ordem'] ?? [];

if (!is_array($ordem) || count($ordem) === 0) {
  echo json_encode(['ok' => false]);
  exit;
}

$ordem = array_values(array_filter($ordem, function($id) {
  return is_numeric($id);
}));

if (count($ordem) === 0) {
  echo json_encode(['ok' => false]);
  exit;
}

$conn->beginTransaction();
$stmt = $conn->prepare("UPDATE categorias SET ordem = ? WHERE id = ? AND loja_id = ?");
foreach ($ordem as $index => $id) {
  $stmt->execute([$index + 1, (int) $id, $lojaId]);
}
$conn->commit();

echo json_encode(['ok' => true]);
