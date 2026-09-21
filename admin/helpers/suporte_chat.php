<?php
/*
 * Tabelas e limpeza do chat de suporte (lojista <-> superadmin), compartilhado
 * pelos endpoints admin/api/v1/suporte_*.php. Mesmo schema de admin/api/suporte_*.php.
 */

require_once __DIR__ . '/../../helpers/storage.php';

if (!function_exists('suporteGarantirTabelas')) {
  function suporteGarantirTabelas(PDO $conn): void {
    try {
      $conn->exec("CREATE TABLE IF NOT EXISTS suporte_mensagens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        loja_id INT NOT NULL,
        remetente ENUM('loja','suporte') NOT NULL,
        mensagem TEXT NOT NULL,
        anexo_arquivo VARCHAR(255) NULL DEFAULT NULL,
        lida_loja TINYINT NOT NULL DEFAULT 0,
        lida_suporte TINYINT NOT NULL DEFAULT 0,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_loja (loja_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
      $col = $conn->query("SHOW COLUMNS FROM suporte_mensagens LIKE 'anexo_arquivo'")->fetch();
      if (!$col) {
        $conn->exec("ALTER TABLE suporte_mensagens ADD COLUMN anexo_arquivo VARCHAR(255) NULL DEFAULT NULL");
      }
      $conn->exec("CREATE TABLE IF NOT EXISTS suporte_digitando (
        loja_id INT NOT NULL,
        quem ENUM('loja','suporte') NOT NULL,
        atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (loja_id, quem)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Exception $e) {
    }
  }
}

if (!function_exists('suporteLimparExpiradas')) {
  /* Mensagens (e anexos) com mais de 2 dias sao apagadas — mesma regra do chat legado. */
  function suporteLimparExpiradas(PDO $conn): void {
    try {
      $stmt = $conn->query("SELECT anexo_arquivo FROM suporte_mensagens WHERE criado_em < (NOW() - INTERVAL 2 DAY) AND anexo_arquivo IS NOT NULL");
      $arquivos = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN) : [];
      foreach ($arquivos as $relPath) {
        storage_delete($relPath);
      }
      $conn->exec("DELETE FROM suporte_mensagens WHERE criado_em < (NOW() - INTERVAL 2 DAY)");
    } catch (Exception $e) {
    }
  }
}
