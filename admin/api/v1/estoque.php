<?php
/*
 * Versao JSON de admin/api/estoque_update.php — ajusta a quantidade (e
 * minima) de estoque de um produto, registra a movimentacao e sincroniza
 * vinculos de estoque existentes (se houver), igual o original.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/estoque_vinculo_module.php';

header('Content-Type: application/json');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'msg' => 'Metodo nao permitido.']);
  exit;
}

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$produtoId  = (int) ($dados['produto_id'] ?? 0);
$quantidade = (int) ($dados['quantidade'] ?? 0);
$minimo     = (int) ($dados['quantidade_minima'] ?? 0);

if ($produtoId <= 0 || $quantidade < 0 || $minimo < 0) {
  echo json_encode(['ok' => false, 'msg' => 'Dados invalidos.']);
  exit;
}

$stmt = $conn->prepare("SELECT id FROM produtos WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$produtoId, $lojaId]);
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Produto nao encontrado.']);
  exit;
}

$colunas = $conn->query("SHOW COLUMNS FROM estoque")->fetchAll(PDO::FETCH_COLUMN, 0);
$temMinimo = in_array('quantidade_minima', $colunas, true);

estoqueVinculoEnsureModule($conn);

$conn->beginTransaction();
try {
  $conn->prepare("INSERT IGNORE INTO estoque (produto_id, quantidade, loja_id) VALUES (?, 0, ?)")
    ->execute([$produtoId, $lojaId]);

  $stmt = $conn->prepare("SELECT quantidade FROM estoque WHERE produto_id = ? AND loja_id = ?");
  $stmt->execute([$produtoId, $lojaId]);
  $quantidadeAtual = (int) ($stmt->fetchColumn() ?? 0);

  if ($temMinimo) {
    $conn->prepare("UPDATE estoque SET quantidade = ?, quantidade_minima = ? WHERE produto_id = ? AND loja_id = ?")
      ->execute([$quantidade, $minimo, $produtoId, $lojaId]);
  } else {
    $conn->prepare("UPDATE estoque SET quantidade = ? WHERE produto_id = ? AND loja_id = ?")
      ->execute([$quantidade, $produtoId, $lojaId]);
  }

  $delta = $quantidade - $quantidadeAtual;
  $mov = null;
  if ($delta !== 0) {
    $tipo = $delta > 0 ? 'entrada' : 'saida';
    $mov = ['tipo' => $tipo, 'quantidade' => abs($delta), 'origem' => 'ajuste', 'referencia_id' => null];
    $conn->prepare("INSERT INTO estoque_movimentacoes (produto_id, tipo, quantidade, origem, loja_id) VALUES (?, ?, ?, 'ajuste', ?)")
      ->execute([$produtoId, $tipo, abs($delta), $lojaId]);
  }

  $conn->commit();
  estoqueVinculoSincronizar($conn, $produtoId, $lojaId, $mov);
  echo json_encode(['ok' => true, 'quantidade' => $quantidade, 'quantidade_minima' => $minimo]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao atualizar estoque.']);
}
