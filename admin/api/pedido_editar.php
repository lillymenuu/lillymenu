<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

exigirPerfil(['admin', 'gerente']);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$data = json_decode(file_get_contents('php://input'), true);

$pedidoId = $data['pedido_id'] ?? null;
$tipo     = $data['tipo'] ?? null;
$itens    = $data['itens'] ?? [];

if (!$pedidoId || !$tipo || empty($itens)) {
  echo json_encode(['ok'=>false, 'msg'=>'Dados inválidos']);
  exit;
}

$conn->beginTransaction();
try {
  // recalcula total
  $total = 0;
  foreach ($itens as $i) {
    $total += $i['quantidade'] * $i['preco'];
  }

  // atualiza pedido
 $stmt = $conn->prepare("
  UPDATE pedidos 
  SET tipo = ?, total = ?, forma_pagamento = ?, troco = ?, taxa_entrega = ?
  WHERE id = ? AND loja_id = ?
");
$stmt->execute([
  $tipo,
  $total,
  $data['forma_pagamento'],
  $data['troco'] ?? null,
  $data['taxa_entrega'] ?? 0,
  $pedidoId,
  $lojaId
]);


  // remove itens antigos
  $conn->prepare("DELETE FROM pedido_itens WHERE pedido_id = ? AND loja_id = ?")
       ->execute([$pedidoId, $lojaId]);

  // insere itens atualizados
  $stmt = $conn->prepare("
    INSERT INTO pedido_itens
    (pedido_id, produto_nome, quantidade, preco, loja_id)
    VALUES (?, ?, ?, ?, ?)
  ");

  foreach ($itens as $i) {
    $stmt->execute([
      $pedidoId,
      $i['produto_nome'],
      $i['quantidade'],
      $i['preco'],
      $lojaId
    ]);
  }

  $conn->commit();
  registrarOperacao($conn, 'pedido_editado', 'pedido:' . $pedidoId);
  echo json_encode(['ok'=>true]);

} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok'=>false]);
}
