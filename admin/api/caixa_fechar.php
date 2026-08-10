<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$operadorId = $_SESSION['admin_id'] ?? null;
$caixaId = $_POST['caixa_id'] ?? null;
$saldoFinal = (float) ($_POST['saldo_final'] ?? 0);
$observacoes = trim($_POST['observacoes'] ?? '');

if (!$operadorId || !$caixaId) {
  echo json_encode(['ok'=>false,'msg'=>'Dados incompletos']);
  exit;
}

$stmt = $conn->prepare("
  SELECT id, status, saldo_inicial
  FROM caixa_turnos
  WHERE id = ? AND status = 'aberto' AND loja_id = ?
  LIMIT 1
");
$stmt->execute([$caixaId, $lojaId]);
$caixa = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$caixa) {
  echo json_encode(['ok'=>false,'msg'=>'Caixa nao encontrado']);
  exit;
}

try {
  $stmt = $conn->prepare("
    UPDATE caixa_turnos
    SET status = 'fechado',
        saldo_final = ?,
        fechado_em = NOW(),
        obs_fechamento = ?
    WHERE id = ? AND loja_id = ?
  ");
  $stmt->execute([$saldoFinal, $observacoes ?: null, $caixaId, $lojaId]);

  registrarOperacao($conn, 'caixa_fechado', 'caixa:' . $caixaId, [
    'saldo_final' => $saldoFinal
  ]);

  echo json_encode(['ok'=>true]);
  exit;
} catch (Exception $e) {
  echo json_encode(['ok'=>false,'msg'=>'Erro ao fechar caixa']);
  exit;
}
