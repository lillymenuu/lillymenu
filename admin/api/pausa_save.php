<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

function garantirPausasTable(PDO $conn): void {
  try {
    $conn->exec("CREATE TABLE IF NOT EXISTS pausas_programadas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      loja_id INT NOT NULL,
      titulo VARCHAR(100) NOT NULL,
      data_inicio DATE NOT NULL,
      hora_inicio TIME NOT NULL,
      data_fim DATE NOT NULL,
      hora_fim TIME NOT NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_loja (loja_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } catch (Exception $e) {
  }
}

garantirPausasTable($conn);

$lojaId = (int)($_SESSION['loja_id'] ?? 1);
$data   = json_decode(file_get_contents('php://input'), true) ?? [];

$titulo     = trim((string)($data['titulo'] ?? ''));
$dataInicio = trim((string)($data['data_inicio'] ?? ''));
$horaInicio = trim((string)($data['hora_inicio'] ?? ''));
$dataFim    = trim((string)($data['data_fim'] ?? ''));
$horaFim    = trim((string)($data['hora_fim'] ?? ''));

if ($titulo === '' || mb_strlen($titulo) > 100) {
  echo json_encode(['ok' => false, 'msg' => 'Informe um titulo valido (max. 100 caracteres).']);
  exit;
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataInicio) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataFim)) {
  echo json_encode(['ok' => false, 'msg' => 'Informe a data da pausa.']);
  exit;
}
if (!preg_match('/^\d{2}:\d{2}$/', $horaInicio) || !preg_match('/^\d{2}:\d{2}$/', $horaFim)) {
  echo json_encode(['ok' => false, 'msg' => 'Informe o horario inicial e final.']);
  exit;
}

$inicioCompleto = $dataInicio . ' ' . $horaInicio;
$fimCompleto    = $dataFim . ' ' . $horaFim;
if ($fimCompleto <= $inicioCompleto) {
  echo json_encode(['ok' => false, 'msg' => 'O horario final deve ser depois do horario inicial.']);
  exit;
}

try {
  $stmt = $conn->prepare("
    INSERT INTO pausas_programadas (loja_id, titulo, data_inicio, hora_inicio, data_fim, hora_fim)
    VALUES (?, ?, ?, ?, ?, ?)
  ");
  $stmt->execute([$lojaId, $titulo, $dataInicio, $horaInicio, $dataFim, $horaFim]);

  echo json_encode(['ok' => true, 'id' => (int)$conn->lastInsertId()]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar pausa programada.']);
}
