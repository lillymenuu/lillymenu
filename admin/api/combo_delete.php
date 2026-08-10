<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId  = (int)($_SESSION['loja_id'] ?? 1);
$comboId = (int)($_POST['combo_id'] ?? 0);

if ($comboId <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'ID inválido']);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT id, imagem FROM combos WHERE id = ? AND loja_id = ?");
    $stmt->execute([$comboId, $lojaId]);
    $combo = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$combo) {
        echo json_encode(['ok' => false, 'msg' => 'Combo não encontrado']);
        exit;
    }

    $stmtPassos = $conn->prepare("SELECT id FROM combo_passos WHERE combo_id = ? AND loja_id = ?");
    $stmtPassos->execute([$comboId, $lojaId]);
    $passoIds = $stmtPassos->fetchAll(PDO::FETCH_COLUMN);
    if ($passoIds) {
        $ph = implode(',', array_fill(0, count($passoIds), '?'));
        $params = array_merge($passoIds, [$lojaId]);
        $conn->prepare("DELETE FROM combo_passo_opcoes WHERE passo_id IN ($ph) AND loja_id = ?")->execute($params);
    }
    $conn->prepare("DELETE FROM combo_passos WHERE combo_id = ? AND loja_id = ?")->execute([$comboId, $lojaId]);
    $conn->prepare("DELETE FROM combos WHERE id = ? AND loja_id = ?")->execute([$comboId, $lojaId]);

    if (!empty($combo['imagem'])) {
        $baseDir = realpath(__DIR__ . '/../assets/uploads/combos');
        $arquivo = realpath(__DIR__ . '/../' . $combo['imagem']);
        if ($baseDir && $arquivo && strpos($arquivo, $baseDir) === 0 && is_file($arquivo)) {
            unlink($arquivo);
        }
    }

    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro ao deletar combo']);
}
