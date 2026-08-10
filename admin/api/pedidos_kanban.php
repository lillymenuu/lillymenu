<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
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
$selectMotoboy = ($temMotoboy && $temTabelaMotoboy) ? ", m.nome AS motoboy_nome, m.whatsapp AS motoboy_whatsapp, p.motoboy_id" : ", NULL AS motoboy_nome, NULL AS motoboy_whatsapp, NULL AS motoboy_id";
$joinMotoboy = ($temMotoboy && $temTabelaMotoboy) ? "LEFT JOIN motoboys m ON m.id = p.motoboy_id AND m.loja_id = p.loja_id" : "";

$stmt = $conn->prepare("
  SELECT 
    p.id,
    p.status,
    p.tipo,
    p.total,
    p.criado_em,
    p.forma_pagamento,
    p.endereco_entrega,
    c.nome,
    c.telefone{$selectAgendamento}{$selectOrigem}{$selectObs}{$selectMotoboy},

    (
      SELECT l.criado_em
      FROM pedido_status_log l
      WHERE l.pedido_id = p.id AND l.loja_id = p.loja_id
      ORDER BY l.criado_em DESC
      LIMIT 1
    ) AS status_em

  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  {$joinMotoboy}
  WHERE p.loja_id = ?
  ORDER BY p.id DESC
");
$stmt->execute([$lojaId]);

$pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

if ($pedidos) {
  $pedidoIds = array_map(static fn($p) => (int) ($p['id'] ?? 0), $pedidos);
  $pedidoIds = array_values(array_filter($pedidoIds));

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

/* Aplica numeração sequencial zerada */
require_once __DIR__ . '/../../helpers/pedido_codigo.php';
$codigoBase = getPedidoCodigoBase($conn, $lojaId);
foreach ($pedidos as &$pedido) {
  $pedido['codigo'] = calcCodigoDisplay((int)($pedido['id'] ?? 0), $codigoBase);
}
unset($pedido);

echo json_encode($pedidos);
