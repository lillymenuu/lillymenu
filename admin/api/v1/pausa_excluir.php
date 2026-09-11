<?php
/*
 * Versao JSON (Bearer token) de admin/api/pausa_delete.php — porta 1:1.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$id   = (int)($data['id'] ?? 0);

if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Pausa invalida.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

try {
  $stmt = $conn->prepare("DELETE FROM pausas_programadas WHERE id = ? AND loja_id = ?");
  $stmt->execute([$id, $lojaId]);

  echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao excluir pausa programada.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
