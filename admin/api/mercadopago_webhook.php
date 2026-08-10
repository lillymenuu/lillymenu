<?php
/*
 * Webhook publico do Mercado Pago — sem protect.php/sessao, chamado pelo servidor
 * do Mercado Pago, nao por um admin logado. So funciona em producao (localhost nao
 * e publico); em desenvolvimento o fallback e o polling em admin/api/pagamento_pix_status.php.
 * Responde sempre 200 pra evitar retry-storm do MP, mesmo quando ignora a notificacao.
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/mercadopago.php';

header('Content-Type: application/json; charset=utf-8');

garantirMercadopagoColunas($conn);

$xSignature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
$xRequestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? '';
$dataId = $_GET['data_id'] ?? $_GET['id'] ?? '';

if ($dataId === '') {
  $raw = file_get_contents('php://input');
  $payload = json_decode((string) $raw, true);
  $dataId = $payload['data']['id'] ?? '';
}
$dataId = (string) $dataId;

if ($dataId === '' || !mpValidarAssinaturaWebhook($xSignature, $xRequestId, $dataId)) {
  echo json_encode(['ok' => true, 'ignorado' => true]);
  exit;
}

// Nunca confia em valores do corpo do webhook para liberar acesso — reconsulta a API.
$pagamento = mpConsultarPagamento($dataId);
if (!$pagamento || ($pagamento['status'] ?? '') !== 'approved') {
  echo json_encode(['ok' => true, 'aprovado' => false]);
  exit;
}

$stmt = $conn->prepare("SELECT id FROM cobrancas WHERE mp_payment_id = ? LIMIT 1");
$stmt->execute([$dataId]);
$cobrancaId = (int) $stmt->fetchColumn();

if (!$cobrancaId) {
  $externalRef = (int) ($pagamento['external_reference'] ?? 0);
  if ($externalRef > 0) {
    $cobrancaId = $externalRef;
  }
}

if ($cobrancaId > 0) {
  confirmarPagamentoAssinatura($conn, $cobrancaId, $dataId);
}

echo json_encode(['ok' => true]);
