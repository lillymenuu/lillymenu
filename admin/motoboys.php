<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.motoboys');
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/motoboy_module.php';
require_once __DIR__ . '/../helpers/pedido_codigo.php';

motoboyEnsureModule($conn);
$lojaId = motoboyTenantId();
$lojaNome = config($conn, 'nome_loja', 'Will Delivery');
$_SESSION['loja_nome'] = $lojaNome;
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$finCssVer = filemtime(__DIR__ . '/assets/css/financial_module.css');
$finJsVer = filemtime(__DIR__ . '/assets/js/financial_module.js');
$flash = motoboyFlashGet();
$motoboysCssVer = filemtime(__DIR__ . '/assets/css/motoboys.css');
$motoboysJsVer = filemtime(__DIR__ . '/assets/js/motoboys.js');

$tz = new DateTimeZone('America/Fortaleza');
$agora = new DateTimeImmutable('now', $tz);
$mesAtual = (int) $agora->format('m');
$anoAtual = (int) $agora->format('Y');
$periodo = (string) ($_GET['periodo'] ?? 'hoje');
$dataInicioInput = (string) ($_GET['data_inicio'] ?? '');
$dataFimInput = (string) ($_GET['data_fim'] ?? '');

if ($periodo === '7dias') {
  $inicio = $agora->setTime(0, 0)->modify('-6 days');
  $fim = $agora->setTime(23, 59, 59);
} elseif ($periodo === 'customizado' && $dataInicioInput !== '' && $dataFimInput !== '') {
  try {
    $inicio = (new DateTimeImmutable($dataInicioInput, $tz))->setTime(0, 0, 0);
    $fim = (new DateTimeImmutable($dataFimInput, $tz))->setTime(23, 59, 59);
  } catch (Throwable $e) {
    $inicio = $agora->setTime(0, 0, 0);
    $fim = $agora->setTime(23, 59, 59);
    $periodo = 'hoje';
  }
} else {
  $inicio = $agora->setTime(0, 0, 0);
  $fim = $agora->setTime(23, 59, 59);
  $periodo = 'hoje';
}
if ($dataInicioInput === '') {
  $dataInicioInput = $inicio->format('Y-m-d');
}
if ($dataFimInput === '') {
  $dataFimInput = $fim->format('Y-m-d');
}
$periodoLabel = 'Hoje';
if ($periodo === '7dias') {
  $periodoLabel = 'Últimos 7 dias';
} elseif ($periodo === 'customizado') {
  $periodoLabel = $inicio->format('d/m/Y') . ' a ' . $fim->format('d/m/Y');
}
$page = max(1, (int) ($_GET['page'] ?? 1));
$allowedPerPage = [5, 10, 25];
$perPageInput = (int)($_GET['per_page'] ?? 10);
$perPage = in_array($perPageInput, $allowedPerPage, true) ? $perPageInput : 10;
$offset = ($page - 1) * $perPage;
$queryBase = [
  'periodo' => $periodo,
  'data_inicio' => $dataInicioInput,
  'data_fim' => $dataFimInput,
  'per_page' => $perPage,
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  try {
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'save') {
      $id = (int) ($_POST['id'] ?? 0);
      $nome = trim((string) ($_POST['nome'] ?? ''));
      $whatsapp = preg_replace('/\D+/', '', (string) ($_POST['whatsapp'] ?? ''));
      $dataCadastro = (string) ($_POST['data_cadastro'] ?? $agora->format('Y-m-d'));
      $ativo = (int) ($_POST['ativo'] ?? 1) === 1 ? 1 : 0;

      if ($nome === '') {
        throw new RuntimeException('Informe o nome do motoboy.');
      }
      if ($whatsapp === '') {
        throw new RuntimeException('Informe o WhatsApp do motoboy.');
      }

      if ($id > 0) {
        $stmt = $conn->prepare("
          UPDATE motoboys
          SET nome = ?, whatsapp = ?, data_cadastro = ?, ativo = ?, atualizado_em = NOW()
          WHERE id = ? AND loja_id = ?
        ");
        $stmt->execute([$nome, $whatsapp, $dataCadastro, $ativo, $id, $lojaId]);
        motoboyFlashSet(true, 'Motoboy atualizado com sucesso.');
      } elseif ($action === 'save') {
        $stmt = $conn->prepare("
          INSERT INTO motoboys (loja_id, nome, whatsapp, data_cadastro, ativo)
          VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$lojaId, $nome, $whatsapp, $dataCadastro, $ativo]);
        motoboyFlashSet(true, 'Motoboy cadastrado com sucesso.');
      }
    } elseif ($action === 'delete') {
      $id = (int) ($_POST['id'] ?? 0);
      if ($id <= 0) {
        throw new RuntimeException('Motoboy invalido.');
      }
      if (motoboyColumnExists($conn, 'pedidos', 'motoboy_id')) {
        $stmt = $conn->prepare("UPDATE pedidos SET motoboy_id = NULL WHERE loja_id = ? AND motoboy_id = ?");
        $stmt->execute([$lojaId, $id]);
      }
      $stmt = $conn->prepare("DELETE FROM motoboys WHERE id = ? AND loja_id = ?");
      $stmt->execute([$id, $lojaId]);
      motoboyFlashSet(true, 'Motoboy removido com sucesso.');
    }
  } catch (Throwable $e) {
    motoboyFlashSet(false, $e->getMessage());
  }
  motoboyRedirect('motoboys.php');
}

$stmtStats = $conn->prepare("
  SELECT
    (SELECT COUNT(*) FROM motoboys WHERE loja_id = ?) AS total_motoboys,
    (SELECT COUNT(*)
       FROM pedidos
      WHERE loja_id = ?
        AND tipo = 'entrega'
        AND motoboy_id IS NOT NULL
        AND status = 'finalizado'
        AND criado_em BETWEEN ? AND ?) AS entregas_mes,
    (SELECT COALESCE(SUM(taxa_entrega),0)
       FROM pedidos
      WHERE loja_id = ?
        AND tipo = 'entrega'
        AND motoboy_id IS NOT NULL
        AND status = 'finalizado'
        AND criado_em BETWEEN ? AND ?) AS taxas_mes
");
$stmtStats->execute([$lojaId, $lojaId, $inicio->format('Y-m-d H:i:s'), $fim->format('Y-m-d H:i:s'), $lojaId, $inicio->format('Y-m-d H:i:s'), $fim->format('Y-m-d H:i:s')]);
$stats = $stmtStats->fetch(PDO::FETCH_ASSOC) ?: ['total_motoboys' => 0, 'entregas_mes' => 0, 'taxas_mes' => 0];

$stmtMotoboys = $conn->prepare("
  SELECT
    m.*,
    COUNT(p.id) AS entregas_mes,
    COALESCE(SUM(p.taxa_entrega),0) AS taxas_mes
  FROM motoboys m
  LEFT JOIN pedidos p
    ON p.motoboy_id = m.id
   AND p.loja_id = m.loja_id
   AND p.tipo = 'entrega'
   AND p.status = 'finalizado'
   AND p.criado_em BETWEEN ? AND ?
  WHERE m.loja_id = ?
  GROUP BY m.id
  ORDER BY m.nome ASC
");
$stmtMotoboys->execute([$inicio->format('Y-m-d H:i:s'), $fim->format('Y-m-d H:i:s'), $lojaId]);
$motoboys = $stmtMotoboys->fetchAll(PDO::FETCH_ASSOC);

$stmtEntregasTotal = $conn->prepare("
  SELECT COUNT(*)
  FROM pedidos p
  WHERE p.loja_id = ?
    AND p.tipo = 'entrega'
    AND p.motoboy_id IS NOT NULL
    AND p.status = 'finalizado'
    AND p.criado_em BETWEEN ? AND ?
");
$stmtEntregasTotal->execute([$lojaId, $inicio->format('Y-m-d H:i:s'), $fim->format('Y-m-d H:i:s')]);
$totalEntregas = (int) $stmtEntregasTotal->fetchColumn();
$totalPages = max(1, (int) ceil($totalEntregas / $perPage));
$page = min($page, $totalPages);
$offset = ($page - 1) * $perPage;
$mostrandoDe = $totalEntregas > 0 ? $offset + 1 : 0;
$mostrandoAte = min($page * $perPage, $totalEntregas);

$stmtEntregas = $conn->prepare("
  SELECT
    p.id,
    p.status,
    p.criado_em,
    p.endereco_entrega,
    p.taxa_entrega,
    c.nome AS cliente_nome,
    c.telefone AS cliente_telefone,
    m.nome AS motoboy_nome,
    m.whatsapp AS motoboy_whatsapp
  FROM pedidos p
  JOIN clientes c
    ON c.id = p.cliente_id
   AND c.loja_id = p.loja_id
  JOIN motoboys m
    ON m.id = p.motoboy_id
   AND m.loja_id = p.loja_id
  WHERE p.loja_id = ?
    AND p.tipo = 'entrega'
    AND p.motoboy_id IS NOT NULL
    AND p.status = 'finalizado'
    AND p.criado_em BETWEEN ? AND ?
  ORDER BY p.criado_em DESC, p.id DESC
  LIMIT ? OFFSET ?
");
$stmtEntregas->bindValue(1, $lojaId, PDO::PARAM_INT);
$stmtEntregas->bindValue(2, $inicio->format('Y-m-d H:i:s'), PDO::PARAM_STR);
$stmtEntregas->bindValue(3, $fim->format('Y-m-d H:i:s'), PDO::PARAM_STR);
$stmtEntregas->bindValue(4, $perPage, PDO::PARAM_INT);
$stmtEntregas->bindValue(5, $offset, PDO::PARAM_INT);
$stmtEntregas->execute();
$entregas = $stmtEntregas->fetchAll(PDO::FETCH_ASSOC);
$motoboyCodigoBase = getPedidoCodigoBase($conn, $lojaId);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Motoboys</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
  <link href="./assets/css/financial_module.css?v=<?= $finCssVer ?>" rel="stylesheet">
  <link href="./assets/css/motoboys.css?v=<?= $motoboysCssVer ?>" rel="stylesheet">
  <link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
</head>
<body class="dash-diggy fin-body">
<?php include __DIR__ . '/partials/sidebar.php'; ?>
<div class="fin-page">
  <div id="fin-toast-host" class="fin-toast-host"></div>

  <div class="fin-header">
    <div>
      <h1 class="fin-title">Motoboys</h1>
      <div class="fin-subtitle">Cadastre os entregadores e acompanhe as entregas vinculadas no mês atual.</div>
    </div>
    <div class="fin-actions">
      <button class="fin-btn fin-btn-primary fin-btn-sm" type="button" id="motoboy-open-modal"><i class="bi bi-plus-circle"></i> Novo motoboy</button>
    </div>
  </div>

  <div class="fin-card motoboy-filter-card">
    <form method="get" id="motoboy-filter-form">
      <div class="motoboy-filter-grid">
        <div class="field">
          <label>Período</label>
          <select class="fin-select" name="periodo" id="motoboy-periodo">
            <option value="hoje" <?= $periodo === 'hoje' ? 'selected' : '' ?>>Hoje</option>
            <option value="7dias" <?= $periodo === '7dias' ? 'selected' : '' ?>>7 dias</option>
            <option value="customizado" <?= $periodo === 'customizado' ? 'selected' : '' ?>>Customizado</option>
          </select>
        </div>
        <div class="field <?= $periodo === 'customizado' ? '' : 'd-none' ?>" id="motoboy-data-inicio-wrap">
          <label>Data inicial</label>
          <input class="fin-input" type="date" name="data_inicio" value="<?= htmlspecialchars($dataInicioInput) ?>">
        </div>
        <div class="field <?= $periodo === 'customizado' ? '' : 'd-none' ?>" id="motoboy-data-fim-wrap">
          <label>Data final</label>
          <input class="fin-input" type="date" name="data_fim" value="<?= htmlspecialchars($dataFimInput) ?>">
        </div>
      </div>
    </form>
  </div>

  <div class="motoboy-stats">
    <div class="motoboy-stat-card">
      <div class="motoboy-stat-icon"><i class="bi bi-bicycle"></i></div>
      <div class="motoboy-stat-meta">
        <small>Motoboys cadastrados</small>
        <strong><?= (int) $stats['total_motoboys'] ?></strong>
        <span>Total de entregadores ativos na loja.</span>
      </div>
    </div>
    <div class="motoboy-stat-card">
      <div class="motoboy-stat-icon"><i class="bi bi-box-seam"></i></div>
      <div class="motoboy-stat-meta">
        <small>Entregas no mês</small>
        <strong><?= (int) $stats['entregas_mes'] ?></strong>
        <span>Pedidos finalizados vinculados em <?= sprintf('%02d/%04d', $mesAtual, $anoAtual) ?>.</span>
      </div>
    </div>
    <div class="motoboy-stat-card">
      <div class="motoboy-stat-icon"><i class="bi bi-cash-stack"></i></div>
      <div class="motoboy-stat-meta">
        <small>Taxas do mês</small>
        <strong><?= motoboyMoney($stats['taxas_mes']) ?></strong>
        <span>Somatório das taxas de entregas finalizadas no mês atual.</span>
      </div>
    </div>
  </div>

  <div class="motoboy-hero-grid">
    <?php foreach ($motoboys as $item): ?>
      <div class="motoboy-pill-card">
        <div class="motoboy-pill-head">
          <strong><?= htmlspecialchars((string) $item['nome']) ?></strong>
          <i class="bi bi-bicycle" style="font-size:1rem;color:#ff3b7c;"></i>
        </div>
        <div class="motoboy-pill-value"><?= motoboyMoney($item['taxas_mes']) ?></div>
        <div class="motoboy-pill-meta">
          <span><?= (int) $item['entregas_mes'] ?> entrega(s) finalizada(s)</span>
          <span>•</span>
          <span><?= htmlspecialchars((string) $item['whatsapp']) ?></span>
        </div>
        <span class="motoboy-pill-note">Taxas computadas apenas após a finalização do pedido.</span>
      </div>
    <?php endforeach; ?>
    <?php if (!$motoboys): ?>
      <div class="fin-card"><div class="fin-card-body"><div class="fin-empty">Nenhum motoboy cadastrado ainda.</div></div></div>
    <?php endif; ?>
  </div>

  <div class="fin-card" style="margin-bottom:18px;">
    <div class="fin-card-head">
      <div>
        <h2 class="fin-card-title">Cadastro de motoboys</h2>
        <div class="fin-card-subtitle">Lista dos entregadores disponíveis para vínculo nos pedidos.</div>
      </div>
    </div>
    <div class="fin-card-body">
      <div class="fin-table-wrap">
        <table class="fin-table fin-table-compact motoboy-table">
          <thead>
            <tr>
              <th class="col-motoboy">Motoboy</th>
              <th class="col-data">Cadastro</th>
              <th class="col-entregas">Entregas</th>
              <th class="col-taxas">Taxas</th>
              <th class="col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($motoboys as $item): ?>
              <tr>
                <td>
                  <strong><?= htmlspecialchars((string) $item['nome']) ?></strong>
                  <small><?= htmlspecialchars((string) $item['whatsapp']) ?></small>
                </td>
                <td><?= htmlspecialchars(date('d/m/Y', strtotime((string) $item['data_cadastro']))) ?></td>
                <td><?= (int) $item['entregas_mes'] ?></td>
                <td><?= motoboyMoney($item['taxas_mes']) ?></td>
                <td>
                  <div class="fin-table-actions">
                    <button class="fin-table-icon-btn fin-btn-soft js-motoboy-edit" type="button" data-id="<?= (int) $item['id'] ?>" data-nome="<?= htmlspecialchars((string) $item['nome'], ENT_QUOTES) ?>" data-whatsapp="<?= htmlspecialchars((string) $item['whatsapp'], ENT_QUOTES) ?>" data-data="<?= htmlspecialchars((string) $item['data_cadastro'], ENT_QUOTES) ?>" data-ativo="<?= (int) $item['ativo'] ?>" title="Editar" aria-label="Editar"><i class="bi bi-pencil"></i></button>
                    <button class="fin-table-icon-btn fin-btn-secondary js-motoboy-delete" type="button" data-id="<?= (int) $item['id'] ?>" data-nome="<?= htmlspecialchars((string) $item['nome'], ENT_QUOTES) ?>" title="Excluir" aria-label="Excluir"><i class="bi bi-trash3"></i></button>
                  </div>
                </td>
              </tr>
            <?php endforeach; ?>
            <?php if (!$motoboys): ?>
              <tr><td colspan="5"><div class="fin-empty">Nenhum motoboy cadastrado ainda.</div></td></tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="fin-card">
    <div class="fin-card-head">
      <div>
        <h2 class="fin-card-title">Entregas vinculadas</h2>
        <div class="fin-card-subtitle">Pedidos de entrega do período filtrado com motoboy vinculado.</div>
      </div>
    </div>
    <div class="fin-card-body" style="padding:0">
      <div class="rc-table-wrap">
        <table class="rc-table motoboy-wide-table">
          <thead>
            <tr>
              <th class="col-pedido">Pedido</th>
              <th class="col-cliente">Cliente</th>
              <th class="col-endereco">Endereço</th>
              <th class="col-taxa">Taxa</th>
              <th class="col-entregador">Motoboy</th>
              <th class="col-detalhes">Pedidos</th>
            </tr>
          </thead>
          <tbody id="entregasTableBody">
            <?php foreach ($entregas as $entrega): ?>
              <tr>
                <td>
                  <strong>#<?= calcCodigoDisplay((int)$entrega['id'], $motoboyCodigoBase) ?></strong>
                  <small><?= htmlspecialchars(date('d/m/Y H:i', strtotime((string) $entrega['criado_em']))) ?></small>
                </td>
                <td>
                  <strong><?= htmlspecialchars((string) $entrega['cliente_nome']) ?></strong>
                  <small><?= htmlspecialchars((string) $entrega['cliente_telefone']) ?></small>
                </td>
                <td><div class="motoboy-address"><?= nl2br(htmlspecialchars((string) $entrega['endereco_entrega'])) ?></div></td>
                <td><?= motoboyMoney($entrega['taxa_entrega']) ?></td>
                <td>
                  <strong><?= htmlspecialchars((string) $entrega['motoboy_nome']) ?></strong>
                  <small><?= htmlspecialchars((string) $entrega['motoboy_whatsapp']) ?></small>
                </td>
                <td>
                  <button class="btn motoboy-detail-btn js-open-pedido" type="button" data-pedido-id="<?= (int) $entrega['id'] ?>" title="Visualizar pedido" aria-label="Visualizar pedido">
                    <i class="bi bi-eye"></i>
                  </button>
                </td>
              </tr>
            <?php endforeach; ?>
            <?php if (!$entregas): ?>
              <tr><td colspan="6"><div class="fin-empty">Nenhuma entrega finalizada no período selecionado.</div></td></tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
      <div class="rc-footer">
        <div class="rc-per-page">
          Itens por página:
          <select id="entregasPerPage" onchange="carregarEntregas(1,parseInt(this.value))">
            <option value="5" <?= $perPage===5?'selected':'' ?>>5</option>
            <option value="10" <?= $perPage===10?'selected':'' ?>>10</option>
            <option value="25" <?= $perPage===25?'selected':'' ?>>25</option>
          </select>
        </div>
        <div class="rc-info" id="entregasInfo">Mostrando <?= $mostrandoDe ?> a <?= $mostrandoAte ?> de <?= $totalEntregas ?> entrega(s)</div>
        <div class="rc-pagination" id="entregasPagination">
          <button class="rc-page-btn <?= $page<=1?'disabled':'' ?>" <?= $page<=1?'disabled':'' ?> onclick="carregarEntregas(1,estadoEntregas.per_page)" title="Primeira">«</button>
          <button class="rc-page-btn <?= $page<=1?'disabled':'' ?>" <?= $page<=1?'disabled':'' ?> onclick="carregarEntregas(<?= max(1,$page-1) ?>,estadoEntregas.per_page)" title="Anterior">‹</button>
          <span class="rc-page-label" id="entregasPagLabel">Página <?= $page ?> de <?= $totalPages ?></span>
          <button class="rc-page-btn <?= $page>=$totalPages?'disabled':'' ?>" <?= $page>=$totalPages?'disabled':'' ?> onclick="carregarEntregas(<?= min($totalPages,$page+1) ?>,estadoEntregas.per_page)" title="Próxima">›</button>
          <button class="rc-page-btn <?= $page>=$totalPages?'disabled':'' ?>" <?= $page>=$totalPages?'disabled':'' ?> onclick="carregarEntregas(<?= $totalPages ?>,estadoEntregas.per_page)" title="Última">»</button>
        </div>
      </div>
    </div>
  </div>
  </div>
</div>
</div>

<div class="modal fade" id="motoboyPedidoModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
    <div class="modal-content pedido-detalhe-modal">
      <div class="modal-header">
        <div class="pedido-detalhe-header w-100">
          <h5 id="motoboyPedidoNumero">Pedido N. -</h5>
          <div class="pedido-detalhe-actions">
            <button class="btn btn-outline-secondary btn-sm" type="button" id="motoboyPedidoImprimir"><i class="bi bi-printer"></i> Imprimir</button>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div class="pedido-detalhe-tempo" id="motoboyPedidoTempo">feito há -</div>
        <div class="pedido-detalhe-grid">
          <div class="pedido-detalhe-item"><span>Horário do pedido</span><strong id="motoboyPedidoHorario">-</strong></div>
          <div class="pedido-detalhe-item"><span>Status do pedido</span><strong class="pedido-detalhe-status" id="motoboyPedidoStatus">-</strong></div>
          <div class="pedido-detalhe-item"><span>Nome do cliente</span><strong id="motoboyPedidoCliente">-</strong></div>
          <div class="pedido-detalhe-item"><span>Telefone</span><strong id="motoboyPedidoTelefone">-</strong></div>
        </div>
        <div class="pedido-detalhe-section">
          <div class="pedido-detalhe-section-title" id="motoboyPedidoTipo">ENTREGA</div>
          <div class="pedido-detalhe-item"><span>Endereço</span><strong id="motoboyPedidoEndereco">-</strong></div>
          <div class="pedido-detalhe-item"><span>Taxa de entrega</span><strong id="motoboyPedidoTaxa">R$ 0,00</strong></div>
          <div class="pedido-detalhe-item"><span>Motoboy</span><strong id="motoboyPedidoMotoboy">-</strong></div>
        </div>
        <div class="pedido-detalhe-section">
          <div class="pedido-detalhe-section-title">Pagamento</div>
          <div class="pedido-detalhe-pagamentos" id="motoboyPedidoPagamentos">-</div>
        </div>
        <div class="pedido-detalhe-section">
          <div class="pedido-detalhe-section-title">Resumo do pedido</div>
          <div class="pedido-detalhe-itens" id="motoboyPedidoItens"></div>
          <div class="pedido-detalhe-total"><span>Subtotal</span><strong id="motoboyPedidoSubtotal">R$ 0,00</strong></div>
          <div class="pedido-detalhe-total" id="motoboyPedidoTaxaLinha"><span>Taxa de entrega</span><strong id="motoboyPedidoTaxaResumo">R$ 0,00</strong></div>
          <div class="pedido-detalhe-total"><span>Total</span><strong id="motoboyPedidoTotal">R$ 0,00</strong></div>
        </div>
      </div>
      <div class="modal-footer pedido-detalhe-footer">
        <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Fechar</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="motoboyModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:520px;">
    <div class="modal-content fin-card motoboy-modal" style="border-radius:22px;overflow:visible;">
      <div class="fin-card-head">
        <div>
          <h2 class="fin-card-title" id="motoboy-modal-title">Novo motoboy</h2>
          <div class="fin-card-subtitle">Cadastre o entregador para vincular nos pedidos de entrega.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="fin-card-body">
        <form method="post" id="motoboy-form">
          <input type="hidden" name="action" value="save">
          <input type="hidden" name="id" id="motoboy-id" value="0">
          <div class="field mb-3">
            <label>Nome</label>
            <input class="fin-input" type="text" name="nome" id="motoboy-nome" required>
          </div>
          <div class="fin-mini-grid mb-3">
            <div class="field">
              <label>Contato WhatsApp</label>
              <input class="fin-input" type="text" name="whatsapp" id="motoboy-whatsapp" inputmode="numeric" required>
            </div>
            <div class="field">
              <label>Data do cadastro</label>
              <input class="fin-input" type="date" name="data_cadastro" id="motoboy-data" value="<?= htmlspecialchars($agora->format('Y-m-d')) ?>" required>
            </div>
          </div>
          <div class="field mb-3">
            <label>Status</label>
            <select class="fin-select" name="ativo" id="motoboy-ativo">
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </select>
          </div>
          <div class="fin-modal-actions">
            <button class="fin-btn fin-btn-secondary fin-btn-sm" type="button" id="motoboy-cancel">Cancelar</button>
            <button class="fin-btn fin-btn-primary fin-btn-sm" type="submit" id="motoboy-submit">Salvar motoboy</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="motoboyDeleteModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:420px;">
    <div class="modal-content fin-card" style="border-radius:22px;overflow:hidden;">
      <div class="fin-card-head" style="padding-bottom:8px;">
        <div>
          <h2 class="fin-card-title">Excluir motoboy</h2>
          <div class="fin-card-subtitle">Confirme se deseja remover este cadastro.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="fin-card-body pt-0">
        <div class="motoboy-delete-copy">Ao excluir, o motoboy será desvinculado dos pedidos de entrega já registrados.</div>
        <form method="post" id="motoboy-delete-form">
          <input type="hidden" name="action" value="delete">
          <input type="hidden" name="id" id="motoboy-delete-id" value="0">
          <div class="fin-modal-actions">
            <button class="fin-btn fin-btn-secondary fin-btn-sm" type="button" data-bs-dismiss="modal">Cancelar</button>
            <button class="fin-btn fin-btn-primary fin-btn-sm" type="submit">Excluir</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/financial_module.js?v=<?= $finJsVer ?>"></script>
<script>
const MOTOBOYS_DATA = <?= json_encode([
  'toastFlash' => $flash,
  'todayDate' => $agora->format('Y-m-d'),
  'periodo' => $periodo,
  'dataInicio' => $dataInicioInput,
  'dataFim' => $dataFimInput,
  'page' => (int)$page,
  'perPage' => (int)$perPage,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
</script>
<script src="./assets/js/motoboys.js?v=<?= $motoboysJsVer ?>"></script>
</body>
</html>
