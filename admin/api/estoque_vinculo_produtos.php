<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/estoque_vinculo_module.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId    = (int) ($_SESSION['loja_id'] ?? 1);
$produtoId = (int) ($_GET['produto_id'] ?? 0);
$search    = trim($_GET['search'] ?? '');

if ($produtoId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Produto invalido']);
  exit;
}

try {
  $cols = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temImagem = in_array('imagem', $cols, true);
  $imagemSel = $temImagem ? 'p.imagem' : "NULL AS imagem";

  $where  = ['p.loja_id = ?', 'p.ativo = 1', 'p.id <> ?'];
  $params = [$lojaId, $produtoId];

  if ($search !== '') {
    $where[] = 'p.nome LIKE ?';
    $params[] = '%' . $search . '%';
  }

  $stmt = $conn->prepare("
    SELECT p.id, p.nome, $imagemSel, p.categoria_id
    FROM produtos p
    WHERE " . implode(' AND ', $where) . "
    ORDER BY p.nome
    LIMIT 300
  ");
  $stmt->execute($params);
  $produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $vinculados = array_flip(estoqueVinculoMembros($conn, $produtoId, $lojaId));
  foreach ($produtos as &$p) {
    $p['id'] = (int) $p['id'];
    $p['vinculado'] = isset($vinculados[$p['id']]);
  }
  unset($p);

  echo json_encode(['ok' => true, 'produtos' => $produtos], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}
