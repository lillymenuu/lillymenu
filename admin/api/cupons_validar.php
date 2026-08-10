<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$codigo = strtoupper(trim($_POST['codigo'] ?? ''));
$subtotal = (float) ($_POST['subtotal'] ?? 0);
$tipoPedido = trim($_POST['tipo'] ?? '');
$taxaEntrega = (float) ($_POST['taxa'] ?? 0);
$clienteId = (int) ($_POST['cliente_id'] ?? 0);

if ($codigo === '') {
  echo json_encode(['ok' => false, 'msg' => 'Informe o cupom.']);
  exit;
}

$stmt = $conn->prepare("SHOW TABLES LIKE 'cupons'");
$stmt->execute();
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de cupons nao encontrada.']);
  exit;
}

$colunas = $conn->query("SHOW COLUMNS FROM cupons")->fetchAll(PDO::FETCH_COLUMN, 0);
$temPrimeira = in_array('primeira_compra', $colunas, true);
$temPublico = in_array('publico', $colunas, true);

$campos = ['id', 'codigo', 'tipo', 'desconto', 'minimo', 'quantidade_total', 'quantidade_usada', 'ativo'];
if ($temPrimeira) $campos[] = 'primeira_compra';
if ($temPublico) $campos[] = 'publico';

$stmt = $conn->prepare("
  SELECT " . implode(',', $campos) . "
  FROM cupons
  WHERE codigo = ? AND loja_id = ?
  LIMIT 1
");
$stmt->execute([$codigo, $lojaId]);
$cupom = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$cupom) {
  echo json_encode(['ok' => false, 'msg' => 'Cupom nao encontrado.']);
  exit;
}
if (!(int) $cupom['ativo']) {
  echo json_encode(['ok' => false, 'msg' => 'Cupom indisponivel.']);
  exit;
}

$total = (int) $cupom['quantidade_total'];
$usado = (int) $cupom['quantidade_usada'];
if ($total > 0 && $usado >= $total) {
  echo json_encode(['ok' => false, 'msg' => 'Cupom esgotado.']);
  exit;
}

$minimo = (float) $cupom['minimo'];
if ($minimo > 0 && $subtotal < $minimo) {
  echo json_encode(['ok' => false, 'msg' => 'Pedido abaixo do minimo do cupom.']);
  exit;
}

$tipo = $cupom['tipo'] === 'valor' ? 'valor' : ($cupom['tipo'] === 'frete' ? 'frete' : 'percent');
$desconto = (float) $cupom['desconto'];

if ($temPrimeira && (int) ($cupom['primeira_compra'] ?? 0) === 1) {
  if ($clienteId <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'Cliente obrigatorio para este cupom.']);
    exit;
  }
  $stmt = $conn->prepare("SELECT COUNT(*) FROM pedidos WHERE cliente_id = ? AND loja_id = ?");
  $stmt->execute([$clienteId, $lojaId]);
  if ((int) $stmt->fetchColumn() > 0) {
    echo json_encode(['ok' => false, 'msg' => 'Cupom valido apenas para primeira compra.']);
    exit;
  }
}

if ($tipo === 'frete') {
  if ($tipoPedido !== 'entrega') {
    echo json_encode(['ok' => false, 'msg' => 'Cupom valido apenas para entrega.']);
    exit;
  }
  $valorAplicado = max(0, $taxaEntrega);
} else {
  $valorAplicado = $tipo === 'percent'
    ? ($subtotal * ($desconto / 100))
    : $desconto;
}

echo json_encode([
  'ok' => true,
  'codigo' => $cupom['codigo'],
  'tipo' => $tipo,
  'desconto' => $desconto,
  'valor' => round($valorAplicado, 2),
  'primeira_compra' => $temPrimeira ? (int) ($cupom['primeira_compra'] ?? 0) : 0,
  'publico' => $temPublico ? (int) ($cupom['publico'] ?? 0) : 0,
  'msg' => 'Cupom aplicado.'
]);
exit;
