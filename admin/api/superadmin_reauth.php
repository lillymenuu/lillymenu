<?php
session_start();
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

$login = trim((string) ($_POST['login'] ?? ''));
$senha = (string) ($_POST['senha'] ?? '');

if ($login === '' || $senha === '') {
  echo json_encode(['ok' => false, 'msg' => 'Informe email/usuario e senha.']);
  exit;
}

try {
  $stmt = $conn->prepare("
    SELECT *
    FROM admins
    WHERE (LOWER(email) = LOWER(?) OR LOWER(usuario) = LOWER(?))
      AND ativo = 1
      AND perfil = 'superadmin'
    LIMIT 1
  ");
  $stmt->execute([$login, $login]);
  $admin = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
  $admin = null;
}

if ($admin && password_verify($senha, $admin['senha'])) {
  $_SESSION['admin_id']   = $admin['id'];
  $_SESSION['admin_nome'] = $admin['nome'];
  $_SESSION['admin_email'] = $admin['email'] ?? '';
  $_SESSION['admin_perfil'] = $admin['perfil'] ?? 'superadmin';
  $_SESSION['loja_id'] = (int) ($admin['loja_id'] ?? 1);
  echo json_encode(['ok' => true]);
  exit;
}

echo json_encode(['ok' => false, 'msg' => 'Usuario ou senha incorretos.']);
