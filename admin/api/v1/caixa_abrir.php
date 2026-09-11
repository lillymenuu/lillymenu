<?php
/*
 * Versao JSON de admin/api/caixa_abrir.php para o novo frontend Next.js
 * (/cashcontrol), trocando sessao por token Bearer e corpo POST tradicional
 * por JSON.
 */

date_default_timezone_set('America/Fortaleza');

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['loja_id']  = $lojaId;

$dados = json_decode(file_get_contents('php://input'), true) ?: [];

$operadorId = (int) ($dados['operador_id'] ?? $auth['admin_id']);
if ($operadorId <= 0) {
  $operadorId = $auth['admin_id'];
}

if ($operadorId !== $auth['admin_id'] && !in_array($auth['perfil'], ['admin', 'gerente'], true)) {
  echo json_encode(['ok' => false, 'msg' => 'Sem permissao para abrir caixa para outro operador.']);
  exit;
}

$stmt = $conn->prepare("SELECT id FROM admins WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$operadorId, $lojaId]);
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Operador invalido']);
  exit;
}

$saldoInicial = (float) ($dados['saldo_inicial'] ?? 0);
$observacoes = trim((string) ($dados['observacoes'] ?? ''));

// "Hoje" calculado em PHP (fuso America/Fortaleza) — nao usar CURDATE() do MySQL, que segue
// o fuso do servidor do banco e pode divergir nas ultimas horas do dia local.
$hoje = date('Y-m-d');

$stmt = $conn->prepare("
  SELECT id, status, saldo_inicial, aberto_em
  FROM caixa_turnos
  WHERE status = 'aberto' AND loja_id = ? AND DATE(aberto_em) = ?
  ORDER BY id DESC
  LIMIT 1
");
$stmt->execute([$lojaId, $hoje]);
$caixaAberto = $stmt->fetch(PDO::FETCH_ASSOC);

if ($caixaAberto) {
  echo json_encode(['ok' => true, 'caixa' => $caixaAberto], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
    'ok' => false,
    'msg' => $dataFmt
      ? "Existe um caixa aberto do dia {$dataFmt}. Feche o caixa anterior para abrir o caixa de hoje."
      : 'Existe um caixa aberto anterior. Feche o caixa anterior para abrir o caixa de hoje.',
    'caixa' => $caixaAbertoAnterior,
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

try {
  // Data/hora calculada em PHP (fuso America/Fortaleza, ja setado no topo deste
  // arquivo) — nao usar NOW() do MySQL, que segue o fuso do servidor do banco
  // (pode ser UTC) e abria o caixa com a data do dia seguinte a noite.
  $agora = date('Y-m-d H:i:s');
  $stmt = $conn->prepare("
    INSERT INTO caixa_turnos
      (operador_id, status, saldo_inicial, aberto_em, obs_abertura, loja_id)
    VALUES
      (?, 'aberto', ?, ?, ?, ?)
  ");
  $stmt->execute([$operadorId, $saldoInicial, $agora, $observacoes ?: null, $lojaId]);
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
    'operador_id' => $operadorId,
  ]);

  echo json_encode(['ok' => true, 'caixa' => $caixa], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao abrir caixa']);
}
