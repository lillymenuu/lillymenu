CREATE TABLE IF NOT EXISTS mesas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loja_id INT NOT NULL,
  nome VARCHAR(60) NOT NULL,
  cliente_id INT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mesas_loja (loja_id),
  INDEX idx_mesas_ativo (loja_id, ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS garcons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loja_id INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL,
  codigo_acesso_hash VARCHAR(255) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_garcom_loja_email (loja_id, email),
  INDEX idx_garcons_loja (loja_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
