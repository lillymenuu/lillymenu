<?php
/*
 * Versao JSON (Bearer token) de admin/api/taxa_dinamica_save.php — porta 1:1.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

function tabelaExisteV1(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

if (!tabelaExisteV1($conn, 'taxas_dinamicas')) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de taxas dinamicas nao encontrada.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) {
  echo json_encode(['ok' => false, 'msg' => 'Dados invalidos.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$id = isset($payload['id']) ? (int) $payload['id'] : 0;
$distancia = isset($payload['distancia_km']) ? (float) str_replace(',', '.', (string) $payload['distancia_km']) : 0;
$distancia = round($distancia, 2);
$valor = isset($payload['valor']) ? (float) str_replace(',', '.', (string) $payload['valor']) : 0;
$valor = round($valor, 2);
$tipo = trim((string) ($payload['tipo'] ?? 'fixa'));
$tempoMin = ($payload['tempo_min'] ?? '') !== '' ? (int) $payload['tempo_min'] : null;
$tempoMax = ($payload['tempo_max'] ?? '') !== '' ? (int) $payload['tempo_max'] : null;

if ($distancia <= 0 || $valor < 0) {
  echo json_encode(['ok' => false, 'msg' => 'Informe distancia e valor validos.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if ($distancia > 100) {
  echo json_encode(['ok' => false, 'msg' => 'Distancia maxima permitida: 100km.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if (!in_array($tipo, ['fixa', 'por_km'], true)) {
  $tipo = 'fixa';
}
if ($tempoMin !== null && $tempoMin < 0) {
  echo json_encode(['ok' => false, 'msg' => 'Tempo minimo invalido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if ($tempoMax !== null && $tempoMax < 0) {
  echo json_encode(['ok' => false, 'msg' => 'Tempo maximo invalido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if ($tempoMin !== null && $tempoMax !== null && $tempoMin > $tempoMax) {
  echo json_encode(['ok' => false, 'msg' => 'Tempo minimo deve ser menor que o maximo.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

try {
  $stmtDup = $conn->prepare("SELECT id FROM taxas_dinamicas WHERE distancia_km = ? AND id <> ? AND loja_id = ? LIMIT 1");
  $stmtDup->execute([$distancia, $id, $lojaId]);
  if ($stmtDup->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Ja existe uma taxa dinamica para esta distancia.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }
  if ($id > 0) {
    $stmt = $conn->prepare("
      UPDATE taxas_dinamicas
      SET distancia_km = ?, valor = ?, tipo = ?, tempo_min = ?, tempo_max = ?, atualizado_em = NOW()
      WHERE id = ? AND loja_id = ?
    ");
    $stmt->execute([$distancia, $valor, $tipo, $tempoMin, $tempoMax, $id, $lojaId]);
  } else {
    $stmt = $conn->prepare("
      INSERT INTO taxas_dinamicas (distancia_km, valor, tipo, tempo_min, tempo_max, criado_em, loja_id)
      VALUES (?, ?, ?, ?, ?, NOW(), ?)
    ");
    $stmt->execute([$distancia, $valor, $tipo, $tempoMin, $tempoMax, $lojaId]);
  }

  $stmtCfg = $conn->prepare("
    INSERT INTO configuracoes (loja_id, chave, valor)
    VALUES (?, 'taxa_entrega_tipo', 'dinamica')
    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
  ");
  $stmtCfg->execute([$lojaId]);

  echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Erro ao salvar.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
