<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$termo = $_GET['q'] ?? '';

$clientesColunas = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$temCashbackSaldoCliente = in_array('cashback_saldo', $clientesColunas, true);
$selectCashbackSaldo = $temCashbackSaldoCliente ? ", cashback_saldo" : "";

$stmt = $conn->prepare("
  SELECT id, nome, telefone{$selectCashbackSaldo}
  FROM clientes
  WHERE (nome LIKE ? OR telefone LIKE ?) AND loja_id = ?
  ORDER BY nome
  LIMIT 10
");

$like = "%$termo%";
$stmt->execute([$like, $like, $lojaId]);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
