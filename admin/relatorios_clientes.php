<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.relatorios');
require_once __DIR__ . '/helpers/config.php';

$lojaId   = (int)($_SESSION['loja_id'] ?? 1);
$lojaNome = config($conn, 'nome_loja', 'Minha Loja');
$_SESSION['loja_nome'] = $lojaNome;
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$rota   = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Clientes — <?= htmlspecialchars($lojaNome) ?></title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css" rel="stylesheet">
  <style>
    /* NÃO sobrescrever body font — deixar dashboard.css controlar */

    /* ── Card geral ── */
    .rc-card{background:#fff;border-radius:16px;border:1px solid #e5e7eb}

    /* ── Filtros ── */
    .rc-filters{padding:14px 18px}
    .rc-filters-head{display:flex;align-items:center;gap:7px;margin-bottom:12px;font-size:.82rem;font-weight:700;color:#374151}
    .rc-filters-head i{color:#9C5523;font-size:.9rem}
    .rc-filters-row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}
    .rc-filter-group{display:flex;flex-direction:column;gap:3px}
    .rc-filter-label{font-size:.62rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em}
    .rc-filter-input{border:1.5px solid #e5e7eb;border-radius:10px;padding:6px 10px;font-size:.78rem;font-family:inherit;background:#fff;outline:none;color:#111;transition:border-color .15s;height:34px}
    .rc-filter-input:focus{border-color:#6366f1}
    .rc-filter-search-wrap{position:relative}
    .rc-filter-search-wrap .rc-filter-input{padding-right:32px;width:240px}
    .rc-filter-search-icon{position:absolute;right:9px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:.8rem;pointer-events:none}
    .rc-filter-select{appearance:none;padding-right:26px;background-image:url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");background-repeat:no-repeat;background-position:right 7px center;background-size:12px;cursor:pointer;min-width:148px}
    .rc-period-wrap{display:flex;align-items:center;gap:7px}
    .rc-date-range{display:flex;align-items:center;gap:5px;border:1.5px solid #e5e7eb;border-radius:10px;padding:6px 10px;font-size:.78rem;color:#374151;height:34px;background:#fff;cursor:pointer;white-space:nowrap}
    .rc-date-range i{color:#9ca3af;font-size:.8rem}

    /* ── Tabela compacta ── */
    .rc-table-wrap{overflow-x:auto}
    .rc-table{width:100%;border-collapse:collapse}
    .rc-table th{font-size:.66rem;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;padding:8px 14px;border-bottom:1px solid #f0f0f0;white-space:nowrap;background:#fff}
    .rc-table td{font-size:.78rem;color:#374151;padding:9px 14px;border-bottom:1px solid #f5f6f8;line-height:1.35}
    .rc-table tbody tr:last-child td{border-bottom:0}
    .rc-table tbody tr:hover td{background:#fafafa}
    .rc-table .td-nome{font-weight:600;color:#111827}
    .rc-table .td-valor{font-weight:600;color:#111827}
    .rc-btn-detalhe{border:1.5px solid #e5e7eb;background:#fff;border-radius:7px;padding:4px 11px;font-size:.72rem;font-weight:600;font-family:inherit;color:#374151;cursor:pointer;white-space:nowrap;transition:border-color .15s,background .15s}
    .rc-btn-detalhe:hover{border-color:#6366f1;color:#4f46e5;background:#f5f3ff}

    /* ── Paginação ── */
    .rc-footer{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;border-top:1px solid #f0f0f0;flex-wrap:wrap;gap:8px}
    .rc-per-page{display:flex;align-items:center;gap:6px;font-size:.76rem;color:#6b7280}
    .rc-per-page select{border:1.5px solid #e5e7eb;border-radius:7px;padding:3px 7px;font-size:.76rem;font-family:inherit;cursor:pointer;outline:none}
    .rc-info{font-size:.76rem;color:#6b7280;text-align:center}
    .rc-pagination{display:flex;align-items:center;gap:3px}
    .rc-page-btn{border:1.5px solid #e5e7eb;background:#fff;border-radius:7px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:.74rem;font-weight:600;cursor:pointer;color:#374151;transition:all .15s;text-decoration:none;font-family:inherit;line-height:1}
    .rc-page-btn:hover:not(:disabled){border-color:#6366f1;color:#4f46e5}
    .rc-page-btn:disabled{opacity:.4;cursor:not-allowed}
    .rc-page-label{font-size:.76rem;color:#6b7280;padding:0 7px;white-space:nowrap}

    /* ── Empty/Loading ── */
    .rc-empty{text-align:center;padding:36px 20px;color:#bbb;font-size:.82rem}
    .rc-empty i{font-size:2rem;display:block;margin-bottom:7px;opacity:.3}
    .rc-loading{text-align:center;padding:32px;color:#bbb;font-size:.8rem}

    /* ══ MODAL CLIENTE ══ */
    .cli-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:1200;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;pointer-events:none;transition:opacity .2s}
    .cli-overlay.show{opacity:1;pointer-events:all}
    .cli-modal{background:#fff;border-radius:20px;width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,.18);transform:translateY(12px);transition:transform .2s}
    .cli-overlay.show .cli-modal{transform:translateY(0)}

    /* Header */
    .cli-header{display:flex;align-items:center;gap:13px;padding:18px 20px 14px;flex-shrink:0;position:relative}
    .cli-avatar{width:46px;height:46px;border-radius:50%;background:#e5e7eb;color:#374151;font-weight:800;font-size:1.1rem;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .cli-header-info{flex:1;min-width:0}
    .cli-header-name{font-weight:700;font-size:1rem;color:#111827}
    .cli-header-since{font-size:.73rem;color:#6b7280;margin-top:1px}
    .cli-close{border:0;background:transparent;cursor:pointer;color:#9ca3af;font-size:1rem;line-height:1;padding:6px;border-radius:8px;transition:color .15s;position:absolute;right:14px;top:14px}
    .cli-close:hover{color:#374151;background:#f3f4f6}

    /* Tabs — pill style */
    .cli-tabs{display:flex;gap:4px;padding:10px 14px;border-bottom:1px solid #f0f0f0;flex-shrink:0;overflow-x:auto}
    .cli-tab{border:0;background:transparent;font-size:.74rem;font-weight:600;font-family:inherit;color:#6b7280;padding:7px 12px;cursor:pointer;border-radius:20px;white-space:nowrap;transition:background .15s,color .15s;display:flex;align-items:center;gap:5px}
    .cli-tab.active{background:#9C5523;color:#fff}
    .cli-tab i{font-size:.8rem}

    /* Body scrollável */
    .cli-body{overflow-y:auto;flex:1;padding:16px 18px}
    .cli-tab-pane{display:none}
    .cli-tab-pane.active{display:block}

    /* Stats grid — 2 colunas */
    .cli-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
    .cli-stat{border:1px solid #e5e7eb;border-radius:14px;padding:13px 15px;display:flex;align-items:flex-start;gap:11px}
    .cli-stat-icon{font-size:1.05rem;color:#6b7280;margin-top:1px;flex-shrink:0}
    .cli-stat-body{min-width:0}
    .cli-stat-val{font-size:.93rem;font-weight:700;color:#111827;line-height:1.2}
    .cli-stat-label{font-size:.68rem;color:#9ca3af;margin-top:2px}

    /* Info pessoal */
    .cli-section-title{font-size:.8rem;font-weight:700;color:#111827;margin-bottom:10px}
    .cli-info-row{margin-bottom:12px}
    .cli-info-label{font-size:.71rem;color:#9ca3af;margin-bottom:2px}
    .cli-info-val{font-size:.82rem;color:#111827;font-weight:600}

    /* Pedidos */
    .cli-ped-filters{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
    .cli-ped-filter-group{display:flex;flex-direction:column;gap:4px}
    .cli-ped-filter-label{font-size:.67rem;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
    .cli-ped-filter-select{border:1.5px solid #e5e7eb;border-radius:10px;padding:7px 10px;font-size:.78rem;font-family:inherit;background:#fff;outline:none;color:#111;cursor:pointer;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");background-repeat:no-repeat;background-position:right 8px center;background-size:11px;padding-right:28px}
    .cli-ped-card{border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:10px}
    .cli-ped-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
    .cli-ped-card-meta{display:flex;align-items:center;gap:6px;font-size:.76rem;color:#6b7280}
    .cli-ped-card-meta i{font-size:.78rem}
    .cli-ped-card-date{font-weight:500;color:#374151}
    .cli-badge{display:inline-block;padding:4px 12px;border-radius:6px;font-size:.72rem;font-weight:700}
    .cli-badge-entrega{background:#f59e0b;color:#fff}
    .cli-badge-retirada{background:#8b5cf6;color:#fff}
    .cli-ped-card-resumo-label{font-size:.76rem;font-weight:700;color:#111827;margin-bottom:3px}
    .cli-ped-card-resumo-val{font-size:.78rem;color:#374151;margin-bottom:10px}
    .cli-ped-card-total{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f0f0f0;padding-top:10px;font-size:.82rem;color:#6b7280}
    .cli-ped-card-total-val{font-size:.92rem;font-weight:700;color:#111827}

    /* Avaliações */
    .cli-aval-card{border:1px solid #e5e7eb;border-radius:14px;padding:13px;margin-bottom:10px}
    .cli-stars{font-size:.9rem;letter-spacing:1px;margin-bottom:5px}
    .cli-star-filled{color:#f59e0b}
    .cli-star-empty{color:#e5e7eb}
    .cli-aval-desc{font-size:.79rem;color:#374151}
    .cli-aval-date{font-size:.7rem;color:#9ca3af;margin-top:6px}

    /* Pontos */
    .cli-pontos-title{font-size:.9rem;font-weight:700;color:#111827;margin-bottom:14px}
    .cli-ponto-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6}
    .cli-ponto-row:last-child{border-bottom:0}
    .cli-ponto-tipo{font-size:.79rem;font-weight:600;color:#111827}
    .cli-ponto-data{font-size:.7rem;color:#9ca3af;margin-top:2px}
    .cli-ponto-val{font-size:.86rem;font-weight:700}
    .cli-ponto-val.pos{color:#16a34a}
    .cli-ponto-val.neg{color:#dc2626}

    /* Empty state */
    .cli-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px 20px;text-align:center}
    .cli-empty-icon{width:64px;height:64px;border-radius:16px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:1.6rem;color:#9ca3af;margin-bottom:14px}
    .cli-empty-title{font-size:.88rem;font-weight:700;color:#111827;margin-bottom:5px}
    .cli-empty-sub{font-size:.76rem;color:#9ca3af;max-width:240px}

    /* Paginação interna */
    .cli-pag{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px}
    .cli-pag-arrow{border:0;background:transparent;cursor:pointer;color:#374151;width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.9rem;transition:background .15s}
    .cli-pag-arrow:hover:not(:disabled){background:#f3f4f6}
    .cli-pag-arrow:disabled{opacity:.3;cursor:not-allowed}
    .cli-pag-num{width:28px;height:28px;border-radius:50%;background:#7c3aed;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:.76rem;font-weight:700}

    /* Footer */
    .cli-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 18px;border-top:1px solid #f0f0f0;flex-shrink:0}
    .cli-btn-ghost{border:1.5px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 18px;font-size:.8rem;font-weight:600;font-family:inherit;color:#374151;cursor:pointer;transition:border-color .15s}
    .cli-btn-ghost:hover{border-color:#374151}
    .cli-btn-primary{border:0;background:#9C5523;color:#fff;border-radius:10px;padding:8px 18px;font-size:.8rem;font-weight:600;font-family:inherit;cursor:pointer;transition:background .15s}
    .cli-btn-primary:hover{background:#e11d48}

    .cli-mini-load{text-align:center;padding:24px;color:#bbb;font-size:.8rem}
  </style>
</head>
<body class="dash-diggy">
<?php include __DIR__ . '/partials/sidebar.php'; ?>
<!-- sidebar.php já abre <main class="content"> — não abrir outro -->
  <div style="max-width:1100px;margin:0 auto;padding:24px 20px">

    <h1 style="font-size:1.3rem;font-weight:800;color:#111827;margin-bottom:20px">Relatório de vendas por cliente</h1>

    <div class="rc-card" style="margin-bottom:18px">
      <!-- Filtros -->
      <div class="rc-filters">
        <div class="rc-filters-head"><i class="bi bi-funnel-fill"></i> Filtros</div>
        <div class="rc-filters-row">
          <!-- Busca -->
          <div class="rc-filter-group">
            <span class="rc-filter-label">Nome ou telefone do cliente</span>
            <div class="rc-filter-search-wrap">
              <input class="rc-filter-input" type="search" id="rcBusca" placeholder="Digite o nome ou telefone do...">
              <i class="bi bi-search rc-filter-search-icon"></i>
            </div>
          </div>
          <!-- Ordenar -->
          <div class="rc-filter-group">
            <span class="rc-filter-label">Ordenar por</span>
            <select class="rc-filter-input rc-filter-select" id="rcOrdenar">
              <option value="total_gasto">Maior valor gasto</option>
              <option value="pedidos">Mais pedidos</option>
              <option value="ticket_medio">Maior ticket médio</option>
              <option value="ultimo_pedido">Último pedido</option>
              <option value="nome">Nome A-Z</option>
            </select>
          </div>
          <!-- Período -->
          <div class="rc-filter-group">
            <span class="rc-filter-label">Aplique visualização por Período</span>
            <div class="rc-period-wrap">
              <select class="rc-filter-input rc-filter-select" id="rcPeriodo" style="min-width:90px">
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
                <option value="30" selected>30 dias</option>
                <option value="60">60 dias</option>
                <option value="90">90 dias</option>
                <option value="365">1 ano</option>
                <option value="custom">Personalizado</option>
              </select>
              <div class="rc-date-range" id="rcDateRangeWrap" style="display:none">
                <i class="bi bi-calendar3"></i>
                <input type="text" id="rcDateRange" style="border:0;outline:0;font-size:.82rem;font-family:inherit;color:#374151;background:transparent;width:200px" placeholder="Selecione o período" readonly>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela -->
      <div class="rc-table-wrap">
        <table class="rc-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Último pedido</th>
              <th>Taxas</th>
              <th>Ticket</th>
              <th>Total</th>
              <th>Pedidos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="rcTbody">
            <tr><td colspan="7" class="rc-loading"><i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite;display:inline-block"></i> Carregando...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Footer com paginação -->
      <div class="rc-footer">
        <div class="rc-per-page">
          Itens por página:
          <select id="rcLimite">
            <option value="10" selected>10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
        <div class="rc-info" id="rcInfo"></div>
        <div class="rc-pagination" id="rcPagination"></div>
      </div>
    </div>

  </div>

</main>
</div>

<!-- ══ MODAL CLIENTE ══ -->
<div class="cli-overlay" id="cliOverlay">
  <div class="cli-modal">

    <!-- Header -->
    <div class="cli-header">
      <div class="cli-avatar" id="cliAvatar">?</div>
      <div class="cli-header-info">
        <div class="cli-header-name" id="cliNome">—</div>
        <div class="cli-header-since" id="cliDesde"></div>
      </div>
      <button class="cli-close" id="cliClose" title="Fechar"><i class="bi bi-x-lg"></i></button>
    </div>

    <!-- Tabs pill -->
    <div class="cli-tabs">
      <button class="cli-tab active" data-tab="perfil"><i class="bi bi-person-fill"></i>Perfil</button>
      <button class="cli-tab" data-tab="pedidos"><i class="bi bi-bag-fill"></i>Pedidos</button>
      <button class="cli-tab" data-tab="avaliacoes"><i class="bi bi-star-fill"></i>Avaliações</button>
      <button class="cli-tab" data-tab="pontos"><i class="bi bi-gift-fill"></i>Histórico de pontos</button>
    </div>

    <!-- Body -->
    <div class="cli-body">

      <!-- ── Perfil ── -->
      <div class="cli-tab-pane active" id="pane-perfil">
        <div class="cli-stats">
          <div class="cli-stat">
            <i class="bi bi-arrow-clockwise cli-stat-icon"></i>
            <div class="cli-stat-body"><div class="cli-stat-val" id="st-cashback">—</div><div class="cli-stat-label">cashback acumulado</div></div>
          </div>
          <div class="cli-stat">
            <i class="bi bi-calendar3 cli-stat-icon"></i>
            <div class="cli-stat-body"><div class="cli-stat-val" id="st-pontos">—</div><div class="cli-stat-label">pontos</div></div>
          </div>
          <div class="cli-stat">
            <i class="bi bi-wallet2 cli-stat-icon"></i>
            <div class="cli-stat-body"><div class="cli-stat-val" id="st-fiado">—</div><div class="cli-stat-label">saldo fiado</div></div>
          </div>
          <div class="cli-stat">
            <i class="bi bi-wallet2 cli-stat-icon"></i>
            <div class="cli-stat-body"><div class="cli-stat-val" id="st-ticket">—</div><div class="cli-stat-label">ticket médio</div></div>
          </div>
          <div class="cli-stat">
            <i class="bi bi-calendar3 cli-stat-icon"></i>
            <div class="cli-stat-body"><div class="cli-stat-val" id="st-ultimo">—</div><div class="cli-stat-label">último pedido</div></div>
          </div>
          <div class="cli-stat">
            <i class="bi bi-list-check cli-stat-icon"></i>
            <div class="cli-stat-body"><div class="cli-stat-val" id="st-total">—</div><div class="cli-stat-label">pedidos feitos</div></div>
          </div>
          <div class="cli-stat">
            <i class="bi bi-star cli-stat-icon"></i>
            <div class="cli-stat-body"><div class="cli-stat-val" id="st-aval">—</div><div class="cli-stat-label">avaliação média</div></div>
          </div>
        </div>
        <div class="cli-section-title">Informações pessoais</div>
        <div id="cliInfoPessoal"><div class="cli-mini-load">Carregando...</div></div>
      </div>

      <!-- ── Pedidos ── -->
      <div class="cli-tab-pane" id="pane-pedidos">
        <div style="font-size:.85rem;font-weight:700;color:#111827;margin-bottom:12px">Pedidos feitos pelo cliente</div>
        <div class="cli-ped-filters">
          <div class="cli-ped-filter-group">
            <span class="cli-ped-filter-label">Período dos pedidos</span>
            <select class="cli-ped-filter-select" id="cliPedPeriodo">
              <option value="7">7 dias</option>
              <option value="15">15 dias</option>
              <option value="30" selected>30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
              <option value="365">1 ano</option>
              <option value="0">Todos</option>
            </select>
          </div>
          <div class="cli-ped-filter-group">
            <span class="cli-ped-filter-label">Tipo de pedido</span>
            <select class="cli-ped-filter-select" id="cliPedTipo">
              <option value="todos">Todos os tipos</option>
              <option value="entrega">Entrega</option>
              <option value="retirada">Retirada</option>
            </select>
          </div>
        </div>
        <div id="cliPedidosList"></div>
        <div class="cli-pag" id="cliPedPag"></div>
      </div>

      <!-- ── Avaliações ── -->
      <div class="cli-tab-pane" id="pane-avaliacoes">
        <div id="cliAvalList"></div>
        <div class="cli-pag" id="cliAvalPag"></div>
      </div>

      <!-- ── Pontos ── -->
      <div class="cli-tab-pane" id="pane-pontos">
        <div class="cli-pontos-title">Extrato de pontos</div>
        <div id="cliPontosList"></div>
        <div class="cli-pag" id="cliPontosPag"></div>
      </div>

    </div>

    <!-- Footer fixo -->
    <div class="cli-footer">
      
      <button class="cli-btn-primary" id="cliBtnEditar">Editar cliente</button>
    </div>

  </div>
</div>

<!-- MODAL EDITAR CLIENTE -->
<div class="modal fade" id="rcModalEditarCliente" tabindex="-1" style="z-index:1300">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content" style="border-radius:16px;border:0">
      <div class="modal-header" style="border-bottom:1px solid #f0f0f0">
        <h5 class="modal-title" style="font-size:15px;font-weight:700">Editar cliente</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body" style="padding:20px 24px">
        <input type="hidden" id="rcCliEditId">

        <div style="margin-bottom:20px">
          <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:12px">Dados do cliente</div>
          <div class="mb-3">
            <label class="form-label" style="font-size:13px">Nome do cliente <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="rcCliEditNome" placeholder="Ex.: Felipe">
            <div class="invalid-feedback" id="rcCliEditNomeErro"></div>
          </div>
          <div class="mb-3">
            <label class="form-label" style="font-size:13px">Numero de contato <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="rcCliEditTelefone" placeholder="Ex.: (11) 9 3232-5454">
            <div class="invalid-feedback" id="rcCliEditTelefoneErro"></div>
          </div>
          <div class="mb-3">
            <label class="form-label" style="font-size:13px">Aniversario do cliente</label>
            <input type="date" class="form-control" id="rcCliEditAniversario">
          </div>
        </div>

        <div>
          <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:12px">Endereco</div>
          <div class="mb-3">
            <label class="form-label" style="font-size:13px">CEP</label>
            <input type="text" class="form-control" id="rcCliEditCep" placeholder="Ex.: 00000-000">
          </div>
          <div class="row g-2 mb-3">
            <div class="col-8">
              <label class="form-label" style="font-size:13px">Rua</label>
              <input type="text" class="form-control" id="rcCliEditRua" placeholder="Ex.: Santa Efigenia">
            </div>
            <div class="col-4">
              <label class="form-label" style="font-size:13px">Numero</label>
              <input type="text" class="form-control" id="rcCliEditNumero" placeholder="Ex.: 123">
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label" style="font-size:13px">Bairro</label>
              <input type="text" class="form-control" id="rcCliEditBairro" placeholder="Bairro">
            </div>
            <div class="col-6">
              <label class="form-label" style="font-size:13px">Cidade</label>
              <input type="text" class="form-control" id="rcCliEditCidade" placeholder="Cidade">
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label" style="font-size:13px">Estado</label>
              <input type="text" class="form-control" id="rcCliEditEstado" placeholder="Estado">
            </div>
            <div class="col-6">
              <label class="form-label" style="font-size:13px">Complemento</label>
              <input type="text" class="form-control" id="rcCliEditComplemento" placeholder="Complemento">
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer border-0">
        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn" id="rcCliEditSalvar"
                style="background:#9C5523;color:#fff;border-radius:999px;padding:8px 22px;font-weight:600">Salvar</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/pt.js"></script>
<style>@keyframes spin{to{transform:rotate(360deg)}}</style>
<script>
(function(){
  const lojaId = <?= $lojaId ?>;
  let paginaAtual = 1;
  let dataIni = '', dataFim = '';

  const busca    = document.getElementById('rcBusca');
  const ordenar  = document.getElementById('rcOrdenar');
  const periodo  = document.getElementById('rcPeriodo');
  const limite   = document.getElementById('rcLimite');
  const tbody    = document.getElementById('rcTbody');
  const info     = document.getElementById('rcInfo');
  const paginacao= document.getElementById('rcPagination');


  /* Flatpickr para data customizada */
  const fpWrap = document.getElementById('rcDateRangeWrap');
  const fpInput= document.getElementById('rcDateRange');
  const fp = flatpickr(fpInput, {
    mode:'range', dateFormat:'Y-m-d', locale:'pt', allowInput:false, disableMobile:true,
    onChange(dates) {
      if(dates.length===2) {
        dataIni = dates[0].toISOString().slice(0,10)+' 00:00:00';
        dataFim = dates[1].toISOString().slice(0,10)+' 23:59:59';
        const fmt = d => `${String(d.getDate()).padStart(2,'0')} ${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][d.getMonth()]}`;
        fpInput.value = `${fmt(dates[0])} 00:00 — ${fmt(dates[1])} 23:59`;
        carregar(1);
      }
    }
  });

  periodo.addEventListener('change', () => {
    if(periodo.value === 'custom') { fpWrap.style.display='flex'; }
    else { fpWrap.style.display='none'; dataIni=''; dataFim=''; carregar(1); }
  });



  

  /* Debounce busca */
  let _debTimer;
  busca.addEventListener('input', () => { clearTimeout(_debTimer); _debTimer=setTimeout(()=>carregar(1),400); });
  ordenar.addEventListener('change', ()=>carregar(1));
  limite.addEventListener('change',  ()=>carregar(1));

  async function carregar(pag) {
    paginaAtual = pag;
    tbody.innerHTML = '<tr><td colspan="7" class="rc-loading"><i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite;display:inline-block"></i> Carregando...</td></tr>';
    info.textContent = '';
    paginacao.innerHTML = '';

    const qs = new URLSearchParams({
      busca:    busca.value,
      ordenar:  ordenar.value,
      periodo:  periodo.value !== 'custom' ? periodo.value : '30',
      data_ini: dataIni,
      data_fim: dataFim,
      pagina:   paginaAtual,
      limite:   limite.value,
    });

    try {
      const r = await fetch(`api/relatorios_clientes.php?${qs}`, {credentials:'same-origin'});
      const d = await r.json();
      if(!d.ok) { tbody.innerHTML='<tr><td colspan="7" class="rc-empty"><i class="bi bi-exclamation-circle"></i>Erro ao carregar dados.</td></tr>'; return; }

      if(!d.clientes.length) {
        tbody.innerHTML='<tr><td colspan="7" class="rc-empty"><i class="bi bi-people"></i>Nenhum cliente encontrado para os filtros selecionados.</td></tr>';
        info.textContent='';
        return;
      }

      tbody.innerHTML = d.clientes.map(c=>`
        <tr>
          <td class="td-nome">${escHtml(c.nome||'-')}${c.telefone?`<br><small style="color:#9ca3af;font-size:.72rem">${escHtml(c.telefone)}</small>`:''}</td>
          <td>${c.ultimo_pedido_fmt}</td>
          <td>${c.total_taxa_fmt}</td>
          <td>${c.ticket_medio_fmt}</td>
          <td class="td-valor">${c.total_gasto_fmt}</td>
          <td>${c.pedidos_feitos}</td>
          <td><button class="rc-btn-detalhe" onclick="abrirClienteModal(${c.cliente_id})">Ver detalhes</button></td>
        </tr>`).join('');

      /* Info */
      const ini = (paginaAtual-1)*parseInt(limite.value)+1;
      const fim = Math.min(paginaAtual*parseInt(limite.value), d.total);
      info.textContent = `Mostrando ${ini} a ${fim} de ${d.total} clientes`;

      /* Paginação */
      renderPag(d.pagina, d.paginas);

    } catch(e) {
      tbody.innerHTML='<tr><td colspan="7" class="rc-empty"><i class="bi bi-exclamation-circle"></i>Erro de conexão.</td></tr>';
    }
  }

  function renderPag(atual, total) {
    if(total<=1){ paginacao.innerHTML=''; return; }
    let html = '';
    html += `<button class="rc-page-btn" onclick="carregar(1)" ${atual<=1?'disabled':''}title="Primeira">«</button>`;
    html += `<button class="rc-page-btn" onclick="carregar(${atual-1})" ${atual<=1?'disabled':''}title="Anterior">‹</button>`;
    html += `<span class="rc-page-label">Página ${atual} de ${total}</span>`;
    html += `<button class="rc-page-btn" onclick="carregar(${atual+1})" ${atual>=total?'disabled':''}title="Próxima">›</button>`;
    html += `<button class="rc-page-btn" onclick="carregar(${total})" ${atual>=total?'disabled':''}title="Última">»</button>`;
    paginacao.innerHTML = html;
  }

  function escHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  window.carregar = carregar;
  carregar(1);
})();
</script>

<script>
(function(){
  const overlay  = document.getElementById('cliOverlay');
  let _cliId = 0, _pedPag = 1, _avalPag = 1, _pontosPag = 1, _cliDataAtual = null;

  /* ── Helpers ── */
  const fmtM = v => 'R$ ' + Number(v).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  const fmtD = s => { if(!s) return 'Sem dados'; const d=new Date(s.replace(' ','T')); return d.toLocaleDateString('pt-BR'); };
  const fmtDH = s => { if(!s) return '—'; const d=new Date(s.replace(' ','T')); return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); };
  const escH = s => { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; };
  function fmtEndereco(e){
    if(!e) return '';
    const ruaNum     = [e.rua, e.numero].filter(Boolean).join(', ');
    const bairroCity = [e.bairro, e.cidade].filter(Boolean).join(' / ');
    return [ruaNum, bairroCity, e.estado, e.complemento].filter(Boolean).join(' - ');
  }
  function starsHtml(n){
    return Array.from({length:5},(_, i)=>`<span class="${i<n?'cli-star-filled':'cli-star-empty'}">★</span>`).join('');
  }
  function emptyState(icon, title, sub){
    return `<div class="cli-empty"><div class="cli-empty-icon"><i class="bi bi-${icon}"></i></div><div class="cli-empty-title">${title}</div><div class="cli-empty-sub">${sub}</div></div>`;
  }
  function renderPag(container, pag, total, cb){
    if(total<=1){ container.innerHTML=''; return; }
    container.innerHTML=`
      <button class="cli-pag-arrow" ${pag<=1?'disabled':''} data-p="${pag-1}"><i class="bi bi-chevron-left"></i></button>
      <span class="cli-pag-num">${pag}</span>
      <button class="cli-pag-arrow" ${pag>=total?'disabled':''} data-p="${pag+1}"><i class="bi bi-chevron-right"></i></button>`;
    container.querySelectorAll('.cli-pag-arrow').forEach(b=>b.addEventListener('click',()=>cb(+b.dataset.p)));
  }

  /* ── Abrir ── */
  window.abrirClienteModal = async function(cliId){
    _cliId=cliId; _pedPag=1; _avalPag=1; _pontosPag=1;
    overlay.classList.add('show');
    document.body.style.overflow='hidden';
    switchTab('perfil');
    document.getElementById('cliNome').textContent='—';
    document.getElementById('cliDesde').textContent='';
    document.getElementById('cliAvatar').textContent='?';
    document.getElementById('cliInfoPessoal').innerHTML='<div class="cli-mini-load">Carregando...</div>';
    ['st-cashback','st-pontos','st-fiado','st-ticket','st-ultimo','st-total','st-aval'].forEach(id=>document.getElementById(id).textContent='—');

    document.getElementById('cliBtnEditar').onclick = ()=> rcAbrirEditarCliente(cliId, _cliDataAtual);

    try{
      const r=await fetch(`api/cliente_stats.php?cliente_id=${cliId}`,{credentials:'same-origin'});
      const d=await r.json();
      if(!d.ok) return;
      _cliDataAtual = d;

      document.getElementById('cliAvatar').textContent=(d.nome||'?')[0].toUpperCase();
      document.getElementById('cliNome').textContent=d.nome||'—';
      document.getElementById('cliDesde').textContent=d.criado_em?'Cliente desde: '+fmtD(d.criado_em):'';

      document.getElementById('st-cashback').textContent = fmtM(d.cashback||0);
      document.getElementById('st-pontos').textContent   = d.pontos!=null ? (d.pontos+' pts') : 'Sem dados';
      document.getElementById('st-fiado').textContent    = fmtM(d.saldo_fiado||0);
      document.getElementById('st-ticket').textContent   = fmtM(d.ticket_medio||0);
      document.getElementById('st-ultimo').textContent   = fmtD(d.ultimo_pedido);
      document.getElementById('st-total').textContent    = d.pedidos_feitos||0;
      document.getElementById('st-aval').textContent     = d.avaliacao_media!=null ? d.avaliacao_media+' / 5' : 'Sem dados';

      let html='';
      if(d.telefone) html+=infoRow('Telefone',escH(d.telefone));
      if(d.email)    html+=infoRow('E-mail',escH(d.email));
      if(d.nivel)    html+=infoRow('Nível',escH(d.nivel));
      const e=d.endereco||{};
      const endFmt = fmtEndereco(e);
      if(endFmt) html+=infoRow('Endereço',escH(endFmt));
      document.getElementById('cliInfoPessoal').innerHTML=html||'<p style="font-size:.78rem;color:#9ca3af">Sem informações adicionais.</p>';
    }catch(e){}
  };

  function infoRow(label,val){
    return `<div class="cli-info-row"><div class="cli-info-label">${label}</div><div class="cli-info-val">${val}</div></div>`;
  }

  /* ── Fechar ── */
  function fechar(){ overlay.classList.remove('show'); document.body.style.overflow=''; }
  document.getElementById('cliClose').addEventListener('click',fechar);
  overlay.addEventListener('click',e=>{ if(e.target===overlay) fechar(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') fechar(); });

  /* ── Tabs ── */
  function switchTab(nome){
    document.querySelectorAll('.cli-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===nome));
    document.querySelectorAll('.cli-tab-pane').forEach(p=>p.classList.toggle('active',p.id==='pane-'+nome));
  }
  document.querySelectorAll('.cli-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      const n=tab.dataset.tab;
      switchTab(n);
      if(n==='pedidos')    carregarPedidos(1);
      if(n==='avaliacoes') carregarAvaliacoes(1);
      if(n==='pontos')     carregarPontos(1);
    });
  });

  // Filtros de pedidos
  document.getElementById('cliPedPeriodo').addEventListener('change',()=>carregarPedidos(1));
  document.getElementById('cliPedTipo').addEventListener('change',()=>carregarPedidos(1));

  /* ── Pedidos ── */
  async function carregarPedidos(pag){
    _pedPag=pag;
    const el=document.getElementById('cliPedidosList');
    el.innerHTML='<div class="cli-mini-load">Carregando...</div>';
    const periodo=document.getElementById('cliPedPeriodo').value;
    const tipo=document.getElementById('cliPedTipo').value;
    try{
      const r=await fetch(`api/cliente_pedidos.php?cliente_id=${_cliId}&pagina=${pag}&periodo=${periodo}&tipo=${tipo}`,{credentials:'same-origin'});
      const d=await r.json();
      if(!d.ok||!d.pedidos.length){
        el.innerHTML=emptyState('bag','Nenhum pedido encontrado','Nenhum pedido corresponde aos filtros selecionados.');
        document.getElementById('cliPedPag').innerHTML='';
        return;
      }
      el.innerHTML=d.pedidos.map(p=>`
        <div class="cli-ped-card">
          <div class="cli-ped-card-top">
            <div class="cli-ped-card-meta">
              <i class="bi bi-calendar3"></i>
              <span>Pedido realizado em:</span>
              <span class="cli-ped-card-date">${fmtDH(p.criado_em)}</span>
            </div>
            <span class="cli-badge ${p.tipo==='retirada'?'cli-badge-retirada':'cli-badge-entrega'}">${p.tipo==='retirada'?'Retirada':'Entrega'}</span>
          </div>
          ${p.resumo?`<div class="cli-ped-card-resumo-label">Resumo do pedido:</div><div class="cli-ped-card-resumo-val">${escH(p.resumo)}</div>`:''}
          <div class="cli-ped-card-total">
            <span>Total:</span>
            <span class="cli-ped-card-total-val">${fmtM(p.total)}</span>
          </div>
        </div>`).join('');
      renderPag(document.getElementById('cliPedPag'),d.pagina,d.paginas,carregarPedidos);
    }catch(e){ el.innerHTML='<div class="cli-mini-load">Erro ao carregar.</div>'; }
  }

  /* ── Avaliações ── */
  async function carregarAvaliacoes(pag){
    _avalPag=pag;
    const el=document.getElementById('cliAvalList');
    el.innerHTML='<div class="cli-mini-load">Carregando...</div>';
    try{
      const r=await fetch(`api/cliente_avaliacoes.php?cliente_id=${_cliId}&pagina=${pag}`,{credentials:'same-origin'});
      const d=await r.json();
      if(!d.ok||!d.avaliacoes.length){
        el.innerHTML=emptyState('star','Nenhuma avaliação','Este cliente ainda não fez nenhuma avaliação.');
        document.getElementById('cliAvalPag').innerHTML='';
        return;
      }
      el.innerHTML=d.avaliacoes.map(a=>`
        <div class="cli-aval-card">
          <div class="cli-stars">${starsHtml(a.nota)}</div>
          ${a.descricao?`<div class="cli-aval-desc">${escH(a.descricao)}</div>`:''}
          <div class="cli-aval-date">${fmtDH(a.criado_em)}${a.pedido_id?` · Pedido #${a.pedido_id}`:''}</div>
        </div>`).join('');
      renderPag(document.getElementById('cliAvalPag'),d.pagina,d.paginas,carregarAvaliacoes);
    }catch(e){ el.innerHTML='<div class="cli-mini-load">Erro ao carregar.</div>'; }
  }

  /* ── Pontos ── */
  async function carregarPontos(pag){
    _pontosPag=pag;
    const el=document.getElementById('cliPontosList');
    el.innerHTML='<div class="cli-mini-load">Carregando...</div>';
    try{
      const r=await fetch(`api/cliente_pontos.php?cliente_id=${_cliId}&pagina=${pag}`,{credentials:'same-origin'});
      const d=await r.json();
      if(!d.ok||!d.pontos.length){
        el.innerHTML=emptyState('gift','Nenhuma movimentação ainda','Os ganhos e resgates de pontos do cliente aparecerão aqui');
        document.getElementById('cliPontosPag').innerHTML='';
        return;
      }
      const tipos={ganho:'Pontos ganhos',uso:'Pontos usados',expirado:'Expirado',ajuste:'Ajuste',resgate:'Resgate'};
      el.innerHTML='<div>'+d.pontos.map(pt=>`
        <div class="cli-ponto-row">
          <div>
            <div class="cli-ponto-tipo">${tipos[pt.tipo]||escH(pt.tipo)}</div>
            <div class="cli-ponto-data">${fmtDH(pt.criado_em)}${pt.pedido_id?` · Pedido #${pt.pedido_id}`:''}</div>
          </div>
          <div class="cli-ponto-val ${pt.pontos>=0?'pos':'neg'}">${pt.pontos>=0?'+':''}${pt.pontos} pts</div>
        </div>`).join('')+'</div>';
      renderPag(document.getElementById('cliPontosPag'),d.pagina,d.paginas,carregarPontos);
    }catch(e){ el.innerHTML='<div class="cli-mini-load">Erro ao carregar.</div>'; }
  }

})();

/* ── Modal Editar Cliente ── */
(function(){
  const modalEl = document.getElementById('rcModalEditarCliente');
  if(!modalEl) return;
  const modal = new bootstrap.Modal(modalEl);

  // Eleva o backdrop acima do overlay do perfil
  modalEl.addEventListener('shown.bs.modal', function(){
    const bds = document.querySelectorAll('.modal-backdrop');
    if(bds.length) bds[bds.length-1].style.zIndex = '1250';
    document.body.classList.add('modal-open');
  });

  window.rcAbrirEditarCliente = function(id, d){
    d = d || {};
    const e = d.endereco || {};
    document.getElementById('rcCliEditId').value        = id || '';
    document.getElementById('rcCliEditNome').value      = d.nome       || '';
    document.getElementById('rcCliEditTelefone').value  = d.telefone   || '';
    document.getElementById('rcCliEditAniversario').value = d.aniversario ? d.aniversario.split(' ')[0] : '';
    document.getElementById('rcCliEditCep').value       = e.cep        || '';
    document.getElementById('rcCliEditRua').value       = e.rua        || '';
    document.getElementById('rcCliEditNumero').value    = e.numero     || '';
    document.getElementById('rcCliEditBairro').value    = e.bairro     || '';
    document.getElementById('rcCliEditCidade').value    = e.cidade     || '';
    document.getElementById('rcCliEditEstado').value    = e.estado     || '';
    document.getElementById('rcCliEditComplemento').value = e.complemento || '';
    // Limpa erros
    ['rcCliEditNome','rcCliEditTelefone'].forEach(fId=>{
      const el = document.getElementById(fId);
      if(el) el.classList.remove('is-invalid');
    });
    modal.show();
  };

  document.getElementById('rcCliEditSalvar').addEventListener('click', async function(){
    const id    = document.getElementById('rcCliEditId').value;
    const nome  = document.getElementById('rcCliEditNome').value.trim();
    const tel   = document.getElementById('rcCliEditTelefone').value.trim();
    let ok = true;
    if(!nome){ document.getElementById('rcCliEditNome').classList.add('is-invalid'); document.getElementById('rcCliEditNomeErro').textContent='Informe o nome.'; ok=false; }
    if(!tel){  document.getElementById('rcCliEditTelefone').classList.add('is-invalid'); document.getElementById('rcCliEditTelefoneErro').textContent='Informe o telefone.'; ok=false; }
    if(!ok) return;

    const payload = {
      id, nome, telefone: tel,
      aniversario: document.getElementById('rcCliEditAniversario').value,
      cep:         document.getElementById('rcCliEditCep').value.trim(),
      rua:         document.getElementById('rcCliEditRua').value.trim(),
      numero:      document.getElementById('rcCliEditNumero').value.trim(),
      bairro:      document.getElementById('rcCliEditBairro').value.trim(),
      cidade:      document.getElementById('rcCliEditCidade').value.trim(),
      estado:      document.getElementById('rcCliEditEstado').value.trim(),
      complemento: document.getElementById('rcCliEditComplemento').value.trim(),
    };
    payload.endereco = [payload.rua, payload.numero, payload.bairro, payload.cidade, payload.estado].filter(Boolean).join(', ');

    const btn = document.getElementById('rcCliEditSalvar');
    btn.disabled = true; btn.textContent = 'Salvando...';

    try{
      const r = await fetch('api/cliente_atualizar.php', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const res = await r.json();
      btn.disabled = false; btn.textContent = 'Salvar';
      if(res.ok){
        modal.hide();
        // Atualiza nome no overlay se ainda aberto
        const nomeEl = document.getElementById('cliNome');
        if(nomeEl) nomeEl.textContent = nome;
      } else {
        alert(res.msg || 'Erro ao salvar.');
      }
    }catch(e){
      btn.disabled = false; btn.textContent = 'Salvar';
      alert('Erro de comunicação.');
    }
  });
})();
</script>
</body>
</html>
