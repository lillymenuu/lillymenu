<?php
/*
 * Endpoint Bearer-token pro POS (/pos) com as variacoes de um produto.
 * admin/api/produto_variacoes_get.php (legado) so retorna a lista de
 * variacoes (tamanho/cor/preco) — nao inclui extras nem complementos,
 * apesar do que um comentario antigo deste arquivo dizia. O contrato
 * completo (variacoes + extras + complementos_itens, cada um com sua
 * flag "obrigatorio") existe hoje em public/api/produto_variacoes.php
 * (loja publica), mas aquele endpoint e sem autenticacao e confia no
 * loja_id vindo da query string — nao da pra reaproveitar aqui. Este
 * arquivo replica as mesmas 3 queries, escopadas pelo loja_id do token
 * Bearer autenticado.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$produtoId = (int) ($_GET['id'] ?? 0);

if (!$produtoId) {
  echo json_encode(['ok' => false, 'msg' => 'Produto invalido.', 'variacoes' => [], 'extras' => [], 'complementos_itens' => []]);
  exit;
}

$stmt = $conn->prepare("
  SELECT id, tamanho, cor, preco
  FROM produto_variacoes
  WHERE produto_id = ? AND ativo = 1 AND loja_id = ?
  ORDER BY ordem, id
");
$stmt->execute([$produtoId, $lojaId]);
$variacoes = array_map(function ($v) {
  $v['preco'] = (float) $v['preco'];
  return $v;
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

$stmt = $conn->prepare("
  SELECT id, nome, preco, obrigatorio
  FROM produto_extras
  WHERE produto_id = ? AND ativo = 1 AND loja_id = ?
  ORDER BY ordem, id
");
$stmt->execute([$produtoId, $lojaId]);
$extras = array_map(function ($e) {
  $e['preco'] = (float) $e['preco'];
  $e['obrigatorio'] = (int) $e['obrigatorio'];
  return $e;
}, $stmt->fetchAll(PDO::FETCH_ASSOC));
$extrasObrigatorio = false;
foreach ($extras as $e) {
  if ($e['obrigatorio']) { $extrasObrigatorio = true; break; }
}

$stmt = $conn->prepare("
  SELECT id, nome, preco, obrigatorio
  FROM produto_complementos_itens
  WHERE produto_id = ? AND ativo = 1 AND loja_id = ?
  ORDER BY ordem, id
");
$stmt->execute([$produtoId, $lojaId]);
$complementosItens = array_map(function ($c) {
  $c['preco'] = (float) $c['preco'];
  $c['obrigatorio'] = (int) $c['obrigatorio'];
  return $c;
}, $stmt->fetchAll(PDO::FETCH_ASSOC));
$complementosObrigatorio = false;
foreach ($complementosItens as $c) {
  if ($c['obrigatorio']) { $complementosObrigatorio = true; break; }
}

echo json_encode([
  'ok' => true,
  'variacoes' => $variacoes,
  'extras' => $extras,
  'extras_obrigatorio' => $extrasObrigatorio ? 1 : 0,
  'complementos_itens' => $complementosItens,
  'complementos_itens_obrigatorio' => $complementosObrigatorio ? 1 : 0,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
