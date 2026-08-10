<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/financial_module.php';
require_once __DIR__ . '/../../services/SaleFinancialIntegrationService.php';

header('Content-Type: application/json; charset=utf-8');

function garantirFiadoEstrutura(PDO $conn): void {
  try {
    $conn->exec("CREATE TABLE IF NOT EXISTS fiado_lancamentos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      loja_id INT NOT NULL,
      cliente_id INT NOT NULL,
      pedido_id INT NULL,
      operador_id INT NULL,
      tipo ENUM('venda','pagamento') NOT NULL,
      forma_pagamento VARCHAR(30) NULL,
      valor DECIMAL(10,2) NOT NULL,
      saldo_antes DECIMAL(10,2) NOT NULL DEFAULT 0,
      saldo_depois DECIMAL(10,2) NOT NULL DEFAULT 0,
      observacao VARCHAR(255) NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_loja_cliente (loja_id, cliente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } catch (Exception $e) {
  }
  try {
    $cols = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
    if (!in_array('saldo_fiado', $cols, true)) {
      $conn->exec("ALTER TABLE clientes ADD COLUMN saldo_fiado DECIMAL(10,2) NOT NULL DEFAULT 0");
    }
  } catch (Exception $e) {
  }
  try {
    $colsLanc = $conn->query("SHOW COLUMNS FROM fiado_lancamentos")->fetchAll(PDO::FETCH_COLUMN, 0);
    if (!in_array('operador_id', $colsLanc, true)) {
      $conn->exec("ALTER TABLE fiado_lancamentos ADD COLUMN operador_id INT NULL");
    }
    if (!in_array('forma_pagamento', $colsLanc, true)) {
      $conn->exec("ALTER TABLE fiado_lancamentos ADD COLUMN forma_pagamento VARCHAR(30) NULL");
    }
  } catch (Exception $e) {
  }
}

garantirFiadoEstrutura($conn);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$operadorId = $_SESSION['admin_id'] ?? null;
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$clienteId = (int) ($data['cliente_id'] ?? 0);
$valor = round((float) ($data['valor'] ?? 0), 2);
$formaPagamento = trim((string) ($data['forma_pagamento'] ?? 'outro'));
$observacao = trim((string) ($data['observacao'] ?? ''));

if ($clienteId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Cliente invalido.']);
  exit;
}
if ($valor <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Informe um valor valido.']);
  exit;
}

try {
  $stmtCliente = $conn->prepare("SELECT saldo_fiado FROM clientes WHERE id = ? AND loja_id = ?");
  $stmtCliente->execute([$clienteId, $lojaId]);
  $saldoAntes = $stmtCliente->fetchColumn();
  if ($saldoAntes === false) {
    echo json_encode(['ok' => false, 'msg' => 'Cliente nao encontrado.']);
    exit;
  }
  $saldoAntes = (float) $saldoAntes;

  if ($valor > $saldoAntes + 0.009) {
    echo json_encode(['ok' => false, 'msg' => 'O valor do pagamento nao pode ser maior que o saldo devedor.']);
    exit;
  }

  $saldoDepois = max(0, $saldoAntes - $valor);

  $stmtNome = $conn->prepare("SELECT nome FROM clientes WHERE id = ? AND loja_id = ?");
  $stmtNome->execute([$clienteId, $lojaId]);
  $clienteNome = (string) ($stmtNome->fetchColumn() ?: '');

  $conn->beginTransaction();
  $conn->prepare("UPDATE clientes SET saldo_fiado = ? WHERE id = ? AND loja_id = ?")
    ->execute([$saldoDepois, $clienteId, $lojaId]);
  $conn->prepare("
    INSERT INTO fiado_lancamentos (loja_id, cliente_id, pedido_id, operador_id, tipo, forma_pagamento, valor, saldo_antes, saldo_depois, observacao)
    VALUES (?, ?, NULL, ?, 'pagamento', ?, ?, ?, ?, ?)
  ")->execute([$lojaId, $clienteId, $operadorId, $formaPagamento !== '' ? $formaPagamento : 'outro', $valor, $saldoAntes, $saldoDepois, $observacao !== '' ? $observacao : null]);
  $fiadoLancamentoId = (int) $conn->lastInsertId();
  $conn->commit();

  try {
    financialEnsureModule($conn);
    $financialIntegration = new SaleFinancialIntegrationService();
    $financialIntegration->recordFiadoPayment($conn, $lojaId, [
      'forma' => $formaPagamento,
      'valor' => $valor,
      'data' => date('Y-m-d'),
      'cliente_nome' => $clienteNome,
      'fiado_lancamento_id' => $fiadoLancamentoId,
    ]);
  } catch (Throwable $financeiroErro) {
    error_log('Erro ao sincronizar pagamento de fiado no financeiro: ' . $financeiroErro->getMessage());
  }

  echo json_encode(['ok' => true, 'saldo_fiado' => $saldoDepois]);
} catch (Exception $e) {
  if ($conn->inTransaction()) {
    $conn->rollBack();
  }
  echo json_encode(['ok' => false, 'msg' => 'Erro ao registrar pagamento.']);
}
