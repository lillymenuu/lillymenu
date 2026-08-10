<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$stmt = $conn->prepare("
  SELECT 
    p.id,
    p.nome,
    IFNULL(e.quantidade,0) AS quantidade
  FROM produtos p
  LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
  WHERE p.loja_id = ?
  ORDER BY p.nome
");
$stmt->execute([$lojaId]);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
