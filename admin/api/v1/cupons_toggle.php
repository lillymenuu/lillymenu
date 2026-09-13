<?php
/*
 * Versao JSON (Bearer token) de admin/api/cupons_toggle.php — porta 1:1.
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
  echo json_encode(['ok' => false, 'msg' => 'Cupom inválido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("UPDATE cupons SET ativo = ?, atualizado_em = NOW() WHERE id = ? AND loja_id = ?");
$stmt->execute([$ativo, $id, $lojaId]);

if ($stmt->rowCount() === 0) {
  echo json_encode(['ok' => false, 'msg' => 'Cupom não encontrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
