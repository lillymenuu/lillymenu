<?php
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json');

$auth    = apiAuthExigir($conn);
$adminId = $auth['admin_id'];

try {
  $stmt = $conn->prepare("SHOW TABLES LIKE 'versiculo_reacoes'");
  $stmt->execute();
  if (!$stmt->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Tabela de reacoes nao encontrada.']);
    exit;
  }
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao verificar tabela.']);
  exit;
}

$dados      = json_decode(file_get_contents('php://input'), true) ?: [];
$reacao     = trim((string) ($dados['reacao'] ?? ''));
$data       = trim((string) ($dados['data'] ?? date('Y-m-d')));
$referencia = trim((string) ($dados['referencia'] ?? ''));
$texto      = trim((string) ($dados['texto'] ?? ''));

if (!in_array($reacao, ['gostou', 'nao_gostou'], true)) {
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
