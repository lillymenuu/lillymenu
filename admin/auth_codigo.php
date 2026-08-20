<?php
session_start();
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

$codigo = strtoupper(trim((string) ($_POST['codigo'] ?? '')));
$email = trim((string) ($_POST['email'] ?? ''));

if ($codigo === '' || $email === '') {
  echo json_encode(['ok' => false, 'msg' => 'Informe o e-mail e o codigo de acesso.']);
  exit;
}

$admin = null;
$lojaAtiva = null;

try {
  $stmt = $conn->prepare("
    SELECT a.*, l.ativo AS loja_ativo
    FROM admins a
    LEFT JOIN lojas l ON l.id = a.loja_id
    WHERE a.codigo_acesso = ? AND a.email = ? AND a.ativo = 1
    LIMIT 1
  ");
  $stmt->execute([$codigo, $email]);
  $admin = $stmt->fetch(PDO::FETCH_ASSOC);
  $lojaAtiva = $admin ? (int) ($admin['loja_ativo'] ?? 0) : null;
  if ($admin && ($admin['perfil'] ?? '') !== 'superadmin') {
    $stmtLoja = $conn->prepare("SELECT ativo FROM lojas WHERE id = ? LIMIT 1");
    $stmtLoja->execute([(int) ($admin['loja_id'] ?? 0)]);
    $lojaAtiva = (int) $stmtLoja->fetchColumn();
  }
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao validar codigo.']);
  exit;
}

if (!$admin) {
  echo json_encode(['ok' => false, 'msg' => 'E-mail ou codigo invalido.']);
  exit;
}

/* codigo de uso unico: invalida assim que usado, mesmo se o login falhar
   adiante (loja suspensa etc.) — o gerente gera um novo quando precisar. */
$stmt = $conn->prepare("UPDATE admins SET codigo_acesso = NULL WHERE id = ?");
$stmt->execute([(int) $admin['id']]);

if ($lojaAtiva !== 1) {
  $_SESSION['admin_id']   = $admin['id'];
  $_SESSION['admin_nome'] = $admin['nome'];
  $_SESSION['admin_email'] = $admin['email'] ?? '';
  $_SESSION['admin_perfil'] = $admin['perfil'] ?? 'admin';
  $_SESSION['loja_id'] = (int) ($admin['loja_id'] ?? 1);
  echo json_encode(['ok' => true, 'redirect' => 'pagamento.php']);
  exit;
}

$_SESSION['admin_id']   = $admin['id'];
$_SESSION['admin_nome'] = $admin['nome'];
$_SESSION['admin_email'] = $admin['email'] ?? '';
$_SESSION['admin_perfil'] = $admin['perfil'] ?? 'admin';
$_SESSION['loja_id'] = (int) ($admin['loja_id'] ?? 1);
echo json_encode(['ok' => true, 'redirect' => 'dashboard']);
