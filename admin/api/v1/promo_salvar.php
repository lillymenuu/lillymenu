<?php
/*
 * Versao JSON de admin/api/promo_salvar.php para o novo frontend Next.js
 * (/promotion). Corpo JSON (em vez de FormData) seguindo o mesmo padrao
 * de admin/api/v1/produtos.php, trocando sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';
require_once __DIR__ . '/../../../helpers/storage.php';

date_default_timezone_set('America/Fortaleza');

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['loja_id']  = $lojaId;

define('PROMO_SALVAR_LIMITE_PROMOS_ATIVAS', 6);

$dados = json_decode(file_get_contents('php://input'), true) ?: [];

$produtoId = (int) ($dados['produto_id'] ?? 0);
$ativar = !empty($dados['ativar']) ? 1 : 0;
$precoPromoRaw = trim((string) ($dados['preco_promocional'] ?? ''));
$promoDiasRaw = trim((string) ($dados['promo_dias'] ?? ''));
$promoDescricao = trim((string) ($dados['promo_descricao'] ?? ''));
$promoImagemBase64 = trim((string) ($dados['promo_imagem_base64'] ?? ''));
$promoImagemRemover = !empty($dados['promo_imagem_remover']);
$promoEtiquetaRaw = trim((string) ($dados['promo_etiqueta'] ?? ''));
$promoEtiquetasValidas = ['recomendado', 'mais_pedido', 'novidade', 'edicao_limitada'];
$promoEtiqueta = in_array($promoEtiquetaRaw, $promoEtiquetasValidas, true) ? $promoEtiquetaRaw : null;

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

function promoSalvarImagem(string $base64, ?int $lojaId = null): ?string {
  return storage_save_base64($base64, 'promo', 'promo', $lojaId);
}

function promoRemoverImagem(?string $relPath): void {
  storage_delete($relPath);
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
if (!in_array('promo_etiqueta', $colunas, true)) {
  try { $conn->exec("ALTER TABLE produtos ADD COLUMN promo_etiqueta VARCHAR(30) NULL DEFAULT NULL"); } catch (Throwable $e) {}
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

  /* ate PROMO_SALVAR_LIMITE_PROMOS_ATIVAS promocoes ativas ao mesmo tempo na
   * loja. Ao ativar uma nova (que ainda nao estava ativa), recusa se o
   * limite ja foi atingido em vez de desativar as outras silenciosamente. */
  if ($ativar && !$estavaAtiva) {
    $stmtCont = $conn->prepare("
      SELECT COUNT(*) FROM produtos
      WHERE loja_id = ? AND id != ? AND promo_desativado = 0
    ");
    $stmtCont->execute([$lojaId, $produtoId]);
    if ((int) $stmtCont->fetchColumn() >= PROMO_SALVAR_LIMITE_PROMOS_ATIVAS) {
      $conn->rollBack();
      echo json_encode(['ok' => false, 'msg' => 'Você já tem ' . PROMO_SALVAR_LIMITE_PROMOS_ATIVAS . ' produtos em promoção. Desative um para ativar este.']);
      exit;
    }
  }

  $novaImagem = null;
  if ($promoImagemRemover) {
    promoRemoverImagem($atual['promo_imagem'] ?? null);
  } elseif ($promoImagemBase64 !== '') {
    $novaImagem = promoSalvarImagem($promoImagemBase64, $lojaId);
    if ($novaImagem === null) {
      $conn->rollBack();
      echo json_encode(['ok' => false, 'msg' => 'Imagem invalida (use JPG, PNG ou WebP).']);
      exit;
    }
    if (!empty($atual['promo_imagem'])) {
      promoRemoverImagem($atual['promo_imagem']);
    }
  }

  $sets = ['preco_promocional = ?', 'promo_desativado = ?', 'promo_dias = ?', 'promo_descricao = ?', 'promo_etiqueta = ?'];
  $params = [$precoPromocional, $ativar ? 0 : 1, $promoDias, $promoDescricao, $promoEtiqueta];

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
