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

garantirSuporteMensagensTable($conn);
limparSuporteMensagensExpiradas($conn);

$isSuperadmin = ($_SESSION['admin_perfil'] ?? '') === 'superadmin';

try {
  if ($isSuperadmin) {
    $total = (int)$conn->query("SELECT COUNT(*) FROM suporte_mensagens WHERE remetente = 'loja' AND lida_suporte = 0")->fetchColumn();
  } else {
    $lojaId = (int)($_SESSION['loja_id'] ?? 1);
    $stmt = $conn->prepare("SELECT COUNT(*) FROM suporte_mensagens WHERE loja_id = ? AND remetente = 'suporte' AND lida_loja = 0");
    $stmt->execute([$lojaId]);
    $total = (int)$stmt->fetchColumn();
  }
  echo json_encode(['ok' => true, 'unread' => $total]);
} catch (Exception $e) {
  echo json_encode(['ok' => true, 'unread' => 0]);
}
