CREATE TABLE IF NOT EXISTS versiculo_reacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  data_versiculo DATE NOT NULL,
  reacao ENUM('gostou','nao_gostou') NOT NULL,
  referencia VARCHAR(80) NULL,
  texto TEXT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NULL,
  UNIQUE KEY uniq_reacao_admin_data (admin_id, data_versiculo),
  INDEX idx_reacao_data (data_versiculo),
  INDEX idx_reacao_admin (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
