<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/storage.php';

$lojaId  = (int)($_GET['loja_id'] ?? 1);
$comboId = (int)($_GET['id'] ?? 0);

function fixImgPath(string $p): string {
  return storage_url_absoluta($p);
}

if ($comboId <= 0 || $lojaId <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'Parâmetros inválidos']); exit;
}

try {
    $stmt = $conn->prepare("SELECT id FROM combos WHERE id = ? AND loja_id = ? AND ativo = 1");
    $stmt->execute([$comboId, $lojaId]);
    if (!$stmt->fetch()) {
        echo json_encode(['ok' => false, 'msg' => 'Combo não encontrado']); exit;
    }

    $stmtP = $conn->prepare("
        SELECT id, nome, descricao, obrigatorio, min_itens, max_itens, permite_repetir
        FROM combo_passos
        WHERE combo_id = ? AND loja_id = ?
        ORDER BY ordem IS NULL, ordem, id
    ");
    $stmtP->execute([$comboId, $lojaId]);
    $passos = $stmtP->fetchAll(PDO::FETCH_ASSOC);

    $prodCols = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
    $temImg   = in_array('imagem', $prodCols, true);
    $imgSel   = $temImg ? 'p.imagem' : "'' AS imagem";

    $stmtO = $conn->prepare("
        SELECT o.produto_id AS id, p.nome, $imgSel AS imagem, IFNULL(e.quantidade,0) AS estoque
        FROM combo_passo_opcoes o
        JOIN produtos p ON p.id = o.produto_id AND p.loja_id = o.loja_id
        LEFT JOIN estoque e ON e.produto_id = o.produto_id AND e.loja_id = o.loja_id
        WHERE o.passo_id = ? AND o.loja_id = ?
        ORDER BY o.ordem IS NULL, o.ordem, o.id
    ");
    foreach ($passos as &$passo) {
        $stmtO->execute([$passo['id'], $lojaId]);
        $opcoes = $stmtO->fetchAll(PDO::FETCH_ASSOC);
        foreach ($opcoes as &$opc) {
            $opc['imagem']   = fixImgPath((string)($opc['imagem'] ?? ''));
            $opc['estoque']  = (int)($opc['estoque'] ?? 0);
            $opc['esgotado'] = $opc['estoque'] <= 0;
        }
        unset($opc);
        $passo['opcoes'] = $opcoes;
    }
    unset($passo);

    echo json_encode(['ok' => true, 'passos' => $passos], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}
