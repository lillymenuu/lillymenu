<?php
/*
 * Versao JSON de admin/api/estoque_vinculo_produtos.php (GET: lista produtos
 * elegiveis pra vincular, com flag "vinculado") + estoque_vinculo_save.php
 * (POST: salva a selecao) combinados num unico endpoint.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/estoque_vinculo_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($metodo === 'GET') {
  $produtoId = (int) ($_GET['produto_id'] ?? 0);
  $search    = trim((string) ($_GET['search'] ?? ''));

  if ($produtoId <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'Produto invalido.']);
    exit;
  }

  try {
    $cols = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
    $imagemSel = in_array('imagem', $cols, true) ? 'p.imagem' : 'NULL AS imagem';

    $where  = ['p.loja_id = ?', 'p.ativo = 1', 'p.id <> ?'];
    $params = [$lojaId, $produtoId];
    if ($search !== '') {
      $where[]  = 'p.nome LIKE ?';
      $params[] = '%' . $search . '%';
    }

    $stmt = $conn->prepare("
      SELECT p.id, p.nome, $imagemSel, p.categoria_id
      FROM produtos p
      WHERE " . implode(' AND ', $where) . "
      ORDER BY p.nome
      LIMIT 300
    ");
    $stmt->execute($params);
    $produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $vinculados = array_flip(estoqueVinculoMembros($conn, $produtoId, $lojaId));
    foreach ($produtos as &$p) {
      $p['id'] = (int) $p['id'];
      $p['vinculado'] = isset($vinculados[$p['id']]);
    }
    unset($p);

    echo json_encode(['ok' => true, 'produtos' => $produtos], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  } catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
  }
  exit;
}

if ($metodo === 'POST') {
  $dados     = json_decode(file_get_contents('php://input'), true) ?: [];
  $produtoId = (int) ($dados['produto_id'] ?? 0);
  $ids       = is_array($dados['produto_ids'] ?? null) ? $dados['produto_ids'] : [];

  if ($produtoId <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'Produto invalido.']);
    exit;
  }

  estoqueVinculoEnsureModule($conn);

  $conn->beginTransaction();
  try {
    $stmtProd = $conn->prepare("SELECT id FROM produtos WHERE id = ? AND loja_id = ?");
    $stmtProd->execute([$produtoId, $lojaId]);
    if (!$stmtProd->fetchColumn()) {
      throw new Exception('Produto nao encontrado nesta loja.');
    }

    $selecionados = [];
    foreach ($ids as $raw) {
      $id = (int) $raw;
      if ($id > 0 && $id !== $produtoId) {
        $selecionados[$id] = true;
      }
    }

    if ($selecionados) {
      $idsChaves = array_keys($selecionados);
      $ph = implode(',', array_fill(0, count($idsChaves), '?'));
      $stmtValida = $conn->prepare("SELECT id FROM produtos WHERE id IN ($ph) AND loja_id = ?");
      $stmtValida->execute([...$idsChaves, $lojaId]);
      $validos = array_flip(array_map('intval', $stmtValida->fetchAll(PDO::FETCH_COLUMN, 0)));
      $selecionados = array_intersect_key($selecionados, $validos);
    }

    if (!$selecionados) {
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

    $phDesejados = implode(',', array_fill(0, count($desejados), '?'));
    $conn->prepare("
      DELETE FROM estoque_grupo_membros
      WHERE grupo_id = ? AND loja_id = ? AND produto_id NOT IN ($phDesejados)
    ")->execute([$grupoId, $lojaId, ...$desejados]);

    $stmtUpsert = $conn->prepare("
      INSERT INTO estoque_grupo_membros (produto_id, grupo_id, loja_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE grupo_id = VALUES(grupo_id)
    ");
    foreach ($desejados as $id) {
      $stmtUpsert->execute([$id, $grupoId, $lojaId]);
    }

    $conn->commit();
    estoqueVinculoSincronizar($conn, $produtoId, $lojaId);
    echo json_encode(['ok' => true]);
  } catch (Exception $e) {
    if ($conn->inTransaction()) {
      $conn->rollBack();
    }
    echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
  }
  exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'msg' => 'Metodo nao permitido.']);
