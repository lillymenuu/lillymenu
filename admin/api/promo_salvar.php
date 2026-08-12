<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/acesso_menu.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

if (!acessoMenuPermitido($conn, 'menu.promo')) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$produtoId = (int) ($_POST['produto_id'] ?? 0);
$ativar = isset($_POST['ativar']) ? (int) $_POST['ativar'] : 0;
$precoPromoRaw = trim((string) ($_POST['preco_promocional'] ?? ''));
$promoDiasRaw = trim((string) ($_POST['promo_dias'] ?? ''));
$promoDescricao = trim((string) ($_POST['promo_descricao'] ?? ''));
$promoImagemBase64 = trim((string) ($_POST['promo_imagem_base64'] ?? ''));
$promoImagemRemover = ($_POST['promo_imagem_remover'] ?? '0') === '1';

if ($produtoId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Produto invalido.']);
  exit;
}

$precoPromocional = $precoPromoRaw !== '' ? (float) str_replace(',', '.', $precoPromoRaw) : null;
$promoDias = $promoDiasRaw !== '' ? max(1, (int) $promoDiasRaw) : null;
$promoDescricao = $promoDescricao !== '' ? $promoDescricao : null;

if ($ativar && (!$precoPromocional || $precoPromocional <= 0)) {
  echo json_encode(['ok' => false, 'msg' => 'Informe um preco promocional valido.']);
  exit;
}

function salvarImagemPromo(string $base64): ?string {
  if (!preg_match('/^data:image\\/(png|jpe?g|webp);base64,/', $base64, $match)) {
    return null;
  }
  $dados = base64_decode(substr($base64, strpos($base64, ',') + 1));
  if ($dados === false) {
    return null;
  }
  $ext = $match[1] === 'jpeg' ? 'jpg' : $match[1];
  $dirRel = 'assets/uploads/promo';
  $dirAbs = __DIR__ . '/../' . $dirRel;
  if (!is_dir($dirAbs)) {
    mkdir($dirAbs, 0775, true);
  }
  $nome = 'promo_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
  $destino = $dirAbs . '/' . $nome;
  if (file_put_contents($destino, $dados) === false) {
    return null;
  }
  return $dirRel . '/' . $nome;
}

function removerImagemPromo(?string $relPath): void {
  if (!$relPath) {
    return;
  }
  $baseDir = realpath(__DIR__ . '/../assets/uploads/promo');
  $arquivo = realpath(__DIR__ . '/../' . $relPath);
  if ($baseDir && $arquivo && strpos($arquivo, $baseDir) === 0 && is_file($arquivo)) {
    unlink($arquivo);
  }
}

$colunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
if (!in_array('preco_promocional', $colunas, true)) {
  try { $conn->exec("ALTER TABLE produtos ADD COLUMN preco_promocional DECIMAL(10,2) NULL DEFAULT NULL"); } catch (Throwable $e) {}
}
if (!in_array('promo_desativado', $colunas, true)) {
  try { $conn->exec("ALTER TABLE produtos ADD COLUMN promo_desativado TINYINT(1) NOT NULL DEFAULT 1"); } catch (Throwable $e) {}
}
if (!in_array('promo_dias', $colunas, true)) {
  try { $conn->exec("ALTER TABLE produtos ADD COLUMN promo_dias INT NULL DEFAULT NULL"); } catch (Throwable $e) {}
}
if (!in_array('promo_inicio', $colunas, true)) {
  try { $conn->exec("ALTER TABLE produtos ADD COLUMN promo_inicio DATE NULL DEFAULT NULL"); } catch (Throwable $e) {}
}
if (!in_array('promo_imagem', $colunas, true)) {
  try { $conn->exec("ALTER TABLE produtos ADD COLUMN promo_imagem VARCHAR(255) NULL DEFAULT NULL"); } catch (Throwable $e) {}
}
if (!in_array('promo_descricao', $colunas, true)) {
  try { $conn->exec("ALTER TABLE produtos ADD COLUMN promo_descricao TEXT NULL DEFAULT NULL"); } catch (Throwable $e) {}
}

try {
  $conn->beginTransaction();

  $stmt = $conn->prepare("SELECT promo_desativado, promo_imagem FROM produtos WHERE id = ? AND loja_id = ? LIMIT 1 FOR UPDATE");
  $stmt->execute([$produtoId, $lojaId]);
  $atual = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$atual) {
    $conn->rollBack();
    echo json_encode(['ok' => false, 'msg' => 'Produto nao encontrado.']);
    exit;
  }
  $estavaAtiva = !((int) ($atual['promo_desativado'] ?? 1));

  $novaImagem = null;
  if ($promoImagemRemover) {
    removerImagemPromo($atual['promo_imagem'] ?? null);
  } elseif ($promoImagemBase64 !== '') {
    $novaImagem = salvarImagemPromo($promoImagemBase64);
    if ($novaImagem === null) {
      $conn->rollBack();
      echo json_encode(['ok' => false, 'msg' => 'Imagem invalida (use JPG, PNG ou WebP).']);
      exit;
    }
    if (!empty($atual['promo_imagem'])) {
      removerImagemPromo($atual['promo_imagem']);
    }
  }

  $sets = ['preco_promocional = ?', 'promo_desativado = ?', 'promo_dias = ?', 'promo_descricao = ?'];
  $params = [$precoPromocional, $ativar ? 0 : 1, $promoDias, $promoDescricao];

  if ($ativar && !$estavaAtiva) {
    $sets[] = 'promo_inicio = ?';
    $params[] = date('Y-m-d');
  }
  if ($promoImagemRemover) {
    $sets[] = 'promo_imagem = NULL';
  } elseif ($novaImagem !== null) {
    $sets[] = 'promo_imagem = ?';
    $params[] = $novaImagem;
  }

  $params[] = $produtoId;
  $params[] = $lojaId;

  $conn->prepare("UPDATE produtos SET " . implode(', ', $sets) . " WHERE id = ? AND loja_id = ?")->execute($params);

  $conn->commit();

  registrarOperacao($conn, $ativar ? 'promo_ativada' : 'promo_desativada', 'produto:' . $produtoId, [
    'preco_promocional' => $precoPromocional,
    'promo_dias' => $promoDias,
  ]);

  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  if ($conn->inTransaction()) {
    $conn->rollBack();
  }
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar promocao.']);
}
