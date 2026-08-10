<?php
require_once __DIR__ . '/../config/database.php';

$email = $_POST['email'] ?? '';

$token = bin2hex(random_bytes(32));
$expira = date('Y-m-d H:i:s', strtotime('+1 hour'));

$stmt = $conn->prepare(
  "UPDATE admins 
   SET reset_token = ?, reset_expira = ?
   WHERE email = ? AND ativo = 1"
);
$stmt->execute([$token, $expira, $email]);

// Em produção: enviar email
// Aqui vamos redirecionar direto (modo local)
header("Location: reset.php?token=$token");
exit;
