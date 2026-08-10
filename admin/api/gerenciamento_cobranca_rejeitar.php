<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/gerenciamento_module.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

gerenciamentoEnsureModule($conn);

$cobrancaId = (int) ($_POST['cobranca_id'] ?? 0);
$motivo = trim((string) ($_POST['motivo'] ?? ''));
if ($cobrancaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Cobrança inválida.']);
  exit;
}

try {
  $stmt = $conn->prepare("
    UPDATE cobrancas
    SET comprovante_arquivo = NULL, comprovante_enviado_em = NULL, motivo_rejeicao = ?, status = 'pendente'
    WHERE id = ?
  ");
  $stmt->execute([$motivo !== '' ? $motivo : 'Comprovante rejeitado.', $cobrancaId]);
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao rejeitar comprovante.']);
}
