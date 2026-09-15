<?php
/*
 * Versao Bearer-token de admin/api/lista_transmissao_api.php?action=envio_iniciar
 * — valida mensagem + Evolution configurada, cria a linha de envio e
 * devolve os destinatarios (membros da lista com telefone valido) pro
 * cliente disparar item a item.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/lista_transmissao_module.php';
require_once __DIR__ . '/../../helpers/whats_send.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
listaTransmissaoEnsureModule($conn);

$dados    = json_decode(file_get_contents('php://input'), true) ?: [];
$listaId  = (int) ($dados['lista_id'] ?? 0);
$mensagem = trim((string) ($dados['mensagem'] ?? ''));

if ($mensagem === '') {
  echo json_encode(['ok' => false, 'msg' => 'Escreva uma mensagem antes de enviar.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if (!whatsEvolutionConfigurada($conn, $lojaId)) {
  echo json_encode(['ok' => false, 'msg' => 'WhatsApp não configurado para esta loja. Configure a integração antes de enviar.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("SELECT id, nome FROM listas_transmissao WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$listaId, $lojaId]);
$lista = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$lista) {
  echo json_encode(['ok' => false, 'msg' => 'Lista não encontrada.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("
  SELECT c.id AS cliente_id, c.nome, c.telefone
  FROM listas_transmissao_membros ltm
  INNER JOIN clientes c ON c.id = ltm.cliente_id AND c.loja_id = ltm.loja_id
  WHERE ltm.lista_id = ? AND ltm.loja_id = ? AND c.telefone IS NOT NULL AND c.telefone <> ''
  ORDER BY c.nome ASC
");
$stmt->execute([$listaId, $lojaId]);
$destinatarios = array_map(function ($d) {
  return ['cliente_id' => (int) $d['cliente_id'], 'nome' => $d['nome'], 'telefone' => $d['telefone']];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

if (!$destinatarios) {
  echo json_encode(['ok' => false, 'msg' => 'Nenhum destinatário com WhatsApp válido neste grupo.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("
  INSERT INTO listas_transmissao_envios (lista_id, loja_id, mensagem, total_destinatarios)
  VALUES (?, ?, ?, ?)
");
$stmt->execute([$listaId, $lojaId, $mensagem, count($destinatarios)]);
$envioId = (int) $conn->lastInsertId();

echo json_encode(['ok' => true, 'envio_id' => $envioId, 'destinatarios' => $destinatarios], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
