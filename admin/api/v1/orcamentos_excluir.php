<?php
/*
 * Apaga um orcamento salvo (tela Quotes) — itens somem via ON DELETE
 * CASCADE. Endpoint novo (feature sem persistencia no legado).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($dados['id'] ?? 0);

$stmt = $conn->prepare("DELETE FROM orcamentos WHERE id = ? AND loja_id = ?");
$stmt->execute([$id, $lojaId]);

if ($stmt->rowCount() === 0) {
  echo json_encode(['ok' => false, 'msg' => 'Orçamento não encontrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

echo json_encode(['ok' => true, 'msg' => 'Orçamento apagado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
