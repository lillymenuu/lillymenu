<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId = (int)($_SESSION['loja_id'] ?? 1);

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

  $stmt = $conn->prepare("
    SELECT id, titulo, data_inicio, hora_inicio, data_fim, hora_fim
    FROM pausas_programadas
    WHERE loja_id = ?
    ORDER BY data_inicio ASC, hora_inicio ASC
  ");
  $stmt->execute([$lojaId]);
  $pausas = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['ok' => true, 'pausas' => $pausas]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao carregar pausas programadas.']);
}
