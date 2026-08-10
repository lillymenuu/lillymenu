<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$stmt = $conn->prepare("
  SELECT id, nome
  FROM categorias
  WHERE ativo = 1 AND loja_id = ?
  ORDER BY ordem IS NULL, ordem, nome
");
$stmt->execute([$lojaId]);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

