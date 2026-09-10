<?php
/*
 * Versao JSON de admin/api/pedidos_zerar_sequencia.php para o novo
 * frontend Next.js (/order-list).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

try {
  $cols = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
  if (!in_array('codigo', $cols, true)) {
    $conn->exec("ALTER TABLE pedidos ADD COLUMN codigo VARCHAR(64) NULL AFTER id");
  }

  $conn->prepare("UPDATE pedidos SET codigo = id WHERE loja_id = ? AND (codigo IS NULL OR codigo = '')")
       ->execute([$lojaId]);

  $stmtMax = $conn->prepare("SELECT COALESCE(MAX(id), 0) FROM pedidos WHERE loja_id = ?");
  $stmtMax->execute([$lojaId]);
  $maxId = (int) $stmtMax->fetchColumn();

  $chave = 'pedido_codigo_base';
  $stmtChk = $conn->prepare("SELECT COUNT(*) FROM configuracoes WHERE chave = ? AND loja_id = ?");
  $stmtChk->execute([$chave, $lojaId]);

  if ((int) $stmtChk->fetchColumn() > 0) {
    $conn->prepare("UPDATE configuracoes SET valor = ? WHERE chave = ? AND loja_id = ?")
         ->execute([$maxId, $chave, $lojaId]);
  } else {
    $conn->prepare("INSERT INTO configuracoes (chave, valor, loja_id) VALUES (?, ?, ?)")
         ->execute([$chave, $maxId, $lojaId]);
  }

  echo json_encode([
    'ok' => true,
    'msg' => 'Sequencia zerada! O proximo pedido sera o #1.',
    'base' => $maxId,
    'proximo' => 1,
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
