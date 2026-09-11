<?php
/*
 * Versao JSON de admin/relatorio_cross_sell.php para o novo frontend
 * Next.js (/crosssellreport), trocando sessao por token Bearer. Mesmo
 * padrao de filtro de periodo (hoje/7dias/30dias/customizado) usado em
 * admin/api/v1/relatorios.php (/sales), com data_ini/data_fim no lugar dos
 * antigos inicio/fim.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

date_default_timezone_set('America/Fortaleza');

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$periodoFiltro = $_GET['periodo'] ?? 'hoje';
$inicioParam = trim($_GET['data_ini'] ?? '');
$fimParam = trim($_GET['data_fim'] ?? '');

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
  $periodoFiltro = 'hoje';
  $inicio = date('Y-m-d');
  $fim = date('Y-m-d');
}

$faturamento = 0.0;
$itensVendidos = 0;
$pedidosComCrossSell = 0;
$ticketMedio = 0.0;
$porDia = [];
$topProdutos = [];
$itens = [];

try {
  $colsItens = $conn->query("SHOW COLUMNS FROM pedido_itens")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temCrossSell = in_array('cross_sell', $colsItens, true);

  if ($temCrossSell) {
    $whereBase = "pi.loja_id = ? AND pi.cross_sell = 1 AND p.status <> 'cancelado' AND DATE(p.criado_em) BETWEEN ? AND ?";
    $paramsBase = [$lojaId, $inicio, $fim];

    $stmt = $conn->prepare("
      SELECT COALESCE(SUM(pi.preco * pi.quantidade), 0) AS faturamento,
             COALESCE(SUM(pi.quantidade), 0) AS itens,
             COUNT(DISTINCT pi.pedido_id) AS pedidos
      FROM pedido_itens pi
      JOIN pedidos p ON p.id = pi.pedido_id AND p.loja_id = pi.loja_id
      WHERE $whereBase
    ");
    $stmt->execute($paramsBase);
    $resumo = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $faturamento = (float) ($resumo['faturamento'] ?? 0);
    $itensVendidos = (int) ($resumo['itens'] ?? 0);
    $pedidosComCrossSell = (int) ($resumo['pedidos'] ?? 0);
    $ticketMedio = $pedidosComCrossSell > 0 ? $faturamento / $pedidosComCrossSell : 0;

    $stmt = $conn->prepare("
      SELECT DATE(p.criado_em) AS dia, SUM(pi.preco * pi.quantidade) AS valor
      FROM pedido_itens pi
      JOIN pedidos p ON p.id = pi.pedido_id AND p.loja_id = pi.loja_id
      WHERE $whereBase
      GROUP BY DATE(p.criado_em)
      ORDER BY dia
    ");
    $stmt->execute($paramsBase);
    $porDia = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt = $conn->prepare("
      SELECT pi.produto_nome AS nome, SUM(pi.quantidade) AS qtd, SUM(pi.preco * pi.quantidade) AS valor
      FROM pedido_itens pi
      JOIN pedidos p ON p.id = pi.pedido_id AND p.loja_id = pi.loja_id
      WHERE $whereBase
      GROUP BY pi.produto_nome
      ORDER BY valor DESC
      LIMIT 8
    ");
    $stmt->execute($paramsBase);
    $topProdutos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $colsPedidos = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
    $temCodigo = in_array('codigo', $colsPedidos, true);
    $selCodigo = $temCodigo ? "COALESCE(NULLIF(p.codigo,''), p.id)" : "p.id";

    $stmt = $conn->prepare("
      SELECT $selCodigo AS codigo, COALESCE(c.nome, 'Cliente') AS cliente, pi.produto_nome, pi.quantidade,
             pi.preco, (pi.preco * pi.quantidade) AS subtotal, p.criado_em
      FROM pedido_itens pi
      JOIN pedidos p ON p.id = pi.pedido_id AND p.loja_id = pi.loja_id
      LEFT JOIN clientes c ON c.id = p.cliente_id
      WHERE $whereBase
      ORDER BY p.criado_em DESC
      LIMIT 30
    ");
    $stmt->execute($paramsBase);
    $itens = $stmt->fetchAll(PDO::FETCH_ASSOC);
  }
} catch (Exception $e) {
}

echo json_encode([
  'ok' => true,
  'periodo' => ['inicio' => $inicio, 'fim' => $fim],
  'resumo' => [
    'faturamento' => $faturamento,
    'itens_vendidos' => $itensVendidos,
    'pedidos_cross_sell' => $pedidosComCrossSell,
    'ticket_medio' => $ticketMedio,
  ],
  'por_dia' => array_map(function ($d) {
    return ['dia' => $d['dia'], 'valor' => (float) $d['valor']];
  }, $porDia),
  'top_produtos' => array_map(function ($p) {
    return ['nome' => $p['nome'], 'qtd' => (int) $p['qtd'], 'valor' => (float) $p['valor']];
  }, $topProdutos),
  'itens' => array_map(function ($i) {
    return [
      'codigo' => (string) $i['codigo'],
      'cliente' => $i['cliente'],
      'produto_nome' => $i['produto_nome'],
      'quantidade' => (int) $i['quantidade'],
      'preco' => (float) $i['preco'],
      'subtotal' => (float) $i['subtotal'],
      'criado_em' => $i['criado_em'],
    ];
  }, $itens),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
