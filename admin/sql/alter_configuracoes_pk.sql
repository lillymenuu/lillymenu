-- Ajusta a chave primaria da tabela configuracoes para multi-loja
-- Execute caso o ajuste automatico nao funcione.

ALTER TABLE configuracoes
  ADD COLUMN loja_id INT NOT NULL DEFAULT 1;

UPDATE configuracoes
SET loja_id = 1
WHERE loja_id IS NULL;

ALTER TABLE configuracoes
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (loja_id, chave);

-- Se existir um ID auto_increment, use em vez da linha acima:
-- ALTER TABLE configuracoes ADD UNIQUE KEY uniq_loja_chave (loja_id, chave);
