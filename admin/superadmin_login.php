<?php
session_start();
require_once __DIR__ . '/../config/database.php';

$erro = isset($_GET['erro']);
$reset = isset($_GET['reset']) && $_GET['reset'] === '1';
$createdSuperadmin = false;
$resetRealizado = false;
$credEmail = '';
$credSenha = '';

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

try {
  if (tabelaExiste($conn, 'admins')) {
    $stmt = $conn->query("SELECT COUNT(*) FROM admins WHERE perfil = 'superadmin'");
    $temSuper = (int) $stmt->fetchColumn();
    if ($reset && $temSuper > 0) {
      $conn->prepare("UPDATE admins SET ativo = 0 WHERE perfil = 'superadmin'")->execute();
      $resetRealizado = true;
    }

    if ($reset || $temSuper === 0) {
      $lojaId = 1;
      if (tabelaExiste($conn, 'lojas')) {
        $stmt = $conn->query("SELECT id FROM lojas ORDER BY id ASC LIMIT 1");
        $lojaId = (int) $stmt->fetchColumn();
        if ($lojaId <= 0) {
          $conn->prepare("INSERT INTO lojas (nome, ativo) VALUES ('Loja principal', 1)")->execute();
          $lojaId = (int) $conn->lastInsertId();
        }
      }

      $emailBase = 'superadmin@local';
      $usuarioBase = 'superadmin';
      $email = $emailBase;
      $usuario = $usuarioBase;

      $stmt = $conn->prepare("SELECT COUNT(*) FROM admins WHERE email = ? OR usuario = ?");
      $stmt->execute([$email, $usuario]);
      if ((int) $stmt->fetchColumn() > 0) {
        $suffix = random_int(1000, 9999);
        $email = "superadmin{$suffix}@local";
        $usuario = "superadmin{$suffix}";
      }

      $credSenha = 'Super@' . random_int(1000, 9999);
      $hash = password_hash($credSenha, PASSWORD_DEFAULT);

      $stmt = $conn->prepare("SHOW COLUMNS FROM admins LIKE 'loja_id'");
      $temLojaId = (bool) $stmt->fetch(PDO::FETCH_ASSOC);

      if ($temLojaId) {
        $stmt = $conn->prepare("
          INSERT INTO admins (nome, usuario, email, senha, perfil, ativo, loja_id)
          VALUES (?, ?, ?, ?, 'superadmin', 1, ?)
        ");
        $stmt->execute(['Superadmin', $usuario, $email, $hash, $lojaId]);
      } else {
        $stmt = $conn->prepare("
          INSERT INTO admins (nome, usuario, email, senha, perfil, ativo)
          VALUES (?, ?, ?, ?, 'superadmin', 1)
        ");
        $stmt->execute(['Superadmin', $usuario, $email, $hash]);
      }

      $createdSuperadmin = true;
      $credEmail = $email;
    }
  }
} catch (Exception $e) {
  // silencioso para nao quebrar login
}
$loginCssVer = filemtime(__DIR__ . '/superadmin/assets/css/superadmin-login.css');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Login Superadmin</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
<link href="superadmin/assets/css/superadmin-login.css?v=<?= $loginCssVer ?>" rel="stylesheet">
</head>
<body>
  <div class="login-page">
    <div class="login-brand">
      <div class="login-brand-dot">
        <svg viewBox="0 0 24 24"><path d="M3 4h7v7H3z"/><path d="M14 4h7v7h-7z"/><path d="M3 13h7v7H3z"/><path d="M14 13h7v7h-7z"/></svg>
      </div>
      <span>Lilly Menu</span>
    </div>

    <div class="login-card">
      <h1 class="login-title">Bem vindo de volta !</h1>
      <p class="login-sub">Faça login para continuar no painel de administração web.</p>

      <?php if ($createdSuperadmin): ?>
        <div class="login-alert">
          <?= $resetRealizado ? 'Superadmin resetado com sucesso.' : 'Superadmin inicial criado automaticamente.' ?><br>
          <strong>Email:</strong> <?= htmlspecialchars($credEmail) ?><br>
          <strong>Senha:</strong> <?= htmlspecialchars($credSenha) ?>
        </div>
      <?php endif; ?>
      <?php if ($erro): ?>
        <div class="login-alert login-alert--danger">Credenciais inválidas ou usuário sem perfil superadmin.</div>
      <?php endif; ?>

      <form class="login-form" method="POST" action="auth_superadmin.php">
        <div class="login-field">
          <label class="login-label" for="loginEmail">Nome de usuário</label>
          <div class="login-input-wrap">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>
            <input type="email" id="loginEmail" name="email" placeholder="Digite o nome de usuário" required>
          </div>
        </div>
        <div class="login-field">
          
          <div class="login-input-wrap">
            <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>
            <input type="password" id="loginSenha" name="senha" placeholder="Digite a senha" required>
            <button type="button" class="login-eye" id="loginEyeBtn" aria-label="Mostrar senha">
              <svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <label class="login-remember">
          <input type="checkbox" name="lembrar" value="1">
          Lembre de mim
        </label>

        <button type="submit" class="login-btn">Conecte-se</button>
      </form>

      <div class="login-divider">Faça login com</div>
      <div class="login-social">
        <button type="button" class="login-social-btn login-social-btn--fb" aria-label="Facebook">f</button>
        <button type="button" class="login-social-btn login-social-btn--li" aria-label="LinkedIn">in</button>
        <button type="button" class="login-social-btn login-social-btn--go" aria-label="Google">G</button>
      </div>
    </div>

    <div class="login-copyright">&copy; <?= date('Y') ?> LillyMenu Admin.</div>
  </div>

  <script>
    const loginEyeBtn = document.getElementById('loginEyeBtn');
    const loginSenha = document.getElementById('loginSenha');
    loginEyeBtn?.addEventListener('click', () => {
      const show = loginSenha.type === 'password';
      loginSenha.type = show ? 'text' : 'password';
      loginEyeBtn.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    });
  </script>
</body>
</html>

