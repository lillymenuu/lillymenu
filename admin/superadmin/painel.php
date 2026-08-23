
<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/gerenciamento_module.php';
require_once __DIR__ . '/helpers.php';

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo 'Acesso restrito.';
  exit;
}

gerenciamentoEnsureModule($conn);

function landingTableExists(PDO $conn): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE 'landing_config'");
    $stmt->execute();
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

function landingGet(PDO $conn, string $key, string $default = ''): string {
  static $cache = [];
  if (isset($cache[$key])) {
    return $cache[$key];
  }
  if (!landingTableExists($conn)) {
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

$landing = [
  'brand' => landingGet($conn, 'brand', 'Lilly Menu'),
  'nav_cta_primary_text' => landingGet($conn, 'nav_cta_primary_text', 'Falar com especialista'),
  'nav_cta_primary_link' => landingGet($conn, 'nav_cta_primary_link', '#contato'),
  'nav_cta_secondary_text' => landingGet($conn, 'nav_cta_secondary_text', 'Acessar'),
  'nav_cta_secondary_link' => landingGet($conn, 'nav_cta_secondary_link', '../admin/index.php'),
  'logo_image' => landingGet($conn, 'logo_image', ''),
  'nav_brand_font' => landingGet($conn, 'nav_brand_font', 'Poppins'),
  'nav_links_items' => landingGet($conn, 'nav_links_items', "Inicio|#inicio\nA {brand}|#a-lilly\nSolucoes|#solucoes\nFranquias|#franquias\nPlanos|planos.php"),

  'hero_badge' => landingGet($conn, 'hero_badge', 'Sistema completo de gestao'),
  'hero_title' => landingGet($conn, 'hero_title', 'O jeito mais facil de gerenciar o seu negocio'),
  'hero_subtitle' => landingGet($conn, 'hero_subtitle', 'Controle financeiro, delivery proprio, mesas, balcao, estoque e muito mais em um unico sistema.'),
  'hero_stat1' => landingGet($conn, 'hero_stat1', 'Sistema usado por centenas de lojas em todo o Brasil.'),
  'hero_stat2' => landingGet($conn, 'hero_stat2', 'Pensado para delivery, restaurante e atendimento presencial.'),
  'hero_stat3' => landingGet($conn, 'hero_stat3', 'Pensado para delivery, restaurante e atendimento presencial.'),
  'lead_title' => landingGet($conn, 'lead_title', 'Cadastre sua loja'),
  'lead_name_label' => landingGet($conn, 'lead_name_label', 'Seu nome'),
  'lead_company_label' => landingGet($conn, 'lead_company_label', 'Nome da empresa'),
  'lead_email_label' => landingGet($conn, 'lead_email_label', 'E-mail'),
  'lead_whatsapp_label' => landingGet($conn, 'lead_whatsapp_label', 'Telefone'),
  'lead_revenue_label' => landingGet($conn, 'lead_revenue_label', 'Qual seu faturamento mensal?'),
  'lead_segment_label' => landingGet($conn, 'lead_segment_label', 'Modelo de negocio'),
  'lead_revenue_options' => landingGet($conn, 'lead_revenue_options', "Selecionar\nAte R\$ 10 mil\nDe R\$ 10 mil a R\$ 30 mil\nDe R\$ 30 mil a R\$ 100 mil\nAcima de R\$ 100 mil"),
  'lead_segment_options' => landingGet($conn, 'lead_segment_options', "Selecionar\nRestaurante\nDelivery\nLanchonete\nPizzaria\nOutro"),
  'lead_privacy_text' => landingGet($conn, 'lead_privacy_text', 'Aceito receber contato no WhatsApp.'),
  'lead_button_text' => landingGet($conn, 'lead_button_text', 'Enviar'),

  'solucoes_titulo' => landingGet($conn, 'solucoes_titulo', 'Solucoes para a sua gestao'),
  'solucoes_link_texto' => landingGet($conn, 'solucoes_link_texto', 'Ver mais solucoes'),
  'solucoes_link_url' => landingGet($conn, 'solucoes_link_url', '#solucoes'),
  'solucao1_titulo' => landingGet($conn, 'solucao1_titulo', 'Sistema PDV'),
  'solucao1_texto' => landingGet($conn, 'solucao1_texto', 'Sistema de PDV e mesas integrado em tempo real com o computador e celular. Controle de todos os pedidos de forma rapida e facil, aumentando a velocidade no preparo e a produtividade no atendimento.'),
  'solucao1_imagem' => landingGet($conn, 'solucao1_imagem', ''),
  'solucao2_titulo' => landingGet($conn, 'solucao2_titulo', 'Delivery proprio'),
  'solucao2_texto' => landingGet($conn, 'solucao2_texto', 'Cardapio digital para os seus clientes e gestor de pedidos integrados com o sistema de gestao. Cashback, clube de pontos e pagamento online em um so lugar.'),
  'solucao2_imagem' => landingGet($conn, 'solucao2_imagem', ''),
  'solucao3_titulo' => landingGet($conn, 'solucao3_titulo', 'Gestao de clientes'),
  'solucao3_texto' => landingGet($conn, 'solucao3_texto', 'Ferramentas para gestao dos seus clientes e criacao de campanhas inteligentes para voce vender mais.'),
  'solucao3_imagem' => landingGet($conn, 'solucao3_imagem', ''),
  'solucao4_titulo' => landingGet($conn, 'solucao4_titulo', 'Financeiro e caixa'),
  'solucao4_texto' => landingGet($conn, 'solucao4_texto', 'Controle de caixa, fiado e relatorios financeiros completos, com visao clara de entradas, saidas e resultado do periodo.'),
  'solucao4_imagem' => landingGet($conn, 'solucao4_imagem', ''),
  'solucao5_titulo' => landingGet($conn, 'solucao5_titulo', 'Relatorios em tempo real'),
  'solucao5_texto' => landingGet($conn, 'solucao5_texto', 'Acompanhe vendas, ticket medio, produtos mais vendidos e o desempenho da sua loja com relatorios atualizados a cada pedido.'),
  'solucao5_imagem' => landingGet($conn, 'solucao5_imagem', ''),

  'segmentos_titulo' => landingGet($conn, 'segmentos_titulo', 'Modelos de negocio que o {brand} fortalece'),
  'segmentos_imagem' => landingGet($conn, 'segmentos_imagem', ''),
  'segmentos_items' => landingGet($conn, 'segmentos_items', "Restaurantes\nBares\nHamburgueria\nDocerias\nAcaiterias\nSorveterias\nCafeterias\nLanchonetes\nSaladerias\nFoodtrucks\nDark Kitchens\nDistribuidoras\nFranquias\nPizzaria"),

  'cta_title' => landingGet($conn, 'cta_title', 'Fale com um especialista'),
  'cta_text' => landingGet($conn, 'cta_text', 'Nosso especialista vai entrar em contato com voce para tirar suas duvidas e oferecer toda a atencao que voce merece.'),
  'cta_button_link' => landingGet($conn, 'cta_button_link', '#contato'),
  'cta_button_text' => landingGet($conn, 'cta_button_text', 'Falar agora'),
  'cta_item1_titulo' => landingGet($conn, 'cta_item1_titulo', 'Junte-se a nossa comunidade'),
  'cta_item1_texto' => landingGet($conn, 'cta_item1_texto', 'Faca parte de uma rede de donos de negocio que se apoiam mutuamente.'),
  'cta_item2_titulo' => landingGet($conn, 'cta_item2_titulo', '{brand} News: fique a frente no mercado'),
  'cta_item2_texto' => landingGet($conn, 'cta_item2_texto', 'Receba atualizacoes sobre o mercado de alimentacao e delivery.'),
  'cta_item3_titulo' => landingGet($conn, 'cta_item3_titulo', 'Conteudos exclusivos para voce'),
  'cta_item3_texto' => landingGet($conn, 'cta_item3_texto', 'Materiais e dicas para vender mais e organizar a gestao do seu negocio.'),

  'footer_email' => landingGet($conn, 'footer_email', ''),
  'footer_telefone' => landingGet($conn, 'footer_telefone', '(85) 98504-9577'),
  'footer_endereco' => landingGet($conn, 'footer_endereco', ''),
  'footer_social_instagram' => landingGet($conn, 'footer_social_instagram', '#'),
  'footer_social_linkedin' => landingGet($conn, 'footer_social_linkedin', '#'),
  'footer_social_youtube' => landingGet($conn, 'footer_social_youtube', '#'),
  'footer_menu_titulo' => landingGet($conn, 'footer_menu_titulo', 'Menu'),
  'footer_menu_items' => landingGet($conn, 'footer_menu_items', "Sobre nos|#a-lilly\nSolucoes|#solucoes\nFranquias|#franquias\nPlanos|planos.php"),
  'footer_para_voce_titulo' => landingGet($conn, 'footer_para_voce_titulo', 'Para voce'),
  'footer_para_voce_items' => landingGet($conn, 'footer_para_voce_items', "Blog|#\n{brand} Podcast|#\nDownload do App|#\nTermos de uso|#\nPolitica de privacidade|#\nTermos de Delivery|#\nTermos Clube de Cupons|#"),

  'whatsapp_number' => landingGet($conn, 'whatsapp_number', '5585985049577'),
  'whatsapp_message' => landingGet($conn, 'whatsapp_message', 'Ola! Quero conhecer o sistema.'),

  'theme_navy' => landingGet($conn, 'theme_navy', '#102a43'),
  'theme_navy_deep' => landingGet($conn, 'theme_navy_deep', '#081d30'),
  'theme_blue_soft' => landingGet($conn, 'theme_blue_soft', '#cfe9f7'),
  'theme_blue_soft_text' => landingGet($conn, 'theme_blue_soft_text', '#0f4c75'),
  'theme_blue_btn' => landingGet($conn, 'theme_blue_btn', '#6fb8e0'),
  'theme_blue_btn_text' => landingGet($conn, 'theme_blue_btn_text', '#0a2e44'),
  'theme_pink' => landingGet($conn, 'theme_pink', '#ec4899'),
  'theme_pink_dark' => landingGet($conn, 'theme_pink_dark', '#d6357f'),
  'theme_link' => landingGet($conn, 'theme_link', '#1f6fd6'),
  'theme_light_bg' => landingGet($conn, 'theme_light_bg', '#f4f6f8'),
  'theme_text' => landingGet($conn, 'theme_text', '#16263a'),
  'theme_muted' => landingGet($conn, 'theme_muted', '#5b6b7a'),
  'theme_border' => landingGet($conn, 'theme_border', '#e2e8ee'),

  'planos_clube_nome' => landingGet($conn, 'planos_clube_nome', 'Clube {brand}'),
  'planos_hero_titulo' => landingGet($conn, 'planos_hero_titulo', 'Um so plano, todos os beneficios.'),
  'planos_hero_subtitulo' => landingGet($conn, 'planos_hero_subtitulo', 'O sistema de gestao mais completo para o seu negocio, com economia e vantagens em um unico plano.'),
  'planos_hero_botao_texto' => landingGet($conn, 'planos_hero_botao_texto', 'Quero assinar'),
  'planos_hero_botao_link' => landingGet($conn, 'planos_hero_botao_link', '#planos-tabela'),
  'planos_hero_imagem' => landingGet($conn, 'planos_hero_imagem', ''),
  'planos_beneficios_titulo' => landingGet($conn, 'planos_beneficios_titulo', 'Confira os beneficios do {clube}'),
  'planos_beneficio1_icone' => landingGet($conn, 'planos_beneficio1_icone', 'user'),
  'planos_beneficio1_titulo' => landingGet($conn, 'planos_beneficio1_titulo', 'Sistema completo'),
  'planos_beneficio1_texto' => landingGet($conn, 'planos_beneficio1_texto', 'Venda em mesas, balcao e delivery com integracoes, emissao fiscal, relatorios e muito mais. Um sistema completo por um preco acessivel.'),
  'planos_beneficio2_icone' => landingGet($conn, 'planos_beneficio2_icone', 'cashback'),
  'planos_beneficio2_titulo' => landingGet($conn, 'planos_beneficio2_titulo', 'Pontos e cashback'),
  'planos_beneficio2_texto' => landingGet($conn, 'planos_beneficio2_texto', 'Seus clientes acumulam pontos e resgatam cashback em poucos meses. Use os creditos em mensalidades ou repasse beneficios para o seu publico.'),
  'planos_beneficio3_icone' => landingGet($conn, 'planos_beneficio3_icone', 'laptop'),
  'planos_beneficio3_titulo' => landingGet($conn, 'planos_beneficio3_titulo', 'Todos os modulos'),
  'planos_beneficio3_texto' => landingGet($conn, 'planos_beneficio3_texto', 'Economize em comparacao a contratar modulos extras separados: garcom digital, KDS, integracao com WhatsApp e muito mais incluso.'),
  'planos_beneficio4_icone' => landingGet($conn, 'planos_beneficio4_icone', 'dollar'),
  'planos_beneficio4_titulo' => landingGet($conn, 'planos_beneficio4_titulo', 'Clube de Cupons'),
  'planos_beneficio4_texto' => landingGet($conn, 'planos_beneficio4_texto', 'Seus clientes podem comprar pacotes de cupons de desconto na sua loja, com parte do valor subsidiado pela plataforma.'),
  'planos_beneficio5_icone' => landingGet($conn, 'planos_beneficio5_icone', 'dollar'),
  'planos_beneficio5_titulo' => landingGet($conn, 'planos_beneficio5_titulo', 'Descontos exclusivos'),
  'planos_beneficio5_texto' => landingGet($conn, 'planos_beneficio5_texto', 'Tenha acesso a taxas exclusivas no Pix integrado ao sistema.'),
  'planos_beneficio6_icone' => landingGet($conn, 'planos_beneficio6_icone', 'gift'),
  'planos_beneficio6_titulo' => landingGet($conn, 'planos_beneficio6_titulo', 'Gerente dedicado'),
  'planos_beneficio6_texto' => landingGet($conn, 'planos_beneficio6_texto', 'Conte com um especialista dedicado ao seu negocio e suporte disponivel 24 horas, todos os dias da semana.'),
  'planos_cta_texto' => landingGet($conn, 'planos_cta_texto', 'Um so plano, todos os beneficios. Feito para o seu negocio!'),
  'planos_cta_botao_texto' => landingGet($conn, 'planos_cta_botao_texto', 'Quero assinar'),
  'planos_cta_botao_link' => landingGet($conn, 'planos_cta_botao_link', '#planos-tabela'),
  'planos_tabela_titulo' => landingGet($conn, 'planos_tabela_titulo', 'Conheca tambem nossos outros planos'),
  'planos_tabela_destaques' => landingGet($conn, 'planos_tabela_destaques', "Suporte 24h\nSem multa de cancelamento\nUse em qualquer dispositivo\nSem custo de instalacao"),
  'plano1_nome' => landingGet($conn, 'plano1_nome', 'Basico'),
  'plano1_cor' => landingGet($conn, 'plano1_cor', '#facc15'),
  'plano1_badge' => landingGet($conn, 'plano1_badge', ''),
  'plano1_preco' => landingGet($conn, 'plano1_preco', ''),
  'plano1_ativo' => landingGet($conn, 'plano1_ativo', '1'),
  'plano1_descricao' => landingGet($conn, 'plano1_descricao', 'Ideal para quem trabalha apenas com delivery e nao quer depender somente de marketplaces.'),
  'plano1_botao_texto' => landingGet($conn, 'plano1_botao_texto', 'Falar com especialista'),
  'plano1_botao_link' => landingGet($conn, 'plano1_botao_link', '#contato'),
  'plano1_features' => landingGet($conn, 'plano1_features', "Suporte 24h\nGestor de pedidos\nPrograma de Fidelidade\nCardapio Digital\nIntegracao com iFood\nPagamento online"),
  'plano2_nome' => landingGet($conn, 'plano2_nome', 'Essencial'),
  'plano2_cor' => landingGet($conn, 'plano2_cor', '#3b82f6'),
  'plano2_badge' => landingGet($conn, 'plano2_badge', 'Popular'),
  'plano2_preco' => landingGet($conn, 'plano2_preco', ''),
  'plano2_ativo' => landingGet($conn, 'plano2_ativo', '1'),
  'plano2_descricao' => landingGet($conn, 'plano2_descricao', 'Para quem atende presencialmente - em mesas, balcao ou delivery - e precisa de mais controle sobre a operacao.'),
  'plano2_botao_texto' => landingGet($conn, 'plano2_botao_texto', 'Falar com especialista'),
  'plano2_botao_link' => landingGet($conn, 'plano2_botao_link', '#contato'),
  'plano2_features' => landingGet($conn, 'plano2_features', "PDV + Balcao e Mesas\nControle de Estoque\nFicha tecnica\nControle financeiro\nApp para garcom\nQR Code na mesa\nDashboard com relatorios"),
  'plano3_nome' => landingGet($conn, 'plano3_nome', 'Completo'),
  'plano3_cor' => landingGet($conn, 'plano3_cor', '#22c55e'),
  'plano3_badge' => landingGet($conn, 'plano3_badge', 'Recomendado'),
  'plano3_preco' => landingGet($conn, 'plano3_preco', ''),
  'plano3_ativo' => landingGet($conn, 'plano3_ativo', '1'),
  'plano3_descricao' => landingGet($conn, 'plano3_descricao', 'Para atender seu negocio em todas as frentes, do salao ao financeiro, com gestao completa.'),
  'plano3_botao_texto' => landingGet($conn, 'plano3_botao_texto', 'Falar com especialista'),
  'plano3_botao_link' => landingGet($conn, 'plano3_botao_link', '#contato'),
  'plano3_features' => landingGet($conn, 'plano3_features', "Fiscal\nIntegracao com contabilidade\nNFC-e/CF-e ilimitada\nConciliacao de pagamentos\nNFC-e/NF-e ilimitadas\nNota de devolucao\nInventario"),
  'plano4_nome' => landingGet($conn, 'plano4_nome', 'Premium'),
  'plano4_cor' => landingGet($conn, 'plano4_cor', '#a855f7'),
  'plano4_badge' => landingGet($conn, 'plano4_badge', ''),
  'plano4_preco' => landingGet($conn, 'plano4_preco', ''),
  'plano4_ativo' => landingGet($conn, 'plano4_ativo', '1'),
  'plano4_descricao' => landingGet($conn, 'plano4_descricao', 'Um plano sob medida para sua empresa, com recomendacao de automacoes e integracoes extras.'),
  'plano4_botao_texto' => landingGet($conn, 'plano4_botao_texto', 'Falar com especialista'),
  'plano4_botao_link' => landingGet($conn, 'plano4_botao_link', '#contato'),
  'plano4_features' => landingGet($conn, 'plano4_features', "Sistema KDS\nGarcom digital\nGerente de sucesso dedicado"),
];

$notificacoes = superadminNotificacoes($conn);
$notifCount = count($notificacoes);
$paginaAtual = 'Painel';
$chromeCssVer = filemtime(__DIR__ . '/assets/css/chrome.css');
$painelCssVer = filemtime(__DIR__ . '/assets/css/painel.css');
$chromeJsVer = filemtime(__DIR__ . '/assets/js/chrome.js');
$painelJsVer = filemtime(__DIR__ . '/assets/js/painel.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Painel - Gerenciar lojas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="shortcut icon" href="../assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="../assets/img/favicon_store.png">

<link href="assets/css/chrome.css?v=<?= $chromeCssVer ?>" rel="stylesheet">
<link href="assets/css/painel.css?v=<?= $painelCssVer ?>" rel="stylesheet">
</head>
<body class="sidenav-dark">
<div class="layout">
<?php require __DIR__ . '/partials/sidebar.php'; ?>
  <main class="main">
<?php require __DIR__ . '/partials/header.php'; ?>

    <div id="landingView">
      <section class="card landing-panel" id="landingPanel">
      <div class="landing-panel-head">
        <div>
          <h3>Landing page</h3>
          <p>Atualize os textos, imagens e o tema da pagina principal (public/index.php).</p>
        </div>
        <a class="action-btn ghost" href="../../public/index.php" target="_blank" rel="noopener">Visualizar</a>
      </div>
      <div class="landing-panel-body">
      <form id="landingForm" enctype="multipart/form-data">
        <div class="landing-tabs">
          <button type="button" class="landing-tab-btn active" data-tab="landing">Identidade</button>
          <button type="button" class="landing-tab-btn" data-tab="navbar">Navbar</button>
          <button type="button" class="landing-tab-btn" data-tab="tema">Tema da landing</button>
          <button type="button" class="landing-tab-btn" data-tab="hero">Hero principal</button>
          <button type="button" class="landing-tab-btn" data-tab="form">Formulario do hero</button>
          <button type="button" class="landing-tab-btn" data-tab="solucoes">Solucoes</button>
          <button type="button" class="landing-tab-btn" data-tab="segmentos">Segmentos</button>
          <button type="button" class="landing-tab-btn" data-tab="contato">Contato e CTA</button>
          <button type="button" class="landing-tab-btn" data-tab="rodape">Rodape</button>
          <button type="button" class="landing-tab-btn" data-tab="planos">Planos</button>
          <button type="button" class="landing-tab-btn" data-tab="imagens">Imagens</button>
        </div>
        <div class="landing-grid">
          <div class="landing-col">
            <div class="landing-section landing-tab-section" data-tab="landing">
              <h4>Identidade e navegacao</h4>
              <div class="form-grid">
                <div>
                  <label class="form-label">Nome da marca</label>
                  <input class="form-control" type="text" name="brand" value="<?= htmlspecialchars($landing['brand']) ?>" required>
                </div>
                <div>
                  <label class="form-label">Badge do hero</label>
                  <input class="form-control" type="text" name="hero_badge" value="<?= htmlspecialchars($landing['hero_badge']) ?>">
                </div>
              </div>
              <div class="form-grid" style="margin-top:10px">
                <div>
                  <label class="form-label">Botao principal (Falar com especialista)</label>
                  <input class="form-control" type="text" name="nav_cta_primary_text" value="<?= htmlspecialchars($landing['nav_cta_primary_text']) ?>">
                </div>
                <div>
                  <label class="form-label">Link botao principal</label>
                  <input class="form-control" type="text" name="nav_cta_primary_link" value="<?= htmlspecialchars($landing['nav_cta_primary_link']) ?>">
                </div>
                <div>
                  <label class="form-label">Botao secundario (Acessar)</label>
                  <input class="form-control" type="text" name="nav_cta_secondary_text" value="<?= htmlspecialchars($landing['nav_cta_secondary_text']) ?>">
                </div>
                <div>
                  <label class="form-label">Link botao secundario</label>
                  <input class="form-control" type="text" name="nav_cta_secondary_link" value="<?= htmlspecialchars($landing['nav_cta_secondary_link']) ?>">
                </div>
              </div>
            </div>

            <div class="landing-section landing-tab-section" data-tab="navbar">
              <h4>Navbar de public/index.php</h4>
              <div class="form-grid">
                <div>
                  <label class="form-label">Fonte do titulo do sistema</label>
                  <select class="form-control" name="nav_brand_font">
                    <?php foreach (['Poppins', 'Inter', 'Montserrat', 'Raleway', 'Playfair Display', 'Quicksand', 'Pacifico', 'Oswald'] as $fontOpt): ?>
                      <option value="<?= htmlspecialchars($fontOpt) ?>" <?= $landing['nav_brand_font'] === $fontOpt ? 'selected' : '' ?>><?= htmlspecialchars($fontOpt) ?></option>
                    <?php endforeach; ?>
                  </select>
                </div>
              </div>
              <div class="form-grid" style="margin-top:10px">
                <div style="grid-column:1 / -1">
                  <label class="form-label">Links do menu (um por linha, formato: Texto|URL - use {brand} para o nome da marca)</label>
                  <textarea class="form-control" name="nav_links_items" rows="6" placeholder="Inicio|#inicio"><?= htmlspecialchars($landing['nav_links_items']) ?></textarea>
                </div>
              </div>
              <div class="form-help">Esses links aparecem no menu de navegacao (desktop e mobile) de public/index.php. Para ancoras da propria pagina use # seguido do id da secao (ex: #solucoes); para outras paginas use o nome do arquivo (ex: planos.php).</div>
            </div>

            <div class="landing-section landing-tab-section" data-tab="tema">
              <h4>Tema da landing</h4>
              <div class="preset-row">
                <button type="button" class="preset-btn" data-preset="minimalista"><span class="preset-dot" style="background:#9C5523;border:1px solid #e2ddd5"></span>Minimalista (Branco &amp; Marrom)</button>
              </div>
              <div class="theme-config-grid" id="themeConfigFields">
                <div>
                  <div class="form-grid">
                    <div>
                      <label class="form-label">Navbar (navy)</label>
                      <input class="form-control" type="color" name="theme_navy" value="<?= htmlspecialchars($landing['theme_navy']) ?>">
                    </div>
                    <div>
                      <label class="form-label">Navbar mobile (navy escuro)</label>
                      <input class="form-control" type="color" name="theme_navy_deep" value="<?= htmlspecialchars($landing['theme_navy_deep']) ?>">
                    </div>
                    <div>
                      <label class="form-label">Pill azul claro</label>
                      <input class="form-control" type="color" name="theme_blue_soft" value="<?= htmlspecialchars($landing['theme_blue_soft']) ?>">
                    </div>
                    <div>
                      <label class="form-label">Texto sobre pill azul claro</label>
                      <input class="form-control" type="color" name="theme_blue_soft_text" value="<?= htmlspecialchars($landing['theme_blue_soft_text']) ?>">
                    </div>
                    <div>
                      <label class="form-label">Botao azul (Falar com especialista)</label>
                      <input class="form-control" type="color" name="theme_blue_btn" value="<?= htmlspecialchars($landing['theme_blue_btn']) ?>">
                    </div>
                    <div>
                      <label class="form-label">Texto sobre botao azul</label>
                      <input class="form-control" type="color" name="theme_blue_btn_text" value="<?= htmlspecialchars($landing['theme_blue_btn_text']) ?>">
                    </div>
                    <div>
                      <label class="form-label">Rosa (Cadastre-se / destaque)</label>
                      <input class="form-control" type="color" name="theme_pink" value="<?= htmlspecialchars($landing['theme_pink']) ?>">
                    </div>
                    <div>
                      <label class="form-label">Rosa escuro (hover)</label>
                      <input class="form-control" type="color" name="theme_pink_dark" value="<?= htmlspecialchars($landing['theme_pink_dark']) ?>">
                    </div>
                    <div>
                      <label class="form-label">Cor dos links</label>
                      <input class="form-control" type="color" name="theme_link" value="<?= htmlspecialchars($landing['theme_link']) ?>">
                    </div>
                    <div>
                      <label class="form-label">Fundo secoes claras</label>
                      <input class="form-control" type="color" name="theme_light_bg" value="<?= htmlspecialchars($landing['theme_light_bg']) ?>">
                    </div>
                    <div>
                      <label class="form-label">Texto principal</label>
                      <input class="form-control" type="color" name="theme_text" value="<?= htmlspecialchars($landing['theme_text']) ?>">
                    </div>
                    <div>
                      <label class="form-label">Texto suave (muted)</label>
                      <input class="form-control" type="color" name="theme_muted" value="<?= htmlspecialchars($landing['theme_muted']) ?>">
                    </div>
                    <div>
                      <label class="form-label">Bordas</label>
                      <input class="form-control" type="color" name="theme_border" value="<?= htmlspecialchars($landing['theme_border']) ?>">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="landing-section landing-tab-section" data-tab="hero">
              <h4>Hero principal</h4>
              <div class="form-grid">
                <div>
                  <label class="form-label">Titulo</label>
                  <input class="form-control" type="text" name="hero_title" value="<?= htmlspecialchars($landing['hero_title']) ?>" required>
                </div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Subtitulo</label>
                  <textarea class="form-control" name="hero_subtitle" rows="4" required><?= htmlspecialchars($landing['hero_subtitle']) ?></textarea>
                </div>
                <div>
                  <label class="form-label">Destaque 1 (com check)</label>
                  <input class="form-control" type="text" name="hero_stat1" value="<?= htmlspecialchars($landing['hero_stat1']) ?>">
                </div>
                <div>
                  <label class="form-label">Destaque 2 (com check)</label>
                  <input class="form-control" type="text" name="hero_stat2" value="<?= htmlspecialchars($landing['hero_stat2']) ?>">
                </div>
                <div>
                  <label class="form-label">Destaque 3 (com check)</label>
                  <input class="form-control" type="text" name="hero_stat3" value="<?= htmlspecialchars($landing['hero_stat3']) ?>">
                </div>
              </div>
            </div>

            <div class="landing-section landing-tab-section" data-tab="form">
              <h4>Formulario do hero (Cadastre-se)</h4>
              <div class="form-grid">
                <div>
                  <label class="form-label">Titulo do formulario</label>
                  <input class="form-control" type="text" name="lead_title" value="<?= htmlspecialchars($landing['lead_title']) ?>" required>
                </div>
                <div>
                  <label class="form-label">Label Nome</label>
                  <input class="form-control" type="text" name="lead_name_label" value="<?= htmlspecialchars($landing['lead_name_label']) ?>">
                </div>
                <div>
                  <label class="form-label">Label Empresa</label>
                  <input class="form-control" type="text" name="lead_company_label" value="<?= htmlspecialchars($landing['lead_company_label']) ?>">
                </div>
                <div>
                  <label class="form-label">Label E-mail</label>
                  <input class="form-control" type="text" name="lead_email_label" value="<?= htmlspecialchars($landing['lead_email_label']) ?>">
                </div>
                <div>
                  <label class="form-label">Label WhatsApp</label>
                  <input class="form-control" type="text" name="lead_whatsapp_label" value="<?= htmlspecialchars($landing['lead_whatsapp_label']) ?>">
                </div>
                <div>
                  <label class="form-label">Label Faturamento mensal</label>
                  <input class="form-control" type="text" name="lead_revenue_label" value="<?= htmlspecialchars($landing['lead_revenue_label']) ?>">
                </div>
                <div>
                  <label class="form-label">Label Segmento</label>
                  <input class="form-control" type="text" name="lead_segment_label" value="<?= htmlspecialchars($landing['lead_segment_label']) ?>">
                </div>
                <div>
                  <label class="form-label">Texto do botao</label>
                  <input class="form-control" type="text" name="lead_button_text" value="<?= htmlspecialchars($landing['lead_button_text']) ?>" required>
                </div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Opcoes de faturamento (uma por linha)</label>
                  <textarea class="form-control" name="lead_revenue_options" rows="3"><?= htmlspecialchars($landing['lead_revenue_options']) ?></textarea>
                </div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Opcoes de segmento (uma por linha)</label>
                  <textarea class="form-control" name="lead_segment_options" rows="3"><?= htmlspecialchars($landing['lead_segment_options']) ?></textarea>
                </div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Texto de privacidade</label>
                  <textarea class="form-control" name="lead_privacy_text" rows="2"><?= htmlspecialchars($landing['lead_privacy_text']) ?></textarea>
                </div>
              </div>
            </div>

            <div class="landing-section landing-tab-section" data-tab="solucoes">
              <h4>Secao Solucoes</h4>
              <div class="form-grid">
                <div>
                  <label class="form-label">Titulo da secao</label>
                  <input class="form-control" type="text" name="solucoes_titulo" value="<?= htmlspecialchars($landing['solucoes_titulo']) ?>">
                </div>
                <div>
                  <label class="form-label">Texto do link</label>
                  <input class="form-control" type="text" name="solucoes_link_texto" value="<?= htmlspecialchars($landing['solucoes_link_texto']) ?>">
                </div>
                <div>
                  <label class="form-label">Link</label>
                  <input class="form-control" type="text" name="solucoes_link_url" value="<?= htmlspecialchars($landing['solucoes_link_url']) ?>">
                </div>
              </div>
              <?php for ($n = 1; $n <= 5; $n++): ?>
                <div class="form-grid" style="margin-top:14px">
                  <div style="grid-column:1 / -1;font-weight:600;color:#0f172a">Modulo <?= $n ?></div>
                  <div>
                    <label class="form-label">Titulo</label>
                    <input class="form-control" type="text" name="solucao<?= $n ?>_titulo" value="<?= htmlspecialchars($landing['solucao' . $n . '_titulo']) ?>">
                  </div>
                  <div style="grid-column:1 / -1">
                    <label class="form-label">Texto</label>
                    <textarea class="form-control" name="solucao<?= $n ?>_texto" rows="2"><?= htmlspecialchars($landing['solucao' . $n . '_texto']) ?></textarea>
                  </div>
                </div>
              <?php endfor; ?>
              <div class="form-help">As imagens de cada modulo ficam na aba Imagens.</div>
            </div>

            <div class="landing-section landing-tab-section" data-tab="segmentos">
              <h4>Secao Segmentos</h4>
              <div class="form-grid">
                <div style="grid-column:1 / -1">
                  <label class="form-label">Titulo (use {brand} para o nome da marca)</label>
                  <input class="form-control" type="text" name="segmentos_titulo" value="<?= htmlspecialchars($landing['segmentos_titulo']) ?>">
                </div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Itens (um por linha)</label>
                  <textarea class="form-control" name="segmentos_items" rows="8"><?= htmlspecialchars($landing['segmentos_items']) ?></textarea>
                </div>
              </div>
              <div class="form-help">A imagem de fundo da secao fica na aba Imagens.</div>
            </div>

            <div class="landing-section landing-tab-section" data-tab="contato">
              <h4>Contato e CTA</h4>
              <div class="form-grid">
                <div>
                  <label class="form-label">Titulo do CTA final</label>
                  <input class="form-control" type="text" name="cta_title" value="<?= htmlspecialchars($landing['cta_title']) ?>">
                </div>
                <div>
                  <label class="form-label">Texto do botao do CTA</label>
                  <input class="form-control" type="text" name="cta_button_text" value="<?= htmlspecialchars($landing['cta_button_text']) ?>">
                </div>
                <div>
                  <label class="form-label">Link do botao do CTA</label>
                  <input class="form-control" type="text" name="cta_button_link" value="<?= htmlspecialchars($landing['cta_button_link']) ?>">
                </div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Texto do CTA final</label>
                  <textarea class="form-control" name="cta_text" rows="3"><?= htmlspecialchars($landing['cta_text']) ?></textarea>
                </div>
              </div>
              <?php for ($n = 1; $n <= 3; $n++): ?>
                <div class="form-grid" style="margin-top:10px">
                  <div>
                    <label class="form-label">Item <?= $n ?> - titulo (use {brand} se quiser)</label>
                    <input class="form-control" type="text" name="cta_item<?= $n ?>_titulo" value="<?= htmlspecialchars($landing['cta_item' . $n . '_titulo']) ?>">
                  </div>
                  <div>
                    <label class="form-label">Item <?= $n ?> - texto</label>
                    <input class="form-control" type="text" name="cta_item<?= $n ?>_texto" value="<?= htmlspecialchars($landing['cta_item' . $n . '_texto']) ?>">
                  </div>
                </div>
              <?php endfor; ?>

              <div class="form-grid" style="margin-top:14px">
                <div style="grid-column:1 / -1;font-weight:600;color:#0f172a">WhatsApp flutuante</div>
                <div>
                  <label class="form-label">WhatsApp (com DDI)</label>
                  <input class="form-control" type="text" name="whatsapp_number" inputmode="numeric" placeholder="5585985049577" value="<?= htmlspecialchars($landing['whatsapp_number']) ?>">
                </div>
                <div>
                  <label class="form-label">Mensagem padrao</label>
                  <textarea class="form-control" name="whatsapp_message" rows="2"><?= htmlspecialchars($landing['whatsapp_message']) ?></textarea>
                </div>
              </div>

              <div class="form-help">Use o numero de WhatsApp no formato 5585985049577.</div>
            </div>

            <div class="landing-section landing-tab-section" data-tab="rodape">
              <h4>Rodape</h4>
              <div class="form-grid">
                <div style="grid-column:1 / -1;font-weight:600;color:#0f172a">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:6px"><path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/></svg>
                  Contato
                </div>
                <div>
                  <label class="form-label">E-mail de contato</label>
                  <input class="form-control" type="email" name="footer_email" value="<?= htmlspecialchars($landing['footer_email']) ?>">
                </div>
                <div>
                  <label class="form-label">Telefone</label>
                  <input class="form-control" type="text" name="footer_telefone" value="<?= htmlspecialchars($landing['footer_telefone']) ?>">
                </div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Endereco</label>
                  <input class="form-control" type="text" name="footer_endereco" value="<?= htmlspecialchars($landing['footer_endereco']) ?>">
                </div>
              </div>

              <div class="form-grid" style="margin-top:14px">
                <div style="grid-column:1 / -1;font-weight:600;color:#0f172a">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:6px"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
                  Redes sociais
                </div>
                <div>
                  <label class="form-label">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
                    Instagram (link)
                  </label>
                  <input class="form-control" type="text" name="footer_social_instagram" value="<?= htmlspecialchars($landing['footer_social_instagram']) ?>">
                </div>
                <div>
                  <label class="form-label">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 10v6M7 7v.01M12 16v-4a2 2 0 014 0v4M12 12v4"/></svg>
                    LinkedIn (link)
                  </label>
                  <input class="form-control" type="text" name="footer_social_linkedin" value="<?= htmlspecialchars($landing['footer_social_linkedin']) ?>">
                </div>
                <div>
                  <label class="form-label">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M11 10l4 2-4 2v-4z"/></svg>
                    YouTube (link)
                  </label>
                  <input class="form-control" type="text" name="footer_social_youtube" value="<?= htmlspecialchars($landing['footer_social_youtube']) ?>">
                </div>
              </div>

              <div class="form-grid" style="margin-top:14px">
                <div style="grid-column:1 / -1;font-weight:600;color:#0f172a">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:6px"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                  Coluna "Menu"
                </div>
                <div>
                  <label class="form-label">Titulo da coluna</label>
                  <input class="form-control" type="text" name="footer_menu_titulo" value="<?= htmlspecialchars($landing['footer_menu_titulo']) ?>">
                </div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Links (um por linha, formato: Texto|URL)</label>
                  <textarea class="form-control" name="footer_menu_items" rows="5" placeholder="Sobre nos|#a-lilly"><?= htmlspecialchars($landing['footer_menu_items']) ?></textarea>
                </div>
              </div>

              <div class="form-grid" style="margin-top:14px">
                <div style="grid-column:1 / -1;font-weight:600;color:#0f172a">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:6px"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                  Coluna "Para voce"
                </div>
                <div>
                  <label class="form-label">Titulo da coluna</label>
                  <input class="form-control" type="text" name="footer_para_voce_titulo" value="<?= htmlspecialchars($landing['footer_para_voce_titulo']) ?>">
                </div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Links (um por linha, formato: Texto|URL)</label>
                  <textarea class="form-control" name="footer_para_voce_items" rows="7" placeholder="Blog|https://..."><?= htmlspecialchars($landing['footer_para_voce_items']) ?></textarea>
                </div>
              </div>
              <div class="form-help">Use {brand} no texto do link para inserir o nome da marca. Deixe a URL em branco ou use # para um link sem destino ainda.</div>
            </div>

            <div class="landing-section landing-tab-section" data-tab="planos">
              <h4>Pagina de Planos (Clube)</h4>
              <div class="form-grid">
                <div>
                  <label class="form-label">Nome do clube (use {brand} se quiser)</label>
                  <input class="form-control" type="text" name="planos_clube_nome" value="<?= htmlspecialchars($landing['planos_clube_nome']) ?>">
                </div>
              </div>

              <div class="form-grid" style="margin-top:14px">
                <div style="grid-column:1 / -1;font-weight:600;color:#0f172a">Hero (banner principal)</div>
                <div>
                  <label class="form-label">Titulo</label>
                  <input class="form-control" type="text" name="planos_hero_titulo" value="<?= htmlspecialchars($landing['planos_hero_titulo']) ?>">
                </div>
                <div>
                  <label class="form-label">Texto do botao</label>
                  <input class="form-control" type="text" name="planos_hero_botao_texto" value="<?= htmlspecialchars($landing['planos_hero_botao_texto']) ?>">
                </div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Subtitulo</label>
                  <textarea class="form-control" name="planos_hero_subtitulo" rows="2"><?= htmlspecialchars($landing['planos_hero_subtitulo']) ?></textarea>
                </div>
                <div>
                  <label class="form-label">Link do botao</label>
                  <input class="form-control" type="text" name="planos_hero_botao_link" value="<?= htmlspecialchars($landing['planos_hero_botao_link']) ?>">
                </div>
              </div>

              <div class="form-grid" style="margin-top:14px">
                <div style="grid-column:1 / -1;font-weight:600;color:#0f172a">Secao de beneficios</div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Titulo (use {clube} para o nome do clube)</label>
                  <input class="form-control" type="text" name="planos_beneficios_titulo" value="<?= htmlspecialchars($landing['planos_beneficios_titulo']) ?>">
                </div>
              </div>
              <?php for ($n = 1; $n <= 6; $n++): ?>
                <div class="form-grid" style="margin-top:10px">
                  <div style="grid-column:1 / -1;font-weight:600;color:#64748b;font-size:13px">Beneficio <?= $n ?></div>
                  <div>
                    <label class="form-label">Icone</label>
                    <select class="form-control" name="planos_beneficio<?= $n ?>_icone">
                      <?php foreach (['user' => 'Pessoa', 'cashback' => 'Cashback', 'laptop' => 'Computador', 'dollar' => 'Cifrao', 'gift' => 'Presente'] as $iconKey => $iconLabel): ?>
                        <option value="<?= $iconKey ?>" <?= $landing['planos_beneficio' . $n . '_icone'] === $iconKey ? 'selected' : '' ?>><?= $iconLabel ?></option>
                      <?php endforeach; ?>
                    </select>
                  </div>
                  <div>
                    <label class="form-label">Titulo</label>
                    <input class="form-control" type="text" name="planos_beneficio<?= $n ?>_titulo" value="<?= htmlspecialchars($landing['planos_beneficio' . $n . '_titulo']) ?>">
                  </div>
                  <div style="grid-column:1 / -1">
                    <label class="form-label">Texto</label>
                    <textarea class="form-control" name="planos_beneficio<?= $n ?>_texto" rows="2"><?= htmlspecialchars($landing['planos_beneficio' . $n . '_texto']) ?></textarea>
                  </div>
                </div>
              <?php endfor; ?>

              <div class="form-grid" style="margin-top:14px">
                <div style="grid-column:1 / -1;font-weight:600;color:#0f172a">Banner CTA (entre beneficios e tabela)</div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Texto</label>
                  <input class="form-control" type="text" name="planos_cta_texto" value="<?= htmlspecialchars($landing['planos_cta_texto']) ?>">
                </div>
                <div>
                  <label class="form-label">Texto do botao</label>
                  <input class="form-control" type="text" name="planos_cta_botao_texto" value="<?= htmlspecialchars($landing['planos_cta_botao_texto']) ?>">
                </div>
                <div>
                  <label class="form-label">Link do botao</label>
                  <input class="form-control" type="text" name="planos_cta_botao_link" value="<?= htmlspecialchars($landing['planos_cta_botao_link']) ?>">
                </div>
              </div>

              <div class="form-grid" style="margin-top:14px">
                <div style="grid-column:1 / -1;font-weight:600;color:#0f172a">Tabela de planos</div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Titulo da secao</label>
                  <input class="form-control" type="text" name="planos_tabela_titulo" value="<?= htmlspecialchars($landing['planos_tabela_titulo']) ?>">
                </div>
                <div style="grid-column:1 / -1">
                  <label class="form-label">Destaques no topo (um por linha)</label>
                  <textarea class="form-control" name="planos_tabela_destaques" rows="4"><?= htmlspecialchars($landing['planos_tabela_destaques']) ?></textarea>
                </div>
              </div>

              <?php for ($n = 1; $n <= 4; $n++): ?>
                <?php $planoAtivo = $landing['plano' . $n . '_ativo'] !== '0'; ?>
                <div class="form-grid plano-config-row<?= $planoAtivo ? '' : ' plano-config-row--off' ?>" style="margin-top:14px">
                  <div style="grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:10px">
                    <div style="font-weight:600;color:#0f172a">Plano <?= $n ?></div>
                    <label class="plano-toggle">
                      <input type="hidden" name="plano<?= $n ?>_ativo" value="0">
                      <input type="checkbox" name="plano<?= $n ?>_ativo" value="1" <?= $planoAtivo ? 'checked' : '' ?>>
                      <span><?= $planoAtivo ? 'Visivel em public/planos.php' : 'Oculto em public/planos.php' ?></span>
                    </label>
                  </div>
                  <div>
                    <label class="form-label">Nome</label>
                    <input class="form-control" type="text" name="plano<?= $n ?>_nome" value="<?= htmlspecialchars($landing['plano' . $n . '_nome']) ?>">
                  </div>
                  <div>
                    <label class="form-label">Valor (ex: R$ 149,90/mes)</label>
                    <input class="form-control" type="text" name="plano<?= $n ?>_preco" placeholder="R$ 149,90/mes" value="<?= htmlspecialchars($landing['plano' . $n . '_preco']) ?>">
                  </div>
                  <div>
                    <label class="form-label">Cor (faixa e selo)</label>
                    <input class="form-control" type="color" name="plano<?= $n ?>_cor" value="<?= htmlspecialchars($landing['plano' . $n . '_cor']) ?>">
                  </div>
                  <div>
                    <label class="form-label">Selo (ex: Popular, Recomendado)</label>
                    <input class="form-control" type="text" name="plano<?= $n ?>_badge" value="<?= htmlspecialchars($landing['plano' . $n . '_badge']) ?>">
                  </div>
                  <div>
                    <label class="form-label">Texto do botao</label>
                    <input class="form-control" type="text" name="plano<?= $n ?>_botao_texto" value="<?= htmlspecialchars($landing['plano' . $n . '_botao_texto']) ?>">
                  </div>
                  <div>
                    <label class="form-label">Link do botao</label>
                    <input class="form-control" type="text" name="plano<?= $n ?>_botao_link" value="<?= htmlspecialchars($landing['plano' . $n . '_botao_link']) ?>">
                  </div>
                  <div style="grid-column:1 / -1">
                    <label class="form-label">Descricao</label>
                    <textarea class="form-control" name="plano<?= $n ?>_descricao" rows="2"><?= htmlspecialchars($landing['plano' . $n . '_descricao']) ?></textarea>
                  </div>
                  <div style="grid-column:1 / -1">
                    <label class="form-label">
                      Funcionalidades (uma por linha)<?php if ($n > 1): ?> - aparecem depois de "Tem tudo do <?= htmlspecialchars($landing['plano' . ($n - 1) . '_nome']) ?> e mais"<?php endif; ?>
                    </label>
                    <textarea class="form-control" name="plano<?= $n ?>_features" rows="5"><?= htmlspecialchars($landing['plano' . $n . '_features']) ?></textarea>
                  </div>
                </div>
              <?php endfor; ?>
            </div>
          </div>

          <div class="landing-col landing-tab-col">
            <div class="landing-section landing-tab-section" data-tab="imagens">
              <h4>Imagens e midias</h4>

              <div class="landing-images-grid">

              <div class="landing-file" data-reco="260x80px">
                <label class="form-label">Logo do topo</label>
                <?php if (!empty($landing['logo_image'])): ?>
                  <img class="landing-preview" src="<?= htmlspecialchars($landing['logo_image']) ?>" alt="Logo atual">
                <?php else: ?>
                  <div class="landing-placeholder">Sem logo cadastrada</div>
                <?php endif; ?>
                <div class="landing-size" data-size></div>
                <input class="form-control" type="file" name="logo_image" accept="image/*">
              </div>

              <?php for ($n = 1; $n <= 5; $n++): ?>
                <div class="landing-file" data-reco="900x700px">
                  <label class="form-label">Imagem do modulo <?= $n ?> (<?= htmlspecialchars($landing['solucao' . $n . '_titulo']) ?>)</label>
                  <?php if (!empty($landing['solucao' . $n . '_imagem'])): ?>
                    <img class="landing-preview" src="<?= htmlspecialchars($landing['solucao' . $n . '_imagem']) ?>" alt="Modulo <?= $n ?>">
                  <?php else: ?>
                    <div class="landing-placeholder">Sem imagem</div>
                  <?php endif; ?>
                  <div class="landing-size" data-size></div>
                  <input class="form-control" type="file" name="solucao<?= $n ?>_imagem" accept="image/*">
                </div>
              <?php endfor; ?>

              <div class="landing-file" data-reco="1600x900px">
                <label class="form-label">Imagem de fundo - Segmentos</label>
                <?php if (!empty($landing['segmentos_imagem'])): ?>
                  <img class="landing-preview" src="<?= htmlspecialchars($landing['segmentos_imagem']) ?>" alt="Segmentos">
                <?php else: ?>
                  <div class="landing-placeholder">Sem imagem</div>
                <?php endif; ?>
                <div class="landing-size" data-size></div>
                <input class="form-control" type="file" name="segmentos_imagem" accept="image/*">
              </div>

              <div class="landing-file" data-reco="900x700px">
                <label class="form-label">Imagem do banner - Planos</label>
                <?php if (!empty($landing['planos_hero_imagem'])): ?>
                  <img class="landing-preview" src="<?= htmlspecialchars($landing['planos_hero_imagem']) ?>" alt="Planos">
                <?php else: ?>
                  <div class="landing-placeholder">Sem imagem</div>
                <?php endif; ?>
                <div class="landing-size" data-size></div>
                <input class="form-control" type="file" name="planos_hero_imagem" accept="image/*">
              </div>

              </div>

              <div class="form-help">Arquivos PNG/JPG/WebP ate 5MB. Salvos em /admin/assets/uploads/landing.</div>
            </div>
          </div>
        </div>

        <div class="landing-actions">
          <div class="landing-msg" id="landingMsg">Pronto para atualizar a landing.</div>
          <button class="action-btn primary" type="submit">Salvar alteracoes</button>
        </div>
      </form>
      <div class="landing-preview-col">
        <div class="landing-preview-head">
          <span>Preview em tempo real</span>
          <a href="../../public/index.php" target="_blank" rel="noopener">Abrir em nova aba</a>
        </div>
        <div class="landing-preview-frame-wrap">
          <iframe id="landingPreviewFrame" src="../../public/index.php" title="Preview da landing page"></iframe>
        </div>
      </div>
      </div>
      </section>
    </div>

  </main>
</div>

<?php require __DIR__ . '/partials/modais_globais.php'; ?>

<script src="assets/js/chrome.js?v=<?= $chromeJsVer ?>"></script>
<script src="assets/js/painel.js?v=<?= $painelJsVer ?>"></script>
</body>
</html>

