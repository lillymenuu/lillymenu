<?php
date_default_timezone_set('America/Fortaleza');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$operadorId = $_SESSION['admin_id'] ?? null;
$tipo = $_POST['tipo'] ?? '';
$valor = (float) ($_POST['valor'] ?? 0);
$observacoes = trim($_POST['observacoes'] ?? '');

if (!$operadorId || !$tipo || $valor <= 0) {
  echo json_encode(['ok'=>false,'msg'=>'Dados incompletos']);
  exit;
}

if (!in_array($tipo, ['suprimento', 'sangria'], true)) {
  echo json_encode(['ok'=>false,'msg'=>'Tipo invalido']);
  exit;
}

$stmt = $conn->prepare("
  SELECT id
  FROM caixa_turnos
  WHERE status = 'aberto' AND loja_id = ?
  ORDER BY id DESC
  LIMIT 1
");
$stmt->execute([$lojaId]);
$caixaId = $stmt->fetchColumn();

if (!$caixaId) {
  echo json_encode(['ok'=>false,'msg'=>'Caixa fechado']);
  exit;
}

try {
  // Data/hora calculada em PHP (fuso America/Fortaleza) — nao usar NOW() do
  // MySQL, que segue o fuso do servidor do banco (pode ser UTC).
  $agora = date('Y-m-d H:i:s');
  $stmt = $conn->prepare("
    INSERT INTO caixa_movimentacoes
      (caixa_id, operador_id, tipo, valor, observacoes, criado_em, loja_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  ");
  $stmt->execute([
    $caixaId,
    $operadorId,
    $tipo,
    $valor,
    $observacoes ?: null,
    $agora,
    $lojaId
  ]);

  registrarOperacao($conn, 'caixa_movimentacao', 'caixa:' . $caixaId, [
    'tipo' => $tipo,
    'valor' => $valor
  ]);

  echo json_encode(['ok'=>true, 'caixa_id'=>$caixaId]);
  exit;
} catch (Exception $e) {
  echo json_encode(['ok'=>false,'msg'=>'Erro ao registrar movimentacao']);
  exit;
}
