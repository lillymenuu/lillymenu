<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$clienteId = (int)($_GET['cliente_id'] ?? 0);
if ($clienteId <= 0) {
  echo json_encode(['ok' => false]);
  exit;
}

$periodo = (int)($_GET['periodo'] ?? 30);
if ($periodo <= 0) $periodo = 30;
$tipo = trim($_GET['tipo'] ?? 'todos');
$pagina = max(1, (int)($_GET['pagina'] ?? 1));
$limite = 3;
$offset = ($pagina - 1) * $limite;

$where = "WHERE p.cliente_id = ? AND p.loja_id = ?";
$params = [$clienteId, $lojaId];

if ($periodo > 0) {
  $where .= " AND p.criado_em >= DATE_SUB(NOW(), INTERVAL ? DAY)";
  $params[] = $periodo;
}
if ($tipo !== '' && $tipo !== 'todos') {
  $where .= " AND p.tipo = ?";
  $params[] = $tipo;
}

$stmt = $conn->prepare("SELECT COUNT(*) FROM pedidos p $where");
$stmt->execute($params);
$total = (int)$stmt->fetchColumn();
$paginas = max(1, (int)ceil($total / $limite));

$stmt = $conn->prepare("
  SELECT p.id, p.total, p.tipo, p.criado_em
  FROM pedidos p
  $where
  ORDER BY p.criado_em DESC
  LIMIT $limite OFFSET $offset
");
$stmt->execute($params);
$pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

$resumos = [];
if ($pedidos) {
  $ids = array_map(fn($p) => (int)$p['id'], $pedidos);
  $placeholders = implode(',', array_fill(0, count($ids), '?'));

  $stmt = $conn->prepare("
    SELECT pedido_id, produto_nome, quantidade
    FROM pedido_itens
    WHERE pedido_id IN ($placeholders) AND loja_id = ?
    ORDER BY id ASC
  ");
  $stmt->execute([...$ids, $lojaId]);
  $primeiros = [];
  foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $item) {
    $pid = (int)$item['pedido_id'];
    if (!isset($primeiros[$pid])) {
      $primeiros[$pid] = $item;
    }
  }

  $stmt = $conn->prepare("
    SELECT pedido_id, COUNT(*) AS itens_total
    FROM pedido_itens
    WHERE pedido_id IN ($placeholders) AND loja_id = ?
    GROUP BY pedido_id
  ");
  $stmt->execute([...$ids, $lojaId]);
  $contagem = [];
  foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $contagem[(int)$row['pedido_id']] = (int)$row['itens_total'];
  }

  foreach ($pedidos as $p) {
    $pid = (int)$p['id'];
    $resumo = '';
    if (isset($primeiros[$pid])) {
      $item = $primeiros[$pid];
      $resumo = $item['quantidade'] . 'x ' . $item['produto_nome'];
      $totalItens = $contagem[$pid] ?? 0;
      if ($totalItens > 1) {
        $resumo .= ' + ' . ($totalItens - 1) . ' itens';
      }
    }
    $resumos[$pid] = $resumo;
  }
}

$saida = [];
foreach ($pedidos as $p) {
  $pid = (int)$p['id'];
  $saida[] = [
    'id' => $pid,
    'total' => (float)$p['total'],
    'tipo' => $p['tipo'] ?? '',
    'criado_em' => $p['criado_em'],
    'resumo' => $resumos[$pid] ?? ''
  ];
}

echo json_encode([
  'ok' => true,
  'pagina' => $pagina,
  'paginas' => $paginas,
  'total' => $total,
  'pedidos' => $saida
]);
