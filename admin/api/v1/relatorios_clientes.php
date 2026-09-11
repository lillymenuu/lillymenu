<?php
/*
 * Versao JSON de admin/api/relatorios_clientes.php para o novo frontend
 * Next.js (/clientreports), trocando sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

date_default_timezone_set('America/Fortaleza');

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$busca   = trim($_GET['busca'] ?? '');
$ordenar = trim($_GET['ordenar'] ?? 'total_gasto');
$periodo = trim($_GET['periodo'] ?? '30');
$dataIni = trim($_GET['data_ini'] ?? '');
$dataFim = trim($_GET['data_fim'] ?? '');
$pagina  = max(1, (int) ($_GET['pagina'] ?? 1));
$limite  = (int) ($_GET['limite'] ?? 10);
$limite  = in_array($limite, [10, 25, 50], true) ? $limite : 10;

if ($dataIni !== '' && $dataFim !== '') {
  $inicio = $dataIni . ' 00:00:00';
  $fim = $dataFim . ' 23:59:59';
} else {
  $dias = in_array($periodo, ['7', '15', '30', '60', '90', '365'], true) ? (int) $periodo : 30;
  $inicio = date('Y-m-d', strtotime("-{$dias} days")) . ' 00:00:00';
  $fim = date('Y-m-d') . ' 23:59:59';
}

$ordens = [
  'total_gasto' => 'total_gasto DESC',
  'pedidos' => 'pedidos_feitos DESC',
  'ticket_medio' => 'ticket_medio DESC',
  'ultimo_pedido' => 'ultimo_pedido DESC',
  'nome' => 'c.nome ASC',
];
$sqlOrder = $ordens[$ordenar] ?? 'total_gasto DESC';

$where = ['p.loja_id = ?', 'p.criado_em BETWEEN ? AND ?', "p.status <> 'cancelado'"];
$params = [$lojaId, $inicio, $fim];

if ($busca !== '') {
  $where[] = '(c.nome LIKE ? OR c.telefone LIKE ?)';
  $params[] = "%{$busca}%";
  $params[] = "%{$busca}%";
}
$sqlWhere = 'WHERE ' . implode(' AND ', $where);

$cols = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
$selTaxa = in_array('taxa_entrega', $cols, true) ? 'COALESCE(p.taxa_entrega,0)' : '0';
$selSub = in_array('subtotal', $cols, true) ? 'COALESCE(p.subtotal,p.total)' : 'p.total';

$stmtCount = $conn->prepare("
  SELECT COUNT(DISTINCT c.id)
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  {$sqlWhere}
");
$stmtCount->execute($params);
$total = (int) $stmtCount->fetchColumn();
$paginas = max(1, (int) ceil($total / $limite));
$pagina = min($pagina, $paginas);
$offset = ($pagina - 1) * $limite;

$stmtData = $conn->prepare("
  SELECT
    c.id AS cliente_id,
    c.nome AS nome,
    c.telefone AS telefone,
    MAX(p.criado_em) AS ultimo_pedido,
    SUM({$selTaxa}) AS total_taxa,
    AVG({$selSub}) AS ticket_medio,
    SUM(p.total) AS total_gasto,
    COUNT(p.id) AS pedidos_feitos
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  {$sqlWhere}
  GROUP BY c.id, c.nome, c.telefone
  ORDER BY {$sqlOrder}
  LIMIT {$limite} OFFSET {$offset}
");
$stmtData->execute($params);
$clientes = $stmtData->fetchAll(PDO::FETCH_ASSOC);

foreach ($clientes as &$r) {
  $r['cliente_id'] = (int) $r['cliente_id'];
  $r['total_taxa'] = (float) $r['total_taxa'];
  $r['ticket_medio'] = (float) $r['ticket_medio'];
  $r['total_gasto'] = (float) $r['total_gasto'];
  $r['pedidos_feitos'] = (int) $r['pedidos_feitos'];
}
unset($r);

echo json_encode([
  'ok' => true,
  'total' => $total,
  'pagina' => $pagina,
  'paginas' => $paginas,
  'limite' => $limite,
  'clientes' => $clientes,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
