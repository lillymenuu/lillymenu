<?php
require 'config/database.php';
$cols = $conn->query("SHOW COLUMNS FROM configuracoes")->fetchAll(PDO::FETCH_COLUMN,0);
print_r($cols);
?>
