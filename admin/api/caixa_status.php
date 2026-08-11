<?php
date_default_timezone_set('America/Fortaleza');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$operadorId = $_SESSION['admin_id'] ?? null;
if (!$operadorId) {
  echo json_encode(['ok'=>false,'msg'=>'Operador nao identificado']);
  exit;
}

// Usa a data de "hoje" calculada em PHP (fuso America/Fortaleza), nao o CURDATE() do MySQL —
// o servidor do banco pode estar em outro fuso (ex: UTC), o que faria o dia virar ~3h antes
// da meia-noite local e marcar erroneamente um caixa aberto hoje como "do dia anterior".
$hoje = date('Y-m-d');

$stmt = $conn->prepare("
  SELECT id, status, saldo_inicial, aberto_em, (DATE(aberto_em) < ?) AS dia_anterior
  FROM caixa_turnos
  WHERE status = 'aberto' AND loja_id = ?
  ORDER BY id DESC
  LIMIT 1
");
$stmt->execute([$hoje, $lojaId]);
$caixa = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

echo json_encode(['ok'=>true,'caixa'=>$caixa]);
exit;
