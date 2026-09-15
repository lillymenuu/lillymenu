<?php
/*
 * Versao Bearer-token de admin/api/whats_api.php?action=enviar — envia
 * uma mensagem de texto via Evolution API (config por loja, com fallback
 * global loja_id=0) e sempre grava local, mesmo se o envio falhar
 * (whats_msg_id fica NULL = falha visivel no bubble).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$conversaId = (int) ($dados['conversa_id'] ?? 0);
$texto      = trim((string) ($dados['mensagem'] ?? ''));

if (!$texto) {
  echo json_encode(['ok' => false, 'msg' => 'Mensagem vazia.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("SELECT id, numero FROM whats_conversas WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$conversaId, $lojaId]);
$conversa = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$conversa) {
  echo json_encode(['ok' => false, 'msg' => 'Conversa não encontrada.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$numero = $conversa['numero'];
if (strlen($numero) <= 11) $numero = '55' . $numero;

$cfgGet = function (string $chave) use ($conn, $lojaId): string {
  $stmt = $conn->prepare("SELECT valor FROM configuracoes WHERE loja_id = ? AND chave = ? LIMIT 1");
  $stmt->execute([$lojaId, $chave]);
  $val = $stmt->fetchColumn();
  if ($val === false || $val === '') {
    $stmt->execute([0, $chave]);
    $val = $stmt->fetchColumn();
  }
  return (string) ($val ?: '');
};

$evolutionUrl   = $cfgGet('evolution_url');
$evolutionToken = $cfgGet('evolution_token');
$evolutionInst  = $cfgGet('evolution_instance');

$whatsId   = null;
$enviado   = false;
$erroEnvio = null;

if ($evolutionUrl && $evolutionToken && $evolutionInst) {
  $ch = curl_init(rtrim($evolutionUrl, '/') . '/message/sendText/' . $evolutionInst);
  curl_setopt_array($ch, [
    CURLOPT_POST            => true,
    CURLOPT_RETURNTRANSFER  => true,
    CURLOPT_TIMEOUT         => 10,
    CURLOPT_SSL_VERIFYPEER  => false,
    CURLOPT_HTTPHEADER      => ['Content-Type: application/json', 'apikey: ' . $evolutionToken],
    CURLOPT_POSTFIELDS      => json_encode(['number' => $numero, 'text' => $texto]),
  ]);
  $resp     = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlErro = curl_error($ch);
  curl_close($ch);

  if ($curlErro) {
    $erroEnvio = 'Erro de conexão com a Evolution API: ' . $curlErro;
  } elseif ($httpCode >= 200 && $httpCode < 300) {
    $enviado  = true;
    $respData = json_decode($resp, true);
    $whatsId  = $respData['key']['id'] ?? null;
  } else {
    $respData    = json_decode($resp, true);
    $motivoBruto = $respData['message'] ?? $respData['error'] ?? $resp;
    $motivo      = is_string($motivoBruto) ? $motivoBruto : json_encode($motivoBruto);
    $erroEnvio   = 'Evolution API retornou HTTP ' . $httpCode . ': ' . $motivo;
  }
} else {
  $erroEnvio = 'WhatsApp não configurado para esta loja.';
}

$stmt = $conn->prepare("
  INSERT INTO whats_mensagens (conversa_id, loja_id, direcao, mensagem, whats_msg_id)
  VALUES (?, ?, 'saida', ?, ?)
");
$stmt->execute([$conversaId, $lojaId, $texto, $whatsId]);
$newId = (int) $conn->lastInsertId();

$conn->prepare("UPDATE whats_conversas SET ultimo_msg = ?, ultimo_msg_em = NOW() WHERE id = ?")
     ->execute([mb_substr($texto, 0, 200), $conversaId]);

echo json_encode([
  'ok'       => true,
  'enviado'  => $enviado,
  'erro'     => $enviado ? null : $erroEnvio,
  'id'       => $newId,
  'hora'     => date('H:i'),
  'data_fmt' => date('d/m/Y'),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
