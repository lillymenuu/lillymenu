<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/mercadopago.php';

/*
 * Rota de polling: usada pelo front-end de admin/pagamento.php enquanto a tela de
 * renovacao esta aberta. O ambiente local (XAMPP) nao recebe webhook do Mercado Pago
 * porque localhost nao e publico — esta rota e o jeito real de confirmar o pagamento
 * aqui. MESMO depois que o webhook (admin/api/mercadopago_webhook.php) estiver ativo
 * em producao, esta rota deve continuar existindo como fallback caso a entrega do
 * webhook falhe ou atrase.
 */

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') === 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

garantirMercadopagoColunas($conn);

$lojaId = (int) ($_SESSION['loja_id'] ?? 0);
$cobrancaId = (int) ($_GET['cobranca_id'] ?? 0);
if ($lojaId <= 0 || $cobrancaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Dados invalidos.']);
  exit;
}

$stmt = $conn->prepare("
  SELECT c.id, c.status, c.mp_payment_id
  FROM cobrancas c
  INNER JOIN assinaturas a ON a.id = c.assinatura_id
  WHERE c.id = ? AND a.loja_id = ?
  LIMIT 1
");
$stmt->execute([$cobrancaId, $lojaId]);
$cobranca = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$cobranca) {
  echo json_encode(['ok' => false, 'msg' => 'Cobranca nao encontrada.']);
  exit;
}

if ($cobranca['status'] === 'pago') {
  echo json_encode(['ok' => true, 'pago' => true]);
  exit;
}

if (empty($cobranca['mp_payment_id'])) {
  echo json_encode(['ok' => true, 'pago' => false]);
  exit;
}

$pagamentoMp = mpConsultarPagamento((string) $cobranca['mp_payment_id']);
if ($pagamentoMp && ($pagamentoMp['status'] ?? '') === 'approved') {
  confirmarPagamentoAssinatura($conn, $cobrancaId, (string) $cobranca['mp_payment_id']);
  echo json_encode(['ok' => true, 'pago' => true]);
  exit;
}

echo json_encode(['ok' => true, 'pago' => false]);
