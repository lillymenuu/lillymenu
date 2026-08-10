<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../helpers/telefone.php';

header('Content-Type: application/json; charset=UTF-8');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$payload = json_decode(file_get_contents('php://input'), true);

$id = isset($payload['id']) ? (int)$payload['id'] : 0;
$nome = trim($payload['nome'] ?? '');
$telefone = formatarTelefoneBR(trim($payload['telefone'] ?? ''));
$aniversario = trim($payload['aniversario'] ?? '');
$cep = trim($payload['cep'] ?? '');
$rua = trim($payload['rua'] ?? '');
$numero = trim($payload['numero'] ?? '');
$bairro = trim($payload['bairro'] ?? '');
$cidade = trim($payload['cidade'] ?? '');
$estado = trim($payload['estado'] ?? '');
$complemento = trim($payload['complemento'] ?? '');
$enderecoInput = trim($payload['endereco'] ?? '');

$partes = [];
if ($rua !== '') $partes[] = $numero !== '' ? "{$rua}, {$numero}" : $rua;
if ($bairro !== '') $partes[] = $bairro;
$cidadeEstado = trim($cidade . ($estado ? " / {$estado}" : ''));
if ($cidadeEstado !== '') $partes[] = $cidadeEstado;
if ($cep !== '') $partes[] = $cep;
if ($complemento !== '') $partes[] = $complemento;
$endereco = trim(implode(' - ', $partes));
if ($endereco === '' && $enderecoInput !== '') $endereco = $enderecoInput;

if (!$id || $nome === '' || $telefone === '') {
  echo json_encode(['ok' => false, 'error' => 'Dados invalidos']);
  exit;
}

/* validação de unicidade excluindo o próprio registro */
$duplicado = clienteTelefoneExiste($conn, $telefone, $lojaId, $id);
if ($duplicado > 0) {
    echo json_encode(['ok' => false, 'error' => 'Já existe outro cliente com esse número de telefone.']);
    exit;
}

$stmt = $conn->prepare("
  UPDATE clientes
  SET nome = ?, telefone = ?, endereco = ?, aniversario = ?, cep = ?, rua = ?, numero = ?, bairro = ?, cidade = ?, estado = ?, complemento = ?
  WHERE id = ? AND loja_id = ?
");
$ok = $stmt->execute([
  $nome,
  $telefone,
  $endereco,
  $aniversario !== '' ? $aniversario : null,
  $cep !== '' ? $cep : null,
  $rua !== '' ? $rua : null,
  $numero !== '' ? $numero : null,
  $bairro !== '' ? $bairro : null,
  $cidade !== '' ? $cidade : null,
  $estado !== '' ? $estado : null,
  $complemento !== '' ? $complemento : null,
  $id,
  $lojaId
]);

echo json_encode(['ok' => $ok]);
