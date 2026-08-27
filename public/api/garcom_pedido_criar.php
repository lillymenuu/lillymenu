<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');
mb_internal_encoding('UTF-8');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../admin/helpers/combo_estoque_module.php';
require_once __DIR__ . '/../../admin/helpers/estoque_vinculo_module.php';
require_once __DIR__ . '/../../admin/helpers/garcom_module.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  echo json_encode(['ok' => false, 'msg' => 'Método inválido']);
  exit;
}

$raw = file_get_contents('php://input');
$dados = json_decode($raw, true);
if (!is_array($dados)) {
  echo json_encode(['ok' => false, 'msg' => 'Requisição inválida']);
  exit;
}

$lojaId = (int) ($dados['loja_id'] ?? 0);
$mesaId = (int) ($dados['mesa_id'] ?? 0);
$itens = is_array($dados['itens'] ?? null) ? $dados['itens'] : [];
$formaPagamento = trim((string) ($dados['forma_pagamento'] ?? ''));
$trocoSolicitado = !empty($dados['troco_solicitado']);
$trocoValor = (float) ($dados['troco_valor'] ?? 0);

if (!isset($_SESSION['garcom_id']) || (int) ($_SESSION['garcom_loja_id'] ?? 0) !== $lojaId) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'msg' => 'Sessão do garçom expirada. Faça login novamente.']);
  exit;
}
$garcomId = (int) $_SESSION['garcom_id'];

if ($lojaId <= 0 || $mesaId <= 0 || !$itens) {
  echo json_encode(['ok' => false, 'msg' => 'Selecione a mesa e adicione ao menos um item.']);
  exit;
}
$formasValidas = ['dinheiro', 'pix', 'credito', 'debito'];
if (!in_array($formaPagamento, $formasValidas, true)) {
  echo json_encode(['ok' => false, 'msg' => 'Escolha a forma de pagamento.']);
  exit;
}

garcomEnsureModule($conn);
comboEstoqueEnsureModule($conn);
estoqueVinculoEnsureModule($conn);

$stmt = $conn->prepare("SELECT id, nome FROM mesas WHERE id = ? AND loja_id = ? AND ativo = 1 LIMIT 1");
$stmt->execute([$mesaId, $lojaId]);
$mesa = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$mesa) {
  echo json_encode(['ok' => false, 'msg' => 'Mesa inválida ou desativada.']);
  exit;
}

/* Estoque: soma a necessidade por produto (avulso ou dentro de combo) e
   bloqueia o pedido inteiro se faltar — mesma checagem de public/api/pedido_criar.php. */
$estoqueNecessario = [];
foreach ($itens as $item) {
  $qtdItem = max(1, (int) ($item['q'] ?? 1));
  if (!empty($item['combosels']) && is_array($item['combosels'])) {
    foreach ($item['combosels'] as $sel) {
      $selId = (int) ($sel['id'] ?? 0);
      $selQtd = (int) ($sel['qtd'] ?? 1) * $qtdItem;
      if ($selId > 0 && $selQtd > 0) {
        $estoqueNecessario[$selId] = ($estoqueNecessario[$selId] ?? 0) + $selQtd;
      }
    }
  } else {
    $prodId = (int) ($item['id'] ?? 0);
    if ($prodId > 0) {
      $estoqueNecessario[$prodId] = ($estoqueNecessario[$prodId] ?? 0) + $qtdItem;
    }
  }
}
if ($estoqueNecessario) {
  $ids = array_keys($estoqueNecessario);
  $ph = implode(',', array_fill(0, count($ids), '?'));
  $stmtChk = $conn->prepare("
    SELECT p.id, p.nome, IFNULL(e.quantidade, 0) AS estoque
    FROM produtos p
    LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
    WHERE p.id IN ($ph) AND p.loja_id = ?
  ");
  $stmtChk->execute([...$ids, $lojaId]);
  foreach ($stmtChk->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $necessario = $estoqueNecessario[(int) $row['id']] ?? 0;
    if ($necessario > 0 && (int) $row['estoque'] < $necessario) {
      echo json_encode(['ok' => false, 'msg' => '"' . $row['nome'] . '" está sem estoque suficiente no momento.']);
      exit;
    }
  }
}

$subtotal = 0.0;
foreach ($itens as $item) {
  $subtotal += (float) ($item['p'] ?? 0) * max(1, (int) ($item['q'] ?? 1));
}

try {
  $conn->beginTransaction();

  $clienteId = garcomClienteMesaId($conn, $mesaId, $mesa['nome'], $lojaId);

  $cols = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
  $fields = ['cliente_id', 'mesa_id', 'garcom_id', 'forma_pagamento', 'total', 'status', 'loja_id', 'criado_em'];
  $values = [$clienteId, $mesaId, $garcomId, $formaPagamento, $subtotal, 'pendente', $lojaId, date('Y-m-d H:i:s')];
  if (in_array('tipo', $cols, true)) {
    $fields[] = 'tipo';
    $values[] = 'mesa';
  }
  if (in_array('subtotal', $cols, true)) {
    $fields[] = 'subtotal';
    $values[] = $subtotal;
  }
  if (in_array('origem', $cols, true)) {
    $fields[] = 'origem';
    $values[] = 'garcom';
  }
  if (in_array('troco', $cols, true) && $formaPagamento === 'dinheiro' && $trocoSolicitado && $trocoValor > 0) {
    $fields[] = 'troco';
    $values[] = $trocoValor;
  }

  $ph = implode(',', array_fill(0, count($fields), '?'));
  $fl = implode(',', $fields);
  $conn->prepare("INSERT INTO pedidos($fl) VALUES($ph)")->execute($values);
  $pedidoId = (int) $conn->lastInsertId();

  $itensCols = $conn->query("SHOW COLUMNS FROM pedido_itens")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temProdutoId = in_array('produto_id', $itensCols, true);
  $temObsItem = in_array('observacoes', $itensCols, true);

  foreach ($itens as $item) {
    $nomeItem = trim((string) ($item['n'] ?? ''));
    $preco = (float) ($item['p'] ?? 0);
    $qtd = max(1, (int) ($item['q'] ?? 1));
    $prodId = (int) ($item['id'] ?? 0);
    $obsItem = trim((string) ($item['obs'] ?? ''));
    $isCombo = !empty($item['combosels']) && is_array($item['combosels']);

    $fi = ['pedido_id', 'produto_nome', 'quantidade', 'preco', 'loja_id'];
    $vi = [$pedidoId, $nomeItem, $qtd, $preco, $lojaId];
    if ($temProdutoId) {
      $fi[] = 'produto_id';
      $vi[] = $prodId;
    }
    if ($temObsItem) {
      $fi[] = 'observacoes';
      $vi[] = $obsItem;
    }
    $ph2 = implode(',', array_fill(0, count($fi), '?'));
    $fl2 = implode(',', $fi);
    $conn->prepare("INSERT INTO pedido_itens($fl2) VALUES($ph2)")->execute($vi);
    $pedidoItemId = (int) $conn->lastInsertId();

    if (!$isCombo) {
      try {
        $conn->prepare("UPDATE estoque SET quantidade = quantidade - ? WHERE produto_id = ? AND loja_id = ? AND quantidade >= ?")
          ->execute([$qtd, $prodId, $lojaId, $qtd]);
        estoqueVinculoSincronizar($conn, $prodId, $lojaId, ['tipo' => 'saida', 'quantidade' => $qtd, 'origem' => 'pedido', 'referencia_id' => $pedidoId]);
      } catch (Throwable $e) {
      }
    } else {
      $stmtEst = $conn->prepare("UPDATE estoque SET quantidade = quantidade - ? WHERE produto_id = ? AND loja_id = ? AND quantidade >= ?");
      foreach ($item['combosels'] as $sel) {
        $selId = (int) ($sel['id'] ?? 0);
        $selQtd = (int) ($sel['qtd'] ?? 1) * $qtd;
        if ($selId > 0 && $selQtd > 0) {
          try {
            $stmtEst->execute([$selQtd, $selId, $lojaId, $selQtd]);
            estoqueVinculoSincronizar($conn, $selId, $lojaId, ['tipo' => 'saida', 'quantidade' => $selQtd, 'origem' => 'pedido', 'referencia_id' => $pedidoId]);
          } catch (Throwable $e) {
          }
        }
      }
      comboEstoqueRegistrarComponentes($conn, $pedidoId, $pedidoItemId, $item['combosels'], $qtd, $lojaId);
    }
  }

  $conn->commit();

  echo json_encode(['ok' => true, 'pedido_id' => $pedidoId]);
} catch (Throwable $e) {
  if ($conn->inTransaction()) {
    $conn->rollBack();
  }
  echo json_encode(['ok' => false, 'msg' => 'Erro ao enviar o pedido.']);
}
