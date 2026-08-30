<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/acesso_menu.php';
require_once __DIR__ . '/../helpers/garcom_module.php';

header('Content-Type: application/json');

if (!acessoMenuPermitido($conn, 'menu.modo_garcom')) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

garcomEnsureModule($conn);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = (int) ($_POST['id'] ?? 0);
if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Mesa inválida.']);
  exit;
}

$stmtAberto = $conn->prepare("SELECT COUNT(*) FROM pedidos WHERE loja_id = ? AND mesa_id = ? AND status NOT IN ('finalizado','cancelado')");
$stmtAberto->execute([$lojaId, $id]);
if ((int) $stmtAberto->fetchColumn() > 0) {
  echo json_encode(['ok' => false, 'msg' => 'Essa mesa tem um pedido em aberto e não pode ser excluída.']);
  exit;
}

$stmt = $conn->prepare("DELETE FROM mesas WHERE id = ? AND loja_id = ?");
$stmt->execute([$id, $lojaId]);

echo json_encode(['ok' => true]);
