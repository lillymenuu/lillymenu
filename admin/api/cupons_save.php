<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

exigirPerfil(['admin', 'gerente']);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$codigo = strtoupper(trim($_POST['codigo'] ?? ''));
$tipo = trim($_POST['tipo'] ?? 'percent');
$desconto = (float) ($_POST['desconto'] ?? 0);
$minimo = (float) ($_POST['minimo'] ?? 0);
$quantidadeTotal = (int) ($_POST['quantidade_total'] ?? 0);
$ativo = ($_POST['ativo'] ?? '1') === '1' ? 1 : 0;
$primeiraCompra = ($_POST['primeira_compra'] ?? '0') === '1' ? 1 : 0;
$publico = ($_POST['publico'] ?? '0') === '1' ? 1 : 0;

if ($codigo === '') {
  echo json_encode(['ok' => false, 'msg' => 'Codigo obrigatorio.']);
  exit;
}
if (!preg_match('/^[A-Z0-9_-]{3,15}$/', $codigo)) {
  echo json_encode(['ok' => false, 'msg' => 'Codigo invalido.']);
  exit;
}
if (!in_array($tipo, ['percent', 'valor', 'frete'], true)) {
  $tipo = 'percent';
}
if ($tipo !== 'frete' && $desconto <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Desconto invalido.']);
  exit;
}
if ($tipo === 'percent' && $desconto > 100) {
  echo json_encode(['ok' => false, 'msg' => 'Percentual acima de 100%.']);
  exit;
}
if ($minimo < 0) {
  $minimo = 0;
}
if ($quantidadeTotal < 0) {
  echo json_encode(['ok' => false, 'msg' => 'Quantidade invalida.']);
  exit;
}

$stmt = $conn->prepare("SHOW TABLES LIKE 'cupons'");
$stmt->execute();
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de cupons nao encontrada.']);
  exit;
}

$stmt = $conn->prepare("SELECT id FROM cupons WHERE codigo = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$codigo, $lojaId]);
if ($stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Cupom ja cadastrado.']);
  exit;
}

try {
  $colunas = $conn->query("SHOW COLUMNS FROM cupons")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temPrimeira = in_array('primeira_compra', $colunas, true);
  $temPublico = in_array('publico', $colunas, true);

  $campos = ['codigo', 'tipo', 'desconto', 'minimo', 'quantidade_total', 'quantidade_usada', 'ativo', 'loja_id'];
  $valores = [$codigo, $tipo, $tipo === 'frete' ? 0 : $desconto, $minimo, $quantidadeTotal, 0, $ativo, $lojaId];

  if ($temPrimeira) {
    $campos[] = 'primeira_compra';
    $valores[] = $primeiraCompra;
  }
  if ($temPublico) {
    $campos[] = 'publico';
    $valores[] = $publico;
  }

  $campos[] = 'criado_em';
  $placeholders = array_fill(0, count($campos), '?');
  $placeholders[count($placeholders) - 1] = 'NOW()';

  $stmt = $conn->prepare("
    INSERT INTO cupons
      (" . implode(',', $campos) . ")
    VALUES
      (" . implode(',', $placeholders) . ")
  ");
  $stmt->execute($valores);

  registrarOperacao($conn, 'cupom_criado', 'cupom:' . $codigo, [
    'tipo' => $tipo,
    'desconto' => $tipo === 'frete' ? 0 : $desconto
  ]);

  echo json_encode(['ok' => true, 'msg' => 'Cupom salvo.']);
  exit;
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar cupom.']);
  exit;
}
