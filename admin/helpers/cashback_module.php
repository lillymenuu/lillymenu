<?php

if (!function_exists('cashbackTabelaExiste')) {
  function cashbackTabelaExiste(PDO $conn, string $tabela): bool {
    try {
      $stmt = $conn->prepare("SHOW TABLES LIKE ?");
      $stmt->execute([$tabela]);
      return (bool) $stmt->fetchColumn();
    } catch (Throwable $e) {
      return false;
    }
  }
}

/**
 * Garante a coluna disponivel_em (carencia) e o valor 'pendente' no ENUM tipo.
 * Contem DDL — sempre chamar ANTES de iniciar uma transacao (DDL da commit implicito no MySQL).
 */
if (!function_exists('cashbackEnsureModule')) {
  function cashbackEnsureModule(PDO $conn): void {
    static $done = false;
    if ($done) return;
    $done = true;
    if (!cashbackTabelaExiste($conn, 'cashback_movimentacoes')) return;

    try {
      $col = $conn->query("SHOW COLUMNS FROM cashback_movimentacoes LIKE 'disponivel_em'")->fetch(PDO::FETCH_ASSOC);
      if (!$col) {
        $conn->exec("ALTER TABLE cashback_movimentacoes ADD COLUMN disponivel_em DATETIME NULL AFTER expira_em");
      }
    } catch (Throwable $e) {
    }

    try {
      $col = $conn->query("SHOW COLUMNS FROM cashback_movimentacoes LIKE 'tipo'")->fetch(PDO::FETCH_ASSOC);
      if ($col && stripos((string) $col['Type'], "'pendente'") === false) {
        $conn->exec("ALTER TABLE cashback_movimentacoes MODIFY COLUMN tipo ENUM('entrada','uso','expirado','ajuste','pendente') NOT NULL");
      }
    } catch (Throwable $e) {
    }
  }
}

/**
 * Promove o cashback 'pendente' de um pedido para credito real ('entrada'), aplicando
 * a carencia/expiracao configuradas no momento da finalizacao. Idempotente.
 */
if (!function_exists('cashbackPromoverPendente')) {
  function cashbackPromoverPendente(PDO $conn, int $pedidoId, int $lojaId): void {
    if (!cashbackTabelaExiste($conn, 'cashback_movimentacoes')) return;

    try {
      $stmtCliente = $conn->prepare("SELECT cliente_id FROM pedidos WHERE id = ? AND loja_id = ?");
      $stmtCliente->execute([$pedidoId, $lojaId]);
      $clienteId = (int) $stmtCliente->fetchColumn();
      if ($clienteId <= 0) return;

      $stmtCheck = $conn->prepare("SELECT COUNT(*) FROM cashback_movimentacoes WHERE pedido_id = ? AND tipo = 'entrada' AND loja_id = ?");
      $stmtCheck->execute([$pedidoId, $lojaId]);
      $jaCreditado = (int) $stmtCheck->fetchColumn() > 0;

      if (!$jaCreditado) {
        $stmtPend = $conn->prepare("SELECT SUM(valor) FROM cashback_movimentacoes WHERE pedido_id = ? AND tipo = 'pendente' AND loja_id = ?");
        $stmtPend->execute([$pedidoId, $lojaId]);
        $pendente = round((float) $stmtPend->fetchColumn(), 2);

        $cashbackAtivo = config($conn, 'cashback_ativo', '0') === '1';

        if ($pendente > 0.009 && $cashbackAtivo) {
          $carenciaHoras = max(0, (int) config($conn, 'cashback_carencia_horas', 12));
          $expiraDias    = (int) config($conn, 'cashback_expira_dias', 0);
          $expiraEm      = $expiraDias > 0 ? date('Y-m-d', strtotime("+{$expiraDias} days")) : null;
          $disponivelEm  = $carenciaHoras > 0 ? date('Y-m-d H:i:s', strtotime("+{$carenciaHoras} hours")) : null;

          $stmtSaldo = $conn->prepare("SELECT cashback_saldo FROM clientes WHERE id = ? AND loja_id = ?");
          $stmtSaldo->execute([$clienteId, $lojaId]);
          $saldoAntes  = (float) $stmtSaldo->fetchColumn();
          $saldoDepois = $saldoAntes + $pendente;

          $conn->prepare("
            INSERT INTO cashback_movimentacoes
              (cliente_id, pedido_id, tipo, valor, saldo_antes, saldo_depois, expira_em, disponivel_em, referencia_id, loja_id)
            VALUES (?, ?, 'entrada', ?, ?, ?, ?, ?, NULL, ?)
          ")->execute([$clienteId, $pedidoId, $pendente, $saldoAntes, $saldoDepois, $expiraEm, $disponivelEm, $lojaId]);

          $conn->prepare("UPDATE clientes SET cashback_saldo = GREATEST(0, cashback_saldo + ?) WHERE id = ? AND loja_id = ?")
               ->execute([$pendente, $clienteId, $lojaId]);
        }
      }

      $conn->prepare("DELETE FROM cashback_movimentacoes WHERE pedido_id = ? AND tipo = 'pendente' AND loja_id = ?")
           ->execute([$pedidoId, $lojaId]);
    } catch (Throwable $e) {
    }
  }
}

/**
 * Remove o cashback 'pendente' de um pedido cancelado — nunca chega a ser creditado.
 */
if (!function_exists('cashbackCancelarPendente')) {
  function cashbackCancelarPendente(PDO $conn, int $pedidoId, int $lojaId): void {
    if (!cashbackTabelaExiste($conn, 'cashback_movimentacoes')) return;
    try {
      $conn->prepare("DELETE FROM cashback_movimentacoes WHERE pedido_id = ? AND tipo = 'pendente' AND loja_id = ?")
           ->execute([$pedidoId, $lojaId]);
    } catch (Throwable $e) {
    }
  }
}
