<?php
session_start();
date_default_timezone_set('America/Fortaleza');
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';

$lojaId    = definirLojaIdSessao($conn);
$clienteId = (int) ($_POST['cliente_id'] ?? 0);
$pontos    = (int) ($_POST['pontos'] ?? 0);

if (!$clienteId || $pontos <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'Dados inválidos.']); exit;
}

try {
    $colsCli   = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
    $colPontos = in_array('pontos_saldo', $colsCli) ? 'pontos_saldo'
               : (in_array('pontos', $colsCli) ? 'pontos' : null);

    if (!$colPontos) {
        echo json_encode(['ok' => false, 'msg' => 'Sistema de pontos indisponível.']); exit;
    }

    $conn->beginTransaction();

    $stmtC = $conn->prepare("SELECT {$colPontos} AS saldo FROM clientes WHERE id = ? AND loja_id = ? LIMIT 1");
    $stmtC->execute([$clienteId, $lojaId]);
    $row = $stmtC->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        $conn->rollBack();
        echo json_encode(['ok' => false, 'msg' => 'Cliente não encontrado.']); exit;
    }

    $saldoAntes = (int) $row['saldo'];
    $novoSaldo  = $saldoAntes + $pontos;

    $conn->prepare("UPDATE clientes SET {$colPontos} = ? WHERE id = ? AND loja_id = ?")
         ->execute([$novoSaldo, $clienteId, $lojaId]);

    try {
        $conn->prepare("
            INSERT INTO pontos_movimentacoes
                (cliente_id, tipo, pontos, saldo_antes, saldo_depois, loja_id, criado_em)
            VALUES (?, 'devolucao', ?, ?, ?, ?, NOW())
        ")->execute([$clienteId, $pontos, $saldoAntes, $novoSaldo, $lojaId]);
    } catch (Exception $e) {}

    $conn->commit();

    echo json_encode([
        'ok'        => true,
        'saldo_novo'=> $novoSaldo,
        'devolvido' => $pontos,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    try { $conn->rollBack(); } catch (Exception $ex) {}
    echo json_encode(['ok' => false, 'msg' => 'Erro ao restaurar pontos.']);
}
