<?php
/*
 * Versao JSON (Bearer token) de admin/api/cupons_save.php +
 * admin/api/cupons_update.php — cria ou atualiza um cupom (id presente
 * no corpo decide qual). Reaproveita exatamente as mesmas regras de
 * validacao do legado, so trocando sessao por Bearer token e corpo
 * form-urlencoded por JSON.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados = json_decode(file_get_contents('php://input'), true) ?: [];

$id = (int) ($dados['id'] ?? 0);
$codigo = strtoupper(trim((string) ($dados['codigo'] ?? '')));
$tipo = (string) ($dados['tipo'] ?? 'percent');
$desconto = (float) ($dados['desconto'] ?? 0);
$minimo = (float) ($dados['minimo'] ?? 0);
$quantidadeTotal = (int) ($dados['quantidade_total'] ?? 0);
$ativo = !empty($dados['ativo']) ? 1 : 0;
$primeiraCompra = !empty($dados['primeira_compra']) ? 1 : 0;
$publico = !empty($dados['publico']) ? 1 : 0;

if ($codigo === '') {
  echo json_encode(['ok' => false, 'msg' => 'Código obrigatório.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if (!preg_match('/^[A-Z0-9_-]{3,15}$/', $codigo)) {
  echo json_encode(['ok' => false, 'msg' => 'Código inválido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if (!in_array($tipo, ['percent', 'valor', 'frete'], true)) {
  $tipo = 'percent';
}
if ($tipo !== 'frete' && $desconto <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Desconto inválido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if ($tipo === 'percent' && $desconto > 100) {
  echo json_encode(['ok' => false, 'msg' => 'Percentual acima de 100%.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if ($minimo < 0) {
  $minimo = 0;
}
if ($quantidadeTotal < 0) {
  echo json_encode(['ok' => false, 'msg' => 'Quantidade inválida.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if ($tipo === 'frete') {
  $desconto = 0;
}

if ($id > 0) {
  $stmt = $conn->prepare("SELECT id, codigo, quantidade_usada FROM cupons WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$id, $lojaId]);
  $atual = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$atual) {
    echo json_encode(['ok' => false, 'msg' => 'Cupom não encontrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }
  if ($quantidadeTotal < (int) $atual['quantidade_usada']) {
    echo json_encode(['ok' => false, 'msg' => 'Quantidade menor que a já utilizada.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }

  if ($codigo !== $atual['codigo']) {
    $stmtDup = $conn->prepare("SELECT id FROM cupons WHERE codigo = ? AND loja_id = ? AND id <> ? LIMIT 1");
    $stmtDup->execute([$codigo, $lojaId, $id]);
    if ($stmtDup->fetchColumn()) {
      echo json_encode(['ok' => false, 'msg' => 'Código já cadastrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
      exit;
    }
  }

  $stmt = $conn->prepare("
    UPDATE cupons
    SET codigo = ?, tipo = ?, desconto = ?, minimo = ?, quantidade_total = ?,
        ativo = ?, primeira_compra = ?, publico = ?, atualizado_em = NOW()
    WHERE id = ? AND loja_id = ?
  ");
  $stmt->execute([$codigo, $tipo, $desconto, $minimo, $quantidadeTotal, $ativo, $primeiraCompra, $publico, $id, $lojaId]);

  echo json_encode(['ok' => true, 'msg' => 'Cupom atualizado.', 'id' => $id], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmtDup = $conn->prepare("SELECT id FROM cupons WHERE codigo = ? AND loja_id = ? LIMIT 1");
$stmtDup->execute([$codigo, $lojaId]);
if ($stmtDup->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Cupom já cadastrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("
  INSERT INTO cupons (codigo, tipo, desconto, minimo, quantidade_total, quantidade_usada, ativo, primeira_compra, publico, loja_id, criado_em)
  VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, NOW())
");
$stmt->execute([$codigo, $tipo, $desconto, $minimo, $quantidadeTotal, $ativo, $primeiraCompra, $publico, $lojaId]);
$novoId = (int) $conn->lastInsertId();

echo json_encode(['ok' => true, 'msg' => 'Cupom salvo.', 'id' => $novoId], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
