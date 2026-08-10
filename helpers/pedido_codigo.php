<?php
/**
 * Retorna a base de sequência zerada para esta loja.
 * 0 = sem zeroing ativo.
 */
function getPedidoCodigoBase(PDO $conn, int $lojaId): int {
    try {
        $s = $conn->prepare("SELECT CAST(valor AS UNSIGNED) FROM configuracoes WHERE chave='pedido_codigo_base' AND loja_id=? LIMIT 1");
        $s->execute([$lojaId]);
        $v = $s->fetchColumn();
        return ($v !== false && (int)$v > 0) ? (int)$v : 0;
    } catch (Exception $e) {
        return 0;
    }
}

/**
 * Calcula o número de exibição do pedido dado o id e a base.
 */
function calcCodigoDisplay(int $id, int $base): int {
    if ($base > 0 && $id > $base) {
        return max(1, $id - $base);
    }
    return $id;
}
