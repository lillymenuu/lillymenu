<?php

require_once __DIR__ . '/combo_estoque_module.php';
require_once __DIR__ . '/estoque_vinculo_module.php';

/**
 * Repõe ao estoque os itens de um pedido cancelado. Usado tanto por
 * admin/api/pedidos_cancelar.php (botão "Cancelar pedido" no modal de
 * detalhe) quanto por admin/api/pedidos_status.php (botão "Recusar pedido"
 * no card, que também leva um pedido a 'cancelado') — antes só o primeiro
 * repunha estoque, então recusar um pedido pelo card deixava o produto
 * (e qualquer outro vinculado a ele) esgotado pra sempre. Centralizar aqui
 * evita as duas rotas divergirem de novo no futuro.
 */
if (!function_exists('pedidoRestaurarEstoqueCancelado')) {
  function pedidoRestaurarEstoqueCancelado(PDO $conn, int $pedidoId, int $lojaId): void
  {
    try {
      $itensColunas = $conn->query("SHOW COLUMNS FROM pedido_itens")->fetchAll(PDO::FETCH_COLUMN, 0);
      $temProdutoId = in_array('produto_id', $itensColunas, true);
      $temProdutoNome = in_array('produto_nome', $itensColunas, true);

      $selectItens = $temProdutoId
        ? "SELECT id, produto_id, produto_nome, quantidade FROM pedido_itens WHERE pedido_id = ? AND loja_id = ?"
        : "SELECT id, NULL AS produto_id, produto_nome, quantidade FROM pedido_itens WHERE pedido_id = ? AND loja_id = ?";
      $stmtItens = $conn->prepare($selectItens);
      $stmtItens->execute([$pedidoId, $lojaId]);
      $itens = $stmtItens->fetchAll(PDO::FETCH_ASSOC);

      // Itens de combo salvam o id da tabela "combos" em pedido_itens (nao de
      // "produtos") — precisam ser excluidos da reposicao normal abaixo e
      // repostos via os componentes persistidos em pedido_combo_itens.
      $itensComboIds = comboEstoquePedidoItemIdsComCombo($conn, $pedidoId, $lojaId);
      $componentesCombo = comboEstoqueComponentesDoPedido($conn, $pedidoId, $lojaId);

      $stmtEstoqueInsert = $conn->prepare("INSERT IGNORE INTO estoque (produto_id, quantidade, loja_id) VALUES (?, 0, ?)");
      $stmtEstoqueUpdate = $conn->prepare("UPDATE estoque SET quantidade = quantidade + ? WHERE produto_id = ? AND loja_id = ?");
      $stmtMov = $conn->prepare("
        INSERT INTO estoque_movimentacoes (produto_id, tipo, quantidade, origem, referencia_id, loja_id)
        VALUES (?, 'entrada', ?, 'pedido_cancelado', ?, ?)
      ");
      $stmtBuscaProduto = $conn->prepare("SELECT id FROM produtos WHERE nome = ? AND loja_id = ? LIMIT 1");

      foreach ($itens as $item) {
        if (isset($itensComboIds[(int) ($item['id'] ?? 0)])) {
          continue;
        }
        $produtoId = (int) ($item['produto_id'] ?? 0);
        $quantidade = (int) ($item['quantidade'] ?? 0);
        if ($quantidade <= 0) {
          continue;
        }
        if ($produtoId <= 0 && $temProdutoNome) {
          $nomeProduto = trim((string) ($item['produto_nome'] ?? ''));
          if ($nomeProduto !== '') {
            $stmtBuscaProduto->execute([$nomeProduto, $lojaId]);
            $produtoId = (int) $stmtBuscaProduto->fetchColumn();
          }
        }
        if ($produtoId <= 0) {
          continue;
        }
        $stmtEstoqueInsert->execute([$produtoId, $lojaId]);
        $stmtEstoqueUpdate->execute([$quantidade, $produtoId, $lojaId]);
        $stmtMov->execute([$produtoId, $quantidade, $pedidoId, $lojaId]);
        estoqueVinculoSincronizar($conn, $produtoId, $lojaId, ['tipo' => 'entrada', 'quantidade' => $quantidade, 'origem' => 'pedido_cancelado', 'referencia_id' => $pedidoId]);
      }

      foreach ($componentesCombo as $produtoId => $quantidade) {
        if ($produtoId <= 0 || $quantidade <= 0) {
          continue;
        }
        $stmtEstoqueInsert->execute([$produtoId, $lojaId]);
        $stmtEstoqueUpdate->execute([$quantidade, $produtoId, $lojaId]);
        $stmtMov->execute([$produtoId, $quantidade, $pedidoId, $lojaId]);
        estoqueVinculoSincronizar($conn, $produtoId, $lojaId, ['tipo' => 'entrada', 'quantidade' => $quantidade, 'origem' => 'pedido_cancelado', 'referencia_id' => $pedidoId]);
      }
    } catch (Throwable $e) {
    }
  }
}
