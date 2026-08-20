<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.financeiro');
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/financial_module.php';
require_once __DIR__ . '/helpers/financial_views.php';
require_once __DIR__ . '/../controllers/FinancialAccountController.php';

financialEnsureModule($conn);
$tenantId = financialTenantId();
$lojaNome = config($conn, 'nome_loja', 'Will Delivery');
$_SESSION['loja_nome'] = $lojaNome;
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$finCssVer = filemtime(__DIR__ . '/assets/css/financial_module.css');
$finJsVer = filemtime(__DIR__ . '/assets/js/financial_module.js');
$flash = financialFlashGet();
$controller = new FinancialAccountController();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  try {
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'save') {
      $id = (int) ($_POST['id'] ?? 0);
      if ($id > 0) {
        $controller->update($conn, $tenantId, $id, $_POST);
        financialFlashSet(true, 'Conta atualizada com sucesso.');
      } else {
        $controller->store($conn, $tenantId, $_POST);
        financialFlashSet(true, 'Conta criada com sucesso.');
      }
    } elseif ($action === 'delete') {
      $controller->destroy($conn, $tenantId, (int) ($_POST['id'] ?? 0));
      financialFlashSet(true, 'Conta removida com sucesso.');
    }
  } catch (Throwable $e) {
    financialFlashSet(false, $e->getMessage());
  }
  financialRedirect('financeiro_contas.php');
}

$editing = null;
if (!empty($_GET['edit'])) {
  $editing = $controller->show($conn, $tenantId, (int) $_GET['edit']);
}
$accounts = $controller->index($conn, $tenantId, ['active' => 0]);
$accountsTableHtml = financialRenderAccountsTable($accounts, $conn, $tenantId);
$financeiroContasJsVer = filemtime(__DIR__ . '/assets/js/financeiro_contas.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Financeiro - Contas</title>
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
    <div><h1 class="fin-title">Contas financeiras</h1><div class="fin-subtitle">Controle as contas de banco, caixa e carteiras da operacao.</div></div>
    <div class="fin-actions">
      <button class="fin-btn fin-btn-primary fin-btn-sm" type="button" id="financial-open-account-modal"><i class="bi bi-plus-circle"></i> Nova conta</button>
    </div>
  </div>
  <div class="fin-card">
    <div class="fin-card-head"><div><h2 class="fin-card-title">Contas cadastradas</h2><div class="fin-card-subtitle">Saldos e status atuais do modulo financeiro.</div></div></div>
    <div class="fin-card-body">
      <div id="financial-account-table"><?= $accountsTableHtml ?></div>
    </div>
  </div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>

<div class="modal fade" id="financialAccountModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:560px;">
    <div class="modal-content fin-card fin-transaction-modal" style="border-radius:22px;overflow:hidden;">
      <div class="fin-card-head" style="padding-bottom:10px;">
        <div>
          <h2 class="fin-card-title" id="financial-account-modal-title"><?= $editing ? 'Editar conta' : 'Nova conta' ?></h2>
          <div class="fin-card-subtitle">Cadastre a conta financeira da operacao.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="fin-card-body pt-0">
        <form method="post" class="fin-grid" id="financial-account-form">
          <input type="hidden" name="action" value="save">
          <input type="hidden" name="id" id="financial-account-id" value="<?= (int) ($editing['id'] ?? 0) ?>">
          <div class="field"><label>Nome da conta</label><input class="fin-input" id="financial-account-name" type="text" name="name" value="<?= htmlspecialchars((string) ($editing['name'] ?? '')) ?>" required></div>
          <div class="fin-mini-grid">
            <div class="field"><label>Saldo inicial</label><input class="fin-input js-fin-money-mask" id="financial-account-initial" type="text" inputmode="decimal" name="initial_balance" value="<?= htmlspecialchars(number_format((float) ($editing['initial_balance'] ?? 0), 2, ',', '.')) ?>" required></div>
            <div class="field"><label>Saldo atual</label><input class="fin-input js-fin-money-mask" id="financial-account-current" type="text" inputmode="decimal" name="current_balance" value="<?= htmlspecialchars(number_format((float) ($editing['current_balance'] ?? ($editing['initial_balance'] ?? 0)), 2, ',', '.')) ?>" required></div>
          </div>
          <div class="field"><label>Status</label><select class="fin-select" id="financial-account-active" name="active"><option value="1" <?= (!isset($editing['active']) || (int) $editing['active'] === 1) ? 'selected' : '' ?>>Ativa</option><option value="0" <?= (isset($editing['active']) && (int) $editing['active'] === 0) ? 'selected' : '' ?>>Inativa</option></select></div>
          <div class="fin-modal-actions">
            <button class="fin-btn fin-btn-secondary fin-btn-sm d-none" id="financial-account-cancel" type="button">Cancelar</button>
            <button class="fin-btn fin-btn-primary fin-btn-sm" id="financial-account-submit" type="submit"><?= $editing ? 'Salvar alteracoes' : 'Cadastrar conta' ?></button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="financialAccountDeleteModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:420px;">
    <div class="modal-content fin-card" style="border-radius:22px;overflow:hidden;">
      <div class="fin-card-head" style="padding-bottom:8px;">
        <div>
          <h2 class="fin-card-title">Excluir conta</h2>
          <div class="fin-card-subtitle">Confirme se deseja remover esta conta.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="fin-card-body pt-0">
        <div style="color:#5b6b84;font-size:.9rem;line-height:1.55;margin-bottom:14px;">
          Essa acao pode afetar o acompanhamento financeiro da operacao vinculada a esta conta.
        </div>
        <div class="fin-modal-actions">
          <button class="fin-btn fin-btn-secondary fin-btn-sm" type="button" data-bs-dismiss="modal">Cancelar</button>
          <button class="fin-btn fin-btn-primary fin-btn-sm" type="button" id="financial-account-delete-confirm">Excluir</button>
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
const FINCONTAS_DATA = <?= json_encode(['flash' => $flash, 'editing' => (bool) $editing], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
</script>
<script src="./assets/js/financeiro_contas.js?v=<?= $financeiroContasJsVer ?>"></script>
</body>
</html>
