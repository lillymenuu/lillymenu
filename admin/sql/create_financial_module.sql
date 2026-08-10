CREATE TABLE IF NOT EXISTS financial_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(160) NOT NULL,
  type ENUM('income','expense') NOT NULL,
  parent_id INT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  UNIQUE KEY uniq_financial_categories_tenant_name_type_parent (tenant_id, name, type, parent_id),
  INDEX idx_financial_categories_tenant (tenant_id),
  INDEX idx_financial_categories_parent (parent_id),
  INDEX idx_financial_categories_type (type),
  CONSTRAINT fk_financial_categories_parent
    FOREIGN KEY (parent_id) REFERENCES financial_categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS financial_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(160) NOT NULL,
  initial_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  UNIQUE KEY uniq_financial_accounts_tenant_name (tenant_id, name),
  INDEX idx_financial_accounts_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(120) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  UNIQUE KEY uniq_payment_methods_tenant_name (tenant_id, name),
  INDEX idx_payment_methods_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS financial_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  account_id INT NOT NULL,
  category_id INT NOT NULL,
  payment_method_id INT NULL,
  type ENUM('income','expense') NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  transaction_date DATE NOT NULL,
  reference_month TINYINT UNSIGNED NOT NULL,
  reference_year SMALLINT UNSIGNED NOT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  INDEX idx_financial_transactions_tenant (tenant_id),
  INDEX idx_financial_transactions_account (account_id),
  INDEX idx_financial_transactions_category (category_id),
  INDEX idx_financial_transactions_payment_method (payment_method_id),
  INDEX idx_financial_transactions_date (transaction_date),
  INDEX idx_financial_transactions_reference (reference_year, reference_month),
  INDEX idx_financial_transactions_type (type),
  CONSTRAINT fk_financial_transactions_account
    FOREIGN KEY (account_id) REFERENCES financial_accounts(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_financial_transactions_category
    FOREIGN KEY (category_id) REFERENCES financial_categories(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_financial_transactions_payment_method
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
