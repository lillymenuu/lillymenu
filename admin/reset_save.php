<?php
require_once __DIR__ . '/../config/database.php';

$token = $_POST['token'] ?? '';
$senha = password_hash($_POST['senha'], PASSWORD_DEFAULT);

$stmt = $conn->prepare(
  "UPDATE admins 
   SET senha = ?, reset_token = NULL, reset_expira = NULL
   WHERE reset_token = ?"
);
$stmt->execute([$senha, $token]);

header("Location: index.php?ok=1");
exit;
