<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.pedidos');

date_default_timezone_set('America/Fortaleza');

$perfil = $_SESSION['admin_perfil'] ?? 'admin';
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$status   = trim($_GET['status'] ?? '');

/* Converte DD/MM/YYYY → YYYY-MM-DD se necessário */
function normalizarDataSQL(string $d): string {
  $d = trim($d);
  if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $d, $m)) return "{$m[3]}-{$m[2]}-{$m[1]}";
  if (preg_match('/^(\d{2})-(\d{2})-(\d{4})$/', $d, $m)) return "{$m[3]}-{$m[2]}-{$m[1]}";
  return $d; // já está em YYYY-MM-DD ou vazio
}

$dataIni  = normalizarDataSQL(isset($_GET['data_ini']) ? trim($_GET['data_ini']) : date('Y-m-d'));
$dataFim  = normalizarDataSQL(isset($_GET['data_fim']) ? trim($_GET['data_fim']) : date('Y-m-d'));
/* compatibilidade com ?data= legado */
if (isset($_GET['data']) && !isset($_GET['data_ini'])) {
  $dataIni = $dataFim = normalizarDataSQL(trim($_GET['data']));
}
$pagina = max(1, (int)($_GET['pagina'] ?? 1));
$limite = (int)($_GET['limite'] ?? 10);
$limite = in_array($limite, [10, 20, 50], true) ? $limite : 10;
$offset = ($pagina - 1) * $limite;

$where = ['p.loja_id = ?'];
$params = [$lojaId];

if ($status !== '') {
  $where[] = 'p.status = ?';
  $params[] = $status;
}
if ($dataIni !== '') {
  $where[] = 'DATE(p.criado_em) BETWEEN ? AND ?';
  $params[] = $dataIni;
  $params[] = $dataFim !== '' ? $dataFim : $dataIni;
}

$sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = $conn->prepare("
  SELECT COUNT(*)
  FROM pedidos p
  LEFT JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  $sqlWhere
");
$stmt->execute($params);
$total = (int) $stmt->fetchColumn();
$paginas = max(1, (int) ceil($total / $limite));

/* Lê o offset de sequência zerada (se existir) */
$codigoBase = 0;
try {
  $stmtBase = $conn->prepare("SELECT CAST(valor AS UNSIGNED) FROM configuracoes WHERE chave='pedido_codigo_base' AND loja_id=? LIMIT 1");
  $stmtBase->execute([$lojaId]);
  $baseVal = $stmtBase->fetchColumn();
  if ($baseVal !== false) $codigoBase = (int)$baseVal;
} catch (Exception $e) {}

/* Expressão SQL: se id > base, mostra (id - base); senão mostra id normal */
$selCodigo = $codigoBase > 0
  ? ", IF(p.id > {$codigoBase}, p.id - {$codigoBase}, p.id) AS codigo_display"
  : ", p.id AS codigo_display";

$stmt = $conn->prepare("
  SELECT
    p.id,
    p.total,
    p.status,
    p.tipo,
    p.criado_em,
    p.forma_pagamento,
    COALESCE(c.nome, '(cliente não encontrado)') AS cliente
    {$selCodigo}
  FROM pedidos p
  LEFT JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  $sqlWhere
  ORDER BY p.criado_em DESC
  LIMIT $limite OFFSET $offset
");
$stmt->execute($params);
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

function renderPedidosTabela($pedidos, $paginas, $pagina, $limite, $total){
  ?>
  <div class="pedidos-table-card" data-total="<?= $total ?>" data-pagina="<?= $pagina ?>">
    <div class="rc-table-wrap">
      <table class="pedidos-table">
        <thead>
          <tr>
            <th>N. pedido</th>
            <th>Nome</th>
            <th>Data</th>
            <th>Pagamento</th>
            <th>Status</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Origem</th>
            <th>Acao</th>
          </tr>
        </thead>
        <tbody>
        <?php if (!$pedidos): ?>
          <tr>
            <td colspan="9" class="text-center text-muted py-4">Nenhum pedido encontrado</td>
          </tr>
        <?php endif; ?>
        <?php foreach ($pedidos as $p): ?>
          <?php
            $statusInfo = mapStatus($p['status'] ?? '');
            $tipoLabel = ($p['tipo'] ?? '') === 'entrega' ? 'Entrega' : 'Retirada';
            $tipoClass = ($p['tipo'] ?? '') === 'entrega' ? 'entrega' : 'retirada';
            $pagamentoInfo = mapPagamento($p['forma_pagamento'] ?? '');
          ?>
          <tr class="pedido-row" data-pedido-id="<?= $p['id'] ?>">
            <td>
              <span class="pedido-dot"></span>
              <span class="pedido-id">#<?= htmlspecialchars((string)($p['codigo_display'] ?? $p['id'])) ?></span>
            </td>
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
              <span class="badge-pill badge-tipo <?= $tipoClass ?>"><?= $tipoLabel ?></span>
            </td>
            <td>R$ <?= number_format($p['total'], 2, ',', '.') ?></td>
            <td>
              <span class="badge-pill badge-origem">Lilly</span>
            </td>
            <td>
              <button class="btn btn-sm btn-table" type="button" data-action="imprimir" data-pedido-id="<?= $p['id'] ?>">
                Imprimir
              </button>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <?php
      $ini = ($pagina - 1) * $limite + 1;
      $fim = min($pagina * $limite, $total);
    ?>
    <div class="rc-footer">
      <div class="rc-per-page">
        Itens por página:
        <select id="limiteSelect">
          <option value="10" <?= $limite === 10 ? 'selected' : '' ?>>10</option>
          <option value="20" <?= $limite === 20 ? 'selected' : '' ?>>20</option>
          <option value="50" <?= $limite === 50 ? 'selected' : '' ?>>50</option>
        </select>
      </div>
      <div class="rc-info">Mostrando <?= $ini ?> a <?= $fim ?> de <?= $total ?> pedidos</div>
      <div class="rc-pagination">
        <button class="rc-page-btn" type="button" data-page="1" <?= $pagina <= 1 ? 'disabled' : '' ?>>«</button>
        <button class="rc-page-btn" type="button" data-page="<?= max(1, $pagina - 1) ?>" <?= $pagina <= 1 ? 'disabled' : '' ?>>‹</button>
        <span class="rc-page-label">Página <?= $pagina ?> de <?= $paginas ?></span>
        <button class="rc-page-btn" type="button" data-page="<?= min($paginas, $pagina + 1) ?>" <?= $pagina >= $paginas ? 'disabled' : '' ?>>›</button>
        <button class="rc-page-btn" type="button" data-page="<?= $paginas ?>" <?= $pagina >= $paginas ? 'disabled' : '' ?>>»</button>
      </div>
    </div>
  </div>
  <?php
}

if (isset($_GET['ajax']) && $_GET['ajax'] === '1') {
  renderPedidosTabela($pedidos, $paginas, $pagina, $limite, $total);
  exit;
}

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Pedidos</title>
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

<style>
body.dash-diggy .pedidos-page{
  padding:24px;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.pedidos-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
}
.pedidos-title{
  font-size:1.4rem;
  font-weight:700;
  margin:0;
}
.pedidos-subtitle{
  margin:4px 0 0;
  color:#6b7280;
  font-size:.9rem;
}
.pedidos-actions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.btn-diggy-ghost{
  border:1px solid #e5e7eb;
  background:#fff;
  color:#0f172a;
  border-radius:999px;
  padding:.5rem 1.1rem;
  font-weight:600;
  font-size:.82rem;
  box-shadow:0 8px 18px rgba(15,23,42,.06);
}
.btn-diggy-ghost:hover{
  border-color:#d4d7df;
  color:#0f172a;
}
.pedidos-filter-card{
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:16px;
  padding:14px 18px;
}
.pedidos-table-card{
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:16px;
}
.pedidos-filter-head{
  display:flex;
  align-items:center;
  gap:16px;
  flex-wrap:wrap;
}
.pedidos-filter-title-wrap{
  flex-shrink:0;
}
.pedidos-filter-title{
  font-weight:700;
  font-size:.95rem;
  white-space:nowrap;
}
.pedidos-filter-sub{
  color:#6b7280;
  font-size:.78rem;
  margin-top:1px;
  white-space:nowrap;
}
.pedidos-filter-inline{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}
/* limita largura dos selects/inputs no header de filtros */
.pedidos-filter-inline .form-select,
.pedidos-filter-inline .form-control{
  width:160px;
  max-width:160px;
  height:36px;
  padding:6px 10px;
  font-size:.82rem;
  flex-shrink:0;
}
/* custom-select gerado pelo sidebar dentro do filtro inline */
.pedidos-filter-inline .custom-select{
  width:160px;
  max-width:160px;
  flex-shrink:0;
}
.pedidos-filter-inline .custom-select-trigger{
  height:36px;
  font-size:.82rem;
  padding:.4rem 2rem .4rem .7rem;
}
.pedidos-filtros-advanced{
  display:none;
  margin-top:14px;
}
.pedidos-filtros-advanced.is-open{
  display:block;
}
.pedidos-filter-form .form-control,
.pedidos-filter-form .form-select{
  border-radius:12px;
  border:1px solid #e5e7eb;
  background:#f8fafc;
  font-size:.85rem;
}
.flatpickr-calendar{
  border:1px solid #e2e8f0;
  border-radius:12px;
  box-shadow:0 12px 28px rgba(15,23,42,.16);
  font-family:inherit;
}
.flatpickr-months{
  padding:6px 6px 2px;
}
.flatpickr-months .flatpickr-month{
  color:#0f172a;
  height:32px;
  line-height:32px;
}
.flatpickr-current-month{
  font-size:.85rem;
  font-weight:600;
  padding-top:2px;
  display:flex;
  align-items:center;
  gap:6px;
}
.flatpickr-current-month .flatpickr-monthDropdown-months{
  height:28px;
  line-height:28px;
  padding:0 26px 0 8px;
  border:1px solid #e2e8f0;
  border-radius:10px;
  background:#fff;
  font-size:.82rem;
  font-weight:600;
  color:#0f172a;
  appearance:none;
}
.flatpickr-current-month .flatpickr-monthDropdown-months:focus{
  outline:none;
  border-color:#93c5fd;
  box-shadow:0 0 0 3px rgba(59,130,246,.15);
}
.flatpickr-current-month .flatpickr-monthDropdown-months:hover{
  background:#f8fafc;
}
.flatpickr-weekdays{
  padding:4px 6px 0;
}
.flatpickr-weekday{
  color:#94a3b8;
  font-weight:600;
  font-size:.68rem;
}
.flatpickr-day{
  border-radius:7px;
  height:28px;
  line-height:28px;
  max-width:28px;
  margin:1.5px;
  font-size:.76rem;
  color:#0f172a;
}
.flatpickr-day.today{
  border-color:#cbd5f5;
  background:#f1f5ff;
}
.flatpickr-day.selected,
.flatpickr-day.startRange,
.flatpickr-day.endRange{
  background:#2563eb;
  border-color:#2563eb;
  color:#fff;
  box-shadow:0 6px 12px rgba(37,99,235,.25);
}
.flatpickr-day:hover{
  background:#e2e8f0;
}
.flatpickr-months .flatpickr-prev-month,
.flatpickr-months .flatpickr-next-month{
  color:#64748b;
  top:6px;
}
.flatpickr-time input,
.flatpickr-time .flatpickr-am-pm{
  border-radius:10px;
  border:1px solid #e2e8f0;
}
.pedidos-filter-actions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.pedidos-results{
  transition:opacity .2s ease, transform .2s ease;
}
.pedidos-results.is-loading{
  opacity:.6;
  transform:translateY(4px);
  pointer-events:none;
}
.rc-table-wrap{overflow-x:auto}
.pedidos-table{
  width:100%;
  border-collapse:collapse;
}
.pedidos-table th{
  font-size:.66rem;
  font-weight:600;
  color:#9ca3af;
  text-transform:uppercase;
  letter-spacing:.04em;
  padding:8px 14px;
  border-bottom:1px solid #f0f0f0;
  white-space:nowrap;
  background:#fff;
}
.pedidos-table td{
  font-size:.78rem;
  color:#374151;
  padding:9px 14px;
  border-bottom:1px solid #f5f6f8;
  line-height:1.35;
  vertical-align:middle;
}
.pedidos-table tbody tr:last-child td{border-bottom:0}
.pedidos-table tbody tr{cursor:pointer;}
.pedidos-table tbody tr:hover td{background:#fafafa;}
.pedido-dot{
  display:inline-block;
  width:8px;
  height:8px;
  border-radius:50%;
  background:#9C5523;
  margin-right:6px;
}
.pedido-id{
  font-weight:600;
}
.badge-pill{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:999px;
  padding:4px 10px;
  font-size:.72rem;
  font-weight:600;
}
.badge-pay.pix{background:#dbeafe;color:#2563eb;}
.badge-pay.dinheiro{background:#dcfce7;color:#16a34a;}
.badge-pay.credito{background:#ede9fe;color:#6d28d9;}
.badge-pay.debito{background:#e0f2fe;color:#0284c7;}
.badge-status.pendente{background:#f1f5f9;color:#64748b;}
.badge-status.aceito{background:#e0f2fe;color:#0369a1;}
.badge-status.preparando{background:#fef3c7;color:#92400e;}
.badge-status.entrega{background:#fee2e2;color:#be123c;}
.badge-status.finalizado{background:#dcfce7;color:#166534;}
.badge-status.cancelado{background:#fee2e2;color:#991b1b;}
.badge-tipo.entrega{background:#fde68a;color:#92400e;}
.badge-tipo.retirada{background:#dbeafe;color:#2563eb;}
.badge-origem{background:#ffe4e6;color:#be123c;font-weight:700;}
.btn-table{
  border:0;
  background:#f3f4f6;
  color:#475569;
  border-radius:999px;
  padding:6px 12px;
  font-size:.75rem;
  font-weight:600;
}
.btn-table:hover{
  background:#e2e8f0;
}
.rc-footer{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;border-top:1px solid #f0f0f0;flex-wrap:wrap;gap:8px;}
.rc-per-page{display:flex;align-items:center;gap:6px;font-size:.76rem;color:#6b7280;}
.rc-per-page select{border:1.5px solid #e5e7eb;border-radius:7px;padding:3px 7px;font-size:.76rem;font-family:inherit;cursor:pointer;outline:none;background:#fff;}
.rc-info{font-size:.76rem;color:#6b7280;text-align:center;}
.rc-pagination{display:flex;align-items:center;gap:3px;}
.rc-page-btn{border:1.5px solid #e5e7eb;background:#fff;border-radius:7px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:.74rem;font-weight:600;cursor:pointer;color:#374151;transition:all .15s;line-height:1;}
.rc-page-btn:hover:not(:disabled){border-color:#6366f1;color:#4f46e5;}
.rc-page-btn:disabled{opacity:.4;cursor:not-allowed;}
.rc-page-label{font-size:.76rem;color:#6b7280;padding:0 7px;white-space:nowrap;}
.pedido-detalhe-modal{
  border-radius:24px;
  overflow:hidden;
  background:#fff;
  box-shadow:0 22px 50px rgba(15,23,42,.18);
}
.pedido-detalhe-modal .modal-header{border:0}
.pedido-detalhe-header{display:flex;align-items:center;justify-content:flex-start;gap:12px}
.pedido-detalhe-header h5{font-size:1rem;font-weight:700;margin:0;color:#0f172a}
.pedido-detalhe-actions{display:flex;gap:8px;align-items:center;margin-left:auto}
.pedido-detalhe-actions .btn{
  border-radius:999px;
  padding:.35rem .9rem;
  display:inline-flex;
  align-items:center;
  gap:6px;
  border-color:#e5e7eb;
  color:#475569;
  background:#f8fafc;
}
.pedido-detalhe-actions .btn:hover{background:#f1f5f9;color:#0f172a}
  .pedido-detalhe-tempo{text-align:center;font-size:.76rem;color:#9C5523;font-weight:600;margin:6px 0 10px}
  .pedido-detalhe-grid{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:14px 28px;
    margin-bottom:12px;
    justify-items:start;
    text-align:left;
  }
  .pedido-detalhe-item{font-size:.78rem;color:#0f172a;line-height:1.35;text-align:left}
  .pedido-detalhe-item strong{
    font-size:.8rem;
    font-weight:400;
    color:#0f172a;
  }
  .pedido-detalhe-item span{
    display:flex;
    align-items:center;
    gap:6px;
    padding:0;
    border:0;
    background:transparent;
    font-size:.7rem;
    color:#6b7280;
    text-transform:none;
    letter-spacing:0;
    width:auto;
    margin-bottom:6px;
  }
  .pedido-detalhe-item span.label-strong{
    padding:0;
    border:0;
    background:transparent;
    text-transform:none;
    letter-spacing:0;
    font-size:.74rem;
    font-weight:700 !important;
    color:#111827;
    margin-bottom:6px;
    justify-content:flex-start;
  }
  .pedido-detalhe-item span.label-strong i{
    font-size:.85rem;
    color:#0f172a;
  }
.pedido-detalhe-status{font-weight:600}
.pedido-detalhe-status.status-pendente{color:#475569}
.pedido-detalhe-status.status-aceito{color:#0369a1}
.pedido-detalhe-status.status-preparando{color:#92400e}
.pedido-detalhe-status.status-entrega{color:#6b21a8}
.pedido-detalhe-status.status-finalizado{color:#166534}
.pedido-detalhe-status.status-cancelado{color:#991b1b}
.pedido-detalhe-actions-row{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;justify-content:center}
.pedido-detalhe-actions-row .btn{
  border-radius:999px;
  font-size:.82rem;
  display:inline-flex;
  align-items:center;
  gap:6px;
  border-color:#eef2f7;
  background:#f8fafc;
  color:#7c8aa0;
}
.pedido-detalhe-actions-row .btn:hover{background:#f1f5f9;color:#0f172a}
.pedido-detalhe-client-stats{
  border:1px solid #e5e7eb;
  border-radius:16px;
  padding:12px 14px;
  background:#fff;
  box-shadow:0 12px 22px rgba(15,23,42,.08);
  margin:6px 0 12px;
}
.pedido-detalhe-client-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px 18px;
}
.pedido-detalhe-client-metric{
  display:flex;
  align-items:flex-start;
  gap:8px;
  font-size:.82rem;
  color:#0f172a;
}
.pedido-detalhe-client-metric i{
  font-size:.95rem;
  color:#0f172a;
}
.pedido-detalhe-client-metric span{
  color:#9aa6b5;
}
.pedido-detalhe-client-metric strong{
  display:block;
  font-size:.92rem;
  font-weight:600;
  margin-top:2px;
}
.pedido-detalhe-client-action{
  margin-top:10px;
  width:100%;
  border:1px solid #e5e7eb;
  background:#fff;
  border-radius:999px;
  padding:8px 12px;
  font-size:.82rem;
  color:#0f172a;
  box-shadow:0 8px 18px rgba(15,23,42,.08);
}
.pedido-detalhe-client-expira{
  display:block;
  margin-top:2px;
  font-size:.72rem;
  color:#9aa6b5;
}
.pedido-detalhe-client-expirado{
  margin-top:8px;
  font-size:.78rem;
  color:#ef4444;
  font-weight:600;
  text-align:center;
}
.pedido-detalhe-section{padding-top:12px;margin-top:12px;border-top:1px solid #eef2f7}
.pedido-detalhe-section-title{
  font-size:.78rem;
  font-weight:700;
  color:#475569;
  margin-bottom:8px;
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:4px 10px;
  border-radius:999px;
  border:1px solid #e5e7eb;
  background:#f8fafc;
  text-transform:uppercase;
  letter-spacing:.02em;
}
.pedido-detalhe-section-title.entrega{background:#fff7ed;color:#c2410c;border-color:#fed7aa}
.pedido-detalhe-section-title.retirada{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}
.pedido-detalhe-section-title.mesa{background:#ecfdf3;color:#15803d;border-color:#bbf7d0}
.pedido-detalhe-section-title.outro{background:#f8fafc;color:#64748b;border-color:#e5e7eb}
.pedido-detalhe-section-links{display:flex;gap:12px;margin-top:10px;justify-content:center}
.pedido-detalhe-section-links button{
  border:1px solid #e5e7eb;
  background:#fff;
  color:#9C5523;
  font-size:.78rem;
  padding:6px 12px;
  border-radius:999px;
  box-shadow:0 8px 18px rgba(15,23,42,.08);
}
.pedido-detalhe-pagamentos{font-size:.85rem;color:#111827}
.pedido-detalhe-itens{margin-top:8px}
.pedido-detalhe-item-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:.76rem;color:#0f172a}
.pedido-detalhe-item-row span{display:block;font-size:.78rem;line-height:1.7;color:#374151;font-weight:400;white-space:pre-line}
.pedido-detalhe-item-row span small{display:block;font-size:.72rem;line-height:1.6;color:#6b7280;font-weight:400;margin-top:4px}
.pedido-detalhe-item-row strong{font-size:.78rem;font-weight:500;color:#111827}
.pedido-detalhe-item-row:last-child{border-bottom:0}
.pedido-detalhe-totais{margin-top:10px;font-size:.76rem;color:#0f172a;line-height:1.6}
.pedido-detalhe-totais div{display:flex;align-items:center;justify-content:space-between;margin-top:4px}
.pedido-detalhe-totais div span{font-weight:400;color:#6b7280}
.pedido-detalhe-totais .pedido-detalhe-total-strong span{font-weight:700;color:#111827}
.pedido-detalhe-totais strong{font-size:.78rem;font-weight:500;color:#111827}
.pedido-detalhe-footer{border:0;display:flex;justify-content:flex-end;gap:10px;padding:12px 16px}
.pedido-detalhe-footer .btn{border-radius:999px}
.pedido-detalhe-footer .btn-outline-secondary{border-color:#e5e7eb;color:#475569}
#modalPedidoDetalhe .modal-dialog{max-width:526px;width:526px}
#modalPedidoDetalhe .modal-content{height:auto;max-height:calc(100vh - 24px)}
#modalPedidoDetalhe .modal-body{overflow-y:auto}
#modalClientePerfil .modal-dialog{max-width:577px;width:577px}
#modalClientePerfil .modal-content{
  height:481px;
  max-height:calc(100vh - 24px);
  border-radius:24px;
  overflow:hidden;
  box-shadow:0 22px 50px rgba(15,23,42,.18);
  background:#fff;
}
#modalClientePerfil .modal-body{padding:16px;overflow-y:auto}
.cliente-perfil-header{
  display:flex;
  align-items:center;
  gap:12px;
  margin-bottom:8px;
}
.cliente-perfil-avatar{
  width:46px;
  height:46px;
  border-radius:50%;
  background:#eef2f7;
  color:#0f172a;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:700;
}
.cliente-perfil-nome{
  font-size:1rem;
  font-weight:700;
  color:#0f172a;
}
.cliente-perfil-desde{
  font-size:.8rem;
  color:#9aa6b5;
}
.cliente-perfil-tabs{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  background:#f8fafc;
  border-radius:12px;
  padding:6px;
  margin:10px 0 12px;
}
.cliente-perfil-tabs .cliente-tab{
  border:0;
  background:transparent;
  color:#9aa6b5;
  font-size:.8rem;
  padding:6px 10px;
  border-radius:10px;
  display:flex;
  align-items:center;
  gap:6px;
}
.cliente-perfil-tabs .cliente-tab.active{
  background:#9C5523;
  color:#fff;
  box-shadow:0 8px 18px rgba(156,85,35,.25);
}
.cliente-tab-content{display:none}
.cliente-tab-content.active{display:block}
.cliente-perfil-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px;
}
.cliente-perfil-card{
  background:#fff;
  border:1px solid #eef2f7;
  border-radius:16px;
  padding:12px;
  box-shadow:0 10px 18px rgba(15,23,42,.06);
  display:flex;
  align-items:center;
  gap:10px;
  min-height:70px;
}
.cliente-perfil-card i{
  font-size:1.1rem;
  color:#0f172a;
}
.cliente-perfil-card strong{
  display:block;
  font-size:.9rem;
  font-weight:700;
  color:#0f172a;
}
.cliente-perfil-card span{
  font-size:.78rem;
  color:#9aa6b5;
}
.cliente-perfil-expira{
  font-size:.72rem;
  color:#9aa6b5;
  margin-top:2px;
}
.cliente-perfil-expirado{
  color:#ef4444;
  font-weight:600;
  margin-top:6px;
  font-size:.78rem;
}
.cliente-perfil-info{
  margin-top:14px;
}
.cliente-perfil-info h6{
  font-size:.85rem;
  font-weight:700;
  color:#0f172a;
  margin-bottom:6px;
}
.cliente-perfil-info .info-item{
  font-size:.8rem;
  color:#9aa6b5;
  margin-bottom:6px;
}
.cliente-perfil-info .info-item strong{
  display:block;
  font-size:.85rem;
  color:#0f172a;
}
.cliente-perfil-footer{
  display:flex;
  justify-content:flex-end;
  gap:10px;
  margin-top:12px;
}
.cliente-perfil-footer .btn{
  border-radius:999px;
  padding:8px 14px;
  font-size:.8rem;
}
.cliente-perfil-footer .btn-outline-secondary{
  border-color:#e5e7eb;
  color:#7c8aa0;
}
.cliente-perfil-footer .btn-primary{
  background:#9C5523;
  border:0;
  box-shadow:0 10px 20px rgba(156,85,35,.2);
}
.clientes-modal .modal-content{border-radius:18px;border:0}
.clientes-modal .modal-header{border:0}
.clientes-modal .modal-title{font-size:1rem;font-weight:600}
.clientes-modal .form-control{border-radius:12px;background:#f3f4f6;border:1px solid #e5e7eb}
.clientes-modal .btn-primary{background:#9C5523;border:0}
.clientes-modal-body{padding:16px 20px}
.clientes-modal-section{margin-bottom:18px}
.clientes-modal-section h6{font-size:.9rem;font-weight:600;color:#111827;margin-bottom:10px}
.cliente-pedidos-title{font-size:.9rem;font-weight:600;color:#111827;margin-bottom:10px}
.cliente-pedidos-filtros{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:12px}
.cliente-pedidos-filtro label{font-size:.72rem;color:#6b7280;margin-bottom:6px;display:block}
.cliente-pedidos-filtro select{
  width:100%;
  border:1px solid #e5e7eb;
  background:#f3f4f6;
  border-radius:12px;
  padding:8px 10px;
  font-size:.85rem;
  color:#111827;
}
.cliente-pedido-card{
  background:#fff;
  border:1px solid #eef2f7;
  border-radius:16px;
  padding:12px 14px;
  box-shadow:0 10px 18px rgba(15,23,42,.06);
  margin-bottom:12px;
}
.cliente-pedido-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
.pedido-badge{
  font-size:.7rem;
  font-weight:600;
  padding:4px 8px;
  border-radius:999px;
  background:#f8fafc;
  color:#64748b;
}
.pedido-badge.entrega{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}
.pedido-badge.retirada{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
.pedido-badge.mesa{background:#ecfdf3;color:#15803d;border:1px solid #bbf7d0}
.cliente-pedido-resumo{font-size:.8rem;color:#7c8aa0;margin-bottom:6px}
.cliente-pedido-total{display:flex;justify-content:space-between;font-size:.85rem;font-weight:600}
.cliente-pedidos-pagination{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px}
.cliente-pedidos-pagination button{
  border:0;
  background:#f3f4f6;
  color:#6b7280;
  border-radius:999px;
  padding:6px 10px;
  min-width:32px;
}
.cliente-pedidos-pagination button.active{background:#6d28d9;color:#fff}
.cliente-pedidos-vazio{
  background:#fff;
  border:1px dashed #e5e7eb;
  border-radius:14px;
  padding:16px;
  color:#6b7280;
  font-size:.85rem;
}
.cliente-pontos-card{
  background:#fff;
  border:1px solid #eef2f7;
  border-radius:14px;
  padding:10px 12px;
  box-shadow:0 8px 16px rgba(15,23,42,.06);
  margin-bottom:10px;
}
.cliente-pontos-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  font-size:.72rem;
  color:#94a3b8;
  margin-bottom:6px;
}
.cliente-pontos-badge{
  font-size:.68rem;
  font-weight:600;
  padding:4px 8px;
  border-radius:999px;
  background:#f1f5f9;
  color:#64748b;
  border:1px solid #e2e8f0;
}
.cliente-pontos-badge.ganho{
  background:#ecfdf3;
  color:#15803d;
  border-color:#bbf7d0;
}
.cliente-pontos-badge.resgate{
  background:#fef2f2;
  color:#b91c1c;
  border-color:#fecaca;
}
.cliente-pontos-info{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  font-size:.85rem;
  color:#0f172a;
}
.cliente-pontos-info strong{font-weight:700}
.cliente-pontos-desc{
  font-size:.75rem;
  color:#94a3b8;
  margin-top:2px;
}
.cliente-avaliacoes-box{
  background:#fff;
  border:1px dashed #e5e7eb;
  border-radius:14px;
  padding:16px;
  color:#6b7280;
  font-size:.85rem;
  display:flex;
  gap:10px;
  align-items:center;
}
@media (max-width: 992px){
  .pedidos-header{flex-direction:column;align-items:flex-start}
  .pedidos-actions{width:100%}
}
@media (max-width: 600px){
  #modalPedidoDetalhe .modal-dialog{width:calc(100% - 20px);max-width:calc(100% - 20px)}
  #modalPedidoDetalhe .modal-content{height:auto;max-height:calc(100vh - 20px)}
}
</style>
</head>

<body class="dash-diggy">
<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid pedidos-page">
  <div class="pedidos-header">
    <div>
      <h1 class="pedidos-title">Lista de Pedidos</h1>
      <p class="pedidos-subtitle">Filtros para pedidos</p>
    </div>
    <div class="pedidos-actions">
      <button class="btn btn-diggy-ghost" type="button" id="btnZerarSequencia">Zerar sequencia de pedidos</button>
      <a class="btn btn-diggy-primary" onclick="novoPedido()">PDV - Lancar pedido</a>
    </div>

  

  </div>

  <div class="pedidos-filter-card">
    <div class="pedidos-filter-head">
      <div class="pedidos-filter-title-wrap">
        <div class="pedidos-filter-title">Filtros para pedidos</div>
        <div class="pedidos-filter-sub"><span id="pedidosEncontrados"><?= $total ?></span> pedidos encontrados</div>
      </div>
      <form id="filtrosForm" class="pedidos-filter-inline" autocomplete="off">
        <select class="form-select" id="statusSelect" name="status" title="Status">
          <option value="">Todos os status</option>
          <option value="pendente" <?= $status === 'pendente' ? 'selected' : '' ?>>Pendente</option>
          <option value="aceito" <?= $status === 'aceito' ? 'selected' : '' ?>>Aceito</option>
          <option value="preparando" <?= $status === 'preparando' ? 'selected' : '' ?>>Em preparo</option>
          <option value="entrega" <?= $status === 'entrega' ? 'selected' : '' ?>>Em entrega</option>
          <option value="finalizado" <?= $status === 'finalizado' ? 'selected' : '' ?>>Finalizado</option>
          <option value="cancelado" <?= $status === 'cancelado' ? 'selected' : '' ?>>Cancelado</option>
        </select>
        <input class="form-control js-flatpickr-range" type="text" id="dataInput"
               placeholder="Período"
               data-ini="<?= htmlspecialchars($dataIni) ?>"
               data-fim="<?= htmlspecialchars($dataFim) ?>"
               readonly>
        <input type="hidden" id="dataIniInput" name="data_ini" value="<?= htmlspecialchars($dataIni) ?>">
        <input type="hidden" id="dataFimInput" name="data_fim" value="<?= htmlspecialchars($dataFim) ?>">
      </form>
    </div>
  </div>

  <div id="pedidosTabela" class="pedidos-results">
    <?php renderPedidosTabela($pedidos, $paginas, $pagina, $limite, $total); ?>
  </div>

  <div class="dash-footer">Cardapio Digital Will (c) 2026</div>
</div>

<!-- ── Modal Zerar Sequência ── -->
<div class="zerar-overlay" id="zerarOverlay" onclick="fecharZerarModal()">
  <div class="zerar-modal" onclick="event.stopPropagation()">
    <div class="zerar-icon"><i class="bi bi-arrow-counterclockwise"></i></div>
    <div class="zerar-title">Zerar sequência de pedidos?</div>
    <div class="zerar-sub">O próximo pedido receberá o número <strong>#1</strong>. Os pedidos existentes <strong>não serão alterados</strong>. Recomendado fazer no início de cada mês.</div>
    <div class="zerar-btns">
      <button class="zerar-btn-cancelar" onclick="fecharZerarModal()">Cancelar</button>
      <button class="zerar-btn-confirmar" id="zerarBtnConfirmar" onclick="confirmarZerarSequencia()">Zerar sequência</button>
    </div>
  </div>
</div>
<style>
.zerar-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);z-index:2000;display:none;align-items:center;justify-content:center}
.zerar-overlay.show{display:flex}
.zerar-modal{background:#fff;border-radius:16px;padding:24px;width:320px;box-shadow:0 8px 32px rgba(0,0,0,.18);animation:zerarIn .22s cubic-bezier(.34,1.3,.64,1)}
@keyframes zerarIn{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
.zerar-icon{width:46px;height:46px;border-radius:50%;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:#d97706;margin:0 auto 12px}
.zerar-title{font-size:.95rem;font-weight:700;color:#111;text-align:center;margin-bottom:8px}
.zerar-sub{font-size:.78rem;color:#6b7280;text-align:center;margin-bottom:20px;line-height:1.5}
.zerar-btns{display:flex;gap:10px}
.zerar-btn-cancelar{flex:1;border:1.5px solid #e5e7eb;background:#fff;color:#374151;border-radius:10px;padding:9px;font-size:.8rem;font-weight:600;font-family:inherit;cursor:pointer;transition:background .15s}
.zerar-btn-cancelar:hover{background:#f9fafb}
.zerar-btn-confirmar{flex:1;border:0;background:#f59e0b;color:#fff;border-radius:10px;padding:9px;font-size:.8rem;font-weight:700;font-family:inherit;cursor:pointer;transition:background .15s}
.zerar-btn-confirmar:hover{background:#d97706}
.zerar-btn-confirmar:disabled{background:#d1d5db;cursor:not-allowed}
#pedidoDetalheImprimir .spin-icon{display:inline-block;animation:pedido-icon-spin .8s linear infinite}
@keyframes pedido-icon-spin{to{transform:rotate(360deg)}}
</style>

<div class="modal fade" id="modalPedidoDetalhe" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
    <div class="modal-content pedido-detalhe-modal">
      <div class="modal-header">
        <div class="pedido-detalhe-header w-100">
          <h5 id="pedidoDetalheNumero">Pedido N. -</h5>
          <div class="pedido-detalhe-actions">
            <button class="btn btn-outline-secondary btn-sm" type="button" id="pedidoDetalheEditar">
              <i class="bi bi-pencil"></i> Editar pedido
            </button>
            <button class="btn btn-outline-secondary btn-sm" type="button" id="pedidoDetalheImprimir">
              <i class="bi bi-printer"></i> Imprimir
            </button>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div class="pedido-detalhe-tempo" id="pedidoDetalheTempo">feito ha -</div>
        <div class="pedido-detalhe-divider"></div>

        <div class="pedido-detalhe-agendamento-section d-none" id="pedidoDetalheAgendamentoWrap">
          <div class="pedido-detalhe-agendamento-title">
            <i class="bi bi-calendar-event"></i>
            <span id="pedidoDetalheAgendamentoTitulo">RETIRADA AGENDADA</span>
            <span class="pedido-detalhe-agendamento-sub" id="pedidoDetalheAgendamentoOrigem"></span>
          </div>
          <div class="pedido-detalhe-agendamento-box" id="pedidoDetalheAgendamentoBox">Agendado para: -</div>
        </div>

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
          <div class="pedido-detalhe-item d-none" id="pedidoDetalheMotoboyWrap">
            <span>Motoboy</span>
            <strong id="pedidoDetalheMotoboy">-</strong>
          </div>
          <div class="pedido-detalhe-section-links" id="pedidoDetalheEntregaLinks">
            <button type="button" id="pedidoDetalheCopiarEndereco">Copiar endereco</button>
            <button type="button" id="pedidoDetalheVincularEntregador">Vincular entregador</button>
          </div>
        </div>

        <div class="pedido-detalhe-section">
          <div class="pedido-detalhe-section-title">
            <i class="bi bi-credit-card"></i> Pagamento
          </div>
          <div class="pedido-detalhe-pagamentos" id="pedidoDetalhePagamentos">-</div>
        </div>

        <div class="pedido-detalhe-section d-none" id="pedidoDetalheObsWrap">
          <div class="pedido-detalhe-section-title outro">
            <i class="bi bi-chat-left-text"></i> Observacoes do cliente
          </div>
          <div class="pedido-detalhe-item" id="pedidoDetalheObsTexto">-</div>
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

</main>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/pt.js"></script>
<script>
const resultadosEl = document.getElementById('pedidosTabela');
const filtrosForm = document.getElementById('filtrosForm');
const statusSelect = document.getElementById('statusSelect');
const dataInput = document.getElementById('dataInput');
const filtrosAvancados = document.getElementById('filtrosAvancados');
const btnFiltrosAvancados = document.getElementById('btnFiltrosAvancados');
const btnLimpar = document.getElementById('btnLimpar');
const pedidosEncontrados = document.getElementById('pedidosEncontrados');
const btnZerarSequencia = document.getElementById('btnZerarSequencia');
let paginaAtual = <?= (int)$pagina ?>;

function obterLimiteAtual(){
  const select = document.getElementById('limiteSelect');
  return select ? select.value : '10';
}

function atualizarResumo(){
  if (!resultadosEl) return;
  const card = resultadosEl.querySelector('.pedidos-table-card');
  if (!card || !pedidosEncontrados) return;
  pedidosEncontrados.textContent = card.dataset.total || '0';
  const paginaAtualizada = Number(card.dataset.pagina || 1);
  paginaAtual = paginaAtualizada > 0 ? paginaAtualizada : paginaAtual;
}

async function carregarTabela(pagina){
  if (!resultadosEl) return;
  const params = new URLSearchParams();
  params.set('ajax', '1');
  params.set('pagina', pagina || 1);
  params.set('limite', obterLimiteAtual());
  if (statusSelect && statusSelect.value) params.set('status', statusSelect.value);
  const iniVal = document.getElementById('dataIniInput');
  const fimVal = document.getElementById('dataFimInput');
  if (iniVal && iniVal.value) {
    params.set('data_ini', iniVal.value);
    params.set('data_fim', (fimVal && fimVal.value) ? fimVal.value : iniVal.value);
  }

  resultadosEl.classList.add('is-loading');
  try {
    const res = await fetch(`pedidos.php?${params.toString()}`);
    const html = await res.text();
    resultadosEl.innerHTML = html;
    if (window.refreshCustomSelects) window.refreshCustomSelects(resultadosEl);
    atualizarResumo();

    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('pagina', pagina || 1);
    urlParams.set('limite', obterLimiteAtual());
    if (statusSelect && statusSelect.value) {
      urlParams.set('status', statusSelect.value);
    } else {
      urlParams.delete('status');
    }
    if (dataInput && dataInput.value) {
      urlParams.set('data', dataInput.value);
    } else {
      urlParams.delete('data');
    }
    history.replaceState(null, '', `pedidos.php?${urlParams.toString()}`);
  } catch (err) {
    console.warn('Falha ao carregar pedidos.', err);
  } finally {
    resultadosEl.classList.remove('is-loading');
  }
}

if (btnFiltrosAvancados && filtrosAvancados) {
  btnFiltrosAvancados.addEventListener('click', () => {
    filtrosAvancados.classList.toggle('is-open');
  });
}

if (filtrosForm) {
  filtrosForm.addEventListener('submit', e => {
    e.preventDefault();
    carregarTabela(1);
  });
}

/* Status: auto-filtro ao alterar */
if (statusSelect) {
  statusSelect.addEventListener('change', () => carregarTabela(1));
}

/* Zerar sequência — modal elegante */
function abrirZerarModal(){
  const ov=document.getElementById('zerarOverlay');
  if(ov){ov.style.display='flex';requestAnimationFrame(()=>ov.classList.add('show'));}
}
function fecharZerarModal(){
  const ov=document.getElementById('zerarOverlay');
  if(ov){ov.classList.remove('show');setTimeout(()=>ov.style.display='none',250);}
}
async function confirmarZerarSequencia(){
  const btn=document.getElementById('zerarBtnConfirmar');
  if(btn){btn.disabled=true;btn.textContent='Zerando...';}
  try{
    const r=await fetch('api/pedidos_zerar_sequencia.php',{method:'POST',credentials:'same-origin'});
    const d=await r.json();
    fecharZerarModal();
    if(d.ok){
      /* toast ou alert simples */
      const t=document.createElement('div');
      t.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#15803d;color:#fff;padding:10px 20px;border-radius:10px;font-size:.85rem;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.2)';
      t.textContent='✓ '+d.msg;
      document.body.appendChild(t);
      setTimeout(()=>t.remove(),3500);
    } else {
      alert('Erro: '+(d.msg||'Falha ao zerar sequência.'));
    }
  }catch(e){
    fecharZerarModal();
    alert('Erro de conexão.');
  }
  if(btn){btn.disabled=false;btn.textContent='Zerar sequência';}
}

if(btnZerarSequencia){
  btnZerarSequencia.addEventListener('click',()=>abrirZerarModal());
}

/* flatpickr range — período com auto-aplicar */
(function(){
  const rangeInput = document.getElementById('dataInput');
  const iniInput   = document.getElementById('dataIniInput');
  const fimInput   = document.getElementById('dataFimInput');
  if (!rangeInput) return;

  const ini = rangeInput.dataset.ini || '';
  const fim = rangeInput.dataset.fim || '';
  const defaultDates = ini ? (fim && fim !== ini ? [ini, fim] : [ini]) : [];

  const fmtDisplay = (d) => {
    const [y,m,day] = d.toISOString().slice(0,10).split('-');
    return `${day}/${m}/${y}`;
  };

  flatpickr(rangeInput, {
    mode: 'range',
    dateFormat: 'Y-m-d',
    locale: 'pt',
    allowInput: false,
    disableMobile: true,
    defaultDate: defaultDates,
    onReady: function(dates, str, fp) {
      /* exibe range legível */
      if (dates.length >= 1) {
        const d1 = fmtDisplay(dates[0]);
        const d2 = dates[1] ? fmtDisplay(dates[1]) : d1;
        fp.altInput ? (fp.altInput.value = d1 === d2 ? d1 : `${d1} até ${d2}`) : null;
        rangeInput.value = d1 === d2 ? d1 : `${d1} até ${d2}`;
      }
    },
    onChange: function(dates) {
      if (dates.length === 0) {
        if (iniInput) iniInput.value = '';
        if (fimInput) fimInput.value = '';
        return;
      }
      const fmt = (d) => d.toISOString().slice(0,10);
      const d1 = fmt(dates[0]);
      const d2 = dates[1] ? fmt(dates[1]) : d1;
      if (iniInput) iniInput.value = d1;
      if (fimInput) fimInput.value = d2;
      /* auto-aplicar quando o range estiver completo */
      if (dates.length === 2 || (dates.length === 1)) {
        if (dates.length === 2) carregarTabela(1);
      }
    },
    onClose: function(dates) {
      /* ao fechar com apenas 1 data, aplica como dia único */
      if (dates.length === 1) carregarTabela(1);
    }
  });
})();

/* flatpickr simples (outros campos) */
document.querySelectorAll('.js-flatpickr').forEach((input) => {
  if (input.dataset.fpReady === '1') return;
  input.dataset.fpReady = '1';
  flatpickr(input, {
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'd/m/Y',
    locale: 'pt',
    allowInput: false,
    disableMobile: true,
  });
});

document.addEventListener('change', e => {
  if (e.target && e.target.id === 'limiteSelect') {
    carregarTabela(1);
  }
});

document.addEventListener('click', e => {
  const printBtn = e.target.closest('[data-action="imprimir"]');
  if (printBtn && resultadosEl && resultadosEl.contains(printBtn)) {
    e.stopPropagation();
    const id = printBtn.dataset.pedidoId;
    if (id) imprimirPedido(id);
    return;
  }

  const pageBtn = e.target.closest('.rc-page-btn');
  if (pageBtn && resultadosEl && resultadosEl.contains(pageBtn)) {
    const page = Number(pageBtn.dataset.page || 1);
    if (!pageBtn.disabled) carregarTabela(page);
    return;
  }

  const row = e.target.closest('.pedido-row');
  if (row && resultadosEl && resultadosEl.contains(row)) {
    const id = row.dataset.pedidoId;
    if (id) abrirModalPedidoDetalhe(id);
  }
});

atualizarResumo();

const modalPedidoDetalheEl = document.getElementById('modalPedidoDetalhe');
const modalPedidoDetalhe = modalPedidoDetalheEl ? new bootstrap.Modal(modalPedidoDetalheEl) : null;

const pedidoDetalheNumero = document.getElementById('pedidoDetalheNumero');
const pedidoDetalheTempo = document.getElementById('pedidoDetalheTempo');
const pedidoDetalheHorario = document.getElementById('pedidoDetalheHorario');
const pedidoDetalheStatus = document.getElementById('pedidoDetalheStatus');
const pedidoDetalheCliente = document.getElementById('pedidoDetalheCliente');
const pedidoDetalheTelefone = document.getElementById('pedidoDetalheTelefone');
const pedidoDetalheStatsWrap = document.getElementById('pedidoDetalheStatsWrap');
const pedidoDetalhePedidosFeitos = document.getElementById('pedidoDetalhePedidosFeitos');
const pedidoDetalheTicketMedio = document.getElementById('pedidoDetalheTicketMedio');
const pedidoDetalhePontos = document.getElementById('pedidoDetalhePontos');
const pedidoDetalhePontosMetric = document.getElementById('pedidoDetalhePontosMetric');
const pedidoDetalheCashbackTotal = document.getElementById('pedidoDetalheCashbackTotal');
const pedidoDetalheCashbackMetric = document.getElementById('pedidoDetalheCashbackMetric');
const pedidoDetalheCashbackExpira = document.getElementById('pedidoDetalheCashbackExpira');
const pedidoDetalheCashbackExpirado = document.getElementById('pedidoDetalheCashbackExpirado');
const pedidoDetalheVerCliente = document.getElementById('pedidoDetalheVerCliente');
const modalClientePerfilEl = document.getElementById('modalClientePerfil');
const modalClientePerfil = modalClientePerfilEl ? new bootstrap.Modal(modalClientePerfilEl) : null;
const modalClienteEditEl = document.getElementById('modalClienteEdit');
const modalClienteEdit = modalClienteEditEl ? new bootstrap.Modal(modalClienteEditEl) : null;
const clienteEditTitulo = modalClienteEditEl ? modalClienteEditEl.querySelector('.modal-title') : null;
const clienteEditId = document.getElementById('clienteEditId');
const clienteEditNome = document.getElementById('clienteEditNome');
const clienteEditTelefone = document.getElementById('clienteEditTelefone');
const clienteEditAniversario = document.getElementById('clienteEditAniversario');
const clienteEditCep = document.getElementById('clienteEditCep');
const clienteEditRua = document.getElementById('clienteEditRua');
const clienteEditNumero = document.getElementById('clienteEditNumero');
const clienteEditBairro = document.getElementById('clienteEditBairro');
const clienteEditCidade = document.getElementById('clienteEditCidade');
const clienteEditEstado = document.getElementById('clienteEditEstado');
const clienteEditComplemento = document.getElementById('clienteEditComplemento');
const clienteEditSalvar = document.getElementById('clienteEditSalvar');
const clienteEditNomeErro = document.getElementById('clienteEditNomeErro');
const clienteEditTelefoneErro = document.getElementById('clienteEditTelefoneErro');
const clientePerfilAvatar = document.getElementById('clientePerfilAvatar');
const clientePerfilNome = document.getElementById('clientePerfilNome');
const clientePerfilDesde = document.getElementById('clientePerfilDesde');
const clientePerfilCashback = document.getElementById('clientePerfilCashback');
const clientePerfilCashbackExpira = document.getElementById('clientePerfilCashbackExpira');
const clientePerfilCashbackExpirado = document.getElementById('clientePerfilCashbackExpirado');
const clientePerfilPontos = document.getElementById('clientePerfilPontos');
const clientePerfilFiado = document.getElementById('clientePerfilFiado');
const clientePerfilTicket = document.getElementById('clientePerfilTicket');
const clientePerfilUltimoPedido = document.getElementById('clientePerfilUltimoPedido');
const clientePerfilPedidos = document.getElementById('clientePerfilPedidos');
const clientePerfilTelefone = document.getElementById('clientePerfilTelefone');
const clientePerfilEndereco = document.getElementById('clientePerfilEndereco');
const clientePerfilRegistrarFiado = document.getElementById('clientePerfilRegistrarFiado');
const clientePerfilEditar = document.getElementById('clientePerfilEditar');
const clientePerfilTabs = document.getElementById('clientePerfilTabs');
const clientePedidosPeriodo = document.getElementById('clientePedidosPeriodo');
const clientePedidosTipo = document.getElementById('clientePedidosTipo');
const clientePedidosLista = document.getElementById('clientePedidosLista');
const clientePedidosPaginacao = document.getElementById('clientePedidosPaginacao');
const clientePontosLista = document.getElementById('clientePontosLista');
const clientePontosPaginacao = document.getElementById('clientePontosPaginacao');
const pedidoDetalheContato = document.getElementById('pedidoDetalheContato');
const pedidoDetalheWhatsapp = document.getElementById('pedidoDetalheWhatsapp');
const pedidoDetalheTipoTitulo = document.getElementById('pedidoDetalheTipoTitulo');
const pedidoDetalheEnderecoWrap = document.getElementById('pedidoDetalheEnderecoWrap');
const pedidoDetalheEndereco = document.getElementById('pedidoDetalheEndereco');
const pedidoDetalheTaxaWrap = document.getElementById('pedidoDetalheTaxaWrap');
const pedidoDetalheTaxa = document.getElementById('pedidoDetalheTaxa');
const pedidoDetalheEntregaLinks = document.getElementById('pedidoDetalheEntregaLinks');
const pedidoDetalheCopiarEndereco = document.getElementById('pedidoDetalheCopiarEndereco');
const pedidoDetalheVincularEntregador = document.getElementById('pedidoDetalheVincularEntregador');
const pedidoDetalhePagamentos = document.getElementById('pedidoDetalhePagamentos');
const pedidoDetalheItens = document.getElementById('pedidoDetalheItens');
const pedidoDetalheSubtotal = document.getElementById('pedidoDetalheSubtotal');
const pedidoDetalheDesconto = document.getElementById('pedidoDetalheDesconto');
const pedidoDetalheTaxaResumo = document.getElementById('pedidoDetalheTaxaResumo');
const pedidoDetalheMaquininha = document.getElementById('pedidoDetalheMaquininha');
const pedidoDetalheCashback = document.getElementById('pedidoDetalheCashback');
const pedidoDetalheTotal = document.getElementById('pedidoDetalheTotal');
const pedidoDetalheLinhaDesconto = document.getElementById('pedidoDetalheLinhaDesconto');
const pedidoDetalheLinhaTaxa = document.getElementById('pedidoDetalheLinhaTaxa');
const pedidoDetalheLinhaMaquininha = document.getElementById('pedidoDetalheLinhaMaquininha');
const pedidoDetalheLinhaCashback = document.getElementById('pedidoDetalheLinhaCashback');
const pedidoDetalheEditar = document.getElementById('pedidoDetalheEditar');
const pedidoDetalheImprimir = document.getElementById('pedidoDetalheImprimir');
const pedidoDetalheCancelar = document.getElementById('pedidoDetalheCancelar');
const pedidoDetalheFinalizar = document.getElementById('pedidoDetalheFinalizar');
let pedidoDetalheAtual = null;
const podeGerenciarPedidos = <?= json_encode(in_array($perfil, ['admin', 'gerente'], true)) ?>;
let clientePerfilAtual = null;
let clientePedidosPagina = 1;
let clientePedidosCarregado = false;
let clientePontosPagina = 1;
let clientePontosCarregado = false;
let clientePerfilUltimoPedidoId = null;
let clientePerfilReabrir = false;

function normalizarData(valor){
  if (!valor) return '';
  return valor.includes(' ') ? valor.replace(' ', 'T') : valor;
}

function formatarDataHora(valor){
  if (!valor) return '-';
  const data = new Date(normalizarData(valor));
  if (Number.isNaN(data.getTime())) return valor;
  const dia = String(data.getDate()).padStart(2,'0');
  const mes = String(data.getMonth() + 1).padStart(2,'0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2,'0');
  const min = String(data.getMinutes()).padStart(2,'0');
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

function formatarMoeda(valor){
  const numero = Number(valor || 0);
  return `R$ ${numero.toFixed(2).replace('.',',')}`;
}

function formatarData(valor){
  if (!valor) return '-';
  const data = new Date(normalizarData(valor));
  if (Number.isNaN(data.getTime())) return valor;
  const dia = String(data.getDate()).padStart(2,'0');
  const mes = String(data.getMonth() + 1).padStart(2,'0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function limparErrosCliente(){
  if (clienteEditNome) clienteEditNome.classList.remove('is-invalid');
  if (clienteEditTelefone) clienteEditTelefone.classList.remove('is-invalid');
  if (clienteEditNomeErro) clienteEditNomeErro.textContent = '';
  if (clienteEditTelefoneErro) clienteEditTelefoneErro.textContent = '';
}

function preencherClienteModal(data){
  if (clienteEditTitulo) {
    clienteEditTitulo.textContent = data.id ? 'Editar cliente' : 'Criar cliente';
  }
  if (clienteEditId) clienteEditId.value = data.id || '';
  if (clienteEditNome) clienteEditNome.value = data.nome || '';
  if (clienteEditTelefone) clienteEditTelefone.value = formatarTelefone(data.telefone || '');
  if (clienteEditAniversario) clienteEditAniversario.value = data.aniversario || '';
  if (clienteEditCep) clienteEditCep.value = data.cep || '';
  if (clienteEditRua) clienteEditRua.value = data.rua || data.endereco || '';
  if (clienteEditNumero) clienteEditNumero.value = data.numero || '';
  if (clienteEditBairro) clienteEditBairro.value = data.bairro || '';
  if (clienteEditCidade) clienteEditCidade.value = data.cidade || '';
  if (clienteEditEstado) clienteEditEstado.value = data.estado || '';
  if (clienteEditComplemento) clienteEditComplemento.value = data.complemento || '';
  limparErrosCliente();
}

function formatarTelefone(valor){
  const digits = (valor || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}

function aplicarMascaraTelefone(input){
  if (!input) return;
  const pos = input.selectionStart || 0;
  input.value = formatarTelefone(input.value);
  if (input === document.activeElement) {
    const delta = input.value.length - pos;
    const novaPos = Math.max(0, pos + delta);
    input.setSelectionRange(novaPos, novaPos);
  }
}

function montarEnderecoClienteModal(){
  const cep = clienteEditCep ? clienteEditCep.value.trim() : '';
  const rua = clienteEditRua ? clienteEditRua.value.trim() : '';
  const numero = clienteEditNumero ? clienteEditNumero.value.trim() : '';
  const bairro = clienteEditBairro ? clienteEditBairro.value.trim() : '';
  const cidade = clienteEditCidade ? clienteEditCidade.value.trim() : '';
  const estado = clienteEditEstado ? clienteEditEstado.value.trim() : '';
  const complemento = clienteEditComplemento ? clienteEditComplemento.value.trim() : '';

  const partes = [];
  if (rua !== '') partes.push(numero !== '' ? `${rua}, ${numero}` : rua);
  if (bairro !== '') partes.push(bairro);
  const cidadeEstado = `${cidade}${estado ? ` / ${estado}` : ''}`.trim();
  if (cidadeEstado !== '') partes.push(cidadeEstado);
  if (cep !== '') partes.push(cep);
  if (complemento !== '') partes.push(complemento);

  return {
    cep,
    rua,
    numero,
    bairro,
    cidade,
    estado,
    complemento,
    endereco: partes.join(' - ')
  };
}

function validarClienteModal(){
  let ok = true;
  const nome = clienteEditNome ? clienteEditNome.value.trim() : '';
  const telefone = clienteEditTelefone ? clienteEditTelefone.value.trim() : '';

  if (!nome) {
    if (clienteEditNome) clienteEditNome.classList.add('is-invalid');
    if (clienteEditNomeErro) clienteEditNomeErro.textContent = 'Informe o nome do cliente.';
    ok = false;
  }
  if (!telefone) {
    if (clienteEditTelefone) clienteEditTelefone.classList.add('is-invalid');
    if (clienteEditTelefoneErro) clienteEditTelefoneErro.textContent = 'Informe o telefone do cliente.';
    ok = false;
  }
  return ok;
}

function salvarClienteModal(){
  if (!validarClienteModal()) return;
  const enderecoPayload = montarEnderecoClienteModal();
  const payload = {
    id: clienteEditId ? clienteEditId.value : '',
    nome: clienteEditNome ? clienteEditNome.value.trim() : '',
    telefone: clienteEditTelefone ? clienteEditTelefone.value.trim() : '',
    aniversario: clienteEditAniversario ? clienteEditAniversario.value : '',
    cep: enderecoPayload.cep,
    rua: enderecoPayload.rua,
    numero: enderecoPayload.numero,
    bairro: enderecoPayload.bairro,
    cidade: enderecoPayload.cidade,
    estado: enderecoPayload.estado,
    complemento: enderecoPayload.complemento,
    endereco: enderecoPayload.endereco
  };
  const url = payload.id ? 'api/cliente_atualizar.php' : 'api/cliente_salvar.php';

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(res => {
    if (!res || !res.ok) return;
    if (modalClienteEdit) modalClienteEdit.hide();
    if (clientePerfilNome) clientePerfilNome.textContent = payload.nome;
    if (clientePerfilAvatar) {
      const letra = payload.nome.trim().charAt(0).toUpperCase();
      clientePerfilAvatar.textContent = letra || 'C';
    }
    if (clientePerfilTelefone) clientePerfilTelefone.textContent = payload.telefone;
    if (clientePerfilEndereco) clientePerfilEndereco.textContent = payload.endereco || '-';
    if (clientePerfilAtual) {
      clientePerfilAtual = { ...clientePerfilAtual, ...payload };
    }
  });
}

function abrirModalClienteEdit(clienteId){
  if (!modalClienteEdit) return;
  const id = clienteId || (clientePerfilAtual ? clientePerfilAtual.id : '');
  const basePayload = {
    id,
    nome: clientePerfilNome ? clientePerfilNome.textContent.trim() : '',
    telefone: clientePerfilTelefone ? clientePerfilTelefone.textContent.trim() : '',
    endereco: clientePerfilEndereco ? clientePerfilEndereco.textContent.trim() : ''
  };
  preencherClienteModal(basePayload);
  clientePerfilReabrir = false;
  if (modalClientePerfil) {
    modalClientePerfil.hide();
    clientePerfilReabrir = true;
  }
  modalClienteEdit.show();
  if (!id) return;
  fetch(`api/cliente_detalhe.php?cliente_id=${id}`)
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok || !res.cliente) return;
      preencherClienteModal(res.cliente);
    })
    .catch(() => {});
}

function abrirModalClientePerfil(clienteId, baseInfo = {}){
  if (!modalClientePerfil || !clienteId) return;
  clientePerfilAtual = { id: clienteId };
  clientePedidosCarregado = false;
  clientePedidosPagina = 1;
  clientePontosCarregado = false;
  clientePontosPagina = 1;
  if (clientePedidosPeriodo) clientePedidosPeriodo.value = '30';
  if (clientePedidosTipo) clientePedidosTipo.value = 'todos';
  if (clientePedidosLista) clientePedidosLista.innerHTML = '';
  if (clientePedidosPaginacao) clientePedidosPaginacao.innerHTML = '';
  if (clientePontosLista) clientePontosLista.innerHTML = '';
  if (clientePontosPaginacao) clientePontosPaginacao.innerHTML = '';
  if (clientePerfilTabs) {
    clientePerfilTabs.querySelectorAll('.cliente-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === 'perfil');
    });
    document.querySelectorAll('#modalClientePerfil [data-tab-pane]').forEach(pane => {
      pane.classList.toggle('active', pane.dataset.tabPane === 'perfil');
    });
  }
  if (clientePerfilNome) clientePerfilNome.textContent = baseInfo.nome || 'Cliente';
  if (clientePerfilAvatar) {
    const letra = (baseInfo.nome || 'C').trim().charAt(0).toUpperCase();
    clientePerfilAvatar.textContent = letra || 'C';
  }
  if (clientePerfilDesde) clientePerfilDesde.textContent = 'Cliente desde: -';
  if (clientePerfilTelefone) clientePerfilTelefone.textContent = baseInfo.telefone || '-';
  if (clientePerfilEndereco) clientePerfilEndereco.textContent = baseInfo.endereco || '-';
  if (clientePerfilCashback) clientePerfilCashback.textContent = 'R$ 0,00';
  if (clientePerfilTicket) clientePerfilTicket.textContent = 'R$ 0,00';
  if (clientePerfilUltimoPedido) clientePerfilUltimoPedido.textContent = '-';
  if (clientePerfilPedidos) clientePerfilPedidos.textContent = '0';
  if (clientePerfilPontos) clientePerfilPontos.textContent = 'Sem dados';
  if (clientePerfilFiado) clientePerfilFiado.textContent = 'R$ 0,00';
  if (clientePerfilCashbackExpira) clientePerfilCashbackExpira.classList.add('d-none');
  if (clientePerfilCashbackExpirado) clientePerfilCashbackExpirado.classList.add('d-none');

  if (clientePerfilEditar) {
    clientePerfilEditar.onclick = () => abrirModalClienteEdit(clienteId);
  }
  if (clientePerfilRegistrarFiado) {
    clientePerfilRegistrarFiado.onclick = () => window.open(`clientes.php?cliente_id=${clienteId}`, '_blank');
  }

  modalClientePerfil.show();

  fetch(`api/pdv_cliente_stats.php?cliente_id=${clienteId}`)
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok) return;
      const cliente = res.cliente || {};
      const stats = res.stats || {};
      if (clientePerfilNome) clientePerfilNome.textContent = cliente.nome || baseInfo.nome || 'Cliente';
      if (clientePerfilAvatar) {
        const letra = (cliente.nome || baseInfo.nome || 'C').trim().charAt(0).toUpperCase();
        clientePerfilAvatar.textContent = letra || 'C';
      }
      if (clientePerfilDesde) clientePerfilDesde.textContent = `Cliente desde: ${cliente.criado_em ? formatarData(cliente.criado_em) : '-'}`;
      if (clientePerfilTelefone) clientePerfilTelefone.textContent = cliente.telefone || baseInfo.telefone || '-';
      if (clientePerfilEndereco) {
        const endereco = stats.ultimo_endereco || cliente.endereco || baseInfo.endereco || '-';
        clientePerfilEndereco.textContent = endereco || '-';
      }
      if (clientePerfilCashback) clientePerfilCashback.textContent = formatarMoeda(stats.cashback_saldo || 0);
      if (clientePerfilPontos) {
        const pontosValor = stats.pontos;
        clientePerfilPontos.textContent = (pontosValor === undefined || pontosValor === null)
          ? 'Sem dados'
          : `${pontosValor} pts`;
      }
      if (clientePerfilTicket) clientePerfilTicket.textContent = formatarMoeda(stats.ticket_medio || 0);
      if (clientePerfilUltimoPedido) {
        clientePerfilUltimoPedido.textContent = stats.ultimo_pedido
          ? formatarData(stats.ultimo_pedido.criado_em)
          : '-';
      }
      if (clientePerfilPedidos) clientePerfilPedidos.textContent = stats.total_pedidos || 0;
      clientePerfilUltimoPedidoId = stats.ultimo_pedido ? stats.ultimo_pedido.id : null;
      if (clientePerfilCashbackExpira) {
        if ((stats.cashback_saldo || 0) > 0 && stats.cashback_expira_em) {
          clientePerfilCashbackExpira.textContent = `Expira em ${formatarData(stats.cashback_expira_em)}`;
          clientePerfilCashbackExpira.classList.remove('d-none');
        } else {
          clientePerfilCashbackExpira.classList.add('d-none');
        }
      }
      if (clientePerfilCashbackExpirado) {
        if ((stats.cashback_saldo || 0) <= 0 && stats.cashback_expirado) {
          clientePerfilCashbackExpirado.classList.remove('d-none');
        } else {
          clientePerfilCashbackExpirado.classList.add('d-none');
        }
      }
    })
    .catch(() => {});
}

function badgeTipoPedido(tipo){
  const valor = (tipo || '').toLowerCase();
  if (valor === 'entrega') return { label: 'Entrega', className: 'entrega' };
  if (valor === 'retirada') return { label: 'Retirada', className: 'retirada' };
  if (valor === 'mesa') return { label: 'Mesa', className: 'mesa' };
  return { label: tipo || 'Outro', className: 'retirada' };
}

function renderPedidos(pedidos, paginas){
  if (!clientePedidosLista || !clientePedidosPaginacao) return;
  if (!pedidos || pedidos.length === 0) {
    clientePedidosLista.innerHTML = '<div class="cliente-pedidos-vazio">Nenhum pedido encontrado para os filtros selecionados.</div>';
    clientePedidosPaginacao.innerHTML = '';
    return;
  }
  clientePedidosLista.innerHTML = pedidos.map(p => {
    const badge = badgeTipoPedido(p.tipo);
    const resumo = p.resumo || 'Sem itens.';
    return `
      <div class="cliente-pedido-card js-pedido-detalhe" data-pedido-id="${p.id}">
        <div class="cliente-pedido-top">
          <div class="cliente-pedido-data">
            <i class="bi bi-calendar-event"></i>
            Pedido realizado em: <strong>${formatarDataHora(p.criado_em)}</strong>
          </div>
          <span class="pedido-badge ${badge.className}">${badge.label}</span>
        </div>
        <div class="cliente-pedido-resumo">
          <small>Resumo do pedido:</small><br>
          ${resumo}
        </div>
        <div class="cliente-pedido-total">
          <span>Total:</span>
          <strong>${formatarMoeda(p.total)}</strong>
        </div>
      </div>
    `;
  }).join('');

  const pages = Math.max(1, paginas || 1);
  const prevDisabled = clientePedidosPagina <= 1;
  const nextDisabled = clientePedidosPagina >= pages;

  const itens = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) itens.push(i);
  } else {
    itens.push(1);
    if (clientePedidosPagina > 3) itens.push('...');
    const inicio = Math.max(2, clientePedidosPagina - 1);
    const fim = Math.min(pages - 1, clientePedidosPagina + 1);
    for (let i = inicio; i <= fim; i++) itens.push(i);
    if (clientePedidosPagina < pages - 2) itens.push('...');
    itens.push(pages);
  }

  let html = '';
  html += `<button type="button" ${prevDisabled ? 'disabled' : ''} data-page="${clientePedidosPagina - 1}">&lt;</button>`;
  for (const item of itens) {
    if (item === '...') {
      html += `<span style="padding:0 4px;color:#9aa6b5;font-size:.78rem;align-self:center">…</span>`;
    } else {
      html += `<button type="button" class="${item === clientePedidosPagina ? 'active' : ''}" data-page="${item}">${item}</button>`;
    }
  }
  html += `<button type="button" ${nextDisabled ? 'disabled' : ''} data-page="${clientePedidosPagina + 1}">&gt;</button>`;
  clientePedidosPaginacao.innerHTML = html;
}

function carregarPedidosCliente(pagina){
  if (!clientePerfilAtual || !clientePerfilAtual.id) return;
  if (!clientePedidosLista) return;
  const periodo = clientePedidosPeriodo ? clientePedidosPeriodo.value : '30';
  const tipo = clientePedidosTipo ? clientePedidosTipo.value : 'todos';
  clientePedidosPagina = pagina || 1;
  clientePedidosLista.innerHTML = '<div class="cliente-pedidos-vazio">Carregando pedidos...</div>';
  fetch(`api/cliente_pedidos.php?cliente_id=${clientePerfilAtual.id}&periodo=${periodo}&tipo=${tipo}&pagina=${clientePedidosPagina}`)
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok) {
        renderPedidos([], 1);
        return;
      }
      renderPedidos(res.pedidos || [], res.paginas || 1);
      clientePedidosCarregado = true;
    })
    .catch(() => renderPedidos([], 1));
}

function badgeTipoPontos(tipo){
  const valor = (tipo || '').toLowerCase();
  if (valor === 'resgate' || valor === 'expirado') return { label: 'Resgate', className: 'resgate' };
  if (valor === 'ganho') return { label: 'Ganho', className: 'ganho' };
  if (valor === 'ajuste') return { label: 'Ajuste', className: 'ganho' };
  return { label: 'Pontos', className: 'ganho' };
}

function renderPontosHistorico(itens, paginas){
  if (!clientePontosLista || !clientePontosPaginacao) return;
  if (!itens || itens.length === 0) {
    clientePontosLista.innerHTML = '<div class="cliente-pedidos-vazio">Nenhum historico de pontos encontrado.</div>';
    clientePontosPaginacao.innerHTML = '';
    return;
  }
  clientePontosLista.innerHTML = itens.map(item => {
    const badge = badgeTipoPontos(item.tipo);
    const sinal = (item.tipo === 'resgate' || item.tipo === 'expirado') ? '-' : '+';
    const pontosTxt = `${sinal}${Math.abs(Number(item.pontos || 0))} pts`;
    const pedidoTxt = item.pedido_id ? `Pedido #${item.pedido_id}` : 'Movimentacao manual';
    return `
      <div class="cliente-pontos-card">
        <div class="cliente-pontos-top">
          <span class="cliente-pontos-badge ${badge.className}">${badge.label}</span>
          <span>${formatarData(item.criado_em)}</span>
        </div>
        <div class="cliente-pontos-info">
          <strong>${pontosTxt}</strong>
          <span>${pedidoTxt}</span>
        </div>
        <div class="cliente-pontos-desc">Saldo: ${item.saldo_depois} pts</div>
      </div>
    `;
  }).join('');

  const pages = Math.max(1, paginas || 1);
  const prevDisabled = clientePontosPagina <= 1;
  const nextDisabled = clientePontosPagina >= pages;
  let html = '';
  html += `<button type="button" ${prevDisabled ? 'disabled' : ''} data-page="${clientePontosPagina - 1}">&lt;</button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button type="button" class="${i === clientePontosPagina ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button type="button" ${nextDisabled ? 'disabled' : ''} data-page="${clientePontosPagina + 1}">&gt;</button>`;
  clientePontosPaginacao.innerHTML = html;
}

function carregarPontosCliente(pagina){
  if (!clientePerfilAtual || !clientePerfilAtual.id) return;
  if (!clientePontosLista) return;
  clientePontosPagina = pagina || 1;
  clientePontosLista.innerHTML = '<div class="cliente-pedidos-vazio">Carregando historico de pontos...</div>';
  fetch(`api/cliente_pontos.php?cliente_id=${clientePerfilAtual.id}&pagina=${clientePontosPagina}`)
    .then(r => r.json())
    .then(res => {
      if (!res || !res.ok) {
        renderPontosHistorico([], 1);
        return;
      }
      renderPontosHistorico(res.pontos || [], res.paginas || 1);
      clientePontosCarregado = true;
    })
    .catch(() => renderPontosHistorico([], 1));
}
function tempoDesde(valor){
  if (!valor) return 'feito ha -';
  const data = new Date(normalizarData(valor));
  if (Number.isNaN(data.getTime())) return 'feito ha -';
  const minutos = Math.max(0, Math.floor((Date.now() - data.getTime()) / 60000));
  if (minutos < 60) return `feito ha ${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `feito ha ${horas}h ${resto}m`;
}

function mapStatusPedido(status){
  const mapa = {
    pendente: 'Pendente',
    aceito: 'Aceito',
    preparando: 'Em preparo',
    entrega: 'Saiu para entrega',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado'
  };
  return mapa[status] || status || '-';
}

function formatarFormaPagamento(forma){
  const mapa = {
    pix: 'Transferencia Pix',
    dinheiro: 'Dinheiro',
    credito: 'Cartao de credito',
    debito: 'Cartao de debito'
  };
  return mapa[forma] || forma || '-';
}

function mostrarAvisoModal(msg, titulo){
  const modalEl = document.getElementById('modalAvisoGestor');
  if (!modalEl) return;
  const tituloEl = document.getElementById('modalAvisoGestorTitulo');
  const msgEl = document.getElementById('modalAvisoGestorMsg');
  if (tituloEl) tituloEl.textContent = titulo || 'Aviso';
  if (msgEl) msgEl.textContent = msg || '';
  (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).show();
  /* Se ja existir outro modal aberto por tras (ex.: detalhe do pedido), o Bootstrap
     as vezes cria o novo backdrop com z-index abaixo do modal anterior, deixando o
     fundo sem escurecer. Forca o backdrop e o modal deste aviso pra cima de tudo. */
  setTimeout(() => {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    const ultimoBackdrop = backdrops[backdrops.length - 1];
    if (ultimoBackdrop) ultimoBackdrop.style.zIndex = 1070;
    modalEl.style.zIndex = 1075;
  }, 0);
}

function imprimirPedido(id){
  if (!id || typeof impressaoQZ === 'undefined') return;
  const btn = pedidoDetalheImprimir;
  const icon = btn ? btn.querySelector('i') : null;
  const classeOriginal = icon ? icon.className : '';
  if (btn) btn.disabled = true;
  if (icon) icon.className = 'bi bi-arrow-repeat spin-icon';
  const lojaNome = (typeof LOJA_NOME_IMPRESSAO !== 'undefined') ? LOJA_NOME_IMPRESSAO : '';
  impressaoQZ.imprimirManual(id, lojaNome, 'cozinha')
    .catch(e => {
      console.warn('Falha ao imprimir pedido:', e);
      mostrarAvisoModal(e && e.message ? e.message : 'Não foi possível imprimir o pedido. Verifique se o QZ Tray está aberto e a impressora está configurada em Configurações > Impressão.');
    })
    .finally(() => {
      if (btn) btn.disabled = false;
      if (icon) icon.className = classeOriginal;
    });
}

function preencherModalPedido(dados){
  if (!dados || !dados.pedido) return;
  const pedido = dados.pedido || {};
  const itens = dados.itens || [];
  const pagamentos = dados.pagamentos || [];
  const stats = dados.cliente_stats || {};
  const tipo = (pedido.tipo || '').toLowerCase();
  const entrega = tipo === 'entrega';
  const endereco = pedido.endereco_entrega || pedido.endereco || pedido.rua || '-';

  pedidoDetalheAtual = pedido.id || null;
  if (pedidoDetalheNumero) pedidoDetalheNumero.textContent = `Pedido N. ${pedido.codigo || pedido.id || '-'}`;
  if (pedidoDetalheTempo) pedidoDetalheTempo.textContent = tempoDesde(pedido.criado_em);
  if (pedidoDetalheHorario) pedidoDetalheHorario.textContent = formatarDataHora(pedido.criado_em);
  if (pedidoDetalheStatus) {
    pedidoDetalheStatus.textContent = mapStatusPedido(pedido.status);
    const statusClasse = (pedido.status || '').toLowerCase();
    pedidoDetalheStatus.classList.remove(
      'status-pendente',
      'status-aceito',
      'status-preparando',
      'status-entrega',
      'status-finalizado',
      'status-cancelado'
    );
    if (statusClasse) pedidoDetalheStatus.classList.add(`status-${statusClasse}`);
  }
  if (pedidoDetalheCliente) pedidoDetalheCliente.textContent = pedido.nome || '-';
  if (pedidoDetalheTelefone) pedidoDetalheTelefone.textContent = pedido.telefone || '-';

  if (pedidoDetalheStatsWrap) {
    const feitos = Number(stats.pedidos_feitos || 0);
    const ticket = Number(stats.ticket_medio || 0);
    const pontos = stats.pontos !== undefined && stats.pontos !== null ? Number(stats.pontos) : 0;
    const cashbackSaldo = Number(stats.cashback_saldo ?? stats.cashback_total ?? 0);
    const cashbackExpiraEm = stats.cashback_expira_em || null;
    const cashbackExpirado = Boolean(stats.cashback_expirado);
    if (pedidoDetalhePedidosFeitos) pedidoDetalhePedidosFeitos.textContent = feitos || 0;
    if (pedidoDetalheTicketMedio) pedidoDetalheTicketMedio.textContent = formatarMoeda(ticket || 0);
    if (pedidoDetalhePontos) pedidoDetalhePontos.textContent = Number.isNaN(pontos) ? '0' : pontos;
    if (pedidoDetalhePontosMetric) pedidoDetalhePontosMetric.style.display = 'flex';
    if (pedidoDetalheCashbackTotal) pedidoDetalheCashbackTotal.textContent = formatarMoeda(cashbackSaldo || 0);
    if (pedidoDetalheCashbackMetric) {
      pedidoDetalheCashbackMetric.style.display = cashbackSaldo > 0 ? 'flex' : 'none';
    }
    if (pedidoDetalheCashbackExpira) {
      if (cashbackSaldo > 0 && cashbackExpiraEm) {
        const dataExpira = formatarDataHora(`${cashbackExpiraEm} 00:00:00`).split(' ')[0];
        pedidoDetalheCashbackExpira.textContent = `Expira em ${dataExpira}`;
        pedidoDetalheCashbackExpira.classList.remove('d-none');
      } else {
        pedidoDetalheCashbackExpira.classList.add('d-none');
      }
    }
    if (pedidoDetalheCashbackExpirado) {
      if (cashbackSaldo <= 0 && cashbackExpirado) {
        pedidoDetalheCashbackExpirado.classList.remove('d-none');
      } else {
        pedidoDetalheCashbackExpirado.classList.add('d-none');
      }
    }
    pedidoDetalheStatsWrap.style.display = pedido.id ? 'block' : 'none';
  }

  if (pedidoDetalheTipoTitulo) {
    pedidoDetalheTipoTitulo.textContent = entrega ? 'ENTREGA' : 'RETIRADA';
    const tipoClasse = tipo ? tipo : 'outro';
    pedidoDetalheTipoTitulo.classList.remove('entrega','retirada','mesa','outro');
    pedidoDetalheTipoTitulo.classList.add(['entrega','retirada','mesa'].includes(tipoClasse) ? tipoClasse : 'outro');
  }
  if (pedidoDetalheEnderecoWrap) pedidoDetalheEnderecoWrap.style.display = entrega ? 'block' : 'none';
  if (pedidoDetalheTaxaWrap) pedidoDetalheTaxaWrap.style.display = entrega ? 'block' : 'none';
  if (pedidoDetalheEntregaLinks) pedidoDetalheEntregaLinks.style.display = entrega ? 'flex' : 'none';
  if (pedidoDetalheEndereco && entrega) pedidoDetalheEndereco.textContent = endereco || '-';

  const taxaEntrega = Number(pedido.taxa_entrega || 0);
  if (pedidoDetalheTaxa) pedidoDetalheTaxa.textContent = formatarMoeda(taxaEntrega);
  if (pedidoDetalheTaxaResumo) pedidoDetalheTaxaResumo.textContent = formatarMoeda(taxaEntrega);

  if (pedidoDetalheSubtotal) pedidoDetalheSubtotal.textContent = formatarMoeda(pedido.subtotal || pedido.total || 0);
  if (pedidoDetalheDesconto) pedidoDetalheDesconto.textContent = formatarMoeda(pedido.desconto || 0);
  if (pedidoDetalheMaquininha) pedidoDetalheMaquininha.textContent = formatarMoeda(pedido.taxa_maquininha || 0);
  let cashbackValor = Number(pedido.cashback_valor || 0);
  if (!cashbackValor) {
    const cashbackPercent = Number(pedido.cashback_percentual || 0);
    if (cashbackPercent > 0) {
      const subtotalBase = Number(pedido.subtotal || 0);
      const descontoBase = Number(pedido.desconto || 0);
      let baseCashback = subtotalBase > 0
        ? (subtotalBase - descontoBase)
        : (Number(pedido.total || 0) - Number(pedido.taxa_entrega || 0) - descontoBase);
      if (baseCashback < 0) baseCashback = 0;
      cashbackValor = baseCashback * (cashbackPercent / 100);
    }
  }
  if (pedidoDetalheCashback) pedidoDetalheCashback.textContent = formatarMoeda(cashbackValor);
  if (pedidoDetalheTotal) pedidoDetalheTotal.textContent = formatarMoeda(pedido.total || 0);

  if (pedidoDetalheLinhaDesconto) pedidoDetalheLinhaDesconto.style.display = Number(pedido.desconto || 0) > 0 ? 'flex' : 'none';
  if (pedidoDetalheLinhaTaxa) pedidoDetalheLinhaTaxa.style.display = taxaEntrega > 0 ? 'flex' : 'none';
  if (pedidoDetalheLinhaMaquininha) pedidoDetalheLinhaMaquininha.style.display = Number(pedido.taxa_maquininha || 0) > 0 ? 'flex' : 'none';
  if (pedidoDetalheLinhaCashback) pedidoDetalheLinhaCashback.style.display = cashbackValor > 0 ? 'flex' : 'none';

  if (pedidoDetalhePagamentos) {
    if (pagamentos.length) {
      pedidoDetalhePagamentos.innerHTML = pagamentos.map(p => `${formatarFormaPagamento(p.forma)} ${formatarMoeda(p.valor)}`).join('<br>');
    } else {
      pedidoDetalhePagamentos.textContent = `${formatarFormaPagamento(pedido.forma_pagamento)} ${formatarMoeda(pedido.total || 0)}`;
    }
  }

  if (pedidoDetalheItens) {
    if (!itens.length) {
      pedidoDetalheItens.innerHTML = '<div class="pedido-detalhe-item-row">Sem itens.</div>';
    } else {
      pedidoDetalheItens.innerHTML = itens.map(i => {
        const totalItem = Number(i.preco || 0) * Number(i.quantidade || 0);
        const obs = (i.observacoes || '').trim();
        const obsHtml = obs
          ? `<small><strong>Observação:</strong> ${obs.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</small>`
          : '';
        return `
          <div class="pedido-detalhe-item-row">
            <span>${i.quantidade}x ${i.produto_nome}${obsHtml ? `<br>${obsHtml}` : ''}</span>
            <strong>${formatarMoeda(totalItem)}</strong>
          </div>
        `;
      }).join('');
    }
  }

  /* agendamento */
  const agendWrap = document.getElementById('pedidoDetalheAgendamentoWrap');
  const agendBox  = document.getElementById('pedidoDetalheAgendamentoBox');
  const agendTit  = document.getElementById('pedidoDetalheAgendamentoTitulo');
  if (agendWrap) {
    let agendDataDisplay = pedido.agendamento_data || pedido.data_agendamento || null;
    let agendHoraDisplay = pedido.agendamento_hora || '';
    /* ler campo 'agendamento' como datetime "YYYY-MM-DD HH:MM:SS" */
    if (!agendDataDisplay && pedido.agendamento) {
      const raw = String(pedido.agendamento);
      const parts = raw.split(' ');
      if (parts[0]) {
        const dp = parts[0].split('-');
        agendDataDisplay = dp.length === 3 ? `${dp[2]}/${dp[1]}/${dp[0]}` : parts[0];
      }
      if (parts[1]) agendHoraDisplay = parts[1].slice(0, 5);
    }
    if (agendDataDisplay) {
      agendWrap.classList.remove('d-none');
      const tipoAgend = pedido.tipo_agendamento || '';
      const isAgEntrega = tipoAgend === 'entrega_agendada' || (!tipoAgend && entrega);
      if (agendTit) agendTit.textContent = isAgEntrega ? 'ENTREGA AGENDADA' : 'RETIRADA AGENDADA';
      if (agendBox) agendBox.textContent = `Agendado para: ${agendDataDisplay}${agendHoraDisplay ? ' às ' + agendHoraDisplay : ''}`;
    } else {
      agendWrap.classList.add('d-none');
    }
  }

  /* motoboy */
  const motoboyWrap  = document.getElementById('pedidoDetalheMotoboyWrap');
  const motoboyNome  = document.getElementById('pedidoDetalheMotoboy');
  if (motoboyWrap && motoboyNome) {
    const motoboy = pedido.motoboy_nome || null;
    if (motoboy && entrega) {
      motoboyWrap.classList.remove('d-none');
      motoboyNome.textContent = motoboy;
    } else {
      motoboyWrap.classList.add('d-none');
    }
  }

  /* observações do cliente */
  const obsWrap  = document.getElementById('pedidoDetalheObsWrap');
  const obsTexto = document.getElementById('pedidoDetalheObsTexto');
  if (obsWrap && obsTexto) {
    const obsCliente = (pedido.observacoes_cliente || '').trim();
    if (obsCliente) {
      obsWrap.classList.remove('d-none');
      obsTexto.textContent = obsCliente;
    } else {
      obsWrap.classList.add('d-none');
    }
  }

 // if (pedidoDetalheEditar) {
   // pedidoDetalheEditar.onclick = () => { window.location.href = `pdv.php?pedido_id=${pedido.id}`; };
   // pedidoDetalheEditar.style.display = podeGerenciarPedidos ? 'inline-flex' : 'none';
  //}

  if (pedidoDetalheEditar) {
    pedidoDetalheEditar.dataset.pedidoId = pedido.id || '';
    pedidoDetalheEditar.style.display = podeGerenciarPedidos ? 'inline-flex' : 'none';
  }

 if (pedidoDetalheEditar) {
  pedidoDetalheEditar.addEventListener('click', () => {
    const id = pedidoDetalheEditar.dataset.pedidoId || pedidoDetalheAtual;
    if (id) abrirPdvPedidoEditar(id);
  });
}

  if (pedidoDetalheImprimir) {
    pedidoDetalheImprimir.dataset.pedidoId = pedido.id || '';
  }

  if (pedidoDetalheContato) {
    const digits = (pedido.telefone || '').replace(/\D/g, '');
    pedidoDetalheContato.href = digits ? `tel:${digits}` : '#';
  }
  if (pedidoDetalheWhatsapp) {
    const digits = (pedido.telefone || '').replace(/\D/g, '');
    const whatsapp = digits ? (digits.length <= 11 ? `55${digits}` : digits) : '';
    pedidoDetalheWhatsapp.href = whatsapp ? `https://wa.me/${whatsapp}` : '#';
  }
  if (pedidoDetalheVerCliente) {
    pedidoDetalheVerCliente.onclick = () => {
      if (!pedido.cliente_id) return;
      abrirModalClientePerfil(pedido.cliente_id, {
        nome: pedido.nome || '',
        telefone: pedido.telefone || '',
        endereco: pedido.endereco_entrega || pedido.endereco || ''
      });
    };
  }

  const statusAtual = (pedido.status || '').toLowerCase();
  if (pedidoDetalheCancelar) {
    pedidoDetalheCancelar.style.display = (podeGerenciarPedidos && statusAtual !== 'cancelado' && statusAtual !== 'finalizado')
      ? 'inline-flex'
      : 'none';
  }
  if (pedidoDetalheFinalizar) {
    pedidoDetalheFinalizar.style.display = (podeGerenciarPedidos && statusAtual !== 'finalizado' && statusAtual !== 'cancelado')
      ? 'inline-flex'
      : 'none';
  }
}

function abrirModalPedidoDetalhe(id){
  if (!modalPedidoDetalhe) return;
  if (pedidoDetalheItens) pedidoDetalheItens.innerHTML = '<div class="pedido-detalhe-item-row">Carregando pedido...</div>';
  modalPedidoDetalhe.show();
  fetch(`api/pedido_detalhe.php?pedido_id=${id}`)
    .then(r => r.json())
    .then(d => {
      if (!d || !d.ok) return;
      preencherModalPedido(d);
    })
    .catch(() => {});
}

if (pedidoDetalheCopiarEndereco) {
  pedidoDetalheCopiarEndereco.addEventListener('click', () => {
    if (!pedidoDetalheEndereco) return;
    const texto = pedidoDetalheEndereco.textContent.trim();
    if (!texto) return;
    navigator.clipboard?.writeText(texto);
  });
}

if (pedidoDetalheVincularEntregador) {
  pedidoDetalheVincularEntregador.addEventListener('click', () => {
    alert('Funcao em breve.');
  });
}

if (pedidoDetalheImprimir) {
  pedidoDetalheImprimir.addEventListener('click', () => {
    const id = pedidoDetalheImprimir.dataset.pedidoId || pedidoDetalheAtual;
    if (id) imprimirPedido(id);
  });
}

if (pedidoDetalheCancelar) {
  pedidoDetalheCancelar.addEventListener('click', () => {
    if (!podeGerenciarPedidos || !pedidoDetalheAtual) return;
    fetch('api/pedidos_cancelar.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id: pedidoDetalheAtual })
    }).then(r => r.json()).then(res => {
      if (res && res.ok) {
        if (pedidoDetalheStatus) pedidoDetalheStatus.textContent = mapStatusPedido('cancelado');
        if (pedidoDetalheCancelar) pedidoDetalheCancelar.style.display = 'none';
        if (pedidoDetalheFinalizar) pedidoDetalheFinalizar.style.display = 'none';
        carregarTabela(paginaAtual);
      }
    });
  });
}

if (pedidoDetalheFinalizar) {
  pedidoDetalheFinalizar.addEventListener('click', () => {
    if (!podeGerenciarPedidos || !pedidoDetalheAtual) return;
    fetch('api/pedidos_finalizar.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id: pedidoDetalheAtual })
    }).then(r => r.json()).then(res => {
      if (res && res.ok) {
        if (pedidoDetalheStatus) pedidoDetalheStatus.textContent = mapStatusPedido('finalizado');
        if (pedidoDetalheFinalizar) pedidoDetalheFinalizar.style.display = 'none';
        if (pedidoDetalheCancelar) pedidoDetalheCancelar.style.display = 'none';
        carregarTabela(paginaAtual);
      }
    });
  });
}

if (modalPedidoDetalheEl) {
  modalPedidoDetalheEl.addEventListener('shown.bs.modal', () => {});
  modalPedidoDetalheEl.addEventListener('hidden.bs.modal', () => {});
}

if (clienteEditSalvar) {
  clienteEditSalvar.addEventListener('click', salvarClienteModal);
}
if (clienteEditNome) {
  clienteEditNome.addEventListener('input', () => {
    clienteEditNome.classList.remove('is-invalid');
    if (clienteEditNomeErro) clienteEditNomeErro.textContent = '';
  });
}
if (clienteEditTelefone) {
  clienteEditTelefone.addEventListener('input', () => {
    clienteEditTelefone.classList.remove('is-invalid');
    if (clienteEditTelefoneErro) clienteEditTelefoneErro.textContent = '';
    aplicarMascaraTelefone(clienteEditTelefone);
  });
  clienteEditTelefone.addEventListener('blur', () => aplicarMascaraTelefone(clienteEditTelefone));
}
if (modalClienteEditEl) {
  modalClienteEditEl.addEventListener('hidden.bs.modal', () => {
    if (clientePerfilReabrir && modalClientePerfil) {
      modalClientePerfil.show();
    }
    clientePerfilReabrir = false;
  });
}

if (clientePerfilTabs) {
  clientePerfilTabs.addEventListener('click', e => {
    const btn = e.target.closest('.cliente-tab');
    if (!btn) return;
    const alvo = btn.dataset.tab;
    clientePerfilTabs.querySelectorAll('.cliente-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#modalClientePerfil [data-tab-pane]').forEach(pane => {
      pane.classList.toggle('active', pane.dataset.tabPane === alvo);
    });
    if (alvo === 'pedidos' && !clientePedidosCarregado) {
      carregarPedidosCliente(1);
    }
    if (alvo === 'pontos' && !clientePontosCarregado) {
      carregarPontosCliente(1);
    }
  });
}
if (clientePedidosPeriodo) {
  clientePedidosPeriodo.addEventListener('change', () => carregarPedidosCliente(1));
}
if (clientePedidosTipo) {
  clientePedidosTipo.addEventListener('change', () => carregarPedidosCliente(1));
}
if (clientePedidosPaginacao) {
  clientePedidosPaginacao.addEventListener('click', e => {
    const btn = e.target.closest('button[data-page]');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page || 1);
    if (page > 0) carregarPedidosCliente(page);
  });
}
if (clientePontosPaginacao) {
  clientePontosPaginacao.addEventListener('click', e => {
    const btn = e.target.closest('button[data-page]');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page || 1);
    if (page > 0) carregarPontosCliente(page);
  });
}
if (clientePedidosLista) {
  clientePedidosLista.addEventListener('click', e => {
    const card = e.target.closest('.js-pedido-detalhe');
    if (!card) return;
    const pedidoId = card.dataset.pedidoId;
    if (pedidoId) abrirModalPedidoDetalhe(pedidoId);
  });
}



function novoPedido() {
  if (typeof window.abrirPdvModal === 'function') {
    window.abrirPdvModal();
    return;
  }
  window.location.href = 'pdv.php';
}

function abrirPdvPedidoEditar(pedidoId){
  if (!pedidoId) return;
  if (typeof window.abrirPdvModal === 'function') {
    if (modalPedidoDetalhe) modalPedidoDetalhe.hide();
    window.abrirPdvModal(pedidoId);
    return;
  }
  window.location.href = `pdv.php?pedido_id=${pedidoId}`;
}










</script>
</body>
</html>
