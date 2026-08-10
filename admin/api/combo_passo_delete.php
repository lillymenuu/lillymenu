<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId  = (int)($_SESSION['loja_id'] ?? 1);
$passoId = (int)($_POST['passo_id'] ?? 0);

if ($passoId <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'ID inválido']);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT id FROM combo_passos WHERE id = ? AND loja_id = ?");
    $stmt->execute([$passoId, $lojaId]);
    if (!$stmt->fetchColumn()) {
        echo json_encode(['ok' => false, 'msg' => 'Passo não encontrado']);
        exit;
    }
    $conn->prepare("DELETE FROM combo_passo_opcoes WHERE passo_id = ? AND loja_id = ?")->execute([$passoId, $lojaId]);
    $conn->prepare("DELETE FROM combo_passos WHERE id = ? AND loja_id = ?")->execute([$passoId, $lojaId]);
    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro ao deletar passo']);
}
