<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

header('Content-Type: application/json');

$lojaId = (int) ($_GET['loja_id'] ?? $_POST['loja_id'] ?? 0);

// loja_id > 0 = config específica da loja; loja_id = 0 = config global do sistema
if ($lojaId > 0) {
  $chk = $conn->prepare("SELECT id FROM lojas WHERE id = ? LIMIT 1");
  $chk->execute([$lojaId]);
  if (!$chk->fetch()) {
    echo json_encode(['ok' => false, 'msg' => 'Loja não encontrada.']);
    exit;
  }
}

$campos = ['zapi_instance', 'zapi_token', 'zapi_client_token', 'evolution_url', 'evolution_token', 'evolution_instance'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $config = [];
  foreach ($campos as $key) {
    $stmt = $conn->prepare("SELECT valor FROM configuracoes WHERE loja_id = ? AND chave = ? LIMIT 1");
    $stmt->execute([$lojaId, $key]);
    $config[$key] = (string) ($stmt->fetchColumn() ?: '');
  }
  echo json_encode(['ok' => true, 'config' => $config]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $upsert = "INSERT INTO configuracoes (loja_id, chave, valor) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE valor = VALUES(valor)";
  foreach ($campos as $campo) {
    $valor = trim($_POST[$campo] ?? '');
    if ($valor !== '') {
      $conn->prepare($upsert)->execute([$lojaId, $campo, $valor]);
    } else {
      $conn->prepare("DELETE FROM configuracoes WHERE loja_id = ? AND chave = ?")->execute([$lojaId, $campo]);
    }
  }
  echo json_encode(['ok' => true, 'msg' => 'Configuração salva com sucesso.']);
  exit;
}

echo json_encode(['ok' => false, 'msg' => 'Método inválido.']);
