<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/storage.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

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

try {
  $apenasComMensagens = !empty($_GET['apenas_com_mensagens']);
  $having = $apenasComMensagens ? 'HAVING ultima_em IS NOT NULL' : '';
  $stmt = $conn->query("
    SELECT
      l.id AS loja_id,
      l.nome,
      (SELECT valor FROM configuracoes c WHERE c.loja_id = l.id AND c.chave = 'loja_perfil' LIMIT 1) AS logo,
      (SELECT mensagem FROM suporte_mensagens sm WHERE sm.loja_id = l.id ORDER BY sm.id DESC LIMIT 1) AS ultima_mensagem,
      (SELECT anexo_arquivo FROM suporte_mensagens sm WHERE sm.loja_id = l.id ORDER BY sm.id DESC LIMIT 1) AS ultimo_anexo,
      (SELECT criado_em FROM suporte_mensagens sm WHERE sm.loja_id = l.id ORDER BY sm.id DESC LIMIT 1) AS ultima_em,
      (SELECT COUNT(*) FROM suporte_mensagens sm WHERE sm.loja_id = l.id AND sm.remetente = 'loja' AND sm.lida_suporte = 0) AS nao_lidas
    FROM lojas l
    {$having}
    ORDER BY (nao_lidas > 0) DESC, ultima_em IS NULL ASC, ultima_em DESC, l.nome ASC
  ");
  $conversas = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['ok' => true, 'conversas' => $conversas]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao carregar conversas.']);
}
