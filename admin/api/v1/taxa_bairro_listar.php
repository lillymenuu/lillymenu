<?php
/*
 * Versao JSON (Bearer token) de admin/api/taxa_bairro_list.php — porta 1:1.
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
  echo json_encode(['ok' => true, 'itens' => []], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("SELECT id, bairro, taxa, tempo_min, tempo_max FROM taxas_bairro WHERE loja_id = ? ORDER BY bairro");
$stmt->execute([$lojaId]);
$itens = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

echo json_encode(['ok' => true, 'itens' => $itens], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
