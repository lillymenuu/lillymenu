<?php
require 'config/database.php';
$email = isset($argv[1]) ? $argv[1] : '';
if (!$email) { echo "Use: php admin/tmp_check_user.php email@exemplo.com\n"; exit; }
$stmt = $conn->prepare("SELECT id, nome, email, usuario, ativo, perfil, loja_id FROM admins WHERE email = ? OR usuario = ? LIMIT 1");
$stmt->execute([$email, $email]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
var_export($row);
?>
