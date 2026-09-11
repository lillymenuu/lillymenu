<?php
/*
 * Versao JSON de admin/relatorios_fidelidade.php para o novo frontend
 * Next.js (/loyaltyreports), trocando sessao por token Bearer. O legado
 * usava uma janela fixa de 30 dias sem filtro nenhum; aqui o periodo e
 * parametrizavel (mesmo padrao de periodo usado em /sales e
 * /clientreports), mantendo 30 dias como default pra bater com o
 * comportamento original quando nenhum filtro e informado.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

date_default_timezone_set('America/Fortaleza');

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$periodoFiltro = trim($_GET['periodo'] ?? '30');
$dataIniParam = trim($_GET['data_ini'] ?? '');
$dataFimParam = trim($_GET['data_fim'] ?? '');
$hoje = date('Y-m-d');

if ($dataIniParam !== '' && $dataFimParam !== '') {
  $inicio = $dataIniParam . ' 00:00:00';
  $fim = $dataFimParam . ' 23:59:59';
} elseif ($periodoFiltro === 'hoje') {
  $inicio = $hoje . ' 00:00:00';
  $fim = $hoje . ' 23:59:59';
} else {
  $dias = in_array($periodoFiltro, ['7', '15', '30', '60', '90', '365'], true) ? (int) $periodoFiltro : 30;
  $inicio = date('Y-m-d', strtotime('-' . ($dias - 1) . ' days')) . ' 00:00:00';
  $fim = $hoje . ' 23:59:59';
}

$clientesColunas = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$pedidoColunas = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);

$temCashbackSaldo = in_array('cashback_saldo', $clientesColunas, true);
$temClienteCriado = in_array('criado_em', $clientesColunas, true);

$temCashbackValor = in_array('cashback_valor', $pedidoColunas, true);
$temCashbackAplicado = in_array('cashback_aplicado', $pedidoColunas, true);
$temCashbackExpiraEm = in_array('cashback_expira_em', $pedidoColunas, true);
$temCashbackUsado = in_array('cashback_usado', $pedidoColunas, true);
$temCupom = in_array('cupom', $pedidoColunas, true);
$temDesconto = in_array('desconto', $pedidoColunas, true);

function relFidelidadeTabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Throwable $e) {
    return false;
  }
}

$temTabelaMov = relFidelidadeTabelaExiste($conn, 'cashback_movimentacoes');

/* Expira lazy os saldos de cashback vencidos, igual ao legado. */
if ($temTabelaMov && $temCashbackSaldo) {
  $stmt = $conn->prepare("
    SELECT m.id, m.cliente_id, m.valor, m.expira_em,
      COALESCE((
        SELECT SUM(valor)
        FROM cashback_movimentacoes u
        WHERE u.referencia_id = m.id
          AND u.loja_id = m.loja_id
          AND u.tipo IN ('uso','expirado')
      ), 0) AS usado
    FROM cashback_movimentacoes m
    WHERE m.tipo = 'entrada'
      AND m.loja_id = ?
      AND m.expira_em IS NOT NULL
      AND m.expira_em < CURDATE()
  ");
  $stmt->execute([$lojaId]);
  $expiracoes = $stmt->fetchAll(PDO::FETCH_ASSOC);

  if ($expiracoes) {
    $conn->beginTransaction();
    $stmtSaldoCliente = $conn->prepare("SELECT cashback_saldo FROM clientes WHERE id = ? AND loja_id = ?");
    $stmtAtualizaSaldo = $conn->prepare("
      UPDATE clientes
      SET cashback_saldo = GREATEST(0, cashback_saldo - ?)
      WHERE id = ? AND loja_id = ?
    ");
    $stmtMov = $conn->prepare("
      INSERT INTO cashback_movimentacoes
        (cliente_id, pedido_id, tipo, valor, saldo_antes, saldo_depois, expira_em, referencia_id, loja_id)
      VALUES
        (?, NULL, 'expirado', ?, ?, ?, ?, ?, ?)
    ");

    $saldosCache = [];
    foreach ($expiracoes as $exp) {
      $clienteId = (int) $exp['cliente_id'];
      $restante = (float) $exp['valor'] - (float) $exp['usado'];
      if ($restante <= 0.009) {
        continue;
      }

      if (!array_key_exists($clienteId, $saldosCache)) {
        $stmtSaldoCliente->execute([$clienteId, $lojaId]);
        $saldosCache[$clienteId] = (float) $stmtSaldoCliente->fetchColumn();
      }

      $saldoAntes = $saldosCache[$clienteId];
      $expirar = min($restante, $saldoAntes);
      if ($expirar <= 0.009) {
        continue;
      }

      $saldoDepois = max(0, $saldoAntes - $expirar);
      $stmtAtualizaSaldo->execute([$expirar, $clienteId, $lojaId]);
      $stmtMov->execute([
        $clienteId,
        $expirar,
        $saldoAntes,
        $saldoDepois,
        $exp['expira_em'],
        (int) $exp['id'],
        $lojaId,
      ]);
      $saldosCache[$clienteId] = $saldoDepois;
    }
    $conn->commit();
  }
}

$cashbackSaldoBase = 0.0;
if ($temCashbackSaldo) {
  $stmt = $conn->prepare("SELECT COALESCE(SUM(cashback_saldo),0) FROM clientes WHERE loja_id = ?");
  $stmt->execute([$lojaId]);
  $cashbackSaldoBase = (float) $stmt->fetchColumn();
}

$cashbackUtilizado = 0.0;
if ($temTabelaMov) {
  $stmt = $conn->prepare("
    SELECT COALESCE(SUM(valor),0)
    FROM cashback_movimentacoes
    WHERE tipo = 'uso' AND criado_em BETWEEN ? AND ? AND loja_id = ?
  ");
  $stmt->execute([$inicio, $fim, $lojaId]);
  $cashbackUtilizado = (float) $stmt->fetchColumn();
} elseif ($temCashbackUsado) {
  $stmt = $conn->prepare("
    SELECT COALESCE(SUM(cashback_usado),0)
    FROM pedidos
    WHERE criado_em BETWEEN ? AND ? AND status <> 'cancelado' AND loja_id = ?
  ");
  $stmt->execute([$inicio, $fim, $lojaId]);
  $cashbackUtilizado = (float) $stmt->fetchColumn();
}

$pedidosComCashback = 0;
if ($temCashbackAplicado) {
  $stmt = $conn->prepare("
    SELECT COUNT(*)
    FROM pedidos
    WHERE criado_em BETWEEN ? AND ? AND status <> 'cancelado' AND cashback_aplicado = 1 AND loja_id = ?
  ");
  $stmt->execute([$inicio, $fim, $lojaId]);
  $pedidosComCashback = (int) $stmt->fetchColumn();
} elseif ($temCashbackValor) {
  $stmt = $conn->prepare("
    SELECT COUNT(*)
    FROM pedidos
    WHERE criado_em BETWEEN ? AND ? AND status <> 'cancelado' AND cashback_valor > 0 AND loja_id = ?
  ");
  $stmt->execute([$inicio, $fim, $lojaId]);
  $pedidosComCashback = (int) $stmt->fetchColumn();
}

$cupomPedidos = 0;
$cupomDesconto = 0.0;
if ($temCupom) {
  $selectDesconto = $temDesconto ? "COALESCE(SUM(desconto),0)" : "0";
  $stmt = $conn->prepare("
    SELECT COUNT(*) AS total, $selectDesconto AS desconto
    FROM pedidos
    WHERE criado_em BETWEEN ? AND ? AND status <> 'cancelado' AND cupom IS NOT NULL AND cupom <> '' AND loja_id = ?
  ");
  $stmt->execute([$inicio, $fim, $lojaId]);
  $res = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
  $cupomPedidos = (int) ($res['total'] ?? 0);
  $cupomDesconto = (float) ($res['desconto'] ?? 0);
}

$clientesRows = [];
if ($temCashbackSaldo) {
  $stmt = $conn->prepare("
    SELECT id, nome, criado_em, cashback_saldo
    FROM clientes
    WHERE loja_id = ?
    ORDER BY cashback_saldo DESC
    LIMIT 10
  ");
  $stmt->execute([$lojaId]);
  $clientesRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$clientesExtras = [];
if ($clientesRows) {
  $ids = array_column($clientesRows, 'id');
  $placeholders = implode(',', array_fill(0, count($ids), '?'));

  if ($temTabelaMov) {
    $stmt = $conn->prepare("
      SELECT
        cliente_id,
        SUM(CASE WHEN tipo = 'uso' THEN valor ELSE 0 END) AS usado,
        MIN(CASE WHEN tipo = 'entrada' THEN expira_em END) AS expira_em
      FROM cashback_movimentacoes
      WHERE cliente_id IN ($placeholders) AND loja_id = ?
      GROUP BY cliente_id
    ");
    $stmt->execute(array_merge($ids, [$lojaId]));
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $clientesExtras[$row['cliente_id']] = $row;
    }
  } elseif ($temCashbackUsado || $temCashbackExpiraEm) {
    $select = ['cliente_id'];
    if ($temCashbackUsado) {
      $select[] = 'COALESCE(SUM(cashback_usado),0) AS usado';
    }
    if ($temCashbackExpiraEm) {
      $select[] = "MIN(CASE WHEN cashback_expira_em IS NOT NULL THEN cashback_expira_em END) AS expira_em";
    }
    $stmt = $conn->prepare("
      SELECT " . implode(',', $select) . "
      FROM pedidos
      WHERE criado_em BETWEEN ? AND ? AND status <> 'cancelado' AND cliente_id IN ($placeholders) AND loja_id = ?
      GROUP BY cliente_id
    ");
    $stmt->execute(array_merge([$inicio, $fim], $ids, [$lojaId]));
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $clientesExtras[$row['cliente_id']] = $row;
    }
  }
}

$clientes = [];
foreach ($clientesRows as $cliente) {
  $extra = $clientesExtras[$cliente['id']] ?? [];
  $clientes[] = [
    'nome' => (string) ($cliente['nome'] ?? '-'),
    'criado_em' => $temClienteCriado ? ($cliente['criado_em'] ?? null) : null,
    'saldo' => (float) ($cliente['cashback_saldo'] ?? 0),
    'usado' => (float) ($extra['usado'] ?? 0),
    'expira_em' => $extra['expira_em'] ?? null,
  ];
}

$historico = [];
if ($temTabelaMov) {
  $stmt = $conn->prepare("
    SELECT tipo, valor, criado_em, expira_em
    FROM cashback_movimentacoes
    WHERE criado_em BETWEEN ? AND ? AND loja_id = ?
      AND tipo IN ('entrada','uso','expirado')
    ORDER BY criado_em DESC
    LIMIT 40
  ");
  $stmt->execute([$inicio, $fim, $lojaId]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  foreach ($rows as $row) {
    $tipo = $row['tipo'] ?? '';
    $dataRef = $tipo === 'expirado' && !empty($row['expira_em']) ? $row['expira_em'] : ($row['criado_em'] ?? null);
    $valor = (float) ($row['valor'] ?? 0);

    if ($tipo === 'entrada') {
      $historico[] = ['tipo' => 'Entrada de saldo', 'classe' => 'positivo', 'data' => $dataRef, 'valor' => $valor];
    } elseif ($tipo === 'uso') {
      $historico[] = ['tipo' => 'Saída de saldo', 'classe' => 'negativo', 'data' => $dataRef, 'valor' => -1 * $valor];
    } elseif ($tipo === 'expirado') {
      $historico[] = ['tipo' => 'Expirado', 'classe' => 'negativo', 'data' => $dataRef, 'valor' => -1 * $valor];
    }
  }
} elseif ($temCashbackValor || $temCashbackUsado || $temCashbackExpiraEm) {
  $select = ['id', 'criado_em'];
  if ($temCashbackValor) $select[] = 'cashback_valor';
  if ($temCashbackUsado) $select[] = 'cashback_usado';
  if ($temCashbackExpiraEm) $select[] = 'cashback_expira_em';

  $condicoes = [];
  if ($temCashbackValor) $condicoes[] = 'cashback_valor > 0';
  if ($temCashbackUsado) $condicoes[] = 'cashback_usado > 0';
  if ($temCashbackExpiraEm) $condicoes[] = 'cashback_expira_em IS NOT NULL AND cashback_expira_em <= CURDATE()';

  if ($condicoes) {
    $stmt = $conn->prepare("
      SELECT " . implode(',', $select) . "
      FROM pedidos
      WHERE criado_em BETWEEN ? AND ? AND status <> 'cancelado' AND (" . implode(' OR ', $condicoes) . ") AND loja_id = ?
      ORDER BY criado_em DESC
      LIMIT 40
    ");
    $stmt->execute([$inicio, $fim, $lojaId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as $row) {
      $criado = $row['criado_em'] ?? null;
      $valorCashback = (float) ($row['cashback_valor'] ?? 0);
      $valorUsado = (float) ($row['cashback_usado'] ?? 0);
      $expiraEm = $row['cashback_expira_em'] ?? null;

      if ($temCashbackValor && $valorCashback > 0) {
        $historico[] = ['tipo' => 'Entrada de saldo', 'classe' => 'positivo', 'data' => $criado, 'valor' => $valorCashback];
      }
      if ($temCashbackUsado && $valorUsado > 0) {
        $historico[] = ['tipo' => 'Saída de saldo', 'classe' => 'negativo', 'data' => $criado, 'valor' => -1 * $valorUsado];
      }
      if ($temCashbackExpiraEm && $expiraEm && $expiraEm <= $hoje && $valorCashback > 0) {
        $historico[] = ['tipo' => 'Expirado', 'classe' => 'negativo', 'data' => $expiraEm, 'valor' => -1 * $valorCashback];
      }
    }
  }
}

usort($historico, function ($a, $b) {
  return strtotime((string) $b['data']) <=> strtotime((string) $a['data']);
});
$historico = array_slice($historico, 0, 20);

echo json_encode([
  'ok' => true,
  'data_ini' => substr($inicio, 0, 10),
  'data_fim' => substr($fim, 0, 10),
  'cashback_saldo_base' => $cashbackSaldoBase,
  'cashback_utilizado' => $cashbackUtilizado,
  'pedidos_com_cashback' => $pedidosComCashback,
  'clientes' => $clientes,
  'historico' => $historico,
  'cupom_desconto' => $cupomDesconto,
  'cupom_pedidos' => $cupomPedidos,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
