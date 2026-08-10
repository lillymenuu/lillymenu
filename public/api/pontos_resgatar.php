<?php
session_start();
date_default_timezone_set('America/Fortaleza');
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';

$lojaId = definirLojaIdSessao($conn);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'msg' => 'Método inválido.']); exit;
}

$clienteId = (int) ($_POST['cliente_id'] ?? 0);
$produtoId = (int) ($_POST['produto_id'] ?? 0);

if (!$clienteId || !$produtoId) {
    echo json_encode(['ok' => false, 'msg' => 'Dados inválidos.']); exit;
}

try {
    $conn->beginTransaction();

    /* Verificar produto */
    $stmtP = $conn->prepare("
        SELECT id, nome, pontos_custo, preco
        FROM produtos
        WHERE id = ? AND loja_id = ? AND ativo = 1 AND pontos_custo > 0
        LIMIT 1
    ");
    $stmtP->execute([$produtoId, $lojaId]);
    $produto = $stmtP->fetch(PDO::FETCH_ASSOC);

    if (!$produto) {
        $conn->rollBack();
        echo json_encode(['ok' => false, 'msg' => 'Produto não disponível para resgate.']);
        exit;
    }
    $custo = (int) $produto['pontos_custo'];

    /* Verificar saldo do cliente */
    $colsCli   = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
    $colPontos = in_array('pontos_saldo', $colsCli) ? 'pontos_saldo'
               : (in_array('pontos', $colsCli) ? 'pontos' : null);

    if (!$colPontos) {
        $conn->rollBack();
        echo json_encode(['ok' => false, 'msg' => 'Sistema de pontos indisponível.']);
        exit;
    }

    $stmtC = $conn->prepare("
        SELECT id, nome, {$colPontos} AS saldo
        FROM clientes WHERE id = ? AND loja_id = ? LIMIT 1
    ");
    $stmtC->execute([$clienteId, $lojaId]);
    $cliente = $stmtC->fetch(PDO::FETCH_ASSOC);

    if (!$cliente) {
        $conn->rollBack();
        echo json_encode(['ok' => false, 'msg' => 'Cliente não encontrado.']);
        exit;
    }

    $saldo = (int) $cliente['saldo'];
    if ($saldo < $custo) {
        $conn->rollBack();
        echo json_encode(['ok' => false, 'msg' => "Pontos insuficientes. Você tem {$saldo} pts e precisa de {$custo} pts."]);
        exit;
    }

    /* Debitar pontos */
    $novoSaldo = $saldo - $custo;
    $conn->prepare("UPDATE clientes SET {$colPontos} = ? WHERE id = ? AND loja_id = ?")
         ->execute([$novoSaldo, $clienteId, $lojaId]);

    /* Registrar movimentação */
    try {
        $conn->prepare("
            INSERT INTO pontos_movimentacoes
                (cliente_id, tipo, pontos, saldo_antes, saldo_depois, loja_id, criado_em)
            VALUES (?, 'resgate', ?, ?, ?, ?, NOW())
        ")->execute([$clienteId, -$custo, $saldo, $novoSaldo, $lojaId]);
    } catch (Exception $e) { /* silencia se tabela não existir */ }

    $conn->commit();

    echo json_encode([
        'ok'           => true,
        'msg'          => "Resgate realizado! {$produto['nome']} adicionado ao carrinho.",
        'produto'      => [
            'id'    => $produtoId,
            'nome'  => $produto['nome'],
            'preco' => (float) $produto['preco'],
        ],
        'custo'        => $custo,
        'saldo_antes'  => $saldo,
        'saldo_novo'   => $novoSaldo,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    try { $conn->rollBack(); } catch (Exception $ex) {}
    echo json_encode(['ok' => false, 'msg' => 'Erro ao processar resgate.']);
}
