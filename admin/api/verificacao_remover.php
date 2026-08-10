<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int)($_SESSION['loja_id'] ?? 1);

$conn->prepare("DELETE FROM configuracoes WHERE loja_id=? AND chave IN ('loja_verificada','verificacao_codigo','verificacao_expira','verificacao_whatsapp')")
     ->execute([$lojaId]);

echo json_encode(['ok'=>true]);
