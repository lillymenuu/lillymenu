<?php
/*
 * Versao JSON de admin/api/mesas_pedidos.php para o novo frontend Next.js
 * (/waitermode), trocando sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/garcom_module.php';
require_once __DIR__ . '/../../../helpers/pedido_codigo.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

garcomEnsureModule($conn);

$stmt = $conn->prepare("
  SELECT
    p.id, p.status, p.total, p.criado_em, p.mesa_id, p.garcom_id,
    m.nome AS mesa_nome,
    g.nome AS garcom_nome
  FROM pedidos p
  LEFT JOIN mesas m ON m.id = p.mesa_id AND m.loja_id = p.loja_id
  LEFT JOIN garcons g ON g.id = p.garcom_id AND g.loja_id = p.loja_id
  WHERE p.loja_id = ? AND p.mesa_id IS NOT NULL AND DATE(p.criado_em) = CURDATE()
  ORDER BY p.id DESC
  LIMIT 200
");
$stmt->execute([$lojaId]);
$pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

$codigoBase = getPedidoCodigoBase($conn, $lojaId);

echo json_encode([
  'ok' => true,
  'pedidos' => array_map(function ($p) use ($codigoBase) {
    return [
      'id' => (int) $p['id'],
      'codigo' => calcCodigoDisplay((int) $p['id'], $codigoBase),
      'status' => $p['status'],
      'total' => (float) $p['total'],
      'criado_em' => $p['criado_em'],
      'mesa_id' => $p['mesa_id'] !== null ? (int) $p['mesa_id'] : null,
      'mesa_nome' => $p['mesa_nome'],
      'garcom_id' => $p['garcom_id'] !== null ? (int) $p['garcom_id'] : null,
      'garcom_nome' => $p['garcom_nome'],
    ];
  }, $pedidos),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
