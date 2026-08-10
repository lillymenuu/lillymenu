<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'msg' => 'Metodo invalido']);
  exit;
}

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$caixaId = (int) ($_POST['caixa_id'] ?? 0);
$abertoEm = trim((string) ($_POST['aberto_em'] ?? ''));

if ($caixaId <= 0 || $abertoEm === '') {
  echo json_encode(['ok' => false, 'msg' => 'Dados invalidos']);
  exit;
}

$abertoEm = str_replace('T', ' ', $abertoEm);
if (strlen($abertoEm) === 16) {
  $abertoEm .= ':00';
}

$timestamp = strtotime($abertoEm);
if (!$timestamp) {
  echo json_encode(['ok' => false, 'msg' => 'Data invalida']);
  exit;
}

$stmt = $conn->prepare("UPDATE caixa_turnos SET aberto_em = ? WHERE id = ? AND loja_id = ?");
$stmt->execute([date('Y-m-d H:i:s', $timestamp), $caixaId, $lojaId]);

echo json_encode(['ok' => true]);
