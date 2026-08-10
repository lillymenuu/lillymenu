<?php
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/pedidos_competencia.php';

use Dompdf\Dompdf;

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$competencia = pedidosCompetenciaConfig($conn, 'p', 'cx');
$campoDataPedido = $competencia['date_expr'];
$joinCompetencia = $competencia['join'];

$inicioParam = $_GET['inicio'] ?? '';
$fimParam    = $_GET['fim'] ?? '';
$statusFiltro    = $_GET['status'] ?? 'todos';
$tipoFiltro      = trim($_GET['tipo'] ?? '');
$pagamentoFiltro = trim($_GET['pagamento'] ?? '');
$periodoFiltro   = $_GET['periodo'] ?? 'hoje';

if ($periodoFiltro === 'customizado') {
  $inicio = $inicioParam ?: date('Y-m-01');
  $fim    = $fimParam    ?: date('Y-m-d');
} elseif ($periodoFiltro === 'hoje') {
  $inicio = $inicioParam ?: date('Y-m-d');
  $fim    = $fimParam    ?: date('Y-m-d');
} elseif ($periodoFiltro === '7dias') {
  $inicio = date('Y-m-d', strtotime('-6 days'));
  $fim    = date('Y-m-d');
} elseif ($periodoFiltro === '30dias') {
  $inicio = date('Y-m-d', strtotime('-29 days'));
  $fim    = date('Y-m-d');
} else {
  $inicio = date('Y-m-d');
  $fim    = date('Y-m-d');
}

// Condições base (usadas em todas as queries principais)
$condicoes = ["{$campoDataPedido} BETWEEN ? AND ?", "p.loja_id = ?"];
$params    = [$inicio, $fim, $lojaId];
if ($statusFiltro && $statusFiltro !== 'todos') {
  $condicoes[] = "p.status = ?";
  $params[]    = $statusFiltro;
}
if ($tipoFiltro !== '') {
  $condicoes[] = "p.tipo = ?";
  $params[]    = $tipoFiltro;
}
if ($pagamentoFiltro !== '') {
  $condicoes[] = "p.forma_pagamento = ?";
  $params[]    = $pagamentoFiltro;
}
$where = 'WHERE ' . implode(' AND ', $condicoes);

// ── Vendas por dia ────────────────────────────────────────────────────────────
$stmt = $conn->prepare("
  SELECT {$campoDataPedido} AS dia,
         COUNT(*) AS pedidos,
         COALESCE(SUM(p.total), 0) AS total
  FROM pedidos p {$joinCompetencia}
  {$where}
  GROUP BY {$campoDataPedido}
  ORDER BY dia
");
$stmt->execute($params);
$vendas = $stmt->fetchAll(PDO::FETCH_ASSOC);

$totalPedidos = 0;
$totalGeral   = 0.0;
foreach ($vendas as $v) {
  $totalPedidos += (int)   ($v['pedidos'] ?? 0);
  $totalGeral   += (float) ($v['total']   ?? 0);
}

// ── Cancelados ────────────────────────────────────────────────────────────────
$condCanc  = ["{$campoDataPedido} BETWEEN ? AND ?", "p.loja_id = ?", "p.status = 'cancelado'"];
$parCanc   = [$inicio, $fim, $lojaId];
if ($tipoFiltro !== '')      { $condCanc[] = "p.tipo = ?";             $parCanc[] = $tipoFiltro; }
if ($pagamentoFiltro !== '') { $condCanc[] = "p.forma_pagamento = ?";  $parCanc[] = $pagamentoFiltro; }
$whereCanc = 'WHERE ' . implode(' AND ', $condCanc);
$stmtCanc  = $conn->prepare("
  SELECT COUNT(*) AS qtd, COALESCE(SUM(p.total), 0) AS total
  FROM pedidos p {$joinCompetencia} {$whereCanc}
");
$stmtCanc->execute($parCanc);
$rowCanc            = $stmtCanc->fetch(PDO::FETCH_ASSOC);
$totalCancelados      = (int)   ($rowCanc['qtd']   ?? 0);
$totalCanceladosValor = (float) ($rowCanc['total'] ?? 0);

// ── Vendas por produto ────────────────────────────────────────────────────────
$vendProdutos = [];
try {
  $stmtProd = $conn->prepare("
    SELECT i.produto_nome AS produto,
           SUM(i.quantidade) AS qtd,
           SUM(i.quantidade * i.preco) AS total
    FROM pedido_itens i
    JOIN pedidos p ON p.id = i.pedido_id
    {$joinCompetencia}
    {$where}
    GROUP BY i.produto_nome
    ORDER BY total DESC
  ");
  $stmtProd->execute($params);
  $vendProdutos = $stmtProd->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) { $vendProdutos = []; }

// ── Vendas por forma de pagamento ─────────────────────────────────────────────
$stmtPag = $conn->prepare("
  SELECT p.forma_pagamento AS forma,
         COUNT(*) AS qtd,
         COALESCE(SUM(p.total), 0) AS total
  FROM pedidos p {$joinCompetencia}
  {$where}
  GROUP BY p.forma_pagamento
  ORDER BY total DESC
");
$stmtPag->execute($params);
$vendPagamentos = $stmtPag->fetchAll(PDO::FETCH_ASSOC);

// ── Lista de pedidos ──────────────────────────────────────────────────────────
$relCols       = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
$selCodigoBase = 0;
try {
  $cbStmt = $conn->prepare("SELECT valor FROM configuracoes WHERE loja_id = ? AND chave = 'pedido_codigo_base' LIMIT 1");
  $cbStmt->execute([$lojaId]);
  $selCodigoBase = (int) ($cbStmt->fetchColumn() ?: 0);
} catch (Exception $e) {}
$selCodigo = $selCodigoBase > 0
  ? ", IF(p.id > {$selCodigoBase}, p.id - {$selCodigoBase}, p.id) AS codigo_display"
  : ", p.id AS codigo_display";

$stmtPedidos = $conn->prepare("
  SELECT p.id, p.total, p.status, p.tipo, p.forma_pagamento, p.criado_em,
         c.nome AS cliente {$selCodigo}
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  {$joinCompetencia}
  {$where}
  ORDER BY p.criado_em DESC
");
$stmtPedidos->execute($params);
$listaPedidos = $stmtPedidos->fetchAll(PDO::FETCH_ASSOC);

// ── Helpers ───────────────────────────────────────────────────────────────────
function labelPagamento($forma) {
  $map = [
    'pix'      => 'Pix',
    'dinheiro' => 'Dinheiro',
    'credito'  => 'Cartao credito',
    'debito'   => 'Cartao debito',
  ];
  return $map[$forma] ?? ucfirst($forma ?: '-');
}
function labelTipo($tipo) {
  return $tipo === 'retirada' ? 'Retirada' : 'Entrega';
}

// ── HTML ──────────────────────────────────────────────────────────────────────
$html = '
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{font-family:DejaVu Sans,sans-serif;color:#0f172a;font-size:11px;margin:20px}
    h1{font-size:17px;margin:0 0 6px}
    h2{font-size:13px;font-weight:700;margin:22px 0 8px;color:#1e293b;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
    .meta{font-size:10px;color:#64748b;margin-bottom:14px}
    .summary{margin:0 0 6px;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;display:table;width:100%;box-sizing:border-box}
    .summary-row{display:table-row}
    .summary-cell{display:table-cell;padding:2px 16px 2px 0;white-space:nowrap}
    table{width:100%;border-collapse:collapse;margin-bottom:4px}
    thead th{background:#f1f5f9;color:#475569;font-size:10px;font-weight:700;padding:6px 8px;border:1px solid #e2e8f0;text-align:left}
    tbody td{padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;vertical-align:middle}
    tbody tr:nth-child(even){background:#f8fafc}
    .num{text-align:right}
    .badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700}
    .badge-entrega{background:#dbeafe;color:#1d4ed8}
    .badge-retirada{background:#fef9c3;color:#854d0e}
    .badge-pix{background:#dcfce7;color:#166534}
    .badge-dinheiro{background:#e0f2fe;color:#0369a1}
    .badge-credito{background:#ede9fe;color:#6d28d9}
    .badge-debito{background:#fce7f3;color:#9d174d}
  </style>
</head>
<body>
  <h1>Relatorio de vendas</h1>
  <div class="meta">Periodo: '.htmlspecialchars($inicio).' ate '.htmlspecialchars($fim).'</div>

  <div class="summary">
    <div class="summary-row">
      <span class="summary-cell"><strong>Total de pedidos:</strong> '.$totalPedidos.'</span>
      <span class="summary-cell"><strong>Total vendido:</strong> R$ '.number_format($totalGeral, 2, ',', '.').'</span>
      <span class="summary-cell"><strong>Pedidos cancelados:</strong> '.$totalCancelados.'</span>
      <span class="summary-cell"><strong>Valor cancelado:</strong> R$ '.number_format($totalCanceladosValor, 2, ',', '.').'</span>
    </div>
  </div>

  <h2>Vendas por produto</h2>
  <table>
    <thead><tr>
      <th>Produto</th>
      <th class="num">Qtd vendida</th>
      <th class="num">Total</th>
    </tr></thead>
    <tbody>';

if ($vendProdutos) {
  foreach ($vendProdutos as $p) {
    $html .= '
      <tr>
        <td>'.htmlspecialchars((string)($p['produto'] ?? '-')).'</td>
        <td class="num">'.(int)($p['qtd'] ?? 0).'</td>
        <td class="num">R$ '.number_format((float)($p['total'] ?? 0), 2, ',', '.').'</td>
      </tr>';
  }
} else {
  $html .= '<tr><td colspan="3">Nenhum produto encontrado.</td></tr>';
}

$html .= '
    </tbody>
  </table>

  <h2>Vendas por forma de pagamento</h2>
  <table>
    <thead><tr>
      <th>Forma de pagamento</th>
      <th class="num">Qtd pedidos</th>
      <th class="num">Total</th>
    </tr></thead>
    <tbody>';

if ($vendPagamentos) {
  foreach ($vendPagamentos as $pg) {
    $html .= '
      <tr>
        <td>'.htmlspecialchars(labelPagamento($pg['forma'] ?? '')).'</td>
        <td class="num">'.(int)($pg['qtd'] ?? 0).'</td>
        <td class="num">R$ '.number_format((float)($pg['total'] ?? 0), 2, ',', '.').'</td>
      </tr>';
  }
} else {
  $html .= '<tr><td colspan="3">Nenhum registro encontrado.</td></tr>';
}

$html .= '
    </tbody>
  </table>

  <h2>Pedidos</h2>
  <table>
    <thead><tr>
      <th>#</th>
      <th>Cliente</th>
      <th>Data</th>
      <th>Tipo</th>
      <th>Pagamento</th>
      <th class="num">Valor</th>
    </tr></thead>
    <tbody>';

if ($listaPedidos) {
  foreach ($listaPedidos as $pd) {
    $tipoLabel  = labelTipo($pd['tipo'] ?? '');
    $tipoClass  = ($pd['tipo'] ?? '') === 'retirada' ? 'badge-retirada' : 'badge-entrega';
    $pagLabel   = labelPagamento($pd['forma_pagamento'] ?? '');
    $pagClass   = 'badge-'.($pd['forma_pagamento'] ?? 'pix');
    $codigo     = htmlspecialchars((string)($pd['codigo_display'] ?? $pd['id']));
    $html .= '
      <tr>
        <td>#'.$codigo.'</td>
        <td>'.htmlspecialchars($pd['cliente'] ?? '-').'</td>
        <td>'.date('d/m/Y H:i', strtotime($pd['criado_em'])).'</td>
        <td><span class="badge '.$tipoClass.'">'.$tipoLabel.'</span></td>
        <td><span class="badge '.$pagClass.'">'.$pagLabel.'</span></td>
        <td class="num">R$ '.number_format((float)($pd['total'] ?? 0), 2, ',', '.').'</td>
      </tr>';
  }
} else {
  $html .= '<tr><td colspan="6">Nenhum pedido encontrado.</td></tr>';
}

$html .= '
    </tbody>
  </table>
</body>
</html>';

$dompdf = new Dompdf();
$dompdf->loadHtml($html, 'UTF-8');
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();
$dompdf->stream('relatorio.pdf', ['Attachment' => true]);
exit;
