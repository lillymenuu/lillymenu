
<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.relatorios');

$perfil = $_SESSION['admin_perfil'] ?? 'admin';
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$inicioParam = $_GET['inicio'] ?? '';
$fimParam = $_GET['fim'] ?? '';
$statusFiltro = $_GET['status'] ?? 'todos';
$tipoFiltro = trim($_GET['tipo'] ?? '');
$pagamentoFiltro = trim($_GET['pagamento'] ?? '');
$periodoFiltro = $_GET['periodo'] ?? 'hoje';

if ($periodoFiltro === 'customizado') {
  $inicio = $inicioParam ?: date('Y-m-01');
  $fim = $fimParam ?: date('Y-m-d');
} elseif ($periodoFiltro === 'hoje') {
  $inicio = $inicioParam ?: date('Y-m-d');
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
$pagina = max(1, (int)($_GET['pagina'] ?? 1));
$limite = (int)($_GET['limite'] ?? 10);
$limite = in_array($limite, [10, 20, 50], true) ? $limite : 10;

$condicoesBase = ["p.loja_id = ?", "DATE(p.criado_em) BETWEEN ? AND ?"];
$paramsBase = [$lojaId, $inicio, $fim];

if ($tipoFiltro !== '') {
  $condicoesBase[] = 'p.tipo = ?';
  $paramsBase[] = $tipoFiltro;
}
if ($pagamentoFiltro !== '') {
  $condicoesBase[] = 'p.forma_pagamento = ?';
  $paramsBase[] = $pagamentoFiltro;
}

$condicoesRelatorio = $condicoesBase;
$paramsRelatorio = $paramsBase;
if ($statusFiltro && $statusFiltro !== 'todos' && $statusFiltro !== 'cancelado') {
  $condicoesRelatorio[] = 'p.status = ?';
  $paramsRelatorio[] = $statusFiltro;
}
$condicoesRelatorio[] = "p.status <> 'cancelado'";
$whereRelatorio = 'WHERE ' . implode(' AND ', $condicoesRelatorio);

$condicoesTabela = $condicoesBase;
$paramsTabela = $paramsBase;
if ($statusFiltro && $statusFiltro !== 'todos') {
  $condicoesTabela[] = 'p.status = ?';
  $paramsTabela[] = $statusFiltro;
}
$whereTabela = 'WHERE ' . implode(' AND ', $condicoesTabela);

$condicoesCancelados = $condicoesBase;
$paramsCancelados = array_merge($paramsBase, ['cancelado']);
$condicoesCancelados[] = 'p.status = ?';
$whereCancelados = 'WHERE ' . implode(' AND ', $condicoesCancelados);

$stmt = $conn->prepare("
  SELECT COUNT(*) AS total_pedidos,
         COALESCE(SUM(p.total), 0) AS faturamento,
         COALESCE(SUM(p.taxa_entrega), 0) AS taxa_entrega
  FROM pedidos p
  $whereRelatorio
");
$stmt->execute($paramsRelatorio);
$resumo = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
$totalPedidos = (int) ($resumo['total_pedidos'] ?? 0);
$faturamento = (float) ($resumo['faturamento'] ?? 0);
$ticketMedio = $totalPedidos > 0 ? $faturamento / $totalPedidos : 0;
$taxaEntregaTotal = (float) ($resumo['taxa_entrega'] ?? 0);

$stmt = $conn->prepare("
  SELECT COUNT(*) AS total_cancelados
  FROM pedidos p
  $whereCancelados
");
$stmt->execute($paramsCancelados);
$canceladosTotal = (int) $stmt->fetchColumn();

$stmt = $conn->prepare("
  SELECT COUNT(*) AS total_pedidos
  FROM pedidos p
  $whereTabela
");
$stmt->execute($paramsTabela);
$totalPedidosTabela = (int) $stmt->fetchColumn();

$paginas = max(1, (int) ceil($totalPedidosTabela / $limite));
if ($pagina > $paginas) {
  $pagina = $paginas;
}
$offset = ($pagina - 1) * $limite;

$relCols = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
$selAgendRel    = in_array('agendamento', $relCols)      ? ', p.agendamento'      : ', NULL AS agendamento';
$selTipoAgRel   = in_array('tipo_agendamento', $relCols) ? ', p.tipo_agendamento' : ', NULL AS tipo_agendamento';

/* sequência zerada */
require_once __DIR__ . '/../helpers/pedido_codigo.php';
$relCodigoBase = getPedidoCodigoBase($conn, $lojaId);
$selCodigoRel  = $relCodigoBase > 0
  ? ", IF(p.id > {$relCodigoBase}, p.id - {$relCodigoBase}, p.id) AS codigo_display"
  : ", p.id AS codigo_display";

$stmt = $conn->prepare("
  SELECT p.id, p.total, p.status, p.tipo, p.forma_pagamento, p.criado_em,
         c.nome AS cliente {$selAgendRel} {$selTipoAgRel} {$selCodigoRel}
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  $whereTabela
  ORDER BY p.criado_em DESC
  LIMIT $limite OFFSET $offset
");
$stmt->execute($paramsTabela);
$pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

function mapStatus($status){
  $map = [
    'pendente' => ['label' => 'Pendente', 'class' => 'pendente'],
    'aceito' => ['label' => 'Aceito', 'class' => 'aceito'],
    'preparando' => ['label' => 'Em preparo', 'class' => 'preparando'],
    'entrega' => ['label' => 'Em entrega', 'class' => 'entrega'],
    'finalizado' => ['label' => 'Finalizado', 'class' => 'finalizado'],
    'cancelado' => ['label' => 'Cancelado', 'class' => 'cancelado']
  ];
  return $map[$status] ?? ['label' => ucfirst($status), 'class' => 'pendente'];
}

function mapPagamento($forma){
  $map = [
    'pix' => ['label' => 'Transferencia Pix', 'class' => 'pix'],
    'dinheiro' => ['label' => 'Dinheiro', 'class' => 'dinheiro'],
    'credito' => ['label' => 'Cartao de credito', 'class' => 'credito'],
    'debito' => ['label' => 'Cartao de debito', 'class' => 'debito']
  ];
  return $map[$forma] ?? ['label' => $forma ?: '-', 'class' => 'pix'];
}

function renderPaginacao($paginas, $pagina){
  $itens = [];
  if ($paginas <= 7) {
    for ($i = 1; $i <= $paginas; $i++) {
      $itens[] = $i;
    }
  } else {
    $itens[] = 1;
    if ($pagina > 3) {
      $itens[] = '...';
    }
    $inicio = max(2, $pagina - 1);
    $fim = min($paginas - 1, $pagina + 1);
    for ($i = $inicio; $i <= $fim; $i++) {
      $itens[] = $i;
    }
    if ($pagina < $paginas - 2) {
      $itens[] = '...';
    }
    $itens[] = $paginas;
  }
  return $itens;
}

function renderRelatorioBody($inicio, $fim, $totalPedidos, $faturamento, $ticketMedio, $taxaEntregaTotal, $canceladosTotal, $pedidos, $pagina, $paginas, $total, $limite){
  ?>
  <div class="relatorio-body-inner" data-pagina="<?= $pagina ?>">
    <div class="relatorio-section" id="sectionVendasDia">
      <div class="relatorio-section-head">
        <h2 class="relatorio-section-title">Resumo do periodo</h2>
        <span class="relatorio-section-sub"><?= htmlspecialchars($inicio) ?> ate <?= htmlspecialchars($fim) ?></span>
      </div>
      <div class="relatorio-kpis">
        <div class="relatorio-kpi">
          <div class="relatorio-kpi-label">Total vendido</div>
          <div class="relatorio-kpi-value" id="kpiFaturamento">R$ <?= number_format($faturamento, 2, ',', '.') ?></div>
        </div>
        <div class="relatorio-kpi">
          <div class="relatorio-kpi-label">Media de valor por transacao</div>
          <div class="relatorio-kpi-value" id="kpiTicket">R$ <?= number_format($ticketMedio, 2, ',', '.') ?></div>
        </div>
        <div class="relatorio-kpi">
          <div class="relatorio-kpi-label">Quantidade de pedidos</div>
          <div class="relatorio-kpi-value" id="kpiPedidos"><?= $totalPedidos ?></div>
        </div>
        <div class="relatorio-kpi">
          <div class="relatorio-kpi-label">Taxas de entrega</div>
          <div class="relatorio-kpi-value" id="kpiTaxaEntrega">R$ <?= number_format($taxaEntregaTotal, 2, ',', '.') ?></div>
        </div>
        <div class="relatorio-kpi">
          <div class="relatorio-kpi-label">Pedidos cancelados</div>
          <div class="relatorio-kpi-value" id="kpiCancelados"><?= $canceladosTotal ?></div>
        </div>
      </div>
      <div class="relatorio-payments-grid">
        <div class="relatorio-payment-card" data-pay="pix">
          <div class="relatorio-payment-head">
            <div class="relatorio-payment-icon"><i class="bi bi-qr-code"></i></div>
            <div class="relatorio-payment-title">Pix</div>
          </div>
          <div class="relatorio-payment-value" id="kpiPix">R$ 0,00</div>
        </div>
        <div class="relatorio-payment-card" data-pay="credito">
          <div class="relatorio-payment-head">
            <div class="relatorio-payment-icon"><i class="bi bi-credit-card-2-front"></i></div>
            <div class="relatorio-payment-title">Cartao de credito</div>
          </div>
          <div class="relatorio-payment-value" id="kpiCredito">R$ 0,00</div>
        </div>
        <div class="relatorio-payment-card" data-pay="debito">
          <div class="relatorio-payment-head">
            <div class="relatorio-payment-icon"><i class="bi bi-credit-card"></i></div>
            <div class="relatorio-payment-title">Cartao de debito</div>
          </div>
          <div class="relatorio-payment-value" id="kpiDebito">R$ 0,00</div>
        </div>
        <div class="relatorio-payment-card" data-pay="dinheiro">
          <div class="relatorio-payment-head">
            <div class="relatorio-payment-icon"><i class="bi bi-cash-stack"></i></div>
            <div class="relatorio-payment-title">Dinheiro</div>
          </div>
          <div class="relatorio-payment-value" id="kpiDinheiro">R$ 0,00</div>
        </div>
      </div>
    </div>

    

    <div class="relatorio-section" id="sectionVendasPagamento">
      <div class="relatorio-section-head">
        <h2 class="relatorio-section-title">Vendas por produto</h2>
      </div>
      <div class="relatorio-mini-grid" id="vendasProdutosCards">
        <div class="relatorio-mini-card">Carregando...</div>
      </div>
    </div>

    <div class="relatorio-section">
      <div class="relatorio-section-head">
        <h2 class="relatorio-section-title">Vendas por meio de pagamento</h2>
      </div>
      <div class="relatorio-mini-grid" id="vendasPagamentoCards">
        <div class="relatorio-mini-card">Carregando...</div>
      </div>
    </div>

    <div class="relatorio-section relatorio-split">
      <div class="relatorio-card p-3" id="cardProdutosTop">
        <div class="relatorio-card-title">Produtos mais vendidos</div>
        <div class="relatorio-chart-wrap">
          <canvas id="chartProdutos" height="180"></canvas>
        </div>
      </div>
      <div class="relatorio-card p-3" id="cardClientesTop">
        <div class="relatorio-card-title">Melhores clientes</div>
        <div class="relatorio-chart-wrap">
          <canvas id="chartClientes" height="180"></canvas>
        </div>
      </div>
    </div>

    <div class="relatorio-section">
      <div class="relatorio-section-head">
        <h2 class="relatorio-section-title">Pedidos</h2>
        <span class="relatorio-section-sub">Ultimos pedidos filtrados</span>
      </div>
      <div class="relatorio-table-card">
        <div class="rc-table-wrap">
          <table class="relatorio-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th>Tipo</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <?php if (!$pedidos): ?>
                <tr>
                  <td colspan="7" class="text-center text-muted py-4">Nenhum pedido encontrado</td>
                </tr>
              <?php endif; ?>
              <?php foreach ($pedidos as $p): ?>
                <?php
                  $statusInfo = mapStatus($p['status'] ?? '');
                  $pagamentoInfo = mapPagamento($p['forma_pagamento'] ?? '');
                  $tipoAgend = $p['tipo_agendamento'] ?? '';
                  $isAgendado = in_array($tipoAgend, ['entrega_agendada','retirada_agendada']);
                  $tipoLabel = $isAgendado
                    ? ($tipoAgend === 'entrega_agendada' ? 'Entrega Agendada' : 'Retirada Agendada')
                    : (($p['tipo'] ?? '') === 'entrega' ? 'Entrega' : 'Retirada');
                  $tipoClass = ($p['tipo'] ?? '') === 'entrega' ? 'entrega' : 'retirada';
                  /* formatar agendamento para exibição */
                  $agendLabel = '';
                  if ($isAgendado && !empty($p['agendamento'])) {
                    $parts = explode(' ', $p['agendamento']);
                    $dateParts = explode('-', $parts[0] ?? '');
                    if (count($dateParts) === 3) $agendLabel = "{$dateParts[2]}/{$dateParts[1]} " . substr($parts[1] ?? '', 0, 5);
                  }
                ?>
                <tr class="relatorio-row" data-pedido-id="<?= $p['id'] ?>">
                  <td>#<?= htmlspecialchars((string)($p['codigo_display'] ?? $p['id'])) ?></td>
                  <td><?= htmlspecialchars($p['cliente']) ?></td>
                  <td><?= date('d/m/Y H:i', strtotime($p['criado_em'])) ?></td>
                  <td>
                    <span class="badge-pill badge-pay <?= $pagamentoInfo['class'] ?>">
                      <?= htmlspecialchars($pagamentoInfo['label']) ?>
                    </span>
                  </td>
                  <td>
                    <span class="badge-pill badge-status <?= $statusInfo['class'] ?>">
                      <?= htmlspecialchars($statusInfo['label']) ?>
                    </span>
                  </td>
                  <td>
                    <span class="badge-pill badge-tipo <?= $tipoClass ?>">
                      <?= $tipoLabel ?>
                    </span>
                    <?php if ($agendLabel): ?>
                      <span class="badge-pill" style="background:#ede9fe;color:#5b21b6;font-size:.65rem;margin-left:3px">
                        <i class="bi bi-calendar-event"></i> <?= htmlspecialchars($agendLabel) ?>
                      </span>
                    <?php endif; ?>
                  </td>
                  <td>R$ <?= number_format($p['total'], 2, ',', '.') ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>

        <?php
          $ini = ($pagina - 1) * $limite + 1;
          $fim_pag = min($pagina * $limite, $total);
        ?>
        <div class="rc-footer">
          <div class="rc-per-page">
            Itens por página:
            <select id="relLimiteSelect">
              <option value="10" <?= $limite === 10 ? 'selected' : '' ?>>10</option>
              <option value="20" <?= $limite === 20 ? 'selected' : '' ?>>20</option>
              <option value="50" <?= $limite === 50 ? 'selected' : '' ?>>50</option>
            </select>
          </div>
          <div class="rc-info">Mostrando <?= $ini ?> a <?= $fim_pag ?> de <?= $total ?> pedidos</div>
          <div class="rc-pagination">
            <button class="rc-page-btn" type="button" data-page="1" <?= $pagina <= 1 ? 'disabled' : '' ?>>«</button>
            <button class="rc-page-btn" type="button" data-page="<?= max(1, $pagina - 1) ?>" <?= $pagina <= 1 ? 'disabled' : '' ?>>‹</button>
            <span class="rc-page-label">Página <?= $pagina ?> de <?= $paginas ?></span>
            <button class="rc-page-btn" type="button" data-page="<?= min($paginas, $pagina + 1) ?>" <?= $pagina >= $paginas ? 'disabled' : '' ?>>›</button>
            <button class="rc-page-btn" type="button" data-page="<?= $paginas ?>" <?= $pagina >= $paginas ? 'disabled' : '' ?>>»</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <?php
}

if (isset($_GET['ajax']) && $_GET['ajax'] === '1') {
  renderRelatorioBody($inicio, $fim, $totalPedidos, $faturamento, $ticketMedio, $taxaEntregaTotal, $canceladosTotal, $pedidos, $pagina, $paginas, $totalPedidosTabela, $limite);
  exit;
}

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$relatoriosCssVer = filemtime(__DIR__ . '/assets/css/relatorios.css');
$relatoriosJsVer = filemtime(__DIR__ . '/assets/js/relatorios.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatorio de vendas</title>
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

<link href="./assets/css/relatorios.css?v=<?= $relatoriosCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy">
<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid relatorio-page">
  <div class="relatorio-header">
    <div>
      <h1 class="relatorio-title">Relatorio de vendas</h1>
      <p class="relatorio-subtitle">Acompanhe o resumo e os pedidos do periodo.</p>
    </div>
    <div class="relatorio-actions">
      <a class="btn btn-Lilly-ghost" id="btnExportCsv" href="api/relatorios_export_csv.php?inicio=<?= $inicio ?>&fim=<?= $fim ?>">
        Exportar Excel
      </a>
      <a class="btn btn-Lilly-primary" id="btnExportPdf" href="api/relatorios_export_pdf.php?inicio=<?= $inicio ?>&fim=<?= $fim ?>">
        Exportar PDF
      </a>
    </div>
  </div>

  <div class="relatorio-filter-card">
    <div class="relatorio-filter-head">
      <h3 class="relatorio-filter-title">Filtros</h3>
    </div>
    <form id="formFiltro" class="relatorio-filters" method="get" action="relatorios.php">
      <div class="relatorio-filter-grid">
        <div class="relatorio-filter-field">
          <label for="tipoSelect">Tipo do pedido</label>
          <select id="tipoSelect" name="tipo" class="form-select">
            <option value="" <?= $tipoFiltro === '' ? 'selected' : '' ?>>Todos</option>
            <option value="entrega" <?= $tipoFiltro === 'entrega' ? 'selected' : '' ?>>Entrega</option>
            <option value="retirada" <?= $tipoFiltro === 'retirada' ? 'selected' : '' ?>>Retirada</option>
          </select>
        </div>
        <div class="relatorio-filter-field">
          <label for="periodoSelect">Escolher periodo de visualizacao</label>
          <select id="periodoSelect" name="periodo" class="form-select">
            <option value="customizado" <?= $periodoFiltro === 'customizado' ? 'selected' : '' ?>>Customizado</option>
            <option value="hoje" <?= $periodoFiltro === 'hoje' ? 'selected' : '' ?>>Hoje</option>
            <option value="7dias" <?= $periodoFiltro === '7dias' ? 'selected' : '' ?>>Ultimos 7 dias</option>
            <option value="30dias" <?= $periodoFiltro === '30dias' ? 'selected' : '' ?>>Ultimos 30 dias</option>
          </select>
        </div>
      </div>
      <div class="relatorio-filter-range" id="rangePeriodo">
        <label for="dataInicio">Escolha um periodo</label>
        <div class="relatorio-range-input">
          <input type="text" class="js-flatpickr" id="dataInicio" name="inicio" value="<?= $periodoFiltro === 'customizado' ? htmlspecialchars($inicioParam ?: $inicio) : '' ?>" placeholder="Inicio">
          <span class="relatorio-range-sep">-</span>
          <input type="text" class="js-flatpickr" id="dataFim" name="fim" value="<?= $periodoFiltro === 'customizado' ? htmlspecialchars($fimParam ?: $fim) : '' ?>" placeholder="Fim">
          <button class="relatorio-range-btn" type="button" id="btnRangeCalendar" aria-label="Calendario">
            <i class="bi bi-calendar"></i>
          </button>
        </div>
        <div class="relatorio-filter-hint">Para uma melhor visualizacao das datas e horarios, clique no icone de calendario.</div>
      </div>
    </form>
  </div>

  <div id="relatorioBody" class="relatorio-body">
    <?php renderRelatorioBody($inicio, $fim, $totalPedidos, $faturamento, $ticketMedio, $taxaEntregaTotal, $canceladosTotal, $pedidos, $pagina, $paginas, $totalPedidosTabela, $limite); ?>
  </div>

  <div class="dash-footer">Cardápio Digital Lilly (c) 2026</div>
</div>

</main>
</div>
  <div class="modal fade" id="modalPedidoDetalhe" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
      <div class="modal-content pedido-detalhe-modal">
      <div class="modal-header">
        <div class="pedido-detalhe-header w-100">
          <h5 id="pedidoDetalheNumero">Pedido N. -</h5>
          <div class="pedido-detalhe-actions">
            <a class="btn btn-outline-secondary btn-sm" href="#" id="pedidoDetalheEditar" target="_blank">
              <i class="bi bi-pencil"></i> Editar pedido
            </a>
            <button class="btn btn-outline-secondary btn-sm" type="button" id="pedidoDetalheImprimir">
              <i class="bi bi-printer"></i> Imprimir
            </button>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div class="pedido-detalhe-tempo" id="pedidoDetalheTempo">feito ha -</div>

          <div class="pedido-detalhe-grid">
            <div class="pedido-detalhe-item">
              <span class="label-strong"><i class="bi bi-calendar-event"></i> Horario do pedido</span>
              <strong id="pedidoDetalheHorario">-</strong>
            </div>
            <div class="pedido-detalhe-item">
              <span class="label-strong"><i class="bi bi-display"></i> Status do pedido</span>
              <strong class="pedido-detalhe-status" id="pedidoDetalheStatus">-</strong>
            </div>
            <div class="pedido-detalhe-item">
              <span class="label-strong"><i class="bi bi-person"></i> Nome do cliente</span>
              <strong id="pedidoDetalheCliente">-</strong>
            </div>
            <div class="pedido-detalhe-item">
              <span class="label-strong"><i class="bi bi-telephone"></i> Telefone</span>
              <strong id="pedidoDetalheTelefone">-</strong>
            </div>
          </div>

        <div class="pedido-detalhe-actions-row">
          <a class="btn btn-outline-secondary btn-sm" href="#" id="pedidoDetalheContato">
            <i class="bi bi-telephone"></i> Entrar em contato com o cliente
          </a>
          <a class="btn btn-outline-secondary btn-sm" href="#" id="pedidoDetalheWhatsapp" target="_blank">
            <i class="bi bi-whatsapp"></i> Enviar pedido ao WhatsApp
          </a>
        </div>

          <div class="pedido-detalhe-client-stats" id="pedidoDetalheStatsWrap">
            <div class="pedido-detalhe-client-grid">
              <div class="pedido-detalhe-client-metric">
                <i class="bi bi-receipt"></i>
                <div>
                  <span>Pedidos feitos</span>
                  <strong id="pedidoDetalhePedidosFeitos">0</strong>
                </div>
              </div>
              <div class="pedido-detalhe-client-metric">
                <i class="bi bi-bag-check"></i>
                <div>
                  <span>Ticket medio</span>
                  <strong id="pedidoDetalheTicketMedio">R$ 0,00</strong>
                </div>
              </div>
              <div class="pedido-detalhe-client-metric" id="pedidoDetalhePontosMetric">
                <i class="bi bi-star"></i>
                <div>
                  <span>Pontos</span>
                  <strong id="pedidoDetalhePontos">0</strong>
                </div>
              </div>
              <div class="pedido-detalhe-client-metric" id="pedidoDetalheCashbackMetric">
                <i class="bi bi-cash-coin"></i>
                <div>
                  <span>Cashback</span>
                  <strong id="pedidoDetalheCashbackTotal">R$ 0,00</strong>
                  <small class="pedido-detalhe-client-expira d-none" id="pedidoDetalheCashbackExpira">Expira em -</small>
                </div>
              </div>
            </div>
            <button type="button" class="pedido-detalhe-client-action" id="pedidoDetalheVerCliente">
              Ver mais sobre o cliente
            </button>
            <div class="pedido-detalhe-client-expirado d-none" id="pedidoDetalheCashbackExpirado">Cashback expirado</div>
          </div>

          <div class="pedido-detalhe-section">
            <div class="pedido-detalhe-section-title" id="pedidoDetalheTipoTitulo">ENTREGA</div>
            <div class="pedido-detalhe-item" id="pedidoDetalheEnderecoWrap">
              <span>Endereco</span>
              <strong id="pedidoDetalheEndereco">-</strong>
            </div>
          <div class="pedido-detalhe-item" id="pedidoDetalheTaxaWrap">
            <span>Taxa de entrega</span>
            <strong id="pedidoDetalheTaxa">R$ 0,00</strong>
          </div>
          <div class="pedido-detalhe-section-links" id="pedidoDetalheEntregaLinks">
            <button type="button" id="pedidoDetalheCopiarEndereco">Copiar endereco</button>
            <button type="button" id="pedidoDetalheVincularEntregador">Vincular entregador</button>
          </div>
        </div>

          <div class="pedido-detalhe-section">
            <div class="pedido-detalhe-section-title outro">Pagamento</div>
            <div class="pedido-detalhe-pagamentos" id="pedidoDetalhePagamentos">-</div>
          </div>

          <div class="pedido-detalhe-section">
            <div class="pedido-detalhe-section-title outro">Resumo do pedido</div>
            <div class="pedido-detalhe-itens" id="pedidoDetalheItens"></div>
            <div class="pedido-detalhe-totais">
              <div class="pedido-detalhe-total-strong"><span>Subtotal</span><strong id="pedidoDetalheSubtotal">R$ 0,00</strong></div>
              <div id="pedidoDetalheLinhaDesconto"><span>Desconto</span><strong id="pedidoDetalheDesconto">R$ 0,00</strong></div>
              <div id="pedidoDetalheLinhaTaxa"><span>Taxa de entrega</span><strong id="pedidoDetalheTaxaResumo">R$ 0,00</strong></div>
              <div id="pedidoDetalheLinhaMaquininha"><span>Taxa maquininha</span><strong id="pedidoDetalheMaquininha">R$ 0,00</strong></div>
              <div id="pedidoDetalheLinhaCashback" class="pedido-detalhe-total-strong"><span>Cashback</span><strong id="pedidoDetalheCashback">R$ 0,00</strong></div>
              <div class="pedido-detalhe-total-strong"><span>Total</span><strong id="pedidoDetalheTotal">R$ 0,00</strong></div>
            </div>
          </div>
      </div>
      <div class="modal-footer pedido-detalhe-footer">
        <button class="btn btn-outline-secondary" type="button" id="pedidoDetalheCancelar">Cancelar pedido</button>
        <button class="btn btn-primary" type="button" id="pedidoDetalheFinalizar">Mover para finalizado</button>
      </div>
    </div>
  </div>

  <div class="modal fade" id="modalClientePerfil" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header" style="border:0;padding:14px 16px 0;">
          <div class="cliente-perfil-header w-100">
            <div class="cliente-perfil-avatar" id="clientePerfilAvatar">C</div>
            <div>
              <div class="cliente-perfil-nome" id="clientePerfilNome">Cliente</div>
              <div class="cliente-perfil-desde" id="clientePerfilDesde">Cliente desde: -</div>
            </div>
            <button class="btn-close ms-auto" data-bs-dismiss="modal"></button>
          </div>
        </div>
        <div class="modal-body">
          <div class="cliente-perfil-tabs" id="clientePerfilTabs">
            <button class="cliente-tab active" type="button" data-tab="perfil"><i class="bi bi-person"></i> Perfil</button>
            <button class="cliente-tab" type="button" data-tab="pedidos"><i class="bi bi-receipt"></i> Pedidos</button>
            <button class="cliente-tab" type="button" data-tab="avaliacoes"><i class="bi bi-star"></i> Avaliacoes</button>
            <button class="cliente-tab" type="button" data-tab="pontos"><i class="bi bi-gift"></i> Historico de pontos</button>
          </div>

          <div class="cliente-tab-content active" data-tab-pane="perfil">
            <div class="cliente-perfil-grid">
              <div class="cliente-perfil-card">
                <i class="bi bi-cash-coin"></i>
                <div>
                  <strong id="clientePerfilCashback">R$ 0,00</strong>
                  <span>cashback acumulado</span>
                  <div class="cliente-perfil-expira d-none" id="clientePerfilCashbackExpira">Expira em -</div>
                  <div class="cliente-perfil-expirado d-none" id="clientePerfilCashbackExpirado">Cashback expirado</div>
                </div>
              </div>
              <div class="cliente-perfil-card">
                <i class="bi bi-calendar-event"></i>
                <div>
                  <strong id="clientePerfilPontos">Sem dados</strong>
                  <span>pontos</span>
                </div>
              </div>
              <div class="cliente-perfil-card">
                <i class="bi bi-wallet2"></i>
                <div>
                  <strong id="clientePerfilFiado">R$ 0,00</strong>
                  <span>saldo fiado</span>
                </div>
              </div>
              <div class="cliente-perfil-card">
                <i class="bi bi-bag-check"></i>
                <div>
                  <strong id="clientePerfilTicket">R$ 0,00</strong>
                  <span>ticket medio</span>
                </div>
              </div>
              <div class="cliente-perfil-card">
                <i class="bi bi-calendar2-week"></i>
                <div>
                  <strong id="clientePerfilUltimoPedido">-</strong>
                  <span>ultimo pedido</span>
                </div>
              </div>
              <div class="cliente-perfil-card">
                <i class="bi bi-list-check"></i>
                <div>
                  <strong id="clientePerfilPedidos">0</strong>
                  <span>pedidos feitos</span>
                </div>
              </div>
            </div>

            <div class="cliente-perfil-info">
              <h6>Informacoes pessoais</h6>
              <div class="info-item">
                Telefone
                <strong id="clientePerfilTelefone">-</strong>
              </div>
              <div class="info-item">
                Endereco
                <strong id="clientePerfilEndereco">-</strong>
              </div>
            </div>

            <div class="cliente-perfil-footer">
              <button class="btn btn-outline-secondary" type="button" id="clientePerfilRegistrarFiado">Registrar fiado</button>
              <button class="btn btn-primary" type="button" id="clientePerfilEditar">Editar cliente</button>
            </div>
          </div>

          <div class="cliente-tab-content" data-tab-pane="pedidos">
            <div class="cliente-pedidos">
              <div class="cliente-pedidos-title">Pedidos feitos pelo cliente</div>
              <div class="cliente-pedidos-filtros">
                <div class="cliente-pedidos-filtro">
                  <label for="clientePedidosPeriodo">Periodo dos pedidos</label>
                  <select id="clientePedidosPeriodo">
                    <option value="7">7 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30" selected>30 dias</option>
                    <option value="60">60 dias</option>
                  </select>
                </div>
                <div class="cliente-pedidos-filtro">
                  <label for="clientePedidosTipo">Tipo do pedido</label>
                  <select id="clientePedidosTipo">
                    <option value="todos" selected>Todos os tipos</option>
                    <option value="entrega">Entrega</option>
                    <option value="retirada">Retirada</option>
                    <option value="mesa">Mesa</option>
                  </select>
                </div>
              </div>
              <div id="clientePedidosLista"></div>
              <div class="cliente-pedidos-pagination" id="clientePedidosPaginacao"></div>
            </div>
          </div>

          <div class="cliente-tab-content" data-tab-pane="avaliacoes">
            <div class="cliente-pedidos-title">Avaliacoes feitas pelo cliente</div>
            <div class="cliente-avaliacoes-box">
              <i class="bi bi-chat-dots"></i>
              <span>Este cliente ainda nao deixou nenhuma avaliacao.</span>
            </div>
          </div>

        <div class="cliente-tab-content" data-tab-pane="pontos">
          <div class="cliente-pedidos">
            <div class="cliente-pedidos-title">Historico de pontos</div>
            <div id="clientePontosLista"></div>
            <div class="cliente-pedidos-pagination" id="clientePontosPaginacao"></div>
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade clientes-modal" id="modalClienteEdit" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Criar cliente</h5>
          <button class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body clientes-modal-body">
          <input type="hidden" id="clienteEditId">
          <div class="clientes-modal-section">
            <h6>Dados do cliente</h6>
            <div class="mb-3">
              <label class="form-label">Nome do cliente *</label>
              <input type="text" class="form-control" id="clienteEditNome" placeholder="Ex.: Felipe">
              <div class="invalid-feedback" id="clienteEditNomeErro"></div>
            </div>
            <div class="mb-3">
              <label class="form-label">Numero de contato *</label>
              <input type="text" class="form-control" id="clienteEditTelefone" placeholder="Ex.: (11) 9 3232-5454">
              <div class="invalid-feedback" id="clienteEditTelefoneErro"></div>
            </div>
            <div class="mb-3">
              <label class="form-label">Aniversario do cliente</label>
              <input type="date" class="form-control" id="clienteEditAniversario">
            </div>
          </div>

          <div class="clientes-modal-section">
            <h6>Endereco</h6>
            <div class="mb-3">
              <label class="form-label">CEP</label>
              <input type="text" class="form-control" id="clienteEditCep" placeholder="Ex.: 00000-000">
            </div>
            <div class="row g-2 mb-3">
              <div class="col-8">
                <label class="form-label">Rua</label>
                <input type="text" class="form-control" id="clienteEditRua" placeholder="Ex.: Santa Efigenia">
              </div>
              <div class="col-4">
                <label class="form-label">Numero</label>
                <input type="text" class="form-control" id="clienteEditNumero" placeholder="Ex.: 123">
              </div>
            </div>
            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label">Bairro</label>
                <input type="text" class="form-control" id="clienteEditBairro" placeholder="Bairro">
              </div>
              <div class="col-6">
                <label class="form-label">Cidade</label>
                <input type="text" class="form-control" id="clienteEditCidade" placeholder="Cidade">
              </div>
            </div>
            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label">Estado</label>
                <input type="text" class="form-control" id="clienteEditEstado" placeholder="Estado">
              </div>
              <div class="col-6">
                <label class="form-label">Complemento</label>
                <input type="text" class="form-control" id="clienteEditComplemento" placeholder="Complemento">
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer border-0">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button class="btn btn-primary" id="clienteEditSalvar">Salvar</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL AVISO (substitui alert() nativo) -->
<div class="modal fade" id="modalAvisoGestor" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content rounded-4 p-4 text-center border-0 shadow">
      <div class="mb-3" style="font-size:36px"><i class="bi bi-exclamation-triangle-fill" style="color:#f59e0b"></i></div>
      <h5 class="mb-2 fw-bold" id="modalAvisoGestorTitulo">Aviso</h5>
      <p class="text-muted mb-4" id="modalAvisoGestorMsg">—</p>
      <button class="btn btn-dark rounded-3 w-100 py-2" data-bs-dismiss="modal">Entendi</button>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/pt.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script>
const RELATORIOS_DATA = <?= json_encode(['paginaAtual' => (int)$pagina, 'podeGerenciarPedidos' => in_array($perfil, ['admin', 'gerente'], true)]) ?>;
</script>
<script src="./assets/js/relatorios.js?v=<?= $relatoriosJsVer ?>"></script>

</body>
</html>
