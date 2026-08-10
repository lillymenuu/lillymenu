<?php
require_once '../config/database.php';
require_once '../helpers/loja_context.php';

$id = (int) ($_GET['id'] ?? 0);
$lojaId = definirLojaIdSessao($conn);

$stmt = $conn->prepare(
  "SELECT id, nome, descricao, preco, imagem 
   FROM produtos 
   WHERE id = ? AND ativo = 1 AND loja_id = ?"
);
$stmt->execute([$id, $lojaId]);

echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
