<?php

/**
 * Atribui o caixa aberto da loja (de qualquer operador) a um pedido que ainda nao
 * tem caixa_id — caso dos pedidos agendados feitos pelo cliente em loja.php, que
 * nascem sem operador/caixa. So faz sentido chamar isso na finalizacao do pedido,
 * para que ele entre na movimentacao do caixa aberto no dia em que foi processado
 * (nao no dia em que foi originalmente criado/agendado).
 */
if (!function_exists('caixaAtribuirPedidoFinalizado')) {
  function caixaAtribuirPedidoFinalizado(PDO $conn, int $pedidoId, int $lojaId): void {
    try {
      $stmtPedido = $conn->prepare("SELECT caixa_id FROM pedidos WHERE id = ? AND loja_id = ?");
      $stmtPedido->execute([$pedidoId, $lojaId]);
      $caixaAtualPedido = $stmtPedido->fetchColumn();
      if ($caixaAtualPedido) {
        return; // ja tem caixa (ex: pedido criado pelo PDV) — nao sobrescreve
      }

      $stmtCaixa = $conn->prepare("
        SELECT id FROM caixa_turnos
        WHERE status = 'aberto' AND loja_id = ? AND DATE(aberto_em) = CURDATE()
        ORDER BY id DESC
        LIMIT 1
      ");
      $stmtCaixa->execute([$lojaId]);
      $caixaId = (int) $stmtCaixa->fetchColumn();
      if ($caixaId <= 0) {
        return; // nenhum caixa aberto hoje — fica sem caixa, como ja era
      }

      $conn->prepare("UPDATE pedidos SET caixa_id = COALESCE(caixa_id, ?) WHERE id = ? AND loja_id = ?")
           ->execute([$caixaId, $pedidoId, $lojaId]);
    } catch (Throwable $e) {
    }
  }
}
