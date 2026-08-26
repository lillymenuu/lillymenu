<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/acesso_menu.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

if (!acessoMenuPermitido($conn, 'menu.promo')) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$ativo = isset($_POST['ativo']) ? (int) $_POST['ativo'] : null;

if ($ativo !== 0 && $ativo !== 1) {
  echo json_encode(['ok' => false]);
  exit;
}

$stmt = $conn->prepare("
  INSERT INTO configuracoes (loja_id, chave, valor)
  VALUES (?, 'loja_flyers_ativo', ?)
  ON DUPLICATE KEY UPDATE valor = VALUES(valor)
");
$stmt->execute([$lojaId, (string) $ativo]);

bumpCatalogoVersao($conn, $lojaId);

echo json_encode(['ok' => true]);
