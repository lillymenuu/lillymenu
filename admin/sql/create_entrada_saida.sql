CREATE TABLE IF NOT EXISTS entrada_saida_bancos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loja_id INT NOT NULL DEFAULT 1,
  nome VARCHAR(120) NOT NULL,
  saldo_atual DECIMAL(10,2) NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NULL,
  INDEX idx_entrada_saida_bancos_loja (loja_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS entrada_saida_formas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loja_id INT NOT NULL DEFAULT 1,
  nome VARCHAR(120) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_entrada_saida_forma_loja_nome (loja_id, nome),
  INDEX idx_entrada_saida_formas_loja (loja_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS entrada_saida_categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loja_id INT NOT NULL DEFAULT 1,
  nome VARCHAR(120) NOT NULL,
  tipo ENUM('entrada','saida','ambos') NOT NULL DEFAULT 'ambos',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_entrada_saida_categoria_loja_nome (loja_id, nome),
  INDEX idx_entrada_saida_categorias_loja (loja_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS entrada_saida_subcategorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loja_id INT NOT NULL DEFAULT 1,
  categoria_id INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_entrada_saida_subcategoria_loja_cat_nome (loja_id, categoria_id, nome),
  INDEX idx_entrada_saida_subcategorias_loja (loja_id),
  INDEX idx_entrada_saida_subcategorias_categoria (categoria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS entrada_saida_lancamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loja_id INT NOT NULL DEFAULT 1,
  tipo ENUM('entrada','saida') NOT NULL DEFAULT 'entrada',
  data_lancamento DATE NOT NULL,
  descricao VARCHAR(180) NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  forma_id INT NULL,
  categoria_id INT NULL,
  subcategoria_id INT NULL,
  banco_id INT NULL,
  criado_por INT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NULL,
  INDEX idx_entrada_saida_lancamentos_loja (loja_id),
  INDEX idx_entrada_saida_lancamentos_data (data_lancamento),
  INDEX idx_entrada_saida_lancamentos_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
