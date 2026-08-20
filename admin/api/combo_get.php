<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId  = (int)($_SESSION['loja_id'] ?? 1);
$comboId = (int)($_GET['id'] ?? 0);

if ($comboId <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'ID inválido']);
    exit;
}

try {
    $stmt = $conn->prepare("
        SELECT id, nome, descricao, imagem, tipo_preco, preco, preco_promocional, promo_desativado, ativo, categoria_id
        FROM combos
        WHERE id = ? AND loja_id = ?
    ");
    $stmt->execute([$comboId, $lojaId]);
    $combo = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$combo) {
        echo json_encode(['ok' => false, 'msg' => 'Combo não encontrado']);
        exit;
    }

    $stmtPassos = $conn->prepare("
        SELECT id, nome, descricao, obrigatorio, min_itens, max_itens, permite_repetir
        FROM combo_passos
        WHERE combo_id = ? AND loja_id = ?
        ORDER BY ordem IS NULL, ordem, id
    ");
    $stmtPassos->execute([$comboId, $lojaId]);
    $passos = $stmtPassos->fetchAll(PDO::FETCH_ASSOC);

    // Load options for each passo
    $temImagem = in_array('imagem', $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0), true);
    $imagemSel = $temImagem ? 'p.imagem' : "NULL AS imagem";

    $stmtOpc = $conn->prepare("
        SELECT o.produto_id AS id, p.nome, p.preco, $imagemSel AS imagem, IFNULL(e.quantidade,0) AS estoque
        FROM combo_passo_opcoes o
        JOIN produtos p ON p.id = o.produto_id AND p.loja_id = o.loja_id
        LEFT JOIN estoque e ON e.produto_id = o.produto_id AND e.loja_id = o.loja_id
        WHERE o.passo_id = ? AND o.loja_id = ?
        ORDER BY o.ordem IS NULL, o.ordem, o.id
    ");
    foreach ($passos as &$passo) {
        $stmtOpc->execute([$passo['id'], $lojaId]);
        $opcoes = $stmtOpc->fetchAll(PDO::FETCH_ASSOC);
        foreach ($opcoes as &$opc) {
            $opc['estoque']  = (int) ($opc['estoque'] ?? 0);
            $opc['esgotado'] = $opc['estoque'] <= 0;
        }
        unset($opc);
        $passo['opcoes'] = $opcoes;
    }
    unset($passo);

    echo json_encode(
        ['ok' => true, 'combo' => $combo, 'passos' => $passos],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}
