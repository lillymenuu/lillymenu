<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json; charset=UTF-8');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

/*
 * Identifica clientes sem máscara: telefone composto apenas por dígitos
 * Ex: "85987740436"  → sem máscara
 * Ex: "(85) 98774-0436" → COM máscara (não será removido)
 */
$telStrip = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone,'(',''),')',''),' ',''),'-',''),'+','')";

try {
    /* Busca IDs de clientes sem máscara desta loja */
    $stmt = $conn->prepare("
        SELECT id, nome, telefone
        FROM clientes
        WHERE loja_id = ?
          AND telefone = ({$telStrip})
          AND telefone != ''
    ");
    $stmt->execute([$lojaId]);
    $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($clientes)) {
        echo json_encode(['ok' => true, 'msg' => 'Nenhum cliente sem máscara encontrado.', 'removidos' => 0]);
        exit;
    }

    $ids = array_column($clientes, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    $conn->beginTransaction();

    $removidos = 0;

    /* 1. Remover pontos_movimentacoes */
    try {
        $conn->prepare("DELETE FROM pontos_movimentacoes WHERE cliente_id IN ({$placeholders}) AND loja_id = ?")
             ->execute(array_merge($ids, [$lojaId]));
    } catch (Exception $e) { /* tabela pode não existir */ }

    /* 2. Remover cashback_movimentacoes */
    try {
        $conn->prepare("DELETE FROM cashback_movimentacoes WHERE cliente_id IN ({$placeholders}) AND loja_id = ?")
             ->execute(array_merge($ids, [$lojaId]));
    } catch (Exception $e) {}

    /* 3. Remover os clientes */
    $del = $conn->prepare("DELETE FROM clientes WHERE id IN ({$placeholders}) AND loja_id = ?");
    $del->execute(array_merge($ids, [$lojaId]));
    $removidos = $del->rowCount();

    $conn->commit();

    echo json_encode([
        'ok'       => true,
        'msg'      => "{$removidos} cliente(s) sem máscara removido(s) com sucesso.",
        'removidos'=> $removidos,
        'clientes' => $clientes,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    try { $conn->rollBack(); } catch (Exception $ex) {}
    echo json_encode(['ok' => false, 'msg' => 'Erro: ' . $e->getMessage()]);
}