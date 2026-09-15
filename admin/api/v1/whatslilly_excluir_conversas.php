<?php
/*
 * Versao Bearer-token de admin/api/whats_api.php?action=excluir_conversas
 * — apaga conversas inteiras (e suas mensagens) selecionadas.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$ids   = array_values(array_filter(array_map('intval', $dados['ids'] ?? [])));

if (!$ids) {
  echo json_encode(['ok' => false, 'msg' => 'Nenhuma conversa selecionada.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$ph = implode(',', array_fill(0, count($ids), '?'));

$stmt = $conn->prepare(
  "DELETE wm FROM whats_mensagens wm
   JOIN whats_conversas wc ON wc.id = wm.conversa_id
   WHERE wm.conversa_id IN ($ph) AND wc.loja_id = ?"
);
$stmt->execute([...$ids, $lojaId]);

$stmt = $conn->prepare("DELETE FROM whats_conversas WHERE id IN ($ph) AND loja_id = ?");
$stmt->execute([...$ids, $lojaId]);

echo json_encode(['ok' => true, 'deletadas' => $stmt->rowCount()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
