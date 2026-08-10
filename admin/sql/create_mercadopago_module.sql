ALTER TABLE cobrancas ADD COLUMN origem ENUM('manual','mercadopago') NOT NULL DEFAULT 'manual';
ALTER TABLE cobrancas ADD COLUMN mp_payment_id VARCHAR(64) NULL DEFAULT NULL, ADD UNIQUE KEY uq_cobrancas_mp_payment_id (mp_payment_id);
ALTER TABLE cobrancas ADD COLUMN mp_qr_code TEXT NULL DEFAULT NULL;
ALTER TABLE cobrancas ADD COLUMN mp_qr_code_base64 MEDIUMTEXT NULL DEFAULT NULL;
ALTER TABLE cobrancas ADD COLUMN mp_expiracao DATETIME NULL DEFAULT NULL;
