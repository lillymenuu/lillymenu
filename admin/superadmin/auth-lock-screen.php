<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../../helpers/storage.php';

if (!isset($_SESSION['admin_id'])) {
  header('Location: ../index.php');
  exit;
}

$adminId = (int) $_SESSION['admin_id'];
$stmt = $conn->prepare("SELECT id, nome, senha, foto FROM admins WHERE id = ? LIMIT 1");
$stmt->execute([$adminId]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$admin) {
  header('Location: ../logout.php');
  exit;
}

$_SESSION['locked'] = true;

$erro = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $senha = (string) ($_POST['senha'] ?? '');
  if ($senha !== '' && password_verify($senha, (string) ($admin['senha'] ?? ''))) {
    unset($_SESSION['locked']);
    header('Location: dashboard.php');
    exit;
  }
  $erro = 'Senha incorreta. Tente novamente.';
}

$nome = trim((string) ($admin['nome'] ?? 'Admin'));
$iniciais = dashIniciais($nome);
$fotoUrl = storage_url_admin_sub($admin['foto'] ?? '');
$lockCssVer = filemtime(__DIR__ . '/assets/css/auth-lock-screen.css');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tela de bloqueio - LillyMenu Admin</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="shortcut icon" href="../assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="../assets/img/favicon_store.png">
<link href="assets/css/auth-lock-screen.css?v=<?= $lockCssVer ?>" rel="stylesheet">
</head>
<body>
  <div class="lock-page">
    <div class="lock-brand">
      <div class="lock-brand-dot">
        <svg viewBox="0 0 24 24"><path d="M3 4h7v7H3z"/><path d="M14 4h7v7h-7z"/><path d="M3 13h7v7H3z"/><path d="M14 13h7v7h-7z"/></svg>
      </div>
      <span>Lilly Menu</span>
    </div>

    <div class="lock-card">
      <h1 class="lock-title">Tela de bloqueio</h1>
      <p class="lock-sub">Digite sua senha para desbloquear a tela!</p>

      <div class="lock-avatar">
        <?php if ($fotoUrl): ?>
          <img src="<?= htmlspecialchars($fotoUrl) ?>" alt="">
        <?php else: ?>
          <?= htmlspecialchars($iniciais) ?>
        <?php endif; ?>
      </div>
      <div class="lock-name"><?= htmlspecialchars($nome) ?></div>

      <form method="POST" class="lock-form">
        <label class="lock-label" for="lockSenha">Senha</label>
        <div class="lock-input-wrap">
          <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>
          <input type="password" id="lockSenha" name="senha" placeholder="Digite a senha" autofocus required>
        </div>
        <?php if ($erro): ?><div class="lock-erro"><?= htmlspecialchars($erro) ?></div><?php endif; ?>
        <button type="submit" class="lock-btn">Desbloquear</button>
      </form>

      <div class="lock-footer-link">Não é você? Voltar <a href="../logout.php">ao início. Entrar.</a></div>
    </div>

    <div class="lock-copyright">&copy; <?= date('Y') ?> LillyMenu Admin.</div>
  </div>
</body>
</html>
