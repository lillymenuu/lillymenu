<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$busca = trim((string) ($_GET['busca'] ?? ''));

try {
  if ($busca === '') {
    $where = ["loja_id = ?"];
    $params = [$lojaId];
  } else {
    $where = ["loja_id = ?", "nome LIKE ?"];
    $params = [$lojaId, "%{$busca}%"];
    $buscaTel = preg_replace('/\D+/', '', $busca);
    if ($buscaTel !== '') {
      $where = ["loja_id = ?", "(nome LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone,'(',''),')',''),'-',''),' ',''),'+','') LIKE ?)"];
      $params = [$lojaId, "%{$busca}%", "%{$buscaTel}%"];
    }
  }
  $stmt = $conn->prepare("
    SELECT id, nome, telefone
    FROM clientes
    WHERE " . implode(' AND ', $where) . "
    ORDER BY nome ASC
    LIMIT 10
  ");
  $stmt->execute($params);
  $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['ok' => true, 'clientes' => $clientes]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao buscar clientes.']);
}
