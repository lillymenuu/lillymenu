<?php
/*
 * Lista os combos da loja pra tela de Produtos no Next. Sem equivalente
 * legado dedicado — admin/produtos.php inlina essa query direto no PHP
 * da pagina (linhas ~127-144). Endpoint novo, escrito a mao (query
 * simples), Bearer-auth direto (sem ponte de sessao).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$stmt = $conn->prepare("SHOW TABLES LIKE 'combos'");
$stmt->execute();
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok' => true, 'combos' => []], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("
  SELECT id, nome, imagem, categoria_id, tipo_preco, preco, preco_promocional, promo_desativado, ativo
  FROM combos
  WHERE loja_id = ?
  ORDER BY ordem IS NULL, ordem, nome
");
$stmt->execute([$lojaId]);
$combos = array_map(function ($c) {
  return [
    'id' => (int) $c['id'],
    'nome' => $c['nome'],
    'imagem' => $c['imagem'],
    'categoria_id' => $c['categoria_id'] !== null ? (int) $c['categoria_id'] : null,
    'tipo_preco' => $c['tipo_preco'],
    'preco' => (float) $c['preco'],
    'preco_promocional' => $c['preco_promocional'] !== null ? (float) $c['preco_promocional'] : null,
    'promo_desativado' => (int) $c['promo_desativado'],
    'ativo' => (int) $c['ativo'],
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

echo json_encode(['ok' => true, 'combos' => $combos], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
