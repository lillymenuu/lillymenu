<?php

if (!function_exists('garcomTableExists')) {
  function garcomTableExists(PDO $conn, string $table): bool
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

if (!function_exists('garcomColumnExists')) {
  function garcomColumnExists(PDO $conn, string $table, string $column): bool
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

if (!function_exists('garcomRunSqlFile')) {
  function garcomRunSqlFile(PDO $conn, string $path): void
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

if (!function_exists('garcomEnsureModule')) {
  function garcomEnsureModule(PDO $conn): void
  {
    static $done = false;
    if ($done) return;
    $done = true;

    garcomRunSqlFile($conn, __DIR__ . '/../sql/create_garcom_module.sql');

    if (garcomTableExists($conn, 'pedidos')) {
      if (!garcomColumnExists($conn, 'pedidos', 'mesa_id')) {
        $conn->exec("ALTER TABLE pedidos ADD COLUMN mesa_id INT NULL AFTER cliente_id");
        $conn->exec("ALTER TABLE pedidos ADD INDEX idx_pedidos_mesa (mesa_id)");
      }
      if (!garcomColumnExists($conn, 'pedidos', 'garcom_id')) {
        $conn->exec("ALTER TABLE pedidos ADD COLUMN garcom_id INT NULL AFTER mesa_id");
        $conn->exec("ALTER TABLE pedidos ADD INDEX idx_pedidos_garcom (garcom_id)");
      }
      /* o ENUM de pedidos.tipo hoje so tem 'retirada'/'entrega' — o PDV ja
         oferece "Consumo local" (value="mesa") na tela mas nunca ajustou o
         ENUM, entao esse valor seria salvo como string vazia. Corrige aqui
         pra 'mesa' funcionar de verdade tanto no PDV quanto no Modo Garcom. */
      try {
        $col = $conn->query("SHOW COLUMNS FROM pedidos LIKE 'tipo'")->fetch(PDO::FETCH_ASSOC);
        if ($col && strpos((string) $col['Type'], "'mesa'") === false) {
          $conn->exec("ALTER TABLE pedidos MODIFY COLUMN tipo ENUM('retirada','entrega','mesa') NOT NULL DEFAULT 'retirada'");
        }
      } catch (Throwable $e) {
      }
    }
  }
}

if (!function_exists('garcomGerarCodigoAcesso')) {
  /**
   * Gera um codigo de acesso legivel (sem caracteres ambiguos) pro garcom.
   * Diferente do codigo_acesso de admins (uso unico), esse e persistente —
   * guardamos so o hash, o texto puro so existe no momento da geracao pra
   * ser mostrado uma vez ao dono da loja.
   */
  function garcomGerarCodigoAcesso(): string
  {
    $alfabeto = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    $codigo = '';
    for ($i = 0; $i < 5; $i++) {
      $codigo .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
    }
    return $codigo;
  }
}

if (!function_exists('garcomClienteMesaId')) {
  /**
   * Retorna o cliente-placeholder da mesa (cria se ainda nao existir).
   * pedidos_kanban.php faz JOIN (nao LEFT JOIN) com clientes, entao todo
   * pedido de mesa precisa de um cliente_id valido pra nao sumir da listagem.
   */
  function garcomClienteMesaId(PDO $conn, int $mesaId, string $nomeMesa, int $lojaId): int
  {
    $stmt = $conn->prepare("SELECT cliente_id FROM mesas WHERE id = ? AND loja_id = ? LIMIT 1");
    $stmt->execute([$mesaId, $lojaId]);
    $clienteId = (int) $stmt->fetchColumn();
    if ($clienteId > 0) {
      return $clienteId;
    }

    $conn->prepare("INSERT INTO clientes(nome, telefone, loja_id, criado_em) VALUES(?, '', ?, NOW())")
      ->execute([$nomeMesa, $lojaId]);
    $novoId = (int) $conn->lastInsertId();

    $conn->prepare("UPDATE mesas SET cliente_id = ? WHERE id = ? AND loja_id = ?")
      ->execute([$novoId, $mesaId, $lojaId]);

    return $novoId;
  }
}
