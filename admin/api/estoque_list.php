<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/estoque_vinculo_module.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
estoqueVinculoEnsureModule($conn);

$stmt = $conn->prepare("
  SELECT
    p.id,
    p.nome,
    IFNULL(e.quantidade,0) AS quantidade,
    egm.grupo_id
  FROM produtos p
  LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
  LEFT JOIN estoque_grupo_membros egm ON egm.produto_id = p.id AND egm.loja_id = p.loja_id
  WHERE p.loja_id = ?
  ORDER BY p.nome
");
$stmt->execute([$lojaId]);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
