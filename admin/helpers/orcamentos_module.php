<?php
/*
 * Garante as tabelas de Quotes (orcamentos) sob demanda, mesmo padrao ja
 * usado por garantirApiTokensTabela() em admin/helpers/api_auth.php —
 * evita depender de rodar uma migracao manual em producao antes do
 * deploy do codigo.
 */

if (!function_exists('garantirOrcamentosTabelas')) {
  function garantirOrcamentosTabelas(PDO $conn): void {
    $conn->exec("CREATE TABLE IF NOT EXISTS orcamentos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      loja_id INT NOT NULL,
      status ENUM('pendente','aprovado','recusado') NOT NULL DEFAULT 'pendente',
      cliente_nome VARCHAR(191) NOT NULL,
      cliente_tipo_documento ENUM('fisica','juridica') NOT NULL DEFAULT 'fisica',
      cliente_documento VARCHAR(30) NULL,
      cliente_whatsapp VARCHAR(30) NULL,
      cliente_endereco TEXT NULL,
      desconto_tipo ENUM('valor','percent') NOT NULL DEFAULT 'valor',
      desconto_valor DECIMAL(10,2) NOT NULL DEFAULT 0,
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL DEFAULT 0,
      admin_id INT NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME NULL,
      INDEX idx_orcamentos_loja (loja_id, criado_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $conn->exec("CREATE TABLE IF NOT EXISTS orcamento_itens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      orcamento_id INT NOT NULL,
      produto_id INT NULL,
      nome VARCHAR(191) NOT NULL,
      preco DECIMAL(10,2) NOT NULL,
      qtd INT NOT NULL,
      observacoes VARCHAR(255) NULL,
      FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  }
}
