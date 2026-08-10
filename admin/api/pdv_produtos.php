<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$q = $_GET['q'] ?? '';

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
  WHERE nome LIKE ? AND loja_id = ? AND ativo = 1
  $ordenacao
  LIMIT 10
");

$like = "%$q%";
$stmt->execute([$like, $lojaId]);
$produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

/* Combos */
$combos = [];
try {
  $stmtTbl = $conn->query("SHOW TABLES LIKE 'combos'");
  if ($stmtTbl->fetchColumn()) {
    $comboCols = $conn->query("SHOW COLUMNS FROM combos")->fetchAll(PDO::FETCH_COLUMN, 0);
    $temComboProm = in_array('preco_promocional', $comboCols, true) && in_array('promo_desativado', $comboCols, true);
    $comboPrecoExpr = $temComboProm
      ? "IF(promo_desativado = 0 AND preco_promocional IS NOT NULL AND preco_promocional > 0, preco_promocional, preco)"
      : "preco";
    $stmtC = $conn->prepare("
      SELECT id, nome, $comboPrecoExpr AS preco, 'combo' AS tipo
      FROM combos
      WHERE nome LIKE ? AND loja_id = ? AND ativo = 1
      ORDER BY nome
      LIMIT 10
    ");
    $stmtC->execute([$like, $lojaId]);
    $combos = $stmtC->fetchAll(PDO::FETCH_ASSOC);
  }
} catch (Exception $e) {}

echo json_encode(array_merge($produtos, $combos));
