<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

if (!tabelaExiste($conn, 'versiculo_reacoes')) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de reacoes nao encontrada.']);
  exit;
}

$adminId = (int) ($_SESSION['admin_id'] ?? 0);
$data = trim((string) ($_GET['data'] ?? date('Y-m-d')));

if ($adminId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Usuario invalido.']);
  exit;
}

try {
  $stmt = $conn->prepare("SELECT reacao FROM versiculo_reacoes WHERE admin_id = ? AND data_versiculo = ? LIMIT 1");
  $stmt->execute([$adminId, $data]);
  $reacao = $stmt->fetchColumn() ?: null;
  echo json_encode(['ok' => true, 'reacao' => $reacao]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao carregar reacao.']);
}
