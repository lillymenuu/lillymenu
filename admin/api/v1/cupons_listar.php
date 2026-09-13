<?php
/*
 * Versao JSON de admin/cupons.php (a consulta que monta o grid de cards)
 * para o novo frontend Next.js (/coupons), trocando sessao por token
 * Bearer. O legado nao tem endpoint de listagem dedicado (a query roda
 * inline na propria pagina) — esse arquivo e novo.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$stmt = $conn->prepare("
  SELECT id, codigo, tipo, desconto, minimo, quantidade_total, quantidade_usada,
         ativo, primeira_compra, publico, criado_em
  FROM cupons
  WHERE loja_id = ?
  ORDER BY criado_em DESC
");
$stmt->execute([$lojaId]);

$cupons = array_map(function ($c) {
  return [
    'id' => (int) $c['id'],
    'codigo' => $c['codigo'],
    'tipo' => $c['tipo'],
    'desconto' => (float) $c['desconto'],
    'minimo' => (float) $c['minimo'],
    'quantidade_total' => (int) $c['quantidade_total'],
    'quantidade_usada' => (int) $c['quantidade_usada'],
    'ativo' => (int) $c['ativo'] === 1,
    'primeira_compra' => (int) $c['primeira_compra'] === 1,
    'publico' => (int) $c['publico'] === 1,
    'criado_em' => $c['criado_em'],
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

echo json_encode(['ok' => true, 'cupons' => $cupons], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
