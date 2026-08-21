<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/gerenciamento_module.php';
require_once __DIR__ . '/../helpers/whats_send.php';
require_once __DIR__ . '/../../helpers/storage.php';

gerenciamentoEnsureModule($conn);

$lojaId = (int) ($_SESSION['loja_id'] ?? 0);
// Permite chamar este endpoint tanto do gate de pagamento (admin/pagamento.php)
// quanto da tela de auto-atendimento (admin/plan-details.php) e voltar pra
// quem chamou — allow-list evita open redirect a partir do POST.
$retornosPermitidos = ['pagamento', 'plan-details'];
$retorno = in_array($_POST['retorno'] ?? '', $retornosPermitidos, true) ? $_POST['retorno'] : 'pagamento';

if ($lojaId <= 0 || !isset($_FILES['comprovante']) || $_FILES['comprovante']['error'] !== UPLOAD_ERR_OK) {
  header('Location: ../' . $retorno . '.php?msg=erro');
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
  header('Location: ../' . $retorno . '.php?msg=erro');
  exit;
}

try {
  $publicPath = storage_save_upload(
    $_FILES['comprovante'],
    'comprovantes',
    'comprovante_' . $lojaId . '_' . $cobrancaId,
    null,
    ['jpg', 'jpeg', 'png', 'webp', 'pdf']
  );
} catch (RuntimeException $e) {
  $publicPath = null;
}

if ($publicPath === null) {
  header('Location: ../' . $retorno . '.php?msg=erro');
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

header('Location: ../' . $retorno . '.php?msg=enviado');
exit;
