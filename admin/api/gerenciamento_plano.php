<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

$lojaId = (int) ($_POST['loja_id'] ?? 0);
$planoId = (int) ($_POST['plano_id'] ?? 0);

if ($lojaId <= 0 || $planoId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Dados inválidos.']);
  exit;
}

try {
  $stmt = $conn->prepare("SELECT id FROM planos WHERE id = ? AND ativo = 1 LIMIT 1");
  $stmt->execute([$planoId]);
  if (!$stmt->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Plano não encontrado.']);
    exit;
  }

  $stmt = $conn->prepare("SELECT id FROM assinaturas WHERE loja_id = ? ORDER BY id DESC LIMIT 1");
  $stmt->execute([$lojaId]);
  $assinaturaId = (int) $stmt->fetchColumn();

  if ($assinaturaId > 0) {
    $conn->prepare("UPDATE assinaturas SET plano_id = ? WHERE id = ?")->execute([$planoId, $assinaturaId]);
  } else {
    $conn->prepare("
      INSERT INTO assinaturas (loja_id, plano_id, status, trial_inicio, trial_fim)
      VALUES (?, ?, 'trial', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY))
    ")->execute([$lojaId, $planoId]);
  }

  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao atualizar plano.']);
}
