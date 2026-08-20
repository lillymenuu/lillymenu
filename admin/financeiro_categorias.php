<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.financeiro');
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/financial_module.php';
require_once __DIR__ . '/helpers/financial_views.php';
require_once __DIR__ . '/../controllers/FinancialCategoryController.php';

financialEnsureModule($conn);
$tenantId = financialTenantId();
$lojaNome = config($conn, 'nome_loja', 'Will Delivery');
$_SESSION['loja_nome'] = $lojaNome;
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$finCssVer = filemtime(__DIR__ . '/assets/css/financial_module.css');
$finJsVer = filemtime(__DIR__ . '/assets/js/financial_module.js');
$financeiroCategoriasCssVer = filemtime(__DIR__ . '/assets/css/financeiro_categorias.css');
$financeiroCategoriasJsVer = filemtime(__DIR__ . '/assets/js/financeiro_categorias.js');
$flash = financialFlashGet();
$controller = new FinancialCategoryController();
$parentModalOpen = !empty($_GET['parents']);
$parentPage = max(1, (int) ($_GET['parents_page'] ?? 1));
$categoryPage = max(1, (int) ($_GET['page'] ?? 1));
$typeFilter = trim((string) ($_GET['tipo'] ?? ''));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  try {
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'save') {
      $id = (int) ($_POST['id'] ?? 0);
      if ($id > 0) {
        $controller->update($conn, $tenantId, $id, $_POST);
        financialFlashSet(true, 'Categoria atualizada com sucesso.');
      } else {
        $controller->store($conn, $tenantId, $_POST);
        financialFlashSet(true, 'Categoria cadastrada com sucesso.');
      }
    } elseif ($action === 'save_parent') {
      $payload = $_POST;
      $payload['parent_id'] = '';
      $id = (int) ($_POST['id'] ?? 0);
      $submittedParentPage = max(1, (int) ($_POST['parents_page'] ?? 1));
      if ($id > 0) {
        $controller->update($conn, $tenantId, $id, $payload);
        financialFlashSet(true, 'Categoria pai atualizada com sucesso.');
      } else {
        $controller->store($conn, $tenantId, $payload);
        financialFlashSet(true, 'Categoria pai cadastrada com sucesso.');
      }
    } elseif ($action === 'delete') {
      $controller->destroy($conn, $tenantId, (int) ($_POST['id'] ?? 0));
      financialFlashSet(true, 'Categoria removida com sucesso.');
    }
  } catch (Throwable $e) {
    financialFlashSet(false, $e->getMessage());
  }
  $redirectUrl = 'financeiro_categorias.php';
  $redirectQuery = [];
  $postedTypeFilter = trim((string) ($_POST['type_filter'] ?? $typeFilter));
  $postedPage = max(1, (int) ($_POST['page'] ?? $categoryPage));
  if ($postedTypeFilter !== '') {
    $redirectQuery['tipo'] = $postedTypeFilter;
  }
  if ($postedPage > 1) {
    $redirectQuery['page'] = $postedPage;
  }
  if ($action === 'save_parent') {
    $redirectQuery['parents'] = 1;
    $redirectQuery['parents_page'] = ($submittedParentPage ?? 1);
  }
  if ($redirectQuery) {
    $redirectUrl .= '?' . http_build_query($redirectQuery);
  }
  financialRedirect($redirectUrl);
}

$editing = null;
if (!empty($_GET['edit'])) {
  $editing = $controller->show($conn, $tenantId, (int) $_GET['edit']);
}
$allCategories = $controller->index($conn, $tenantId, ['type' => $typeFilter ?: null, 'active' => 0]);
$rootCategories = FinancialCategory::roots($conn, $tenantId, $editing['type'] ?? null, false);
$parentCategories = FinancialCategory::roots($conn, $tenantId, null, false);
$categoryPerPage = 10;
$categoryTotalItems = count($allCategories);
$categoryTotalPages = max(1, (int) ceil($categoryTotalItems / $categoryPerPage));
$categoryPage = min($categoryPage, $categoryTotalPages);
$visibleCategories = array_slice($allCategories, ($categoryPage - 1) * $categoryPerPage, $categoryPerPage);
$parentPerPage = 5;
$parentTotalItems = count($parentCategories);
$parentTotalPages = max(1, (int) ceil($parentTotalItems / $parentPerPage));
$parentPage = min($parentPage, $parentTotalPages);
$parentVisibleItems = array_slice($parentCategories, ($parentPage - 1) * $parentPerPage, $parentPerPage);
$categoriesTableHtml = financialRenderCategoriesTable($conn, $tenantId, $visibleCategories, $typeFilter, $categoryPage);
$rootOptionsHtml = financialRenderCategoryParentOptions($rootCategories, (int) ($editing['parent_id'] ?? 0), (int) ($editing['id'] ?? 0));
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Financeiro - Categorias</title>
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
  <link href="./assets/css/financeiro_categorias.css?v=<?= $financeiroCategoriasCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy fin-body">
<?php include __DIR__ . '/partials/sidebar.php'; ?>
<div class="fin-page">
  <div id="fin-toast-host" class="fin-toast-host"></div>
  <div class="fin-header">
    <div>
      <h1 class="fin-title">Categorias financeiras</h1>
      <div class="fin-subtitle">Cadastre categorias de receita e despesa, com hierarquia pai e filha.</div>
    </div>
    <button class="fin-btn fin-btn-primary" type="button" data-bs-toggle="modal" data-bs-target="#categoryModal">
      <i class="bi bi-plus-circle"></i> Nova categoria
    </button>
  </div>
  <div class="fin-card">
    <div class="fin-card-head fin-category-toolbar">
      <div>
        <h2 class="fin-card-title">Lista de categorias</h2>
        <div class="fin-card-subtitle">Visualize e gerencie o plano de contas financeiro.</div>
      </div>
      <form method="get" class="fin-actions" id="financial-category-filter-form">
        <div class="field">
          <label>Tipo</label>
          <select class="fin-select" id="financial-category-type-filter" name="tipo">
            <option value="">Todos</option>
            <option value="income" <?= $typeFilter === 'income' ? 'selected' : '' ?>>Receita</option>
            <option value="expense" <?= $typeFilter === 'expense' ? 'selected' : '' ?>>Despesa</option>
          </select>
        </div>
      </form>
    </div>
    <div class="fin-card-body">
      <div id="financial-category-table"><?= $categoriesTableHtml ?></div>
      <?php if ($categoryTotalPages > 1): ?>
        <div class="fin-category-pagination">
          <?php $baseQuery = $typeFilter !== '' ? ['tipo' => $typeFilter] : []; ?>
          <a class="fin-page-link <?= $categoryPage <= 1 ? 'is-disabled' : '' ?>" href="?<?= htmlspecialchars(http_build_query(array_merge($baseQuery, ['page' => max(1, $categoryPage - 1)]))) ?>" aria-label="Anterior"><i class="bi bi-chevron-left"></i></a>
          <?php for ($page = 1; $page <= $categoryTotalPages; $page++): ?>
            <a class="fin-page-link <?= $page === $categoryPage ? 'is-active' : '' ?>" href="?<?= htmlspecialchars(http_build_query(array_merge($baseQuery, ['page' => $page]))) ?>"><?= $page ?></a>
          <?php endfor; ?>
          <a class="fin-page-link <?= $categoryPage >= $categoryTotalPages ? 'is-disabled' : '' ?>" href="?<?= htmlspecialchars(http_build_query(array_merge($baseQuery, ['page' => min($categoryTotalPages, $categoryPage + 1)]))) ?>" aria-label="Próxima"><i class="bi bi-chevron-right"></i></a>
        </div>
      <?php endif; ?>
    </div>
  </div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>
<div class="modal fade" id="financialCategoryDeleteModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:420px;">
    <div class="modal-content fin-card" style="border-radius:22px;overflow:hidden;">
      <div class="fin-card-head" style="padding-bottom:8px;">
        <div>
          <h2 class="fin-card-title">Excluir categoria</h2>
          <div class="fin-card-subtitle">Confirme se deseja remover esta categoria.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="fin-card-body pt-0">
        <div style="color:#5b6b84;font-size:.9rem;line-height:1.55;margin-bottom:14px;">
          Essa acao pode afetar o vinculo de categorias nos lancamentos financeiros da operacao.
        </div>
        <div class="fin-modal-actions">
          <button class="fin-btn fin-btn-secondary fin-btn-sm" type="button" data-bs-dismiss="modal">Cancelar</button>
          <button class="fin-btn fin-btn-primary fin-btn-sm" type="button" id="financial-category-delete-confirm">Excluir</button>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="modal fade" id="categoryModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog fin-transaction-modal-dialog fin-category-modal-dialog">
    <div class="modal-content fin-transaction-modal fin-category-modal">
      <div class="fin-card-head">
        <div>
          <h2 class="fin-card-title"><?= $editing ? 'Editar categoria' : 'Nova categoria' ?></h2>
          <div class="fin-card-subtitle">Cadastre categorias de receita e despesa com vínculo opcional a uma categoria pai.</div>
        </div>
        <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="fin-card-body">
        <form method="post" class="fin-grid" id="financial-category-form">
          <input type="hidden" name="action" value="save">
          <input type="hidden" name="id" id="financial-category-id" value="<?= (int) ($editing['id'] ?? 0) ?>">
          <input type="hidden" name="type_filter" value="<?= htmlspecialchars($typeFilter) ?>">
          <input type="hidden" name="page" value="<?= (int) $categoryPage ?>">
          <div class="field">
            <label>Nome</label>
            <input class="fin-input" type="text" id="financial-category-name" name="name" value="<?= htmlspecialchars((string) ($editing['name'] ?? '')) ?>" required>
          </div>
          <div class="fin-mini-grid">
            <div class="field">
              <label>Tipo</label>
              <select class="fin-select" id="financial-category-type" name="type" required>
                <option value="income" <?= (($editing['type'] ?? '') === 'income') ? 'selected' : '' ?>>Receita</option>
                <option value="expense" <?= (($editing['type'] ?? '') === 'expense') ? 'selected' : '' ?>>Despesa</option>
              </select>
            </div>
            <div class="field">
              <label>Status</label>
              <select class="fin-select" id="financial-category-active" name="active">
                <option value="1" <?= (!isset($editing['active']) || (int) $editing['active'] === 1) ? 'selected' : '' ?>>Ativa</option>
                <option value="0" <?= (isset($editing['active']) && (int) $editing['active'] === 0) ? 'selected' : '' ?>>Inativa</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label class="d-flex align-items-center justify-content-between gap-2">
              <span>Categoria pai</span>
              <button class="fin-btn fin-btn-soft fin-btn-sm" type="button" data-bs-toggle="modal" data-bs-target="#parentCategoryModal">
                <i class="bi bi-diagram-3"></i> Gerenciar
              </button>
            </label>
            <select class="fin-select" id="financial-category-parent" name="parent_id"><?= $rootOptionsHtml ?></select>
          </div>
          <div class="fin-modal-actions">
            <button class="fin-btn fin-btn-secondary <?= $editing ? '' : 'd-none' ?>" id="financial-category-cancel" type="button">Cancelar</button>
            <button class="fin-btn fin-btn-primary" id="financial-category-submit" type="submit"><?= $editing ? 'Salvar alteracoes' : 'Cadastrar categoria' ?></button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
<div class="modal fade" id="parentCategoryModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog fin-transaction-modal-dialog fin-parent-modal-dialog">
    <div class="modal-content fin-transaction-modal fin-parent-modal">
      <div class="fin-card-head">
        <div>
          <h2 class="fin-card-title">Categorias pai</h2>
          <div class="fin-card-subtitle">Crie e edite as categorias principais de receita e despesa.</div>
        </div>
        <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="fin-card-body">
        <form method="post" class="fin-grid" id="financial-parent-category-form">
          <input type="hidden" name="action" value="save_parent">
          <input type="hidden" name="id" id="financial-parent-id" value="0">
          <input type="hidden" name="parents_page" value="<?= (int) $parentPage ?>">
          <div class="fin-mini-grid">
            <div class="field">
              <label>Nome</label>
              <input class="fin-input" type="text" name="name" id="financial-parent-name" required>
            </div>
            <div class="field">
              <label>Tipo</label>
              <select class="fin-select" name="type" id="financial-parent-type" required>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>Status</label>
            <select class="fin-select" name="active" id="financial-parent-active">
              <option value="1">Ativa</option>
              <option value="0">Inativa</option>
            </select>
          </div>
          <div class="fin-modal-actions">
            <button class="fin-btn fin-btn-secondary" type="button" id="financial-parent-reset">Limpar</button>
            <button class="fin-btn fin-btn-primary" type="submit" id="financial-parent-submit">Salvar categoria pai</button>
          </div>
        </form>
        <div class="fin-table-wrap mt-4">
          <table class="fin-table fin-table-compact">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Status</th>
                <th style="width:84px">Ações</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($parentVisibleItems as $parentCategory): ?>
                <tr>
                  <td><?= htmlspecialchars((string) $parentCategory['name']) ?></td>
                  <td>
                    <span class="fin-badge <?= $parentCategory['type'] === 'income' ? 'fin-badge-income' : 'fin-badge-expense' ?>">
                      <?= $parentCategory['type'] === 'income' ? 'Receita' : 'Despesa' ?>
                    </span>
                  </td>
                  <td><span class="fin-badge fin-badge-active"><?= !empty($parentCategory['active']) ? 'Ativa' : 'Inativa' ?></span></td>
                  <td>
                    <button
                      class="fin-table-icon-btn fin-btn-soft js-parent-category-edit"
                      type="button"
                      data-id="<?= (int) $parentCategory['id'] ?>"
                      data-name="<?= htmlspecialchars((string) $parentCategory['name'], ENT_QUOTES) ?>"
                      data-type="<?= htmlspecialchars((string) $parentCategory['type'], ENT_QUOTES) ?>"
                      data-active="<?= (int) $parentCategory['active'] ?>"
                      title="Editar"
                      aria-label="Editar"
                    ><i class="bi bi-pencil"></i></button>
                  </td>
                </tr>
              <?php endforeach; ?>
              <?php if (!$parentVisibleItems): ?>
                <tr><td colspan="4"><div class="fin-empty">Nenhuma categoria pai cadastrada.</div></td></tr>
              <?php endif; ?>
            </tbody>
          </table>
        </div>
        <?php if ($parentTotalPages > 1): ?>
          <div class="fin-parent-pagination">
            <a class="fin-page-link <?= $parentPage <= 1 ? 'is-disabled' : '' ?>" href="?parents=1&parents_page=<?= max(1, $parentPage - 1) ?>" aria-label="Anterior"><i class="bi bi-chevron-left"></i></a>
            <?php for ($page = 1; $page <= $parentTotalPages; $page++): ?>
              <a class="fin-page-link <?= $page === $parentPage ? 'is-active' : '' ?>" href="?parents=1&parents_page=<?= $page ?>"><?= $page ?></a>
            <?php endfor; ?>
            <a class="fin-page-link <?= $parentPage >= $parentTotalPages ? 'is-disabled' : '' ?>" href="?parents=1&parents_page=<?= min($parentTotalPages, $parentPage + 1) ?>" aria-label="Próxima"><i class="bi bi-chevron-right"></i></a>
          </div>
        <?php endif; ?>
      </div>
    </div>
  </div>
</div>
</main>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/financial_module.js?v=<?= $finJsVer ?>"></script>
<script>
const FINCAT_DATA = <?= json_encode(['flash' => $flash, 'parentModalOpen' => (bool) $parentModalOpen, 'categoryModalOpen' => (bool) $editing], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
</script>
<script src="./assets/js/financeiro_categorias.js?v=<?= $financeiroCategoriasJsVer ?>"></script>
</body>
</html>
