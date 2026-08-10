<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';

$lojaId = (int) ($_GET['loja_id'] ?? 1);
$produtoId = (int) ($_GET['produto_id'] ?? 0);

if ($produtoId <= 0 || $lojaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Parâmetros inválidos']);
  exit;
}

function tabelaExisteProdVar(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

try {
  $variacoes = [];
  if (tabelaExisteProdVar($conn, 'produto_variacoes')) {
    $stmt = $conn->prepare("
      SELECT id, tamanho, cor, preco
      FROM produto_variacoes
      WHERE produto_id = ? AND ativo = 1 AND loja_id = ?
      ORDER BY ordem, id
    ");
    $stmt->execute([$produtoId, $lojaId]);
    $variacoes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($variacoes as &$v) {
      $v['preco'] = (float) $v['preco'];
    }
    unset($v);
  }

  $extras = [];
  if (tabelaExisteProdVar($conn, 'produto_extras')) {
    $stmt = $conn->prepare("
      SELECT id, nome, preco, obrigatorio
      FROM produto_extras
      WHERE produto_id = ? AND ativo = 1 AND loja_id = ?
      ORDER BY ordem, id
    ");
    $stmt->execute([$produtoId, $lojaId]);
    $extras = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($extras as &$e) {
      $e['preco'] = (float) $e['preco'];
      $e['obrigatorio'] = (int) $e['obrigatorio'];
    }
    unset($e);
  }

  $extrasObrigatorio = false;
  foreach ($extras as $e) {
    if (!empty($e['obrigatorio'])) {
      $extrasObrigatorio = true;
      break;
    }
  }

  $complementosItens = [];
  if (tabelaExisteProdVar($conn, 'produto_complementos_itens')) {
    $stmt = $conn->prepare("
      SELECT id, nome, preco, obrigatorio
      FROM produto_complementos_itens
      WHERE produto_id = ? AND ativo = 1 AND loja_id = ?
      ORDER BY ordem, id
    ");
    $stmt->execute([$produtoId, $lojaId]);
    $complementosItens = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($complementosItens as &$ci) {
      $ci['preco'] = (float) $ci['preco'];
      $ci['obrigatorio'] = (int) $ci['obrigatorio'];
    }
    unset($ci);
  }

  $complementosItensObrigatorio = false;
  foreach ($complementosItens as $ci) {
    if (!empty($ci['obrigatorio'])) {
      $complementosItensObrigatorio = true;
      break;
    }
  }

  echo json_encode([
    'ok' => true,
    'variacoes' => $variacoes,
    'extras' => $extras,
    'extras_obrigatorio' => $extrasObrigatorio ? 1 : 0,
    'complementos_itens' => $complementosItens,
    'complementos_itens_obrigatorio' => $complementosItensObrigatorio ? 1 : 0,
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}
