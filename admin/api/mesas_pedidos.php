<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/acesso_menu.php';
require_once __DIR__ . '/../helpers/garcom_module.php';
require_once __DIR__ . '/../../helpers/pedido_codigo.php';

header('Content-Type: application/json');

if (!acessoMenuPermitido($conn, 'menu.modo_garcom')) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

garcomEnsureModule($conn);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$stmt = $conn->prepare("
  SELECT
    p.id, p.status, p.total, p.criado_em, p.mesa_id, p.garcom_id,
    m.nome AS mesa_nome,
    g.nome AS garcom_nome
  FROM pedidos p
  LEFT JOIN mesas m ON m.id = p.mesa_id AND m.loja_id = p.loja_id
  LEFT JOIN garcons g ON g.id = p.garcom_id AND g.loja_id = p.loja_id
  WHERE p.loja_id = ? AND p.mesa_id IS NOT NULL
  ORDER BY p.id DESC
  LIMIT 200
");
$stmt->execute([$lojaId]);
$pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

/* mesmo numero sequencial (com zeroing, se configurado) que admin/gestor_pedidos.php
   ja mostra — sem isso o garcom via o id bruto do banco, bem maior e diferente
   do numero que aparece pro resto da equipe. */
$codigoBase = getPedidoCodigoBase($conn, $lojaId);
foreach ($pedidos as &$p) {
  $p['codigo'] = calcCodigoDisplay((int) $p['id'], $codigoBase);
}
unset($p);

echo json_encode(['ok' => true, 'pedidos' => $pedidos]);
