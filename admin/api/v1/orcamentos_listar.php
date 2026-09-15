<?php
/*
 * Lista os orcamentos salvos (tela Quotes) — endpoint novo, feature nunca
 * teve persistencia no legado (admin/orcamentos.php so gerava um PDF
 * efemero, sem gravar nada no banco).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/orcamentos_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
garantirOrcamentosTabelas($conn);

$status = trim((string) ($_GET['status'] ?? ''));
$where = ['o.loja_id = ?'];
$params = [$lojaId];
if (in_array($status, ['pendente', 'aprovado', 'recusado'], true)) {
  $where[] = 'o.status = ?';
  $params[] = $status;
}

$stmt = $conn->prepare("
  SELECT o.id, o.status, o.cliente_nome, o.total, o.criado_em, o.atualizado_em,
         (SELECT COUNT(*) FROM orcamento_itens oi WHERE oi.orcamento_id = o.id) AS itens_count
  FROM orcamentos o
  WHERE " . implode(' AND ', $where) . "
  ORDER BY o.criado_em DESC, o.id DESC
");
$stmt->execute($params);
$orcamentos = array_map(function ($o) {
  return [
    'id' => (int) $o['id'],
    'status' => $o['status'],
    'cliente_nome' => $o['cliente_nome'],
    'total' => (float) $o['total'],
    'itens_count' => (int) $o['itens_count'],
    'criado_em' => $o['criado_em'],
    'atualizado_em' => $o['atualizado_em'],
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

echo json_encode(['ok' => true, 'orcamentos' => $orcamentos], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
