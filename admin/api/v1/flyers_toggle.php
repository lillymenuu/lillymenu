<?php
/*
 * Versao JSON de admin/api/flyers_toggle.php para o novo frontend Next.js
 * (/promotion).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$ativo = isset($dados['ativo']) ? (int) $dados['ativo'] : null;

if ($ativo !== 0 && $ativo !== 1) {
  echo json_encode(['ok' => false]);
  exit;
}

$stmt = $conn->prepare("
  INSERT INTO configuracoes (loja_id, chave, valor)
  VALUES (?, 'loja_flyers_ativo', ?)
  ON DUPLICATE KEY UPDATE valor = VALUES(valor)
");
$stmt->execute([$lojaId, (string) $ativo]);

bumpCatalogoVersao($conn, $lojaId);

echo json_encode(['ok' => true]);
