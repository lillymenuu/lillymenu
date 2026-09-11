<?php
/*
 * Versao JSON (Bearer token) de admin/api/verificacao_confirmar.php — porta 1:1.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/config.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$codigo = trim((string) ($body['codigo'] ?? ''));

if (!preg_match('/^\d{6}$/', $codigo)) {
  echo json_encode(['ok'=>false,'msg'=>'Código inválido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}

$codigoSalvo = config($conn, 'verificacao_codigo', '', $lojaId);
$expira      = config($conn, 'verificacao_expira', '', $lojaId);

if (!$codigoSalvo || !$expira) {
  echo json_encode(['ok'=>false,'msg'=>'Nenhum código pendente. Solicite um novo.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}

if (new DateTime() > new DateTime($expira)) {
  echo json_encode(['ok'=>false,'msg'=>'Código expirado. Solicite um novo.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}

if (!hash_equals($codigoSalvo, $codigo)) {
  echo json_encode(['ok'=>false,'msg'=>'Código incorreto. Verifique e tente novamente.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}

$upsert = "INSERT INTO configuracoes (loja_id, chave, valor) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE valor = VALUES(valor)";
$conn->prepare($upsert)->execute([$lojaId, 'loja_verificada', '1']);

$conn->prepare("DELETE FROM configuracoes WHERE loja_id=? AND chave IN ('verificacao_codigo','verificacao_expira')")
     ->execute([$lojaId]);

echo json_encode(['ok'=>true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
