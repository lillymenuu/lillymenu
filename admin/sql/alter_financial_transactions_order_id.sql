ALTER TABLE financial_transactions
  ADD COLUMN order_id INT NULL AFTER tenant_id;

ALTER TABLE financial_transactions
  ADD INDEX idx_financial_transactions_order (order_id);

ALTER TABLE financial_transactions
  ADD UNIQUE KEY uniq_financial_transactions_sale_payment_type (
    tenant_id,
    order_id,
    payment_method_id,
    type
  );
