<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

exigirAdminPrincipal($conn);

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

function perfilPorNivel(?string $slug): string {
  if ($slug === 'nivel-1') {
    return 'admin';
  }
  if ($slug === 'nivel-2') {
    return 'operador';
  }
  return 'garcom';
}

function gerarCodigoAcesso(PDO $conn): string {
  /* codigo_acesso tem indice UNIQUE global na tabela admins. */
  $alfabeto = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  $stmt = $conn->prepare("SELECT id FROM admins WHERE codigo_acesso = ? LIMIT 1");
  while (true) {
    $codigo = '';
    for ($i = 0; $i < 5; $i++) {
      $codigo .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
    }
    $stmt->execute([$codigo]);
    if (!$stmt->fetchColumn()) {
      return $codigo;
    }
  }
}

if (!tabelaExiste($conn, 'admins')) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de usuarios nao encontrada.']);
  exit;
}

$id = (int) ($_POST['id'] ?? 0);
$nome = trim((string) ($_POST['nome'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$permissaoId = (int) ($_POST['permissao_id'] ?? 0);
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

if ($nome === '' || $email === '' || $permissaoId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Preencha os campos obrigatorios.']);
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  echo json_encode(['ok' => false, 'msg' => 'Informe um e-mail valido.']);
  exit;
}

$stmtEmail = $conn->prepare("SELECT id FROM admins WHERE email = ? AND id <> ? LIMIT 1");
$stmtEmail->execute([$email, $id]);
if ($stmtEmail->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Este e-mail ja esta em uso por outro usuario.']);
  exit;
}

$colsAdmins = $conn->query("SHOW COLUMNS FROM admins")->fetchAll(PDO::FETCH_COLUMN, 0);
$temLojaAdmin = in_array('loja_id', $colsAdmins, true);
$temCodigoAcesso = in_array('codigo_acesso', $colsAdmins, true);
if (!$temCodigoAcesso) {
  try {
    $conn->exec("ALTER TABLE admins ADD COLUMN codigo_acesso VARCHAR(10) NULL");
    $conn->exec("ALTER TABLE admins ADD UNIQUE INDEX idx_admins_codigo_acesso (codigo_acesso)");
    $temCodigoAcesso = true;
  } catch (Throwable $e2) {}
}

if ($id > 0 && $temLojaAdmin) {
  $stmt = $conn->prepare("SELECT id FROM admins WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$id, $lojaId]);
  if (!$stmt->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Usuario nao pertence a esta loja.']);
    exit;
  }
}

$perfil = 'garcom';
if (tabelaExiste($conn, 'permissoes_niveis')) {
  $stmt = $conn->prepare("SELECT slug FROM permissoes_niveis WHERE id = ? LIMIT 1");
  $stmt->execute([$permissaoId]);
  $slug = $stmt->fetchColumn();
  $perfil = perfilPorNivel($slug ? (string) $slug : null);
}

$codigoGerado = '';
if ($id === 0 && $temCodigoAcesso) {
  $codigoGerado = gerarCodigoAcesso($conn);
}

try {
  $conn->beginTransaction();

  if ($id > 0) {
    $stmt = $conn->prepare("
      UPDATE admins
      SET nome = ?, email = ?, perfil = ?
      WHERE id = ? AND loja_id = ?
    ");
    $stmt->execute([$nome, $email, $perfil, $id, $lojaId]);
  } else {
    $stmt = $conn->prepare("
      INSERT INTO admins (nome, usuario, email, senha, codigo_acesso, perfil, ativo, loja_id)
      VALUES (?, NULL, ?, NULL, ?, ?, 1, ?)
    ");
    $stmt->execute([
      $nome,
      $email,
      $codigoGerado !== '' ? $codigoGerado : null,
      $perfil,
      $lojaId
    ]);
    $id = (int) $conn->lastInsertId();
  }

  if (tabelaExiste($conn, 'permissoes_usuarios')) {
    $stmt = $conn->prepare("DELETE FROM permissoes_usuarios WHERE admin_id = ?");
    $stmt->execute([$id]);
    if ($permissaoId > 0) {
      $stmt = $conn->prepare("
        INSERT INTO permissoes_usuarios (permissao_id, admin_id, criado_em)
        VALUES (?, ?, NOW())
      ");
      $stmt->execute([$permissaoId, $id]);
    }
  }

  if ((int) ($_SESSION['admin_id'] ?? 0) === $id) {
    $_SESSION['admin_nome'] = $nome;
    $_SESSION['admin_perfil'] = $perfil;
  }

  $conn->commit();
  $resposta = ['ok' => true, 'id' => $id, 'nome' => $nome];
  if ($codigoGerado !== '') {
    $resposta['codigo_acesso'] = $codigoGerado;
  }
  echo json_encode($resposta);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar usuario.']);
}
