<?php
require_once __DIR__ . '/../models/FinancialTransaction.php';

class FinancialReportService
{
  protected function buildWhere(array &$params, $tenantId, array $filters = [])
  {
    $where = ["ft.tenant_id = ?"];
    $params[] = (int) $tenantId;
    $appNow = new DateTimeImmutable('now', new DateTimeZone('America/Fortaleza'));
    $currentDate = $appNow->format('Y-m-d');
    $currentMonth = (int) $appNow->format('n');
    $currentYear = (int) $appNow->format('Y');

    if (!empty($filters['type'])) {
      $where[] = "ft.type = ?";
      $params[] = $filters['type'];
    }
    if (!empty($filters['account_id'])) {
      $where[] = "ft.account_id = ?";
      $params[] = (int) $filters['account_id'];
    }
    if (!empty($filters['category_id'])) {
      $where[] = "ft.category_id = ?";
      $params[] = (int) $filters['category_id'];
    }
    if (!empty($filters['payment_method_id'])) {
      $where[] = "ft.payment_method_id = ?";
      $params[] = (int) $filters['payment_method_id'];
    }
    if (!empty($filters['reference_month'])) {
      $where[] = "ft.reference_month = ?";
      $params[] = (int) $filters['reference_month'];
    }
    if (!empty($filters['reference_year'])) {
      $where[] = "ft.reference_year = ?";
      $params[] = (int) $filters['reference_year'];
    }
    if (
      empty($filters['date_to']) &&
      !empty($filters['reference_month']) &&
      !empty($filters['reference_year']) &&
      (int) $filters['reference_month'] === $currentMonth &&
      (int) $filters['reference_year'] === $currentYear
    ) {
      $where[] = "ft.transaction_date <= ?";
      $params[] = $currentDate;
    }
    if (!empty($filters['date_from'])) {
      $where[] = "ft.transaction_date >= ?";
      $params[] = $filters['date_from'];
    }
    if (!empty($filters['date_to'])) {
      $where[] = "ft.transaction_date <= ?";
      $params[] = $filters['date_to'];
    }

    return implode(' AND ', $where);
  }

  public function summary($conn, $tenantId, array $filters = [])
  {
    $params = [];
    $where = $this->buildWhere($params, $tenantId, $filters);
    $stmt = $conn->prepare("
      SELECT
        SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END) AS total_expense,
        SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE -ft.amount END) AS balance
      FROM financial_transactions ft
      WHERE {$where}
    ");
    $stmt->execute($params);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: ['total_income' => 0, 'total_expense' => 0, 'balance' => 0];
  }

  public function monthlySummary($conn, $tenantId, $referenceMonth, $referenceYear, array $filters = [])
  {
    $filters['reference_month'] = (int) $referenceMonth;
    $filters['reference_year'] = (int) $referenceYear;
    $summary = $this->summary($conn, $tenantId, $filters);

    $totalIncome = (float) ($summary['total_income'] ?? 0);
    $totalExpense = (float) ($summary['total_expense'] ?? 0);
    $profit = $totalIncome - $totalExpense;
    $margin = $totalIncome > 0 ? (($profit / $totalIncome) * 100) : 0;

    return [
      'reference_month' => (int) $referenceMonth,
      'reference_year' => (int) $referenceYear,
      'total_income' => $totalIncome,
      'total_expense' => $totalExpense,
      'profit_or_loss' => $profit,
      'margin_percent' => round($margin, 2),
    ];
  }

  public function cashFlow($conn, $tenantId, array $filters = [])
  {
    $params = [];
    $where = $this->buildWhere($params, $tenantId, $filters);
    $stmt = $conn->prepare("
      SELECT
        ft.transaction_date,
        SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END) AS income_total,
        SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END) AS expense_total,
        SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE -ft.amount END) AS day_balance
      FROM financial_transactions ft
      WHERE {$where}
      GROUP BY ft.transaction_date
      ORDER BY ft.transaction_date ASC
    ");
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function dre($conn, $tenantId, array $filters = [])
  {
    $summary = $this->summary($conn, $tenantId, $filters);
    $grossRevenue = (float) ($summary['total_income'] ?? 0);
    $totalExpenses = (float) ($summary['total_expense'] ?? 0);
    $netProfit = $grossRevenue - $totalExpenses;
    $margin = $grossRevenue > 0 ? (($netProfit / $grossRevenue) * 100) : 0;

    $params = [];
    $where = $this->buildWhere($params, $tenantId, $filters);
    $stmt = $conn->prepare("
      SELECT
        fc.type,
        fc.name AS category_name,
        COALESCE(parent.name, fc.name) AS group_name,
        SUM(ft.amount) AS total
      FROM financial_transactions ft
      INNER JOIN financial_categories fc ON fc.id = ft.category_id AND fc.tenant_id = ft.tenant_id
      LEFT JOIN financial_categories parent ON parent.id = fc.parent_id AND parent.tenant_id = fc.tenant_id
      WHERE {$where}
      GROUP BY fc.type, fc.name, COALESCE(parent.name, fc.name)
      ORDER BY fc.type ASC, group_name ASC, fc.name ASC
    ");
    $stmt->execute($params);

    return [
      'gross_revenue' => $grossRevenue,
      'total_expenses' => $totalExpenses,
      'net_profit' => $netProfit,
      'margin_percent' => round($margin, 2),
      'lines' => $stmt->fetchAll(PDO::FETCH_ASSOC),
    ];
  }

  public function expenseByCategory($conn, $tenantId, array $filters = [])
  {
    $filters['type'] = 'expense';
    $params = [];
    $where = $this->buildWhere($params, $tenantId, $filters);
    $stmt = $conn->prepare("
      SELECT
        COALESCE(parent.name, fc.name) AS category_group,
        fc.name AS category_name,
        SUM(ft.amount) AS total
      FROM financial_transactions ft
      INNER JOIN financial_categories fc ON fc.id = ft.category_id AND fc.tenant_id = ft.tenant_id
      LEFT JOIN financial_categories parent ON parent.id = fc.parent_id AND parent.tenant_id = fc.tenant_id
      WHERE {$where}
      GROUP BY COALESCE(parent.name, fc.name), fc.name
      ORDER BY total DESC, category_name ASC
    ");
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function incomeByPaymentMethod($conn, $tenantId, array $filters = [])
  {
    $filters['type'] = 'income';
    $params = [];
    $where = $this->buildWhere($params, $tenantId, $filters);
    $stmt = $conn->prepare("
      SELECT
        COALESCE(pm.name, 'Não informado') AS payment_method,
        SUM(ft.amount) AS total
      FROM financial_transactions ft
      LEFT JOIN payment_methods pm ON pm.id = ft.payment_method_id AND pm.tenant_id = ft.tenant_id
      WHERE {$where}
      GROUP BY COALESCE(pm.name, 'Não informado')
      ORDER BY total DESC, payment_method ASC
    ");
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function dashboard($conn, $tenantId, array $filters = [])
  {
    $summary = $this->summary($conn, $tenantId, $filters);
    $cashFlow = $this->cashFlow($conn, $tenantId, $filters);

    $refMonth = (int) ($filters['reference_month'] ?? date('n'));
    $refYear  = (int) ($filters['reference_year']  ?? date('Y'));

    $stmt = $conn->prepare("
      SELECT
        fa.id, fa.name, fa.initial_balance, fa.active,
        COALESCE(SUM(CASE WHEN ft.type = 'income'  THEN ft.amount ELSE 0 END), 0) AS monthly_income,
        COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) AS monthly_expense,
        COALESCE(SUM(CASE WHEN ft.type = 'income'  THEN ft.amount ELSE -ft.amount END), 0) AS monthly_balance
      FROM financial_accounts fa
      LEFT JOIN financial_transactions ft
             ON ft.account_id       = fa.id
            AND ft.tenant_id        = fa.tenant_id
            AND ft.reference_month  = ?
            AND ft.reference_year   = ?
      WHERE fa.tenant_id = ?
      GROUP BY fa.id, fa.name, fa.initial_balance, fa.active
      ORDER BY fa.name ASC
    ");
    $stmt->execute([$refMonth, $refYear, (int) $tenantId]);
    $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return [
      'summary' => $summary,
      'cash_flow' => $cashFlow,
      'accounts' => $accounts,
      'expense_by_category' => $this->expenseByCategory($conn, $tenantId, $filters),
      'income_by_payment_method' => $this->incomeByPaymentMethod($conn, $tenantId, $filters),
    ];
  }
}
