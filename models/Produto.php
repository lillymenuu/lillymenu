<?php
class Produto {
  public static function porCategoria($conn, $categoria_id, $lojaId = null) {
    $colunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
    $temOrdem = in_array('ordem', $colunas, true);
    $temPrecoPromocional = in_array('preco_promocional', $colunas, true);
    $temPromoDesativado = in_array('promo_desativado', $colunas, true);
    $temLoja = in_array('loja_id', $colunas, true);
    $precoExpr = ($temPrecoPromocional && $temPromoDesativado)
      ? "IF(p.promo_desativado = 0 AND p.preco_promocional IS NOT NULL AND p.preco_promocional > 0, p.preco_promocional, p.preco)"
      : "p.preco";
    $ordenacao = $temOrdem ? "ORDER BY p.ordem IS NULL, p.ordem, p.nome" : "ORDER BY p.nome";
    $stmt = $conn->prepare(
      "SELECT p.*, $precoExpr AS preco FROM produtos p
       WHERE p.ativo = 1 AND p.categoria_id = ?" . ($temLoja && $lojaId ? " AND p.loja_id = ?" : "") . "
       $ordenacao"
    );
    $params = [$categoria_id];
    if ($temLoja && $lojaId) {
      $params[] = (int) $lojaId;
    }
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }
}
