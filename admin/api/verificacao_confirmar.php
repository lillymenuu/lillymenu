<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/config.php';

header('Content-Type: application/json');

$lojaId = (int)($_SESSION['loja_id'] ?? 1);
$codigo = trim($_POST['codigo'] ?? '');

if (!preg_match('/^\d{6}$/', $codigo)) {
  echo json_encode(['ok'=>false,'msg'=>'Código inválido.']); exit;
}

$codigoSalvo = config($conn, 'verificacao_codigo', '');
$expira      = config($conn, 'verificacao_expira', '');

if (!$codigoSalvo || !$expira) {
  echo json_encode(['ok'=>false,'msg'=>'Nenhum código pendente. Solicite um novo.']); exit;
}

if (new DateTime() > new DateTime($expira)) {
  echo json_encode(['ok'=>false,'msg'=>'Código expirado. Solicite um novo.']); exit;
}

if (!hash_equals($codigoSalvo, $codigo)) {
  echo json_encode(['ok'=>false,'msg'=>'Código incorreto. Verifique e tente novamente.']); exit;
}

$upsert = "INSERT INTO configuracoes (loja_id, chave, valor) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE valor = VALUES(valor)";
$conn->prepare($upsert)->execute([$lojaId, 'loja_verificada', '1']);

// Limpar código temporário
$conn->prepare("DELETE FROM configuracoes WHERE loja_id=? AND chave IN ('verificacao_codigo','verificacao_expira')")
     ->execute([$lojaId]);

echo json_encode(['ok'=>true]);
