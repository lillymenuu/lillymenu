<?php
/*
 * Variacoes/extras/complementos de UM produto, pro form de edicao do
 * cadastro de produtos no Next (admin/api/v1/produtos.php GET lista todos
 * os produtos numa chamada so, sem esses arrays — caro demais pra grade
 * inteira). Mesma query/ordenacao/filtro de admin/api/produtos_get.php:
 * variacoes sem filtro de ativo, extras/complementos com ativo = 1.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$produtoId = (int) ($_GET['id'] ?? 0);
if ($produtoId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Produto inválido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("SELECT id FROM produtos WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$produtoId, $lojaId]);
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Produto não encontrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function produtoVarDetTabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Throwable $e) {
    return false;
  }
}

$variacoes = [];
if (produtoVarDetTabelaExiste($conn, 'produto_variacoes')) {
  $stmt = $conn->prepare("
    SELECT id, tamanho, cor, preco
    FROM produto_variacoes
    WHERE produto_id = ? AND loja_id = ?
    ORDER BY ordem, id
  ");
  $stmt->execute([$produtoId, $lojaId]);
  $variacoes = array_map(function ($v) {
    return ['id' => (int) $v['id'], 'tamanho' => $v['tamanho'], 'cor' => $v['cor'], 'preco' => (float) $v['preco']];
  }, $stmt->fetchAll(PDO::FETCH_ASSOC));
}

$extras = [];
if (produtoVarDetTabelaExiste($conn, 'produto_extras')) {
  $stmt = $conn->prepare("
    SELECT id, nome, preco, obrigatorio
    FROM produto_extras
    WHERE produto_id = ? AND ativo = 1 AND loja_id = ?
    ORDER BY ordem, id
  ");
  $stmt->execute([$produtoId, $lojaId]);
  $extras = array_map(function ($e) {
    return ['id' => (int) $e['id'], 'nome' => $e['nome'], 'preco' => (float) $e['preco'], 'obrigatorio' => (int) $e['obrigatorio']];
  }, $stmt->fetchAll(PDO::FETCH_ASSOC));
}

$complementosItens = [];
if (produtoVarDetTabelaExiste($conn, 'produto_complementos_itens')) {
  $stmt = $conn->prepare("
    SELECT id, nome, preco, obrigatorio
    FROM produto_complementos_itens
    WHERE produto_id = ? AND ativo = 1 AND loja_id = ?
    ORDER BY ordem, id
  ");
  $stmt->execute([$produtoId, $lojaId]);
  $complementosItens = array_map(function ($c) {
    return ['id' => (int) $c['id'], 'nome' => $c['nome'], 'preco' => (float) $c['preco'], 'obrigatorio' => (int) $c['obrigatorio']];
  }, $stmt->fetchAll(PDO::FETCH_ASSOC));
}

echo json_encode([
  'ok' => true,
  'variacoes' => $variacoes,
  'extras' => $extras,
  'complementos_itens' => $complementosItens,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
