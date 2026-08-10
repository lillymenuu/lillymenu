<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/config.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$pedidoId = $_GET['pedido_id'] ?? null;

if (!$pedidoId) {
  echo json_encode(['ok'=>false,'msg'=>'Pedido não informado']);
  exit;
}

/* BUSCAR PEDIDO */
$stmt = $conn->prepare("
  SELECT p.*, c.nome, c.telefone
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  WHERE p.id = ? AND p.loja_id = ?
");
$stmt->execute([$pedidoId, $lojaId]);
$pedido = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$pedido) {
  echo json_encode(['ok'=>false,'msg'=>'Pedido não encontrado']);
  exit;
}

/* ITENS */
$stmt = $conn->prepare("
  SELECT produto_nome, quantidade, preco
  FROM pedido_itens
  WHERE pedido_id = ? AND loja_id = ?
");
$stmt->execute([$pedidoId, $lojaId]);
$itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

/* WHATSAPP DA LOJA */
$whatsLoja = config($conn, 'whatsapp_loja', '5585985049577');

/* MONTAR MENSAGEM */
$msg  = "*NOVO PEDIDO #{$pedidoId}*\n\n";
$msg .= "*Cliente:* {$pedido['nome']}\n";
$msg .= "*Telefone:* {$pedido['telefone']}\n\n";

$msg .= "*Itens:*\n";
foreach ($itens as $i) {
  $totalItem = $i['quantidade'] * $i['preco'];
  $msg .= "- {$i['quantidade']}x {$i['produto_nome']} — R$ "
       . number_format($totalItem, 2, ',', '.') . "\n";
}

$msg .= "\n*Subtotal:* R$ " . number_format($pedido['subtotal'],2,',','.') . "\n";
$msg .= "*Taxa:* R$ " . number_format($pedido['taxa_entrega'],2,',','.') . "\n";
$msg .= "*Total:* R$ " . number_format($pedido['total'],2,',','.') . "\n\n";

$msg .= "*Tipo:* " . strtoupper($pedido['tipo']) . "\n";

if ($pedido['tipo'] === 'entrega') {
  $msg .= "*Endereço:* {$pedido['endereco_entrega']}\n";
}

$url = "https://wa.me/{$whatsLoja}?text=" . urlencode($msg);

echo json_encode([
  'ok' => true,
  'url' => $url
]);
