<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/loja_context.php';

header('Content-Type: application/json');

try {
  $lojaId = definirLojaIdSessao($conn);

  $idsRaw = $_GET['ids'] ?? '';
  $ids = array_values(array_unique(array_filter(array_map('intval', explode(',', (string) $idsRaw)))));
  if (!$ids) {
    echo json_encode(['ok' => true, 'estoque' => []]);
    exit;
  }

  $placeholders = implode(',', array_fill(0, count($ids), '?'));
  $stmt = $conn->prepare("
    SELECT p.id, IFNULL(e.quantidade,0) AS estoque
    FROM produtos p
    LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
    WHERE p.id IN ($placeholders) AND p.loja_id = ?
  ");
  $stmt->execute(array_merge($ids, [$lojaId]));

  $estoque = [];
  foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $estoque[(int) $row['id']] = (int) $row['estoque'];
  }

  echo json_encode(['ok' => true, 'estoque' => $estoque]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao consultar estoque.']);
}
