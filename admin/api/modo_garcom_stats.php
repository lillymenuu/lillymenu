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

$stmt = $conn->prepare("SELECT COUNT(*) FROM pedidos WHERE loja_id = ? AND mesa_id IS NOT NULL AND status = 'pendente'");
$stmt->execute([$lojaId]);
$pedidosPendentes = (int) $stmt->fetchColumn();

$stmt = $conn->prepare("SELECT COUNT(*) FROM mesas WHERE loja_id = ? AND ativo = 1");
$stmt->execute([$lojaId]);
$mesasAtivas = (int) $stmt->fetchColumn();

$stmt = $conn->prepare("SELECT COUNT(*) FROM garcons WHERE loja_id = ? AND ativo = 1");
$stmt->execute([$lojaId]);
$garconsAtivos = (int) $stmt->fetchColumn();

echo json_encode([
  'ok' => true,
  'pedidos_pendentes' => $pedidosPendentes,
  'mesas_ativas' => $mesasAtivas,
  'garcons_ativos' => $garconsAtivos,
]);
