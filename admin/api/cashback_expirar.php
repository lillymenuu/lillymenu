<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/config.php';

header('Content-Type: application/json');

session_start();

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

$tokenConfig = (string) config($conn, 'cashback_job_token', '');
$tokenRecebido = (string) ($_GET['token'] ?? $_POST['token'] ?? '');
$autorizado = false;
$lojaIdFiltro = 0;

if ($tokenConfig !== '' && hash_equals($tokenConfig, $tokenRecebido)) {
  $autorizado = true;
} elseif (!empty($_SESSION['admin_id'])) {
  $autorizado = true;
  $perfilSessao = $_SESSION['admin_perfil'] ?? '';
  if ($perfilSessao !== 'superadmin') {
    $lojaIdFiltro = (int) ($_SESSION['loja_id'] ?? 0);
  }
}

if (!$autorizado) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'msg' => 'Nao autorizado']);
  exit;
}

if (!tabelaExiste($conn, 'cashback_movimentacoes')) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de movimentacoes nao encontrada.']);
  exit;
}

$clientesColunas = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
if (!in_array('cashback_saldo', $clientesColunas, true)) {
  echo json_encode(['ok' => false, 'msg' => 'Coluna cashback_saldo nao encontrada.']);
  exit;
}

$whereLoja = $lojaIdFiltro > 0 ? " AND m.loja_id = ?" : "";
$paramsExpirados = [];
if ($lojaIdFiltro > 0) {
  $paramsExpirados[] = $lojaIdFiltro;
}

$stmtExpirados = $conn->prepare("
  SELECT m.id, m.cliente_id, m.valor, m.expira_em, m.loja_id,
    COALESCE((
      SELECT SUM(valor)
      FROM cashback_movimentacoes u
      WHERE u.referencia_id = m.id
        AND u.tipo IN ('uso','expirado')
        AND u.loja_id = m.loja_id
    ), 0) AS usado
  FROM cashback_movimentacoes m
  WHERE m.tipo = 'entrada'
    AND m.expira_em IS NOT NULL
    AND m.expira_em < CURDATE()
    {$whereLoja}
");
$stmtExpirados->execute($paramsExpirados);
$expiracoes = $stmtExpirados->fetchAll(PDO::FETCH_ASSOC);

if (!$expiracoes) {
  echo json_encode(['ok' => true, 'expirados' => 0, 'valor_total' => 0]);
  exit;
}

$conn->beginTransaction();
$stmtSaldo = $conn->prepare("SELECT cashback_saldo FROM clientes WHERE id = ? AND loja_id = ? FOR UPDATE");
$stmtAtualiza = $conn->prepare("
  UPDATE clientes
  SET cashback_saldo = GREATEST(0, cashback_saldo - ?)
  WHERE id = ? AND loja_id = ?
");
$stmtMov = $conn->prepare("
  INSERT INTO cashback_movimentacoes
    (cliente_id, pedido_id, tipo, valor, saldo_antes, saldo_depois, expira_em, referencia_id, loja_id)
  VALUES
    (?, NULL, 'expirado', ?, ?, ?, ?, ?, ?)
");

$saldosCache = [];
$totalExpirado = 0.0;
$linhas = 0;

foreach ($expiracoes as $exp) {
  $clienteId = (int) ($exp['cliente_id'] ?? 0);
  $lojaIdMov = (int) ($exp['loja_id'] ?? 0);
  if ($clienteId <= 0) {
    continue;
  }
  $valor = (float) ($exp['valor'] ?? 0);
  $usado = (float) ($exp['usado'] ?? 0);
  $restante = $valor - $usado;
  if ($restante <= 0.009) {
    continue;
  }

  if (!array_key_exists($clienteId, $saldosCache)) {
    $stmtSaldo->execute([$clienteId, $lojaIdMov]);
    $saldosCache[$clienteId] = (float) $stmtSaldo->fetchColumn();
  }

  $saldoAntes = $saldosCache[$clienteId];
  $expirar = min($restante, $saldoAntes);
  if ($expirar <= 0.009) {
    continue;
  }

  $saldoDepois = max(0, $saldoAntes - $expirar);
  $stmtAtualiza->execute([$expirar, $clienteId, $lojaIdMov]);
  $stmtMov->execute([
    $clienteId,
    $expirar,
    $saldoAntes,
    $saldoDepois,
    $exp['expira_em'],
    (int) $exp['id'],
    $lojaIdMov
  ]);

  $saldosCache[$clienteId] = $saldoDepois;
  $totalExpirado += $expirar;
  $linhas++;
}

$conn->commit();

echo json_encode([
  'ok' => true,
  'expirados' => $linhas,
  'valor_total' => round($totalExpirado, 2)
]);
