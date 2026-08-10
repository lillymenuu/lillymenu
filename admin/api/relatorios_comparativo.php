<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/pedidos_competencia.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$competencia = pedidosCompetenciaConfig($conn, 'p', 'cx');
$campoDataPedido = $competencia['date_expr'];
$joinCompetencia = $competencia['join'];

/* PERÍODO ATUAL */
$inicio = $_GET['inicio'] ?? date('Y-m-01');
$fim    = $_GET['fim'] ?? date('Y-m-d');

/* CALCULAR PERÍODO ANTERIOR AUTOMATICAMENTE */
$diffDias = (strtotime($fim) - strtotime($inicio)) / 86400;
$inicioAnterior = date('Y-m-d', strtotime($inicio . " -$diffDias days"));
$fimAnterior    = date('Y-m-d', strtotime($inicio . " -1 day"));

function resumoPeriodo($conn, $campoData, $inicio, $fim, $lojaId) {
  $competenciaJoin = $GLOBALS['joinCompetencia'] ?? '';
  $stmt = $conn->prepare("
    SELECT 
      COUNT(*) AS pedidos,
      COALESCE(SUM(p.total),0) AS faturamento
    FROM pedidos p
    {$competenciaJoin}
    WHERE {$campoData} BETWEEN ? AND ?
      AND p.loja_id = ?
      AND p.status = 'finalizado'
  ");
  $stmt->execute([$inicio, $fim, $lojaId]);
  $r = $stmt->fetch(PDO::FETCH_ASSOC);

  $ticket = $r['pedidos'] > 0
    ? $r['faturamento'] / $r['pedidos']
    : 0;

  return [
    'pedidos' => (int)$r['pedidos'],
    'faturamento' => (float)$r['faturamento'],
    'ticket' => round($ticket,2)
  ];
}

$atual    = resumoPeriodo($conn, $campoDataPedido, $inicio, $fim, $lojaId);
$anterior = resumoPeriodo($conn, $campoDataPedido, $inicioAnterior, $fimAnterior, $lojaId);

/* CRESCIMENTO (%) */
function crescimento($atual, $anterior) {
  if ($anterior == 0) return null;
  return round((($atual - $anterior) / $anterior) * 100, 2);
}

echo json_encode([
  'periodo_atual' => [
    'inicio' => $inicio,
    'fim'    => $fim,
    ...$atual
  ],
  'periodo_anterior' => [
    'inicio' => $inicioAnterior,
    'fim'    => $fimAnterior,
    ...$anterior
  ],
  'variacao' => [
    'pedidos'     => crescimento($atual['pedidos'], $anterior['pedidos']),
    'faturamento' => crescimento($atual['faturamento'], $anterior['faturamento']),
    'ticket'      => crescimento($atual['ticket'], $anterior['ticket'])
  ]
]);
