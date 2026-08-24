<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/gerenciamento_module.php';
require_once __DIR__ . '/../../helpers/storage.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

function garantirLandingTable(PDO $conn): void {
  try {
    $conn->exec("CREATE TABLE IF NOT EXISTS landing_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chave VARCHAR(80) NOT NULL,
      valor MEDIUMTEXT NOT NULL,
      atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_chave (chave)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } catch (Exception $e) {
  }
}

function setLanding(PDO $conn, string $chave, string $valor): void {
  $stmt = $conn->prepare("INSERT INTO landing_config (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)");
  $stmt->execute([$chave, $valor]);
}

garantirLandingTable($conn);

// Campos de texto
$campos = [
  'brand',
  'nav_cta_primary_text',
  'nav_cta_primary_link',
  'nav_cta_secondary_text',
  'nav_cta_secondary_link',
  'nav_brand_font',
  'nav_links_items',

  'hero_badge',
  'hero_title',
  'hero_subtitle',
  'hero_stat1',
  'hero_stat2',
  'hero_stat3',

  'lead_title',
  'lead_name_label',
  'lead_company_label',
  'lead_email_label',
  'lead_whatsapp_label',
  'lead_revenue_label',
  'lead_segment_label',
  'lead_revenue_options',
  'lead_segment_options',
  'lead_privacy_text',
  'lead_button_text',

  'solucoes_titulo',
  'solucoes_link_texto',
  'solucoes_link_url',
  'solucao1_titulo', 'solucao1_texto',
  'solucao2_titulo', 'solucao2_texto',
  'solucao3_titulo', 'solucao3_texto',
  'solucao4_titulo', 'solucao4_texto',
  'solucao5_titulo', 'solucao5_texto',

  'segmentos_titulo',
  'segmentos_items',

  'cta_title',
  'cta_text',
  'cta_button_link',
  'cta_button_text',
  'cta_item1_titulo', 'cta_item1_texto',
  'cta_item2_titulo', 'cta_item2_texto',
  'cta_item3_titulo', 'cta_item3_texto',

  'footer_email',
  'footer_telefone',
  'footer_endereco',
  'footer_social_instagram',
  'footer_social_linkedin',
  'footer_social_youtube',
  'footer_menu_titulo',
  'footer_menu_items',
  'footer_para_voce_titulo',
  'footer_para_voce_items',

  'whatsapp_number',
  'whatsapp_message',

  'theme_navy',
  'theme_navy_deep',
  'theme_blue_soft',
  'theme_blue_soft_text',
  'theme_blue_btn',
  'theme_blue_btn_text',
  'theme_pink',
  'theme_pink_dark',
  'theme_link',
  'theme_light_bg',
  'theme_text',
  'theme_muted',
  'theme_border',

  'planos_clube_nome',
  'planos_hero_titulo',
  'planos_hero_subtitulo',
  'planos_hero_botao_texto',
  'planos_hero_botao_link',
  'planos_beneficios_titulo',
  'planos_beneficio1_icone', 'planos_beneficio1_titulo', 'planos_beneficio1_texto',
  'planos_beneficio2_icone', 'planos_beneficio2_titulo', 'planos_beneficio2_texto',
  'planos_beneficio3_icone', 'planos_beneficio3_titulo', 'planos_beneficio3_texto',
  'planos_beneficio4_icone', 'planos_beneficio4_titulo', 'planos_beneficio4_texto',
  'planos_beneficio5_icone', 'planos_beneficio5_titulo', 'planos_beneficio5_texto',
  'planos_beneficio6_icone', 'planos_beneficio6_titulo', 'planos_beneficio6_texto',
  'planos_cta_texto',
  'planos_cta_botao_texto',
  'planos_cta_botao_link',
  'planos_tabela_titulo',
  'planos_tabela_destaques',
  'plano1_nome', 'plano1_cor', 'plano1_badge', 'plano1_preco', 'plano1_ativo', 'plano1_descricao', 'plano1_botao_texto', 'plano1_botao_link', 'plano1_features',
  'plano2_nome', 'plano2_cor', 'plano2_badge', 'plano2_preco', 'plano2_ativo', 'plano2_descricao', 'plano2_botao_texto', 'plano2_botao_link', 'plano2_features',
  'plano3_nome', 'plano3_cor', 'plano3_badge', 'plano3_preco', 'plano3_ativo', 'plano3_descricao', 'plano3_botao_texto', 'plano3_botao_link', 'plano3_features',
  'plano4_nome', 'plano4_cor', 'plano4_badge', 'plano4_preco', 'plano4_ativo', 'plano4_descricao', 'plano4_botao_texto', 'plano4_botao_link', 'plano4_features'
];

foreach ($campos as $campo) {
  if (isset($_POST[$campo])) {
    $valor = trim((string) $_POST[$campo]);
    if ($campo === 'whatsapp_number') {
      $valor = preg_replace('/\D+/', '', $valor);
    }
    setLanding($conn, $campo, $valor);
  }
}

// Sincroniza os planos 1-4 da landing com a tabela `planos` (usada pelas assinaturas)
// no momento em que a landing e de fato salva, em vez de em toda leitura do dashboard.
$landingPlanos = [];
for ($n = 1; $n <= 4; $n++) {
  $slug = 'plano' . $n;
  foreach (['nome', 'ativo', 'preco'] as $campoPlano) {
    $chave = $slug . '_' . $campoPlano;
    $landingPlanos[$chave] = trim((string) ($_POST[$chave] ?? ''));
  }
}
gerenciamentoSincronizarPlanosLanding($conn, $landingPlanos);

// Uploads
$uploads = [
  'logo_image' => 'logo_image',
  'hero_bg_image' => 'hero_bg_image',
  'solucao1_imagem' => 'solucao1_imagem',
  'solucao2_imagem' => 'solucao2_imagem',
  'solucao3_imagem' => 'solucao3_imagem',
  'solucao4_imagem' => 'solucao4_imagem',
  'solucao5_imagem' => 'solucao5_imagem',
  'segmentos_imagem' => 'segmentos_imagem',
  'planos_hero_imagem' => 'planos_hero_imagem'
];

foreach ($uploads as $field => $key) {
  if (!isset($_FILES[$field])) {
    continue;
  }
  $safe = preg_replace('/[^a-zA-Z0-9_-]+/', '_', $key);
  try {
    $publicPath = storage_save_upload($_FILES[$field], 'landing', 'landing_' . $safe);
  } catch (RuntimeException $e) {
    continue;
  }
  if ($publicPath !== null) {
    setLanding($conn, $key, $publicPath);
  }
}

echo json_encode(['ok' => true]);
