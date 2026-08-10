<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

if (!tabelaExiste($conn, 'taxas_dinamicas')) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de taxas dinamicas nao encontrada.']);
  exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$id = isset($payload['id']) ? (int) $payload['id'] : 0;
if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'ID invalido.']);
  exit;
}

try {
  $stmt = $conn->prepare("DELETE FROM taxas_dinamicas WHERE id = ? AND loja_id = ?");
  $stmt->execute([$id, $lojaId]);
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Erro ao remover.']);
}
