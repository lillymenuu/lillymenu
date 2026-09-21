<?php
session_start();
date_default_timezone_set('America/Fortaleza');
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';

$lojaId = definirLojaIdSessao($conn);
$tipo   = trim($_POST['tipo'] ?? '');
/* Identificador anonimo do visitante (gerado no navegador): permite contar pessoas unicas por etapa. */
$visitante = substr(preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($_POST['visitante'] ?? '')), 0, 40);

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
        visitante VARCHAR(40)  NULL,
        INDEX idx_loja_tipo_data (loja_id, tipo, criado_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    /* Tabelas antigas nao tem a coluna visitante. */
    $temCol = $conn->query("SHOW COLUMNS FROM loja_eventos LIKE 'visitante'")->fetchColumn();
    if (!$temCol) {
        $conn->exec("ALTER TABLE loja_eventos ADD COLUMN visitante VARCHAR(40) NULL");
    }

    $conn->prepare("INSERT INTO loja_eventos (loja_id, tipo, visitante) VALUES (?, ?, ?)")
         ->execute([$lojaId, $tipo, $visitante !== '' ? $visitante : null]);

    echo json_encode(['ok'=>true]);
} catch (Exception $e) {
    echo json_encode(['ok'=>false]);
}
