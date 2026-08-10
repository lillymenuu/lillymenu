CREATE TABLE IF NOT EXISTS cashback_movimentacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  pedido_id INT NULL,
  tipo ENUM('entrada','uso','expirado','ajuste') NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  saldo_antes DECIMAL(10,2) NOT NULL DEFAULT 0,
  saldo_depois DECIMAL(10,2) NOT NULL DEFAULT 0,
  expira_em DATE NULL,
  referencia_id INT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cashback_cliente (cliente_id),
  INDEX idx_cashback_pedido (pedido_id),
  INDEX idx_cashback_tipo (tipo),
  INDEX idx_cashback_expira (expira_em),
  INDEX idx_cashback_ref (referencia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
