<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

exigirPerfil(['admin', 'gerente']);

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

if (!tabelaExiste($conn, 'permissoes_usuarios')) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de permissoes nao encontrada.']);
  exit;
}

$adminId = (int) ($_POST['admin_id'] ?? 0);
$permId = (int) ($_POST['permissao_id'] ?? 0);
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

if ($adminId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Usuario invalido.']);
  exit;
}

$colsAdmins = $conn->query("SHOW COLUMNS FROM admins")->fetchAll(PDO::FETCH_COLUMN, 0);
$temLojaAdmin = in_array('loja_id', $colsAdmins, true);
if ($temLojaAdmin) {
  $stmt = $conn->prepare("SELECT id FROM admins WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$adminId, $lojaId]);
  if (!$stmt->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Usuario nao pertence a esta loja.']);
    exit;
  }
}

try {
  $conn->beginTransaction();
  $stmt = $conn->prepare("DELETE FROM permissoes_usuarios WHERE admin_id = ?");
  $stmt->execute([$adminId]);

  if ($permId > 0) {
    $stmt = $conn->prepare("
      INSERT INTO permissoes_usuarios (permissao_id, admin_id, criado_em)
      VALUES (?, ?, NOW())
    ");
    $stmt->execute([$permId, $adminId]);
  }

  if (tabelaExiste($conn, 'permissoes_niveis')) {
    $stmt = $conn->prepare("SELECT slug FROM permissoes_niveis WHERE id = ? LIMIT 1");
    $stmt->execute([$permId]);
    $slug = $stmt->fetchColumn();
    $perfil = perfilPorNivel($slug ? (string) $slug : null);
    $stmt = $conn->prepare("UPDATE admins SET perfil = ? WHERE id = ?" . ($temLojaAdmin ? " AND loja_id = ?" : ""));
    $params = [$perfil, $adminId];
    if ($temLojaAdmin) {
      $params[] = $lojaId;
    }
    $stmt->execute($params);
    if ((int) ($_SESSION['admin_id'] ?? 0) === $adminId) {
      $_SESSION['admin_perfil'] = $perfil;
    }
  }

  $conn->commit();
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao atualizar.']);
}
