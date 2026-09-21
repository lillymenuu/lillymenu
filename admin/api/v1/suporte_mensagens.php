<?php
/*
 * Versao JSON de admin/api/suporte_mensagens.php (lado da loja) para o
 * frontend Next.js: token Bearer em vez de sessao. Marca como lidas as
 * mensagens que o suporte enviou.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/suporte_chat.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

suporteGarantirTabelas($conn);
suporteLimparExpiradas($conn);

$afterId = max(0, (int) ($_GET['after_id'] ?? 0));

try {
  $stmt = $conn->prepare("
    SELECT id, remetente, mensagem, anexo_arquivo, criado_em
    FROM suporte_mensagens
    WHERE loja_id = ? AND id > ?
    ORDER BY id ASC
  ");
  $stmt->execute([$lojaId, $afterId]);
  $mensagens = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $conn->prepare("UPDATE suporte_mensagens SET lida_loja = 1 WHERE loja_id = ? AND remetente = 'suporte' AND lida_loja = 0")
    ->execute([$lojaId]);

  echo json_encode(['ok' => true, 'mensagens' => $mensagens], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'erro' => 'Erro ao carregar mensagens.']);
}
