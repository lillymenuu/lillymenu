<?php

class FinancialCategory
{
  public static function all($conn, $tenantId, $type = null, $onlyActive = true)
  {
    $sql = "SELECT * FROM financial_categories WHERE tenant_id = ?";
    $params = [(int) $tenantId];
    if ($type === 'income' || $type === 'expense') {
      $sql .= " AND type = ?";
      $params[] = $type;
    }
    if ($onlyActive) {
      $sql .= " AND active = 1";
    }
    $sql .= " ORDER BY parent_id IS NULL DESC, parent_id ASC, name ASC";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public static function roots($conn, $tenantId, $type = null, $onlyActive = true)
  {
    $sql = "SELECT * FROM financial_categories WHERE tenant_id = ? AND parent_id IS NULL";
    $params = [(int) $tenantId];
    if ($type === 'income' || $type === 'expense') {
      $sql .= " AND type = ?";
      $params[] = $type;
    }
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
    $stmt = $conn->prepare("SELECT * FROM financial_categories WHERE id = ? AND tenant_id = ? LIMIT 1");
    $stmt->execute([(int) $id, (int) $tenantId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
  }

  public static function children($conn, $parentId, $tenantId, $onlyActive = true)
  {
    $sql = "SELECT * FROM financial_categories WHERE parent_id = ? AND tenant_id = ?";
    $params = [(int) $parentId, (int) $tenantId];
    if ($onlyActive) {
      $sql .= " AND active = 1";
    }
    $sql .= " ORDER BY name ASC";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public static function parent($conn, array $category)
  {
    $parentId = (int) ($category['parent_id'] ?? 0);
    $tenantId = (int) ($category['tenant_id'] ?? 0);
    if ($parentId <= 0 || $tenantId <= 0) {
      return null;
    }
    return self::find($conn, $parentId, $tenantId);
  }

  public static function transactions($conn, array $category)
  {
    $categoryId = (int) ($category['id'] ?? 0);
    $tenantId = (int) ($category['tenant_id'] ?? 0);
    if ($categoryId <= 0 || $tenantId <= 0) {
      return [];
    }
    return FinancialTransaction::byCategory($conn, $categoryId, $tenantId);
  }
}
