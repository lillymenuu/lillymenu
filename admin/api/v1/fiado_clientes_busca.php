<?php
/*
 * Versao JSON de admin/api/fiado_clientes_busca.php para o novo frontend
 * Next.js (/storecredittracking), trocando sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$busca = trim((string) ($_GET['busca'] ?? ''));

try {
  if ($busca === '') {
    $where = ["loja_id = ?"];
    $params = [$lojaId];
  } else {
    $where = ["loja_id = ?", "nome LIKE ?"];
    $params = [$lojaId, "%{$busca}%"];
    $buscaTel = preg_replace('/\D+/', '', $busca);
    if ($buscaTel !== '') {
      $where = ["loja_id = ?", "(nome LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone,'(',''),')',''),'-',''),' ',''),'+','') LIKE ?)"];
      $params = [$lojaId, "%{$busca}%", "%{$buscaTel}%"];
    }
  }
  $stmt = $conn->prepare("
    SELECT id, nome, telefone
    FROM clientes
    WHERE " . implode(' AND ', $where) . "
    ORDER BY nome ASC
    LIMIT 10
  ");
  $stmt->execute($params);
  $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'ok' => true,
    'clientes' => array_map(function ($c) {
      return ['id' => (int) $c['id'], 'nome' => $c['nome'], 'telefone' => $c['telefone']];
    }, $clientes),
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao buscar clientes.']);
}
