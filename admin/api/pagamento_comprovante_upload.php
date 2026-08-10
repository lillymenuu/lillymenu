<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/gerenciamento_module.php';
require_once __DIR__ . '/../helpers/whats_send.php';

gerenciamentoEnsureModule($conn);

$lojaId = (int) ($_SESSION['loja_id'] ?? 0);

if ($lojaId <= 0 || !isset($_FILES['comprovante']) || $_FILES['comprovante']['error'] !== UPLOAD_ERR_OK) {
  header('Location: ../pagamento.php?msg=erro');
  exit;
}

$tmp = $_FILES['comprovante']['tmp_name'];
$name = $_FILES['comprovante']['name'] ?? '';
$ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

if (!in_array($ext, $allowed, true) || filesize($tmp) > 5 * 1024 * 1024) {
  header('Location: ../pagamento.php?msg=erro');
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
  header('Location: ../pagamento.php?msg=erro');
  exit;
}

$dir = __DIR__ . '/../assets/uploads/comprovantes';
if (!is_dir($dir)) {
  @mkdir($dir, 0775, true);
}

$fileName = 'comprovante_' . $lojaId . '_' . $cobrancaId . '_' . date('Ymd_His') . '_' . random_int(100, 999) . '.' . $ext;
$dest = $dir . '/' . $fileName;

if (!move_uploaded_file($tmp, $dest)) {
  header('Location: ../pagamento.php?msg=erro');
  exit;
}

$publicPath = 'assets/uploads/comprovantes/' . $fileName;
$stmt = $conn->prepare("UPDATE cobrancas SET comprovante_arquivo = ?, comprovante_enviado_em = NOW(), motivo_rejeicao = NULL WHERE id = ?");
$stmt->execute([$publicPath, $cobrancaId]);

$stmt = $conn->prepare("SELECT nome FROM lojas WHERE id = ? LIMIT 1");
$stmt->execute([$lojaId]);
$lojaNome = (string) $stmt->fetchColumn();

$stmt = $conn->prepare("SELECT valor FROM configuracoes WHERE loja_id = 0 AND chave = 'saas_whatsapp_numero' LIMIT 1");
$stmt->execute();
$numeroSuporte = (string) ($stmt->fetchColumn() ?: '5585985049577');

whatsEnviarMensagem($conn, 0, $numeroSuporte, "A loja \"{$lojaNome}\" enviou um comprovante de pagamento. Acesse Gerenciamento para revisar.");

header('Location: ../pagamento.php?msg=enviado');
exit;
