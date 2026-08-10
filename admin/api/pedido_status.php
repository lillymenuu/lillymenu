<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$pedido_id = (int) ($_POST['pedido_id'] ?? 0);
$status    = $_POST['status'] ?? '';

if ($pedido_id <= 0 || $status === '') {
  echo json_encode(['ok'=>false,'msg'=>'Dados inválidos']);
  exit;
}

// Atualiza status do pedido
$stmt = $conn->prepare("
  UPDATE pedidos
  SET status = ?
  WHERE id = ? AND loja_id = ?
");
$stmt->execute([$status, $pedido_id, $lojaId]);

// ⚠️ SÓ QUANDO CONCLUIR
if ($status === 'concluido') {

  $conn->beginTransaction();

  try {

    // Itens do pedido
    $stmt = $conn->prepare("
      SELECT produto_id, quantidade
      FROM pedido_itens
      WHERE pedido_id = ? AND loja_id = ?
    ");
    $stmt->execute([$pedido_id, $lojaId]);
    $itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($itens as $item) {

      // Garante estoque
      $conn->prepare("
        INSERT IGNORE INTO estoque (produto_id, quantidade, loja_id)
        VALUES (?, 0, ?)
      ")->execute([$item['produto_id'], $lojaId]);

      // Baixa estoque
      $conn->prepare("
        UPDATE estoque
        SET quantidade = quantidade - ?
        WHERE produto_id = ? AND loja_id = ?
      ")->execute([
        $item['quantidade'],
        $item['produto_id'],
        $lojaId
      ]);

      // Registra saída
      $conn->prepare("
        INSERT INTO estoque_movimentacoes
          (produto_id, tipo, quantidade, origem, referencia_id, loja_id)
        VALUES (?, 'saida', ?, 'pedido', ?, ?)
      ")->execute([
        $item['produto_id'],
        $item['quantidade'],
        $pedido_id,
        $lojaId
      ]);
    }

    $conn->commit();

  } catch (Exception $e) {
    $conn->rollBack();
    echo json_encode(['ok'=>false,'msg'=>'Erro ao baixar estoque']);
    exit;
  }
}

echo json_encode(['ok'=>true]);
