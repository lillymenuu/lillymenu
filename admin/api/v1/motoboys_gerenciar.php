<?php
/*
 * Versao JSON de admin/motoboys.php (bloco inicial: stats + lista de
 * motoboys com entregas/taxas do periodo) para o novo frontend Next.js
 * (/motoboys), trocando sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/motoboy_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

motoboyEnsureModule($conn);

$tz = new DateTimeZone('America/Fortaleza');
$agora = new DateTimeImmutable('now', $tz);

$periodo = (string) ($_GET['periodo'] ?? 'hoje');
$dataInicioInput = (string) ($_GET['data_inicio'] ?? '');
$dataFimInput = (string) ($_GET['data_fim'] ?? '');

if ($periodo === '7dias') {
  $inicio = $agora->setTime(0, 0)->modify('-6 days');
  $fim = $agora->setTime(23, 59, 59);
} elseif ($periodo === 'customizado' && $dataInicioInput !== '' && $dataFimInput !== '') {
  try {
    $inicio = (new DateTimeImmutable($dataInicioInput, $tz))->setTime(0, 0, 0);
    $fim = (new DateTimeImmutable($dataFimInput, $tz))->setTime(23, 59, 59);
  } catch (Throwable $e) {
    $inicio = $agora->setTime(0, 0, 0);
    $fim = $agora->setTime(23, 59, 59);
    $periodo = 'hoje';
  }
} else {
  $periodo = 'hoje';
  $inicio = $agora->setTime(0, 0, 0);
  $fim = $agora->setTime(23, 59, 59);
}
if ($dataInicioInput === '') {
  $dataInicioInput = $inicio->format('Y-m-d');
}
if ($dataFimInput === '') {
  $dataFimInput = $fim->format('Y-m-d');
}

$stmtStats = $conn->prepare("
  SELECT
    (SELECT COUNT(*) FROM motoboys WHERE loja_id = ?) AS total_motoboys,
    (SELECT COUNT(*)
       FROM pedidos
      WHERE loja_id = ?
        AND tipo = 'entrega'
        AND motoboy_id IS NOT NULL
        AND status = 'finalizado'
        AND criado_em BETWEEN ? AND ?) AS entregas_periodo,
    (SELECT COALESCE(SUM(taxa_entrega),0)
       FROM pedidos
      WHERE loja_id = ?
        AND tipo = 'entrega'
        AND motoboy_id IS NOT NULL
        AND status = 'finalizado'
        AND criado_em BETWEEN ? AND ?) AS taxas_periodo
");
$stmtStats->execute([$lojaId, $lojaId, $inicio->format('Y-m-d H:i:s'), $fim->format('Y-m-d H:i:s'), $lojaId, $inicio->format('Y-m-d H:i:s'), $fim->format('Y-m-d H:i:s')]);
$stats = $stmtStats->fetch(PDO::FETCH_ASSOC) ?: ['total_motoboys' => 0, 'entregas_periodo' => 0, 'taxas_periodo' => 0];

$stmtMotoboys = $conn->prepare("
  SELECT
    m.id, m.nome, m.whatsapp, m.data_cadastro, m.ativo,
    COUNT(p.id) AS entregas_periodo,
    COALESCE(SUM(p.taxa_entrega),0) AS taxas_periodo
  FROM motoboys m
  LEFT JOIN pedidos p
    ON p.motoboy_id = m.id
   AND p.loja_id = m.loja_id
   AND p.tipo = 'entrega'
   AND p.status = 'finalizado'
   AND p.criado_em BETWEEN ? AND ?
  WHERE m.loja_id = ?
  GROUP BY m.id
  ORDER BY m.nome ASC
");
$stmtMotoboys->execute([$inicio->format('Y-m-d H:i:s'), $fim->format('Y-m-d H:i:s'), $lojaId]);
$motoboys = $stmtMotoboys->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
  'ok' => true,
  'periodo' => $periodo,
  'data_inicio' => $dataInicioInput,
  'data_fim' => $dataFimInput,
  'stats' => [
    'total_motoboys' => (int) $stats['total_motoboys'],
    'entregas_periodo' => (int) $stats['entregas_periodo'],
    'taxas_periodo' => (float) $stats['taxas_periodo'],
  ],
  'motoboys' => array_map(function ($m) {
    return [
      'id' => (int) $m['id'],
      'nome' => $m['nome'],
      'whatsapp' => $m['whatsapp'],
      'data_cadastro' => $m['data_cadastro'],
      'ativo' => (int) $m['ativo'],
      'entregas_periodo' => (int) $m['entregas_periodo'],
      'taxas_periodo' => (float) $m['taxas_periodo'],
    ];
  }, $motoboys),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
