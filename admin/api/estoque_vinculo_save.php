<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/estoque_vinculo_module.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId    = (int) ($_SESSION['loja_id'] ?? 1);
$produtoId = (int) ($_POST['produto_id'] ?? 0);
$idsRaw    = trim($_POST['produto_ids'] ?? '');

if ($produtoId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Produto invalido']);
  exit;
}

// DDL deve rodar ANTES da transação — DDL causa implicit commit no MySQL
estoqueVinculoEnsureModule($conn);

$conn->beginTransaction();
try {
  $stmtProd = $conn->prepare("SELECT id FROM produtos WHERE id = ? AND loja_id = ?");
  $stmtProd->execute([$produtoId, $lojaId]);
  if (!$stmtProd->fetchColumn()) {
    throw new Exception('Produto nao encontrado nesta loja.');
  }

  $selecionados = [];
  if ($idsRaw !== '') {
    foreach (explode(',', $idsRaw) as $raw) {
      $id = (int) trim($raw);
      if ($id > 0 && $id !== $produtoId) {
        $selecionados[$id] = true;
      }
    }
  }

  // So aceita ids de produtos que realmente existem nesta loja.
  if ($selecionados) {
    $ids = array_keys($selecionados);
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $stmtValida = $conn->prepare("SELECT id FROM produtos WHERE id IN ($ph) AND loja_id = ?");
    $stmtValida->execute([...$ids, $lojaId]);
    $validos = array_flip(array_map('intval', $stmtValida->fetchAll(PDO::FETCH_COLUMN, 0)));
    $selecionados = array_intersect_key($selecionados, $validos);
  }

  if (!$selecionados) {
    // Nenhum item selecionado: o produto so sai do grupo que estava (se algum),
    // sem afetar quem ficou.
    $conn->prepare("DELETE FROM estoque_grupo_membros WHERE produto_id = ? AND loja_id = ?")
      ->execute([$produtoId, $lojaId]);
    $conn->commit();
    echo json_encode(['ok' => true]);
    exit;
  }

  $desejados = array_merge([$produtoId], array_keys($selecionados));

  $stmtGrupo = $conn->prepare("SELECT grupo_id FROM estoque_grupo_membros WHERE produto_id = ? AND loja_id = ?");
  $stmtGrupo->execute([$produtoId, $lojaId]);
  $grupoId = (int) ($stmtGrupo->fetchColumn() ?: 0);

  if ($grupoId <= 0) {
    $conn->prepare("INSERT INTO estoque_grupos (loja_id) VALUES (?)")->execute([$lojaId]);
    $grupoId = (int) $conn->lastInsertId();
  }

  // Remove do grupo atual quem nao esta mais na selecao.
  $phDesejados = implode(',', array_fill(0, count($desejados), '?'));
  $conn->prepare("
    DELETE FROM estoque_grupo_membros
    WHERE grupo_id = ? AND loja_id = ? AND produto_id NOT IN ($phDesejados)
  ")->execute([$grupoId, $lojaId, ...$desejados]);

  // Insere/realoca os desejados pro grupo atual (se um produto ja estava em
  // outro grupo, ele e movido pra este — cada produto pertence a so um grupo).
  $stmtUpsert = $conn->prepare("
    INSERT INTO estoque_grupo_membros (produto_id, grupo_id, loja_id)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE grupo_id = VALUES(grupo_id)
  ");
  foreach ($desejados as $id) {
    $stmtUpsert->execute([$id, $grupoId, $lojaId]);
  }

  $conn->commit();

  // Iguala a quantidade de todo mundo do grupo a do produto que estava com o
  // modal aberto — unifica o saldo no momento em que o vinculo e criado.
  estoqueVinculoSincronizar($conn, $produtoId, $lojaId);

  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}
