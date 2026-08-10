<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';

$lojaId = definirLojaIdSessao($conn);
$q      = trim($_GET['q'] ?? '');

if (strlen($q) < 3) {
    echo json_encode(['ok' => true, 'clientes' => []]);
    exit;
}

try {
    $colsCli   = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
    $colPontos = in_array('pontos_saldo', $colsCli) ? 'pontos_saldo'
               : (in_array('pontos', $colsCli) ? 'pontos' : null);

    $selPontos = $colPontos ? ", {$colPontos} AS saldo" : ", 0 AS saldo";

    /* remove máscara do query para comparar com dígitos */
    $qDigits = preg_replace('/\D+/', '', $q);

    /* expressão MySQL que remove a máscara do campo telefone */
    $telStrip = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone,'(',''),')',''),' ',''),'-',''),'+','')";

    $like      = '%' . $q . '%';
    $likeDigits= '%' . $qDigits . '%';

    /* busca por nome, por telefone com máscara OU por dígitos puros */
    $stmt = $conn->prepare("
        SELECT id, nome, telefone {$selPontos}
        FROM clientes
        WHERE loja_id = ?
          AND (
            nome LIKE ?
            OR telefone LIKE ?
            OR ({$telStrip}) LIKE ?
          )
        ORDER BY nome ASC
        LIMIT 8
    ");
    $stmt->execute([$lojaId, $like, $like, $likeDigits]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $clientes = array_map(fn($c) => [
        'id'       => (int)$c['id'],
        'nome'     => $c['nome'],
        'telefone' => $c['telefone'],
        'saldo'    => (int)($c['saldo'] ?? 0),
    ], $rows);

    echo json_encode(['ok' => true, 'clientes' => $clientes], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['ok' => true, 'clientes' => []]);
}
