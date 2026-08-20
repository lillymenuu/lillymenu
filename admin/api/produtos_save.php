<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';
require_once __DIR__ . '/../../helpers/storage.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id          = $_POST['id'] ?? '';
$nome        = trim($_POST['nome'] ?? '');
$preco       = (float) ($_POST['preco'] ?? 0);
$categoria   = $_POST['categoria_id'] ?? null;
$codigo      = trim($_POST['codigo'] ?? '');
$descricao   = trim($_POST['descricao'] ?? '');
$precoPromo  = trim($_POST['preco_promocional'] ?? '');
$promoDesativado = isset($_POST['promo_desativado']) ? (int) $_POST['promo_desativado'] : 0;
$temVariacoes = isset($_POST['tem_variacoes']) ? (int) $_POST['tem_variacoes'] : 0;
$variacoesJson = (string) ($_POST['variacoes_json'] ?? '[]');
$dispCatalogo = isset($_POST['disponivel_catalogo']) ? (int) $_POST['disponivel_catalogo'] : 0;
$dispMesa = isset($_POST['disponivel_mesa']) ? (int) $_POST['disponivel_mesa'] : 0;
$pontosGanho = (int) ($_POST['pontos_ganho'] ?? 0);
$pontosCusto = (int) ($_POST['pontos_custo'] ?? 0);
$ativo       = isset($_POST['ativo']) ? 1 : 0;
$apenasAgendamento = (int) ($_POST['apenas_agendamento'] ?? 0);
$quantidadeMinima  = max(0, (int) ($_POST['quantidade_minima'] ?? 0));
$diasSemanaRaw = $_POST['dias_semana'] ?? '[]';
$diasSemana = (json_decode($diasSemanaRaw, true) !== null) ? $diasSemanaRaw : '[]';
$horarioIni = trim($_POST['horario_ini'] ?? '') ?: null;
$horarioFim = trim($_POST['horario_fim'] ?? '') ?: null;
$dataFabricacao = trim($_POST['data_fabricacao'] ?? '') ?: null;
$dataValidade = trim($_POST['data_validade'] ?? '') ?: null;
$imagemBase64 = trim($_POST['imagem_base64'] ?? '');
$imagemRemover = ($_POST['imagem_remover'] ?? '0') === '1';

if ($nome === '' || $preco <= 0) {
  echo json_encode(['ok'=>false]);
  exit;
}

$categoria = $categoria !== '' ? $categoria : null;
$codigo = $codigo !== '' ? $codigo : null;
$descricao = $descricao !== '' ? $descricao : null;
$precoPromocional = $precoPromo !== '' ? (float) $precoPromo : null;

$colunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temCodigo = in_array('codigo', $colunas, true);
$temDescricao = in_array('descricao', $colunas, true);
$temPrecoPromocional = in_array('preco_promocional', $colunas, true);
$temPromoDesativado = in_array('promo_desativado', $colunas, true);
$temVariacoesCol = in_array('tem_variacoes', $colunas, true);
$temCatalogo = in_array('disponivel_catalogo', $colunas, true);
$temMesa = in_array('disponivel_mesa', $colunas, true);
$temOrdem = in_array('ordem', $colunas, true);
$temImagem = in_array('imagem', $colunas, true);
$temPontosGanho = in_array('pontos_ganho', $colunas, true);
$temPontosCusto = in_array('pontos_custo', $colunas, true);
$temApenasAgendamento = in_array('apenas_agendamento', $colunas, true);
$temQuantidadeMinima  = in_array('quantidade_minima', $colunas, true);
$temDiasSemana = in_array('dias_semana', $colunas, true);
$temHorarioIni = in_array('horario_ini', $colunas, true);
$temHorarioFim = in_array('horario_fim', $colunas, true);
$temDataFabricacao = in_array('data_fabricacao', $colunas, true);
$temDataValidade = in_array('data_validade', $colunas, true);

if (!$temDiasSemana) {
  try { $conn->exec("ALTER TABLE produtos ADD COLUMN dias_semana TEXT NULL"); $temDiasSemana = true; } catch (Throwable $e2) {}
}
if (!$temHorarioIni) {
  try { $conn->exec("ALTER TABLE produtos ADD COLUMN horario_ini VARCHAR(5) NULL"); $temHorarioIni = true; } catch (Throwable $e2) {}
}
if (!$temHorarioFim) {
  try { $conn->exec("ALTER TABLE produtos ADD COLUMN horario_fim VARCHAR(5) NULL"); $temHorarioFim = true; } catch (Throwable $e2) {}
}
if (!$temDataFabricacao) {
  try { $conn->exec("ALTER TABLE produtos ADD COLUMN data_fabricacao DATE NULL"); $temDataFabricacao = true; } catch (Throwable $e2) {}
}
if (!$temDataValidade) {
  try { $conn->exec("ALTER TABLE produtos ADD COLUMN data_validade DATE NULL"); $temDataValidade = true; } catch (Throwable $e2) {}
}

$extrasJson = (string) ($_POST['extras_json'] ?? '[]');
$complementosItensJson = (string) ($_POST['complementos_itens_json'] ?? '[]');

function salvarImagemProduto($base64, ?int $lojaId = null) {
  return storage_save_base64($base64, 'produtos', 'produto', $lojaId);
}

function removerImagemProduto($relPath) {
  storage_delete($relPath);
}

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

function salvarVariacoes(PDO $conn, int $produtoId, int $lojaId, string $variacoesJson): string {
  if (!tabelaExiste($conn, 'produto_variacoes')) {
    return 'missing';
  }
  $variacoes = json_decode($variacoesJson, true);
  if (!is_array($variacoes)) {
    $variacoes = [];
  }
  $conn->prepare("DELETE FROM produto_variacoes WHERE produto_id = ? AND loja_id = ?")
       ->execute([$produtoId, $lojaId]);
  if (!$variacoes) {
    return 'ok';
  }
  $ordem = 1;
  $stmtIns = $conn->prepare("
    INSERT INTO produto_variacoes (produto_id, tamanho, cor, preco, ordem, loja_id)
    VALUES (?, ?, ?, ?, ?, ?)
  ");
  foreach ($variacoes as $var) {
    $tamanho = trim((string) ($var['tamanho'] ?? ''));
    $cor = trim((string) ($var['cor'] ?? ''));
    $preco = (float) ($var['preco'] ?? 0);
    if ($tamanho === '' && $cor === '' && $preco <= 0) {
      continue;
    }
    $stmtIns->execute([$produtoId, $tamanho, $cor, $preco, $ordem, $lojaId]);
    $ordem++;
  }
  return 'ok';
}

function salvarExtras(PDO $conn, int $produtoId, int $lojaId, string $extrasJson): string {
  if (!tabelaExiste($conn, 'produto_extras')) {
    return 'missing';
  }
  $extras = json_decode($extrasJson, true);
  if (!is_array($extras)) {
    $extras = [];
  }
  $conn->prepare("DELETE FROM produto_extras WHERE produto_id = ? AND loja_id = ?")
       ->execute([$produtoId, $lojaId]);
  if (!$extras) {
    return 'ok';
  }
  $ordem = 1;
  $stmtIns = $conn->prepare("
    INSERT INTO produto_extras (produto_id, nome, preco, obrigatorio, ordem, loja_id)
    VALUES (?, ?, ?, ?, ?, ?)
  ");
  foreach ($extras as $ext) {
    $nome = trim((string) ($ext['nome'] ?? ''));
    $preco = (float) ($ext['preco'] ?? 0);
    $obrigatorio = !empty($ext['obrigatorio']) ? 1 : 0;
    if ($nome === '' && $preco <= 0) {
      continue;
    }
    $stmtIns->execute([$produtoId, $nome, $preco, $obrigatorio, $ordem, $lojaId]);
    $ordem++;
  }
  return 'ok';
}

function salvarComplementosItensProduto(PDO $conn, int $produtoId, int $lojaId, string $itensJson): string {
  if (!tabelaExiste($conn, 'produto_complementos_itens')) {
    return 'missing';
  }
  $itens = json_decode($itensJson, true);
  if (!is_array($itens)) {
    $itens = [];
  }
  $conn->prepare("DELETE FROM produto_complementos_itens WHERE produto_id = ? AND loja_id = ?")
       ->execute([$produtoId, $lojaId]);
  if (!$itens) {
    return 'ok';
  }
  $ordem = 1;
  $stmtIns = $conn->prepare("
    INSERT INTO produto_complementos_itens (produto_id, nome, preco, obrigatorio, ordem, loja_id)
    VALUES (?, ?, ?, ?, ?, ?)
  ");
  foreach ($itens as $item) {
    $nome = trim((string) ($item['nome'] ?? ''));
    $preco = (float) ($item['preco'] ?? 0);
    $obrigatorio = !empty($item['obrigatorio']) ? 1 : 0;
    if ($nome === '' && $preco <= 0) {
      continue;
    }
    $stmtIns->execute([$produtoId, $nome, $preco, $obrigatorio, $ordem, $lojaId]);
    $ordem++;
  }
  return 'ok';
}

/* UPDATE */
if ($id !== '' && (int)$id > 0) {
  $imagemAtual = null;
  if ($temImagem) {
    $stmtImg = $conn->prepare("SELECT imagem FROM produtos WHERE id = ? AND loja_id = ? LIMIT 1");
    $stmtImg->execute([$id, $lojaId]);
    $imagemAtual = $stmtImg->fetchColumn() ?: null;
  }

  $campos = [
    'nome' => $nome,
    'preco' => $preco,
    'categoria_id' => $categoria,
    'ativo' => $ativo
  ];
  if ($temCodigo) {
    $campos['codigo'] = $codigo;
  }
  if ($temDescricao) {
    $campos['descricao'] = $descricao;
  }
  if ($temPrecoPromocional) {
    $campos['preco_promocional'] = $precoPromocional;
  }
  if ($temPromoDesativado) {
    $campos['promo_desativado'] = $promoDesativado ? 1 : 0;
  }
  if ($temVariacoesCol) {
    $campos['tem_variacoes'] = $temVariacoes ? 1 : 0;
  }
  if ($temCatalogo) {
    $campos['disponivel_catalogo'] = $dispCatalogo ? 1 : 0;
  }
  if ($temMesa) {
    $campos['disponivel_mesa'] = $dispMesa ? 1 : 0;
  }
  if ($temPontosGanho) {
    $campos['pontos_ganho'] = max(0, $pontosGanho);
  }
  if ($temPontosCusto) {
    $campos['pontos_custo'] = max(0, $pontosCusto);
  }
  if ($temApenasAgendamento) {
    $campos['apenas_agendamento'] = $apenasAgendamento ? 1 : 0;
  }
  if ($temQuantidadeMinima) {
    $campos['quantidade_minima'] = $quantidadeMinima;
  }
  if ($temDiasSemana) {
    $campos['dias_semana'] = $diasSemana;
  }
  if ($temHorarioIni) {
    $campos['horario_ini'] = $horarioIni;
  }
  if ($temHorarioFim) {
    $campos['horario_fim'] = $horarioFim;
  }
  if ($temDataFabricacao) {
    $campos['data_fabricacao'] = $dataFabricacao;
  }
  if ($temDataValidade) {
    $campos['data_validade'] = $dataValidade;
  }
  if ($temImagem) {
    if ($imagemRemover) {
      $campos['imagem'] = null;
      removerImagemProduto($imagemAtual);
      $imagemAtual = null;
    } elseif ($imagemBase64 !== '') {
      $novaImagem = salvarImagemProduto($imagemBase64, $lojaId);
      if (!$novaImagem) {
        echo json_encode(['ok'=>false, 'msg'=>'Imagem invalida.']);
        exit;
      }
      $campos['imagem'] = $novaImagem;
      removerImagemProduto($imagemAtual);
      $imagemAtual = $novaImagem;
    }
  }

  $setParts = [];
  $values = [];
  foreach ($campos as $col => $value) {
    $setParts[] = "$col = ?";
    $values[] = $value;
  }
  $values[] = $id;

  $stmt = $conn->prepare("
    UPDATE produtos
    SET " . implode(', ', $setParts) . "
    WHERE id = ? AND loja_id = ?
    LIMIT 1
  ");
  $values[] = $lojaId;
  $stmt->execute($values);
$variacoesStatus = salvarVariacoes($conn, (int) $id, $lojaId, $variacoesJson);
$extrasStatus = salvarExtras($conn, (int) $id, $lojaId, $extrasJson);
$complementosItensStatus = salvarComplementosItensProduto($conn, (int) $id, $lojaId, $complementosItensJson);
$variacoesCount = 0;
if ($temVariacoes) {
  $decoded = json_decode($variacoesJson, true);
  if (is_array($decoded)) {
    $variacoesCount = count($decoded);
  }
}
 $extrasCount = 0;
 $decodedExtras = json_decode($extrasJson, true);
 if (is_array($decodedExtras)) {
   $extrasCount = count($decodedExtras);
 }
  bumpCatalogoVersao($conn, $lojaId);
  echo json_encode([
    'ok' => true,
    'action' => 'update',
    'id' => (int) $id,
    'imagem' => $imagemAtual,
    'variacoes_status' => $variacoesStatus,
    'variacoes_count' => $variacoesCount,
    'extras_status' => $extrasStatus,
    'extras_count' => $extrasCount,
    'complementos_itens_status' => $complementosItensStatus,
    '_debug_categoria' => $categoria,
  ]);
  exit;
}

/* INSERT */
if ($temOrdem) {
  if ($categoria === null) {
    $stmt = $conn->prepare("SELECT COALESCE(MAX(ordem), 0) + 1 FROM produtos WHERE categoria_id IS NULL AND loja_id = ?");
    $stmt->execute([$lojaId]);
    $novaOrdem = (int) $stmt->fetchColumn();
  } else {
    $stmt = $conn->prepare("SELECT COALESCE(MAX(ordem), 0) + 1 FROM produtos WHERE categoria_id = ? AND loja_id = ?");
    $stmt->execute([$categoria, $lojaId]);
    $novaOrdem = (int) $stmt->fetchColumn();
  }

}

$campos = ['nome', 'preco', 'categoria_id', 'ativo', 'loja_id'];
$values = [$nome, $preco, $categoria, $ativo, $lojaId];
$imagemSalva = null;

if ($temCodigo) {
  $campos[] = 'codigo';
  $values[] = $codigo;
}
if ($temDescricao) {
  $campos[] = 'descricao';
  $values[] = $descricao;
}
if ($temPrecoPromocional) {
  $campos[] = 'preco_promocional';
  $values[] = $precoPromocional;
}
if ($temPromoDesativado) {
  $campos[] = 'promo_desativado';
  $values[] = $promoDesativado ? 1 : 0;
}
if ($temVariacoesCol) {
  $campos[] = 'tem_variacoes';
  $values[] = $temVariacoes ? 1 : 0;
}
if ($temCatalogo) {
  $campos[] = 'disponivel_catalogo';
  $values[] = $dispCatalogo ? 1 : 0;
}
if ($temMesa) {
  $campos[] = 'disponivel_mesa';
  $values[] = $dispMesa ? 1 : 0;
}
if ($temPontosGanho) {
  $campos[] = 'pontos_ganho';
  $values[] = max(0, $pontosGanho);
}
if ($temPontosCusto) {
  $campos[] = 'pontos_custo';
  $values[] = max(0, $pontosCusto);
}
if ($temApenasAgendamento) {
  $campos[] = 'apenas_agendamento';
  $values[] = $apenasAgendamento ? 1 : 0;
}
if ($temQuantidadeMinima) {
  $campos[] = 'quantidade_minima';
  $values[] = $quantidadeMinima;
}
if ($temDiasSemana) {
  $campos[] = 'dias_semana';
  $values[] = $diasSemana;
}
if ($temHorarioIni) {
  $campos[] = 'horario_ini';
  $values[] = $horarioIni;
}
if ($temHorarioFim) {
  $campos[] = 'horario_fim';
  $values[] = $horarioFim;
}
if ($temDataFabricacao) {
  $campos[] = 'data_fabricacao';
  $values[] = $dataFabricacao;
}
if ($temDataValidade) {
  $campos[] = 'data_validade';
  $values[] = $dataValidade;
}
if ($temOrdem) {
  $campos[] = 'ordem';
  $values[] = $novaOrdem;
}
if ($temImagem && $imagemBase64 !== '') {
  $imagemSalva = salvarImagemProduto($imagemBase64, $lojaId);
  if (!$imagemSalva) {
    echo json_encode(['ok'=>false, 'msg'=>'Imagem invalida.']);
    exit;
  }
  $campos[] = 'imagem';
  $values[] = $imagemSalva;
}

$placeholders = implode(',', array_fill(0, count($campos), '?'));
$stmt = $conn->prepare("
  INSERT INTO produtos (" . implode(',', $campos) . ")
  VALUES ($placeholders)
");
$stmt->execute($values);

$novoId = (int) $conn->lastInsertId();
$variacoesStatus = salvarVariacoes($conn, $novoId, $lojaId, $variacoesJson);
$extrasStatus = salvarExtras($conn, $novoId, $lojaId, $extrasJson);
$complementosItensStatus = salvarComplementosItensProduto($conn, $novoId, $lojaId, $complementosItensJson);
$variacoesCount = 0;
if ($temVariacoes) {
  $decoded = json_decode($variacoesJson, true);
  if (is_array($decoded)) {
    $variacoesCount = count($decoded);
  }
}
$extrasCount = 0;
$decodedExtras = json_decode($extrasJson, true);
if (is_array($decodedExtras)) {
  $extrasCount = count($decodedExtras);
}
bumpCatalogoVersao($conn, $lojaId);
echo json_encode([
  'ok'=>true,
  'action'=>'insert',
  'id' => $novoId,
  'imagem' => $imagemSalva,
  'variacoes_status' => $variacoesStatus,
  'variacoes_count' => $variacoesCount,
  'extras_status' => $extrasStatus,
  'extras_count' => $extrasCount,
  'complementos_itens_status' => $complementosItensStatus
]);
