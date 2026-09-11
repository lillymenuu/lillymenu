<?php
/*
 * Versao JSON de admin/pedidos.php (tabela "Lista de Pedidos") para o novo
 * frontend Next.js (/order-list). Mesma logica de filtro/paginacao do
 * legado, trocando sessao por token Bearer, e reaproveitando o mesmo
 * conjunto rico de campos + juncao de pedido_pagamentos usado por
 * pedidos_kanban.php (para refletir pedidos com mais de uma forma de
 * pagamento, o que a tabela antiga nao fazia).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../../helpers/pedido_codigo.php';

date_default_timezone_set('America/Fortaleza');

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

function pedidosListarNormalizarDataSQL(string $d): string {
  $d = trim($d);
  if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $d, $m)) return "{$m[3]}-{$m[2]}-{$m[1]}";
  if (preg_match('/^(\d{2})-(\d{2})-(\d{4})$/', $d, $m)) return "{$m[3]}-{$m[2]}-{$m[1]}";
  return $d;
}

$status = trim($_GET['status'] ?? '');

$dataIni = pedidosListarNormalizarDataSQL(isset($_GET['data_ini']) ? trim($_GET['data_ini']) : date('Y-m-d'));
$dataFim = pedidosListarNormalizarDataSQL(isset($_GET['data_fim']) ? trim($_GET['data_fim']) : date('Y-m-d'));

$pagina = max(1, (int) ($_GET['pagina'] ?? 1));
$limite = (int) ($_GET['limite'] ?? 10);
$limite = in_array($limite, [10, 20, 50], true) ? $limite : 10;
$offset = ($pagina - 1) * $limite;

$where = ['p.loja_id = ?'];
$params = [$lojaId];

if ($status !== '') {
  $where[] = 'p.status = ?';
  $params[] = $status;
}
if ($dataIni !== '') {
  $where[] = 'DATE(p.criado_em) BETWEEN ? AND ?';
  $params[] = $dataIni;
  $params[] = $dataFim !== '' ? $dataFim : $dataIni;
}
$sqlWhere = 'WHERE ' . implode(' AND ', $where);

$stmtTotal = $conn->prepare("
  SELECT COUNT(*)
  FROM pedidos p
  LEFT JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  $sqlWhere
");
$stmtTotal->execute($params);
$total = (int) $stmtTotal->fetchColumn();
$paginas = max(1, (int) ceil($total / $limite));

$pedidoColunas = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temAgendamento = in_array('agendamento', $pedidoColunas, true);
$temAgendamentoEm = in_array('agendamento_em', $pedidoColunas, true);
$temAgendamentoData = in_array('agendamento_data', $pedidoColunas, true);
$temAgendamentoHora = in_array('agendamento_hora', $pedidoColunas, true);
$temOrigem = in_array('origem', $pedidoColunas, true);
$temObsCliente = in_array('observacoes_cliente', $pedidoColunas, true);
$temMotoboy = in_array('motoboy_id', $pedidoColunas, true);
$stmtTabelaMotoboy = $conn->prepare("SHOW TABLES LIKE ?");
$stmtTabelaMotoboy->execute(['motoboys']);
$temTabelaMotoboy = (bool) $stmtTabelaMotoboy->fetchColumn();

$selectAgendamento = '';
if ($temAgendamento) {
  $selectAgendamento = ", p.agendamento AS agendamento";
} elseif ($temAgendamentoEm) {
  $selectAgendamento = ", p.agendamento_em AS agendamento";
} elseif ($temAgendamentoData && $temAgendamentoHora) {
  $selectAgendamento = ", CONCAT(p.agendamento_data, ' ', p.agendamento_hora) AS agendamento";
}
$selectOrigem = $temOrigem ? ", p.origem" : "";
$selectObs = $temObsCliente ? ", p.observacoes_cliente" : "";
$selectMotoboy = ($temMotoboy && $temTabelaMotoboy)
  ? ", m.nome AS motoboy_nome, m.whatsapp AS motoboy_whatsapp, p.motoboy_id"
  : ", NULL AS motoboy_nome, NULL AS motoboy_whatsapp, NULL AS motoboy_id";
$joinMotoboy = ($temMotoboy && $temTabelaMotoboy)
  ? "LEFT JOIN motoboys m ON m.id = p.motoboy_id AND m.loja_id = p.loja_id"
  : "";

$stmt = $conn->prepare("
  SELECT
    p.id,
    p.status,
    p.tipo,
    p.total,
    p.criado_em,
    p.forma_pagamento,
    p.endereco_entrega,
    COALESCE(c.nome, '(cliente nao encontrado)') AS nome,
    c.telefone{$selectAgendamento}{$selectOrigem}{$selectObs}{$selectMotoboy},

    (
      SELECT l.criado_em
      FROM pedido_status_log l
      WHERE l.pedido_id = p.id AND l.loja_id = p.loja_id
      ORDER BY l.criado_em DESC
      LIMIT 1
    ) AS status_em

  FROM pedidos p
  LEFT JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  {$joinMotoboy}
  $sqlWhere
  ORDER BY p.criado_em DESC
  LIMIT $limite OFFSET $offset
");
$stmt->execute($params);
$pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

if ($pedidos) {
  $pedidoIds = array_values(array_filter(array_map(static fn($p) => (int) ($p['id'] ?? 0), $pedidos)));

  if ($pedidoIds) {
    $placeholders = implode(',', array_fill(0, count($pedidoIds), '?'));
    $paramsPagamentos = array_merge($pedidoIds, [$lojaId]);

    $stmtPagamentos = $conn->prepare("
      SELECT pedido_id, forma, valor
      FROM pedido_pagamentos
      WHERE pedido_id IN ($placeholders) AND loja_id = ?
      ORDER BY id ASC
    ");
    $stmtPagamentos->execute($paramsPagamentos);

    $pagamentosPorPedido = [];
    foreach ($stmtPagamentos->fetchAll(PDO::FETCH_ASSOC) as $pagamento) {
      $pedidoId = (int) ($pagamento['pedido_id'] ?? 0);
      if (!$pedidoId) {
        continue;
      }
      if (!isset($pagamentosPorPedido[$pedidoId])) {
        $pagamentosPorPedido[$pedidoId] = [];
      }
      $pagamentosPorPedido[$pedidoId][] = [
        'forma' => $pagamento['forma'] ?? '',
        'valor' => isset($pagamento['valor']) ? (float) $pagamento['valor'] : 0.0,
      ];
    }

    foreach ($pedidos as &$pedido) {
      $pedidoId = (int) ($pedido['id'] ?? 0);
      $pedido['pagamentos'] = $pagamentosPorPedido[$pedidoId] ?? [];
    }
    unset($pedido);
  }
}

$codigoBase = getPedidoCodigoBase($conn, $lojaId);
foreach ($pedidos as &$pedido) {
  $pedido['codigo'] = calcCodigoDisplay((int) ($pedido['id'] ?? 0), $codigoBase);
}
unset($pedido);

echo json_encode([
  'ok' => true,
  'pedidos' => $pedidos,
  'total' => $total,
  'paginas' => $paginas,
  'pagina' => $pagina,
  'limite' => $limite,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
