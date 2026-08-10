<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

exigirPerfil(['admin', 'gerente']);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = (int) ($_POST['id'] ?? 0);
$codigo = strtoupper(trim($_POST['codigo'] ?? ''));
$tipo = trim($_POST['tipo'] ?? 'percent');
$desconto = (float) ($_POST['desconto'] ?? 0);
$minimo = (float) ($_POST['minimo'] ?? 0);
$quantidadeTotal = (int) ($_POST['quantidade_total'] ?? 0);
$ativo = ($_POST['ativo'] ?? '1') === '1' ? 1 : 0;
$primeiraCompra = ($_POST['primeira_compra'] ?? '0') === '1' ? 1 : 0;
$publico = ($_POST['publico'] ?? '0') === '1' ? 1 : 0;

if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Cupom invalido.']);
  exit;
}
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

try {
  $colunas = $conn->query("SHOW COLUMNS FROM cupons")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temPrimeira = in_array('primeira_compra', $colunas, true);
  $temPublico = in_array('publico', $colunas, true);

  $stmt = $conn->prepare("SELECT id, codigo, quantidade_usada FROM cupons WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$id, $lojaId]);
  $cupomAtual = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$cupomAtual) {
    echo json_encode(['ok' => false, 'msg' => 'Cupom nao encontrado.']);
    exit;
  }

  $usada = (int) ($cupomAtual['quantidade_usada'] ?? 0);
  if ($quantidadeTotal < $usada) {
    echo json_encode(['ok' => false, 'msg' => 'Quantidade menor que a ja utilizada.']);
    exit;
  }

  if ($codigo !== strtoupper((string) $cupomAtual['codigo'])) {
    $stmt = $conn->prepare("SELECT id FROM cupons WHERE codigo = ? AND id <> ? AND loja_id = ? LIMIT 1");
    $stmt->execute([$codigo, $id, $lojaId]);
    if ($stmt->fetchColumn()) {
      echo json_encode(['ok' => false, 'msg' => 'Codigo ja cadastrado.']);
      exit;
    }
  }

  $campos = ['codigo = ?', 'tipo = ?', 'desconto = ?', 'minimo = ?', 'quantidade_total = ?', 'ativo = ?'];
  $valores = [$codigo, $tipo, $tipo === 'frete' ? 0 : $desconto, $minimo, $quantidadeTotal, $ativo];

  if ($temPrimeira) {
    $campos[] = 'primeira_compra = ?';
    $valores[] = $primeiraCompra;
  }
  if ($temPublico) {
    $campos[] = 'publico = ?';
    $valores[] = $publico;
  }

  $campos[] = 'atualizado_em = NOW()';
  $valores[] = $id;
  $valores[] = $lojaId;

  $stmt = $conn->prepare("UPDATE cupons SET " . implode(',', $campos) . " WHERE id = ? AND loja_id = ?");
  $stmt->execute($valores);

  registrarOperacao($conn, 'cupom_editado', 'cupom:' . $id, [
    'codigo' => $codigo,
    'tipo' => $tipo,
    'desconto' => $tipo === 'frete' ? 0 : $desconto,
    'minimo' => $minimo,
    'quantidade_total' => $quantidadeTotal,
    'ativo' => $ativo
  ]);

  echo json_encode(['ok' => true, 'msg' => 'Cupom atualizado.']);
  exit;
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao atualizar cupom.']);
  exit;
}
