<?php
require_once '../config/database.php';
require_once '../helpers/loja_context.php';

$data = json_decode(file_get_contents("php://input"), true);
$lojaIdPayload = (int) ($data['loja_id'] ?? 0);
$lojaId = $lojaIdPayload > 0 ? $lojaIdPayload : definirLojaIdSessao($conn);
if ($lojaId > 0) {
  $_SESSION['loja_id'] = $lojaId;
}

$colsClientes = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$colsPedidos = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
$colsItens = $conn->query("SHOW COLUMNS FROM pedido_itens")->fetchAll(PDO::FETCH_COLUMN, 0);
$temLojaCliente = in_array('loja_id', $colsClientes, true);
$temLojaPedido = in_array('loja_id', $colsPedidos, true);
$temLojaItens = in_array('loja_id', $colsItens, true);

// CLIENTE
$colsClienteInsert = ['nome', 'telefone', 'endereco'];
$valsCliente = [
  $data['nome'] ?? '',
  $data['telefone'] ?? '',
  $data['endereco'] ?? ''
];
if ($temLojaCliente) {
  $colsClienteInsert[] = 'loja_id';
  $valsCliente[] = $lojaId;
}
$stmt = $conn->prepare(
  "INSERT INTO clientes (" . implode(',', $colsClienteInsert) . ")
   VALUES (" . implode(',', array_fill(0, count($colsClienteInsert), '?')) . ")"
);
$stmt->execute($valsCliente);

$cliente_id = $conn->lastInsertId();

// PEDIDO
$colsPedidoInsert = ['cliente_id', 'tipo_entrega', 'taxa_entrega', 'total', 'forma_pagamento'];
$valsPedido = [
  $cliente_id,
  $data['tipo_entrega'] ?? '',
  $data['taxa'] ?? 0,
  $data['total'] ?? 0,
  $data['pagamento'] ?? ''
];
if ($temLojaPedido) {
  $colsPedidoInsert[] = 'loja_id';
  $valsPedido[] = $lojaId;
}
$stmt = $conn->prepare(
  "INSERT INTO pedidos
   (" . implode(',', $colsPedidoInsert) . ")
   VALUES (" . implode(',', array_fill(0, count($colsPedidoInsert), '?')) . ")"
);
$stmt->execute($valsPedido);

$pedido_id = $conn->lastInsertId();

// ITENS
$colsItensInsert = ['pedido_id', 'produto_nome', 'quantidade', 'preco', 'observacoes'];
if ($temLojaItens) {
  $colsItensInsert[] = 'loja_id';
}
$stmt = $conn->prepare(
  "INSERT INTO pedido_itens
   (" . implode(',', $colsItensInsert) . ")
   VALUES (" . implode(',', array_fill(0, count($colsItensInsert), '?')) . ")"
);

foreach ($data['itens'] as $item) {
  $valsItem = [
    $pedido_id,
    $item['nome'] ?? '',
    $item['quantidade'] ?? 1,
    $item['preco'] ?? 0,
    $item['observacoes'] ?? ''
  ];
  if ($temLojaItens) {
    $valsItem[] = $lojaId;
  }
  $stmt->execute($valsItem);
}

echo json_encode(["pedido_id" => $pedido_id]);
