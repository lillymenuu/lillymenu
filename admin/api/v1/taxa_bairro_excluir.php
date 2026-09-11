<?php
/*
 * Versao JSON (Bearer token) de admin/api/taxa_bairro_delete.php — porta 1:1.
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

if (!tabelaExisteV1($conn, 'taxas_bairro')) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de taxas por bairro nao encontrada.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$id = isset($payload['id']) ? (int) $payload['id'] : 0;
if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'ID invalido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

try {
  $stmt = $conn->prepare("DELETE FROM taxas_bairro WHERE id = ? AND loja_id = ?");
  $stmt->execute([$id, $lojaId]);

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

  echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Erro ao remover.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
