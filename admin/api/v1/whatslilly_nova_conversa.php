<?php
/*
 * Versao Bearer-token de admin/api/whats_api.php?action=nova_conversa —
 * cria (ou reaproveita) uma conversa por numero, autocompletando o nome
 * pelo cadastro de clientes quando nao informado.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados  = json_decode(file_get_contents('php://input'), true) ?: [];
$numero = preg_replace('/\D/', '', trim((string) ($dados['numero'] ?? '')));
$nome   = trim((string) ($dados['nome'] ?? ''));

if (strlen($numero) < 10) {
  echo json_encode(['ok' => false, 'msg' => 'Número inválido (mínimo 10 dígitos com DDD).'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

if (!$nome) {
  $numSuffix = '%' . substr($numero, -9) . '%';
  $stmt = $conn->prepare("
    SELECT nome FROM clientes
    WHERE loja_id = ? AND REPLACE(REPLACE(REPLACE(REPLACE(telefone,'(',''),')',''),'-',''),' ','') LIKE ?
    LIMIT 1
  ");
  $stmt->execute([$lojaId, $numSuffix]);
  $nome = (string) ($stmt->fetchColumn() ?: '');
}

$stmt = $conn->prepare("
  INSERT INTO whats_conversas (loja_id, numero, nome)
  VALUES (?, ?, ?)
  ON DUPLICATE KEY UPDATE id = id
");
$stmt->execute([$lojaId, $numero, $nome ?: null]);

$stmt = $conn->prepare("SELECT id FROM whats_conversas WHERE loja_id = ? AND numero = ? LIMIT 1");
$stmt->execute([$lojaId, $numero]);
$id = (int) $stmt->fetchColumn();

echo json_encode(['ok' => true, 'conversa_id' => $id, 'nome' => $nome ?: $numero], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
