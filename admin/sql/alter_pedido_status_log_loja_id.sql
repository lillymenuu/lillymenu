ALTER TABLE pedido_status_log
  ADD COLUMN loja_id INT NOT NULL DEFAULT 1 AFTER pedido_id;

UPDATE pedido_status_log l
JOIN pedidos p ON p.id = l.pedido_id
SET l.loja_id = p.loja_id;

CREATE INDEX idx_pedido_status_log_loja_pedido
  ON pedido_status_log (loja_id, pedido_id);
