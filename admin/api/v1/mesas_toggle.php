<?php
/*
 * Versao JSON de admin/api/mesas_toggle.php para o novo frontend Next.js
 * (/waitermode), trocando sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($dados['id'] ?? 0);
$ativo = isset($dados['ativo']) ? (int) $dados['ativo'] : null;

if ($id <= 0 || ($ativo !== 0 && $ativo !== 1)) {
  echo json_encode(['ok' => false]);
  exit;
}

$stmt = $conn->prepare("UPDATE mesas SET ativo = ? WHERE id = ? AND loja_id = ?");
$stmt->execute([$ativo, $id, $lojaId]);

echo json_encode(['ok' => true]);
