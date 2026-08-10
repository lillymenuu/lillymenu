<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$clienteId = (int)($_GET['cliente_id'] ?? 0);
if ($clienteId <= 0) {
  echo json_encode(['ok' => false]);
  exit;
}

function tabelaExiste(PDO $conn, string $tabela): bool {
  $stmt = $conn->prepare("SHOW TABLES LIKE ?");
  $stmt->execute([$tabela]);
  return (bool) $stmt->fetchColumn();
}

if (!tabelaExiste($conn, 'pontos_movimentacoes')) {
  echo json_encode([
    'ok' => true,
    'pagina' => 1,
    'paginas' => 1,
    'total' => 0,
    'pontos' => []
  ]);
  exit;
}

$pagina = max(1, (int)($_GET['pagina'] ?? 1));
$limite = 6;
$offset = ($pagina - 1) * $limite;

$stmt = $conn->prepare("SELECT COUNT(*) FROM pontos_movimentacoes WHERE cliente_id = ? AND loja_id = ?");
$stmt->execute([$clienteId, $lojaId]);
$total = (int) $stmt->fetchColumn();
$paginas = max(1, (int) ceil($total / $limite));

$stmt = $conn->prepare("
  SELECT id, pedido_id, tipo, pontos, saldo_antes, saldo_depois, criado_em
  FROM pontos_movimentacoes
  WHERE cliente_id = ? AND loja_id = ?
  ORDER BY criado_em DESC, id DESC
  LIMIT $limite OFFSET $offset
");
$stmt->execute([$clienteId, $lojaId]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$saida = [];
foreach ($rows as $row) {
  $saida[] = [
    'id' => (int) $row['id'],
    'pedido_id' => $row['pedido_id'] ? (int) $row['pedido_id'] : null,
    'tipo' => $row['tipo'] ?? '',
    'pontos' => (int) $row['pontos'],
    'saldo_antes' => (int) $row['saldo_antes'],
    'saldo_depois' => (int) $row['saldo_depois'],
    'criado_em' => $row['criado_em']
  ];
}

echo json_encode([
  'ok' => true,
  'pagina' => $pagina,
  'paginas' => $paginas,
  'total' => $total,
  'pontos' => $saida
]);
