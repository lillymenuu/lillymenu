<?php
/*
 * Item picker da tela Quotes (orcamentos) — catalogo completo de produtos
 * ativos da loja, Bearer-scoped. O legado (admin/orcamentos.php) restringia
 * a produtos de categorias com nome contendo "encomenda", mas isso deixa o
 * picker vazio pra qualquer loja que nao tenha uma categoria com esse nome
 * ativa (o caso comum) — Quotes e uma reconstrucao de verdade, nao um port
 * fiel, entao aqui mostramos o catalogo inteiro, igual ao POS.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$produtoColunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temOrdem = in_array('ordem', $produtoColunas, true);
$temPrecoPromocional = in_array('preco_promocional', $produtoColunas, true);
$temPromoDesativado = in_array('promo_desativado', $produtoColunas, true);
$temImagem = in_array('imagem', $produtoColunas, true);
$precoExpr = ($temPrecoPromocional && $temPromoDesativado)
  ? "IF(p.promo_desativado = 0 AND p.preco_promocional IS NOT NULL AND p.preco_promocional > 0, p.preco_promocional, p.preco)"
  : "p.preco";
$ordenacaoProdutos = $temOrdem
  ? "ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.ordem IS NULL, p.ordem, p.nome"
  : "ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.nome";
$selectImagem = $temImagem ? ', p.imagem' : '';

$stmt = $conn->prepare("
  SELECT p.id, p.nome, $precoExpr AS preco,
         IFNULL(e.quantidade, 0) AS estoque{$selectImagem}
  FROM produtos p
  LEFT JOIN categorias c ON c.id = p.categoria_id AND c.loja_id = p.loja_id
  LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
  WHERE p.ativo = 1
    AND p.loja_id = ?
  $ordenacaoProdutos
");
$stmt->execute([$lojaId]);
$produtos = array_map(function ($p) {
  return [
    'id' => (int) $p['id'],
    'nome' => $p['nome'],
    'preco' => (float) $p['preco'],
    'estoque' => (int) $p['estoque'],
    'imagem' => $p['imagem'] ?? null,
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

echo json_encode(['ok' => true, 'produtos' => $produtos], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
