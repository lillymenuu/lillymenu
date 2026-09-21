<?php
/* Versao JSON de admin/api/suporte_unread.php (lado da loja): mensagens do suporte ainda nao lidas. */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/suporte_chat.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

suporteGarantirTabelas($conn);

try {
  $stmt = $conn->prepare("SELECT COUNT(*) FROM suporte_mensagens WHERE loja_id = ? AND remetente = 'suporte' AND lida_loja = 0");
  $stmt->execute([$lojaId]);
  echo json_encode(['ok' => true, 'unread' => (int) $stmt->fetchColumn()]);
} catch (Exception $e) {
  echo json_encode(['ok' => true, 'unread' => 0]);
}
