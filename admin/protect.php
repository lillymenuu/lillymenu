<?php
session_start();

/* Impede que CDN/proxy/navegador guarde em cache paginas autenticadas — sem isso,
   um link copiado de dentro do sistema pode ser reaberto por qualquer pessoa (em
   outro navegador/aba anonima) servido a partir do cache, sem passar pelo login.
   O Cache-Control padrao sozinho nao basta na Hostinger: o servidor deles roda
   LiteSpeed, que tem cache proprio (LSCache) e ignora o Cache-Control normal quando
   o cabecalho especifico dele esta presente — por isso o X-LiteSpeed-Cache-Control
   abaixo, que e o que realmente desativa o cache do servidor. */
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0, private');
header('Pragma: no-cache');
header('X-LiteSpeed-Cache-Control: no-cache');

if (!isset($_SESSION['admin_id'])) {
  header("Location: login");
  exit;
}

if (!empty($_SESSION['locked']) && basename($_SERVER['PHP_SELF'] ?? '') !== 'auth-lock-screen.php') {
  $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
  $pos = strrpos($scriptName, '/admin/');
  $webBase = $pos !== false ? substr($scriptName, 0, $pos) . '/admin' : '/admin';
  header('Location: ' . $webBase . '/superadmin/auth-lock-screen.php');
  exit;
}

if (!isset($_SESSION['admin_perfil'])) {
  $_SESSION['admin_perfil'] = 'admin';
}

require_once __DIR__ . '/../config/database.php';

function garantirConfiguracoesLoja(PDO $conn): void {
  static $checked = false;
  if ($checked) {
    return;
  }
  $checked = true;
  try {
    $cols = $conn->query("SHOW COLUMNS FROM configuracoes")->fetchAll(PDO::FETCH_COLUMN, 0);
    if (!in_array('loja_id', $cols, true)) {
      return;
    }
    $pkRows = $conn->query("SHOW INDEX FROM configuracoes WHERE Key_name = 'PRIMARY'")->fetchAll(PDO::FETCH_ASSOC);
    $pkCols = [];
    foreach ($pkRows as $row) {
      $pkCols[] = $row['Column_name'] ?? '';
    }
    $pkCols = array_values(array_unique(array_filter($pkCols)));
    if ($pkCols === ['chave']) {
      $conn->exec("UPDATE configuracoes SET loja_id = 1 WHERE loja_id IS NULL");
      $conn->exec("ALTER TABLE configuracoes DROP PRIMARY KEY");
      $conn->exec("ALTER TABLE configuracoes ADD PRIMARY KEY (loja_id, chave)");
      return;
    }
    if (!in_array('loja_id', $pkCols, true)) {
      $hasUnique = $conn->query("SHOW INDEX FROM configuracoes WHERE Key_name = 'uniq_loja_chave'")->fetch(PDO::FETCH_ASSOC);
      if (!$hasUnique) {
        $conn->exec("ALTER TABLE configuracoes ADD UNIQUE KEY uniq_loja_chave (loja_id, chave)");
      }
    }
  } catch (Exception $e) {
  }
}

function garantirPedidoStatusLogLojaId(PDO $conn): void {
  static $checked = false;
  if ($checked) {
    return;
  }
  $checked = true;
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE 'pedido_status_log'");
    $stmt->execute();
    if (!$stmt->fetchColumn()) {
      return;
    }
    $cols = $conn->query("SHOW COLUMNS FROM pedido_status_log")->fetchAll(PDO::FETCH_COLUMN, 0);
    if (in_array('loja_id', $cols, true)) {
      return;
    }
    $conn->exec("ALTER TABLE pedido_status_log ADD COLUMN loja_id INT NOT NULL DEFAULT 1 AFTER pedido_id");
    $conn->exec("UPDATE pedido_status_log l JOIN pedidos p ON p.id = l.pedido_id SET l.loja_id = p.loja_id");
    $idx = $conn->query("SHOW INDEX FROM pedido_status_log WHERE Key_name = 'idx_pedido_status_log_loja_pedido'")->fetch(PDO::FETCH_ASSOC);
    if (!$idx) {
      $conn->exec("CREATE INDEX idx_pedido_status_log_loja_pedido ON pedido_status_log (loja_id, pedido_id)");
    }
  } catch (Exception $e) {
  }
}

garantirConfiguracoesLoja($conn);
garantirPedidoStatusLogLojaId($conn);

$stmt = $conn->prepare("SELECT loja_id, perfil FROM admins WHERE id = ? LIMIT 1");
$stmt->execute([$_SESSION['admin_id']]);
$adminRow = $stmt->fetch(PDO::FETCH_ASSOC);
if ($adminRow) {
  $dbLojaId = (int) ($adminRow['loja_id'] ?? 0);
  if ($dbLojaId > 0 && (int) ($_SESSION['loja_id'] ?? 0) !== $dbLojaId) {
    $_SESSION['loja_id'] = $dbLojaId;
  }
  if (!isset($_SESSION['admin_perfil']) || $_SESSION['admin_perfil'] === '') {
    $_SESSION['admin_perfil'] = $adminRow['perfil'] ?? 'admin';
  }
}

if ($_SESSION['admin_perfil'] !== 'superadmin') {
  $whatsNumeroSuporte = '5585985049577';
  $msgTrial = 'Ola, seu periodo esta expirando. Entre em contato com nosso suporte via WhatsApp.';
  $_SESSION['trial_whatsapp_link'] = $_SESSION['trial_whatsapp_link'] ?? '';
  $_SESSION['trial_whatsapp_dias'] = $_SESSION['trial_whatsapp_dias'] ?? '';
  if (!function_exists('tabelaExisteInterna')) {
    function tabelaExisteInterna(PDO $conn, string $tabela): bool {
      try {
        $stmt = $conn->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$tabela]);
        return (bool) $stmt->fetchColumn();
      } catch (Exception $e) {
        return false;
      }
    }
  }
  $rotaAtual = basename($_SERVER['PHP_SELF'] ?? '');
  $rotasLiberadas = ['pagamento.php', 'pagamento_comprovante_upload.php', 'pagamento_pix_criar.php', 'pagamento_pix_status.php'];
  if (in_array($rotaAtual, $rotasLiberadas, true)) {
    return;
  }
  $lojaId = (int) ($_SESSION['loja_id'] ?? 0);
  if ($lojaId > 0) {
    if (tabelaExisteInterna($conn, 'assinaturas')) {
      $stmt = $conn->prepare("
        SELECT a.*, p.valor, p.dias_trial
        FROM assinaturas a
        LEFT JOIN planos p ON p.id = a.plano_id
        WHERE a.loja_id = ?
        ORDER BY a.id DESC
        LIMIT 1
      ");
      $stmt->execute([$lojaId]);
      $assinatura = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
      $hoje = date('Y-m-d');
      $status = strtolower(trim((string)($assinatura['status'] ?? 'trial')));
      if ($status === 'ativo') $status = 'ativa';
      $trialFim = $assinatura['trial_fim'] ?? null;
      $trialInicio = $assinatura['trial_inicio'] ?? null;
      $cicloFim = $assinatura['ciclo_fim'] ?? null;
      $planoId = (int) ($assinatura['plano_id'] ?? 0);
      $valorPlano = (float) ($assinatura['valor'] ?? 50.00);
      $diasTrial = 30;

      if (!$assinatura) {
        $stmtPlano = $conn->query("SELECT id, valor, dias_trial FROM planos WHERE ativo = 1 ORDER BY id ASC LIMIT 1");
        $plano = $stmtPlano ? $stmtPlano->fetch(PDO::FETCH_ASSOC) : null;
        $planoId = (int) ($plano['id'] ?? 1);
        $valorPlano = (float) ($plano['valor'] ?? 50.00);
        $diasTrial = 30;
        $conn->prepare("
          INSERT INTO assinaturas (loja_id, plano_id, status, trial_inicio, trial_fim)
          VALUES (?, ?, 'trial', CURDATE(), DATE_ADD(CURDATE(), INTERVAL {$diasTrial} DAY))
        ")->execute([$lojaId, $planoId]);
        $trialInicio = $hoje;
        $trialFim = date('Y-m-d', strtotime("+{$diasTrial} day"));
        $status = 'trial';
      }

      if ($status === 'trial' && !$trialFim && !empty($assinatura['id'])) {
        $conn->prepare("
          UPDATE assinaturas
          SET trial_inicio = COALESCE(trial_inicio, CURDATE()),
              trial_fim = DATE_ADD(COALESCE(trial_inicio, CURDATE()), INTERVAL {$diasTrial} DAY)
          WHERE id = ?
        ")->execute([(int) $assinatura['id']]);
        $trialInicio = $trialInicio ?: $hoje;
        $trialFim = date('Y-m-d', strtotime("+{$diasTrial} day", strtotime($trialInicio)));
      }

      if ($status === 'trial' && $trialFim && $trialFim < $hoje) {
        $conn->prepare("UPDATE assinaturas SET status='suspensa', bloqueada_em=NOW() WHERE id = ?")
          ->execute([(int)$assinatura['id']]);
        $conn->prepare("UPDATE lojas SET ativo = 0 WHERE id = ?")->execute([$lojaId]);
        $conn->prepare("UPDATE admins SET ativo = 0 WHERE loja_id = ?")->execute([$lojaId]);
        $status = 'suspensa';
        if (tabelaExisteInterna($conn, 'cobrancas')) {
          $stmt = $conn->prepare("SELECT id FROM cobrancas WHERE assinatura_id = ? AND status = 'pendente' LIMIT 1");
          $stmt->execute([(int)$assinatura['id']]);
          if (!$stmt->fetchColumn()) {
            $conn->prepare("
              INSERT INTO cobrancas (assinatura_id, valor, vencimento, status)
              VALUES (?, ?, CURDATE(), 'pendente')
            ")->execute([(int)$assinatura['id'], $valorPlano]);
          }
        }
      }

      if ($status === 'ativa' && $cicloFim && $cicloFim < $hoje) {
        $conn->prepare("UPDATE assinaturas SET status='suspensa', bloqueada_em=NOW() WHERE id = ?")
          ->execute([(int)$assinatura['id']]);
        $conn->prepare("UPDATE lojas SET ativo = 0 WHERE id = ?")->execute([$lojaId]);
        $conn->prepare("UPDATE admins SET ativo = 0 WHERE loja_id = ?")->execute([$lojaId]);
        $status = 'suspensa';
        if (tabelaExisteInterna($conn, 'cobrancas')) {
          $stmt = $conn->prepare("SELECT id FROM cobrancas WHERE assinatura_id = ? AND status = 'pendente' LIMIT 1");
          $stmt->execute([(int)$assinatura['id']]);
          if (!$stmt->fetchColumn()) {
            $conn->prepare("
              INSERT INTO cobrancas (assinatura_id, valor, vencimento, status)
              VALUES (?, ?, CURDATE(), 'pendente')
            ")->execute([(int)$assinatura['id'], $valorPlano]);
          }
        }
      }

      // Aviso de "expira em N dias": cobre tanto o trial quanto o ciclo pago (ciclo_fim),
      // dependendo de qual data e relevante pro status atual da assinatura.
      $expiraRef = null;
      if ($status === 'trial') {
        $expiraRef = $trialFim;
      } elseif ($status === 'ativa') {
        $expiraRef = $cicloFim;
      }

      if ($expiraRef) {
        $diff = (int) ((strtotime($expiraRef) - strtotime($hoje)) / 86400);
        if ($diff >= 0 && $diff <= 5) {
          $_SESSION['trial_whatsapp_link'] = 'https://wa.me/'.$whatsNumeroSuporte.'?text='.urlencode($msgTrial);
          $_SESSION['trial_whatsapp_dias'] = $diff;
        } else {
          $_SESSION['trial_whatsapp_link'] = '';
          $_SESSION['trial_whatsapp_dias'] = '';
        }
      } else {
        $_SESSION['trial_whatsapp_link'] = '';
        $_SESSION['trial_whatsapp_dias'] = '';
      }

      $ok = false;
      if ($status === 'trial') {
        $ok = $trialFim && $trialFim >= $hoje;
      } elseif ($status === 'ativa') {
        $ok = $cicloFim && $cicloFim >= $hoje;
      }
      if (!$ok) {
        header("Location: pagamento.php");
        exit;
      }
    }
  }
}
