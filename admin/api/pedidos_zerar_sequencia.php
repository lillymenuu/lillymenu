<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json; charset=UTF-8');

$lojaId = (int)($_SESSION['loja_id'] ?? 1);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'msg' => 'Método inválido']); exit;
}

try {
    /* 1. Garante que a coluna codigo existe (DDL — não pode estar em transação no MySQL) */
    $cols = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
    if (!in_array('codigo', $cols)) {
        $conn->exec("ALTER TABLE pedidos ADD COLUMN codigo VARCHAR(64) NULL AFTER id");
    }

    /* 2. Normaliza pedidos sem codigo desta loja (DML simples) */
    $conn->prepare("UPDATE pedidos SET codigo = id WHERE loja_id = ? AND (codigo IS NULL OR codigo = '')")
         ->execute([$lojaId]);

    /* 3. Obtém o maior ID desta loja */
    $stmtMax = $conn->prepare("SELECT COALESCE(MAX(id), 0) FROM pedidos WHERE loja_id = ?");
    $stmtMax->execute([$lojaId]);
    $maxId = (int)$stmtMax->fetchColumn();

    /* 4. Salva o offset em configuracoes (upsert manual) */
    $chave = 'pedido_codigo_base';

    $stmtChk = $conn->prepare("SELECT COUNT(*) FROM configuracoes WHERE chave = ? AND loja_id = ?");
    $stmtChk->execute([$chave, $lojaId]);

    if ((int)$stmtChk->fetchColumn() > 0) {
        $conn->prepare("UPDATE configuracoes SET valor = ? WHERE chave = ? AND loja_id = ?")
             ->execute([$maxId, $chave, $lojaId]);
    } else {
        $conn->prepare("INSERT INTO configuracoes (chave, valor, loja_id) VALUES (?, ?, ?)")
             ->execute([$chave, $maxId, $lojaId]);
    }

    echo json_encode([
        'ok'      => true,
        'msg'     => 'Sequência zerada! O próximo pedido será o #1.',
        'base'    => $maxId,
        'proximo' => 1,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro: ' . $e->getMessage()]);
}
