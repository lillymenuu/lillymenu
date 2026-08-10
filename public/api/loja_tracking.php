<?php
session_start();
date_default_timezone_set('America/Fortaleza');
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';

$lojaId = definirLojaIdSessao($conn);
$tipo   = trim($_POST['tipo'] ?? '');

$tiposValidos = ['visita','view_item','carrinho','pedido'];
if (!in_array($tipo, $tiposValidos, true)) {
    echo json_encode(['ok'=>false]); exit;
}

try {
    /* Garante que a tabela existe */
    $conn->exec("CREATE TABLE IF NOT EXISTS loja_eventos (
        id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        loja_id   INT UNSIGNED NOT NULL,
        tipo      VARCHAR(20)  NOT NULL,
        criado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_loja_tipo_data (loja_id, tipo, criado_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $conn->prepare("INSERT INTO loja_eventos (loja_id, tipo) VALUES (?, ?)")
         ->execute([$lojaId, $tipo]);

    echo json_encode(['ok'=>true]);
} catch (Exception $e) {
    echo json_encode(['ok'=>false]);
}
