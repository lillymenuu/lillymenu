<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$operadorSessao = $_SESSION['admin_id'] ?? null;
$perfilSessao = $_SESSION['admin_perfil'] ?? 'admin';
if (!$operadorSessao) {
  echo json_encode(['ok'=>false,'msg'=>'Operador nao identificado']);
  exit;
}

$operadorId = (int) ($_POST['operador_id'] ?? $operadorSessao);
if ($operadorId <= 0) {
  $operadorId = (int) $operadorSessao;
}

if ($operadorId !== (int) $operadorSessao && !in_array($perfilSessao, ['admin', 'gerente'], true)) {
  echo json_encode(['ok'=>false,'msg'=>'Sem permissao para abrir caixa para outro operador.']);
  exit;
}

$stmt = $conn->prepare("SELECT id FROM admins WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$operadorId, $lojaId]);
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok'=>false,'msg'=>'Operador invalido']);
  exit;
}

$saldoInicial = (float) ($_POST['saldo_inicial'] ?? 0);
$observacoes = trim($_POST['observacoes'] ?? '');

$stmt = $conn->prepare("
  SELECT id, status, saldo_inicial, aberto_em
  FROM caixa_turnos
  WHERE status = 'aberto' AND loja_id = ? AND DATE(aberto_em) = CURDATE()
  ORDER BY id DESC
  LIMIT 1
");
$stmt->execute([$lojaId]);
$caixaAberto = $stmt->fetch(PDO::FETCH_ASSOC);

if ($caixaAberto) {
  echo json_encode(['ok'=>true,'caixa'=>$caixaAberto]);
  exit;
}

$stmt = $conn->prepare("
  SELECT id, status, saldo_inicial, aberto_em
  FROM caixa_turnos
  WHERE status = 'aberto' AND loja_id = ?
  ORDER BY id DESC
  LIMIT 1
");
$stmt->execute([$lojaId]);
$caixaAbertoAnterior = $stmt->fetch(PDO::FETCH_ASSOC);
if ($caixaAbertoAnterior) {
  $dataFmt = !empty($caixaAbertoAnterior['aberto_em'])
    ? date('d/m/Y', strtotime((string) $caixaAbertoAnterior['aberto_em']))
    : '';
  echo json_encode([
    'ok'=>false,
    'msg'=>$dataFmt
      ? "Existe um caixa aberto do dia {$dataFmt}. Feche o caixa anterior para abrir o caixa de hoje."
      : 'Existe um caixa aberto anterior. Feche o caixa anterior para abrir o caixa de hoje.',
    'caixa'=>$caixaAbertoAnterior
  ]);
  exit;
}

try {
  $stmt = $conn->prepare("
    INSERT INTO caixa_turnos
      (operador_id, status, saldo_inicial, aberto_em, obs_abertura, loja_id)
    VALUES
      (?, 'aberto', ?, NOW(), ?, ?)
  ");
  $stmt->execute([$operadorId, $saldoInicial, $observacoes ?: null, $lojaId]);
  $caixaId = $conn->lastInsertId();

  $stmt = $conn->prepare("
    SELECT id, status, saldo_inicial, aberto_em
    FROM caixa_turnos
    WHERE id = ? AND loja_id = ?
    LIMIT 1
  ");
  $stmt->execute([$caixaId, $lojaId]);
  $caixa = $stmt->fetch(PDO::FETCH_ASSOC);

  registrarOperacao($conn, 'caixa_aberto', 'caixa:' . $caixaId, [
    'saldo_inicial' => $saldoInicial,
    'operador_id' => $operadorId
  ]);

  echo json_encode(['ok'=>true,'caixa'=>$caixa]);
  exit;
} catch (Exception $e) {
  echo json_encode(['ok'=>false,'msg'=>'Erro ao abrir caixa']);
  exit;
}
