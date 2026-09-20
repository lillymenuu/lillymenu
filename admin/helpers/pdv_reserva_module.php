<?php

/**
 * Reserva de estoque do PDV (balcao). Enquanto o operador monta um pedido no
 * "Resumo do pedido", o PDV manda periodicamente o que esta no carrinho pra ca;
 * a loja publica desconta essas unidades do estoque exibido/validado, entao o
 * cliente nao consegue comprar a ultima unidade que o balcao ja separou.
 *
 * A reserva vive so enquanto o PDV estiver "batendo o ponto": cada envio
 * renova `atualizado_em` e reservas mais velhas que PDV_RESERVA_TTL_SEG sao
 * ignoradas (aba fechada, queda de energia etc. nao travam estoque pra sempre).
 * Nao mexe na tabela "estoque" — o desconto real continua sendo feito so ao
 * finalizar o pedido.
 */

require_once __DIR__ . '/estoque_vinculo_module.php';

if (!defined('PDV_RESERVA_TTL_SEG')) {
  define('PDV_RESERVA_TTL_SEG', 90);
}

if (!function_exists('pdvReservaEnsure')) {
  function pdvReservaEnsure(PDO $conn): void
  {
    static $done = false;
    if ($done) return;
    $done = true;
    try {
      $conn->exec("CREATE TABLE IF NOT EXISTS pdv_reservas (
        loja_id INT NOT NULL,
        sessao VARCHAR(64) NOT NULL,
        produto_id INT NOT NULL,
        quantidade INT NOT NULL,
        atualizado_em DATETIME NOT NULL,
        PRIMARY KEY (loja_id, sessao, produto_id),
        KEY idx_pdvres_loja_atual (loja_id, atualizado_em)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Throwable $e) {
    }
  }
}

/**
 * Unidades reservadas pelo balcao por produto: [produto_id => quantidade].
 * Produtos que dividem estoque (grupo) enxergam a soma das reservas do grupo,
 * ja que consomem o mesmo saldo. Se a tabela ainda nao existe, devolve [].
 */
if (!function_exists('pdvReservaMapa')) {
  function pdvReservaMapa(PDO $conn, int $lojaId): array
  {
    try {
      $stmt = $conn->prepare("
        SELECT produto_id, SUM(quantidade) AS qtd
        FROM pdv_reservas
        WHERE loja_id = ? AND atualizado_em >= (NOW() - INTERVAL " . (int) PDV_RESERVA_TTL_SEG . " SECOND)
        GROUP BY produto_id
      ");
      $stmt->execute([$lojaId]);
      $bruto = [];
      foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $q = (int) $r['qtd'];
        if ($q > 0) $bruto[(int) $r['produto_id']] = $q;
      }
    } catch (Throwable $e) {
      return [];
    }
    if (!$bruto) return [];

    $mapa = [];
    $grupos = [];
    foreach ($bruto as $pid => $q) {
      $membros = estoqueVinculoMembros($conn, $pid, $lojaId);
      if (count($membros) <= 1) {
        $mapa[$pid] = ($mapa[$pid] ?? 0) + $q;
        continue;
      }
      sort($membros);
      $chave = implode(',', $membros);
      $grupos[$chave]['membros'] = $membros;
      $grupos[$chave]['qtd'] = ($grupos[$chave]['qtd'] ?? 0) + $q;
    }
    foreach ($grupos as $g) {
      foreach ($g['membros'] as $m) {
        $mapa[$m] = max($mapa[$m] ?? 0, $g['qtd']);
      }
    }
    return $mapa;
  }
}

/** Estoque disponivel pra loja publica: saldo real menos o que o balcao reservou (nunca negativo). */
if (!function_exists('pdvReservaAplicar')) {
  function pdvReservaAplicar(int $estoque, int $produtoId, array $mapa): int
  {
    return max(0, $estoque - (int) ($mapa[$produtoId] ?? 0));
  }
}

/**
 * Versao do catalogo que a loja publica compara no polling: a configuracao
 * `catalogo_versao` + uma assinatura das reservas ativas. Assim a loja recarrega
 * quando o balcao reserva/libera algo, inclusive quando a reserva expira por TTL.
 */
if (!function_exists('pdvReservaVersao')) {
  function pdvReservaVersao(PDO $conn, int $lojaId, string $base): string
  {
    $mapa = pdvReservaMapa($conn, $lojaId);
    if (!$mapa) return $base;
    ksort($mapa);
    return $base . '|r' . substr(md5(json_encode($mapa)), 0, 10);
  }
}

/**
 * Substitui o que a $sessao (uma aba de PDV) reserva. $itens = [produto_id => quantidade].
 * Lista vazia libera tudo. Reenviar o mesmo conteudo so renova o "ponto".
 */
if (!function_exists('pdvReservaSalvar')) {
  function pdvReservaSalvar(PDO $conn, int $lojaId, string $sessao, array $itens): void
  {
    pdvReservaEnsure($conn);
    $conn->beginTransaction();
    try {
      $conn->prepare("DELETE FROM pdv_reservas WHERE loja_id = ? AND atualizado_em < (NOW() - INTERVAL " . (int) PDV_RESERVA_TTL_SEG . " SECOND)")
        ->execute([$lojaId]);
      $conn->prepare("DELETE FROM pdv_reservas WHERE loja_id = ? AND sessao = ?")->execute([$lojaId, $sessao]);
      if ($itens) {
        $ins = $conn->prepare("INSERT INTO pdv_reservas (loja_id, sessao, produto_id, quantidade, atualizado_em) VALUES (?, ?, ?, ?, NOW())");
        foreach ($itens as $pid => $q) {
          if ((int) $pid > 0 && (int) $q > 0) $ins->execute([$lojaId, $sessao, (int) $pid, (int) $q]);
        }
      }
      $conn->commit();
    } catch (Throwable $e) {
      if ($conn->inTransaction()) $conn->rollBack();
      throw $e;
    }
  }
}
