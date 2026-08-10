<?php

if (!function_exists('motoboyTableExists')) {
  function motoboyTableExists(PDO $conn, string $table): bool
  {
    try {
      $stmt = $conn->prepare("SHOW TABLES LIKE ?");
      $stmt->execute([$table]);
      return (bool) $stmt->fetchColumn();
    } catch (Throwable $e) {
      return false;
    }
  }
}

if (!function_exists('motoboyColumnExists')) {
  function motoboyColumnExists(PDO $conn, string $table, string $column): bool
  {
    try {
      $stmt = $conn->prepare("SHOW COLUMNS FROM {$table} LIKE ?");
      $stmt->execute([$column]);
      return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
      return false;
    }
  }
}

if (!function_exists('motoboyRunSqlFile')) {
  function motoboyRunSqlFile(PDO $conn, string $path): void
  {
    if (!is_file($path)) return;
    $sql = (string) file_get_contents($path);
    $chunks = preg_split('/;\s*(?:\r?\n|$)/', $sql);
    foreach ($chunks as $chunk) {
      $statement = trim($chunk);
      if ($statement !== '') {
        $conn->exec($statement);
      }
    }
  }
}

if (!function_exists('motoboyEnsureModule')) {
  function motoboyEnsureModule(PDO $conn): void
  {
    static $done = false;
    if ($done) return;
    $done = true;

    motoboyRunSqlFile($conn, __DIR__ . '/../sql/create_motoboy_module.sql');

    if (motoboyTableExists($conn, 'pedidos') && !motoboyColumnExists($conn, 'pedidos', 'motoboy_id')) {
      $conn->exec("ALTER TABLE pedidos ADD COLUMN motoboy_id INT NULL AFTER cliente_id");
      $conn->exec("ALTER TABLE pedidos ADD INDEX idx_pedidos_motoboy (motoboy_id)");
    }
  }
}

if (!function_exists('motoboyTenantId')) {
  function motoboyTenantId(): int
  {
    return (int) ($_SESSION['loja_id'] ?? 1);
  }
}

if (!function_exists('motoboyFlashSet')) {
  function motoboyFlashSet(bool $ok, string $message): void
  {
    $_SESSION['motoboy_flash'] = ['ok' => $ok, 'msg' => $message];
  }
}

if (!function_exists('motoboyFlashGet')) {
  function motoboyFlashGet(): ?array
  {
    $flash = $_SESSION['motoboy_flash'] ?? null;
    unset($_SESSION['motoboy_flash']);
    return is_array($flash) ? $flash : null;
  }
}

if (!function_exists('motoboyRedirect')) {
  function motoboyRedirect(string $page, array $params = []): void
  {
    $qs = $params ? ('?' . http_build_query($params)) : '';
    header('Location: ' . $page . $qs);
    exit;
  }
}

if (!function_exists('motoboyMoney')) {
  function motoboyMoney($value): string
  {
    return 'R$ ' . number_format((float) $value, 2, ',', '.');
  }
}
