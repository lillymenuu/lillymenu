<?php
require_once __DIR__ . '/BaseRequest.php';

class FinancialCategoryRequest extends BaseRequest
{
  public static function validate($conn, $tenantId, array $input, $currentId = null)
  {
    $errors = [];
    $tenantId = (int) $tenantId;
    $currentId = $currentId ? (int) $currentId : null;

    $name = self::string($input['name'] ?? '', 'name', $errors, true, 160);
    $type = self::enum($input['type'] ?? '', 'type', ['income', 'expense'], $errors, true);
    $parentId = self::integer($input['parent_id'] ?? null, 'parent_id', $errors, false, 1);
    $active = self::boolean($input['active'] ?? 1, 1);

    if ($parentId) {
      $stmt = $conn->prepare("SELECT id, type FROM financial_categories WHERE id = ? AND tenant_id = ? LIMIT 1");
      $stmt->execute([$parentId, $tenantId]);
      $parent = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$parent) {
        $errors['parent_id'] = 'Categoria pai inválida para este tenant.';
      } elseif (($parent['type'] ?? '') !== $type) {
        $errors['parent_id'] = 'A categoria pai deve ter o mesmo tipo.';
      }
    }

    if ($name !== '' && $type !== '') {
      if ($parentId) {
        $sql = "SELECT id FROM financial_categories WHERE tenant_id = ? AND name = ? AND type = ? AND parent_id = ?";
        $params = [$tenantId, $name, $type, $parentId];
      } else {
        $sql = "SELECT id FROM financial_categories WHERE tenant_id = ? AND name = ? AND type = ? AND parent_id IS NULL";
        $params = [$tenantId, $name, $type];
      }
      if ($currentId) {
        $sql .= " AND id <> ?";
        $params[] = $currentId;
      }
      $sql .= " LIMIT 1";
      $stmt = $conn->prepare($sql);
      $stmt->execute($params);
      if ($stmt->fetchColumn()) {
        $errors['name'] = 'Já existe uma categoria com esse nome e tipo.';
      }
    }

    if ($errors) {
      self::fail($errors);
    }

    return [
      'tenant_id' => $tenantId,
      'name' => $name,
      'type' => $type,
      'parent_id' => $parentId ?: null,
      'active' => $active,
    ];
  }
}
