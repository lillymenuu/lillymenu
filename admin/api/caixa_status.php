<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$operadorId = $_SESSION['admin_id'] ?? null;
if (!$operadorId) {
  echo json_encode(['ok'=>false,'msg'=>'Operador nao identificado']);
  exit;
}

$stmt = $conn->prepare("
  SELECT id, status, saldo_inicial, aberto_em, (DATE(aberto_em) < CURDATE()) AS dia_anterior
  FROM caixa_turnos
  WHERE status = 'aberto' AND loja_id = ?
  ORDER BY id DESC
  LIMIT 1
");
$stmt->execute([$lojaId]);
$caixa = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

echo json_encode(['ok'=>true,'caixa'=>$caixa]);
exit;
