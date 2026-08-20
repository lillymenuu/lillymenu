<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/notificacoes_broadcast.php';
require_once __DIR__ . '/../../helpers/storage.php';

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  exit('Acesso restrito');
}

garantirNotificacoesBroadcastTabelas($conn);

$id = (int) ($_POST['id'] ?? 0);
$acao = $_POST['acao'] ?? '';

if ($id > 0 && $acao === 'cancelar') {
  try {
    $conn->prepare("UPDATE notificacoes_broadcast SET status = 'cancelada' WHERE id = ? AND status IN ('programada','enviada')")
      ->execute([$id]);
  } catch (Exception $e) {
  }
}

if ($id > 0 && $acao === 'reenviar') {
  try {
    $conn->beginTransaction();
    $conn->prepare("UPDATE notificacoes_broadcast SET status = 'enviada', enviado_em = ? WHERE id = ? AND status IN ('enviada','cancelada')")
      ->execute([date('Y-m-d H:i:s'), $id]);
    $conn->prepare("DELETE FROM notificacoes_broadcast_visualizacoes WHERE notificacao_id = ?")->execute([$id]);
    $conn->commit();
  } catch (Exception $e) {
    if ($conn->inTransaction()) {
      $conn->rollBack();
    }
  }
}

if ($id > 0 && $acao === 'excluir') {
  try {
    $stmt = $conn->prepare("SELECT imagem FROM notificacoes_broadcast WHERE id = ?");
    $stmt->execute([$id]);
    $imagem = $stmt->fetchColumn();

    $conn->beginTransaction();
    $conn->prepare("DELETE FROM notificacoes_broadcast_visualizacoes WHERE notificacao_id = ?")->execute([$id]);
    $conn->prepare("DELETE FROM notificacoes_broadcast WHERE id = ?")->execute([$id]);
    $conn->commit();

    if ($imagem) {
      storage_delete($imagem);
    }
  } catch (Exception $e) {
    if ($conn->inTransaction()) {
      $conn->rollBack();
    }
  }
}

header('Location: ../superadmin/notificacoes.php');
exit;
