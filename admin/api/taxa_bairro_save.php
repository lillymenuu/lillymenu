<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

if (!tabelaExiste($conn, 'taxas_bairro')) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de taxas por bairro nao encontrada.']);
  exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) {
  echo json_encode(['ok' => false, 'msg' => 'Dados invalidos.']);
  exit;
}

$id = isset($payload['id']) ? (int) $payload['id'] : 0;
$bairro = trim((string) ($payload['bairro'] ?? ''));
$taxa = isset($payload['taxa']) ? (float) str_replace(',', '.', (string) $payload['taxa']) : 0;
$taxa = round($taxa, 2);
$tempoMin = ($payload['tempo_min'] ?? '') !== '' ? (int) $payload['tempo_min'] : null;
$tempoMax = ($payload['tempo_max'] ?? '') !== '' ? (int) $payload['tempo_max'] : null;

if ($bairro === '' || $taxa < 0) {
  echo json_encode(['ok' => false, 'msg' => 'Informe bairro e taxa validos.']);
  exit;
}
if ($tempoMin !== null && $tempoMin < 0) {
  echo json_encode(['ok' => false, 'msg' => 'Tempo minimo invalido.']);
  exit;
}
if ($tempoMax !== null && $tempoMax < 0) {
  echo json_encode(['ok' => false, 'msg' => 'Tempo maximo invalido.']);
  exit;
}
if ($tempoMin !== null && $tempoMax !== null && $tempoMin > $tempoMax) {
  echo json_encode(['ok' => false, 'msg' => 'Tempo minimo deve ser menor que o maximo.']);
  exit;
}

try {
  $stmtDup = $conn->prepare("SELECT id FROM taxas_bairro WHERE LOWER(bairro) = LOWER(?) AND id <> ? AND loja_id = ? LIMIT 1");
  $stmtDup->execute([$bairro, $id, $lojaId]);
  if ($stmtDup->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Ja existe uma taxa cadastrada para este bairro.']);
    exit;
  }
  if ($id > 0) {
    $stmt = $conn->prepare("
      UPDATE taxas_bairro
      SET bairro = ?, taxa = ?, tempo_min = ?, tempo_max = ?, atualizado_em = NOW()
      WHERE id = ? AND loja_id = ?
    ");
    $stmt->execute([$bairro, $taxa, $tempoMin, $tempoMax, $id, $lojaId]);
  } else {
    $stmt = $conn->prepare("
      INSERT INTO taxas_bairro (bairro, taxa, tempo_min, tempo_max, criado_em, loja_id)
      VALUES (?, ?, ?, ?, NOW(), ?)
    ");
    $stmt->execute([$bairro, $taxa, $tempoMin, $tempoMax, $lojaId]);
  }

  $stmt = $conn->prepare("SELECT bairro, taxa FROM taxas_bairro WHERE loja_id = ?");
  $stmt->execute([$lojaId]);
  $mapa = [];
  if ($stmt) {
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $mapa[$row['bairro']] = (float) $row['taxa'];
    }
  }
  $json = json_encode($mapa, JSON_UNESCAPED_UNICODE);
  $stmtCfg = $conn->prepare("
    INSERT INTO configuracoes (loja_id, chave, valor)
    VALUES (?, 'taxas_bairro', ?)
    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
  ");
  $stmtCfg->execute([$lojaId, $json]);

  $stmtTipo = $conn->prepare("
    INSERT INTO configuracoes (loja_id, chave, valor)
    VALUES (?, 'taxa_entrega_tipo', 'bairro')
    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
  ");
  $stmtTipo->execute([$lojaId]);

  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Erro ao salvar.']);
}
