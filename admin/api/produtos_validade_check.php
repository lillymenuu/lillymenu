<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$diasAviso = 2; // avisa quando faltar isso ou menos dias para a validade

try {
  $colunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
  if (!in_array('data_validade', $colunas, true)) {
    echo json_encode(['ok' => true, 'produtos' => []]);
    exit;
  }

  $stmt = $conn->prepare("
    SELECT id, nome, data_validade,
           DATEDIFF(data_validade, CURDATE()) AS dias_restantes
    FROM produtos
    WHERE loja_id = ?
      AND ativo = 1
      AND data_validade IS NOT NULL
      AND DATEDIFF(data_validade, CURDATE()) <= ?
    ORDER BY data_validade ASC
  ");
  $stmt->execute([$lojaId, $diasAviso]);
  $produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

  foreach ($produtos as &$p) {
    $p['id'] = (int) $p['id'];
    $p['dias_restantes'] = (int) $p['dias_restantes'];
    $p['vencido'] = $p['dias_restantes'] < 0;
  }
  unset($p);

  echo json_encode(['ok' => true, 'produtos' => $produtos], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao verificar validade.']);
}
