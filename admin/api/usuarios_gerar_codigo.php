<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

exigirAdminPrincipal($conn);

function gerarCodigoAcesso(PDO $conn): string {
  /* codigo_acesso tem indice UNIQUE global na tabela admins. */
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

$id = (int) ($_POST['id'] ?? 0);
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Usuario invalido.']);
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
  echo json_encode(['ok' => false, 'msg' => 'Usuario nao pertence a esta loja.']);
  exit;
}
if (trim((string) $emailAtual) === '') {
  echo json_encode(['ok' => false, 'msg' => 'Cadastre um e-mail para este usuario antes de gerar o codigo de acesso.']);
  exit;
}

$codigoGerado = gerarCodigoAcesso($conn);

try {
  $stmt = $conn->prepare("UPDATE admins SET codigo_acesso = ? WHERE id = ? AND loja_id = ?");
  $stmt->execute([$codigoGerado, $id, $lojaId]);
  echo json_encode(['ok' => true, 'codigo_acesso' => $codigoGerado]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao gerar codigo de acesso.']);
}
