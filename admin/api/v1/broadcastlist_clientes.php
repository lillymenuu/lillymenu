<?php
/*
 * Versao Bearer-token de admin/api/lista_transmissao_api.php?action=clientes_elegiveis
 * — clientes da loja com telefone cadastrado (elegiveis pra entrar numa
 * lista de transmissao).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/lista_transmissao_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
listaTransmissaoEnsureModule($conn);

$stmt = $conn->prepare("
  SELECT id, nome, telefone
  FROM clientes
  WHERE loja_id = ? AND telefone IS NOT NULL AND telefone <> ''
  ORDER BY nome ASC
");
$stmt->execute([$lojaId]);
$clientes = array_map(function ($c) {
  return ['id' => (int) $c['id'], 'nome' => $c['nome'], 'telefone' => $c['telefone']];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

echo json_encode(['ok' => true, 'clientes' => $clientes], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
