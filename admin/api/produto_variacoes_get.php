<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$produtoId = (int) ($_GET['id'] ?? 0);
if (!$produtoId) {
  echo json_encode(['ok' => false, 'msg' => 'Produto invalido', 'variacoes' => []]);
  exit;
}

try {
  $stmt = $conn->prepare("SHOW TABLES LIKE ?");
  $stmt->execute(['produto_variacoes']);
  if (!$stmt->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Tabela de variacoes nao encontrada', 'variacoes' => []]);
    exit;
  }
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao verificar variacoes', 'variacoes' => []]);
  exit;
}

$stmt = $conn->prepare("
  SELECT id, tamanho, cor, preco
  FROM produto_variacoes
  WHERE produto_id = ? AND ativo = 1 AND loja_id = ?
  ORDER BY ordem, id
");
$stmt->execute([$produtoId, $lojaId]);
echo json_encode([
  'ok' => true,
  'variacoes' => $stmt->fetchAll(PDO::FETCH_ASSOC)
]);
exit;
