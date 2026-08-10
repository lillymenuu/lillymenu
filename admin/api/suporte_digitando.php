<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

function garantirSuporteDigitandoTable(PDO $conn): void {
  try {
    $conn->exec("CREATE TABLE IF NOT EXISTS suporte_digitando (
      loja_id INT NOT NULL,
      quem ENUM('loja','suporte') NOT NULL,
      atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (loja_id, quem)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } catch (Exception $e) {
  }
}

garantirSuporteDigitandoTable($conn);

$isSuperadmin = ($_SESSION['admin_perfil'] ?? '') === 'superadmin';
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($isSuperadmin) {
  $lojaId = (int)(($metodo === 'POST' ? $_POST['loja_id'] : $_GET['loja_id']) ?? 0);
  if ($lojaId <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'Loja invalida.']);
    exit;
  }
} else {
  $lojaId = (int)($_SESSION['loja_id'] ?? 1);
}

$euSou = $isSuperadmin ? 'suporte' : 'loja';
$outroLado = $isSuperadmin ? 'loja' : 'suporte';

try {
  if ($metodo === 'POST') {
    $ativo = !empty($_POST['ativo']);
    if ($ativo) {
      $conn->prepare("
        INSERT INTO suporte_digitando (loja_id, quem, atualizado_em)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE atualizado_em = NOW()
      ")->execute([$lojaId, $euSou]);
    } else {
      $conn->prepare("DELETE FROM suporte_digitando WHERE loja_id = ? AND quem = ?")
        ->execute([$lojaId, $euSou]);
    }
    echo json_encode(['ok' => true]);
  } else {
    $stmt = $conn->prepare("
      SELECT 1 FROM suporte_digitando
      WHERE loja_id = ? AND quem = ? AND atualizado_em > (NOW() - INTERVAL 5 SECOND)
      LIMIT 1
    ");
    $stmt->execute([$lojaId, $outroLado]);
    echo json_encode(['ok' => true, 'digitando' => (bool) $stmt->fetchColumn()]);
  }
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao verificar digitando.']);
}
