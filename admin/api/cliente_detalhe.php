<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$clienteId = isset($_GET['cliente_id']) ? (int) $_GET['cliente_id'] : 0;
if (!$clienteId) {
  echo json_encode(['ok' => false, 'msg' => 'Cliente invalido']);
  exit;
}

$cols = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$campos = [
  'id','nome','telefone','endereco','aniversario','cep','rua','numero','bairro','cidade','estado','complemento'
];
$select = [];
foreach ($campos as $campo) {
  $select[] = in_array($campo, $cols, true) ? $campo : "NULL AS {$campo}";
}

$stmt = $conn->prepare("SELECT " . implode(', ', $select) . " FROM clientes WHERE id = ? AND loja_id = ?");
$stmt->execute([$clienteId, $lojaId]);
$cliente = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$cliente) {
  echo json_encode(['ok' => false, 'msg' => 'Cliente nao encontrado']);
  exit;
}

echo json_encode(['ok' => true, 'cliente' => $cliente]);
