<?php

if (!function_exists('pedidosTabelaExiste')) {
  function pedidosTabelaExiste(PDO $conn, string $tabela): bool
  {
    static $cache = [];
    if (array_key_exists($tabela, $cache)) {
      return $cache[$tabela];
    }

    try {
      $stmt = $conn->prepare('SHOW TABLES LIKE ?');
      $stmt->execute([$tabela]);
      $cache[$tabela] = (bool) $stmt->fetchColumn();
    } catch (Throwable $e) {
      $cache[$tabela] = false;
    }

    return $cache[$tabela];
  }
}

if (!function_exists('pedidosColunasTabela')) {
  function pedidosColunasTabela(PDO $conn, string $tabela): array
  {
    static $cache = [];
    if (isset($cache[$tabela])) {
      return $cache[$tabela];
    }

    try {
      $cache[$tabela] = $conn->query("SHOW COLUMNS FROM {$tabela}")->fetchAll(PDO::FETCH_COLUMN, 0);
    } catch (Throwable $e) {
      $cache[$tabela] = [];
    }

    return $cache[$tabela];
  }
}

if (!function_exists('pedidosDataBaseExpr')) {
  function pedidosDataBaseExpr(PDO $conn, string $pedidoAlias = 'p'): string
  {
    $pedidoCols = pedidosColunasTabela($conn, 'pedidos');
    $datas = [];
    foreach (['criado_em', 'created_at', 'data', 'data_pedido', 'data_criacao'] as $col) {
      if (in_array($col, $pedidoCols, true)) {
        $datas[] = "{$pedidoAlias}.{$col}";
      }
    }

    if (!$datas) {
      return "{$pedidoAlias}.criado_em";
    }

    return count($datas) > 1 ? 'COALESCE(' . implode(', ', $datas) . ')' : $datas[0];
  }
}

if (!function_exists('pedidosCompetenciaConfig')) {
  function pedidosCompetenciaConfig(PDO $conn, string $pedidoAlias = 'p', string $caixaAlias = 'cx'): array
  {
    $baseExpr = pedidosDataBaseExpr($conn, $pedidoAlias);
    $join = '';
    $expr = $baseExpr;

    $pedidoCols = pedidosColunasTabela($conn, 'pedidos');
    if (in_array('caixa_id', $pedidoCols, true) && pedidosTabelaExiste($conn, 'caixa_turnos')) {
      $caixaCols = pedidosColunasTabela($conn, 'caixa_turnos');
      $colDataCaixa = null;
      foreach (['aberto_em', 'criado_em', 'created_at'] as $col) {
        if (in_array($col, $caixaCols, true)) {
          $colDataCaixa = $col;
          break;
        }
      }

      if ($colDataCaixa) {
        $join = " LEFT JOIN caixa_turnos {$caixaAlias} ON {$caixaAlias}.id = {$pedidoAlias}.caixa_id AND {$caixaAlias}.loja_id = {$pedidoAlias}.loja_id ";
        $expr = "COALESCE({$caixaAlias}.{$colDataCaixa}, {$baseExpr})";
      }
    }

    return [
      'join' => $join,
      'expr' => $expr,
      'date_expr' => "DATE({$expr})",
    ];
  }
}
