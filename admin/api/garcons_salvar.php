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
$nome = trim((string) ($_POST['nome'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));

if ($nome === '') {
  echo json_encode(['ok' => false, 'msg' => 'Informe o nome do garçom.']);
  exit;
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  echo json_encode(['ok' => false, 'msg' => 'Informe um e-mail válido.']);
  exit;
}

$stmtDup = $conn->prepare("SELECT id FROM garcons WHERE loja_id = ? AND email = ? AND id != ? LIMIT 1");
$stmtDup->execute([$lojaId, $email, $id]);
if ($stmtDup->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Já existe um garçom com esse e-mail.']);
  exit;
}

if ($id > 0) {
  $stmt = $conn->prepare("UPDATE garcons SET nome = ?, email = ? WHERE id = ? AND loja_id = ?");
  $stmt->execute([$nome, $email, $id, $lojaId]);
  echo json_encode(['ok' => true, 'id' => $id]);
  exit;
}

$codigo = garcomGerarCodigoAcesso();
$hash = password_hash($codigo, PASSWORD_DEFAULT);

$conn->prepare("
  INSERT INTO garcons(loja_id, nome, email, codigo_acesso_hash, ativo, criado_em)
  VALUES(?, ?, ?, ?, 1, NOW())
")->execute([$lojaId, $nome, $email, $hash]);
$novoId = (int) $conn->lastInsertId();

echo json_encode(['ok' => true, 'id' => $novoId, 'codigo_acesso' => $codigo]);
