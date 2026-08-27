<?php
session_start();
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

$email = trim((string) ($_POST['email'] ?? ''));
$codigo = strtoupper(trim((string) ($_POST['codigo'] ?? '')));
$lojaId = (int) ($_POST['loja_id'] ?? 0);

if ($email === '' || $codigo === '' || $lojaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Informe o e-mail e o código de acesso.']);
  exit;
}

$stmt = $conn->prepare("SELECT * FROM garcons WHERE loja_id = ? AND email = ? AND ativo = 1 LIMIT 1");
$stmt->execute([$lojaId, $email]);
$garcom = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$garcom || !password_verify($codigo, $garcom['codigo_acesso_hash'])) {
  echo json_encode(['ok' => false, 'msg' => 'E-mail ou código inválido.']);
  exit;
}

$_SESSION['garcom_id'] = (int) $garcom['id'];
$_SESSION['garcom_nome'] = $garcom['nome'];
$_SESSION['garcom_loja_id'] = (int) $garcom['loja_id'];

echo json_encode(['ok' => true]);
