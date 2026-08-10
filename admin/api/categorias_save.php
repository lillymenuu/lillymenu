<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id    = $_POST['id'] ?? '';
$nome  = trim($_POST['nome'] ?? '');
$ativo = isset($_POST['ativo']) ? 1 : 0;
$modoValidos = ['vertical', 'horizontal', 'grid'];
$modo  = in_array($_POST['modo_exibicao'] ?? '', $modoValidos, true) ? $_POST['modo_exibicao'] : 'vertical';

// Garante que a coluna existe
try {
  $cols = $conn->query("SHOW COLUMNS FROM categorias")->fetchAll(PDO::FETCH_COLUMN, 0);
  if (!in_array('modo_exibicao', $cols, true)) {
    $conn->exec("ALTER TABLE categorias ADD COLUMN modo_exibicao VARCHAR(20) NOT NULL DEFAULT 'vertical'");
  }
} catch (Throwable $e) {}

if ($nome === '') {
  echo json_encode(['ok'=>false]);
  exit;
}

if ($id !== '') {
  $stmt = $conn->prepare("
    UPDATE categorias
    SET nome = ?, ativo = ?, modo_exibicao = ?
    WHERE id = ? AND loja_id = ?
  ");
  $stmt->execute([$nome, $ativo, $modo, $id, $lojaId]);
  bumpCatalogoVersao($conn, $lojaId);
  echo json_encode(['ok'=>true, 'action'=>'update']);
  exit;
}

$stmt = $conn->prepare("SELECT COALESCE(MAX(ordem), 0) + 1 FROM categorias WHERE loja_id = ?");
$stmt->execute([$lojaId]);
$novaOrdem = (int) $stmt->fetchColumn();

$stmt = $conn->prepare("
  INSERT INTO categorias (nome, ativo, ordem, loja_id, modo_exibicao)
  VALUES (?, ?, ?, ?, ?)
");
$stmt->execute([$nome, $ativo, $novaOrdem, $lojaId, $modo]);

bumpCatalogoVersao($conn, $lojaId);
echo json_encode(['ok'=>true, 'action'=>'insert']);
