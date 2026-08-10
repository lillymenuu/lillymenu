<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

exigirPerfil(['admin', 'gerente']);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$ativo = isset($_POST['ativo']) && $_POST['ativo'] === '1' ? '1' : '0';

try {
  $stmt = $conn->prepare("
    INSERT INTO configuracoes (loja_id, chave, valor)
    VALUES (?, 'cross_sell_ativo', ?)
    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
  ");
  $stmt->execute([$lojaId, $ativo]);
  echo json_encode(['ok' => true, 'ativo' => $ativo === '1']);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar configuracao.']);
}
