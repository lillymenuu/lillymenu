<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/config.php';

function garantirConfiguracoesLoja(PDO $conn): void {
  try {
    $cols = $conn->query("SHOW COLUMNS FROM configuracoes")->fetchAll(PDO::FETCH_COLUMN, 0);
    if (!in_array('loja_id', $cols, true)) {
      return;
    }
    $pkRows = $conn->query("SHOW INDEX FROM configuracoes WHERE Key_name = 'PRIMARY'")->fetchAll(PDO::FETCH_ASSOC);
    $pkCols = [];
    foreach ($pkRows as $row) {
      $pkCols[] = $row['Column_name'] ?? '';
    }
    $pkCols = array_values(array_unique(array_filter($pkCols)));
    if ($pkCols === ['chave']) {
      $conn->exec("UPDATE configuracoes SET loja_id = 1 WHERE loja_id IS NULL");
      $conn->exec("ALTER TABLE configuracoes DROP PRIMARY KEY");
      $conn->exec("ALTER TABLE configuracoes ADD PRIMARY KEY (loja_id, chave)");
      return;
    }
    if (!in_array('loja_id', $pkCols, true)) {
      $hasUnique = $conn->query("SHOW INDEX FROM configuracoes WHERE Key_name = 'uniq_loja_chave'")->fetch(PDO::FETCH_ASSOC);
      if (!$hasUnique) {
        $conn->exec("ALTER TABLE configuracoes ADD UNIQUE KEY uniq_loja_chave (loja_id, chave)");
      }
    }
  } catch (Exception $e) {
  }
}

$nome = trim($_POST['nome'] ?? '');
$lojaNome = trim($_POST['loja_nome'] ?? '');
$email = trim($_POST['email'] ?? '');
$usuario = trim($_POST['usuario'] ?? '');
$senha = $_POST['senha'] ?? '';

if (!$lojaNome || !$email || !$usuario || !$senha) {
  header("Location: login?erro=1");
  exit;
}

if (!$nome) {
  $nome = $usuario;
  if (!$nome && $email) {
    $parts = explode('@', $email);
    $nome = $parts[0] ?? $email;
  }
}

garantirConfiguracoesLoja($conn);

// Verifica se usuario ou email ja existe
$stmt = $conn->prepare(
  "SELECT id FROM admins WHERE usuario = ? OR email = ? LIMIT 1"
);
$stmt->execute([$usuario, $email]);

if ($stmt->fetch()) {
  header("Location: login?erro=1");
  exit;
}

try {
  $conn->beginTransaction();

  // Cria loja
  $stmt = $conn->prepare(
    "INSERT INTO lojas (nome, ativo) VALUES (?, 0)"
  );
  $stmt->execute([$lojaNome]);
  $lojaId = (int) $conn->lastInsertId();

  // Cria usuario admin
  $stmt = $conn->prepare(
    "INSERT INTO admins (nome, usuario, email, senha, ativo, loja_id, perfil)
     VALUES (?, ?, ?, ?, 0, ?, 'admin')"
  );
  $stmt->execute([
    $nome,
    $usuario,
    $email,
    password_hash($senha, PASSWORD_DEFAULT),
    $lojaId
  ]);

  // Cria assinatura trial com datas
  $stmtPlano = $conn->query("SELECT id FROM planos WHERE ativo = 1 ORDER BY id ASC LIMIT 1");
  $plano = $stmtPlano ? $stmtPlano->fetch(PDO::FETCH_ASSOC) : null;
  $planoId = (int) ($plano['id'] ?? 1);
  $diasTrial = 30;
  $trialInicio = date('Y-m-d');
  $trialFim = date('Y-m-d', strtotime("+{$diasTrial} day"));
  $stmtAss = $conn->prepare("
    INSERT INTO assinaturas (loja_id, plano_id, status, trial_inicio, trial_fim)
    VALUES (?, ?, 'trial', ?, ?)
  ");
  $stmtAss->execute([$lojaId, $planoId, $trialInicio, $trialFim]);

  // Configuracoes basicas da loja
  $stmtCfg = $conn->prepare("INSERT INTO configuracoes (loja_id, chave, valor) VALUES (?,?,?)");
  $stmtCfg->execute([$lojaId, 'nome_loja', $lojaNome]);
  $stmtCfg->execute([$lojaId, 'loja_email', $email]);

  /* Garante que o admin da nova loja NÃO tenha entradas em permissoes_usuarios
   * para que $menuRestrito = false e ele veja todo o menu (igual à loja principal).
   * Se a tabela não existir, ignora silenciosamente. */
  try {
    $adminId = (int)$conn->lastInsertId();
    $stmtPerm = $conn->prepare("SHOW TABLES LIKE 'permissoes_usuarios'");
    $stmtPerm->execute();
    if ($stmtPerm->fetchColumn()) {
      /* Remove qualquer entrada residual para garantir estado limpo */
      $conn->prepare("DELETE FROM permissoes_usuarios WHERE admin_id = ?")
           ->execute([$adminId]);
    }
  } catch (Exception) {}

  $conn->commit();
} catch (Exception $e) {
  $conn->rollBack();
  header("Location: login?erro=1");
  exit;
}

header("Location: login?ok=1");
exit;
