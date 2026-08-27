<?php
session_start();
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/loja_context.php';

$lojaId = obterLojaIdDaRequisicao($conn);

if ($lojaId > 0 && isset($_SESSION['garcom_id']) && (int) ($_SESSION['garcom_loja_id'] ?? 0) === $lojaId) {
  header('Location: garcom.php?loja_id=' . $lojaId);
  exit;
}

$nomeLoja = 'Cardápio';
if ($lojaId > 0) {
  $stmt = $conn->prepare("SELECT valor FROM configuracoes WHERE loja_id = ? AND chave = 'nome_loja' LIMIT 1");
  $stmt->execute([$lojaId]);
  $nomeLoja = $stmt->fetchColumn() ?: $nomeLoja;
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Acesso do garçom — <?= htmlspecialchars($nomeLoja) ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="./assets/css/garcom.css?v=<?= filemtime(__DIR__ . '/assets/css/garcom.css') ?>" rel="stylesheet">
</head>
<body class="gl-body">
  <div class="gl-card">
    <div class="gl-icon"><i class="bi bi-person-badge"></i></div>
    <h1 class="gl-title">Acesso do garçom</h1>
    <p class="gl-sub"><?= htmlspecialchars($nomeLoja) ?></p>

    <form id="glForm" autocomplete="off">
      <input type="hidden" id="glLojaId" value="<?= (int) $lojaId ?>">
      <div class="gl-field">
        <label for="glEmail">E-mail</label>
        <input type="email" id="glEmail" placeholder="seu@email.com" inputmode="email" autocapitalize="off">
      </div>
      <div class="gl-field">
        <label for="glCodigo">Código de acesso</label>
        <input type="text" id="glCodigo" placeholder="XXXXX" maxlength="5" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.3em;text-align:center">
      </div>
      <div class="gl-msg" id="glMsg"></div>
      <button type="submit" class="gl-btn" id="glBtn">Entrar</button>
    </form>
  </div>

<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<script>
document.getElementById('glForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const email = document.getElementById('glEmail').value.trim();
  const codigo = document.getElementById('glCodigo').value.trim().toUpperCase();
  const lojaId = document.getElementById('glLojaId').value;
  const msg = document.getElementById('glMsg');
  const btn = document.getElementById('glBtn');
  msg.textContent = '';
  if (!email || !codigo) {
    msg.textContent = 'Preencha o e-mail e o código de acesso.';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Entrando...';
  fetch('api/garcom_login.php', {
    method: 'POST',
    body: new URLSearchParams({ email, codigo, loja_id: lojaId })
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.ok) {
        window.location.href = 'garcom.php?loja_id=' + lojaId;
      } else {
        btn.disabled = false;
        btn.textContent = 'Entrar';
        msg.textContent = data.msg || 'E-mail ou código inválido.';
      }
    })
    .catch(() => {
      btn.disabled = false;
      btn.textContent = 'Entrar';
      msg.textContent = 'Erro de comunicação. Tente novamente.';
    });
});
</script>
</body>
</html>
