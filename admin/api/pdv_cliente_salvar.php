<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$nome     = $_POST['nome'] ?? '';
$telefone = $_POST['telefone'] ?? '';
$endereco = $_POST['endereco'] ?? '';

if (!$nome || !$telefone) {
  echo json_encode(['ok'=>false,'msg'=>'Nome e telefone são obrigatórios']);
  exit;
}

$stmt = $conn->prepare("
  INSERT INTO clientes (nome, telefone, endereco, loja_id)
  VALUES (?,?,?,?)
");
$stmt->execute([$nome, $telefone, $endereco, $lojaId]);

echo json_encode([
  'ok' => true,
  'cliente' => [
    'id' => $conn->lastInsertId(),
    'nome' => $nome,
    'telefone' => $telefone
  ]
]);
