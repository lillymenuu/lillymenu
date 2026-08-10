CREATE TABLE IF NOT EXISTS listas_transmissao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loja_id INT NOT NULL,
  nome VARCHAR(160) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NULL,
  INDEX idx_lt_loja (loja_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS listas_transmissao_membros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lista_id INT NOT NULL,
  cliente_id INT NOT NULL,
  loja_id INT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lista_cliente (lista_id, cliente_id),
  INDEX idx_ltm_lista (lista_id),
  CONSTRAINT fk_ltm_lista FOREIGN KEY (lista_id) REFERENCES listas_transmissao(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS listas_transmissao_envios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lista_id INT NOT NULL,
  loja_id INT NOT NULL,
  mensagem TEXT NOT NULL,
  total_destinatarios INT NOT NULL DEFAULT 0,
  total_enviados INT NOT NULL DEFAULT 0,
  total_falhas INT NOT NULL DEFAULT 0,
  status ENUM('em_andamento','concluido') NOT NULL DEFAULT 'em_andamento',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalizado_em DATETIME NULL,
  INDEX idx_lte_lista (lista_id),
  CONSTRAINT fk_lte_lista FOREIGN KEY (lista_id) REFERENCES listas_transmissao(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
