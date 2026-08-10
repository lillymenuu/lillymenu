<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

exigirPerfil(['admin', 'gerente']);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$inicio = trim($_POST['inicio'] ?? '');
$fim = trim($_POST['fim'] ?? '');

if ($inicio === '' || $fim === '') {
  echo json_encode(['ok' => false, 'msg' => 'Informe a data inicial e final.']);
  exit;
}

$inicioObj = DateTime::createFromFormat('Y-m-d', $inicio);
$fimObj = DateTime::createFromFormat('Y-m-d', $fim);
$inicioOk = $inicioObj && $inicioObj->format('Y-m-d') === $inicio;
$fimOk = $fimObj && $fimObj->format('Y-m-d') === $fim;

if (!$inicioOk || !$fimOk) {
  echo json_encode(['ok' => false, 'msg' => 'Datas invalidas.']);
  exit;
}

if ($fimObj < $inicioObj) {
  echo json_encode(['ok' => false, 'msg' => 'A data final deve ser maior ou igual a inicial.']);
  exit;
}

$inicioDt = $inicioObj->format('Y-m-d 00:00:00');
$fimDt = $fimObj->format('Y-m-d 23:59:59');

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

function encontrarColunaData(PDO $conn, string $tabela, array $candidatos): ?string {
  try {
    $cols = $conn->query("SHOW COLUMNS FROM {$tabela}")->fetchAll(PDO::FETCH_COLUMN, 0);
    foreach ($candidatos as $col) {
      if (in_array($col, $cols, true)) {
        return $col;
      }
    }
  } catch (Exception $e) {
    return null;
  }
  return null;
}

$contagem = [
  'pedido_itens' => 0,
  'pedido_pagamentos' => 0,
  'pedidos' => 0,
  'pedido_status_log' => 0,
  'operacao_logs' => 0,
  'caixa_turnos' => 0
];

try {
  $conn->beginTransaction();

  $temPedidos = tabelaExiste($conn, 'pedidos');

  if ($temPedidos && tabelaExiste($conn, 'pedido_pagamentos')) {
    $stmt = $conn->prepare("
      DELETE FROM pedido_pagamentos
      WHERE pedido_id IN (
        SELECT id FROM pedidos WHERE criado_em BETWEEN ? AND ? AND loja_id = ?
      )
    ");
    $stmt->execute([$inicioDt, $fimDt, $lojaId]);
    $contagem['pedido_pagamentos'] = $stmt->rowCount();
  }

  if ($temPedidos && tabelaExiste($conn, 'pedido_itens')) {
    $stmt = $conn->prepare("
      DELETE FROM pedido_itens
      WHERE pedido_id IN (
        SELECT id FROM pedidos WHERE criado_em BETWEEN ? AND ? AND loja_id = ?
      )
    ");
    $stmt->execute([$inicioDt, $fimDt, $lojaId]);
    $contagem['pedido_itens'] = $stmt->rowCount();
  }

  if ($temPedidos && tabelaExiste($conn, 'pedido_status_log')) {
    $stmt = $conn->prepare("
      DELETE FROM pedido_status_log
      WHERE pedido_id IN (
        SELECT id FROM pedidos WHERE criado_em BETWEEN ? AND ? AND loja_id = ?
      ) AND loja_id = ?
    ");
    $stmt->execute([$inicioDt, $fimDt, $lojaId, $lojaId]);
    $contagem['pedido_status_log'] = $stmt->rowCount();
  }

  if ($temPedidos) {
    $stmt = $conn->prepare("DELETE FROM pedidos WHERE criado_em BETWEEN ? AND ? AND loja_id = ?");
    $stmt->execute([$inicioDt, $fimDt, $lojaId]);
    $contagem['pedidos'] = $stmt->rowCount();
  }

  if (tabelaExiste($conn, 'operacao_logs')) {
    $coluna = encontrarColunaData($conn, 'operacao_logs', [
      'criado_em',
      'created_at',
      'data',
      'data_hora',
      'registrado_em',
      'data_criacao'
    ]);
    if ($coluna) {
      $stmt = $conn->prepare("DELETE FROM operacao_logs WHERE {$coluna} BETWEEN ? AND ? AND loja_id = ?");
      $stmt->execute([$inicioDt, $fimDt, $lojaId]);
      $contagem['operacao_logs'] = $stmt->rowCount();
    }
  }

  if (tabelaExiste($conn, 'caixa_turnos')) {
    $abertoCol = encontrarColunaData($conn, 'caixa_turnos', ['aberto_em', 'criado_em', 'created_at']);
    $fechadoCol = encontrarColunaData($conn, 'caixa_turnos', ['fechado_em', 'data_fechamento']);

    if ($abertoCol && $fechadoCol) {
      $stmt = $conn->prepare("
        DELETE FROM caixa_turnos
        WHERE (({$abertoCol} BETWEEN ? AND ?) OR ({$fechadoCol} BETWEEN ? AND ?))
          AND loja_id = ?
      ");
      $stmt->execute([$inicioDt, $fimDt, $inicioDt, $fimDt, $lojaId]);
      $contagem['caixa_turnos'] = $stmt->rowCount();
    } elseif ($abertoCol) {
      $stmt = $conn->prepare("DELETE FROM caixa_turnos WHERE {$abertoCol} BETWEEN ? AND ? AND loja_id = ?");
      $stmt->execute([$inicioDt, $fimDt, $lojaId]);
      $contagem['caixa_turnos'] = $stmt->rowCount();
    } elseif ($fechadoCol) {
      $stmt = $conn->prepare("DELETE FROM caixa_turnos WHERE {$fechadoCol} BETWEEN ? AND ? AND loja_id = ?");
      $stmt->execute([$inicioDt, $fimDt, $lojaId]);
      $contagem['caixa_turnos'] = $stmt->rowCount();
    }
  }

  $conn->commit();

  registrarOperacao($conn, 'limpar_banco', null, [
    'inicio' => $inicio,
    'fim' => $fim,
    'contagem' => $contagem
  ]);

  $msg = sprintf(
    'Limpeza concluida. Pedidos: %d, Itens: %d, Pagamentos: %d, Logs: %d, Operacoes: %d, Caixas: %d.',
    $contagem['pedidos'],
    $contagem['pedido_itens'],
    $contagem['pedido_pagamentos'],
    $contagem['pedido_status_log'],
    $contagem['operacao_logs'],
    $contagem['caixa_turnos']
  );

  echo json_encode(['ok' => true, 'msg' => $msg]);
  exit;
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao limpar banco.']);
  exit;
}
