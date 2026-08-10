<?php
session_start();
require_once __DIR__ . '/../config/database.php';

$login = trim((string) ($_POST['email'] ?? ($_POST['usuario'] ?? '')));
$senha = $_POST['senha'] ?? '';
$admin = null;
$lojaAtiva = null;

try {
  $stmt = $conn->prepare("
    SELECT a.*, l.ativo AS loja_ativo
    FROM admins a
    LEFT JOIN lojas l ON l.id = a.loja_id
    WHERE (LOWER(a.email) = LOWER(?) OR LOWER(a.usuario) = LOWER(?))
    LIMIT 1
  ");
  $stmt->execute([$login, $login]);
  $admin = $stmt->fetch(PDO::FETCH_ASSOC);
  $lojaAtiva = $admin ? (int) ($admin['loja_ativo'] ?? 0) : null;
  if ($admin && ($admin['perfil'] ?? '') !== 'superadmin') {
    $stmtLoja = $conn->prepare("SELECT ativo FROM lojas WHERE id = ? LIMIT 1");
    $stmtLoja->execute([(int) ($admin['loja_id'] ?? 0)]);
    $lojaAtiva = (int) $stmtLoja->fetchColumn();
  }
} catch (Exception $e) {
  $stmt = $conn->prepare("SELECT * FROM admins WHERE (LOWER(email) = LOWER(?) OR LOWER(usuario) = LOWER(?)) LIMIT 1");
  $stmt->execute([$login, $login]);
  $admin = $stmt->fetch(PDO::FETCH_ASSOC);
}

if ($admin && password_verify($senha, $admin['senha'])) {
  if ((int) ($admin['ativo'] ?? 0) !== 1) {
    if ($lojaAtiva === 1) {
      $stmt = $conn->prepare("UPDATE admins SET ativo = 1 WHERE id = ? LIMIT 1");
      $stmt->execute([(int) $admin['id']]);
      $admin['ativo'] = 1;
    } else {
      // Loja suspensa: permite login para redirecionar ao pagamento pendente
      $_SESSION['admin_id']   = $admin['id'];
      $_SESSION['admin_nome'] = $admin['nome'];
      $_SESSION['admin_email'] = $admin['email'] ?? '';
      $_SESSION['admin_perfil'] = $admin['perfil'] ?? 'admin';
      $_SESSION['loja_id'] = (int) ($admin['loja_id'] ?? 1);
      header("Location: pagamento.php");
      exit;
    }
  }
  $_SESSION['admin_id']   = $admin['id'];
  $_SESSION['admin_nome'] = $admin['nome'];
  $_SESSION['admin_email'] = $admin['email'] ?? '';
  $_SESSION['admin_perfil'] = $admin['perfil'] ?? 'admin';
  $_SESSION['loja_id'] = (int) ($admin['loja_id'] ?? 1);
  header("Location: dashboard.php");
  exit;
}

header("Location: index.php?erro=1");
exit;
