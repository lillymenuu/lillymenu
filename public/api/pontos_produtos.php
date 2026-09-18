<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';
require_once '../../helpers/storage.php';

$lojaId = definirLojaIdSessao($conn);

/* URL relativa (../admin/...) quebra quando consumida cross-origin pela
   Store em Next — mesmo ajuste ja feito em cross_sell_sugestoes.php. */
function fixImgP(string $p): string {
    if (!$p) return '';
    return storage_url_absoluta($p);
}

try {
    $cols = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);

    if (!in_array('pontos_custo', $cols)) {
        echo json_encode(['ok' => true, 'produtos' => []]);
        exit;
    }

    $selImg  = in_array('imagem', $cols)       ? ', p.imagem'       : '';
    $selGanho= in_array('pontos_ganho', $cols) ? ', p.pontos_ganho' : ', 0 AS pontos_ganho';

    $stmt = $conn->prepare("
        SELECT p.id, p.nome, p.descricao, p.pontos_custo {$selImg} {$selGanho},
               cat.nome AS categoria
        FROM produtos p
        LEFT JOIN categorias cat ON cat.id = p.categoria_id AND cat.loja_id = p.loja_id
        WHERE p.loja_id = ? AND p.ativo = 1 AND p.pontos_custo > 0
        ORDER BY p.pontos_custo ASC
    ");
    $stmt->execute([$lojaId]);
    $produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($produtos as &$p) {
        $p['imagem']      = fixImgP($p['imagem'] ?? '');
        $p['pontos_custo']= (int) $p['pontos_custo'];
        $p['pontos_ganho']= (int) $p['pontos_ganho'];
    }
    unset($p);

    echo json_encode(['ok' => true, 'produtos' => $produtos], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['ok' => true, 'produtos' => []]);
}
