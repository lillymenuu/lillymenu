<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$produto_id = (int) ($_POST['produto_id'] ?? 0);
$qtd        = (int) ($_POST['quantidade'] ?? 0);
$origem     = trim($_POST['origem'] ?? 'produção');

if ($produto_id <= 0 || $qtd <= 0) {
  echo json_encode(['ok'=>false,'msg'=>'Dados inválidos']);
  exit;
}

$conn->beginTransaction();

try {
  // Garante linha no estoque
  $conn->prepare("
    INSERT IGNORE INTO estoque (produto_id, quantidade, loja_id)
    VALUES (?, 0, ?)
  ")->execute([$produto_id, $lojaId]);

  // Atualiza saldo
  $conn->prepare("
    UPDATE estoque
    SET quantidade = quantidade + ?
    WHERE produto_id = ? AND loja_id = ?
  ")->execute([$qtd, $produto_id, $lojaId]);

  // Registra movimentação
  $conn->prepare("
    INSERT INTO estoque_movimentacoes
      (produto_id, tipo, quantidade, origem, loja_id)
    VALUES (?, 'entrada', ?, ?, ?)
  ")->execute([$produto_id, $qtd, $origem, $lojaId]);

  $conn->commit();
  echo json_encode(['ok'=>true]);
} catch(Exception $e){
  $conn->rollBack();
  echo json_encode(['ok'=>false,'msg'=>'Erro interno']);
}
