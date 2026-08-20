<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';
require_once __DIR__ . '/../../helpers/storage.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = (int) ($_POST['id'] ?? 0);
if ($id <= 0) {
  echo json_encode(['ok' => false]);
  exit;
}

try {
  $colunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temImagem = in_array('imagem', $colunas, true);
  $imagem = null;
  if ($temImagem) {
    $stmt = $conn->prepare("SELECT imagem FROM produtos WHERE id = ? AND loja_id = ? LIMIT 1");
    $stmt->execute([$id, $lojaId]);
    $imagem = $stmt->fetchColumn() ?: null;
  }

  $stmt = $conn->prepare("DELETE FROM produtos WHERE id = ? AND loja_id = ?");
  $stmt->execute([$id, $lojaId]);

  storage_delete($imagem);
  bumpCatalogoVersao($conn, $lojaId);
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false]);
}
