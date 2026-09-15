<?php
/*
 * Versao Bearer-token de admin/api/whats_api.php?action=conversas — lista
 * as conversas do WhatsLilly (busca por nome/numero opcional) + total de
 * nao-lidas. Mesma logica/tabelas (whats_conversas), so trocando sessao
 * por token.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$busca  = trim((string) ($_GET['busca'] ?? ''));
$params = [$lojaId];
$buscaCond = '';

if ($busca !== '') {
  $buscaCond = 'AND (wc.nome LIKE ? OR wc.numero LIKE ?)';
  $params[] = "%{$busca}%";
  $params[] = "%{$busca}%";
}

$stmt = $conn->prepare("
  SELECT
    wc.id,
    wc.numero,
    COALESCE(wc.nome, wc.numero) AS nome,
    wc.ultimo_msg,
    wc.ultimo_msg_em,
    wc.nao_lidas
  FROM whats_conversas wc
  WHERE wc.loja_id = ? {$buscaCond}
  ORDER BY wc.ultimo_msg_em DESC
  LIMIT 60
");
$stmt->execute($params);
$rows = array_map(function ($r) {
  return [
    'id' => (int) $r['id'],
    'numero' => $r['numero'],
    'nome' => $r['nome'],
    'ultimo_msg' => $r['ultimo_msg'],
    'ultimo_msg_em' => $r['ultimo_msg_em'],
    'nao_lidas' => (int) $r['nao_lidas'],
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

$stmtNl = $conn->prepare("SELECT COALESCE(SUM(nao_lidas),0) FROM whats_conversas WHERE loja_id = ?");
$stmtNl->execute([$lojaId]);
$totalNl = (int) $stmtNl->fetchColumn();

echo json_encode(['ok' => true, 'conversas' => $rows, 'total_nao_lidas' => $totalNl], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
