<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/loja_context.php';
require_once __DIR__ . '/../../helpers/storage.php';
require_once __DIR__ . '/../../admin/helpers/config.php';

header('Content-Type: application/json');

/* Abaixo desse numero de pedidos com produto do carrinho, o historico ainda
   nao e confiavel — usa o fallback por categoria de bebidas. */
const CROSS_SELL_MIN_PEDIDOS = 3;

function fixImgPathCrossSell($caminho) {
  return storage_url_relativa((string) $caminho);
}

function crossSellNomesPorFrequencia(PDO $conn, int $lojaId, array $nomesCarrinho): array {
  if (!$nomesCarrinho) {
    return [];
  }
  $placeholders = implode(',', array_fill(0, count($nomesCarrinho), '?'));

  $stmt = $conn->prepare("
    SELECT DISTINCT pedido_id
    FROM pedido_itens
    WHERE loja_id = ? AND produto_nome IN ($placeholders)
  ");
  $stmt->execute(array_merge([$lojaId], $nomesCarrinho));
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

  $nomes = [];
  foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $nome = $row['produto_nome'];
    if (in_array($nome, $nomesCarrinho, true)) {
      continue;
    }
    $nomes[] = $nome;
  }
  return $nomes;
}

try {
  $lojaId = definirLojaIdSessao($conn);

  $ativo = config($conn, 'cross_sell_ativo', '0') === '1';
  if (!$ativo) {
    echo json_encode(['ok' => true, 'ativo' => false, 'produtos' => []]);
    exit;
  }

  $idsCarrinhoRaw = $_GET['produtos_ids'] ?? '';
  $idsCarrinho = array_values(array_filter(array_map('intval', explode(',', (string) $idsCarrinhoRaw))));

  $colunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temImagem = in_array('imagem', $colunas, true);
  $selectImagem = $temImagem ? ', imagem' : '';
  $temProm = in_array('preco_promocional', $colunas, true) && in_array('promo_desativado', $colunas, true);
  $temPromoDur = in_array('promo_dias', $colunas, true) && in_array('promo_inicio', $colunas, true);
  $selectProm = $temProm ? ', preco_promocional, promo_desativado' : '';
  $selectProm .= $temPromoDur ? ', promo_dias, promo_inicio' : '';

  $nomesCarrinho = [];
  if ($idsCarrinho) {
    $placeholders = implode(',', array_fill(0, count($idsCarrinho), '?'));
    $stmtNomes = $conn->prepare("SELECT nome FROM produtos WHERE id IN ($placeholders) AND loja_id = ?");
    $stmtNomes->execute(array_merge($idsCarrinho, [$lojaId]));
    $nomesCarrinho = $stmtNomes->fetchAll(PDO::FETCH_COLUMN, 0);
  }

  /* 1) Tenta pelo historico real de pedidos: produtos que costumam ser
     comprados junto com o que ja esta no carrinho. */
  $nomesSugeridos = crossSellNomesPorFrequencia($conn, $lojaId, $nomesCarrinho);

  /* 2) Fallback (loja nova / pouco historico): categoria de bebidas por
     nome, como complemento universal — so se o carrinho tiver algo fora
     dela. */
  if (!$nomesSugeridos) {
    $stmt = $conn->prepare("SELECT id, nome FROM categorias WHERE loja_id = ? AND ativo = 1");
    $stmt->execute([$lojaId]);
    $categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $palavrasBebida = ['bebida', 'suco', 'refrigerante', 'refri', 'agua', 'água', 'drink', 'soda', 'cola'];
    $catBebidaId = null;
    foreach ($categorias as $cat) {
      $nomeNormalizado = mb_strtolower($cat['nome'], 'UTF-8');
      foreach ($palavrasBebida as $palavra) {
        if (mb_strpos($nomeNormalizado, $palavra) !== false) {
          $catBebidaId = (int) $cat['id'];
          break 2;
        }
      }
    }

    if ($catBebidaId !== null && $idsCarrinho) {
      $placeholders = implode(',', array_fill(0, count($idsCarrinho), '?'));
      $stmtCat = $conn->prepare("SELECT categoria_id FROM produtos WHERE id IN ($placeholders) AND loja_id = ?");
      $stmtCat->execute(array_merge($idsCarrinho, [$lojaId]));
      $temItemNaoBebida = false;
      foreach ($stmtCat->fetchAll(PDO::FETCH_COLUMN, 0) as $catId) {
        if ((int) $catId !== $catBebidaId) {
          $temItemNaoBebida = true;
          break;
        }
      }
      if ($temItemNaoBebida) {
        $stmtBeb = $conn->prepare("SELECT nome FROM produtos WHERE categoria_id = ? AND loja_id = ? AND ativo = 1 ORDER BY ordem IS NULL, ordem, nome");
        $stmtBeb->execute([$catBebidaId, $lojaId]);
        $nomesSugeridos = $stmtBeb->fetchAll(PDO::FETCH_COLUMN, 0);
      }
    }
  }

  if (!$nomesSugeridos) {
    echo json_encode(['ok' => true, 'ativo' => true, 'produtos' => []]);
    exit;
  }

  /* Mapeia os nomes sugeridos pra produtos ativos de verdade (o historico
     guarda so o nome; produto pode ter sido renomeado/desativado desde). */
  $placeholders = implode(',', array_fill(0, count($nomesSugeridos), '?'));
  $excluirSql = '';
  $params = array_merge($nomesSugeridos, [$lojaId]);
  if ($idsCarrinho) {
    $placeholdersExcluir = implode(',', array_fill(0, count($idsCarrinho), '?'));
    $excluirSql = "AND p.id NOT IN ($placeholdersExcluir)";
    $params = array_merge($params, $idsCarrinho);
  }
  $stmtProd = $conn->prepare("
    SELECT p.id, p.nome, p.preco{$selectImagem}{$selectProm}, IFNULL(e.quantidade,0) AS estoque
    FROM produtos p
    LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
    WHERE p.nome IN ($placeholders) AND p.loja_id = ? AND p.ativo = 1 $excluirSql
  ");
  $stmtProd->execute($params);
  $produtosPorNome = [];
  foreach ($stmtProd->fetchAll(PDO::FETCH_ASSOC) as $p) {
    $produtosPorNome[$p['nome']] = $p;
  }

  $produtos = [];
  foreach ($nomesSugeridos as $nome) {
    if (!isset($produtosPorNome[$nome])) {
      continue;
    }
    $p = $produtosPorNome[$nome];
    if ((int) $p['estoque'] <= 0) {
      continue; /* nao sugere produto esgotado */
    }
    $precoBase = (float) $p['preco'];
    $precoFinal = $precoBase;
    if ($temProm && !($p['promo_desativado'] ?? 1) && ($p['preco_promocional'] ?? 0) > 0) {
      $promoExpirada = false;
      if ($temPromoDur && !empty($p['promo_dias']) && !empty($p['promo_inicio'])) {
        $promoFim = strtotime($p['promo_inicio'] . ' +' . (int) $p['promo_dias'] . ' days');
        if ($promoFim !== false && $promoFim <= strtotime('today')) {
          $promoExpirada = true;
        }
      }
      if (!$promoExpirada) {
        $precoFinal = (float) $p['preco_promocional'];
      }
    }
    $produtos[] = [
      'id' => (int) $p['id'],
      'nome' => $p['nome'],
      'preco' => $precoFinal,
      'imagem' => $temImagem ? fixImgPathCrossSell($p['imagem'] ?? '') : '',
      'estoque' => (int) $p['estoque'],
    ];
    if (count($produtos) >= 3) {
      break;
    }
  }

  echo json_encode(['ok' => true, 'ativo' => true, 'produtos' => $produtos], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao buscar sugestoes.']);
}
