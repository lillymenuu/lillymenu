<?php
function config(PDO $conn, string $chave, $default = null) {
  static $cache = [];
  $lojaId = $_SESSION['loja_id'] ?? 1;
  $cacheKey = $lojaId . ':' . $chave;

  if (isset($cache[$cacheKey])) {
    return $cache[$cacheKey];
  }

  $stmt = $conn->prepare("
    SELECT valor FROM configuracoes WHERE chave = ? AND loja_id = ?
  ");
  $stmt->execute([$chave, $lojaId]);
  $valor = $stmt->fetchColumn();

  if ($valor === false) {
    return $default;
  }

  $cache[$cacheKey] = $valor;
  return $valor;
}
