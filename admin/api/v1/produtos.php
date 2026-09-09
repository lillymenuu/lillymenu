<?php
/*
 * Versao JSON do essencial de admin/produtos.php + admin/api/produtos_save.php
 * + produtos_delete.php + produtos_toggle.php, combinados num unico endpoint
 * REST-ish (GET lista, POST cria/atualiza, DELETE remove, PATCH so troca
 * ativo/inativo). Cobre: nome, preco, categoria, descricao, codigo, imagem,
 * promocao, ativo/inativo, agendamento (apenas_agendamento), quantidade
 * minima, pontos de fidelidade (ganho/custo), disponibilidade por
 * catalogo/mesa e agendamento por dia da semana/horario.
 * Fora do escopo (ficam so no admin/produtos.php por enquanto): variacoes,
 * extras/complementos, combos, vinculo de estoque entre produtos, datas de
 * validade/fabricacao.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';
require_once __DIR__ . '/../../../helpers/storage.php';

header('Content-Type: application/json');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function produtosColunas(PDO $conn): array {
  return $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
}

if ($metodo === 'GET') {
  $colunas = produtosColunas($conn);
  $temOrdem = in_array('ordem', $colunas, true);
  $temPrecoPromocional = in_array('preco_promocional', $colunas, true);
  $temPromoDesativado = in_array('promo_desativado', $colunas, true);
  $temImagem = in_array('imagem', $colunas, true);
  $temCodigo = in_array('codigo', $colunas, true);
  $temDescricao = in_array('descricao', $colunas, true);
  $temApenasAgendamento = in_array('apenas_agendamento', $colunas, true);
  $temQuantidadeMinima = in_array('quantidade_minima', $colunas, true);
  $temPontosGanho = in_array('pontos_ganho', $colunas, true);
  $temPontosCusto = in_array('pontos_custo', $colunas, true);
  $temDisponivelCatalogo = in_array('disponivel_catalogo', $colunas, true);
  $temDisponivelMesa = in_array('disponivel_mesa', $colunas, true);
  $temDiasSemana = in_array('dias_semana', $colunas, true);
  $temHorarioIni = in_array('horario_ini', $colunas, true);
  $temHorarioFim = in_array('horario_fim', $colunas, true);

  $precoExpr = ($temPrecoPromocional && $temPromoDesativado)
    ? "IF(p.promo_desativado = 0 AND p.preco_promocional IS NOT NULL AND p.preco_promocional > 0, p.preco_promocional, p.preco)"
    : "p.preco";

  $selectCampos = [
    'p.id', 'p.nome', 'p.preco AS preco_base', "$precoExpr AS preco",
    'p.ativo', 'p.categoria_id', 'c.nome AS categoria',
    'IFNULL(e.quantidade, 0) AS estoque_quantidade',
  ];
  if ($temPrecoPromocional) $selectCampos[] = 'p.preco_promocional';
  if ($temPromoDesativado) $selectCampos[] = 'p.promo_desativado';
  if ($temImagem) $selectCampos[] = 'p.imagem';
  if ($temCodigo) $selectCampos[] = 'p.codigo';
  if ($temDescricao) $selectCampos[] = 'p.descricao';
  if ($temApenasAgendamento) $selectCampos[] = 'p.apenas_agendamento';
  if ($temQuantidadeMinima) $selectCampos[] = 'p.quantidade_minima';
  if ($temPontosGanho) $selectCampos[] = 'p.pontos_ganho';
  if ($temPontosCusto) $selectCampos[] = 'p.pontos_custo';
  if ($temDisponivelCatalogo) $selectCampos[] = 'p.disponivel_catalogo';
  if ($temDisponivelMesa) $selectCampos[] = 'p.disponivel_mesa';
  if ($temDiasSemana) $selectCampos[] = 'p.dias_semana';
  if ($temHorarioIni) $selectCampos[] = 'p.horario_ini';
  if ($temHorarioFim) $selectCampos[] = 'p.horario_fim';

  $ordenacao = $temOrdem
    ? "ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.ordem IS NULL, p.ordem, p.nome"
    : "ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.nome";

  $stmt = $conn->prepare("
    SELECT " . implode(', ', $selectCampos) . "
    FROM produtos p
    LEFT JOIN categorias c ON c.id = p.categoria_id AND c.loja_id = p.loja_id
    LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
    WHERE p.loja_id = ?
    $ordenacao
  ");
  $stmt->execute([$lojaId]);
  $produtos = array_map(function ($p) {
    $p['id'] = (int) $p['id'];
    $p['preco'] = (float) $p['preco'];
    $p['preco_base'] = (float) $p['preco_base'];
    $p['ativo'] = (int) $p['ativo'];
    $p['categoria_id'] = $p['categoria_id'] !== null ? (int) $p['categoria_id'] : null;
    $p['estoque_quantidade'] = (int) $p['estoque_quantidade'];
    if (isset($p['preco_promocional'])) $p['preco_promocional'] = $p['preco_promocional'] !== null ? (float) $p['preco_promocional'] : null;
    if (isset($p['promo_desativado'])) $p['promo_desativado'] = (int) $p['promo_desativado'];
    if (isset($p['apenas_agendamento'])) $p['apenas_agendamento'] = (int) $p['apenas_agendamento'];
    if (isset($p['quantidade_minima'])) $p['quantidade_minima'] = (int) $p['quantidade_minima'];
    if (isset($p['pontos_ganho'])) $p['pontos_ganho'] = (int) $p['pontos_ganho'];
    if (isset($p['pontos_custo'])) $p['pontos_custo'] = (int) $p['pontos_custo'];
    if (isset($p['disponivel_catalogo'])) $p['disponivel_catalogo'] = (int) $p['disponivel_catalogo'];
    if (isset($p['disponivel_mesa'])) $p['disponivel_mesa'] = (int) $p['disponivel_mesa'];
    if (array_key_exists('dias_semana', $p)) {
      $decoded = $p['dias_semana'] ? json_decode($p['dias_semana'], true) : [];
      $p['dias_semana'] = is_array($decoded) ? $decoded : [];
    }
    return $p;
  }, $stmt->fetchAll(PDO::FETCH_ASSOC));

  echo json_encode(['ok' => true, 'produtos' => $produtos]);
  exit;
}

if ($metodo === 'PATCH') {
  $dados = json_decode(file_get_contents('php://input'), true) ?: [];
  $id = (int) ($dados['id'] ?? 0);
  $ativo = isset($dados['ativo']) ? (int) $dados['ativo'] : null;
  if ($id <= 0 || ($ativo !== 0 && $ativo !== 1)) {
    echo json_encode(['ok' => false, 'msg' => 'Dados invalidos.']);
    exit;
  }
  $conn->prepare("UPDATE produtos SET ativo = ? WHERE id = ? AND loja_id = ?")->execute([$ativo, $id, $lojaId]);
  bumpCatalogoVersao($conn, $lojaId);
  echo json_encode(['ok' => true]);
  exit;
}

if ($metodo === 'DELETE') {
  $dados = json_decode(file_get_contents('php://input'), true) ?: [];
  $id = (int) ($dados['id'] ?? 0);
  if ($id <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'ID invalido.']);
    exit;
  }
  try {
    $colunas = produtosColunas($conn);
    $imagem = null;
    if (in_array('imagem', $colunas, true)) {
      $stmt = $conn->prepare("SELECT imagem FROM produtos WHERE id = ? AND loja_id = ? LIMIT 1");
      $stmt->execute([$id, $lojaId]);
      $imagem = $stmt->fetchColumn() ?: null;
    }
    $conn->prepare("DELETE FROM produtos WHERE id = ? AND loja_id = ?")->execute([$id, $lojaId]);
    storage_delete($imagem);
    bumpCatalogoVersao($conn, $lojaId);
    echo json_encode(['ok' => true]);
  } catch (Exception $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro ao excluir.']);
  }
  exit;
}

if ($metodo === 'POST') {
  $dados = json_decode(file_get_contents('php://input'), true) ?: [];

  $id          = (string) ($dados['id'] ?? '');
  $nome        = trim((string) ($dados['nome'] ?? ''));
  $preco       = (float) ($dados['preco'] ?? 0);
  $categoria   = $dados['categoria_id'] ?? null;
  $categoria   = ($categoria !== null && $categoria !== '') ? (int) $categoria : null;
  $codigo      = trim((string) ($dados['codigo'] ?? ''));
  $descricao   = trim((string) ($dados['descricao'] ?? ''));
  $precoPromoRaw = $dados['preco_promocional'] ?? '';
  $promoDesativado = !empty($dados['promo_desativado']) ? 1 : 0;
  $ativo       = !empty($dados['ativo']) ? 1 : 0;
  $imagemBase64  = trim((string) ($dados['imagem_base64'] ?? ''));
  $imagemRemover = !empty($dados['imagem_remover']);
  $apenasAgendamento = !empty($dados['apenas_agendamento']) ? 1 : 0;
  $quantidadeMinima  = max(0, (int) ($dados['quantidade_minima'] ?? 0));
  $pontosGanho = max(0, (int) ($dados['pontos_ganho'] ?? 0));
  $pontosCusto = max(0, (int) ($dados['pontos_custo'] ?? 0));
  $disponivelCatalogo = !empty($dados['disponivel_catalogo']) ? 1 : 0;
  $disponivelMesa = !empty($dados['disponivel_mesa']) ? 1 : 0;
  $diasSemanaArr = is_array($dados['dias_semana'] ?? null) ? $dados['dias_semana'] : [];
  $diasSemanaJson = $diasSemanaArr ? json_encode(array_values($diasSemanaArr)) : null;
  $horarioIni = trim((string) ($dados['horario_ini'] ?? '')) ?: null;
  $horarioFim = trim((string) ($dados['horario_fim'] ?? '')) ?: null;

  if ($nome === '') {
    echo json_encode(['ok' => false, 'msg' => 'Informe o nome do produto.']);
    exit;
  }
  if ($preco <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'Informe um preco valido.']);
    exit;
  }

  $codigo = $codigo !== '' ? $codigo : null;
  $descricao = $descricao !== '' ? $descricao : null;
  $precoPromocional = ($precoPromoRaw !== '' && $precoPromoRaw !== null) ? (float) $precoPromoRaw : null;

  $colunas = produtosColunas($conn);
  $temCodigo = in_array('codigo', $colunas, true);
  $temDescricao = in_array('descricao', $colunas, true);
  $temPrecoPromocional = in_array('preco_promocional', $colunas, true);
  $temPromoDesativado = in_array('promo_desativado', $colunas, true);
  $temOrdem = in_array('ordem', $colunas, true);
  $temImagem = in_array('imagem', $colunas, true);
  $temApenasAgendamento = in_array('apenas_agendamento', $colunas, true);
  $temQuantidadeMinima = in_array('quantidade_minima', $colunas, true);
  $temPontosGanho = in_array('pontos_ganho', $colunas, true);
  $temPontosCusto = in_array('pontos_custo', $colunas, true);
  $temDisponivelCatalogo = in_array('disponivel_catalogo', $colunas, true);
  $temDisponivelMesa = in_array('disponivel_mesa', $colunas, true);
  $temDiasSemana = in_array('dias_semana', $colunas, true);
  $temHorarioIni = in_array('horario_ini', $colunas, true);
  $temHorarioFim = in_array('horario_fim', $colunas, true);

  if ($id !== '' && (int) $id > 0) {
    $idInt = (int) $id;
    $imagemAtual = null;
    if ($temImagem) {
      $stmt = $conn->prepare("SELECT imagem FROM produtos WHERE id = ? AND loja_id = ? LIMIT 1");
      $stmt->execute([$idInt, $lojaId]);
      $imagemAtual = $stmt->fetchColumn() ?: null;
    }

    $campos = ['nome' => $nome, 'preco' => $preco, 'categoria_id' => $categoria, 'ativo' => $ativo];
    if ($temCodigo) $campos['codigo'] = $codigo;
    if ($temDescricao) $campos['descricao'] = $descricao;
    if ($temPrecoPromocional) $campos['preco_promocional'] = $precoPromocional;
    if ($temPromoDesativado) $campos['promo_desativado'] = $promoDesativado;
    if ($temApenasAgendamento) $campos['apenas_agendamento'] = $apenasAgendamento;
    if ($temQuantidadeMinima) $campos['quantidade_minima'] = $quantidadeMinima;
    if ($temPontosGanho) $campos['pontos_ganho'] = $pontosGanho;
    if ($temPontosCusto) $campos['pontos_custo'] = $pontosCusto;
    if ($temDisponivelCatalogo) $campos['disponivel_catalogo'] = $disponivelCatalogo;
    if ($temDisponivelMesa) $campos['disponivel_mesa'] = $disponivelMesa;
    if ($temDiasSemana) $campos['dias_semana'] = $diasSemanaJson;
    if ($temHorarioIni) $campos['horario_ini'] = $horarioIni;
    if ($temHorarioFim) $campos['horario_fim'] = $horarioFim;
    if ($temImagem) {
      if ($imagemRemover) {
        $campos['imagem'] = null;
        storage_delete($imagemAtual);
        $imagemAtual = null;
      } elseif ($imagemBase64 !== '') {
        $novaImagem = storage_save_base64($imagemBase64, 'produtos', 'produto', $lojaId);
        if (!$novaImagem) {
          echo json_encode(['ok' => false, 'msg' => 'Imagem invalida.']);
          exit;
        }
        $campos['imagem'] = $novaImagem;
        storage_delete($imagemAtual);
        $imagemAtual = $novaImagem;
      }
    }

    $setParts = [];
    $values = [];
    foreach ($campos as $col => $value) {
      $setParts[] = "$col = ?";
      $values[] = $value;
    }
    $values[] = $idInt;
    $values[] = $lojaId;
    $conn->prepare("UPDATE produtos SET " . implode(', ', $setParts) . " WHERE id = ? AND loja_id = ? LIMIT 1")->execute($values);

    bumpCatalogoVersao($conn, $lojaId);
    echo json_encode(['ok' => true, 'action' => 'update', 'id' => $idInt, 'imagem' => $imagemAtual]);
    exit;
  }

  $novaOrdem = 0;
  if ($temOrdem) {
    if ($categoria === null) {
      $stmt = $conn->prepare("SELECT COALESCE(MAX(ordem), 0) + 1 FROM produtos WHERE categoria_id IS NULL AND loja_id = ?");
      $stmt->execute([$lojaId]);
    } else {
      $stmt = $conn->prepare("SELECT COALESCE(MAX(ordem), 0) + 1 FROM produtos WHERE categoria_id = ? AND loja_id = ?");
      $stmt->execute([$categoria, $lojaId]);
    }
    $novaOrdem = (int) $stmt->fetchColumn();
  }

  $campos = ['nome', 'preco', 'categoria_id', 'ativo', 'loja_id'];
  $values = [$nome, $preco, $categoria, $ativo, $lojaId];
  $imagemSalva = null;

  if ($temCodigo) { $campos[] = 'codigo'; $values[] = $codigo; }
  if ($temDescricao) { $campos[] = 'descricao'; $values[] = $descricao; }
  if ($temPrecoPromocional) { $campos[] = 'preco_promocional'; $values[] = $precoPromocional; }
  if ($temPromoDesativado) { $campos[] = 'promo_desativado'; $values[] = $promoDesativado; }
  if ($temApenasAgendamento) { $campos[] = 'apenas_agendamento'; $values[] = $apenasAgendamento; }
  if ($temQuantidadeMinima) { $campos[] = 'quantidade_minima'; $values[] = $quantidadeMinima; }
  if ($temPontosGanho) { $campos[] = 'pontos_ganho'; $values[] = $pontosGanho; }
  if ($temPontosCusto) { $campos[] = 'pontos_custo'; $values[] = $pontosCusto; }
  if ($temDisponivelCatalogo) { $campos[] = 'disponivel_catalogo'; $values[] = $disponivelCatalogo; }
  if ($temDisponivelMesa) { $campos[] = 'disponivel_mesa'; $values[] = $disponivelMesa; }
  if ($temDiasSemana) { $campos[] = 'dias_semana'; $values[] = $diasSemanaJson; }
  if ($temHorarioIni) { $campos[] = 'horario_ini'; $values[] = $horarioIni; }
  if ($temHorarioFim) { $campos[] = 'horario_fim'; $values[] = $horarioFim; }
  if ($temOrdem) { $campos[] = 'ordem'; $values[] = $novaOrdem; }
  if ($temImagem && $imagemBase64 !== '') {
    $imagemSalva = storage_save_base64($imagemBase64, 'produtos', 'produto', $lojaId);
    if (!$imagemSalva) {
      echo json_encode(['ok' => false, 'msg' => 'Imagem invalida.']);
      exit;
    }
    $campos[] = 'imagem';
    $values[] = $imagemSalva;
  }

  $placeholders = implode(',', array_fill(0, count($campos), '?'));
  $conn->prepare("INSERT INTO produtos (" . implode(',', $campos) . ") VALUES ($placeholders)")->execute($values);
  $novoId = (int) $conn->lastInsertId();

  bumpCatalogoVersao($conn, $lojaId);
  echo json_encode(['ok' => true, 'action' => 'insert', 'id' => $novoId, 'imagem' => $imagemSalva]);
  exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'msg' => 'Metodo nao permitido.']);
