<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

function garantirSuporteMensagensTable(PDO $conn): void {
  try {
    $conn->exec("CREATE TABLE IF NOT EXISTS suporte_mensagens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      loja_id INT NOT NULL,
      remetente ENUM('loja','suporte') NOT NULL,
      mensagem TEXT NOT NULL,
      anexo_arquivo VARCHAR(255) NULL DEFAULT NULL,
      lida_loja TINYINT NOT NULL DEFAULT 0,
      lida_suporte TINYINT NOT NULL DEFAULT 0,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_loja (loja_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $col = $conn->query("SHOW COLUMNS FROM suporte_mensagens LIKE 'anexo_arquivo'")->fetch();
    if (!$col) {
      $conn->exec("ALTER TABLE suporte_mensagens ADD COLUMN anexo_arquivo VARCHAR(255) NULL DEFAULT NULL");
    }
  } catch (Exception $e) {
  }
}

function limparSuporteMensagensExpiradas(PDO $conn): void {
  try {
    $stmt = $conn->query("SELECT anexo_arquivo FROM suporte_mensagens WHERE criado_em < (NOW() - INTERVAL 2 DAY) AND anexo_arquivo IS NOT NULL");
    $arquivos = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN) : [];
    $baseDir = realpath(__DIR__ . '/../assets/uploads/suporte');
    foreach ($arquivos as $relPath) {
      if (!$relPath) continue;
      $arquivo = realpath(__DIR__ . '/../' . $relPath);
      if ($baseDir && $arquivo && strpos($arquivo, $baseDir) === 0 && is_file($arquivo)) {
        unlink($arquivo);
      }
    }
    $conn->exec("DELETE FROM suporte_mensagens WHERE criado_em < (NOW() - INTERVAL 2 DAY)");
  } catch (Exception $e) {
  }
}

function salvarAnexoSuporte(array $arquivo, int $lojaId): ?string {
  if (($arquivo['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
    return null;
  }
  if ($arquivo['error'] !== UPLOAD_ERR_OK) {
    throw new RuntimeException('Erro ao enviar o arquivo.');
  }
  $allowed = ['jpg', 'jpeg', 'png', 'webp'];
  $ext = strtolower(pathinfo($arquivo['name'] ?? '', PATHINFO_EXTENSION));
  if (!in_array($ext, $allowed, true)) {
    throw new RuntimeException('Imagem invalida (use JPG, PNG ou WebP).');
  }
  if ($arquivo['size'] > 5 * 1024 * 1024) {
    throw new RuntimeException('Imagem muito grande (maximo 5MB).');
  }
  $dirRel = 'assets/uploads/suporte';
  $dirAbs = __DIR__ . '/../' . $dirRel;
  if (!is_dir($dirAbs)) {
    @mkdir($dirAbs, 0775, true);
  }
  $fileName = 'suporte_' . $lojaId . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
  $dest = $dirAbs . '/' . $fileName;
  if (!move_uploaded_file($arquivo['tmp_name'], $dest)) {
    throw new RuntimeException('Erro ao salvar a imagem.');
  }
  return $dirRel . '/' . $fileName;
}

garantirSuporteMensagensTable($conn);
limparSuporteMensagensExpiradas($conn);

$isSuperadmin = ($_SESSION['admin_perfil'] ?? '') === 'superadmin';
$mensagem = trim((string)($_POST['mensagem'] ?? ''));

if ($mensagem !== '' && mb_strlen($mensagem) > 2000) {
  echo json_encode(['ok' => false, 'msg' => 'Mensagem muito longa.']);
  exit;
}

if ($isSuperadmin) {
  $lojaId = (int)($_POST['loja_id'] ?? 0);
  if ($lojaId <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'Loja invalida.']);
    exit;
  }
  $remetente = 'suporte';
  $lidaLoja = 0;
  $lidaSuporte = 1;
} else {
  $lojaId = (int)($_SESSION['loja_id'] ?? 1);
  $remetente = 'loja';
  $lidaLoja = 1;
  $lidaSuporte = 0;
}

try {
  $anexoArquivo = salvarAnexoSuporte($_FILES['imagem'] ?? [], $lojaId);
} catch (RuntimeException $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
  exit;
}

if ($mensagem === '' && $anexoArquivo === null) {
  echo json_encode(['ok' => false, 'msg' => 'Informe uma mensagem ou anexe uma imagem.']);
  exit;
}

try {
  $stmt = $conn->prepare("
    INSERT INTO suporte_mensagens (loja_id, remetente, mensagem, anexo_arquivo, lida_loja, lida_suporte)
    VALUES (?, ?, ?, ?, ?, ?)
  ");
  $stmt->execute([$lojaId, $remetente, $mensagem, $anexoArquivo, $lidaLoja, $lidaSuporte]);
  $id = (int)$conn->lastInsertId();

  $stmtGet = $conn->prepare("SELECT id, remetente, mensagem, anexo_arquivo, criado_em FROM suporte_mensagens WHERE id = ?");
  $stmtGet->execute([$id]);
  $row = $stmtGet->fetch(PDO::FETCH_ASSOC);

  echo json_encode(['ok' => true, 'mensagem' => $row]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao enviar mensagem.']);
}
