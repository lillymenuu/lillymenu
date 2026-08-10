<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId    = (int)($_SESSION['loja_id'] ?? 1);
$clienteId = (int)($_GET['cliente_id'] ?? 0);
if ($clienteId <= 0) {
  echo json_encode(['ok' => false]);
  exit;
}

$pagina = max(1, (int)($_GET['pagina'] ?? 1));
$limite = 5;
$offset = ($pagina - 1) * $limite;

try {
  $stmt = $conn->prepare("SELECT COUNT(*) FROM avaliacoes WHERE cliente_id = ? AND loja_id = ?");
  $stmt->execute([$clienteId, $lojaId]);
  $total = (int)$stmt->fetchColumn();
  $paginas = max(1, (int)ceil($total / $limite));

  $stmt = $conn->prepare("
    SELECT a.id, a.nota, a.descricao, a.criado_em, a.pedido_id
    FROM avaliacoes a
    WHERE a.cliente_id = ? AND a.loja_id = ?
    ORDER BY a.criado_em DESC
    LIMIT $limite OFFSET $offset
  ");
  $stmt->execute([$clienteId, $lojaId]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $saida = array_map(fn($r) => [
    'id'        => (int)$r['id'],
    'nota'      => (int)$r['nota'],
    'descricao' => $r['descricao'] ?? '',
    'pedido_id' => $r['pedido_id'] ? (int)$r['pedido_id'] : null,
    'criado_em' => $r['criado_em'],
  ], $rows);

  echo json_encode(['ok' => true, 'total' => $total, 'pagina' => $pagina, 'paginas' => $paginas, 'avaliacoes' => $saida]);
} catch (Exception $e) {
  echo json_encode(['ok' => true, 'total' => 0, 'pagina' => 1, 'paginas' => 1, 'avaliacoes' => []]);
}
