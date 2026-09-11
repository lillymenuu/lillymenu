<?php
/*
 * Versao JSON de admin/api/garcons_salvar.php para o novo frontend Next.js
 * (/waitermode), trocando sessao por token Bearer e POST tradicional por
 * corpo JSON.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/garcom_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

garcomEnsureModule($conn);

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($dados['id'] ?? 0);
$nome = trim((string) ($dados['nome'] ?? ''));
$email = trim((string) ($dados['email'] ?? ''));

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
