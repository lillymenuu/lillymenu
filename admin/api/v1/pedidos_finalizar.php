<?php
/*
 * Versao JSON de admin/api/pedidos_finalizar.php para o novo frontend
 * Next.js (Gestor de Pedidos / ordermanager) — botao "Finalizar" do card
 * e do modal de detalhe.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';
require_once __DIR__ . '/../../helpers/config.php';
require_once __DIR__ . '/../../helpers/financial_module.php';
require_once __DIR__ . '/../../helpers/cashback_module.php';
require_once __DIR__ . '/../../helpers/caixa_module.php';
require_once __DIR__ . '/../../../services/SaleFinancialIntegrationService.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['loja_id']  = $lojaId;

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$id    = $dados['id'] ?? null;
if (!$id) {
  echo json_encode(['ok' => false, 'msg' => 'Pedido invalido.']);
  exit;
}

function pedidosFinalizarTabelaExiste(PDO $conn, string $tabela): bool {
  $stmt = $conn->prepare("SHOW TABLES LIKE ?");
  $stmt->execute([$tabela]);
  return (bool) $stmt->fetchColumn();
}

// DDL deve rodar ANTES da transacao — DDL causa implicit commit no MySQL
financialEnsureModule($conn);
cashbackEnsureModule($conn);

$conn->beginTransaction();
try {
  $stmtExiste = $conn->prepare("SELECT id FROM pedidos WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmtExiste->execute([$id, $lojaId]);
  if (!$stmtExiste->fetchColumn()) {
    $conn->rollBack();
    echo json_encode(['ok' => false, 'msg' => 'Pedido nao encontrado.']);
    exit;
  }

  $stmt = $conn->prepare("UPDATE pedidos SET status = 'finalizado' WHERE id = ? AND loja_id = ?");
  $stmt->execute([$id, $lojaId]);

  $stmt = $conn->prepare("
    INSERT INTO pedido_status_log (pedido_id, status, loja_id)
    VALUES (?, 'finalizado', ?)
  ");
  $stmt->execute([$id, $lojaId]);

  $clubePontosAtivo = config($conn, 'clube_pontos_ativo', '0', $lojaId) === '1';
  if ($clubePontosAtivo && pedidosFinalizarTabelaExiste($conn, 'pontos_movimentacoes')) {
    $clientesColunas = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
    $temPontosSaldoCliente = in_array('pontos_saldo', $clientesColunas, true);
    $temPontosCliente = in_array('pontos', $clientesColunas, true);
    $campoPontosCliente = $temPontosSaldoCliente ? 'pontos_saldo' : ($temPontosCliente ? 'pontos' : null);
    if ($campoPontosCliente) {
      $stmtCliente = $conn->prepare("SELECT cliente_id FROM pedidos WHERE id = ? AND loja_id = ?");
      $stmtCliente->execute([$id, $lojaId]);
      $clienteId = (int) $stmtCliente->fetchColumn();

      if ($clienteId > 0) {
        $stmtCheck = $conn->prepare("SELECT COUNT(*) FROM pontos_movimentacoes WHERE pedido_id = ? AND tipo = 'ganho' AND loja_id = ?");
        $stmtCheck->execute([$id, $lojaId]);
        $jaCred = (int) $stmtCheck->fetchColumn();

        $stmtPend = $conn->prepare("SELECT SUM(pontos) FROM pontos_movimentacoes WHERE pedido_id = ? AND tipo = 'pendente' AND loja_id = ?");
        $stmtPend->execute([$id, $lojaId]);
        $pendente = (int) $stmtPend->fetchColumn();

        if ($pendente > 0 && $jaCred === 0) {
          $stmtSaldo = $conn->prepare("SELECT {$campoPontosCliente} FROM clientes WHERE id = ? AND loja_id = ?");
          $stmtSaldo->execute([$clienteId, $lojaId]);
          $saldoAntes = (int) $stmtSaldo->fetchColumn();
          $saldoDepois = $saldoAntes + $pendente;

          $stmtMov = $conn->prepare("
            INSERT INTO pontos_movimentacoes
              (cliente_id, pedido_id, tipo, pontos, saldo_antes, saldo_depois, referencia_id, loja_id)
            VALUES (?, ?, 'ganho', ?, ?, ?, ?, ?)
          ");
          $stmtMov->execute([$clienteId, $id, $pendente, $saldoAntes, $saldoDepois, null, $lojaId]);

          $stmtUpd = $conn->prepare("
            UPDATE clientes
            SET {$campoPontosCliente} = GREATEST(0, {$campoPontosCliente} + ?)
            WHERE id = ? AND loja_id = ?
          ");
          $stmtUpd->execute([$pendente, $clienteId, $lojaId]);
        }

        if ($pendente > 0) {
          $stmtDel = $conn->prepare("DELETE FROM pontos_movimentacoes WHERE pedido_id = ? AND tipo = 'pendente' AND loja_id = ?");
          $stmtDel->execute([$id, $lojaId]);
        }
      }
    }
  }

  cashbackPromoverPendente($conn, (int) $id, $lojaId);
  caixaAtribuirPedidoFinalizado($conn, (int) $id, $lojaId);

  $conn->commit();
  try {
    $financialIntegration = new SaleFinancialIntegrationService();
    $financialIntegration->syncOrderRevenue($conn, $lojaId, (int) $id);
  } catch (Throwable $financeiroErro) {
    error_log('Erro ao sincronizar pedido finalizado no financeiro (v1): ' . $financeiroErro->getMessage());
  }
  registrarOperacao($conn, 'pedido_finalizado', 'pedido:' . $id);
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao finalizar o pedido.']);
}
