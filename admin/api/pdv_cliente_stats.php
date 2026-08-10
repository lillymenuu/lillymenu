<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/config.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$clienteId = $_GET['cliente_id'] ?? null;
if (!$clienteId) {
  echo json_encode(['ok'=>false]);
  exit;
}

function tabelaExiste(PDO $conn, string $tabela): bool {
  $stmt = $conn->prepare("SHOW TABLES LIKE ?");
  $stmt->execute([$tabela]);
  return (bool) $stmt->fetchColumn();
}

$stmt = $conn->prepare("
  SELECT COUNT(*) AS total_pedidos, AVG(total) AS ticket_medio
  FROM pedidos
  WHERE cliente_id = ?
    AND loja_id = ?
    AND status = 'finalizado'
");
$stmt->execute([$clienteId, $lojaId]);
$statsBase = $stmt->fetch(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("
  SELECT id, total, tipo, criado_em, endereco_entrega
  FROM pedidos
  WHERE cliente_id = ?
    AND loja_id = ?
  ORDER BY id DESC
  LIMIT 1
");
$stmt->execute([$clienteId, $lojaId]);
$ultimoPedido = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

$clientesColunas = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$temCashbackSaldoCliente = in_array('cashback_saldo', $clientesColunas, true);
$temPontosCliente = in_array('pontos', $clientesColunas, true);
$temPontosSaldoCliente = in_array('pontos_saldo', $clientesColunas, true);
$selectCashbackSaldo = $temCashbackSaldoCliente ? ", cashback_saldo" : "";
$selectPontos = '';
if ($temPontosSaldoCliente && $temPontosCliente) {
  $selectPontos = ", CASE
      WHEN COALESCE(pontos_saldo, 0) > 0 THEN pontos_saldo
      WHEN COALESCE(pontos, 0) > 0 THEN pontos
      ELSE COALESCE(pontos_saldo, pontos, 0)
    END AS pontos";
} elseif ($temPontosSaldoCliente) {
  $selectPontos = ", pontos_saldo AS pontos";
} elseif ($temPontosCliente) {
  $selectPontos = ", pontos AS pontos";
}
$selectPontosMov = tabelaExiste($conn, 'pontos_movimentacoes') ? ",
  (
    SELECT pm.saldo_depois
    FROM pontos_movimentacoes pm
    WHERE pm.cliente_id = clientes.id
      AND pm.loja_id = clientes.loja_id
      AND pm.tipo <> 'pendente'
    ORDER BY pm.criado_em DESC, pm.id DESC
    LIMIT 1
  ) AS pontos_mov" : "";
$stmt = $conn->prepare("
  SELECT nome, telefone, criado_em, endereco{$selectCashbackSaldo}{$selectPontos}{$selectPontosMov}
  FROM clientes
  WHERE id = ? AND loja_id = ?
");
$stmt->execute([$clienteId, $lojaId]);
$cliente = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
$enderecoCliente = $cliente['endereco'] ?? '';
$cashbackSaldo = $temCashbackSaldoCliente ? (float) ($cliente['cashback_saldo'] ?? 0) : 0.0;
$pontosSaldo = 0;
if ($temPontosCliente || $temPontosSaldoCliente) {
  if (isset($cliente['pontos_mov']) && $cliente['pontos_mov'] !== null) {
    $pontosSaldo = (int) $cliente['pontos_mov'];
  } else {
    $pontosSaldo = (int) ($cliente['pontos'] ?? 0);
  }
}

$temTabelaMov = tabelaExiste($conn, 'cashback_movimentacoes');
$cashbackExpiraDias = (int) config($conn, 'cashback_expira_dias', 20);
$cashbackCarenciaHoras = max(0, (int) config($conn, 'cashback_carencia_horas', 12));
$cashbackExpiraEm = null;
$cashbackExpirado = false;
$cashbackSaldoLiberado = $cashbackSaldo;
if ($temTabelaMov && $cashbackSaldo > 0) {
  try {
    /* Soma so as entradas AINDA em carencia; qualquer saldo sem rastro no ledger
       (ajustes antigos) e tratado como ja liberado. */
    $stmtLiberado = $conn->prepare("
      SELECT m.id, m.valor,
        COALESCE((
          SELECT SUM(valor)
          FROM cashback_movimentacoes u
          WHERE u.referencia_id = m.id
            AND u.tipo IN ('uso','resgate','expirado')
            AND u.loja_id = m.loja_id
        ), 0) AS usado
      FROM cashback_movimentacoes m
      WHERE m.cliente_id = ?
        AND m.loja_id = ?
        AND m.tipo IN ('entrada','ganho')
        AND m.disponivel_em IS NOT NULL
        AND m.disponivel_em > NOW()
        AND (m.expira_em IS NULL OR m.expira_em >= CURDATE())
      ORDER BY m.criado_em ASC, m.id ASC
    ");
    $stmtLiberado->execute([$clienteId, $lojaId]);
    $totalNaoLiberado = 0.0;
    foreach ($stmtLiberado->fetchAll(PDO::FETCH_ASSOC) as $rowLiberado) {
      $disponivelLinha = (float) $rowLiberado['valor'] - (float) $rowLiberado['usado'];
      if ($disponivelLinha > 0) {
        $totalNaoLiberado += $disponivelLinha;
      }
    }
    $cashbackSaldoLiberado = max(0, min($cashbackSaldo, $cashbackSaldo - $totalNaoLiberado));
  } catch (Exception $e) {
    $cashbackSaldoLiberado = $cashbackSaldo;
  }
}
if ($temTabelaMov) {
  if ($cashbackSaldo > 0) {
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
    $stmtExpira->execute([$clienteId, $lojaId]);
    $cashbackExpiraEm = $stmtExpira->fetchColumn() ?: null;
  } else {
    $stmtUltimo = $conn->prepare("
      SELECT tipo
      FROM cashback_movimentacoes
      WHERE cliente_id = ? AND loja_id = ?
      ORDER BY criado_em DESC, id DESC
      LIMIT 1
    ");
    $stmtUltimo->execute([$clienteId, $lojaId]);
    $ultimoTipo = $stmtUltimo->fetchColumn();
    $cashbackExpirado = ($ultimoTipo === 'expirado');
  }
}

$stmt = $conn->prepare("
  SELECT i.produto_nome, SUM(i.quantidade) AS total_qtd
  FROM pedido_itens i
  JOIN pedidos p ON p.id = i.pedido_id
  WHERE p.cliente_id = ?
    AND p.loja_id = ?
    AND i.loja_id = p.loja_id
    AND p.status = 'finalizado'
  GROUP BY i.produto_nome
  ORDER BY total_qtd DESC
  LIMIT 4
");
$stmt->execute([$clienteId, $lojaId]);
$favoritos = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("
  SELECT id, total, tipo, criado_em, status
  FROM pedidos
  WHERE cliente_id = ?
    AND loja_id = ?
  ORDER BY id DESC
  LIMIT 5
");
$stmt->execute([$clienteId, $lojaId]);
$historico = $stmt->fetchAll(PDO::FETCH_ASSOC);

$ultimoItens = [];
if ($ultimoPedido) {
  $stmt = $conn->prepare("
    SELECT produto_nome, quantidade, preco, observacoes
    FROM pedido_itens
    WHERE pedido_id = ? AND loja_id = ?
  ");
  $stmt->execute([$ultimoPedido['id'], $lojaId]);
  $ultimoItens = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$ultimoEndereco = $enderecoCliente;
if ($ultimoPedido && !empty($ultimoPedido['endereco_entrega'])) {
  $ultimoEndereco = $ultimoPedido['endereco_entrega'];
}

echo json_encode([
  'ok'=>true,
  'cliente'=>[
    'nome'=>$cliente['nome'] ?? '',
    'telefone'=>$cliente['telefone'] ?? '',
    'criado_em'=>$cliente['criado_em'] ?? null,
    'endereco'=>$enderecoCliente
  ],
  'stats'=>[
    'total_pedidos'=>(int)($statsBase['total_pedidos'] ?? 0),
    'ticket_medio'=>(float)($statsBase['ticket_medio'] ?? 0),
    'ultimo_pedido'=>$ultimoPedido,
    'ultimo_endereco'=>$ultimoEndereco,
    'pontos'=>$pontosSaldo,
    'cashback_saldo'=>$cashbackSaldo,
    'cashback_saldo_liberado'=>$cashbackSaldoLiberado,
    'cashback_expira_em'=>$cashbackExpiraEm,
    'cashback_expirado'=>$cashbackExpirado,
    'cashback_expira_dias'=>$cashbackExpiraDias,
    'cashback_carencia_horas'=>$cashbackCarenciaHoras
  ],
  'favoritos'=>$favoritos,
  'historico'=>$historico,
  'ultimo_itens'=>$ultimoItens
]);
