<?php
/*
 * Detalhe completo de um orcamento salvo (tela Quotes) — usado pra
 * reabrir no form de edicao e pra montar o PDF. Endpoint novo (feature
 * sem persistencia no legado).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Orçamento inválido.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmt = $conn->prepare("SELECT * FROM orcamentos WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$id, $lojaId]);
$orcamento = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$orcamento) {
  echo json_encode(['ok' => false, 'msg' => 'Orçamento não encontrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmtItens = $conn->prepare("SELECT id, produto_id, nome, preco, qtd, observacoes FROM orcamento_itens WHERE orcamento_id = ? ORDER BY id");
$stmtItens->execute([$id]);
$itens = array_map(function ($i) {
  return [
    'id' => (int) $i['id'],
    'produto_id' => $i['produto_id'] !== null ? (int) $i['produto_id'] : null,
    'nome' => $i['nome'],
    'preco' => (float) $i['preco'],
    'qtd' => (int) $i['qtd'],
    'observacoes' => $i['observacoes'],
  ];
}, $stmtItens->fetchAll(PDO::FETCH_ASSOC));

echo json_encode([
  'ok' => true,
  'orcamento' => [
    'id' => (int) $orcamento['id'],
    'status' => $orcamento['status'],
    'cliente_nome' => $orcamento['cliente_nome'],
    'cliente_tipo_documento' => $orcamento['cliente_tipo_documento'],
    'cliente_documento' => $orcamento['cliente_documento'],
    'cliente_whatsapp' => $orcamento['cliente_whatsapp'],
    'cliente_endereco' => $orcamento['cliente_endereco'],
    'desconto_tipo' => $orcamento['desconto_tipo'],
    'desconto_valor' => (float) $orcamento['desconto_valor'],
    'subtotal' => (float) $orcamento['subtotal'],
    'total' => (float) $orcamento['total'],
    'criado_em' => $orcamento['criado_em'],
    'atualizado_em' => $orcamento['atualizado_em'],
  ],
  'itens' => $itens,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
