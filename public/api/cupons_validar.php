<?php
session_start();
date_default_timezone_set('America/Fortaleza');
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';
require_once '../../helpers/telefone.php';

$lojaId     = definirLojaIdSessao($conn);
$codigo     = strtoupper(trim($_POST['codigo'] ?? ''));
$subtotal   = (float)($_POST['subtotal']   ?? 0);
$tipoPedido = trim($_POST['tipo']          ?? '');
$taxaEntrega= (float)($_POST['taxa']       ?? 0);
$clienteId  = (int)($_POST['cliente_id']   ?? 0);
$telefone   = trim($_POST['telefone']      ?? '');

if ($codigo === '') {
  echo json_encode(['ok'=>false,'msg'=>'Informe o cupom.']); exit;
}

try {
  /* Verifica existência da tabela */
  $stmt = $conn->prepare("SHOW TABLES LIKE 'cupons'");
  $stmt->execute();
  if (!$stmt->fetchColumn()) {
    echo json_encode(['ok'=>false,'msg'=>'Cupom não encontrado.']); exit;
  }

  $colunas     = $conn->query("SHOW COLUMNS FROM cupons")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temPrimeira = in_array('primeira_compra', $colunas, true);
  $temPublico  = in_array('publico',         $colunas, true);

  $campos = ['id','codigo','tipo','desconto','minimo','quantidade_total','quantidade_usada','ativo'];
  if ($temPrimeira) $campos[] = 'primeira_compra';
  if ($temPublico)  $campos[] = 'publico';

  $stmt = $conn->prepare("
    SELECT " . implode(',', $campos) . "
    FROM cupons
    WHERE codigo = ? AND loja_id = ?
    LIMIT 1
  ");
  $stmt->execute([$codigo, $lojaId]);
  $cupom = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$cupom) {
    echo json_encode(['ok'=>false,'msg'=>'Cupom não encontrado.']); exit;
  }
  if (!(int)$cupom['ativo']) {
    echo json_encode(['ok'=>false,'msg'=>'Cupom indisponível.']); exit;
  }

  $total = (int)$cupom['quantidade_total'];
  $usado = (int)$cupom['quantidade_usada'];
  if ($total > 0 && $usado >= $total) {
    echo json_encode(['ok'=>false,'msg'=>'Cupom esgotado.']); exit;
  }

  $minimo = (float)$cupom['minimo'];
  if ($minimo > 0 && $subtotal < $minimo) {
    echo json_encode(['ok'=>false,'msg'=>"Pedido mínimo de R\$ " . number_format($minimo,2,',','.') . " para este cupom."]); exit;
  }

  $tipo     = $cupom['tipo'] === 'valor' ? 'valor' : ($cupom['tipo'] === 'frete' ? 'frete' : 'percent');
  $desconto = (float)$cupom['desconto'];

  /* Cupom de primeira compra */
  if ($temPrimeira && (int)($cupom['primeira_compra'] ?? 0) === 1) {
    /* resolve o cliente pelo telefone quando não há cliente_id autenticado
       (fluxo padrão da loja pública, onde o cliente só se identifica por nome+telefone) */
    $clienteResolvidoId = $clienteId;
    $telDigits = apenasDigitosTel($telefone);
    if ($clienteResolvidoId <= 0 && strlen($telDigits) >= 8) {
      $strip = sqlTelStrip('telefone');
      $stmtT = $conn->prepare("SELECT id FROM clientes WHERE loja_id=? AND ({$strip}=? OR telefone=?) LIMIT 1");
      $stmtT->execute([$lojaId, $telDigits, formatarTelefoneBR($telefone)]);
      $clienteResolvidoId = (int)$stmtT->fetchColumn();
    }

    if ($clienteResolvidoId <= 0 && strlen($telDigits) < 8) {
      echo json_encode(['ok'=>false,'msg'=>'Informe seu nome e contato para usar este cupom.']); exit;
    }

    if ($clienteResolvidoId > 0) {
      $stmtC = $conn->prepare("SELECT COUNT(*) FROM pedidos WHERE cliente_id=? AND loja_id=?");
      $stmtC->execute([$clienteResolvidoId, $lojaId]);
      if ((int)$stmtC->fetchColumn() > 0) {
        echo json_encode(['ok'=>false,'msg'=>'Cupom válido apenas para a primeira compra.']); exit;
      }
    }
    /* telefone válido mas sem cadastro de cliente -> nunca fez pedido, é elegível */
  }

  /* Cupom de frete — valida somente se tipo de pedido informado e for retirada */
  if ($tipo === 'frete') {
    if ($tipoPedido !== '' && $tipoPedido !== 'entrega' && $tipoPedido !== 'entrega_agendada') {
      echo json_encode(['ok'=>false,'msg'=>'Cupom válido apenas para entregas.']); exit;
    }
    $valorAplicado = max(0, $taxaEntrega);
  } else {
    $valorAplicado = $tipo === 'percent'
      ? round($subtotal * ($desconto / 100), 2)
      : $desconto;
  }

  echo json_encode([
    'ok'      => true,
    'codigo'  => $cupom['codigo'],
    'tipo'    => $tipo,
    'desconto'=> $desconto,
    'valor'   => round($valorAplicado, 2),
    'primeira_compra' => $temPrimeira ? (int)($cupom['primeira_compra'] ?? 0) : 0,
    'publico' => $temPublico  ? (int)($cupom['publico'] ?? 0) : 0,
    'msg'     => 'Cupom aplicado.',
  ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  echo json_encode(['ok'=>false,'msg'=>'Erro ao validar cupom.']);
}
