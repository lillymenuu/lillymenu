<?php
// Evolution API webhook — no session auth, public endpoint
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

$raw     = file_get_contents('php://input');
$payload = json_decode($raw, true);

if (!$payload) {
  echo json_encode(['ok' => false, 'error' => 'invalid json']);
  exit;
}

$event    = $payload['event'] ?? '';
$instance = $payload['instance'] ?? '';

if ($event !== 'messages.upsert') {
  echo json_encode(['ok' => true, 'ignored' => $event]);
  exit;
}

$data = $payload['data'] ?? [];
$key  = $data['key'] ?? [];

// Ignora mensagens enviadas por nós
if (!empty($key['fromMe'])) {
  echo json_encode(['ok' => true, 'skipped' => 'fromMe']);
  exit;
}

$remoteJid = $key['remoteJid'] ?? '';

// Ignora grupos (@g.us)
if (strpos($remoteJid, '@g.us') !== false) {
  echo json_encode(['ok' => true, 'skipped' => 'group']);
  exit;
}

// Extrai número limpo
$numero = preg_replace('/@.*$/', '', $remoteJid);
$numero = preg_replace('/\D/', '', $numero);

if (strlen($numero) < 8) {
  echo json_encode(['ok' => false, 'error' => 'invalid number']);
  exit;
}

// Extrai texto da mensagem
$msgData  = $data['message'] ?? [];
if (isset($msgData['conversation'])) {
  $mensagem = $msgData['conversation'];
} elseif (isset($msgData['extendedTextMessage']['text'])) {
  $mensagem = $msgData['extendedTextMessage']['text'];
} elseif (isset($msgData['imageMessage'])) {
  $caption  = $msgData['imageMessage']['caption'] ?? '';
  $mensagem = $caption ? "[Imagem] {$caption}" : '[Imagem]';
} elseif (isset($msgData['audioMessage'])) {
  $mensagem = '[Áudio]';
} elseif (isset($msgData['documentMessage'])) {
  $mensagem = '[Documento]';
} else {
  $mensagem = '[Mensagem não suportada]';
}

$pushName = $data['pushName'] ?? '';
$msgId    = $key['id'] ?? null;

// Evita duplicata
if ($msgId) {
  $stmt = $conn->prepare("SELECT id FROM whats_mensagens WHERE whats_msg_id = ? LIMIT 1");
  $stmt->execute([$msgId]);
  if ($stmt->fetchColumn()) {
    echo json_encode(['ok' => true, 'skipped' => 'duplicate']);
    exit;
  }
}

// Descobre loja_id pela instância configurada
$lojaId = 0;
try {
  $stmt = $conn->prepare("SELECT loja_id FROM configuracoes WHERE chave = 'evolution_instance' AND valor = ? ORDER BY loja_id DESC LIMIT 1");
  $stmt->execute([$instance]);
  $found = $stmt->fetchColumn();
  if ($found !== false) {
    $lojaId = (int) $found;
  }
} catch (Exception $e) {}

// Se global (loja_id=0), tenta achar pelo número do cliente
if ($lojaId === 0) {
  $numSuffix = substr(preg_replace('/\D/', '', $numero), -9);
  try {
    $stmt = $conn->prepare("
      SELECT loja_id FROM clientes
      WHERE REPLACE(REPLACE(REPLACE(REPLACE(telefone,'(',''),')',''),'-',''),' ','') LIKE ?
      LIMIT 1
    ");
    $stmt->execute(['%' . $numSuffix . '%']);
    $found = $stmt->fetchColumn();
    if ($found !== false) {
      $lojaId = (int) $found;
    }
  } catch (Exception $e) {}
}

if ($lojaId === 0) {
  $lojaId = 1; // fallback para loja principal
}

// Upsert da conversa
$stmt = $conn->prepare("
  INSERT INTO whats_conversas (loja_id, numero, nome, ultimo_msg, ultimo_msg_em, nao_lidas)
  VALUES (?, ?, ?, ?, NOW(), 1)
  ON DUPLICATE KEY UPDATE
    nome          = IF(LENGTH(VALUES(nome)) > 0, VALUES(nome), nome),
    ultimo_msg    = VALUES(ultimo_msg),
    ultimo_msg_em = NOW(),
    nao_lidas     = nao_lidas + 1
");
$stmt->execute([$lojaId, $numero, $pushName ?: null, mb_substr($mensagem, 0, 200)]);

$conversaId = (int) $conn->lastInsertId();
if ($conversaId === 0) {
  $stmt = $conn->prepare("SELECT id FROM whats_conversas WHERE loja_id = ? AND numero = ? LIMIT 1");
  $stmt->execute([$lojaId, $numero]);
  $conversaId = (int) $stmt->fetchColumn();
}

// Salva mensagem
$stmt = $conn->prepare("
  INSERT INTO whats_mensagens (conversa_id, loja_id, direcao, mensagem, whats_msg_id)
  VALUES (?, ?, 'entrada', ?, ?)
");
$stmt->execute([$conversaId, $lojaId, $mensagem, $msgId]);

echo json_encode(['ok' => true, 'conversa_id' => $conversaId]);
