<?php
require_once __DIR__ . '/storage.php';

/* Extraído de public/loja.php sem mudança de comportamento — compartilhado
   entre a página (public/loja.php) e os endpoints JSON públicos
   (public/api/loja_perfil.php, public/api/loja_catalogo.php). */

function cfg(PDO $db, int $lid, string $chave, $default = ''): string {
  static $cache = [];
  $k = $lid.':'.$chave;
  if (isset($cache[$k])) return $cache[$k];
  $s = $db->prepare("SELECT valor FROM configuracoes WHERE chave=? AND loja_id=? LIMIT 1");
  $s->execute([$chave, $lid]);
  $v = $s->fetchColumn();
  return $cache[$k] = ($v !== false ? (string)$v : (string)$default);
}

function fixImgPath(string $p): string {
  return storage_url_absoluta($p);
}
