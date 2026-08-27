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

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = (int) ($_POST['id'] ?? 0);

if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Garçom inválido.']);
  exit;
}

$stmt = $conn->prepare("SELECT id FROM garcons WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$id, $lojaId]);
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Garçom não encontrado.']);
  exit;
}

$codigo = garcomGerarCodigoAcesso();
$hash = password_hash($codigo, PASSWORD_DEFAULT);

$conn->prepare("UPDATE garcons SET codigo_acesso_hash = ? WHERE id = ? AND loja_id = ?")
  ->execute([$hash, $id, $lojaId]);

echo json_encode(['ok' => true, 'codigo_acesso' => $codigo]);
