<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/pedidos_competencia.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);


/* AJUSTE SE NECESSÁRIO */
$competencia = pedidosCompetenciaConfig($conn, 'p', 'cx');
$campoDataPedido = $competencia['date_expr'];
$joinCompetencia = $competencia['join'];

$inicioParam = $_GET['inicio'] ?? '';
$fimParam = $_GET['fim'] ?? '';
$statusFiltro = $_GET['status'] ?? 'todos';
$tipoFiltro = trim($_GET['tipo'] ?? '');
$pagamentoFiltro = trim($_GET['pagamento'] ?? '');
$periodoFiltro = $_GET['periodo'] ?? 'hoje';

if ($periodoFiltro === 'customizado') {
  $inicio = $inicioParam ?: date('Y-m-01');
  $fim = $fimParam ?: date('Y-m-d');
} elseif ($periodoFiltro === 'hoje') {
  $inicio = $inicioParam ?: date('Y-m-d');
  $fim = $fimParam ?: date('Y-m-d');
} elseif ($periodoFiltro === '7dias') {
  $inicio = date('Y-m-d', strtotime('-6 days'));
  $fim = date('Y-m-d');
} elseif ($periodoFiltro === '30dias') {
  $inicio = date('Y-m-d', strtotime('-29 days'));
  $fim = date('Y-m-d');
} else {
  $inicio = date('Y-m-d');
  $fim = date('Y-m-d');
}

$condicoesBase = ["{$campoDataPedido} BETWEEN ? AND ?","p.loja_id = ?"];
$paramsBase = [$inicio, $fim, $lojaId];

if ($tipoFiltro !== '') {
  $condicoesBase[] = "p.tipo = ?";
  $paramsBase[] = $tipoFiltro;
}
if ($pagamentoFiltro !== '') {
  $condicoesBase[] = "p.forma_pagamento = ?";
  $paramsBase[] = $pagamentoFiltro;
}

$condicoesRelatorio = $condicoesBase;
$paramsRelatorio = $paramsBase;
if ($statusFiltro && $statusFiltro !== 'todos' && $statusFiltro !== 'cancelado') {
  $condicoesRelatorio[] = "p.status = ?";
  $paramsRelatorio[] = $statusFiltro;
}
$condicoesRelatorio[] = "p.status <> 'cancelado'";
$where = 'WHERE ' . implode(' AND ', $condicoesRelatorio);

$condicoesCancelados = $condicoesBase;
$paramsCancelados = array_merge($paramsBase, ['cancelado']);
$condicoesCancelados[] = "p.status = ?";
$whereCancelados = 'WHERE ' . implode(' AND ', $condicoesCancelados);

/* ================= VENDAS POR DIA ================= */
$stmt = $conn->prepare("
  SELECT 
    {$campoDataPedido} AS dia,
    COUNT(*) AS pedidos,
    SUM(p.total) AS total
  FROM pedidos p
  {$joinCompetencia}
  $where
  GROUP BY {$campoDataPedido}
  ORDER BY dia
");
$stmt->execute($paramsRelatorio);
$vendas_dia = $stmt->fetchAll(PDO::FETCH_ASSOC);

/* ================= RESUMO ================= */
$stmt = $conn->prepare("
  SELECT 
    COUNT(*) AS total_pedidos,
    COALESCE(SUM(p.total), 0) AS faturamento,
    COALESCE(SUM(p.taxa_entrega), 0) AS taxa_entrega,
    COALESCE(SUM(p.taxa_maquininha), 0) AS taxa_servico
  FROM pedidos p
  {$joinCompetencia}
  $where
");
$stmt->execute($paramsRelatorio);
$resumo = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

$stmt = $conn->prepare("
  SELECT COUNT(*) AS total_cancelados
  FROM pedidos p
  {$joinCompetencia}
  $whereCancelados
");
$stmt->execute($paramsCancelados);
$cancelados = (int) $stmt->fetchColumn();

/* ================= PRODUTOS MAIS VENDIDOS ================= */
$stmt = $conn->prepare("
  SELECT 
    produto_nome AS nome,
    SUM(quantidade) AS quantidade
  FROM pedido_itens i
  JOIN pedidos p ON p.id = i.pedido_id AND i.loja_id = p.loja_id
  {$joinCompetencia}
  $where
  GROUP BY produto_nome
  ORDER BY quantidade DESC
  LIMIT 10
");
$stmt->execute($paramsRelatorio);
$produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

/* ================= VENDAS POR PRODUTO ================= */
$stmt = $conn->prepare("
  SELECT 
    i.produto_nome AS nome,
    SUM(i.quantidade) AS quantidade,
    COALESCE(SUM(i.preco * i.quantidade), 0) AS total
  FROM pedido_itens i
  JOIN pedidos p ON p.id = i.pedido_id AND i.loja_id = p.loja_id
  {$joinCompetencia}
  $where
  GROUP BY i.produto_nome
  ORDER BY total DESC
  LIMIT 8
");
$stmt->execute($paramsRelatorio);
$vendas_produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

/* ================= VENDAS POR PAGAMENTO ================= */
$stmt = $conn->prepare("
  SELECT 
    COALESCE(NULLIF(pp.forma, ''), 'sem_pagamento') AS forma,
    COUNT(*) AS quantidade,
    COALESCE(SUM(pp.valor), 0) AS total
  FROM pedido_pagamentos pp
  JOIN pedidos p ON p.id = pp.pedido_id AND pp.loja_id = p.loja_id
  {$joinCompetencia}
  $where
  GROUP BY forma
  ORDER BY total DESC
");
$stmt->execute($paramsRelatorio);
$vendas_pagamento = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (!$vendas_pagamento) {
  $stmt = $conn->prepare("
    SELECT 
      COALESCE(NULLIF(p.forma_pagamento, ''), 'sem_pagamento') AS forma,
      COUNT(*) AS quantidade,
      COALESCE(SUM(p.total), 0) AS total
    FROM pedidos p
    {$joinCompetencia}
    $where
    GROUP BY forma
    ORDER BY total DESC
  ");
  $stmt->execute($paramsRelatorio);
  $vendas_pagamento = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/* ================= MELHORES CLIENTES ================= */
$stmt = $conn->prepare("
  SELECT 
    c.nome,
    COUNT(p.id) AS pedidos,
    SUM(p.total) AS total
  FROM clientes c
  JOIN pedidos p ON p.cliente_id = c.id AND c.loja_id = p.loja_id
  {$joinCompetencia}
  $where
  GROUP BY c.id
  ORDER BY total DESC
  LIMIT 10
");
$stmt->execute($paramsRelatorio);
$clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

/* ================= CLIENTES MAIS FREQUENTES ================= */
$stmt = $conn->prepare("
  SELECT 
    c.nome,
    COUNT(p.id) AS pedidos
  FROM clientes c
  JOIN pedidos p ON p.cliente_id = c.id AND c.loja_id = p.loja_id
  {$joinCompetencia}
  $where
  GROUP BY c.id
  ORDER BY pedidos DESC
  LIMIT 10
");
$stmt->execute($paramsRelatorio);
$clientes_frequencia = $stmt->fetchAll(PDO::FETCH_ASSOC);

/* ================= RESPOSTA FINAL ================= */
echo json_encode([
  'vendas_dia' => $vendas_dia,
  'resumo'     => $resumo,
  'cancelados' => $cancelados,
  'produtos'   => $produtos,
  'vendas_produtos' => $vendas_produtos,
  'vendas_pagamento' => $vendas_pagamento,
  'clientes'   => $clientes,
  'clientes_frequencia' => $clientes_frequencia
]);
