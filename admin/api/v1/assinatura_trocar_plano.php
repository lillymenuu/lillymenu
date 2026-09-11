<?php
/*
 * Versao JSON de admin/api/assinatura_trocar_plano.php para o novo frontend
 * Next.js (/plan-details), trocando sessao por token Bearer e corpo
 * x-www-form-urlencoded por JSON.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados   = json_decode(file_get_contents('php://input'), true) ?: [];
$planoId = (int) ($dados['plano_id'] ?? 0);

if ($planoId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Selecione um plano.']);
  exit;
}

$stmt = $conn->prepare("SELECT id, nome, valor FROM planos WHERE id = ? AND ativo = 1 AND landing_slug IS NOT NULL LIMIT 1");
$stmt->execute([$planoId]);
$plano = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$plano) {
  echo json_encode(['ok' => false, 'msg' => 'Plano invalido.']);
  exit;
}

$stmt = $conn->prepare("SELECT id, plano_id FROM assinaturas WHERE loja_id = ? ORDER BY id DESC LIMIT 1");
$stmt->execute([$lojaId]);
$assinatura = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$assinatura) {
  echo json_encode(['ok' => false, 'msg' => 'Assinatura nao encontrada.']);
  exit;
}

if ((int) $assinatura['plano_id'] === $planoId) {
  echo json_encode(['ok' => false, 'msg' => 'Voce ja esta neste plano.']);
  exit;
}

// So permite upgrade por aqui (plano mais caro que o atual). Reduzir de
// plano precisa passar pelo suporte — mesma regra aplicada na tela (o
// endpoint assinatura_detalhe.php so lista planos com valor maior que o
// atual), checada de novo aqui pra nao depender so do que o front-end manda.
$stmt = $conn->prepare("SELECT valor FROM planos WHERE id = ? LIMIT 1");
$stmt->execute([(int) $assinatura['plano_id']]);
$valorAtual = (float) $stmt->fetchColumn();
if ((float) $plano['valor'] <= $valorAtual) {
  echo json_encode(['ok' => false, 'msg' => 'Para reduzir de plano, entre em contato com o suporte.']);
  exit;
}

$stmt = $conn->prepare("
  SELECT id FROM cobrancas
  WHERE assinatura_id = ? AND status IN ('pendente','atrasado')
  LIMIT 1
");
$stmt->execute([(int) $assinatura['id']]);
if ($stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Finalize o pagamento pendente antes de trocar de plano.']);
  exit;
}

try {
  $conn->beginTransaction();
  $conn->prepare("UPDATE assinaturas SET plano_id = ? WHERE id = ?")
    ->execute([$planoId, (int) $assinatura['id']]);
  $conn->prepare("UPDATE lojas SET plano_id = ? WHERE id = ?")
    ->execute([$planoId, $lojaId]);
  $conn->commit();

  registrarOperacao($conn, 'assinatura_trocou_plano', 'loja:' . $lojaId, [
    'plano_anterior_id' => (int) $assinatura['plano_id'],
    'plano_novo_id' => $planoId,
  ]);

  echo json_encode(['ok' => true, 'plano_nome' => $plano['nome']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
  if ($conn->inTransaction()) {
    $conn->rollBack();
  }
  echo json_encode(['ok' => false, 'msg' => 'Erro ao trocar de plano.']);
}
