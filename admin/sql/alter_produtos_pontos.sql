ALTER TABLE produtos
  ADD COLUMN pontos_ganho INT NOT NULL DEFAULT 0 AFTER preco,
  ADD COLUMN pontos_custo INT NOT NULL DEFAULT 0 AFTER pontos_ganho;
