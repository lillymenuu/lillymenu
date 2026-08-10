<?php
session_start();
date_default_timezone_set('America/Fortaleza');
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';

$lojaId = definirLojaIdSessao($conn);
$tel    = preg_replace('/\D+/', '', trim($_GET['tel'] ?? ''));

if (strlen($tel) < 10) {
    echo json_encode(['ok' => false, 'msg' => 'Telefone inválido.']); exit;
}

try {
    /* Busca cliente */
    $colsCli   = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
    $colPontos    = in_array('pontos_saldo', $colsCli)    ? 'pontos_saldo'
                  : (in_array('pontos', $colsCli)         ? 'pontos' : null);
    $selPontos    = $colPontos ? ", c.{$colPontos} AS pontos_saldo" : ', 0 AS pontos_saldo';
    $selCashback  = in_array('cashback_saldo', $colsCli) ? ', c.cashback_saldo' : ', 0 AS cashback_saldo';

    /* remove máscara no banco para comparar com dígitos puros */
    $telStrip = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.telefone,'(',''),')',''),' ',''),'-',''),'+','')";

    /* verifica quais colunas de endereço existem */
    $temRua = in_array('rua', $colsCli);
    $selEnd = $temRua
        ? ', c.rua, c.numero, c.bairro, c.cidade, c.estado, c.cep, c.complemento'
        : ", '' AS rua, '' AS numero, '' AS bairro, '' AS cidade, '' AS estado, '' AS cep, '' AS complemento";

    $stmtC = $conn->prepare("
        SELECT c.id, c.nome, c.telefone {$selPontos} {$selCashback} {$selEnd}
        FROM clientes c
        WHERE c.loja_id = ?
          AND (c.telefone = ? OR ({$telStrip}) = ?)
        LIMIT 1
    ");
    $stmtC->execute([$lojaId, $tel, $tel]);
    $cliente = $stmtC->fetch(PDO::FETCH_ASSOC);

    if (!$cliente) {
        echo json_encode(['ok' => false, 'msg' => 'Número não encontrado. Certifique-se de usar o mesmo telefone do pedido.']);
        exit;
    }

    /* Busca últimos 20 pedidos do cliente */
    $colsPed   = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
    $selTipo   = in_array('tipo', $colsPed) ? ', p.tipo' : ", 'retirada' AS tipo";
    $selEnd    = in_array('endereco_entrega', $colsPed) ? ', p.endereco_entrega' : ", '' AS endereco_entrega";
    $selSub    = in_array('subtotal', $colsPed)   ? ', p.subtotal'   : ', NULL AS subtotal';
    $selCodigo = in_array('codigo', $colsPed)     ? ', p.codigo'     : ', p.id AS codigo';

    $stmtP = $conn->prepare("
        SELECT p.id, p.status, p.total, p.taxa_entrega, p.forma_pagamento, p.criado_em
               {$selTipo} {$selEnd} {$selSub} {$selCodigo}
        FROM pedidos p
        WHERE p.cliente_id = ? AND p.loja_id = ?
        ORDER BY p.criado_em DESC
        LIMIT 20
    ");
    $stmtP->execute([$cliente['id'], $lojaId]);
    $pedidos = $stmtP->fetchAll(PDO::FETCH_ASSOC);

    /* Itens de cada pedido */
    $pedidosComItens = [];
    foreach ($pedidos as $ped) {
        $stmtI = $conn->prepare("
            SELECT produto_nome, quantidade, preco, IFNULL(observacoes,'') AS observacoes
            FROM pedido_itens WHERE pedido_id = ? AND loja_id = ?
        ");
        $stmtI->execute([$ped['id'], $lojaId]);
        $itens = $stmtI->fetchAll(PDO::FETCH_ASSOC);
        $pedidosComItens[] = array_merge($ped, ['itens' => $itens]);
    }

    echo json_encode([
        'ok'      => true,
        'cliente' => [
            'id'          => (int) $cliente['id'],
            'nome'        => $cliente['nome'],
            'telefone'    => $cliente['telefone'],
            'saldo'         => (int)   ($cliente['pontos_saldo']   ?? 0),
            'cashback_saldo'=> (float) ($cliente['cashback_saldo'] ?? 0),
            'rua'         => $cliente['rua']         ?? '',
            'numero'      => $cliente['numero']      ?? '',
            'bairro'      => $cliente['bairro']      ?? '',
            'cidade'      => $cliente['cidade']      ?? '',
            'estado'      => $cliente['estado']      ?? '',
            'cep'         => $cliente['cep']         ?? '',
            'complemento' => $cliente['complemento'] ?? '',
        ],
        'pedidos' => $pedidosComItens,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro interno.']);
}
