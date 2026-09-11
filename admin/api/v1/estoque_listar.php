<?php
/*
 * Versao JSON de admin/api/estoque_list.php para o novo frontend Next.js
 * (/stock). Todos os produtos da loja com a quantidade de estoque
 * (0 se o produto ainda nao tem linha em `estoque`), trocando sessao por
 * token Bearer. Usado tanto na carga inicial da pagina quanto no polling
 * client-side (mesmo espirito do estoque.js legado: sem isso, uma venda
 * feita no PDV ou na loja publica enquanto a tela fica aberta so aparecia
 * depois de um F5 manual).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$stmt = $conn->prepare("
  SELECT
    p.id,
    p.nome,
    IFNULL(e.quantidade, 0) AS quantidade
  FROM produtos p
  LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
  WHERE p.loja_id = ?
  ORDER BY p.nome
");
$stmt->execute([$lojaId]);
$itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($itens as &$item) {
  $item['id'] = (int) $item['id'];
  $item['quantidade'] = (int) $item['quantidade'];
}
unset($item);

echo json_encode(['ok' => true, 'itens' => $itens], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
