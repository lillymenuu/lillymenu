<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

$lojaId = (int)($_SESSION['loja_id'] ?? 0);
$id     = (int)($_POST['id'] ?? 0);

if ($id <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'ID inválido.']);
    exit;
}

try {
    // Verifica se a categoria pertence à loja
    $stmt = $conn->prepare("SELECT id FROM categorias WHERE id = ? AND loja_id = ?");
    $stmt->execute([$id, $lojaId]);
    if (!$stmt->fetchColumn()) {
        echo json_encode(['ok' => false, 'msg' => 'Categoria não encontrada.']);
        exit;
    }

    // Move produtos desta categoria para "sem categoria"
    $conn->prepare("UPDATE produtos SET categoria_id = NULL WHERE categoria_id = ? AND loja_id = ?")
         ->execute([$id, $lojaId]);

    // Exclui a categoria
    $conn->prepare("DELETE FROM categorias WHERE id = ? AND loja_id = ?")
         ->execute([$id, $lojaId]);

    bumpCatalogoVersao($conn, $lojaId);
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro ao excluir: ' . $e->getMessage()]);
}
