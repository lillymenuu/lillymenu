<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId = (int) ($_SESSION['loja_id'] ?? 0);

$stmt = $conn->prepare("SELECT id FROM assinaturas WHERE loja_id = ? ORDER BY id DESC LIMIT 1");
$stmt->execute([$lojaId]);
$assinaturaId = (int) $stmt->fetchColumn();

if ($assinaturaId <= 0) {
  echo json_encode(['ok' => true, 'transacoes' => []]);
  exit;
}

$stmt = $conn->prepare("
  SELECT id, valor, status, origem, vencimento, pago_em, criado_em
  FROM cobrancas
  WHERE assinatura_id = ?
  ORDER BY id DESC
");
$stmt->execute([$assinaturaId]);
$transacoes = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['ok' => true, 'transacoes' => $transacoes]);
