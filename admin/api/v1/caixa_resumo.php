<?php
/*
 * Versao JSON de admin/controle_caixa.php (bloco principal) para o novo
 * frontend Next.js (/cashcontrol), trocando sessao por token Bearer.
 *
 * O legado aceita filtros de periodo/operador/turno/comparar via querystring,
 * mas nenhum desses tem controle de UI renderizado na pagina (confirmado por
 * grep: nao ha <select>/<form method=get> pra eles) — na pratica a pagina
 * sempre roda no caminho default (hoje, todos operadores, sem turno
 * selecionado). Esta versao porta so esse caminho default, que e o unico
 * realmente alcancavel pelo usuario. Ver turno especifico do historico
 * continua funcionando via caixa_detalhe.php (endpoint separado, ja usado
 * pelo modal de detalhe do historico).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/pedidos_competencia.php';

date_default_timezone_set('America/Fortaleza');

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$pedidoColunas = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temCaixaPedido = in_array('caixa_id', $pedidoColunas, true);
$temStatusPedido = in_array('status', $pedidoColunas, true);
$temCodigoPedido = in_array('codigo', $pedidoColunas, true);
$competenciaPedidos = pedidosCompetenciaConfig($conn, 'p', 'cx');
$dataExpr = $competenciaPedidos['expr'];
$pedidoJoinCompetencia = $competenciaPedidos['join'];
$pedidoCodigoExpr = $temCodigoPedido ? "COALESCE(NULLIF(p.codigo, ''), p.id)" : "p.id";

function caixaBuscarResumo(PDO $conn, string $joinPedidos, string $where, array $params): array {
  $stmt = $conn->prepare("
    SELECT
      COUNT(*) AS total_pedidos,
      COALESCE(SUM(p.subtotal), 0) AS subtotal,
      COALESCE(SUM(p.desconto), 0) AS desconto,
      COALESCE(SUM(p.taxa_entrega), 0) AS taxa_entrega,
      COALESCE(SUM(p.taxa_maquininha), 0) AS taxa_maquininha,
      COALESCE(SUM(p.troco), 0) AS troco,
      COALESCE(SUM(p.total), 0) AS total_vendas
    FROM pedidos p
    {$joinPedidos}
    $where
  ");
  $stmt->execute($params);
  return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
}

function caixaBuscarPagamentos(PDO $conn, string $joinPedidos, string $where, array $params): array {
  $stmt = $conn->prepare("
    SELECT
      COALESCE(NULLIF(pp.forma, ''), NULLIF(p.forma_pagamento, ''), 'outro') AS forma,
      COUNT(*) AS quantidade,
      COALESCE(SUM(COALESCE(pp.valor, p.total)), 0) AS total
    FROM pedidos p
    LEFT JOIN pedido_pagamentos pp ON pp.pedido_id = p.id AND pp.loja_id = p.loja_id
    {$joinPedidos}
    $where
    GROUP BY COALESCE(NULLIF(pp.forma, ''), NULLIF(p.forma_pagamento, ''), 'outro')
  ");
  $stmt->execute($params);
  return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function caixaFiadoLancamentosExiste(PDO $conn): bool {
  static $existe = null;
  if ($existe === null) {
    $existe = (bool) $conn->query("SHOW TABLES LIKE 'fiado_lancamentos'")->fetchColumn();
  }
  return $existe;
}

function caixaBuscarPagamentosFiado(PDO $conn, int $lojaId, ?array $caixaAtual, string $inicio, string $fim): array {
  if (!caixaFiadoLancamentosExiste($conn)) {
    return [];
  }
  $where = ["loja_id = ?", "tipo = 'pagamento'"];
  $params = [$lojaId];
  if ($caixaAtual) {
    $abertoEm = $caixaAtual['aberto_em'] ?? null;
    $dataLimite = $abertoEm;
    if ($abertoEm && date('Y-m-d', strtotime($abertoEm)) < date('Y-m-d')) {
      $dataLimite = date('Y-m-d') . ' 00:00:00';
    }
    if ($abertoEm) {
      $where[] = "criado_em >= ?";
      $params[] = $dataLimite;
    }
  } else {
    $where[] = "DATE(criado_em) BETWEEN ? AND ?";
    $params[] = $inicio;
    $params[] = $fim;
  }
  $stmt = $conn->prepare("
    SELECT COALESCE(NULLIF(forma_pagamento, ''), 'outro') AS forma,
           COUNT(*) AS quantidade,
           COALESCE(SUM(valor), 0) AS total
    FROM fiado_lancamentos
    WHERE " . implode(' AND ', $where) . "
    GROUP BY forma
  ");
  $stmt->execute($params);
  return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function caixaBuscarMovimentosFiado(PDO $conn, int $lojaId, ?array $caixaAtual, string $inicio, string $fim): array {
  if (!caixaFiadoLancamentosExiste($conn)) {
    return [];
  }
  $where = ["f.loja_id = ?", "f.tipo = 'pagamento'"];
  $params = [$lojaId];
  if ($caixaAtual) {
    $abertoEm = $caixaAtual['aberto_em'] ?? null;
    $dataLimite = $abertoEm;
    if ($abertoEm && date('Y-m-d', strtotime($abertoEm)) < date('Y-m-d')) {
      $dataLimite = date('Y-m-d') . ' 00:00:00';
    }
    if ($abertoEm) {
      $where[] = "f.criado_em >= ?";
      $params[] = $dataLimite;
    }
  } else {
    $where[] = "DATE(f.criado_em) BETWEEN ? AND ?";
    $params[] = $inicio;
    $params[] = $fim;
  }
  $stmt = $conn->prepare("
    SELECT
      CONCAT('fp-', f.id) AS uid,
      LOWER(COALESCE(NULLIF(f.forma_pagamento, ''), 'outro')) AS forma,
      COALESCE(f.valor, 0) AS valor,
      f.criado_em AS criado_em,
      CONCAT('Pagamento de fiado - ', c.nome) AS observacoes,
      'entrada' AS direcao,
      'LILLY' AS origem
    FROM fiado_lancamentos f
    JOIN clientes c ON c.id = f.cliente_id AND c.loja_id = f.loja_id
    WHERE " . implode(' AND ', $where) . "
    ORDER BY f.criado_em DESC
  ");
  $stmt->execute($params);
  return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function caixaNormalizarForma(?string $forma): string {
  $valor = mb_strtolower(trim((string) $forma), 'UTF-8');
  $valor = str_replace(
    ['ã','á','à','â','é','ê','í','ó','ô','õ','ú','ç'],
    ['a','a','a','a','e','e','i','o','o','o','u','c'],
    $valor
  );
  return match (true) {
    $valor === 'pix' || str_contains($valor, 'pix') => 'pix',
    str_contains($valor, 'dinheiro') || str_contains($valor, 'cash') => 'dinheiro',
    str_contains($valor, 'debito') => 'debito',
    str_contains($valor, 'credito') => 'credito',
    str_contains($valor, 'voucher') || str_contains($valor, 'vale') => 'voucher',
    default => 'outro',
  };
}

$hoje = date('Y-m-d');

$stmt = $conn->prepare("
  SELECT c.id, c.status, c.saldo_inicial, c.saldo_final, c.aberto_em, c.fechado_em,
         c.operador_id, a.nome AS operador
  FROM caixa_turnos c
  LEFT JOIN admins a ON a.id = c.operador_id
  WHERE status = 'aberto' AND c.loja_id = ?
  ORDER BY id DESC
  LIMIT 1
");
$stmt->execute([$lojaId]);
$caixaAtual = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

if (!$caixaAtual) {
  echo json_encode(['ok' => true, 'caixa' => null], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$wherePedidosParts = ["p.loja_id = ?"];
$paramsPedidos = [$lojaId];
if ($temStatusPedido) {
  $wherePedidosParts[] = "p.status = 'finalizado'";
}
$wherePedidosParts[] = "COALESCE(p.forma_pagamento, '') <> 'fiado'";

$abertoEm = $caixaAtual['aberto_em'] ?? null;
$dataLimite = $abertoEm;
if ($abertoEm && date('Y-m-d', strtotime($abertoEm)) < $hoje) {
  $dataLimite = $hoje . ' 00:00:00';
}
if ($temCaixaPedido && $abertoEm) {
  $inicioOnline = date('Y-m-d', strtotime($abertoEm)) . ' 00:00:00';
  $wherePedidosParts[] = "(p.caixa_id = ? OR (p.caixa_id IS NULL AND $dataExpr >= ?))";
  $paramsPedidos[] = $caixaAtual['id'];
  $paramsPedidos[] = $inicioOnline;
} elseif ($temCaixaPedido) {
  $wherePedidosParts[] = "p.caixa_id = ?";
  $paramsPedidos[] = $caixaAtual['id'];
} elseif ($abertoEm) {
  $wherePedidosParts[] = "$dataExpr BETWEEN ? AND ?";
  $paramsPedidos[] = $dataLimite;
  $paramsPedidos[] = date('Y-m-d H:i:s');
}
$wherePedidos = 'WHERE ' . implode(' AND ', $wherePedidosParts);

$resumo = caixaBuscarResumo($conn, $pedidoJoinCompetencia, $wherePedidos, $paramsPedidos);
$pagamentos = caixaBuscarPagamentos($conn, $pedidoJoinCompetencia, $wherePedidos, $paramsPedidos);
$pagamentos = array_merge($pagamentos, caixaBuscarPagamentosFiado($conn, $lojaId, $caixaAtual, $hoje, $hoje));

$totaisPagamento = ['pix' => 0.0, 'credito' => 0.0, 'debito' => 0.0, 'dinheiro' => 0.0, 'voucher' => 0.0, 'outro' => 0.0];
foreach ($pagamentos as $p) {
  $forma = caixaNormalizarForma($p['forma'] ?? 'outro');
  $total = (float) ($p['total'] ?? 0);
  if (!array_key_exists($forma, $totaisPagamento)) {
    $totaisPagamento['outro'] += $total;
    continue;
  }
  $totaisPagamento[$forma] += $total;
}

$totalVendas = (float) ($resumo['total_vendas'] ?? 0);
$taxaEntrega = (float) ($resumo['taxa_entrega'] ?? 0);
$taxaMaquininha = (float) ($resumo['taxa_maquininha'] ?? 0);
$troco = (float) ($resumo['troco'] ?? 0);

// Saldo inicial: soma de todos os turnos abertos HOJE (pode haver mais de um se
// o caixa foi fechado e reaberto no mesmo dia) — mesmo comportamento do legado.
$stmt = $conn->prepare("SELECT COALESCE(SUM(saldo_inicial), 0) FROM caixa_turnos WHERE loja_id = ? AND DATE(aberto_em) BETWEEN ? AND ?");
$stmt->execute([$lojaId, $hoje, $hoje]);
$saldoInicial = (float) $stmt->fetchColumn();

$suprimentosTotal = 0.0;
$sangriasTotal = 0.0;
$whereMovParts = ["m.loja_id = ?", "DATE(m.criado_em) BETWEEN ? AND ?"];
$paramsMov = [$lojaId, $hoje, $hoje];
$whereMov = 'WHERE ' . implode(' AND ', $whereMovParts);

$stmt = $conn->prepare("SELECT tipo, COALESCE(SUM(valor), 0) AS total FROM caixa_movimentacoes m $whereMov GROUP BY tipo");
$stmt->execute($paramsMov);
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $mov) {
  if ($mov['tipo'] === 'suprimento') {
    $suprimentosTotal = (float) $mov['total'];
  } elseif ($mov['tipo'] === 'sangria') {
    $sangriasTotal = (float) $mov['total'];
  }
}

// Linhas de "entrada" (pagamentos de pedidos + fiado) exibidas na tabela de
// movimentacoes do turno atual. As movimentacoes manuais (suprimento/sangria)
// nao entram nesta lista no legado — so contam pros totais acima.
$movimentosTabela = [];
try {
  $stmt = $conn->prepare("
    SELECT
      COALESCE(CONCAT('pg-', pp.id), CONCAT('pd-', p.id)) AS uid,
      LOWER(COALESCE(NULLIF(pp.forma, ''), NULLIF(p.forma_pagamento, ''), 'outro')) AS forma,
      COALESCE(pp.valor, p.total, 0) AS valor,
      COALESCE(pp.criado_em, p.criado_em) AS criado_em,
      CONCAT('Pedido #', {$pedidoCodigoExpr}) AS observacoes,
      'entrada' AS direcao,
      'LILLY' AS origem
    FROM pedidos p
    LEFT JOIN pedido_pagamentos pp ON pp.pedido_id = p.id AND pp.loja_id = p.loja_id
    {$pedidoJoinCompetencia}
    $wherePedidos
    ORDER BY COALESCE(pp.criado_em, p.criado_em) DESC
  ");
  $stmt->execute($paramsPedidos);
  $movimentosTabela = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $movimentosTabela = array_merge($movimentosTabela, caixaBuscarMovimentosFiado($conn, $lojaId, $caixaAtual, $hoje, $hoje));
  usort($movimentosTabela, static function ($a, $b) {
    return (strtotime((string) ($b['criado_em'] ?? '')) ?: 0) <=> (strtotime((string) ($a['criado_em'] ?? '')) ?: 0);
  });
} catch (Exception $e) {
}

$saldoEsperado = $saldoInicial + $totaisPagamento['dinheiro'] - $troco + $suprimentosTotal - $sangriasTotal;
$resumoEntradaTotal = array_sum($totaisPagamento) + $suprimentosTotal;
$resumoSaidaTotal = $troco + $taxaMaquininha + $sangriasTotal;
$resumoSaldoTotal = $resumoEntradaTotal - $resumoSaidaTotal;

echo json_encode([
  'ok' => true,
  'caixa' => [
    'id' => (int) $caixaAtual['id'],
    'status' => $caixaAtual['status'],
    'saldo_inicial' => (float) $caixaAtual['saldo_inicial'],
    'aberto_em' => $caixaAtual['aberto_em'],
    'operador' => $caixaAtual['operador'],
  ],
  'resumo' => [
    'saldo_inicial_dia' => $saldoInicial,
    'pagamentos' => $totaisPagamento,
    'saldo_esperado' => $saldoEsperado,
    'entrada_total' => $resumoEntradaTotal,
    'saida_total' => $resumoSaidaTotal,
    'saldo_total' => $resumoSaldoTotal,
    'troco' => $troco,
    'taxa_maquininha' => $taxaMaquininha,
    'sangrias_total' => $sangriasTotal,
    'total_vendas' => $totalVendas,
    'taxa_entrega' => $taxaEntrega,
    'total_sem_taxa_entrega' => $totalVendas - $taxaEntrega,
  ],
  'movimentos' => array_map(function ($m) {
    return [
      'uid' => $m['uid'],
      'forma' => caixaNormalizarForma($m['forma'] ?? 'outro'),
      'valor' => (float) ($m['valor'] ?? 0),
      'criado_em' => $m['criado_em'],
      'observacoes' => $m['observacoes'],
      'direcao' => $m['direcao'] ?? 'entrada',
      'origem' => $m['origem'] ?? 'LILLY',
    ];
  }, $movimentosTabela),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
