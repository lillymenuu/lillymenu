<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

$ativo = ((string) ($_POST['ativo'] ?? '0')) === '1' ? '1' : '0';

try {
  $stmt = $conn->prepare("UPDATE configuracoes SET valor = ? WHERE loja_id = 0 AND chave = 'saas_nominatim_ativo'");
  $stmt->execute([$ativo]);
  if ($stmt->rowCount() === 0) {
    $stmt = $conn->prepare("INSERT INTO configuracoes (loja_id, chave, valor) VALUES (0, 'saas_nominatim_ativo', ?)");
    $stmt->execute([$ativo]);
  }
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar configuração.']);
}
