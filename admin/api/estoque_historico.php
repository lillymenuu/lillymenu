<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$produtoId = (int) ($_GET['produto_id'] ?? 0);
if ($produtoId <= 0) {
  echo json_encode(['ok' => false]);
  exit;
}

$stmt = $conn->prepare("
  (SELECT tipo, quantidade, origem, criado_em
   FROM estoque_movimentacoes
   WHERE produto_id = ? AND tipo = 'entrada' AND loja_id = ?
   ORDER BY criado_em DESC
   LIMIT 1)
  UNION ALL
  (SELECT tipo, quantidade, origem, criado_em
   FROM estoque_movimentacoes
   WHERE produto_id = ? AND tipo = 'saida' AND loja_id = ?
   ORDER BY criado_em DESC
   LIMIT 1)
  ORDER BY criado_em DESC
");
$stmt->execute([$produtoId, $lojaId, $produtoId, $lojaId]);
$movimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

$saida = array_map(function ($m) {
  return [
    'tipo' => $m['tipo'],
    'quantidade' => (int) $m['quantidade'],
    'origem' => $m['origem'],
    'data' => date('d/m H:i', strtotime($m['criado_em']))
  ];
}, $movimentos);

echo json_encode(['ok' => true, 'movimentos' => $saida]);
