<?php

class PaymentMethod
{
  public static function all($conn, $tenantId, $onlyActive = true)
  {
    $sql = "SELECT * FROM payment_methods WHERE tenant_id = ?";
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
    $stmt = $conn->prepare("SELECT * FROM payment_methods WHERE id = ? AND tenant_id = ? LIMIT 1");
    $stmt->execute([(int) $id, (int) $tenantId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
  }

  public static function transactions($conn, array $paymentMethod)
  {
    $paymentMethodId = (int) ($paymentMethod['id'] ?? 0);
    $tenantId = (int) ($paymentMethod['tenant_id'] ?? 0);
    if ($paymentMethodId <= 0 || $tenantId <= 0) {
      return [];
    }
    return FinancialTransaction::byPaymentMethod($conn, $paymentMethodId, $tenantId);
  }
}
