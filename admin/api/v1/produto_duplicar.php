<?php
/*
 * Versao JSON de admin/api/produto_duplicar.php — clona um produto (e suas
 * variacoes/extras, se existirem) com "(Cópia)" no nome.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';

header('Content-Type: application/json');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'msg' => 'Metodo nao permitido.']);
  exit;
}

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($dados['id'] ?? 0);

if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'ID invalido.']);
  exit;
}

try {
  $stmt = $conn->prepare("SELECT * FROM produtos WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$id, $lojaId]);
  $produto = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$produto) {
    echo json_encode(['ok' => false, 'msg' => 'Produto nao encontrado.']);
    exit;
  }

  $skip = ['id', 'criado_em', 'atualizado_em'];
  $cols = [];
  $vals = [];
  foreach ($produto as $col => $val) {
    if (in_array($col, $skip, true)) continue;
    if ($col === 'nome') $val = $val . ' (Cópia)';
    $cols[] = $col;
    $vals[] = $val;
  }
  if (in_array('criado_em', array_keys($produto), true)) {
    $cols[] = 'criado_em';
    $ph = implode(',', array_fill(0, count($cols) - 1, '?')) . ',NOW()';
  } else {
    $ph = implode(',', array_fill(0, count($cols), '?'));
  }
  $conn->prepare("INSERT INTO produtos (" . implode(',', $cols) . ") VALUES ($ph)")->execute($vals);
  $novoId = (int) $conn->lastInsertId();

  try {
    if ((bool) $conn->query("SHOW TABLES LIKE 'produto_variacoes'")->fetchColumn()) {
      $rows = $conn->prepare("SELECT * FROM produto_variacoes WHERE produto_id = ? AND loja_id = ?");
      $rows->execute([$id, $lojaId]);
      foreach ($rows->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $vc = []; $vv = [];
        foreach ($row as $c => $v) {
          if ($c === 'id') continue;
          if ($c === 'produto_id') $v = $novoId;
          $vc[] = $c; $vv[] = $v;
        }
        $conn->prepare("INSERT INTO produto_variacoes (" . implode(',', $vc) . ") VALUES (" . implode(',', array_fill(0, count($vc), '?')) . ")")->execute($vv);
      }
    }
  } catch (Exception $e) {
  }

  try {
    if ((bool) $conn->query("SHOW TABLES LIKE 'produto_extras'")->fetchColumn()) {
      $rows = $conn->prepare("SELECT * FROM produto_extras WHERE produto_id = ? AND loja_id = ?");
      $rows->execute([$id, $lojaId]);
      foreach ($rows->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $ec = []; $ev = [];
        foreach ($row as $c => $v) {
          if ($c === 'id') continue;
          if ($c === 'produto_id') $v = $novoId;
          $ec[] = $c; $ev[] = $v;
        }
        $conn->prepare("INSERT INTO produto_extras (" . implode(',', $ec) . ") VALUES (" . implode(',', array_fill(0, count($ec), '?')) . ")")->execute($ev);
      }
    }
  } catch (Exception $e) {
  }

  bumpCatalogoVersao($conn, $lojaId);
  echo json_encode(['ok' => true, 'id' => $novoId]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao duplicar produto.']);
}
