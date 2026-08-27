<?php
session_start();
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/storage.php';
require_once __DIR__ . '/../helpers/loja_context.php';

function fixImgPath(string $p): string {
  return storage_url_absoluta($p);
}

/* Base absoluta pra /public/ — necessaria pq essa pagina tambem e acessada
   via link curto reescrito (dominio.com/nomedaloja/garcom), onde qualquer
   redirect ou link relativo (garcom_login.php, api/...) resolveria errado
   partindo dessa URL "fake". Usada tanto no <base href> (resolve os assets/
   fetch do lado do navegador) quanto nos header('Location:') abaixo (que o
   <base> nao alcança, por ser side do servidor). */
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$publicBaseHref = $protocol . $host . storage_base_absoluta() . '/public/';

$lojaId = obterLojaIdDaRequisicao($conn);

if (!isset($_SESSION['garcom_id']) || (int) ($_SESSION['garcom_loja_id'] ?? 0) !== $lojaId || $lojaId <= 0) {
  header('Location: ' . $publicBaseHref . 'garcom_login.php' . ($lojaId > 0 ? '?loja_id=' . $lojaId : ''));
  exit;
}

$garcomNome = $_SESSION['garcom_nome'] ?? 'Garçom';

$stmt = $conn->prepare("SELECT chave, valor FROM configuracoes WHERE loja_id = ? AND chave IN ('nome_loja','loja_perfil','pagamento_dinheiro_ativo','pagamento_pix_ativo','pagamento_credito_ativo','pagamento_debito_ativo')");
$stmt->execute([$lojaId]);
$cfgLoja = [];
foreach ($stmt as $r) {
  $cfgLoja[$r['chave']] = $r['valor'];
}
$nomeLoja = $cfgLoja['nome_loja'] ?? 'Loja';
$perfilLoja = !empty($cfgLoja['loja_perfil']) ? fixImgPath($cfgLoja['loja_perfil']) : '';
$dinAtivo = ($cfgLoja['pagamento_dinheiro_ativo'] ?? '1') === '1';
$pixAtivo = ($cfgLoja['pagamento_pix_ativo'] ?? '1') === '1';
$credAtivo = ($cfgLoja['pagamento_credito_ativo'] ?? '1') === '1';
$debAtivo = ($cfgLoja['pagamento_debito_ativo'] ?? '1') === '1';

$stmt = $conn->prepare("SELECT id, nome FROM mesas WHERE loja_id = ? AND ativo = 1 ORDER BY nome");
$stmt->execute([$lojaId]);
$mesas = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("SELECT id, nome FROM categorias WHERE loja_id = ? AND ativo = 1 ORDER BY ordem IS NULL, ordem, nome");
$stmt->execute([$lojaId]);
$categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);

$cols = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temImg = in_array('imagem', $cols, true);
$temProm = in_array('preco_promocional', $cols, true) && in_array('promo_desativado', $cols, true);
$temPromoDur = in_array('promo_dias', $cols, true) && in_array('promo_inicio', $cols, true);
$si = $temImg ? ', p.imagem' : '';
$sp = $temProm ? ', p.preco_promocional, p.promo_desativado' : '';
$spd = $temPromoDur ? ', p.promo_dias, p.promo_inicio' : '';

$produtosPorCat = [];
foreach ($categorias as $cat) {
  $s = $conn->prepare("SELECT p.id, p.nome, p.preco{$si}{$sp}{$spd}, IFNULL(e.quantidade,0) AS estoque FROM produtos p LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id WHERE p.categoria_id = ? AND p.ativo = 1 AND p.loja_id = ? ORDER BY p.ordem IS NULL, p.ordem, p.nome");
  $s->execute([$cat['id'], $lojaId]);
  $prods = $s->fetchAll(PDO::FETCH_ASSOC);
  foreach ($prods as &$pr) {
    $pr['imagem'] = $temImg ? fixImgPath($pr['imagem'] ?? '') : '';
    $pr['preco_base'] = (float) $pr['preco'];
    $pr['estoque'] = (int) $pr['estoque'];
    $pr['esgotado'] = $pr['estoque'] <= 0;
    $promoExpirada = false;
    if ($temPromoDur && !empty($pr['promo_dias']) && !empty($pr['promo_inicio'])) {
      $promoFim = strtotime($pr['promo_inicio'] . ' +' . (int) $pr['promo_dias'] . ' days');
      if ($promoFim !== false && $promoFim <= strtotime('today')) {
        $promoExpirada = true;
      }
    }
    if ($temProm && !($pr['promo_desativado'] ?? 1) && ($pr['preco_promocional'] ?? 0) > 0 && !$promoExpirada) {
      $pr['preco_final'] = (float) $pr['preco_promocional'];
      $pr['em_promo'] = true;
    } else {
      $pr['preco_final'] = $pr['preco_base'];
      $pr['em_promo'] = false;
    }
    $pr['tipo'] = 'produto';
  }
  unset($pr);
  if ($prods) {
    $produtosPorCat[$cat['id']] = $prods;
  }
}

$combosPorCat = [];
try {
  if ($conn->query("SHOW TABLES LIKE 'combos'")->fetchColumn()) {
    $cbCols = $conn->query("SHOW COLUMNS FROM combos")->fetchAll(PDO::FETCH_COLUMN, 0);
    $cbTemImg = in_array('imagem', $cbCols, true);
    $cbTemProm = in_array('preco_promocional', $cbCols, true) && in_array('promo_desativado', $cbCols, true);
    $cbImg = $cbTemImg ? ', imagem' : '';
    $cbProm = $cbTemProm ? ', preco_promocional, promo_desativado' : '';
    foreach ($categorias as $cat) {
      $sc = $conn->prepare("SELECT id, nome, descricao, preco{$cbImg}{$cbProm} FROM combos WHERE categoria_id = ? AND ativo = 1 AND loja_id = ? ORDER BY ordem IS NULL, ordem, nome");
      $sc->execute([$cat['id'], $lojaId]);
      $cbs = $sc->fetchAll(PDO::FETCH_ASSOC);
      foreach ($cbs as &$cb) {
        $cb['imagem'] = $cbTemImg ? fixImgPath($cb['imagem'] ?? '') : '';
        $cb['preco_base'] = (float) $cb['preco'];
        $cb['tipo'] = 'combo';
        if ($cbTemProm && !($cb['promo_desativado'] ?? 1) && ($cb['preco_promocional'] ?? 0) > 0) {
          $cb['preco_final'] = (float) $cb['preco_promocional'];
          $cb['em_promo'] = true;
        } else {
          $cb['preco_final'] = $cb['preco_base'];
          $cb['em_promo'] = false;
        }
      }
      unset($cb);
      if ($cbs) {
        $combosPorCat[$cat['id']] = $cbs;
      }
    }
  }
} catch (Throwable $e) {
}

$categorias = array_values(array_filter($categorias, fn($c) => isset($produtosPorCat[$c['id']]) || isset($combosPorCat[$c['id']])));

$cssVer = filemtime(__DIR__ . '/assets/css/loja.css');
$garcomCssVer = filemtime(__DIR__ . '/assets/css/garcom.css');
$garcomJsVer = filemtime(__DIR__ . '/assets/js/garcom.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Modo Garçom — <?= htmlspecialchars($nomeLoja) ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<base href="<?= htmlspecialchars($publicBaseHref) ?>">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/loja.css?v=<?= $cssVer ?>" rel="stylesheet">
<link href="./assets/css/garcom.css?v=<?= $garcomCssVer ?>" rel="stylesheet">
</head>
<body class="gc-body">

<!-- ══ TOPO ══ -->
<div class="gc-top">
  <div class="gc-top-loja">
    <?php if ($perfilLoja): ?><img src="<?= htmlspecialchars($perfilLoja) ?>" alt=""><?php else: ?><div class="gc-top-loja-ph"><?= htmlspecialchars(mb_substr($nomeLoja, 0, 1, 'UTF-8')) ?></div><?php endif; ?>
    <div>
      <div class="gc-top-loja-nome"><?= htmlspecialchars($nomeLoja) ?></div>
      <div class="gc-top-garcom">Garçom: <?= htmlspecialchars($garcomNome) ?></div>
    </div>
  </div>
  <div class="gc-top-actions">
    <button class="gc-top-mesa-btn d-none" id="gcTrocarMesaBtn" onclick="gcVoltarMesas()"><i class="bi bi-arrow-left-right"></i> <span id="gcMesaAtualLbl"></span></button>
    <a class="gc-top-sair" href="api/garcom_logout.php"><i class="bi bi-box-arrow-right"></i></a>
  </div>
</div>

<!-- ══ NAVEGAÇÃO: NOVO PEDIDO / PEDIDOS ABERTOS ══ -->
<div class="gc-nav-tabs">
  <button type="button" class="gc-nav-tab active" id="gcNavPedir" onclick="gcTrocarView('pedir')"><i class="bi bi-plus-circle"></i> Novo pedido</button>
  <button type="button" class="gc-nav-tab" id="gcNavAbertos" onclick="gcTrocarView('abertos')"><i class="bi bi-receipt"></i> Pedidos abertos <span class="gc-nav-badge d-none" id="gcAbertosBadge">0</span></button>
</div>

<div id="gcViewPedir">
<!-- ══ TELA: ESCOLHER MESA ══ -->
<div class="gc-mesas-screen" id="gcMesasScreen">
  <h1 class="gc-mesas-title">Qual mesa você está atendendo?</h1>
  <?php if (!$mesas): ?>
    <div class="gc-mesas-empty"><i class="bi bi-grid-3x3-gap"></i> Nenhuma mesa cadastrada. Peça ao gerente para cadastrar mesas em Modo Garçom.</div>
  <?php else: ?>
    <div class="gc-mesas-grid">
      <?php foreach ($mesas as $m): ?>
        <button type="button" class="gc-mesa-btn" data-mesa-id="<?= (int) $m['id'] ?>" data-mesa-nome="<?= htmlspecialchars($m['nome']) ?>" onclick="gcEscolherMesa(<?= (int) $m['id'] ?>, '<?= htmlspecialchars($m['nome'], ENT_QUOTES) ?>')">
          <i class="bi bi-circle"></i>
          <span><?= htmlspecialchars($m['nome']) ?></span>
        </button>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</div>

<!-- ══ TELA: CARDÁPIO ══ -->
<div class="gc-cardapio-screen d-none" id="gcCardapioScreen">
  <?php if (!$categorias): ?>
    <div class="gc-mesas-empty"><i class="bi bi-emoji-frown"></i> Nenhum produto disponível no momento.</div>
  <?php endif; ?>

  <nav class="cat-nav gc-cat-nav">
    <div class="cat-nav-inner">
      <div class="cat-scroll">
        <?php foreach ($categorias as $i => $cat): ?>
          <button type="button" class="cat-btn<?= $i === 0 ? ' active' : '' ?>" data-cat-btn="<?= (int) $cat['id'] ?>" onclick="gcIrParaCategoria(<?= (int) $cat['id'] ?>)"><?= htmlspecialchars($cat['nome']) ?></button>
        <?php endforeach; ?>
      </div>
    </div>
  </nav>

  <div class="gc-produtos-wrap">
    <?php foreach ($categorias as $cat): ?>
      <section class="cat-section" id="gcCat<?= (int) $cat['id'] ?>" data-cat-section="<?= (int) $cat['id'] ?>">
        <div class="section-title"><?= htmlspecialchars($cat['nome']) ?></div>
        <div class="gc-produtos-grid">
          <?php foreach (($combosPorCat[$cat['id']] ?? []) as $c): ?>
            <?php $dj = htmlspecialchars(json_encode($c, JSON_UNESCAPED_UNICODE), ENT_QUOTES); ?>
            <button type="button" class="gc-produto-card" onclick='gcAbrirProduto(<?= $c['id'] ?>, <?= $dj ?>)'>
              <div class="gc-produto-img"><?php if ($c['imagem']): ?><img src="<?= htmlspecialchars($c['imagem']) ?>" alt=""><?php else: ?><i class="bi bi-basket3"></i><?php endif; ?><span class="gc-produto-badge-combo">Combo</span></div>
              <div class="gc-produto-nome"><?= htmlspecialchars($c['nome']) ?></div>
              <div class="gc-produto-preco">R$ <?= number_format($c['preco_final'], 2, ',', '.') ?></div>
            </button>
          <?php endforeach; ?>
          <?php foreach (($produtosPorCat[$cat['id']] ?? []) as $p): ?>
            <?php $dj = htmlspecialchars(json_encode($p, JSON_UNESCAPED_UNICODE), ENT_QUOTES); ?>
            <button type="button" class="gc-produto-card<?= $p['esgotado'] ? ' gc-produto-card--esgotado' : '' ?>" onclick='gcAbrirProduto(<?= $p['id'] ?>, <?= $dj ?>)'>
              <div class="gc-produto-img"><?php if ($p['imagem']): ?><img src="<?= htmlspecialchars($p['imagem']) ?>" alt=""><?php else: ?><i class="bi bi-image"></i><?php endif; ?><?php if ($p['esgotado']): ?><span class="gc-produto-badge-esgotado">Esgotado</span><?php endif; ?></div>
              <div class="gc-produto-nome"><?= htmlspecialchars($p['nome']) ?></div>
              <div class="gc-produto-preco">
                <?php if ($p['em_promo']): ?><span class="gc-preco-old">R$ <?= number_format($p['preco_base'], 2, ',', '.') ?></span> <?php endif; ?>
                R$ <?= number_format($p['preco_final'], 2, ',', '.') ?>
              </div>
            </button>
          <?php endforeach; ?>
        </div>
      </section>
    <?php endforeach; ?>
  </div>

  <!-- ══ BARRA DO CARRINHO ══ -->
  <button type="button" class="gc-cart-bar d-none" id="gcCartBar" onclick="gcAbrirCarrinho()">
    <span class="gc-cart-bar-count" id="gcCartCount">0</span>
    <span class="gc-cart-bar-lbl">Ver pedido da mesa</span>
    <span class="gc-cart-bar-total" id="gcCartTotal">R$ 0,00</span>
  </button>
</div>
</div><!-- /gcViewPedir -->

<!-- ══ TELA: PEDIDOS ABERTOS ══ -->
<div class="gc-abertos-screen d-none" id="gcViewAbertos">
  <div class="gc-abertos-lista" id="gcAbertosLista">
    <div class="gc-mesas-empty"><i class="bi bi-hourglass-split"></i> Carregando pedidos...</div>
  </div>
</div>

<!-- ══ SHEET: CARRINHO ══ -->
<div class="sheet" id="gcCartSheet">
  <div class="sheet-handle"></div>
  <div class="sheet-head">
    <button class="sheet-back" onclick="gcFecharSheet('gcCartSheet')"><i class="bi bi-chevron-left"></i></button>
    <span class="sheet-head-title">Pedido da mesa</span>
    <span></span>
  </div>
  <div class="sheet-body">
    <div id="gcCartBody"></div>
    <div id="gcPaySection"></div>
  </div>
  <div class="sheet-footer" id="gcCartFooter" style="display:none">
    <div class="cart-footer-total">
      <div class="cart-footer-info">
        <div class="cart-footer-lbl">Total do pedido</div>
        <div class="cart-footer-val"><span id="gcCartFooterTotal">R$ 0,00</span></div>
      </div>
      <button class="cart-footer-btn" id="gcEnviarBtn" onclick="gcEnviarPedido()">Enviar pedido</button>
    </div>
  </div>
</div>

<!-- ══ PRODUTO MODAL (reaproveita as classes de loja.css) ══ -->
<div class="prod-modal-overlay" id="prodModalOverlay" onclick="fecharProdModal()"></div>
<div class="prod-modal prod-modal-sheet" id="prodModal">
  <button class="prod-modal-close" onclick="fecharProdModal()"><i class="bi bi-x"></i></button>
  <div class="prod-modal-scroll">
    <div class="prod-modal-top">
      <div class="prod-modal-img-wrap" id="pdImgWrap">
        <img id="pdImg" class="prod-modal-img d-none" src="" alt="">
        <div class="prod-modal-img-ph" id="pdImgPh"><i class="bi bi-image"></i></div>
      </div>
      <div class="prod-modal-info">
        <div class="prod-modal-nome" id="pdNome2"></div>
        <div class="prod-modal-preco" id="pdPreco"></div>
      </div>
    </div>
    <div class="combo-section" id="pdComboSection" style="display:none"></div>
    <div class="prod-modal-obs">
      <div class="prod-modal-obs-lbl">Alguma observação?</div>
      <textarea class="obs-field" id="pdObs" rows="2" placeholder=""></textarea>
    </div>
  </div>
  <div class="prod-modal-footer">
    <div class="prod-modal-qty">
      <button class="qty-btn" onclick="pdQtd(-1)"><i class="bi bi-dash"></i></button>
      <span class="prod-modal-qty-num" id="pdQtd">1</span>
      <button class="qty-btn" onclick="pdQtd(1)"><i class="bi bi-plus"></i></button>
    </div>
    <button class="prod-modal-add" id="pdAddBtn" onclick="addCart()">Adicionar <span id="pdTotal">R$ 0,00</span></button>
  </div>
</div>

<!-- ══ CONFIRMAÇÃO DE ENVIO ══ -->
<div class="gc-confirm-overlay" id="gcConfirmOverlay">
  <div class="gc-confirm-card">
    <div class="gc-confirm-icon"><i class="bi bi-check-lg"></i></div>
    <div class="gc-confirm-title">Pedido enviado para a cozinha!</div>
    <div class="gc-confirm-sub" id="gcConfirmSub"></div>
    <button type="button" class="gc-confirm-btn" onclick="gcFecharConfirmacao()">Novo pedido</button>
  </div>
</div>

<div id="gcToastWrap"></div>

<script>
window.CFG = {
  lojaId: <?= (int) $lojaId ?>,
  nomeLoja: <?= json_encode($nomeLoja, JSON_UNESCAPED_UNICODE) ?>,
  dinAtivo: <?= $dinAtivo ? 'true' : 'false' ?>,
  pixAtivo: <?= $pixAtivo ? 'true' : 'false' ?>,
  credAtivo: <?= $credAtivo ? 'true' : 'false' ?>,
  debAtivo: <?= $debAtivo ? 'true' : 'false' ?>
};
</script>
<script src="./assets/js/garcom.js?v=<?= $garcomJsVer ?>"></script>
</body>
</html>
