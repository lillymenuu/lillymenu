<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = (int) ($_POST['id'] ?? 0);
$ativo = isset($_POST['ativo']) ? (int) $_POST['ativo'] : null;

if ($id <= 0 || ($ativo !== 0 && $ativo !== 1)) {
  echo json_encode(['ok' => false]);
  exit;
}

$stmt = $conn->prepare("UPDATE produtos SET ativo = ? WHERE id = ? AND loja_id = ?");
$stmt->execute([$ativo, $id, $lojaId]);

bumpCatalogoVersao($conn, $lojaId);
echo json_encode(['ok' => true]);
