<?php

/**
 * Um item de combo vendido (pedido_itens) referencia o id da tabela "combos",
 * nao um produto real — o estoque de um combo e controlado pelos produtos que
 * o compoem (combosels), escolhidos pelo cliente/operador no momento da venda.
 * Essa escolha so existe no payload da requisicao; sem persistir aqui, nao ha
 * como saber o que devolver ao estoque quando o pedido e cancelado depois.
 */

if (!function_exists('comboEstoqueEnsureModule')) {
  function comboEstoqueEnsureModule(PDO $conn): void
  {
    static $done = false;
    if ($done) return;
    $done = true;

    try {
      $conn->exec("CREATE TABLE IF NOT EXISTS pedido_combo_itens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pedido_id INT NOT NULL,
        pedido_item_id INT NOT NULL,
        produto_id INT NOT NULL,
        quantidade INT NOT NULL,
        loja_id INT NOT NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_pci_pedido (pedido_id, loja_id),
        KEY idx_pci_item (pedido_item_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Throwable $e) {
    }
  }
}

/**
 * Registra os produtos que compuseram um item de combo dentro de um pedido, pra
 * que o cancelamento saiba o que devolver ao estoque. $combosels e a lista
 * bruta enviada pelo cliente (cada item com 'id' e 'qtd'); $qtdItem multiplica
 * a quantidade de combos vendidos.
 */
if (!function_exists('comboEstoqueRegistrarComponentes')) {
  function comboEstoqueRegistrarComponentes(PDO $conn, int $pedidoId, int $pedidoItemId, array $combosels, int $qtdItem, int $lojaId): void
  {
    if ($pedidoItemId <= 0 || !$combosels) {
      return;
    }
    comboEstoqueEnsureModule($conn);
    try {
      $stmt = $conn->prepare("
        INSERT INTO pedido_combo_itens (pedido_id, pedido_item_id, produto_id, quantidade, loja_id)
        VALUES (?, ?, ?, ?, ?)
      ");
      foreach ($combosels as $sel) {
        $selId = (int) ($sel['id'] ?? 0);
        $selQtd = (int) ($sel['qtd'] ?? 1) * max(1, $qtdItem);
        if ($selId <= 0 || $selQtd <= 0) {
          continue;
        }
        $stmt->execute([$pedidoId, $pedidoItemId, $selId, $selQtd, $lojaId]);
      }
    } catch (Throwable $e) {
    }
  }
}

/**
 * Soma, por produto, quanto devolver ao estoque de um pedido inteiro somando
 * os componentes registrados de todos os itens de combo do pedido.
 * Retorna [produto_id => quantidade].
 */
if (!function_exists('comboEstoqueComponentesDoPedido')) {
  function comboEstoqueComponentesDoPedido(PDO $conn, int $pedidoId, int $lojaId): array
  {
    comboEstoqueEnsureModule($conn);
    $mapa = [];
    try {
      $stmt = $conn->prepare("
        SELECT produto_id, SUM(quantidade) AS quantidade
        FROM pedido_combo_itens
        WHERE pedido_id = ? AND loja_id = ?
        GROUP BY produto_id
      ");
      $stmt->execute([$pedidoId, $lojaId]);
      foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $mapa[(int) $row['produto_id']] = (int) $row['quantidade'];
      }
    } catch (Throwable $e) {
    }
    return $mapa;
  }
}

/**
 * Ids de pedido_itens (dentro de um pedido) que sao itens de combo, ou seja,
 * tem componentes persistidos em pedido_combo_itens — usado pra nao tratar o
 * id do combo salvo em pedido_itens como se fosse um produto real ao repor
 * estoque.
 */
if (!function_exists('comboEstoquePedidoItemIdsComCombo')) {
  function comboEstoquePedidoItemIdsComCombo(PDO $conn, int $pedidoId, int $lojaId): array
  {
    comboEstoqueEnsureModule($conn);
    $ids = [];
    try {
      $stmt = $conn->prepare("
        SELECT DISTINCT pedido_item_id
        FROM pedido_combo_itens
        WHERE pedido_id = ? AND loja_id = ?
      ");
      $stmt->execute([$pedidoId, $lojaId]);
      foreach ($stmt->fetchAll(PDO::FETCH_COLUMN, 0) as $id) {
        $ids[(int) $id] = true;
      }
    } catch (Throwable $e) {
    }
    return $ids;
  }
}
