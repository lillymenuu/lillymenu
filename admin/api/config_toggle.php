<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

// Endpoint generico pros toggles simples (switch on/off) das telas de
// configuracoes — allow-list evita gravar uma chave arbitraria em configuracoes.
$chavesPermitidas = ['versiculo_dashboard_ativo'];

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$data   = json_decode(file_get_contents('php://input'), true) ?? [];
$chave  = (string) ($data['chave'] ?? '');
$ativo  = !empty($data['ativo']);

if (!in_array($chave, $chavesPermitidas, true)) {
  echo json_encode(['ok' => false, 'msg' => 'Configuracao invalida.']);
  exit;
}

try {
  $stmt = $conn->prepare("
    INSERT INTO configuracoes (loja_id, chave, valor)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
  ");
  $stmt->execute([$lojaId, $chave, $ativo ? '1' : '0']);

  echo json_encode(['ok' => true, 'ativo' => $ativo]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar.']);
}
