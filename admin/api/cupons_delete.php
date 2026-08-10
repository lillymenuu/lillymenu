<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

exigirPerfil(['admin', 'gerente']);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = (int) ($_POST['id'] ?? 0);

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
  $stmt = $conn->prepare("SELECT codigo FROM cupons WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$id, $lojaId]);
  $codigo = $stmt->fetchColumn();
  if (!$codigo) {
    echo json_encode(['ok' => false, 'msg' => 'Cupom nao encontrado.']);
    exit;
  }

  $stmt = $conn->prepare("DELETE FROM cupons WHERE id = ? AND loja_id = ?");
  $stmt->execute([$id, $lojaId]);

  registrarOperacao($conn, 'cupom_apagado', 'cupom:' . $id, [
    'codigo' => $codigo
  ]);

  echo json_encode(['ok' => true, 'msg' => 'Cupom apagado.']);
  exit;
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao apagar cupom.']);
  exit;
}
