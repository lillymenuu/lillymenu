<?php
/*
 * Versao JSON de admin/api/mesas_salvar.php para o novo frontend Next.js
 * (/waitermode), trocando sessao por token Bearer e POST tradicional por
 * corpo JSON.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/garcom_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

garcomEnsureModule($conn);

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($dados['id'] ?? 0);
$nome = trim((string) ($dados['nome'] ?? ''));

if ($nome === '') {
  echo json_encode(['ok' => false, 'msg' => 'Informe o nome da mesa.']);
  exit;
}

if ($id > 0) {
  $stmt = $conn->prepare("UPDATE mesas SET nome = ? WHERE id = ? AND loja_id = ?");
  $stmt->execute([$nome, $id, $lojaId]);
  echo json_encode(['ok' => true, 'id' => $id]);
  exit;
}

$conn->prepare("INSERT INTO mesas(loja_id, nome, ativo, criado_em) VALUES(?, ?, 1, NOW())")
  ->execute([$lojaId, $nome]);
$novoId = (int) $conn->lastInsertId();

// ja cria o cliente-placeholder aqui, pra primeira comanda dessa mesa ser
// instantanea (nao depende de nada no momento do pedido).
garcomClienteMesaId($conn, $novoId, $nome, $lojaId);

echo json_encode(['ok' => true, 'id' => $novoId]);
