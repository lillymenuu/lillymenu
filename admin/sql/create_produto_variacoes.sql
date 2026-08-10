CREATE TABLE IF NOT EXISTS produto_variacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produto_id INT NOT NULL,
  tamanho VARCHAR(60) NULL,
  cor VARCHAR(60) NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  ordem INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NULL,
  INDEX idx_produto_variacoes_produto (produto_id),
  CONSTRAINT fk_produto_variacoes_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
