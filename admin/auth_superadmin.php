<?php
session_start();
require_once __DIR__ . '/../config/database.php';

$email = $_POST['email'] ?? '';
$senha = $_POST['senha'] ?? '';

$stmt = $conn->prepare(
  "SELECT * FROM admins WHERE email = ? AND ativo = 1 AND perfil = 'superadmin' LIMIT 1"
);
$stmt->execute([$email]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC);

if ($admin && password_verify($senha, $admin['senha'])) {
  $_SESSION['admin_id']   = $admin['id'];
  $_SESSION['admin_nome'] = $admin['nome'];
  $_SESSION['admin_email'] = $admin['email'] ?? '';
  $_SESSION['admin_perfil'] = $admin['perfil'] ?? 'superadmin';
  $_SESSION['loja_id'] = (int) ($admin['loja_id'] ?? 1);
  header("Location: superadmin/dashboard.php");
  exit;
}

header("Location: superadmin_login.php?erro=1");
exit;
