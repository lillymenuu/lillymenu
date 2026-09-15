<?php
/*
 * So o total de mensagens nao lidas do WhatsLilly, pro badge do item de
 * menu lateral — evita buscar a lista inteira de conversas so pra saber
 * o total. Endpoint novo, sem equivalente legado dedicado (o legado
 * calcula isso inline em admin/partials/sidebar.php a cada render).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$stmt = $conn->prepare("SHOW TABLES LIKE 'whats_conversas'");
$stmt->execute();
$total = 0;
if ($stmt->fetchColumn()) {
  $stmt = $conn->prepare("SELECT COALESCE(SUM(nao_lidas),0) FROM whats_conversas WHERE loja_id = ?");
  $stmt->execute([$lojaId]);
  $total = (int) $stmt->fetchColumn();
}

echo json_encode(['ok' => true, 'total_nao_lidas' => $total], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
