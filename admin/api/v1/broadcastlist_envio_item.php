<?php
/*
 * Versao Bearer-token de admin/api/lista_transmissao_api.php?action=envio_item
 * — envia a mensagem do envio pra UM destinatario (chamado em loop pelo
 * cliente, um por vez), via whatsEnviarMensagem() ja usada pelo WhatsLilly.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/lista_transmissao_module.php';
require_once __DIR__ . '/../../helpers/whats_send.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
listaTransmissaoEnsureModule($conn);

$dados     = json_decode(file_get_contents('php://input'), true) ?: [];
$envioId   = (int) ($dados['envio_id'] ?? 0);
$clienteId = (int) ($dados['cliente_id'] ?? 0);

$stmt = $conn->prepare("SELECT mensagem FROM listas_transmissao_envios WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$envioId, $lojaId]);
$mensagem = $stmt->fetchColumn();
if ($mensagem === false) {
  echo json_encode(['ok' => false, 'enviado' => false, 'erro' => 'Envio não encontrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("SELECT telefone FROM clientes WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$clienteId, $lojaId]);
$telefone = $stmt->fetchColumn();
if (!$telefone) {
  $conn->prepare("UPDATE listas_transmissao_envios SET total_falhas = total_falhas + 1 WHERE id = ? AND loja_id = ?")
       ->execute([$envioId, $lojaId]);
  echo json_encode(['ok' => true, 'enviado' => false, 'erro' => 'Cliente sem telefone cadastrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$resultado = whatsEnviarMensagem($conn, $lojaId, $telefone, (string) $mensagem);

$campo = $resultado['ok'] ? 'total_enviados' : 'total_falhas';
$conn->prepare("UPDATE listas_transmissao_envios SET {$campo} = {$campo} + 1 WHERE id = ? AND loja_id = ?")
     ->execute([$envioId, $lojaId]);

echo json_encode(['ok' => true, 'enviado' => $resultado['ok'], 'erro' => $resultado['erro']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
