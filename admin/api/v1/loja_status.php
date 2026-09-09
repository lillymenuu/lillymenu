<?php
/*
 * Versao JSON de admin/api/loja_toggle.php para o novo frontend Next.js —
 * abre/fecha a loja manualmente (mesma chave de config "loja_force_fechada"
 * usada pelo admin antigo e pela loja publica).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($metodo !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'msg' => 'Metodo nao permitido.']);
  exit;
}

$dados  = json_decode(file_get_contents('php://input'), true) ?: [];
$aberto = isset($dados['aberta']) ? (bool) $dados['aberta'] : true;

/* force_fechada = 1 quando o admin FECHOU manualmente */
$valor = $aberto ? '0' : '1';

try {
  $stmt = $conn->prepare("
    INSERT INTO configuracoes (chave, valor, loja_id)
    VALUES ('loja_force_fechada', ?, ?)
    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
  ");
  $stmt->execute([$valor, $lojaId]);

  echo json_encode(['ok' => true, 'aberta' => $aberto]);
} catch (Throwable $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}
