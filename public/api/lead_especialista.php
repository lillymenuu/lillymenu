<?php
require_once '../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

function garantirLeadsEspecialistaTabela(PDO $conn): void {
  try {
    $conn->exec("CREATE TABLE IF NOT EXISTS leads_especialista (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(160) NOT NULL,
      email VARCHAR(160) NOT NULL,
      telefone VARCHAR(30) NOT NULL,
      empresa VARCHAR(160) NOT NULL,
      faturamento VARCHAR(120) NULL,
      modelo_negocio VARCHAR(120) NULL,
      aceite_whatsapp TINYINT NOT NULL DEFAULT 0,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } catch (Exception $e) {
  }
}

garantirLeadsEspecialistaTabela($conn);

$nome = trim((string) ($_POST['nome'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$telefone = trim((string) ($_POST['telefone'] ?? ''));
$empresa = trim((string) ($_POST['empresa'] ?? ''));
$faturamento = trim((string) ($_POST['faturamento'] ?? ''));
$modelo = trim((string) ($_POST['modelo_negocio'] ?? ''));
$aceite = ($_POST['aceite_whatsapp'] ?? '0') === '1' ? 1 : 0;

if ($nome === '' || $email === '' || $telefone === '' || $empresa === '') {
  echo json_encode(['ok' => false, 'msg' => 'Preencha nome, e-mail, telefone e empresa.']);
  exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  echo json_encode(['ok' => false, 'msg' => 'E-mail invalido.']);
  exit;
}
if (strtolower($faturamento) === 'selecionar') {
  $faturamento = '';
}
if (strtolower($modelo) === 'selecionar') {
  $modelo = '';
}

try {
  $stmt = $conn->prepare("
    INSERT INTO leads_especialista (nome, email, telefone, empresa, faturamento, modelo_negocio, aceite_whatsapp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  ");
  $stmt->execute([$nome, $email, $telefone, $empresa, $faturamento !== '' ? $faturamento : null, $modelo !== '' ? $modelo : null, $aceite]);
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao enviar. Tente novamente.']);
}
