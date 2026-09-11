<?php
/*
 * Versao JSON de admin/api/relatorios.php (resumo/graficos) + a tabela de
 * pedidos paginada hoje embutida em admin/relatorios.php, combinados num
 * unico endpoint pro novo frontend Next.js (/sales) — antes eram duas
 * chamadas separadas (fragmento HTML + JSON) usando ate criterios de data
 * diferentes entre si (a tabela usava DATE(p.criado_em) puro, o resumo usava
 * a data "de competencia"); aqui os dois usam pedidosCompetenciaConfig()
 * consistentemente.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/pedidos_competencia.php';
require_once __DIR__ . '/../../../helpers/pedido_codigo.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$competencia = pedidosCompetenciaConfig($conn, 'p', 'cx');
$campoDataPedido = $competencia['date_expr'];
$joinCompetencia = $competencia['join'];

$periodoFiltro = $_GET['periodo'] ?? 'hoje';
$inicioParam = trim($_GET['data_ini'] ?? '');
$fimParam = trim($_GET['data_fim'] ?? '');
$tipoFiltro = trim($_GET['tipo'] ?? '');

if ($periodoFiltro === 'customizado') {
  $inicio = $inicioParam ?: date('Y-m-01');
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

$pagina = max(1, (int) ($_GET['pagina'] ?? 1));
$limite = (int) ($_GET['limite'] ?? 10);
$limite = in_array($limite, [10, 20, 50], true) ? $limite : 10;

$condicoesBase = ["{$campoDataPedido} BETWEEN ? AND ?", 'p.loja_id = ?'];
$paramsBase = [$inicio, $fim, $lojaId];
if ($tipoFiltro !== '') {
  $condicoesBase[] = 'p.tipo = ?';
  $paramsBase[] = $tipoFiltro;
}

$condicoesRelatorio = $condicoesBase;
$paramsRelatorio = $paramsBase;
$condicoesRelatorio[] = "p.status <> 'cancelado'";
$whereRelatorio = 'WHERE ' . implode(' AND ', $condicoesRelatorio);

$condicoesCancelados = $condicoesBase;
$paramsCancelados = array_merge($paramsBase, ['cancelado']);
$condicoesCancelados[] = 'p.status = ?';
$whereCancelados = 'WHERE ' . implode(' AND ', $condicoesCancelados);

/* ================= RESUMO ================= */
$stmt = $conn->prepare("
  SELECT
    COUNT(*) AS total_pedidos,
    COALESCE(SUM(p.total), 0) AS faturamento,
    COALESCE(SUM(p.taxa_entrega), 0) AS taxa_entrega
  FROM pedidos p
  {$joinCompetencia}
  $whereRelatorio
");
$stmt->execute($paramsRelatorio);
$resumoRow = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
$totalPedidos = (int) ($resumoRow['total_pedidos'] ?? 0);
$faturamento = (float) ($resumoRow['faturamento'] ?? 0);
$ticketMedio = $totalPedidos > 0 ? $faturamento / $totalPedidos : 0.0;
$taxaEntrega = (float) ($resumoRow['taxa_entrega'] ?? 0);

/* Pagamentos de fiado confirmados no periodo: so entram aqui quando o
 * pagamento e confirmado (tipo='pagamento'), nunca no momento da venda fiado. */
$fiadoRecebido = 0.0;
try {
  $stmtFiado = $conn->prepare("
    SELECT COALESCE(SUM(valor), 0) AS total
    FROM fiado_lancamentos
    WHERE loja_id = ? AND tipo = 'pagamento' AND DATE(criado_em) BETWEEN ? AND ?
  ");
  $stmtFiado->execute([$lojaId, $inicio, $fim]);
  $fiadoRecebido = (float) $stmtFiado->fetchColumn();
} catch (Throwable $e) {
  /* tabela fiado_lancamentos ainda nao existe */
}

$stmt = $conn->prepare("
  SELECT COUNT(*) AS total_cancelados, COALESCE(SUM(p.total), 0) AS valor_cancelados
  FROM pedidos p
  {$joinCompetencia}
  $whereCancelados
");
$stmt->execute($paramsCancelados);
$rowCancelados = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
$cancelados = (int) ($rowCancelados['total_cancelados'] ?? 0);
$canceladosValor = (float) ($rowCancelados['valor_cancelados'] ?? 0);

/* ================= PRODUTOS MAIS VENDIDOS (top 10 por quantidade) ================= */
$stmt = $conn->prepare("
  SELECT i.produto_nome AS nome, SUM(i.quantidade) AS quantidade
  FROM pedido_itens i
  JOIN pedidos p ON p.id = i.pedido_id AND i.loja_id = p.loja_id
  {$joinCompetencia}
  $whereRelatorio
  GROUP BY i.produto_nome
  ORDER BY quantidade DESC
  LIMIT 10
");
$stmt->execute($paramsRelatorio);
$produtos = array_map(static function ($r) {
  return ['nome' => (string) $r['nome'], 'quantidade' => (int) $r['quantidade']];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

/* ================= VENDAS POR PRODUTO (top 8 por receita) ================= */
$stmt = $conn->prepare("
  SELECT i.produto_nome AS nome, SUM(i.quantidade) AS quantidade, COALESCE(SUM(i.preco * i.quantidade), 0) AS total
  FROM pedido_itens i
  JOIN pedidos p ON p.id = i.pedido_id AND i.loja_id = p.loja_id
  {$joinCompetencia}
  $whereRelatorio
  GROUP BY i.produto_nome
  ORDER BY total DESC
  LIMIT 8
");
$stmt->execute($paramsRelatorio);
$vendasProdutos = array_map(static function ($r) {
  return ['nome' => (string) $r['nome'], 'quantidade' => (int) $r['quantidade'], 'total' => (float) $r['total']];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

/* ================= VENDAS POR MEIO DE PAGAMENTO ================= */
$stmt = $conn->prepare("
  SELECT COALESCE(NULLIF(pp.forma, ''), 'sem_pagamento') AS forma, COUNT(*) AS quantidade, COALESCE(SUM(pp.valor), 0) AS total
  FROM pedido_pagamentos pp
  JOIN pedidos p ON p.id = pp.pedido_id AND pp.loja_id = p.loja_id
  {$joinCompetencia}
  $whereRelatorio
  GROUP BY forma
  ORDER BY total DESC
");
$stmt->execute($paramsRelatorio);
$vendasPagamentoRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (!$vendasPagamentoRows) {
  $stmt = $conn->prepare("
    SELECT COALESCE(NULLIF(p.forma_pagamento, ''), 'sem_pagamento') AS forma, COUNT(*) AS quantidade, COALESCE(SUM(p.total), 0) AS total
    FROM pedidos p
    {$joinCompetencia}
    $whereRelatorio
    GROUP BY forma
    ORDER BY total DESC
  ");
  $stmt->execute($paramsRelatorio);
  $vendasPagamentoRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
}
$vendasPagamento = array_map(static function ($r) {
  return ['forma' => (string) $r['forma'], 'quantidade' => (int) $r['quantidade'], 'total' => (float) $r['total']];
}, $vendasPagamentoRows);

/* ================= CLIENTES MAIS FREQUENTES (top 10 por numero de pedidos) ================= */
$stmt = $conn->prepare("
  SELECT c.nome, COUNT(p.id) AS pedidos
  FROM clientes c
  JOIN pedidos p ON p.cliente_id = c.id AND c.loja_id = p.loja_id
  {$joinCompetencia}
  $whereRelatorio
  GROUP BY c.id
  ORDER BY pedidos DESC
  LIMIT 10
");
$stmt->execute($paramsRelatorio);
$clientesFrequencia = array_map(static function ($r) {
  return ['nome' => (string) $r['nome'], 'pedidos' => (int) $r['pedidos']];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

/* ================= TABELA DE PEDIDOS DO PERIODO (paginada) ================= */
$stmt = $conn->prepare("
  SELECT COUNT(*)
  FROM pedidos p
  {$joinCompetencia}
  $whereRelatorio
");
$stmt->execute($paramsRelatorio);
$totalPedidosTabela = (int) $stmt->fetchColumn();
$paginas = max(1, (int) ceil($totalPedidosTabela / $limite));
if ($pagina > $paginas) {
  $pagina = $paginas;
}
$offset = ($pagina - 1) * $limite;

$codigoBase = getPedidoCodigoBase($conn, $lojaId);

$stmt = $conn->prepare("
  SELECT p.id, p.total, p.status, p.tipo, p.forma_pagamento, p.criado_em, c.nome AS cliente
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  {$joinCompetencia}
  $whereRelatorio
  ORDER BY p.criado_em DESC
  LIMIT $limite OFFSET $offset
");
$stmt->execute($paramsRelatorio);
$pedidos = array_map(static function ($r) use ($codigoBase) {
  return [
    'id' => (int) $r['id'],
    'codigo' => calcCodigoDisplay((int) $r['id'], $codigoBase),
    'total' => (float) $r['total'],
    'status' => (string) $r['status'],
    'tipo' => (string) $r['tipo'],
    'forma_pagamento' => $r['forma_pagamento'],
    'criado_em' => (string) $r['criado_em'],
    'cliente' => (string) $r['cliente'],
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

echo json_encode([
  'ok' => true,
  'resumo' => [
    'total_pedidos' => $totalPedidos,
    'faturamento' => $faturamento,
    'ticket_medio' => $ticketMedio,
    'taxa_entrega' => $taxaEntrega,
  ],
  'fiado_recebido' => $fiadoRecebido,
  'cancelados' => $cancelados,
  'cancelados_valor' => $canceladosValor,
  'vendas_pagamento' => $vendasPagamento,
  'produtos' => $produtos,
  'vendas_produtos' => $vendasProdutos,
  'clientes_frequencia' => $clientesFrequencia,
  'pedidos' => $pedidos,
  'total' => $totalPedidosTabela,
  'paginas' => $paginas,
  'pagina' => $pagina,
  'limite' => $limite,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
