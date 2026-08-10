<?php
require_once '../config/database.php';
require_once '../helpers/loja_context.php';

$id = (int) ($_GET['id'] ?? 0);
$lojaId = definirLojaIdSessao($conn);

// PEDIDO
$stmt = $conn->prepare("
  SELECT p.*, c.nome AS cliente, c.telefone, c.endereco
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  WHERE p.id = ? AND p.loja_id = ?
");
$stmt->execute([$id, $lojaId]);
$pedido = $stmt->fetch(PDO::FETCH_ASSOC);

// ITENS
$stmt = $conn->prepare("
  SELECT * FROM pedido_itens WHERE pedido_id = ? AND loja_id = ?
");
$stmt->execute([$id, $lojaId]);
$itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
  'pedido' => $pedido,
  'itens' => $itens
]);
