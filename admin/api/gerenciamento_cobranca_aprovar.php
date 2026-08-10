<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/gerenciamento_module.php';
require_once __DIR__ . '/../helpers/mercadopago.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

gerenciamentoEnsureModule($conn);

$cobrancaId = (int) ($_POST['cobranca_id'] ?? 0);
if ($cobrancaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Cobrança inválida.']);
  exit;
}

if (confirmarPagamentoAssinatura($conn, $cobrancaId)) {
  echo json_encode(['ok' => true]);
} else {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao aprovar pagamento.']);
}
