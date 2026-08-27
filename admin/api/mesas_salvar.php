<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/acesso_menu.php';
require_once __DIR__ . '/../helpers/garcom_module.php';

header('Content-Type: application/json');

if (!acessoMenuPermitido($conn, 'menu.modo_garcom')) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

garcomEnsureModule($conn);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = (int) ($_POST['id'] ?? 0);
$nome = trim((string) ($_POST['nome'] ?? ''));

if ($nome === '') {
  echo json_encode(['ok' => false, 'msg' => 'Informe o nome da mesa.']);
  exit;
}

if ($id > 0) {
  $stmt = $conn->prepare("UPDATE mesas SET nome = ? WHERE id = ? AND loja_id = ?");
  $stmt->execute([$nome, $id, $lojaId]);
  echo json_encode(['ok' => true, 'id' => $id]);
  exit;
}

$conn->prepare("INSERT INTO mesas(loja_id, nome, ativo, criado_em) VALUES(?, ?, 1, NOW())")
  ->execute([$lojaId, $nome]);
$novoId = (int) $conn->lastInsertId();

/* ja cria o cliente-placeholder aqui, pra primeira comanda dessa mesa ser
   instantanea (nao depende de nada no momento do pedido). */
garcomClienteMesaId($conn, $novoId, $nome, $lojaId);

echo json_encode(['ok' => true, 'id' => $novoId]);
