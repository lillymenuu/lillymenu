<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$colunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temOrdem = in_array('ordem', $colunas, true);
$temPrecoPromocional = in_array('preco_promocional', $colunas, true);
$temPromoDesativado = in_array('promo_desativado', $colunas, true);
$precoExpr = ($temPrecoPromocional && $temPromoDesativado)
  ? "IF(p.promo_desativado = 0 AND p.preco_promocional IS NOT NULL AND p.preco_promocional > 0, p.preco_promocional, p.preco)"
  : "p.preco";
$ordenacao = $temOrdem
  ? "ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.ordem IS NULL, p.ordem, p.nome"
  : "ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.nome";

$stmt = $conn->prepare("
  SELECT 
    p.id,
    p.nome,
    $precoExpr AS preco,
    p.ativo,
    c.nome AS categoria
  FROM produtos p
  LEFT JOIN categorias c ON c.id = p.categoria_id AND c.loja_id = p.loja_id
  WHERE p.loja_id = ?
  $ordenacao
");
$stmt->execute([$lojaId]);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
