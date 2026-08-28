<?php
session_start();
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/google_oauth.php';
require_once __DIR__ . '/helpers/google_auth_module.php';

$stateEsperado = $_SESSION['google_oauth_state'] ?? '';
unset($_SESSION['google_oauth_state']);

$state = $_GET['state'] ?? '';
$code = $_GET['code'] ?? '';

if (!googleOauthConfigurado() || $code === '' || $state === '' || !hash_equals($stateEsperado, $state)) {
  header("Location: login?erro=google_falha");
  exit;
}

$token = googleOauthTrocarCodigoPorToken($code);
if (!$token || empty($token['access_token'])) {
  header("Location: login?erro=google_falha");
  exit;
}

$perfil = googleOauthBuscarPerfil($token['access_token']);
$email = trim((string) ($perfil['email'] ?? ''));
$googleId = trim((string) ($perfil['sub'] ?? ''));
$emailVerificado = (bool) ($perfil['email_verified'] ?? false);

if ($email === '' || $googleId === '' || !$emailVerificado) {
  header("Location: login?erro=google_falha");
  exit;
}

googleAuthEnsureModule($conn);

$admin = null;
$lojaAtiva = null;
try {
  $stmt = $conn->prepare("
    SELECT a.*, l.ativo AS loja_ativo
    FROM admins a
    LEFT JOIN lojas l ON l.id = a.loja_id
    WHERE LOWER(a.email) = LOWER(?)
    LIMIT 1
  ");
  $stmt->execute([$email]);
  $admin = $stmt->fetch(PDO::FETCH_ASSOC);
  $lojaAtiva = $admin ? (int) ($admin['loja_ativo'] ?? 0) : null;
  if ($admin && ($admin['perfil'] ?? '') !== 'superadmin') {
    $stmtLoja = $conn->prepare("SELECT ativo FROM lojas WHERE id = ? LIMIT 1");
    $stmtLoja->execute([(int) ($admin['loja_id'] ?? 0)]);
    $lojaAtiva = (int) $stmtLoja->fetchColumn();
  }
} catch (Exception $e) {
  $admin = null;
}

if (!$admin) {
  header("Location: login?erro=google_sem_conta");
  exit;
}

if (empty($admin['google_id'])) {
  $stmt = $conn->prepare("UPDATE admins SET google_id = ? WHERE id = ? LIMIT 1");
  $stmt->execute([$googleId, (int) $admin['id']]);
}

if ((int) ($admin['ativo'] ?? 0) !== 1) {
  if ($lojaAtiva === 1) {
    $stmt = $conn->prepare("UPDATE admins SET ativo = 1 WHERE id = ? LIMIT 1");
    $stmt->execute([(int) $admin['id']]);
    $admin['ativo'] = 1;
  } else {
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
header("Location: dashboard");
exit;
