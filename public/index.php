<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/storage.php';

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
  return storage_url_relativa($path);
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

$navLinksItensRaw = landing_get($conn, 'nav_links_items', "Inicio|#inicio\nA {brand}|#a-lilly\nSolucoes|#solucoes\nFranquias|#franquias\nPlanos|planos.php");
$navLinksItens = footer_parse_links(str_replace('{brand}', $brand, $navLinksItensRaw));

/* ── Hero ── */
$heroBadge = landing_get($conn, 'hero_badge', 'Sistema completo de gestao');
$heroTitle = landing_get($conn, 'hero_title', 'O jeito mais facil de gerenciar o seu negocio');
$heroSubtitle = landing_get($conn, 'hero_subtitle', 'Controle financeiro, delivery proprio, mesas, balcao, estoque e muito mais em um unico sistema.');
$heroStat1 = landing_get($conn, 'hero_stat1', 'Sistema usado por centenas de lojas em todo o Brasil.');
$heroStat2 = landing_get($conn, 'hero_stat2', 'Pensado para delivery, restaurante e atendimento presencial.');
$heroStat3 = landing_get($conn, 'hero_stat3', 'Pensado para delivery, restaurante e atendimento presencial.');
$leadTitle = landing_get($conn, 'lead_title', 'Cadastre sua loja');
$leadNameLabel = landing_get($conn, 'lead_name_label', 'Seu nome');
$leadCompanyLabel = landing_get($conn, 'lead_company_label', 'Nome da empresa');
$leadEmailLabel = landing_get($conn, 'lead_email_label', 'E-mail');
$leadWhatsappLabel = landing_get($conn, 'lead_whatsapp_label', 'Telefone');
$leadRevenueLabel = landing_get($conn, 'lead_revenue_label', 'Qual seu faturamento mensal?');
$leadSegmentLabel = landing_get($conn, 'lead_segment_label', 'Modelo de negocio');
$leadRevenueOptions = landing_get($conn, 'lead_revenue_options', "Selecionar\nAte R\$ 10 mil\nDe R\$ 10 mil a R\$ 30 mil\nDe R\$ 30 mil a R\$ 100 mil\nAcima de R\$ 100 mil");
$leadSegmentOptions = landing_get($conn, 'lead_segment_options', "Selecionar\nRestaurante\nDelivery\nLanchonete\nPizzaria\nOutro");
$leadPrivacyText = landing_get($conn, 'lead_privacy_text', 'Aceito receber contato no WhatsApp.');
$leadButtonText = landing_get($conn, 'lead_button_text', 'Enviar');

$planosDisponiveis = [];
try {
  $stmtPlanos = $conn->query("SELECT id, nome, valor FROM planos WHERE ativo = 1 AND landing_slug IS NOT NULL ORDER BY id ASC");
  $planosDisponiveis = $stmtPlanos ? $stmtPlanos->fetchAll(PDO::FETCH_ASSOC) : [];
} catch (Exception $e) {
  $planosDisponiveis = [];
}

/* ── Solucoes (linhas alternadas) ── */
$solucoesTitulo = landing_get($conn, 'solucoes_titulo', 'Solucoes para a sua gestao');
$solucoesLinkTexto = landing_get($conn, 'solucoes_link_texto', 'Ver mais solucoes');
$solucoesLinkUrl = landing_get($conn, 'solucoes_link_url', '#solucoes');
$solucoesDefault = [
  ['titulo' => 'Sistema PDV', 'texto' => 'Sistema de PDV e mesas integrado em tempo real com o computador e celular. Controle de todos os pedidos de forma rapida e facil, aumentando a velocidade no preparo e a produtividade no atendimento.'],
  ['titulo' => 'Delivery proprio', 'texto' => 'Cardapio digital para os seus clientes e gestor de pedidos integrados com o sistema de gestao. Cashback, clube de pontos e pagamento online em um so lugar.'],
  ['titulo' => 'Gestao de clientes', 'texto' => 'Ferramentas para gestao dos seus clientes e criacao de campanhas inteligentes para voce vender mais.'],
  ['titulo' => 'Financeiro e caixa', 'texto' => 'Controle de caixa, fiado e relatorios financeiros completos, com visao clara de entradas, saidas e resultado do periodo.'],
  ['titulo' => 'Relatorios em tempo real', 'texto' => 'Acompanhe vendas, ticket medio, produtos mais vendidos e o desempenho da sua loja com relatorios atualizados a cada pedido.'],
];
$solucoesList = [];
foreach ($solucoesDefault as $i => $padrao) {
  $n = $i + 1;
  $solucoesList[] = [
    'titulo' => landing_get($conn, 'solucao' . $n . '_titulo', $padrao['titulo']),
    'texto' => landing_get($conn, 'solucao' . $n . '_texto', $padrao['texto']),
    'imagem' => landing_get($conn, 'solucao' . $n . '_imagem', ''),
  ];
}

/* ── Segmentos ── */
$segmentosTitulo = landing_get($conn, 'segmentos_titulo', 'Modelos de negocio que o {brand} fortalece');
$segmentosImagem = landing_get($conn, 'segmentos_imagem', '');
$segmentosItens = landing_get($conn, 'segmentos_items', "Restaurantes\nBares\nHamburgueria\nDocerias\nAcaiterias\nSorveterias\nCafeterias\nLanchonetes\nSaladerias\nFoodtrucks\nDark Kitchens\nDistribuidoras\nFranquias\nPizzaria");
$segmentosList = array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', (string) $segmentosItens))));
$segmentosTitulo = str_replace('{brand}', $brand, $segmentosTitulo);

/* ── CTA especialista ── */
$ctaTitle = landing_get($conn, 'cta_title', 'Fale com um especialista');
$ctaText = landing_get($conn, 'cta_text', 'Nosso especialista vai entrar em contato com voce para tirar suas duvidas e oferecer toda a atencao que voce merece.');
$ctaButtonLink = landing_get($conn, 'cta_button_link', '#contato');
$ctaItensDefault = [
  ['titulo' => 'Junte-se a nossa comunidade', 'texto' => 'Faca parte de uma rede de donos de negocio que se apoiam mutuamente.'],
  ['titulo' => '{brand} News: fique a frente no mercado', 'texto' => 'Receba atualizacoes sobre o mercado de alimentacao e delivery.'],
  ['titulo' => 'Conteudos exclusivos para voce', 'texto' => 'Materiais e dicas para vender mais e organizar a gestao do seu negocio.'],
];
$ctaItens = [];
foreach ($ctaItensDefault as $i => $padrao) {
  $n = $i + 1;
  $titulo = landing_get($conn, 'cta_item' . $n . '_titulo', $padrao['titulo']);
  $texto = landing_get($conn, 'cta_item' . $n . '_texto', $padrao['texto']);
  $ctaItens[] = ['titulo' => str_replace('{brand}', $brand, $titulo), 'texto' => $texto];
}

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
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= htmlspecialchars($brand) ?></title>
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
      <?php foreach ($navLinksItens as $item): ?>
        <a href="<?= htmlspecialchars($item['url']) ?>"><?= htmlspecialchars($item['label']) ?></a>
      <?php endforeach; ?>
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
        <?php foreach ($navLinksItens as $item): ?>
          <a href="<?= htmlspecialchars($item['url']) ?>"><?= htmlspecialchars($item['label']) ?></a>
        <?php endforeach; ?>
      </div>
    </div>
    <div class="menu-backdrop" id="menuBackdrop"></div>
  </div>
</header>

<section class="hero" id="inicio">
  <svg class="hero-network" style="top:-55px; left:-70px;" width="780" height="640" viewBox="0 0 440 360" fill="none">
    <defs>
      <radialGradient id="heroNodeGlowA" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#9C5523" stop-opacity=".16"/>
        <stop offset="100%" stop-color="#9C5523" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="150" cy="30" r="50" fill="url(#heroNodeGlowA)"/>
    <circle cx="220" cy="160" r="50" fill="url(#heroNodeGlowA)"/>
    <g stroke="#1f2328" stroke-opacity=".12" stroke-width="1.1">
      <line x1="30" y1="50" x2="150" y2="30"/>
      <line x1="150" y1="30" x2="260" y2="65"/>
      <line x1="30" y1="50" x2="95" y2="140"/>
      <line x1="150" y1="30" x2="95" y2="140"/>
      <line x1="95" y1="140" x2="220" y2="160"/>
      <line x1="260" y1="65" x2="220" y2="160"/>
      <line x1="260" y1="65" x2="345" y2="110"/>
      <line x1="220" y1="160" x2="345" y2="110"/>
      <line x1="95" y1="140" x2="135" y2="240"/>
      <line x1="220" y1="160" x2="305" y2="245"/>
      <line x1="135" y1="240" x2="305" y2="245"/>
      <line x1="30" y1="50" x2="45" y2="200"/>
      <line x1="45" y1="200" x2="135" y2="240"/>
      <line x1="345" y1="110" x2="395" y2="200"/>
      <line x1="305" y1="245" x2="395" y2="200"/>
    </g>
    <g fill="#1f2328" fill-opacity=".32">
      <circle cx="30" cy="50" r="3"/><circle cx="260" cy="65" r="3"/><circle cx="95" cy="140" r="3"/>
      <circle cx="345" cy="110" r="3"/><circle cx="135" cy="240" r="3"/><circle cx="305" cy="245" r="3"/>
      <circle cx="45" cy="200" r="3"/><circle cx="395" cy="200" r="3"/>
    </g>
    <g fill="#9C5523"><circle cx="150" cy="30" r="5.2"/><circle cx="220" cy="160" r="5.2"/></g>
  </svg>
  <svg class="hero-network" style="bottom:-55px; right:-70px; transform:scale(-1,-1);" width="780" height="640" viewBox="0 0 440 360" fill="none">
    <defs>
      <radialGradient id="heroNodeGlowB" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#9C5523" stop-opacity=".16"/>
        <stop offset="100%" stop-color="#9C5523" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="150" cy="30" r="50" fill="url(#heroNodeGlowB)"/>
    <circle cx="220" cy="160" r="50" fill="url(#heroNodeGlowB)"/>
    <g stroke="#1f2328" stroke-opacity=".12" stroke-width="1.1">
      <line x1="30" y1="50" x2="150" y2="30"/>
      <line x1="150" y1="30" x2="260" y2="65"/>
      <line x1="30" y1="50" x2="95" y2="140"/>
      <line x1="150" y1="30" x2="95" y2="140"/>
      <line x1="95" y1="140" x2="220" y2="160"/>
      <line x1="260" y1="65" x2="220" y2="160"/>
      <line x1="260" y1="65" x2="345" y2="110"/>
      <line x1="220" y1="160" x2="345" y2="110"/>
      <line x1="95" y1="140" x2="135" y2="240"/>
      <line x1="220" y1="160" x2="305" y2="245"/>
      <line x1="135" y1="240" x2="305" y2="245"/>
      <line x1="30" y1="50" x2="45" y2="200"/>
      <line x1="45" y1="200" x2="135" y2="240"/>
      <line x1="345" y1="110" x2="395" y2="200"/>
      <line x1="305" y1="245" x2="395" y2="200"/>
    </g>
    <g fill="#1f2328" fill-opacity=".32">
      <circle cx="30" cy="50" r="3"/><circle cx="260" cy="65" r="3"/><circle cx="95" cy="140" r="3"/>
      <circle cx="345" cy="110" r="3"/><circle cx="135" cy="240" r="3"/><circle cx="305" cy="245" r="3"/>
      <circle cx="45" cy="200" r="3"/><circle cx="395" cy="200" r="3"/>
    </g>
    <g fill="#9C5523"><circle cx="150" cy="30" r="5.2"/><circle cx="220" cy="160" r="5.2"/></g>
  </svg>
  <div class="container hero-grid">
    <div class="hero-copy">
      <div class="hero-tag">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18"/></svg>
        <?= htmlspecialchars($heroBadge) ?>
      </div>
      <h1><?= nl2br(htmlspecialchars($heroTitle)) ?></h1>
      <p><?= htmlspecialchars($heroSubtitle) ?></p>
      
      <div class="hero-points">
        <div class="hero-point">
          <span class="hero-point-check">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
          </span>
          <span><?= htmlspecialchars($heroStat1) ?></span>
        </div>
        <div class="hero-point">
          <span class="hero-point-check">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
          </span>
          <span><?= htmlspecialchars($heroStat2) ?></span>
        </div>
         <div class="hero-point">
          <span class="hero-point-check">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
          </span>
          <span><?= htmlspecialchars($heroStat3) ?></span>
        </div>
      </div>

    </div>
    <div class="lead-card-wrap">
    <div class="lead-card-glow"></div>
    <form class="lead-card" id="teste" autocomplete="off">
      <div class="lead-field">
        <label><?= htmlspecialchars($leadNameLabel) ?> <span class="req">*</span></label>
        <input type="text" name="nome" required>
      </div>
      <div class="lead-field">
        <label><?= htmlspecialchars($leadEmailLabel) ?> <span class="req">*</span></label>
        <input type="email" name="email" required>
      </div>
      <div class="lead-field">
        <label><?= htmlspecialchars($leadWhatsappLabel) ?> <span class="req">*</span></label>
        <div class="phone-field">
          <span class="phone-prefix">BR +55</span>
          <input type="text" name="contato" id="leadWhatsapp" required inputmode="tel" autocomplete="tel">
        </div>
      </div>
      <div class="lead-field">
        <label><?= htmlspecialchars($leadCompanyLabel) ?> <span class="req">*</span></label>
        <input type="text" name="empresa" required>
      </div>
      <div class="lead-field">
        <label>Escolha o seu plano <span class="req">*</span></label>
        <div class="lead-dropdown" data-name="plano">
          <button type="button" class="lead-drop-btn" aria-expanded="false">
            <span class="lead-drop-text">Selecionar</span>
            <span class="lead-drop-arrow"></span>
          </button>
          <input type="hidden" name="plano_id" value="">
          <div class="lead-drop-menu">
            <?php foreach ($planosDisponiveis as $p): ?>
              <button type="button" class="lead-drop-item" data-value="<?= (int) $p['id'] ?>"><?= htmlspecialchars($p['nome']) ?></button>
            <?php endforeach; ?>
          </div>
        </div>
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
          <input type="text" name="cnpj" id="leadCnpj" placeholder="CNPJ ou CPF" required inputmode="numeric">
        </div>
        <div class="lead-field">
          <label>Endereço <span class="req">*</span></label>
          <button type="button" class="lead-address-btn" id="leadAddressBtn">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2"/></svg>
            Informar endereço
          </button>
        </div>
      </div>
      <div class="lead-field">
        <label><?= htmlspecialchars($leadRevenueLabel) ?> <span class="req">*</span></label>
        <?php $revOptions = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', (string)$leadRevenueOptions)))); ?>
        <div class="lead-dropdown" data-name="faturamento">
          <button type="button" class="lead-drop-btn" aria-expanded="false">
            <span class="lead-drop-text"><?= htmlspecialchars($revOptions[0] ?? 'Selecionar') ?></span>
            <span class="lead-drop-arrow"></span>
          </button>
          <input type="hidden" name="faturamento" value="<?= htmlspecialchars($revOptions[0] ?? 'Selecionar') ?>">
          <div class="lead-drop-menu">
            <?php foreach ($revOptions as $opt): ?>
              <button type="button" class="lead-drop-item" data-value="<?= htmlspecialchars($opt) ?>"><?= htmlspecialchars($opt) ?></button>
            <?php endforeach; ?>
          </div>
        </div>
      </div>
      <div class="lead-field">
        <label><?= htmlspecialchars($leadSegmentLabel) ?></label>
        <?php $segOptions = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', (string)$leadSegmentOptions)))); ?>
        <div class="lead-dropdown" data-name="segmento">
          <button type="button" class="lead-drop-btn" aria-expanded="false">
            <span class="lead-drop-text"><?= htmlspecialchars($segOptions[0] ?? 'Selecionar') ?></span>
            <span class="lead-drop-arrow"></span>
          </button>
          <input type="hidden" name="segmento" value="<?= htmlspecialchars($segOptions[0] ?? 'Selecionar') ?>">
          <div class="lead-drop-menu">
            <?php foreach ($segOptions as $opt): ?>
              <button type="button" class="lead-drop-item" data-value="<?= htmlspecialchars($opt) ?>"><?= htmlspecialchars($opt) ?></button>
            <?php endforeach; ?>
          </div>
        </div>
      </div>
      <label class="lead-checkbox">
        <input type="checkbox" id="leadAceite" required>
        <span><?= htmlspecialchars($leadPrivacyText) ?></span>
      </label>
      <button class="btn btn-pink lead-submit" type="submit"><?= htmlspecialchars($leadButtonText) ?></button>
      <div class="lead-msg" id="leadMsg"></div>
    </form>
    </div>
  </div>
</section>

<div class="lead-modal" id="leadAddressModal" aria-hidden="true">
  <div class="lead-modal-card">
    <div class="lead-modal-header">
      <div class="lead-modal-title">Endereço</div>
      <button type="button" class="lead-modal-close" id="leadAddressClose" aria-label="Fechar">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6l-12 12"/></svg>
      </button>
    </div>
    <div class="lead-grid-inner">
      <div class="lead-field">
        <label>CEP</label>
        <input type="text" name="cep" id="leadCep" form="teste" placeholder="00000-000" inputmode="numeric">
      </div>
      <div class="lead-field">
        <label>Rua</label>
        <input type="text" name="rua" id="leadRua" form="teste">
      </div>
      <div class="lead-field">
        <label>Numero</label>
        <input type="text" name="numero" id="leadNumero" form="teste">
      </div>
      <div class="lead-field">
        <label>Bairro</label>
        <input type="text" name="bairro" id="leadBairro" form="teste">
      </div>
      <div class="lead-field">
        <label>Cidade</label>
        <input type="text" name="cidade" id="leadCidade" form="teste">
      </div>
      <div class="lead-field">
        <label>Estado</label>
        <input type="text" name="estado" id="leadEstado" form="teste" maxlength="2">
      </div>
      <div class="lead-field full">
        <label>Complemento</label>
        <input type="text" name="complemento" id="leadComplemento" form="teste">
      </div>
    </div>
    <div class="lead-modal-actions">
      <button type="button" class="btn btn-pink" id="leadAddressSave">Salvar</button>
    </div>
  </div>
</div>

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
      <div class="lead-field">
        <label>Escolha o seu plano <span class="req">*</span></label>
        <div class="lead-dropdown" data-name="plano">
          <button type="button" class="lead-drop-btn" aria-expanded="false">
            <span class="lead-drop-text">Selecionar</span>
            <span class="lead-drop-arrow"></span>
          </button>
          <input type="hidden" name="plano_id" value="">
          <div class="lead-drop-menu">
            <?php foreach ($planosDisponiveis as $p): ?>
              <button type="button" class="lead-drop-item" data-value="<?= (int) $p['id'] ?>"><?= htmlspecialchars($p['nome']) ?></button>
            <?php endforeach; ?>
          </div>
        </div>
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
          <label>Endereço <span class="req">*</span></label>
          <button type="button" class="lead-address-btn" id="leadAddressBtnModal">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2"/></svg>
            Informar endereço
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

<div class="lead-modal" id="cadastroSucessoModal" aria-hidden="true">
  <div class="lead-modal-card cadastro-sucesso-card">
    <div class="cadastro-sucesso-icon">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>
    </div>
    <h3 class="cadastro-sucesso-title">Cadastro realizado!</h3>
    <p class="cadastro-sucesso-text">
      Acabamos de enviar o acesso ao sistema para o e-mail cadastrado.
      Confira sua caixa de entrada (e o spam) para encontrar o link de acesso.
    </p>
    <button type="button" class="btn btn-pink cadastro-sucesso-btn" id="cadastroSucessoFechar">Entendi</button>
  </div>
</div>

<div class="lead-modal" id="leadAddressModalCadastro" aria-hidden="true">
  <div class="lead-modal-card">
    <div class="lead-modal-header">
      <div class="lead-modal-title">Endereço</div>
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

<section class="solucoes" id="solucoes">
  <div class="container">
    <h2 class="solucoes-title reveal"><?= htmlspecialchars($solucoesTitulo) ?></h2>
  </div>
  <?php foreach ($solucoesList as $i => $sol): ?>
    <div class="solucao-row<?= $i % 2 === 1 ? ' reverse' : '' ?>">
      <div class="solucao-media">
        <?php if (!empty($sol['imagem'])): ?>
          <img src="<?= htmlspecialchars(landing_asset($sol['imagem'])) ?>" alt="<?= htmlspecialchars($sol['titulo']) ?>">
        <?php else: ?>
          <div class="solucao-media-placeholder">Envie a imagem no painel</div>
        <?php endif; ?>
      </div>
      <div class="solucao-text reveal">
        <h3><?= htmlspecialchars($sol['titulo']) ?></h3>
        <p><?= nl2br(htmlspecialchars($sol['texto'])) ?></p>
        <a class="solucao-link" href="<?= htmlspecialchars($solucoesLinkUrl) ?>">
          <?= htmlspecialchars($solucoesLinkTexto) ?>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
      </div>
    </div>
  <?php endforeach; ?>
</section>

<section class="segmentos" id="segmentos">
  <div class="segmentos-media">
    <?php if ($segmentosImagem): ?>
      <img src="<?= htmlspecialchars(landing_asset($segmentosImagem)) ?>" alt="Segmentos">
    <?php else: ?>
      <div class="segmentos-media-placeholder">Envie a imagem no painel</div>
    <?php endif; ?>
    <div class="segmentos-overlay">
      <div class="container">
        <h2 class="reveal"><?= htmlspecialchars($segmentosTitulo) ?></h2>
      </div>
    </div>
  </div>
  <div class="container">
    <div class="segmentos-card reveal">
      <div class="segmentos-grid">
        <?php foreach ($segmentosList as $segmento): ?>
          <div class="segmento-item">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></svg>
            <span><?= htmlspecialchars($segmento) ?></span>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</section>

<section class="cta-especialista" id="contato">
  <div class="container">
    <div class="cta-card reveal">
      <h2><?= htmlspecialchars($ctaTitle) ?></h2>
      <p><?= htmlspecialchars($ctaText) ?></p>
      <div class="cta-items">
        <?php foreach ($ctaItens as $i => $item): ?>
          <?php if ($i > 0): ?><div class="cta-divider"></div><?php endif; ?>
          <div class="cta-item">
            <div class="cta-item-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c1.5-3.2 4.2-4.6 7-4.6s5.5 1.4 7 4.6"/></svg>
            </div>
            <div>
              <div class="cta-item-title"><?= htmlspecialchars($item['titulo']) ?></div>
              <div class="cta-item-text"><?= htmlspecialchars($item['texto']) ?></div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</section>

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
