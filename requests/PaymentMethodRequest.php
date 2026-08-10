<?php
require_once __DIR__ . '/BaseRequest.php';

class PaymentMethodRequest extends BaseRequest
{
  public static function validate($conn, $tenantId, array $input, $currentId = null)
  {
    $errors = [];
    $tenantId = (int) $tenantId;
    $currentId = $currentId ? (int) $currentId : null;

    $name = self::string($input['name'] ?? '', 'name', $errors, true, 120);
    $active = self::boolean($input['active'] ?? 1, 1);

    if ($name !== '') {
      $sql = "SELECT id FROM payment_methods WHERE tenant_id = ? AND name = ?";
      $params = [$tenantId, $name];
      if ($currentId) {
        $sql .= " AND id <> ?";
        $params[] = $currentId;
      }
      $sql .= " LIMIT 1";
      $stmt = $conn->prepare($sql);
      $stmt->execute($params);
      if ($stmt->fetchColumn()) {
        $errors['name'] = 'Já existe uma forma de pagamento com esse nome.';
      }
    }

    if ($errors) {
      self::fail($errors);
    }

    return [
      'tenant_id' => $tenantId,
      'name' => $name,
      'active' => $active,
    ];
  }
}
