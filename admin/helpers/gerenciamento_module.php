<?php

if (!function_exists('gerenciamentoColumnExists')) {
  function gerenciamentoColumnExists(PDO $conn, string $table, string $column): bool
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

if (!function_exists('gerenciamentoEnsureModule')) {
  function gerenciamentoEnsureModule(PDO $conn): void
  {
    try {
      if (!gerenciamentoColumnExists($conn, 'cobrancas', 'comprovante_arquivo')) {
        $conn->exec("ALTER TABLE cobrancas ADD COLUMN comprovante_arquivo VARCHAR(255) NULL");
      }
      if (!gerenciamentoColumnExists($conn, 'cobrancas', 'comprovante_enviado_em')) {
        $conn->exec("ALTER TABLE cobrancas ADD COLUMN comprovante_enviado_em DATETIME NULL");
      }
      if (!gerenciamentoColumnExists($conn, 'cobrancas', 'motivo_rejeicao')) {
        $conn->exec("ALTER TABLE cobrancas ADD COLUMN motivo_rejeicao VARCHAR(255) NULL");
      }
      if (!gerenciamentoColumnExists($conn, 'planos', 'landing_slug')) {
        $conn->exec("ALTER TABLE planos ADD COLUMN landing_slug VARCHAR(20) NULL, ADD UNIQUE KEY uq_planos_landing_slug (landing_slug)");
      }
      if (!gerenciamentoColumnExists($conn, 'planos', 'recursos_json')) {
        $conn->exec("ALTER TABLE planos ADD COLUMN recursos_json TEXT NULL");
      }
      if (!gerenciamentoColumnExists($conn, 'admins', 'foto')) {
        $conn->exec("ALTER TABLE admins ADD COLUMN foto VARCHAR(255) NULL");
      }
      if (!gerenciamentoColumnExists($conn, 'lojas', 'plano_id')) {
        $conn->exec("ALTER TABLE lojas ADD COLUMN plano_id INT NULL");
      }
    } catch (Throwable $e) {
    }
  }
}

/**
 * Converte um preco em texto livre (ex: "R$ 149,90/mes") pra decimal.
 * Retorna null se nao conseguir extrair nenhum numero.
 */
if (!function_exists('gerenciamentoParsePreco')) {
  function gerenciamentoParsePreco(string $texto): ?float
  {
    if (!preg_match('/(\d{1,3}(?:\.\d{3})*|\d+)(?:[,.](\d{1,2}))?/', $texto, $m)) {
      return null;
    }
    $inteiro = str_replace('.', '', $m[1]);
    $decimal = $m[2] ?? '00';
    return (float) ($inteiro . '.' . $decimal);
  }
}

/**
 * Sincroniza os planos 1-4 cadastrados na Landing page (aba Planos > Tabela de planos)
 * com a tabela `planos` usada pelas assinaturas, casando por landing_slug ('plano1'..'plano4').
 * Planos sem nome ou desativados na landing ficam com ativo=0 (nao sao excluidos, pra nao
 * quebrar assinaturas que ja referenciam esse plano_id).
 */
if (!function_exists('gerenciamentoSincronizarPlanosLanding')) {
  function gerenciamentoSincronizarPlanosLanding(PDO $conn, array $landing): void
  {
    for ($n = 1; $n <= 4; $n++) {
      $slug = 'plano' . $n;
      $nome = trim((string) ($landing[$slug . '_nome'] ?? ''));
      $ativo = (string) ($landing[$slug . '_ativo'] ?? '') === '1' ? 1 : 0;
      $precoTexto = (string) ($landing[$slug . '_preco'] ?? '');
      $valor = gerenciamentoParsePreco($precoTexto);

      if ($nome === '' || $valor === null) {
        $ativo = 0;
      }

      try {
        $stmt = $conn->prepare("SELECT id FROM planos WHERE landing_slug = ? LIMIT 1");
        $stmt->execute([$slug]);
        $planoId = (int) $stmt->fetchColumn();

        if ($planoId > 0) {
          $conn->prepare("UPDATE planos SET nome = ?, valor = ?, ativo = ? WHERE id = ?")
            ->execute([$nome !== '' ? $nome : $slug, $valor ?? 0, $ativo, $planoId]);
        } elseif ($nome !== '' && $valor !== null) {
          $conn->prepare("INSERT INTO planos (nome, valor, periodicidade, dias_trial, ativo, landing_slug) VALUES (?, ?, 'mensal', 30, ?, ?)")
            ->execute([$nome, $valor, $ativo, $slug]);
        }
      } catch (Throwable $e) {
      }
    }
  }
}
