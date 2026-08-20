<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/notificacoes_broadcast.php';
require_once __DIR__ . '/../../helpers/storage.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

garantirNotificacoesBroadcastTabelas($conn);

function salvarImagemNotificacao(array $arquivo): ?string {
  return storage_save_upload($arquivo, 'notificacoes', 'notif');
}

$titulo = trim((string) ($_POST['titulo'] ?? ''));
$mensagem = trim((string) ($_POST['mensagem'] ?? ''));
$modo = ($_POST['modo'] ?? 'agora') === 'programar' ? 'programar' : 'agora';
$agendadoParaRaw = trim((string) ($_POST['agendado_para'] ?? ''));
$link = trim((string) ($_POST['link'] ?? ''));

if ($titulo === '' || $mensagem === '') {
  echo json_encode(['ok' => false, 'msg' => 'Preencha o titulo e a mensagem.']);
  exit;
}

if ($link !== '') {
  if (!preg_match('#^https?://#i', $link)) {
    $link = 'https://' . $link;
  }
  if (!filter_var($link, FILTER_VALIDATE_URL)) {
    echo json_encode(['ok' => false, 'msg' => 'Link invalido.']);
    exit;
  }
}

$agendadoPara = null;
if ($modo === 'programar') {
  if ($agendadoParaRaw === '') {
    echo json_encode(['ok' => false, 'msg' => 'Escolha a data e hora do envio.']);
    exit;
  }
  $timestamp = strtotime($agendadoParaRaw);
  if ($timestamp === false) {
    echo json_encode(['ok' => false, 'msg' => 'Data/hora invalida.']);
    exit;
  }
  $agendadoPara = date('Y-m-d H:i:s', $timestamp);
}

try {
  $imagem = salvarImagemNotificacao($_FILES['imagem'] ?? []);
} catch (RuntimeException $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
  exit;
}

$criadoPor = (int) ($_SESSION['admin_id'] ?? 0);
$agora = date('Y-m-d H:i:s');
$hoje = date('Y-m-d H:i:s');

try {
  if ($modo === 'programar' && $agendadoPara > $hoje) {
    $stmt = $conn->prepare("
      INSERT INTO notificacoes_broadcast (titulo, mensagem, imagem, link, status, agendado_para, criado_por)
      VALUES (?, ?, ?, ?, 'programada', ?, ?)
    ");
    $stmt->execute([$titulo, $mensagem, $imagem, $link !== '' ? $link : null, $agendadoPara, $criadoPor]);
  } else {
    $stmt = $conn->prepare("
      INSERT INTO notificacoes_broadcast (titulo, mensagem, imagem, link, status, enviado_em, criado_por)
      VALUES (?, ?, ?, ?, 'enviada', ?, ?)
    ");
    $stmt->execute([$titulo, $mensagem, $imagem, $link !== '' ? $link : null, $agora, $criadoPor]);
  }
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar notificacao.']);
}
