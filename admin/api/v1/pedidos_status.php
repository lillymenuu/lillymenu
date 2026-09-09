<?php
/*
 * Versao JSON de admin/api/pedidos_status.php para o novo frontend Next.js
 * (Gestor de Pedidos / ordermanager) — move um pedido entre as colunas do
 * kanban (drag-and-drop ou botoes de acao do card).
 *
 * Diferenca proposital em relacao ao legado: o legado aceita qualquer
 * string em "status" sem validar. Aqui validamos contra a lista canonica
 * usada pelo quadro (pendente/aceito/preparando/entrega/finalizado/
 * cancelado) antes de tocar no banco.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';
require_once __DIR__ . '/../../helpers/financial_module.php';
require_once __DIR__ . '/../../helpers/config.php';
require_once __DIR__ . '/../../helpers/cashback_module.php';
require_once __DIR__ . '/../../helpers/caixa_module.php';
require_once __DIR__ . '/../../helpers/pedido_estoque_module.php';
require_once __DIR__ . '/../../../services/SaleFinancialIntegrationService.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

/* registrarOperacao() (admin/helpers/operacao.php) le $_SESSION diretamente
 * pra saber quem fez a acao — nao ha sessao PHP nas chamadas via Bearer
 * token, entao preenchemos so os campos que ela usa, sem session_start()
 * (fica so na memoria desta requisicao, nao persiste nem grava cookie). */
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['loja_id']  = $lojaId;

$STATUS_VALIDOS = ['pendente', 'aceito', 'preparando', 'entrega', 'finalizado', 'cancelado'];

$dados  = json_decode(file_get_contents('php://input'), true) ?: [];
$id     = $dados['id'] ?? null;
$status = $dados['status'] ?? null;

if (!$id || !$status) {
  echo json_encode(['ok' => false, 'msg' => 'Pedido e status sao obrigatorios.']);
  exit;
}
if (!in_array($status, $STATUS_VALIDOS, true)) {
  echo json_encode(['ok' => false, 'msg' => 'Status invalido.']);
  exit;
}

// DDL deve rodar ANTES da transacao — DDL causa implicit commit no MySQL
cashbackEnsureModule($conn);
comboEstoqueEnsureModule($conn);
estoqueVinculoEnsureModule($conn);

$conn->beginTransaction();

try {
  $stmtStatusAtual = $conn->prepare("SELECT status FROM pedidos WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmtStatusAtual->execute([$id, $lojaId]);
  $statusAntes = $stmtStatusAtual->fetchColumn();

  if ($statusAntes === false) {
    $conn->rollBack();
    echo json_encode(['ok' => false, 'msg' => 'Pedido nao encontrado.']);
    exit;
  }

  $stmt = $conn->prepare("UPDATE pedidos SET status = ? WHERE id = ? AND loja_id = ?");
  $stmt->execute([$status, $id, $lojaId]);

  $stmt = $conn->prepare("
    INSERT INTO pedido_status_log (pedido_id, status, loja_id)
    VALUES (?, ?, ?)
  ");
  $stmt->execute([$id, $status, $lojaId]);

  if ($status === 'cancelado' && $statusAntes !== 'cancelado') {
    pedidoRestaurarEstoqueCancelado($conn, (int) $id, $lojaId);
  }

  $conn->commit();

  if ($status === 'finalizado') {
    caixaAtribuirPedidoFinalizado($conn, (int) $id, $lojaId);
    cashbackPromoverPendente($conn, (int) $id, $lojaId);
  } elseif ($status === 'cancelado') {
    cashbackCancelarPendente($conn, (int) $id, $lojaId);
  }

  try {
    financialEnsureModule($conn);
    $financialIntegration = new SaleFinancialIntegrationService();
    if ($status === 'finalizado') {
      $financialIntegration->syncFinalizedOrder($conn, $lojaId, (int) $id);
    } elseif ($status === 'cancelado') {
      $financialIntegration->reverseCanceledOrder($conn, $lojaId, (int) $id);
    }
  } catch (Throwable $financeiroErro) {
    error_log('Erro ao sincronizar pedido no financeiro via v1/pedidos_status: ' . $financeiroErro->getMessage());
  }

  registrarOperacao($conn, 'pedido_status', 'pedido:' . $id, [
    'status' => $status,
  ]);
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao atualizar o status do pedido.']);
}
