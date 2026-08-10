<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$cols = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
if (!in_array('saldo_fiado', $cols, true)) {
  echo json_encode([
    'ok' => true,
    'total_debitos' => 0,
    'total_clientes' => 0,
    'clientes' => [],
    'pagina' => 1,
    'paginas' => 1,
    'total' => 0
  ]);
  exit;
}

$busca = trim((string) ($_GET['busca'] ?? ''));
$pagina = max(1, (int) ($_GET['pagina'] ?? 1));
$limite = (int) ($_GET['limite'] ?? 10);
if (!in_array($limite, [10, 25, 50], true)) {
  $limite = 10;
}
$offset = ($pagina - 1) * $limite;

try {
  $stmtResumo = $conn->prepare("
    SELECT COALESCE(SUM(saldo_fiado), 0) AS total_debitos, COUNT(*) AS total_clientes
    FROM clientes
    WHERE loja_id = ? AND saldo_fiado > 0.009
  ");
  $stmtResumo->execute([$lojaId]);
  $resumo = $stmtResumo->fetch(PDO::FETCH_ASSOC) ?: ['total_debitos' => 0, 'total_clientes' => 0];

  $where = "WHERE loja_id = ? AND saldo_fiado > 0.009";
  $params = [$lojaId];
  $buscaTel = preg_replace('/\D+/', '', $busca);
  if ($busca !== '') {
    $whereParts = ["nome LIKE ?"];
    $params[] = "%{$busca}%";
    if ($buscaTel !== '') {
      $whereParts[] = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone,'(',''),')',''),'-',''),' ',''),'+','') LIKE ?";
      $params[] = "%{$buscaTel}%";
    }
    $where .= " AND (" . implode(' OR ', $whereParts) . ")";
  }

  $stmtTotal = $conn->prepare("SELECT COUNT(*) FROM clientes $where");
  $stmtTotal->execute($params);
  $total = (int) $stmtTotal->fetchColumn();
  $paginas = max(1, (int) ceil($total / $limite));
  if ($pagina > $paginas) {
    $pagina = $paginas;
    $offset = ($pagina - 1) * $limite;
  }

  $stmt = $conn->prepare("
    SELECT id, nome, telefone, saldo_fiado
    FROM clientes
    $where
    ORDER BY saldo_fiado DESC
    LIMIT $limite OFFSET $offset
  ");
  $stmt->execute($params);
  $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'ok' => true,
    'total_debitos' => (float) $resumo['total_debitos'],
    'total_clientes' => (int) $resumo['total_clientes'],
    'clientes' => $clientes,
    'pagina' => $pagina,
    'paginas' => $paginas,
    'total' => $total
  ]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao carregar clientes com fiado.']);
}
