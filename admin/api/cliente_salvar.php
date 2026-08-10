<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../helpers/telefone.php';

header('Content-Type: application/json; charset=UTF-8');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$data = json_decode(file_get_contents('php://input'), true);

$nome = trim($data['nome'] ?? '');
$telefone = formatarTelefoneBR(trim($data['telefone'] ?? ''));
$aniversario = trim($data['aniversario'] ?? '');
$cep = trim($data['cep'] ?? '');
$rua = trim($data['rua'] ?? '');
$numero = trim($data['numero'] ?? '');
$bairro = trim($data['bairro'] ?? '');
$cidade = trim($data['cidade'] ?? '');
$estado = trim($data['estado'] ?? '');
$complemento = trim($data['complemento'] ?? '');
$enderecoInput = trim($data['endereco'] ?? '');

$partes = [];
if ($rua !== '') $partes[] = $numero !== '' ? "{$rua}, {$numero}" : $rua;
if ($bairro !== '') $partes[] = $bairro;
$cidadeEstado = trim($cidade . ($estado ? " / {$estado}" : ''));
if ($cidadeEstado !== '') $partes[] = $cidadeEstado;
if ($cep !== '') $partes[] = $cep;
if ($complemento !== '') $partes[] = $complemento;
$endereco = trim(implode(' - ', $partes));
if ($endereco === '' && $enderecoInput !== '') $endereco = $enderecoInput;

/* validação de unicidade */
if ($telefone !== '') {
    $duplicado = clienteTelefoneExiste($conn, $telefone, $lojaId);
    if ($duplicado > 0) {
        echo json_encode(['ok' => false, 'msg' => 'Já existe um cliente cadastrado com esse número de telefone.', 'cliente_id' => $duplicado]);
        exit;
    }
}

$stmt = $conn->prepare("
  INSERT INTO clientes (nome, telefone, endereco, aniversario, cep, rua, numero, bairro, cidade, estado, complemento, loja_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");
$stmt->execute([
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
  $lojaId
]);

echo json_encode([
  'ok' => true,
  'id' => (int) $conn->lastInsertId()
]);
