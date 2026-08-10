<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/gerenciamento_module.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

gerenciamentoEnsureModule($conn);

$adminId = (int) ($_SESSION['admin_id'] ?? 0);
$nome = trim((string) ($_POST['nome'] ?? ''));
$usuario = trim((string) ($_POST['usuario'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$senha = (string) ($_POST['senha'] ?? '');
$senha2 = (string) ($_POST['senha2'] ?? '');
$fotoRemover = ($_POST['foto_remover'] ?? '') === '1';

if ($adminId <= 0 || $nome === '' || $usuario === '' || $email === '') {
  echo json_encode(['ok' => false, 'msg' => 'Preencha os campos obrigatorios.']);
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  echo json_encode(['ok' => false, 'msg' => 'Email invalido.']);
  exit;
}

if ($senha !== '' && $senha !== $senha2) {
  echo json_encode(['ok' => false, 'msg' => 'As senhas nao conferem.']);
  exit;
}

$stmt = $conn->prepare("SELECT id FROM admins WHERE (email = ? OR usuario = ?) AND id <> ? LIMIT 1");
$stmt->execute([$email, $usuario, $adminId]);
if ($stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Email ou usuario ja cadastrado.']);
  exit;
}

function suporteAdminRemoverFotoAntiga(?string $relPath): void {
  if (!$relPath) return;
  $baseDir = realpath(__DIR__ . '/../assets/uploads/admins');
  $arquivo = realpath(__DIR__ . '/../' . $relPath);
  if ($baseDir && $arquivo && strpos($arquivo, $baseDir) === 0 && is_file($arquivo)) {
    unlink($arquivo);
  }
}

function suporteAdminSalvarFoto(array $arquivo, int $adminId): ?string {
  if (($arquivo['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
    return null;
  }
  if ($arquivo['error'] !== UPLOAD_ERR_OK) {
    throw new RuntimeException('Erro ao enviar o arquivo.');
  }
  $allowed = ['jpg', 'jpeg', 'png', 'webp'];
  $ext = strtolower(pathinfo($arquivo['name'] ?? '', PATHINFO_EXTENSION));
  if (!in_array($ext, $allowed, true)) {
    throw new RuntimeException('Foto invalida (use JPG, PNG ou WebP).');
  }
  if ($arquivo['size'] > 5 * 1024 * 1024) {
    throw new RuntimeException('Foto muito grande (maximo 5MB).');
  }
  $dirRel = 'assets/uploads/admins';
  $dirAbs = __DIR__ . '/../' . $dirRel;
  if (!is_dir($dirAbs)) {
    @mkdir($dirAbs, 0775, true);
  }
  $fileName = 'admin_' . $adminId . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
  $dest = $dirAbs . '/' . $fileName;
  if (!move_uploaded_file($arquivo['tmp_name'], $dest)) {
    throw new RuntimeException('Erro ao salvar a foto.');
  }
  return $dirRel . '/' . $fileName;
}

try {
  $novaFoto = suporteAdminSalvarFoto($_FILES['foto'] ?? [], $adminId);
} catch (RuntimeException $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
  exit;
}

try {
  $conn->beginTransaction();
  $stmt = $conn->prepare("UPDATE admins SET nome = ?, email = ?, usuario = ? WHERE id = ? AND perfil = 'superadmin'");
  $stmt->execute([$nome, $email, $usuario, $adminId]);

  if ($senha !== '') {
    $stmt = $conn->prepare("UPDATE admins SET senha = ? WHERE id = ? AND perfil = 'superadmin'");
    $stmt->execute([password_hash($senha, PASSWORD_DEFAULT), $adminId]);
  }

  if ($novaFoto !== null || $fotoRemover) {
    $stmtFotoAtual = $conn->prepare("SELECT foto FROM admins WHERE id = ?");
    $stmtFotoAtual->execute([$adminId]);
    $fotoAtual = $stmtFotoAtual->fetchColumn();

    $stmt = $conn->prepare("UPDATE admins SET foto = ? WHERE id = ? AND perfil = 'superadmin'");
    $stmt->execute([$novaFoto, $adminId]);

    if ($fotoAtual) {
      suporteAdminRemoverFotoAntiga($fotoAtual);
    }
  }

  $_SESSION['admin_nome'] = $nome;
  $_SESSION['admin_email'] = $email;
  $_SESSION['admin_usuario'] = $usuario;

  $conn->commit();
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao atualizar usuario.']);
}
