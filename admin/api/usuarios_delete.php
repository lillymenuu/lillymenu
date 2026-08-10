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

$id = (int) ($_POST['id'] ?? 0);
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Usuario invalido.']);
  exit;
}

$colsAdmins = $conn->query("SHOW COLUMNS FROM admins")->fetchAll(PDO::FETCH_COLUMN, 0);
$temLojaAdmin = in_array('loja_id', $colsAdmins, true);
if ($temLojaAdmin) {
  $stmt = $conn->prepare("SELECT id FROM admins WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$id, $lojaId]);
  if (!$stmt->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Usuario nao pertence a esta loja.']);
    exit;
  }
}

if ((int) ($_SESSION['admin_id'] ?? 0) === $id) {
  echo json_encode(['ok' => false, 'msg' => 'Nao e possivel excluir o usuario logado.']);
  exit;
}

try {
  $conn->beginTransaction();

  if (tabelaExiste($conn, 'permissoes_usuarios')) {
    $stmt = $conn->prepare("DELETE FROM permissoes_usuarios WHERE admin_id = ?");
    $stmt->execute([$id]);
  }

  $temAtivo = in_array('ativo', $colsAdmins, true);
  if ($temAtivo) {
    $stmt = $conn->prepare("UPDATE admins SET ativo = 0 WHERE id = ? AND loja_id = ?");
    $stmt->execute([$id, $lojaId]);
  } else {
    $stmt = $conn->prepare("DELETE FROM admins WHERE id = ? AND loja_id = ?");
    $stmt->execute([$id, $lojaId]);
  }

  $conn->commit();
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao excluir usuario.']);
}
