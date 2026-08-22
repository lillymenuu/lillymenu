<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.controle_caixa');
require_once __DIR__ . '/helpers/pedidos_competencia.php';

$operadorId = $_SESSION['admin_id'] ?? null;
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$pedidoColunas = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temOperadorPedido = in_array('operador_id', $pedidoColunas, true);
$temCaixaPedido = in_array('caixa_id', $pedidoColunas, true);
$temStatusPedido = in_array('status', $pedidoColunas, true);
$temOrigemPedido = in_array('origem', $pedidoColunas, true);
$temCodigoPedido = in_array('codigo', $pedidoColunas, true);
$competenciaPedidos = pedidosCompetenciaConfig($conn, 'p', 'cx');
$dataExpr = $competenciaPedidos['expr'];
$pedidoJoinCompetencia = $competenciaPedidos['join'];
$pedidoCodigoExpr = $temCodigoPedido
  ? "COALESCE(NULLIF(p.codigo, ''), p.id)"
  : "p.id";

function buscarResumo(PDO $conn, string $joinPedidos, $where, array $params) {
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

function buscarPagamentos(PDO $conn, string $joinPedidos, $where, array $params) {
  // LEFT JOIN (nao INNER + fallback global): um pedido sem linha em
  // pedido_pagamentos (ex: insert que falhou silenciosamente em
  // public/api/pedido_criar.php) precisa continuar entrando aqui via
  // p.forma_pagamento, mesmo que OUTROS pedidos do mesmo periodo tenham
  // pedido_pagamentos normalmente — antes, bastava 1 pedido com
  // pedido_pagamentos pra esse pedido sumir da lista inteira.
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

function tabelaFiadoLancamentosExiste(PDO $conn): bool {
  static $existe = null;
  if ($existe === null) {
    $existe = (bool) $conn->query("SHOW TABLES LIKE 'fiado_lancamentos'")->fetchColumn();
  }
  return $existe;
}

function buscarPagamentosFiado(PDO $conn, int $lojaId, ?array $caixaSelecionado, ?array $caixaAtual, ?int $operadorFiltroId, string $inicio, string $fim): array {
  if (!tabelaFiadoLancamentosExiste($conn)) {
    return [];
  }

  $where = ["loja_id = ?", "tipo = 'pagamento'"];
  $params = [$lojaId];

  if ($caixaSelecionado) {
    $abertoEm = $caixaSelecionado['aberto_em'] ?? null;
    $fechadoEm = $caixaSelecionado['fechado_em'] ?? null;
    $ate = $fechadoEm ?: date('Y-m-d H:i:s');
    if ($abertoEm) {
      $where[] = "criado_em BETWEEN ? AND ?";
      $params[] = $abertoEm;
      $params[] = $ate;
    }
    if ($operadorFiltroId) {
      $where[] = "operador_id = ?";
      $params[] = $operadorFiltroId;
    }
  } elseif ($caixaAtual) {
    $abertoEm = $caixaAtual['aberto_em'] ?? null;
    $dataLimite = $abertoEm;
    if ($abertoEm && date('Y-m-d', strtotime($abertoEm)) < date('Y-m-d')) {
      $dataLimite = date('Y-m-d') . ' 00:00:00';
    }
    if ($abertoEm) {
      $where[] = "criado_em >= ?";
      $params[] = $dataLimite;
    }
    if ($operadorFiltroId) {
      $where[] = "operador_id = ?";
      $params[] = $operadorFiltroId;
    }
  } else {
    $where[] = "DATE(criado_em) BETWEEN ? AND ?";
    $params[] = $inicio;
    $params[] = $fim;
    if ($operadorFiltroId) {
      $where[] = "operador_id = ?";
      $params[] = $operadorFiltroId;
    }
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

function buscarMovimentosFiado(PDO $conn, int $lojaId, ?array $caixaSelecionado, ?array $caixaAtual, ?int $operadorFiltroId, string $inicio, string $fim): array {
  if (!tabelaFiadoLancamentosExiste($conn)) {
    return [];
  }

  $where = ["f.loja_id = ?", "f.tipo = 'pagamento'"];
  $params = [$lojaId];

  if ($caixaSelecionado) {
    $abertoEm = $caixaSelecionado['aberto_em'] ?? null;
    $fechadoEm = $caixaSelecionado['fechado_em'] ?? null;
    $ate = $fechadoEm ?: date('Y-m-d H:i:s');
    if ($abertoEm) {
      $where[] = "f.criado_em BETWEEN ? AND ?";
      $params[] = $abertoEm;
      $params[] = $ate;
    }
    if ($operadorFiltroId) {
      $where[] = "f.operador_id = ?";
      $params[] = $operadorFiltroId;
    }
  } elseif ($caixaAtual) {
    $abertoEm = $caixaAtual['aberto_em'] ?? null;
    $dataLimite = $abertoEm;
    if ($abertoEm && date('Y-m-d', strtotime($abertoEm)) < date('Y-m-d')) {
      $dataLimite = date('Y-m-d') . ' 00:00:00';
    }
    if ($abertoEm) {
      $where[] = "f.criado_em >= ?";
      $params[] = $dataLimite;
    }
    if ($operadorFiltroId) {
      $where[] = "f.operador_id = ?";
      $params[] = $operadorFiltroId;
    }
  } else {
    $where[] = "DATE(f.criado_em) BETWEEN ? AND ?";
    $params[] = $inicio;
    $params[] = $fim;
    if ($operadorFiltroId) {
      $where[] = "f.operador_id = ?";
      $params[] = $operadorFiltroId;
    }
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

function normalizarFormaCaixa(?string $forma): string {
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

function labelFormaCaixa(string $forma): string {
  return match ($forma) {
    'pix' => 'Pix',
    'dinheiro' => 'Dinheiro',
    'credito' => 'Crédito',
    'debito' => 'Débito',
    'voucher' => 'Voucher',
    default => 'Outros',
  };
}

$periodoFiltro = $_GET['periodo'] ?? 'hoje';
$inicioParam = $_GET['inicio'] ?? '';
$fimParam = $_GET['fim'] ?? '';
$operadorFiltro = $_GET['operador'] ?? 'todos';
$turnoFiltro = (int) ($_GET['turno'] ?? 0);
$comparar = ($_GET['comparar'] ?? '0') === '1';

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

$colsAdmins = $conn->query("SHOW COLUMNS FROM admins")->fetchAll(PDO::FETCH_COLUMN, 0);
$adminsWhere = ["loja_id = ?"];
if (in_array('ativo', $colsAdmins, true)) {
  $adminsWhere[] = "ativo = 1";
}
if (in_array('perfil', $colsAdmins, true)) {
  $adminsWhere[] = "perfil <> 'superadmin'";
}
$stmt = $conn->prepare("SELECT id, nome FROM admins WHERE " . implode(' AND ', $adminsWhere) . " ORDER BY nome");
$stmt->execute([$lojaId]);
$operadores = $stmt->fetchAll(PDO::FETCH_ASSOC);
$operadoresMap = [];
foreach ($operadores as $op) {
  $operadoresMap[$op['id']] = $op['nome'];
}

$operadorFiltroId = null;
if ($operadorFiltro !== 'todos' && (int) $operadorFiltro > 0) {
  $operadorFiltroId = (int) $operadorFiltro;
}

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

$caixaSelecionado = null;
if ($turnoFiltro > 0) {
  $stmt = $conn->prepare("
    SELECT c.id, c.status, c.saldo_inicial, c.saldo_final, c.aberto_em, c.fechado_em,
           c.operador_id, a.nome AS operador
    FROM caixa_turnos c
    LEFT JOIN admins a ON a.id = c.operador_id
    WHERE c.id = ? AND c.loja_id = ?
    LIMIT 1
  ");
  $stmt->execute([$turnoFiltro, $lojaId]);
  $caixaSelecionado = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
  if ($caixaSelecionado) {
    $operadorFiltroId = (int) $caixaSelecionado['operador_id'];
    $operadorFiltro = (string) $operadorFiltroId;
  }
}

$periodoLabel = 'Hoje';
if ($caixaSelecionado) {
  $periodoLabel = 'Turno #' . $caixaSelecionado['id'];
} elseif ($periodoFiltro === 'customizado') {
  $periodoLabel = $inicio . ' a ' . $fim;
} elseif ($periodoFiltro === '7dias') {
  $periodoLabel = 'Ultimos 7 dias';
} elseif ($periodoFiltro === '30dias') {
  $periodoLabel = 'Ultimos 30 dias';
}
$entradaLabel = $caixaSelecionado
  ? 'Entrada do turno'
  : ($periodoFiltro === 'hoje' ? 'Entrada do dia' : 'Entrada do periodo');

$wherePedidosParts = ["p.loja_id = ?"];
$paramsPedidos = [$lojaId];
if ($temStatusPedido) {
  $wherePedidosParts[] = "p.status = 'finalizado'";
}
$wherePedidosParts[] = "COALESCE(p.forma_pagamento, '') <> 'fiado'";
if ($caixaSelecionado) {
  $abertoEm  = $caixaSelecionado['aberto_em']  ?? null;
  $fechadoEm = $caixaSelecionado['fechado_em'] ?? null;
  $ate = $fechadoEm ?: date('Y-m-d H:i:s');
  if ($temCaixaPedido && $abertoEm) {
    /* Inclui pedidos do caixa (pelo caixa_id) E pedidos sem caixa (loja online,
       caixa_id NULL) criados no período. Pra esses ultimos, o piso e a meia-noite
       do dia em que o caixa abriu — nao o horario exato de abertura — porque um
       pedido online pode ter sido finalizado num intervalo em que nenhum caixa
       estava aberto ainda (ex: entre o fechamento de ontem e a abertura de hoje),
       e nesse caso ele fica com caixa_id NULL pra sempre; usar o horario exato
       de abertura como piso faria esse pedido nunca aparecer em turno nenhum. */
    $inicioOnline = date('Y-m-d', strtotime($abertoEm)) . ' 00:00:00';
    $wherePedidosParts[] = "(p.caixa_id = ? OR (p.caixa_id IS NULL AND $dataExpr BETWEEN ? AND ?))";
    $paramsPedidos[] = $caixaSelecionado['id'];
    $paramsPedidos[] = $inicioOnline;
    $paramsPedidos[] = $ate;
  } elseif ($temCaixaPedido) {
    $wherePedidosParts[] = "p.caixa_id = ?";
    $paramsPedidos[] = $caixaSelecionado['id'];
  } else {
    if ($abertoEm) {
      $wherePedidosParts[] = "$dataExpr BETWEEN ? AND ?";
      $paramsPedidos[] = $abertoEm;
      $paramsPedidos[] = $ate;
    }
    if ($operadorFiltroId && $temOperadorPedido) {
      $wherePedidosParts[] = "p.operador_id = ?";
      $paramsPedidos[] = $operadorFiltroId;
    }
  }
} elseif ($caixaAtual) {
  $abertoEm = $caixaAtual['aberto_em'] ?? null;
  /* $dataLimite usada apenas para pedidos do próprio caixa (operador) */
  $dataLimite = $abertoEm;
  if ($abertoEm && date('Y-m-d', strtotime($abertoEm)) < date('Y-m-d')) {
    $dataLimite = date('Y-m-d') . ' 00:00:00';
  }
  if ($temCaixaPedido && $abertoEm) {
    /* Pedidos do caixa: pelo caixa_id.
       Pedidos online (caixa_id NULL): desde a meia-noite do dia em que o caixa
       abriu, nao desde o horario exato de abertura — um pedido online pode ter
       sido finalizado num intervalo sem nenhum caixa aberto (ex: entre o
       fechamento de ontem e a abertura de hoje) e fica com caixa_id NULL pra
       sempre; usar o horario exato de abertura como piso fazia esse pedido
       nunca aparecer em turno nenhum, mesmo sendo do mesmo dia. */
    $inicioOnline = date('Y-m-d', strtotime($abertoEm)) . ' 00:00:00';
    $wherePedidosParts[] = "(p.caixa_id = ? OR (p.caixa_id IS NULL AND $dataExpr >= ?))";
    $paramsPedidos[] = $caixaAtual['id'];
    $paramsPedidos[] = $inicioOnline;
  } elseif ($temCaixaPedido) {
    $wherePedidosParts[] = "p.caixa_id = ?";
    $paramsPedidos[] = $caixaAtual['id'];
  } else {
    if ($abertoEm) {
      $wherePedidosParts[] = "$dataExpr BETWEEN ? AND ?";
      $paramsPedidos[] = $dataLimite;
      $paramsPedidos[] = date('Y-m-d H:i:s');
    }
    if ($operadorFiltroId && $temOperadorPedido) {
      $wherePedidosParts[] = "p.operador_id = ?";
      $paramsPedidos[] = $operadorFiltroId;
    }
  }
} else {
  $wherePedidosParts[] = "DATE($dataExpr) BETWEEN ? AND ?";
  $paramsPedidos[] = $inicio;
  $paramsPedidos[] = $fim;
  if ($operadorFiltroId && $temOperadorPedido) {
    $wherePedidosParts[] = "p.operador_id = ?";
    $paramsPedidos[] = $operadorFiltroId;
  }
}
$wherePedidos = $wherePedidosParts ? ('WHERE ' . implode(' AND ', $wherePedidosParts)) : '';


$resumo = buscarResumo($conn, $pedidoJoinCompetencia, $wherePedidos, $paramsPedidos);
$pagamentos = buscarPagamentos($conn, $pedidoJoinCompetencia, $wherePedidos, $paramsPedidos);
$pagamentos = array_merge($pagamentos, buscarPagamentosFiado($conn, $lojaId, $caixaSelecionado, $caixaAtual, $operadorFiltroId, $inicio, $fim));

$totaisPagamento = [
  'pix' => 0,
  'credito' => 0,
  'debito' => 0,
  'dinheiro' => 0,
  'voucher' => 0,
  'outro' => 0
];
$extrasPagamento = [];
foreach ($pagamentos as $p) {
  $forma = normalizarFormaCaixa($p['forma'] ?? 'outro');
  $total = (float) ($p['total'] ?? 0);
  if (!array_key_exists($forma, $totaisPagamento)) {
    $totaisPagamento['outro'] += $total;
    $extrasPagamento[] = ['forma' => $forma, 'total' => $total];
    continue;
  }
  $totaisPagamento[$forma] += $total;
}

$totalPedidos = (int) ($resumo['total_pedidos'] ?? 0);
$subtotal = (float) ($resumo['subtotal'] ?? 0);
$desconto = (float) ($resumo['desconto'] ?? 0);
$taxaEntrega = (float) ($resumo['taxa_entrega'] ?? 0);
$taxaMaquininha = (float) ($resumo['taxa_maquininha'] ?? 0);
$troco = (float) ($resumo['troco'] ?? 0);
$totalVendas = (float) ($resumo['total_vendas'] ?? 0);
$operadorLabel = $operadorFiltroId
  ? ($operadoresMap[$operadorFiltroId] ?? 'Operador')
  : 'Todos operadores';

$caixaVisual = $caixaSelecionado ?: $caixaAtual;
$operadorCaixaAtual = $caixaVisual['operador'] ?? ($caixaVisual['operador_id'] ?? null);
if (is_numeric($operadorCaixaAtual)) {
  $operadorCaixaAtual = $operadoresMap[(int) $operadorCaixaAtual] ?? $operadorLabel;
}
if (!$operadorCaixaAtual) {
  $operadorCaixaAtual = $operadorLabel;
}
$mesesPt = [
  1 => 'jan', 2 => 'fev', 3 => 'mar', 4 => 'abr', 5 => 'mai', 6 => 'jun',
  7 => 'jul', 8 => 'ago', 9 => 'set', 10 => 'out', 11 => 'nov', 12 => 'dez'
];
$aberturaFormatada = '-';
if ($caixaVisual && !empty($caixaVisual['aberto_em'])) {
  $tsAbertura = strtotime($caixaVisual['aberto_em']);
  /* Se o caixa está aberto de um dia anterior, exibir "hoje" como referência */
  if ($tsAbertura && date('Y-m-d', $tsAbertura) < date('Y-m-d') && ($caixaVisual['status'] ?? '') === 'aberto') {
    $aberturaFormatada = 'hoje (caixa aberto desde ' . date('d', $tsAbertura) . ' de ' . ($mesesPt[(int) date('n', $tsAbertura)] ?? date('m', $tsAbertura)) . ')';
  } elseif ($tsAbertura) {
    $aberturaFormatada = date('d', $tsAbertura) . ' de ' . ($mesesPt[(int) date('n', $tsAbertura)] ?? date('m', $tsAbertura)) . ' de ' . date('Y', $tsAbertura) . ' às ' . date('H:i', $tsAbertura);
  }
}
$statusCaixa = $caixaSelecionado
  ? (($caixaSelecionado['status'] ?? 'fechado'))
  : ($caixaAtual ? 'aberto' : 'fechado');
$statusCaixaTexto = $statusCaixa === 'aberto' ? 'Aberto' : 'Fechado';

$saldoInicial = 0.0;
if ($caixaSelecionado) {
  $saldoInicial = (float) ($caixaSelecionado['saldo_inicial'] ?? 0);
} else {
  $whereSaldo = ["loja_id = ?", "DATE(aberto_em) BETWEEN ? AND ?"];
  $paramsSaldo = [$lojaId, $inicio, $fim];
  if ($operadorFiltroId) {
    $whereSaldo[] = "operador_id = ?";
    $paramsSaldo[] = $operadorFiltroId;
  }
  $stmt = $conn->prepare("
    SELECT COALESCE(SUM(saldo_inicial), 0)
    FROM caixa_turnos
    WHERE " . implode(' AND ', $whereSaldo)
  );
  $stmt->execute($paramsSaldo);
  $saldoInicial = (float) $stmt->fetchColumn();
}

$suprimentosTotal = 0.0;
$sangriasTotal = 0.0;
$movimentos = [];
$movimentosErro = false;
$whereMovParts = ["m.loja_id = ?"];
$paramsMov = [$lojaId];
if ($caixaSelecionado) {
  $whereMovParts[] = "m.caixa_id = ?";
  $paramsMov[] = $caixaSelecionado['id'];
} else {
  $whereMovParts[] = "DATE(m.criado_em) BETWEEN ? AND ?";
  $paramsMov[] = $inicio;
  $paramsMov[] = $fim;
  if ($operadorFiltroId) {
    $whereMovParts[] = "m.operador_id = ?";
    $paramsMov[] = $operadorFiltroId;
  }
}
$whereMov = $whereMovParts ? ('WHERE ' . implode(' AND ', $whereMovParts)) : '';

try {
  $stmt = $conn->prepare("
    SELECT tipo, COALESCE(SUM(valor), 0) AS total
    FROM caixa_movimentacoes m
    $whereMov
    GROUP BY tipo
  ");
  $stmt->execute($paramsMov);
  $totaisMov = $stmt->fetchAll(PDO::FETCH_ASSOC);
  foreach ($totaisMov as $mov) {
    if ($mov['tipo'] === 'suprimento') {
      $suprimentosTotal = (float) $mov['total'];
    } elseif ($mov['tipo'] === 'sangria') {
      $sangriasTotal = (float) $mov['total'];
    }
  }

  $stmt = $conn->prepare("
    SELECT m.id, m.tipo, m.valor, m.observacoes, m.criado_em, a.nome AS operador
    FROM caixa_movimentacoes m
    LEFT JOIN admins a ON a.id = m.operador_id
    $whereMov
    ORDER BY m.id DESC
    LIMIT 10
  ");
  $stmt->execute($paramsMov);
  $movimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
  $movimentosErro = true;
}

$movimentosTabela = [];
$movimentosTabelaErro = false;
try {
  // LEFT JOIN (nao INNER + fallback global — mesmo problema do buscarPagamentos
  // acima): garante que todo pedido do periodo aparece na lista, mesmo os que
  // nao tem linha em pedido_pagamentos, sem depender de TODOS os pedidos do
  // periodo estarem nessa mesma situacao pro fallback disparar.
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

  $movimentosTabela = array_merge(
    $movimentosTabela,
    buscarMovimentosFiado($conn, $lojaId, $caixaSelecionado, $caixaAtual, $operadorFiltroId, $inicio, $fim)
  );

  usort($movimentosTabela, static function ($a, $b) {
    $ta = strtotime((string) ($a['criado_em'] ?? '')) ?: 0;
    $tb = strtotime((string) ($b['criado_em'] ?? '')) ?: 0;
    return $tb <=> $ta;
  });
} catch (Exception $e) {
  $movimentosTabelaErro = true;
}

$movimentosTabelaEntradaTotal = 0.0;
foreach ($movimentosTabela as $movTabelaItem) {
  if (($movTabelaItem['direcao'] ?? 'entrada') !== 'saida') {
    $movimentosTabelaEntradaTotal += (float) ($movTabelaItem['valor'] ?? 0);
  }
}

$saldoEsperado = $saldoInicial + $totaisPagamento['dinheiro'] - $troco + $suprimentosTotal - $sangriasTotal;
$entradaResumoLinhas = [
  ['label' => 'pix (lilly):', 'valor' => $totaisPagamento['pix']],
  ['label' => 'débito:', 'valor' => $totaisPagamento['debito']],
  ['label' => 'crédito:', 'valor' => $totaisPagamento['credito']],
  ['label' => 'dinheiro:', 'valor' => $totaisPagamento['dinheiro']],
  ['label' => 'vouchers:', 'valor' => $totaisPagamento['voucher']],
  ['label' => 'outros:', 'valor' => $totaisPagamento['outro']],
];
$saidaResumoLinhas = [
  ['label' => 'troco:', 'valor' => $troco],
  ['label' => 'taxa de maquininha:', 'valor' => $taxaMaquininha],
  ['label' => 'sangrias:', 'valor' => $sangriasTotal],
];
$resumoEntradaTotal = $totaisPagamento['pix'] + $totaisPagamento['debito'] + $totaisPagamento['credito'] + $totaisPagamento['dinheiro'] + $totaisPagamento['voucher'] + $totaisPagamento['outro'] + $suprimentosTotal;
$resumoSaidaTotal = $troco + $taxaMaquininha + $sangriasTotal;
$resumoSaldoTotal = $resumoEntradaTotal - $resumoSaidaTotal;

$whereTurnosParts = ["c.loja_id = ?"];
$paramsTurnos = [$lojaId];
if ($operadorFiltroId) {
  $whereTurnosParts[] = "c.operador_id = ?";
  $paramsTurnos[] = $operadorFiltroId;
}
if (!$caixaSelecionado) {
  $whereTurnosParts[] = "DATE(c.aberto_em) BETWEEN ? AND ?";
  $paramsTurnos[] = $inicio;
  $paramsTurnos[] = $fim;
}
$whereTurnos = $whereTurnosParts ? ('WHERE ' . implode(' AND ', $whereTurnosParts)) : '';

$stmt = $conn->prepare("
  SELECT c.id, c.status, c.saldo_inicial, c.saldo_final, c.aberto_em, c.fechado_em,
         a.nome AS operador
  FROM caixa_turnos c
  LEFT JOIN admins a ON a.id = c.operador_id
  $whereTurnos
  ORDER BY c.id DESC
  LIMIT 12
");
$stmt->execute($paramsTurnos);
$historico = $stmt->fetchAll(PDO::FETCH_ASSOC);
$historicoFechado = array_values(array_filter($historico, static function ($item) {
  return ($item['status'] ?? '') !== 'aberto';
}));
$historicoFechadoTabela = [];
$paramsHistoricoBase = [$lojaId];
$whereHistoricoBase = ["c.loja_id = ?"];
if ($operadorFiltroId) {
  $whereHistoricoBase[] = "c.operador_id = ?";
  $paramsHistoricoBase[] = $operadorFiltroId;
}
$paramsHistoricoFechado = $paramsHistoricoBase;
$whereHistoricoFechado = array_merge($whereHistoricoBase, ["c.status <> 'aberto'"]);
$stmt = $conn->prepare("
  SELECT c.id, c.status, c.aberto_em, c.fechado_em, a.nome AS operador
  FROM caixa_turnos c
  LEFT JOIN admins a ON a.id = c.operador_id
  WHERE " . implode(' AND ', $whereHistoricoFechado) . "
  ORDER BY c.id DESC
  LIMIT 50
");
$stmt->execute($paramsHistoricoFechado);
$historicoFechadoTabela = $stmt->fetchAll(PDO::FETCH_ASSOC);
$historicoFechadoPagina = max(1, (int) ($_GET['pagina_historico'] ?? 1));
$historicoFechadoPorPagina = 9;
$historicoFechadoTotal = count($historicoFechadoTabela);
$historicoFechadoPaginas = max(1, (int) ceil($historicoFechadoTotal / $historicoFechadoPorPagina));
if ($historicoFechadoPagina > $historicoFechadoPaginas) {
  $historicoFechadoPagina = $historicoFechadoPaginas;
}
$historicoFechadoOffset = ($historicoFechadoPagina - 1) * $historicoFechadoPorPagina;
$historicoFechadoTabelaPaginada = array_slice($historicoFechadoTabela, $historicoFechadoOffset, $historicoFechadoPorPagina);
$historicoFechadoQuery = $_GET;
unset($historicoFechadoQuery['historico_ajax'], $historicoFechadoQuery['historico_tipo']);

$historicoCompletoTabela = [];
$stmt = $conn->prepare("
  SELECT c.id, c.status, c.aberto_em, c.fechado_em, a.nome AS operador
  FROM caixa_turnos c
  LEFT JOIN admins a ON a.id = c.operador_id
  WHERE " . implode(' AND ', $whereHistoricoBase) . "
  ORDER BY c.id DESC
  LIMIT 80
");
$stmt->execute($paramsHistoricoBase);
$historicoCompletoTabela = $stmt->fetchAll(PDO::FETCH_ASSOC);
$historicoCompletoPagina = max(1, (int) ($_GET['pagina_historico_all'] ?? 1));
$historicoCompletoPorPagina = 10;
$historicoCompletoTotal = count($historicoCompletoTabela);
$historicoCompletoPaginas = max(1, (int) ceil($historicoCompletoTotal / $historicoCompletoPorPagina));
if ($historicoCompletoPagina > $historicoCompletoPaginas) {
  $historicoCompletoPagina = $historicoCompletoPaginas;
}
$historicoCompletoOffset = ($historicoCompletoPagina - 1) * $historicoCompletoPorPagina;
$historicoCompletoTabelaPaginada = array_slice($historicoCompletoTabela, $historicoCompletoOffset, $historicoCompletoPorPagina);
$historicoCompletoQuery = $_GET;
unset($historicoCompletoQuery['historico_ajax'], $historicoCompletoQuery['historico_tipo']);

$whereTurnosListaParts = ["c.loja_id = ?"];
$paramsTurnosLista = [$lojaId];
if ($operadorFiltroId) {
  $whereTurnosListaParts[] = "c.operador_id = ?";
  $paramsTurnosLista[] = $operadorFiltroId;
}
if (!$caixaSelecionado) {
  $whereTurnosListaParts[] = "DATE(c.aberto_em) BETWEEN ? AND ?";
  $paramsTurnosLista[] = $inicio;
  $paramsTurnosLista[] = $fim;
}
$whereTurnosLista = $whereTurnosListaParts ? ('WHERE ' . implode(' AND ', $whereTurnosListaParts)) : '';
$stmt = $conn->prepare("
  SELECT c.id, c.status, c.aberto_em, c.fechado_em, a.nome AS operador
  FROM caixa_turnos c
  LEFT JOIN admins a ON a.id = c.operador_id
  $whereTurnosLista
  ORDER BY c.id DESC
  LIMIT 30
");
$stmt->execute($paramsTurnosLista);
$turnos = $stmt->fetchAll(PDO::FETCH_ASSOC);
$caixaFechadoView = $statusCaixa !== 'aberto';

$comparativo = null;
if ($comparar) {
  $whereComp = '';
  $paramsComp = [];
  $labelComp = '';
  if ($caixaSelecionado) {
    $stmt = $conn->prepare("
      SELECT id
      FROM caixa_turnos
      WHERE operador_id = ? AND id < ? AND loja_id = ?
      ORDER BY id DESC
      LIMIT 1
    ");
    $stmt->execute([$operadorFiltroId ?: $caixaSelecionado['operador_id'], $caixaSelecionado['id'], $lojaId]);
    $turnoAnterior = (int) $stmt->fetchColumn();
    if ($turnoAnterior > 0) {
      $whereComp = "WHERE p.status = 'finalizado' AND COALESCE(p.forma_pagamento, '') <> 'fiado' AND p.caixa_id = ? AND p.loja_id = ?";
      $paramsComp = [$turnoAnterior, $lojaId];
      $labelComp = 'Turno anterior #' . $turnoAnterior;
    }
  } else {
    $inicioComp = date('Y-m-d', strtotime($inicio . ' -1 day'));
    $fimComp = date('Y-m-d', strtotime($fim . ' -1 day'));
    $diffDias = (strtotime($fim) - strtotime($inicio)) / 86400;
    if ($diffDias >= 1) {
      $inicioComp = date('Y-m-d', strtotime($inicio . ' -' . ($diffDias + 1) . ' days'));
      $fimComp = date('Y-m-d', strtotime($fim . ' -' . ($diffDias + 1) . ' days'));
    }
    $whereCompParts = ["p.status = 'finalizado'", "COALESCE(p.forma_pagamento, '') <> 'fiado'", "p.loja_id = ?", "DATE($dataExpr) BETWEEN ? AND ?"];
    $paramsComp = [$lojaId, $inicioComp, $fimComp];
    if ($operadorFiltroId) {
      $whereCompParts[] = "p.operador_id = ?";
      $paramsComp[] = $operadorFiltroId;
    }
    $whereComp = 'WHERE ' . implode(' AND ', $whereCompParts);
    $labelComp = $inicioComp . ' a ' . $fimComp;
  }

  if ($whereComp) {
    $resumoComp = buscarResumo($conn, $pedidoJoinCompetencia, $whereComp, $paramsComp);
    $comparativo = [
      'label' => $labelComp,
      'pedidos' => (int) ($resumoComp['total_pedidos'] ?? 0),
      'total' => (float) ($resumoComp['total_vendas'] ?? 0)
    ];
  }
}

function formatMoney($valor) {
  return 'R$ ' . number_format((float) $valor, 2, ',', '.');
}

if (isset($_GET['historico_ajax']) && $_GET['historico_ajax'] === '1') {
  $historicoTipo = $_GET['historico_tipo'] ?? 'fechado';
  if ($historicoTipo === 'completo') {
    echo renderHistoricoFechadoTabela(
      $historicoCompletoTabelaPaginada,
      $historicoCompletoPagina,
      $historicoCompletoPaginas,
      $historicoCompletoOffset,
      $historicoCompletoPorPagina,
      $historicoCompletoTotal,
      $historicoCompletoQuery
    );
  } else {
    echo renderHistoricoFechadoTabela(
      $historicoFechadoTabelaPaginada,
      $historicoFechadoPagina,
      $historicoFechadoPaginas,
      $historicoFechadoOffset,
      $historicoFechadoPorPagina,
      $historicoFechadoTotal,
      $historicoFechadoQuery
    );
  }
  exit;
}

function renderHistoricoFechadoTabela(array $itens, int $paginaAtual, int $totalPaginas, int $offset, int $porPagina, int $totalItens, array $queryBase): string
{
  $primeiro = $totalItens > 0 ? ($offset + 1) : 0;
  $ultimo = $totalItens > 0 ? min($offset + $porPagina, $totalItens) : 0;
  $paginas = [];

  if ($totalPaginas <= 7) {
    for ($i = 1; $i <= $totalPaginas; $i++) {
      $paginas[] = $i;
    }
  } else {
    $paginas[] = 1;
    if ($paginaAtual > 3) {
      $paginas[] = '...';
    }
    for ($i = max(2, $paginaAtual - 1); $i <= min($totalPaginas - 1, $paginaAtual + 1); $i++) {
      $paginas[] = $i;
    }
    if ($paginaAtual < $totalPaginas - 2) {
      $paginas[] = '...';
    }
    $paginas[] = $totalPaginas;
    $paginas = array_values(array_unique($paginas, SORT_REGULAR));
  }

  ob_start();
  ?>
  <div class="table-responsive caixa-table">
    <table class="table align-middle mb-0">
      <thead>
        <tr>
          <th class="caixa-history-col-status">Status</th>
          <th>Aberto em</th>
          <th>Fechado em</th>
          <th>Aberto por</th>
        </tr>
      </thead>
      <tbody>
        <?php if (!$itens): ?>
          <tr>
            <td colspan="4" class="text-center text-muted py-4">Nenhum caixa fechado encontrado.</td>
          </tr>
        <?php endif; ?>
        <?php foreach ($itens as $item): ?>
          <tr>
            <?php $statusBadge = (($item['status'] ?? '') === 'aberto') ? 'aberto' : 'fechado'; ?>
            <td class="caixa-history-col-status"><button type="button" class="caixa-history-rowbtn" data-caixa-id="<?= (int) ($item['id'] ?? 0) ?>"><span class="badge-status <?= $statusBadge ?>"><?= $statusBadge === 'aberto' ? 'Aberto' : 'Fechado' ?></span></button></td>
            <td><button type="button" class="caixa-history-rowbtn" data-caixa-id="<?= (int) ($item['id'] ?? 0) ?>"><?= $item['aberto_em'] ? date('d/m/y', strtotime($item['aberto_em'])) . ' às ' . date('H:i', strtotime($item['aberto_em'])) : '-' ?></button></td>
            <td><button type="button" class="caixa-history-rowbtn" data-caixa-id="<?= (int) ($item['id'] ?? 0) ?>"><?= $item['fechado_em'] ? date('d/m/y', strtotime($item['fechado_em'])) . ' às ' . date('H:i', strtotime($item['fechado_em'])) : '-' ?></button></td>
            <td><button type="button" class="caixa-history-rowbtn" data-caixa-id="<?= (int) ($item['id'] ?? 0) ?>"><?= htmlspecialchars($item['operador'] ?? '-') ?></button></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php if ($totalItens > 0): ?>
    <div class="caixa-history-pagination">
      <div class="caixa-history-pagination-info">
        Mostrando <?= $primeiro ?>–<?= $ultimo ?> de <?= $totalItens ?> caixas
      </div>
      <?php if ($totalPaginas > 1): ?>
        <div class="caixa-history-pagination-nav">
          <?php
            $prevPage = max(1, $paginaAtual - 1);
            $nextPage = min($totalPaginas, $paginaAtual + 1);
            $queryBase['historico_ajax'] = 1;
            $queryBase['pagina_historico'] = $prevPage;
          ?>
          <a class="caixa-history-page" data-ajax="1" href="?<?= htmlspecialchars(http_build_query($queryBase)) ?>" aria-label="Anterior">
            <i class="bi bi-chevron-left"></i>
          </a>
          <?php foreach ($paginas as $pagina): ?>
            <?php if ($pagina === '...'): ?>
              <span class="caixa-history-page caixa-history-page-dots">…</span>
            <?php else: ?>
              <?php $queryBase['pagina_historico'] = $pagina; ?>
              <a class="caixa-history-page <?= $pagina === $paginaAtual ? 'active' : '' ?>" data-ajax="1" href="?<?= htmlspecialchars(http_build_query($queryBase)) ?>">
                <?= $pagina ?>
              </a>
            <?php endif; ?>
          <?php endforeach; ?>
          <?php $queryBase['pagina_historico'] = $nextPage; ?>
          <a class="caixa-history-page" data-ajax="1" href="?<?= htmlspecialchars(http_build_query($queryBase)) ?>" aria-label="Próximo">
            <i class="bi bi-chevron-right"></i>
          </a>
        </div>
      <?php endif; ?>
    </div>
  <?php endif; ?>
  <?php
  return (string) ob_get_clean();
}

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$caixaCssVer = filemtime(__DIR__ . '/assets/css/controle_caixa.css');
$caixaJsVer = filemtime(__DIR__ . '/assets/js/controle_caixa.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Controle de caixa</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

<link href="./assets/css/controle_caixa.css?v=<?= $caixaCssVer ?>" rel="stylesheet">
</head>

<body class="dash-diggy">
<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="caixa-page">
  <div class="caixa-header <?= $caixaFechadoView ? 'caixa-header--closed' : '' ?>">
    <div class="caixa-title-wrap">
      <button class="dash-menu-btn" onclick="toggleSidebar()" aria-label="Abrir menu">
        <i class="bi bi-list"></i>
      </button>
      <div>
        <h1 class="caixa-title">Controle de caixa</h1>
        <?php if (!$caixaFechadoView): ?>
          <div class="caixa-subtitle">Resumo do periodo: <?= htmlspecialchars($periodoLabel) ?></div>
        <?php endif; ?>
      </div>
    </div>
    <div class="d-flex gap-2 flex-wrap">
      <?php if ($caixaFechadoView): ?>
        <button type="button" class="btn-caixa <?= $caixaFechadoView ? 'btn-caixa--compact' : '' ?>" id="btnCaixa">
          Abrir caixa
        </button>
      <?php else: ?>
        <button type="button" class="btn-caixa-outline caixa-open-header-btn" id="btnEditarAbertura">
          Editar horário de abertura
        </button>
        <button type="button" class="btn-caixa caixa-open-header-btn" id="btnCaixa">
          Fechar caixa
        </button>
      <?php endif; ?>
    </div>
  </div>

  <?php if ($caixaFechadoView): ?>
    <div class="caixa-card caixa-history-only">
      <div class="caixa-history-shell">
        <div class="caixa-card-title"><i class="bi bi-clock-history"></i>Historico de caixa</div>
        <div id="caixaHistoricoFechadoWrap">
          <?= renderHistoricoFechadoTabela(
            $historicoFechadoTabelaPaginada,
            $historicoFechadoPagina,
            $historicoFechadoPaginas,
            $historicoFechadoOffset,
            $historicoFechadoPorPagina,
            $historicoFechadoTotal,
            $historicoFechadoQuery
          ) ?>
        </div>
      </div>
    </div>
  <?php else: ?>
  <div class="caixa-open-page">
    <div class="caixa-open-summary-wrap">
      <div class="caixa-card caixa-open-summary-card">
        <div class="caixa-open-summary-head">
          <div class="caixa-card-title caixa-open-summary-title"><i class="bi bi-bar-chart-line"></i>Resumo</div>
         
        </div>
        <div class="caixa-open-summary-date">
          <span>Data de abertura:</span>
          <strong><?= htmlspecialchars($aberturaFormatada) ?></strong>
        </div>

        <div class="caixa-open-section">
          <div class="caixa-open-section-title">Saldo inicial</div>
          <div class="caixa-open-line">
            <span>Dinheiro:</span>
            <strong class="caixa-open-value azul"><?= formatMoney($saldoInicial) ?></strong>
          </div>
        </div>

        <div class="caixa-open-section">
          <div class="caixa-open-section-title">Entradas</div>
          <?php foreach ($entradaResumoLinhas as $linha): ?>
            <div class="caixa-open-line">
              <span><?= htmlspecialchars($linha['label']) ?></span>
              <strong class="caixa-open-value verde"><?= formatMoney($linha['valor']) ?></strong>
            </div>
          <?php endforeach; ?>
        </div>

        <div class="caixa-open-summary-divider"></div>

        <div class="caixa-open-section">
          <div class="caixa-open-section-title">Saldo final</div>
          <div class="caixa-open-line">
            <span>dinheiro em caixa:</span>
            <strong class="caixa-open-value azul"><?= formatMoney($saldoEsperado) ?></strong>
          </div>
          <div class="caixa-open-line">
            <span>Total:</span>
            <strong class="caixa-open-value azul"><?= formatMoney($resumoSaldoTotal) ?></strong>
          </div>
        </div>
      </div>
    </div>

    <div class="caixa-card caixa-open-mov-card" id="caixaMovimentacoesCard">
      <div class="caixa-open-filter-pills">
        <button type="button" class="caixa-open-pill active" data-forma="todos">Todos</button>
        <button type="button" class="caixa-open-pill" data-forma="pix">Pix</button>
        <button type="button" class="caixa-open-pill" data-forma="dinheiro">Dinheiro</button>
        <button type="button" class="caixa-open-pill" data-forma="credito">Crédito</button>
        <button type="button" class="caixa-open-pill" data-forma="debito">Débito</button>
        <button type="button" class="caixa-open-pill" data-forma="voucher">Voucher</button>
        <button type="button" class="caixa-open-pill" data-forma="outro">Outros</button>
      </div>

      <div id="caixaMovFormWrap" class="caixa-open-move-forms d-none">
        <?php if (!$movimentosErro): ?>
          <div class="caixa-move-grid">
            <form class="caixa-move-box" id="formSuprimento">
              <div class="caixa-move-title">Suprimento</div>
              <div class="mb-2">
                <label class="form-label">Valor</label>
                <input type="number" step="0.01" class="form-control" name="valor" placeholder="0,00" <?= $caixaAtual ? '' : 'disabled' ?>>
              </div>
              <div class="mb-2">
                <label class="form-label">Observacoes</label>
                <input type="text" class="form-control" name="observacoes" placeholder="Opcional" maxlength="120" <?= $caixaAtual ? '' : 'disabled' ?>>
              </div>
              <button class="btn-caixa" type="submit" <?= $caixaAtual ? '' : 'disabled' ?>>Registrar suprimento</button>
            </form>

            <form class="caixa-move-box" id="formSangria">
              <div class="caixa-move-title">Sangria</div>
              <div class="mb-2">
                <label class="form-label">Valor</label>
                <input type="number" step="0.01" class="form-control" name="valor" placeholder="0,00" <?= $caixaAtual ? '' : 'disabled' ?>>
              </div>
              <div class="mb-2">
                <label class="form-label">Observacoes</label>
                <input type="text" class="form-control" name="observacoes" placeholder="Opcional" maxlength="120" <?= $caixaAtual ? '' : 'disabled' ?>>
              </div>
              <button class="btn-caixa-outline" type="submit" <?= $caixaAtual ? '' : 'disabled' ?>>Registrar sangria</button>
            </form>
          </div>
        <?php endif; ?>
      </div>

      <div class="caixa-open-stats-grid">
        <div class="caixa-open-stat-box">
          <div class="caixa-open-stat-label">Entrada</div>
          <div class="caixa-open-stat-value verde" id="caixaOpenEntradaStat"><i class="bi bi-arrow-up"></i><?= formatMoney($movimentosTabelaEntradaTotal) ?></div>
        </div>
        <div class="caixa-open-stat-box">
          <div class="caixa-open-stat-label">Saida</div>
          <div class="caixa-open-stat-value vermelho" id="caixaOpenSaidaStat"><i class="bi bi-arrow-down"></i><?= formatMoney(0) ?></div>
        </div>
        <div class="caixa-open-stat-box">
          <div class="caixa-open-stat-label">Saldo</div>
          <div class="caixa-open-stat-value azul" id="caixaOpenSaldoStat"><i class="bi bi-graph-up-arrow"></i><?= formatMoney($movimentosTabelaEntradaTotal) ?></div>
        </div>
        <div class="caixa-open-stat-box">
          <div class="caixa-open-stat-label">Total sem taxa de entrega</div>
          <div class="caixa-open-stat-value azul"><i class="bi bi-cash-stack"></i><?= formatMoney($totalVendas - $taxaEntrega) ?></div>
        </div>
      </div>

      <div class="table-responsive caixa-open-mov-table">
        <table class="table align-middle mb-0">
          <thead>
            <tr>
              <th>Pagamento</th>
              <th>Data</th>
              <th>Entrada ou saída</th>
              <th>Observação</th>
              <th>Valor</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody id="caixaOpenMovTableBody">
            <?php if ($movimentosTabelaErro): ?>
              <tr><td colspan="6" class="text-center text-muted py-5">Tabela de movimentações não encontrada.</td></tr>
            <?php elseif (!$movimentosTabela): ?>
              <tr id="caixaOpenMovEmpty"><td colspan="6" class="text-center text-muted py-5">Nenhuma entrada ou saída registrada</td></tr>
            <?php else: ?>
              <tr id="caixaOpenMovEmpty" class="d-none"><td colspan="6" class="text-center text-muted py-5">Nenhuma movimentação encontrada para este filtro</td></tr>
              <?php foreach ($movimentosTabela as $mov): ?>
                <?php
                  $isSaida = ($mov['direcao'] ?? 'entrada') === 'saida';
                  $formaMov = normalizarFormaCaixa((string) ($mov['forma'] ?? 'outro'));
                ?>
                <tr data-forma="<?= htmlspecialchars($formaMov) ?>" data-direcao="<?= $isSaida ? 'saida' : 'entrada' ?>" data-valor="<?= (float) ($mov['valor'] ?? 0) ?>">
                  <td><?= labelFormaCaixa($formaMov) ?></td>
                  <td><?= $mov['criado_em'] ? date('d/m/y', strtotime($mov['criado_em'])) . ' às ' . date('H:i', strtotime($mov['criado_em'])) : '-' ?></td>
                  <td><span class="caixa-move-badge <?= $isSaida ? 'sangria' : 'suprimento' ?>"><?= $isSaida ? 'Saída' : 'Entrada' ?></span></td>
                  <td><?= htmlspecialchars($mov['observacoes'] ?: '-') ?></td>
                  <td class="<?= $isSaida ? 'text-danger' : 'text-success' ?>"><?= formatMoney($mov['valor']) ?></td>
                  <td><span class="caixa-origin-badge <?= strtoupper((string) ($mov['origem'] ?? '')) === 'LILLY' ? 'lilly' : 'manual' ?>"><?= htmlspecialchars($mov['origem'] ?: 'MANUAL') ?></span></td>
                </tr>
              <?php endforeach; ?>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>

    <div class="caixa-card caixa-history-only caixa-history-open">
      <div class="caixa-history-shell">
        <div class="caixa-card-title"><i class="bi bi-clock-history"></i>Historico de caixa</div>
        <div id="caixaHistoricoFechadoWrap">
          <?= renderHistoricoFechadoTabela(
            $historicoCompletoTabelaPaginada,
            $historicoCompletoPagina,
            $historicoCompletoPaginas,
            $historicoCompletoOffset,
            $historicoCompletoPorPagina,
            $historicoCompletoTotal,
            array_merge($historicoCompletoQuery, ['historico_tipo' => 'completo'])
          ) ?>
        </div>
      </div>
    </div>
  </div>
  <?php endif; ?>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>

</main>
</div>

<div class="modal fade" id="modalCaixaDetalhe" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable caixa-detail-dialog">
    <div class="modal-content caixa-detail-content">
      <div class="modal-header">
        <div>
          <h5 class="modal-title caixa-detail-title">Movimentação do caixa</h5>
          <div class="caixa-detail-sub" id="caixaDetalheSub">Visualize as vendas e ajustes do turno selecionado.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="caixa-detail-top" id="caixaDetalheTop">
          <div class="caixa-detail-chip"><div class="caixa-detail-chip-label">Caixa</div><div class="caixa-detail-chip-value">-</div></div>
        </div>
        <div class="caixa-detail-stats">
          <div class="caixa-detail-stat">
            <div class="caixa-detail-stat-label">Entrada</div>
            <div class="caixa-detail-stat-value verde" id="caixaDetalheEntrada">R$ 0,00</div>
          </div>
          <div class="caixa-detail-stat">
            <div class="caixa-detail-stat-label">Saída</div>
            <div class="caixa-detail-stat-value vermelho" id="caixaDetalheSaida">R$ 0,00</div>
          </div>
          <div class="caixa-detail-stat">
            <div class="caixa-detail-stat-label">Saldo</div>
            <div class="caixa-detail-stat-value azul" id="caixaDetalheSaldo">R$ 0,00</div>
          </div>
        </div>
        <div class="caixa-detail-grid">
          <div class="caixa-detail-card">
            <div class="caixa-detail-card-head">Formas de pagamento</div>
            <div class="caixa-detail-list" id="caixaDetalheFormas">
              <div class="caixa-detail-line"><span>Carregando</span><strong>...</strong></div>
            </div>
          </div>
          <div class="caixa-detail-card">
            <div class="caixa-detail-card-head">Movimentações do caixa</div>
            <div class="caixa-detail-table-wrap">
              <table class="caixa-detail-table">
                <thead>
                  <tr>
                    <th>Pagamento</th>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Observação</th>
                    <th>Valor</th>
                    <th>Origem</th>
                  </tr>
                </thead>
                <tbody id="caixaDetalheTableBody">
                  <tr><td colspan="6" class="caixa-detail-empty">Carregando movimentações...</td></tr>
                </tbody>
              </table>
            </div>
            <div class="caixa-detail-pagination">
              <div class="caixa-detail-pagination-info" id="caixaDetalhePaginationInfo">Mostrando 0–0 de 0 movimentações</div>
              <div class="caixa-detail-pagination-nav" id="caixaDetalhePaginationNav"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="modalCaixa" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered caixa-modal-dialog">
    <div class="modal-content border-0 caixa-modal-content">
      <div class="modal-header">
        <h5 class="modal-title caixa-modal-title" id="tituloCaixa">Abrir caixa</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div id="caixaFormAbrir" class="caixa-open-shell">
          <div class="d-none">
            <select class="form-select js-custom-select" data-icon="bi-person-badge" id="caixaOperador">
              <?php foreach ($operadores as $op): ?>
                <option value="<?= (int) $op['id'] ?>" <?= ((string) $op['id'] === (string) $operadorId) ? 'selected' : '' ?>>
                  <?= htmlspecialchars($op['nome']) ?>
                </option>
              <?php endforeach; ?>
            </select>
          </div>
          <div>
            <label class="caixa-modal-label">Valor inicial do caixa</label>
            <input type="text" inputmode="decimal" class="form-control caixa-modal-input js-caixa-money" id="caixaSaldoInicial" placeholder="0,00">
          </div>
          <textarea class="d-none" id="caixaObsAbrir"></textarea>
        </div>

    <div id="caixaFormFechar" class="d-none">
      <div class="mb-2 text-muted small">
        Caixa aberto em <span id="caixaAbertoEm">-</span>
      </div>
      <div class="mb-3">
        <label class="caixa-modal-label">Saldo inicial</label>
        <input type="text" class="form-control caixa-modal-input" id="caixaSaldoInicialInfo" disabled>
      </div>
      <div class="mb-3">
        <label class="caixa-modal-label">Saldo final</label>
        <input type="number" step="0.01" class="form-control caixa-modal-input" id="caixaSaldoFinal" placeholder="0,00">
      </div>
      <div class="caixa-modal-toggle-row">
        <label class="caixa-modal-label mb-0" for="caixaObsToggle">Observação</label>
        <div class="form-check form-switch caixa-modal-switch">
          <input class="form-check-input" type="checkbox" role="switch" id="caixaObsToggle">
        </div>
      </div>
      <div class="mb-0 d-none caixa-modal-obs-wrap" id="caixaObsFecharWrap">
        <textarea class="form-control caixa-modal-input" id="caixaObsFechar" rows="2" placeholder="Opcional"></textarea>
      </div>
    </div>
      </div>
      <div class="modal-footer border-0 caixa-modal-footer">
        <button class="btn-caixa-outline d-none" data-bs-dismiss="modal" id="btnCaixaCancelar">Cancelar</button>
        
        <button class="btn-caixa caixa-modal-confirm" id="btnCaixaSalvar">Confirmar</button>
      </div>
    </div>
  </div>
</div>

<div id="caixaToast" class="caixa-toast" aria-live="polite"></div>

<div class="modal fade" id="modalEditarAbertura" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered caixa-edit-dialog">
    <div class="modal-content caixa-edit-content">
      <div class="modal-header">
        <div>
          <h5 class="modal-title caixa-edit-title">Editar horário de abertura</h5>
          <div class="caixa-edit-sub">Ajuste a data e hora do caixa aberto com segurança.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="caixa-edit-shell">
          <div class="caixa-edit-meta">
            <div class="caixa-edit-chip">
              <span class="caixa-edit-chip-label">Operador</span>
              <span class="caixa-edit-chip-value" id="caixaEditarOperadorInfo">-</span>
            </div>
            <div class="caixa-edit-chip">
              <span class="caixa-edit-chip-label">Saldo inicial</span>
              <span class="caixa-edit-chip-value" id="caixaEditarSaldoInfo">R$ 0,00</span>
            </div>
          </div>
          <div class="caixa-edit-grid">
            <div>
              <label class="caixa-modal-label">Data de abertura</label>
              <input type="text" class="form-control caixa-edit-input" id="caixaEditarDataInput" disabled>
            </div>
            <div>
              <label class="caixa-modal-label">Horário de abertura</label>
              <input type="time" class="form-control caixa-edit-input" id="caixaEditarHoraInput">
            </div>
          </div>
        </div>
      </div>
      <div class="caixa-edit-footer">
        <button type="button" class="btn-caixa-outline" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="btn-caixa caixa-modal-confirm" id="btnSalvarEditarAbertura">Salvar</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/pt.js"></script>
<script>
const CAIXA_DATA = <?= json_encode(['caixaAtual' => $caixaAtual, 'totalVendasAtual' => (float) $totalVendas, 'operadorId' => $operadorId ? (int) $operadorId : '']) ?>;
</script>
<script src="./assets/js/controle_caixa.js?v=<?= $caixaJsVer ?>"></script>
</body>
</html>
