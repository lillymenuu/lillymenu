<?php
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';

$lojaId = (int) ($_GET['loja_id'] ?? 1);
$produtoId = (int) ($_GET['produto_id'] ?? 0);

if ($produtoId <= 0 || $lojaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Parâmetros inválidos']);
  exit;
}

try {
  /* As 3 tabelas abaixo sao criadas de uma vez (admin/sql/create_produto_variacoes.sql)
     e ja estao em uso normal — nao ha motivo pra checar "SHOW TABLES LIKE" a
     cada request (3 idas ao banco so pra confirmar o que ja sabemos que existe).
     Se algum dia faltar uma tabela, o catch abaixo cobre o caso. */
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

  $extrasObrigatorio = false;
  foreach ($extras as $e) {
    if (!empty($e['obrigatorio'])) {
      $extrasObrigatorio = true;
      break;
    }
  }

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
