<?php
/*
 * Versao JSON de admin/api/garcons_gerar_codigo.php para o novo frontend
 * Next.js (/waitermode), trocando sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/garcom_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($dados['id'] ?? 0);

if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Garçom inválido.']);
  exit;
}

$stmt = $conn->prepare("SELECT id FROM garcons WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$id, $lojaId]);
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Garçom não encontrado.']);
  exit;
}

$codigo = garcomGerarCodigoAcesso();
$hash = password_hash($codigo, PASSWORD_DEFAULT);

$conn->prepare("UPDATE garcons SET codigo_acesso_hash = ? WHERE id = ? AND loja_id = ?")
  ->execute([$hash, $id, $lojaId]);

echo json_encode(['ok' => true, 'codigo_acesso' => $codigo]);
