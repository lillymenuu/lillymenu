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
$reacao = trim((string) ($_POST['reacao'] ?? ''));
$data = trim((string) ($_POST['data'] ?? date('Y-m-d')));
$referencia = trim((string) ($_POST['referencia'] ?? ''));
$texto = trim((string) ($_POST['texto'] ?? ''));

if ($adminId <= 0 || !in_array($reacao, ['gostou', 'nao_gostou'], true)) {
  echo json_encode(['ok' => false, 'msg' => 'Dados invalidos.']);
  exit;
}

try {
  $stmt = $conn->prepare("
    INSERT INTO versiculo_reacoes (admin_id, data_versiculo, reacao, referencia, texto, criado_em)
    VALUES (?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      reacao = VALUES(reacao),
      referencia = VALUES(referencia),
      texto = VALUES(texto),
      atualizado_em = NOW()
  ");
  $stmt->execute([$adminId, $data, $reacao, $referencia ?: null, $texto ?: null]);
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar reacao.']);
}
