<?php
require_once __DIR__ . '/../models/PaymentMethod.php';
require_once __DIR__ . '/../requests/PaymentMethodRequest.php';

class PaymentMethodController
{
  public function index($conn, $tenantId, array $filters = [])
  {
    return PaymentMethod::all($conn, $tenantId, !isset($filters['active']) || (int) $filters['active'] === 1);
  }

  public function show($conn, $tenantId, $id)
  {
    return PaymentMethod::find($conn, $id, $tenantId);
  }

  public function store($conn, $tenantId, array $input)
  {
    $data = PaymentMethodRequest::validate($conn, $tenantId, $input);
    $stmt = $conn->prepare("
      INSERT INTO payment_methods (tenant_id, name, active)
      VALUES (?, ?, ?)
    ");
    $stmt->execute([
      $data['tenant_id'],
      $data['name'],
      $data['active']
    ]);
    return $this->show($conn, $tenantId, (int) $conn->lastInsertId());
  }

  public function update($conn, $tenantId, $id, array $input)
  {
    $id = (int) $id;
    $data = PaymentMethodRequest::validate($conn, $tenantId, $input, $id);
    $stmt = $conn->prepare("
      UPDATE payment_methods
      SET name = ?, active = ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ?
      LIMIT 1
    ");
    $stmt->execute([
      $data['name'],
      $data['active'],
      $id,
      (int) $tenantId
    ]);
    return $this->show($conn, $tenantId, $id);
  }

  public function destroy($conn, $tenantId, $id)
  {
    $stmt = $conn->prepare("DELETE FROM payment_methods WHERE id = ? AND tenant_id = ? LIMIT 1");
    $stmt->execute([(int) $id, (int) $tenantId]);
    return $stmt->rowCount() > 0;
  }
}
