<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.pdv');

/* Bloquear acesso direto ao PDV — usar apenas via Modal de Lançar Pedidos */
$modoModalFlag = isset($_GET['modal']) && $_GET['modal'] === '1';
if (!$modoModalFlag) {
  $dest = 'gestor_pedidos.php';
  if (!empty($_GET['pedido_id'])) {
    $dest .= '?pedido=' . (int)$_GET['pedido_id'];
  }
  header("Location: $dest");
  exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/config.php';

function tabelaExistePdv(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

$operadorNome = $_SESSION['admin_nome'] ?? 'Operador';
$operadorPerfil = $_SESSION['admin_perfil'] ?? 'admin';
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$pedidoEdicaoId = isset($_GET['pedido_id']) ? (int) $_GET['pedido_id'] : 0;
$modoEdicao = $pedidoEdicaoId > 0;
$modoModal = isset($_GET['modal']) && $_GET['modal'] === '1';

/* PRODUTOS */
$produtoColunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temOrdem = in_array('ordem', $produtoColunas, true);
$temPrecoPromocional = in_array('preco_promocional', $produtoColunas, true);
$temPromoDesativado = in_array('promo_desativado', $produtoColunas, true);
$temImagem = in_array('imagem', $produtoColunas, true);
$temVariacoesCol = in_array('tem_variacoes', $produtoColunas, true);
$temPontosGanho = in_array('pontos_ganho', $produtoColunas, true);
$temPontosCusto = in_array('pontos_custo', $produtoColunas, true);
$precoExpr = ($temPrecoPromocional && $temPromoDesativado)
  ? "IF(p.promo_desativado = 0 AND p.preco_promocional IS NOT NULL AND p.preco_promocional > 0, p.preco_promocional, p.preco)"
  : "p.preco";
$promoExpr = ($temPrecoPromocional && $temPromoDesativado)
  ? "CASE WHEN p.promo_desativado = 0 AND p.preco_promocional IS NOT NULL AND p.preco_promocional > 0 THEN 1 ELSE 0 END"
  : "0";
$ordenacaoProdutos = $temOrdem
  ? "ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.ordem IS NULL, p.ordem, p.nome"
  : "ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.nome";

$selectImagem = $temImagem ? ', p.imagem' : '';
$selectVariacoes = $temVariacoesCol ? ', p.tem_variacoes' : '';
$selectPontosGanho = $temPontosGanho ? ', p.pontos_ganho' : '';
$selectPontosCusto = $temPontosCusto ? ', p.pontos_custo' : '';
$stmtProdutos = $conn->prepare("
  SELECT p.id, p.nome, p.preco AS preco_base, $precoExpr AS preco, $promoExpr AS em_promocao, p.categoria_id,
         IFNULL(e.quantidade, 0) AS estoque_quantidade{$selectImagem}{$selectVariacoes}{$selectPontosGanho}{$selectPontosCusto}
  FROM produtos p
  LEFT JOIN categorias c ON c.id = p.categoria_id AND c.loja_id = p.loja_id
  LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
  WHERE p.ativo = 1
    AND p.loja_id = ?
    AND IFNULL(e.quantidade, 0) >= 0
  $ordenacaoProdutos
");
$stmtProdutos->execute([$lojaId]);
$produtos = $stmtProdutos->fetchAll(PDO::FETCH_ASSOC);

$temProdutosComPontos = false;
foreach ($produtos as $produto) {
  $ganho = (int) ($produto['pontos_ganho'] ?? 0);
  $custo = (int) ($produto['pontos_custo'] ?? 0);
  if ($ganho > 0 || $custo > 0) {
    $temProdutosComPontos = true;
    break;
  }
}

$cuponsDisponiveis = [];
$temCuponsDisponiveis = false;
$stmtCupons = $conn->prepare("SHOW TABLES LIKE 'cupons'");
$stmtCupons->execute();
if ($stmtCupons->fetchColumn()) {
  $sql = "SELECT codigo, quantidade_total, quantidade_usada, ativo FROM cupons WHERE ativo = 1 AND loja_id = ?";
  $stmt = $conn->prepare($sql);
  $stmt->execute([$lojaId]);
  $cupons = $stmt->fetchAll(PDO::FETCH_ASSOC);
  foreach ($cupons as $cupom) {
    $total = (int) ($cupom['quantidade_total'] ?? 0);
    $usada = (int) ($cupom['quantidade_usada'] ?? 0);
    if ($total > 0 && $usada >= $total) {
      continue;
    }
    $codigo = trim((string) ($cupom['codigo'] ?? ''));
    if ($codigo === '') {
      continue;
    }
    $cuponsDisponiveis[] = ['codigo' => $codigo];
  }
  $temCuponsDisponiveis = count($cuponsDisponiveis) > 0;
}

$stmtCategorias = $conn->prepare("
  SELECT id, nome
  FROM categorias
  WHERE loja_id = ?
  ORDER BY ordem IS NULL, ordem, nome
");
$stmtCategorias->execute([$lojaId]);
$categorias = $stmtCategorias->fetchAll(PDO::FETCH_ASSOC);

/* COMBOS */
$combos = [];
try {
  $stmtTblCombo = $conn->query("SHOW TABLES LIKE 'combos'");
  if ($stmtTblCombo->fetchColumn()) {
    $comboColunas = $conn->query("SHOW COLUMNS FROM combos")->fetchAll(PDO::FETCH_COLUMN, 0);
    $cbTemImg = in_array('imagem', $comboColunas, true);
    $cbTemProm = in_array('preco_promocional', $comboColunas, true) && in_array('promo_desativado', $comboColunas, true);
    $cbTemOrdem = in_array('ordem', $comboColunas, true);
    $cbImgSel = $cbTemImg ? ', imagem' : '';
    $cbPromSel = $cbTemProm ? ', preco_promocional, promo_desativado' : '';
    $cbOrd = $cbTemOrdem ? 'ORDER BY ordem IS NULL, ordem, nome' : 'ORDER BY nome';
    $stmtCombos = $conn->prepare("
      SELECT id, nome, descricao, preco, categoria_id{$cbImgSel}{$cbPromSel}
      FROM combos
      WHERE loja_id = ? AND ativo = 1
      {$cbOrd}
    ");
    $stmtCombos->execute([$lojaId]);
    $combos = $stmtCombos->fetchAll(PDO::FETCH_ASSOC);
    foreach ($combos as &$combo) {
      $combo['imagem'] = $cbTemImg ? ($combo['imagem'] ?? '') : '';
      $combo['preco_base'] = (float) $combo['preco'];
      if ($cbTemProm && !($combo['promo_desativado'] ?? 1) && ($combo['preco_promocional'] ?? 0) > 0) {
        $combo['preco_final'] = (float) $combo['preco_promocional'];
        $combo['em_promocao'] = 1;
      } else {
        $combo['preco_final'] = $combo['preco_base'];
        $combo['em_promocao'] = 0;
      }
    }
    unset($combo);
  }
} catch (Exception $e) {
}

$temSemCategoria = false;
foreach ($produtos as $produto) {
  if (empty($produto['categoria_id'])) {
    $temSemCategoria = true;
    break;
  }
}
foreach ($combos as $combo) {
  if (empty($combo['categoria_id'])) {
    $temSemCategoria = true;
    break;
  }
}

$contagemCategorias = [];
$contagemSemCategoria = 0;
foreach ($produtos as $produto) {
  if (empty($produto['categoria_id'])) {
    $contagemSemCategoria++;
    continue;
  }
  $catId = (int) $produto['categoria_id'];
  $contagemCategorias[$catId] = ($contagemCategorias[$catId] ?? 0) + 1;
}
foreach ($combos as $combo) {
  if (empty($combo['categoria_id'])) {
    $contagemSemCategoria++;
    continue;
  }
  $catId = (int) $combo['categoria_id'];
  $contagemCategorias[$catId] = ($contagemCategorias[$catId] ?? 0) + 1;
}

$variacoesPorProduto = [];
$variacoesCountPorProduto = [];
if ($temVariacoesCol && $produtos && tabelaExistePdv($conn, 'produto_variacoes')) {
  $ids = array_values(array_unique(array_map(static fn($p) => (int) $p['id'], $produtos)));
  if ($ids) {
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmtVars = $conn->prepare("
      SELECT produto_id, id, tamanho, cor, preco
      FROM produto_variacoes
      WHERE ativo = 1 AND loja_id = ? AND produto_id IN ($placeholders)
      ORDER BY ordem, id
    ");
    $stmtVars->execute(array_merge([$lojaId], $ids));
    foreach ($stmtVars->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $pid = (int) $row['produto_id'];
      $variacoesPorProduto[$pid][] = [
        'id' => (int) $row['id'],
        'tamanho' => $row['tamanho'],
        'cor' => $row['cor'],
        'preco' => (float) $row['preco'],
      ];
      $variacoesCountPorProduto[$pid] = ($variacoesCountPorProduto[$pid] ?? 0) + 1;
    }
  }
}

$extrasPorProduto = [];
$extrasObrigatorioPorProduto = [];
if ($produtos && tabelaExistePdv($conn, 'produto_extras')) {
  $ids = array_values(array_unique(array_map(static fn($p) => (int) $p['id'], $produtos)));
  if ($ids) {
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmtExt = $conn->prepare("
      SELECT produto_id, id, nome, preco, obrigatorio
      FROM produto_extras
      WHERE ativo = 1 AND loja_id = ? AND produto_id IN ($placeholders)
      ORDER BY ordem, id
    ");
    $stmtExt->execute(array_merge([$lojaId], $ids));
    foreach ($stmtExt->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $pid = (int) $row['produto_id'];
      $extrasPorProduto[$pid][] = [
        'id' => (int) $row['id'],
        'nome' => $row['nome'],
        'preco' => (float) $row['preco'],
        'obrigatorio' => (int) $row['obrigatorio'],
      ];
      if (!empty($row['obrigatorio'])) {
        $extrasObrigatorioPorProduto[$pid] = 1;
      }
    }
  }
}

$complementosItensPorProduto = [];
$complementosItensObrigatorioPorProduto = [];
if ($produtos && tabelaExistePdv($conn, 'produto_complementos_itens')) {
  $ids = array_values(array_unique(array_map(static fn($p) => (int) $p['id'], $produtos)));
  if ($ids) {
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmtCompItens = $conn->prepare("
      SELECT produto_id, id, nome, preco, obrigatorio
      FROM produto_complementos_itens
      WHERE ativo = 1 AND loja_id = ? AND produto_id IN ($placeholders)
      ORDER BY ordem, id
    ");
    $stmtCompItens->execute(array_merge([$lojaId], $ids));
    foreach ($stmtCompItens->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $pid = (int) $row['produto_id'];
      $complementosItensPorProduto[$pid][] = [
        'id' => (int) $row['id'],
        'nome' => $row['nome'],
        'preco' => (float) $row['preco'],
        'obrigatorio' => (int) $row['obrigatorio'],
      ];
      if (!empty($row['obrigatorio'])) {
        $complementosItensObrigatorioPorProduto[$pid] = 1;
      }
    }
  }
}

$taxasBairro = [];
$taxasBairroRaw = config($conn, 'taxas_bairro', '');
if ($taxasBairroRaw) {
  $decoded = json_decode($taxasBairroRaw, true);
  if (is_array($decoded)) {
    $taxasBairro = $decoded;
  }
}

$taxaPadraoEntrega = (float) config($conn, 'taxa_entrega', 0);
$taxaEntregaTipo = config($conn, 'taxa_entrega_tipo', 'dinamica');
$taxaEntregaGratis = config($conn, 'taxa_entrega_gratis', '0') === '1';
$pedidoMinimoEntrega = (float) config($conn, 'pedido_minimo', 0);
$tempoPreparoMin = (int) config($conn, 'tempo_preparo_min', 20);
$tempoEntregaMin = (int) config($conn, 'tempo_entrega_min', 30);
$tempoRetiradaMin = (int) config($conn, 'tempo_retirada_min', 15);
$pedidoEntregaAtivo = config($conn, 'pedido_entrega_ativo', '1') === '1';
$pedidoRetiradaAtivo = config($conn, 'pedido_retirada_ativo', '1') === '1';
$pedidoLocalAtivo = config($conn, 'pedido_local_ativo', '0') === '1';
$cashbackAtivo = config($conn, 'cashback_ativo', '0') === '1';
$cashbackPercentual = (float) config($conn, 'cashback_percentual', 0);
$clubePontosAtivo = config($conn, 'clube_pontos_ativo', '0') === '1';
$cashbackExpiraDias = (int) config($conn, 'cashback_expira_dias', 0);
$agendamentoDeliveryAtivo = config($conn, 'agendamento_delivery_ativo', '0') === '1';
$agendamentoDeliveryMinTipo = config($conn, 'agendamento_delivery_min_tipo', 'dias');
$agendamentoDeliveryMinValor = (int) config($conn, 'agendamento_delivery_min_valor', 1);
$agendamentoDeliveryMaxTipo = config($conn, 'agendamento_delivery_max_tipo', 'dias');
$agendamentoDeliveryMaxValor = (int) config($conn, 'agendamento_delivery_max_valor', 30);
$agendamentoDeliveryHorariosRaw = config($conn, 'agendamento_delivery_horarios', '');
$agendamentoRetiradaAtivo = config($conn, 'agendamento_retirada_ativo', '0') === '1';
$agendamentoRetiradaMinTipo = config($conn, 'agendamento_retirada_min_tipo', 'dias');
$agendamentoRetiradaMinValor = (int) config($conn, 'agendamento_retirada_min_valor', 1);
$agendamentoRetiradaMaxTipo = config($conn, 'agendamento_retirada_max_tipo', 'dias');
$agendamentoRetiradaMaxValor = (int) config($conn, 'agendamento_retirada_max_valor', 30);
$agendamentoRetiradaHorariosRaw = config($conn, 'agendamento_retirada_horarios', '');

$taxasDinamicas = [];
if (tabelaExistePdv($conn, 'taxas_dinamicas')) {
  $stmt = $conn->prepare("
    SELECT id, distancia_km, valor, tipo, tempo_min, tempo_max
    FROM taxas_dinamicas
    WHERE loja_id = ?
    ORDER BY distancia_km
  ");
  $stmt->execute([$lojaId]);
  $taxasDinamicas = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
}


function normalizarAgendamentoHorarios($raw): array {
  if (!$raw) {
    return [];
  }
  $dados = json_decode((string) $raw, true);
  if (!is_array($dados)) {
    return [];
  }
  $saida = [];
  foreach ($dados as $dia => $info) {
    if (is_array($info) && isset($info['inicio'], $info['fim'])) {
      $diaId = (int) $dia;
      if ($diaId > 0) {
        $saida[$diaId] = [
          'inicio' => (string) $info['inicio'],
          'fim' => (string) $info['fim']
        ];
      }
      continue;
    }
    if (is_array($info) && isset($info['dia'], $info['inicio'], $info['fim'])) {
      $diaId = (int) $info['dia'];
      if ($diaId > 0) {
        $saida[$diaId] = [
          'inicio' => (string) $info['inicio'],
          'fim' => (string) $info['fim']
        ];
      }
    }
  }
  return $saida;
}

$agendamentoDeliveryHorarios = normalizarAgendamentoHorarios($agendamentoDeliveryHorariosRaw);
$agendamentoRetiradaHorarios = normalizarAgendamentoHorarios($agendamentoRetiradaHorariosRaw);

if (!$pedidoEntregaAtivo && !$pedidoRetiradaAtivo && !$pedidoLocalAtivo) {
  $pedidoRetiradaAtivo = true;
}
$tipoPedidoDefault = $pedidoRetiradaAtivo ? 'retirada' : ($pedidoEntregaAtivo ? 'entrega' : 'mesa');
$usarPlaceholderTipo = $modoModal && !$modoEdicao;

/* CLIENTES */
$clientesColunas = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$temCashbackSaldoCliente = in_array('cashback_saldo', $clientesColunas, true);
$temPontosSaldoCliente = in_array('pontos_saldo', $clientesColunas, true);
$temPontosCliente = in_array('pontos', $clientesColunas, true);
$temTabelaPontosMovCliente = tabelaExistePdv($conn, 'pontos_movimentacoes');
$selectCashbackSaldo = $temCashbackSaldoCliente ? ", cashback_saldo" : "";
$selectPontosCliente = '';
$groupColsPontos = [];
if ($temPontosSaldoCliente) {
  $groupColsPontos[] = 'c.pontos_saldo';
}
if ($temPontosCliente) {
  $groupColsPontos[] = 'c.pontos';
}
if ($temPontosSaldoCliente && $temPontosCliente) {
  $selectPontosCliente = ", CASE
      WHEN COALESCE(c.pontos_saldo, 0) > 0 THEN c.pontos_saldo
      WHEN COALESCE(c.pontos, 0) > 0 THEN c.pontos
      ELSE COALESCE(c.pontos_saldo, c.pontos, 0)
    END AS pontos";
} elseif ($temPontosSaldoCliente) {
  $selectPontosCliente = ", c.pontos_saldo AS pontos";
} elseif ($temPontosCliente) {
  $selectPontosCliente = ", c.pontos AS pontos";
}
$selectPontosMovCliente = $temTabelaPontosMovCliente ? ",
         (
           SELECT pm.saldo_depois
           FROM pontos_movimentacoes pm
           WHERE pm.cliente_id = c.id
             AND pm.loja_id = c.loja_id
             AND pm.tipo <> 'pendente'
           ORDER BY pm.criado_em DESC, pm.id DESC
           LIMIT 1
         ) AS pontos_mov" : "";
$groupCols = ['c.id', 'c.nome', 'c.telefone', 'c.endereco'];
if ($temCashbackSaldoCliente) $groupCols[] = 'c.cashback_saldo';
foreach ($groupColsPontos as $colPontos) {
  $groupCols[] = $colPontos;
}
$groupBySql = implode(', ', $groupCols);
$stmtClientes = $conn->prepare("
  SELECT c.id,
         c.nome,
         c.telefone,
         c.endereco{$selectCashbackSaldo}{$selectPontosCliente}{$selectPontosMovCliente},
         MAX(p.criado_em) AS ultimo_pedido
  FROM clientes c
  LEFT JOIN pedidos p
    ON p.cliente_id = c.id AND p.loja_id = c.loja_id
  WHERE c.loja_id = ?
  GROUP BY {$groupBySql}
  ORDER BY ultimo_pedido DESC, c.nome
");
$stmtClientes->execute([$lojaId]);
$clientes = $stmtClientes->fetchAll(PDO::FETCH_ASSOC);
foreach ($clientes as &$clienteItem) {
  $saldoMov = isset($clienteItem['pontos_mov']) && $clienteItem['pontos_mov'] !== null
    ? (int) $clienteItem['pontos_mov']
    : null;
  $saldoCadastro = isset($clienteItem['pontos']) ? (int) $clienteItem['pontos'] : 0;
  $clienteItem['pontos'] = $saldoMov !== null ? $saldoMov : $saldoCadastro;
  unset($clienteItem['pontos_mov']);
}
unset($clienteItem);


$pdvCssVer = filemtime(__DIR__ . '/assets/css/pdv.css');
$pdvJsVer = filemtime(__DIR__ . '/assets/js/pdv.js');
$pdvOfflineJsVer = filemtime(__DIR__ . '/assets/js/pdv_offline.js');
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>PDV - <?= $modoEdicao ? 'Editar Pedido' : 'Novo Pedido' ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

<link href="./assets/css/pdv.css?v=<?= $pdvCssVer ?>" rel="stylesheet">
</head>

<body class="pdv-page<?= $modoModal ? ' pdv-modal' : '' ?>">

<div class="container-xxl py-4 pdv-shell">

  <div class="pdv-offline-banner d-none" id="pdvOfflineBanner">
    <i class="bi bi-wifi-off"></i> Modo offline — as vendas estão sendo salvas localmente
  </div>
  <button type="button" class="pdv-offline-badge d-none" id="pdvOfflineBadge">
    <i class="bi bi-cloud-arrow-up"></i>
    <span class="pdv-offline-badge-count">0</span> venda(s) pendente(s) de sincronizar
  </button>

  <div class="pdv-hero pdv-animate" style="--delay: 0.02s;">
    <div>
      <span class="pdv-kicker"><i class="bi bi-shop"></i> PDV</span>
      <h1 class="pdv-title">
        <?= $modoEdicao ? 'Editar pedido #' . $pedidoEdicaoId : 'Novo pedido' ?>
      </h1>
      <p class="pdv-subtitle">
        <?= $modoEdicao ? 'Ajuste os dados e salve novamente.' : 'Monte o pedido em poucos cliques, no ritmo do balcao.' ?>
      </p>
      <div class="pdv-hero-meta">
        <div class="pdv-meta-pill">
          Operador <span><?= htmlspecialchars($operadorNome) ?></span>
        </div>
        <div class="pdv-meta-pill">
          Perfil <span><?= htmlspecialchars(ucfirst($operadorPerfil)) ?></span>
        </div>
        <div class="pdv-meta-pill pdv-meta-status">
          <span class="pdv-status-dot fechado" id="caixaStatusDot"></span>
          Caixa <span id="caixaResumo">Fechado</span>
        </div>
      </div>
    </div>
    <div class="pdv-hero-actions">
      <button type="button" class="btn btn-pdv-ghost" id="btnFullscreen">
        <i class="bi bi-arrows-fullscreen"></i> Tela cheia
      </button>
      <button type="button" class="btn btn-pdv-outline" id="btnCaixa">
        Caixa
      </button>
      
      <a class="btn btn-pdv-outline" href="gestor_pedidos.php" onclick="voltarGestor(); return false;">
        Cancelar
      </a>
      
    </div>
  </div>

  <div class="pdv-modal-info pdv-animate" style="--delay: 0.06s;">
    <div class="pdv-meta-pill" id="operadorPillModal">
      Operador <span><?= htmlspecialchars($operadorNome) ?></span>
    </div>
    <div class="pdv-meta-pill">
      Perfil <span><?= htmlspecialchars(ucfirst($operadorPerfil)) ?></span>
    </div>
    <div class="pdv-meta-pill pdv-meta-status">
      <span class="pdv-status-dot fechado" id="caixaStatusDotModal"></span>
      Caixa <span id="caixaResumoModal">Fechado</span>
    </div>
    <div class="pdv-meta-pill pdv-meta-badge" id="caixaBadgeModal">
      <i class="bi bi-unlock"></i> Caixa aberto
    </div>
  </div>

  <form id="formPDV" class="mt-4">
    <div class="row g-4">
      <div class="col-lg-8">
        <div class="pdv-section mb-4 pdv-animate" style="--delay: 0.14s;">
          <div class="pdv-section-head">
            <div>
              <h6 class="pdv-section-title">Produtos</h6>
              <p class="pdv-section-subtitle">Selecione itens, ajuste quantidade e confira.</p>
            </div>
          </div>

          <div class="card pdv-card">
            <div class="card-body">
              <div class="pdv-products-tools">
                <div class="pdv-tabs-nav">
                  <button type="button" class="pdv-tabs-arrow pdv-tabs-arrow--hidden" id="pdvTabsPrev" aria-label="Anterior">
                    <i class="bi bi-chevron-left"></i>
                  </button>
                  <div class="nav pdv-tabs" id="pdvTabsRow">
                    <button type="button" class="nav-link pdv-tab active" data-categoria="all" data-label="Todos">
                      Todos <span class="pdv-tab-count"><?= count($produtos) ?></span>
                    </button>
                    <?php foreach($categorias as $c): ?>
                      <button type="button"
                              class="nav-link pdv-tab"
                              data-categoria="<?= $c['id'] ?>"
                              data-label="<?= htmlspecialchars($c['nome'], ENT_QUOTES, 'UTF-8') ?>">
                        <?= htmlspecialchars($c['nome']) ?>
                        <span class="pdv-tab-count"><?= $contagemCategorias[$c['id']] ?? 0 ?></span>
                      </button>
                    <?php endforeach ?>
                    <?php if ($temSemCategoria): ?>
                      <button type="button" class="nav-link pdv-tab" data-categoria="sem" data-label="Sem categoria">
                        Sem categoria <span class="pdv-tab-count"><?= $contagemSemCategoria ?></span>
                      </button>
                    <?php endif ?>
                  </div>
                  <button type="button" class="pdv-tabs-arrow" id="pdvTabsNext" aria-label="Próximo">
                    <i class="bi bi-chevron-right"></i>
                  </button>
                </div>
                <div class="pdv-search-row">
                  <div class="pdv-search-field">
                    <label class="pdv-search-label">Pesquisa</label>
                    <div class="input-group pdv-search-input">
                      <span class="input-group-text"><i class="bi bi-search"></i></span>
                      <input type="text"
                             class="form-control"
                             id="produtoBusca"
                             placeholder="Nome ou codigo">
                    </div>
                  </div>
                  <button type="button" class="pdv-search-btn" id="pdvViewToggleBtn" aria-label="Visualizacao dos produtos" title="Visualizacao em grade">
                    <i class="bi bi-grid-3x3-gap" id="pdvViewToggleIcon"></i>
                  </button>
                </div>
                
                <div class="pdv-help">
                  Atalhos: F2 Produtos, F3 Cliente, F4 Tela cheia, Ctrl+Enter Finalizar
                </div>
              </div>

              <div class="row g-2 align-items-end mb-3">
                <div class="col-12">
                  <div class="pdv-products-area">
                    <div class="pdv-products-header">
                      <button type="button" class="pdv-avulso-card" id="btnAvulso" data-bs-toggle="modal" data-bs-target="#modalAvulso">
                        <span class="pdv-avulso-label">Item avulso</span>
                        <span class="pdv-avulso-btn"><i class="bi bi-plus"></i></span>
                      </button>
                      <div class="form-check form-switch pdv-promo-pill">
                        <input class="form-check-input" type="checkbox" id="pdvFiltroPromo">
                        <label class="form-check-label" for="pdvFiltroPromo">Somente promo</label>
                      </div>
                    </div>
                    <div class="pdv-points-hint d-none" id="pdvAvisoPontosCliente">
                      <i class="bi bi-stars"></i>
                      Selecione um cliente para acumular ou resgatar pontos.
                    </div>
                    <div class="pdv-category-title" id="pdvCategoriaTitulo">Todos</div>
                    <div class="pdv-products-grid pdv-view-grid" id="pdvProductsGrid">
                      <?php foreach($produtos as $p): ?>
                        <div class="pdv-product-card<?= ($p['em_promocao'] ?? 0) ? ' promo' : '' ?><?= (!empty($p['tem_variacoes']) && (int) $p['tem_variacoes'] === 1) ? ' has-variacoes' : '' ?>"
                             role="button" tabindex="0"
                             data-id="<?= $p['id'] ?>"
                             data-nome="<?= htmlspecialchars($p['nome']) ?>"
                             data-preco="<?= $p['preco'] ?>"
                             data-variacoes="<?= (!empty($p['tem_variacoes']) && (int) $p['tem_variacoes'] === 1) ? 1 : 0 ?>"
                             data-variacoes-count="<?= (int) ($variacoesCountPorProduto[(int) $p['id']] ?? 0) ?>"
                             data-variacoes-json='<?= htmlspecialchars(json_encode($variacoesPorProduto[(int) $p['id']] ?? []), ENT_QUOTES, "UTF-8") ?>'
                             data-pontos-ganho="<?= $temPontosGanho ? (int) ($p['pontos_ganho'] ?? 0) : 0 ?>"
                             data-pontos-custo="<?= $temPontosCusto ? (int) ($p['pontos_custo'] ?? 0) : 0 ?>"
                             data-estoque="<?= (int) $p['estoque_quantidade'] ?>"
                             data-categoria="<?= $p['categoria_id'] ? $p['categoria_id'] : 'sem' ?>">
                          <div class="pdv-product-thumb">
                            <?php if (!empty($p['imagem'])): ?>
                              <img src="<?= htmlspecialchars($p['imagem'], ENT_QUOTES, 'UTF-8') ?>" alt="">
                            <?php else: ?>
                              <i class="bi bi-image"></i>
                            <?php endif; ?>
                          </div>
                          <?php if (($p['em_promocao'] ?? 0) == 1): ?>
                            <div class="pdv-product-badge">Promo</div>
                          <?php endif; ?>
                          <?php if ($clubePontosAtivo && $temPontosCusto && (int) ($p['pontos_custo'] ?? 0) > 0): ?>
                            <div class="pdv-product-resgate">Resgate</div>
                          <?php endif; ?>
                          <div class="pdv-product-body">
                            <div class="pdv-product-name"><?= htmlspecialchars($p['nome']) ?></div>
                            <div class="pdv-product-price">
                              <?php if (($p['em_promocao'] ?? 0) == 1): ?>
                                <span class="pdv-product-price-old">R$ <?= number_format($p['preco_base'],2,',','.') ?></span>
                                <span class="pdv-product-price-new">R$ <?= number_format($p['preco'],2,',','.') ?></span>
                              <?php else: ?>
                                <span>R$ <?= number_format($p['preco'],2,',','.') ?></span>
                              <?php endif; ?>
                              <?php if ($clubePontosAtivo && $temPontosCusto && (int) ($p['pontos_custo'] ?? 0) > 0): ?>
                                <button type="button"
                                        class="pdv-product-resgate-btn pdv-tooltip"
                                        data-action="resgatar"
                                        data-pontos="<?= (int) ($p['pontos_custo'] ?? 0) ?>"
                                        data-tooltip="Resgatar <?= (int) ($p['pontos_custo'] ?? 0) ?> pts"
                                        aria-label="Resgatar com pontos">
                                  <i class="bi bi-stars"></i>
                                </button>
                              <?php endif; ?>
                            </div>
                            <div class="pdv-product-variacao">Variações: <?= (int) ($variacoesCountPorProduto[(int) $p['id']] ?? 0) ?></div>
                            <div class="pdv-product-stock <?= ((int) $p['estoque_quantidade']) > 0 ? 'is-ok' : 'is-empty' ?>">
                              <i class="bi <?= ((int) $p['estoque_quantidade']) > 0 ? 'bi-box-seam' : 'bi-exclamation-circle' ?>"></i>
                              <span class="pdv-product-stock-text">
                                <?= ((int) $p['estoque_quantidade']) > 0
                                  ? ((int) $p['estoque_quantidade']) . ' em estoque'
                                  : 'Sem estoque' ?>
                              </span>
                            </div>
                            <div class="pdv-product-qty">
                              <button type="button" class="pdv-qty-btn minus" data-action="minus">-</button>
                              <input type="text" class="pdv-qty-value pdv-qty-input" value="0" inputmode="numeric" autocomplete="off" aria-label="Quantidade">
                              <button type="button" class="pdv-qty-btn plus" data-action="plus">+</button>
                            </div>
                          </div>
                        </div>
                      <?php endforeach ?>
                      <?php foreach($combos as $cb): ?>
                        <div class="pdv-product-card pdv-product-card--combo"
                             role="button" tabindex="0"
                             data-id="<?= (int) $cb['id'] ?>"
                             data-nome="<?= htmlspecialchars($cb['nome']) ?>"
                             data-preco="<?= $cb['preco_final'] ?>"
                             data-combo="1"
                             data-estoque="999999"
                             data-categoria="<?= $cb['categoria_id'] ? (int) $cb['categoria_id'] : 'sem' ?>">
                          <div class="pdv-product-thumb">
                            <?php if (!empty($cb['imagem'])): ?>
                              <img src="<?= htmlspecialchars($cb['imagem'], ENT_QUOTES, 'UTF-8') ?>" alt="">
                            <?php else: ?>
                              <i class="bi bi-bag-heart"></i>
                            <?php endif; ?>
                          </div>
                          <div class="pdv-product-badge pdv-product-badge--combo">Combo</div>
                          <div class="pdv-product-body">
                            <div class="pdv-product-name"><?= htmlspecialchars($cb['nome']) ?></div>
                            <div class="pdv-product-price">
                              <?php if ($cb['em_promocao']): ?>
                                <span class="pdv-product-price-old">R$ <?= number_format($cb['preco_base'],2,',','.') ?></span>
                                <span class="pdv-product-price-new">R$ <?= number_format($cb['preco_final'],2,',','.') ?></span>
                              <?php else: ?>
                                <span>R$ <?= number_format($cb['preco_final'],2,',','.') ?></span>
                              <?php endif; ?>
                            </div>
                            <div class="pdv-product-variacao">Monte seu combo</div>
                            <div class="pdv-product-qty">
                              <button type="button" class="pdv-qty-btn minus" data-action="minus">-</button>
                              <input type="text" class="pdv-qty-value pdv-qty-input" value="0" inputmode="numeric" autocomplete="off" aria-label="Quantidade">
                              <button type="button" class="pdv-qty-btn plus" data-action="plus">+</button>
                            </div>
                          </div>
                        </div>
                      <?php endforeach ?>
                    </div>
                  </div>
                </div>
              </div>

<div id="listaProdutos" class="d-none"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="pdv-side">
          <div class="pdv-side-top">
          <div class="card pdv-card mb-4 pdv-animate" style="--delay: 0.2s;">
            <div class="card-body">
              <div class="pdv-section-head">
                <div>
                  <h6 class="pdv-section-title">Pagamento</h6>
                  <p class="pdv-section-subtitle">Defina entrega e forma de pagamento.</p>
                </div>
                <span class="pdv-tag">Etapa 2</span>
              </div>

              <div class="row g-3">
                <div class="col-12">
                  <div class="pdv-type-row">
                    <div class="flex-grow-1">
                      <label class="form-label">Tipo do pedido</label>
                      <div class="pdv-type-select<?= $modoModal ? ' use-native' : '' ?>" id="tipoPedidoSelect">
                        <button type="button" class="pdv-type-trigger" id="tipoPedidoBtn">
                          <span id="tipoPedidoLabel">Escolha o tipo do pedido</span>
                          <i class="bi bi-chevron-down"></i>
                        </button>
                        <div class="pdv-type-menu" id="tipoPedidoMenu">
                          <?php if ($pedidoEntregaAtivo): ?>
                            <button type="button" class="pdv-type-option" data-value="entrega">
                              <i class="bi bi-truck"></i> Entrega
                            </button>
                          <?php endif; ?>
                          <?php if ($pedidoRetiradaAtivo): ?>
                            <button type="button" class="pdv-type-option" data-value="retirada">
                              <i class="bi bi-bag"></i> Retirada
                            </button>
                          <?php endif; ?>
                          <?php if ($pedidoLocalAtivo): ?>
                            <button type="button" class="pdv-type-option" data-value="mesa">
                              <i class="bi bi-shop"></i> Comer no local
                            </button>
                          <?php endif; ?>
                        </div>
                        <select class="form-select pdv-native-select" name="tipo" id="tipoPedido"
                                onchange="if(window.pdvHandleTipoChange){window.pdvHandleTipoChange(this);}var v=this.value;var d=document.getElementById('pdvSideDetails');if(d){d.classList.toggle('d-none',!v);}document.querySelectorAll('.pdv-retirada').forEach(function(el){el.classList.toggle('d-none',v==='entrega');});var ce=document.getElementById('cardEntregaInfo');if(ce){ce.classList.toggle('d-none',v!=='entrega');}">
                        <?php if ($usarPlaceholderTipo): ?>
                          <option value="" selected>Escolha o tipo do pedido</option>
                        <?php endif; ?>
                        <?php if ($pedidoRetiradaAtivo): ?>
                          <option value="retirada" <?= (!$usarPlaceholderTipo && $tipoPedidoDefault === 'retirada') ? 'selected' : '' ?>>Retirada</option>
                        <?php endif; ?>
                        <?php if ($pedidoEntregaAtivo): ?>
                          <option value="entrega" <?= (!$usarPlaceholderTipo && $tipoPedidoDefault === 'entrega') ? 'selected' : '' ?>>Entrega</option>
                        <?php endif; ?>
                        <?php if ($pedidoLocalAtivo): ?>
                          <option value="mesa" <?= (!$usarPlaceholderTipo && $tipoPedidoDefault === 'mesa') ? 'selected' : '' ?>>Consumo local</option>
                        <?php endif; ?>
                        </select>
                      </div>
                    </div>
                    <div class="pdv-print-config-wrap">
                      <button type="button" class="pdv-icon-btn pdv-icon-muted" id="pdvPrintConfigBtn" aria-label="Configurações de impressão">
                        <i class="bi bi-gear"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="row g-3 pdv-side-details<?= $usarPlaceholderTipo ? ' d-none' : '' ?>" id="pdvSideDetails">
                <div class="col-12" id="blocoAgendamento">
                  <div class="pdv-retirada-card">
                    <div class="pdv-retirada-row">
                      <div>
                        <div class="pdv-retirada-title">Agendamento</div>
                        <div class="pdv-retirada-subtitle">Pedido disponivel para agendamento</div>
                        <div class="pdv-retirada-time" id="agendamentoResumo">Sem horario</div>
                      </div>
                      <div class="pdv-client-actions pdv-agendamento-actions">
                        <button type="button" class="pdv-icon-btn pdv-icon-muted d-none" id="btnAgendamentoLimpar" aria-label="Limpar agendamento">
                          <i class="bi bi-x"></i>
                        </button>
                        <button type="button" class="pdv-icon-btn" id="btnAgendamento" aria-label="Agendar pedido">
                          <i class="bi bi-calendar3"></i>
                        </button>
                      </div>
                    </div>
                    <input type="hidden" id="enderecoAgendamento">
                  </div>
                </div>

                <div class="col-12 pdv-retirada" id="retiradaBuscaWrap">
                  <div class="pdv-retirada-select-wrap">
                    <div class="pdv-retirada-select">
                      <div class="pdv-retirada-search pdv-retirada-search-v2" id="clienteBuscaBox">
                        <div class="pdv-retirada-search-content">
                          <label class="pdv-retirada-search-label" for="clienteBusca">Busque pelo cliente</label>
                          <input type="text"
                                 class="form-control pdv-retirada-search-input"
                                 id="clienteBusca"
                                 placeholder="Pesquise por número ou nome"
                                 onfocus="window.pdvBuscarClienteInput && window.pdvBuscarClienteInput(this)"
                                 oninput="window.pdvBuscarClienteInput && window.pdvBuscarClienteInput(this)">
                        </div>
                        <button type="button"
                                class="pdv-retirada-recentes-btn"
                                id="clienteBuscaRecentesBtn"
                                aria-label="Mostrar clientes recentes">
                          <i class="bi bi-chevron-down pdv-retirada-chevron"></i>
                        </button>
                      </div>
                      <div class="list-group mt-2 d-none" id="listaClientes"></div>
                      <input type="hidden" name="cliente_id" id="clienteId">
                    </div>
                    <button type="button"
                            class="pdv-icon-btn pdv-retirada-action pdv-retirada-action-client"
                            data-bs-toggle="modal"
                            data-bs-target="#modalCliente"
                            aria-label="Novo cliente">
                      <i class="bi bi-person-plus"></i>
                    </button>
                  </div>
                </div>

                <div class="col-12 d-none" id="cardClienteInfo">
                  <div class="pdv-retirada-card pdv-client-card">
                    <div class="pdv-retirada-row">
                      <div>
                        <div class="pdv-retirada-title">Cliente</div>
                        <div class="pdv-client-value">
                          <span id="clienteResumoNome">-</span>
                          <span class="pdv-client-phone" id="clienteResumoTelefone"></span>
                        </div>
                      </div>
                      <div class="pdv-client-actions">
                        <button type="button" class="pdv-icon-btn pdv-icon-muted" id="btnClienteLimpar" aria-label="Limpar cliente">
                          <i class="bi bi-x"></i>
                        </button>
                        <button type="button" class="pdv-icon-btn" id="btnClienteDetalhe" aria-label="Editar cliente">
                          <i class="bi bi-pencil"></i>
                        </button>
                      </div>
                    </div>
                    <div class="pdv-client-toggle">
                      <span>Cashback nesta compra?</span>
                      <div class="form-check form-switch m-0">
                        <input class="form-check-input" type="checkbox" id="cashbackCliente" <?= ($cashbackAtivo && $cashbackPercentual > 0) ? '' : 'disabled' ?>>
                      </div>
                    </div>
                    <div class="pdv-client-note d-none" id="cashbackPreviewCliente"></div>
                    <div class="pdv-client-toggle d-none" id="cashbackUsoWrap">
                      <span id="cashbackUsoLabel">Usar cashback (R$ 0,00)</span>
                      <div class="form-check form-switch m-0">
                        <input class="form-check-input" type="checkbox" id="cashbackUsar" disabled>
                      </div>
                    </div>
                    <div class="pdv-client-toggle is-soft<?= $clubePontosAtivo ? '' : ' d-none' ?>" id="pontosSaldoWrap">
                      <span>Saldo de pontos</span>
                      <strong id="clientePontosSaldo">0 pts</strong>
                    </div>
                  </div>
                </div>

                <div class="col-12 d-none" id="cardEntregaInfo">
                  <div class="pdv-retirada-card pdv-entrega-card">
                    <div class="pdv-retirada-row">
                      <div>
                        <div class="pdv-retirada-title">Endereço de entrega</div>
                        <div class="pdv-entrega-placeholder" id="entregaResumoPlaceholder">Preencha os dados de entrega.</div>
                        <div class="pdv-entrega-line d-none" id="entregaResumoRua"></div>
                        <div class="pdv-entrega-line d-none" id="entregaResumoBairro"></div>
                        <div class="pdv-entrega-line d-none" id="entregaResumoCep"></div>
                        <div class="pdv-entrega-line d-none" id="entregaResumoComplemento"></div>
                        <div class="pdv-entrega-tax">
                          <span>Taxa de entrega</span>
                          <strong id="entregaResumoTaxa">R$ 0,00</strong>
                        </div>
                      </div>
                      <div class="pdv-client-actions">
                        <button type="button" class="pdv-icon-btn pdv-icon-muted" id="btnEntregaLimpar" aria-label="Limpar endereco">
                          <i class="bi bi-x"></i>
                        </button>
                        <button type="button" class="pdv-icon-btn" id="btnEntregaEditar" aria-label="Editar endereco">
                          <i class="bi bi-pencil"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-12 d-none pdv-entrega" id="campoEndereco">
                  <label class="form-label">Endereco</label>
                  <input type="text"
                         class="form-control"
                         id="enderecoRua"
                         placeholder="Rua, numero">
                </div>

                <div class="col-6 d-none pdv-entrega" id="campoBairro">
                  <label class="form-label">Bairro</label>
                  <input type="text"
                         class="form-control"
                         id="enderecoBairro"
                         list="listaBairros"
                         placeholder="Bairro">
                  <?php if (!empty($taxasBairro)): ?>
                    <datalist id="listaBairros">
                      <?php foreach ($taxasBairro as $bairro => $taxa): ?>
                        <option value="<?= htmlspecialchars((string)$bairro) ?>"></option>
                      <?php endforeach ?>
                    </datalist>
                  <?php endif ?>
                </div>

                <div class="col-6 d-none pdv-entrega" id="campoCep">
                  <label class="form-label">CEP</label>
                  <input type="text"
                         class="form-control"
                         id="enderecoCep"
                         placeholder="00000-000">
                </div>

                <div class="col-12 d-none pdv-entrega" id="campoComplemento">
                  <label class="form-label">Complemento</label>
                  <input type="text"
                         class="form-control"
                         id="enderecoComplemento"
                         placeholder="Apartamento, bloco, referencia">
                </div>

                <div class="col-12 d-none pdv-entrega" id="campoPreviewEndereco">
                  <div class="form-text" id="enderecoPreview">Endereco incompleto</div>
                </div>

                <div class="col-12 d-none pdv-entrega" id="campoPrevisao">
                  <div class="form-text">Previsao: <span id="previsaoEntrega">--</span></div>
                </div>

                <input type="hidden" name="endereco" id="enderecoEntrega">
                <input type="hidden" id="enderecoNumero">
                <input type="hidden" id="enderecoCidade">
                <input type="hidden" name="distancia_km" id="enderecoDistancia">

                <div class="col-12 d-none pdv-payment-hidden" id="campoFormaPagamento">
                  <label class="form-label">Forma de pagamento</label>
                  <select class="form-select" name="forma_pagamento" id="formaPagamento">
                    <option value="pix">Pix</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="credito">Credito</option>
                    <option value="debito">Debito</option>
                    <option value="voucher">Voucher</option>
                    <option value="outro">Outro</option>
                    <option value="resgate">Resgate</option>
                    <option value="fiado">Fiado</option>
                  </select>
                </div>

                <div class="col-12 d-none pdv-payment-hidden" id="campoPagamentoDividido">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="pagamentoDividido">
                    <label class="form-check-label" for="pagamentoDividido">Dividir pagamento</label>
                  </div>
                </div>

                <div class="col-12 d-none pdv-payment-hidden" id="blocoSplit">
                  <div class="row g-2">
                    <div class="col-6">
                      <label class="form-label">Forma 1</label>
                      <select class="form-select" id="formaPagamento1">
                        <option value="pix">Pix</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="credito">Credito</option>
                        <option value="debito">Debito</option>
                        <option value="voucher">Voucher</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div class="col-6">
                      <label class="form-label">Valor 1</label>
                      <input type="number" step="0.01" class="form-control" id="valorPagamento1">
                    </div>
                    <div class="col-6">
                      <label class="form-label">Forma 2</label>
                      <select class="form-select" id="formaPagamento2">
                        <option value="pix">Pix</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="credito">Credito</option>
                        <option value="debito">Debito</option>
                        <option value="voucher">Voucher</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div class="col-6">
                      <label class="form-label">Valor 2</label>
                      <input type="number" step="0.01" class="form-control" id="valorPagamento2">
                    </div>
                  </div>
                </div>

                <div class="col-12 d-none pdv-payment-hidden" id="campoValorPago">
                  <label class="form-label">Valor pago</label>
                  <input type="number" step="0.01" class="form-control" id="trocoInput" name="valor_pago">
                  <div class="form-text" id="trocoTexto">Troco: R$ 0,00</div>
                </div>

                  <input type="hidden" id="cupomCodigo" value="">
                  <input type="hidden" id="descontoTipo" value="valor">
                  <input type="hidden" id="descontoValor" value="0">
                  <input type="hidden" name="cashback_aplicado" id="cashbackAplicado" value="0">
                  <input type="hidden" name="cashback_usado" id="cashbackUsado" value="0">

                  <div class="col-12 d-none pdv-payment-hidden" id="campoTaxaMaquininha">
                    <label class="form-label">Taxa maquininha (%)</label>
                    <input type="number" step="0.01" class="form-control" id="taxaMaquininhaPercent" value="0">
                  </div>
                  <div class="col-12 d-none" id="avisoPermissaoDesconto">
                    <small class="text-muted">Desconto, cupom e taxa maquininha liberados apenas para gerencia.</small>
                  </div>

                <div class="col-12 d-none pdv-entrega" id="campoTaxa">
                  <label class="form-label">Taxa de entrega</label>
                  <input type="number" step="0.01" class="form-control" id="taxaEntrega" name="taxa_entrega" value="0.00">
                  <input type="hidden" name="taxa_editada" id="taxaEditada" value="0">
                  <div class="form-text" id="taxaSugestao"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="pdv-side-summary" id="pdvSideSummary">
          <div class="card pdv-card pdv-summary pdv-animate" style="--delay: 0.26s;">
            <div class="card-body">
              <div class="pdv-section-head">
                <div>
                  <h6 class="pdv-section-title">Resumo do pedido</h6>
                  <p class="pdv-section-subtitle">Confira antes de finalizar.</p>
                </div>
              </div>
              <div class="pdv-summary-items" id="resumoItens">
                <div class="pdv-summary-empty"><i class="bi bi-box-seam"></i>Nenhum produto adicionado</div>
              </div>
              <input type="hidden" name="observacoes_cliente" id="observacoesCliente" value="">
            </div>
          </div>
          </div>
          </div><!-- /pdv-side-top -->

          <div class="pdv-side-footer">
            <div id="pdvSummaryDetails" class="pdv-summary-footer<?= $usarPlaceholderTipo ? ' d-none' : '' ?>">
              <div class="summary-line">
                <span>Subtotal</span>
                <span id="subtotalPedido">R$ 0,00</span>
              </div>
              <div class="summary-line" id="linhaTaxaResumo">
                <span>Taxa de entrega</span>
                <span id="taxaResumo">R$ 0,00</span>
              </div>
              <div class="summary-line d-none" id="linhaDesconto">
                <span>Desconto</span>
                <span id="descontoResumo">R$ 0,00</span>
              </div>
              <div class="summary-line d-none" id="linhaCashbackUsado">
                <span>Cashback usado</span>
                <span id="cashbackUsadoResumo">R$ 0,00</span>
              </div>
              <div class="summary-line d-none" id="linhaPontosResgate">
                <span>Pontos resgatados</span>
                <span id="pontosResgateResumo">0 pts</span>
              </div>
              <div class="summary-line d-none" id="linhaTaxaMaquininha">
                <span>Taxa maquininha</span>
                <span id="taxaMaquininhaResumo">R$ 0,00</span>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-line total">
                <span>Total</span>
                <span id="totalPedido">R$ 0,00</span>
              </div>
              <div class="pdv-cashback-summary d-none" id="cashbackResumoActionWrap">
                <button type="button" class="pdv-cashback-summary-btn" id="cashbackResumoAction">
                  <span class="pdv-cashback-summary-icon"><i class="bi bi-currency-dollar"></i></span>
                  <span class="pdv-cashback-summary-text">
                    Usar cashback disponivel de
                    <strong id="cashbackResumoActionValor">R$ 0,00</strong>
                  </span>
                </button>
              </div>
              <div class="summary-line d-none" id="linhaCashback">
                <span id="cashbackLabel">Cashback</span>
                <span id="cashbackResumo">R$ 0,00</span>
              </div>
              <div class="summary-line d-none" id="linhaValorPago">
                <span>Valor pago</span>
                <span id="valorPagoResumo">R$ 0,00</span>
              </div>
              <div class="summary-line d-none" id="linhaTroco">
                <span id="trocoLabel">Troco</span>
                <span id="trocoResumo">R$ 0,00</span>
              </div>
              <?php if ($temCuponsDisponiveis): ?>
                <div class="pdv-coupon-summary d-none" id="cupomResumoContainer">
                  <select class="form-select pdv-coupon-select" id="cupomResumoSelect">
                    <option value="">Selecione um cupom de desconto</option>
                    <?php foreach ($cuponsDisponiveis as $cupom): ?>
                      <option value="<?= htmlspecialchars($cupom['codigo'], ENT_QUOTES, 'UTF-8') ?>">
                        <?= htmlspecialchars($cupom['codigo'], ENT_QUOTES, 'UTF-8') ?>
                      </option>
                    <?php endforeach; ?>
                  </select>
                </div>
              <?php endif; ?>
              <button type="button" class="btn btn-pdv-primary w-100 mt-3" id="btnFinalizarPedido" disabled>
                Finalizar pedido
              </button>
              <div class="pdv-warning d-none" id="avisoCaixaFechado">
                Caixa fechado. Abra o caixa para finalizar o pedido.
              </div>
            </div>
          </div><!-- /pdv-side-footer -->

        </div><!-- /pdv-side -->
      </div>
    </div>
  </form>
</div>

<script>
window.PDV_VARIACOES = <?php echo json_encode($variacoesPorProduto, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
window.PDV_EXTRAS = <?php echo json_encode($extrasPorProduto, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
window.PDV_EXTRAS_OBRIG = <?php echo json_encode($extrasObrigatorioPorProduto, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
window.PDV_COMPLEMENTOS_ITENS = <?php echo json_encode($complementosItensPorProduto, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
window.PDV_COMPLEMENTOS_ITENS_OBRIG = <?php echo json_encode($complementosItensObrigatorioPorProduto, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
</script>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<script>
  const clientes = <?php echo json_encode($clientes); ?>;
  const clubePontosAtivo = <?php echo config($conn, 'clube_pontos_ativo', '0') === '1' ? 'true' : 'false'; ?>;
  const temProdutosComPontos = <?php echo $temProdutosComPontos ? 'true' : 'false'; ?>;
  console.log('PDV clientes carregados:', Array.isArray(clientes) ? clientes.length : clientes);
  const taxasBairroRaw = <?php echo json_encode($taxasBairro); ?>;
  const taxaPadraoEntrega = <?php echo json_encode($taxaPadraoEntrega); ?>;
  const taxaEntregaTipo = <?php echo json_encode($taxaEntregaTipo); ?>;
  const taxaEntregaGratis = <?php echo json_encode($taxaEntregaGratis); ?>;
  const pedidoMinimoEntrega = <?php echo json_encode($pedidoMinimoEntrega); ?>;
  const taxasDinamicas = <?php echo json_encode($taxasDinamicas); ?>;
  const tempoPreparoMin = <?php echo json_encode($tempoPreparoMin); ?>;
  const tempoEntregaMin = <?php echo json_encode($tempoEntregaMin); ?>;
  const tempoRetiradaMin = <?php echo json_encode($tempoRetiradaMin); ?>;
  const cashbackConfig = <?php echo json_encode([
    'ativo' => $cashbackAtivo,
    'percentual' => $cashbackPercentual,
    'expira_dias' => $cashbackExpiraDias
  ]); ?>;
  const agendamentoConfig = <?php echo json_encode([
    'entrega' => [
      'ativo' => $agendamentoDeliveryAtivo,
      'min_tipo' => $agendamentoDeliveryMinTipo,
      'min_valor' => $agendamentoDeliveryMinValor,
      'max_tipo' => $agendamentoDeliveryMaxTipo,
      'max_valor' => $agendamentoDeliveryMaxValor,
      'horarios' => $agendamentoDeliveryHorarios
    ],
    'retirada' => [
      'ativo' => $agendamentoRetiradaAtivo,
      'min_tipo' => $agendamentoRetiradaMinTipo,
      'min_valor' => $agendamentoRetiradaMinValor,
      'max_tipo' => $agendamentoRetiradaMaxTipo,
      'max_valor' => $agendamentoRetiradaMaxValor,
      'horarios' => $agendamentoRetiradaHorarios
    ]
  ], JSON_UNESCAPED_SLASHES); ?>;
    const operadorNome = <?php echo json_encode($operadorNome); ?>;
    const operadorPerfil = <?php echo json_encode($operadorPerfil); ?>;
    const pedidoEdicaoId = <?php echo json_encode($pedidoEdicaoId); ?>;
    const modoEdicao = Number(pedidoEdicaoId || 0) > 0;
    const modoModal = <?php echo json_encode($modoModal); ?>;
  const perfisComDesconto = ['admin', 'gerente'];
  const podeAplicarDesconto = perfisComDesconto.includes(operadorPerfil);

    let total = 0;
    let caixaAtual = null;
    let pedidoEdicaoAplicado = false;

  const btnFullscreen = document.getElementById('btnFullscreen');
  const btnCaixa = document.getElementById('btnCaixa');
  const btnFinalizarPedido = document.getElementById('btnFinalizarPedido');
  const avisoCaixaFechado = document.getElementById('avisoCaixaFechado');
  const caixaResumo = document.getElementById('caixaResumo');
  const caixaStatusDot = document.getElementById('caixaStatusDot');
  const caixaResumoModal = document.getElementById('caixaResumoModal');
  const caixaStatusDotModal = document.getElementById('caixaStatusDotModal');
  const caixaBadgeModal = document.getElementById('caixaBadgeModal');
  const operadorPillModal = document.getElementById('operadorPillModal');
  let modalCaixa = null;
  let caixaFormAbrir = null;
  let caixaFormFechar = null;
  let caixaSaldoInicial = null;
  let caixaSaldoInicialInfo = null;
  let caixaSaldoFinal = null;
  let caixaObsAbrir = null;
  let caixaObsFechar = null;
  let caixaAbertoEm = null;
  let btnCaixaSalvar = null;
  let tituloCaixa = null;

  const campoValorPago = document.getElementById('campoValorPago');
const campoFormaPagamento = document.getElementById('campoFormaPagamento');
const pagamentoDividido = document.getElementById('pagamentoDividido');
const blocoSplit = document.getElementById('blocoSplit');
const formaPagamento1 = document.getElementById('formaPagamento1');
const valorPagamento1 = document.getElementById('valorPagamento1');
const formaPagamento2 = document.getElementById('formaPagamento2');
const valorPagamento2 = document.getElementById('valorPagamento2');
  const cupomCodigo = document.getElementById('cupomCodigo');
  const cupomResumoContainer = document.getElementById('cupomResumoContainer');
  const cupomResumoSelect = document.getElementById('cupomResumoSelect');
  const descontoTipo = document.getElementById('descontoTipo');
  const descontoValor = document.getElementById('descontoValor');
  const cashbackToggle = document.getElementById('cashbackCliente');
  const cashbackAplicado = document.getElementById('cashbackAplicado');
const cashbackUsarToggle = document.getElementById('cashbackUsar');
const cashbackUsoLabel = document.getElementById('cashbackUsoLabel');
const cashbackPreviewCliente = document.getElementById('cashbackPreviewCliente');
  const cashbackUsadoInput = document.getElementById('cashbackUsado');
  const linhaCashbackUsado = document.getElementById('linhaCashbackUsado');
  const cashbackUsadoResumo = document.getElementById('cashbackUsadoResumo');
  const linhaCashback = document.getElementById('linhaCashback');
  const cashbackResumo = document.getElementById('cashbackResumo');
  const cashbackLabel = document.getElementById('cashbackLabel');
  const linhaTaxaResumo = document.getElementById('linhaTaxaResumo');
  const cashbackResumoActionWrap = document.getElementById('cashbackResumoActionWrap');
  const cashbackResumoAction = document.getElementById('cashbackResumoAction');
  const cashbackResumoActionValor = document.getElementById('cashbackResumoActionValor');
  if (cashbackLabel && cashbackConfig && Number(cashbackConfig.percentual) > 0) {
    cashbackLabel.textContent = `Cashback (${Number(cashbackConfig.percentual).toFixed(2)}%)`;
  }

  if (cashbackToggle) {
    const toggleWrap = cashbackToggle.closest('.pdv-client-toggle');
    const habilitado = cashbackConfig && cashbackConfig.ativo && Number(cashbackConfig.percentual) > 0;
    cashbackToggle.checked = false;
    cashbackToggle.disabled = !habilitado;
    if (toggleWrap) {
      toggleWrap.classList.toggle('is-disabled', !habilitado);
    }
  }
  const pdvModoModal = <?php echo $modoModal ? 'true' : 'false'; ?>;
  const pdvUsaPlaceholderTipo = <?php echo $usarPlaceholderTipo ? 'true' : 'false'; ?>;
</script>
<script>
  // Futuro: window.PDV_OFFLINE_ENABLED = <?= config($conn, 'modulo_offline_ativo', '1') === '1' ? 'true' : 'false' ?>;
  window.PDV_OFFLINE_ENABLED = true; // v1: sempre ativo, sem gate de cobranca
</script>
<script>const LOJA_NOME_IMPRESSAO = <?= json_encode(config($conn, 'nome_loja', 'LillyMenu'), JSON_UNESCAPED_UNICODE) ?>;</script>
<script src="./assets/js/vendor/qz-tray.js"></script>
<script src="./assets/js/impressao_qz.js?v=<?= filemtime(__DIR__ . '/assets/js/impressao_qz.js') ?>"></script>
<script>
  document.addEventListener('DOMContentLoaded', function(){
    const btn = document.getElementById('pdvPrintConfigBtn');
    const popover = document.getElementById('pdvPrintConfigPopover');
    const toggle = document.getElementById('pdvPrintAutoprintToggle');
    const status = document.getElementById('pdvPrintAutoprintStatus');
    if (!btn || !popover || !toggle || typeof impressaoQZ === 'undefined') return;

    function perfisPdv() {
      return impressaoQZ.listarPerfis().filter(p => p.usoPara === 'pdv' || p.usoPara === 'ambos');
    }

    function atualizarEstado() {
      const perfis = perfisPdv();
      if (!perfis.length) {
        toggle.checked = false;
        toggle.disabled = true;
        status.innerHTML = 'Nenhuma impressora configurada para o PDV. <a href="configuracoes.php">Configurar</a>';
        return;
      }
      toggle.disabled = false;
      const ligada = perfis.some(p => p.impressaoAutomatica);
      toggle.checked = ligada;
      status.textContent = ligada ? 'habilitada' : 'desabilitada';
    }

    function posicionarPopover() {
      const rect = btn.getBoundingClientRect();
      popover.style.top = (rect.bottom + 6) + 'px';
      popover.style.right = (window.innerWidth - rect.right) + 'px';
    }

    function fecharPopover() {
      popover.classList.remove('show');
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const abrindo = !popover.classList.contains('show');
      if (abrindo) {
        atualizarEstado();
        posicionarPopover();
      }
      popover.classList.toggle('show', abrindo);
    });

    document.addEventListener('click', (e) => {
      if (popover.classList.contains('show') && !popover.contains(e.target) && e.target !== btn) {
        fecharPopover();
      }
    });

    document.addEventListener('scroll', () => {
      if (popover.classList.contains('show')) fecharPopover();
    }, true);
    window.addEventListener('resize', () => {
      if (popover.classList.contains('show')) fecharPopover();
    });

    toggle.addEventListener('change', () => {
      const perfis = perfisPdv();
      perfis.forEach(p => {
        p.impressaoAutomatica = toggle.checked;
        impressaoQZ.salvarPerfil(p);
      });
      status.textContent = toggle.checked ? 'habilitada' : 'desabilitada';
    });
  });
</script>
<script src="./assets/js/pdv.js?v=<?= $pdvJsVer ?>"></script>
<script src="./assets/js/pdv_offline.js?v=<?= $pdvOfflineJsVer ?>"></script>

<!-- Popover de config. de impressão — fica fora dos cards de propósito (ver
     comentário em pdv.css): cards com .pdv-animate deixam um transform residual
     que vira contexto de empilhamento e prende qualquer z-index interno. -->
<div class="pdv-print-config-popover" id="pdvPrintConfigPopover">
  <div class="pdv-print-config-title">Configurações</div>
  <div class="pdv-print-config-row">
    <span>Impressão automática</span>
    <label class="pdv-print-config-toggle">
      <input type="checkbox" id="pdvPrintAutoprintToggle">
      <span class="pdv-print-config-slider"></span>
    </label>
  </div>
  <div class="pdv-print-config-status" id="pdvPrintAutoprintStatus">desabilitada</div>
</div>

<!-- MODAL DETALHE CLIENTE -->
<div class="modal fade" id="modalClienteDetalhe" tabindex="-1">
  <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content rounded-4 border-0 shadow pdv-card">
      <div class="modal-header border-0">
        <h5 class="modal-title">Detalhes do cliente</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-6">
            <div class="pdv-mini-card">
              <span class="pdv-mini-label">Nome</span>
              <div id="infoNome" class="fw-semibold">-</div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="pdv-mini-card">
              <span class="pdv-mini-label">Telefone</span>
              <div id="infoTelefone">-</div>
            </div>
          </div>
          <div class="col-12">
            <div class="pdv-mini-card">
              <span class="pdv-mini-label">Endereco</span>
              <div id="infoEndereco">-</div>
            </div>
          </div>
        </div>

          <div class="pdv-client-stats">
          <div class="row g-2">
            <div class="col-6">
              <div class="pdv-mini-card">
                <span class="pdv-mini-label">Pedidos</span>
                <div id="clienteTotalPedidos" class="fw-semibold">0</div>
              </div>
            </div>
            <div class="col-6">
              <div class="pdv-mini-card">
                <span class="pdv-mini-label">Ticket medio</span>
                <div id="clienteTicketMedio" class="fw-semibold">R$ 0,00</div>
              </div>
            </div>
          </div>

          <?php if ($clubePontosAtivo): ?>
            <div class="row g-2 mt-2" id="pontosSaldoModalWrap">
              <div class="col-6">
                <div class="pdv-mini-card">
                  <span class="pdv-mini-label">Pontos</span>
                  <div id="clientePontosSaldoModal" class="fw-semibold">0 pts</div>
                </div>
              </div>
            </div>
          <?php endif; ?>

          <div class="mt-3">
            <small class="text-muted d-block">Ultimo pedido</small>
            <div id="clienteUltimoPedido" class="fw-semibold">-</div>
            <button type="button"
                    class="btn btn-pdv-ghost btn-sm mt-2 d-none"
                    id="btnRepetirPedido">
              Repetir ultimo pedido
            </button>
          </div>

          <div class="mt-3">
            <small class="text-muted d-block">Favoritos</small>
            <div class="d-flex flex-wrap gap-1" id="clienteFavoritos"></div>
          </div>

          <div class="mt-3">
            <small class="text-muted d-block">Historico recente</small>
            <div class="pdv-history" id="clienteHistorico"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL CLIENTE -->
<div class="modal fade" id="modalCliente" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered pdv-client-dialog">
    <div class="modal-content pdv-client-modal">
      <div class="modal-header border-0">
        <div>
          <h5 class="pdv-client-modal-title">Dados do cliente</h5>
          <div class="pdv-client-modal-subtitle">Preencha os dados para buscar ou adicionar um cliente</div>
        </div>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body pdv-client-modal-body">
        <div class="mb-3 pdv-client-inline-field">
          <span class="pdv-client-inline-caption">Busque pelo cliente</span>
          <div class="pdv-client-select">
            <input type="text" class="form-control" id="clienteModalBusca" placeholder="Busque por um cliente por número ou nome">
            <button type="button" class="pdv-client-select-icon" id="clienteModalRecentesBtn" aria-label="Mostrar clientes recentes">
              <i class="bi bi-chevron-down"></i>
            </button>
          </div>
          <div class="list-group mt-2 d-none" id="listaClientesModal"></div>
        </div>
        <div class="pdv-client-divider"></div>

        <div class="mb-3 pdv-client-inline-field">
          <span class="pdv-client-inline-caption">Número de contato</span>
          <input type="text" class="form-control" id="clienteTelefone" placeholder="Ex.: (11) 9 8888-9999">
        </div>

        <div class="mb-3 pdv-client-inline-field">
          <span class="pdv-client-inline-caption">Nome do cliente</span>
          <input type="text" class="form-control" id="clienteNome" placeholder="">
        </div>

        <input type="hidden" id="clienteEndereco">
      </div>

      <div class="modal-footer border-0">
        <button class="btn btn-pdv-primary pdv-client-continue" id="btnClienteContinuar">
          Continuar
        </button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL CAIXA -->
<div class="modal fade" id="modalSyncOffline" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content rounded-4 border-0 shadow pdv-card">

      <div class="modal-header border-0">
        <h5 class="modal-title"><i class="bi bi-cloud-arrow-up"></i> Conexão restabelecida</h5>
      </div>

      <div class="modal-body">
        <p class="text-muted small mb-3">Sincronize as vendas realizadas offline com o servidor.</p>
        <div class="pdv-sync-lista" id="syncOfflineLista"></div>
      </div>

      <div class="modal-footer border-0">
        <button class="btn btn-pdv-outline" data-bs-dismiss="modal">Sincronizar depois</button>
        <button class="btn btn-pdv-primary" id="syncOfflineBtn">Sincronizar agora</button>
      </div>

    </div>
  </div>
</div>

<div class="modal fade" id="modalCaixa" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content rounded-4 border-0 shadow pdv-card">

      <div class="modal-header border-0">
        <h5 class="modal-title" id="tituloCaixa">Caixa</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">
        <div id="caixaFormAbrir">
          <div class="mb-3">
            <label class="form-label">Saldo inicial</label>
            <input type="number" step="0.01" class="form-control" id="caixaSaldoInicial" placeholder="0,00">
          </div>
          <div class="mb-3">
            <label class="form-label">Observacoes</label>
            <textarea class="form-control" id="caixaObsAbrir" rows="2" placeholder="Opcional"></textarea>
          </div>
        </div>

        <div id="caixaFormFechar" class="d-none">
          <div class="mb-2 text-muted small">
            Caixa aberto em <span id="caixaAbertoEm">-</span>
          </div>
          <div class="mb-3">
            <label class="form-label">Saldo inicial</label>
            <input type="text" class="form-control" id="caixaSaldoInicialInfo" disabled>
          </div>
          <div class="mb-3">
            <label class="form-label">Saldo final</label>
            <input type="number" step="0.01" class="form-control" id="caixaSaldoFinal" placeholder="0,00">
          </div>
          <div class="mb-3">
            <label class="form-label">Observacoes</label>
            <textarea class="form-control" id="caixaObsFechar" rows="2" placeholder="Opcional"></textarea>
          </div>
        </div>
      </div>

      <div class="modal-footer border-0">
        <button class="btn btn-pdv-outline" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-pdv-primary" id="btnCaixaSalvar">Salvar</button>
      </div>

    </div>
  </div>
</div>


<div id="pdvToast" class="pdv-toast" aria-live="polite"></div>

<!-- MODAL AGENDAMENTO -->
<div class="modal fade" id="modalAgendamento" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered pdv-schedule-dialog">
    <div class="modal-content pdv-schedule-modal">
      <div class="modal-header border-0">
        <h5 class="pdv-schedule-title">Selecione o dia e a hora para agendar o pedido</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body pdv-schedule-body">
        <div class="pdv-schedule-days">
          <button type="button" class="pdv-schedule-nav" id="agendamentoDiasPrev" aria-label="Dia anterior">
            <i class="bi bi-chevron-left"></i>
          </button>
          <div class="pdv-schedule-days-scroll" id="agendamentoDias"></div>
          <button type="button" class="pdv-schedule-nav" id="agendamentoDiasNext" aria-label="Proximo dia">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
        <div class="pdv-schedule-track"><span></span></div>

        <div class="pdv-schedule-times" id="agendamentoHoras"></div>
        <div class="pdv-schedule-empty d-none" id="agendamentoHorasEmpty"></div>

        <input type="hidden" id="agendamentoData">
        <input type="hidden" id="agendamentoHora">

        <div class="d-flex justify-content-end">
          <button type="button" class="btn btn-pdv-primary" id="agendamentoSalvar">Salvar agendamento</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL ENTREGA -->
<div class="modal fade" id="modalEntrega" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered pdv-delivery-dialog">
    <div class="modal-content pdv-delivery-modal">
      <div class="modal-header border-0">
        <div>
          <h5 class="pdv-delivery-title">Preencha os dados de entrega do pedido</h5>
          <div class="pdv-delivery-subtitle">Informe os dados para concluir a entrega.</div>
        </div>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body pdv-delivery-body">
        <div class="mb-3 pdv-delivery-client-field">
          <span class="pdv-delivery-client-caption">Busque pelo cliente</span>
          <input type="text" class="form-control pdv-delivery-input pdv-delivery-select" id="entregaClienteBusca"
                 placeholder="Pesquise por número ou nome">
          <button type="button" class="pdv-delivery-client-trigger" id="entregaClienteRecentesBtn" aria-label="Mostrar clientes recentes">
            <i class="bi bi-chevron-down"></i>
          </button>
          <div class="list-group mt-2 d-none" id="entregaListaClientes"></div>
        </div>
        <div class="pdv-delivery-section"></div>
        <div class="mb-3">
          <label class="form-label">Numero de contato</label>
          <input type="text" class="form-control pdv-delivery-input" id="entregaClienteTelefone"
                 placeholder="Ex.: (11) 9 8888-9999">
          <div class="invalid-feedback" id="entregaTelefoneErro"></div>
        </div>
        <div class="mb-3">
          <label class="form-label">Nome do cliente</label>
          <input type="text" class="form-control pdv-delivery-input" id="entregaClienteNome"
                 placeholder="Ex.: Joao da Silva">
          <div class="invalid-feedback" id="entregaNomeErro"></div>
        </div>
        <div class="mb-3">
          <label class="form-label">CEP</label>
          <input type="text" class="form-control pdv-delivery-input" id="entregaCepModal"
                 placeholder="Ex.: 00000-000">
        </div>
        <div class="pdv-delivery-row mb-3">
          <div>
            <label class="form-label">Rua/Avenida</label>
            <input type="text" class="form-control pdv-delivery-input" id="entregaRuaModal"
                   placeholder="Ex.: Rua Oscar Freire">
          </div>
          <div>
            <label class="form-label">Numero</label>
            <input type="text" class="form-control pdv-delivery-input" id="entregaNumeroModal"
                   placeholder="Ex.: 44">
          </div>
        </div>
        <div class="pdv-delivery-row pdv-delivery-row--stack mb-3">
          <div>
            <label class="form-label">Bairro</label>
            <input type="text" class="form-control pdv-delivery-input" id="entregaBairroModal"
                   list="listaBairros" placeholder="Bairro">
          </div>
          <div>
            <label class="form-label">Cidade</label>
            <input type="text" class="form-control pdv-delivery-input" id="entregaCidadeModal"
                   placeholder="Cidade">
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">Complemento</label>
          <input type="text" class="form-control pdv-delivery-input" id="entregaComplementoModal"
                 placeholder="Apartamento, bloco, referencia">
        </div>
      </div>
      <div class="pdv-delivery-footer">
        <div class="pdv-delivery-tax" id="entregaTaxaInfo">
          <div class="pdv-delivery-tax-main">
            <div class="text-muted small">Taxa de entrega</div>
            <div class="pdv-delivery-tax-value" id="entregaTaxaLabel">R$ 0,00</div>
            <input type="number" step="0.01" class="form-control pdv-delivery-input d-none pdv-delivery-tax-input"
                   id="entregaTaxaValor" placeholder="Taxa de entrega">
          </div>
          <div class="pdv-delivery-switch">
            <span>Editar taxa</span>
            <div class="form-check form-switch m-0">
              <input class="form-check-input" type="checkbox" id="entregaTaxaEditar">
            </div>
          </div>
        </div>
        <button type="button" class="btn btn-pdv-primary w-100 mt-3 pdv-delivery-cta" id="entregaContinuar">
          Continuar
        </button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL PAGAMENTO -->
<div class="modal fade" id="modalPagamento" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable pdv-payment-dialog">
    <div class="modal-content pdv-payment-modal">
      <div class="modal-header border-0">
        <h5 class="modal-title">Registre o pagamento do pedido</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body pdv-payment-body">
        <div class="mb-2">
          <input type="text" class="form-control pdv-payment-total" id="pagamentoValorTotal"
                 inputmode="decimal" autocomplete="off" value="R$ 0,00">
        </div>
        <div class="pdv-payment-summary">
          Total do pedido <strong id="pagamentoTotalTexto">R$ 0,00</strong>
          <div class="pdv-payment-remaining">Restante a cobrar <span id="pagamentoRestanteTexto">R$ 0,00</span></div>
          <div class="pdv-desconto-concedido d-none" id="descontoConcedidoLinha">
            Desconto concedido <span id="descontoConcedidoValor">R$ 0,00</span>
            <button type="button" class="pdv-desconto-remover" id="btnRemoverDesconto" title="Remover desconto">
              <i class="bi bi-x"></i>
            </button>
          </div>
        </div>
        <div class="pdv-payment-tools" style="display:none"></div>

        <div class="pdv-payment-grid" id="pagamentoOpcoes">
          <button type="button" class="pdv-payment-option" data-pay="dinheiro">
            <div class="pdv-payment-icon"><i class="bi bi-cash-stack"></i></div>
            <div class="pdv-payment-label">Dinheiro</div>
          </button>
          <button type="button" class="pdv-payment-option" data-pay="credito">
            <div class="pdv-payment-icon"><i class="bi bi-credit-card-2-front"></i></div>
            <div class="pdv-payment-label">Credito</div>
          </button>
          <button type="button" class="pdv-payment-option" data-pay="debito">
            <div class="pdv-payment-icon"><i class="bi bi-credit-card"></i></div>
            <div class="pdv-payment-label">Debito</div>
          </button>
          <button type="button" class="pdv-payment-option" data-pay="pix">
            <div class="pdv-payment-icon"><i class="bi bi-qr-code"></i></div>
            <div class="pdv-payment-label">Pix</div>
          </button>
          <button type="button" class="pdv-payment-option" data-pay="voucher">
            <div class="pdv-payment-icon"><i class="bi bi-ticket-detailed"></i></div>
            <div class="pdv-payment-label">Voucher</div>
          </button>
          <button type="button" class="pdv-payment-option<?= $clubePontosAtivo ? '' : ' d-none' ?>" data-pay="resgate">
            <div class="pdv-payment-icon"><i class="bi bi-gift"></i></div>
            <div class="pdv-payment-label">Resgate</div>
          </button>
          <button type="button" class="pdv-payment-option" id="btnDescontoGrid" data-pay="desconto">
            <div class="pdv-payment-icon"><i class="bi bi-tag"></i></div>
            <div class="pdv-payment-label">Desconto</div>
          </button>
          <button type="button" class="pdv-payment-option" data-pay="fiado">
            <div class="pdv-payment-icon"><i class="bi bi-cash"></i></div>
            <div class="pdv-payment-label">Fiado</div>
          </button>
        </div>

        <div class="pdv-payment-cash d-none" id="pagamentoDinheiroCampo">
          <label class="form-label mt-3">Valor pago</label>
          <input type="number" step="0.01" class="form-control" id="pagamentoValorPago" placeholder="0,00">
        </div>

        <div class="pdv-payment-split d-none" id="pagamentoSplit">
          <div class="pdv-payment-split-row" id="pagamentoSplitRow1">
            <div class="pdv-payment-split-label" id="pagamentoSplitLabel1">Forma 1</div>
            <input type="number" step="0.01" class="pdv-payment-split-input" id="pagamentoSplitValor1" placeholder="0,00">
          </div>
          <div class="pdv-payment-split-row" id="pagamentoSplitRow2">
            <div class="pdv-payment-split-label" id="pagamentoSplitLabel2">Forma 2</div>
            <input type="number" step="0.01" class="pdv-payment-split-input" id="pagamentoSplitValor2" placeholder="0,00">
          </div>
        </div>

        <div class="pdv-payment-registered d-none" id="pagamentoRegistrados">
          <div class="pdv-payment-registered-title">Pagamento registrados</div>
          <div class="pdv-payment-registered-list" id="pagamentoRegistradosLista"></div>
        </div>

        <button type="button" class="pdv-payment-btn mt-3" id="btnPagamentoFinalizar">
          Finalizar
        </button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL CASHBACK -->
<div class="modal fade" id="modalCashback" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered pdv-cashback-dialog">
    <div class="modal-content pdv-cashback-modal">
      <div class="modal-header border-0">
        <h5 class="pdv-cashback-title mb-0">Cashback</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="pdv-cashback-balance">
          <span class="pdv-cashback-balance-label">Saldo disponível</span>
          <strong class="pdv-cashback-balance-value" id="cashbackModalSaldo">R$ 0,00</strong>
          <span class="pdv-cashback-balance-meta d-none" id="cashbackModalValidade"></span>
        </div>
        <div class="pdv-cashback-question">Qual valor de cashback você deseja utilizar neste pedido?</div>
                <input type="text" inputmode="decimal" class="form-control pdv-cashback-input" id="cashbackModalValor" placeholder="0,00" value="0,00">
        <div class="pdv-cashback-actions">
          <button type="button" class="pdv-cashback-confirm" id="cashbackModalUsar">Usar</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL DESCONTO -->
<div class="modal fade" id="modalDesconto" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered pdv-discount-dialog">
    <div class="modal-content pdv-discount-modal">
      <div class="modal-header border-0">
        <h5 class="modal-title">Aplicar desconto</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body pdv-discount-body">
        <div class="pdv-discount-toggle" id="descontoToggle">
          <button type="button" class="pdv-discount-pill" data-type="valor">
            <span class="pdv-discount-icon"><i class="bi bi-currency-dollar"></i></span>
            Em reais
          </button>
          <button type="button" class="pdv-discount-pill" data-type="percent">
            <span class="pdv-discount-icon"><i class="bi bi-percent"></i></span>
            Em porcentagem
          </button>
        </div>
        <div class="mb-1">
          <label class="form-label" style="font-size:.72rem;color:#6b7280;margin-bottom:4px">Valor do desconto</label>
          <input type="text" class="form-control" id="descontoValorModal"
                 inputmode="decimal" autocomplete="off" placeholder="R$ 0,00"
                 style="font-size:.88rem;height:40px;border-radius:10px">
          <div class="pdv-discount-aviso d-none" id="descontoAviso">
            <i class="bi bi-exclamation-triangle-fill"></i>
            O desconto a ser concedido está ultrapassando o valor restante a ser pago.
          </div>
        </div>
        <div class="pdv-discount-actions" style="margin-top:4px">
          <button type="button" class="pdv-discount-btn primary" id="descontoAplicar"
                  style="font-size:.82rem;padding:.5rem 1rem">Aplicar desconto</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="pdv-coupon-box d-none" aria-hidden="true">
  <label class="form-label">Cupom de desconto</label>
  <div class="pdv-coupon-row">
    <input type="text" class="form-control" id="cupomInput" placeholder="Ex: TW5">
    <button type="button" class="pdv-coupon-btn" id="cupomAplicar">Aplicar</button>
  </div>
  <div class="pdv-coupon-msg" id="cupomMsg">Use um codigo ativo para aplicar o desconto.</div>
  <button type="button" class="pdv-coupon-remove" id="cupomRemover">Remover cupom</button>
</div>

<!-- MODAL TROCO -->
<div class="modal fade" id="modalTroco" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered pdv-cash-dialog">
    <div class="modal-content pdv-cash-modal">
      <div class="modal-header border-0">
        <h5 class="modal-title">Precisa de troco?</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body pdv-cash-body">
        <div class="mb-2">
          <label class="form-label">Quantia recebida</label>
          <input type="number" step="0.01" class="form-control pdv-cash-input" id="trocoValorInput" placeholder="0,00">
        </div>
        <div class="pdv-cash-total">
          Quantia a ser cobrada <strong id="trocoTotalTexto">R$ 0,00</strong>
        </div>
        <div class="pdv-cash-total" id="trocoResumoLinha">
          <span id="trocoResumoLabel">Troco</span> <strong id="trocoCalculadoTexto">R$ 0,00</strong>
        </div>
        <div class="pdv-cash-actions">
          <button type="button" class="pdv-cash-btn" id="trocoNaoPreciso">Nao preciso</button>
          <button type="button" class="pdv-cash-btn primary" id="trocoContinuar">Continuar</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL EDITAR ITEM -->
<div class="modal fade" id="modalEditarItem" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered pdv-edit-dialog">
    <div class="modal-content pdv-edit-modal">
      <div class="modal-header border-0">
        <div class="pdv-edit-header">
          <div class="pdv-edit-thumb" id="editItemThumb">
            <img id="editItemImg" src="" alt="" style="display:none">
            <i class="bi bi-image" id="editItemImgIcon"></i>
          </div>
          <div class="pdv-edit-info">
            <h5 class="pdv-edit-title" id="editItemNome">Produto</h5>
            <div class="pdv-edit-price" id="editItemPreco">R$ 0,00</div>
            <div class="pdv-edit-estoque" id="editItemEstoque"></div>
          </div>
        </div>
        <div class="pdv-edit-actions">
          <button type="button" class="pdv-circle-btn" id="editItemDetalhesBtn" title="Detalhes">
            <i class="bi bi-list"></i>
          </button>
          <button type="button" class="pdv-circle-btn" data-bs-dismiss="modal" aria-label="Fechar">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>
      <div class="modal-body pdv-edit-body">
        <input type="hidden" id="editItemProdutoId">
        <div class="pdv-edit-obs-wrap">
          <label class="pdv-edit-obs-label">Observações do cliente</label>
          <input type="text" class="pdv-edit-obs-input" id="editItemObs" placeholder="Adicionar observação">
        </div>
        <div class="pdv-edit-qty">
          <div class="pdv-edit-qty-controls">
            <button type="button" class="pdv-qty-btn minus" id="editItemMinus">-</button>
            <span class="pdv-edit-qty-value" id="editItemQtd">1</span>
            <button type="button" class="pdv-qty-btn plus" id="editItemPlus">+</button>
          </div>
          <button type="button" class="pdv-edit-btn" id="editItemSalvar">Editar R$ 0,00</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL DETALHES ITEM -->
<div class="modal fade" id="modalDetalhesItem" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-lg">
    <div class="modal-content pdv-edit-modal">
      <div class="modal-header border-0">
        <h5 class="modal-title" id="detItemNome">Detalhes do item</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body pdv-edit-body">
        <div class="mb-3">
          <label class="form-label">Variações</label>
          <div class="pdv-edit-obs">Sem variações cadastradas para este item.</div>
        </div>
        <div class="mb-3">
          <label class="form-label">Observações avançadas</label>
          <textarea class="form-control pdv-edit-obs" id="detItemObs" rows="3"
                    placeholder="Ex: retirar cebola, ponto da carne"></textarea>
        </div>
        <div class="text-end">
          <button type="button" class="pdv-edit-btn" id="detItemSalvar">Salvar detalhes</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL VARIACOES -->
<div class="modal fade pdv-variacao-modal" id="modalVariacoes" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header border-0">
        <div class="pdv-variacao-header">
          <div class="pdv-variacao-thumb">
            <img src="" alt="" id="variacaoProdutoImagem">
          </div>
          <div>
            <div class="pdv-variacao-title" id="variacaoProdutoNome">Produto</div>
            <div class="pdv-variacao-sub">Escolha uma das opções</div>
            <div class="pdv-variacao-sub" id="variacaoProdutoId"></div>
          </div>
        </div>
        <div class="pdv-variacao-tools">
          <button class="btn-close" data-bs-dismiss="modal"></button>
        </div>
      </div>
      <div class="modal-body">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <span class="fw-semibold">Escolha uma das opções</span>
          <span class="pdv-variacao-badge">Obrigatorio</span>
        </div>
        <div class="pdv-variacao-debug" id="variacaoCount"></div>
        <div class="pdv-variacao-list" id="variacaoLista"></div>
        <div class="pdv-variacao-search">
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="text" class="form-control" id="variacaoBusca" placeholder="Procure por uma opcao">
          </div>
        </div>
        <div class="pdv-extra-section d-none" id="extraSection">
          <div class="pdv-extra-head">
            <span class="fw-semibold">ESCOLHA SEU EXTRA</span>
            <span class="pdv-variacao-badge" id="extraObrigatorio">Obrigatorio</span>
          </div>
          <div class="pdv-extra-sub">Escolha 1 opcao.</div>
          <div class="pdv-extra-list" id="extraLista"></div>
        </div>
        <div class="pdv-extra-section d-none" id="complementoItensSection">
          <div class="pdv-extra-head">
            <span class="fw-semibold">ESCOLHA SEU COMPLEMENTO</span>
            <span class="pdv-variacao-badge" id="complementoItensObrigatorio">Obrigatorio</span>
          </div>
          <div class="pdv-extra-sub">Escolha 1 opcao.</div>
          <div class="pdv-extra-list" id="complementoItensLista"></div>
        </div>
        <div class="pdv-variacao-obs">
          <input type="text" class="form-control" id="observacoesClienteModal" placeholder="Observacoes do cliente" maxlength="255">
        </div>
      </div>
      <div class="pdv-variacao-footer">
        <div class="pdv-variacao-qty">
          <button type="button" id="variacaoMinus">-</button>
          <span id="variacaoQtd">1</span>
          <button type="button" id="variacaoPlus">+</button>
        </div>
        <button type="button" class="pdv-edit-btn" id="variacaoAddBtn">Adicionar R$ 0,00</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL COMBO -->
<div class="modal fade pdv-variacao-modal pdv-combo-modal" id="modalCombo" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header border-0">
        <div class="pdv-variacao-header">
          <div class="pdv-variacao-thumb">
            <img src="" alt="" id="comboProdutoImagem">
          </div>
          <div>
            <div class="pdv-variacao-title" id="comboProdutoNome">Combo</div>
            <div class="pdv-variacao-sub">Monte o combo</div>
          </div>
        </div>
        <div class="pdv-variacao-tools">
          <button class="btn-close" data-bs-dismiss="modal"></button>
        </div>
      </div>
      <div class="modal-body">
        <div class="pdv-combo-passos" id="comboPassosLista"></div>
        <div class="pdv-variacao-obs">
          <input type="text" class="form-control" id="comboObs" placeholder="Observacoes do cliente" maxlength="255">
        </div>
      </div>
      <div class="pdv-variacao-footer" style="justify-content:flex-end;">
        <button type="button" class="pdv-edit-btn" id="comboAddBtn" onclick="confirmarAdicionarCombo()">Adicionar R$ 0,00</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL AVULSO -->
<div class="modal fade pdv-avulso-modal" id="modalAvulso" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered" style="width:450px;max-width:450px;">
    <div class="modal-content" style="height:390px;padding:14px 18px 12px;border-radius:18px;box-shadow:0 18px 40px rgba(15,23,42,.18);border:0;overflow:hidden;">
      <div class="modal-header" style="padding:0 0 12px;border:0;align-items:center;">
        <h5 class="modal-title" style="font-size:1rem;font-weight:700;">Produto avulso</h5>
        <button class="btn-close" data-inline="1" data-bs-dismiss="modal" onclick="window.fecharAvulsoModal()" style="width:28px;height:28px;opacity:.75;margin-right:-2px;"></button>
      </div>
      <div class="modal-body" style="padding:0;display:flex;flex-direction:column;gap:12px;flex:1;">
        <div class="pdv-avulso-field">
          <label for="avulsoNome" style="font-size:.78rem;color:#6b7280;margin-bottom:6px;">Nome do produto</label>
          <input type="text" class="form-control" id="avulsoNome" placeholder="Ex.: Pastel de pizza" style="background:#f3f4f6;border:0;border-radius:14px;padding:12px 14px;font-size:.92rem;">
        </div>
        <div class="pdv-avulso-field">
          <label for="avulsoPreco" style="font-size:.78rem;color:#6b7280;margin-bottom:6px;">Preço do produto</label>
          <input type="number" step="0.01" class="form-control" id="avulsoPreco" placeholder="0,00" style="background:#f3f4f6;border:0;border-radius:14px;padding:12px 14px;font-size:.92rem;">
        </div>
        <div class="pdv-avulso-field">
          <label for="avulsoObs" style="font-size:.78rem;color:#6b7280;margin-bottom:6px;">Observações</label>
          <input type="text" class="form-control" id="avulsoObs" placeholder="Ex.: Sem tomate" style="background:#f3f4f6;border:0;border-radius:14px;padding:12px 14px;font-size:.92rem;">
        </div>
        <div class="pdv-avulso-qty" style="display:flex;align-items:center;gap:10px;margin-top:auto;margin-bottom:6px;flex-wrap:nowrap;min-width:0;">
          <button type="button" id="avulsoMinus" data-inline="1" onclick="window.avulsoAlterarQtd(-1)" style="width:34px;height:34px;border-radius:999px;border:0;background:#eef1f6;color:#111827;font-weight:700;position:relative;z-index:2;">-</button>
          <span id="avulsoQtd" style="min-width:20px;text-align:center;font-weight:600;">1</span>
          <button type="button" id="avulsoPlus" data-inline="1" onclick="window.avulsoAlterarQtd(1)" style="width:34px;height:34px;border-radius:999px;border:0;background:#9C5523;color:#fff;font-weight:700;position:relative;z-index:2;">+</button>
          <button type="button" class="pdv-avulso-add" id="avulsoAddBtn" data-inline="1" onclick="window.avulsoAdicionar()" style="flex:1;min-width:0;border:0;border-radius:16px;background:#9C5523;color:#fff;font-weight:700;padding:10px 16px;box-shadow:0 12px 24px rgba(156,85,35,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative;z-index:1;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1;">Adicionar ao pedido R$ 0,00</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="pdv-saving-overlay" id="pdvSavingOverlay">
  <div class="pdv-saving-card"><span class="pdv-saving-spinner"></span> Finalizando pedido...</div>
</div>

<script>
(function(){
  const tabsRow = document.getElementById('pdvTabsRow');
  const prevBtn = document.getElementById('pdvTabsPrev');
  const nextBtn = document.getElementById('pdvTabsNext');
  if (!tabsRow || !prevBtn || !nextBtn) return;
  const updateArrows = () => {
    const atStart = tabsRow.scrollLeft <= 4;
    const atEnd = tabsRow.scrollLeft >= tabsRow.scrollWidth - tabsRow.clientWidth - 4;
    prevBtn.classList.toggle('pdv-tabs-arrow--hidden', atStart);
    nextBtn.classList.toggle('pdv-tabs-arrow--hidden', atEnd);
  };
  prevBtn.addEventListener('click', () => { tabsRow.scrollBy({ left: -220, behavior: 'smooth' }); });
  nextBtn.addEventListener('click', () => { tabsRow.scrollBy({ left: 220, behavior: 'smooth' }); });
  tabsRow.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
})();
</script>

</body>
</html>
