<?php
/*
 * Versao JSON de admin/api/pagamento_comprovante_upload.php para o novo
 * frontend Next.js (/plan-details), trocando sessao por token Bearer e
 * multipart+redirect por corpo JSON (base64) + resposta JSON — mesmo padrao
 * de admin/api/v1/promo_salvar.php pra upload de imagem.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/gerenciamento_module.php';
require_once __DIR__ . '/../../helpers/whats_send.php';
require_once __DIR__ . '/../../../helpers/storage.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

gerenciamentoEnsureModule($conn);

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$comprovanteBase64 = trim((string) ($dados['comprovante_base64'] ?? ''));
$comprovanteExt = strtolower(trim((string) ($dados['comprovante_ext'] ?? '')));

if ($comprovanteBase64 === '') {
  echo json_encode(['ok' => false, 'msg' => 'Selecione um arquivo.']);
  exit;
}

$stmt = $conn->prepare("SELECT id FROM assinaturas WHERE loja_id = ? ORDER BY id DESC LIMIT 1");
$stmt->execute([$lojaId]);
$assinaturaId = (int) $stmt->fetchColumn();

$cobrancaId = 0;
if ($assinaturaId > 0) {
  $stmt = $conn->prepare("SELECT id FROM cobrancas WHERE assinatura_id = ? AND status IN ('pendente','atrasado') ORDER BY id DESC LIMIT 1");
  $stmt->execute([$assinaturaId]);
  $cobrancaId = (int) $stmt->fetchColumn();
}

if ($cobrancaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Nenhuma cobranca pendente encontrada.']);
  exit;
}

$extensoesPermitidas = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
if (!in_array($comprovanteExt, $extensoesPermitidas, true)) {
  echo json_encode(['ok' => false, 'msg' => 'Arquivo invalido (use JPG, PNG, WebP ou PDF).']);
  exit;
}

$dadosArquivo = base64_decode($comprovanteBase64, true);
if ($dadosArquivo === false || $dadosArquivo === '') {
  echo json_encode(['ok' => false, 'msg' => 'Arquivo invalido.']);
  exit;
}
if (strlen($dadosArquivo) > 5242880) {
  echo json_encode(['ok' => false, 'msg' => 'Arquivo muito grande (maximo 5MB).']);
  exit;
}

$dirRel = storage_dir_relativa('comprovantes', null);
$dirAbs = storage_dir_absoluta('comprovantes', null);
if (!is_dir($dirAbs)) {
  @mkdir($dirAbs, 0775, true);
}
$nomeArquivo = 'comprovante_' . $lojaId . '_' . $cobrancaId . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $comprovanteExt;
$publicPath = null;

if (function_exists('storage_r2_configurado') && storage_r2_configurado()) {
  $chaveRel = $dirRel . '/' . $nomeArquivo;
  if (storage_r2_put($chaveRel, $dadosArquivo, storage_r2_content_type($comprovanteExt))) {
    $publicPath = storage_r2_url($chaveRel);
  }
} elseif (file_put_contents($dirAbs . '/' . $nomeArquivo, $dadosArquivo) !== false) {
  $publicPath = $dirRel . '/' . $nomeArquivo;
}

if ($publicPath === null) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar o arquivo.']);
  exit;
}

$stmt = $conn->prepare("UPDATE cobrancas SET comprovante_arquivo = ?, comprovante_enviado_em = NOW(), motivo_rejeicao = NULL WHERE id = ?");
$stmt->execute([$publicPath, $cobrancaId]);

$stmt = $conn->prepare("SELECT nome FROM lojas WHERE id = ? LIMIT 1");
$stmt->execute([$lojaId]);
$lojaNome = (string) $stmt->fetchColumn();

$stmt = $conn->prepare("SELECT valor FROM configuracoes WHERE loja_id = 0 AND chave = 'saas_whatsapp_numero' LIMIT 1");
$stmt->execute();
$numeroSuporte = (string) ($stmt->fetchColumn() ?: '5585985049577');

whatsEnviarMensagem($conn, 0, $numeroSuporte, "A loja \"{$lojaNome}\" enviou um comprovante de pagamento. Acesse Gerenciamento para revisar.");

echo json_encode(['ok' => true]);
