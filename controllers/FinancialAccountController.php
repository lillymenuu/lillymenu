<?php
require_once __DIR__ . '/../models/FinancialAccount.php';
require_once __DIR__ . '/../requests/FinancialAccountRequest.php';

class FinancialAccountController
{
  public function index($conn, $tenantId, array $filters = [])
  {
    return FinancialAccount::all($conn, $tenantId, !isset($filters['active']) || (int) $filters['active'] === 1);
  }

  public function show($conn, $tenantId, $id)
  {
    return FinancialAccount::find($conn, $id, $tenantId);
  }

  public function store($conn, $tenantId, array $input)
  {
    $data = FinancialAccountRequest::validate($conn, $tenantId, $input);
    $stmt = $conn->prepare("
      INSERT INTO financial_accounts (tenant_id, name, initial_balance, current_balance, active)
      VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([
      $data['tenant_id'],
      $data['name'],
      $data['initial_balance'],
      $data['current_balance'],
      $data['active']
    ]);
    return $this->show($conn, $tenantId, (int) $conn->lastInsertId());
  }

  public function update($conn, $tenantId, $id, array $input)
  {
    $id = (int) $id;
    $data = FinancialAccountRequest::validate($conn, $tenantId, $input, $id);
    $stmt = $conn->prepare("
      UPDATE financial_accounts
      SET name = ?, initial_balance = ?, current_balance = ?, active = ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ?
      LIMIT 1
    ");
    $stmt->execute([
      $data['name'],
      $data['initial_balance'],
      $data['current_balance'],
      $data['active'],
      $id,
      (int) $tenantId
    ]);
    return $this->show($conn, $tenantId, $id);
  }

  public function destroy($conn, $tenantId, $id)
  {
    $stmt = $conn->prepare("DELETE FROM financial_accounts WHERE id = ? AND tenant_id = ? LIMIT 1");
    $stmt->execute([(int) $id, (int) $tenantId]);
    return $stmt->rowCount() > 0;
  }
}
