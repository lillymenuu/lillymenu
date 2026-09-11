<?php
/*
 * Versao JSON de admin/api/cliente_salvar.php para o novo frontend
 * Next.js — salvar o modal "Cadastrar cliente".
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../../helpers/telefone.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$payload = json_decode(file_get_contents('php://input'), true) ?: [];

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

if ($nome === '' || $telefone === '') {
  echo json_encode(['ok' => false, 'msg' => 'Nome e telefone sao obrigatorios.']);
  exit;
}

$partes = [];
if ($rua !== '') $partes[] = $numero !== '' ? "{$rua}, {$numero}" : $rua;
if ($bairro !== '') $partes[] = $bairro;
$cidadeEstado = trim($cidade . ($estado ? " / {$estado}" : ''));
if ($cidadeEstado !== '') $partes[] = $cidadeEstado;
if ($cep !== '') $partes[] = $cep;
if ($complemento !== '') $partes[] = $complemento;
$endereco = trim(implode(' - ', $partes));
if ($endereco === '' && $enderecoInput !== '') $endereco = $enderecoInput;

$duplicado = clienteTelefoneExiste($conn, $telefone, $lojaId);
if ($duplicado > 0) {
  echo json_encode([
    'ok' => false,
    'msg' => 'Ja existe um cliente cadastrado com esse numero de telefone.',
    'cliente_id' => $duplicado,
  ]);
  exit;
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
  $lojaId,
]);

echo json_encode(['ok' => true, 'id' => (int) $conn->lastInsertId()]);
