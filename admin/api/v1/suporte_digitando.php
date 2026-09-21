<?php
/*
 * Versao JSON de admin/api/suporte_digitando.php (lado da loja):
 * POST ativo=1/0 avisa que a loja esta digitando; GET diz se o suporte esta.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/suporte_chat.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

suporteGarantirTabelas($conn);

try {
  if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $dados = json_decode(file_get_contents('php://input'), true) ?: [];
    if (!empty($dados['ativo'])) {
      $conn->prepare("
        INSERT INTO suporte_digitando (loja_id, quem, atualizado_em)
        VALUES (?, 'loja', NOW())
        ON DUPLICATE KEY UPDATE atualizado_em = NOW()
      ")->execute([$lojaId]);
    } else {
      $conn->prepare("DELETE FROM suporte_digitando WHERE loja_id = ? AND quem = 'loja'")->execute([$lojaId]);
    }
    echo json_encode(['ok' => true]);
  } else {
    $stmt = $conn->prepare("
      SELECT 1 FROM suporte_digitando
      WHERE loja_id = ? AND quem = 'suporte' AND atualizado_em > (NOW() - INTERVAL 5 SECOND)
      LIMIT 1
    ");
    $stmt->execute([$lojaId]);
    echo json_encode(['ok' => true, 'digitando' => (bool) $stmt->fetchColumn()]);
  }
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'erro' => 'Erro ao verificar digitando.']);
}
