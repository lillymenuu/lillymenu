<?php
require 'config/database.php';
$cols=$conn->query("SHOW COLUMNS FROM pedido_itens")->fetchAll(PDO::FETCH_COLUMN,0);
print_r($cols);
?>
