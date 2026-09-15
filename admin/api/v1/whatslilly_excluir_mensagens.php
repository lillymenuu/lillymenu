<?php
/*
 * Versao Bearer-token de admin/api/whats_api.php?action=excluir_mensagens
 * — apaga mensagens selecionadas, escopado por loja via join com
 * whats_conversas.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$ids   = array_values(array_filter(array_map('intval', $dados['ids'] ?? [])));

if (!$ids) {
  echo json_encode(['ok' => false, 'msg' => 'Nenhuma mensagem selecionada.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$ph   = implode(',', array_fill(0, count($ids), '?'));
$stmt = $conn->prepare(
  "DELETE wm FROM whats_mensagens wm
   JOIN whats_conversas wc ON wc.id = wm.conversa_id
   WHERE wm.id IN ($ph) AND wc.loja_id = ?"
);
$stmt->execute([...$ids, $lojaId]);

echo json_encode(['ok' => true, 'deletadas' => $stmt->rowCount()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
