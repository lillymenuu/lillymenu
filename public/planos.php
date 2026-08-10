<?php
require_once '../config/database.php';

function landing_table_exists(PDO $conn): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE 'landing_config'");
    $stmt->execute();
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

function landing_get(PDO $conn, string $key, string $default = ''): string {
  static $cache = [];
  if (isset($cache[$key])) {
    return $cache[$key];
  }
  if (!landing_table_exists($conn)) {
    $cache[$key] = $default;
    return $default;
  }
  try {
    $stmt = $conn->prepare("SELECT valor FROM landing_config WHERE chave = ? LIMIT 1");
    $stmt->execute([$key]);
    $valor = $stmt->fetchColumn();
    if ($valor === false || $valor === null) {
      $cache[$key] = $default;
      return $default;
    }
    $cache[$key] = (string) $valor;
    return $cache[$key];
  } catch (Exception $e) {
    $cache[$key] = $default;
    return $default;
  }
}

function landing_asset(string $path): string {
  $path = trim($path);
  if ($path === '') {
    return '';
  }
  if (preg_match('#^https?://#i', $path)) {
    return $path;
  }
  return '../admin/' . ltrim($path, '/');
}

function planos_icon(string $key): string {
  $icons = [
    'user' => '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.6-3.2 4.6-5 8-5s6.4 1.8 8 5"/>',
    'cashback' => '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h2"/>',
    'laptop' => '<rect x="4" y="5" width="16" height="11" rx="1"/><path d="M2 19h20"/>',
    'dollar' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5a2.5 2.5 0 012.5-1.5h.5a2.2 2.2 0 010 4.4h-1a2.2 2.2 0 000 4.4h.5a2.5 2.5 0 002.5-1.5"/>',
    'gift' => '<rect x="3" y="9" width="18" height="11" rx="1"/><path d="M3 9l9-4 9 4"/><path d="M12 5v15"/>',
  ];
  return $icons[$key] ?? $icons['user'];
}

$brand = landing_get($conn, 'brand', 'Lilly Menu');

/* ── Navbar ── */
$navCtaPrimaryText = landing_get($conn, 'nav_cta_primary_text', 'Falar com especialista');
$navCtaPrimaryLink = landing_get($conn, 'nav_cta_primary_link', '#contato');
$navCtaSecondaryText = landing_get($conn, 'nav_cta_secondary_text', 'Acessar');
$navCtaSecondaryLink = landing_get($conn, 'nav_cta_secondary_link', '../admin/index.php');
$logoImage = landing_get($conn, 'logo_image', '');

$navBrandFont = landing_get($conn, 'nav_brand_font', 'Poppins');
$navBrandFontsMap = [
  'Poppins' => 'Poppins:wght@600;700;800',
  'Inter' => 'Inter:wght@600;700;800',
  'Montserrat' => 'Montserrat:wght@600;700;800',
  'Raleway' => 'Raleway:wght@600;700;800',
  'Playfair Display' => 'Playfair+Display:wght@600;700;800',
  'Quicksand' => 'Quicksand:wght@600;700',
  'Pacifico' => 'Pacifico',
  'Oswald' => 'Oswald:wght@600;700',
];
if (!isset($navBrandFontsMap[$navBrandFont])) {
  $navBrandFont = 'Poppins';
}

$leadRevenueOptions = landing_get($conn, 'lead_revenue_options', "Selecionar\nAte R\$ 10 mil\nDe R\$ 10 mil a R\$ 30 mil\nDe R\$ 30 mil a R\$ 100 mil\nAcima de R\$ 100 mil");
$leadSegmentOptions = landing_get($conn, 'lead_segment_options', "Selecionar\nRestaurante\nDelivery\nLanchonete\nPizzaria\nOutro");
$leadPrivacyText = landing_get($conn, 'lead_privacy_text', 'Aceito receber contato no WhatsApp.');
$revOptions = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', (string) $leadRevenueOptions))));
$segOptions = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', (string) $leadSegmentOptions))));

/* ── Rodape ── */
$footerEmail = landing_get($conn, 'footer_email', 'contato@' . mb_strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $brand)) . '.com');
$footerTelefone = landing_get($conn, 'footer_telefone', '(85) 98504-9577');
$footerEndereco = landing_get($conn, 'footer_endereco', '');
$footerSocialInstagram = landing_get($conn, 'footer_social_instagram', '#');
$footerSocialLinkedin = landing_get($conn, 'footer_social_linkedin', '#');
$footerSocialYoutube = landing_get($conn, 'footer_social_youtube', '#');

function footer_parse_links(string $raw): array {
  $itens = [];
  foreach (preg_split('/\r\n|\r|\n/', $raw) as $linha) {
    $linha = trim($linha);
    if ($linha === '') {
      continue;
    }
    $partes = explode('|', $linha, 2);
    $label = trim($partes[0] ?? '');
    $url = trim($partes[1] ?? '#');
    if ($label === '') {
      continue;
    }
    $itens[] = ['label' => $label, 'url' => $url !== '' ? $url : '#'];
  }
  return $itens;
}

$footerMenuTitulo = landing_get($conn, 'footer_menu_titulo', 'Menu');
$footerMenuItensRaw = landing_get($conn, 'footer_menu_items', "Sobre nos|#a-lilly\nSolucoes|#solucoes\nFranquias|#franquias\nPlanos|planos.php");
$footerMenuItens = footer_parse_links($footerMenuItensRaw);

$footerParaVoceTitulo = landing_get($conn, 'footer_para_voce_titulo', 'Para voce');
$footerParaVoceItensRaw = landing_get($conn, 'footer_para_voce_items', "Blog|#\n{$brand} Podcast|#\nDownload do App|#\nTermos de uso|#\nPolitica de privacidade|#\nTermos de Delivery|#\nTermos Clube de Cupons|#");
$footerParaVoceItens = footer_parse_links(str_replace('{brand}', $brand, $footerParaVoceItensRaw));

$whatsNumber = preg_replace('/\D+/', '', landing_get($conn, 'whatsapp_number', '5585985049577'));
$whatsMessage = landing_get($conn, 'whatsapp_message', 'Ola! Quero conhecer o ' . $brand . '.');
$whatsLink = 'https://wa.me/' . $whatsNumber . '?text=' . urlencode($whatsMessage);

$indexCssVer = filemtime(__DIR__ . '/assets/css/index.css');
$indexJsVer = filemtime(__DIR__ . '/assets/js/index.js');

/* ── Tema (paleta navy / azul claro / rosa) ── */
$themeNavy = landing_get($conn, 'theme_navy', '#102a43');
$themeNavyDeep = landing_get($conn, 'theme_navy_deep', '#081d30');
$themeBlueSoft = landing_get($conn, 'theme_blue_soft', '#cfe9f7');
$themeBlueSoftText = landing_get($conn, 'theme_blue_soft_text', '#0f4c75');
$themeBlueBtn = landing_get($conn, 'theme_blue_btn', '#6fb8e0');
$themeBlueBtnText = landing_get($conn, 'theme_blue_btn_text', '#0a2e44');
$themePink = landing_get($conn, 'theme_pink', '#ec4899');
$themePinkDark = landing_get($conn, 'theme_pink_dark', '#d6357f');
$themeLink = landing_get($conn, 'theme_link', '#1f6fd6');
$themeLightBg = landing_get($conn, 'theme_light_bg', '#f4f6f8');
$themeText = landing_get($conn, 'theme_text', '#16263a');
$themeMuted = landing_get($conn, 'theme_muted', '#5b6b7a');
$themeBorder = landing_get($conn, 'theme_border', '#e2e8ee');

/* ── Pagina Planos ── */
$planosClubeNome = str_replace('{brand}', $brand, landing_get($conn, 'planos_clube_nome', 'Clube {brand}'));
$planosHeroTitulo = landing_get($conn, 'planos_hero_titulo', 'Um so plano, todos os beneficios.');
$planosHeroSubtitulo = landing_get($conn, 'planos_hero_subtitulo', 'O sistema de gestao mais completo para o seu negocio, com economia e vantagens em um unico plano.');
$planosHeroBotaoTexto = landing_get($conn, 'planos_hero_botao_texto', 'Quero assinar');
$planosHeroBotaoLink = landing_get($conn, 'planos_hero_botao_link', '#planos-tabela');
$planosHeroImagem = landing_get($conn, 'planos_hero_imagem', '');

$planosBeneficiosTitulo = str_replace('{clube}', $planosClubeNome, landing_get($conn, 'planos_beneficios_titulo', 'Confira os beneficios do {clube}'));

$beneficiosDefault = [
  ['icone' => 'user', 'titulo' => 'Sistema completo', 'texto' => 'Venda em mesas, balcao e delivery com integracoes, emissao fiscal, relatorios e muito mais. Um sistema completo por um preco acessivel.'],
  ['icone' => 'cashback', 'titulo' => 'Pontos e cashback', 'texto' => 'Seus clientes acumulam pontos e resgatam cashback em poucos meses. Use os creditos em mensalidades ou repasse beneficios para o seu publico.'],
  ['icone' => 'laptop', 'titulo' => 'Todos os modulos', 'texto' => 'Economize em comparacao a contratar modulos extras separados: garcom digital, KDS, integracao com WhatsApp e muito mais incluso.'],
  ['icone' => 'dollar', 'titulo' => 'Clube de Cupons', 'texto' => 'Seus clientes podem comprar pacotes de cupons de desconto na sua loja, com parte do valor subsidiado pela plataforma.'],
  ['icone' => 'dollar', 'titulo' => 'Descontos exclusivos', 'texto' => 'Tenha acesso a taxas exclusivas no Pix integrado ao sistema.'],
  ['icone' => 'gift', 'titulo' => 'Gerente dedicado', 'texto' => 'Conte com um especialista dedicado ao seu negocio e suporte disponivel 24 horas, todos os dias da semana.'],
];
$beneficios = [];
foreach ($beneficiosDefault as $i => $padrao) {
  $n = $i + 1;
  $beneficios[] = [
    'icone' => landing_get($conn, 'planos_beneficio' . $n . '_icone', $padrao['icone']),
    'titulo' => landing_get($conn, 'planos_beneficio' . $n . '_titulo', $padrao['titulo']),
    'texto' => landing_get($conn, 'planos_beneficio' . $n . '_texto', $padrao['texto']),
  ];
}

$planosCtaTexto = landing_get($conn, 'planos_cta_texto', 'Um so plano, todos os beneficios. Feito para o seu negocio!');
$planosCtaBotaoTexto = landing_get($conn, 'planos_cta_botao_texto', 'Quero assinar');
$planosCtaBotaoLink = landing_get($conn, 'planos_cta_botao_link', '#planos-tabela');

$planosTabelaTitulo = landing_get($conn, 'planos_tabela_titulo', 'Conheca tambem nossos outros planos');
$planosTabelaDestaquesRaw = landing_get($conn, 'planos_tabela_destaques', "Suporte 24h\nSem multa de cancelamento\nUse em qualquer dispositivo\nSem custo de instalacao");
$planosTabelaDestaques = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', $planosTabelaDestaquesRaw))));

$planosDefault = [
  ['nome' => 'Basico', 'cor' => '#facc15', 'badge' => '', 'descricao' => 'Ideal para quem trabalha apenas com delivery e nao quer depender somente de marketplaces.', 'botao_texto' => 'Falar com especialista', 'botao_link' => '#contato', 'features' => "Suporte 24h\nGestor de pedidos\nPrograma de Fidelidade\nCardapio Digital\nIntegracao com iFood\nPagamento online"],
  ['nome' => 'Essencial', 'cor' => '#3b82f6', 'badge' => 'Popular', 'descricao' => 'Para quem atende presencialmente - em mesas, balcao ou delivery - e precisa de mais controle sobre a operacao.', 'botao_texto' => 'Falar com especialista', 'botao_link' => '#contato', 'features' => "PDV + Balcao e Mesas\nControle de Estoque\nFicha tecnica\nControle financeiro\nApp para garcom\nQR Code na mesa\nDashboard com relatorios"],
  ['nome' => 'Completo', 'cor' => '#22c55e', 'badge' => 'Recomendado', 'descricao' => 'Para atender seu negocio em todas as frentes, do salao ao financeiro, com gestao completa.', 'botao_texto' => 'Falar com especialista', 'botao_link' => '#contato', 'features' => "Fiscal\nIntegracao com contabilidade\nNFC-e/CF-e ilimitada\nConciliacao de pagamentos\nNFC-e/NF-e ilimitadas\nNota de devolucao\nInventario"],
  ['nome' => 'Premium', 'cor' => '#a855f7', 'badge' => '', 'descricao' => 'Um plano sob medida para sua empresa, com recomendacao de automacoes e integracoes extras.', 'botao_texto' => 'Falar com especialista', 'botao_link' => '#contato', 'features' => "Sistema KDS\nGarcom digital\nGerente de sucesso dedicado"],
];
$planos = [];
foreach ($planosDefault as $i => $padrao) {
  $n = $i + 1;
  $featuresRaw = landing_get($conn, 'plano' . $n . '_features', $padrao['features']);
  $planos[] = [
    'nome' => landing_get($conn, 'plano' . $n . '_nome', $padrao['nome']),
    'cor' => landing_get($conn, 'plano' . $n . '_cor', $padrao['cor']),
    'badge' => landing_get($conn, 'plano' . $n . '_badge', $padrao['badge']),
    'preco' => landing_get($conn, 'plano' . $n . '_preco', ''),
    'ativo' => landing_get($conn, 'plano' . $n . '_ativo', '1') !== '0',
    'descricao' => landing_get($conn, 'plano' . $n . '_descricao', $padrao['descricao']),
    'botao_texto' => landing_get($conn, 'plano' . $n . '_botao_texto', $padrao['botao_texto']),
    'botao_link' => landing_get($conn, 'plano' . $n . '_botao_link', $padrao['botao_link']),
    'features' => array_values(array_filter(array_map('trim', preg_split('/\r?\n/', $featuresRaw)))),
  ];
}
$planos = array_values(array_filter($planos, fn($p) => $p['ativo']));
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= htmlspecialchars($brand) ?> - Planos</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<?php if ($navBrandFont !== 'Poppins'): ?>
<link href="https://fonts.googleapis.com/css2?family=<?= $navBrandFontsMap[$navBrandFont] ?>&display=swap" rel="stylesheet">
<?php endif; ?>
<link rel="icon" type="image/png" href="../admin/assets/img/favicon_store.png">
<style>
:root{
  --navy:<?= htmlspecialchars($themeNavy) ?>;
  --navy-deep:<?= htmlspecialchars($themeNavyDeep) ?>;
  --blue-soft:<?= htmlspecialchars($themeBlueSoft) ?>;
  --blue-soft-text:<?= htmlspecialchars($themeBlueSoftText) ?>;
  --blue-btn:<?= htmlspecialchars($themeBlueBtn) ?>;
  --blue-btn-text:<?= htmlspecialchars($themeBlueBtnText) ?>;
  --pink:<?= htmlspecialchars($themePink) ?>;
  --pink-dark:<?= htmlspecialchars($themePinkDark) ?>;
  --link:<?= htmlspecialchars($themeLink) ?>;
  --light-bg:<?= htmlspecialchars($themeLightBg) ?>;
  --text:<?= htmlspecialchars($themeText) ?>;
  --muted:<?= htmlspecialchars($themeMuted) ?>;
  --border:<?= htmlspecialchars($themeBorder) ?>;
  --shadow:0 22px 45px rgba(8,20,33,.16);
  --brand-font:'<?= htmlspecialchars($navBrandFont) ?>', 'Poppins', sans-serif;
}
</style>
<link href="./assets/css/index.css?v=<?= $indexCssVer ?>" rel="stylesheet">
</head>
<body>

<header class="nav">
  <div class="container nav-inner">
    <div class="brand">
      <div class="brand-logo">
        <?php if ($logoImage): ?>
          <img src="<?= htmlspecialchars(landing_asset($logoImage)) ?>" alt="logo">
        <?php else: ?>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2"><path d="M4 8a4 4 0 014-4h2M20 16a4 4 0 01-4 4h-2M8 4L5 7l3 3M16 20l3-3-3-3"/></svg>
        <?php endif; ?>
      </div>
      <span class="brand-title"><?= htmlspecialchars($brand) ?></span>
    </div>
    <nav class="nav-links">
      <a href="index.php#inicio">Inicio</a>
      <a href="index.php#a-lilly">A <?= htmlspecialchars($brand) ?></a>
      <a href="index.php#solucoes">Solucoes</a>
      <a href="index.php#franquias">Franquias</a>
      <a href="planos.php" class="active">Planos</a>
    </nav>
    <div class="nav-actions">
      <a class="nav-access" href="<?= htmlspecialchars($navCtaSecondaryLink) ?>"><?= htmlspecialchars($navCtaSecondaryText) ?></a>
      <button type="button" class="btn btn-pink" id="btnCadastreSe">Cadastre-se</button>
      <button class="menu-toggle" id="menuToggle" aria-label="Abrir menu">
        <svg class="icon-burger" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        <svg class="icon-close" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
      </button>
    </div>
    <div class="mobile-nav" id="mobileNav">
      <div class="mobile-nav-divider"></div>
      <div class="mobile-nav-actions">
        <button type="button" class="mobile-nav-btn mobile-nav-btn--pink" id="btnCadastreSeMobile">Cadastre-se</button>
        <a class="mobile-nav-btn mobile-nav-btn--gray" href="<?= htmlspecialchars($navCtaSecondaryLink) ?>"><?= htmlspecialchars($navCtaSecondaryText) ?> conta</a>
      </div>
      <div class="nav-links">
        <a href="index.php#inicio">Inicio</a>
        <a href="index.php#a-lilly">A <?= htmlspecialchars($brand) ?></a>
        <a href="index.php#solucoes">Solucoes</a>
        <a href="index.php#franquias">Franquias</a>
        <a href="planos.php">Planos</a>
      </div>
    </div>
    <div class="menu-backdrop" id="menuBackdrop"></div>
  </div>
</header>

<section class="planos-hero">
  <div class="container">
    <div class="planos-hero-card">
      <div class="planos-hero-copy">
        <div class="clube-badge">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8a4 4 0 014-4h2M20 16a4 4 0 01-4 4h-2M8 4L5 7l3 3M16 20l3-3-3-3"/></svg>
          <span><?= htmlspecialchars($planosClubeNome) ?></span>
        </div>
        <h1><?= nl2br(htmlspecialchars($planosHeroTitulo)) ?></h1>
        <p><?= htmlspecialchars($planosHeroSubtitulo) ?></p>
        <a class="btn btn-pink" href="<?= htmlspecialchars($planosHeroBotaoLink) ?>"><?= htmlspecialchars($planosHeroBotaoTexto) ?></a>
      </div>
      <div class="planos-hero-media">
        <?php if ($planosHeroImagem): ?>
          <img src="<?= htmlspecialchars(landing_asset($planosHeroImagem)) ?>" alt="<?= htmlspecialchars($planosClubeNome) ?>">
        <?php else: ?>
          <div class="planos-hero-placeholder">Envie a imagem no painel</div>
        <?php endif; ?>
      </div>
    </div>
  </div>
</section>

<section class="beneficios-section">
  <div class="container">
    <h2 class="beneficios-titulo reveal"><?= htmlspecialchars($planosBeneficiosTitulo) ?></h2>
    <div class="beneficios-grid">
      <?php foreach ($beneficios as $i => $b): ?>
        <div class="beneficio-card reveal reveal-delay-<?= ($i % 3) + 1 ?>">
          <div class="beneficio-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><?= planos_icon($b['icone']) ?></svg>
          </div>
          <h3><?= htmlspecialchars($b['titulo']) ?></h3>
          <p><?= htmlspecialchars($b['texto']) ?></p>
        </div>
      <?php endforeach; ?>
    </div>

    <div class="planos-cta-banner reveal">
      <div class="planos-cta-banner-text">
        <span class="clube-badge clube-badge--inline">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8a4 4 0 014-4h2M20 16a4 4 0 01-4 4h-2M8 4L5 7l3 3M16 20l3-3-3-3"/></svg>
          <?= htmlspecialchars($planosClubeNome) ?>
        </span>
        <span class="planos-cta-divider">|</span>
        <span><?= htmlspecialchars($planosCtaTexto) ?></span>
      </div>
      <a class="btn btn-pink" href="<?= htmlspecialchars($planosCtaBotaoLink) ?>"><?= htmlspecialchars($planosCtaBotaoTexto) ?></a>
    </div>
  </div>
</section>

<section class="planos-table-section" id="planos-tabela">
  <div class="container">
    <h2 class="planos-table-titulo reveal"><?= htmlspecialchars($planosTabelaTitulo) ?></h2>
    <div class="plan-highlights reveal">
      <?php foreach ($planosTabelaDestaques as $destaque): ?>
        <span class="plan-highlight">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
          <?= htmlspecialchars($destaque) ?>
        </span>
      <?php endforeach; ?>
    </div>
    <div class="plan-cards-grid">
      <?php foreach ($planos as $i => $plano): ?>
        <div class="plan-card reveal reveal-delay-<?= $i + 1 ?>" style="--plan-color:<?= htmlspecialchars($plano['cor']) ?>">
          <div class="plan-card-top">
            <div class="plan-card-name"><?= htmlspecialchars($plano['nome']) ?></div>
            <?php if ($plano['badge']): ?><span class="plan-badge"><?= htmlspecialchars($plano['badge']) ?></span><?php endif; ?>
          </div>
          <?php if ($plano['preco']): ?><div class="plan-preco"><?= htmlspecialchars($plano['preco']) ?></div><?php endif; ?>
          <p class="plan-desc"><?= htmlspecialchars($plano['descricao']) ?></p>
          <a class="plan-btn" href="<?= htmlspecialchars($plano['botao_link']) ?>">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12.04 2.01C6.53 2.01 2 6.54 2 12.05c0 1.86.52 3.66 1.5 5.22L2 22l4.84-1.27c1.5.82 3.19 1.26 4.93 1.26 5.51 0 10.04-4.53 10.04-10.04 0-5.51-4.53-9.94-10.04-9.94z"/></svg>
            <?= htmlspecialchars($plano['botao_texto']) ?>
          </a>
          <div class="plan-divider"></div>
          <div class="plan-includes">
            <?php if ($i === 0): ?>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              Este plano inclui:
            <?php else: ?>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              Tem tudo do <?= htmlspecialchars($planos[$i - 1]['nome']) ?> e mais:
            <?php endif; ?>
          </div>
          <ul class="plan-features">
            <?php foreach ($plano['features'] as $feature): ?>
              <li>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
                <?= htmlspecialchars($feature) ?>
              </li>
            <?php endforeach; ?>
          </ul>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<div class="lead-modal" id="especialistaModal" aria-hidden="true">
  <div class="lead-modal-card especialista-modal-card">
    <button type="button" class="lead-modal-close especialista-modal-close" id="especialistaClose" aria-label="Fechar">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6l-12 12"/></svg>
    </button>
    <form class="especialista-form" id="especialistaForm" autocomplete="off">
      <div class="lead-field">
        <label>Seu nome <span class="req">*</span></label>
        <input type="text" name="nome" required>
      </div>
      <div class="lead-field">
        <label>E-mail <span class="req">*</span></label>
        <input type="email" name="email" required>
      </div>
      <div class="lead-field">
        <label>Telefone <span class="req">*</span></label>
        <div class="phone-field">
          <span class="phone-prefix">BR <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 8l5 5 5-5"/></svg> +55</span>
          <input type="text" name="telefone" class="js-phone-mask" required inputmode="tel" autocomplete="tel">
        </div>
      </div>
      <div class="lead-field">
        <label>Nome da empresa <span class="req">*</span></label>
        <input type="text" name="empresa" required>
      </div>
      <div class="lead-field">
        <label>Qual seu faturamento mensal? <span class="req">*</span></label>
        <div class="lead-dropdown" data-name="faturamento">
          <button type="button" class="lead-drop-btn" aria-expanded="false">
            <span class="lead-drop-text">Selecionar</span>
            <span class="lead-drop-arrow"></span>
          </button>
          <input type="hidden" name="faturamento" value="Selecionar">
          <div class="lead-drop-menu">
            <?php foreach ($revOptions as $opt): ?>
              <button type="button" class="lead-drop-item" data-value="<?= htmlspecialchars($opt) ?>"><?= htmlspecialchars($opt) ?></button>
            <?php endforeach; ?>
          </div>
        </div>
      </div>
      <div class="lead-field">
        <label>Modelo de Negocio</label>
        <div class="lead-dropdown" data-name="modelo_negocio">
          <button type="button" class="lead-drop-btn" aria-expanded="false">
            <span class="lead-drop-text">Selecionar</span>
            <span class="lead-drop-arrow"></span>
          </button>
          <input type="hidden" name="modelo_negocio" value="Selecionar">
          <div class="lead-drop-menu">
            <?php foreach ($segOptions as $opt): ?>
              <button type="button" class="lead-drop-item" data-value="<?= htmlspecialchars($opt) ?>"><?= htmlspecialchars($opt) ?></button>
            <?php endforeach; ?>
          </div>
        </div>
      </div>
      <label class="lead-checkbox">
        <input type="checkbox" name="aceite_whatsapp" id="especialistaAceite" value="1">
        <span>Aceito receber contato no Whatsapp</span>
      </label>
      <div class="especialista-submit-wrap">
        <button class="btn btn-pink" type="submit">Enviar</button>
      </div>
      <div class="lead-msg" id="especialistaMsg"></div>
    </form>
  </div>
</div>

<div class="lead-modal" id="cadastroModal" aria-hidden="true">
  <div class="lead-modal-card cadastro-modal-card">
    <button type="button" class="lead-modal-close cadastro-modal-close" id="cadastroClose" aria-label="Fechar">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6l-12 12"/></svg>
    </button>
    <form class="cadastro-form" id="testeModal" autocomplete="off">
      <div class="lead-field">
        <label>Nome <span class="req">*</span></label>
        <input type="text" name="nome" required>
      </div>
      <div class="lead-field">
        <label>E-mail <span class="req">*</span></label>
        <input type="email" name="email" required>
      </div>
      <div class="lead-field">
        <label>WhatsApp <span class="req">*</span></label>
        <div class="phone-field">
          <span class="phone-prefix">BR +55</span>
          <input type="text" name="contato" class="js-phone-mask" required inputmode="tel" autocomplete="tel">
        </div>
      </div>
      <div class="lead-field">
        <label>Empresa <span class="req">*</span></label>
        <input type="text" name="empresa" required>
      </div>
      <div class="lead-row">
        <div class="lead-field">
          <label>Senha <span class="req">*</span></label>
          <input type="password" name="senha" required>
        </div>
        <div class="lead-field">
          <label>Repita a senha <span class="req">*</span></label>
          <input type="password" name="senha2" required>
        </div>
      </div>
      <div class="lead-row">
        <div class="lead-field">
          <label>CNPJ ou CPF <span class="req">*</span></label>
          <input type="text" name="cnpj" id="leadCnpjModal" class="js-cnpj-mask" placeholder="CNPJ ou CPF" required inputmode="numeric">
        </div>
        <div class="lead-field">
          <label>Endereco <span class="req">*</span></label>
          <button type="button" class="lead-address-btn" id="leadAddressBtnModal">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2"/></svg>
            Informar endereco
          </button>
        </div>
      </div>
      <div class="lead-field">
        <label>Faturamento mensal <span class="req">*</span></label>
        <div class="lead-dropdown" data-name="faturamento">
          <button type="button" class="lead-drop-btn" aria-expanded="false">
            <span class="lead-drop-text">Selecionar</span>
            <span class="lead-drop-arrow"></span>
          </button>
          <input type="hidden" name="faturamento" value="Selecionar">
          <div class="lead-drop-menu">
            <?php foreach ($revOptions as $opt): ?>
              <button type="button" class="lead-drop-item" data-value="<?= htmlspecialchars($opt) ?>"><?= htmlspecialchars($opt) ?></button>
            <?php endforeach; ?>
          </div>
        </div>
      </div>
      <div class="lead-field">
        <label>Qual o seu segmento</label>
        <div class="lead-dropdown" data-name="segmento">
          <button type="button" class="lead-drop-btn" aria-expanded="false">
            <span class="lead-drop-text">Selecionar</span>
            <span class="lead-drop-arrow"></span>
          </button>
          <input type="hidden" name="segmento" value="Selecionar">
          <div class="lead-drop-menu">
            <?php foreach ($segOptions as $opt): ?>
              <button type="button" class="lead-drop-item" data-value="<?= htmlspecialchars($opt) ?>"><?= htmlspecialchars($opt) ?></button>
            <?php endforeach; ?>
          </div>
        </div>
      </div>
      <label class="lead-checkbox">
        <input type="checkbox" id="leadAceiteModal" required>
        <span><?= htmlspecialchars($leadPrivacyText) ?></span>
      </label>
      <button class="btn btn-pink lead-submit" type="submit">CADASTRAR</button>
      <div class="lead-msg" id="leadMsgModal"></div>
    </form>
  </div>
</div>

<div class="lead-modal" id="leadAddressModalCadastro" aria-hidden="true">
  <div class="lead-modal-card">
    <div class="lead-modal-header">
      <div class="lead-modal-title">Endereco</div>
      <button type="button" class="lead-modal-close" id="leadAddressCloseCadastro" aria-label="Fechar">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6l-12 12"/></svg>
      </button>
    </div>
    <div class="lead-grid-inner">
      <div class="lead-field">
        <label>CEP</label>
        <input type="text" name="cep" id="leadCepModal" form="testeModal" placeholder="00000-000" inputmode="numeric">
      </div>
      <div class="lead-field">
        <label>Rua</label>
        <input type="text" name="rua" id="leadRuaModal" form="testeModal">
      </div>
      <div class="lead-field">
        <label>Numero</label>
        <input type="text" name="numero" id="leadNumeroModal" form="testeModal">
      </div>
      <div class="lead-field">
        <label>Bairro</label>
        <input type="text" name="bairro" id="leadBairroModal" form="testeModal">
      </div>
      <div class="lead-field">
        <label>Cidade</label>
        <input type="text" name="cidade" id="leadCidadeModal" form="testeModal">
      </div>
      <div class="lead-field">
        <label>Estado</label>
        <input type="text" name="estado" id="leadEstadoModal" form="testeModal" maxlength="2">
      </div>
      <div class="lead-field full">
        <label>Complemento</label>
        <input type="text" name="complemento" id="leadComplementoModal" form="testeModal">
      </div>
    </div>
    <div class="lead-modal-actions">
      <button type="button" class="btn btn-pink" id="leadAddressSaveCadastro">Salvar</button>
    </div>
  </div>
</div>

<footer class="footer">
  <div class="container footer-grid">
    <div class="footer-about">
      <div class="brand footer-brand">
        <div class="brand-logo">
          <?php if ($logoImage): ?>
            <img src="<?= htmlspecialchars(landing_asset($logoImage)) ?>" alt="logo">
          <?php else: ?>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2"><path d="M4 8a4 4 0 014-4h2M20 16a4 4 0 01-4 4h-2M8 4L5 7l3 3M16 20l3-3-3-3"/></svg>
          <?php endif; ?>
        </div>
        <span class="brand-title"><?= htmlspecialchars($brand) ?></span>
      </div>
      <div class="footer-contact">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/></svg>
        <a href="mailto:<?= htmlspecialchars($footerEmail) ?>"><?= htmlspecialchars($footerEmail) ?></a>
      </div>
      <div class="footer-contact">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.5 11.7A8.5 8.5 0 117.2 4.1a8.5 8.5 0 0113.3 7.6z"/></svg>
        <span><?= htmlspecialchars($footerTelefone) ?></span>
      </div>
      <?php if ($footerEndereco): ?>
      <div class="footer-contact">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z"/></svg>
        <span><?= htmlspecialchars($footerEndereco) ?></span>
      </div>
      <?php endif; ?>
    </div>
    <div class="footer-col">
      <h5><?= htmlspecialchars($footerMenuTitulo) ?></h5>
      <?php foreach ($footerMenuItens as $item): ?>
        <a href="<?= htmlspecialchars($item['url']) ?>"><?= htmlspecialchars($item['label']) ?></a>
      <?php endforeach; ?>
    </div>
    <div class="footer-col">
      <h5><?= htmlspecialchars($footerParaVoceTitulo) ?></h5>
      <?php foreach ($footerParaVoceItens as $item): ?>
        <a href="<?= htmlspecialchars($item['url']) ?>"><?= htmlspecialchars($item['label']) ?></a>
      <?php endforeach; ?>
    </div>
    <div class="footer-col">
      <h5>Acompanhe a <?= htmlspecialchars($brand) ?></h5>
      <div class="footer-social">
        <a href="<?= htmlspecialchars($footerSocialInstagram) ?>" aria-label="Instagram">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
        </a>
        <a href="<?= htmlspecialchars($footerSocialLinkedin) ?>" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 10v6M7 7v.01M12 16v-4a2 2 0 014 0v4M12 12v4"/></svg>
        </a>
        <a href="<?= htmlspecialchars($footerSocialYoutube) ?>" aria-label="YouTube">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M11 10l4 2-4 2v-4z"/></svg>
        </a>
      </div>
    </div>
  </div>
  <div class="footer-bottom container">
    Copyright &copy; <?= htmlspecialchars($brand) ?> <?= date('Y') ?> - Todos os direitos reservados
  </div>
</footer>

<button class="back-top" id="backTop" aria-label="Voltar ao topo">
  <svg viewBox="0 0 24 24"><path d="M12 5l-6 6M12 5l6 6"/><path d="M12 5v14"/></svg>
</button>

<a class="whatsapp-float" href="<?= htmlspecialchars($whatsLink) ?>" target="_blank" rel="noopener" aria-label="Fale conosco no WhatsApp">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12.04 2.01C6.53 2.01 2 6.54 2 12.05c0 1.86.52 3.66 1.5 5.22L2 22l4.84-1.27c1.5.82 3.19 1.26 4.93 1.26 5.51 0 10.04-4.53 10.04-10.04 0-5.51-4.53-9.94-10.04-9.94zm5.86 14.62c-.25.7-1.45 1.35-2 1.42-.53.06-1.2.09-1.94-.12-.45-.14-1.03-.34-1.77-.67-3.11-1.36-5.13-4.69-5.29-4.91-.16-.22-1.25-1.67-1.25-3.2 0-1.53.8-2.28 1.08-2.59.28-.31.61-.39.81-.39.2 0 .4 0 .58.01.19.01.44-.07.69.53.25.6.84 2.07.91 2.22.07.15.12.33.02.53-.1.2-.15.33-.3.51-.15.18-.32.4-.46.54-.15.15-.3.31-.13.61.17.3.76 1.24 1.63 2.01 1.12.99 2.06 1.3 2.35 1.45.3.15.47.12.64-.07.18-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.5.22.57.34.07.12.07.7-.18 1.4z"/>
  </svg>
</a>

<script src="./assets/js/index.js?v=<?= $indexJsVer ?>"></script>
</body>
</html>
