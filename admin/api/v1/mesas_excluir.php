<?php
/*
 * Versao JSON de admin/api/mesas_excluir.php para o novo frontend Next.js
 * (/waitermode), trocando sessao por token Bearer.
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
if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Mesa inválida.']);
  exit;
}

$stmtAberto = $conn->prepare("SELECT COUNT(*) FROM pedidos WHERE loja_id = ? AND mesa_id = ? AND status NOT IN ('finalizado','cancelado')");
$stmtAberto->execute([$lojaId, $id]);
if ((int) $stmtAberto->fetchColumn() > 0) {
  echo json_encode(['ok' => false, 'msg' => 'Essa mesa tem um pedido em aberto e não pode ser excluída.']);
  exit;
}

$stmt = $conn->prepare("DELETE FROM mesas WHERE id = ? AND loja_id = ?");
$stmt->execute([$id, $lojaId]);

echo json_encode(['ok' => true]);
