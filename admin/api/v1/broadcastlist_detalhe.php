<?php
/*
 * Versao Bearer-token de admin/api/lista_transmissao_api.php?action=detalhe
 * — uma lista + os ids dos clientes membros (pra reabrir no form de edicao).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/lista_transmissao_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
listaTransmissaoEnsureModule($conn);

$id = (int) ($_GET['id'] ?? 0);

$stmt = $conn->prepare("SELECT id, nome FROM listas_transmissao WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$id, $lojaId]);
$lista = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$lista) {
  echo json_encode(['ok' => false, 'msg' => 'Lista não encontrada.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("SELECT cliente_id FROM listas_transmissao_membros WHERE lista_id = ? AND loja_id = ?");
$stmt->execute([$id, $lojaId]);
$membros = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

echo json_encode([
  'ok' => true,
  'lista' => ['id' => (int) $lista['id'], 'nome' => $lista['nome']],
  'membros' => $membros,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
