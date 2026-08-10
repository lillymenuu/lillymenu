<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
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

$lojaId = (int) ($_POST['loja_id'] ?? 0);
if ($lojaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Loja invalida.']);
  exit;
}

try {
  $stmt = $conn->prepare("SELECT COUNT(*) FROM admins WHERE loja_id = ? AND perfil = 'superadmin'");
  $stmt->execute([$lojaId]);
  if ((int) $stmt->fetchColumn() > 0) {
    echo json_encode(['ok' => false, 'msg' => 'Nao e possivel excluir a loja do superadmin.']);
    exit;
  }

  $conn->beginTransaction();

  $adminIds = [];
  $adminEmails = [];
  $lojaNome = '';
  $leadMatches = [];
  if (tabelaExiste($conn, 'admins')) {
    $stmt = $conn->prepare("SELECT id FROM admins WHERE loja_id = ?");
    $stmt->execute([$lojaId]);
    $adminIds = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
    $stmt = $conn->prepare("SELECT email FROM admins WHERE loja_id = ? AND email <> ''");
    $stmt->execute([$lojaId]);
    $adminEmails = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
  }

  if (tabelaExiste($conn, 'lojas')) {
    $stmt = $conn->prepare("SELECT nome FROM lojas WHERE id = ? LIMIT 1");
    $stmt->execute([$lojaId]);
    $lojaNome = (string) ($stmt->fetchColumn() ?: '');
  }

  if (tabelaExiste($conn, 'configuracoes')) {
    $stmt = $conn->prepare("
      SELECT chave, valor
      FROM configuracoes
      WHERE loja_id = ?
        AND chave IN ('loja_email','loja_cnpj','loja_contato','whatsapp_numero','lead_empresa','lead_responsavel','nome_loja')
    ");
    $stmt->execute([$lojaId]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $valor = trim((string) ($row['valor'] ?? ''));
      if ($valor !== '') {
        $leadMatches[] = $valor;
      }
    }
  }

  if ($lojaNome !== '') {
    $leadMatches[] = $lojaNome;
  }
  $leadMatches = array_values(array_unique(array_filter($leadMatches)));

  if ($adminIds && tabelaExiste($conn, 'permissoes_usuarios')) {
    $placeholders = implode(',', array_fill(0, count($adminIds), '?'));
    $stmt = $conn->prepare("DELETE FROM permissoes_usuarios WHERE admin_id IN ($placeholders)");
    $stmt->execute($adminIds);
  }

  if (tabelaExiste($conn, 'leads_lojas')) {
    $conds = [];
    $params = [];
    if ($adminEmails) {
      $placeholders = implode(',', array_fill(0, count($adminEmails), '?'));
      $conds[] = "email IN ($placeholders)";
      $params = array_merge($params, $adminEmails);
    }
    if ($leadMatches) {
      $placeholders = implode(',', array_fill(0, count($leadMatches), '?'));
      $conds[] = "cnpj IN ($placeholders)";
      $conds[] = "whatsapp IN ($placeholders)";
      $conds[] = "empresa IN ($placeholders)";
      $conds[] = "nome IN ($placeholders)";
      $params = array_merge($params, $leadMatches, $leadMatches, $leadMatches, $leadMatches);
    }
    if ($conds) {
      $stmt = $conn->prepare("DELETE FROM leads_lojas WHERE " . implode(' OR ', $conds));
      $stmt->execute($params);
    }
  }

  if (tabelaExiste($conn, 'cobrancas') && tabelaExiste($conn, 'assinaturas')) {
    $stmt = $conn->prepare("
      DELETE FROM cobrancas
      WHERE assinatura_id IN (SELECT id FROM assinaturas WHERE loja_id = ?)
    ");
    $stmt->execute([$lojaId]);
  }
  if (tabelaExiste($conn, 'assinaturas')) {
    $stmt = $conn->prepare("DELETE FROM assinaturas WHERE loja_id = ?");
    $stmt->execute([$lojaId]);
  }

  $tabelas = [
    'admins',
    'configuracoes',
    'categorias',
    'produtos',
    'clientes',
    'pedidos',
    'pedido_itens',
    'pedido_pagamentos',
    'pedido_status_log',
    'estoque',
    'estoque_movimentacoes',
    'cupons',
    'taxas_bairro',
    'taxas_dinamicas',
    'caixa_turnos',
    'caixa_movimentacoes',
    'entrada_saida_lancamentos',
    'entrada_saida_subcategorias',
    'entrada_saida_formas',
    'entrada_saida_categorias',
    'entrada_saida_bancos',
    'materia_prima_cadastros',
    'cashback_movimentacoes',
    'pontos_movimentacoes',
    'produto_variacoes',
    'produto_extras',
    'produto_complementos_itens',
    'complementos_grupos',
    'complementos_itens',
    'complementos_grupos_produtos',
    'complementos_grupos_categorias',
    'operacao_logs'
  ];

  $deleteOrder = [
    'pedido_itens' => 10,
    'pedido_pagamentos' => 11,
    'pedido_status_log' => 12,
    'pedidos' => 20,
    'estoque_movimentacoes' => 30,
    'caixa_movimentacoes' => 31,
    'entrada_saida_lancamentos' => 32,
    'entrada_saida_subcategorias' => 33,
    'entrada_saida_formas' => 34,
    'entrada_saida_categorias' => 35,
    'entrada_saida_bancos' => 36,
    'materia_prima_cadastros' => 39,
    'cashback_movimentacoes' => 37,
    'pontos_movimentacoes' => 38,
    'produto_extras' => 40,
    'produto_variacoes' => 41,
    'produto_complementos_itens' => 42,
    'complementos_itens' => 42,
    'complementos_grupos_produtos' => 43,
    'complementos_grupos_categorias' => 44,
    'complementos_grupos' => 45,
    'produtos' => 50,
    'clientes' => 60,
    'categorias' => 70,
    'estoque' => 80,
    'taxas_bairro' => 90,
    'taxas_dinamicas' => 91,
    'cupons' => 92,
    'caixa_turnos' => 93,
    'operacao_logs' => 94,
    'configuracoes' => 95,
    'admins' => 96
  ];

  $tablesWithLoja = [];
  try {
    $stmt = $conn->prepare("
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND COLUMN_NAME = 'loja_id'
    ");
    $stmt->execute();
    $tablesWithLoja = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
  } catch (Exception $e) {
    $tablesWithLoja = [];
  }

  $tablesWithLojaMap = [];
  if ($tablesWithLoja) {
    $tablesWithLojaMap = array_fill_keys(array_map('strtolower', $tablesWithLoja), true);
    $tabelas = array_values(array_unique(array_merge($tablesWithLoja, $tabelas)));
  }

  $skipTables = ['lojas', 'assinaturas', 'cobrancas'];

  usort($tabelas, function ($a, $b) use ($deleteOrder) {
    $pa = $deleteOrder[$a] ?? 1000;
    $pb = $deleteOrder[$b] ?? 1000;
    if ($pa === $pb) {
      return strcmp($a, $b);
    }
    return $pa <=> $pb;
  });

  foreach ($tabelas as $tabela) {
    if (in_array($tabela, $skipTables, true)) {
      continue;
    }
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $tabela)) {
      continue;
    }
    if ($tablesWithLojaMap && !isset($tablesWithLojaMap[strtolower($tabela)])) {
      continue;
    }
    if (!tabelaExiste($conn, $tabela)) {
      continue;
    }
    $stmt = $conn->prepare("DELETE FROM `{$tabela}` WHERE loja_id = ?");
    $stmt->execute([$lojaId]);
  }

  if (tabelaExiste($conn, 'lojas')) {
    $stmt = $conn->prepare("DELETE FROM lojas WHERE id = ?");
    $stmt->execute([$lojaId]);
  }

  $conn->commit();
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  if ($conn->inTransaction()) {
    $conn->rollBack();
  }
  $msg = 'Erro ao excluir loja.';
  if (($_SESSION['admin_perfil'] ?? '') === 'superadmin') {
    $msg .= ' ' . $e->getMessage();
  }
  echo json_encode(['ok' => false, 'msg' => $msg]);
}
