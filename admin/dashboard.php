<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/pedidos_competencia.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$tzDashboard = new DateTimeZone('America/Fortaleza');
$agoraDashboard = new DateTimeImmutable('now', $tzDashboard);
$inicioMesAtual = $agoraDashboard->modify('first day of this month')->format('Y-m-d');
$fimMesAtual = $agoraDashboard->modify('last day of this month')->format('Y-m-d');
$faixaReceitaMesAtual = $agoraDashboard->modify('first day of this month')->format('d/m') . ' a ' . $agoraDashboard->modify('last day of this month')->format('d/m');

$periodo = (int) ($_GET['periodo'] ?? 7);
$periodo = in_array($periodo, [7, 15, 30], true) ? $periodo : 7;

$inicioPeriodo = (new DateTime())
  ->modify('-' . ($periodo - 1) . ' days')
  ->format('Y-m-d');

$competencia = pedidosCompetenciaConfig($conn, 'p', 'cx');
$joinCompetencia = $competencia['join'];
$campoDataCompetencia = $competencia['date_expr'];

$stmtSerie = $conn->prepare("
  SELECT {$campoDataCompetencia} AS dia,
         COUNT(*) AS total_pedidos,
         COALESCE(SUM(p.total), 0) AS total_valor
  FROM pedidos p
  {$joinCompetencia}
  WHERE {$campoDataCompetencia} >= ?
    AND p.status = 'finalizado'
    AND p.loja_id = ?
  GROUP BY {$campoDataCompetencia}
");
$stmtSerie->execute([$inicioPeriodo, $lojaId]);
$serieRaw = $stmtSerie->fetchAll(PDO::FETCH_ASSOC);

$mapPedidos = [];
$mapValores = [];
foreach ($serieRaw as $row) {
  $mapPedidos[$row['dia']] = (int) $row['total_pedidos'];
  $mapValores[$row['dia']] = (float) $row['total_valor'];
}

$labels = [];
$seriePedidos = [];
$serieValores = [];
$dataCursor = new DateTime($inicioPeriodo);
for ($i = 0; $i < $periodo; $i++) {
  $dia = $dataCursor->format('Y-m-d');
  $labels[] = $dataCursor->format('d/m');
  $seriePedidos[] = $mapPedidos[$dia] ?? 0;
  $serieValores[] = round($mapValores[$dia] ?? 0, 2);
  $dataCursor->modify('+1 day');
}

$stmtTotais = $conn->prepare("
  SELECT COUNT(*) AS total_pedidos,
         COALESCE(SUM(p.total), 0) AS total_receita
  FROM pedidos p
  {$joinCompetencia}
  WHERE {$campoDataCompetencia} >= ?
    AND p.status = 'finalizado'
    AND p.loja_id = ?
");
$stmtTotais->execute([$inicioPeriodo, $lojaId]);
$totais = $stmtTotais->fetch(PDO::FETCH_ASSOC);

$totalPedidosPeriodo = (int) ($totais['total_pedidos'] ?? 0);
$totalReceitaPeriodo = (float) ($totais['total_receita'] ?? 0);

$stmtReceitaMesAtual = $conn->prepare("
  SELECT COALESCE(SUM(p.total), 0) AS total_receita_mes
  FROM pedidos p
  {$joinCompetencia}
  WHERE {$campoDataCompetencia} >= ?
    AND {$campoDataCompetencia} <= ?
    AND p.status = 'finalizado'
    AND p.loja_id = ?
");
$stmtReceitaMesAtual->execute([$inicioMesAtual, $fimMesAtual, $lojaId]);
$totalReceitaMesAtual = (float) $stmtReceitaMesAtual->fetchColumn();

/* Acessos ao cardápio: contagem real de visitas na loja (mês atual) */
$acessosMenu = 0;
try {
  $stmtAc = $conn->prepare("SHOW TABLES LIKE 'loja_eventos'");
  $stmtAc->execute();
  if ($stmtAc->fetchColumn()) {
    $stmtAc = $conn->prepare("
      SELECT COUNT(*) FROM loja_eventos
      WHERE loja_id = ? AND tipo = 'visita'
        AND criado_em >= ? AND criado_em <= ?
    ");
    $stmtAc->execute([$lojaId, $inicioMesAtual, $fimMesAtual]);
    $acessosMenu = (int)$stmtAc->fetchColumn();
  }
} catch (Exception $e) { $acessosMenu = 0; }
$totalClientes = 0;
try {
  $stmtClientes = $conn->prepare("SELECT COUNT(*) FROM clientes WHERE loja_id = ?");
  $stmtClientes->execute([$lojaId]);
  $totalClientes = (int) $stmtClientes->fetchColumn();
} catch (Exception $e) {
  $totalClientes = 0;
}
$_linkLojaRaw  = config($conn, 'link_loja', '');
$_protocol     = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$_host         = $_SERVER['HTTP_HOST'] ?? 'localhost';
$_linkLojaBase = $_protocol . $_host . '/';
$_linkLojaBaseAntigo = $_protocol . $_host . '/lilly/';
// Extrai o slug do valor salvo (suporta o formato antigo /lilly/slug e os anteriores)
if (strpos($_linkLojaRaw, $_linkLojaBaseAntigo) === 0) {
  $_slug = urldecode(substr($_linkLojaRaw, strlen($_linkLojaBaseAntigo)));
} elseif (preg_match('#[?&]loja=([^&]+)#', $_linkLojaRaw, $_m)) {
  $_slug = urldecode($_m[1]);
} elseif (preg_match('#/([^/?]+)/?$#', $_linkLojaRaw, $_m)) {
  $_slug = $_m[1];
} else {
  $_slug = $_linkLojaRaw;
}
$_slug = preg_replace('/\.php$/i', '', $_slug);
$linkLoja = $_slug !== '' ? $_linkLojaBase . $_slug : '';
$versiculoCache = config($conn, 'versiculo_dia_texto', '');
$versiculoRefCache = config($conn, 'versiculo_dia_ref', '');
$versiculoDataCache = config($conn, 'versiculo_dia_data', '');
$versiculoCacheLower = function_exists('mb_strtolower') ? mb_strtolower($versiculoCache) : strtolower($versiculoCache);
$versiculoInvalido = $versiculoCacheLower && (
  strpos($versiculoCacheLower, 'diariamente um novo versiculo') !== false
  || strpos($versiculoCacheLower, 'diariamente um novo versículo') !== false
  || strpos($versiculoCacheLower, 'versiculo diario') !== false
  || strpos($versiculoCacheLower, 'versiculo diário') !== false
  || strpos($versiculoCacheLower, 'descubra nosso versiculo diario') !== false
  || strpos($versiculoCacheLower, 'descubra nosso versículo diário') !== false
);
if ($versiculoInvalido) {
  $versiculoCache = '';
  $versiculoRefCache = '';
  $versiculoDataCache = '';
}

$lojaNome = config($conn, 'nome_loja', 'T&W Confeitaria');
$lojaVerificada = config($conn, 'loja_verificada', '0') === '1';
$_SESSION['loja_nome'] = $lojaNome;
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$dashboardHomeCssVer = filemtime(__DIR__ . '/assets/css/dashboard_home.css');
$dashboardHomeJsVer = filemtime(__DIR__ . '/assets/js/dashboard_home.js');
$suporteChatJsVer = filemtime(__DIR__ . '/assets/js/suporte_chat.js');

$topProdutos = [];
try {
  $pedidoCols = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
  $itensCols = $conn->query("SHOW COLUMNS FROM pedido_itens")->fetchAll(PDO::FETCH_COLUMN, 0);
  $produtoCols = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
  $estoqueCols = $conn->query("SHOW COLUMNS FROM estoque")->fetchAll(PDO::FETCH_COLUMN, 0);

  $temProdutoId = in_array('produto_id', $itensCols, true);
  $temLojaPedidos = in_array('loja_id', $pedidoCols, true);
  $temLojaItens = in_array('loja_id', $itensCols, true);
  $temLojaProdutos = in_array('loja_id', $produtoCols, true);
  $temLojaEstoque = in_array('loja_id', $estoqueCols, true);
  $temStatus = in_array('status', $pedidoCols, true);

  if ($temProdutoId) {
    $sql = "
      SELECT COALESCE(pr.id, i.produto_id) AS produto_id,
             COALESCE(pr.nome, i.produto_nome) AS nome,
             COALESCE(pr.preco, i.preco) AS valor,
             COALESCE(e.quantidade, 0) AS estoque,
             SUM(i.quantidade) AS saidas
      FROM pedido_itens i
      JOIN pedidos p ON p.id = i.pedido_id
      LEFT JOIN produtos pr ON (
        pr.id = NULLIF(i.produto_id, 0)
        OR ((i.produto_id IS NULL OR i.produto_id = 0) AND pr.nome = i.produto_nome)
      )" .
      ($temLojaProdutos ? " AND pr.loja_id = :loja" : "") . "
      LEFT JOIN estoque e ON e.produto_id = pr.id" .
      ($temLojaEstoque ? " AND e.loja_id = :loja" : "") . "
      WHERE 1=1" .
      ($temStatus ? " AND p.status = 'finalizado'" : "") .
      ($temLojaPedidos ? " AND p.loja_id = :loja" : "") .
      ($temLojaItens ? " AND i.loja_id = :loja" : "") . "
      GROUP BY produto_id, nome, valor, estoque
      ORDER BY saidas DESC
      LIMIT 5
    ";
    $stmtTop = $conn->prepare($sql);
    if ($temLojaPedidos || $temLojaItens || $temLojaProdutos || $temLojaEstoque) {
      $stmtTop->bindValue(':loja', $lojaId, PDO::PARAM_INT);
    }
    $stmtTop->execute();
    $topProdutos = $stmtTop->fetchAll(PDO::FETCH_ASSOC);
    } else {
      $sql = "
        SELECT i.produto_nome AS nome,
               MAX(i.preco) AS valor,
               SUM(i.quantidade) AS saidas,
               COALESCE(MAX(e.quantidade), 0) AS estoque
        FROM pedido_itens i
        JOIN pedidos p ON p.id = i.pedido_id
        LEFT JOIN produtos pr ON pr.nome = i.produto_nome" .
        ($temLojaProdutos ? " AND pr.loja_id = :loja" : "") . "
        LEFT JOIN estoque e ON e.produto_id = pr.id" .
        ($temLojaEstoque ? " AND e.loja_id = :loja" : "") . "
        WHERE 1=1" .
        ($temStatus ? " AND p.status = 'finalizado'" : "") .
        ($temLojaPedidos ? " AND p.loja_id = :loja" : "") .
        ($temLojaItens ? " AND i.loja_id = :loja" : "") . "
        GROUP BY i.produto_nome
        ORDER BY saidas DESC
        LIMIT 5
      ";
      $stmtTop = $conn->prepare($sql);
      if ($temLojaPedidos || $temLojaItens || $temLojaProdutos || $temLojaEstoque) {
        $stmtTop->bindValue(':loja', $lojaId, PDO::PARAM_INT);
      }
      $stmtTop->execute();
      $topProdutos = $stmtTop->fetchAll(PDO::FETCH_ASSOC);
    }
} catch (Exception $e) {
  $topProdutos = [];
}

?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Dashboard <?= htmlspecialchars($lojaNome) ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">


<link rel="shortcut icon" href="./assets/img/favicon_store.png?v=<?= $cssVer ?>">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png?v=<?= $cssVer ?>">
<link href="./assets/css/dashboard_home.css?v=<?= $dashboardHomeCssVer ?>" rel="stylesheet">

</head>
<body class="dash-diggy">
<?php include __DIR__ . '/partials/sidebar.php'; ?>

  <div class="dash-page">
    <div class="dash-hero">
      <div class="dash-hero-left">
        <button class="dash-menu-btn" onclick="toggleSidebar()" aria-label="Abrir menu">
          <i class="bi bi-list"></i>
        </button>
        <div>
          <div class="dash-hello">
            <?= htmlspecialchars($lojaNome) ?>
            <?php if ($lojaVerificada): ?>
              <i class="bi bi-patch-check-fill dash-hello-verified" title="Loja verificada"></i>
            <?php endif; ?>
          </div>
          <div class="dash-hello-sub">Dashboard</div>
        </div>
      </div>
      <!-- Busca de páginas -->
      <div class="dash-nav-search">
        <div class="dash-nav-search-wrap" id="dashNavSearchWrap">
          <div class="dash-nav-search-icon"><i class="bi bi-search"></i></div>
          <input class="dash-nav-search-input" id="dashNavSearchInput"
                 type="text" placeholder="Buscar página..." autocomplete="off">
        </div>
        <div class="dash-nav-search-dropdown" id="dashNavDropdown"></div>
      </div>

      <div class="dash-link">
        <label class="dash-link-label">Link da sua loja</label>
        <div class="dash-link-field">
          <input type="text" class="form-control" id="linkLojaInput" value="<?= htmlspecialchars($linkLoja) ?>" readonly placeholder="Configure o link em Configurações > Informações da loja">
          <button class="dash-link-btn" type="button" id="btnCopiarLink" title="Copiar link">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="dash-divider"></div>

    <div class="dash-kpi-grid">
      <div class="dash-kpi-card">
        <div class="dash-kpi-head">
          <div class="dash-kpi-label">Receita do mes atual</div>
          <div class="dash-kpi-icon bg-indigo"><i class="bi bi-cash-stack"></i></div>
        </div>
        <div class="dash-kpi-value">R$ <?= number_format($totalReceitaMesAtual, 2, ',', '.') ?></div>
        <div class="dash-kpi-trend positive"><?= htmlspecialchars($faixaReceitaMesAtual) ?></div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-head">
          <div class="dash-kpi-label">Pedidos finalizados</div>
          <div class="dash-kpi-icon bg-emerald"><i class="bi bi-bag-check"></i></div>
        </div>
        <div class="dash-kpi-value"><?= $totalPedidosPeriodo ?></div>
        <div class="dash-kpi-trend positive">+3% desde a ultima semana</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-head">
          <div class="dash-kpi-label">Clientes cadastrados</div>
          <div class="dash-kpi-icon bg-rose"><i class="bi bi-people"></i></div>
        </div>
        <div class="dash-kpi-value"><?= $totalClientes ?></div>
        <div class="dash-kpi-trend negative">-2% ultimo trimestre</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-head">
          <div class="dash-kpi-label">Acessos ao cardapio</div>
          <div class="dash-kpi-icon bg-amber"><i class="bi bi-graph-up-arrow"></i></div>
        </div>
        <div class="dash-kpi-value"><?= $acessosMenu ?></div>
        <div class="dash-kpi-trend positive">+7% este mes</div>
      </div>
    </div>

    <!-- ══ FUNIL DE CONVERSÃO ══ -->
    <div class="funil-wrap" id="funilWrap">
      <div class="funil-header">
        <div class="funil-title">Funil de conversão</div>
        <div class="funil-badge" id="funilBadge" style="display:none">
          <div><span class="funil-badge-pct" id="funilBadgePct">0%</span><span class="funil-badge-label">taxa de conversão</span></div>
          <span class="funil-badge-sub" id="funilBadgeSub"></span>
        </div>
      </div>
      <div class="funil-grid" id="funilGrid">
        <div class="funil-loading"><i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite;display:inline-block"></i> Carregando...</div>
      </div>
    </div>

    <div class="dash-community card dash-verse">
      <button type="button" class="share-copy" aria-label="Copiar versiculo do dia"><i class="bi bi-clipboard"></i></button>
      <div class="community-texts">
        <div class="dash-verse-top">
          <span class="dash-verse-title">Versiculo de Hoje</span>
          <span class="dash-verse-meta" id="versiculoMeta" data-date="<?= htmlspecialchars($versiculoDataCache ?: date('Y-m-d')) ?>"></span>
        </div>
        <div class="dash-verse-text"
             id="versiculoTexto"
             data-texto="<?= htmlspecialchars($versiculoCache) ?>"
             data-ref="<?= htmlspecialchars($versiculoRefCache) ?>"
             data-data="<?= htmlspecialchars($versiculoDataCache ?: date('Y-m-d')) ?>"
             data-has-cache="<?= $versiculoCache ? '1' : '0' ?>">
          <?= $versiculoCache ? '"' . htmlspecialchars($versiculoCache) . '"' : 'Carregando versiculo do dia...' ?>
        </div>
        <div class="dash-verse-bottom">
          <a class="dash-verse-ref" id="versiculoRef"
             href="<?= $versiculoRefCache ? 'https://www.bibliaon.com/busca/?q=' . urlencode($versiculoRefCache) : '#' ?>"
             target="_blank" rel="noopener"><?= htmlspecialchars($versiculoRefCache) ?></a>
          <div class="dash-verse-react">
            <span>Gostou?</span>
            <button type="button" id="btnVersoGostou" aria-label="Gostei"><i class="bi bi-emoji-smile"></i></button>
            <button type="button" id="btnVersoNaoGostou" aria-label="Nao gostei"><i class="bi bi-emoji-frown"></i></button>
          </div>
        </div>
      </div>
    </div>

    <div class="dash-section">
      <div class="dash-section-head">
        <h2 class="dash-section-title">Desempenho</h2>
      </div>

      <div class="dash-chart-grid">
        <div class="card dash-card dash-chart-card">
          <div class="card-body">
            <div class="chart-header">
              <p class="chart-caption" id="chartCaption">
                VocÃª esta vendo os pedidos recebidos na sua loja nos ultimos <?= $periodo ?> dias
              </p>
              <div class="dash-filters dash-filters--inside">
                <div class="dash-select">
                  <button class="dash-select-btn" type="button" id="periodoSelectBtn" aria-haspopup="listbox" aria-expanded="false"></button>
                  <div class="dash-select-menu" id="periodoSelectMenu" role="listbox">
                    <button type="button" data-value="7" role="option">Ultimos 7 dias</button>
                    <button type="button" data-value="15" role="option">Ultimos 15 dias</button>
                    <button type="button" data-value="30" role="option">Ultimos 30 dias</button>
                  </div>
                  <select class="form-select dash-select-native" id="periodoSelect">
                    <option value="7" <?= $periodo === 7 ? 'selected' : '' ?>>Ultimos 7 dias</option>
                    <option value="15" <?= $periodo === 15 ? 'selected' : '' ?>>Ultimos 15 dias</option>
                    <option value="30" <?= $periodo === 30 ? 'selected' : '' ?>>Ultimos 30 dias</option>
                  </select>
                </div>
                <div class="dash-select">
                  <button class="dash-select-btn" type="button" id="metricSelectBtn" aria-haspopup="listbox" aria-expanded="false"></button>
                  <div class="dash-select-menu" id="metricSelectMenu" role="listbox">
                    <button type="button" data-value="pedidos" role="option">Numero de pedidos</button>
                    <button type="button" data-value="faturamento" role="option">Faturamento</button>
                  </div>
                  <select class="form-select dash-select-native" id="metricSelect">
                    <option value="pedidos" selected>Numero de pedidos</option>
                    <option value="faturamento">Faturamento</option>
                  </select>
                </div>
              </div>
            </div>
            <canvas id="graficoPedidos"></canvas>
          </div>
        </div>
      </div>

    <div class="dash-stats">
      <div class="stat-card">
        <div class="stat-card-head">
          <div class="stat-icon"><i class="bi bi-graph-up"></i></div>
          <i class="bi bi-eye stat-cta"></i>
          </div>
        <div class="stat-label" id="statAcessosLabel">acessos ao seu menu nos ultimos <?= $periodo ?> dias</div>
        <div class="stat-value" id="statAcessosValor"><?= $acessosMenu ?></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-head">
            <div class="stat-icon"><i class="bi bi-calendar-check"></i></div>
            <i class="bi bi-eye stat-cta"></i>
          </div>
        <div class="stat-label" id="statPedidosLabel">vendas realizadas nos ultimos <?= $periodo ?> dias</div>
        <div class="stat-value" id="statPedidosValor"><?= $totalPedidosPeriodo ?></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-head">
            <div class="stat-icon"><i class="bi bi-currency-dollar"></i></div>
            <i class="bi bi-eye stat-cta"></i>
          </div>
        <div class="stat-label" id="statReceitaLabel">recebeu em vendas nos ultimos <?= $periodo ?> dias</div>
        <div class="stat-value" id="statReceitaValor">R$ <?= number_format($totalReceitaPeriodo, 2, ',', '.') ?></div>
        </div>
      </div>
    </div>

    <div class="dash-section">
      <div class="dash-section-head dash-section-head--split">
        <h2 class="dash-section-title">Produtos com mais saida</h2>
        <div class="dash-section-sub">Top 5 produtos com maior rotatividade</div>
      </div>
      <div class="card dash-card dash-top-products">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-borderless align-middle mb-0">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th class="text-end">Valor</th>
                  <th class="text-center">Saidas</th>
                  <th class="text-end">Estoque</th>
                </tr>
              </thead>
              <tbody>
                <?php if (!$topProdutos): ?>
                  <tr>
                    <td colspan="4" class="text-center text-muted py-4">Sem dados suficientes.</td>
                  </tr>
                <?php endif; ?>
                <?php foreach ($topProdutos as $p): ?>
                  <tr>
                    <td>
                      <div class="top-produto-nome"><?= htmlspecialchars($p['nome'] ?? 'Produto') ?></div>
                    </td>
                    <td class="text-end">R$ <?= number_format((float) ($p['valor'] ?? 0), 2, ',', '.') ?></td>
                    <td class="text-center"><?= (int) ($p['saidas'] ?? 0) ?></td>
                    <td class="text-end">
                      <span class="top-produto-estoque <?= ((int) ($p['estoque'] ?? 0)) <= 0 ? 'is-empty' : '' ?>">
                        <?= (int) ($p['estoque'] ?? 0) ?>
                      </span>
                    </td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
  </div>

  </main>
</div>

<button type="button" class="suporte-chat-toggle" id="suporteChatToggle" aria-label="Abrir chat de suporte">
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
  <span class="suporte-chat-badge" id="suporteChatBadge" style="display:none">0</span>
</button>

<div class="suporte-chat-panel" id="suporteChatPanel">
  <div class="suporte-chat-header">
    <div class="suporte-chat-avatar">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    </div>
    <div class="suporte-chat-headtext">
      <div class="suporte-chat-name">Suporte</div>
      <div class="suporte-chat-status" id="suporteChatStatus">On-line</div>
    </div>
    <button type="button" class="suporte-chat-close" id="suporteChatClose" aria-label="Fechar chat">&times;</button>
  </div>
  <div class="suporte-chat-body" id="suporteChatBody"></div>
  <div class="suporte-chat-anexo-preview" id="suporteChatAnexoPreview" style="display:none">
    <img id="suporteChatAnexoPreviewImg" alt="Preview">
    <span class="suporte-chat-anexo-preview-nome" id="suporteChatAnexoPreviewNome"></span>
    <button type="button" class="suporte-chat-anexo-remover" id="suporteChatAnexoRemover" aria-label="Remover imagem">&times;</button>
  </div>
  <form class="suporte-chat-footer" id="suporteChatForm">
    <button type="button" class="suporte-chat-attach" id="suporteChatAnexoBtn" aria-label="Anexar imagem">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 015 5l-9.2 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.48"/></svg>
    </button>
    <input type="file" id="suporteChatAnexoInput" accept="image/jpeg,image/png,image/webp" hidden>
    <input type="text" class="suporte-chat-input" id="suporteChatInput" placeholder="Escreva sua mensagem..." maxlength="2000" autocomplete="off">
    <button type="submit" class="suporte-chat-send" aria-label="Enviar mensagem">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>
    </button>
  </form>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
let labels = <?php echo json_encode($labels); ?>;
let seriePedidos = <?php echo json_encode($seriePedidos); ?>;
let serieValores = <?php echo json_encode($serieValores); ?>;
let periodoAtual = <?php echo (int) $periodo; ?>;
</script>
<script src="./assets/js/dashboard_home.js?v=<?= $dashboardHomeJsVer ?>"></script>
<script src="./assets/js/suporte_chat.js?v=<?= $suporteChatJsVer ?>"></script>
</body>
</html>

