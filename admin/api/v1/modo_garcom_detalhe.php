<?php
/*
 * Versao JSON do bloco inicial de admin/modo_garcom.php para o novo
 * frontend Next.js (/waitermode), trocando sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/config.php';
require_once __DIR__ . '/../../helpers/garcom_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

garcomEnsureModule($conn);

$stmt = $conn->prepare("SELECT id, nome, ativo, criado_em FROM mesas WHERE loja_id = ? ORDER BY nome");
$stmt->execute([$lojaId]);
$mesas = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("
  SELECT mesa_id, COUNT(*) AS qtd
  FROM pedidos
  WHERE loja_id = ? AND mesa_id IS NOT NULL AND status NOT IN ('finalizado','cancelado')
  GROUP BY mesa_id
");
$stmt->execute([$lojaId]);
$pedidosAbertosPorMesa = [];
foreach ($stmt as $r) {
  $pedidosAbertosPorMesa[(int) $r['mesa_id']] = (int) $r['qtd'];
}

$stmt = $conn->prepare("SELECT id, nome, email, ativo, criado_em FROM garcons WHERE loja_id = ? ORDER BY nome");
$stmt->execute([$lojaId]);
$garcons = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("
  SELECT COUNT(*) FROM pedidos
  WHERE loja_id = ? AND mesa_id IS NOT NULL AND status = 'pendente'
");
$stmt->execute([$lojaId]);
$pedidosPendentesCount = (int) $stmt->fetchColumn();

$mesasAtivasCount = count(array_filter($mesas, fn($m) => (int) $m['ativo'] === 1));
$garconsAtivosCount = count(array_filter($garcons, fn($g) => (int) $g['ativo'] === 1));

// Link de acesso do garcom — curto, no mesmo formato do link do cardapio
// (dominio.com/nomedaloja/garcom_login), resolvido pelo .htaccess.
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';

// $lojaId explicito (4o parametro) — sem ele, config() cai em
// $_SESSION['loja_id'] ?? 1, que nunca e setado nesse endpoint (autenticacao
// via Bearer token, sem sessao PHP), resolvendo sempre a config errada.
$nomeLojaCfg = config($conn, 'nome_loja', '', $lojaId);
$linkLojaCfg = config($conn, 'link_loja', '', $lojaId);
$lojaLinkSlug = '';
if ($linkLojaCfg) {
  if (preg_match('#[?&]loja=([^&]+)#', $linkLojaCfg, $m)) {
    $lojaLinkSlug = urldecode($m[1]);
  } elseif (preg_match('#/([^/?]+)/?$#', $linkLojaCfg, $m)) {
    $lojaLinkSlug = $m[1];
  } else {
    $lojaLinkSlug = trim($linkLojaCfg, '/');
  }
  $lojaLinkSlug = preg_replace('/\.php$/i', '', $lojaLinkSlug);
}
if ($lojaLinkSlug === '') {
  $lojaLinkSlug = mb_strtolower($nomeLojaCfg, 'UTF-8');
  $lojaLinkSlug = preg_replace('/[^a-z0-9]+/', '-', $lojaLinkSlug);
  $lojaLinkSlug = trim($lojaLinkSlug, '-');
}
if ($lojaLinkSlug !== '') {
  $garcomLoginUrl = $protocol . $host . '/' . rawurlencode($lojaLinkSlug) . '/garcom_login';
  // Link do cardapio publico (mesmo slug, sem sufixo) — usado pra montar o QR
  // Code de mesa (?mesa=<id>), lido em public/loja.php.
  $cardapioUrl = $protocol . $host . '/' . rawurlencode($lojaLinkSlug);
} else {
  // Nome da loja vazio ou so com caracteres que nao sobram nada apos
  // normalizar (ex: so acentos/emoji) — sem slug nenhum pra montar o link
  // curto. Cai pro acesso direto via loja_id (mesmo fallback ja usado em
  // public/garcom.php quando a sessao expira sem slug resolvido), que
  // sempre funciona independente do nome da loja.
  $garcomLoginUrl = $protocol . $host . '/public/garcom_login.php?loja_id=' . $lojaId;
  $cardapioUrl = $protocol . $host . '/public/loja.php?loja_id=' . $lojaId;
}

echo json_encode([
  'ok' => true,
  'mesas' => array_map(function ($m) use ($pedidosAbertosPorMesa) {
    return [
      'id' => (int) $m['id'],
      'nome' => $m['nome'],
      'ativo' => (int) $m['ativo'],
      'criado_em' => $m['criado_em'],
      'tem_pedido_aberto' => ($pedidosAbertosPorMesa[(int) $m['id']] ?? 0) > 0,
    ];
  }, $mesas),
  'garcons' => array_map(function ($g) {
    return [
      'id' => (int) $g['id'],
      'nome' => $g['nome'],
      'email' => $g['email'],
      'ativo' => (int) $g['ativo'],
      'criado_em' => $g['criado_em'],
    ];
  }, $garcons),
  'pedidos_pendentes' => $pedidosPendentesCount,
  'mesas_ativas' => $mesasAtivasCount,
  'garcons_ativos' => $garconsAtivosCount,
  'garcom_login_url' => $garcomLoginUrl,
  'cardapio_url' => $cardapioUrl,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
