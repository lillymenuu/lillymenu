<?php
/* Quem esta logado no painel do superadmin (Next.js) + contador de mensagens de suporte nao lidas. */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/superadmin_auth.php';
require_once __DIR__ . '/../../helpers/suporte_chat.php';

header('Content-Type: application/json; charset=utf-8');

$auth = apiSuperadminExigir($conn);
suporteGarantirTabelas($conn);

$email = '';
try {
  $stmt = $conn->prepare("SELECT email FROM admins WHERE id = ? LIMIT 1");
  $stmt->execute([$auth['admin_id']]);
  $email = (string) $stmt->fetchColumn();
} catch (Exception $e) {
}

$unread = 0;
try {
  $unread = (int) $conn->query("SELECT COUNT(*) FROM suporte_mensagens WHERE remetente = 'loja' AND lida_suporte = 0")->fetchColumn();
} catch (Exception $e) {
}

echo json_encode([
  'ok'     => true,
  'admin'  => ['nome' => $auth['nome'], 'email' => $email],
  'unread' => $unread,
], JSON_UNESCAPED_UNICODE);
