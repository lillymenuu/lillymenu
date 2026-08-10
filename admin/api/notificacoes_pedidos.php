<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId = (int) ($_SESSION['loja_id'] ?? 0);
$adminId = (int) ($_SESSION['admin_id'] ?? 0);
$perfil = (string) ($_SESSION['admin_perfil'] ?? '');
if ($lojaId <= 0 && $adminId > 0) {
  try {
    $stmtAdmin = $conn->prepare("SELECT loja_id FROM admins WHERE id = ? LIMIT 1");
    $stmtAdmin->execute([$adminId]);
    $lojaId = (int) $stmtAdmin->fetchColumn();
    if ($lojaId > 0) {
      $_SESSION['loja_id'] = $lojaId;
    }
  } catch (Exception $e) {
  }
}
if ($lojaId <= 0 && $perfil === 'superadmin') {
  $lojaParam = (int) ($_GET['loja_id'] ?? 0);
  if ($lojaParam > 0) {
    $lojaId = $lojaParam;
  }
}
if ($lojaId <= 0) {
  echo json_encode([
    'ok' => false,
    'pedidos' => [],
    'motivo' => 'loja_id_vazio',
    'admin_id' => $adminId,
    'perfil' => $perfil
  ]);
  exit;
}

try {
  $stmtTable = $conn->prepare("SHOW TABLES LIKE 'operacao_logs'");
  $stmtTable->execute();
  $temLogs = (bool) $stmtTable->fetchColumn();
  $editados = [];
  if ($temLogs) {
    $colunasLogs = $conn->query("SHOW COLUMNS FROM operacao_logs")->fetchAll(PDO::FETCH_COLUMN, 0);
    $temAcaoLog = in_array('acao', $colunasLogs, true);
    $temDadosLog = in_array('dados', $colunasLogs, true);
    $temLojaLog = in_array('loja_id', $colunasLogs, true);
    $dataColLog = null;
    foreach (['criado_em', 'created_at', 'data', 'data_hora', 'atualizado_em'] as $col) {
      if (in_array($col, $colunasLogs, true)) {
        $dataColLog = $col;
        break;
      }
    }
    if ($temAcaoLog && $temDadosLog) {
      $whereLog = ["acao = 'pedido_editado'"];
      $paramsLog = [];
      if ($dataColLog) {
        $whereLog[] = "DATE({$dataColLog}) = CURDATE()";
      }
      if ($temLojaLog && $lojaId > 0) {
        $whereLog[] = "loja_id = ?";
        $paramsLog[] = $lojaId;
      }
      $stmtLog = $conn->prepare("
        SELECT dados
        FROM operacao_logs
        WHERE " . implode(' AND ', $whereLog)
      );
      $stmtLog->execute($paramsLog);
      foreach ($stmtLog->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (empty($row['dados'])) {
          continue;
        }
        $payload = json_decode((string) $row['dados'], true);
        $novoPedido = (int) ($payload['novo_pedido'] ?? 0);
        if ($novoPedido > 0) {
          $editados[$novoPedido] = true;
        }
      }
    }
  }

  $colunasPedido = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temLojaPedido = in_array('loja_id', $colunasPedido, true);
  $temClienteIdPedido = in_array('cliente_id', $colunasPedido, true);
  $temOrigemPedido = in_array('origem', $colunasPedido, true);
  $selectOrigem = $temOrigemPedido ? "p.origem" : "NULL AS origem";
  $dataColPedido = null;
  foreach (['criado_em', 'created_at', 'data', 'data_pedido', 'criado', 'atualizado_em'] as $col) {
    if (in_array($col, $colunasPedido, true)) {
      $dataColPedido = $col;
      break;
    }
  }
  $codigoCol = null;
  foreach (['codigo', 'codigo_pedido', 'pedido_hash', 'hash', 'pedido_codigo', 'uuid'] as $col) {
    if (in_array($col, $colunasPedido, true)) {
      $codigoCol = $col;
      break;
    }
  }
  $selectCodigo = $codigoCol ? "p.{$codigoCol} AS codigo" : "NULL AS codigo";
  $selectData = $dataColPedido ? "p.{$dataColPedido} AS criado_em" : "NOW() AS criado_em";
  $colunasClientes = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temLojaCliente = in_array('loja_id', $colunasClientes, true);
  $joinClientes = "LEFT JOIN clientes c ON c.id = p.cliente_id";
  if ($temClienteIdPedido && $temLojaPedido && $temLojaCliente) {
    $joinClientes .= " AND c.loja_id = p.loja_id";
  }
  $where = [];
  $params = [];
  if ($temLojaPedido && $lojaId > 0) {
    $where[] = "p.loja_id = ?";
    $params[] = $lojaId;
  }
  if ($dataColPedido) {
    $where[] = "DATE(p.{$dataColPedido}) = CURDATE()";
  }
  $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
  $orderCol = $dataColPedido ? "p.{$dataColPedido}" : "p.id";
  $stmt = $conn->prepare("
    SELECT p.id, {$selectCodigo}, {$selectData}, c.nome AS cliente, p.status, {$selectOrigem}
    FROM pedidos p
    {$joinClientes}
    {$whereSql}
    ORDER BY {$orderCol} DESC, p.id DESC
    LIMIT 50
  ");
  $stmt->execute($params);
  $pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $filtrados = [];
  foreach ($pedidos as $pedido) {
    $pedidoId = (int) ($pedido['id'] ?? 0);
    $pedido['tipo'] = $pedidoId && isset($editados[$pedidoId]) ? 'editado' : 'novo';
    if (empty($pedido['cliente'])) {
      $pedido['cliente'] = 'Cliente';
    }
    $filtrados[] = $pedido;
  }
  echo json_encode(['ok' => true, 'pedidos' => $filtrados]);
} catch (Exception $e) {
  echo json_encode([
    'ok' => false,
    'pedidos' => [],
    'erro' => $e->getMessage()
  ]);
}
