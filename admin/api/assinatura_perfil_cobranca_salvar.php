<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId = (int) ($_SESSION['loja_id'] ?? 0);
$cpf = trim((string) ($_POST['cpf'] ?? ''));
$telefone = trim((string) ($_POST['telefone'] ?? ''));

if ($lojaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Loja invalida.']);
  exit;
}

try {
  $stmt = $conn->prepare("
    INSERT INTO configuracoes (loja_id, chave, valor)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE valor = VALUES(valor), loja_id = VALUES(loja_id)
  ");
  $stmt->execute([$lojaId, 'cobranca_cpf', $cpf]);
  $stmt->execute([$lojaId, 'cobranca_telefone', $telefone]);
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar perfil de cobranca.']);
}
