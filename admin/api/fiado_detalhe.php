<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$clienteId = (int) ($_GET['cliente_id'] ?? 0);
$pagina = max(1, (int) ($_GET['pagina'] ?? 1));
$limite = 5;
$offset = ($pagina - 1) * $limite;

if ($clienteId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Cliente invalido.']);
  exit;
}

try {
  $cols = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
  $selectSaldo = in_array('saldo_fiado', $cols, true) ? 'saldo_fiado' : '0 AS saldo_fiado';

  $stmtCliente = $conn->prepare("SELECT id, nome, telefone, $selectSaldo FROM clientes WHERE id = ? AND loja_id = ?");
  $stmtCliente->execute([$clienteId, $lojaId]);
  $cliente = $stmtCliente->fetch(PDO::FETCH_ASSOC);
  if (!$cliente) {
    echo json_encode(['ok' => false, 'msg' => 'Cliente nao encontrado.']);
    exit;
  }

  $lancamentos = [];
  $total = 0;
  $paginas = 1;
  $temTabela = (bool) $conn->query("SHOW TABLES LIKE 'fiado_lancamentos'")->fetchColumn();
  if ($temTabela) {
    $lancColunas = $conn->query("SHOW COLUMNS FROM fiado_lancamentos")->fetchAll(PDO::FETCH_COLUMN, 0);
    $temOperador = in_array('operador_id', $lancColunas, true);
    $temForma = in_array('forma_pagamento', $lancColunas, true);
    $selectOperador = $temOperador ? "a.nome" : "NULL";
    $selectForma = $temForma ? "f.forma_pagamento" : "NULL";
    $joinOperador = $temOperador ? "LEFT JOIN admins a ON a.id = f.operador_id" : "";

    $pedidoColunas = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
    $temCodigo = in_array('codigo', $pedidoColunas, true);
    $selectCodigo = $temCodigo ? "COALESCE(NULLIF(p.codigo, ''), p.id)" : "p.id";

    $stmtTotal = $conn->prepare("SELECT COUNT(*) FROM fiado_lancamentos WHERE cliente_id = ? AND loja_id = ?");
    $stmtTotal->execute([$clienteId, $lojaId]);
    $total = (int) $stmtTotal->fetchColumn();
    $paginas = max(1, (int) ceil($total / $limite));
    if ($pagina > $paginas) {
      $pagina = $paginas;
      $offset = ($pagina - 1) * $limite;
    }

    $stmt = $conn->prepare("
      SELECT f.id, f.tipo, f.valor, f.saldo_antes, f.saldo_depois, f.observacao, f.criado_em,
             f.pedido_id, $selectCodigo AS pedido_codigo,
             $selectForma AS forma_pagamento, $selectOperador AS operador_nome
      FROM fiado_lancamentos f
      LEFT JOIN pedidos p ON p.id = f.pedido_id AND p.loja_id = f.loja_id
      $joinOperador
      WHERE f.cliente_id = ? AND f.loja_id = ?
      ORDER BY f.id DESC
      LIMIT $limite OFFSET $offset
    ");
    $stmt->execute([$clienteId, $lojaId]);
    $lancamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  echo json_encode([
    'ok' => true,
    'cliente' => [
      'id' => (int) $cliente['id'],
      'nome' => $cliente['nome'],
      'telefone' => $cliente['telefone'],
      'saldo_fiado' => (float) $cliente['saldo_fiado']
    ],
    'lancamentos' => $lancamentos,
    'pagina' => $pagina,
    'paginas' => $paginas,
    'total' => $total
  ]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao carregar detalhes do cliente.']);
}
