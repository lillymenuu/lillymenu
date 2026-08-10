<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/notificacoes_broadcast.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') === 'superadmin') {
  echo json_encode(['ok' => true, 'notificacao' => null]);
  exit;
}

garantirNotificacoesBroadcastTabelas($conn);
notificacoesMarcarProgramadasVencidas($conn);

$lojaId = (int) ($_SESSION['loja_id'] ?? 0);
$notificacao = notificacaoAtivaParaLoja($conn, $lojaId);

echo json_encode(['ok' => true, 'notificacao' => $notificacao]);
