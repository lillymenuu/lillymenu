<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$caixaId = (int) ($_GET['caixa_id'] ?? 0);
if ($caixaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Caixa inválido']);
  exit;
}

$pedidoColunas = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temCaixaPedido = in_array('caixa_id', $pedidoColunas, true);
$temStatusPedido = in_array('status', $pedidoColunas, true);
$temFormaPedido = in_array('forma_pagamento', $pedidoColunas, true);
$temCodigoPedido = in_array('codigo', $pedidoColunas, true);
$codigoExpr = $temCodigoPedido ? "COALESCE(NULLIF(p.codigo,''), p.id)" : "p.id";

$stmt = $conn->prepare("
  SELECT c.*, a.nome AS operador_nome
  FROM caixa_turnos c
  LEFT JOIN admins a ON a.id = c.operador_id
  WHERE c.id = ? AND c.loja_id = ?
  LIMIT 1
");
$stmt->execute([$caixaId, $lojaId]);
$caixa = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$caixa) {
  echo json_encode(['ok' => false, 'msg' => 'Caixa não encontrado']);
  exit;
}

$abertoEm = $caixa['aberto_em'] ?? null;
$fechadoEm = $caixa['fechado_em'] ?: date('Y-m-d H:i:s');

$wherePedidos = ["p.loja_id = ?"];
$paramsPedidos = [$lojaId];
if ($temStatusPedido) {
  $wherePedidos[] = "p.status <> 'cancelado'";
}
if ($temCaixaPedido) {
  $wherePedidos[] = "p.caixa_id = ?";
  $paramsPedidos[] = $caixaId;
} else {
  $wherePedidos[] = "p.criado_em BETWEEN ? AND ?";
  $paramsPedidos[] = $abertoEm;
  $paramsPedidos[] = $fechadoEm;
}
$wherePedidosSql = 'WHERE ' . implode(' AND ', $wherePedidos);

$pagamentos = [];
$entradaPedidosTotal = 0.0;
try {
  $stmt = $conn->prepare("
    SELECT
      CONCAT('pg-', pp.id) AS uid,
      COALESCE(NULLIF(pp.forma,''), " . ($temFormaPedido ? "NULLIF(p.forma_pagamento,'')" : "NULL") . ", 'outro') AS forma,
      COALESCE(pp.valor, 0) AS valor,
      COALESCE(pp.criado_em, p.criado_em) AS criado_em,
      CONCAT('Pedido #', {$codigoExpr}) AS observacoes,
      'entrada' AS direcao,
      'LILLY' AS origem
    FROM pedido_pagamentos pp
    JOIN pedidos p ON p.id = pp.pedido_id AND p.loja_id = pp.loja_id
    {$wherePedidosSql}
    ORDER BY COALESCE(pp.criado_em, p.criado_em) DESC
  ");
  $stmt->execute($paramsPedidos);
  $pagamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
  $pagamentos = [];
}

if (!$pagamentos) {
  $stmt = $conn->prepare("
    SELECT
      CONCAT('pd-', p.id) AS uid,
      " . ($temFormaPedido ? "COALESCE(NULLIF(p.forma_pagamento,''), 'outro')" : "'outro'") . " AS forma,
      COALESCE(p.total, 0) AS valor,
      p.criado_em AS criado_em,
      CONCAT('Pedido #', {$codigoExpr}) AS observacoes,
      'entrada' AS direcao,
      'LILLY' AS origem
    FROM pedidos p
    {$wherePedidosSql}
    ORDER BY p.criado_em DESC
  ");
  $stmt->execute($paramsPedidos);
  $pagamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$movimentos = [];
$entradaManual = 0.0;
$saidaManual = 0.0;
try {
  $stmt = $conn->prepare("
    SELECT
      CONCAT('mv-', m.id) AS uid,
      CASE WHEN m.tipo = 'sangria' THEN 'saida' ELSE 'entrada' END AS direcao,
      'manual' AS forma,
      COALESCE(m.valor, 0) AS valor,
      m.criado_em,
      COALESCE(NULLIF(m.observacoes, ''), CASE WHEN m.tipo = 'sangria' THEN 'Sangria manual' ELSE 'Suprimento manual' END) AS observacoes,
      'MANUAL' AS origem
    FROM caixa_movimentacoes m
    WHERE m.loja_id = ? AND m.caixa_id = ?
    ORDER BY m.criado_em DESC, m.id DESC
  ");
  $stmt->execute([$lojaId, $caixaId]);
  $movimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
  $movimentos = [];
}

$linhas = array_merge($pagamentos, $movimentos);
usort($linhas, static function ($a, $b) {
  $ta = strtotime((string) ($a['criado_em'] ?? '')) ?: 0;
  $tb = strtotime((string) ($b['criado_em'] ?? '')) ?: 0;
  return $tb <=> $ta;
});

$totaisForma = [
  'pix' => 0.0,
  'dinheiro' => 0.0,
  'credito' => 0.0,
  'debito' => 0.0,
  'voucher' => 0.0,
  'outro' => 0.0,
];

$normalizar = static function (?string $forma): string {
  $valor = mb_strtolower(trim((string) $forma), 'UTF-8');
  $valor = str_replace(
    ['ã','á','à','â','é','ê','í','ó','ô','õ','ú','ç'],
    ['a','a','a','a','e','e','i','o','o','o','u','c'],
    $valor
  );
  return match (true) {
    $valor === 'pix' || str_contains($valor, 'pix') => 'pix',
    str_contains($valor, 'dinheiro') || str_contains($valor, 'cash') => 'dinheiro',
    str_contains($valor, 'debito') => 'debito',
    str_contains($valor, 'credito') => 'credito',
    str_contains($valor, 'voucher') || str_contains($valor, 'vale') => 'voucher',
    default => 'outro',
  };
};

foreach ($pagamentos as $item) {
  $forma = $normalizar($item['forma'] ?? 'outro');
  $totaisForma[$forma] += (float) ($item['valor'] ?? 0);
  $entradaPedidosTotal += (float) ($item['valor'] ?? 0);
}
foreach ($movimentos as $item) {
  if (($item['direcao'] ?? '') === 'saida') {
    $saidaManual += (float) ($item['valor'] ?? 0);
  } else {
    $entradaManual += (float) ($item['valor'] ?? 0);
  }
}

$entradaTotal = $entradaPedidosTotal + $entradaManual;
$saidaTotal = $saidaManual;
$saldoTotal = $entradaTotal - $saidaTotal;

echo json_encode([
  'ok' => true,
  'caixa' => [
    'id' => (int) $caixa['id'],
    'status' => $caixa['status'],
    'aberto_em' => $caixa['aberto_em'],
    'fechado_em' => $caixa['fechado_em'],
    'saldo_inicial' => (float) ($caixa['saldo_inicial'] ?? 0),
    'saldo_final' => $caixa['saldo_final'] !== null ? (float) $caixa['saldo_final'] : null,
    'operador' => $caixa['operador_nome'] ?? '-',
  ],
  'resumo' => [
    'entrada' => $entradaTotal,
    'saida' => $saidaTotal,
    'saldo' => $saldoTotal,
    'pedidos_total' => $entradaPedidosTotal,
    'manual_entrada' => $entradaManual,
    'manual_saida' => $saidaManual,
  ],
  'formas' => $totaisForma,
  'linhas' => $linhas,
]);
