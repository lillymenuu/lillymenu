<?php
session_start();
date_default_timezone_set('America/Fortaleza');
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';

$lojaId = definirLojaIdSessao($conn);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok'=>false,'msg'=>'Método inválido']); exit;
}

$pedidoId  = (int)($_POST['pedido_id'] ?? 0);
$nota      = (int)($_POST['nota']      ?? 0);
$descricao = trim($_POST['descricao']  ?? '');

if (!$pedidoId || $nota < 1 || $nota > 5) {
    echo json_encode(['ok'=>false,'msg'=>'Dados inválidos.']); exit;
}

try {
    /* Garante que a tabela existe */
    $conn->exec("CREATE TABLE IF NOT EXISTS avaliacoes (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        pedido_id   INT UNSIGNED NOT NULL,
        loja_id     INT UNSIGNED NOT NULL,
        cliente_id  INT UNSIGNED NULL,
        nota        TINYINT NOT NULL,
        descricao   TEXT NULL,
        criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_pedido (pedido_id, loja_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    /* Verifica se o pedido pertence à loja e está finalizado */
    $stmtP = $conn->prepare(
        "SELECT id, cliente_id, status FROM pedidos WHERE id = ? AND loja_id = ? LIMIT 1"
    );
    $stmtP->execute([$pedidoId, $lojaId]);
    $pedido = $stmtP->fetch(PDO::FETCH_ASSOC);

    if (!$pedido) {
        echo json_encode(['ok'=>false,'msg'=>'Pedido não encontrado.']); exit;
    }
    if (!in_array($pedido['status'] ?? '', ['finalizado','entregue'])) {
        echo json_encode(['ok'=>false,'msg'=>'Somente pedidos entregues podem ser avaliados.']); exit;
    }

    /* Upsert da avaliação */
    $clienteId = (int)($pedido['cliente_id'] ?? 0) ?: null;
    $stmtChk = $conn->prepare(
        "SELECT id FROM avaliacoes WHERE pedido_id = ? AND loja_id = ? LIMIT 1"
    );
    $stmtChk->execute([$pedidoId, $lojaId]);
    $exists = $stmtChk->fetchColumn();

    if ($exists) {
        $conn->prepare(
            "UPDATE avaliacoes SET nota=?, descricao=?, criado_em=NOW() WHERE pedido_id=? AND loja_id=?"
        )->execute([$nota, $descricao ?: null, $pedidoId, $lojaId]);
    } else {
        $conn->prepare(
            "INSERT INTO avaliacoes (pedido_id, loja_id, cliente_id, nota, descricao) VALUES (?,?,?,?,?)"
        )->execute([$pedidoId, $lojaId, $clienteId, $nota, $descricao ?: null]);
    }

    echo json_encode(['ok'=>true,'msg'=>'Avaliação enviada! Obrigado.'], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['ok'=>false,'msg'=>'Erro ao salvar avaliação.']);
}
