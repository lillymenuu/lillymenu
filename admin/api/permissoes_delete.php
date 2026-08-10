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

if (!tabelaExiste($conn, 'permissoes_niveis') || !tabelaExiste($conn, 'permissoes_usuarios')) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de permissoes nao encontrada.']);
  exit;
}

$id = (int) ($_POST['id'] ?? 0);
if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Permissao invalida.']);
  exit;
}

try {
  $stmt = $conn->prepare("SELECT slug FROM permissoes_niveis WHERE id = ? LIMIT 1");
  $stmt->execute([$id]);
  $slug = (string) $stmt->fetchColumn();
  if (in_array($slug, ['nivel-1', 'nivel-2', 'nivel-3'], true)) {
    echo json_encode(['ok' => false, 'msg' => 'Este nivel nao pode ser removido.']);
    exit;
  }

  $conn->beginTransaction();
  $stmt = $conn->prepare("DELETE FROM permissoes_usuarios WHERE permissao_id = ?");
  $stmt->execute([$id]);
  $stmt = $conn->prepare("DELETE FROM permissoes_niveis WHERE id = ?");
  $stmt->execute([$id]);
  $conn->commit();
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao excluir.']);
}
