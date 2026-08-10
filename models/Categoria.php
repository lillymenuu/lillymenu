<?php
class Categoria {
  public static function all($conn, $lojaId = null) {
    $cols = $conn->query("SHOW COLUMNS FROM categorias")->fetchAll(PDO::FETCH_COLUMN, 0);
    $temLoja = in_array('loja_id', $cols, true);
    $sql = "
      SELECT * FROM categorias
      WHERE ativo = 1
    ";
    $params = [];
    if ($temLoja && $lojaId) {
      $sql .= " AND loja_id = ?";
      $params[] = (int) $lojaId;
    }
    $sql .= " ORDER BY ordem IS NULL, ordem, nome";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }
}
