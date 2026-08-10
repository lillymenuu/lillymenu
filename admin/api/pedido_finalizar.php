<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../admin/helpers/config.php';
require_once __DIR__ . '/../admin/helpers/whatsapp.php';

header('Content-Type: application/json');

/* Dados vindos do frontend */
$total = (float)($_POST['total'] ?? 0);

/* Itens do pedido (como você já tem hoje) */
$itens = [
  ['nome'=>'Bolo de Chocolate','quantidade'=>2],
  ['nome'=>'Brownie','quantidade'=>1]
];

/* 🔐 VALIDAÇÕES */
$pedido_min = (float) config($conn, 'pedido_minimo');

if ($total < $pedido_min) {
  echo json_encode([
    'ok'=>false,
    'msg'=>"Pedido mínimo é R$ ".number_format($pedido_min,2,',','.')
  ]);
  exit;
}

if (!estaAberto($conn)) {
  echo json_encode([
    'ok'=>false,
    'msg'=>'Estamos fora do horário de funcionamento'
  ]);
  exit;
}

/* 👉 SE CHEGOU AQUI, PEDIDO OK */

/* Salva pedido no banco (como você já faz hoje) */
// $pedido_id = ...

/* Gera link do WhatsApp */
$pedido = [
  'total' => $total,
  'itens' => $itens
];

$linkWhats = gerarLinkWhatsApp($conn, $pedido);

/* Resposta FINAL */
echo json_encode([
  'ok' => true,
  'whatsapp' => $linkWhats
]);


$taxa_entrega  = (float) config($conn, 'taxa_entrega');
$pedido_minimo = (float) config($conn, 'pedido_minimo');

if ($subtotal < $pedido_minimo) {
  echo json_encode([
    'ok'=>false,
    'msg'=>"Pedido mínimo é R$ ".number_format($pedido_minimo,2,',','.')
  ]);
  exit;
}

$total = $subtotal + $taxa_entrega;
