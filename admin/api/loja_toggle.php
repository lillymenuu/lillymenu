<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int)($_SESSION['loja_id'] ?? 1);
$data   = json_decode(file_get_contents('php://input'), true) ?? [];
$aberto = isset($data['aberto']) ? (bool)$data['aberto'] : true;

/* force_fechada = 1 quando admin FECHOU manualmente */
$valor = $aberto ? '0' : '1';

try {
  /* upsert em configuracoes */
  $stmt = $conn->prepare("
    INSERT INTO configuracoes (chave, valor, loja_id)
    VALUES ('loja_force_fechada', ?, ?)
    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
  ");
  $stmt->execute([$valor, $lojaId]);

  echo json_encode(['ok' => true, 'aberto' => $aberto]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}
