<?php
/*
 * Versao Bearer-token de admin/api/lista_transmissao_api.php?action=excluir
 * — apaga uma lista (membros somem via ON DELETE CASCADE).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/lista_transmissao_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
listaTransmissaoEnsureModule($conn);

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($dados['id'] ?? 0);

$stmt = $conn->prepare("DELETE FROM listas_transmissao WHERE id = ? AND loja_id = ?");
$stmt->execute([$id, $lojaId]);

if ($stmt->rowCount() === 0) {
  echo json_encode(['ok' => false, 'msg' => 'Lista não encontrada.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
