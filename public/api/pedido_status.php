<?php
session_start();
date_default_timezone_set('America/Fortaleza');
header('Content-Type: application/json');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';

$pedidoId  = (int)($_GET['id']          ?? 0);
$clienteId = (int)($_GET['cliente_id'] ?? 0); /* validação de propriedade */

if (!$pedidoId) {
  echo json_encode(['ok'=>false,'msg'=>'ID inválido']); exit;
}

try {
  /* busca loja_id e cliente_id do pedido */
  $stmtLoja = $conn->prepare("SELECT loja_id, cliente_id FROM pedidos WHERE id=? LIMIT 1");
  $stmtLoja->execute([$pedidoId]);
  $pedidoMeta = $stmtLoja->fetch(PDO::FETCH_ASSOC);
  if (!$pedidoMeta) {
    echo json_encode(['ok'=>false,'msg'=>'Pedido não encontrado']); exit;
  }
  $lojaId = (int)($pedidoMeta['loja_id'] ?: 1);
  $_SESSION['loja_id'] = $lojaId;
  /* validar propriedade: se cliente_id for informado, o pedido deve pertencer a ele */
  if ($clienteId > 0 && (int)$pedidoMeta['cliente_id'] !== $clienteId) {
    echo json_encode(['ok'=>false,'msg'=>'Acesso negado']); exit;
  }

  $cols = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temSub     = in_array('subtotal', $cols);
  $temDesc    = in_array('desconto', $cols);
  $temTipo    = in_array('tipo', $cols);
  $temObs     = in_array('observacoes_cliente', $cols);
  $temTroco   = in_array('troco', $cols);
  $temEnd     = in_array('endereco_entrega', $cols);
  $temCbUsado      = in_array('cashback_usado', $cols);
  $temAgendamento  = in_array('agendamento', $cols);
  $temAgendamentoEm= in_array('agendamento_em', $cols);
  $temAgendData    = in_array('agendamento_data', $cols);
  $temAgendHora    = in_array('agendamento_hora', $cols);
  $temTipoAgend    = in_array('tipo_agendamento', $cols);
  $selSub      = $temSub      ? ', p.subtotal'              : ', NULL AS subtotal';
  $selDesc     = $temDesc     ? ', p.desconto'              : ', 0 AS desconto';
  $selTipo     = $temTipo     ? ', p.tipo'                  : ", 'retirada' AS tipo";
  $selObs      = $temObs      ? ', p.observacoes_cliente'   : ", '' AS observacoes_cliente";
  $selTroco    = $temTroco    ? ', p.troco'                 : ", NULL AS troco";
  $selEnd      = $temEnd      ? ', p.endereco_entrega'      : ", '' AS endereco_entrega";
  $selCbUsado  = $temCbUsado  ? ', p.cashback_usado'        : ", NULL AS cashback_usado";
  /* agendamento: tenta vários campos usados pelo loja.php e pelo PDV */
  if ($temAgendamento)       $selAgend = ', p.agendamento';
  elseif ($temAgendamentoEm) $selAgend = ', p.agendamento_em AS agendamento';
  elseif ($temAgendData)     $selAgend = ', CONCAT(COALESCE(p.agendamento_data,\'\'),\' \',COALESCE(p.agendamento_hora,\'\')) AS agendamento';
  else                       $selAgend = ', NULL AS agendamento';
  $selAgendEm  = $temAgendamentoEm ? ', p.agendamento_em'  : ', NULL AS agendamento_em';
  $selTipoAg   = $temTipoAgend     ? ', p.tipo_agendamento': ', NULL AS tipo_agendamento';

  $stmt = $conn->prepare("
    SELECT p.id, p.status, p.total, p.forma_pagamento,
           p.taxa_entrega, p.criado_em{$selSub}{$selDesc}{$selTipo}{$selObs}{$selTroco}{$selEnd}{$selCbUsado}{$selAgend}{$selAgendEm}{$selTipoAg},
           c.nome, c.telefone
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
    WHERE p.id = ? AND p.loja_id = ?
    LIMIT 1
  ");
  $stmt->execute([$pedidoId, $lojaId]);
  $pedido = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$pedido) {
    echo json_encode(['ok'=>false,'msg'=>'Pedido não encontrado']); exit;
  }

  /* itens */
  $si = $conn->prepare("
    SELECT produto_nome, quantidade, preco, IFNULL(observacoes,'') AS observacoes
    FROM pedido_itens
    WHERE pedido_id = ? AND loja_id = ?
    ORDER BY id
  ");
  $si->execute([$pedidoId, $lojaId]);
  $itens = $si->fetchAll(PDO::FETCH_ASSOC) ?: [];

  /* Aplica numeração sequencial zerada */
  require_once '../../helpers/pedido_codigo.php';
  $codigoBase = getPedidoCodigoBase($conn, $lojaId);
  $codigoDisplay = calcCodigoDisplay((int)$pedido['id'], $codigoBase);

  echo json_encode([
    'ok'     => true,
    'pedido' => [
      'id'                  => (int)$pedido['id'],
      'codigo'              => $codigoDisplay,
      'status'              => $pedido['status'] ?? 'pendente',
      'tipo'                => $pedido['tipo'] ?? 'retirada',
      'total'               => (float)$pedido['total'],
      'taxa_entrega'        => (float)($pedido['taxa_entrega'] ?? 0),
      'forma_pagamento'     => $pedido['forma_pagamento'] ?? '',
      'troco'               => $pedido['troco'] ? (float)$pedido['troco'] : null,
      'subtotal'            => $pedido['subtotal'] !== null ? (float)$pedido['subtotal'] : null,
      'desconto'            => (float)($pedido['desconto'] ?? 0),
      'cashback_usado'      => isset($pedido['cashback_usado']) && $pedido['cashback_usado'] !== null ? (float)$pedido['cashback_usado'] : null,
      'endereco_entrega'    => $pedido['endereco_entrega'] ?? '',
      'criado_em'           => $pedido['criado_em'] ?? '',
      'nome'                => $pedido['nome'] ?? '',
      'telefone'            => $pedido['telefone'] ?? '',
      'agendamento'         => $pedido['agendamento'] ?? null,
      'agendamento_em'      => $pedido['agendamento_em'] ?? null,
      'tipo_agendamento'    => $pedido['tipo_agendamento'] ?? null,
    ],
    'itens' => $itens,
  ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  echo json_encode(['ok'=>false,'msg'=>'Erro interno']);
}
