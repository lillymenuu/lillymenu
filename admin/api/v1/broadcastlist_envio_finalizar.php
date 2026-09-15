<?php
/*
 * Versao Bearer-token de admin/api/lista_transmissao_api.php?action=envio_finalizar
 * — marca o envio como concluido e devolve o resumo final.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/lista_transmissao_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
listaTransmissaoEnsureModule($conn);

$dados   = json_decode(file_get_contents('php://input'), true) ?: [];
$envioId = (int) ($dados['envio_id'] ?? 0);

$conn->prepare("UPDATE listas_transmissao_envios SET status = 'concluido', finalizado_em = NOW() WHERE id = ? AND loja_id = ?")
     ->execute([$envioId, $lojaId]);

$stmt = $conn->prepare("SELECT total_destinatarios, total_enviados, total_falhas FROM listas_transmissao_envios WHERE id = ? AND loja_id = ?");
$stmt->execute([$envioId, $lojaId]);
$resumo = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$resumo) {
  echo json_encode(['ok' => false, 'msg' => 'Envio não encontrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

echo json_encode([
  'ok' => true,
  'resumo' => [
    'total_destinatarios' => (int) $resumo['total_destinatarios'],
    'total_enviados' => (int) $resumo['total_enviados'],
    'total_falhas' => (int) $resumo['total_falhas'],
  ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
