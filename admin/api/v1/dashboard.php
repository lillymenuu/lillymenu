<?php
/*
 * Versao JSON de admin/dashboard.php para o novo frontend Next.js — escopo
 * essencial (KPIs, grafico de pedidos/faturamento, top 5 produtos). Funil de
 * conversao, versiculo do dia, chat de suporte e busca global ficam fora
 * por enquanto, igual decidido para a Etapa 3.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/config.php';
require_once __DIR__ . '/../../helpers/pedidos_competencia.php';

header('Content-Type: application/json');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$tz            = new DateTimeZone('America/Fortaleza');
$agora         = new DateTimeImmutable('now', $tz);
$inicioMesAtual = $agora->modify('first day of this month')->format('Y-m-d');
$fimMesAtual    = $agora->modify('last day of this month')->format('Y-m-d');

$periodo = (int) ($_GET['periodo'] ?? 7);
$periodo = in_array($periodo, [7, 15, 30], true) ? $periodo : 7;
$inicioPeriodo = (new DateTime())->modify('-' . ($periodo - 1) . ' days')->format('Y-m-d');

$competencia          = pedidosCompetenciaConfig($conn, 'p', 'cx');
$joinCompetencia      = $competencia['join'];
$campoDataCompetencia = $competencia['date_expr'];

$stmtSerie = $conn->prepare("
  SELECT {$campoDataCompetencia} AS dia,
         COUNT(*) AS total_pedidos,
         COALESCE(SUM(p.total), 0) AS total_valor
  FROM pedidos p
  {$joinCompetencia}
  WHERE {$campoDataCompetencia} >= ?
    AND p.status = 'finalizado'
    AND p.loja_id = ?
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
$cursor = new DateTime($inicioPeriodo);
for ($i = 0; $i < $periodo; $i++) {
  $dia = $cursor->format('Y-m-d');
  $labels[] = $cursor->format('d/m');
  $seriePedidos[] = $mapPedidos[$dia] ?? 0;
  $serieValores[] = round($mapValores[$dia] ?? 0, 2);
  $cursor->modify('+1 day');
}

$stmtTotais = $conn->prepare("
  SELECT COUNT(*) AS total_pedidos, COALESCE(SUM(p.total), 0) AS total_receita
  FROM pedidos p
  {$joinCompetencia}
  WHERE {$campoDataCompetencia} >= ?
    AND p.status = 'finalizado'
    AND p.loja_id = ?
");
$stmtTotais->execute([$inicioPeriodo, $lojaId]);
$totais = $stmtTotais->fetch(PDO::FETCH_ASSOC) ?: [];
$totalPedidosPeriodo = (int) ($totais['total_pedidos'] ?? 0);
$totalReceitaPeriodo = (float) ($totais['total_receita'] ?? 0);

$stmtReceitaMes = $conn->prepare("
  SELECT COALESCE(SUM(p.total), 0) AS total
  FROM pedidos p
  {$joinCompetencia}
  WHERE {$campoDataCompetencia} >= ? AND {$campoDataCompetencia} <= ?
    AND p.status = 'finalizado'
    AND p.loja_id = ?
");
$stmtReceitaMes->execute([$inicioMesAtual, $fimMesAtual, $lojaId]);
$totalReceitaMesAtual = (float) $stmtReceitaMes->fetchColumn();

$acessosMenu = 0;
try {
  $stmtAc = $conn->query("SHOW TABLES LIKE 'loja_eventos'");
  if ($stmtAc->fetchColumn()) {
    $stmtAc = $conn->prepare("
      SELECT COUNT(*) FROM loja_eventos
      WHERE loja_id = ? AND tipo = 'visita' AND criado_em >= ? AND criado_em <= ?
    ");
    $stmtAc->execute([$lojaId, $inicioMesAtual, $fimMesAtual]);
    $acessosMenu = (int) $stmtAc->fetchColumn();
  }
} catch (Exception $e) {
  $acessosMenu = 0;
}

$totalClientes = 0;
try {
  $stmtClientes = $conn->prepare("SELECT COUNT(*) FROM clientes WHERE loja_id = ?");
  $stmtClientes->execute([$lojaId]);
  $totalClientes = (int) $stmtClientes->fetchColumn();
} catch (Exception $e) {
  $totalClientes = 0;
}

$topProdutos = [];
try {
  $stmtTop = $conn->prepare("
    SELECT COALESCE(pr.id, i.produto_id) AS produto_id,
           COALESCE(pr.nome, i.produto_nome) AS nome,
           COALESCE(pr.preco, i.preco) AS valor,
           COALESCE(e.quantidade, 0) AS estoque,
           SUM(i.quantidade) AS saidas
    FROM pedido_itens i
    JOIN pedidos p ON p.id = i.pedido_id
    LEFT JOIN produtos pr ON (
      pr.id = NULLIF(i.produto_id, 0)
      OR ((i.produto_id IS NULL OR i.produto_id = 0) AND pr.nome = i.produto_nome)
    ) AND pr.loja_id = :loja
    LEFT JOIN estoque e ON e.produto_id = pr.id AND e.loja_id = :loja
    WHERE p.status = 'finalizado' AND p.loja_id = :loja AND i.loja_id = :loja
    GROUP BY produto_id, nome, valor, estoque
    ORDER BY saidas DESC
    LIMIT 5
  ");
  $stmtTop->bindValue(':loja', $lojaId, PDO::PARAM_INT);
  $stmtTop->execute();
  $topProdutos = $stmtTop->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
  $topProdutos = [];
}

$lojaNome = config($conn, 'nome_loja', 'Minha Loja', $lojaId);
$lojaVerificada = config($conn, 'loja_verificada', '0', $lojaId) === '1';

/* Mesma logica de admin/dashboard.php pra montar o link publico da loja a
 * partir da chave livre "link_loja" (aceita o formato antigo /lilly/slug e
 * variantes). $_SERVER['HTTP_HOST'] aqui e o host da chamada servidor-a-
 * servidor do Next.js (o dominio do PHP, ex.: lillymenu.com) — nao o
 * dominio da Vercel, entao o link gerado fica correto pro cliente final. */
$_linkLojaRaw = config($conn, 'link_loja', '', $lojaId);
$_protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$_host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$_linkLojaBase = $_protocol . $_host . '/';
$_linkLojaBaseAntigo = $_protocol . $_host . '/lilly/';
if (strpos($_linkLojaRaw, $_linkLojaBaseAntigo) === 0) {
  $_slug = urldecode(substr($_linkLojaRaw, strlen($_linkLojaBaseAntigo)));
} elseif (preg_match('#[?&]loja=([^&]+)#', $_linkLojaRaw, $_m)) {
  $_slug = urldecode($_m[1]);
} elseif (preg_match('#/([^/?]+)/?$#', $_linkLojaRaw, $_m)) {
  $_slug = $_m[1];
} else {
  $_slug = $_linkLojaRaw;
}
$_slug = preg_replace('/\.php$/i', '', $_slug);
$linkLoja = $_slug !== '' ? $_linkLojaBase . $_slug : '';

echo json_encode([
  'ok'      => true,
  'periodo' => $periodo,
  'loja'    => [
    'nome'       => $lojaNome,
    'verificada' => $lojaVerificada,
    'link'       => $linkLoja,
  ],
  'kpis' => [
    'receita_mes_atual'   => $totalReceitaMesAtual,
    'faixa_receita_mes'   => $agora->modify('first day of this month')->format('d/m') . ' a ' . $agora->modify('last day of this month')->format('d/m'),
    'pedidos_periodo'     => $totalPedidosPeriodo,
    'receita_periodo'     => $totalReceitaPeriodo,
    'clientes_cadastrados' => $totalClientes,
    'acessos_menu'        => $acessosMenu,
  ],
  'grafico' => [
    'labels'        => $labels,
    'serie_pedidos' => $seriePedidos,
    'serie_valores' => $serieValores,
  ],
  'top_produtos' => array_map(function ($p) {
    return [
      'nome'    => $p['nome'] ?? 'Produto',
      'valor'   => (float) ($p['valor'] ?? 0),
      'saidas'  => (int) ($p['saidas'] ?? 0),
      'estoque' => (int) ($p['estoque'] ?? 0),
    ];
  }, $topProdutos),
]);
