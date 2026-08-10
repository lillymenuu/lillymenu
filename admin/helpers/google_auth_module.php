<?php

if (!function_exists('googleAuthColumnExists')) {
  function googleAuthColumnExists(PDO $conn, string $table, string $column): bool
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

if (!function_exists('googleAuthEnsureModule')) {
  function googleAuthEnsureModule(PDO $conn): void
  {
    try {
      if (!googleAuthColumnExists($conn, 'admins', 'google_id')) {
        $conn->exec("ALTER TABLE admins ADD COLUMN google_id VARCHAR(64) NULL AFTER senha, ADD INDEX idx_admins_google_id (google_id)");
      }
    } catch (Throwable $e) {
    }
  }
}
