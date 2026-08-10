<?php
session_start();
date_default_timezone_set('America/Fortaleza');
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';

$lojaId = definirLojaIdSessao($conn);
$tel    = preg_replace('/\D+/', '', trim($_GET['tel'] ?? ''));

if (strlen($tel) < 10) {
    echo json_encode(['ok' => false, 'msg' => 'Informe um telefone válido.']);
    exit;
}

try {
    $colsCli = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
    $colPontos = in_array('pontos_saldo', $colsCli) ? 'pontos_saldo'
               : (in_array('pontos', $colsCli) ? 'pontos' : null);

    if (!$colPontos) {
        echo json_encode(['ok' => false, 'msg' => 'Sistema de pontos não disponível.']);
        exit;
    }

    $telStrip = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone,'(',''),')',''),' ',''),'-',''),'+','')";

    $stmt = $conn->prepare("
        SELECT id, nome, {$colPontos} AS saldo, nivel
        FROM clientes
        WHERE loja_id = ?
          AND (telefone = ? OR ({$telStrip}) = ?)
        LIMIT 1
    ");
    $stmt->execute([$lojaId, $tel, $tel]);
    $c = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$c) {
        echo json_encode(['ok' => false, 'msg' => 'Cliente não encontrado. Faça um pedido para acumular pontos!']);
        exit;
    }

    echo json_encode([
        'ok'         => true,
        'cliente_id' => (int) $c['id'],
        'nome'       => $c['nome'] ?? '',
        'saldo'      => (int) $c['saldo'],
        'nivel'      => $c['nivel'] ?? 'Bronze',
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro interno.']);
}
