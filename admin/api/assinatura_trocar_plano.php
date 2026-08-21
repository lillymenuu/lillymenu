<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId = (int) ($_SESSION['loja_id'] ?? 0);
$planoId = (int) ($_POST['plano_id'] ?? 0);

if ($planoId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Selecione um plano.']);
  exit;
}

$stmt = $conn->prepare("SELECT id, nome FROM planos WHERE id = ? AND ativo = 1 AND landing_slug IS NOT NULL LIMIT 1");
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

  echo json_encode(['ok' => true, 'plano_nome' => $plano['nome']]);
} catch (Exception $e) {
  if ($conn->inTransaction()) {
    $conn->rollBack();
  }
  echo json_encode(['ok' => false, 'msg' => 'Erro ao trocar de plano.']);
}
