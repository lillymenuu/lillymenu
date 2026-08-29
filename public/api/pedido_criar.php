<?php
session_start();
date_default_timezone_set('America/Fortaleza');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
mb_internal_encoding('UTF-8');

require_once '../../config/database.php';
require_once '../../helpers/telefone.php';
require_once '../../admin/helpers/combo_estoque_module.php';
require_once '../../admin/helpers/estoque_vinculo_module.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  echo json_encode(['ok'=>false,'msg'=>'Método inválido']); exit;
}

// DDL deve rodar ANTES da transação — DDL causa implicit commit no MySQL. Uma
// ALTER TABLE disparada DENTRO da transação (como já aconteceu aqui antes)
// encerra a transação sem avisar; o $conn->commit() explícito mais abaixo
// então falha com "There is no active transaction" e derruba o resto do
// fluxo — incluindo o débito de cashback, que só roda depois do commit.
try {
  $colOrigem = $conn->query("SHOW COLUMNS FROM pedidos LIKE 'origem'")->fetch(PDO::FETCH_ASSOC);
  if (!$colOrigem) {
    $conn->exec("ALTER TABLE pedidos ADD COLUMN origem VARCHAR(20) NULL AFTER status");
  }
  if (!$conn->query("SHOW COLUMNS FROM pedidos LIKE 'cashback_usado'")->fetch(PDO::FETCH_ASSOC)) {
    $conn->exec("ALTER TABLE pedidos ADD COLUMN cashback_usado DECIMAL(10,2) NOT NULL DEFAULT 0");
  }
  if (!$conn->query("SHOW COLUMNS FROM pedido_itens LIKE 'cross_sell'")->fetch(PDO::FETCH_ASSOC)) {
    $conn->exec("ALTER TABLE pedido_itens ADD COLUMN cross_sell TINYINT(1) NOT NULL DEFAULT 0");
  }
  if (!$conn->query("SHOW COLUMNS FROM pedido_itens LIKE 'produto_id'")->fetch(PDO::FETCH_ASSOC)) {
    $conn->exec("ALTER TABLE pedido_itens ADD COLUMN produto_id INT NULL");
  }
} catch (Exception $e) {
}
comboEstoqueEnsureModule($conn);
estoqueVinculoEnsureModule($conn);

$lojaId    = (int) ($_POST['loja_id'] ?? 1);
$nome      = trim($_POST['cliente_nome'] ?? '');
$telefone  = preg_replace('/\D+/','',trim($_POST['cliente_telefone'] ?? ''));
/* o helper formatará ao criar/buscar o cliente */
$tipo      = trim($_POST['tipo'] ?? 'retirada');
$pagamento = trim($_POST['forma_pagamento'] ?? '');
$endereco  = trim($_POST['endereco'] ?? '');
$subtotal  = (float) ($_POST['subtotal'] ?? 0);
$taxaEnt   = (float) ($_POST['taxa_entrega'] ?? 0);
$total     = (float) ($_POST['total'] ?? ($subtotal + $taxaEnt));
$itensJson = trim($_POST['itens'] ?? '[]');
/* garantir UTF-8 correto */
if (!mb_check_encoding($itensJson, 'UTF-8')) {
  $itensJson = mb_convert_encoding($itensJson, 'UTF-8', 'ISO-8859-1');
}
$itens = json_decode($itensJson, true) ?: [];
$trocoSolicitado  = ($_POST['troco_solicitado'] ?? '0') === '1';
$trocoValorPedido = (float)($_POST['troco_valor'] ?? 0);
$cashbackUsar     = ($_POST['cashback_usar'] ?? '0') === '1';
$cashbackValorUsar= (float)($_POST['cashback_valor'] ?? 0);
$tipoAgendamento  = trim($_POST['tipo_agendamento'] ?? '');
$agendamentoJson  = trim($_POST['agendamento'] ?? '');
$cupomCodigo      = strtoupper(trim($_POST['cupom_codigo'] ?? ''));
$cupomDesconto    = (float)($_POST['cupom_desconto'] ?? 0);
/* converter JSON de agendamento em datetime para o banco */
$agendamentoDt = '';
if ($agendamentoJson) {
  $ag = json_decode($agendamentoJson, true);
  if (is_array($ag) && !empty($ag['data'])) {
    $slotStart = explode(' - ', $ag['slot'] ?? '')[0] ?? '00:00';
    $agendamentoDt = $ag['data'] . ' ' . trim($slotStart) . ':00';
  }
}

if (!$nome || !$telefone) {
  echo json_encode(['ok'=>false,'msg'=>'Nome e telefone são obrigatórios']); exit;
}
if (!$itens) {
  echo json_encode(['ok'=>false,'msg'=>'Nenhum item no carrinho']); exit;
}

/* Estoque: o badge "Esgotado" no cardápio e as opções de combo desabilitadas
   no modal já impedem isso no front-end, mas a checagem aqui fecha a brecha de
   montar o pedido direto na API. Soma a necessidade por produto (um mesmo
   produto pode aparecer avulso e como componente de combo) e bloqueia o
   pedido inteiro se faltar estoque de qualquer um. */
$estoqueNecessario = [];
foreach ($itens as $item) {
  $qtdItemChk = max(1, (int) ($item['qtd'] ?? 1));
  if (!empty($item['combosels']) && is_array($item['combosels'])) {
    foreach ($item['combosels'] as $sel) {
      $selId  = (int) ($sel['id'] ?? 0);
      $selQtd = (int) ($sel['qtd'] ?? 1) * $qtdItemChk;
      if ($selId > 0 && $selQtd > 0) {
        $estoqueNecessario[$selId] = ($estoqueNecessario[$selId] ?? 0) + $selQtd;
      }
    }
  } else {
    $prodIdChk = (int) ($item['id'] ?? 0);
    if ($prodIdChk > 0) {
      $estoqueNecessario[$prodIdChk] = ($estoqueNecessario[$prodIdChk] ?? 0) + $qtdItemChk;
    }
  }
}
if ($estoqueNecessario) {
  $idsChk = array_keys($estoqueNecessario);
  $phChk  = implode(',', array_fill(0, count($idsChk), '?'));
  $stmtEstChk = $conn->prepare("
    SELECT p.id, p.nome, IFNULL(e.quantidade, 0) AS estoque
    FROM produtos p
    LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
    WHERE p.id IN ($phChk) AND p.loja_id = ?
  ");
  $stmtEstChk->execute([...$idsChk, $lojaId]);
  foreach ($stmtEstChk->fetchAll(PDO::FETCH_ASSOC) as $rowChk) {
    $pidChk = (int) $rowChk['id'];
    $necessario = $estoqueNecessario[$pidChk] ?? 0;
    if ($necessario > 0 && (int) $rowChk['estoque'] < $necessario) {
      echo json_encode(['ok'=>false,'msg'=>'"' . $rowChk['nome'] . '" está sem estoque suficiente no momento.']);
      exit;
    }
  }
}

/* Loja fechada: só aceita pedido imediato se estiver aberta agora — entrega/retirada
   agendada continuam permitidas independente do horário. Fecha a brecha de burlar
   a restrição do front-end enviando a requisição direto pra API. */
require_once '../../admin/helpers/config.php';
require_once '../../admin/helpers/whatsapp.php';
$_SESSION['loja_id'] = $lojaId;
$pedidoImediato = strpos($tipoAgendamento, 'agendada') === false;
if ($pedidoImediato) {
  $receberPedidosAtivo = config($conn, 'receber_pedidos_ativo', '1') === '1';
  if (!$receberPedidosAtivo || !estaAberto($conn)) {
    echo json_encode(['ok'=>false,'msg'=>'A loja está fechada no momento. Escolha entrega agendada ou retirada agendada para continuar.']); exit;
  }
}

/* ── Obter ou criar cliente ── */
function obterOuCriarCliente(PDO $conn, int $lojaId, string $nome, string $tel): int {
  /* normalizar telefone: salvar sempre COM máscara */
  $telFormatado = formatarTelefoneBR($tel);
  $telDigits    = apenasDigitosTel($tel);
  $strip        = sqlTelStrip('telefone');
  /* busca por dígitos puros OU por telefone com máscara */
  $s = $conn->prepare("SELECT id FROM clientes WHERE loja_id=? AND ({$strip}=? OR telefone=?) LIMIT 1");
  $s->execute([$lojaId, $telDigits, $telFormatado]);
  $id = (int)$s->fetchColumn();
  if ($id > 0) {
    $conn->prepare("UPDATE clientes SET nome=? WHERE id=?")->execute([$nome,$id]);
    return $id;
  }
  $conn->prepare("INSERT INTO clientes(nome,telefone,loja_id,criado_em) VALUES(?,?,?,NOW())")
       ->execute([$nome, $telFormatado, $lojaId]);
  return (int)$conn->lastInsertId();
}

try {
  $conn->beginTransaction();

  $clienteId = obterOuCriarCliente($conn,$lojaId,$nome,$telefone);

  /* ── Colunas disponíveis em pedidos ── */
  $cols = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN,0);
  $temCodigo   = in_array('codigo',$cols);
  $temEndereco = in_array('endereco_entrega',$cols);
  $temTipo     = in_array('tipo',$cols);
  $temSubtotal = in_array('subtotal',$cols);
  $temTaxa     = in_array('taxa_entrega',$cols);
  $temObs      = in_array('observacoes_cliente',$cols);
  $temCaixaId  = in_array('caixa_id',$cols);
  $temOrigem   = in_array('origem',$cols);

  /* ── Montar INSERT ── */
  $fields  = ['cliente_id','forma_pagamento','total','status','loja_id','criado_em'];
  $values  = [$clienteId, $pagamento, $total, 'pendente', $lojaId, date('Y-m-d H:i:s')];

  if ($temCodigo)   { $fields[]='codigo';            $values[]=null; }
  if ($temTipo)     { $fields[]='tipo';              $values[]=$tipo; }
  if ($temSubtotal) { $fields[]='subtotal';          $values[]=$subtotal; }
  if ($temTaxa)     { $fields[]='taxa_entrega';      $values[]=$taxaEnt; }
  if ($temEndereco) { $fields[]='endereco_entrega';  $values[]=$endereco; }
  if ($temOrigem)   { $fields[]='origem';            $values[]='loja'; }
  if (in_array('troco',$cols) && $trocoSolicitado && $trocoValorPedido>0) {
    $fields[]='troco'; $values[]=$trocoValorPedido;
  }
  if ($cashbackUsar && $cashbackValorUsar>0) {
    if (in_array('cashback_usado',$cols))    { $fields[]='cashback_usado';    $values[]=$cashbackValorUsar; }
    if (in_array('cashback_aplicado',$cols)) { $fields[]='cashback_aplicado'; $values[]='1'; }
  }
  if ($agendamentoDt && in_array('agendamento',$cols))             { $fields[]='agendamento';           $values[]=$agendamentoDt; }
  if ($tipoAgendamento && in_array('tipo_agendamento',$cols))      { $fields[]='tipo_agendamento';      $values[]=$tipoAgendamento; }
  if ($cupomCodigo && in_array('cupom_codigo',$cols))              { $fields[]='cupom_codigo';           $values[]=$cupomCodigo; }
  if ($cupomDesconto>0 && in_array('desconto',$cols))              { $fields[]='desconto';               $values[]=$cupomDesconto; }
  /* NÃO salvar token em observacoes_cliente */

  $ph = implode(',', array_fill(0,count($fields),'?'));
  $fl = implode(',', $fields);
  $conn->prepare("INSERT INTO pedidos($fl) VALUES($ph)")->execute($values);
  $pedidoId = (int)$conn->lastInsertId();
  /* token = ID do pedido (simples e sem poluir campos) */
  $token = (string)$pedidoId;

  /* ── Código do pedido (respeita offset de sequência zerada) ── */
  /* Recarrega colunas caso a coluna codigo tenha sido adicionada pelo zerar-sequencia */
  $colsAtual = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temCodigoAtual = in_array('codigo', $colsAtual);
  if ($temCodigoAtual) {
    $codigoBase = 0;
    try {
      $stmtBase = $conn->prepare(
        "SELECT CAST(valor AS UNSIGNED) FROM configuracoes WHERE chave='pedido_codigo_base' AND loja_id=? LIMIT 1"
      );
      $stmtBase->execute([$lojaId]);
      $baseVal = $stmtBase->fetchColumn();
      if ($baseVal !== false && (int)$baseVal > 0) $codigoBase = (int)$baseVal;
    } catch (Exception $e) {}
    $codigoExibir = $codigoBase > 0 ? max(1, $pedidoId - $codigoBase) : $pedidoId;
    $conn->prepare("UPDATE pedidos SET codigo=? WHERE id=?")->execute([$codigoExibir, $pedidoId]);
  }

  /* ── Itens ── */
  /* cross_sell/produto_id já garantidas no bloco de DDL pré-transação, no topo do arquivo */
  $colsItens    = $conn->query("SHOW COLUMNS FROM pedido_itens")->fetchAll(PDO::FETCH_COLUMN,0);
  $temProdutoId = in_array('produto_id',$colsItens);
  $temObsItem   = in_array('observacoes',$colsItens);
  $temCrossSell = in_array('cross_sell',$colsItens);

  foreach ($itens as $item) {
    $nomeItem  = trim($item['nome'] ?? '');
    $preco     = (float)($item['preco'] ?? 0);
    $qtd       = (int)($item['qtd'] ?? 1);
    $prodId    = (int)($item['id'] ?? 0);
    $obsItem   = trim($item['obs'] ?? '');
    $crossSell = !empty($item['crossSell']) ? 1 : 0;

    $fi = ['pedido_id','produto_nome','quantidade','preco','loja_id'];
    $vi = [$pedidoId,$nomeItem,$qtd,$preco,$lojaId];
    if ($temProdutoId) { $fi[]='produto_id'; $vi[]=$prodId; }
    if ($temObsItem)   { $fi[]='observacoes'; $vi[]=$obsItem; }
    if ($temCrossSell) { $fi[]='cross_sell'; $vi[]=$crossSell; }

    $ph2 = implode(',',array_fill(0,count($fi),'?'));
    $fl2 = implode(',',$fi);
    $isComboItem = !empty($item['combosels']) && is_array($item['combosels']);
    $conn->prepare("INSERT INTO pedido_itens($fl2) VALUES($ph2)")->execute($vi);
    $pedidoItemId = (int) $conn->lastInsertId();

    /* descontar estoque se existir — itens de combo usam o id da tabela
       "combos" aqui (nao de "produtos"), entao o estoque deles e controlado
       so pelos componentes escolhidos (combosels), tratados abaixo */
    if (!$isComboItem) {
      try {
        $conn->prepare("UPDATE estoque SET quantidade=quantidade-? WHERE produto_id=? AND loja_id=? AND quantidade>=?")->execute([$qtd,$prodId,$lojaId,$qtd]);
        estoqueVinculoSincronizar($conn, $prodId, $lojaId, ['tipo' => 'saida', 'quantidade' => $qtd, 'origem' => 'pedido', 'referencia_id' => $pedidoId]);
      } catch (Exception $e) {}
    }

    /* descontar estoque dos itens selecionados no combo */
    if ($isComboItem) {
      $stmtEst = $conn->prepare("UPDATE estoque SET quantidade=quantidade-? WHERE produto_id=? AND loja_id=? AND quantidade>=?");
      foreach ($item['combosels'] as $sel) {
        $selId  = (int)($sel['id']  ?? 0);
        $selQtd = (int)($sel['qtd'] ?? 1) * $qtd; // multiplica pela qtd do combo
        if ($selId > 0 && $selQtd > 0) {
          try {
            $stmtEst->execute([$selQtd, $selId, $lojaId, $selQtd]);
            estoqueVinculoSincronizar($conn, $selId, $lojaId, ['tipo' => 'saida', 'quantidade' => $selQtd, 'origem' => 'pedido', 'referencia_id' => $pedidoId]);
          } catch (Exception $e) {}
        }
      }
      /* Persiste os componentes usados pra que o cancelamento do pedido saiba
         o que devolver ao estoque (ver admin/helpers/combo_estoque_module.php). */
      comboEstoqueRegistrarComponentes($conn, (int) $pedidoId, $pedidoItemId, $item['combosels'], $qtd, $lojaId);
    }
  }

  /* ── Pagamentos ── */
  try {
    $conn->prepare("INSERT INTO pedido_pagamentos(pedido_id,forma,valor,loja_id) VALUES(?,?,?,?)")->execute([$pedidoId,$pagamento,$total,$lojaId]);
  } catch (Exception $e) {}

  $conn->commit();

  /* ── Baixa de quantidade do cupom utilizado ── */
  if ($cupomCodigo !== '') {
    try {
      /* Incrementa diretamente — validação de disponibilidade já foi feita no cupons_validar.php */
      $conn->prepare(
        "UPDATE cupons SET quantidade_usada = COALESCE(quantidade_usada, 0) + 1 WHERE codigo = ? AND loja_id = ?"
      )->execute([$cupomCodigo, $lojaId]);
    } catch (Exception $e) { /* não interrompe o pedido */ }
  }

  /* ── Cashback: aplicar uso e gerar novo ── */
  try {
    require_once '../../admin/helpers/config.php';
    require_once '../../admin/helpers/cashback_module.php';
    $_SESSION['loja_id'] = $lojaId;
    $cashbackAtivo = config($conn,'cashback_ativo','0') === '1';
    if ($cashbackAtivo) {
      $cashbackPct      = (float) config($conn,'cashback_percentual',0);
      $clientesCols     = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN,0);
      $temSaldo         = in_array('cashback_saldo',$clientesCols);
      $temTabelaMov     = (bool)$conn->query("SHOW TABLES LIKE 'cashback_movimentacoes'")->fetchColumn();
      cashbackEnsureModule($conn);

      if ($temSaldo) {
        /* 1. Descontar cashback usado (limitado ao saldo ja liberado, respeitando a carencia) */
        if ($cashbackUsar && $cashbackValorUsar > 0) {
          $saldoAtual = (float)$conn->query("SELECT cashback_saldo FROM clientes WHERE id=$clienteId")->fetchColumn();
          $saldoLiberado = $saldoAtual;
          if ($temTabelaMov) {
            /* Soma so as entradas AINDA em carencia; saldo sem rastro no ledger (ajustes
               antigos) e tratado como ja liberado. */
            $stmtLib = $conn->prepare("
              SELECT m.id, m.valor,
                COALESCE((
                  SELECT SUM(valor) FROM cashback_movimentacoes u
                  WHERE u.referencia_id = m.id AND u.tipo IN ('uso','resgate','expirado') AND u.loja_id = m.loja_id
                ), 0) AS usado
              FROM cashback_movimentacoes m
              WHERE m.cliente_id = ? AND m.loja_id = ? AND m.tipo IN ('entrada','ganho')
                AND m.disponivel_em IS NOT NULL
                AND m.disponivel_em > NOW()
                AND (m.expira_em IS NULL OR m.expira_em >= CURDATE())
              ORDER BY m.criado_em ASC, m.id ASC
            ");
            $stmtLib->execute([$clienteId,$lojaId]);
            $totalNaoLib = 0.0;
            foreach ($stmtLib->fetchAll(PDO::FETCH_ASSOC) as $rowLib) {
              $d = (float)$rowLib['valor'] - (float)$rowLib['usado'];
              if ($d > 0) $totalNaoLib += $d;
            }
            $saldoLiberado = max(0, min($saldoAtual, $saldoAtual - $totalNaoLib));
          }
          if ($cashbackValorUsar > $saldoLiberado + 0.009) {
            $cashbackValorUsar = max(0, $saldoLiberado);
          }
        }
        if ($cashbackUsar && $cashbackValorUsar > 0) {
          $conn->prepare("UPDATE clientes SET cashback_saldo=GREATEST(0,cashback_saldo-?) WHERE id=? AND loja_id=?")
               ->execute([$cashbackValorUsar,$clienteId,$lojaId]);
          if ($temTabelaMov) {
            $saldoDepoisUso = max(0,(float)$conn->query("SELECT cashback_saldo FROM clientes WHERE id=$clienteId")->fetchColumn());
            $saldoAntesUso  = $saldoDepoisUso + $cashbackValorUsar;
            $conn->prepare("INSERT INTO cashback_movimentacoes(cliente_id,pedido_id,tipo,valor,saldo_antes,saldo_depois,loja_id,criado_em) VALUES(?,?,?,?,?,?,?,NOW())")
                 ->execute([$clienteId,$pedidoId,'uso',$cashbackValorUsar,$saldoAntesUso,$saldoDepoisUso,$lojaId]);
          }
        }
        /* 2. Gerar cashback do pedido — fica 'pendente' ate o pedido ser finalizado no
              admin (cashbackPromoverPendente em helpers/cashback_module.php); nao
              credita cashback_saldo agora, e se o pedido for cancelado nunca chega
              a ser creditado. */
        if ($cashbackPct > 0) {
          $baseCalc  = $total - ($cashbackUsar ? $cashbackValorUsar : 0);
          $novoSaldo = round($baseCalc * $cashbackPct / 100, 2);
          if ($novoSaldo > 0 && $temTabelaMov) {
            $saldoAtualPend = (float)$conn->query("SELECT cashback_saldo FROM clientes WHERE id=$clienteId")->fetchColumn();
            $conn->prepare("INSERT INTO cashback_movimentacoes(cliente_id,pedido_id,tipo,valor,saldo_antes,saldo_depois,loja_id,criado_em) VALUES(?,?,?,?,?,?,?,NOW())")
                 ->execute([$clienteId,$pedidoId,'pendente',$novoSaldo,$saldoAtualPend,$saldoAtualPend,$lojaId]);
          }
        }
      }
    }
  } catch (Exception $e) {}

  /* ── Clube de pontos: gera os pontos ganhos pela compra (fica 'pendente' ate
        o pedido ser finalizado no admin — mesmo padrao usado no PDV). ── */
  try {
    require_once '../../admin/helpers/config.php';
    $clubePontosAtivo = config($conn,'clube_pontos_ativo','0') === '1';
    if ($clubePontosAtivo && $clienteId > 0) {
      $clientesColsPt = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN,0);
      $temPontosSaldo = in_array('pontos_saldo',$clientesColsPt);
      $temPontosCol   = in_array('pontos',$clientesColsPt);
      $campoPontosCliente = $temPontosSaldo ? 'pontos_saldo' : ($temPontosCol ? 'pontos' : null);
      $temTabelaPontosMov = (bool)$conn->query("SHOW TABLES LIKE 'pontos_movimentacoes'")->fetchColumn();

      if ($campoPontosCliente && $temTabelaPontosMov) {
        $produtoIdsPt = [];
        foreach ($itens as $it) {
          $pid = (int)($it['id'] ?? 0);
          if ($pid > 0) $produtoIdsPt[$pid] = true;
        }
        $pontosGanhoTotal = 0;
        if ($produtoIdsPt) {
          $phPt = implode(',', array_fill(0, count($produtoIdsPt), '?'));
          $stmtPt = $conn->prepare("SELECT id, pontos_ganho FROM produtos WHERE id IN ($phPt) AND loja_id = ?");
          $stmtPt->execute([...array_keys($produtoIdsPt), $lojaId]);
          $mapPontosGanho = [];
          foreach ($stmtPt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $mapPontosGanho[(int)$row['id']] = (int)$row['pontos_ganho'];
          }
          foreach ($itens as $it) {
            $pid   = (int)($it['id'] ?? 0);
            $qtd   = (int)($it['qtd'] ?? 0);
            $obsIt = trim($it['obs'] ?? '');
            /* item resgatado com pontos nao gera pontos novos */
            if ($pid <= 0 || $qtd <= 0 || $obsIt === '[Resgate de pontos]') continue;
            $pontosGanhoTotal += ($mapPontosGanho[$pid] ?? 0) * $qtd;
          }
        }
        if ($pontosGanhoTotal > 0) {
          $saldoAtualPt = (int)$conn->query("SELECT {$campoPontosCliente} FROM clientes WHERE id=$clienteId")->fetchColumn();
          $conn->prepare("
            INSERT INTO pontos_movimentacoes
              (cliente_id, pedido_id, tipo, pontos, saldo_antes, saldo_depois, referencia_id, loja_id)
            VALUES (?, ?, 'pendente', ?, ?, ?, NULL, ?)
          ")->execute([$clienteId, $pedidoId, $pontosGanhoTotal, $saldoAtualPt, $saldoAtualPt, $lojaId]);
        }
      }
    }
  } catch (Exception $e) {}

  /* Retorna o código exibível (sequência zerada se aplicável) */
  require_once '../../helpers/pedido_codigo.php';
  $codigoBase    = getPedidoCodigoBase($conn, $lojaId);
  $codigoDisplay = calcCodigoDisplay($pedidoId, $codigoBase);

  /* ── Enviar confirmação ao cliente via Evolution API e salvar no WhatsLilly ── */
  try {
    $cfgGet = function(string $chave) use ($conn, $lojaId): string {
      $s = $conn->prepare("SELECT valor FROM configuracoes WHERE loja_id=? AND chave=? LIMIT 1");
      $s->execute([$lojaId, $chave]);
      $val = $s->fetchColumn();
      if ($val === false || $val === '') {
        $s->execute([0, $chave]);
        $val = $s->fetchColumn();
      }
      return (string)($val ?: '');
    };

    $evolutionUrl   = $cfgGet('evolution_url');
    $evolutionToken = $cfgGet('evolution_token');
    $evolutionInst  = $cfgGet('evolution_instance');

    if ($evolutionUrl && $evolutionToken && $evolutionInst && $telefone) {
      $destNum = preg_replace('/\D+/', '', $telefone);
      if (strlen($destNum) <= 11) $destNum = '55' . $destNum;

      // Configurações da loja para a mensagem
      $lojaNome   = $cfgGet('nome_loja') ?: 'Cardápio';
      $lojaRua    = trim($cfgGet('loja_rua'));
      $lojaNum    = trim($cfgGet('loja_numero'));
      $lojaBairro = trim($cfgGet('loja_bairro'));
      $lojaCidade = trim($cfgGet('loja_cidade'));
      $lojaEstado = trim($cfgGet('loja_estado'));
      $lojaCep    = trim($cfgGet('loja_cep'));
      $tempoMin   = $cfgGet('taxa_entrega_tempo_min') ?: '20';
      $tempoMax   = $cfgGet('taxa_entrega_tempo_max') ?: '30';
      $linkLoja   = $cfgGet('link_loja');
      $pixNome    = $cfgGet('pagamento_pix_nome');
      $pixChave   = $cfgGet('pagamento_pix_chave');

      $tipoTexto    = ($tipo === 'entrega') ? 'Entrega' : 'Retirada';
      $pagTexto     = ucfirst(str_ireplace(['_', '-'], ' ', $pagamento));
      $telFormatado = formatarTelefoneBR($telefone);

      $msg  = "*NÚMERO DO PEDIDO*: #{$codigoDisplay}\n\n";
      $msg .= "Nome Cardápio: {$lojaNome}\n";
      $msg .= "Nome do cliente: {$nome}\n";
      $msg .= "Número do telefone: {$telFormatado}\n\n";
      $msg .= "Forma de pagamento: \n";
      $msg .= "- {$pagTexto}\n";
      $msg .= "Tipo de entrega: {$tipoTexto}\n";

      if ($tipo === 'retirada') {
        $msg .= "*Tempo estimado para retirada: Entre {$tempoMin} e {$tempoMax} minutos*\n";
        $endLoja = "{$lojaRua} , {$lojaNum}, {$lojaBairro}, {$lojaCidade}/{$lojaEstado}, CEP {$lojaCep}";
        $msg .= "*Endereço para retirada: {$endLoja}*\n";
      } else {
        $msg .= "*Tempo estimado para entrega: Entre {$tempoMin} e {$tempoMax} minutos*\n";
        if ($endereco) $msg .= "*Endereço de entrega: {$endereco}*\n";
      }

      $msg .= "\n*RESUMO DO PEDIDO*:\n";
      foreach ($itens as $item) {
        $nItem = trim($item['nome'] ?? '');
        $qItem = (int)($item['qtd'] ?? 1);
        $pItem = (float)($item['preco'] ?? 0);
        if ($nItem) $msg .= "👉 {$qItem}x {$nItem}  R$ " . number_format($qItem * $pItem, 2, ',', '.') . "\n";
      }
      $msg .= "\n";
      if ($taxaEnt > 0) {
        $msg .= "*Taxa de entrega*: R$ " . number_format($taxaEnt, 2, ',', '.') . "\n";
      }
      $msg .= "*TOTAL*: R$ " . number_format($total, 2, ',', '.') . "\n";

      // Cashback ganho (só exibe se foi calculado e é > 0)
      $cbGanho = $novoSaldo ?? 0;
      if ($cbGanho > 0) {
        $msg .= "*CASHBACK ganho*: R$ " . number_format($cbGanho, 2, ',', '.') . "\n";
      }
      // Pontos: 1 ponto a cada R$10 (arredondado para cima)
      $pontosGanhos = (int) ceil($total / 10);
      if ($pontosGanhos > 0) {
        $msg .= "*Pontos a receber*: {$pontosGanhos} pts\n";
      }

      // Dados Pix (só exibe se pagamento for pix)
      if (stripos($pagamento, 'pix') !== false && ($pixNome || $pixChave)) {
        $msg .= "\n *Nome da chave Pix*: \n";
        $msg .= " 👉 *{$pixNome}*\n";
        $msg .= "\n *Chave Pix*: \n";
        $msg .= " 👉 *{$pixChave}*\n";
      }

      if ($linkLoja) {
        $msg .= "\nAcompanhe seu pedido através do link abaixo:\n{$linkLoja}";
      }

      // Número sem +55 para guardar na conversa
      $numConversa = preg_replace('/^55/', '', $destNum);
      $resumo = "🛍 Pedido #{$codigoDisplay} — R$ " . number_format($total, 2, ',', '.');

      // Salva no WhatsLilly SEMPRE (independente do envio WhatsApp funcionar)
      $conn->prepare("
        INSERT INTO whats_conversas (loja_id, numero, nome, ultimo_msg, ultimo_msg_em)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          nome          = VALUES(nome),
          ultimo_msg    = VALUES(ultimo_msg),
          ultimo_msg_em = NOW()
      ")->execute([$lojaId, $numConversa, $nome, $resumo]);

      $s2 = $conn->prepare("SELECT id FROM whats_conversas WHERE loja_id=? AND numero=? LIMIT 1");
      $s2->execute([$lojaId, $numConversa]);
      $conversaId = (int)$s2->fetchColumn();

      $whatsId = null;

      // Tenta enviar via Evolution API (opcional)
      $ch = curl_init(rtrim($evolutionUrl, '/') . '/message/sendText/' . $evolutionInst);
      curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'apikey: ' . $evolutionToken],
        CURLOPT_POSTFIELDS     => json_encode(['number' => $destNum, 'text' => $msg]),
      ]);
      $resp     = curl_exec($ch);
      $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
      unset($ch);
      if ($httpCode >= 200 && $httpCode < 300) {
        $respData = json_decode($resp, true);
        $whatsId  = $respData['key']['id'] ?? null;
      }

      // Salva a mensagem do pedido no WhatsLilly
      if ($conversaId > 0) {
        $conn->prepare("
          INSERT INTO whats_mensagens (conversa_id, loja_id, direcao, tipo, mensagem, pedido_id, whats_msg_id)
          VALUES (?, ?, 'saida', 'pedido', ?, ?, ?)
        ")->execute([$conversaId, $lojaId, $msg, $pedidoId, $whatsId]);
      }
    }
  } catch (Exception $e) {}

  echo json_encode(['ok'=>true,'id'=>$pedidoId,'codigo'=>$codigoDisplay,'token'=>$token]);

} catch (Exception $e) {
  /* so faz rollback se a transacao principal (linha ~146-277) ainda estiver aberta —
     uma excecao ocorrida DEPOIS do commit (ex: nos blocos de cashback/pontos/whatsapp,
     que rodam apos o pedido ja estar salvo) nao tem mais transacao pra desfazer; chamar
     rollBack() as cegas nesse caso lanca "There is no active transaction" e derruba a
     resposta inteira com um fatal nao tratado — o pedido ja tinha sido criado, mas o
     cliente nunca recebia o {"ok":true}, e nada do que rodou depois do commit (cashback
     usado, pontos, notificacao) ficava registrado no log pra investigar depois. */
  error_log('pedido_criar.php: '.$e->getMessage().' em '.$e->getFile().':'.$e->getLine());
  if ($conn->inTransaction()) { $conn->rollBack(); }
  echo json_encode(['ok'=>false,'msg'=>'Erro interno: '.$e->getMessage()]);
}
