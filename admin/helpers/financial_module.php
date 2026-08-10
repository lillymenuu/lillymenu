<?php

require_once __DIR__ . '/../../services/SaleFinancialIntegrationService.php';

if (!function_exists('financialTableExists')) {
  function financialTableExists(PDO $conn, string $table): bool
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

if (!function_exists('financialRunSqlFile')) {
  function financialRunSqlFile(PDO $conn, string $path): void
  {
    if (!is_file($path)) {
      return;
    }
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

if (!function_exists('financialColumnExists')) {
  function financialColumnExists(PDO $conn, string $table, string $column): bool
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

if (!function_exists('financialEnsureModule')) {
  function financialEnsureModule(PDO $conn): void
  {
    static $done = false;
    if ($done) {
      return;
    }
    $done = true;

    financialRunSqlFile($conn, __DIR__ . '/../sql/create_financial_module.sql');
    financialRunSqlFile($conn, __DIR__ . '/../sql/seed_financial_categories.sql');

    if (financialTableExists($conn, 'financial_transactions') && !financialColumnExists($conn, 'financial_transactions', 'order_id')) {
      $conn->exec("ALTER TABLE financial_transactions ADD COLUMN order_id INT NULL AFTER tenant_id");
      $conn->exec("ALTER TABLE financial_transactions ADD INDEX idx_financial_transactions_order (order_id)");
      $conn->exec("
        ALTER TABLE financial_transactions
        ADD UNIQUE KEY uniq_financial_transactions_sale_payment_type (
          tenant_id,
          order_id,
          payment_method_id,
          type
        )
      ");
    }
  }
}

if (!function_exists('financialTenantId')) {
  function financialTenantId(): int
  {
    return (int) ($_SESSION['loja_id'] ?? 1);
  }
}

if (!function_exists('financialNow')) {
  function financialNow(): DateTimeImmutable
  {
    return new DateTimeImmutable('now', new DateTimeZone('America/Fortaleza'));
  }
}

if (!function_exists('financialToday')) {
  function financialToday(): string
  {
    return financialNow()->format('Y-m-d');
  }
}

if (!function_exists('financialCurrentMonth')) {
  function financialCurrentMonth(): int
  {
    return (int) financialNow()->format('n');
  }
}

if (!function_exists('financialCurrentYear')) {
  function financialCurrentYear(): int
  {
    return (int) financialNow()->format('Y');
  }
}

if (!function_exists('financialFlashSet')) {
  function financialFlashSet(bool $ok, string $message): void
  {
    $_SESSION['financial_flash'] = ['ok' => $ok, 'msg' => $message];
  }
}

if (!function_exists('financialFlashGet')) {
  function financialFlashGet(): ?array
  {
    $flash = $_SESSION['financial_flash'] ?? null;
    unset($_SESSION['financial_flash']);
    return is_array($flash) ? $flash : null;
  }
}

if (!function_exists('financialRedirect')) {
  function financialRedirect(string $page, array $params = []): void
  {
    $qs = $params ? ('?' . http_build_query($params)) : '';
    header('Location: ' . $page . $qs);
    exit;
  }
}

if (!function_exists('financialMoney')) {
  function financialMoney($value): string
  {
    return 'R$ ' . number_format((float) $value, 2, ',', '.');
  }
}

if (!function_exists('financialMonthLabel')) {
  function financialMonthLabel(int $month): string
  {
    $labels = [
      1 => 'Jan', 2 => 'Fev', 3 => 'Mar', 4 => 'Abr',
      5 => 'Mai', 6 => 'Jun', 7 => 'Jul', 8 => 'Ago',
      9 => 'Set', 10 => 'Out', 11 => 'Nov', 12 => 'Dez'
    ];
    return $labels[$month] ?? (string) $month;
  }
}

if (!function_exists('financialYearOptions')) {
  function financialYearOptions(PDO $conn, int $tenantId): array
  {
    if (!financialTableExists($conn, 'financial_transactions')) {
      return [financialCurrentYear()];
    }
    try {
      $stmt = $conn->prepare("
        SELECT DISTINCT reference_year
        FROM financial_transactions
        WHERE tenant_id = ?
        ORDER BY reference_year DESC
      ");
      $stmt->execute([$tenantId]);
      $years = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
      if (!$years) {
        $years = [financialCurrentYear()];
      }
      for ($year = financialCurrentYear(); $year <= 2030; $year++) {
        if (!in_array($year, $years, true)) {
          $years[] = $year;
        }
      }
      rsort($years);
      return $years;
    } catch (Throwable $e) {
      $years = [financialCurrentYear()];
      for ($year = financialCurrentYear() + 1; $year <= 2030; $year++) {
        $years[] = $year;
      }
      return $years;
    }
  }
}

if (!function_exists('financialSyncCurrentMonthSalesIfNeeded')) {
  function financialSyncCurrentMonthSalesIfNeeded(PDO $conn, int $tenantId, int $referenceMonth, int $referenceYear): void
  {
    /* Só faz sentido sincronizar o mês atual */
    if ($referenceMonth !== financialCurrentMonth() || $referenceYear !== financialCurrentYear()) {
      return;
    }

    /* Throttle por processo: evita múltiplas sincronizações na mesma requisição */
    static $syncedKeys = [];
    $key = $tenantId . ':' . $referenceMonth . ':' . $referenceYear;
    if (isset($syncedKeys[$key])) {
      return;
    }
    $syncedKeys[$key] = true;

    /* Throttle persistente: só sincroniza a cada 5 minutos por loja */
    $throttleChave = 'fin_sync_last_' . $referenceMonth . '_' . $referenceYear;
    try {
      $stmtLast = $conn->prepare(
        "SELECT valor FROM configuracoes WHERE chave = ? AND loja_id = ? LIMIT 1"
      );
      $stmtLast->execute([$throttleChave, $tenantId]);
      $lastSync = $stmtLast->fetchColumn();
      if ($lastSync !== false && (time() - (int)$lastSync) < 300) {
        return; /* sincronizado há menos de 5 minutos */
      }
    } catch (Throwable $e) { /* tabela pode não ter o campo */ }

    /* Executa o sync */
    try {
      $service = new SaleFinancialIntegrationService();
      $service->syncFinalizedOrdersForPeriod($conn, $tenantId, $referenceMonth, $referenceYear);

      /* Atualiza timestamp do último sync */
      try {
        $stmtChk = $conn->prepare("SELECT COUNT(*) FROM configuracoes WHERE chave=? AND loja_id=?");
        $stmtChk->execute([$throttleChave, $tenantId]);
        if ((int)$stmtChk->fetchColumn() > 0) {
          $conn->prepare("UPDATE configuracoes SET valor=? WHERE chave=? AND loja_id=?")
               ->execute([time(), $throttleChave, $tenantId]);
        } else {
          $conn->prepare("INSERT INTO configuracoes(chave,valor,loja_id) VALUES(?,?,?)")
               ->execute([$throttleChave, time(), $tenantId]);
        }
      } catch (Throwable $e) { /* ignora se não conseguir salvar timestamp */ }

    } catch (Throwable $e) {
      error_log('Erro ao reconciliar vendas finalizadas no financeiro: ' . $e->getMessage());
    }
  }
}
