<?php
/*
 * Versao JSON (Bearer token) de admin/api/verificacao_enviar.php — porta 1:1.
 *
 * $lojaId explicito (4o parametro) em toda chamada config() — sem ele cai em
 * $_SESSION['loja_id'] ?? 1, que nunca e setado nesse endpoint (Bearer token,
 * sem sessao PHP), resolvendo sempre a loja errada.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/config.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$numero = preg_replace('/\D/', '', trim((string) ($body['whatsapp'] ?? '')));

if (strlen($numero) < 10 || strlen($numero) > 13) {
  echo json_encode(['ok'=>false,'msg'=>'Número inválido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}

$normalizar = fn($n) => ltrim(preg_replace('/\D/','',$n), '0');
$numeroNorm = substr($normalizar($numero), -11);

$cadastrado = config($conn, 'loja_contato', config($conn, 'whatsapp_numero', '', $lojaId), $lojaId);
$cadastradoNorm = substr($normalizar($cadastrado), -11);

if ($cadastradoNorm === '' || $numeroNorm !== $cadastradoNorm) {
  echo json_encode(['ok'=>false,'msg'=>'O número não corresponde ao cadastrado na loja.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}

$codigo  = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$expira  = date('Y-m-d H:i:s', time() + 240);

$upsert = "INSERT INTO configuracoes (loja_id, chave, valor) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE valor = VALUES(valor)";
$conn->prepare($upsert)->execute([$lojaId, 'verificacao_codigo',  $codigo]);
$conn->prepare($upsert)->execute([$lojaId, 'verificacao_expira',  $expira]);
$conn->prepare($upsert)->execute([$lojaId, 'verificacao_whatsapp', $numero]);

$destinatario = $numero;
if (strlen($destinatario) <= 11) $destinatario = '55' . $destinatario;
$mensagem = "Seu código de verificação de loja é: *{$codigo}*\n\nEste código expira em 4 minutos. Não compartilhe com ninguém.";

$enviado = false;

$cfgGet = function(string $chave) use ($conn, $lojaId): string {
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
if ($evolutionUrl && $evolutionToken && $evolutionInst) {
  try {
    $ch = curl_init(rtrim($evolutionUrl,'/') . '/message/sendText/' . $evolutionInst);
    curl_setopt_array($ch, [
      CURLOPT_POST => true,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 8,
      CURLOPT_HTTPHEADER => ['Content-Type: application/json','apikey: '.$evolutionToken],
      CURLOPT_POSTFIELDS => json_encode(['number'=>$destinatario,'textMessage'=>['text'=>$mensagem]])
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($httpCode >= 200 && $httpCode < 300) $enviado = true;
  } catch (Exception $e) {}
}

$zapiInstance = '';
$zapiToken = '';
$zapiClient = '';
if (!$enviado) {
  $zapiInstance = $cfgGet('zapi_instance');
  $zapiToken    = $cfgGet('zapi_token');
  $zapiClient   = $cfgGet('zapi_client_token');
  if ($zapiInstance && $zapiToken) {
    try {
      $headers = ['Content-Type: application/json'];
      if ($zapiClient !== '') $headers[] = 'Client-Token: ' . $zapiClient;
      $ch = curl_init("https://api.z-api.io/instances/{$zapiInstance}/token/{$zapiToken}/send-text");
      curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_POSTFIELDS     => json_encode(['phone' => $destinatario, 'message' => $mensagem])
      ]);
      $resp     = curl_exec($ch);
      $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
      curl_close($ch);
      if ($httpCode >= 200 && $httpCode < 300) $enviado = true;
    } catch (Exception $e) {}
  }
}

$zapiConectada = false;
if (!$enviado && $zapiInstance && $zapiToken) {
  $headers2 = ['Content-Type: application/json'];
  if ($zapiClient !== '') $headers2[] = 'Client-Token: ' . $zapiClient;
  $chk = curl_init("https://api.z-api.io/instances/{$zapiInstance}/token/{$zapiToken}/status");
  curl_setopt_array($chk, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 6,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_HTTPHEADER     => $headers2,
  ]);
  $statusResp = json_decode(curl_exec($chk), true);
  curl_close($chk);
  $zapiConectada = !empty($statusResp['connected']);
}

if (!$enviado && !$zapiConectada) {
  echo json_encode([
    'ok'               => true,
    'enviado'          => false,
    'instancia_off'    => true,
    'codigo_manual'    => $codigo,
    'msg_aviso'        => 'WhatsApp desconectado na Z-API. Conecte em app.z-api.io ou use o código abaixo.'
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

echo json_encode(['ok' => true, 'enviado' => $enviado], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
