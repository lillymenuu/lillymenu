<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.financeiro');
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/financial_module.php';
require_once __DIR__ . '/helpers/financial_views.php';
require_once __DIR__ . '/../controllers/FinancialTransactionController.php';
require_once __DIR__ . '/../controllers/FinancialCategoryController.php';
require_once __DIR__ . '/../controllers/FinancialAccountController.php';
require_once __DIR__ . '/../controllers/PaymentMethodController.php';

financialEnsureModule($conn);
$tenantId = financialTenantId();
$lojaNome = config($conn, 'nome_loja', 'Will Delivery');
$_SESSION['loja_nome'] = $lojaNome;
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$finCssVer = filemtime(__DIR__ . '/assets/css/financial_module.css');
$finJsVer = filemtime(__DIR__ . '/assets/js/financial_module.js');
$flash = financialFlashGet();
$financeiroLancamentosJsVer = filemtime(__DIR__ . '/assets/js/financeiro_lancamentos.js');

$transactionController = new FinancialTransactionController();
$categoryController = new FinancialCategoryController();
$accountController = new FinancialAccountController();
$methodController = new PaymentMethodController();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  try {
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'save') {
      $id = (int) ($_POST['id'] ?? 0);
      if ($id > 0) {
        $transactionController->update($conn, $tenantId, $id, $_POST);
        financialFlashSet(true, 'Lançamento atualizado com sucesso.');
      } else {
        $transactionController->store($conn, $tenantId, $_POST);
        financialFlashSet(true, 'Lançamento criado com sucesso.');
      }
    } elseif ($action === 'delete') {
      $transactionController->destroy($conn, $tenantId, (int) ($_POST['id'] ?? 0));
    }
  } catch (Throwable $e) {
    financialFlashSet(false, $e->getMessage());
  }
  financialRedirect('financeiro_lancamentos.php');
}

$mes = (int) ($_GET['mes'] ?? financialCurrentMonth());
$ano = (int) ($_GET['ano'] ?? financialCurrentYear());
$tipo = trim((string) ($_GET['tipo'] ?? ''));
$categoriaId = (int) ($_GET['categoria_id'] ?? 0);
$contaId = (int) ($_GET['conta_id'] ?? 0);
financialSyncCurrentMonthSalesIfNeeded($conn, $tenantId, $mes, $ano);

$filters = array_filter([
  'reference_month' => $mes,
  'reference_year' => $ano,
  'type' => $tipo ?: null,
  'category_id' => $categoriaId ?: null,
  'account_id' => $contaId ?: null,
], static function ($value) {
  return $value !== null && $value !== '';
});

$editing = null;
if (!empty($_GET['edit'])) {
  $editing = $transactionController->show($conn, $tenantId, (int) $_GET['edit']);
}
$categories = $categoryController->index($conn, $tenantId, ['active' => 1]);
$accounts = $accountController->index($conn, $tenantId, ['active' => 1]);
$methods = $methodController->index($conn, $tenantId, ['active' => 1]);
$transactions = $transactionController->index($conn, $tenantId, $filters);
$anos = financialYearOptions($conn, $tenantId);
if (!in_array($ano, $anos, true)) {
  $anos[] = $ano;
  rsort($anos);
}
$transactionsTableHtml = financialRenderTransactionsTable($conn, $tenantId, $transactions, [
  'mes' => $mes,
  'ano' => $ano,
  'tipo' => $tipo,
  'categoria_id' => $categoriaId,
  'conta_id' => $contaId,
]);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Financeiro - Lançamentos</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
  <link href="./assets/css/financial_module.css?v=<?= $finCssVer ?>" rel="stylesheet">
  <link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
</head>
<body class="dash-diggy fin-body">
<?php include __DIR__ . '/partials/sidebar.php'; ?>
<div class="fin-page">
  <div id="fin-toast-host" class="fin-toast-host"></div>
  <div class="fin-header">
    <div><h1 class="fin-title">Lançamentos</h1><div class="fin-subtitle">Registre entradas e saidas com filtros por competencia, conta e categoria.</div></div>
    <div class="fin-actions" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button class="fin-btn" type="button" id="btnSyncPedidos"
              style="background:#fff;border:1.5px solid #e5e7eb;color:#374151;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px"
              title="Sincroniza todos os pedidos finalizados sem lançamento financeiro">
        <i class="bi bi-arrow-repeat"></i> Sincronizar pedidos
      </button>
      <button class="fin-btn fin-btn-primary" type="button" id="financial-open-transaction-modal">
        <i class="bi bi-plus-circle"></i> Novo lançamento
      </button>
    </div>
  </div>
  <div class="fin-card">
    <div class="fin-card-head">
      <div><h2 class="fin-card-title">Tabela de lançamentos</h2><div class="fin-card-subtitle">Filtros por competencia, tipo, categoria e conta.</div></div>
    </div>
    <div class="fin-card-body">
      <form method="get" class="fin-filters" id="financial-transaction-filter-form" style="margin-bottom:18px;">
        <div class="field"><label>Mes</label><select class="fin-select" name="mes" id="financial-filter-month"><?php for ($m=1;$m<=12;$m++): ?><option value="<?= $m ?>" <?= $m===$mes?'selected':'' ?>><?= financialMonthLabel($m) ?></option><?php endfor; ?></select></div>
        <div class="field"><label>Ano</label><select class="fin-select" name="ano" id="financial-filter-year"><?php foreach ($anos as $itemAno): ?><option value="<?= (int) $itemAno ?>" <?= (int) $itemAno===$ano?'selected':'' ?>><?= (int) $itemAno ?></option><?php endforeach; ?></select></div>
        <div class="field"><label>Tipo</label><select class="fin-select" name="tipo" id="financial-filter-type"><option value="">Todos</option><option value="income" <?= $tipo==='income'?'selected':'' ?>>Receita</option><option value="expense" <?= $tipo==='expense'?'selected':'' ?>>Despesa</option></select></div>
        <div class="field"><label>Categoria</label><select class="fin-select" name="categoria_id" id="financial-filter-category"><option value="0">Todas</option><?php foreach ($categories as $cat): ?><option value="<?= (int) $cat['id'] ?>" <?= $categoriaId===(int)$cat['id']?'selected':'' ?>><?= htmlspecialchars((string)$cat['name']) ?></option><?php endforeach; ?></select></div>
        <div class="field"><label>Conta</label><select class="fin-select" name="conta_id" id="financial-filter-account"><option value="0">Todas</option><?php foreach ($accounts as $acc): ?><option value="<?= (int) $acc['id'] ?>" <?= $contaId===(int)$acc['id']?'selected':'' ?>><?= htmlspecialchars((string)$acc['name']) ?></option><?php endforeach; ?></select></div>
      </form>
      <div id="financial-transaction-table"><?= $transactionsTableHtml ?></div>
    </div>
  </div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>

<div class="modal fade" id="financialTransactionModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered fin-transaction-modal-dialog">
    <div class="modal-content fin-card fin-transaction-modal">
      <div class="fin-card-head" style="padding-bottom:16px;">
        <div>
          <h2 class="fin-card-title" id="financial-transaction-modal-title"><?= $editing ? 'Editar lançamento' : 'Novo lancamento' ?></h2>
          <div class="fin-card-subtitle">Preencha os dados do lançamento financeiro.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="fin-card-body pt-0">
        <form method="post" class="fin-grid" id="financial-transaction-form">
          <input type="hidden" name="action" value="save">
          <input type="hidden" name="id" id="financial-transaction-id" value="<?= (int) ($editing['id'] ?? 0) ?>">
          <div class="fin-mini-grid">
            <div class="field">
              <label>Tipo</label>
              <select class="fin-select" id="financial-transaction-type" name="type" required>
                <option value="income" <?= (($editing['type'] ?? '') === 'income') ? 'selected' : '' ?>>Receita</option>
                <option value="expense" <?= (($editing['type'] ?? '') === 'expense') ? 'selected' : '' ?>>Despesa</option>
              </select>
            </div>
            <div class="field"><label>Data</label><input class="fin-input" id="financial-transaction-date" type="date" name="transaction_date" value="<?= htmlspecialchars((string) ($editing['transaction_date'] ?? financialToday())) ?>" required></div>
          </div>
          <div class="field"><label>Descricao</label><input class="fin-input" id="financial-transaction-description" type="text" name="description" value="<?= htmlspecialchars((string) ($editing['description'] ?? '')) ?>" required></div>
          <div class="fin-mini-grid">
            <div class="field"><label>Valor</label><input class="fin-input js-fin-money-mask" id="financial-transaction-amount" type="text" inputmode="decimal" name="amount" value="<?= htmlspecialchars(isset($editing['amount']) ? number_format((float) $editing['amount'], 2, ',', '.') : '') ?>" required></div>
            <div class="field"><label>Conta</label><select class="fin-select" id="financial-transaction-account" name="account_id" required><option value="">Selecione</option><?php foreach ($accounts as $acc): ?><option value="<?= (int) $acc['id'] ?>" <?= ((int) ($editing['account_id'] ?? 0) === (int) $acc['id']) ? 'selected' : '' ?>><?= htmlspecialchars((string) $acc['name']) ?></option><?php endforeach; ?></select></div>
          </div>
          <div class="fin-mini-grid">
            <div class="field"><label>Categoria</label><select class="fin-select" id="financial-transaction-category" name="category_id" required><option value="">Selecione</option><?php foreach ($categories as $cat): ?><option value="<?= (int) $cat['id'] ?>" data-type="<?= htmlspecialchars((string) $cat['type']) ?>" <?= ((int) ($editing['category_id'] ?? 0) === (int) $cat['id']) ? 'selected' : '' ?>><?= htmlspecialchars((string) $cat['name']) ?> (<?= $cat['type'] === 'income' ? 'Receita' : 'Despesa' ?>)</option><?php endforeach; ?></select></div>
            <div class="field"><label>Forma de pagamento</label><select class="fin-select" id="financial-transaction-method" name="payment_method_id"><option value="">Nao informar</option><?php foreach ($methods as $pm): ?><option value="<?= (int) $pm['id'] ?>" <?= ((int) ($editing['payment_method_id'] ?? 0) === (int) $pm['id']) ? 'selected' : '' ?>><?= htmlspecialchars((string) $pm['name']) ?></option><?php endforeach; ?></select></div>
          </div>
          <div class="fin-mini-grid">
            <div class="field"><label>Mes de referencia</label><select class="fin-select" id="financial-transaction-ref-month" name="reference_month"><?php for ($m = 1; $m <= 12; $m++): ?><option value="<?= $m ?>" <?= ((int) ($editing['reference_month'] ?? financialCurrentMonth()) === $m) ? 'selected' : '' ?>><?= financialMonthLabel($m) ?></option><?php endfor; ?></select></div>
            <div class="field"><label>Ano de referencia</label><select class="fin-select" id="financial-transaction-ref-year" name="reference_year"><?php foreach ($anos as $itemAno): ?><option value="<?= (int) $itemAno ?>" <?= ((int) ($editing['reference_year'] ?? financialCurrentYear()) === (int) $itemAno) ? 'selected' : '' ?>><?= (int) $itemAno ?></option><?php endforeach; ?></select></div>
          </div>
          <div class="field"><label>Observacoes</label><textarea class="fin-textarea" id="financial-transaction-notes" name="notes"><?= htmlspecialchars((string) ($editing['notes'] ?? '')) ?></textarea></div>
          <div class="fin-modal-actions">
            <button class="fin-btn fin-btn-secondary fin-btn-sm" id="financial-transaction-cancel" type="button" data-bs-dismiss="modal">Cancelar</button>
            <button class="fin-btn fin-btn-primary fin-btn-sm" id="financial-transaction-submit" type="submit"><?= $editing ? 'Salvar alterações' : 'Salvar lançamento' ?></button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="financialDeleteModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:420px;">
    <div class="modal-content fin-card" style="border-radius:22px; overflow:hidden;">
      <div class="fin-card-head" style="padding-bottom:8px;">
        <div>
          <h2 class="fin-card-title">Excluir lançamento</h2>
          <div class="fin-card-subtitle">Confirme se deseja remover este lançamento.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="fin-card-body pt-0">
        <div style="color:#5b6b84; font-size:.9rem; line-height:1.55; margin-bottom:14px;">
          Essa ação desfaz o impacto do lançamento no saldo da conta vinculada.
        </div>
        <div class="fin-modal-actions">
          <button class="fin-btn fin-btn-secondary fin-btn-sm" type="button" data-bs-dismiss="modal">Cancelar</button>
          <button class="fin-btn fin-btn-primary fin-btn-sm" type="button" id="financial-delete-confirm">Excluir</button>
        </div>
      </div>
    </div>
  </div>
</div>
</main>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/financial_module.js?v=<?= $finJsVer ?>"></script>
<script>
const FINLANC_DATA = <?= json_encode([
  'today' => financialToday(),
  'currentMonth' => financialCurrentMonth(),
  'currentYear' => financialCurrentYear(),
  'flash' => $flash,
  'editing' => (bool) $editing,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
</script>
<script src="./assets/js/financeiro_lancamentos.js?v=<?= $financeiroLancamentosJsVer ?>"></script>

<!-- Modal Confirmar Sincronização -->
<div class="modal fade" id="syncConfirmModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered" style="max-width:420px">
    <div class="modal-content" style="border-radius:18px;border:none;box-shadow:0 20px 60px rgba(0,0,0,.18)">
      <div style="padding:28px 28px 0;text-align:center">
        <div style="width:52px;height:52px;border-radius:50%;background:#fdf5ee;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
          <i class="bi bi-arrow-repeat" style="font-size:22px;color:#9C5523"></i>
        </div>
        <h5 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:8px">Sincronizar pedidos</h5>
        <p style="font-size:13px;color:#6b7280;line-height:1.6;margin-bottom:0">
          Todos os pedidos finalizados <strong>sem lançamento financeiro</strong> serão processados automaticamente,
          cobrindo <strong>todos os meses</strong> com pendências.
        </p>
      </div>
      <div style="display:flex;gap:10px;padding:24px 28px;justify-content:stretch">
        <button data-bs-dismiss="modal"
                style="flex:1;background:#fff;border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 0;font-size:13px;font-weight:600;color:#374151;cursor:pointer;font-family:inherit">
          Cancelar
        </button>
        <button id="syncExecutar"
                style="flex:1;background:#9C5523;border:none;border-radius:10px;padding:10px 0;font-size:13px;font-weight:700;color:#fff;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px">
          <i class="bi bi-arrow-repeat"></i> Sincronizar
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Modal Resultado Sincronização -->
<div class="modal fade" id="syncResultModal" tabindex="-1" data-bs-backdrop="static">
  <div class="modal-dialog modal-dialog-centered" style="max-width:420px">
    <div class="modal-content" style="border-radius:18px;border:none;box-shadow:0 20px 60px rgba(0,0,0,.18)">
      <div style="padding:28px 28px 0;text-align:center">
        <div style="width:52px;height:52px;border-radius:50%;background:#fdf5ee;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
          <i id="syncResultIcon" class="bi bi-check-circle-fill" style="font-size:22px;color:#9C5523"></i>
        </div>
        <h5 id="syncResultTitulo" style="font-size:16px;font-weight:700;color:#111827;margin-bottom:12px">Sincronização concluída!</h5>
        <p id="syncResultMsgErro" style="display:none;font-size:13px;color:#dc2626;margin-bottom:8px"></p>
        <div id="syncResultStats" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-align:left;margin-bottom:4px">
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px">
            <span style="color:#6b7280">Pedidos processados</span>
            <strong id="syncResOrders" style="color:#111827">0</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px">
            <span style="color:#6b7280">Lançamentos criados</span>
            <strong id="syncResCriados" style="color:#16a34a">0</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px">
            <span style="color:#6b7280">Lançamentos atualizados</span>
            <strong id="syncResAtuali" style="color:#2563eb">0</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;gap:12px">
            <span style="color:#6b7280;flex-shrink:0">Meses sincronizados</span>
            <strong id="syncResMeses" style="color:#111827;text-align:right;font-size:12px">—</strong>
          </div>
        </div>
      </div>
      <div style="padding:20px 28px 24px">
        <button data-bs-dismiss="modal"
                style="width:100%;background:#9C5523;border:none;border-radius:10px;padding:11px 0;font-size:13px;font-weight:700;color:#fff;cursor:pointer;font-family:inherit">
          Fechar e atualizar
        </button>
      </div>
    </div>
  </div>
</div>

<style>
@keyframes spin { to { transform: rotate(360deg); } }
.spin { display:inline-block; animation: spin .8s linear infinite; }
</style>
</body>
</html>
