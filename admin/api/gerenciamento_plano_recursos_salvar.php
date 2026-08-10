<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/gerenciamento_module.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

gerenciamentoEnsureModule($conn);

$planoId = (int) ($_POST['plano_id'] ?? 0);
$semRestricao = (string) ($_POST['sem_restricao'] ?? '') === '1';
$recursos = $_POST['recursos'] ?? [];

if ($planoId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Plano inválido.']);
  exit;
}
if (!is_array($recursos)) {
  $recursos = [];
}
$recursos = array_values(array_filter(array_map('strval', $recursos), function ($v) {
  return strpos($v, 'menu.') === 0;
}));

try {
  $valor = $semRestricao ? null : json_encode($recursos, JSON_UNESCAPED_UNICODE);
  $stmt = $conn->prepare("UPDATE planos SET recursos_json = ? WHERE id = ?");
  $stmt->execute([$valor, $planoId]);
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar recursos do plano.']);
}
