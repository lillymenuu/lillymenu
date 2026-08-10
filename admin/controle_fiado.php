<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.controle_fiado');
require_once __DIR__ . '/helpers/config.php';

$lojaId   = (int) ($_SESSION['loja_id'] ?? 1);
$lojaNome = config($conn, 'nome_loja', 'Minha Loja');
$_SESSION['loja_nome'] = $lojaNome;
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$gestorCssVer = filemtime(__DIR__ . '/assets/css/gestor_pedidos.css');
$rota   = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Controle de fiado — <?= htmlspecialchars($lojaNome) ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link href="./assets/css/gestor_pedidos.css?v=<?= $gestorCssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
<style>
.fiado-page{max-width:1100px;margin:0 auto;padding:24px 20px}
.fiado-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.fiado-title{font-size:1.3rem;font-weight:800;color:#111827;margin:0}
.btn-fiado-primary{border:0;background:#f43f5e;color:#fff;border-radius:10px;padding:.6rem 1.2rem;font-weight:600;font-size:.85rem;font-family:inherit;cursor:pointer;transition:background .15s}
.btn-fiado-primary:hover{background:#e11d48}
.btn-fiado-ghost{border:1.5px solid #e5e7eb;background:#fff;color:#374151;border-radius:10px;padding:.6rem 1.2rem;font-weight:600;font-size:.85rem;font-family:inherit;cursor:pointer}
.btn-fiado-ghost:hover{border-color:#9ca3af}
.fiado-kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:22px}
.fiado-kpi-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px 18px;display:flex;align-items:center;gap:14px}
.fiado-kpi-icon{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0}
.fiado-kpi-icon.pink{background:#fde2e8;color:#e11d48}
.fiado-kpi-icon.blue{background:#dbeafe;color:#2563eb}
.fiado-kpi-value{font-size:1.15rem;font-weight:800;color:#111827}
.fiado-kpi-label{font-size:.78rem;color:#6b7280}
.fiado-section-title{font-size:.95rem;font-weight:700;color:#111827;margin-bottom:12px}
.fiado-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;margin-bottom:18px}
.fiado-filter-head{display:flex;align-items:center;gap:10px;padding:16px 18px}
.fiado-filter-icon{width:34px;height:34px;border-radius:10px;background:#fde2e8;color:#e11d48;display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0}
.fiado-filter-title{font-weight:700;font-size:.88rem;color:#111827}
.fiado-filter-body{padding:0 18px 18px}
.fiado-filter-label{font-size:.66rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;display:block}
.fiado-filter-search{position:relative;max-width:420px}
.fiado-filter-search input{width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:.55rem .9rem;padding-right:34px;font-size:.85rem;font-family:inherit;outline:none}
.fiado-filter-search input:focus{border-color:#f43f5e}
.fiado-filter-search i{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#9ca3af}
.fiado-table-wrap{overflow-x:auto}
.fiado-table{width:100%;border-collapse:collapse}
.fiado-table th{font-size:.7rem;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;padding:10px 18px;border-bottom:1px solid #f0f0f0;white-space:nowrap;text-align:left}
.fiado-table td{font-size:.85rem;color:#374151;padding:12px 18px;border-bottom:1px solid #f5f6f8}
.fiado-table tbody tr:last-child td{border-bottom:0}
.fiado-table .td-nome{font-weight:600;color:#111827}
.fiado-table .td-valor{font-weight:700;color:#e11d48}
.fiado-btn-detalhe{border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:.4rem .9rem;font-size:.78rem;font-weight:600;font-family:inherit;color:#374151;cursor:pointer;white-space:nowrap}
.fiado-btn-detalhe:hover{border-color:#f43f5e;color:#e11d48}
.fiado-footer{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-top:1px solid #f0f0f0;flex-wrap:wrap;gap:10px}
.fiado-per-page{display:flex;align-items:center;gap:6px;font-size:.78rem;color:#6b7280}
.fiado-per-page select{border:1.5px solid #e5e7eb;border-radius:7px;padding:4px 8px;font-size:.78rem;font-family:inherit;cursor:pointer;outline:none}
.fiado-info{font-size:.78rem;color:#6b7280}
.fiado-pagination{display:flex;align-items:center;gap:4px}
.fiado-page-btn{border:1.5px solid #e5e7eb;background:#fff;border-radius:7px;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:600;cursor:pointer;color:#374151}
.fiado-page-btn:hover:not(:disabled){border-color:#f43f5e;color:#e11d48}
.fiado-page-btn:disabled{opacity:.4;cursor:not-allowed}
.fiado-page-label{font-size:.78rem;color:#6b7280;padding:0 6px}
.fiado-empty{text-align:center;padding:36px 20px;color:#9ca3af;font-size:.85rem}
.fiado-loading{text-align:center;padding:32px;color:#9ca3af;font-size:.85rem}

/* Modais */
.fiado-modal .modal-content{border-radius:16px;border:0}
.fiado-modal .modal-header{border-bottom:1px solid #f0f0f0}
.fiado-modal .modal-title{font-size:1rem;font-weight:700}
.fiado-modal-sm .modal-content{max-width:380px;margin:0 auto}
.fiado-modal-subtitle{font-size:.85rem;color:#374151;margin-bottom:14px}
.fiado-modal-subtitle-2{font-size:.88rem;font-weight:700;color:#111827;margin-bottom:10px}
.fiado-divider{border-top:1px solid #f0f0f0;margin:18px 0}

/* Caixa estilo "select"/input cinza com label flutuante */
.fiado-select-box{position:relative;background:#f3f4f6;border-radius:10px;padding:8px 36px 8px 14px;cursor:text}
.fiado-select-label{font-size:.68rem;color:#9ca3af;margin-bottom:1px}
.fiado-select-input{border:0;background:transparent;outline:none;width:100%;font-size:.85rem;color:#111827;padding:0}
.fiado-select-input::placeholder{color:#9ca3af}
.fiado-select-chevron{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none}
.fiado-input-box{background:#f3f4f6;border-radius:10px;padding:8px 14px;margin-bottom:12px}
.fiado-input-box label{font-size:.68rem;color:#9ca3af;display:block;margin-bottom:1px}
.fiado-input-box input,
.fiado-input-box select{border:0;background:transparent;outline:none;width:100%;font-size:.85rem;color:#111827;padding:0}
.fiado-input-box input::placeholder{color:#9ca3af}

.fiado-search-result{border:1px solid #e5e7eb;border-radius:10px;margin-top:6px;max-height:180px;overflow-y:auto;display:none;background:#fff}
.fiado-search-result.show{display:block}
.fiado-search-result-item{padding:9px 14px;font-size:.82rem;cursor:pointer}
.fiado-search-result-item:hover{background:#f8fafc}

/* Tela de dividas do cliente */
.fiado-total-label{font-size:.85rem;color:#374151;margin-bottom:2px}
.fiado-total-valor{font-size:1.4rem;font-weight:800;color:#e11d48;margin-bottom:16px}
.fiado-detalhe-section-title{font-size:.92rem;font-weight:700;color:#111827;margin-bottom:10px}
.fiado-hist-table-wrap{overflow-x:auto;border:1px solid #e5e7eb;border-radius:12px}
.fiado-hist-table{width:100%;border-collapse:collapse}
.fiado-hist-table th{font-size:.66rem;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.03em;padding:9px 14px;border-bottom:1px solid #f0f0f0;background:#f8fafc;white-space:nowrap;text-align:left}
.fiado-hist-table td{font-size:.8rem;color:#374151;padding:10px 14px;border-bottom:1px solid #f5f6f8;white-space:nowrap}
.fiado-hist-table tbody tr:last-child td{border-bottom:0}
.fiado-badge{display:inline-block;border-radius:999px;padding:.2rem .65rem;font-size:.72rem;font-weight:700;border:1.5px solid transparent}
.fiado-badge.pago{color:#16a34a;border-color:#86efac;background:#f0fdf4}
.fiado-badge.venda{color:#e11d48;border-color:#fda4af;background:#fff1f2}
.fiado-hist-pagination{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:14px}
.fiado-hist-arrow{border:0;background:transparent;color:#374151;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.fiado-hist-arrow:hover:not(:disabled){background:#f3f4f6}
.fiado-hist-arrow:disabled{opacity:.35;cursor:not-allowed}
.fiado-hist-num{width:30px;height:30px;border-radius:8px;border:1.5px solid #f43f5e;color:#e11d48;display:inline-flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700}

/* gestor_pedidos.css define .pedido-detalhe-modal{overflow:visible}, o que quebra o
   modal-dialog-scrollable do Bootstrap (precisa de overflow:hidden no modal-content
   para o footer ficar fixo e so o body rolar). Reforca aqui so para este modal. */
#modalPedidoVisualizar .modal-content{overflow:hidden;max-height:calc(100vh - 56px);display:flex;flex-direction:column}
#modalPedidoVisualizar .modal-body{overflow-y:auto}

.fiado-pay-method-label{font-size:.82rem;font-weight:600;color:#111827;margin:16px 0 10px}
.fiado-pay-method-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.fiado-pay-method-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1.5px solid #e5e7eb;border-radius:12px;padding:16px 6px;background:#fff;cursor:pointer;font-size:.78rem;color:#374151;font-family:inherit}
.fiado-pay-method-card i{font-size:1.3rem;color:#374151}
.fiado-pay-method-card:hover{border-color:#cbd5e1}
.fiado-pay-method-card.active{border-color:#f43f5e;background:#fff1f3;color:#e11d48}
.fiado-pay-method-card.active i{color:#e11d48}
</style>
</head>
<body class="dash-diggy">
<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="fiado-page">
  <div class="fiado-header">
    <h1 class="fiado-title">Controle de fiado</h1>
    <button type="button" class="btn-fiado-primary" id="btnRegistrarFiado">Registrar fiado</button>
  </div>

  <div class="fiado-kpis">
    <div class="fiado-kpi-card">
      <div class="fiado-kpi-icon pink"><i class="bi bi-cash-coin"></i></div>
      <div>
        <div class="fiado-kpi-value" id="fiadoTotalDebitos">R$ 0,00</div>
        <div class="fiado-kpi-label">total de débitos</div>
      </div>
    </div>
    <div class="fiado-kpi-card">
      <div class="fiado-kpi-icon blue"><i class="bi bi-people-fill"></i></div>
      <div>
        <div class="fiado-kpi-value" id="fiadoTotalClientes">0</div>
        <div class="fiado-kpi-label">clientes com dívida ativa</div>
      </div>
    </div>
  </div>

  <div class="fiado-section-title">Lista de clientes com dívida ativa</div>

  <div class="fiado-card">
    <div class="fiado-filter-head">
      <div class="fiado-filter-icon"><i class="bi bi-funnel-fill"></i></div>
      <div class="fiado-filter-title">Pesquisar</div>
    </div>
    <div class="fiado-filter-body">
      <span class="fiado-filter-label">Buscar pelo nome ou telefone do cliente</span>
      <div class="fiado-filter-search">
        <input type="search" id="fiadoBusca" placeholder="Digite o nome ou telefone do cliente">
        <i class="bi bi-search"></i>
      </div>
    </div>
  </div>

  <div class="fiado-card">
    <div class="fiado-table-wrap">
      <table class="fiado-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Valor do débito</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="fiadoTbody">
          <tr><td colspan="4" class="fiado-loading">Carregando...</td></tr>
        </tbody>
      </table>
    </div>
    <div class="fiado-footer">
      <div class="fiado-per-page">
        Itens por página:
        <select id="fiadoLimite">
          <option value="10" selected>10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>
      </div>
      <div class="fiado-info" id="fiadoInfo"></div>
      <div class="fiado-pagination" id="fiadoPagination"></div>
    </div>
  </div>
</div>

</main>

<!-- MODAL: Selecionar cliente (entrada do "Registrar fiado" no topo) -->
<div class="modal fade fiado-modal" id="modalFiadoSelecionarCliente" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Selecionar cliente</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <p class="fiado-modal-subtitle">Preencha os dados para buscar ou adicionar um cliente</p>

        <div class="fiado-select-box" id="fiadoSelectClienteBox">
          <div class="fiado-select-label">Busque pelo cliente</div>
          <input type="text" class="fiado-select-input" id="fiadoSelectClienteInput" placeholder="Busque por número ou nome" autocomplete="off">
          <i class="bi bi-chevron-down fiado-select-chevron"></i>
        </div>
        <div class="fiado-search-result" id="fiadoSelectClienteResultado"></div>

        <div class="fiado-divider"></div>

        <div class="fiado-modal-subtitle-2">Você pode também adicionar um novo cliente</div>
        <div class="fiado-input-box">
          <label>Número de contato <span class="text-danger">*</span></label>
          <input type="text" id="fiadoNovoClienteTelefone" placeholder="Ex.: (11) 9 3232-5454">
        </div>
        <div class="fiado-input-box">
          <label>Nome do cliente <span class="text-danger">*</span></label>
          <input type="text" id="fiadoNovoClienteNome" placeholder="Ex.: Felipe">
        </div>
        <div id="fiadoSelecionarErro" class="text-danger" style="font-size:.8rem"></div>
      </div>
      <div class="modal-footer" style="border-top:0">
        <button type="button" class="btn-fiado-primary" id="btnAdicionarClienteFiado">Adicionar cliente</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: Dividas do cliente -->
<div class="modal fade fiado-modal" id="modalFiadoDetalhe" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:720px">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="fiadoDetalheNome">Dívidas</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="fiado-total-label">Total fiado</div>
        <div class="fiado-total-valor" id="fiadoDetalheSaldo">R$ 0,00</div>

        <div class="fiado-detalhe-section-title">Histórico</div>
        <div class="fiado-hist-table-wrap">
          <table class="fiado-hist-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Pagamento</th>
                <th>Data</th>
                <th>Registrado por</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="fiadoLancamentosTbody">
              <tr><td colspan="5" class="fiado-loading">Carregando...</td></tr>
            </tbody>
          </table>
        </div>
        <div class="fiado-hist-pagination" id="fiadoHistPagination"></div>
      </div>
      <div class="modal-footer" style="border-top:0;gap:8px">
        <button type="button" class="btn-fiado-ghost" id="btnAbrirRegistrarPagamento">Registrar pagamento</button>
        <button type="button" class="btn-fiado-primary" id="btnAbrirRegistrarFiadoValor">Registrar fiado</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: Registrar fiado (valor simples) -->
<div class="modal fade fiado-modal" id="modalFiadoValorSimples" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered fiado-modal-sm">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Registrar fiado</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="fiado-input-box">
          <label>Valor a ser fiado <span class="text-danger">*</span></label>
          <input type="number" step="0.01" min="0.01" id="fiadoValorSimplesInput" placeholder="0,00">
        </div>
        <div id="fiadoValorSimplesErro" class="text-danger" style="font-size:.8rem"></div>
      </div>
      <div class="modal-footer" style="border-top:0">
        <button type="button" class="btn-fiado-primary" id="btnSalvarFiadoValorSimples">Salvar</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: Registrar pagamento (valor simples) -->
<div class="modal fade fiado-modal" id="modalFiadoPagamentoSimples" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered fiado-modal-sm">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Registrar pagamento</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="fiado-input-box">
          <label>Valor a ser pago <span class="text-danger">*</span></label>
          <input type="number" step="0.01" min="0.01" id="fiadoPagamentoSimplesValor" placeholder="0,00">
        </div>
        <div class="fiado-pay-method-label">Qual método de pagamento?</div>
        <div class="fiado-pay-method-grid" id="fiadoPagamentoSimplesFormaGrid">
          <button type="button" class="fiado-pay-method-card" data-forma="dinheiro">
            <i class="bi bi-cash"></i>
            <span>Dinheiro</span>
          </button>
          <button type="button" class="fiado-pay-method-card" data-forma="pix">
            <i class="bi bi-suit-diamond"></i>
            <span>Pix</span>
          </button>
          <button type="button" class="fiado-pay-method-card" data-forma="credito">
            <i class="bi bi-credit-card-2-front"></i>
            <span>Crédito</span>
          </button>
          <button type="button" class="fiado-pay-method-card" data-forma="debito">
            <i class="bi bi-credit-card"></i>
            <span>Débito</span>
          </button>
          <button type="button" class="fiado-pay-method-card" data-forma="voucher">
            <i class="bi bi-credit-card"></i>
            <span>Voucher</span>
          </button>
          <button type="button" class="fiado-pay-method-card" data-forma="outro">
            <i class="bi bi-credit-card"></i>
            <span>Outro</span>
          </button>
        </div>
        <div id="fiadoPagamentoSimplesErro" class="text-danger" style="font-size:.8rem"></div>
      </div>
      <div class="modal-footer" style="border-top:0">
        <button type="button" class="btn-fiado-primary" id="btnSalvarFiadoPagamentoSimples">Salvar</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: Detalhes do lancamento -->
<div class="modal fade fiado-modal" id="modalFiadoLancDetalhe" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered fiado-modal-sm">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Detalhes do lançamento</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body" id="fiadoLancDetalheBody"></div>
    </div>
  </div>
</div>

<!-- MODAL: Visualizar pedido (mesmo layout do gestor_pedidos.php) -->
<div class="modal fade" id="modalPedidoVisualizar" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:520px">
    <div class="modal-content pedido-detalhe-modal">
      <div class="modal-header">
        <div class="pedido-detalhe-header w-100">
          <h5 id="pvNumero">Pedido N. -</h5>
          <div class="pedido-detalhe-actions">
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div class="pedido-detalhe-tempo" id="pvTempo">feito ha -</div>
        <div class="pedido-detalhe-divider"></div>

        <div class="pedido-detalhe-agendamento-section d-none" id="pvAgendamentoWrap">
          <div class="pedido-detalhe-agendamento-title">
            <i class="bi bi-calendar-event"></i>
            <span id="pvAgendamentoTitulo">RETIRADA AGENDADA</span>
            <span class="pedido-detalhe-agendamento-sub" id="pvAgendamentoOrigem"></span>
          </div>
          <div class="pedido-detalhe-agendamento-box" id="pvAgendamentoBox">Agendado para: -</div>
        </div>

        <div class="pedido-detalhe-grid">
          <div class="pedido-detalhe-item">
            <span class="label-strong"><i class="bi bi-calendar-event"></i> Horario do pedido</span>
            <strong id="pvHorario">-</strong>
          </div>
          <div class="pedido-detalhe-item">
            <span class="label-strong"><i class="bi bi-display"></i> Status do pedido</span>
            <strong class="pedido-detalhe-status" id="pvStatus">-</strong>
          </div>
          <div class="pedido-detalhe-item">
            <span class="label-strong"><i class="bi bi-person"></i> Nome do cliente</span>
            <strong id="pvCliente">-</strong>
          </div>
          <div class="pedido-detalhe-item">
            <span class="label-strong"><i class="bi bi-telephone"></i> Telefone</span>
            <strong id="pvTelefone">-</strong>
          </div>
        </div>

        <div class="pedido-detalhe-actions-row">
          <a class="btn btn-outline-secondary btn-sm" href="#" id="pvContato">
            <i class="bi bi-telephone"></i> Entrar em contato com o cliente
          </a>
          <a class="btn btn-outline-secondary btn-sm" href="#" id="pvWhatsapp" target="_blank">
            <i class="bi bi-whatsapp"></i> Enviar pedido ao WhatsApp
          </a>
        </div>

        <div class="pedido-detalhe-client-stats" id="pvStatsWrap">
          <div class="pedido-detalhe-client-grid">
            <div class="pedido-detalhe-client-metric">
              <i class="bi bi-receipt"></i>
              <div>
                <span>Pedidos feitos</span>
                <strong id="pvPedidosFeitos">0</strong>
              </div>
            </div>
            <div class="pedido-detalhe-client-metric">
              <i class="bi bi-bag-check"></i>
              <div>
                <span>Ticket medio</span>
                <strong id="pvTicketMedio">R$ 0,00</strong>
              </div>
            </div>
            <div class="pedido-detalhe-client-metric" id="pvPontosMetric">
              <i class="bi bi-star"></i>
              <div>
                <span>Pontos</span>
                <strong id="pvPontos">0</strong>
              </div>
            </div>
            <div class="pedido-detalhe-client-metric" id="pvCashbackMetric">
              <i class="bi bi-cash-coin"></i>
              <div>
                <span>Cashback</span>
                <strong id="pvCashbackTotal">R$ 0,00</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="pedido-detalhe-section">
          <div class="pedido-detalhe-section-title" id="pvTipoTitulo">ENTREGA</div>
          <div class="pedido-detalhe-item" id="pvEnderecoWrap">
            <span>Endereco</span>
            <strong id="pvEndereco">-</strong>
          </div>
          <div class="pedido-detalhe-item" id="pvTaxaWrap">
            <span>Taxa de entrega</span>
            <strong id="pvTaxa">R$ 0,00</strong>
          </div>
        </div>

        <div class="pedido-detalhe-section">
          <div class="pedido-detalhe-section-title">
            <i class="bi bi-credit-card"></i> Pagamento
          </div>
          <div class="pedido-detalhe-pagamentos" id="pvPagamentos">-</div>
        </div>
        <div class="pedido-detalhe-section d-none" id="pvObsWrap">
          <div class="pedido-detalhe-section-title outro">
            <i class="bi bi-chat-left-text"></i> Observacoes do cliente
          </div>
          <div class="pedido-detalhe-item" id="pvObsTexto">-</div>
        </div>

        <div class="pedido-detalhe-section">
          <div class="pedido-detalhe-section-title outro">Resumo do pedido</div>
          <div class="pedido-detalhe-itens" id="pvItens"></div>
          <div class="pedido-detalhe-totais">
            <div class="pedido-detalhe-total-strong"><span>Subtotal</span><strong id="pvSubtotal">R$ 0,00</strong></div>
            <div id="pvLinhaDesconto"><span>Desconto</span><strong id="pvDesconto">R$ 0,00</strong></div>
            <div id="pvLinhaTaxa"><span>Taxa de entrega</span><strong id="pvTaxaResumo">R$ 0,00</strong></div>
            <div id="pvLinhaMaquininha"><span>Taxa maquininha</span><strong id="pvMaquininha">R$ 0,00</strong></div>
            <div id="pvLinhaCashback" class="pedido-detalhe-total-strong"><span>Cashback usado</span><strong id="pvCashback">R$ 0,00</strong></div>
            <div class="pedido-detalhe-total-strong"><span>Total</span><strong id="pvTotal">R$ 0,00</strong></div>
          </div>
        </div>
      </div>
      <div class="modal-footer pedido-detalhe-footer">
        <button class="btn btn-outline-danger" type="button" id="pvCancelarPedido">Cancelar pedido</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: Confirmar cancelamento do pedido -->
<div class="modal fade fiado-modal" id="modalPvCancelarConfirm" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered fiado-modal-sm">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Cancelar pedido</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <p style="font-size:.85rem;color:#374151;margin:0">
          O pedido <strong id="pvCancelarNumero">#-</strong> será marcado como <strong>cancelado</strong> e não poderá ser revertido.
        </p>
      </div>
      <div class="modal-footer" style="border-top:0">
        <button type="button" class="btn-fiado-ghost" data-bs-dismiss="modal">Voltar</button>
        <button type="button" class="btn btn-danger" id="pvCancelarConfirmar">Cancelar pedido</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
(function(){
  const tbody = document.getElementById('fiadoTbody');
  const infoEl = document.getElementById('fiadoInfo');
  const pagEl = document.getElementById('fiadoPagination');
  const buscaInput = document.getElementById('fiadoBusca');
  const limiteSelect = document.getElementById('fiadoLimite');
  const totalDebitosEl = document.getElementById('fiadoTotalDebitos');
  const totalClientesEl = document.getElementById('fiadoTotalClientes');

  let paginaAtual = 1;
  let buscaTimer = null;
  let clienteAtual = null;
  let histPaginaAtual = 1;

  const fmtM = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  };
  const formaLabel = (forma) => ({ dinheiro: 'Dinheiro', pix: 'Pix', credito: 'Crédito', debito: 'Débito', outro: 'Outros' }[forma] || (forma ? escapeHtml(forma) : 'Outros'));

  function formatarDataHora(iso){
    if (!iso) return '';
    const d = new Date(String(iso).replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function carregarLista(){
    const limite = limiteSelect.value;
    const busca = encodeURIComponent(buscaInput.value.trim());
    tbody.innerHTML = '<tr><td colspan="4" class="fiado-loading">Carregando...</td></tr>';
    fetch(`api/fiado_clientes.php?busca=${busca}&pagina=${paginaAtual}&limite=${limite}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) {
          tbody.innerHTML = '<tr><td colspan="4" class="fiado-empty">Erro ao carregar dados.</td></tr>';
          return;
        }
        totalDebitosEl.textContent = fmtM(d.total_debitos);
        totalClientesEl.textContent = d.total_clientes;
        paginaAtual = d.pagina;

        if (!d.clientes.length) {
          tbody.innerHTML = '<tr><td colspan="4" class="fiado-empty"><i class="bi bi-emoji-smile" style="font-size:1.6rem;display:block;margin-bottom:8px;opacity:.4"></i>Nenhum cliente com dívida ativa.</td></tr>';
          infoEl.textContent = '';
          pagEl.innerHTML = '';
          return;
        }

        tbody.innerHTML = d.clientes.map(c => `
          <tr>
            <td class="td-nome">${escapeHtml(c.nome || '-')}</td>
            <td>${escapeHtml(c.telefone || '-')}</td>
            <td class="td-valor">-${fmtM(c.saldo_fiado)}</td>
            <td><button type="button" class="fiado-btn-detalhe" data-cliente-id="${c.id}" data-cliente-nome="${escapeHtml(c.nome || '')}">Ver detalhes do cliente</button></td>
          </tr>
        `).join('');

        const inicio = (d.pagina - 1) * Number(limite) + 1;
        const fim = Math.min(d.total, d.pagina * Number(limite));
        infoEl.textContent = `Mostrando ${inicio} a ${fim} de ${d.total} clientes`;

        pagEl.innerHTML = `
          <button type="button" class="fiado-page-btn" data-page="1" ${d.pagina <= 1 ? 'disabled' : ''}><i class="bi bi-chevron-double-left"></i></button>
          <button type="button" class="fiado-page-btn" data-page="${d.pagina - 1}" ${d.pagina <= 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>
          <span class="fiado-page-label">Página ${d.pagina} de ${d.paginas}</span>
          <button type="button" class="fiado-page-btn" data-page="${d.pagina + 1}" ${d.pagina >= d.paginas ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>
          <button type="button" class="fiado-page-btn" data-page="${d.paginas}" ${d.pagina >= d.paginas ? 'disabled' : ''}><i class="bi bi-chevron-double-right"></i></button>
        `;
      })
      .catch(() => {
        tbody.innerHTML = '<tr><td colspan="4" class="fiado-empty">Erro ao carregar dados.</td></tr>';
      });
  }

  buscaInput.addEventListener('input', () => {
    clearTimeout(buscaTimer);
    buscaTimer = setTimeout(() => { paginaAtual = 1; carregarLista(); }, 350);
  });
  limiteSelect.addEventListener('change', () => { paginaAtual = 1; carregarLista(); });
  pagEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    const page = parseInt(btn.dataset.page, 10);
    if (!Number.isNaN(page) && page > 0) {
      paginaAtual = page;
      carregarLista();
    }
  });

  // ── Modal: Dividas do cliente ──
  const modalDetalheEl = document.getElementById('modalFiadoDetalhe');
  const modalDetalhe = new bootstrap.Modal(modalDetalheEl);
  const detalheNome = document.getElementById('fiadoDetalheNome');
  const detalheSaldo = document.getElementById('fiadoDetalheSaldo');
  const lancTbody = document.getElementById('fiadoLancamentosTbody');
  const histPagEl = document.getElementById('fiadoHistPagination');

  function carregarDetalhe(clienteId, pagina){
    histPaginaAtual = pagina || 1;
    lancTbody.innerHTML = '<tr><td colspan="5" class="fiado-loading">Carregando...</td></tr>';
    fetch(`api/fiado_detalhe.php?cliente_id=${clienteId}&pagina=${histPaginaAtual}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) {
          lancTbody.innerHTML = `<tr><td colspan="5" class="fiado-empty">${escapeHtml(d.msg || 'Erro ao carregar.')}</td></tr>`;
          return;
        }
        clienteAtual = { id: d.cliente.id, nome: d.cliente.nome };
        detalheNome.textContent = `Dívidas - ${d.cliente.nome || 'Cliente'}`;
        detalheSaldo.textContent = fmtM(d.cliente.saldo_fiado);

        if (!d.lancamentos.length) {
          lancTbody.innerHTML = '<tr><td colspan="5" class="fiado-empty">Nenhum lançamento encontrado.</td></tr>';
          histPagEl.innerHTML = '';
          return;
        }

        lancTbody.innerHTML = d.lancamentos.map(l => {
          const ehPago = l.tipo === 'pagamento';
          const badge = ehPago ? '<span class="fiado-badge pago">Pago</span>' : '<span class="fiado-badge venda">Fiado</span>';
          const pagamentoTxt = ehPago ? `${fmtM(l.valor)} - ${formaLabel(l.forma_pagamento)}` : `-${fmtM(l.valor)}`;
          return `
            <tr>
              <td>${badge}</td>
              <td>${pagamentoTxt}</td>
              <td>${formatarDataHora(l.criado_em)}</td>
              <td>${escapeHtml(l.operador_nome || '-')}</td>
              <td><button type="button" class="fiado-btn-detalhe" data-lanc='${JSON.stringify(l).replace(/'/g, "&#39;")}'>Ver detalhes</button></td>
            </tr>
          `;
        }).join('');

        histPagEl.innerHTML = `
          <button type="button" class="fiado-hist-arrow" id="histPrev" ${d.pagina <= 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>
          <span class="fiado-hist-num">${d.pagina}</span>
          <button type="button" class="fiado-hist-arrow" id="histNext" ${d.pagina >= d.paginas ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>
        `;
        const prevBtn = document.getElementById('histPrev');
        const nextBtn = document.getElementById('histNext');
        if (prevBtn) prevBtn.addEventListener('click', () => carregarDetalhe(clienteId, histPaginaAtual - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => carregarDetalhe(clienteId, histPaginaAtual + 1));
      })
      .catch(() => {
        lancTbody.innerHTML = '<tr><td colspan="5" class="fiado-empty">Erro ao carregar.</td></tr>';
      });
  }

  function abrirDividas(clienteId){
    carregarDetalhe(clienteId, 1);
    modalDetalhe.show();
  }

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cliente-id]');
    if (!btn) return;
    abrirDividas(btn.dataset.clienteId);
  });

  lancTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lanc]');
    if (!btn) return;
    const l = JSON.parse(btn.dataset.lanc.replace(/&#39;/g, "'"));

    if (l.pedido_id) {
      abrirModalPedidoVisualizar(l.pedido_id);
      return;
    }

    const ehPago = l.tipo === 'pagamento';
    const body = document.getElementById('fiadoLancDetalheBody');
    body.innerHTML = `
      <div class="fiado-input-box"><label>Tipo</label><div>${ehPago ? 'Pagamento' : 'Fiado'}</div></div>
      <div class="fiado-input-box"><label>Valor</label><div>${fmtM(l.valor)}</div></div>
      ${ehPago ? `<div class="fiado-input-box"><label>Forma de pagamento</label><div>${formaLabel(l.forma_pagamento)}</div></div>` : ''}
      <div class="fiado-input-box"><label>Data</label><div>${formatarDataHora(l.criado_em)}</div></div>
      <div class="fiado-input-box"><label>Registrado por</label><div>${escapeHtml(l.operador_nome || '-')}</div></div>
      ${l.observacao ? `<div class="fiado-input-box"><label>Observação</label><div>${escapeHtml(l.observacao)}</div></div>` : ''}
    `;
    new bootstrap.Modal(document.getElementById('modalFiadoLancDetalhe')).show();
  });

  // ── Modal: Registrar fiado (valor simples) ──
  const modalValorEl = document.getElementById('modalFiadoValorSimples');
  const modalValor = new bootstrap.Modal(modalValorEl);
  const valorSimplesInput = document.getElementById('fiadoValorSimplesInput');
  const valorSimplesErro = document.getElementById('fiadoValorSimplesErro');

  document.getElementById('btnAbrirRegistrarFiadoValor').addEventListener('click', () => {
    valorSimplesInput.value = '';
    valorSimplesErro.textContent = '';
    modalValor.show();
  });

  document.getElementById('btnSalvarFiadoValorSimples').addEventListener('click', () => {
    valorSimplesErro.textContent = '';
    const valor = parseFloat(valorSimplesInput.value || '0');
    if (!valor || valor <= 0) {
      valorSimplesErro.textContent = 'Informe um valor válido.';
      return;
    }
    fetch('api/fiado_registrar.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: clienteAtual.id, valor })
    })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) {
          valorSimplesErro.textContent = d.msg || 'Erro ao registrar fiado.';
          return;
        }
        modalValor.hide();
        carregarDetalhe(clienteAtual.id, histPaginaAtual);
        carregarLista();
      })
      .catch(() => { valorSimplesErro.textContent = 'Erro ao registrar fiado.'; });
  });

  // ── Modal: Registrar pagamento (valor simples) ──
  const modalPagSimplesEl = document.getElementById('modalFiadoPagamentoSimples');
  const modalPagSimples = new bootstrap.Modal(modalPagSimplesEl);
  const pagSimplesValor = document.getElementById('fiadoPagamentoSimplesValor');
  const pagSimplesFormaGrid = document.getElementById('fiadoPagamentoSimplesFormaGrid');
  const pagSimplesFormaCards = Array.from(pagSimplesFormaGrid.querySelectorAll('.fiado-pay-method-card'));
  const pagSimplesErro = document.getElementById('fiadoPagamentoSimplesErro');
  let pagSimplesFormaSelecionada = '';

  document.getElementById('btnAbrirRegistrarPagamento').addEventListener('click', () => {
    pagSimplesValor.value = '';
    pagSimplesFormaSelecionada = '';
    pagSimplesFormaCards.forEach(c => c.classList.remove('active'));
    pagSimplesErro.textContent = '';
    modalPagSimples.show();
  });

  pagSimplesFormaGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.fiado-pay-method-card');
    if (!card) return;
    pagSimplesFormaSelecionada = card.dataset.forma;
    pagSimplesFormaCards.forEach(c => c.classList.toggle('active', c === card));
  });

  document.getElementById('btnSalvarFiadoPagamentoSimples').addEventListener('click', () => {
    pagSimplesErro.textContent = '';
    const valor = parseFloat(pagSimplesValor.value || '0');
    if (!valor || valor <= 0) {
      pagSimplesErro.textContent = 'Informe um valor válido.';
      return;
    }
    if (!pagSimplesFormaSelecionada) {
      pagSimplesErro.textContent = 'Selecione o método de pagamento.';
      return;
    }
    fetch('api/fiado_pagamento.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: clienteAtual.id, valor, forma_pagamento: pagSimplesFormaSelecionada })
    })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) {
          pagSimplesErro.textContent = d.msg || 'Erro ao registrar pagamento.';
          return;
        }
        modalPagSimples.hide();
        carregarDetalhe(clienteAtual.id, histPaginaAtual);
        carregarLista();
      })
      .catch(() => { pagSimplesErro.textContent = 'Erro ao registrar pagamento.'; });
  });

  // ── Modal: Selecionar cliente (botao "Registrar fiado" do topo) ──
  const modalSelecionarEl = document.getElementById('modalFiadoSelecionarCliente');
  const modalSelecionar = new bootstrap.Modal(modalSelecionarEl);
  const selectClienteInput = document.getElementById('fiadoSelectClienteInput');
  const selectClienteResultado = document.getElementById('fiadoSelectClienteResultado');
  const novoClienteTelefone = document.getElementById('fiadoNovoClienteTelefone');
  const novoClienteNome = document.getElementById('fiadoNovoClienteNome');
  const selecionarErro = document.getElementById('fiadoSelecionarErro');
  let buscaClienteTimer = null;

  document.getElementById('btnRegistrarFiado').addEventListener('click', () => {
    selectClienteInput.value = '';
    novoClienteTelefone.value = '';
    novoClienteNome.value = '';
    selecionarErro.textContent = '';
    selectClienteResultado.classList.remove('show');
    modalSelecionar.show();
  });

  function buscarClientesSelect(){
    const termo = selectClienteInput.value.trim();
    fetch(`api/fiado_clientes_busca.php?busca=${encodeURIComponent(termo)}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok || !d.clientes.length) {
          selectClienteResultado.innerHTML = '<div class="fiado-search-result-item text-muted">Nenhum cliente encontrado.</div>';
          selectClienteResultado.classList.add('show');
          return;
        }
        selectClienteResultado.innerHTML = d.clientes.map(c => `
          <div class="fiado-search-result-item" data-id="${c.id}">
            ${escapeHtml(c.nome)} <span class="text-muted">${escapeHtml(c.telefone || '')}</span>
          </div>
        `).join('');
        selectClienteResultado.classList.add('show');
      })
      .catch(() => {});
  }

  selectClienteInput.addEventListener('focus', buscarClientesSelect);
  selectClienteInput.addEventListener('input', () => {
    clearTimeout(buscaClienteTimer);
    buscaClienteTimer = setTimeout(buscarClientesSelect, 300);
  });

  selectClienteResultado.addEventListener('click', (e) => {
    const item = e.target.closest('[data-id]');
    if (!item) return;
    modalSelecionar.hide();
    abrirDividas(item.dataset.id);
  });

  document.getElementById('btnAdicionarClienteFiado').addEventListener('click', () => {
    selecionarErro.textContent = '';
    const telefone = novoClienteTelefone.value.trim();
    const nome = novoClienteNome.value.trim();
    if (!telefone || !nome) {
      selecionarErro.textContent = 'Informe o número de contato e o nome do cliente.';
      return;
    }
    fetch('api/cliente_salvar.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, nome })
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.id) {
          modalSelecionar.hide();
          abrirDividas(d.id);
          return;
        }
        if (!d.ok && d.cliente_id) {
          modalSelecionar.hide();
          abrirDividas(d.cliente_id);
          return;
        }
        selecionarErro.textContent = d.msg || 'Erro ao adicionar cliente.';
      })
      .catch(() => { selecionarErro.textContent = 'Erro ao adicionar cliente.'; });
  });

  // ── Modal: Visualizar pedido (mesmo layout do gestor_pedidos.php) ──
  const modalPedidoVisualizarEl = document.getElementById('modalPedidoVisualizar');
  const modalPedidoVisualizar = new bootstrap.Modal(modalPedidoVisualizarEl);
  const modalPvCancelarConfirm = new bootstrap.Modal(document.getElementById('modalPvCancelarConfirm'));
  const pvCancelarPedidoBtn = document.getElementById('pvCancelarPedido');
  let pvPedidoAtualId = null;

  const normalizarData = (valor) => {
    if (!valor) return '';
    return valor.includes(' ') ? valor.replace(' ', 'T') : valor;
  };

  const formatarDataHoraPv = (valor) => {
    if (!valor) return '-';
    const data = new Date(normalizarData(valor));
    if (isNaN(data.getTime())) return valor;
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  };

  const tempoDescPv = (dataStr) => {
    if (!dataStr) return '-';
    const data = new Date(normalizarData(dataStr));
    if (isNaN(data.getTime())) return '-';
    const diffMs = Date.now() - data.getTime();
    const minutos = Math.max(1, Math.floor(diffMs / 60000));
    if (minutos < 60) return `feito há ${minutos} minutos`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `feito há ${horas} horas`;
    const dias = Math.floor(horas / 24);
    return `feito há ${dias} dias`;
  };

  const mapStatusPv = (status) => {
    const valor = (status || '').toLowerCase();
    const mapa = { pendente: 'PENDENTE', aceito: 'ACEITO', preparando: 'EM PREPARO', entrega: 'SAIU PARA ENTREGA', finalizado: 'FINALIZADO', cancelado: 'CANCELADO' };
    return mapa[valor] || (status ? status.toUpperCase() : '-');
  };

  const iconeTipoPv = (tipo) => {
    const valor = (tipo || '').toLowerCase();
    if (valor === 'entrega') return 'bi-truck';
    if (valor === 'retirada') return 'bi-bag';
    return 'bi-shop';
  };

  const origemTextoPv = (origem) => {
    const valor = (origem || '').toString().toLowerCase();
    const mapa = {
      pdv: 'Pedido feito pelo balcão', balcao: 'Pedido feito pelo balcão',
      loja: 'Pedido feito pela loja', online: 'Pedido feito pela loja', site: 'Pedido feito pela loja',
      lilly: 'Pedido feito pelo cardápio', ifood: 'Pedido feito pelo iFood',
      '99food': 'Pedido feito pelo 99Food', keeta: 'Pedido feito pelo Keeta'
    };
    return mapa[valor] || 'Pedido feito pelo balcão';
  };

  const agendamentoPedidoPv = (pedido) => {
    if (!pedido) return '';
    if (pedido.agendamento) return pedido.agendamento;
    if (pedido.agendamento_em) return pedido.agendamento_em;
    if (pedido.agendamento_data && pedido.agendamento_hora) return `${pedido.agendamento_data} ${pedido.agendamento_hora}`;
    const endereco = pedido.endereco_entrega || pedido.endereco || '';
    const match = endereco.match(/Agendamento:\s*([^|]+)/i);
    return match && match[1] ? match[1].trim() : '';
  };

  const limparEnderecoAgendamentoPv = (endereco) => {
    if (!endereco) return '';
    return endereco.replace(/\s*\|?\s*Agendamento:.*$/i, '').trim();
  };

  const formaPagamentoLabelPv = (forma) => {
    const valor = (forma || '').toLowerCase();
    if (valor === 'pix') return 'Pix';
    if (valor === 'dinheiro') return 'Dinheiro';
    if (valor === 'credito') return 'Cartão de crédito';
    if (valor === 'debito') return 'Cartão de débito';
    if (valor === 'fiado') return 'Fiado';
    if (valor === 'resgate') return 'Resgate';
    return forma || '-';
  };

  function preencherModalPedidoVisualizar(d){
    const pedido = d.pedido || {};
    const itens = d.itens || [];
    const pagamentos = d.pagamentos || [];
    const stats = d.cliente_stats || {};

    pvPedidoAtualId = pedido.id || null;

    document.getElementById('pvNumero').textContent = `Pedido N. ${pedido.codigo || pedido.id || '-'}`;
    document.getElementById('pvTempo').textContent = tempoDescPv(pedido.criado_em);
    document.getElementById('pvHorario').textContent = formatarDataHoraPv(pedido.criado_em);

    const statusEl = document.getElementById('pvStatus');
    const statusClasse = (pedido.status || '').toLowerCase();
    const dotCores = { pendente: '#f59e0b', aceito: '#3b82f6', preparando: '#f97316', entrega: '#8b5cf6', finalizado: '#16a34a', cancelado: '#dc2626' };
    statusEl.innerHTML = `<span style="width:9px;height:9px;border-radius:50%;background:${dotCores[statusClasse] || '#aaa'};display:inline-block;flex-shrink:0"></span> ${mapStatusPv(pedido.status)}`;
    statusEl.style.display = 'inline-flex';
    statusEl.style.alignItems = 'center';
    statusEl.style.gap = '6px';

    document.getElementById('pvCliente').textContent = pedido.nome || '-';
    document.getElementById('pvTelefone').textContent = pedido.telefone || '-';

    const feitos = Number(stats.pedidos_feitos || 0);
    const ticket = Number(stats.ticket_medio || 0);
    const pontos = stats.pontos !== undefined && stats.pontos !== null ? Number(stats.pontos) : 0;
    const cashbackSaldo = Number(stats.cashback_saldo ?? stats.cashback_total ?? 0);
    document.getElementById('pvPedidosFeitos').textContent = feitos || 0;
    document.getElementById('pvTicketMedio').textContent = fmtM(ticket || 0);
    document.getElementById('pvPontos').textContent = isNaN(pontos) ? '0' : pontos;
    document.getElementById('pvPontosMetric').style.display = pontos > 0 ? 'flex' : 'none';
    document.getElementById('pvCashbackTotal').textContent = fmtM(cashbackSaldo || 0);
    document.getElementById('pvCashbackMetric').style.display = cashbackSaldo > 0 ? 'flex' : 'none';

    const agendamentoWrap = document.getElementById('pvAgendamentoWrap');
    const agendamentoPedido = agendamentoPedidoPv(pedido);
    if (agendamentoPedido) {
      agendamentoWrap.classList.remove('d-none');
      const tipoAg = (pedido.tipo || 'retirada').toLowerCase();
      document.getElementById('pvAgendamentoTitulo').textContent = `${tipoAg.toUpperCase()} AGENDADA`;
      const origemTexto = origemTextoPv(pedido.origem);
      document.getElementById('pvAgendamentoOrigem').textContent = origemTexto ? `- ${origemTexto}` : '';
      document.getElementById('pvAgendamentoBox').textContent = `Agendado para: ${formatarDataHoraPv(agendamentoPedido)}`;
    } else {
      agendamentoWrap.classList.add('d-none');
    }

    const tipoRaw = (pedido.tipo || 'retirada').toLowerCase();
    const origemTexto = origemTextoPv(pedido.origem);
    const origemHtml = origemTexto ? `<span class="pedido-detalhe-origem">- ${origemTexto}</span>` : '';
    document.getElementById('pvTipoTitulo').innerHTML = `<i class="bi ${iconeTipoPv(tipoRaw)}"></i> ${tipoRaw.toUpperCase()}${origemHtml}`;

    const entrega = tipoRaw === 'entrega';
    document.getElementById('pvEnderecoWrap').style.display = entrega ? 'block' : 'none';
    document.getElementById('pvTaxaWrap').style.display = entrega ? 'block' : 'none';
    if (entrega) {
      document.getElementById('pvEndereco').textContent = limparEnderecoAgendamentoPv(pedido.endereco_entrega || '') || '-';
    }
    document.getElementById('pvTaxa').textContent = fmtM(pedido.taxa_entrega || 0);
    document.getElementById('pvTaxaResumo').textContent = fmtM(pedido.taxa_entrega || 0);

    document.getElementById('pvSubtotal').textContent = fmtM(pedido.subtotal || 0);
    document.getElementById('pvDesconto').textContent = fmtM(pedido.desconto || 0);
    document.getElementById('pvMaquininha').textContent = fmtM(pedido.taxa_maquininha || 0);

    let cashbackUsado = Number(pedido.cashback_usado || 0);
    if (cashbackUsado <= 0) {
      const calculado = Number(pedido.subtotal || 0) + Number(pedido.taxa_entrega || 0) - Number(pedido.desconto || 0) + Number(pedido.taxa_maquininha || 0) - Number(pedido.total || 0);
      if (calculado > 0.0001) cashbackUsado = calculado;
    }
    document.getElementById('pvCashback').textContent = fmtM(cashbackUsado);
    document.getElementById('pvTotal').textContent = fmtM(pedido.total || 0);

    document.getElementById('pvLinhaDesconto').style.display = Number(pedido.desconto || 0) > 0 ? 'flex' : 'none';
    document.getElementById('pvLinhaTaxa').style.display = Number(pedido.taxa_entrega || 0) > 0 ? 'flex' : 'none';
    document.getElementById('pvLinhaMaquininha').style.display = Number(pedido.taxa_maquininha || 0) > 0 ? 'flex' : 'none';
    document.getElementById('pvLinhaCashback').style.display = cashbackUsado > 0 ? 'flex' : 'none';

    const pagamentosEl = document.getElementById('pvPagamentos');
    if (pagamentos.length) {
      pagamentosEl.innerHTML = `<div style="background:#f9fafb;border-radius:10px;padding:10px 12px">${pagamentos.map(p => `
        <div style="display:flex;justify-content:space-between;font-size:.84rem;color:#374151;margin-bottom:2px">
          <span>${formaPagamentoLabelPv(p.forma)}</span><span>${fmtM(p.valor)}</span>
        </div>
      `).join('')}</div>`;
    } else {
      pagamentosEl.innerHTML = `${formaPagamentoLabelPv(pedido.forma_pagamento)} ${fmtM(pedido.total || 0)}`;
    }

    const obsWrap = document.getElementById('pvObsWrap');
    const obsCliente = (pedido.observacoes_cliente || '').trim();
    if (obsCliente) {
      obsWrap.classList.remove('d-none');
      document.getElementById('pvObsTexto').textContent = obsCliente;
    } else {
      obsWrap.classList.add('d-none');
    }

    const itensEl = document.getElementById('pvItens');
    if (!itens.length) {
      itensEl.innerHTML = '<div class="pedido-detalhe-item-row">Sem itens.</div>';
    } else {
      itensEl.innerHTML = itens.map(i => {
        const totalItem = Number(i.preco || 0) * Number(i.quantidade || 0);
        const obs = (i.observacoes || '').trim();
        const obsHtml = obs ? `<div style="font-size:.75rem;color:#6b7280;margin-top:4px"><strong>Obs:</strong> ${escapeHtml(obs)}</div>` : '';
        return `
          <div class="pedido-detalhe-item-row">
            <span>${i.quantidade}x ${escapeHtml(i.produto_nome || '')}${obsHtml}</span>
            <strong>${fmtM(totalItem)}</strong>
          </div>
        `;
      }).join('');
    }

    const digits = (pedido.telefone || '').replace(/\D/g, '');
    document.getElementById('pvContato').href = digits ? `tel:${digits}` : '#';
    const whatsapp = digits ? (digits.length <= 11 ? `55${digits}` : digits) : '';
    document.getElementById('pvWhatsapp').href = whatsapp ? `https://wa.me/${whatsapp}` : '#';
  }

  function abrirModalPedidoVisualizar(pedidoId){
    document.getElementById('pvItens').innerHTML = '<div class="pedido-detalhe-item-row">Carregando pedido...</div>';
    modalPedidoVisualizar.show();
    fetch(`api/pedido_detalhe.php?pedido_id=${pedidoId}`)
      .then(r => r.json())
      .then(d => {
        if (!d || !d.ok) return;
        preencherModalPedidoVisualizar(d);
      })
      .catch(() => {});
  }

  if (pvCancelarPedidoBtn) {
    pvCancelarPedidoBtn.addEventListener('click', () => {
      if (!pvPedidoAtualId) return;
      document.getElementById('pvCancelarNumero').textContent = '#' + pvPedidoAtualId;
      modalPvCancelarConfirm.show();
    });
  }

  document.getElementById('pvCancelarConfirmar').addEventListener('click', () => {
    if (!pvPedidoAtualId) return;
    fetch('api/pedidos_cancelar.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id: pvPedidoAtualId })
    })
      .then(r => r.json())
      .then(d => {
        modalPvCancelarConfirm.hide();
        if (d && d.ok) {
          abrirModalPedidoVisualizar(pvPedidoAtualId);
        }
      })
      .catch(() => { modalPvCancelarConfirm.hide(); });
  });

  carregarLista();
})();
</script>
</body>
</html>
