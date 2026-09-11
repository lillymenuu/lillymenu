<?php
/*
 * Versao JSON (Bearer token) de admin/api/usuarios_delete.php — porta 1:1.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';

header('Content-Type: application/json; charset=utf-8');

$auth = apiAuthExigir($conn);
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['admin_perfil'] = $auth['perfil'];
$_SESSION['loja_id'] = $auth['loja_id'];

exigirPerfil(['admin', 'gerente']);

function tabelaExisteV1(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
  $body = [];
}

$id = (int) ($body['id'] ?? 0);
$lojaId = $auth['loja_id'];
if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Usuario invalido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$colsAdmins = $conn->query("SHOW COLUMNS FROM admins")->fetchAll(PDO::FETCH_COLUMN, 0);
$temLojaAdmin = in_array('loja_id', $colsAdmins, true);
if ($temLojaAdmin) {
  $stmt = $conn->prepare("SELECT id FROM admins WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$id, $lojaId]);
  if (!$stmt->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Usuario nao pertence a esta loja.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }
}

if ((int) ($_SESSION['admin_id'] ?? 0) === $id) {
  echo json_encode(['ok' => false, 'msg' => 'Nao e possivel excluir o usuario logado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

try {
  $conn->beginTransaction();

  if (tabelaExisteV1($conn, 'permissoes_usuarios')) {
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
  echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao excluir usuario.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
