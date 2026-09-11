<?php
/*
 * Versao JSON (Bearer token) de admin/api/usuarios_gerar_codigo.php — porta 1:1.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';

header('Content-Type: application/json; charset=utf-8');

$auth = apiAuthExigir($conn);
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['admin_perfil'] = $auth['perfil'];
$_SESSION['loja_id'] = $auth['loja_id'];

exigirAdminPrincipal($conn);

function gerarCodigoAcesso(PDO $conn): string {
  $alfabeto = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  $stmt = $conn->prepare("SELECT id FROM admins WHERE codigo_acesso = ? LIMIT 1");
  while (true) {
    $codigo = '';
    for ($i = 0; $i < 5; $i++) {
      $codigo .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
    }
    $stmt->execute([$codigo]);
    if (!$stmt->fetchColumn()) {
      return $codigo;
    }
  }
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
  $body = [];
}

$id = (int) ($body['id'] ?? 0);
$lojaId = $auth['loja_id'];

if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Usuario invalido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$colsAdmins = $conn->query("SHOW COLUMNS FROM admins")->fetchAll(PDO::FETCH_COLUMN, 0);
if (!in_array('codigo_acesso', $colsAdmins, true)) {
  try {
    $conn->exec("ALTER TABLE admins ADD COLUMN codigo_acesso VARCHAR(10) NULL");
    $conn->exec("ALTER TABLE admins ADD UNIQUE INDEX idx_admins_codigo_acesso (codigo_acesso)");
  } catch (Throwable $e2) {}
}

$stmt = $conn->prepare("SELECT email FROM admins WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$id, $lojaId]);
$emailAtual = $stmt->fetchColumn();
if ($emailAtual === false) {
  echo json_encode(['ok' => false, 'msg' => 'Usuario nao pertence a esta loja.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if (trim((string) $emailAtual) === '') {
  echo json_encode(['ok' => false, 'msg' => 'Cadastre um e-mail para este usuario antes de gerar o codigo de acesso.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$codigoGerado = gerarCodigoAcesso($conn);

try {
  $stmt = $conn->prepare("UPDATE admins SET codigo_acesso = ? WHERE id = ? AND loja_id = ?");
  $stmt->execute([$codigoGerado, $id, $lojaId]);
  echo json_encode(['ok' => true, 'codigo_acesso' => $codigoGerado], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao gerar codigo de acesso.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
