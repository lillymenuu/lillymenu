<?php

date_default_timezone_set('America/Fortaleza');

if (!function_exists('garantirNotificacoesBroadcastTabelas')) {
  function garantirNotificacoesBroadcastTabelas(PDO $conn): void {
    try {
      $conn->exec("CREATE TABLE IF NOT EXISTS notificacoes_broadcast (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(160) NOT NULL,
        mensagem TEXT NOT NULL,
        imagem VARCHAR(255) NULL DEFAULT NULL,
        link VARCHAR(500) NULL DEFAULT NULL,
        status ENUM('rascunho','programada','enviada','cancelada') NOT NULL DEFAULT 'rascunho',
        agendado_para DATETIME NULL DEFAULT NULL,
        enviado_em DATETIME NULL DEFAULT NULL,
        criado_por INT NULL DEFAULT NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

      $col = $conn->query("SHOW COLUMNS FROM notificacoes_broadcast LIKE 'link'")->fetch();
      if (!$col) {
        $conn->exec("ALTER TABLE notificacoes_broadcast ADD COLUMN link VARCHAR(500) NULL DEFAULT NULL AFTER imagem");
      }

      $conn->exec("CREATE TABLE IF NOT EXISTS notificacoes_broadcast_visualizacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        notificacao_id INT NOT NULL,
        loja_id INT NOT NULL,
        visualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_notif_loja (notificacao_id, loja_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Throwable $e) {
    }
  }
}

if (!function_exists('notificacoesMarcarProgramadasVencidas')) {
  function notificacoesMarcarProgramadasVencidas(PDO $conn): void {
    /* Usa o relogio do PHP (nao NOW() do MySQL): o servidor de banco pode
       estar num fuso diferente do PHP, e agendado_para/enviado_em sao
       gravados via date() do PHP em todo o resto do modulo. */
    try {
      $agora = date('Y-m-d H:i:s');
      $stmt = $conn->prepare("
        UPDATE notificacoes_broadcast
        SET status = 'enviada', enviado_em = ?
        WHERE status = 'programada' AND agendado_para IS NOT NULL AND agendado_para <= ?
      ");
      $stmt->execute([$agora, $agora]);
    } catch (Throwable $e) {
    }
  }
}

if (!function_exists('notificacaoAtivaParaLoja')) {
  function notificacaoAtivaParaLoja(PDO $conn, int $lojaId): ?array {
    if ($lojaId <= 0) {
      return null;
    }
    try {
      $stmt = $conn->prepare("
        SELECT nb.id, nb.titulo, nb.mensagem, nb.imagem, nb.link
        FROM notificacoes_broadcast nb
        LEFT JOIN notificacoes_broadcast_visualizacoes v
          ON v.notificacao_id = nb.id AND v.loja_id = ?
        WHERE nb.status = 'enviada' AND v.id IS NULL
        ORDER BY nb.enviado_em DESC, nb.id DESC
        LIMIT 1
      ");
      $stmt->execute([$lojaId]);
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      return $row ?: null;
    } catch (Throwable $e) {
      return null;
    }
  }
}
