INSERT INTO financial_categories (tenant_id, name, type, parent_id, active)
SELECT 1, 'Receitas operacionais', 'income', NULL, 1
WHERE NOT EXISTS (
  SELECT 1
  FROM financial_categories
  WHERE tenant_id = 1
    AND name = 'Receitas operacionais'
    AND type = 'income'
    AND parent_id IS NULL
);

INSERT INTO financial_categories (tenant_id, name, type, parent_id, active)
SELECT 1, 'Despesas operacionais', 'expense', NULL, 1
WHERE NOT EXISTS (
  SELECT 1
  FROM financial_categories
  WHERE tenant_id = 1
    AND name = 'Despesas operacionais'
    AND type = 'expense'
    AND parent_id IS NULL
);

INSERT INTO financial_categories (tenant_id, name, type, parent_id, active)
SELECT 1, 'Vendas', 'income', id, 1
FROM financial_categories
WHERE tenant_id = 1
  AND name = 'Receitas operacionais'
  AND type = 'income'
  AND parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM financial_categories
    WHERE tenant_id = 1
      AND name = 'Vendas'
      AND type = 'income'
  );

INSERT INTO financial_categories (tenant_id, name, type, parent_id, active)
SELECT 1, 'Serviços', 'income', id, 1
FROM financial_categories
WHERE tenant_id = 1
  AND name = 'Receitas operacionais'
  AND type = 'income'
  AND parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM financial_categories
    WHERE tenant_id = 1
      AND name = 'Serviços'
      AND type = 'income'
  );

INSERT INTO financial_categories (tenant_id, name, type, parent_id, active)
SELECT 1, 'Outras receitas', 'income', id, 1
FROM financial_categories
WHERE tenant_id = 1
  AND name = 'Receitas operacionais'
  AND type = 'income'
  AND parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM financial_categories
    WHERE tenant_id = 1
      AND name = 'Outras receitas'
      AND type = 'income'
  );

INSERT INTO financial_categories (tenant_id, name, type, parent_id, active)
SELECT 1, 'Matéria-prima', 'expense', id, 1
FROM financial_categories
WHERE tenant_id = 1
  AND name = 'Despesas operacionais'
  AND type = 'expense'
  AND parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM financial_categories
    WHERE tenant_id = 1
      AND name = 'Matéria-prima'
      AND type = 'expense'
  );

INSERT INTO financial_categories (tenant_id, name, type, parent_id, active)
SELECT 1, 'Folha de pagamento', 'expense', id, 1
FROM financial_categories
WHERE tenant_id = 1
  AND name = 'Despesas operacionais'
  AND type = 'expense'
  AND parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM financial_categories
    WHERE tenant_id = 1
      AND name = 'Folha de pagamento'
      AND type = 'expense'
  );

INSERT INTO financial_categories (tenant_id, name, type, parent_id, active)
SELECT 1, 'Impostos', 'expense', id, 1
FROM financial_categories
WHERE tenant_id = 1
  AND name = 'Despesas operacionais'
  AND type = 'expense'
  AND parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM financial_categories
    WHERE tenant_id = 1
      AND name = 'Impostos'
      AND type = 'expense'
  );

INSERT INTO financial_categories (tenant_id, name, type, parent_id, active)
SELECT 1, 'Marketing', 'expense', id, 1
FROM financial_categories
WHERE tenant_id = 1
  AND name = 'Despesas operacionais'
  AND type = 'expense'
  AND parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM financial_categories
    WHERE tenant_id = 1
      AND name = 'Marketing'
      AND type = 'expense'
  );

INSERT INTO financial_categories (tenant_id, name, type, parent_id, active)
SELECT 1, 'Despesas administrativas', 'expense', id, 1
FROM financial_categories
WHERE tenant_id = 1
  AND name = 'Despesas operacionais'
  AND type = 'expense'
  AND parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM financial_categories
    WHERE tenant_id = 1
      AND name = 'Despesas administrativas'
      AND type = 'expense'
  );
