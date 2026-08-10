<?php

if (!function_exists('listaTransmissaoTableExists')) {
  function listaTransmissaoTableExists(PDO $conn, string $table): bool
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

if (!function_exists('listaTransmissaoRunSqlFile')) {
  function listaTransmissaoRunSqlFile(PDO $conn, string $path): void
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

if (!function_exists('listaTransmissaoEnsureModule')) {
  function listaTransmissaoEnsureModule(PDO $conn): void
  {
    static $done = false;
    if ($done) return;
    $done = true;

    if (!listaTransmissaoTableExists($conn, 'listas_transmissao')) {
      listaTransmissaoRunSqlFile($conn, __DIR__ . '/../sql/create_lista_transmissao_module.sql');
    }
  }
}

if (!function_exists('listaTransmissaoTenantId')) {
  function listaTransmissaoTenantId(): int
  {
    return (int) ($_SESSION['loja_id'] ?? 1);
  }
}
