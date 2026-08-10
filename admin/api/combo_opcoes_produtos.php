<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId     = (int)($_SESSION['loja_id'] ?? 1);
$search     = trim($_GET['search'] ?? '');
$categoriaId = (int)($_GET['categoria_id'] ?? 0);

try {
    $stmtCats = $conn->prepare("
        SELECT id, nome FROM categorias
        WHERE loja_id = ? AND ativo = 1
        ORDER BY ordem IS NULL, ordem, nome
    ");
    $stmtCats->execute([$lojaId]);
    $categorias = $stmtCats->fetchAll(PDO::FETCH_ASSOC);

    $cols = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
    $temImagem = in_array('imagem', $cols, true);
    $imagemSel = $temImagem ? 'p.imagem' : "NULL AS imagem";

    $where  = ['p.loja_id = ?', 'p.ativo = 1'];
    $params = [$lojaId];

    if ($search !== '') {
        $where[] = 'p.nome LIKE ?';
        $params[] = '%' . $search . '%';
    }
    if ($categoriaId > 0) {
        $where[]  = 'p.categoria_id = ?';
        $params[] = $categoriaId;
    }

    $stmt = $conn->prepare("
        SELECT p.id, p.nome, p.preco, $imagemSel, p.categoria_id, c.nome AS categoria
        FROM produtos p
        LEFT JOIN categorias c ON c.id = p.categoria_id AND c.loja_id = p.loja_id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.nome
        LIMIT 300
    ");
    $stmt->execute($params);
    $produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(
        ['ok' => true, 'produtos' => $produtos, 'categorias' => $categorias],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}
