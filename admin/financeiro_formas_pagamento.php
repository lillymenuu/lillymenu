<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.financeiro');
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/financial_module.php';
require_once __DIR__ . '/helpers/financial_views.php';
require_once __DIR__ . '/../controllers/PaymentMethodController.php';

financialEnsureModule($conn);
$tenantId = financialTenantId();
$lojaNome = config($conn, 'nome_loja', 'Will Delivery');
$_SESSION['loja_nome'] = $lojaNome;
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$finCssVer = filemtime(__DIR__ . '/assets/css/financial_module.css');
$finJsVer = filemtime(__DIR__ . '/assets/js/financial_module.js');
$flash = financialFlashGet();
$controller = new PaymentMethodController();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  try {
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'save') {
      $id = (int) ($_POST['id'] ?? 0);
      if ($id > 0) {
        $controller->update($conn, $tenantId, $id, $_POST);
        financialFlashSet(true, 'Forma de pagamento atualizada com sucesso.');
      } else {
        $controller->store($conn, $tenantId, $_POST);
        financialFlashSet(true, 'Forma de pagamento criada com sucesso.');
      }
    } elseif ($action === 'delete') {
      $controller->destroy($conn, $tenantId, (int) ($_POST['id'] ?? 0));
      financialFlashSet(true, 'Forma de pagamento removida com sucesso.');
    }
  } catch (Throwable $e) {
    financialFlashSet(false, $e->getMessage());
  }
  financialRedirect('financeiro_formas_pagamento.php');
}

$editing = null;
if (!empty($_GET['edit'])) {
  $editing = $controller->show($conn, $tenantId, (int) $_GET['edit']);
}
$items = $controller->index($conn, $tenantId, ['active' => 0]);
$methodsTableHtml = financialRenderPaymentMethodsTable($items);
$financeiroFormasPagamentoJsVer = filemtime(__DIR__ . '/assets/js/financeiro_formas_pagamento.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Financeiro - Formas de pagamento</title>
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
    <div><h1 class="fin-title">Formas de pagamento</h1><div class="fin-subtitle">Organize as entradas financeiras pelas formas recebidas na loja.</div></div>
    <div class="fin-actions">
      <button class="fin-btn fin-btn-primary fin-btn-sm" type="button" id="financial-open-method-modal"><i class="bi bi-plus-circle"></i> Nova forma</button>
    </div>
  </div>
  <div class="fin-card">
    <div class="fin-card-head"><div><h2 class="fin-card-title">Formas cadastradas</h2><div class="fin-card-subtitle">Utilizadas nos lancamentos e agrupamentos de receita.</div></div></div>
    <div class="fin-card-body">
      <div id="financial-method-table"><?= $methodsTableHtml ?></div>
    </div>
  </div>
</div>

<div class="modal fade" id="financialMethodModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:520px;">
    <div class="modal-content fin-card fin-transaction-modal" style="border-radius:22px;overflow:hidden;">
      <div class="fin-card-head" style="padding-bottom:10px;">
        <div>
          <h2 class="fin-card-title" id="financial-method-modal-title"><?= $editing ? 'Editar forma' : 'Nova forma' ?></h2>
          <div class="fin-card-subtitle">Cadastre as formas de pagamento do financeiro.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="fin-card-body pt-0">
        <form method="post" class="fin-grid" id="financial-method-form">
          <input type="hidden" name="action" value="save">
          <input type="hidden" name="id" id="financial-method-id" value="<?= (int) ($editing['id'] ?? 0) ?>">
          <div class="field"><label>Nome</label><input class="fin-input" type="text" id="financial-method-name" name="name" value="<?= htmlspecialchars((string) ($editing['name'] ?? '')) ?>" required></div>
          <div class="field"><label>Status</label><select class="fin-select" id="financial-method-active" name="active"><option value="1" <?= (!isset($editing['active']) || (int) $editing['active'] === 1) ? 'selected' : '' ?>>Ativa</option><option value="0" <?= (isset($editing['active']) && (int) $editing['active'] === 0) ? 'selected' : '' ?>>Inativa</option></select></div>
          <div class="fin-modal-actions">
            <button class="fin-btn fin-btn-secondary fin-btn-sm d-none" id="financial-method-cancel" type="button">Cancelar</button>
            <button class="fin-btn fin-btn-primary fin-btn-sm" id="financial-method-submit" type="submit"><?= $editing ? 'Salvar alteracoes' : 'Cadastrar forma' ?></button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="financialMethodDeleteModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:420px;">
    <div class="modal-content fin-card" style="border-radius:22px;overflow:hidden;">
      <div class="fin-card-head" style="padding-bottom:8px;">
        <div>
          <h2 class="fin-card-title">Excluir forma de pagamento</h2>
          <div class="fin-card-subtitle">Confirme se deseja remover esta forma.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="fin-card-body pt-0">
        <div style="color:#5b6b84;font-size:.9rem;line-height:1.55;margin-bottom:14px;">
          Essa acao pode afetar os lancamentos e agrupamentos financeiros vinculados a esta forma de pagamento.
        </div>
        <div class="fin-modal-actions">
          <button class="fin-btn fin-btn-secondary fin-btn-sm" type="button" data-bs-dismiss="modal">Cancelar</button>
          <button class="fin-btn fin-btn-primary fin-btn-sm" type="button" id="financial-method-delete-confirm">Excluir</button>
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
const FINPAG_DATA = <?= json_encode(['flash' => $flash, 'editing' => (bool) $editing], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
</script>
<script src="./assets/js/financeiro_formas_pagamento.js?v=<?= $financeiroFormasPagamentoJsVer ?>"></script>
</body>
</html>
