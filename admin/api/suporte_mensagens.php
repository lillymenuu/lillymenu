<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/storage.php';

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
    foreach ($arquivos as $relPath) {
      storage_delete($relPath);
    }
    $conn->exec("DELETE FROM suporte_mensagens WHERE criado_em < (NOW() - INTERVAL 2 DAY)");
  } catch (Exception $e) {
  }
}

garantirSuporteMensagensTable($conn);
limparSuporteMensagensExpiradas($conn);

$isSuperadmin = ($_SESSION['admin_perfil'] ?? '') === 'superadmin';

if ($isSuperadmin) {
  $lojaId = (int)($_GET['loja_id'] ?? 0);
  if ($lojaId <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'Loja invalida.']);
    exit;
  }
} else {
  $lojaId = (int)($_SESSION['loja_id'] ?? 1);
}

$afterId = (int)($_GET['after_id'] ?? 0);

try {
  if ($afterId > 0) {
    $stmt = $conn->prepare("
      SELECT id, remetente, mensagem, anexo_arquivo, criado_em
      FROM suporte_mensagens
      WHERE loja_id = ? AND id > ?
      ORDER BY id ASC
    ");
    $stmt->execute([$lojaId, $afterId]);
  } else {
    $stmt = $conn->prepare("
      SELECT id, remetente, mensagem, anexo_arquivo, criado_em
      FROM suporte_mensagens
      WHERE loja_id = ?
      ORDER BY id ASC
    ");
    $stmt->execute([$lojaId]);
  }
  $mensagens = $stmt->fetchAll(PDO::FETCH_ASSOC);

  if ($isSuperadmin) {
    $conn->prepare("UPDATE suporte_mensagens SET lida_suporte = 1 WHERE loja_id = ? AND remetente = 'loja' AND lida_suporte = 0")
      ->execute([$lojaId]);
  } else {
    $conn->prepare("UPDATE suporte_mensagens SET lida_loja = 1 WHERE loja_id = ? AND remetente = 'suporte' AND lida_loja = 0")
      ->execute([$lojaId]);
  }

  echo json_encode(['ok' => true, 'mensagens' => $mensagens]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao carregar mensagens.']);
}
