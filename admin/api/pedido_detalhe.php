<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/config.php';
require_once __DIR__ . '/../../helpers/pedido_codigo.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = $_GET['pedido_id'] ?? null;
if (!$id) {
  echo json_encode(['ok'=>false]);
  exit;
}

function tabelaExiste(PDO $conn, string $tabela): bool {
  $stmt = $conn->prepare("SHOW TABLES LIKE ?");
  $stmt->execute([$tabela]);
  return (bool) $stmt->fetchColumn();
}

$pedidoColunas = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
$clientesColunas = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$temTabelaMov = tabelaExiste($conn, 'cashback_movimentacoes');
$temCashbackSaldoCliente = in_array('cashback_saldo', $clientesColunas, true);
$temPontosCliente = in_array('pontos', $clientesColunas, true);
$temPontosSaldoCliente = in_array('pontos_saldo', $clientesColunas, true);
$cashbackExpiraDias = (int) config($conn, 'cashback_expira_dias', 20);
$temObsCliente = in_array('observacoes_cliente', $pedidoColunas, true);
$temMotoboyTabela = tabelaExiste($conn, 'motoboys');
$temMotoboyPedido = in_array('motoboy_id', $pedidoColunas, true);
$selectObs = $temObsCliente ? "p.observacoes_cliente" : "NULL AS observacoes_cliente";
$selectMotoboy = ($temMotoboyTabela && $temMotoboyPedido)
  ? ", m.id AS motoboy_id, m.nome AS motoboy_nome, m.whatsapp AS motoboy_whatsapp"
  : ", NULL AS motoboy_id, NULL AS motoboy_nome, NULL AS motoboy_whatsapp";
$joinMotoboy = ($temMotoboyTabela && $temMotoboyPedido)
  ? "LEFT JOIN motoboys m ON m.id = p.motoboy_id AND m.loja_id = p.loja_id"
  : "";
$pedido = $conn->prepare("
  SELECT p.*, c.nome, c.telefone, {$selectObs}{$selectMotoboy}
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  {$joinMotoboy}
  WHERE p.id = ? AND p.loja_id = ?
");
$pedido->execute([$id, $lojaId]);
$p = $pedido->fetch(PDO::FETCH_ASSOC);

$stats = [
  'pedidos_feitos' => 0,
  'ticket_medio' => 0,
  'cashback_total' => 0,
  'cashback_saldo' => 0,
  'cashback_expira_em' => null,
  'cashback_expirado' => false
];
if ($p && !empty($p['cliente_id'])) {
  $temCashbackValor = in_array('cashback_valor', $pedidoColunas, true);
  $temStatus = in_array('status', $pedidoColunas, true);
  $selectCashback = $temCashbackValor ? "SUM(cashback_valor)" : "0";
  $condStatus = $temStatus ? "AND (status IS NULL OR status <> 'cancelado')" : "";
  $stmtStats = $conn->prepare("
    SELECT
      COUNT(*) AS pedidos_feitos,
      AVG(total) AS ticket_medio,
      {$selectCashback} AS cashback_total
    FROM pedidos
    WHERE cliente_id = ? AND loja_id = ? {$condStatus}
  ");
  $stmtStats->execute([$p['cliente_id'], $lojaId]);
  $statsRow = $stmtStats->fetch(PDO::FETCH_ASSOC);
  if ($statsRow) {
    $stats = $statsRow;
  }
  if ($temCashbackSaldoCliente) {
    $stmtSaldo = $conn->prepare("SELECT cashback_saldo FROM clientes WHERE id = ? AND loja_id = ?");
    $stmtSaldo->execute([$p['cliente_id'], $lojaId]);
    $stats['cashback_saldo'] = (float) $stmtSaldo->fetchColumn();
  }
  if ($temPontosCliente || $temPontosSaldoCliente) {
    $campoPontos = $temPontosCliente ? 'pontos' : 'pontos_saldo';
    $stmtPontos = $conn->prepare("SELECT {$campoPontos} FROM clientes WHERE id = ? AND loja_id = ?");
    $stmtPontos->execute([$p['cliente_id'], $lojaId]);
    $stats['pontos'] = (int) $stmtPontos->fetchColumn();
  } else {
    $stats['pontos'] = 0;
  }
  if ($temTabelaMov) {
    if (!empty($stats['cashback_saldo']) && $stats['cashback_saldo'] > 0) {
      $stmtExpira = $conn->prepare("
        SELECT expira_em FROM (
          SELECT m.expira_em,
                 (m.valor - COALESCE(SUM(u.valor),0)) AS restante
          FROM cashback_movimentacoes m
          LEFT JOIN cashback_movimentacoes u
            ON u.referencia_id = m.id
           AND u.tipo IN ('uso','expirado')
           AND u.loja_id = m.loja_id
          WHERE m.cliente_id = ?
            AND m.loja_id = ?
            AND m.tipo = 'entrada'
            AND (m.expira_em IS NULL OR m.expira_em >= CURDATE())
          GROUP BY m.id
          HAVING restante > 0 AND m.expira_em IS NOT NULL
        ) t
        ORDER BY expira_em ASC
        LIMIT 1
      ");
      $stmtExpira->execute([$p['cliente_id'], $lojaId]);
      $stats['cashback_expira_em'] = $stmtExpira->fetchColumn() ?: null;
    } else {
      $stmtUltimo = $conn->prepare("
        SELECT tipo
        FROM cashback_movimentacoes
        WHERE cliente_id = ? AND loja_id = ?
        ORDER BY criado_em DESC, id DESC
        LIMIT 1
      ");
      $stmtUltimo->execute([$p['cliente_id'], $lojaId]);
      $ultimoTipo = $stmtUltimo->fetchColumn();
      $stats['cashback_expirado'] = ($ultimoTipo === 'expirado');
    }
  }
}

$itensColunas = $conn->query("SHOW COLUMNS FROM pedido_itens")->fetchAll(PDO::FETCH_COLUMN, 0);
$temProdutoId = in_array('produto_id', $itensColunas, true);
$sqlItens = $temProdutoId
  ? "SELECT produto_id, produto_nome, quantidade, preco, observacoes FROM pedido_itens WHERE pedido_id = ? AND loja_id = ?"
  : "SELECT produto_nome, quantidade, preco, observacoes FROM pedido_itens WHERE pedido_id = ? AND loja_id = ?";
$itens = $conn->prepare($sqlItens);
$itens->execute([$id, $lojaId]);

$pagamentos = $conn->prepare("
  SELECT forma, valor, taxa_maquininha
  FROM pedido_pagamentos
  WHERE pedido_id = ? AND loja_id = ?
");
$pagamentos->execute([$id, $lojaId]);

/* Adiciona codigo sequencial ao pedido */
if ($p && isset($p['id'])) {
  $codigoBase = getPedidoCodigoBase($conn, $lojaId);
  $p['codigo'] = calcCodigoDisplay((int)$p['id'], $codigoBase);
}

echo json_encode([
  'ok'=>true,
  'pedido'=>$p,
  'cliente_stats'=>$stats,
  'itens'=>$itens->fetchAll(PDO::FETCH_ASSOC),
  'pagamentos'=>$pagamentos->fetchAll(PDO::FETCH_ASSOC)
]);
