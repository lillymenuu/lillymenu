<?php
require_once __DIR__ . '/../config/database.php';

$token = $_GET['token'] ?? '';

$stmt = $conn->prepare(
  "SELECT id FROM admins
   WHERE reset_token = ? AND reset_expira > NOW()"
);
$stmt->execute([$token]);
$admin = $stmt->fetch();

if (!$admin) {
  die("Link invalido ou expirado");
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Nova senha</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
:root{
  --bg:#f4f5fb;
  --card:#ffffff;
  --border:#e5e7eb;
  --text:#111827;
  --muted:#6b7280;
  --accent:#9C5523;
  --accent-dark:#7A3F10;
  --shadow:0 18px 40px rgba(15,23,42,.12);
}

body{
  font-family:"Manrope",sans-serif;
  background:var(--bg);
  color:var(--text);
}

.reset-page{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:28px;
}

.reset-card{
  width:100%;
  max-width:520px;
  background:var(--card);
  border-radius:24px;
  box-shadow:var(--shadow);
  overflow:hidden;
  display:grid;
  grid-template-columns:1fr 1fr;
  min-height:360px;
}

.reset-left{
  padding:40px 36px;
}

.reset-title{
  font-weight:700;
  font-size:24px;
  margin-bottom:6px;
}

.reset-subtitle{
  color:var(--muted);
  margin-bottom:22px;
  font-size:14px;
}

.form-control{
  height:52px;
  border-radius:14px;
  border:1px solid var(--border);
  padding:0 16px;
}

.form-control:focus{
  box-shadow:none;
  border-color:#111827;
}

.btn-reset{
  width:100%;
  height:52px;
  border-radius:12px;
  border:0;
  font-weight:700;
  color:#fff;
  background:linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
  box-shadow:0 12px 24px rgba(156,85,35,.35);
}

.reset-right{
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  color:#fff;
  background:linear-gradient(135deg, #9C5523 0%, #7A3F10 55%, #7a1fd1 100%);
}

.reset-right::before{
  content:"";
  position:absolute;
  inset:0;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='640' viewBox='0 0 640 640'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.18' stroke-width='1'%3E%3Cpath d='M30 120c120-60 220-60 360 20s160 180 20 260-320 80-420-40'/%3E%3Cpath d='M80 40c120-60 240-40 360 30s120 190-40 260-320 60-420-60'/%3E%3Cpath d='M120 200c160-80 300-40 380 40s60 200-100 240-300-20-360-120'/%3E%3Cpath d='M40 320c160-90 320-60 420 20s40 220-120 260-320-40-360-140'/%3E%3C/g%3E%3C/svg%3E");
  background-size:cover;
  opacity:.6;
  pointer-events:none;
}

.reset-right h3{
  position:relative;
  font-size:18px;
  font-weight:700;
  max-width:180px;
}

@media (max-width: 900px){
  .reset-card{
    grid-template-columns:1fr;
    max-width:420px;
  }
  .reset-right{
    padding:24px 20px;
  }
}
</style>
</head>
<body>
<div class="reset-page">
  <div class="reset-card">
    <div class="reset-left">
      <h1 class="reset-title">Criar nova senha</h1>
      <p class="reset-subtitle">Defina uma nova senha para continuar.</p>
      <form method="POST" action="reset_save.php">
        <input type="hidden" name="token" value="<?= htmlspecialchars($token) ?>">
        <input type="password" name="senha" class="form-control mb-3"
          placeholder="Nova senha" required>
        <button class="btn-reset" type="submit">Salvar senha</button>
      </form>
    </div>
    <div class="reset-right">
      <h3>Seguranca em primeiro lugar</h3>
    </div>
  </div>
</div>

</body>
</html>
