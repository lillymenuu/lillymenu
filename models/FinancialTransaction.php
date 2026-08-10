<?php

require_once __DIR__ . '/FinancialAccount.php';
require_once __DIR__ . '/FinancialCategory.php';
require_once __DIR__ . '/PaymentMethod.php';

class FinancialTransaction
{
  protected static function normalizePayload(array $data)
  {
    $transactionDate = trim((string) ($data['transaction_date'] ?? ''));
    if ($transactionDate === '') {
      throw new InvalidArgumentException('A data da transação é obrigatória.');
    }

    $month = isset($data['reference_month']) && (int) $data['reference_month'] > 0
      ? (int) $data['reference_month']
      : (int) date('n', strtotime($transactionDate));

    $year = isset($data['reference_year']) && (int) $data['reference_year'] > 0
      ? (int) $data['reference_year']
      : (int) date('Y', strtotime($transactionDate));

    return [
      'order_id' => !empty($data['order_id']) ? (int) $data['order_id'] : null,
      'account_id' => (int) ($data['account_id'] ?? 0),
      'category_id' => (int) ($data['category_id'] ?? 0),
      'payment_method_id' => !empty($data['payment_method_id']) ? (int) $data['payment_method_id'] : null,
      'type' => (string) ($data['type'] ?? ''),
      'description' => trim((string) ($data['description'] ?? '')),
      'amount' => (float) ($data['amount'] ?? 0),
      'transaction_date' => $transactionDate,
      'reference_month' => $month,
      'reference_year' => $year,
      'notes' => isset($data['notes']) && $data['notes'] !== '' ? trim((string) $data['notes']) : null,
    ];
  }

  protected static function validatePayload($conn, $tenantId, array $data)
  {
    if ($data['account_id'] <= 0) {
      throw new InvalidArgumentException('Conta financeira inválida.');
    }
    if ($data['category_id'] <= 0) {
      throw new InvalidArgumentException('Categoria financeira inválida.');
    }
    if ($data['description'] === '') {
      throw new InvalidArgumentException('Descrição obrigatória.');
    }
    if ($data['amount'] <= 0) {
      throw new InvalidArgumentException('Valor da transação deve ser maior que zero.');
    }
    if ($data['type'] !== 'income' && $data['type'] !== 'expense') {
      throw new InvalidArgumentException('Tipo da transação inválido.');
    }

    if (!FinancialAccount::find($conn, $data['account_id'], $tenantId)) {
      throw new RuntimeException('Conta não pertence a este tenant.');
    }

    $category = FinancialCategory::find($conn, $data['category_id'], $tenantId);
    if (!$category) {
      throw new RuntimeException('Categoria não pertence a este tenant.');
    }
    if (($category['type'] ?? null) !== $data['type']) {
      throw new RuntimeException('Categoria incompatível com o tipo da transação.');
    }

    if (!empty($data['payment_method_id']) && !PaymentMethod::find($conn, $data['payment_method_id'], $tenantId)) {
      throw new RuntimeException('Forma de pagamento não pertence a este tenant.');
    }
  }

  public static function all($conn, $tenantId, array $filters = [])
  {
    $where = ["tenant_id = ?"];
    $params = [(int) $tenantId];

    if (!empty($filters['type'])) {
      $where[] = "type = ?";
      $params[] = $filters['type'];
    }
    if (!empty($filters['account_id'])) {
      $where[] = "account_id = ?";
      $params[] = (int) $filters['account_id'];
    }
    if (!empty($filters['category_id'])) {
      $where[] = "category_id = ?";
      $params[] = (int) $filters['category_id'];
    }
    if (!empty($filters['payment_method_id'])) {
      $where[] = "payment_method_id = ?";
      $params[] = (int) $filters['payment_method_id'];
    }
    if (!empty($filters['order_id'])) {
      $where[] = "order_id = ?";
      $params[] = (int) $filters['order_id'];
    }
    if (!empty($filters['reference_month'])) {
      $where[] = "reference_month = ?";
      $params[] = (int) $filters['reference_month'];
    }
    if (!empty($filters['reference_year'])) {
      $where[] = "reference_year = ?";
      $params[] = (int) $filters['reference_year'];
    }
    if (!empty($filters['date_from'])) {
      $where[] = "transaction_date >= ?";
      $params[] = $filters['date_from'];
    }
    if (!empty($filters['date_to'])) {
      $where[] = "transaction_date <= ?";
      $params[] = $filters['date_to'];
    }

    $sql = "SELECT * FROM financial_transactions WHERE " . implode(' AND ', $where) . " ORDER BY transaction_date DESC, id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public static function find($conn, $id, $tenantId)
  {
    $stmt = $conn->prepare("SELECT * FROM financial_transactions WHERE id = ? AND tenant_id = ? LIMIT 1");
    $stmt->execute([(int) $id, (int) $tenantId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
  }

  public static function create($conn, $tenantId, array $payload)
  {
    $tenantId = (int) $tenantId;
    $data = self::normalizePayload($payload);
    self::validatePayload($conn, $tenantId, $data);

    try {
      $conn->beginTransaction();

      $stmt = $conn->prepare("
        INSERT INTO financial_transactions (
          tenant_id, order_id, account_id, category_id, payment_method_id, type,
          description, amount, transaction_date, reference_month, reference_year, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ");
      $stmt->execute([
        $tenantId,
        $data['order_id'],
        $data['account_id'],
        $data['category_id'],
        $data['payment_method_id'],
        $data['type'],
        $data['description'],
        $data['amount'],
        $data['transaction_date'],
        $data['reference_month'],
        $data['reference_year'],
        $data['notes']
      ]);

      FinancialAccount::applyImpact($conn, $data['account_id'], $tenantId, $data['type'], $data['amount']);

      $id = (int) $conn->lastInsertId();
      $conn->commit();
      return self::find($conn, $id, $tenantId);
    } catch (Throwable $e) {
      if ($conn->inTransaction()) {
        $conn->rollBack();
      }
      throw $e;
    }
  }

  public static function update($conn, $id, $tenantId, array $payload)
  {
    $tenantId = (int) $tenantId;
    $id = (int) $id;
    $current = self::find($conn, $id, $tenantId);
    if (!$current) {
      throw new RuntimeException('Transação financeira não encontrada para este tenant.');
    }

    $data = self::normalizePayload($payload);
    self::validatePayload($conn, $tenantId, $data);

    try {
      $conn->beginTransaction();

      FinancialAccount::reverseImpact(
        $conn,
        (int) $current['account_id'],
        $tenantId,
        (string) $current['type'],
        (float) $current['amount']
      );

      $stmt = $conn->prepare("
        UPDATE financial_transactions
        SET order_id = ?, account_id = ?, category_id = ?, payment_method_id = ?, type = ?,
            description = ?, amount = ?, transaction_date = ?, reference_month = ?,
            reference_year = ?, notes = ?, updated_at = NOW()
        WHERE id = ? AND tenant_id = ?
        LIMIT 1
      ");
      $stmt->execute([
        $data['order_id'],
        $data['account_id'],
        $data['category_id'],
        $data['payment_method_id'],
        $data['type'],
        $data['description'],
        $data['amount'],
        $data['transaction_date'],
        $data['reference_month'],
        $data['reference_year'],
        $data['notes'],
        $id,
        $tenantId
      ]);

      FinancialAccount::applyImpact($conn, $data['account_id'], $tenantId, $data['type'], $data['amount']);

      $conn->commit();
      return self::find($conn, $id, $tenantId);
    } catch (Throwable $e) {
      if ($conn->inTransaction()) {
        $conn->rollBack();
      }
      throw $e;
    }
  }

  public static function delete($conn, $id, $tenantId)
  {
    $tenantId = (int) $tenantId;
    $id = (int) $id;
    $current = self::find($conn, $id, $tenantId);
    if (!$current) {
      return false;
    }

    try {
      $conn->beginTransaction();

      $stmt = $conn->prepare("
        DELETE FROM financial_transactions
        WHERE id = ? AND tenant_id = ?
        LIMIT 1
      ");
      $stmt->execute([$id, $tenantId]);

      FinancialAccount::reverseImpact(
        $conn,
        (int) $current['account_id'],
        $tenantId,
        (string) $current['type'],
        (float) $current['amount']
      );

      $conn->commit();
      return true;
    } catch (Throwable $e) {
      if ($conn->inTransaction()) {
        $conn->rollBack();
      }
      throw $e;
    }
  }

  public static function byAccount($conn, $accountId, $tenantId)
  {
    return self::all($conn, $tenantId, ['account_id' => (int) $accountId]);
  }

  public static function byCategory($conn, $categoryId, $tenantId)
  {
    return self::all($conn, $tenantId, ['category_id' => (int) $categoryId]);
  }

  public static function byPaymentMethod($conn, $paymentMethodId, $tenantId)
  {
    return self::all($conn, $tenantId, ['payment_method_id' => (int) $paymentMethodId]);
  }

  public static function byOrder($conn, $orderId, $tenantId, ?string $type = null)
  {
    $filters = ['order_id' => (int) $orderId];
    if ($type === 'income' || $type === 'expense') {
      $filters['type'] = $type;
    }
    return self::all($conn, $tenantId, $filters);
  }

  public static function account($conn, array $transaction)
  {
    $accountId = (int) ($transaction['account_id'] ?? 0);
    $tenantId = (int) ($transaction['tenant_id'] ?? 0);
    if ($accountId <= 0 || $tenantId <= 0) {
      return null;
    }
    return FinancialAccount::find($conn, $accountId, $tenantId);
  }

  public static function category($conn, array $transaction)
  {
    $categoryId = (int) ($transaction['category_id'] ?? 0);
    $tenantId = (int) ($transaction['tenant_id'] ?? 0);
    if ($categoryId <= 0 || $tenantId <= 0) {
      return null;
    }
    return FinancialCategory::find($conn, $categoryId, $tenantId);
  }

  public static function paymentMethod($conn, array $transaction)
  {
    $paymentMethodId = (int) ($transaction['payment_method_id'] ?? 0);
    $tenantId = (int) ($transaction['tenant_id'] ?? 0);
    if ($paymentMethodId <= 0 || $tenantId <= 0) {
      return null;
    }
    return PaymentMethod::find($conn, $paymentMethodId, $tenantId);
  }
}
