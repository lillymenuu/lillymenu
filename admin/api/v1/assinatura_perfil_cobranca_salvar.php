<?php
/*
 * Versao JSON de admin/api/assinatura_perfil_cobranca_salvar.php para o
 * novo frontend Next.js (/plan-details), trocando sessao por token Bearer
 * e corpo POST tradicional por JSON.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados    = json_decode(file_get_contents('php://input'), true) ?: [];
$cpf      = trim((string) ($dados['cpf'] ?? ''));
$telefone = trim((string) ($dados['telefone'] ?? ''));

try {
  $stmt = $conn->prepare("
    INSERT INTO configuracoes (loja_id, chave, valor)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE valor = VALUES(valor), loja_id = VALUES(loja_id)
  ");
  $stmt->execute([$lojaId, 'cobranca_cpf', $cpf]);
  $stmt->execute([$lojaId, 'cobranca_telefone', $telefone]);
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar perfil de cobranca.']);
}
