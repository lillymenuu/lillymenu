<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';
require_once '../../helpers/storage.php';
require_once '../../admin/helpers/combo_estoque_module.php';

function fixImgPathUltimo(string $p): string {
    return $p !== '' ? storage_url_absoluta($p) : '';
}

$lojaId = definirLojaIdSessao($conn);
$tel    = preg_replace('/\D+/', '', trim($_GET['tel'] ?? ''));

if (strlen($tel) < 10) {
    echo json_encode(['ok' => true, 'pedido' => null, 'itens' => []]); exit;
}

try {
    $telStrip = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone,'(',''),')',''),' ',''),'-',''),'+','')";
    $stmtC = $conn->prepare("
        SELECT id FROM clientes
        WHERE loja_id = ? AND (telefone = ? OR ({$telStrip}) = ?)
        LIMIT 1
    ");
    $stmtC->execute([$lojaId, $tel, $tel]);
    $clienteId = (int) $stmtC->fetchColumn();

    if ($clienteId <= 0) {
        echo json_encode(['ok' => true, 'pedido' => null, 'itens' => []]); exit;
    }

    $stmtP = $conn->prepare("
        SELECT id, criado_em FROM pedidos
        WHERE cliente_id = ? AND loja_id = ?
        ORDER BY criado_em DESC
        LIMIT 1
    ");
    $stmtP->execute([$clienteId, $lojaId]);
    $pedido = $stmtP->fetch(PDO::FETCH_ASSOC);

    if (!$pedido) {
        echo json_encode(['ok' => true, 'pedido' => null, 'itens' => []]); exit;
    }

    comboEstoqueEnsureModule($conn);
    $pedidoId = (int) $pedido['id'];

    /* produto_id em pedido_itens so existe se a coluna ja tiver sido criada
       (ALTER TABLE defensivo em pedido_criar.php/garcom_pedido_criar.php) —
       pedidos anteriores a essa coluna existir so tem o nome salvo. */
    $itensCols   = $conn->query("SHOW COLUMNS FROM pedido_itens")->fetchAll(PDO::FETCH_COLUMN, 0);
    $temProdIdCol = in_array('produto_id', $itensCols, true);
    $selProdId    = $temProdIdCol ? ', produto_id' : ', NULL AS produto_id';

    $stmtI = $conn->prepare("
        SELECT id, produto_nome, quantidade {$selProdId}
        FROM pedido_itens
        WHERE pedido_id = ? AND loja_id = ?
    ");
    $stmtI->execute([$pedidoId, $lojaId]);
    $itensPedido = $stmtI->fetchAll(PDO::FETCH_ASSOC);

    /* Preços/promoções recalculados na hora — o que foi cobrado no pedido
       antigo pode estar desatualizado (produto repreçado, promoção encerrada). */
    $prodCols = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
    $temProm  = in_array('preco_promocional', $prodCols) && in_array('promo_desativado', $prodCols);
    $spProd   = $temProm ? ', p.preco_promocional, p.promo_desativado' : '';
    $stmtProd = $conn->prepare("
        SELECT p.id, p.nome, p.preco, p.ativo, p.imagem {$spProd}, IFNULL(e.quantidade,0) AS estoque
        FROM produtos p
        LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
        WHERE p.id = ? AND p.loja_id = ?
    ");
    /* Fallback para pedidos antigos sem produto_id salvo: religa pelo nome
       exato salvo na epoca — imperfeito (produto renomeado nao bate), mas e
       o unico dado disponivel nesses registros. */
    $stmtProdPorNome = $conn->prepare("
        SELECT p.id, p.nome, p.preco, p.ativo, p.imagem {$spProd}, IFNULL(e.quantidade,0) AS estoque
        FROM produtos p
        LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
        WHERE p.nome = ? AND p.loja_id = ? AND p.ativo = 1
        LIMIT 1
    ");

    $comboExiste = (bool) $conn->query("SHOW TABLES LIKE 'combos'")->fetchColumn();
    $comboCols   = $comboExiste ? $conn->query("SHOW COLUMNS FROM combos")->fetchAll(PDO::FETCH_COLUMN, 0) : [];
    $cbTemProm   = in_array('preco_promocional', $comboCols) && in_array('promo_desativado', $comboCols);
    $spCombo     = $cbTemProm ? ', preco_promocional, promo_desativado' : '';
    $stmtCombo   = $comboExiste ? $conn->prepare("
        SELECT id, nome, preco, ativo, imagem {$spCombo}
        FROM combos WHERE id = ? AND loja_id = ?
    ") : null;
    $stmtComboPorNome = $comboExiste ? $conn->prepare("
        SELECT id, nome, preco, ativo, imagem {$spCombo}
        FROM combos WHERE nome = ? AND loja_id = ? AND ativo = 1
        LIMIT 1
    ") : null;

    $stmtCompUsados = $conn->prepare("
        SELECT produto_id, quantidade FROM pedido_combo_itens
        WHERE pedido_item_id = ? AND loja_id = ?
    ");

    $precoAtual = function (array $row) {
        if (!empty($row['preco_promocional']) && !($row['promo_desativado'] ?? 1)) {
            return (float) $row['preco_promocional'];
        }
        return (float) $row['preco'];
    };

    $itensResultado = [];
    foreach ($itensPedido as $item) {
        $qtd = max(1, (int) $item['quantidade']);

        $stmtCompUsados->execute([(int) $item['id'], $lojaId]);
        $componentes = $stmtCompUsados->fetchAll(PDO::FETCH_ASSOC);

        if ($componentes) {
            /* Item de combo: id salvo em pedido_itens.produto_id e o id do combo. */
            if (!$stmtCombo) continue;
            $combo = null;
            if (!empty($item['produto_id'])) {
                $stmtCombo->execute([(int) $item['produto_id'], $lojaId]);
                $combo = $stmtCombo->fetch(PDO::FETCH_ASSOC);
            }
            if (!$combo && $stmtComboPorNome) {
                $stmtComboPorNome->execute([$item['produto_nome'], $lojaId]);
                $combo = $stmtComboPorNome->fetch(PDO::FETCH_ASSOC);
            }
            if (!$combo || (int) $combo['ativo'] !== 1) continue;

            $combosels = [];
            foreach ($componentes as $comp) {
                $stmtProd->execute([(int) $comp['produto_id'], $lojaId]);
                $prodComp = $stmtProd->fetch(PDO::FETCH_ASSOC);
                if (!$prodComp || (int) $prodComp['ativo'] !== 1) continue;
                $qtdUnit = max(1, (int) round(((int) $comp['quantidade']) / $qtd));
                $combosels[] = [
                    'id'   => (int) $prodComp['id'],
                    'nome' => $prodComp['nome'],
                    'qtd'  => $qtdUnit,
                ];
            }
            if (!$combosels) continue;

            $itensResultado[] = [
                'tipo'      => 'combo',
                'id'        => (int) $combo['id'],
                'nome'      => $combo['nome'],
                'preco'     => $precoAtual($combo),
                'imagem'    => fixImgPathUltimo($combo['imagem'] ?? ''),
                'qtd'       => $qtd,
                'combosels' => $combosels,
            ];
        } else {
            $prod = null;
            if (!empty($item['produto_id'])) {
                $stmtProd->execute([(int) $item['produto_id'], $lojaId]);
                $prod = $stmtProd->fetch(PDO::FETCH_ASSOC);
                if ($prod && (int) $prod['ativo'] !== 1) $prod = null;
            }
            if (!$prod) {
                $stmtProdPorNome->execute([$item['produto_nome'], $lojaId]);
                $prod = $stmtProdPorNome->fetch(PDO::FETCH_ASSOC);
            }
            if (!$prod) continue;
            $estoque = (int) $prod['estoque'];
            if ($estoque <= 0) continue;

            $itensResultado[] = [
                'tipo'    => 'simples',
                'id'      => (int) $prod['id'],
                'nome'    => $prod['nome'],
                'preco'   => $precoAtual($prod),
                'imagem'  => fixImgPathUltimo($prod['imagem'] ?? ''),
                'qtd'     => min($qtd, $estoque),
                'estoque' => $estoque,
            ];
        }
    }

    echo json_encode([
        'ok'     => true,
        'pedido' => $itensResultado ? ['id' => $pedidoId, 'criado_em' => $pedido['criado_em']] : null,
        'itens'  => $itensResultado,
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro interno.']);
}
