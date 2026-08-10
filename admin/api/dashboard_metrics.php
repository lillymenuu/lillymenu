<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/config.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/pedidos_competencia.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$periodo = (int) ($_GET['periodo'] ?? 7);
$periodo = in_array($periodo, [7, 15, 30], true) ? $periodo : 7;

$inicioPeriodo = (new DateTime())
  ->modify('-' . ($periodo - 1) . ' days')
  ->format('Y-m-d');

$competencia = pedidosCompetenciaConfig($conn, 'p', 'cx');
$joinCompetencia = $competencia['join'];
$campoDataCompetencia = $competencia['date_expr'];

$stmtSerie = $conn->prepare("
  SELECT {$campoDataCompetencia} AS dia,
         COUNT(*) AS total_pedidos,
         COALESCE(SUM(p.total), 0) AS total_valor
  FROM pedidos p
  {$joinCompetencia}
  WHERE {$campoDataCompetencia} >= ?
    AND p.loja_id = ?
    AND p.status = 'finalizado'
  GROUP BY {$campoDataCompetencia}
");
$stmtSerie->execute([$inicioPeriodo, $lojaId]);
$serieRaw = $stmtSerie->fetchAll(PDO::FETCH_ASSOC);

$mapPedidos = [];
$mapValores = [];
foreach ($serieRaw as $row) {
  $mapPedidos[$row['dia']] = (int) $row['total_pedidos'];
  $mapValores[$row['dia']] = (float) $row['total_valor'];
}

$labels = [];
$seriePedidos = [];
$serieValores = [];
$dataCursor = new DateTime($inicioPeriodo);
for ($i = 0; $i < $periodo; $i++) {
  $dia = $dataCursor->format('Y-m-d');
  $labels[] = $dataCursor->format('d/m');
  $seriePedidos[] = $mapPedidos[$dia] ?? 0;
  $serieValores[] = round($mapValores[$dia] ?? 0, 2);
  $dataCursor->modify('+1 day');
}

$stmtTotais = $conn->prepare("
  SELECT COUNT(*) AS total_pedidos,
         COALESCE(SUM(p.total), 0) AS total_receita
  FROM pedidos p
  {$joinCompetencia}
  WHERE {$campoDataCompetencia} >= ?
    AND p.loja_id = ?
    AND p.status = 'finalizado'
");
$stmtTotais->execute([$inicioPeriodo, $lojaId]);
$totais = $stmtTotais->fetch(PDO::FETCH_ASSOC);

$totalPedidosPeriodo = (int) ($totais['total_pedidos'] ?? 0);
$totalReceitaPeriodo = (float) ($totais['total_receita'] ?? 0);
/* Acessos ao menu no período selecionado — lê da tabela de eventos reais */
$acessosMenu = 0;
try {
  $stmtAm = $conn->prepare("SHOW TABLES LIKE 'loja_eventos'");
  $stmtAm->execute();
  if ($stmtAm->fetchColumn()) {
    $stmtAm = $conn->prepare("
      SELECT COUNT(*) FROM loja_eventos
      WHERE loja_id = ? AND tipo = 'visita'
        AND DATE(criado_em) >= ?
    ");
    $stmtAm->execute([$lojaId, $inicioPeriodo]);
    $acessosMenu = (int)$stmtAm->fetchColumn();
  }
} catch (Exception $e) { $acessosMenu = 0; }

echo json_encode([
  'ok' => true,
  'periodo' => $periodo,
  'labels' => $labels,
  'pedidos' => $seriePedidos,
  'valores' => $serieValores,
  'total_pedidos' => $totalPedidosPeriodo,
  'total_receita' => $totalReceitaPeriodo,
  'acessos_menu' => $acessosMenu
]);
