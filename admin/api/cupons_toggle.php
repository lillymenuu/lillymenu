<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

exigirPerfil(['admin', 'gerente']);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = (int) ($_POST['id'] ?? 0);
$ativo = ($_POST['ativo'] ?? '0') === '1' ? 1 : 0;

if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Cupom invalido.']);
  exit;
}

$stmt = $conn->prepare("SHOW TABLES LIKE 'cupons'");
$stmt->execute();
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de cupons nao encontrada.']);
  exit;
}

try {
  $stmt = $conn->prepare("UPDATE cupons SET ativo = ?, atualizado_em = NOW() WHERE id = ? AND loja_id = ?");
  $stmt->execute([$ativo, $id, $lojaId]);
  if ($stmt->rowCount() === 0) {
    echo json_encode(['ok' => false, 'msg' => 'Cupom nao encontrado.']);
    exit;
  }

  registrarOperacao($conn, 'cupom_toggle', 'cupom:' . $id, [
    'ativo' => $ativo
  ]);

  echo json_encode(['ok' => true]);
  exit;
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao atualizar cupom.']);
  exit;
}
