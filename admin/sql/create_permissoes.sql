CREATE TABLE IF NOT EXISTS permissoes_niveis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  permissoes_json TEXT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permissoes_usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  permissao_id INT NOT NULL,
  admin_id INT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_perm_usuario (permissao_id, admin_id),
  INDEX idx_perm_admin (admin_id),
  INDEX idx_perm_perm (permissao_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
