<?php
/*
 * Troca so o status de um orcamento salvo (tela Quotes) — acao rapida a
 * partir da listagem (aprovar/recusar sem reabrir o form completo).
 * Endpoint novo (feature sem persistencia no legado).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($dados['id'] ?? 0);
$status = (string) ($dados['status'] ?? '');

if (!in_array($status, ['pendente', 'aprovado', 'recusado'], true)) {
  echo json_encode(['ok' => false, 'msg' => 'Status inválido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("UPDATE orcamentos SET status = ?, atualizado_em = NOW() WHERE id = ? AND loja_id = ?");
$stmt->execute([$status, $id, $lojaId]);

if ($stmt->rowCount() === 0) {
  $check = $conn->prepare("SELECT id FROM orcamentos WHERE id = ? AND loja_id = ? LIMIT 1");
  $check->execute([$id, $lojaId]);
  if (!$check->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Orçamento não encontrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }
}

echo json_encode(['ok' => true, 'msg' => 'Status atualizado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
