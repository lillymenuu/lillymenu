<?php
require_once __DIR__ . '/../models/FinancialCategory.php';
require_once __DIR__ . '/../requests/FinancialCategoryRequest.php';

class FinancialCategoryController
{
  public function index($conn, $tenantId, array $filters = [])
  {
    return FinancialCategory::all($conn, $tenantId, $filters['type'] ?? null, !isset($filters['active']) || (int) $filters['active'] === 1);
  }

  public function show($conn, $tenantId, $id)
  {
    return FinancialCategory::find($conn, $id, $tenantId);
  }

  public function store($conn, $tenantId, array $input)
  {
    $data = FinancialCategoryRequest::validate($conn, $tenantId, $input);
    $stmt = $conn->prepare("
      INSERT INTO financial_categories (tenant_id, name, type, parent_id, active)
      VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([
      $data['tenant_id'],
      $data['name'],
      $data['type'],
      $data['parent_id'],
      $data['active']
    ]);
    return $this->show($conn, $tenantId, (int) $conn->lastInsertId());
  }

  public function update($conn, $tenantId, $id, array $input)
  {
    $id = (int) $id;
    $data = FinancialCategoryRequest::validate($conn, $tenantId, $input, $id);
    $stmt = $conn->prepare("
      UPDATE financial_categories
      SET name = ?, type = ?, parent_id = ?, active = ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ?
      LIMIT 1
    ");
    $stmt->execute([
      $data['name'],
      $data['type'],
      $data['parent_id'],
      $data['active'],
      $id,
      (int) $tenantId
    ]);
    return $this->show($conn, $tenantId, $id);
  }

  public function destroy($conn, $tenantId, $id)
  {
    $stmt = $conn->prepare("DELETE FROM financial_categories WHERE id = ? AND tenant_id = ? LIMIT 1");
    $stmt->execute([(int) $id, (int) $tenantId]);
    return $stmt->rowCount() > 0;
  }
}
