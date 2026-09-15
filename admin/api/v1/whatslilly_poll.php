<?php
/*
 * Versao Bearer-token de admin/api/whats_api.php?action=poll — so
 * mensagens novas de uma conversa (after_id) + total de nao-lidas, pro
 * polling periodico do chat aberto.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$conversaId = (int) ($_GET['conversa_id'] ?? 0);
$afterId    = (int) ($_GET['after_id'] ?? 0);

$stmt = $conn->prepare("SELECT id FROM whats_conversas WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$conversaId, $lojaId]);
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Conversa não encontrada.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("
  SELECT m.id, m.direcao, m.tipo, m.mensagem, m.whats_msg_id,
         DATE_FORMAT(m.created_at, '%H:%i') AS hora,
         DATE_FORMAT(m.created_at, '%d/%m/%Y') AS data_fmt
  FROM whats_mensagens m
  WHERE m.conversa_id = ? AND m.id > ?
  ORDER BY m.id ASC
  LIMIT 50
");
$stmt->execute([$conversaId, $afterId]);
$msgs = array_map(function ($m) {
  return [
    'id' => (int) $m['id'],
    'direcao' => $m['direcao'],
    'tipo' => $m['tipo'],
    'mensagem' => $m['mensagem'],
    'hora' => $m['hora'],
    'data_fmt' => $m['data_fmt'],
    'falhou' => $m['direcao'] === 'saida' && empty($m['whats_msg_id']),
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

if ($msgs) {
  $conn->prepare("UPDATE whats_conversas SET nao_lidas = 0 WHERE id = ?")->execute([$conversaId]);
}

$stmtNl = $conn->prepare("SELECT COALESCE(SUM(nao_lidas),0) FROM whats_conversas WHERE loja_id = ?");
$stmtNl->execute([$lojaId]);
$totalNl = (int) $stmtNl->fetchColumn();

echo json_encode(['ok' => true, 'mensagens' => $msgs, 'total_nao_lidas' => $totalNl], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
