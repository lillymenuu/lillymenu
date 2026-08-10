<?php
require 'config/database.php';
$lojaId=1;
$pedidoCols=$conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN,0);
$itensCols=$conn->query("SHOW COLUMNS FROM pedido_itens")->fetchAll(PDO::FETCH_COLUMN,0);
$produtoCols=$conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN,0);
$estoqueCols=$conn->query("SHOW COLUMNS FROM estoque")->fetchAll(PDO::FETCH_COLUMN,0);
$temProdutoId=in_array('produto_id',$itensCols,true);
$temLojaPedidos=in_array('loja_id',$pedidoCols,true);
$temLojaItens=in_array('loja_id',$itensCols,true);
$temLojaProdutos=in_array('loja_id',$produtoCols,true);
$temLojaEstoque=in_array('loja_id',$estoqueCols,true);
$temStatus=in_array('status',$pedidoCols,true);
$sql = "
SELECT COALESCE(pr.id, i.produto_id) AS produto_id,
       COALESCE(pr.nome, i.produto_nome) AS nome,
       COALESCE(pr.preco, i.preco) AS valor,
       COALESCE(e.quantidade, 0) AS estoque,
       SUM(i.quantidade) AS saidas
FROM pedido_itens i
JOIN pedidos p ON p.id = i.pedido_id
LEFT JOIN produtos pr ON (
  pr.id = NULLIF(i.produto_id, 0)
  OR ((i.produto_id IS NULL OR i.produto_id = 0) AND pr.nome = i.produto_nome)
)" .
($temLojaProdutos ? " AND pr.loja_id = :loja" : "") . "
LEFT JOIN estoque e ON e.produto_id = pr.id" .
($temLojaEstoque ? " AND e.loja_id = :loja" : "") . "
WHERE 1=1" .
($temStatus ? " AND p.status = 'finalizado'" : "") .
($temLojaPedidos ? " AND p.loja_id = :loja" : "") .
($temLojaItens ? " AND i.loja_id = :loja" : "") . "
GROUP BY produto_id, nome, valor, estoque
ORDER BY saidas DESC
LIMIT 5
";
$stmt=$conn->prepare($sql);
if ($temLojaPedidos || $temLojaItens || $temLojaProdutos || $temLojaEstoque) {
  $stmt->bindValue(':loja',$lojaId,PDO::PARAM_INT);
}
$stmt->execute();
$rows=$stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($rows);
?>
