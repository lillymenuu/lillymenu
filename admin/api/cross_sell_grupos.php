<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/config.php';

header('Content-Type: application/json');

/* Abaixo desse numero de pedidos com produto da categoria, o historico
   ainda nao e confiavel — usa o fallback por categoria de bebidas. */
const CROSS_SELL_MIN_PEDIDOS = 3;

function crossSellPalavrasBebida(): array {
  return ['bebida', 'suco', 'refrigerante', 'refri', 'agua', 'água', 'drink', 'soda', 'cola'];
}

function crossSellCoOcorrencias(PDO $conn, int $lojaId, array $nomesCategoria, array $categoriaPorNome, int $catIdExcluir): array {
  if (!$nomesCategoria) {
    return [];
  }
  $placeholders = implode(',', array_fill(0, count($nomesCategoria), '?'));

  $stmt = $conn->prepare("
    SELECT DISTINCT pedido_id
    FROM pedido_itens
    WHERE loja_id = ? AND produto_nome IN ($placeholders)
  ");
  $stmt->execute(array_merge([$lojaId], $nomesCategoria));
  $pedidoIds = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

  if (count($pedidoIds) < CROSS_SELL_MIN_PEDIDOS) {
    return [];
  }

  $placeholdersPedidos = implode(',', array_fill(0, count($pedidoIds), '?'));
  $stmt = $conn->prepare("
    SELECT produto_nome, COUNT(DISTINCT pedido_id) AS qtd
    FROM pedido_itens
    WHERE loja_id = ? AND pedido_id IN ($placeholdersPedidos)
    GROUP BY produto_nome
    ORDER BY qtd DESC
  ");
  $stmt->execute(array_merge([$lojaId], $pedidoIds));

  $sugestoes = [];
  foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $nome = $row['produto_nome'];
    if (in_array($nome, $nomesCategoria, true)) {
      continue; // nao sugere produto da propria categoria
    }
    if (!array_key_exists($nome, $categoriaPorNome)) {
      continue; // produto historico que nao existe mais / esta inativo
    }
    if ($categoriaPorNome[$nome] === $catIdExcluir) {
      continue;
    }
    $sugestoes[] = $nome;
    if (count($sugestoes) >= 3) {
      break;
    }
  }
  return $sugestoes;
}

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$ativo = config($conn, 'cross_sell_ativo', '0') === '1';

$grupos = [];

if ($ativo) {
  try {
    $stmt = $conn->prepare("
      SELECT id, nome
      FROM categorias
      WHERE loja_id = ? AND ativo = 1
      ORDER BY ordem IS NULL, ordem, nome
    ");
    $stmt->execute([$lojaId]);
    $categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $produtosPorCategoria = [];
    $categoriaPorNome = [];
    if ($categorias) {
      $stmt = $conn->prepare("
        SELECT nome, categoria_id
        FROM produtos
        WHERE loja_id = ? AND ativo = 1 AND categoria_id IS NOT NULL
        ORDER BY ordem IS NULL, ordem, nome
      ");
      $stmt->execute([$lojaId]);
      foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $p) {
        $catId = (int) $p['categoria_id'];
        $produtosPorCategoria[$catId][] = $p['nome'];
        $categoriaPorNome[$p['nome']] = $catId;
      }
    }

    /* Fallback para categorias sem historico suficiente (loja nova ou
       categoria pouco vendida): sugere a categoria de bebidas, identificada
       pelo nome — bebida e o complemento mais universal em pedidos de
       comida, dispensando curadoria manual. */
    $catBebidaId = null;
    foreach ($categorias as $cat) {
      $nomeNormalizado = mb_strtolower($cat['nome'], 'UTF-8');
      foreach (crossSellPalavrasBebida() as $palavra) {
        if (mb_strpos($nomeNormalizado, $palavra) !== false) {
          $catBebidaId = (int) $cat['id'];
          break 2;
        }
      }
    }
    $produtosBebida = $catBebidaId !== null ? ($produtosPorCategoria[$catBebidaId] ?? []) : [];

    foreach ($categorias as $cat) {
      $catId = (int) $cat['id'];
      $nomesCategoria = $produtosPorCategoria[$catId] ?? [];
      if (!$nomesCategoria) {
        continue;
      }

      $sugestoes = crossSellCoOcorrencias($conn, $lojaId, $nomesCategoria, $categoriaPorNome, $catId);

      if (!$sugestoes && $catId !== $catBebidaId && $produtosBebida) {
        $sugestoes = array_slice($produtosBebida, 0, 3);
      }

      if ($sugestoes) {
        $grupos[] = [
          'categoria' => $cat['nome'],
          'total_produtos' => count($sugestoes),
          'exemplos' => $sugestoes,
        ];
      }
    }
  } catch (Exception $e) {
    $grupos = [];
  }
}

$faturamentoExtra = 0.0;
try {
  $colsItens = $conn->query("SHOW COLUMNS FROM pedido_itens")->fetchAll(PDO::FETCH_COLUMN, 0);
  if (in_array('cross_sell', $colsItens, true)) {
    $stmt = $conn->prepare("
      SELECT COALESCE(SUM(pi.preco * pi.quantidade), 0)
      FROM pedido_itens pi
      JOIN pedidos p ON p.id = pi.pedido_id AND p.loja_id = pi.loja_id
      WHERE pi.loja_id = ? AND pi.cross_sell = 1 AND p.status <> 'cancelado'
    ");
    $stmt->execute([$lojaId]);
    $faturamentoExtra = (float) $stmt->fetchColumn();
  }
} catch (Exception $e) {
  $faturamentoExtra = 0.0;
}

echo json_encode([
  'ok' => true,
  'ativo' => $ativo,
  'faturamento_extra' => $faturamentoExtra,
  'grupos' => $grupos,
], JSON_UNESCAPED_UNICODE);
