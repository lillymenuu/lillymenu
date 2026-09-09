<?php
/*
 * Versao JSON de listagem de categorias (admin/produtos.php monta essa
 * mesma lista para os cards/dropdown). GET lista; POST salva (cria ou
 * atualiza, incluindo modo_exibicao, igual admin/api/categorias_save.php);
 * PUT reordena (igual admin/api/categorias_reordenar.php); DELETE remove
 * (move produtos para "sem categoria" antes, igual
 * admin/api/categoria_deletar.php).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';

header('Content-Type: application/json');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($metodo === 'GET') {
  $stmt = $conn->prepare("
    SELECT id, nome, ativo, ordem, modo_exibicao
    FROM categorias
    WHERE loja_id = ?
    ORDER BY ordem IS NULL, ordem, nome
  ");
  $stmt->execute([$lojaId]);
  echo json_encode(['ok' => true, 'categorias' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
  exit;
}

$dados = json_decode(file_get_contents('php://input'), true) ?: [];

if ($metodo === 'PUT') {
  $ordem = $dados['ordem'] ?? [];
  $ordem = is_array($ordem) ? array_values(array_filter($ordem, 'is_numeric')) : [];
  if (count($ordem) === 0) {
    echo json_encode(['ok' => false, 'msg' => 'Lista de ordem invalida.']);
    exit;
  }
  $conn->beginTransaction();
  $stmt = $conn->prepare("UPDATE categorias SET ordem = ? WHERE id = ? AND loja_id = ?");
  foreach ($ordem as $index => $id) {
    $stmt->execute([$index + 1, (int) $id, $lojaId]);
  }
  $conn->commit();
  echo json_encode(['ok' => true]);
  exit;
}

if ($metodo === 'DELETE') {
  $id = (int) ($dados['id'] ?? 0);
  if ($id <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'ID invalido.']);
    exit;
  }
  try {
    $stmt = $conn->prepare("SELECT id FROM categorias WHERE id = ? AND loja_id = ?");
    $stmt->execute([$id, $lojaId]);
    if (!$stmt->fetchColumn()) {
      echo json_encode(['ok' => false, 'msg' => 'Categoria nao encontrada.']);
      exit;
    }
    $conn->prepare("UPDATE produtos SET categoria_id = NULL WHERE categoria_id = ? AND loja_id = ?")->execute([$id, $lojaId]);
    $conn->prepare("DELETE FROM categorias WHERE id = ? AND loja_id = ?")->execute([$id, $lojaId]);
    bumpCatalogoVersao($conn, $lojaId);
    echo json_encode(['ok' => true]);
  } catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro ao excluir.']);
  }
  exit;
}

if ($metodo === 'POST') {
  $id    = (string) ($dados['id'] ?? '');
  $nome  = trim((string) ($dados['nome'] ?? ''));
  $ativo = !empty($dados['ativo']) ? 1 : 0;
  $modoValidos = ['vertical', 'horizontal', 'grid'];
  $modo  = in_array($dados['modo_exibicao'] ?? '', $modoValidos, true) ? $dados['modo_exibicao'] : 'vertical';

  try {
    $cols = $conn->query("SHOW COLUMNS FROM categorias")->fetchAll(PDO::FETCH_COLUMN, 0);
    if (!in_array('modo_exibicao', $cols, true)) {
      $conn->exec("ALTER TABLE categorias ADD COLUMN modo_exibicao VARCHAR(20) NOT NULL DEFAULT 'vertical'");
    }
  } catch (Throwable $e) {
  }

  if ($nome === '') {
    echo json_encode(['ok' => false, 'msg' => 'Informe o nome da categoria.']);
    exit;
  }

  if ($id !== '' && (int) $id > 0) {
    $stmt = $conn->prepare("UPDATE categorias SET nome = ?, ativo = ?, modo_exibicao = ? WHERE id = ? AND loja_id = ?");
    $stmt->execute([$nome, $ativo, $modo, (int) $id, $lojaId]);
    bumpCatalogoVersao($conn, $lojaId);
    echo json_encode(['ok' => true, 'action' => 'update', 'id' => (int) $id]);
    exit;
  }

  $stmt = $conn->prepare("SELECT COALESCE(MAX(ordem), 0) + 1 FROM categorias WHERE loja_id = ?");
  $stmt->execute([$lojaId]);
  $novaOrdem = (int) $stmt->fetchColumn();

  $stmt = $conn->prepare("INSERT INTO categorias (nome, ativo, ordem, loja_id, modo_exibicao) VALUES (?, ?, ?, ?, ?)");
  $stmt->execute([$nome, $ativo, $novaOrdem, $lojaId, $modo]);
  $novoId = (int) $conn->lastInsertId();
  bumpCatalogoVersao($conn, $lojaId);
  echo json_encode(['ok' => true, 'action' => 'insert', 'id' => $novoId]);
  exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'msg' => 'Metodo nao permitido.']);
