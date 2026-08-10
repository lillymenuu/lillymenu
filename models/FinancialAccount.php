<?php

class FinancialAccount
{
  public static function all($conn, $tenantId, $onlyActive = true)
  {
    $sql = "SELECT * FROM financial_accounts WHERE tenant_id = ?";
    $params = [(int) $tenantId];
    if ($onlyActive) {
      $sql .= " AND active = 1";
    }
    $sql .= " ORDER BY name ASC";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public static function find($conn, $id, $tenantId)
  {
    $stmt = $conn->prepare("SELECT * FROM financial_accounts WHERE id = ? AND tenant_id = ? LIMIT 1");
    $stmt->execute([(int) $id, (int) $tenantId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
  }

  public static function updateBalance($conn, $id, $tenantId, $newBalance)
  {
    $stmt = $conn->prepare("
      UPDATE financial_accounts
      SET current_balance = ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ?
      LIMIT 1
    ");
    $stmt->execute([
      (float) $newBalance,
      (int) $id,
      (int) $tenantId
    ]);

    return $stmt->rowCount() > 0;
  }

  public static function applyImpact($conn, $accountId, $tenantId, $type, $amount)
  {
    $account = self::find($conn, $accountId, $tenantId);
    if (!$account) {
      throw new RuntimeException('Conta financeira não encontrada para este tenant.');
    }

    $amount = (float) $amount;
    $balance = (float) ($account['current_balance'] ?? 0);

    if ($type === 'income') {
      $balance += $amount;
    } elseif ($type === 'expense') {
      $balance -= $amount;
    } else {
      throw new InvalidArgumentException('Tipo de transação inválido.');
    }

    self::updateBalance($conn, $accountId, $tenantId, $balance);
    return $balance;
  }

  public static function reverseImpact($conn, $accountId, $tenantId, $type, $amount)
  {
    $account = self::find($conn, $accountId, $tenantId);
    if (!$account) {
      throw new RuntimeException('Conta financeira não encontrada para este tenant.');
    }

    $amount = (float) $amount;
    $balance = (float) ($account['current_balance'] ?? 0);

    if ($type === 'income') {
      $balance -= $amount;
    } elseif ($type === 'expense') {
      $balance += $amount;
    } else {
      throw new InvalidArgumentException('Tipo de transação inválido.');
    }

    self::updateBalance($conn, $accountId, $tenantId, $balance);
    return $balance;
  }

  public static function transactions($conn, array $account)
  {
    $accountId = (int) ($account['id'] ?? 0);
    $tenantId = (int) ($account['tenant_id'] ?? 0);
    if ($accountId <= 0 || $tenantId <= 0) {
      return [];
    }
    return FinancialTransaction::byAccount($conn, $accountId, $tenantId);
  }
}
