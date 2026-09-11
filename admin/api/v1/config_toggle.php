<?php
/*
 * Versao JSON (Bearer token) de admin/api/config_toggle.php — porta 1:1.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$chavesPermitidas = ['versiculo_dashboard_ativo'];

$data  = json_decode(file_get_contents('php://input'), true) ?? [];
$chave = (string) ($data['chave'] ?? '');
$ativo = !empty($data['ativo']);

if (!in_array($chave, $chavesPermitidas, true)) {
  echo json_encode(['ok' => false, 'msg' => 'Configuracao invalida.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

try {
  $stmt = $conn->prepare("
    INSERT INTO configuracoes (loja_id, chave, valor)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
  ");
  $stmt->execute([$lojaId, $chave, $ativo ? '1' : '0']);

  echo json_encode(['ok' => true, 'ativo' => $ativo], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
