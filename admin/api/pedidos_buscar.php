<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../helpers/pedido_codigo.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$termo = trim((string) ($_GET['q'] ?? ''));

if ($termo === '') {
  echo json_encode([]);
  exit;
}

$codigoBase = getPedidoCodigoBase($conn, $lojaId);

$pedidoColunas = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temOrigem = in_array('origem', $pedidoColunas, true);
$selectOrigem = $temOrigem ? ", p.origem" : "";

$params = [$lojaId];
$condicoes = ["c.nome LIKE ?"];
$params[] = '%' . $termo . '%';

$telefoneDigitos = preg_replace('/\D/', '', $termo);
if ($telefoneDigitos !== '') {
  $condicoes[] = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.telefone,'(',''),')',''),'-',''),' ',''),'+','') LIKE ?";
  $params[] = '%' . $telefoneDigitos . '%';
}

if (ctype_digit($termo)) {
  $idsCandidatos = [(int) $termo];
  if ($codigoBase > 0) {
    $idsCandidatos[] = (int) $termo + $codigoBase;
  }
  $placeholdersIds = implode(',', array_fill(0, count($idsCandidatos), '?'));
  $condicoes[] = "p.id IN ($placeholdersIds)";
  foreach ($idsCandidatos as $idCandidato) {
    $params[] = $idCandidato;
  }
}

$stmt = $conn->prepare("
  SELECT
    p.id,
    p.status,
    p.tipo,
    p.total,
    p.criado_em,
    p.forma_pagamento{$selectOrigem},
    c.nome,
    c.telefone
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  WHERE p.loja_id = ? AND (" . implode(' OR ', $condicoes) . ")
  ORDER BY p.id DESC
  LIMIT 30
");
$stmt->execute($params);
$pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

if ($pedidos) {
  $pedidoIds = array_values(array_filter(array_map(static fn($p) => (int) ($p['id'] ?? 0), $pedidos)));

  if ($pedidoIds) {
    $placeholders = implode(',', array_fill(0, count($pedidoIds), '?'));
    $paramsPagamentos = array_merge($pedidoIds, [$lojaId]);

    $stmtPagamentos = $conn->prepare("
      SELECT pedido_id, forma, valor
      FROM pedido_pagamentos
      WHERE pedido_id IN ($placeholders) AND loja_id = ?
      ORDER BY id ASC
    ");
    $stmtPagamentos->execute($paramsPagamentos);

    $pagamentosPorPedido = [];
    foreach ($stmtPagamentos->fetchAll(PDO::FETCH_ASSOC) as $pagamento) {
      $pedidoId = (int) ($pagamento['pedido_id'] ?? 0);
      if (!$pedidoId) {
        continue;
      }
      if (!isset($pagamentosPorPedido[$pedidoId])) {
        $pagamentosPorPedido[$pedidoId] = [];
      }
      $pagamentosPorPedido[$pedidoId][] = [
        'forma' => $pagamento['forma'] ?? '',
        'valor' => isset($pagamento['valor']) ? (float) $pagamento['valor'] : 0.0,
      ];
    }

    foreach ($pedidos as &$pedido) {
      $pedidoId = (int) ($pedido['id'] ?? 0);
      $pedido['pagamentos'] = $pagamentosPorPedido[$pedidoId] ?? [];
    }
    unset($pedido);
  }
}

foreach ($pedidos as &$pedido) {
  $pedido['codigo'] = calcCodigoDisplay((int) ($pedido['id'] ?? 0), $codigoBase);
}
unset($pedido);

echo json_encode($pedidos);
