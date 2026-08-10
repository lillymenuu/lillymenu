<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId = (int)($_SESSION['loja_id'] ?? 1);
$data   = json_decode(file_get_contents('php://input'), true) ?? [];
$id     = (int)($data['id'] ?? 0);

if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Pausa invalida.']);
  exit;
}

try {
  $stmt = $conn->prepare("DELETE FROM pausas_programadas WHERE id = ? AND loja_id = ?");
  $stmt->execute([$id, $lojaId]);

  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao excluir pausa programada.']);
}
