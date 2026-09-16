<?php
/*
 * Versao Bearer-token de admin/api/produtos_validade_check.php — produtos
 * ativos com data_validade vencendo em ate 2 dias (ou ja vencidos), pro
 * aviso de prazo de validade no Next (mesma janela de 2 dias do legado).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$diasAviso = 2;

$colunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
if (!in_array('data_validade', $colunas, true)) {
  echo json_encode(['ok' => true, 'produtos' => []], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
$produtos = array_map(function ($p) {
  return [
    'id' => (int) $p['id'],
    'nome' => $p['nome'],
    'data_validade' => $p['data_validade'],
    'dias_restantes' => (int) $p['dias_restantes'],
    'vencido' => (int) $p['dias_restantes'] < 0,
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

echo json_encode(['ok' => true, 'produtos' => $produtos], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
