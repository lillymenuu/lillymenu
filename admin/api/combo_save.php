<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int)($_SESSION['loja_id'] ?? 1);

function ensureComboTables(PDO $conn): void {
    $conn->exec("
        CREATE TABLE IF NOT EXISTS combos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            loja_id INT NOT NULL,
            categoria_id INT DEFAULT NULL,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            imagem VARCHAR(500),
            tipo_preco ENUM('por_combo','por_item') NOT NULL DEFAULT 'por_combo',
            preco DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            preco_promocional DECIMAL(10,2) DEFAULT NULL,
            promo_desativado TINYINT(1) NOT NULL DEFAULT 0,
            ativo TINYINT(1) NOT NULL DEFAULT 1,
            ordem INT DEFAULT NULL,
            criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_combos_loja (loja_id),
            INDEX idx_combos_categoria (categoria_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $conn->exec("
        CREATE TABLE IF NOT EXISTS combo_passos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            combo_id INT NOT NULL,
            loja_id INT NOT NULL,
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            obrigatorio TINYINT(1) NOT NULL DEFAULT 1,
            min_itens INT NOT NULL DEFAULT 1,
            max_itens INT NOT NULL DEFAULT 1,
            permite_repetir TINYINT(1) NOT NULL DEFAULT 0,
            ordem INT DEFAULT NULL,
            criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cp_combo (combo_id),
            INDEX idx_cp_loja (loja_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $conn->exec("
        CREATE TABLE IF NOT EXISTS combo_passo_opcoes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            passo_id INT NOT NULL,
            combo_id INT NOT NULL,
            loja_id INT NOT NULL,
            produto_id INT NOT NULL,
            preco_adicional DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            ativo TINYINT(1) NOT NULL DEFAULT 1,
            ordem INT DEFAULT NULL,
            INDEX idx_cpo_passo (passo_id),
            INDEX idx_cpo_combo (combo_id),
            INDEX idx_cpo_loja (loja_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

try {
    ensureComboTables($conn);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro ao criar tabelas: ' . $e->getMessage()]);
    exit;
}

$id           = (int)($_POST['id'] ?? 0);
$categoriaId  = ($_POST['categoria_id'] ?? '') !== '' ? (int)$_POST['categoria_id'] : null;
$nome         = trim($_POST['nome'] ?? '');
$descricao    = trim($_POST['descricao'] ?? '');
$tipoPreco    = in_array($_POST['tipo_preco'] ?? '', ['por_combo', 'por_item'], true)
                ? $_POST['tipo_preco'] : 'por_combo';
$preco        = max(0.0, (float)trim($_POST['preco'] ?? '0'));
$precoPromoRaw = trim($_POST['preco_promocional'] ?? '');
$precoPromo   = $precoPromoRaw !== '' ? max(0.0, (float)$precoPromoRaw) : null;
$promoDesativado = (int)($_POST['promo_desativado'] ?? 0);
$imagemBase64  = trim($_POST['imagem_base64'] ?? '');
$imagemRemover = ($_POST['imagem_remover'] ?? '0') === '1';
$ativo         = (int)($_POST['ativo'] ?? 1);

if ($nome === '') {
    echo json_encode(['ok' => false, 'msg' => 'Informe o nome do combo.']);
    exit;
}

$imagemPath = null;
$imagemExistente = null;
if ($id > 0) {
    $stmtImg = $conn->prepare("SELECT imagem FROM combos WHERE id = ? AND loja_id = ?");
    $stmtImg->execute([$id, $lojaId]);
    $imagemExistente = $stmtImg->fetchColumn() ?: null;
    $imagemPath = $imagemExistente;
}

if ($imagemRemover && $imagemExistente) {
    $baseDir = realpath(__DIR__ . '/../assets/uploads/combos');
    $arquivo = realpath(__DIR__ . '/../' . $imagemExistente);
    if ($baseDir && $arquivo && strpos($arquivo, $baseDir) === 0 && is_file($arquivo)) {
        unlink($arquivo);
    }
    $imagemPath = null;
} elseif ($imagemBase64 !== '') {
    if (preg_match('/^data:image\/(png|jpe?g|webp);base64,/', $imagemBase64, $match)) {
        $dados = base64_decode(substr($imagemBase64, strpos($imagemBase64, ',') + 1));
        if ($dados !== false) {
            $ext    = $match[1] === 'jpeg' ? 'jpg' : $match[1];
            $dirRel = 'assets/uploads/combos';
            $dirAbs = __DIR__ . '/../' . $dirRel;
            if (!is_dir($dirAbs)) {
                mkdir($dirAbs, 0775, true);
            }
            $nomeArq = 'combo_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
            $destino = $dirAbs . '/' . $nomeArq;
            if (file_put_contents($destino, $dados) !== false) {
                $imagemPath = $dirRel . '/' . $nomeArq;
                if ($imagemExistente) {
                    $baseDir = realpath(__DIR__ . '/../assets/uploads/combos');
                    $arquivo = realpath(__DIR__ . '/../' . $imagemExistente);
                    if ($baseDir && $arquivo && strpos($arquivo, $baseDir) === 0 && is_file($arquivo)) {
                        unlink($arquivo);
                    }
                }
            }
        }
    }
} // end elseif imagem_base64

try {
    if ($id > 0) {
        $sets = ['nome = ?', 'descricao = ?', 'tipo_preco = ?', 'preco = ?',
                 'preco_promocional = ?', 'promo_desativado = ?', 'categoria_id = ?', 'ativo = ?'];
        $vals = [$nome, $descricao !== '' ? $descricao : null, $tipoPreco, $preco,
                 $precoPromo, $promoDesativado, $categoriaId, $ativo];
        if ($imagemPath !== $imagemExistente) {
            $sets[] = 'imagem = ?';
            $vals[] = $imagemPath;
        }
        $vals[] = $id;
        $vals[] = $lojaId;
        $conn->prepare(
            "UPDATE combos SET " . implode(', ', $sets) . " WHERE id = ? AND loja_id = ?"
        )->execute($vals);
    } else {
        $conn->prepare("
            INSERT INTO combos
              (loja_id, categoria_id, nome, descricao, imagem, tipo_preco, preco, preco_promocional, promo_desativado, ativo, criado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
        ")->execute([
            $lojaId, $categoriaId,
            $nome, $descricao !== '' ? $descricao : null,
            $imagemPath, $tipoPreco, $preco, $precoPromo, $promoDesativado,
        ]);
        $id = (int)$conn->lastInsertId();
    }

    echo json_encode(['ok' => true, 'combo_id' => $id], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar combo: ' . $e->getMessage()]);
}
