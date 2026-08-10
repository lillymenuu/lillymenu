CREATE TABLE IF NOT EXISTS lojas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS planos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  periodicidade ENUM('mensal') NOT NULL DEFAULT 'mensal',
  dias_trial INT NOT NULL DEFAULT 15,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS assinaturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loja_id INT NOT NULL,
  plano_id INT NOT NULL,
  status ENUM('trial','ativa','suspensa','cancelada') NOT NULL DEFAULT 'trial',
  trial_inicio DATE NULL,
  trial_fim DATE NULL,
  ciclo_inicio DATE NULL,
  ciclo_fim DATE NULL,
  bloqueada_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_assinatura_loja (loja_id),
  INDEX idx_assinatura_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cobrancas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assinatura_id INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  vencimento DATE NOT NULL,
  status ENUM('pendente','pago','atrasado') NOT NULL DEFAULT 'pendente',
  pago_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cobranca_assinatura (assinatura_id),
  INDEX idx_cobranca_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO planos (nome, valor, periodicidade, dias_trial, ativo)
SELECT 'Mensal', 50.00, 'mensal', 30, 1
WHERE NOT EXISTS (SELECT 1 FROM planos);

ALTER TABLE admins ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE configuracoes ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE categorias ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE produtos ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE clientes ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE pedidos ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE pedido_itens ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE pedido_pagamentos ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE estoque ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE estoque_movimentacoes ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE cupons ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE taxas_bairro ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE taxas_dinamicas ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE caixa_turnos ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE caixa_movimentacoes ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE cashback_movimentacoes ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE pontos_movimentacoes ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE produto_variacoes ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE produto_extras ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE complementos_grupos ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE complementos_itens ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE complementos_grupos_produtos ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE complementos_grupos_categorias ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
ALTER TABLE operacao_logs ADD COLUMN loja_id INT NOT NULL DEFAULT 1;
