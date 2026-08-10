<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int)($_SESSION['loja_id'] ?? 1);
$id     = (int)($_POST['id'] ?? 0);

if (!$id) {
  echo json_encode(['ok'=>false,'msg'=>'ID inválido']); exit;
}

try {
  $stmt = $conn->prepare("SELECT * FROM produtos WHERE id=? AND loja_id=? LIMIT 1");
  $stmt->execute([$id, $lojaId]);
  $produto = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$produto) {
    echo json_encode(['ok'=>false,'msg'=>'Produto não encontrado']); exit;
  }

  $skip = ['id', 'criado_em', 'atualizado_em'];
  $cols = [];
  $vals = [];
  foreach ($produto as $col => $val) {
    if (in_array($col, $skip)) continue;
    if ($col === 'nome') $val = $val . ' (Cópia)';
    $cols[] = $col;
    $vals[] = $val;
  }
  $cols[] = 'criado_em';
  $ph = implode(',', array_fill(0, count($cols) - 1, '?')) . ',NOW()';
  $conn->prepare("INSERT INTO produtos (" . implode(',', $cols) . ") VALUES ($ph)")->execute($vals);
  $novoId = (int)$conn->lastInsertId();

  // Duplicar variações
  try {
    $temVar = (bool)$conn->query("SHOW TABLES LIKE 'produto_variacoes'")->fetchColumn();
    if ($temVar) {
      $rows = $conn->prepare("SELECT * FROM produto_variacoes WHERE produto_id=? AND loja_id=?");
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
  } catch (Exception $e) {}

  // Duplicar extras/complementos
  try {
    $temExtra = (bool)$conn->query("SHOW TABLES LIKE 'produto_extras'")->fetchColumn();
    if ($temExtra) {
      $rows = $conn->prepare("SELECT * FROM produto_extras WHERE produto_id=? AND loja_id=?");
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
  } catch (Exception $e) {}

  echo json_encode(['ok'=>true, 'id'=>$novoId]);

} catch (Exception $e) {
  echo json_encode(['ok'=>false,'msg'=>'Erro ao duplicar produto']);
}
