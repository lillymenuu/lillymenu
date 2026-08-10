<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$colunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temOrdem = in_array('ordem', $colunas, true);
$temPrecoPromocional = in_array('preco_promocional', $colunas, true);
$temPromoDesativado = in_array('promo_desativado', $colunas, true);
$precoExpr = ($temPrecoPromocional && $temPromoDesativado)
  ? "IF(promo_desativado = 0 AND preco_promocional IS NOT NULL AND preco_promocional > 0, preco_promocional, preco)"
  : "preco";
$ordenacao = $temOrdem ? "ORDER BY ordem IS NULL, ordem, nome" : "ORDER BY nome";

$stmt = $conn->prepare("
  SELECT id, nome, $precoExpr AS preco
  FROM produtos
  WHERE ativo = 1 AND loja_id = ?
  $ordenacao
");
$stmt->execute([$lojaId]);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
