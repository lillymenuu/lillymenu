<?php
require_once __DIR__ . '/financial_module.php';
require_once __DIR__ . '/../../models/FinancialCategory.php';
require_once __DIR__ . '/../../models/FinancialAccount.php';
require_once __DIR__ . '/../../models/PaymentMethod.php';

if (!function_exists('financialRenderCategoryParentOptions')) {
  function financialRenderCategoryParentOptions(array $rootCategories, int $selectedId = 0, int $excludeId = 0): string
  {
    ob_start();
    ?>
    <option value="">Sem pai</option>
    <?php foreach ($rootCategories as $root): ?>
      <?php if ($excludeId > 0 && (int) $root['id'] === $excludeId) continue; ?>
      <option value="<?= (int) $root['id'] ?>" <?= $selectedId === (int) $root['id'] ? 'selected' : '' ?>>
        <?= htmlspecialchars((string) $root['name']) ?>
      </option>
    <?php endforeach; ?>
    <?php
    return trim((string) ob_get_clean());
  }
}

if (!function_exists('financialRenderCategoriesTable')) {
  function financialRenderCategoriesTable(PDO $conn, int $tenantId, array $allCategories, string $currentType = '', int $currentPage = 1): string
  {
    ob_start();
    $queryEdit = [];
    if ($currentType !== '') {
      $queryEdit['tipo'] = $currentType;
    }
    if ($currentPage > 1) {
      $queryEdit['page'] = $currentPage;
    }
    ?>
    <div class="fin-table-wrap">
      <table class="fin-table fin-table-compact">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Pai</th>
            <th>Status</th>
            <th style="width:150px">Acoes</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($allCategories as $item): ?>
            <?php $parent = !empty($item['parent_id']) ? FinancialCategory::find($conn, (int) $item['parent_id'], $tenantId) : null; ?>
            <tr>
              <td><?= htmlspecialchars((string) $item['name']) ?></td>
              <td>
                <span class="fin-badge <?= $item['type'] === 'income' ? 'fin-badge-income' : 'fin-badge-expense' ?>">
                  <?= $item['type'] === 'income' ? 'Receita' : 'Despesa' ?>
                </span>
              </td>
              <td><?= htmlspecialchars((string) ($parent['name'] ?? '-')) ?></td>
              <td><span class="fin-badge fin-badge-active"><?= !empty($item['active']) ? 'Ativa' : 'Inativa' ?></span></td>
              <td>
                <div class="fin-table-actions">
                  <a
                    class="fin-table-icon-btn fin-btn-soft js-fin-edit-category"
                    href="?<?= htmlspecialchars(http_build_query(array_merge($queryEdit, ['edit' => (int) $item['id']]))) ?>"
                    data-id="<?= (int) $item['id'] ?>"
                    title="Editar"
                    aria-label="Editar"
                  ><i class="bi bi-pencil"></i></a>
                  <form method="post" class="js-fin-delete-category" data-id="<?= (int) $item['id'] ?>">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= (int) $item['id'] ?>">
                    <input type="hidden" name="type_filter" value="<?= htmlspecialchars($currentType) ?>">
                    <input type="hidden" name="page" value="<?= (int) $currentPage ?>">
                    <button class="fin-table-icon-btn fin-btn-secondary" type="submit" title="Excluir" aria-label="Excluir"><i class="bi bi-trash3"></i></button>
                  </form>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
          <?php if (!$allCategories): ?>
            <tr><td colspan="5"><div class="fin-empty">Nenhuma categoria financeira cadastrada.</div></td></tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
    <?php
    return (string) ob_get_clean();
  }
}

if (!function_exists('financialRenderAccountsTable')) {
  function financialRenderAccountsTable(array $accounts, ?PDO $conn = null, int $tenantId = 0): string
  {
    ob_start();
    ?>
    <div class="fin-table-wrap">
      <table class="fin-table">
        <thead>
          <tr>
            <th>Conta</th>
            <th>Saldo inicial</th>
            <th>Saldo atual</th>
            <th>Status</th>
            <th style="width:150px">Acoes</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($accounts as $item): ?>
            <?php
              $autoSalesAccount = false;
              if ($conn && $tenantId > 0 && !empty($item['id'])) {
                try {
                  $stmtAuto = $conn->prepare("
                    SELECT COUNT(*)
                    FROM financial_transactions
                    WHERE tenant_id = ?
                      AND account_id = ?
                      AND order_id IS NOT NULL
                      AND type = 'income'
                  ");
                  $stmtAuto->execute([$tenantId, (int) $item['id']]);
                  $autoSalesAccount = ((int) $stmtAuto->fetchColumn()) > 0;
                } catch (Throwable $e) {
                  $autoSalesAccount = false;
                }
              }
            ?>
            <tr>
              <td>
                <div class="fin-account-cell">
                  <strong><?= htmlspecialchars((string) $item['name']) ?></strong>
                  <?php if ($autoSalesAccount): ?>
                    <span class="fin-badge fin-badge-info">Vendas autom.</span>
                  <?php endif; ?>
                </div>
              </td>
              <td><?= financialMoney($item['initial_balance'] ?? 0) ?></td>
              <td><strong><?= financialMoney($item['current_balance'] ?? 0) ?></strong></td>
              <td><span class="fin-badge fin-badge-active"><?= !empty($item['active']) ? 'Ativa' : 'Inativa' ?></span></td>
              <td>
                <div class="fin-table-actions">
                  <a
                    class="fin-table-icon-btn fin-btn-soft js-fin-edit-account"
                    href="?edit=<?= (int) $item['id'] ?>"
                    data-id="<?= (int) $item['id'] ?>"
                    title="Editar"
                    aria-label="Editar"
                  ><i class="bi bi-pencil"></i></a>
                  <form method="post" class="js-fin-delete-account" data-id="<?= (int) $item['id'] ?>">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= (int) $item['id'] ?>">
                    <button class="fin-table-icon-btn fin-btn-secondary" type="submit" title="Excluir" aria-label="Excluir"><i class="bi bi-trash3"></i></button>
                  </form>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
          <?php if (!$accounts): ?>
            <tr><td colspan="5"><div class="fin-empty">Nenhuma conta financeira cadastrada.</div></td></tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
    <?php
    return (string) ob_get_clean();
  }
}

if (!function_exists('financialRenderPaymentMethodsTable')) {
  function financialRenderPaymentMethodsTable(array $items): string
  {
    ob_start();
    ?>
    <div class="fin-table-wrap">
      <table class="fin-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Status</th>
            <th style="width:150px">Acoes</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($items as $item): ?>
            <tr>
              <td><?= htmlspecialchars((string) $item['name']) ?></td>
              <td><span class="fin-badge fin-badge-active"><?= !empty($item['active']) ? 'Ativa' : 'Inativa' ?></span></td>
              <td>
                <div class="fin-table-actions">
                  <a
                    class="fin-table-icon-btn fin-btn-soft js-fin-edit-method"
                    href="?edit=<?= (int) $item['id'] ?>"
                    data-id="<?= (int) $item['id'] ?>"
                    title="Editar"
                    aria-label="Editar"
                  ><i class="bi bi-pencil"></i></a>
                  <form method="post" class="js-fin-delete-method" data-id="<?= (int) $item['id'] ?>">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= (int) $item['id'] ?>">
                    <button class="fin-table-icon-btn fin-btn-secondary" type="submit" title="Excluir" aria-label="Excluir"><i class="bi bi-trash3"></i></button>
                  </form>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
          <?php if (!$items): ?>
            <tr><td colspan="3"><div class="fin-empty">Nenhuma forma de pagamento cadastrada.</div></td></tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
    <?php
    return (string) ob_get_clean();
  }
}

if (!function_exists('financialRenderTransactionsTable')) {
  function financialRenderTransactionsTable(PDO $conn, int $tenantId, array $transactions, array $query = [], int $page = 1, int $perPage = 5): string
  {
    $mes = (int) ($query['mes'] ?? financialCurrentMonth());
    $ano = (int) ($query['ano'] ?? financialCurrentYear());
    $tipo = (string) ($query['tipo'] ?? '');
    $categoriaId = (int) ($query['categoria_id'] ?? 0);
    $contaId = (int) ($query['conta_id'] ?? 0);
    $totalItems = count($transactions);
    $perPage = max(1, $perPage);
    $totalPages = max(1, (int) ceil($totalItems / $perPage));
    $page = max(1, min($totalPages, $page));
    $visibleItems = array_slice($transactions, ($page - 1) * $perPage, $perPage);

    /* ── Pré-carrega lookup data em batch (evita N+1 queries) ── */
    static $catCache = [], $accCache = [], $pmCache = [];

    $neededCats = array_unique(array_filter(array_column($visibleItems, 'category_id')));
    $neededAccs = array_unique(array_filter(array_column($visibleItems, 'account_id')));
    $neededPms  = array_unique(array_filter(array_column($visibleItems, 'payment_method_id')));

    foreach ($neededCats as $cid) {
      $k = $tenantId.':'.$cid;
      if (!isset($catCache[$k])) $catCache[$k] = FinancialCategory::find($conn, (int)$cid, $tenantId);
    }
    foreach ($neededAccs as $aid) {
      $k = $tenantId.':'.$aid;
      if (!isset($accCache[$k])) $accCache[$k] = FinancialAccount::find($conn, (int)$aid, $tenantId);
    }
    foreach ($neededPms as $pid) {
      $k = $tenantId.':'.$pid;
      if (!isset($pmCache[$k])) $pmCache[$k] = PaymentMethod::find($conn, (int)$pid, $tenantId);
    }

    ob_start();
    ?>
    <div class="fin-table-wrap">
      <table class="fin-table fin-table-compact">
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Descricao</th>
            <th>Categoria</th>
            <th>Conta</th>
            <th>Forma</th>
            <th>Valor</th>
            <th style="width:92px">Acoes</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($visibleItems as $item): ?>
            <?php
              $cat = $catCache[$tenantId.':'.$item['category_id']] ?? null;
              $acc = $accCache[$tenantId.':'.$item['account_id']] ?? null;
              $pm  = !empty($item['payment_method_id']) ? ($pmCache[$tenantId.':'.$item['payment_method_id']] ?? null) : null;
            ?>
            <tr>
              <td><?= date('d/m/Y', strtotime((string) $item['transaction_date'])) ?></td>
              <td><span class="fin-badge <?= $item['type'] === 'income' ? 'fin-badge-income' : 'fin-badge-expense' ?>"><?= $item['type'] === 'income' ? 'Receita' : 'Despesa' ?></span></td>
              <td><?= htmlspecialchars((string) $item['description']) ?></td>
              <td><?= htmlspecialchars((string) ($cat['name'] ?? '-')) ?></td>
              <td><?= htmlspecialchars((string) ($acc['name'] ?? '-')) ?></td>
              <td><?= htmlspecialchars((string) ($pm['name'] ?? 'Nao informado')) ?></td>
              <td><strong><?= financialMoney($item['amount'] ?? 0) ?></strong></td>
              <td>
                <div class="fin-table-actions">
                  <a
                    class="fin-table-icon-btn fin-btn-soft js-fin-edit-transaction"
                    href="?edit=<?= (int) $item['id'] ?>&mes=<?= $mes ?>&ano=<?= $ano ?>&tipo=<?= urlencode($tipo) ?>&categoria_id=<?= $categoriaId ?>&conta_id=<?= $contaId ?>"
                    data-id="<?= (int) $item['id'] ?>"
                    title="Editar"
                    aria-label="Editar"
                  ><i class="bi bi-pencil"></i></a>
                  <form method="post" class="js-fin-delete-transaction" data-id="<?= (int) $item['id'] ?>">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= (int) $item['id'] ?>">
                    <button class="fin-table-icon-btn fin-btn-secondary" type="submit" title="Excluir" aria-label="Excluir"><i class="bi bi-trash3"></i></button>
                  </form>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
          <?php if (!$transactions): ?>
            <tr><td colspan="8"><div class="fin-empty">Nenhum lancamento encontrado para os filtros selecionados.</div></td></tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
    <?php if ($totalPages > 1):
      /* Paginação compacta com reticências */
      $paginaItens = [];
      if ($totalPages <= 7) {
        for ($i = 1; $i <= $totalPages; $i++) $paginaItens[] = $i;
      } else {
        $paginaItens[] = 1;
        if ($page > 3) $paginaItens[] = '...';
        $inicio = max(2, $page - 1);
        $fim    = min($totalPages - 1, $page + 1);
        for ($i = $inicio; $i <= $fim; $i++) $paginaItens[] = $i;
        if ($page < $totalPages - 2) $paginaItens[] = '...';
        $paginaItens[] = $totalPages;
      }
    ?>
      <div class="fin-table-footer">
        <div class="fin-table-meta">
          Mostrando <?= (($page - 1) * $perPage) + 1 ?>-<?= min($totalItems, $page * $perPage) ?> de <?= $totalItems ?> lancamentos
        </div>
        <div class="fin-pagination">
          <button class="fin-page-btn" type="button" data-fin-page="<?= max(1, $page - 1) ?>" <?= $page <= 1 ? 'disabled' : '' ?>>Anterior</button>
          <?php foreach ($paginaItens as $item): ?>
            <?php if ($item === '...'): ?>
              <span class="fin-page-ellipsis">...</span>
            <?php else: ?>
              <button class="fin-page-btn <?= (int)$item === $page ? 'is-active' : '' ?>" type="button" data-fin-page="<?= $item ?>"><?= $item ?></button>
            <?php endif; ?>
          <?php endforeach; ?>
          <button class="fin-page-btn" type="button" data-fin-page="<?= min($totalPages, $page + 1) ?>" <?= $page >= $totalPages ? 'disabled' : '' ?>>Proximo</button>
        </div>
      </div>
    <?php endif; ?>
    <?php
    return (string) ob_get_clean();
  }
}

if (!function_exists('financialRenderDashboardContent')) {
  function financialRenderDashboardContent(array $resumoMensal, array $dashboard, array $dre): string
  {
    $incomeByPaymentMethod = $dashboard['income_by_payment_method'] ?? [];
    $expenseByCategory = $dashboard['expense_by_category'] ?? [];

    /* ── Dados para o donut de fluxo de caixa ── */
    $totalIncome  = (float) ($resumoMensal['total_income']  ?? 0);
    $totalExpense = (float) ($resumoMensal['total_expense'] ?? 0);
    $grandPie     = $totalIncome + $totalExpense;
    if ($grandPie <= 0) $grandPie = 1;
    $balance = $totalIncome - $totalExpense;
    $balancePositive = $balance >= 0;

    /* Slices: cada forma de pagamento de receita + bloco de despesas */
    $pieColors = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#06b6d4','#9C5523','#14b8a6'];
    $slices = [];
    $ci = 0;
    foreach ($incomeByPaymentMethod as $item) {
      $slices[] = [
        'label'  => $item['payment_method'] ?? 'Nao informado',
        'value'  => (float)($item['total'] ?? 0),
        'color'  => $pieColors[$ci % count($pieColors)],
        'type'   => 'income',
      ];
      $ci++;
    }
    if ($totalExpense > 0) {
      $slices[] = ['label'=>'Despesas','value'=>$totalExpense,'color'=>'#ef4444','type'=>'expense'];
    }
    /* Monta conic-gradient */
    $gradientStops = '';
    $deg = 0;
    foreach ($slices as $slice) {
      $sliceDeg = ($slice['value'] / $grandPie) * 360;
      $gradientStops .= "{$slice['color']} {$deg}deg " . ($deg + $sliceDeg) . "deg,";
      $slice['_start'] = $deg;
      $slice['_end']   = $deg + $sliceDeg;
      $deg += $sliceDeg;
    }
    $gradientStops = rtrim($gradientStops, ',');
    $donutStyle = $gradientStops ? "background:conic-gradient({$gradientStops});" : 'background:#e5e7eb;';

    ob_start();
    ?>
    <div class="fin-grid fin-grid-4">
      <div class="fin-card fin-stat">
        <div class="fin-stat-label">Receita</div>
        <div class="fin-stat-value"><?= financialMoney($resumoMensal['total_income'] ?? 0) ?></div>
        <div class="fin-stat-trend fin-positive">Entradas do mes</div>
      </div>
      <div class="fin-card fin-stat">
        <div class="fin-stat-label">Despesa</div>
        <div class="fin-stat-value"><?= financialMoney($resumoMensal['total_expense'] ?? 0) ?></div>
        <div class="fin-stat-trend fin-negative">Saidas do mes</div>
      </div>
      <div class="fin-card fin-stat">
        <div class="fin-stat-label">Lucro / prejuizo</div>
        <div class="fin-stat-value"><?= financialMoney($resumoMensal['profit_or_loss'] ?? 0) ?></div>
        <div class="fin-stat-trend <?= (($resumoMensal['profit_or_loss'] ?? 0) >= 0) ? 'fin-positive' : 'fin-negative' ?>">Resultado operacional</div>
      </div>
      <div class="fin-card fin-stat">
        <div class="fin-stat-label">Margem</div>
        <div class="fin-stat-value"><?= number_format((float) ($resumoMensal['margin_percent'] ?? 0), 2, ',', '.') ?>%</div>
        <div class="fin-stat-trend fin-neutral">Margem do mes</div>
      </div>
    </div>

    <div class="fin-footer-space"></div>

    <div class="fin-grid fin-grid-2">
      <div class="fin-card">
        <div class="fin-card-head">
          <div>
            <h2 class="fin-card-title">Fluxo de caixa</h2>
            <div class="fin-card-subtitle">Distribuicao receitas vs despesas</div>
          </div>
          <div class="fin-icon"><i class="bi bi-pie-chart-fill"></i></div>
        </div>
        <div class="fin-card-body">
          <?php if ($slices && $grandPie > 0): ?>
            <div class="fin-donut-wrap">

              <!-- Donut Chart via conic-gradient -->
              <div class="fin-donut-chart-outer">
                <div class="fin-donut-chart" style="<?= $donutStyle ?>">
                  <div class="fin-donut-hole">
                    <div class="fin-donut-hole-label">Saldo</div>
                    <div class="fin-donut-hole-value <?= $balancePositive ? 'fin-positive' : 'fin-negative' ?>">
                      <?= financialMoney($balance) ?>
                    </div>
                    <div class="fin-donut-hole-sub">do período</div>
                  </div>
                </div>
              </div>

              <!-- Boxes de receita/despesa total -->
              <div class="fin-donut-totals">
                <div class="fin-donut-total-box income">
                  <div class="fin-donut-total-lbl">Receitas</div>
                  <div class="fin-donut-total-val"><?= financialMoney($totalIncome) ?></div>
                </div>
                <div class="fin-donut-total-box expense">
                  <div class="fin-donut-total-lbl">Despesas</div>
                  <div class="fin-donut-total-val"><?= financialMoney($totalExpense) ?></div>
                </div>
              </div>

              <!-- Legenda abaixo com animação escalonada -->
              <div class="fin-donut-legend">
                <?php
                  $prevType = null;
                  $delay = 0;
                  foreach ($slices as $i => $slice):
                    $pct = round(($slice['value'] / $grandPie) * 100, 1);
                    $delay += 60;
                    if ($prevType !== null && $prevType !== $slice['type']): ?>
                      <div class="fin-donut-divider"></div>
                    <?php endif; ?>
                    <?php if ($prevType !== $slice['type']): ?>
                      <div class="fin-donut-legend-section-lbl">
                        <?= $slice['type'] === 'income' ? '↑ Receitas' : '↓ Despesas' ?>
                      </div>
                    <?php endif; ?>
                    <div class="fin-donut-legend-item" style="animation-delay:<?= $delay ?>ms">
                      <div class="fin-donut-dot" style="background:<?= $slice['color'] ?>"></div>
                      <span class="fin-donut-legend-label"><?= htmlspecialchars($slice['label']) ?></span>
                      <span class="fin-donut-legend-pct"><?= $pct ?>%</span>
                      <span class="fin-donut-legend-val"><?= financialMoney($slice['value']) ?></span>
                    </div>
                  <?php $prevType = $slice['type']; endforeach; ?>
              </div>

            </div>
          <?php else: ?>
            <div class="fin-empty">Sem movimentacoes financeiras no periodo.</div>
          <?php endif; ?>
        </div>
      </div>

      <div class="fin-grid">
        <div class="fin-card">
          <div class="fin-card-head">
            <div>
              <h2 class="fin-card-title">Receitas por forma</h2>
              <div class="fin-card-subtitle">Distribuicao das entradas no periodo</div>
            </div>
            <div class="fin-icon"><i class="bi bi-pie-chart"></i></div>
          </div>
          <div class="fin-card-body">
            <?php if ($incomeByPaymentMethod): ?>
              <?php
                $maxIncomeMethod = 0;
                foreach ($incomeByPaymentMethod as $item) {
                  $maxIncomeMethod = max($maxIncomeMethod, (float) ($item['total'] ?? 0));
                }
                if ($maxIncomeMethod <= 0) {
                  $maxIncomeMethod = 1;
                }
              ?>
              <div class="fin-stack-chart">
                <?php foreach ($incomeByPaymentMethod as $item): ?>
                  <?php $width = max(10, (((float) ($item['total'] ?? 0)) / $maxIncomeMethod) * 100); ?>
                  <div class="fin-stack-row">
                    <div class="fin-stack-head">
                      <strong><?= htmlspecialchars((string) ($item['payment_method'] ?? 'Nao informado')) ?></strong>
                      <span><?= financialMoney($item['total'] ?? 0) ?></span>
                    </div>
                    <div class="fin-stack-track">
                      <div class="fin-stack-fill fin-stack-fill-income" style="width:<?= $width ?>%"></div>
                    </div>
                  </div>
                <?php endforeach; ?>
              </div>
            <?php else: ?>
              <div class="fin-empty">Nenhuma receita encontrada.</div>
            <?php endif; ?>
          </div>
        </div>

        <div class="fin-card">
          <div class="fin-card-head">
            <div>
              <h2 class="fin-card-title">Despesas por categoria</h2>
              <div class="fin-card-subtitle">Maiores saidas do periodo</div>
            </div>
            <div class="fin-icon"><i class="bi bi-graph-down-arrow"></i></div>
          </div>
          <div class="fin-card-body">
            <?php if ($expenseByCategory): ?>
              <?php
                $maxExpenseCategory = 0;
                foreach ($expenseByCategory as $item) {
                  $maxExpenseCategory = max($maxExpenseCategory, (float) ($item['total'] ?? 0));
                }
                if ($maxExpenseCategory <= 0) {
                  $maxExpenseCategory = 1;
                }
              ?>
              <div class="fin-stack-chart">
                <?php foreach ($expenseByCategory as $item): ?>
                  <?php $width = max(10, (((float) ($item['total'] ?? 0)) / $maxExpenseCategory) * 100); ?>
                  <div class="fin-stack-row">
                    <div class="fin-stack-head">
                      <div>
                        <strong><?= htmlspecialchars((string) ($item['category_name'] ?? 'Categoria')) ?></strong>
                        <div class="fin-card-subtitle"><?= htmlspecialchars((string) ($item['category_group'] ?? 'Grupo')) ?></div>
                      </div>
                      <span><?= financialMoney($item['total'] ?? 0) ?></span>
                    </div>
                    <div class="fin-stack-track">
                      <div class="fin-stack-fill fin-stack-fill-expense" style="width:<?= $width ?>%"></div>
                    </div>
                  </div>
                <?php endforeach; ?>
              </div>
            <?php else: ?>
              <div class="fin-empty">Nenhuma despesa encontrada.</div>
            <?php endif; ?>
          </div>
        </div>
      </div>
    </div>

    <div class="fin-footer-space"></div>

    <div class="fin-grid fin-grid-2">
      <div class="fin-card">
        <div class="fin-card-head">
          <div>
            <h2 class="fin-card-title">Contas financeiras</h2>
            <div class="fin-card-subtitle">Movimentação do mês por conta</div>
          </div>
        </div>
        <div class="fin-card-body">
          <div class="fin-list">
            <?php foreach (($dashboard['accounts'] ?? []) as $conta):
              $income  = (float) ($conta['monthly_income']  ?? 0);
              $expense = (float) ($conta['monthly_expense'] ?? 0);
              $balance = (float) ($conta['monthly_balance'] ?? 0);
              $positivo = $balance >= 0;
            ?>
              <div class="fin-list-item" style="align-items:flex-start;gap:12px">
                <div style="flex:1;min-width:0">
                  <strong><?= htmlspecialchars((string) ($conta['name'] ?? 'Conta')) ?></strong>
                  <div style="display:flex;gap:12px;margin-top:4px;flex-wrap:wrap">
                    <span style="font-size:11px;color:#16a34a"><i class="bi bi-arrow-up-circle"></i> <?= financialMoney($income) ?></span>
                    <span style="font-size:11px;color:#dc2626"><i class="bi bi-arrow-down-circle"></i> <?= financialMoney($expense) ?></span>
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <strong style="color:<?= $positivo ? '#16a34a' : '#dc2626' ?>"><?= financialMoney($balance) ?></strong>
                  <div class="fin-card-subtitle"><?= $positivo ? 'Saldo positivo' : 'Saldo negativo' ?></div>
                </div>
              </div>
            <?php endforeach; ?>
            <?php if (empty($dashboard['accounts'])): ?>
              <div class="fin-empty">Nenhuma conta financeira cadastrada.</div>
            <?php endif; ?>
          </div>
        </div>
      </div>

      <div class="fin-card">
        <div class="fin-card-head">
          <div>
            <h2 class="fin-card-title">DRE do mes</h2>
            <div class="fin-card-subtitle">Resumo gerencial consolidado</div>
          </div>
        </div>
        <div class="fin-card-body">
          <div class="fin-list">
            <div class="fin-list-item"><strong>Receita bruta</strong><strong><?= financialMoney($dre['gross_revenue'] ?? 0) ?></strong></div>
            <div class="fin-list-item"><strong>Despesas</strong><strong><?= financialMoney($dre['total_expenses'] ?? 0) ?></strong></div>
            <div class="fin-list-item"><strong>Lucro liquido</strong><strong><?= financialMoney($dre['net_profit'] ?? 0) ?></strong></div>
            <div class="fin-list-item"><strong>Margem</strong><strong><?= number_format((float) ($dre['margin_percent'] ?? 0), 2, ',', '.') ?>%</strong></div>
          </div>
        </div>
      </div>
    </div>
    <?php
    return (string) ob_get_clean();
  }
}

if (!function_exists('financialRenderDreTable')) {
  function financialRenderDreTable(array $rows, int $ano): string
  {
    $suffix = substr((string) $ano, -2);
    $metrics = [
      'Receita bruta'  => ['key'=>'total_income',    'cls'=>'dre-income',  'icon'=>'bi-graph-up-arrow',  'positive'=>true],
      'Despesas'       => ['key'=>'total_expense',   'cls'=>'dre-expense', 'icon'=>'bi-graph-down-arrow','positive'=>false],
      'Lucro liquido'  => ['key'=>'profit_or_loss',  'cls'=>'dre-profit',  'icon'=>'bi-currency-dollar', 'positive'=>null],
    ];
    ob_start();
    ?>
    <div class="fin-dre-wrap">
      <table class="fin-dre-table">
        <thead>
          <tr>
            <th class="fin-dre-th-label">Indicador</th>
            <?php for ($m = 1; $m <= 12; $m++): ?>
              <th><?= financialMonthLabel($m) ?>/<?= $suffix ?></th>
            <?php endfor; ?>
            <th class="fin-dre-th-total">Total anual</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($metrics as $label => $meta):
            $sum = 0; ?>
            <tr class="fin-dre-row <?= $meta['cls'] ?>">
              <td class="fin-dre-td-label">
                <span class="fin-dre-badge <?= $meta['cls'] ?>">
                  <i class="bi <?= $meta['icon'] ?>"></i>
                </span>
                <?= $label ?>
              </td>
              <?php for ($m = 1; $m <= 12; $m++):
                $val = (float)($rows[$m][$meta['key']] ?? 0);
                $sum += $val;
                $cls = $val > 0 ? 'dre-pos' : ($val < 0 ? 'dre-neg' : 'dre-zero');
              ?>
                <td class="fin-dre-td-val <?= $cls ?>"><?= financialMoney($val) ?></td>
              <?php endfor; ?>
              <?php $cls = $sum > 0 ? 'dre-pos' : ($sum < 0 ? 'dre-neg' : 'dre-zero'); ?>
              <td class="fin-dre-td-total <?= $cls ?>"><strong><?= financialMoney($sum) ?></strong></td>
            </tr>
          <?php endforeach; ?>
          <tr class="fin-dre-row dre-margin">
            <td class="fin-dre-td-label">
              <span class="fin-dre-badge dre-margin"><i class="bi bi-percent"></i></span>
              Margem
            </td>
            <?php
              $mTotalRec = 0; $mTotalDesp = 0;
              for ($m = 1; $m <= 12; $m++):
                $mTotalRec  += (float)($rows[$m]['total_income'] ?? 0);
                $mTotalDesp += (float)($rows[$m]['total_expense'] ?? 0);
                $pct = (float)($rows[$m]['margin_percent'] ?? 0);
                $cls = $pct > 0 ? 'dre-pos' : ($pct < 0 ? 'dre-neg' : 'dre-zero');
            ?>
              <td class="fin-dre-td-val <?= $cls ?>"><?= number_format($pct, 1, ',', '.') ?>%</td>
            <?php endfor; ?>
            <?php
              $lucroTotal  = $mTotalRec - $mTotalDesp;
              $margemAnual = $mTotalRec > 0 ? ($lucroTotal / $mTotalRec) * 100 : 0;
              $cls = $margemAnual > 0 ? 'dre-pos' : ($margemAnual < 0 ? 'dre-neg' : 'dre-zero');
            ?>
            <td class="fin-dre-td-total <?= $cls ?>"><strong><?= number_format($margemAnual, 1, ',', '.') ?>%</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    <?php
    return (string) ob_get_clean();
  }
}
