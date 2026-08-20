<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/estoque_vinculo_module.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$produtoId = (int) ($_POST['produto_id'] ?? 0);
if ($produtoId <= 0) {
  echo json_encode(['ok' => false]);
  exit;
}

$stmt = $conn->prepare("DELETE FROM estoque WHERE produto_id = ? AND loja_id = ?");
$stmt->execute([$produtoId, $lojaId]);

// Deletar o estoque de um produto so tira ELE do grupo — nao mexe no saldo
// dos outros membros vinculados.
estoqueVinculoEnsureModule($conn);
$conn->prepare("DELETE FROM estoque_grupo_membros WHERE produto_id = ? AND loja_id = ?")
  ->execute([$produtoId, $lojaId]);

echo json_encode(['ok' => true]);
