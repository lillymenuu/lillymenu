<?php
/**
 * Formata um número de telefone brasileiro com máscara.
 * 11 dígitos → (XX) XXXXX-XXXX  (celular)
 * 10 dígitos → (XX) XXXX-XXXX   (fixo)
 * Outros     → retorna como está
 */
function formatarTelefoneBR(string $tel): string {
    $d = preg_replace('/\D+/', '', $tel);
    $len = strlen($d);
    if ($len === 11) {
        return '(' . substr($d, 0, 2) . ') ' . substr($d, 2, 5) . '-' . substr($d, 7);
    }
    if ($len === 10) {
        return '(' . substr($d, 0, 2) . ') ' . substr($d, 2, 4) . '-' . substr($d, 6);
    }
    return $tel; // não formata se não tiver 10 ou 11 dígitos
}

/**
 * Extrai apenas dígitos de um telefone.
 */
function apenasDigitosTel(string $tel): string {
    return preg_replace('/\D+/', '', $tel);
}

/**
 * Expressão SQL MySQL que remove máscara do campo telefone para comparação.
 */
function sqlTelStrip(string $col = 'telefone'): string {
    return "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE({$col},'(',''),')',''),' ',''),'-',''),'+','')";
}

/**
 * Verifica se já existe um cliente com o telefone informado nesta loja.
 * Retorna o ID existente ou 0 se não encontrado.
 * $excluirId: opcional, exclui esse ID da verificação (para UPDATE).
 */
function clienteTelefoneExiste(PDO $conn, string $tel, int $lojaId, int $excluirId = 0): int {
    $digits = apenasDigitosTel($tel);
    if (strlen($digits) < 8) return 0;

    $strip = sqlTelStrip('telefone');
    $sql = "SELECT id FROM clientes
            WHERE loja_id = ?
              AND ({$strip} = ? OR telefone = ?)";
    $params = [$lojaId, $digits, $tel];

    if ($excluirId > 0) {
        $sql   .= " AND id != ?";
        $params[] = $excluirId;
    }
    $sql .= " LIMIT 1";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    return (int) ($stmt->fetchColumn() ?: 0);
}
