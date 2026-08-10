<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.relatorio_cross_sell');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$periodoFiltro = $_GET['periodo'] ?? '30dias';
$inicioParam = $_GET['inicio'] ?? '';
$fimParam = $_GET['fim'] ?? '';

if ($periodoFiltro === 'customizado') {
  $inicio = $inicioParam ?: date('Y-m-01');
  $fim = $fimParam ?: date('Y-m-d');
} elseif ($periodoFiltro === 'hoje') {
  $inicio = date('Y-m-d');
  $fim = date('Y-m-d');
} elseif ($periodoFiltro === '7dias') {
  $inicio = date('Y-m-d', strtotime('-6 days'));
  $fim = date('Y-m-d');
} else {
  $periodoFiltro = '30dias';
  $inicio = date('Y-m-d', strtotime('-29 days'));
  $fim = date('Y-m-d');
}

$faturamento = 0.0;
$itensVendidos = 0;
$pedidosComCrossSell = 0;
$ticketMedio = 0.0;
$porDia = [];
$topProdutos = [];
$ultimosPedidos = [];

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
    $ultimosPedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);
  }
} catch (Exception $e) {
}

$chartLabels = array_map(fn($d) => date('d/m', strtotime($d['dia'])), $porDia);
$chartValores = array_map(fn($d) => (float) $d['valor'], $porDia);

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$relatoriosCssVer = filemtime(__DIR__ . '/assets/css/relatorios.css');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatorio de Cross-sell</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

<link href="./assets/css/relatorios.css?v=<?= $relatoriosCssVer ?>" rel="stylesheet">
<style>
  .btn-filtros-premium{
    display:inline-flex;align-items:center;gap:8px;
    background:#fff;border:1.5px solid #e5e7eb;color:#111827;
    font-weight:700;font-size:.86rem;font-family:inherit;
    padding:10px 18px;border-radius:12px;cursor:pointer;
    transition:border-color .15s,box-shadow .15s;
  }
  .btn-filtros-premium:hover{border-color:#9C5523}
  .btn-filtros-premium i{color:#9C5523}

  .filtros-premium-overlay{
    position:fixed;inset:0;background:rgba(15,23,42,.35);
    z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;
    opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,visibility 0s linear .18s;
  }
  .filtros-premium-overlay.show{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .18s ease}
  .filtros-premium-modal{
    background:#fff;
    border-radius:16px;width:100%;max-width:380px;
    box-shadow:0 12px 32px rgba(15,23,42,.16);
    transform:translateY(-28px);opacity:0;transition:transform .28s cubic-bezier(.22,.9,.32,1),opacity .22s ease;
  }
  .filtros-premium-overlay.show .filtros-premium-modal{transform:translateY(0);opacity:1}
  .filtros-premium-head{
    display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
    padding:20px 22px 16px;
    border-bottom:1px solid #f1f1f1;
    border-radius:16px 16px 0 0;
  }
  .filtros-premium-title{font-size:1rem;font-weight:700;color:#111827}
  .filtros-premium-sub{font-size:.78rem;color:#9ca3af;margin-top:2px}
  .filtros-premium-close{
    width:28px;height:28px;border-radius:50%;border:0;background:#f6f6f6;color:#666;
    display:flex;align-items:center;justify-content:center;font-size:.82rem;cursor:pointer;
    flex-shrink:0;transition:background .15s;
  }
  .filtros-premium-close:hover{background:#eee}
  .filtros-premium-body{padding:20px 22px 22px;display:flex;flex-direction:column;gap:14px;border-radius:0 0 16px 16px}
  .filtros-premium-field label{font-size:.76rem;font-weight:600;color:#6b7280;margin-bottom:6px;display:block}
  .filtros-premium-field select,.filtros-premium-field input{
    width:100%;border:1px solid #e5e7eb;border-radius:9px;padding:9px 12px;
    font-size:.86rem;font-family:inherit;background:#fff;outline:none;transition:border-color .15s;
    color:#111827;
  }
  .filtros-premium-field select:focus,.filtros-premium-field input:focus{border-color:#9C5523}
  .filtros-premium-range{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .filtros-premium-apply{
    width:100%;background:#9C5523;color:#fff;border:0;
    border-radius:9px;padding:11px;font-size:.86rem;font-weight:600;font-family:inherit;
    cursor:pointer;transition:background .15s;
    margin-top:2px;
  }
  .filtros-premium-apply:hover{background:#7d4419}
</style>
</head>
<body class="dash-diggy">
<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid relatorio-page">
  <div class="relatorio-header">
    <div>
      <h1 class="relatorio-title">Relatorio de Cross-sell</h1>
      <p class="relatorio-subtitle">Acompanhe o quanto o cross-sell esta rendendo pra sua loja.</p>
    </div>
    <div class="relatorio-actions">
      <button type="button" class="btn-filtros-premium" id="btnAbrirFiltros">
        <i class="bi bi-sliders"></i> Filtros
      </button>
    </div>
  </div>

  <div class="filtros-premium-overlay" id="filtrosOverlay">
    <div class="filtros-premium-modal" onclick="event.stopPropagation()">
      <div class="filtros-premium-head">
        <div>
          <div class="filtros-premium-title">Filtros</div>
          <div class="filtros-premium-sub">Escolha o periodo que deseja analisar</div>
        </div>
        <button type="button" class="filtros-premium-close" id="btnFecharFiltros"><i class="bi bi-x-lg"></i></button>
      </div>
      <form id="formFiltro" class="filtros-premium-body" method="get" action="relatorio_cross_sell.php">
        <div class="filtros-premium-field">
          <label for="periodoSelect">Periodo de visualizacao</label>
          <select id="periodoSelect" name="periodo" class="form-select" onchange="document.getElementById('rangePeriodo').style.display=this.value==='customizado'?'':'none';">
            <option value="hoje" <?= $periodoFiltro === 'hoje' ? 'selected' : '' ?>>Hoje</option>
            <option value="7dias" <?= $periodoFiltro === '7dias' ? 'selected' : '' ?>>Ultimos 7 dias</option>
            <option value="30dias" <?= $periodoFiltro === '30dias' ? 'selected' : '' ?>>Ultimos 30 dias</option>
            <option value="customizado" <?= $periodoFiltro === 'customizado' ? 'selected' : '' ?>>Customizado</option>
          </select>
        </div>
        <div class="filtros-premium-range" id="rangePeriodo" style="<?= $periodoFiltro === 'customizado' ? '' : 'display:none' ?>">
          <div class="filtros-premium-field">
            <label for="dataInicio">De</label>
            <input type="date" class="form-control" id="dataInicio" name="inicio" value="<?= htmlspecialchars($inicioParam ?: $inicio) ?>">
          </div>
          <div class="filtros-premium-field">
            <label for="dataFim">Ate</label>
            <input type="date" class="form-control" id="dataFim" name="fim" value="<?= htmlspecialchars($fimParam ?: $fim) ?>">
          </div>
        </div>
        <button type="submit" class="filtros-premium-apply">Aplicar filtros</button>
      </form>
    </div>
  </div>

  <div class="relatorio-section">
    <div class="relatorio-section-head">
      <h2 class="relatorio-section-title">Resumo do periodo</h2>
      <span class="relatorio-section-sub"><?= htmlspecialchars($inicio) ?> ate <?= htmlspecialchars($fim) ?></span>
    </div>
    <div class="relatorio-kpis">
      <div class="relatorio-kpi">
        <div class="relatorio-kpi-label">Faturamento cross-sell</div>
        <div class="relatorio-kpi-value">R$ <?= number_format($faturamento, 2, ',', '.') ?></div>
      </div>
      <div class="relatorio-kpi">
        <div class="relatorio-kpi-label">Pedidos com cross-sell</div>
        <div class="relatorio-kpi-value"><?= $pedidosComCrossSell ?></div>
      </div>
      <div class="relatorio-kpi">
        <div class="relatorio-kpi-label">Itens via cross-sell</div>
        <div class="relatorio-kpi-value"><?= $itensVendidos ?></div>
      </div>
      <div class="relatorio-kpi">
        <div class="relatorio-kpi-label">Media com cross-sell</div>
        <div class="relatorio-kpi-value">R$ <?= number_format($ticketMedio, 2, ',', '.') ?></div>
      </div>
    </div>
  </div>

  <div class="relatorio-section relatorio-split">
    <div class="relatorio-card p-3">
      <div class="relatorio-card-title">Faturamento de cross-sell por dia</div>
      <div class="relatorio-chart-wrap">
        <canvas id="chartCrossSell" height="180"></canvas>
      </div>
    </div>
    <div class="relatorio-card p-3">
      <div class="relatorio-card-title">Produtos mais vendidos via cross-sell</div>
      <div class="relatorio-mini-grid">
        <?php if (!$topProdutos): ?>
          <div class="relatorio-mini-card">Nenhuma venda de cross-sell no periodo.</div>
        <?php endif; ?>
        <?php foreach ($topProdutos as $tp): ?>
          <div class="relatorio-mini-card">
            <div class="relatorio-mini-title"><?= htmlspecialchars($tp['nome']) ?></div>
            <div class="relatorio-mini-meta">Total: <strong>R$ <?= number_format((float) $tp['valor'], 2, ',', '.') ?></strong></div>
            <div class="relatorio-mini-meta">Quantidade: <strong><?= (int) $tp['qtd'] ?></strong></div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>

  <div class="relatorio-section">
    <div class="relatorio-section-head">
      <h2 class="relatorio-section-title">Itens vendidos via cross-sell</h2>
      <span class="relatorio-section-sub">Ultimos itens do periodo</span>
    </div>
    <div class="relatorio-table-card">
      <div class="rc-table-wrap">
        <table class="relatorio-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Produto sugerido</th>
              <th>Qtd</th>
              <th>Data</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            <?php if (!$ultimosPedidos): ?>
              <tr>
                <td colspan="6" class="text-center text-muted py-4">Nenhum item de cross-sell vendido no periodo</td>
              </tr>
            <?php endif; ?>
            <?php foreach ($ultimosPedidos as $item): ?>
              <tr>
                <td>#<?= htmlspecialchars((string) $item['codigo']) ?></td>
                <td><?= htmlspecialchars($item['cliente']) ?></td>
                <td><?= htmlspecialchars($item['produto_nome']) ?></td>
                <td><?= (int) $item['quantidade'] ?></td>
                <td><?= date('d/m/Y H:i', strtotime($item['criado_em'])) ?></td>
                <td>R$ <?= number_format((float) $item['subtotal'], 2, ',', '.') ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script>
  const ctx = document.getElementById('chartCrossSell');
  if (ctx) {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: <?= json_encode($chartLabels) ?>,
        datasets: [{
          label: 'Faturamento cross-sell',
          data: <?= json_encode($chartValores) ?>,
          borderColor: '#9C5523',
          backgroundColor: 'rgba(156,85,35,.12)',
          fill: true,
          tension: .3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  (function(){
    const overlay = document.getElementById('filtrosOverlay');
    const btnAbrir = document.getElementById('btnAbrirFiltros');
    const btnFechar = document.getElementById('btnFecharFiltros');
    if (!overlay || !btnAbrir) return;
    const abrir = () => overlay.classList.add('show');
    const fechar = () => overlay.classList.remove('show');
    btnAbrir.addEventListener('click', abrir);
    if (btnFechar) btnFechar.addEventListener('click', fechar);
    overlay.addEventListener('click', fechar);
    <?php if ($periodoFiltro === 'customizado'): ?>
      abrir();
    <?php endif; ?>
  })();
</script>
</body>
</html>
