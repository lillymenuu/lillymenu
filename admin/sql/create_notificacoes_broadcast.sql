CREATE TABLE IF NOT EXISTS notificacoes_broadcast (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(160) NOT NULL,
  mensagem TEXT NOT NULL,
  imagem VARCHAR(255) NULL DEFAULT NULL,
  status ENUM('rascunho','programada','enviada','cancelada') NOT NULL DEFAULT 'rascunho',
  agendado_para DATETIME NULL DEFAULT NULL,
  enviado_em DATETIME NULL DEFAULT NULL,
  criado_por INT NULL DEFAULT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notificacoes_broadcast_visualizacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notificacao_id INT NOT NULL,
  loja_id INT NOT NULL,
  visualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notif_loja (notificacao_id, loja_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
