<?php
require_once __DIR__ . '/../models/FinancialTransaction.php';
require_once __DIR__ . '/../models/FinancialCategory.php';
require_once __DIR__ . '/../models/FinancialAccount.php';
require_once __DIR__ . '/../models/PaymentMethod.php';
require_once __DIR__ . '/../helpers/pedido_codigo.php';

class SaleFinancialIntegrationService
{
  public function syncFinalizedOrdersForPeriod(PDO $conn, int $tenantId, int $referenceMonth, int $referenceYear): array
  {
    $stmt = $conn->prepare("
      SELECT id
      FROM pedidos
      WHERE loja_id = ?
        AND status = 'finalizado'
        AND MONTH(criado_em) = ?
        AND YEAR(criado_em) = ?
      ORDER BY id ASC
    ");
    $stmt->execute([$tenantId, $referenceMonth, $referenceYear]);
    $orderIds = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

    $totals = ['created' => 0, 'updated' => 0, 'deleted' => 0, 'orders' => 0];
    foreach ($orderIds as $orderId) {
      $result = $this->syncFinalizedOrder($conn, $tenantId, (int) $orderId);
      $totals['created'] += (int) ($result['created'] ?? 0);
      $totals['updated'] += (int) ($result['updated'] ?? 0);
      $totals['deleted'] += (int) ($result['deleted'] ?? 0);
      $totals['orders']++;
    }

    return $totals;
  }

  protected function paymentLabels(): array
  {
    return [
      'pix' => 'Pix',
      'dinheiro' => 'Dinheiro',
      'credito' => 'Credito',
      'debito' => 'Debito',
      'voucher' => 'Voucher',
      'outros' => 'Outros',
      'outro' => 'Outros',
      'fiado' => 'Fiado',
      'resgate' => 'Resgate',
      'cashback' => 'Cashback',
    ];
  }

  protected function normalize(string $value): string
  {
    $value = trim(mb_strtolower($value, 'UTF-8'));
    if ($value === '') {
      return '';
    }
    $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if ($ascii !== false) {
      $value = $ascii;
    }
    return preg_replace('/[^a-z0-9]+/', '', strtolower($value)) ?: '';
  }

  protected function findCategoryByName(PDO $conn, int $tenantId, string $name, string $type): ?array
  {
    $stmt = $conn->prepare("
      SELECT *
      FROM financial_categories
      WHERE tenant_id = ? AND type = ? AND LOWER(name) = LOWER(?)
      ORDER BY id ASC
      LIMIT 1
    ");
    $stmt->execute([$tenantId, $type, $name]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
  }

  protected function createCategory(PDO $conn, int $tenantId, string $name, string $type): array
  {
    $stmt = $conn->prepare("
      INSERT INTO financial_categories
        (tenant_id, name, type, parent_id, active, created_at)
      VALUES (?, ?, ?, NULL, 1, NOW())
    ");
    $stmt->execute([$tenantId, $name, $type]);
    return FinancialCategory::find($conn, (int) $conn->lastInsertId(), $tenantId);
  }

  protected function resolveSalesCategory(PDO $conn, int $tenantId): ?array
  {
    $category = $this->findCategoryByName($conn, $tenantId, 'Vendas', 'income');
    if ($category) {
      return $category;
    }

    $roots = FinancialCategory::roots($conn, $tenantId, 'income', true);
    $parentId = !empty($roots[0]['id']) ? (int) $roots[0]['id'] : null;

    $stmt = $conn->prepare("
      INSERT INTO financial_categories
        (tenant_id, name, type, parent_id, active, created_at)
      VALUES (?, 'Vendas', 'income', ?, 1, NOW())
    ");
    $stmt->execute([$tenantId, $parentId]);
    return FinancialCategory::find($conn, (int) $conn->lastInsertId(), $tenantId);
  }

  protected function findAccountByName(PDO $conn, int $tenantId, string $name): ?array
  {
    $stmt = $conn->prepare("
      SELECT *
      FROM financial_accounts
      WHERE tenant_id = ? AND LOWER(name) = LOWER(?)
      ORDER BY id ASC
      LIMIT 1
    ");
    $stmt->execute([$tenantId, $name]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
  }

  protected function resolveDefaultSalesAccount(PDO $conn, int $tenantId): ?array
  {
    $account = $this->findAccountByName($conn, $tenantId, 'Caixa/Vendas');
    if ($account) {
      return $account;
    }

    $stmt = $conn->prepare("
      INSERT INTO financial_accounts
        (tenant_id, name, initial_balance, current_balance, active, created_at)
      VALUES (?, 'Caixa/Vendas', 0, 0, 1, NOW())
    ");
    $stmt->execute([$tenantId]);
    return FinancialAccount::find($conn, (int) $conn->lastInsertId(), $tenantId);
  }

  protected function displayPaymentName(string $name): string
  {
    $name = trim($name);
    if ($name === '') {
      return 'Vendas';
    }

    $normalized = $this->normalize($name);
    $labels = $this->paymentLabels();
    if (isset($labels[$normalized])) {
      return $labels[$normalized];
    }

    $name = preg_replace('/\s+/', ' ', $name);
    return mb_convert_case($name, MB_CASE_TITLE, 'UTF-8');
  }

  protected function resolveSalesAccountForPayment(PDO $conn, int $tenantId, string $paymentName): ?array
  {
    $accountName = $this->displayPaymentName($paymentName);
    $account = $this->findAccountByName($conn, $tenantId, $accountName);
    if ($account) {
      if ((int) ($account['active'] ?? 1) !== 1) {
        $stmt = $conn->prepare("
          UPDATE financial_accounts
          SET active = 1, updated_at = NOW()
          WHERE id = ? AND tenant_id = ?
          LIMIT 1
        ");
        $stmt->execute([(int) $account['id'], $tenantId]);
        $account['active'] = 1;
      }
      return $account;
    }

    $stmt = $conn->prepare("
      INSERT INTO financial_accounts
        (tenant_id, name, initial_balance, current_balance, active, created_at)
      VALUES (?, ?, 0, 0, 1, NOW())
    ");
    $stmt->execute([$tenantId, $accountName]);
    return FinancialAccount::find($conn, (int) $conn->lastInsertId(), $tenantId);
  }

  protected function findPaymentMethodByName(PDO $conn, int $tenantId, string $name): ?array
  {
    $stmt = $conn->prepare("
      SELECT *
      FROM payment_methods
      WHERE tenant_id = ? AND LOWER(name) = LOWER(?)
      ORDER BY id ASC
      LIMIT 1
    ");
    $stmt->execute([$tenantId, $name]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
  }

  protected function resolvePaymentMethod(PDO $conn, int $tenantId, string $name): ?array
  {
    $name = $this->displayPaymentName($name);

    $paymentMethod = $this->findPaymentMethodByName($conn, $tenantId, $name);
    if ($paymentMethod) {
      return $paymentMethod;
    }

    $stmt = $conn->prepare("
      INSERT INTO payment_methods
        (tenant_id, name, active, created_at)
      VALUES (?, ?, 1, NOW())
    ");
    $stmt->execute([$tenantId, $name]);
    return PaymentMethod::find($conn, (int) $conn->lastInsertId(), $tenantId);
  }

  protected function fetchOrder(PDO $conn, int $tenantId, int $orderId): ?array
  {
    $stmt = $conn->prepare("
      SELECT id, loja_id, status, total, forma_pagamento, criado_em
      FROM pedidos
      WHERE id = ? AND loja_id = ?
      LIMIT 1
    ");
    $stmt->execute([$orderId, $tenantId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
  }

  protected function isCanceledStatus(string $status): bool
  {
    $normalized = $this->normalize($status);
    return in_array($normalized, ['cancelado', 'cancelada'], true);
  }

  protected function canGenerateRevenue(array $order): bool
  {
    $status = (string) ($order['status'] ?? '');
    if ($this->isCanceledStatus($status)) {
      return false;
    }
    return (float) ($order['total'] ?? 0) > 0;
  }

  protected function fetchOrderPayments(PDO $conn, int $tenantId, int $orderId): array
  {
    $stmt = $conn->prepare("
      SELECT forma, SUM(valor) AS valor
      FROM pedido_pagamentos
      WHERE pedido_id = ? AND loja_id = ?
      GROUP BY forma
      ORDER BY forma ASC
    ");
    $stmt->execute([$orderId, $tenantId]);
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return is_array($payments) ? $payments : [];
  }

  protected function fetchExistingOrderTransactions(PDO $conn, int $tenantId, int $orderId): array
  {
    $description = 'Receita gerada pela venda #' . $orderId;
    $legacyNotes = '[pedido_finalizado:' . $orderId . '][forma:%';
    $stmt = $conn->prepare("
      SELECT *
      FROM financial_transactions
      WHERE tenant_id = ?
        AND type = 'income'
        AND (
          order_id = ?
          OR description = ?
          OR notes LIKE ?
        )
      ORDER BY id ASC
    ");
    $stmt->execute([$tenantId, $orderId, $description, $legacyNotes]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return is_array($rows) ? $rows : [];
  }

  protected function buildDesiredTransactions(PDO $conn, int $tenantId, array $order): array
  {
    $category = $this->resolveSalesCategory($conn, $tenantId);
    if (!$category) {
      return [];
    }

    // Usa a data armazenada diretamente no timezone local para evitar
    // que meia-noite UTC vire o dia anterior em Fortaleza (UTC-3)
    $tz = new DateTimeZone('America/Fortaleza');
    $date = !empty($order['criado_em']) ? substr((string) $order['criado_em'], 0, 10) : (new DateTimeImmutable('now', $tz))->format('Y-m-d');
    $referenceDate = new DateTimeImmutable($date . ' 12:00:00', $tz);
    $payments = $this->fetchOrderPayments($conn, $tenantId, (int) $order['id']);

    if (!$payments) {
      $payments = [[
        'forma' => (string) ($order['forma_pagamento'] ?? 'Venda'),
        'valor' => (float) ($order['total'] ?? 0),
      ]];
    }

    $desired = [];
    foreach ($payments as $payment) {
      $amount = round((float) ($payment['valor'] ?? 0), 2);
      if ($amount <= 0) {
        continue;
      }
      $paymentName = trim((string) ($payment['forma'] ?? 'Venda'));
      if ($this->normalize($paymentName) === 'fiado') {
        continue;
      }
      $account = $this->resolveSalesAccountForPayment($conn, $tenantId, $paymentName);
      $paymentMethod = $this->resolvePaymentMethod($conn, $tenantId, $paymentName);
      if (!$paymentMethod || !$account) {
        continue;
      }

      $paymentLabel = $this->displayPaymentName($paymentName);

      $desired[(string) $paymentMethod['id']] = [
        'order_id' => (int) $order['id'],
        'account_id' => (int) $account['id'],
        'category_id' => (int) $category['id'],
        'payment_method_id' => (int) $paymentMethod['id'],
        'type' => 'income',
        'description' => 'Receita gerada pela venda #' . calcCodigoDisplay((int) $order['id'], getPedidoCodigoBase($conn, $tenantId)),
        'amount' => $amount,
        'transaction_date' => $date,
        'reference_month' => (int) $referenceDate->format('n'),
        'reference_year' => (int) $referenceDate->format('Y'),
        'notes' => 'Integracao automatica de vendas - ' . $paymentLabel,
      ];
    }

    return $desired;
  }

  public function syncOrderRevenue(PDO $conn, int $tenantId, int $orderId): array
  {
    $order = $this->fetchOrder($conn, $tenantId, $orderId);
    if (!$order || !$this->canGenerateRevenue($order)) {
      return ['created' => 0, 'updated' => 0, 'deleted' => 0];
    }

    $desired = $this->buildDesiredTransactions($conn, $tenantId, $order);
    if (!$desired) {
      return ['created' => 0, 'updated' => 0, 'deleted' => 0];
    }

    $existing = $this->fetchExistingOrderTransactions($conn, $tenantId, $orderId);
    $existingByMethod = [];
    foreach ($existing as $item) {
      $existingByMethod[(string) ((int) ($item['payment_method_id'] ?? 0))] = $item;
    }

    $created = 0;
    $updated = 0;
    $deleted = 0;

    foreach ($desired as $methodKey => $payload) {
      $current = $existingByMethod[$methodKey] ?? null;
      if ($current) {
        FinancialTransaction::update($conn, (int) $current['id'], $tenantId, $payload);
        $updated++;
        unset($existingByMethod[$methodKey]);
      } else {
        FinancialTransaction::create($conn, $tenantId, $payload);
        $created++;
      }
    }

    foreach ($existingByMethod as $stale) {
      FinancialTransaction::delete($conn, (int) $stale['id'], $tenantId);
      $deleted++;
    }

    return ['created' => $created, 'updated' => $updated, 'deleted' => $deleted];
  }

  public function syncFinalizedOrder(PDO $conn, int $tenantId, int $orderId): array
  {
    return $this->syncOrderRevenue($conn, $tenantId, $orderId);
  }

  public function reverseCanceledOrder(PDO $conn, int $tenantId, int $orderId): array
  {
    $existing = $this->fetchExistingOrderTransactions($conn, $tenantId, $orderId);
    $deleted = 0;
    foreach ($existing as $item) {
      if (FinancialTransaction::delete($conn, (int) $item['id'], $tenantId)) {
        $deleted++;
      }
    }
    return ['deleted' => $deleted];
  }

  public function recordFiadoPayment(PDO $conn, int $tenantId, array $payment): array
  {
    $valor = round((float) ($payment['valor'] ?? 0), 2);
    if ($valor <= 0) {
      return ['created' => 0];
    }

    $category = $this->resolveSalesCategory($conn, $tenantId);
    if (!$category) {
      return ['created' => 0];
    }

    $paymentName = trim((string) ($payment['forma'] ?? 'outro'));
    $account = $this->resolveSalesAccountForPayment($conn, $tenantId, $paymentName);
    $paymentMethod = $this->resolvePaymentMethod($conn, $tenantId, $paymentName);
    if (!$account || !$paymentMethod) {
      return ['created' => 0];
    }

    $tz = new DateTimeZone('America/Fortaleza');
    $date = trim((string) ($payment['data'] ?? '')) ?: (new DateTimeImmutable('now', $tz))->format('Y-m-d');
    $referenceDate = new DateTimeImmutable($date . ' 12:00:00', $tz);
    $clienteNome = trim((string) ($payment['cliente_nome'] ?? ''));
    $fiadoLancamentoId = (int) ($payment['fiado_lancamento_id'] ?? 0);

    $payload = [
      'order_id' => null,
      'account_id' => (int) $account['id'],
      'category_id' => (int) $category['id'],
      'payment_method_id' => (int) $paymentMethod['id'],
      'type' => 'income',
      'description' => 'Recebimento de fiado' . ($clienteNome !== '' ? ' - ' . $clienteNome : ''),
      'amount' => $valor,
      'transaction_date' => $date,
      'reference_month' => (int) $referenceDate->format('n'),
      'reference_year' => (int) $referenceDate->format('Y'),
      'notes' => 'Integracao automatica de fiado - ' . $this->displayPaymentName($paymentName)
        . ($fiadoLancamentoId ? ' [fiado_lancamento:' . $fiadoLancamentoId . ']' : ''),
    ];

    FinancialTransaction::create($conn, $tenantId, $payload);
    return ['created' => 1];
  }
}
