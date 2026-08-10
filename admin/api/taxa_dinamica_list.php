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
  echo json_encode(['ok' => true, 'itens' => []]);
  exit;
}

$stmt = $conn->prepare("
  SELECT id, distancia_km, valor, tipo, tempo_min, tempo_max
  FROM taxas_dinamicas
  WHERE loja_id = ?
  ORDER BY distancia_km
");
$stmt->execute([$lojaId]);
$itens = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

echo json_encode(['ok' => true, 'itens' => $itens]);
