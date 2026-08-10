<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
header('Content-Type: application/json; charset=UTF-8');

$lojaId   = (int)($_SESSION['loja_id'] ?? 1);
$busca    = trim($_GET['busca']   ?? '');
$ordenar  = trim($_GET['ordenar'] ?? 'total_gasto');
$periodo  = trim($_GET['periodo'] ?? '30');
$dataIni  = trim($_GET['data_ini'] ?? '');
$dataFim  = trim($_GET['data_fim'] ?? '');
$pagina   = max(1, (int)($_GET['pagina'] ?? 1));
$limite   = max(1, min(100, (int)($_GET['limite'] ?? 10)));

/* Período */
if ($dataIni && $dataFim) {
  $inicio = $dataIni;
  $fim    = $dataFim;
} else {
  $dias   = in_array($periodo, ['7','15','30','60','90','365'], true) ? (int)$periodo : 30;
  $inicio = date('Y-m-d', strtotime("-{$dias} days")) . ' 00:00:00';
  $fim    = date('Y-m-d') . ' 23:59:59';
}

/* Ordenação segura */
$ordens = [
  'total_gasto'   => 'total_gasto DESC',
  'pedidos'       => 'pedidos_feitos DESC',
  'ticket_medio'  => 'ticket_medio DESC',
  'ultimo_pedido' => 'ultimo_pedido DESC',
  'nome'          => 'c.nome ASC',
];
$sqlOrder = $ordens[$ordenar] ?? 'total_gasto DESC';

/* WHERE base */
$where  = ['p.loja_id = ?', "p.criado_em BETWEEN ? AND ?", "p.status <> 'cancelado'"];
$params = [$lojaId, $inicio, $fim];

if ($busca !== '') {
  $where[]  = '(c.nome LIKE ? OR c.telefone LIKE ?)';
  $params[] = "%{$busca}%";
  $params[] = "%{$busca}%";
}
$sqlWhere = 'WHERE ' . implode(' AND ', $where);

/* Coluna taxa_entrega pode não existir */
$cols       = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
$selTaxa    = in_array('taxa_entrega', $cols) ? 'COALESCE(p.taxa_entrega,0)' : '0';
$selSub     = in_array('subtotal',    $cols) ? 'COALESCE(p.subtotal,p.total)' : 'p.total';

/* Count total */
$stmtCount = $conn->prepare("
  SELECT COUNT(DISTINCT c.id)
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  {$sqlWhere}
");
$stmtCount->execute($params);
$total   = (int)$stmtCount->fetchColumn();
$paginas = max(1, (int)ceil($total / $limite));
$pagina  = min($pagina, $paginas);
$offset  = ($pagina - 1) * $limite;

/* Dados */
$stmtData = $conn->prepare("
  SELECT
    c.id              AS cliente_id,
    c.nome            AS nome,
    c.telefone        AS telefone,
    MAX(p.criado_em)  AS ultimo_pedido,
    SUM({$selTaxa})   AS total_taxa,
    AVG({$selSub})    AS ticket_medio,
    SUM(p.total)      AS total_gasto,
    COUNT(p.id)       AS pedidos_feitos
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  {$sqlWhere}
  GROUP BY c.id, c.nome, c.telefone
  ORDER BY {$sqlOrder}
  LIMIT {$limite} OFFSET {$offset}
");
$stmtData->execute($params);
$clientes = $stmtData->fetchAll(PDO::FETCH_ASSOC);

/* Formata */
foreach ($clientes as &$r) {
  $dt = new DateTime($r['ultimo_pedido']);
  $r['ultimo_pedido_fmt'] = $dt->format('d/m/Y');
  $r['total_taxa_fmt']    = 'R$ ' . number_format((float)$r['total_taxa'],   2, ',', '.');
  $r['ticket_medio_fmt']  = 'R$ ' . number_format((float)$r['ticket_medio'], 2, ',', '.');
  $r['total_gasto_fmt']   = 'R$ ' . number_format((float)$r['total_gasto'],  2, ',', '.');
}
unset($r);

echo json_encode([
  'ok'       => true,
  'total'    => $total,
  'pagina'   => $pagina,
  'paginas'  => $paginas,
  'limite'   => $limite,
  'clientes' => $clientes,
], JSON_UNESCAPED_UNICODE);
