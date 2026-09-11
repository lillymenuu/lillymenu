<?php
/*
 * Versao JSON (Bearer token) de admin/api/verificacao_remover.php — porta 1:1.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$conn->prepare("DELETE FROM configuracoes WHERE loja_id=? AND chave IN ('loja_verificada','verificacao_codigo','verificacao_expira','verificacao_whatsapp')")
     ->execute([$lojaId]);

echo json_encode(['ok'=>true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
