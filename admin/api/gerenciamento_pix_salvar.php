<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

$chavePix = trim((string) ($_POST['pix_chave'] ?? ''));
$nomePix = trim((string) ($_POST['pix_nome'] ?? ''));
$whatsNumero = trim((string) ($_POST['whats_numero'] ?? ''));

$configs = [
  'saas_pix_chave' => $chavePix,
  'saas_pix_nome' => $nomePix,
  'saas_whatsapp_numero' => $whatsNumero,
];

try {
  foreach ($configs as $chave => $valor) {
    $stmt = $conn->prepare("UPDATE configuracoes SET valor = ? WHERE loja_id = 0 AND chave = ?");
    $stmt->execute([$valor, $chave]);
    if ($stmt->rowCount() === 0) {
      $stmt = $conn->prepare("INSERT INTO configuracoes (loja_id, chave, valor) VALUES (0, ?, ?)");
      $stmt->execute([$chave, $valor]);
    }
  }
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar configuração.']);
}
