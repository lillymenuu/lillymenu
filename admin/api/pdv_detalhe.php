<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/config.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = $_GET['pedido_id'] ?? null;
if (!$id) {
  echo json_encode(['ok'=>false]);
  exit;
}

/* PEDIDO */
$stmt = $conn->prepare("
  SELECT p.*, c.nome, c.telefone, m.nome AS motoboy_nome
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  LEFT JOIN motoboys m ON m.id = p.motoboy_id AND m.loja_id = p.loja_id
  WHERE p.id = ? AND p.loja_id = ?
");
$stmt->execute([$id, $lojaId]);
$pedido = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$pedido) {
  echo json_encode(['ok' => false]);
  exit;
}

/* ITENS (com pontos por item, quando a coluna produto_id existir) */
$temProdutoId = false;
try {
  $stmt = $conn->prepare("SHOW COLUMNS FROM pedido_itens LIKE 'produto_id'");
  $stmt->execute();
  $temProdutoId = (bool) $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
}

if ($temProdutoId) {
  $stmt = $conn->prepare("
    SELECT pi.produto_nome, pi.quantidade, pi.preco, pi.observacoes,
           COALESCE(pr.pontos_ganho, 0) * pi.quantidade AS pontos
    FROM pedido_itens pi
    LEFT JOIN produtos pr ON pr.id = pi.produto_id AND pr.loja_id = pi.loja_id
    WHERE pi.pedido_id = ? AND pi.loja_id = ?
  ");
} else {
  $stmt = $conn->prepare("
    SELECT produto_nome, quantidade, preco, observacoes, 0 AS pontos
    FROM pedido_itens
    WHERE pedido_id = ? AND loja_id = ?
  ");
}
$stmt->execute([$id, $lojaId]);
$itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("
  SELECT forma, valor, taxa_maquininha
  FROM pedido_pagamentos
  WHERE pedido_id = ? AND loja_id = ?
");
$stmt->execute([$id, $lojaId]);
$pagamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

/* Pontos a receber (total do pedido) */
$pontosAReceber = 0;
try {
  $stmt = $conn->prepare("
    SELECT COALESCE(SUM(pontos), 0)
    FROM pontos_movimentacoes
    WHERE pedido_id = ? AND loja_id = ? AND tipo IN ('ganho', 'pendente')
  ");
  $stmt->execute([$id, $lojaId]);
  $pontosAReceber = (int) $stmt->fetchColumn();
} catch (Exception $e) {
}

/* Cashback ganho/usado nesse pedido — via cashback_movimentacoes, mais confiável
   que as colunas cashback_valor/cashback_usado de pedidos (nem sempre existem). */
$cashbackGanho = 0.0;
$cashbackUsado = 0.0;
try {
  $stmt = $conn->prepare("SELECT tipo, valor FROM cashback_movimentacoes WHERE pedido_id = ? AND loja_id = ?");
  $stmt->execute([$id, $lojaId]);
  foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $mov) {
    if (in_array($mov['tipo'], ['entrada', 'pendente'], true)) {
      $cashbackGanho += (float) $mov['valor'];
    } elseif ($mov['tipo'] === 'uso') {
      $cashbackUsado += (float) $mov['valor'];
    }
  }
} catch (Exception $e) {
}

/* Pedidos anteriores do cliente nesta loja (finalizados) */
$pedidosNaLoja = 0;
try {
  $stmt = $conn->prepare("
    SELECT COUNT(*) FROM pedidos WHERE cliente_id = ? AND loja_id = ? AND status = 'finalizado'
  ");
  $stmt->execute([(int) $pedido['cliente_id'], $lojaId]);
  $pedidosNaLoja = (int) $stmt->fetchColumn();
} catch (Exception $e) {
}

$idCurto = sprintf('%04d', (int) $pedido['id']) . '-' . substr(md5($pedido['id'] . $pedido['criado_em']), 0, 8);

echo json_encode([
  'ok' => true,
  'pedido' => $pedido,
  'itens' => $itens,
  'pagamentos' => $pagamentos,
  'pontos_a_receber' => $pontosAReceber,
  'pedidos_na_loja' => $pedidosNaLoja,
  'cashback_ganho' => $cashbackGanho,
  'cashback_usado' => $cashbackUsado,
  'id_curto' => $idCurto,
  'loja_nome' => config($conn, 'nome_loja', 'Minha loja'),
  'loja_cnpj' => config($conn, 'loja_cnpj', ''),
]);
