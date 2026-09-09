<?php
/*
 * Versao JSON de admin/api/cliente_detalhe.php para o novo frontend
 * Next.js — prefill do modal "Editar cliente".
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth      = apiAuthExigir($conn);
$lojaId    = $auth['loja_id'];
$clienteId = (int) ($_GET['cliente_id'] ?? 0);
if (!$clienteId) {
  echo json_encode(['ok' => false, 'msg' => 'Cliente invalido.']);
  exit;
}

$cols = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$campos = ['id', 'nome', 'telefone', 'endereco', 'aniversario', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'estado', 'complemento'];
$select = [];
foreach ($campos as $campo) {
  $select[] = in_array($campo, $cols, true) ? $campo : "NULL AS {$campo}";
}

$stmt = $conn->prepare("SELECT " . implode(', ', $select) . " FROM clientes WHERE id = ? AND loja_id = ?");
$stmt->execute([$clienteId, $lojaId]);
$cliente = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$cliente) {
  echo json_encode(['ok' => false, 'msg' => 'Cliente nao encontrado.']);
  exit;
}

echo json_encode(['ok' => true, 'cliente' => $cliente], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
