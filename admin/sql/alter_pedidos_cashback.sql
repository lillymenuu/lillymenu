ALTER TABLE pedidos
  ADD COLUMN cashback_valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN cashback_percentual DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN cashback_expira_em DATE NULL,
  ADD COLUMN cashback_aplicado TINYINT(1) NOT NULL DEFAULT 0;
