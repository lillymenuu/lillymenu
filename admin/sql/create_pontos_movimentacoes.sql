CREATE TABLE IF NOT EXISTS pontos_movimentacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  pedido_id INT NULL,
  tipo ENUM('ganho','resgate','expirado','ajuste','pendente') NOT NULL,
  pontos INT NOT NULL DEFAULT 0,
  saldo_antes INT NOT NULL DEFAULT 0,
  saldo_depois INT NOT NULL DEFAULT 0,
  referencia_id INT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pontos_cliente (cliente_id),
  INDEX idx_pontos_pedido (pedido_id),
  INDEX idx_pontos_tipo (tipo),
  INDEX idx_pontos_ref (referencia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
