<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
header('Content-Type: application/json');

$lojaId  = (int)($_SESSION['loja_id'] ?? 1);
$comboId = (int)($_POST['combo_id'] ?? 0);
$idsRaw  = trim($_POST['passo_ids'] ?? '');
$ids     = array_values(array_filter(array_map('intval', explode(',', $idsRaw))));

if ($comboId <= 0 || empty($ids)) {
    echo json_encode(['ok' => false, 'msg' => 'Dados inválidos.']);
    exit;
}

try {
    $stmt = $conn->prepare(
        "UPDATE combo_passos SET ordem = ? WHERE id = ? AND combo_id = ? AND loja_id = ?"
    );
    foreach ($ids as $i => $pid) {
        $stmt->execute([$i + 1, $pid, $comboId, $lojaId]);
    }
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}
