<?php
/*
 * Versao Bearer-token de admin/api/whats_api.php?action=mensagens — abre
 * uma conversa: mensagens (zera nao_lidas) + pedidos do cliente casados
 * pelo numero (mesma logica de sufixo de 9 digitos do legado).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$conversaId = (int) ($_GET['conversa_id'] ?? 0);

$stmt = $conn->prepare("SELECT id, numero, COALESCE(nome, numero) AS nome FROM whats_conversas WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$conversaId, $lojaId]);
$conversa = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$conversa) {
  echo json_encode(['ok' => false, 'msg' => 'Conversa não encontrada.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("
  SELECT m.id, m.direcao, m.tipo, m.mensagem, m.pedido_id, m.whats_msg_id,
         DATE_FORMAT(m.created_at, '%H:%i') AS hora,
         DATE_FORMAT(m.created_at, '%d/%m/%Y') AS data_fmt,
         m.created_at
  FROM whats_mensagens m
  WHERE m.conversa_id = ?
  ORDER BY m.id ASC
  LIMIT 200
");
$stmt->execute([$conversaId]);
$msgs = array_map(function ($m) {
  return [
    'id' => (int) $m['id'],
    'direcao' => $m['direcao'],
    'tipo' => $m['tipo'],
    'mensagem' => $m['mensagem'],
    'pedido_id' => $m['pedido_id'] !== null ? (int) $m['pedido_id'] : null,
    'hora' => $m['hora'],
    'data_fmt' => $m['data_fmt'],
    'falhou' => $m['direcao'] === 'saida' && empty($m['whats_msg_id']),
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

$conn->prepare("UPDATE whats_conversas SET nao_lidas = 0 WHERE id = ?")->execute([$conversaId]);

$numSuffix = '%' . substr(preg_replace('/\D/', '', $conversa['numero']), -9) . '%';
$stmt = $conn->prepare("
  SELECT p.id, p.total, p.status, p.criado_em,
         DATE_FORMAT(p.criado_em, '%d/%m/%Y %H:%i') AS criado_fmt
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  WHERE p.loja_id = ?
    AND REPLACE(REPLACE(REPLACE(REPLACE(c.telefone,'(',''),')',''),'-',''),' ','') LIKE ?
  ORDER BY p.id DESC
  LIMIT 10
");
$stmt->execute([$lojaId, $numSuffix]);
$pedidos = array_map(function ($p) {
  return [
    'id' => (int) $p['id'],
    'total' => (float) $p['total'],
    'status' => $p['status'],
    'criado_fmt' => $p['criado_fmt'],
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

echo json_encode([
  'ok' => true,
  'conversa' => [
    'id' => (int) $conversa['id'],
    'numero' => $conversa['numero'],
    'nome' => $conversa['nome'],
  ],
  'mensagens' => $msgs,
  'pedidos' => $pedidos,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
