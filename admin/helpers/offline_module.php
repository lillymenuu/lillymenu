<?php

if (!function_exists('offlineTableExists')) {
  function offlineTableExists(PDO $conn, string $table): bool
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

if (!function_exists('offlineColumnExists')) {
  function offlineColumnExists(PDO $conn, string $table, string $column): bool
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

if (!function_exists('offlineEnsureModule')) {
  function offlineEnsureModule(PDO $conn): void
  {
    static $done = false;
    if ($done) return;
    $done = true;

    if (offlineTableExists($conn, 'pedidos') && !offlineColumnExists($conn, 'pedidos', 'offline_uuid')) {
      $conn->exec("ALTER TABLE pedidos ADD COLUMN offline_uuid VARCHAR(36) NULL AFTER caixa_id");
      $conn->exec("ALTER TABLE pedidos ADD UNIQUE INDEX idx_pedidos_offline_uuid (offline_uuid)");
    }
  }
}
