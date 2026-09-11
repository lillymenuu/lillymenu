<?php
/*
 * Versao JSON de admin/motoboys.php (acao 'delete') para o novo frontend
 * Next.js (/motoboys), trocando sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/motoboy_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

motoboyEnsureModule($conn);

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($dados['id'] ?? 0);

if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Motoboy invalido.']);
  exit;
}

try {
  if (motoboyColumnExists($conn, 'pedidos', 'motoboy_id')) {
    $stmt = $conn->prepare("UPDATE pedidos SET motoboy_id = NULL WHERE loja_id = ? AND motoboy_id = ?");
    $stmt->execute([$lojaId, $id]);
  }
  $stmt = $conn->prepare("DELETE FROM motoboys WHERE id = ? AND loja_id = ?");
  $stmt->execute([$id, $lojaId]);
  echo json_encode(['ok' => true, 'msg' => 'Motoboy removido com sucesso.']);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao remover motoboy.']);
}
