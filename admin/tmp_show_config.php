<?php
require 'config/database.php';
$stmt = $conn->query("SHOW CREATE TABLE configuracoes");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
print_r($row);
?>
