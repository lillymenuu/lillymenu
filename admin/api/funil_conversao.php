<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json; charset=UTF-8');

$lojaId = (int)($_SESSION['loja_id'] ?? 1);
$dias   = max(1, min(90, (int)($_GET['dias'] ?? 7)));

try {
    /* Verifica se a tabela existe */
    $stmt = $conn->prepare("SHOW TABLES LIKE 'loja_eventos'");
    $stmt->execute();
    $temTabela = (bool)$stmt->fetchColumn();

    if (!$temTabela) {
        echo json_encode(['ok'=>true,'dias'=>$dias,'visitas'=>0,'views'=>0,'carrinhos'=>0,'pedidos'=>0,'conversao'=>0]);
        exit;
    }

    $desde = date('Y-m-d H:i:s', strtotime("-{$dias} days"));

    /* Conta eventos dos últimos N dias */
    $stmtEvt = $conn->prepare("
        SELECT tipo, COUNT(*) AS cnt
        FROM loja_eventos
        WHERE loja_id = ? AND criado_em >= ?
        GROUP BY tipo
    ");
    $stmtEvt->execute([$lojaId, $desde]);
    $rows = $stmtEvt->fetchAll(PDO::FETCH_KEY_PAIR);

    $visitas   = (int)($rows['visita']    ?? 0);
    $views     = (int)($rows['view_item'] ?? 0);
    $carrinhos = (int)($rows['carrinho']  ?? 0);
    $pedidos   = (int)($rows['pedido']    ?? 0);

    $conversao = $visitas > 0 ? round($pedidos / $visitas * 100) : 0;

    echo json_encode([
        'ok'        => true,
        'dias'      => $dias,
        'visitas'   => $visitas,
        'views'     => $views,
        'carrinhos' => $carrinhos,
        'pedidos'   => $pedidos,
        'conversao' => $conversao,
        'pct_views'      => $visitas>0 ? round($views/$visitas*100)     : 0,
        'pct_carrinhos'  => $visitas>0 ? round($carrinhos/$visitas*100) : 0,
        'pct_pedidos'    => $visitas>0 ? round($pedidos/$visitas*100)   : 0,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['ok'=>false,'msg'=>$e->getMessage()]);
}
