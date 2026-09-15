<?php
/*
 * Versao Bearer-token de admin/api/lista_transmissao_api.php?action=listar
 * — lista as listas de transmissao (BroadcastList) + contagem de membros.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/lista_transmissao_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
listaTransmissaoEnsureModule($conn);

$stmt = $conn->prepare("
  SELECT lt.id, lt.nome, lt.criado_em,
    (SELECT COUNT(*) FROM listas_transmissao_membros ltm WHERE ltm.lista_id = lt.id) AS total_membros
  FROM listas_transmissao lt
  WHERE lt.loja_id = ?
  ORDER BY lt.nome ASC
");
$stmt->execute([$lojaId]);
$listas = array_map(function ($l) {
  return [
    'id' => (int) $l['id'],
    'nome' => $l['nome'],
    'criado_em' => $l['criado_em'],
    'total_membros' => (int) $l['total_membros'],
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

echo json_encode(['ok' => true, 'listas' => $listas], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
