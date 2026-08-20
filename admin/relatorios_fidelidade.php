<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.relatorios_fidelidade');

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$periodoDias = 30;
$inicio = date('Y-m-d', strtotime('-' . ($periodoDias - 1) . ' days'));
$hoje = date('Y-m-d');

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

function formatarMoeda($valor) {
  return 'R$ ' . number_format((float) $valor, 2, ',', '.');
}

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

$temTabelaMov = tabelaExiste($conn, 'cashback_movimentacoes');

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
        $lojaId
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
    WHERE tipo = 'uso' AND criado_em >= ? AND loja_id = ?
  ");
  $stmt->execute([$inicio, $lojaId]);
  $cashbackUtilizado = (float) $stmt->fetchColumn();
} elseif ($temCashbackUsado) {
  $stmt = $conn->prepare("
    SELECT COALESCE(SUM(cashback_usado),0)
    FROM pedidos
    WHERE criado_em >= ? AND status <> 'cancelado' AND loja_id = ?
  ");
  $stmt->execute([$inicio, $lojaId]);
  $cashbackUtilizado = (float) $stmt->fetchColumn();
}

$pedidosComCashback = 0;
if ($temCashbackAplicado) {
  $stmt = $conn->prepare("
    SELECT COUNT(*)
    FROM pedidos
    WHERE criado_em >= ? AND status <> 'cancelado' AND cashback_aplicado = 1 AND loja_id = ?
  ");
  $stmt->execute([$inicio, $lojaId]);
  $pedidosComCashback = (int) $stmt->fetchColumn();
} elseif ($temCashbackValor) {
  $stmt = $conn->prepare("
    SELECT COUNT(*)
    FROM pedidos
    WHERE criado_em >= ? AND status <> 'cancelado' AND cashback_valor > 0 AND loja_id = ?
  ");
  $stmt->execute([$inicio, $lojaId]);
  $pedidosComCashback = (int) $stmt->fetchColumn();
}

$cupomPedidos = 0;
$cupomDesconto = 0.0;
if ($temCupom) {
  $selectDesconto = $temDesconto ? "COALESCE(SUM(desconto),0)" : "0";
  $stmt = $conn->prepare("
    SELECT COUNT(*) AS total, $selectDesconto AS desconto
    FROM pedidos
    WHERE criado_em >= ? AND status <> 'cancelado' AND cupom IS NOT NULL AND cupom <> '' AND loja_id = ?
  ");
  $stmt->execute([$inicio, $lojaId]);
  $res = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
  $cupomPedidos = (int) ($res['total'] ?? 0);
  $cupomDesconto = (float) ($res['desconto'] ?? 0);
}

$clientes = [];
if ($temCashbackSaldo) {
  $stmt = $conn->prepare("
    SELECT id, nome, criado_em, cashback_saldo
    FROM clientes
    WHERE loja_id = ?
    ORDER BY cashback_saldo DESC
    LIMIT 10
  ");
  $stmt->execute([$lojaId]);
  $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$clientesExtras = [];
if ($clientes) {
  $ids = array_column($clientes, 'id');
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
      WHERE criado_em >= ? AND status <> 'cancelado' AND cliente_id IN ($placeholders) AND loja_id = ?
      GROUP BY cliente_id
    ");
    $stmt->execute(array_merge([$inicio], $ids, [$lojaId]));
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $clientesExtras[$row['cliente_id']] = $row;
    }
  }
}

$historico = [];
if ($temTabelaMov) {
  $stmt = $conn->prepare("
    SELECT tipo, valor, criado_em, expira_em
    FROM cashback_movimentacoes
    WHERE criado_em >= ? AND loja_id = ?
      AND tipo IN ('entrada','uso','expirado')
    ORDER BY criado_em DESC
    LIMIT 40
  ");
  $stmt->execute([$inicio, $lojaId]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  foreach ($rows as $row) {
    $tipo = $row['tipo'] ?? '';
    $dataRef = $tipo === 'expirado' && !empty($row['expira_em']) ? $row['expira_em'] : ($row['criado_em'] ?? null);
    $valor = (float) ($row['valor'] ?? 0);

    if ($tipo === 'entrada') {
      $historico[] = [
        'tipo' => 'Entrada de saldo',
        'classe' => 'positivo',
        'icone' => 'bi-arrow-up',
        'data' => $dataRef,
        'valor' => $valor
      ];
    } elseif ($tipo === 'uso') {
      $historico[] = [
        'tipo' => 'Saida de saldo',
        'classe' => 'negativo',
        'icone' => 'bi-arrow-down',
        'data' => $dataRef,
        'valor' => -1 * $valor
      ];
    } elseif ($tipo === 'expirado') {
      $historico[] = [
        'tipo' => 'Expirado',
        'classe' => 'negativo',
        'icone' => 'bi-arrow-down',
        'data' => $dataRef,
        'valor' => -1 * $valor
      ];
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
      WHERE criado_em >= ? AND status <> 'cancelado' AND (" . implode(' OR ', $condicoes) . ") AND loja_id = ?
      ORDER BY criado_em DESC
      LIMIT 40
    ");
    $stmt->execute([$inicio, $lojaId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as $row) {
      $criado = $row['criado_em'] ?? null;
      $valorCashback = (float) ($row['cashback_valor'] ?? 0);
      $valorUsado = (float) ($row['cashback_usado'] ?? 0);
      $expiraEm = $row['cashback_expira_em'] ?? null;

      if ($temCashbackValor && $valorCashback > 0) {
        $historico[] = [
          'tipo' => 'Entrada de saldo',
          'classe' => 'positivo',
          'icone' => 'bi-arrow-up',
          'data' => $criado,
          'valor' => $valorCashback
        ];
      }
      if ($temCashbackUsado && $valorUsado > 0) {
        $historico[] = [
          'tipo' => 'Saida de saldo',
          'classe' => 'negativo',
          'icone' => 'bi-arrow-down',
          'data' => $criado,
          'valor' => -1 * $valorUsado
        ];
      }
      if ($temCashbackExpiraEm && $expiraEm && $expiraEm <= $hoje && $valorCashback > 0) {
        $historico[] = [
          'tipo' => 'Expirado',
          'classe' => 'negativo',
          'icone' => 'bi-arrow-down',
          'data' => $expiraEm,
          'valor' => -1 * $valorCashback
        ];
      }
    }
  }
}

usort($historico, function($a, $b) {
  return strtotime((string) $b['data']) <=> strtotime((string) $a['data']);
});
$historico = array_slice($historico, 0, 20);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Fidelidade</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<style>
  .fidelidade-page{
    padding:24px 26px 36px;
  }
  .fidelidade-title{
    font-size:22px;
    font-weight:700;
    margin:0 0 6px;
    color:#0f172a;
  }
  .fidelidade-subtitle{
    font-size:.9rem;
    color:#64748b;
    margin-bottom:22px;
  }
  .fidelidade-subtitle strong{
    color:#0f172a;
    font-weight:600;
  }
  .fidelidade-section{
    margin-bottom:28px;
  }
  .fidelidade-section h6{
    font-weight:700;
    color:#0f172a;
    margin:0 0 14px;
  }
  .fidelidade-section h6 span{
    font-weight:500;
    color:#64748b;
  }
  .fidelidade-cards{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
    gap:16px;
  }
  .fidelidade-card{
    border:1px solid #e5e7eb;
    border-radius:16px;
    padding:16px;
    background:#fff;
    box-shadow:0 8px 22px rgba(15,23,42,.06);
    display:flex;
    align-items:center;
    gap:12px;
  }
  .fidelidade-card h4{
    margin:0;
    font-size:1.05rem;
    font-weight:700;
    color:#0f172a;
  }
  .fidelidade-card p{
    margin:0;
    font-size:.78rem;
    color:#64748b;
  }
  .fidelidade-icon{
    width:38px;
    height:38px;
    border-radius:12px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:1.05rem;
  }
  .fidelidade-icon.azul{
    background:#e0f2fe;
    color:#0ea5e9;
  }
  .fidelidade-icon.rosa{
    background:#ffe4e6;
    color:#9C5523;
  }
  .fidelidade-icon.neutro{
    background:#f1f5f9;
    color:#0f172a;
  }
  .fidelidade-table-card{
    border:1px solid #e5e7eb;
    border-radius:16px;
    padding:10px 12px;
    background:#fff;
    box-shadow:0 12px 26px rgba(15,23,42,.06);
  }
  .fidelidade-table{
    width:100%;
    border-collapse:separate;
    border-spacing:0;
    font-size:.85rem;
  }
  .fidelidade-table thead th{
    background:#f5f5f7;
    color:#64748b;
    font-weight:600;
    padding:10px 12px;
  }
  .fidelidade-table tbody td{
    padding:10px 12px;
    border-bottom:1px solid #f1f5f9;
    color:#0f172a;
  }
  .fidelidade-table tbody tr:last-child td{
    border-bottom:0;
  }
  .fidelidade-tipo{
    display:inline-flex;
    align-items:center;
    gap:8px;
    font-weight:600;
  }
  .fidelidade-tipo.positivo{color:#16a34a;}
  .fidelidade-tipo.negativo{color:#dc2626;}
  .fidelidade-empty{
    text-align:center;
    color:#94a3b8;
    padding:14px 0 4px;
    font-size:.85rem;
  }
  @media (max-width: 768px){
    .fidelidade-page{padding:20px 16px 30px;}
    .fidelidade-table thead{display:none;}
    .fidelidade-table tbody td{display:block;padding:8px 12px;}
    .fidelidade-table tbody tr{display:block;margin-bottom:8px;}
  }
</style>
</head>
<body class="dash-diggy">
  <?php include __DIR__ . '/partials/sidebar.php'; ?>

  <div class="dash-page fidelidade-page">
    <div class="fidelidade-section">
      <h1 class="fidelidade-title">Visão geral de Fidelidade</h1>
      <div class="fidelidade-subtitle">
        <strong>Mostrando resultados</strong> nos ultimos <?= $periodoDias ?> dias
      </div>
    </div>

    <div class="fidelidade-section">
      <h6>Cashback</h6>
      <div class="fidelidade-cards">
        <div class="fidelidade-card">
          <div class="fidelidade-icon azul"><i class="bi bi-cash-coin"></i></div>
          <div>
            <h4><?= formatarMoeda($cashbackSaldoBase) ?></h4>
            <p>saldo de cashback da base</p>
          </div>
        </div>
        <div class="fidelidade-card">
          <div class="fidelidade-icon rosa"><i class="bi bi-arrow-down"></i></div>
          <div>
            <h4><?= formatarMoeda($cashbackUtilizado) ?></h4>
            <p>cashback utilizado</p>
          </div>
        </div>
        <div class="fidelidade-card">
          <div class="fidelidade-icon neutro"><i class="bi bi-receipt"></i></div>
          <div>
            <h4><?= (int) $pedidosComCashback ?></h4>
            <p>pedidos com cashback</p>
          </div>
        </div>
      </div>
    </div>

    <div class="fidelidade-section">
      <h6>Clientes com maior saldo acumulado <span>nos ultimos <?= $periodoDias ?> dias</span></h6>
      <div class="fidelidade-table-card">
        <table class="fidelidade-table">
          <thead>
            <tr>
              <th>Nome do cliente</th>
              <th>Cliente desde</th>
              <th>Saldo disponivel</th>
              <th>Saldo utilizado</th>
              <th>Expira em</th>
            </tr>
          </thead>
          <tbody>
          <?php if (!$clientes): ?>
            <tr>
              <td colspan="5" class="fidelidade-empty">Nenhum cliente com cashback encontrado.</td>
            </tr>
          <?php else: ?>
            <?php foreach ($clientes as $cliente):
              $extra = $clientesExtras[$cliente['id']] ?? [];
              $desde = $temClienteCriado && !empty($cliente['criado_em'])
                ? date('d/m/Y', strtotime($cliente['criado_em']))
                : '-';
              $saldo = (float) ($cliente['cashback_saldo'] ?? 0);
              $usado = (float) ($extra['usado'] ?? 0);
              $expira = !empty($extra['expira_em']) ? date('d/m/Y', strtotime($extra['expira_em'])) : '-';
            ?>
            <tr>
              <td><?= htmlspecialchars($cliente['nome'] ?? '-') ?></td>
              <td><?= $desde ?></td>
              <td><?= formatarMoeda($saldo) ?></td>
              <td><?= formatarMoeda($usado) ?></td>
              <td><?= $expira ?></td>
            </tr>
            <?php endforeach; ?>
          <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>

    <div class="fidelidade-section">
      <h6>Historico de entradas e saidas de cashback <span>nos ultimos <?= $periodoDias ?> dias</span></h6>
      <div class="fidelidade-table-card">
        <table class="fidelidade-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Data</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
          <?php if (!$historico): ?>
            <tr>
              <td colspan="3" class="fidelidade-empty">Nenhum movimento de cashback encontrado.</td>
            </tr>
          <?php else: ?>
            <?php foreach ($historico as $item):
              $data = !empty($item['data']) ? date('d/m/Y', strtotime($item['data'])) : '-';
              $valor = formatarMoeda(abs((float) $item['valor']));
              $prefixo = (float) $item['valor'] < 0 ? '-' : '';
            ?>
            <tr>
              <td>
                <span class="fidelidade-tipo <?= htmlspecialchars($item['classe']) ?>">
                  <i class="bi <?= htmlspecialchars($item['icone']) ?>"></i>
                  <?= htmlspecialchars($item['tipo']) ?>
                </span>
              </td>
              <td><?= $data ?></td>
              <td><?= $prefixo . $valor ?></td>
            </tr>
            <?php endforeach; ?>
          <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>

    <div class="fidelidade-section">
      <h6>Cupom de desconto</h6>
      <div class="fidelidade-cards">
        <div class="fidelidade-card">
          <div class="fidelidade-icon rosa"><i class="bi bi-ticket-perforated"></i></div>
          <div>
            <h4><?= formatarMoeda($cupomDesconto) ?></h4>
            <p>descontos provenientes de cupons</p>
          </div>
        </div>
        <div class="fidelidade-card">
          <div class="fidelidade-icon neutro"><i class="bi bi-receipt"></i></div>
          <div>
            <h4><?= (int) $cupomPedidos ?></h4>
            <p>pedidos com cupons</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</body>
</html>
