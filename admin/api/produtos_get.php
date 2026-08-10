<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = (int) ($_GET['id'] ?? 0);

$colunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temCodigo = in_array('codigo', $colunas, true);
$temDescricao = in_array('descricao', $colunas, true);
$temPrecoPromocional = in_array('preco_promocional', $colunas, true);
$temPromoDesativado = in_array('promo_desativado', $colunas, true);
$temVariacoes = in_array('tem_variacoes', $colunas, true);
$temCatalogo = in_array('disponivel_catalogo', $colunas, true);
$temMesa = in_array('disponivel_mesa', $colunas, true);
$temImagem = in_array('imagem', $colunas, true);
$temPontosGanho = in_array('pontos_ganho', $colunas, true);
$temPontosCusto = in_array('pontos_custo', $colunas, true);
$temApenasAgendamento = in_array('apenas_agendamento', $colunas, true);
$temQuantidadeMinima  = in_array('quantidade_minima', $colunas, true);
$temDiasSemana  = in_array('dias_semana', $colunas, true);
$temHorarioIni  = in_array('horario_ini', $colunas, true);
$temHorarioFim  = in_array('horario_fim', $colunas, true);
$temDataFabricacao = in_array('data_fabricacao', $colunas, true);
$temDataValidade   = in_array('data_validade', $colunas, true);

$temVariacoesTabela = false;
try {
  $stmtTab = $conn->prepare("SHOW TABLES LIKE ?");
  $stmtTab->execute(['produto_variacoes']);
  $temVariacoesTabela = (bool) $stmtTab->fetchColumn();
} catch (Exception $e) {
  $temVariacoesTabela = false;
}

$temExtrasTabela = false;
try {
  $stmtTab = $conn->prepare("SHOW TABLES LIKE ?");
  $stmtTab->execute(['produto_extras']);
  $temExtrasTabela = (bool) $stmtTab->fetchColumn();
} catch (Exception $e) {
  $temExtrasTabela = false;
}

$campos = ['p.id', 'p.nome', 'p.preco', 'p.categoria_id', 'p.ativo'];
if ($temCodigo) {
  $campos[] = 'p.codigo';
}
if ($temDescricao) {
  $campos[] = 'p.descricao';
}
if ($temPrecoPromocional) {
  $campos[] = 'p.preco_promocional';
}
if ($temPromoDesativado) {
  $campos[] = 'p.promo_desativado';
}
if ($temVariacoes) {
  $campos[] = 'p.tem_variacoes';
}
if ($temCatalogo) {
  $campos[] = 'p.disponivel_catalogo';
}
if ($temMesa) {
  $campos[] = 'p.disponivel_mesa';
}
if ($temImagem) {
  $campos[] = 'p.imagem';
}
if ($temPontosGanho) {
  $campos[] = 'p.pontos_ganho';
}
if ($temPontosCusto) {
  $campos[] = 'p.pontos_custo';
}
if ($temApenasAgendamento) {
  $campos[] = 'p.apenas_agendamento';
}
if ($temQuantidadeMinima) {
  $campos[] = 'p.quantidade_minima';
}
if ($temDiasSemana) {
  $campos[] = 'p.dias_semana';
}
if ($temHorarioIni) {
  $campos[] = 'p.horario_ini';
}
if ($temHorarioFim) {
  $campos[] = 'p.horario_fim';
}
if ($temDataFabricacao) {
  $campos[] = 'p.data_fabricacao';
}
if ($temDataValidade) {
  $campos[] = 'p.data_validade';
}

$stmt = $conn->prepare("
  SELECT " . implode(',', $campos) . ",
         IFNULL(e.quantidade, 0) AS estoque_quantidade
  FROM produtos p
  LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
  WHERE p.id = ? AND p.loja_id = ?
");
$stmt->execute([$id, $lojaId]);
$produto = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

if ($temVariacoesTabela && !empty($produto)) {
  $stmtVar = $conn->prepare("
    SELECT id, tamanho, cor, preco, ordem
    FROM produto_variacoes
    WHERE produto_id = ? AND loja_id = ?
    ORDER BY ordem, id
  ");
  $stmtVar->execute([$id, $lojaId]);
  $produto['variacoes'] = $stmtVar->fetchAll(PDO::FETCH_ASSOC);
}

if ($temExtrasTabela && !empty($produto)) {
  $stmtExt = $conn->prepare("
    SELECT id, nome, preco, obrigatorio, ordem
    FROM produto_extras
    WHERE produto_id = ? AND ativo = 1 AND loja_id = ?
    ORDER BY ordem, id
  ");
  $stmtExt->execute([$id, $lojaId]);
  $produto['extras'] = $stmtExt->fetchAll(PDO::FETCH_ASSOC);
}

$temComplementosItensTabela = false;
try {
  $stmtTab = $conn->prepare("SHOW TABLES LIKE ?");
  $stmtTab->execute(['produto_complementos_itens']);
  $temComplementosItensTabela = (bool) $stmtTab->fetchColumn();
} catch (Exception $e) {
  $temComplementosItensTabela = false;
}

if ($temComplementosItensTabela && !empty($produto)) {
  $stmtCompItens = $conn->prepare("
    SELECT id, nome, preco, obrigatorio, ordem
    FROM produto_complementos_itens
    WHERE produto_id = ? AND ativo = 1 AND loja_id = ?
    ORDER BY ordem, id
  ");
  $stmtCompItens->execute([$id, $lojaId]);
  $produto['complementos_itens'] = $stmtCompItens->fetchAll(PDO::FETCH_ASSOC);
}

echo json_encode($produto);
