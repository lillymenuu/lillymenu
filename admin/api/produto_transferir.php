<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId      = (int)($_SESSION['loja_id'] ?? 1);
$id          = (int)($_POST['id'] ?? 0);
$categoriaId = (int)($_POST['categoria_id'] ?? 0);

if (!$id || !$categoriaId) {
  echo json_encode(['ok'=>false,'msg'=>'Dados inválidos']); exit;
}

$stmt = $conn->prepare("SELECT id FROM produtos WHERE id=? AND loja_id=? LIMIT 1");
$stmt->execute([$id, $lojaId]);
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok'=>false,'msg'=>'Produto não encontrado']); exit;
}

$stmt = $conn->prepare("SELECT id FROM categorias WHERE id=? AND loja_id=? LIMIT 1");
$stmt->execute([$categoriaId, $lojaId]);
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok'=>false,'msg'=>'Categoria não encontrada']); exit;
}

$conn->prepare("UPDATE produtos SET categoria_id=? WHERE id=? AND loja_id=?")
     ->execute([$categoriaId, $id, $lojaId]);

echo json_encode(['ok'=>true]);
