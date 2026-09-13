<?php
/*
 * Versao JSON (Bearer token) de admin/api/cupons_delete.php — exclui um
 * cupom. Mesmo comportamento do legado: delete definitivo, sem checar
 * se o cupom ja foi usado (cupons nao tem FK com pedidos — o pedido
 * guarda o codigo como texto solto, nao uma referencia).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($dados['id'] ?? 0);

if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Cupom inválido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("DELETE FROM cupons WHERE id = ? AND loja_id = ?");
$stmt->execute([$id, $lojaId]);

if ($stmt->rowCount() === 0) {
  echo json_encode(['ok' => false, 'msg' => 'Cupom não encontrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

echo json_encode(['ok' => true, 'msg' => 'Cupom apagado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
