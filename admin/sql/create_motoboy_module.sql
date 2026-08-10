CREATE TABLE IF NOT EXISTS motoboys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loja_id INT NOT NULL,
  nome VARCHAR(160) NOT NULL,
  whatsapp VARCHAR(30) NOT NULL,
  data_cadastro DATE NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NULL DEFAULT NULL,
  INDEX idx_motoboys_loja (loja_id),
  INDEX idx_motoboys_ativo (loja_id, ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
