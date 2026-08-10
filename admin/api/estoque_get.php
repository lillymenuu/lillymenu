<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$produtoId = (int) ($_GET['produto_id'] ?? 0);
if ($produtoId <= 0) {
  echo json_encode(['ok' => false]);
  exit;
}

$colunas = $conn->query("SHOW COLUMNS FROM estoque")->fetchAll(PDO::FETCH_COLUMN, 0);
$temMinimo = in_array('quantidade_minima', $colunas, true);

$campos = $temMinimo ? "IFNULL(e.quantidade_minima, 0) AS quantidade_minima" : "0 AS quantidade_minima";

$stmt = $conn->prepare("
  SELECT IFNULL(e.quantidade, 0) AS quantidade, $campos
  FROM produtos p
  LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
  WHERE p.id = ? AND p.loja_id = ?
");
$stmt->execute([$produtoId, $lojaId]);
$dados = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['quantidade' => 0, 'quantidade_minima' => 0];

echo json_encode([
  'ok' => true,
  'quantidade' => (int) ($dados['quantidade'] ?? 0),
  'quantidade_minima' => (int) ($dados['quantidade_minima'] ?? 0)
]);
