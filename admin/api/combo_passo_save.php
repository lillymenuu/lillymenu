<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId        = (int)($_SESSION['loja_id'] ?? 1);
$passoId       = (int)($_POST['passo_id'] ?? 0);
$comboId       = (int)($_POST['combo_id'] ?? 0);
$nome          = trim($_POST['nome'] ?? '');
$descricao     = trim($_POST['descricao'] ?? '');
$obrigatorio   = (int)($_POST['obrigatorio'] ?? 1);
$minItens      = max(0, (int)($_POST['min_itens'] ?? 1));
$maxItens      = max(1, (int)($_POST['max_itens'] ?? 1));
$permiteRepetir = (int)($_POST['permite_repetir'] ?? 0);
$produtosRaw   = trim($_POST['produto_ids'] ?? '');
$produtoIds    = $produtosRaw !== ''
    ? array_values(array_unique(array_filter(array_map('intval', explode(',', $produtosRaw)))))
    : [];

if ($comboId <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'combo_id inválido']);
    exit;
}
if ($nome === '') {
    echo json_encode(['ok' => false, 'msg' => 'Informe o nome do passo.']);
    exit;
}
if (empty($produtoIds)) {
    echo json_encode(['ok' => false, 'msg' => 'Adicione pelo menos uma opção ao passo.']);
    exit;
}

$stmtVerify = $conn->prepare("SELECT id FROM combos WHERE id = ? AND loja_id = ?");
$stmtVerify->execute([$comboId, $lojaId]);
if (!$stmtVerify->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Combo não encontrado.']);
    exit;
}

try {
    if ($passoId > 0) {
        $conn->prepare("
            UPDATE combo_passos
            SET nome = ?, descricao = ?, obrigatorio = ?, min_itens = ?, max_itens = ?, permite_repetir = ?
            WHERE id = ? AND combo_id = ? AND loja_id = ?
        ")->execute([
            $nome, $descricao !== '' ? $descricao : null,
            $obrigatorio, $minItens, $maxItens, $permiteRepetir,
            $passoId, $comboId, $lojaId,
        ]);
    } else {
        $conn->prepare("
            INSERT INTO combo_passos
              (combo_id, loja_id, nome, descricao, obrigatorio, min_itens, max_itens, permite_repetir, criado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ")->execute([
            $comboId, $lojaId,
            $nome, $descricao !== '' ? $descricao : null,
            $obrigatorio, $minItens, $maxItens, $permiteRepetir,
        ]);
        $passoId = (int)$conn->lastInsertId();
    }

    $conn->prepare("DELETE FROM combo_passo_opcoes WHERE passo_id = ? AND loja_id = ?")->execute([$passoId, $lojaId]);
    if ($produtoIds) {
        $stmtOpc = $conn->prepare("
            INSERT INTO combo_passo_opcoes (passo_id, combo_id, loja_id, produto_id)
            VALUES (?, ?, ?, ?)
        ");
        foreach ($produtoIds as $pid) {
            $stmtOpc->execute([$passoId, $comboId, $lojaId, (int)$pid]);
        }
    }

    echo json_encode(['ok' => true, 'passo_id' => $passoId], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar passo: ' . $e->getMessage()]);
}
