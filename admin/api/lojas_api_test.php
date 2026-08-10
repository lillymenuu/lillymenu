<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

header('Content-Type: application/json');

$lojaId   = (int) ($_POST['loja_id'] ?? 0);
$provider = $_POST['provider'] ?? '';

if (!in_array($provider, ['zapi', 'evolution'], true)) {
  echo json_encode(['ok' => false, 'msg' => 'Parâmetros inválidos.']);
  exit;
}

// Lê config do escopo pedido; se não achar e for loja específica, cai no global (loja_id=0)
function getCfg(PDO $conn, int $lojaId, string $chave): string {
  $stmt = $conn->prepare("SELECT valor FROM configuracoes WHERE loja_id = ? AND chave = ? LIMIT 1");
  $stmt->execute([$lojaId, $chave]);
  $val = $stmt->fetchColumn();
  if (($val === false || $val === '') && $lojaId > 0) {
    $stmt->execute([0, $chave]);
    $val = $stmt->fetchColumn();
  }
  return (string) ($val ?: '');
}

if ($provider === 'zapi') {
  $instance    = getCfg($conn, $lojaId, 'zapi_instance');
  $token       = getCfg($conn, $lojaId, 'zapi_token');
  $clientToken = getCfg($conn, $lojaId, 'zapi_client_token');

  if (!$instance || !$token) {
    echo json_encode(['ok' => false, 'msg' => 'Z-API não configurada para esta loja.']);
    exit;
  }

  $headers = ['Content-Type: application/json'];
  if ($clientToken) $headers[] = 'Client-Token: ' . $clientToken;

  $ch = curl_init("https://api.z-api.io/instances/{$instance}/token/{$token}/status");
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 8,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_HTTPHEADER     => $headers,
  ]);
  $resp     = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err      = curl_error($ch);
  curl_close($ch);

  if ($err) {
    echo json_encode(['ok' => false, 'msg' => 'Erro cURL: ' . $err]);
    exit;
  }
  if ($httpCode !== 200) {
    echo json_encode(['ok' => false, 'msg' => "HTTP {$httpCode} ao acessar Z-API."]);
    exit;
  }

  $data      = json_decode($resp, true);
  $connected = !empty($data['connected']);
  echo json_encode(['ok' => true, 'connected' => $connected]);
  exit;
}

if ($provider === 'evolution') {
  $url      = getCfg($conn, $lojaId, 'evolution_url');
  $token    = getCfg($conn, $lojaId, 'evolution_token');
  $instance = getCfg($conn, $lojaId, 'evolution_instance');

  if (!$url || !$token || !$instance) {
    echo json_encode(['ok' => false, 'msg' => 'Evolution API não configurada para esta loja.']);
    exit;
  }

  $ch = curl_init(rtrim($url, '/') . '/instance/connectionState/' . $instance);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 8,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'apikey: ' . $token],
  ]);
  $resp     = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err      = curl_error($ch);
  curl_close($ch);

  if ($err) {
    echo json_encode(['ok' => false, 'msg' => 'Erro cURL: ' . $err]);
    exit;
  }
  if ($httpCode !== 200) {
    echo json_encode(['ok' => false, 'msg' => "HTTP {$httpCode} ao acessar Evolution API."]);
    exit;
  }

  $data  = json_decode($resp, true);
  $state = $data['instance']['state'] ?? 'unknown';

  if ($state === 'open') {
    echo json_encode(['ok' => true, 'connected' => true]);
  } elseif ($state === 'connecting') {
    echo json_encode(['ok' => true, 'connected' => false, 'msg' => 'Instância reconectando — aguarde alguns segundos e teste novamente.']);
  } else {
    echo json_encode(['ok' => true, 'connected' => false, 'msg' => "Instância desconectada (estado: {$state}). Escaneie o QR novamente."]);
  }
  exit;
}
