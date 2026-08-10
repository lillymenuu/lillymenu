<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/notificacoes_broadcast.php';

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['admin_id'])) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

garantirNotificacoesBroadcastTabelas($conn);

$notificacaoId = (int) ($_POST['notificacao_id'] ?? 0);
$lojaId = (int) ($_SESSION['loja_id'] ?? 0);

if ($notificacaoId <= 0 || $lojaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Dados invalidos.']);
  exit;
}

try {
  $stmt = $conn->prepare("
    INSERT INTO notificacoes_broadcast_visualizacoes (notificacao_id, loja_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE visualizado_em = VALUES(visualizado_em)
  ");
  $stmt->execute([$notificacaoId, $lojaId]);
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao registrar visualizacao.']);
}
