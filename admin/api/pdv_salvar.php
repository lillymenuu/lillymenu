<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/config.php';
require_once __DIR__ . '/../helpers/financial_module.php';
require_once __DIR__ . '/../helpers/offline_module.php';
require_once __DIR__ . '/../helpers/cashback_module.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';
require_once __DIR__ . '/../../services/SaleFinancialIntegrationService.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
offlineEnsureModule($conn);
cashbackEnsureModule($conn);
try {
  $colOrigem = $conn->query("SHOW COLUMNS FROM pedidos LIKE 'origem'")->fetch(PDO::FETCH_ASSOC);
  if (!$colOrigem) {
    $conn->exec("ALTER TABLE pedidos ADD COLUMN origem VARCHAR(20) NULL AFTER status");
  }
} catch (Exception $e) {
}

function toFloat($value) {
  if ($value === null || $value === '') {
    return 0.0;
  }
  return (float) $value;
}

function extrairBairroEndereco(?string $endereco): string {
  if (!$endereco) return '';
  if (preg_match('/Bairro:\\s*([^|]+)/i', $endereco, $match)) {
    return trim($match[1]);
  }
  return '';
}

function calcularTaxaDinamica(float $distancia, array $regras): float {
  if (!$regras) return 0.0;
  usort($regras, function($a, $b){
    return ($a['distancia_km'] ?? 0) <=> ($b['distancia_km'] ?? 0);
  });
  if ($distancia <= 0) {
    return 0.0;
  }
  $regra = null;
  foreach ($regras as $item) {
    if ($distancia <= (float) $item['distancia_km']) {
      $regra = $item;
      break;
    }
  }
  if (!$regra) {
    $regra = end($regras);
  }
  if (!$regra) return 0.0;
  $valor = (float) ($regra['valor'] ?? 0);
  return $valor < 0 ? 0.0 : $valor;
}

function statusPermitido(PDO $conn, $tabela, $statusPreferido, $statusFallback = 'pendente') {
  try {
    $stmt = $conn->query("SHOW COLUMNS FROM {$tabela} LIKE 'status'");
    $col = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : null;
    if (!$col || empty($col['Type'])) {
      return $statusPreferido;
    }
    $tipo = strtolower($col['Type']);
    if (strpos($tipo, 'enum(') !== 0) {
      return $statusPreferido;
    }
    preg_match_all("/'((?:\\\\'|[^'])*)'/", $col['Type'], $matches);
    $valores = array_map(function($v){
      return str_replace("\\'", "'", $v);
    }, $matches[1] ?? []);
    if (in_array($statusPreferido, $valores, true)) {
      return $statusPreferido;
    }
    if (in_array($statusFallback, $valores, true)) {
      return $statusFallback;
    }
    return $valores[0] ?? $statusFallback;
  } catch (Exception $e) {
    return $statusPreferido;
  }
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

function garantirFormaPagamentoColuna(PDO $conn): void {
  try {
    $col = $conn->query("SHOW COLUMNS FROM pedidos LIKE 'forma_pagamento'")->fetch(PDO::FETCH_ASSOC);
    if ($col && stripos((string) $col['Type'], 'enum(') === 0) {
      $conn->exec("ALTER TABLE pedidos MODIFY COLUMN forma_pagamento VARCHAR(30) NOT NULL DEFAULT 'pix'");
    }
  } catch (Exception $e) {
  }
  try {
    $col = $conn->query("SHOW COLUMNS FROM pedido_pagamentos LIKE 'forma'")->fetch(PDO::FETCH_ASSOC);
    if ($col && stripos((string) $col['Type'], 'enum(') === 0) {
      $conn->exec("ALTER TABLE pedido_pagamentos MODIFY COLUMN forma VARCHAR(30) NOT NULL");
    }
  } catch (Exception $e) {
  }
}

/**
 * Soma apenas as entradas de cashback AINDA em carencia (disponivel_em no futuro),
 * descontando o que ja foi usado dessas entradas especificas. Qualquer saldo sem
 * rastro no ledger (ajustes antigos, drift historico) e tratado como ja liberado,
 * ja que so podemos bloquear o que temos certeza que ainda esta na janela de carencia.
 */
function calcularCashbackNaoLiberado(PDO $conn, int $clienteId, int $lojaId): float {
  try {
    $stmt = $conn->prepare("
      SELECT m.id, m.valor,
        COALESCE((
          SELECT SUM(valor)
          FROM cashback_movimentacoes u
          WHERE u.referencia_id = m.id
            AND u.tipo IN ('uso','resgate','expirado')
            AND u.loja_id = m.loja_id
        ), 0) AS usado
      FROM cashback_movimentacoes m
      WHERE m.cliente_id = ?
        AND m.loja_id = ?
        AND m.tipo IN ('entrada','ganho')
        AND m.disponivel_em IS NOT NULL
        AND m.disponivel_em > NOW()
        AND (m.expira_em IS NULL OR m.expira_em >= CURDATE())
      ORDER BY m.criado_em ASC, m.id ASC
    ");
    $stmt->execute([$clienteId, $lojaId]);
    $total = 0.0;
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $disponivel = (float) $row['valor'] - (float) $row['usado'];
      if ($disponivel > 0) {
        $total += $disponivel;
      }
    }
    return $total;
  } catch (Exception $e) {
    return 0.0;
  }
}

function calcularCashbackLiberado(PDO $conn, int $clienteId, int $lojaId, float $tetoSaldo): float {
  $tetoSaldo = max(0, $tetoSaldo);
  $naoLiberado = calcularCashbackNaoLiberado($conn, $clienteId, $lojaId);
  return max(0, min($tetoSaldo, $tetoSaldo - $naoLiberado));
}

function garantirFiadoEstrutura(PDO $conn): void {
  try {
    $conn->exec("CREATE TABLE IF NOT EXISTS fiado_lancamentos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      loja_id INT NOT NULL,
      cliente_id INT NOT NULL,
      pedido_id INT NULL,
      operador_id INT NULL,
      tipo ENUM('venda','pagamento') NOT NULL,
      forma_pagamento VARCHAR(30) NULL,
      valor DECIMAL(10,2) NOT NULL,
      saldo_antes DECIMAL(10,2) NOT NULL DEFAULT 0,
      saldo_depois DECIMAL(10,2) NOT NULL DEFAULT 0,
      observacao VARCHAR(255) NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_loja_cliente (loja_id, cliente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } catch (Exception $e) {
  }
  try {
    $cols = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
    if (!in_array('saldo_fiado', $cols, true)) {
      $conn->exec("ALTER TABLE clientes ADD COLUMN saldo_fiado DECIMAL(10,2) NOT NULL DEFAULT 0");
    }
  } catch (Exception $e) {
  }
  try {
    $colsLanc = $conn->query("SHOW COLUMNS FROM fiado_lancamentos")->fetchAll(PDO::FETCH_COLUMN, 0);
    if (!in_array('operador_id', $colsLanc, true)) {
      $conn->exec("ALTER TABLE fiado_lancamentos ADD COLUMN operador_id INT NULL");
    }
    if (!in_array('forma_pagamento', $colsLanc, true)) {
      $conn->exec("ALTER TABLE fiado_lancamentos ADD COLUMN forma_pagamento VARCHAR(30) NULL");
    }
  } catch (Exception $e) {
  }
}

$clienteId = isset($_POST['cliente_id']) ? (int) $_POST['cliente_id'] : 0;
$tipo = $_POST['tipo'] ?? 'retirada';
$endereco = $_POST['endereco'] ?? null;
$distanciaKm = toFloat($_POST['distancia_km'] ?? 0);
$agendamento = $_POST['agendamento'] ?? null;
$itens = json_decode($_POST['itens'] ?? '[]', true);
$taxaPost = $_POST['taxa_entrega'] ?? null;
$taxaEditada = ($_POST['taxa_editada'] ?? '0') === '1';
$pagamento = $_POST['pagamento'] ?? 'pix';
$valorPago = $_POST['valor_pago'] ?? null;
$valorPagoFloat = toFloat($valorPago);
$cupom = strtoupper(trim($_POST['cupom'] ?? ''));
$descontoTipo = $_POST['desconto_tipo'] ?? 'valor';
$descontoTipo = $descontoTipo === 'percent' ? 'percent' : 'valor';
$descontoValor = toFloat($_POST['desconto_valor'] ?? 0);
$taxaMaquininhaPercent = toFloat($_POST['taxa_maquininha_percent'] ?? 0);
$cashbackAplicado = ($_POST['cashback_aplicado'] ?? '0') === '1';
$cashbackUsado = toFloat($_POST['cashback_usado'] ?? 0);
$cashbackUsado = $cashbackUsado < 0 ? 0 : $cashbackUsado;
$pagamentos = json_decode($_POST['pagamentos'] ?? '[]', true);
$pagamentoDividido = ($_POST['pagamento_dividido'] ?? '0') === '1';
$perfil = perfilAtual();
$operadorId = $_SESSION['admin_id'] ?? null;
$caixaIdPost = $_POST['caixa_id'] ?? null;
$offlineUuid = trim((string) ($_POST['offline_uuid'] ?? ''));
if ($offlineUuid !== '' && !preg_match('/^[0-9a-fA-F-]{32,36}$/', $offlineUuid)) {
  $offlineUuid = '';
}
$pedidoEdicaoId = isset($_POST['pedido_edicao_id']) ? (int) $_POST['pedido_edicao_id'] : null;
if ($pedidoEdicaoId && $pedidoEdicaoId <= 0) {
  $pedidoEdicaoId = null;
}
$statusCanceladoPedidos = statusPermitido($conn, 'pedidos', 'cancelado', 'finalizado');
$statusCanceladoLog = statusPermitido($conn, 'pedido_status_log', 'cancelado', $statusCanceladoPedidos);

if (!in_array($perfil, ['admin', 'gerente'], true)) {
  $cupom = '';
  $descontoValor = 0;
  $taxaMaquininhaPercent = 0;
}

if (!$clienteId || !$itens || !count($itens)) {
  echo json_encode(['ok'=>false,'msg'=>'Dados incompletos']);
  exit;
}

if ($offlineUuid !== '') {
  try {
    $stmtDup = $conn->prepare("SELECT id FROM pedidos WHERE offline_uuid = ? AND loja_id = ? LIMIT 1");
    $stmtDup->execute([$offlineUuid, $lojaId]);
    $pedidoExistente = $stmtDup->fetchColumn();
    if ($pedidoExistente) {
      echo json_encode(['ok' => true, 'pedido_id' => (int) $pedidoExistente, 'ja_existia' => true]);
      exit;
    }
  } catch (Exception $e) {
  }
}

try {
  $produtoIdsCheck = [];
  foreach ($itens as $i) {
    $pid = isset($i['id']) ? (int) $i['id'] : 0;
    if ($pid > 0) {
      $produtoIdsCheck[$pid] = true;
    }
  }
  if ($produtoIdsCheck) {
    $placeholders = implode(',', array_fill(0, count($produtoIdsCheck), '?'));
    $stmtProd = $conn->prepare("SELECT COUNT(*) FROM produtos WHERE id IN ($placeholders) AND loja_id = ?");
    $stmtProd->execute([...array_keys($produtoIdsCheck), $lojaId]);
    $qtd = (int) $stmtProd->fetchColumn();
    if ($qtd !== count($produtoIdsCheck)) {
      echo json_encode(['ok' => false, 'msg' => 'Existem produtos invalidos para esta loja.']);
      exit;
    }
  }
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao validar produtos.']);
  exit;
}

try {
  $stmtCliente = $conn->prepare("SELECT id FROM clientes WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmtCliente->execute([$clienteId, $lojaId]);
  if (!$stmtCliente->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Selecione um cliente valido para esta loja.']);
    exit;
  }
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao validar cliente.']);
  exit;
}

if ($tipo === 'entrega' && !$endereco) {
  echo json_encode(['ok'=>false,'msg'=>'Endereco obrigatorio']);
  exit;
}

$caixaId = null;
if ($operadorId) {
  if ($caixaIdPost) {
    $stmtCaixa = $conn->prepare("
      SELECT id FROM caixa_turnos
      WHERE id = ? AND operador_id = ? AND status = 'aberto' AND loja_id = ? AND DATE(aberto_em) = CURDATE()
      LIMIT 1
    ");
    $stmtCaixa->execute([$caixaIdPost, $operadorId, $lojaId]);
    $caixaId = $stmtCaixa->fetchColumn() ?: null;
  }

  if (!$caixaId) {
    $stmtCaixa = $conn->prepare("
      SELECT id FROM caixa_turnos
      WHERE operador_id = ? AND status = 'aberto' AND loja_id = ? AND DATE(aberto_em) = CURDATE()
      ORDER BY id DESC
      LIMIT 1
    ");
    $stmtCaixa->execute([$operadorId, $lojaId]);
    $caixaId = $stmtCaixa->fetchColumn() ?: null;
  }
}

if (!$caixaId) {
  $stmtCaixaAnterior = $conn->prepare("
    SELECT aberto_em
    FROM caixa_turnos
    WHERE operador_id = ? AND status = 'aberto' AND loja_id = ?
    ORDER BY id DESC
    LIMIT 1
  ");
  $stmtCaixaAnterior->execute([$operadorId, $lojaId]);
  $abertoEmAnterior = $stmtCaixaAnterior->fetchColumn();
  if ($abertoEmAnterior) {
    $dataFmt = date('d/m/Y', strtotime((string) $abertoEmAnterior));
    echo json_encode([
      'ok'=>false,
      'msg'=>"Feche o caixa do dia {$dataFmt} e abra o caixa de hoje para criar pedidos."
    ]);
    exit;
  }
  echo json_encode(['ok'=>false,'msg'=>'Caixa fechado. Abra o caixa do dia para criar pedidos.']);
  exit;
}

$subtotal = 0.0;
foreach ($itens as $i) {
  $subtotal += toFloat($i['preco']) * (int)$i['qtd'];
}

$cupomAplicado = false;
$cupomId = null;
$cupomFrete = false;
if ($cupom !== '') {
  if (!tabelaExiste($conn, 'cupons')) {
    echo json_encode(['ok'=>false,'msg'=>'Cupom indisponivel']);
    exit;
  }
  $cuponsColunas = $conn->query("SHOW COLUMNS FROM cupons")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temPrimeiraCompra = in_array('primeira_compra', $cuponsColunas, true);
  $selectPrimeira = $temPrimeiraCompra ? ", primeira_compra" : "";

  $stmt = $conn->prepare("
    SELECT id, tipo, desconto, minimo, quantidade_total, quantidade_usada, ativo{$selectPrimeira}
    FROM cupons
    WHERE codigo = ? AND loja_id = ?
    LIMIT 1
  ");
  $stmt->execute([$cupom, $lojaId]);
  $cupomRow = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$cupomRow) {
    echo json_encode(['ok'=>false,'msg'=>'Cupom nao encontrado']);
    exit;
  }
  if (!(int) $cupomRow['ativo']) {
    echo json_encode(['ok'=>false,'msg'=>'Cupom indisponivel']);
    exit;
  }
  $totalCupons = (int) $cupomRow['quantidade_total'];
  $usados = (int) $cupomRow['quantidade_usada'];
  if ($totalCupons > 0 && $usados >= $totalCupons) {
    echo json_encode(['ok'=>false,'msg'=>'Cupom esgotado']);
    exit;
  }
  $minimo = (float) $cupomRow['minimo'];
  if ($minimo > 0 && $subtotal < $minimo) {
    echo json_encode(['ok'=>false,'msg'=>'Pedido abaixo do minimo do cupom']);
    exit;
  }

  if ($temPrimeiraCompra && (int) ($cupomRow['primeira_compra'] ?? 0) === 1) {
    if (!$clienteId) {
      echo json_encode(['ok'=>false,'msg'=>'Cliente obrigatorio para este cupom']);
      exit;
    }
    $stmt = $conn->prepare("SELECT COUNT(*) FROM pedidos WHERE cliente_id = ? AND loja_id = ?");
    $stmt->execute([$clienteId, $lojaId]);
    if ((int) $stmt->fetchColumn() > 0) {
      echo json_encode(['ok'=>false,'msg'=>'Cupom valido apenas para primeira compra']);
      exit;
    }
  }

  $cupomFrete = ($cupomRow['tipo'] ?? '') === 'frete';
  $descontoTipo = $cupomRow['tipo'] === 'valor' ? 'valor' : 'percent';
  if ($cupomFrete) {
    $descontoTipo = 'valor';
  }
  $descontoValor = $cupomFrete ? 0 : (float) $cupomRow['desconto'];
  $cupomAplicado = true;
  $cupomId = (int) $cupomRow['id'];
}

$taxaPadrao = (float) config($conn, 'taxa_entrega', 0);
$taxaTipo = config($conn, 'taxa_entrega_tipo', 'dinamica');
$taxaGratisAtivo = config($conn, 'taxa_entrega_gratis', '0') === '1';
$pedidoMinimo = (float) config($conn, 'pedido_minimo', 0);
$taxa = 0.0;

if ($tipo === 'entrega') {
  if ($taxaTipo === 'fixa') {
    $taxa = $taxaPadrao;
  } elseif ($taxaTipo === 'bairro') {
    $bairro = extrairBairroEndereco($endereco);
    $mapa = [];
    $raw = config($conn, 'taxas_bairro', '');
    if ($raw) {
      $decoded = json_decode((string) $raw, true);
      if (is_array($decoded)) $mapa = $decoded;
    }
    if ($bairro !== '') {
      foreach ($mapa as $nome => $valor) {
        if (strcasecmp($nome, $bairro) === 0) {
          $taxa = (float) $valor;
          break;
        }
      }
    }
  } elseif ($taxaTipo === 'dinamica' || $taxaTipo === 'area') {
    if (tabelaExiste($conn, 'taxas_dinamicas')) {
      $stmt = $conn->prepare("SELECT distancia_km, valor, tipo FROM taxas_dinamicas WHERE loja_id = ? ORDER BY distancia_km");
      $stmt->execute([$lojaId]);
      $regras = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
      $taxa = calcularTaxaDinamica($distanciaKm, $regras);
    }
  } elseif ($taxaTipo === 'sem') {
    $taxa = 0.0;
  } else {
    $taxa = $taxaPadrao;
  }
}

if ($tipo === 'entrega' && $taxaEditada && $taxaPost !== '' && $taxaPost !== null) {
  $taxa = toFloat($taxaPost);
}

if ($cupomFrete) {
  if ($tipo !== 'entrega') {
    echo json_encode(['ok'=>false,'msg'=>'Cupom valido apenas para entrega']);
    exit;
  }
  $taxa = 0;
}

if ($taxaGratisAtivo && $pedidoMinimo > 0 && $subtotal >= $pedidoMinimo) {
  $taxa = 0;
}

$desconto = 0.0;
if ($descontoValor > 0) {
  $desconto = ($descontoTipo === 'percent')
    ? ($subtotal * ($descontoValor / 100))
    : $descontoValor;
}

$clientesColunas = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$temCashbackSaldoCliente = in_array('cashback_saldo', $clientesColunas, true);
$temTabelaMov = tabelaExiste($conn, 'cashback_movimentacoes');
$temTabelaPontosMov = tabelaExiste($conn, 'pontos_movimentacoes');
$clienteCashbackSaldo = 0.0;
$clienteCashbackLiberado = 0.0;
if ($temCashbackSaldoCliente) {
  $stmtSaldo = $conn->prepare("SELECT cashback_saldo FROM clientes WHERE id = ? AND loja_id = ?");
  $stmtSaldo->execute([$clienteId, $lojaId]);
  $clienteCashbackSaldo = (float) $stmtSaldo->fetchColumn();
  $clienteCashbackLiberado = $temTabelaMov
    ? calcularCashbackLiberado($conn, $clienteId, $lojaId, $clienteCashbackSaldo)
    : $clienteCashbackSaldo;
}

if ($cashbackUsado > 0) {
  if (!$temCashbackSaldoCliente) {
    echo json_encode(['ok'=>false,'msg'=>'Cashback nao configurado para clientes.']);
    exit;
  }
  if ($cashbackUsado > $clienteCashbackLiberado + 0.009) {
    $msgCashback = $cashbackUsado <= $clienteCashbackSaldo + 0.009
      ? 'Cashback ainda em carencia. Aguarde o periodo de liberacao apos a compra que o gerou.'
      : 'Cashback insuficiente para o cliente.';
    echo json_encode(['ok'=>false,'msg'=>$msgCashback]);
    exit;
  }
  $limiteUso = max(0, $subtotal + $taxa - $desconto);
  if ($cashbackUsado > $limiteUso) {
    echo json_encode(['ok'=>false,'msg'=>'Cashback acima do valor do pedido.']);
    exit;
  }
}

$base = $subtotal + $taxa - $desconto - $cashbackUsado;
if ($base < 0) {
  $base = 0;
}

$pagamentosValidos = [];
if (!is_array($pagamentos)) {
  $pagamentos = [];
}

if (!count($pagamentos)) {
  $valorBase = $base;
  $pagamentosValidos[] = [
    'forma' => $pagamento,
    'valor' => $valorBase
  ];
} else {
  foreach ($pagamentos as $p) {
    $forma = $p['forma'] ?? null;
    $valor = toFloat($p['valor'] ?? 0);
    if (!$forma) {
      continue;
    }
    if ($forma === 'resgate') {
      $pagamentosValidos[] = [
        'forma' => $forma,
        'valor' => 0
      ];
      continue;
    }
    if ($forma === 'fiado' && count($pagamentos) === 1) {
      $pagamentosValidos[] = [
        'forma' => $forma,
        'valor' => $base
      ];
      continue;
    }
    if ($valor <= 0) {
      continue;
    }
    $pagamentosValidos[] = [
      'forma' => $forma,
      'valor' => $valor
    ];
  }
}

if (!count($pagamentosValidos)) {
  echo json_encode(['ok'=>false,'msg'=>'Pagamento invalido']);
  exit;
}

$itensColunas = $conn->query("SHOW COLUMNS FROM pedido_itens")->fetchAll(PDO::FETCH_COLUMN, 0);
$temProdutoId = in_array('produto_id', $itensColunas, true);
$pedidoColunas = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temObsCliente = in_array('observacoes_cliente', $pedidoColunas, true);
$temCashbackValor = in_array('cashback_valor', $pedidoColunas, true);
$temCashbackUsado = in_array('cashback_usado', $pedidoColunas, true);
$temCashbackPercentual = in_array('cashback_percentual', $pedidoColunas, true);
$temCashbackExpiraEm = in_array('cashback_expira_em', $pedidoColunas, true);
$temCashbackExpira = in_array('cashback_expira', $pedidoColunas, true);
$temCashbackAplicado = in_array('cashback_aplicado', $pedidoColunas, true);
$temCashbackAtivo = in_array('cashback_ativo', $pedidoColunas, true);
$temAgendamento = in_array('agendamento', $pedidoColunas, true);
$temAgendamentoEm = in_array('agendamento_em', $pedidoColunas, true);
$temAgendamentoData = in_array('agendamento_data', $pedidoColunas, true);
$temAgendamentoHora = in_array('agendamento_hora', $pedidoColunas, true);

$clubePontosAtivo = config($conn, 'clube_pontos_ativo', '0') === '1';
$clientesColunas = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$temPontosSaldo = in_array('pontos_saldo', $clientesColunas, true);
$temPontosCliente = in_array('pontos', $clientesColunas, true);
$campoPontosCliente = $temPontosSaldo ? 'pontos_saldo' : ($temPontosCliente ? 'pontos' : null);
$produtosColunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temPontosGanhoProduto = in_array('pontos_ganho', $produtosColunas, true);
$temPontosCustoProduto = in_array('pontos_custo', $produtosColunas, true);
$pontosGanhoTotal = 0;
$pontosCustoTotal = 0;
if ($clubePontosAtivo && $campoPontosCliente && ($temPontosGanhoProduto || $temPontosCustoProduto)) {
  $produtoIds = [];
  foreach ($itens as $i) {
    $pid = isset($i['id']) ? (int) $i['id'] : 0;
    if ($pid > 0) {
      $produtoIds[$pid] = true;
    }
  }
  if ($produtoIds) {
    $placeholders = implode(',', array_fill(0, count($produtoIds), '?'));
    $stmtPts = $conn->prepare("
      SELECT id, pontos_ganho, pontos_custo
      FROM produtos
      WHERE id IN ($placeholders) AND loja_id = ?
    ");
    $stmtPts->execute([...array_keys($produtoIds), $lojaId]);
    $mapPontos = [];
    foreach ($stmtPts->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $mapPontos[(int) $row['id']] = $row;
    }
    foreach ($itens as $i) {
      $pid = isset($i['id']) ? (int) $i['id'] : 0;
      $qtd = (int) ($i['qtd'] ?? 0);
      if ($pid <= 0 || $qtd <= 0) {
        continue;
      }
      $dadosPontos = $mapPontos[$pid] ?? null;
      if (!$dadosPontos) {
        continue;
      }
      $usarPontos = !empty($i['usar_pontos']);
      if ($usarPontos) {
        $pontosCustoTotal += (int) ($dadosPontos['pontos_custo'] ?? 0) * $qtd;
      } else {
        $pontosGanhoTotal += (int) ($dadosPontos['pontos_ganho'] ?? 0) * $qtd;
      }
    }
  }
}

if ($clubePontosAtivo && $pontosCustoTotal > 0) {
  if (!$campoPontosCliente) {
    echo json_encode(['ok'=>false,'msg'=>'Pontos indisponiveis no cadastro do cliente.']);
    exit;
  }
  if (!$clienteId) {
    echo json_encode(['ok'=>false,'msg'=>'Selecione um cliente para usar pontos.']);
    exit;
  }
  $stmtSaldo = $conn->prepare("SELECT {$campoPontosCliente} FROM clientes WHERE id = ? AND loja_id = ?");
  $stmtSaldo->execute([$clienteId, $lojaId]);
  $saldoAtual = (int) ($stmtSaldo->fetchColumn() ?? 0);
  if ($saldoAtual < $pontosCustoTotal) {
    error_log(sprintf(
      'PDV pontos insuficientes: cliente_id=%s saldo=%s necessario=%s',
      $clienteId,
      $saldoAtual,
      $pontosCustoTotal
    ));
    echo json_encode(['ok'=>false,'msg'=>'Pontos insuficientes para resgatar os itens.']);
    exit;
  }
}

$agendamentoValor = null;
$agendamentoData = null;
$agendamentoHora = null;
if ($agendamento) {
  $rawAgendamento = str_replace('T', ' ', (string) $agendamento);
  $timestamp = strtotime($rawAgendamento);
  if ($timestamp !== false) {
    $agendamentoValor = date('Y-m-d H:i:s', $timestamp);
    $agendamentoData = date('Y-m-d', $timestamp);
    $agendamentoHora = date('H:i:s', $timestamp);
  }
}

$taxaMaquininhaTotal = 0.0;
$pagamentoTotal = 0.0;
$dinheiroPago = 0.0;
$dinheiroRecebido = $valorPagoFloat > 0 ? $valorPagoFloat : 0.0;

foreach ($pagamentosValidos as $p) {
  $pagamentoTotal += $p['valor'];
  if ($p['forma'] === 'dinheiro') {
    $dinheiroPago += $p['valor'];
  }
}

$pagamentoPrincipal = $pagamentosValidos[0]['forma'] ?? $pagamento;

if ($pagamentoDividido) {
  foreach ($pagamentosValidos as $p) {
    if (in_array($p['forma'], ['credito','debito'], true)) {
      $taxaMaquininhaTotal += $p['valor'] * ($taxaMaquininhaPercent / 100);
    }
  }
} elseif (in_array($pagamentoPrincipal, ['credito','debito'], true)) {
  $taxaMaquininhaTotal = $base * ($taxaMaquininhaPercent / 100);
}

$total = $base + $taxaMaquininhaTotal;

if (abs($pagamentoTotal - $total) > 0.01) {
  echo json_encode(['ok'=>false,'msg'=>'A soma dos pagamentos precisa ser igual ao total']);
  exit;
}

$cashbackConfigAtivo = config($conn, 'cashback_ativo', '0') === '1';
$cashbackPercentual = toFloat(config($conn, 'cashback_percentual', 0));
$cashbackExpiraDias = (int) config($conn, 'cashback_expira_dias', 0);
$cashbackValor = 0.0;
$cashbackExpiraEm = null;
$cashbackAplicadoFinal = $cashbackAplicado && $cashbackConfigAtivo && $cashbackPercentual > 0;
if ($cashbackAplicadoFinal) {
  $cashbackBase = max(0, $subtotal - $desconto);
  $cashbackValor = round($cashbackBase * ($cashbackPercentual / 100), 2);
  if ($cashbackValor < 0) {
    $cashbackValor = 0.0;
  }
  if ($cashbackExpiraDias > 0) {
    $cashbackExpiraEm = date('Y-m-d', strtotime('+' . $cashbackExpiraDias . ' days'));
  }
}

$troco = null;
if ($dinheiroPago > 0) {
  if ($dinheiroRecebido <= 0) {
    $dinheiroRecebido = $dinheiroPago;
  }
  if ($dinheiroRecebido + 0.0001 < $dinheiroPago) {
    echo json_encode(['ok'=>false,'msg'=>'Valor em dinheiro insuficiente']);
    exit;
  }
  $troco = $dinheiroRecebido - $dinheiroPago;
} else {
  $dinheiroRecebido = 0.0;
  $troco = null;
}

$fiadoValorTotal = 0.0;
foreach ($pagamentosValidos as $p) {
  if ($p['forma'] === 'fiado') {
    $fiadoValorTotal += $p['valor'];
  }
}
garantirFormaPagamentoColuna($conn);
if ($fiadoValorTotal > 0.009) {
  garantirFiadoEstrutura($conn);
}

try {
  $conn->beginTransaction();

  $camposPedido = [
    'cliente_id',
    'operador_id',
    'caixa_id',
    'tipo',
    'endereco_entrega',
    'subtotal',
    'taxa_entrega',
    'desconto',
    'taxa_maquininha',
    'total',
    'forma_pagamento',
    'valor_pago',
    'troco',
    'cupom',
    'status',
    'loja_id'
  ];
  if ($temObsCliente) {
    $camposPedido[] = 'observacoes_cliente';
  }
  $valoresPedido = [
    $clienteId,
    $operadorId,
    $caixaId,
    $tipo,
    $tipo === 'entrega' ? $endereco : null,
    $subtotal,
    $taxa,
    $desconto,
    $taxaMaquininhaTotal,
    $total,
    $pagamentoPrincipal,
    $dinheiroRecebido > 0 ? $dinheiroRecebido : null,
    $troco,
    $cupom !== '' ? $cupom : null,
    'pendente',
    $lojaId
  ];
  if ($temObsCliente) {
    $observacoesCliente = trim((string) ($_POST['observacoes_cliente'] ?? ''));
    $valoresPedido[] = $observacoesCliente !== '' ? $observacoesCliente : null;
  }
  if ($temAgendamento) {
    $camposPedido[] = 'agendamento';
    $valoresPedido[] = $agendamentoValor;
  } elseif ($temAgendamentoEm) {
    $camposPedido[] = 'agendamento_em';
    $valoresPedido[] = $agendamentoValor;
  } elseif ($temAgendamentoData && $temAgendamentoHora) {
    $camposPedido[] = 'agendamento_data';
    $valoresPedido[] = $agendamentoData;
    $camposPedido[] = 'agendamento_hora';
    $valoresPedido[] = $agendamentoHora;
  }

  if ($temCashbackValor) {
    $camposPedido[] = 'cashback_valor';
    $valoresPedido[] = $cashbackAplicadoFinal ? $cashbackValor : 0.0;
  }
  if ($temCashbackUsado) {
    $camposPedido[] = 'cashback_usado';
    $valoresPedido[] = $cashbackUsado > 0 ? $cashbackUsado : 0.0;
  }
  if ($temCashbackPercentual) {
    $camposPedido[] = 'cashback_percentual';
    $valoresPedido[] = $cashbackAplicadoFinal ? $cashbackPercentual : 0.0;
  }
  if ($temCashbackExpiraEm) {
    $camposPedido[] = 'cashback_expira_em';
    $valoresPedido[] = $cashbackAplicadoFinal ? $cashbackExpiraEm : null;
  } elseif ($temCashbackExpira) {
    $camposPedido[] = 'cashback_expira';
    $valoresPedido[] = $cashbackAplicadoFinal ? $cashbackExpiraEm : null;
  }
  if ($temCashbackAplicado) {
    $camposPedido[] = 'cashback_aplicado';
    $valoresPedido[] = $cashbackAplicadoFinal ? 1 : 0;
  } elseif ($temCashbackAtivo) {
    $camposPedido[] = 'cashback_ativo';
    $valoresPedido[] = $cashbackAplicadoFinal ? 1 : 0;
  }

  if (in_array('origem', $pedidoColunas, true)) {
    $camposPedido[] = 'origem';
    $valoresPedido[] = 'balcao';
  }

  if (in_array('offline_uuid', $pedidoColunas, true)) {
    $camposPedido[] = 'offline_uuid';
    $valoresPedido[] = $offlineUuid !== '' ? $offlineUuid : null;
  }

  $camposPedido[] = 'criado_em';
  $placeholders = array_fill(0, count($camposPedido) - 1, '?');
  $placeholders[] = 'NOW()';

  $stmt = $conn->prepare("
    INSERT INTO pedidos
      (" . implode(',', $camposPedido) . ")
    VALUES
      (" . implode(',', $placeholders) . ")
  ");

  $stmt->execute($valoresPedido);

  $pedidoId = $conn->lastInsertId();

  $camposItem = ['pedido_id', 'produto_nome', 'quantidade', 'preco', 'observacoes', 'loja_id'];
  if ($temProdutoId) {
    $camposItem[] = 'produto_id';
  }
  $placeholdersItem = implode(',', array_fill(0, count($camposItem), '?'));
  $stmtItem = $conn->prepare("
    INSERT INTO pedido_itens
      (" . implode(',', $camposItem) . ")
    VALUES ($placeholdersItem)
  ");

  $stmtEstoqueInsert = $conn->prepare("
    INSERT IGNORE INTO estoque (produto_id, quantidade, loja_id)
    VALUES (?, 0, ?)
  ");
  $stmtEstoqueUpdate = $conn->prepare("
    UPDATE estoque
    SET quantidade = quantidade - ?
    WHERE produto_id = ? AND loja_id = ?
  ");
  $stmtMov = $conn->prepare("
    INSERT INTO estoque_movimentacoes
      (produto_id, tipo, quantidade, origem, referencia_id, loja_id)
    VALUES (?, 'saida', ?, 'pedido', ?, ?)
  ");

  foreach ($itens as $i) {
    $nomeItem = $i['nome'] ?? '';
    $qtdItem = (int) ($i['qtd'] ?? 0);
    $precoItem = toFloat($i['preco'] ?? 0);
    if ($nomeItem === '' || $qtdItem <= 0) {
      continue;
    }
    $produtoIdItem = isset($i['id']) ? (int) $i['id'] : 0;

    $valores = [
      $pedidoId,
      $nomeItem,
      $qtdItem,
      $precoItem,
      $i['observacoes'] ?? null,
      $lojaId
    ];
    if ($temProdutoId) {
      $valores[] = $produtoIdItem > 0 ? $produtoIdItem : null;
    }
    $stmtItem->execute($valores);

    if ($produtoIdItem > 0) {
      $stmtEstoqueInsert->execute([$produtoIdItem, $lojaId]);
      $stmtEstoqueUpdate->execute([$qtdItem, $produtoIdItem, $lojaId]);
      $stmtMov->execute([$produtoIdItem, $qtdItem, $pedidoId, $lojaId]);
    }

    if (!empty($i['combosels']) && is_array($i['combosels'])) {
      foreach ($i['combosels'] as $sel) {
        $selId = (int) ($sel['id'] ?? 0);
        $selQtd = (int) ($sel['qtd'] ?? 1) * $qtdItem;
        if ($selId <= 0 || $selQtd <= 0) {
          continue;
        }
        $stmtEstoqueInsert->execute([$selId, $lojaId]);
        $stmtEstoqueUpdate->execute([$selQtd, $selId, $lojaId]);
        $stmtMov->execute([$selId, $selQtd, $pedidoId, $lojaId]);
      }
    }
  }

  $stmtPagamento = $conn->prepare("
    INSERT INTO pedido_pagamentos
      (pedido_id, forma, valor, taxa_maquininha, loja_id)
    VALUES (?,?,?,?,?)
  ");

  foreach ($pagamentosValidos as $p) {
    $taxaPagamento = 0.0;
    if (in_array($p['forma'], ['credito','debito'], true)) {
      $taxaPagamento = $p['valor'] * ($taxaMaquininhaPercent / 100);
    }
    $stmtPagamento->execute([
      $pedidoId,
      $p['forma'],
      $p['valor'],
      $taxaPagamento,
      $lojaId
    ]);
  }

    $stmtLog = $conn->prepare("
      INSERT INTO pedido_status_log (pedido_id, status, loja_id)
      VALUES (?, ?, ?)
    ");
    $stmtLog->execute([$pedidoId, 'pendente', $lojaId]);

  if ($cupomAplicado && $cupomId) {
    $stmtCupom = $conn->prepare("
      UPDATE cupons
      SET quantidade_usada = quantidade_usada + 1,
          atualizado_em = NOW()
      WHERE id = ? AND loja_id = ?
        AND (quantidade_total = 0 OR quantidade_usada < quantidade_total)
    ");
    $stmtCupom->execute([$cupomId, $lojaId]);
    if ($stmtCupom->rowCount() === 0) {
      throw new Exception('Cupom indisponivel');
    }
  }

    if ($temCashbackSaldoCliente && $clienteId) {
      $saldoAntes = (float) $clienteCashbackSaldo;
      $saldoDepois = $saldoAntes;
      if ($cashbackUsado > 0) {
        $saldoDepois = max(0, $saldoDepois - $cashbackUsado);
      }
      // Cashback ganho nesta compra fica 'pendente' ate o pedido ser finalizado
      // (ver cashbackPromoverPendente em helpers/cashback_module.php) — nao entra no saldo agora.
      $deltaCashback = $saldoDepois - $saldoAntes;
      if (abs($deltaCashback) > 0.009) {
        $stmtAtualizaCashback = $conn->prepare("
          UPDATE clientes
          SET cashback_saldo = GREATEST(0, cashback_saldo + ?)
          WHERE id = ? AND loja_id = ?
        ");
        $stmtAtualizaCashback->execute([$deltaCashback, $clienteId, $lojaId]);
      }

      if ($temTabelaMov && ($cashbackUsado > 0.009 || ($cashbackAplicadoFinal && $cashbackValor > 0.009))) {
        $stmtMov = $conn->prepare("
          INSERT INTO cashback_movimentacoes
            (cliente_id, pedido_id, tipo, valor, saldo_antes, saldo_depois, expira_em, disponivel_em, referencia_id, loja_id)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $saldoMov = $saldoAntes;

        if ($cashbackUsado > 0.009) {
          $restante = $cashbackUsado;
          $entradas = [];
          $stmtEntradas = $conn->prepare("
            SELECT m.id, m.valor,
              COALESCE((
                SELECT SUM(valor)
                FROM cashback_movimentacoes u
                WHERE u.referencia_id = m.id
                  AND u.tipo IN ('uso','resgate','expirado')
                  AND u.loja_id = m.loja_id
              ), 0) AS usado
            FROM cashback_movimentacoes m
            WHERE m.cliente_id = ?
              AND m.loja_id = ?
              AND m.tipo IN ('entrada','ganho')
              AND (m.expira_em IS NULL OR m.expira_em >= CURDATE())
              AND (m.disponivel_em IS NULL OR m.disponivel_em <= NOW())
            ORDER BY m.criado_em ASC, m.id ASC
          ");
          $stmtEntradas->execute([$clienteId, $lojaId]);
          $entradas = $stmtEntradas->fetchAll(PDO::FETCH_ASSOC);

          foreach ($entradas as $entrada) {
            if ($restante <= 0.009) {
              break;
            }
            $disponivel = (float) $entrada['valor'] - (float) $entrada['usado'];
            if ($disponivel <= 0.009) {
              continue;
            }
            $usar = min($restante, $disponivel);
            $saldoDepoisMov = max(0, $saldoMov - $usar);
            $stmtMov->execute([
              $clienteId,
              $pedidoId,
              'uso',
              $usar,
              $saldoMov,
              $saldoDepoisMov,
              null,
              null,
              (int) $entrada['id'],
              $lojaId
            ]);
            $saldoMov = $saldoDepoisMov;
            $restante -= $usar;
          }

          if ($restante > 0.009) {
            $saldoDepoisMov = max(0, $saldoMov - $restante);
            $stmtMov->execute([
              $clienteId,
              $pedidoId,
              'uso',
              $restante,
              $saldoMov,
              $saldoDepoisMov,
              null,
              null,
              null,
              $lojaId
            ]);
            $saldoMov = $saldoDepoisMov;
          }
        }

        if ($cashbackAplicadoFinal && $cashbackValor > 0.009) {
          // 'pendente': so vira credito real (tipo='entrada') quando o pedido for finalizado.
          $stmtMov->execute([
            $clienteId,
            $pedidoId,
            'pendente',
            $cashbackValor,
            $saldoMov,
            $saldoMov,
            null,
            null,
            null,
            $lojaId
          ]);
        }
      }
    }

    if ($clubePontosAtivo && $campoPontosCliente && $clienteId && ($pontosGanhoTotal > 0 || $pontosCustoTotal > 0)) {
      $stmtSaldoPontos = $conn->prepare("SELECT {$campoPontosCliente} FROM clientes WHERE id = ? AND loja_id = ?");
      $stmtSaldoPontos->execute([$clienteId, $lojaId]);
      $saldoAntesPontos = (int) $stmtSaldoPontos->fetchColumn();
      $saldoMov = $saldoAntesPontos;

      $stmtMovPontos = null;
      if ($temTabelaPontosMov) {
        $stmtMovPontos = $conn->prepare("
          INSERT INTO pontos_movimentacoes
            (cliente_id, pedido_id, tipo, pontos, saldo_antes, saldo_depois, referencia_id, loja_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
      }

      $deltaPontos = 0;
      if ($pontosCustoTotal > 0) {
        $saldoDepois = max(0, $saldoMov - $pontosCustoTotal);
        if ($stmtMovPontos) {
          $stmtMovPontos->execute([
            $clienteId,
            $pedidoId,
            'resgate',
            $pontosCustoTotal,
            $saldoMov,
            $saldoDepois,
            null,
            $lojaId
          ]);
        }
        $saldoMov = $saldoDepois;
        $deltaPontos -= $pontosCustoTotal;
      }

      if ($deltaPontos !== 0) {
        $stmtPontos = $conn->prepare("
          UPDATE clientes
          SET {$campoPontosCliente} = GREATEST(0, {$campoPontosCliente} + ?)
          WHERE id = ? AND loja_id = ?
        ");
        $stmtPontos->execute([$deltaPontos, $clienteId, $lojaId]);
      }

      if ($pontosGanhoTotal > 0 && $stmtMovPontos) {
        $stmtMovPontos->execute([
          $clienteId,
          $pedidoId,
          'pendente',
          $pontosGanhoTotal,
          $saldoMov,
          $saldoMov,
          null,
          $lojaId
        ]);
      }
    }

  if ($fiadoValorTotal > 0.009) {
    $stmtSaldoFiado = $conn->prepare("SELECT saldo_fiado FROM clientes WHERE id = ? AND loja_id = ?");
    $stmtSaldoFiado->execute([$clienteId, $lojaId]);
    $saldoAntesFiado = (float) ($stmtSaldoFiado->fetchColumn() ?: 0);
    $saldoDepoisFiado = $saldoAntesFiado + $fiadoValorTotal;

    $conn->prepare("UPDATE clientes SET saldo_fiado = ? WHERE id = ? AND loja_id = ?")
      ->execute([$saldoDepoisFiado, $clienteId, $lojaId]);

    $conn->prepare("
      INSERT INTO fiado_lancamentos (loja_id, cliente_id, pedido_id, operador_id, tipo, valor, saldo_antes, saldo_depois)
      VALUES (?, ?, ?, ?, 'venda', ?, ?, ?)
    ")->execute([$lojaId, $clienteId, $pedidoId, $operadorId, $fiadoValorTotal, $saldoAntesFiado, $saldoDepoisFiado]);
  }

  if ($pedidoEdicaoId) {
    if ($temProdutoId) {
      $stmtItensAntigos = $conn->prepare("
        SELECT produto_id, quantidade
        FROM pedido_itens
        WHERE pedido_id = ? AND loja_id = ?
          AND produto_id IS NOT NULL
      ");
      $stmtItensAntigos->execute([$pedidoEdicaoId, $lojaId]);
      $itensAntigos = $stmtItensAntigos->fetchAll(PDO::FETCH_ASSOC);

      $stmtEstoqueRepor = $conn->prepare("
        UPDATE estoque
        SET quantidade = quantidade + ?
        WHERE produto_id = ? AND loja_id = ?
      ");
      $stmtMovRepor = $conn->prepare("
        INSERT INTO estoque_movimentacoes
          (produto_id, tipo, quantidade, origem, referencia_id, loja_id)
        VALUES (?, 'entrada', ?, 'pedido_editado', ?, ?)
      ");

      foreach ($itensAntigos as $old) {
        $produtoIdOld = (int) ($old['produto_id'] ?? 0);
        $qtdOld = (int) ($old['quantidade'] ?? 0);
        if ($produtoIdOld <= 0 || $qtdOld <= 0) {
          continue;
        }
        $stmtEstoqueInsert->execute([$produtoIdOld, $lojaId]);
        $stmtEstoqueRepor->execute([$qtdOld, $produtoIdOld, $lojaId]);
        $stmtMovRepor->execute([$produtoIdOld, $qtdOld, $pedidoEdicaoId, $lojaId]);
      }
    }

    $conn->prepare("UPDATE pedidos SET status = ? WHERE id = ? AND loja_id = ?")
      ->execute([$statusCanceladoPedidos, $pedidoEdicaoId, $lojaId]);
    $stmtLog->execute([$pedidoEdicaoId, $statusCanceladoLog, $lojaId]);
  }

  $conn->commit();

  try {
    financialEnsureModule($conn);
    $financialIntegration = new SaleFinancialIntegrationService();
    if ($pedidoEdicaoId) {
      $financialIntegration->reverseCanceledOrder($conn, $lojaId, (int) $pedidoEdicaoId);
    }
  } catch (Throwable $financeiroErro) {
    error_log('Erro ao sincronizar pedido salvo no financeiro: ' . $financeiroErro->getMessage());
  }

  registrarOperacao($conn, 'pedido_criado', 'pedido:' . $pedidoId, [
    'total' => $total,
    'tipo' => $tipo
  ]);
  if ($pedidoEdicaoId) {
    registrarOperacao($conn, 'pedido_editado', 'pedido:' . $pedidoEdicaoId, [
      'novo_pedido' => $pedidoId
    ]);
  }

  echo json_encode([
    'ok'=>true,
    'pedido_id'=>$pedidoId,
    'tipo'=>$tipo
  ]);
  exit;

} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok'=>false,'msg'=>$e->getMessage()]);
  exit;
}
