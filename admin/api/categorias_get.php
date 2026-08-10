<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = (int) ($_GET['id'] ?? 0);

try {
  $cols = $conn->query("SHOW COLUMNS FROM categorias")->fetchAll(PDO::FETCH_COLUMN, 0);
  if (!in_array('modo_exibicao', $cols, true)) {
    $conn->exec("ALTER TABLE categorias ADD COLUMN modo_exibicao VARCHAR(20) NOT NULL DEFAULT 'vertical'");
  }
} catch (Throwable $e) {}

$temModo = false;
try {
  $c = $conn->query("SHOW COLUMNS FROM categorias LIKE 'modo_exibicao'")->fetch();
  $temModo = (bool)$c;
} catch (Throwable $e) {}

$modoSql = $temModo ? ", IFNULL(modo_exibicao,'vertical') AS modo_exibicao" : ", 'vertical' AS modo_exibicao";

$stmt = $conn->prepare("
  SELECT id, nome, ativo {$modoSql}
  FROM categorias
  WHERE id = ? AND loja_id = ?
");
$stmt->execute([$id, $lojaId]);

echo json_encode($stmt->fetch(PDO::FETCH_ASSOC) ?: []);
