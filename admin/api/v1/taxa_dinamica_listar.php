<?php
/*
 * Versao JSON (Bearer token) de admin/api/taxa_dinamica_list.php — porta 1:1.
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
  echo json_encode(['ok' => true, 'itens' => []], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("
  SELECT id, distancia_km, valor, tipo, tempo_min, tempo_max
  FROM taxas_dinamicas
  WHERE loja_id = ?
  ORDER BY distancia_km
");
$stmt->execute([$lojaId]);
$itens = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

echo json_encode(['ok' => true, 'itens' => $itens], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
