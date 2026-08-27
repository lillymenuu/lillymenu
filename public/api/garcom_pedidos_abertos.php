<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../config/database.php';

$lojaId = (int) ($_SESSION['garcom_loja_id'] ?? 0);

if (!isset($_SESSION['garcom_id']) || $lojaId <= 0) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'msg' => 'Sessão do garçom expirada.']);
  exit;
}

$stmt = $conn->prepare("
  SELECT p.id, p.status, p.total, p.criado_em, m.nome AS mesa_nome
  FROM pedidos p
  LEFT JOIN mesas m ON m.id = p.mesa_id AND m.loja_id = p.loja_id
  WHERE p.loja_id = ? AND p.mesa_id IS NOT NULL AND p.status NOT IN ('finalizado', 'cancelado')
  ORDER BY p.id DESC
  LIMIT 100
");
$stmt->execute([$lojaId]);
$pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

if ($pedidos) {
  $ids = array_column($pedidos, 'id');
  $ph = implode(',', array_fill(0, count($ids), '?'));
  $stmtItens = $conn->prepare("SELECT pedido_id, produto_nome, quantidade FROM pedido_itens WHERE pedido_id IN ($ph)");
  $stmtItens->execute($ids);
  $itensPorPedido = [];
  foreach ($stmtItens->fetchAll(PDO::FETCH_ASSOC) as $item) {
    $itensPorPedido[$item['pedido_id']][] = ($item['quantidade'] > 1 ? $item['quantidade'] . 'x ' : '') . $item['produto_nome'];
  }
  foreach ($pedidos as &$p) {
    $p['itens_resumo'] = implode(', ', $itensPorPedido[$p['id']] ?? []);
  }
  unset($p);
}

echo json_encode(['ok' => true, 'pedidos' => $pedidos]);
