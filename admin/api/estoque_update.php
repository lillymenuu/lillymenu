<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$produtoId = (int) ($_POST['produto_id'] ?? 0);
$quantidade = (int) ($_POST['quantidade'] ?? 0);
$minimo = (int) ($_POST['quantidade_minima'] ?? 0);

if ($produtoId <= 0 || $quantidade < 0 || $minimo < 0) {
  echo json_encode(['ok' => false]);
  exit;
}

$colunas = $conn->query("SHOW COLUMNS FROM estoque")->fetchAll(PDO::FETCH_COLUMN, 0);
$temMinimo = in_array('quantidade_minima', $colunas, true);

$conn->beginTransaction();

try {
  $conn->prepare("
    INSERT IGNORE INTO estoque (produto_id, quantidade, loja_id)
    VALUES (?, 0, ?)
  ")->execute([$produtoId, $lojaId]);

  $stmt = $conn->prepare("
    SELECT quantidade
    FROM estoque
    WHERE produto_id = ? AND loja_id = ?
  ");
  $stmt->execute([$produtoId, $lojaId]);
  $quantidadeAtual = (int) ($stmt->fetchColumn() ?? 0);

  if ($temMinimo) {
    $stmt = $conn->prepare("
      UPDATE estoque
      SET quantidade = ?, quantidade_minima = ?
      WHERE produto_id = ? AND loja_id = ?
    ");
    $stmt->execute([$quantidade, $minimo, $produtoId, $lojaId]);
  } else {
    $stmt = $conn->prepare("
      UPDATE estoque
      SET quantidade = ?
      WHERE produto_id = ? AND loja_id = ?
    ");
    $stmt->execute([$quantidade, $produtoId, $lojaId]);
  }

  $delta = $quantidade - $quantidadeAtual;
  if ($delta !== 0) {
    $tipo = $delta > 0 ? 'entrada' : 'saida';
    $stmt = $conn->prepare("
      INSERT INTO estoque_movimentacoes (produto_id, tipo, quantidade, origem, loja_id)
      VALUES (?, ?, ?, 'ajuste', ?)
    ");
    $stmt->execute([$produtoId, $tipo, abs($delta), $lojaId]);
  }

  $conn->commit();
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false]);
}
