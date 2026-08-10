<?php
class Loja {
  public static function get($conn, $lojaId = null) {
    if ($lojaId) {
      $stmt = $conn->prepare("SELECT * FROM lojas WHERE id = ? AND ativo = 1 LIMIT 1");
      $stmt->execute([(int) $lojaId]);
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($row) {
        return $row;
      }
    }
    return $conn->query(
      "SELECT * FROM lojas WHERE ativo = 1 ORDER BY id ASC LIMIT 1"
    )->fetch(PDO::FETCH_ASSOC);
  }
}
