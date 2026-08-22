<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/mercadopago.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') === 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

garantirMercadopagoColunas($conn);

$lojaId = (int) ($_SESSION['loja_id'] ?? 0);
if ($lojaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Loja invalida.']);
  exit;
}

$stmt = $conn->prepare("SELECT id, plano_id FROM assinaturas WHERE loja_id = ? ORDER BY id DESC LIMIT 1");
$stmt->execute([$lojaId]);
$assinatura = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$assinatura) {
  echo json_encode(['ok' => false, 'msg' => 'Assinatura nao encontrada.']);
  exit;
}
$assinaturaId = (int) $assinatura['id'];

$stmt = $conn->prepare("SELECT nome, valor FROM planos WHERE id = ? LIMIT 1");
$stmt->execute([(int) ($assinatura['plano_id'] ?? 1)]);
$plano = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['nome' => 'Mensal', 'valor' => 50.00];

$stmt = $conn->prepare("SELECT email FROM admins WHERE id = ? LIMIT 1");
$stmt->execute([(int) ($_SESSION['admin_id'] ?? 0)]);
$emailPagador = trim((string) $stmt->fetchColumn());

if ($emailPagador === '') {
  // Sub-usuario sem e-mail proprio (senha=NULL) — usa o e-mail do admin principal da loja.
  $stmt = $conn->prepare("SELECT email FROM admins WHERE loja_id = ? AND email IS NOT NULL AND email != '' ORDER BY (senha IS NOT NULL) DESC, id ASC LIMIT 1");
  $stmt->execute([$lojaId]);
  $emailPagador = trim((string) $stmt->fetchColumn());
}

if ($emailPagador === '') {
  // Ultimo recurso: o Mercado Pago exige formato de e-mail valido, mas rejeita TLDs
  // reservados como ".local" — usar um dominio com formato "normal".
  $emailPagador = 'loja' . $lojaId . '@sememail.com';
}

$stmt = $conn->prepare("
  SELECT id, mp_qr_code, mp_qr_code_base64, mp_expiracao, valor
  FROM cobrancas
  WHERE assinatura_id = ? AND status IN ('pendente', 'atrasado')
  ORDER BY id DESC LIMIT 1
");
$stmt->execute([$assinaturaId]);
$cobrancaExistente = $stmt->fetch(PDO::FETCH_ASSOC);

$agora = date('Y-m-d H:i:s');
if ($cobrancaExistente && !empty($cobrancaExistente['mp_qr_code']) && !empty($cobrancaExistente['mp_expiracao']) && $cobrancaExistente['mp_expiracao'] > $agora) {
  echo json_encode([
    'ok'             => true,
    'cobranca_id'    => (int) $cobrancaExistente['id'],
    'qr_code'        => $cobrancaExistente['mp_qr_code'],
    'qr_code_base64' => $cobrancaExistente['mp_qr_code_base64'],
    'expira_em'      => $cobrancaExistente['mp_expiracao'],
    'valor'          => (float) $cobrancaExistente['valor'],
  ]);
  exit;
}

if ($cobrancaExistente) {
  $cobrancaId = (int) $cobrancaExistente['id'];
} else {
  $stmt = $conn->prepare("
    INSERT INTO cobrancas (assinatura_id, valor, vencimento, status, origem)
    VALUES (?, ?, CURDATE(), 'pendente', 'mercadopago')
  ");
  $stmt->execute([$assinaturaId, (float) $plano['valor']]);
  $cobrancaId = (int) $conn->lastInsertId();
}

// So chega aqui quando nao ha Pix em cache ainda valido (bloco acima ja teria
// retornado). A chave de idempotencia inclui o timestamp pra cada tentativa ser
// unica — se usasse so o id da cobranca, o Mercado Pago devolveria o MESMO Pix
// (ja expirado) de uma tentativa anterior em vez de gerar um novo de verdade.
$resultado = mpCriarPagamentoPix([
  'valor'              => (float) $plano['valor'],
  'descricao'          => 'Assinatura LillyMenu - ' . $plano['nome'],
  'email_pagador'      => $emailPagador,
  'referencia_externa' => (string) $cobrancaId,
  'chave_idempotencia' => 'cobranca_' . $cobrancaId . '_' . time(),
]);

if (!$resultado['ok']) {
  echo json_encode(['ok' => false, 'msg' => $resultado['erro'] ?? 'Erro ao gerar o Pix.']);
  exit;
}

$stmt = $conn->prepare("
  UPDATE cobrancas
  SET origem = 'mercadopago', mp_payment_id = ?, mp_qr_code = ?, mp_qr_code_base64 = ?, mp_expiracao = ?
  WHERE id = ?
");
$stmt->execute([
  $resultado['id'],
  $resultado['qr_code'],
  $resultado['qr_code_base64'],
  date('Y-m-d H:i:s', strtotime((string) $resultado['expira_em'])),
  $cobrancaId,
]);

echo json_encode([
  'ok'             => true,
  'cobranca_id'    => $cobrancaId,
  'qr_code'        => $resultado['qr_code'],
  'qr_code_base64' => $resultado['qr_code_base64'],
  'expira_em'      => date('Y-m-d H:i:s', strtotime((string) $resultado['expira_em'])),
  'valor'          => (float) $plano['valor'],
]);
