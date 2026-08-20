<?php
session_start();
$erro = $_GET['erro'] ?? '';
$erroTitle = 'Usuário ou senha incorretos';
$erroMsg = 'Verifique os dados informados e tente novamente.';
if ($erro === 'inativo') {
  $erroTitle = 'Acesso aguardando liberação';
  $erroMsg = 'Sua loja ainda não foi liberada pelo administrador.';
} elseif ($erro === 'google_sem_conta') {
  $erroTitle = 'Conta não encontrada';
  $erroMsg = 'Nenhuma conta cadastrada com esse e-mail do Google. Cadastre-se primeiro ou entre com e-mail e senha.';
} elseif ($erro === 'google_falha') {
  $erroTitle = 'Não foi possível entrar com Google';
  $erroMsg = 'Ocorreu um erro ao autenticar com o Google. Tente novamente.';
} elseif ($erro === 'google_nao_configurado') {
  $erroTitle = 'Login com Google indisponível';
  $erroMsg = 'O login com Google ainda não foi configurado neste sistema.';
}
$indexCssVer = filemtime(__DIR__ . '/assets/css/index.css');
$indexJsVer = filemtime(__DIR__ . '/assets/js/index.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Login – LillyMenu</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

<link href="./assets/css/index.css?v=<?= $indexCssVer ?>" rel="stylesheet">
</head>
<body>

<div class="lp-card">

  <!-- ── LEFT: FORM ── -->
  <div class="lp-left">

    <div class="lp-logo">
      <img src="./assets/img/favicon_store.png" alt="Logo">
      <span class="lp-logo-name">Lilly<span>Menu</span></span>
    </div>

    <div id="lpLoginView">
      <h1 class="lp-heading">Entrar</h1>
      <p class="lp-sub">Bem-vindo de volta! Insira seus dados para acessar.</p>

      <form method="POST" action="auth.php">

        <div class="lp-field">
          <label class="lp-label" for="email">E-mail</label>
          <input class="lp-input" type="email" id="email" name="email"
                 placeholder="Digite seu e-mail" required>
        </div>

        <div class="lp-field">
          <label class="lp-label" for="senha">Senha</label>
          <div class="lp-pass-wrap">
            <input class="lp-input" type="password" id="senha" name="senha"
                   placeholder="••••••••" required>
            <button type="button" class="lp-pass-toggle" onclick="toggleSenha()" tabindex="-1">
              <i class="bi bi-eye" id="eyeIcon"></i>
            </button>
          </div>
        </div>

        <div class="lp-remember">

          <a class="lp-forgot" href="#" data-bs-toggle="modal" data-bs-target="#resetModal">
            Esqueci a senha
          </a>
        </div>

        <button type="submit" class="lp-btn-submit">Entrar</button>

        <div class="lp-or">OU</div>

        <div class="lp-social">
          <a href="google_login.php" class="lp-social-btn">
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
              <path d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" fill="#FFC107"/>
              <path d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" fill="#FF3D00"/>
              <path d="M24 44c5.5 0 10.4-2 14.1-5.3l-6.5-5.5C29.6 35 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.6 5.1C9.6 39.6 16.3 44 24 44z" fill="#4CAF50"/>
              <path d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.5 5.5C37.5 39 44 34 44 24c0-1.2-.1-2.4-.4-3.5z" fill="#1976D2"/>
            </svg>
            Entrar com Google
          </a>
          <button type="button" class="lp-social-btn" id="btnAbrirCodigoAcesso">
            <i class="bi bi-hash"></i>
            Código de acesso rápido
          </button>
        </div>

      </form>
    </div>

    <div class="lp-code-view d-none" id="lpCodeView">
      <button type="button" class="lp-code-back" id="btnVoltarLogin">
        <i class="bi bi-arrow-left"></i> Voltar
      </button>
      <h1 class="lp-heading">Insira seu código</h1>
      <p class="lp-sub">Digite seu e-mail e o código de 5 dígitos que sua equipe compartilhou.</p>

      <div class="lp-field">
        <label class="lp-label" for="lpCodeEmail">E-mail</label>
        <input class="lp-input" type="email" id="lpCodeEmail" placeholder="Digite seu e-mail" autocomplete="email">
      </div>

      <div class="lp-code-inputs">
        <input type="text" class="lp-code-digit" maxlength="1" autocomplete="off" data-code-digit>
        <input type="text" class="lp-code-digit" maxlength="1" autocomplete="off" data-code-digit>
        <input type="text" class="lp-code-digit" maxlength="1" autocomplete="off" data-code-digit>
        <input type="text" class="lp-code-digit" maxlength="1" autocomplete="off" data-code-digit>
        <input type="text" class="lp-code-digit" maxlength="1" autocomplete="off" data-code-digit>
      </div>
      <div class="lp-code-erro" id="lpCodeErro"></div>

      <p class="lp-code-hint">Não tem um código? <span class="lp-code-hint-link">Solicite ao gerente</span></p>
    </div>
  </div>

  <!-- ── RIGHT: PANEL ── -->
  <div class="lp-right">

    <div class="lp-right-text">
      <h2>Bem-vindo de volta!<br>Acesse sua conta no <u>LillyMenu</u></h2>
      <p>Gerencie seu cardápio digital, acompanhe pedidos e impulsione suas vendas em um único painel.</p>
    </div>

    <!-- Mini dashboard mockup -->
    <div class="lp-mockup">
      <div class="lp-mock-title">
        Relatório de Vendas
        <div class="lp-mock-legend">
          <span class="lp-mock-dot" style="--c:#9C5523">Receita</span>
          <span class="lp-mock-dot" style="--c:#e2e8f0">Gastos</span>
        </div>
      </div>
      <div style="position:relative">
        <div class="lp-bars">
          <div class="lp-bar-group"><div class="lp-bar" style="height:35%;background:#f2dcc8"></div><div class="lp-bar" style="height:22%;background:#fdf0e6"></div></div>
          <div class="lp-bar-group"><div class="lp-bar" style="height:55%;background:#f2dcc8"></div><div class="lp-bar" style="height:30%;background:#fdf0e6"></div></div>
          <div class="lp-bar-group"><div class="lp-bar" style="height:40%;background:#f2dcc8"></div><div class="lp-bar" style="height:25%;background:#fdf0e6"></div></div>
          <div class="lp-bar-group" style="position:relative">
            <div class="lp-bar" style="height:75%;background:#9C5523"></div>
            <div class="lp-bar" style="height:45%;background:#d4a07a"></div>
            <div class="lp-tooltip">R$ 2.450</div>
          </div>
          <div class="lp-bar-group"><div class="lp-bar" style="height:50%;background:#f2dcc8"></div><div class="lp-bar" style="height:32%;background:#fdf0e6"></div></div>
          <div class="lp-bar-group"><div class="lp-bar" style="height:60%;background:#f2dcc8"></div><div class="lp-bar" style="height:38%;background:#fdf0e6"></div></div>
          <div class="lp-bar-group"><div class="lp-bar" style="height:45%;background:#f2dcc8"></div><div class="lp-bar" style="height:28%;background:#fdf0e6"></div></div>
        </div>
      </div>
      <div class="lp-months">
        <div class="lp-month">Jan</div>
        <div class="lp-month">Fev</div>
        <div class="lp-month">Mar</div>
        <div class="lp-month">Abr</div>
        <div class="lp-month">Mai</div>
        <div class="lp-month">Jun</div>
        <div class="lp-month">Jul</div>
      </div>
    </div>

  </div>
</div>

<!-- MODAL ERRO LOGIN -->
<div class="modal fade" id="loginErroModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content rounded-4 p-4 text-center border-0 shadow">
      <div class="mb-3" style="font-size:36px">⚠️</div>
      <h5 class="mb-2 fw-bold"><?= htmlspecialchars($erroTitle) ?></h5>
      <p class="text-muted mb-4"><?= htmlspecialchars($erroMsg) ?></p>
      <button class="btn btn-dark rounded-3 w-100 py-2" data-bs-dismiss="modal">Entendi</button>
    </div>
  </div>
</div>

<!-- MODAL RESET SENHA -->
<div class="modal fade" id="resetModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content rounded-4 p-4 border-0 shadow">
      <div id="resetFormView">
        <h6 class="fw-bold mb-1">Redefinir senha</h6>
        <p class="text-muted small mb-3">Digite seu e-mail para receber o link de redefinição.</p>
        <form id="resetForm">
          <input type="email" name="email" id="resetEmail" class="form-control rounded-3 mb-3"
                 placeholder="E-mail" required style="height:46px">
          <button type="submit" class="btn btn-primary w-100 rounded-3 py-2 fw-bold"
                  style="background:#9C5523;border-color:#9C5523;color:#fff">Continuar</button>
          <div class="small mt-2" id="resetMsg"></div>
        </form>
      </div>
      <div id="resetSuccessView" class="d-none text-center py-2">
        <div class="mb-3 mx-auto" style="width:52px;height:52px;border-radius:50%;background:#9C5523;display:flex;align-items:center;justify-content:center">
          <i class="bi bi-check-lg text-white" style="font-size:24px"></i>
        </div>
        <h6 class="fw-bold mb-2">E-mail enviado!</h6>
        <p class="text-muted small mb-3">Se o e-mail informado estiver cadastrado, enviamos um link para redefinir sua senha. Confira sua caixa de entrada (e o spam).</p>
        <button type="button" class="btn btn-dark w-100 rounded-3 py-2 fw-bold" data-bs-dismiss="modal">Entendi</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL CADASTRO -->
<div class="modal lp-modal fade" id="cadastroModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content rounded-4 p-4 border-0 shadow">
      <button type="button" class="lp-modal-close" data-bs-dismiss="modal" aria-label="Fechar">&times;</button>
      <h6 class="fw-bold mb-1">Criar conta</h6>
      <p class="text-muted small mb-3">Preencha os dados para criar sua loja.</p>
      <form method="POST" action="register.php">
        <input type="text" name="loja_nome" class="form-control rounded-3 mb-2"
               placeholder="Nome da loja" required style="height:46px">
        <input type="email" name="email" class="form-control rounded-3 mb-2"
               placeholder="E-mail" required style="height:46px">
        <input type="text" name="usuario" class="form-control rounded-3 mb-2"
               placeholder="Nome de usuário" required style="height:46px">
        <input type="password" name="senha" class="form-control rounded-3 mb-3"
               placeholder="Senha" required style="height:46px">
        <button class="btn btn-primary w-100 rounded-3 py-2 fw-bold"
                style="background:#9C5523;border-color:#9C5523;color:#fff">Criar conta</button>
      </form>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/index.js?v=<?= $indexJsVer ?>"></script>

<?php if ($erro !== ''): ?>
<script>
new bootstrap.Modal(document.getElementById('loginErroModal')).show();
</script>
<?php endif; ?>
</body>
</html>
