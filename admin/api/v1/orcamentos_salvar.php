<?php
/*
 * Cria ou atualiza (id presente no corpo decide qual) um orcamento salvo
 * (tela Quotes) + seus itens. Endpoint novo (feature sem persistencia no
 * legado). subtotal/total sempre recalculados no servidor a partir dos
 * itens enviados — nunca confia no total calculado no cliente (mesmo
 * principio ja aplicado em pdv_salvar.php/cupons).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$adminId = (int) ($auth['admin_id'] ?? 0);

$dados = json_decode(file_get_contents('php://input'), true) ?: [];

$id = (int) ($dados['id'] ?? 0);
$clienteNome = trim((string) ($dados['cliente_nome'] ?? ''));
$clienteTipoDocumento = (string) ($dados['cliente_tipo_documento'] ?? 'fisica');
$clienteDocumento = trim((string) ($dados['cliente_documento'] ?? ''));
$clienteWhatsapp = trim((string) ($dados['cliente_whatsapp'] ?? ''));
$clienteEndereco = trim((string) ($dados['cliente_endereco'] ?? ''));
$descontoTipo = (string) ($dados['desconto_tipo'] ?? 'valor');
$descontoValor = (float) ($dados['desconto_valor'] ?? 0);
$itensEntrada = is_array($dados['itens'] ?? null) ? $dados['itens'] : [];

if ($clienteNome === '') {
  echo json_encode(['ok' => false, 'msg' => 'Nome do cliente é obrigatório.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if (!in_array($clienteTipoDocumento, ['fisica', 'juridica'], true)) {
  $clienteTipoDocumento = 'fisica';
}
if (!in_array($descontoTipo, ['valor', 'percent'], true)) {
  $descontoTipo = 'valor';
}
if ($descontoValor < 0) {
  $descontoValor = 0;
}

$itens = [];
foreach ($itensEntrada as $item) {
  $nome = trim((string) ($item['nome'] ?? ''));
  $qtd = (int) ($item['qtd'] ?? 0);
  $preco = (float) ($item['preco'] ?? 0);
  if ($nome === '' || $qtd <= 0) {
    continue;
  }
  $itens[] = [
    'produto_id' => !empty($item['produto_id']) ? (int) $item['produto_id'] : null,
    'nome' => $nome,
    'preco' => $preco,
    'qtd' => $qtd,
    'observacoes' => trim((string) ($item['observacoes'] ?? '')) ?: null,
  ];
}

if (count($itens) === 0) {
  echo json_encode(['ok' => false, 'msg' => 'Adicione ao menos um item.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$subtotal = 0;
foreach ($itens as $item) {
  $subtotal += $item['preco'] * $item['qtd'];
}
$descontoAplicado = $descontoTipo === 'percent' ? ($subtotal * $descontoValor / 100) : $descontoValor;
$total = max(0, $subtotal - $descontoAplicado);

if ($id > 0) {
  $stmt = $conn->prepare("SELECT id FROM orcamentos WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$id, $lojaId]);
  if (!$stmt->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Orçamento não encontrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }

  $conn->beginTransaction();
  try {
    $stmt = $conn->prepare("
      UPDATE orcamentos
      SET cliente_nome = ?, cliente_tipo_documento = ?, cliente_documento = ?, cliente_whatsapp = ?,
          cliente_endereco = ?, desconto_tipo = ?, desconto_valor = ?, subtotal = ?, total = ?, atualizado_em = NOW()
      WHERE id = ? AND loja_id = ?
    ");
    $stmt->execute([
      $clienteNome, $clienteTipoDocumento, $clienteDocumento ?: null, $clienteWhatsapp ?: null,
      $clienteEndereco ?: null, $descontoTipo, $descontoValor, $subtotal, $total, $id, $lojaId,
    ]);

    $conn->prepare("DELETE FROM orcamento_itens WHERE orcamento_id = ?")->execute([$id]);
    $stmtItem = $conn->prepare("
      INSERT INTO orcamento_itens (orcamento_id, produto_id, nome, preco, qtd, observacoes)
      VALUES (?, ?, ?, ?, ?, ?)
    ");
    foreach ($itens as $item) {
      $stmtItem->execute([$id, $item['produto_id'], $item['nome'], $item['preco'], $item['qtd'], $item['observacoes']]);
    }

    $conn->commit();
  } catch (Exception $e) {
    $conn->rollBack();
    echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar o orçamento.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }

  echo json_encode(['ok' => true, 'msg' => 'Orçamento atualizado.', 'id' => $id], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$conn->beginTransaction();
try {
  $stmt = $conn->prepare("
    INSERT INTO orcamentos (
      loja_id, status, cliente_nome, cliente_tipo_documento, cliente_documento, cliente_whatsapp,
      cliente_endereco, desconto_tipo, desconto_valor, subtotal, total, admin_id, criado_em
    ) VALUES (?, 'pendente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  ");
  $stmt->execute([
    $lojaId, $clienteNome, $clienteTipoDocumento, $clienteDocumento ?: null, $clienteWhatsapp ?: null,
    $clienteEndereco ?: null, $descontoTipo, $descontoValor, $subtotal, $total, $adminId ?: null,
  ]);
  $novoId = (int) $conn->lastInsertId();

  $stmtItem = $conn->prepare("
    INSERT INTO orcamento_itens (orcamento_id, produto_id, nome, preco, qtd, observacoes)
    VALUES (?, ?, ?, ?, ?, ?)
  ");
  foreach ($itens as $item) {
    $stmtItem->execute([$novoId, $item['produto_id'], $item['nome'], $item['preco'], $item['qtd'], $item['observacoes']]);
  }

  $conn->commit();
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar o orçamento.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

echo json_encode(['ok' => true, 'msg' => 'Orçamento salvo.', 'id' => $novoId], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
