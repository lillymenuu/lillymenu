<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.configuracoes');
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/operacao.php';
$souAdminPrincipal = souAdminPrincipal($conn);

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

$whatsapp_numero = config($conn, 'whatsapp_numero');
$whatsapp_msg = config($conn, 'whatsapp_msg');
$receber_pedidos_ativo = config($conn, 'receber_pedidos_ativo', '1');
$gestor_pedidos_ativo = config($conn, 'gestor_pedidos_ativo', '1');
$notificar_pedido_whatsapp_ativo = config($conn, 'notificar_pedido_whatsapp_ativo', '1');
$aceite_automatico_diggy_ativo = config($conn, 'aceite_automatico_diggy_ativo', '0');
$ifood_ativo = config($conn, 'ifood_ativo', '0');
$taxa_entrega = config($conn, 'taxa_entrega');
$taxa_entrega_tipo = config($conn, 'taxa_entrega_tipo', 'dinamica');
$taxa_entrega_gratis = config($conn, 'taxa_entrega_gratis', '0');
$taxa_entrega_tempo_min = config($conn, 'taxa_entrega_tempo_min', '40');
$taxa_entrega_tempo_max = config($conn, 'taxa_entrega_tempo_max', '60');
$pedido_minimo = config($conn, 'pedido_minimo');
$pedido_minimo_entrega_ativo = config($conn, 'pedido_minimo_entrega_ativo', '0');
$pedido_minimo_entrega = config($conn, 'pedido_minimo_entrega', '0');
$pedido_minimo_retirada_ativo = config($conn, 'pedido_minimo_retirada_ativo', '0');
$pedido_minimo_retirada = config($conn, 'pedido_minimo_retirada', '0');
$horario_abertura = config($conn, 'horario_abertura');
$horario_fechamento = config($conn, 'horario_fechamento');
$dias_func_raw = config($conn, 'dias_funcionamento');
$dias_func = array_filter(array_map('intval', explode(',', (string) $dias_func_raw)));
$loja_nome = config($conn, 'nome_loja', 'T&W Confeitaria');
$loja_contato = config($conn, 'loja_contato', '');
$loja_descricao = config($conn, 'loja_descricao', '');
$loja_boas_vindas = config($conn, 'loja_boas_vindas', '');
$loja_cnpj = config($conn, 'loja_cnpj', '');
$loja_link = config($conn, 'link_loja', '');
$loja_instagram = config($conn, 'loja_instagram', '');
$loja_tiktok = config($conn, 'loja_tiktok', '');
$loja_cep = config($conn, 'loja_cep', '');
$loja_rua = config($conn, 'loja_rua', '');
$loja_numero = config($conn, 'loja_numero', '');
$loja_bairro = config($conn, 'loja_bairro', '');
$loja_cidade = config($conn, 'loja_cidade', '');
$loja_estado = config($conn, 'loja_estado', '');
$loja_complemento = config($conn, 'loja_complemento', '');
$loja_capa = config($conn, 'loja_capa', '');
$loja_perfil = config($conn, 'loja_perfil', '');
/* Base URL do sistema para o cardápio — formato limpo: /lilly/nomedaloja */
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$host     = $_SERVER['HTTP_HOST'] ?? 'localhost';
$loja_link_base = $protocol . $host . '/lilly/';

/* Extrai o slug do link salvo (suporta todos os formatos anteriores) */
$loja_link_slug = $loja_link;
if (strpos($loja_link, $loja_link_base) === 0) {
  $loja_link_slug = urldecode(substr($loja_link, strlen($loja_link_base)));
} elseif (preg_match('#[?&]loja=([^&]+)#', $loja_link, $m)) {
  $loja_link_slug = urldecode($m[1]);
} elseif (preg_match('#/([^/?]+)/?$#', $loja_link, $m)) {
  $loja_link_slug = $m[1];
}
$horarios_semana_raw = config($conn, 'horarios_semana', '');
$horarios_semana = json_decode((string) $horarios_semana_raw, true);
$horarios_semana = is_array($horarios_semana) ? $horarios_semana : [];
$pagamento_dinheiro_ativo = config($conn, 'pagamento_dinheiro_ativo', '1');
$pagamento_pix_ativo = config($conn, 'pagamento_pix_ativo', '1');
$pagamento_pix_chave = config($conn, 'pagamento_pix_chave', '');
$pagamento_pix_nome = config($conn, 'pagamento_pix_nome', '');
$pagamento_credito_ativo = config($conn, 'pagamento_credito_ativo', '1');
$pagamento_credito_taxa_ativa = config($conn, 'pagamento_credito_taxa_ativa', '0');
$pagamento_credito_taxa = config($conn, 'pagamento_credito_taxa', '0');
$pagamento_credito_bandeiras_raw = config($conn, 'pagamento_credito_bandeiras', 'visa,mastercard');
$pagamento_credito_bandeiras = array_filter(array_map('trim', explode(',', (string) $pagamento_credito_bandeiras_raw)));
$pagamento_credito_bandeiras_custom_raw = config($conn, 'pagamento_credito_bandeiras_custom', '[]');
$pagamento_credito_bandeiras_custom = json_decode((string) $pagamento_credito_bandeiras_custom_raw, true);
$pagamento_credito_bandeiras_custom = is_array($pagamento_credito_bandeiras_custom)
  ? $pagamento_credito_bandeiras_custom
  : [];
$pagamento_debito_ativo = config($conn, 'pagamento_debito_ativo', '1');
$pagamento_debito_taxa_ativa = config($conn, 'pagamento_debito_taxa_ativa', '0');
$pagamento_debito_taxa = config($conn, 'pagamento_debito_taxa', '0');
$pagamento_debito_bandeiras_raw = config($conn, 'pagamento_debito_bandeiras', 'visa,mastercard');
$pagamento_debito_bandeiras = array_filter(array_map('trim', explode(',', (string) $pagamento_debito_bandeiras_raw)));
$pagamento_debito_bandeiras_custom_raw = config($conn, 'pagamento_debito_bandeiras_custom', '[]');
$pagamento_debito_bandeiras_custom = json_decode((string) $pagamento_debito_bandeiras_custom_raw, true);
$pagamento_debito_bandeiras_custom = is_array($pagamento_debito_bandeiras_custom)
  ? $pagamento_debito_bandeiras_custom
  : [];
$pagamento_voucher_ativo = config($conn, 'pagamento_voucher_ativo', '0');
$pagamento_fiado_ativo = config($conn, 'pagamento_fiado_ativo', '0');
$cashback_ativo = config($conn, 'cashback_ativo', '0');
$cashback_expira_dias = config($conn, 'cashback_expira_dias', '20');
$cashback_carencia_horas = config($conn, 'cashback_carencia_horas', '12');
$cashback_percentual = config($conn, 'cashback_percentual', '1');
$cashback_job_token = config($conn, 'cashback_job_token', '');
$clube_pontos_ativo = config($conn, 'clube_pontos_ativo', '0');
$loja_verificada = config($conn, 'loja_verificada', '0');
$loja_contato_cadastro = config($conn, 'loja_contato', config($conn, 'whatsapp_numero', ''));
$tema_cor_menu = config($conn, 'tema_cor_menu', '#e63770');
$coresMenuOptions = [
  ['valor' => '#e63770', 'nome' => 'Rosa Diggy', 'desc' => 'Cor padrão do sistema.'],
  ['valor' => '#dc2626', 'nome' => 'Vermelho Vivo', 'desc' => 'Neutro, vibrante e enérgico, transmite dinamismo, apetite e proximidade.'],
  ['valor' => '#ea5a3c', 'nome' => 'Vermelho Vibrante', 'desc' => 'Boa para lanchonetes e hamburguerias.'],
  ['valor' => '#1f2d3d', 'nome' => 'Cinza Escuro', 'desc' => 'Ideal para cafés modernos ou bistrôs elegantes.'],
  ['valor' => '#9f1d35', 'nome' => 'Vermelho Cereja', 'desc' => 'Combina com docerias clássicas e cantinas.'],
  ['valor' => '#16a34a', 'nome' => 'Verde Natural', 'desc' => 'Ótima para restaurantes naturais ou veganos.'],
  ['valor' => '#6f4e37', 'nome' => 'Marrom Café', 'desc' => 'Perfeita para cafeterias e confeitarias artesanais.'],
  ['valor' => '#d9714a', 'nome' => 'Coral Queimado', 'desc' => 'Ideal para cafés ou padarias elegantes.'],
  ['valor' => '#a8195f', 'nome' => 'Fúcsia', 'desc' => 'Boa para marcas femininas e modernas.'],
  ['valor' => '#c98bd9', 'nome' => 'Rosa Doce', 'desc' => 'Ótima para docerias temáticas e infantis.'],
  ['valor' => '#7b5c3e', 'nome' => 'Marrom Rústico', 'desc' => 'Estilo rústico combina com pizzarias com forno à lenha.'],
];
$usuario_nome = $_SESSION['admin_nome'] ?? 'Administrador';
$usuario_email = $_SESSION['admin_email'] ?? 'admin@local';
$usuario_perfil = $_SESSION['admin_perfil'] ?? 'admin';

$permsMenu = [
  'menu.dashboard',
  'menu.pdv',
  'menu.gestor_pedidos',
  'menu.pedidos',
  'menu.produtos',
  'menu.estoque',
  'menu.clientes',
  'menu.relatorios',
  'menu.relatorios_fidelidade',
  'menu.controle_caixa',
  'menu.cupons',
  'menu.configuracoes'
];
$niveisPadrao = [
  'nivel-1' => [
    'nome' => 'Nivel 1',
    'descricao' => 'Acesso total ao sistema',
    'permissoes' => $permsMenu
  ],
  'nivel-2' => [
    'nome' => 'Nivel 2',
    'descricao' => 'Operador de caixa',
    'permissoes' => [
      'menu.pdv',
      'menu.gestor_pedidos',
      'menu.clientes'
    ]
  ],
  'nivel-3' => [
    'nome' => 'Nivel 3',
    'descricao' => 'Consulta de relatorios',
    'permissoes' => [
      'menu.relatorios',
      'menu.relatorios_fidelidade'
    ]
  ]
];

function garantirNiveisPadrao(PDO $conn, array $niveisPadrao): array {
  $niveisFixos = [];
  foreach ($niveisPadrao as $slug => $nivel) {
    $stmt = $conn->prepare("SELECT id, nome, permissoes_json FROM permissoes_niveis WHERE slug = ? LIMIT 1");
    $stmt->execute([$slug]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
      $permsJson = json_encode($nivel['permissoes'], JSON_UNESCAPED_UNICODE);
      $stmtIns = $conn->prepare("
        INSERT INTO permissoes_niveis (nome, slug, permissoes_json, criado_em)
        VALUES (?, ?, ?, NOW())
      ");
      $stmtIns->execute([$nivel['nome'], $slug, $permsJson]);
      $row = [
        'id' => (int) $conn->lastInsertId(),
        'nome' => $nivel['nome'],
        'permissoes_json' => $permsJson
      ];
    }
    $permissoesJson = $row['permissoes_json'] ?? json_encode($nivel['permissoes'], JSON_UNESCAPED_UNICODE);
    $decoded = json_decode((string) $permissoesJson, true);
    $temMenu = false;
    if (is_array($decoded)) {
      foreach ($decoded as $perm) {
        if (strpos((string) $perm, 'menu.') === 0) {
          $temMenu = true;
          break;
        }
      }
    }
    if (!$temMenu) {
      $permissoesJson = json_encode($nivel['permissoes'], JSON_UNESCAPED_UNICODE);
      $stmtUp = $conn->prepare("
        UPDATE permissoes_niveis
        SET permissoes_json = ?, atualizado_em = NOW()
        WHERE slug = ?
      ");
      $stmtUp->execute([$permissoesJson, $slug]);
    }
    $niveisFixos[$slug] = [
      'id' => (int) ($row['id'] ?? 0),
      'slug' => $slug,
      'nome' => $row['nome'] ?? $nivel['nome'],
      'descricao' => $nivel['descricao'],
      'permissoes_json' => $permissoesJson
    ];
  }
  return $niveisFixos;
}

$usuariosAdmin = [];
$niveisAdmin = [];
$niveisPersonalizados = [];
$nivelAdminId = 0;
$nivelGarcomId = 0;
$temPermissoes = tabelaExiste($conn, 'permissoes_niveis');
$temPermUsuarios = tabelaExiste($conn, 'permissoes_usuarios');
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

if ($temPermissoes) {
  $niveisFixos = garantirNiveisPadrao($conn, $niveisPadrao);
  $stmt = $conn->query("
    SELECT id, nome, slug
    FROM permissoes_niveis
    WHERE slug IN ('nivel-1','nivel-2','nivel-3')
    ORDER BY FIELD(slug, 'nivel-1','nivel-2','nivel-3')
  ");
  $niveisAdmin = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
  foreach ($niveisAdmin as $nivel) {
    if ($nivel['slug'] === 'nivel-1') $nivelAdminId = (int) $nivel['id'];
    if ($nivel['slug'] === 'nivel-2') $nivelGarcomId = (int) $nivel['id'];
  }

  if ($temPermUsuarios) {
    /* Niveis personalizados ja usados por algum usuario desta loja (permissoes_niveis
       nao tem loja_id — evita listar niveis criados por outras lojas nesta selecao). */
    $stmt = $conn->prepare("
      SELECT DISTINCT pn.id, pn.nome, pn.slug
      FROM permissoes_niveis pn
      JOIN permissoes_usuarios pu ON pu.permissao_id = pn.id
      JOIN admins a ON a.id = pu.admin_id
      WHERE a.loja_id = ? AND pn.slug NOT IN ('nivel-1','nivel-2')
      ORDER BY pn.nome
    ");
    $stmt->execute([$lojaId]);
    $niveisPersonalizados = $stmt->fetchAll(PDO::FETCH_ASSOC);
  }
}

$colsAdmins = $conn->query("SHOW COLUMNS FROM admins")->fetchAll(PDO::FETCH_COLUMN, 0);
$temAtivo = in_array('ativo', $colsAdmins, true);
$temLojaAdmin = in_array('loja_id', $colsAdmins, true);
$temCodigoAcesso = in_array('codigo_acesso', $colsAdmins, true);
$sqlUsuarios = "
  SELECT a.id, a.nome, a.email, a.usuario, a.perfil, " . ($temAtivo ? "a.ativo" : "1 AS ativo") . ",
         " . ($temCodigoAcesso ? "a.codigo_acesso" : "NULL AS codigo_acesso") . ",
         pn.id AS permissao_id, pn.nome AS permissao_nome, pn.slug AS permissao_slug
  FROM admins a
  LEFT JOIN permissoes_usuarios pu ON pu.admin_id = a.id
  LEFT JOIN permissoes_niveis pn ON pn.id = pu.permissao_id
";
$whereUsuarios = ["a.perfil <> 'superadmin'"];
$paramsUsuarios = [];
if ($temAtivo) {
  $whereUsuarios[] = "a.ativo = 1";
}
if ($temLojaAdmin) {
  $whereUsuarios[] = "a.loja_id = ?";
  $paramsUsuarios[] = $lojaId;
}
if ($whereUsuarios) {
  $sqlUsuarios .= " WHERE " . implode(' AND ', $whereUsuarios);
}
$sqlUsuarios .= " ORDER BY a.nome";
$stmt = $conn->prepare($sqlUsuarios);
$stmt->execute($paramsUsuarios);
$usuariosAdmin = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

function rotuloNivelUsuario(array $usuario): string {
  $slug = $usuario['permissao_slug'] ?? null;
  if ($slug === 'nivel-1') return 'Admin';
  if ($slug === 'nivel-2') return 'Garçom';
  if ($slug) return (string) ($usuario['permissao_nome'] ?? 'Personalizada');
  return ($usuario['perfil'] ?? '') === 'admin' ? 'Admin' : 'Sem permissão';
}

$pedido_entrega_ativo = config($conn, 'pedido_entrega_ativo', '1');
$horario_entrega_ini = config($conn, 'horario_entrega_ini', '');
$horario_entrega_fim = config($conn, 'horario_entrega_fim', '');
$pedido_retirada_ativo = config($conn, 'pedido_retirada_ativo', '1');
$pedido_local_ativo = config($conn, 'pedido_local_ativo', '0');
$tempo_entrega_min = config($conn, 'tempo_entrega_min', '30');
$tempo_entrega_max = config($conn, 'tempo_entrega_max', '40');
$tempo_retirada_min = config($conn, 'tempo_retirada_min', '15');
$tempo_retirada_max = config($conn, 'tempo_retirada_max', '30');
$agendamento_delivery_ativo = config($conn, 'agendamento_delivery_ativo', '0');
$agendamento_delivery_min_tipo = config($conn, 'agendamento_delivery_min_tipo', 'dias');
$agendamento_delivery_min_valor = config($conn, 'agendamento_delivery_min_valor', '1');
$agendamento_delivery_max_tipo = config($conn, 'agendamento_delivery_max_tipo', 'dias');
$agendamento_delivery_max_valor = config($conn, 'agendamento_delivery_max_valor', '30');
$agendamento_retirada_ativo = config($conn, 'agendamento_retirada_ativo', '0');
$agendamento_retirada_min_tipo = config($conn, 'agendamento_retirada_min_tipo', 'dias');
$agendamento_retirada_min_valor = config($conn, 'agendamento_retirada_min_valor', '1');
$agendamento_retirada_max_tipo = config($conn, 'agendamento_retirada_max_tipo', 'dias');
$agendamento_retirada_max_valor = config($conn, 'agendamento_retirada_max_valor', '30');
$agendamento_delivery_horarios_raw = config($conn, 'agendamento_delivery_horarios', '');
$agendamento_retirada_horarios_raw = config($conn, 'agendamento_retirada_horarios', '');

$taxas_bairro_lista = [];
if (tabelaExiste($conn, 'taxas_bairro')) {
  $colsTaxas = $conn->query("SHOW COLUMNS FROM taxas_bairro")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temLojaTaxa = in_array('loja_id', $colsTaxas, true);
  if ($temLojaTaxa) {
    $stmt = $conn->prepare("SELECT id, bairro, taxa, tempo_min, tempo_max FROM taxas_bairro WHERE loja_id = ? ORDER BY bairro");
    $stmt->execute([$lojaId]);
    $taxas_bairro_lista = $stmt->fetchAll(PDO::FETCH_ASSOC);
  } else {
    $stmt = $conn->query("SELECT id, bairro, taxa, tempo_min, tempo_max FROM taxas_bairro ORDER BY bairro");
    $taxas_bairro_lista = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
  }
}

$taxas_dinamicas_lista = [];
if (tabelaExiste($conn, 'taxas_dinamicas')) {
  $colsTaxasDyn = $conn->query("SHOW COLUMNS FROM taxas_dinamicas")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temLojaDyn = in_array('loja_id', $colsTaxasDyn, true);
  if ($temLojaDyn) {
    $stmt = $conn->prepare("
      SELECT id, distancia_km, valor, tipo, tempo_min, tempo_max
      FROM taxas_dinamicas
      WHERE loja_id = ?
      ORDER BY distancia_km
    ");
    $stmt->execute([$lojaId]);
    $taxas_dinamicas_lista = $stmt->fetchAll(PDO::FETCH_ASSOC);
  } else {
    $stmt = $conn->query("
      SELECT id, distancia_km, valor, tipo, tempo_min, tempo_max
      FROM taxas_dinamicas
      ORDER BY distancia_km
    ");
    $taxas_dinamicas_lista = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
  }
}

$bandeiras_lista = [
  'visa' => 'Visa',
  'mastercard' => 'Mastercard',
  'elo' => 'Elo',
  'hiper' => 'Hiper',
  'maestro' => 'Maestro',
  'hipercard' => 'Hipercard',
  'diners' => 'Diners Club',
  'alelo' => 'Alelo',
  'amex' => 'Amex'
];

$bandeiras_credito = $bandeiras_lista;
$bandeiras_credito_custom_slugs = [];
foreach ($pagamento_credito_bandeiras_custom as $item) {
  if (!is_array($item)) {
    continue;
  }
  $slug = trim((string) ($item['slug'] ?? ''));
  $label = trim((string) ($item['label'] ?? ''));
  if ($slug === '' || $label === '') {
    continue;
  }
  $bandeiras_credito[$slug] = $label;
  $bandeiras_credito_custom_slugs[] = $slug;
}

$bandeiras_debito = $bandeiras_lista;
$bandeiras_debito_custom_slugs = [];
foreach ($pagamento_debito_bandeiras_custom as $item) {
  if (!is_array($item)) {
    continue;
  }
  $slug = trim((string) ($item['slug'] ?? ''));
  $label = trim((string) ($item['label'] ?? ''));
  if ($slug === '' || $label === '') {
    continue;
  }
  $bandeiras_debito[$slug] = $label;
  $bandeiras_debito_custom_slugs[] = $slug;
}

$dias_lista = [
  1 => 'Dom',
  2 => 'Seg',
  3 => 'Ter',
  4 => 'Qua',
  5 => 'Qui',
  6 => 'Sex',
  7 => 'Sab'
];
$dias_semana_full = [
  1 => 'Domingo',
  2 => 'Segunda',
  3 => 'Terca',
  4 => 'Quarta',
  5 => 'Quinta',
  6 => 'Sexta',
  7 => 'Sabado'
];
$horarios_por_dia = [];
foreach ($dias_semana_full as $dia_id => $dia_nome) {
  $horario_dia = null;
  if (isset($horarios_semana[$dia_id]) && is_array($horarios_semana[$dia_id])) {
    $horario_dia = $horarios_semana[$dia_id];
  } elseif (isset($horarios_semana[(string) $dia_id]) && is_array($horarios_semana[(string) $dia_id])) {
    $horario_dia = $horarios_semana[(string) $dia_id];
  } elseif (in_array($dia_id, $dias_func, true) && $horario_abertura && $horario_fechamento) {
    $horario_dia = ['inicio' => $horario_abertura, 'fim' => $horario_fechamento];
  }

  if ($horario_dia && (!isset($horario_dia['inicio']) || !isset($horario_dia['fim']))) {
    $horario_dia = null;
  }

  $horarios_por_dia[$dia_id] = $horario_dia;
}
$horarios_json = [];
foreach ($horarios_por_dia as $dia_id => $horario_dia) {
  if ($horario_dia) {
    $horarios_json[$dia_id] = [
      'inicio' => $horario_dia['inicio'],
      'fim' => $horario_dia['fim']
    ];
  }
}
$horarios_json_raw = json_encode($horarios_json);
$default_horario_inicio = $horario_abertura ?: '13:00';
$default_horario_fim = $horario_fechamento ?: '19:00';

function normalizarAgendadoHorarios(string $raw, array $fallback): array {
  $dados = json_decode($raw, true);
  if (!is_array($dados)) {
    return $fallback;
  }
  $normalizado = [];
  foreach ($dados as $dia => $info) {
    if (is_array($info) && isset($info['inicio'], $info['fim'])) {
      $diaId = (int) $dia;
      if ($diaId <= 0) {
        continue;
      }
      $normalizado[$diaId] = [
        'inicio' => (string) $info['inicio'],
        'fim' => (string) $info['fim']
      ];
      continue;
    }
    if (is_array($info) && isset($info['dia'], $info['inicio'], $info['fim'])) {
      $diaId = (int) $info['dia'];
      if ($diaId <= 0) {
        continue;
      }
      $normalizado[$diaId] = [
        'inicio' => (string) $info['inicio'],
        'fim' => (string) $info['fim']
      ];
    }
  }
  return $normalizado ?: $fallback;
}

$agendamento_default = [];
foreach ($horarios_por_dia as $dia_id => $horario_dia) {
  if (!$horario_dia || empty($horario_dia['inicio']) || empty($horario_dia['fim'])) {
    continue;
  }
  $agendamento_default[$dia_id] = [
    'inicio' => $horario_dia['inicio'],
    'fim' => $horario_dia['fim']
  ];
}
if (!$agendamento_default) {
  foreach ([3, 4, 5, 6, 7] as $dia_id) {
    $agendamento_default[$dia_id] = [
      'inicio' => $default_horario_inicio,
      'fim' => $default_horario_fim
    ];
  }
}

$agendamento_delivery_horarios = normalizarAgendadoHorarios($agendamento_delivery_horarios_raw, $agendamento_default);
$agendamento_retirada_horarios = normalizarAgendadoHorarios($agendamento_retirada_horarios_raw, $agendamento_default);
$agendamento_delivery_horarios_raw = json_encode($agendamento_delivery_horarios);
$agendamento_retirada_horarios_raw = json_encode($agendamento_retirada_horarios);

$settingsSections = [
  [
    'title' => 'Loja',
    'cards' => [
      [
        'id' => 'loja-info',
        'icon' => 'bi bi-shop',
        'title' => 'Informações da loja',
        'desc' => 'Defina nome, logo e identidade da marca.'
      ],
      [
        'id' => 'menu-custom',
        'icon' => 'bi bi-palette',
        'title' => 'Customize o menu',
        'desc' => 'Ajuste cores, banners e layout do cardapio.'
      ],
      [
        'id' => 'usuarios',
        'icon' => 'bi bi-people',
        'title' => 'Usuários',
        'desc' => 'Gerencie contas e acessos da equipe.'
      ],
      [
        'id' => 'permissoes',
        'icon' => 'bi bi-shield-lock',
        'title' => 'Permissões',
        'desc' => 'Defina niveis e politicas de acesso.',
        'link' => 'permissoes.php'
      ],
      [
        'id' => 'selo-verificacao',
        'icon' => 'bi bi-patch-check',
        'title' => 'Selo de verificação',
        'desc' => 'Verifique seu contato e exiba o selo de loja verificada no cardápio.',
        'badge' => 'Novo',
        'skip_modal' => true
      ],
      [
        'id' => 'horarios',
        'icon' => 'bi bi-clock',
        'title' => 'Horário de funcionamento',
        'desc' => 'Configure abertura, fechamento e dias ativos.'
      ],
      [
        'id' => 'pausa',
        'icon' => 'bi bi-pause-circle',
        'title' => 'Pausa programada',
        'desc' => 'Agende pausas automaticas da loja.'
      ],
      [
        'id' => 'formas-pagamento',
        'icon' => 'bi bi-credit-card-2-front',
        'title' => 'Formas de pagamento',
        'desc' => 'Defina meios aceitos e taxas.'
      ],
      [
        'id' => 'pagamento-online',
        'icon' => 'bi bi-credit-card-2-front',
        'title' => 'Pagamento online',
        'desc' => 'Configure meios de pagamento online.'
      ]
    ]
  ],
  [
    'title' => 'Fidelidade',
    'cards' => [
      [
        'id' => 'cashback',
        'icon' => 'bi bi-cash-coin',
        'title' => 'Cashback',
        'desc' => 'Configure regras e percentual de retorno.'
      ],
      [
        'id' => 'clube-pontos',
        'icon' => 'bi bi-stars',
        'title' => 'Clube de pontos',
        'desc' => 'Ative o programa de fidelidade por pontos.'
      ]
    ]
  ],
  [
    'title' => 'Pedidos',
    'cards' => [
      [
        'id' => 'receber-pedidos',
        'icon' => 'bi bi-inbox',
        'title' => 'Receber pedidos',
        'desc' => 'Canais, alertas e regras de recebimento.'
      ],
      [
        'id' => 'tipos-pedidos',
        'icon' => 'bi bi-bag-check',
        'title' => 'Tipos de pedidos',
        'desc' => 'Ative entrega, retirada e mesa.'
      ],
      [
        'id' => 'configuracoes-pdv',
        'icon' => 'bi bi-sliders2',
        'title' => 'Configurações de PDV',
        'desc' => 'Defina regras e integrações do PDV.'
      ],
      [
        'id' => 'numeracao',
        'icon' => 'bi bi-hash',
        'title' => 'Numeracao sequencial de pedidos',
        'desc' => 'Ajuste a numeracao dos pedidos.'
      ],
      [
        'id' => 'valor-minimo',
        'icon' => 'bi bi-123',
        'title' => 'Valor mínimo do pedido',
        'desc' => 'Defina valor mínimo para pedidos.'
      ],
      [
        'id' => 'pedidos-agendados',
        'icon' => 'bi bi-calendar2-check',
        'title' => 'Pedidos agendados',
        'desc' => 'Ative e configure pedidos futuros.'
      ],
      [
        'id' => 'validacao-pedido',
        'icon' => 'bi bi-clipboard-check',
        'title' => 'Validação de pedido',
        'desc' => 'Regras de verificação e confirmação.'
      ],
      [
        'id' => 'taxa-entrega',
        'icon' => 'bi bi-geo-alt',
        'title' => 'Taxa de entrega',
        'desc' => 'Configure taxas por area e endereço.'
      ]
    ]
  ],
  [
    'title' => 'Integrações',
    'cards' => [
      [
        'id' => 'ifood',
        'icon' => 'bi bi-cart-check',
        'title' => 'iFood',
        'desc' => 'Sincronize pedidos do marketplace.'
      ],
      [
        'id' => 'whatsapp',
        'icon' => 'bi bi-whatsapp',
        'title' => 'WhatsApp',
        'desc' => 'Conecte mensagens e automações.'
      ],
      [
        'id' => 'facebook-pixel',
        'icon' => 'bi bi-facebook',
        'title' => 'Facebook pixel',
        'desc' => 'Acompanhe eventos do cardápio.'
      ]
    ]
  ],
  [
    'title' => 'Pedidos na mesa',
    'cards' => [
      [
        'id' => 'tela-mesa',
        'icon' => 'bi bi-table',
        'title' => 'Tela da mesa',
        'desc' => 'Configure fluxo de pedido no salão.'
      ]
    ]
  ],
  [
    'title' => 'Outros',
    'cards' => [
      [
        'id' => 'impressao',
        'icon' => 'bi bi-printer',
        'title' => 'Impressao',
        'desc' => 'Perfis, formatos e impressoras.'
      ],
      [
        'id' => 'balanca',
        'icon' => 'bi bi-scale',
        'title' => 'Balança',
        'desc' => 'Integracao com balançaa conectada.'
      ],
      [
        'id' => 'eventos',
        'icon' => 'bi bi-graph-up',
        'title' => 'Eventos',
        'desc' => 'Registros de eventos do dashboard.'
      ]
    ]
  ]
];

$modalForms = ['loja-info', 'whatsapp', 'taxa-entrega', 'valor-minimo', 'receber-pedidos', 'pedidos-agendados', 'tipos-pedidos', 'horarios', 'formas-pagamento', 'usuarios', 'permissoes', 'cashback', 'clube-pontos', 'menu-custom', 'impressao'];
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$configCssVer = filemtime(__DIR__ . '/assets/css/configuracoes.css');
$configJsVer = filemtime(__DIR__ . '/assets/js/configuracoes.js');
$impressorasConfigJsVer = filemtime(__DIR__ . '/assets/js/impressoras_config.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Configurações</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

<link href="./assets/css/configuracoes.css?v=<?= $configCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy">

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="dash-page settings-page">
  <div class="settings-header">
    <div class="settings-title-wrap">
      <button class="dash-menu-btn" onclick="toggleSidebar()" aria-label="Abrir menu">
        <i class="bi bi-list"></i>
      </button>
      <div>
        <h1 class="settings-title">Configurações</h1>
        <div class="settings-subtitle">Ajuste o funcionamento da loja, pedidos e integracoes.</div>
      </div>
    </div>
    
  </div>

  <div id="settingsCards">
    <?php foreach ($settingsSections as $section): ?>
      <section class="dash-section">
        <div class="dash-section-head">
          <h2 class="dash-section-title"><?= htmlspecialchars($section['title']) ?></h2>
        </div>
        <div class="settings-grid">
          <?php foreach ($section['cards'] as $card): ?>
            <?php $modalId = 'modal-' . $card['id']; ?>
            <?php $toneClass = ($card['tone'] ?? '') === 'danger' ? ' settings-card--danger' : ''; ?>
            <?php $cardLink = $card['link'] ?? ''; ?>
            <a class="mini-card settings-card<?= $toneClass ?>"
               href="<?= $cardLink ? htmlspecialchars($cardLink) : 'javascript:void(0)' ?>"
               <?= $cardLink ? '' : 'data-modal="' . $modalId . '" role="button"' ?>>
              <?php if (!empty($card['badge'])): ?>
                <span class="settings-card-badge"><?= htmlspecialchars($card['badge']) ?></span>
              <?php endif; ?>
              <div class="mini-icon">
                <i class="<?= htmlspecialchars($card['icon']) ?>"></i>
              </div>
              <div>
                <div class="mini-title"><?= htmlspecialchars($card['title']) ?></div>
                <div class="mini-desc"><?= htmlspecialchars($card['desc']) ?></div>
              </div>
            </a>
          <?php endforeach; ?>
        </div>
      </section>
    <?php endforeach; ?>

    <div class="dash-footer">Cardápio Digital Lilly (c) 2026</div>
  </div>
</div>

</main>
</div>

<?php foreach ($settingsSections as $section): ?>
  <?php foreach ($section['cards'] as $card): ?>
    <?php if (!empty($card['skip_modal'])) continue; ?>
    <?php
      $modalId = 'modal-' . $card['id'];
      $hasForm = in_array($card['id'], $modalForms, true);
      if ($card['id'] === 'formas-pagamento') {
        $modalClass = 'modal fade settings-modal settings-modal--payment';
      } elseif ($card['id'] === 'usuarios') {
        $modalClass = 'modal fade settings-modal settings-modal--usuarios' . (!$souAdminPrincipal ? ' settings-modal--usuarios-compact' : '');
      } elseif ($card['id'] === 'permissoes') {
        $modalClass = 'modal fade settings-modal settings-modal--permissoes';
      } elseif ($card['id'] === 'cashback') {
        $modalClass = 'modal fade settings-modal settings-modal--cashback';
      } elseif ($card['id'] === 'clube-pontos') {
        $modalClass = 'modal fade settings-modal settings-modal--clube-pontos';
      } elseif ($card['id'] === 'loja-info') {
        $modalClass = 'modal fade settings-modal settings-modal--loja-info';
      } elseif ($card['id'] === 'taxa-entrega') {
        $modalClass = 'modal fade settings-modal settings-modal--taxa';
        } elseif ($card['id'] === 'pedidos-agendados') {
          $modalClass = 'modal fade settings-modal settings-modal--agendados';
        } elseif ($card['id'] === 'tipos-pedidos') {
          $modalClass = 'modal fade settings-modal settings-modal--tipos';
        } elseif ($card['id'] === 'horarios') {
          $modalClass = 'modal fade settings-modal settings-modal--horarios';
        } elseif ($card['id'] === 'pausa') {
          $modalClass = 'modal fade settings-modal settings-modal--pausa';
        } elseif ($card['id'] === 'menu-custom') {
          $modalClass = 'modal fade settings-modal settings-modal--cores';
        } else {
        $modalClass = 'modal fade settings-modal';
      }
    ?>
    <div class="<?= $modalClass ?>" id="<?= $modalId ?>" tabindex="-1" aria-hidden="true"<?= $card['id'] === 'taxa-entrega' ? ' style="padding:0;--taxa-modal-height:560px;"' : '' ?>>
      <div class="modal-dialog modal-dialog-centered"<?= $card['id'] === 'taxa-entrega' ? ' style="height:560px;max-height:560px;margin:0 auto;width:769px;max-width:769px;"' : '' ?>>
        <div class="modal-content border-0"<?= $card['id'] === 'taxa-entrega' ? ' style="height:560px;max-height:560px;overflow:hidden;display:flex;flex-direction:column;"' : '' ?>>
          <div class="modal-header">
            <h5 class="modal-title"<?= $card['id'] === 'usuarios' ? ' id="usuariosModalTitle"' : '' ?>>
              <?php if ($card['id'] === 'usuarios'): ?>
                Usuários
              <?php elseif ($card['id'] === 'permissoes'): ?>
                Nivel de acesso
              <?php elseif ($card['id'] === 'taxa-entrega'): ?>
                Taxa dinamica habilitada
              <?php elseif ($card['id'] === 'menu-custom'): ?>
                Cores
              <?php else: ?>
                <?= htmlspecialchars($card['title']) ?>
              <?php endif; ?>
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body"<?= $card['id'] === 'taxa-entrega' ? ' style="flex:1 1 auto;min-height:0;overflow-y:auto;padding-bottom:0;"' : '' ?>>
            <?php if ($hasForm): ?>
              <form class="settings-modal-form" data-config-form="<?= htmlspecialchars($card['id']) ?>">
                <?php if ($card['id'] === 'formas-pagamento'): ?>
                  <div class="payment-modal-body">
                    <div class="settings-error" data-error="pagamento-geral"></div>
                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Dinheiro</div>
                        <label class="payment-toggle">
                          <input type="checkbox" name="pagamento_dinheiro_ativo" value="1" <?= $pagamento_dinheiro_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                    </div>

                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Pix</div>
                        <label class="payment-toggle">
                          <input type="checkbox" name="pagamento_pix_ativo" value="1" <?= $pagamento_pix_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <div class="payment-card-body">
                        <div class="payment-field-group">
                          <label class="form-label" for="pixChave">Chave pix *</label>
                          <input class="form-control" type="text" name="pagamento_pix_chave" id="pixChave" value="<?= htmlspecialchars($pagamento_pix_chave) ?>" placeholder="000.000.000-00" data-mask="pix">
                          <div class="settings-error" data-error="pix-chave"></div>
                        </div>
                        <div class="payment-field-group">
                          <label class="form-label" for="pixNome">Identificacao da chave pix *</label>
                          <input class="form-control" type="text" name="pagamento_pix_nome" id="pixNome" value="<?= htmlspecialchars($pagamento_pix_nome) ?>" placeholder="Nome da chave pix">
                          <div class="settings-error" data-error="pix-nome"></div>
                          <div class="payment-help">
                            O nome da sua chave pix e exibido para o cliente no pagamento.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Credito</div>
                        <label class="payment-toggle">
                          <input type="checkbox" name="pagamento_credito_ativo" value="1" <?= $pagamento_credito_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <div class="payment-card-body">
                        <div class="payment-toggle-row">
                          <span>Habilitar taxa adicional em porcentagem %</span>
                          <label class="payment-toggle">
                            <input type="checkbox" name="pagamento_credito_taxa_ativa" value="1" data-extra-toggle="credito" <?= $pagamento_credito_taxa_ativa === '1' ? 'checked' : '' ?>>
                            <span class="payment-toggle-slider"></span>
                          </label>
                        </div>
                        <div class="payment-field-group">
                          <label class="form-label" for="creditoTaxa">Taxa adicional (%)</label>
                          <input class="form-control" type="number" step="0.01" name="pagamento_credito_taxa" id="creditoTaxa" value="<?= htmlspecialchars($pagamento_credito_taxa) ?>" data-extra-input="credito" data-mask="percent">
                          <div class="settings-error" data-error="credito-taxa"></div>
                        </div>
                        <div class="payment-subtitle">Bandeiras aceitas pela sua loja</div>
                        <div class="payment-flag-grid">
                          <?php foreach ($bandeiras_credito as $slug => $label): ?>
                            <?php $checked = in_array($slug, $pagamento_credito_bandeiras, true) ? 'checked' : ''; ?>
                            <label class="payment-flag">
                              <input type="checkbox" value="<?= htmlspecialchars($slug) ?>" data-bandeira-grupo="credito" <?= $checked ?> <?= in_array($slug, $bandeiras_credito_custom_slugs, true) ? 'data-custom="1"' : '' ?>>
                              <span><?= htmlspecialchars($label) ?></span>
                            </label>
                          <?php endforeach; ?>
                        </div>
                        <div class="settings-error" data-error="credito-bandeiras"></div>
                        <input type="hidden" name="pagamento_credito_bandeiras_custom" id="creditoBandeirasCustom" data-custom-store="credito" value="<?= htmlspecialchars(json_encode($pagamento_credito_bandeiras_custom) ?: '[]') ?>">
                        <div class="payment-custom">
                          <button type="button" class="payment-link" data-custom-toggle="credito">Criar bandeira customizada</button>
                          <div class="payment-custom-form" data-custom-form="credito">
                            <div class="payment-custom-row">
                              <input class="form-control" type="text" placeholder="Nome da bandeira" data-custom-input="credito">
                              <button type="button" class="btn-diggy-ghost payment-custom-btn" data-custom-add="credito">Adicionar</button>
                            </div>
                            <div class="settings-error" data-error="credito-custom"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Debito</div>
                        <label class="payment-toggle">
                          <input type="checkbox" name="pagamento_debito_ativo" value="1" <?= $pagamento_debito_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <div class="payment-card-body">
                        <div class="payment-toggle-row">
                          <span>Habilitar taxa adicional em porcentagem %</span>
                          <label class="payment-toggle">
                            <input type="checkbox" name="pagamento_debito_taxa_ativa" value="1" data-extra-toggle="debito" <?= $pagamento_debito_taxa_ativa === '1' ? 'checked' : '' ?>>
                            <span class="payment-toggle-slider"></span>
                          </label>
                        </div>
                        <div class="payment-field-group">
                          <label class="form-label" for="debitoTaxa">Taxa adicional (%)</label>
                          <input class="form-control" type="number" step="0.01" name="pagamento_debito_taxa" id="debitoTaxa" value="<?= htmlspecialchars($pagamento_debito_taxa) ?>" data-extra-input="debito" data-mask="percent">
                          <div class="settings-error" data-error="debito-taxa"></div>
                        </div>
                        <div class="payment-subtitle">Bandeiras aceitas pela sua loja</div>
                        <div class="payment-flag-grid">
                          <?php foreach ($bandeiras_debito as $slug => $label): ?>
                            <?php $checked = in_array($slug, $pagamento_debito_bandeiras, true) ? 'checked' : ''; ?>
                            <label class="payment-flag">
                              <input type="checkbox" value="<?= htmlspecialchars($slug) ?>" data-bandeira-grupo="debito" <?= $checked ?> <?= in_array($slug, $bandeiras_debito_custom_slugs, true) ? 'data-custom="1"' : '' ?>>
                              <span><?= htmlspecialchars($label) ?></span>
                            </label>
                          <?php endforeach; ?>
                        </div>
                        <div class="settings-error" data-error="debito-bandeiras"></div>
                        <input type="hidden" name="pagamento_debito_bandeiras_custom" id="debitoBandeirasCustom" data-custom-store="debito" value="<?= htmlspecialchars(json_encode($pagamento_debito_bandeiras_custom) ?: '[]') ?>">
                        <div class="payment-custom">
                          <button type="button" class="payment-link" data-custom-toggle="debito">Criar bandeira customizada</button>
                          <div class="payment-custom-form" data-custom-form="debito">
                            <div class="payment-custom-row">
                              <input class="form-control" type="text" placeholder="Nome da bandeira" data-custom-input="debito">
                              <button type="button" class="btn-diggy-ghost payment-custom-btn" data-custom-add="debito">Adicionar</button>
                            </div>
                            <div class="settings-error" data-error="debito-custom"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Voucher</div>
                        <label class="payment-toggle">
                          <input type="checkbox" name="pagamento_voucher_ativo" value="1" <?= $pagamento_voucher_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                    </div>

                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Fiado (apenas PDV)</div>
                        <label class="payment-toggle">
                          <input type="checkbox" name="pagamento_fiado_ativo" value="1" <?= $pagamento_fiado_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'usuarios'): ?>
                  <div class="usuarios-modal">

                    <div class="usuarios-lista" id="usuariosLista">
                      <div class="usuarios-cardlist">
                        <?php if (!$usuariosAdmin): ?>
                          <div class="usuarios-empty">Nenhum usuario cadastrado.</div>
                        <?php elseif ($souAdminPrincipal): ?>
                          <?php foreach ($usuariosAdmin as $usuarioItem): ?>
                            <button type="button"
                                    class="usuarios-userrow"
                                    data-user-edit
                                    data-user-id="<?= (int) $usuarioItem['id'] ?>"
                                    data-user-nome="<?= htmlspecialchars($usuarioItem['nome'] ?? '') ?>"
                                    data-user-perm="<?= (int) ($usuarioItem['permissao_id'] ?? 0) ?>"
                                    data-user-email="<?= htmlspecialchars($usuarioItem['email'] ?? '') ?>"
                                    data-user-codigo="<?= htmlspecialchars($usuarioItem['codigo_acesso'] ?? '') ?>">
                              <span class="usuarios-userrow-info">
                                <span class="usuarios-userrow-nome"><?= htmlspecialchars($usuarioItem['nome'] ?? '') ?></span>
                                <span class="usuarios-userrow-nivel"><?= htmlspecialchars(rotuloNivelUsuario($usuarioItem)) ?></span>
                              </span>
                              <i class="bi bi-chevron-right"></i>
                            </button>
                          <?php endforeach; ?>
                        <?php else: ?>
                          <?php foreach ($usuariosAdmin as $usuarioItem): ?>
                            <div class="usuarios-userrow usuarios-userrow--somente-leitura">
                              <span class="usuarios-userrow-info">
                                <span class="usuarios-userrow-nome"><?= htmlspecialchars($usuarioItem['nome'] ?? '') ?></span>
                                <span class="usuarios-userrow-nivel"><?= htmlspecialchars(rotuloNivelUsuario($usuarioItem)) ?></span>
                              </span>
                            </div>
                          <?php endforeach; ?>
                        <?php endif; ?>
                      </div>
                      <?php if ($souAdminPrincipal): ?>
                        <div class="usuarios-lista-footer">
                          <button type="button" class="btn-diggy-primary" id="btnNovoUsuario">Criar usuário</button>
                        </div>
                      <?php endif; ?>
                    </div>

                    <div class="usuarios-form d-none" id="usuariosForm">
                      <input type="hidden" id="usuarioId">
                      <div class="usuarios-field">
                        <label class="form-label" for="usuarioFormNome">Nome do usuário <span class="text-danger">*</span></label>
                        <input class="form-control" type="text" id="usuarioFormNome" placeholder="Ex.: João da Silva">
                      </div>

                      <div class="usuarios-field">
                        <label class="form-label" for="usuarioFormEmail">E-mail do usuário <span class="text-danger">*</span></label>
                        <input class="form-control" type="email" id="usuarioFormEmail" placeholder="Ex.: joao@email.com">
                        <div class="usuarios-perm-text">Esse e-mail será usado pelo usuário para entrar no sistema junto com o código de acesso.</div>
                      </div>

                      <div class="usuarios-permissoes">
                        <div class="usuarios-permissoes-title">Atribuições do usuário (usuários podem ter apenas uma permissão).</div>
                        <label class="usuarios-radio">
                          <input type="radio" name="usuarioPermissao" value="<?= $nivelAdminId ?>">
                          <span>Admin (Sistema)</span>
                        </label>
                        <label class="usuarios-radio">
                          <input type="radio" name="usuarioPermissao" value="<?= $nivelGarcomId ?>">
                          <span>Garçom (Sistema)</span>
                        </label>

                        <div class="usuarios-perm-subtitle">Permissões personalizada</div>
                        <div class="usuarios-perm-text">
                          Você pode criar uma permissão específica para cada tipo de usuário, escolhendo a dedo o que ele pode visualizar e alterar no app.
                        </div>
                        <?php foreach ($niveisPersonalizados as $nivelPersonalizado): ?>
                          <label class="usuarios-radio">
                            <input type="radio" name="usuarioPermissao" value="<?= (int) $nivelPersonalizado['id'] ?>">
                            <span><?= htmlspecialchars($nivelPersonalizado['nome'] ?? '') ?></span>
                          </label>
                        <?php endforeach; ?>
                        <button type="button" class="usuarios-perm-link" data-open-permissoes>Criar nova permissão</button>
                      </div>

                      <div class="usuarios-codigo-box d-none" id="usuarioCodigoBox">
                        <div class="usuarios-permissoes-title">Código de acesso</div>
                        <div class="usuarios-perm-text">Informe o código abaixo para o usuário conseguir fazer login:</div>
                        <div class="usuarios-codigo-display" id="usuarioCodigoValor">-----</div>
                        <?php if ($souAdminPrincipal): ?>
                          <div class="usuarios-perm-text">Caso o usuário foi deslogado e precise entrar no app novamente, gere um novo código de acesso.</div>
                          <button type="button" class="usuarios-perm-link" id="btnGerarCodigoUsuario">Gerar novo código de acesso</button>
                        <?php else: ?>
                          <div class="usuarios-perm-text">Somente o admin principal do sistema pode gerar um novo código de acesso.</div>
                        <?php endif; ?>
                      </div>

                      <div class="settings-error" data-error="usuarios-form"></div>

                      <div class="usuarios-form-actions">
                        <div class="usuarios-form-actions-left">
                          <button type="button" class="btn-diggy-ghost usuarios-btn danger d-none" id="btnExcluirUsuario">Excluir usuário</button>
                        </div>
                        <?php if ($souAdminPrincipal): ?>
                          <button type="button" class="btn-diggy-primary" id="btnSalvarUsuario">Criar usuário</button>
                        <?php endif; ?>
                      </div>
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'permissoes'): ?>
                  <div class="perm-field mb-3">
                    <label class="form-label">Nome do nivel de acesso <span class="text-danger">*</span></label>
                    <input class="form-control" type="text" placeholder="Ex.: Garcom">
                  </div>

                  <div class="perm-tabs" role="tablist">
                    <button type="button" class="perm-tab active" data-perm-tab="catalogo">Catalogo</button>
                    <button type="button" class="perm-tab" data-perm-tab="lillybot">Lilly Bot</button>
                    <button type="button" class="perm-tab" data-perm-tab="cashback">Cashback</button>
                    <button type="button" class="perm-tab" data-perm-tab="estoque">Estoque</button>
                    <button type="button" class="perm-tab" data-perm-tab="pedidos">Pedidos</button>
                    <button type="button" class="perm-tab" data-perm-tab="clientes">Clientes</button>
                    <button type="button" class="perm-tab" data-perm-tab="caixa">Caixa</button>
                    <button type="button" class="perm-tab" data-perm-tab="relatorios">Relatorios</button>
                    <button type="button" class="perm-tab" data-perm-tab="loja">Loja</button>
                    <button type="button" class="perm-tab" data-perm-tab="impressoras">Impressoras</button>
                    <button type="button" class="perm-tab" data-perm-tab="conta">Conta</button>
                  </div>

                  <div class="perm-panel mt-3" data-perm-panel="catalogo">
                    <div class="perm-panel-head">
                      <div>
                        <h6 class="perm-panel-title">Catalogo</h6>
                        <div class="perm-panel-sub">Selecione as acoes que serao permitidas para este nivel de acesso.</div>
                      </div>
                      <label class="perm-check">
                        <input type="checkbox" data-perm-all="catalogo">
                        <span>Selecionar todos</span>
                      </label>
                    </div>
                    <div class="perm-check-grid">
                      <label class="perm-check"><input type="checkbox" data-perm-item="catalogo">Ver catalogo</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="catalogo">Adicionar produto/categoria</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="catalogo">Editar produto/categoria</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="catalogo">Excluir produto/categoria</label>
                    </div>
                  </div>

                  <div class="perm-panel d-none" data-perm-panel="lillybot">
                    <div class="perm-panel-head">
                      <div>
                        <h6 class="perm-panel-title">Lilly Bot</h6>
                        <div class="perm-panel-sub">Selecione as acoes que serao permitidas para este nivel de acesso.</div>
                      </div>
                      <label class="perm-check">
                        <input type="checkbox" data-perm-all="lillybot">
                        <span>Selecionar todos</span>
                      </label>
                    </div>
                    <div class="perm-check-grid">
                      <label class="perm-check"><input type="checkbox" data-perm-item="lillybot">Criar integracao com WhatsApp</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="lillybot">Editar integracao com WhatsApp</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="lillybot">Excluir integracao com WhatsApp</label>
                    </div>
                  </div>

                  <div class="perm-panel d-none" data-perm-panel="cashback">
                    <div class="perm-panel-head">
                      <div>
                        <h6 class="perm-panel-title">Cashback</h6>
                        <div class="perm-panel-sub">Selecione as acoes que serao permitidas para este nivel de acesso.</div>
                      </div>
                      <label class="perm-check">
                        <input type="checkbox" data-perm-all="cashback">
                        <span>Selecionar todos</span>
                      </label>
                    </div>
                    <div class="perm-check-grid">
                      <label class="perm-check"><input type="checkbox" data-perm-item="cashback">Editar cashback</label>
                    </div>
                  </div>

                  <div class="perm-panel d-none" data-perm-panel="estoque">
                    <div class="perm-panel-head">
                      <div>
                        <h6 class="perm-panel-title">Estoque</h6>
                        <div class="perm-panel-sub">Selecione as acoes que serao permitidas para este nivel de acesso.</div>
                      </div>
                      <label class="perm-check">
                        <input type="checkbox" data-perm-all="estoque">
                        <span>Selecionar todos</span>
                      </label>
                    </div>
                    <div class="perm-check-grid">
                      <label class="perm-check"><input type="checkbox" data-perm-item="estoque">Ver estoque</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="estoque">Editar estoque</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="estoque">Excluir item de estoque</label>
                    </div>
                  </div>

                  <div class="perm-panel d-none" data-perm-panel="pedidos">
                    <div class="perm-panel-head">
                      <div>
                        <h6 class="perm-panel-title">Pedidos</h6>
                        <div class="perm-panel-sub">Selecione as acoes que serao permitidas para este nivel de acesso.</div>
                      </div>
                      <label class="perm-check">
                        <input type="checkbox" data-perm-all="pedidos">
                        <span>Selecionar todos</span>
                      </label>
                    </div>
                    <div class="perm-check-grid">
                      <label class="perm-check"><input type="checkbox" data-perm-item="pedidos">Ver pedidos</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="pedidos">Cancelar pedido</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="pedidos">Editar pedido</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="pedidos">Recusar pedido</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="pedidos">Mudar status do pedido</label>
                    </div>
                  </div>

                  <div class="perm-panel d-none" data-perm-panel="clientes">
                    <div class="perm-panel-head">
                      <div>
                        <h6 class="perm-panel-title">Clientes</h6>
                        <div class="perm-panel-sub">Selecione as acoes que serao permitidas para este nivel de acesso.</div>
                      </div>
                      <label class="perm-check">
                        <input type="checkbox" data-perm-all="clientes">
                        <span>Selecionar todos</span>
                      </label>
                    </div>
                    <div class="perm-check-grid">
                      <label class="perm-check"><input type="checkbox" data-perm-item="clientes">Ver clientes</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="clientes">Adicionar cliente</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="clientes">Editar cliente</label>
                    </div>
                  </div>

                  <div class="perm-panel d-none" data-perm-panel="caixa">
                    <div class="perm-panel-head">
                      <div>
                        <h6 class="perm-panel-title">Caixa</h6>
                        <div class="perm-panel-sub">Selecione as acoes que serao permitidas para este nivel de acesso.</div>
                      </div>
                      <label class="perm-check">
                        <input type="checkbox" data-perm-all="caixa">
                        <span>Selecionar todos</span>
                      </label>
                    </div>
                    <div class="perm-check-grid">
                      <label class="perm-check"><input type="checkbox" data-perm-item="caixa">Ver caixa</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="caixa">Abrir caixa</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="caixa">Fechar caixa</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="caixa">Ver historico do caixa</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="caixa">Editar caixa</label>
                    </div>
                  </div>

                  <div class="perm-panel d-none" data-perm-panel="relatorios">
                    <div class="perm-panel-head">
                      <div>
                        <h6 class="perm-panel-title">Relatorios</h6>
                        <div class="perm-panel-sub">Selecione as acoes que serao permitidas para este nivel de acesso.</div>
                      </div>
                      <label class="perm-check">
                        <input type="checkbox" data-perm-all="relatorios">
                        <span>Selecionar todos</span>
                      </label>
                    </div>
                    <div class="perm-check-grid">
                      <label class="perm-check"><input type="checkbox" data-perm-item="relatorios">Ver relatorios</label>
                    </div>
                  </div>

                  <div class="perm-panel d-none" data-perm-panel="loja">
                    <div class="perm-panel-head">
                      <div>
                        <h6 class="perm-panel-title">Loja</h6>
                        <div class="perm-panel-sub">Selecione as acoes que serao permitidas para este nivel de acesso.</div>
                      </div>
                      <label class="perm-check">
                        <input type="checkbox" data-perm-all="loja">
                        <span>Selecionar todos</span>
                      </label>
                    </div>
                    <div class="perm-check-grid">
                      <label class="perm-check"><input type="checkbox" data-perm-item="loja">Ver loja</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="loja">Editar loja</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="loja">Criar loja</label>
                    </div>
                  </div>

                  <div class="perm-panel d-none" data-perm-panel="impressoras">
                    <div class="perm-panel-head">
                      <div>
                        <h6 class="perm-panel-title">Impressoras</h6>
                        <div class="perm-panel-sub">Selecione as acoes que serao permitidas para este nivel de acesso.</div>
                      </div>
                      <label class="perm-check">
                        <input type="checkbox" data-perm-all="impressoras">
                        <span>Selecionar todos</span>
                      </label>
                    </div>
                    <div class="perm-check-grid">
                      <label class="perm-check"><input type="checkbox" data-perm-item="impressoras">Ver impressoras</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="impressoras">Editar impressora</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="impressoras">Criar impressora</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="impressoras">Excluir impressora</label>
                    </div>
                  </div>

                  <div class="perm-panel d-none" data-perm-panel="conta">
                    <div class="perm-panel-head">
                      <div>
                        <h6 class="perm-panel-title">Conta</h6>
                        <div class="perm-panel-sub">Selecione as acoes que serao permitidas para este nivel de acesso.</div>
                      </div>
                      <label class="perm-check">
                        <input type="checkbox" data-perm-all="conta">
                        <span>Selecionar todos</span>
                      </label>
                    </div>
                    <div class="perm-check-grid">
                      <label class="perm-check"><input type="checkbox" data-perm-item="conta">Gerenciar usuarios</label>
                      <label class="perm-check"><input type="checkbox" data-perm-item="conta">Gerenciar permissoes</label>
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'cashback'): ?>
                  <div class="cashback-modal-body">
                    <div>
                      <div class="cashback-title">Vantagens</div>
                      <div class="cashback-text">
                        O cashback ajuda a aumentar o ticket medio do seu negocio e a fidelizar cada vez mais o seu cliente.
                      </div>
                    </div>
                    <div class="settings-error" data-error="cashback-geral"></div>
                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Cashback habilitado</div>
                        <label class="payment-toggle">
                          <input type="checkbox" name="cashback_ativo" value="1" <?= $cashback_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                    <div class="payment-card">
                      <div class="payment-card-body">
                        <div class="payment-field-group">
                          <label class="form-label" for="cashbackExpira">O cashback deve expirar em quantos dias?</label>
                          <input class="form-control" type="number" min="1" step="1" name="cashback_expira_dias" id="cashbackExpira" value="<?= htmlspecialchars($cashback_expira_dias) ?>" data-mask="dias">
                          <div class="settings-error" data-error="cashback-dias"></div>
                        </div>
                        <div class="payment-field-group">
                          <label class="form-label" for="cashbackCarencia">Cashback fica disponivel para uso apos quantas horas da compra?</label>
                          <input class="form-control" type="number" min="0" step="1" name="cashback_carencia_horas" id="cashbackCarencia" value="<?= htmlspecialchars($cashback_carencia_horas) ?>" placeholder="12">
                          <div class="settings-error" data-error="cashback-carencia"></div>
                        </div>
                        <div class="payment-field-group">
                          <label class="form-label" for="cashbackPercentual">Porcentagem do cashback</label>
                          <input class="form-control" type="number" step="0.01" min="0" max="100" name="cashback_percentual" id="cashbackPercentual" value="<?= htmlspecialchars($cashback_percentual) ?>" data-mask="percent">
                          <div class="settings-error" data-error="cashback-percentual"></div>
                        </div>
                        <div class="cashback-preview" data-cashback-preview>
                          <div>
                            <div class="cashback-preview-label">Pago pelo cliente</div>
                            <div class="cashback-preview-strong">Seu cliente recebera de cashback</div>
                          </div>
                          <div class="text-end">
                            <div class="cashback-preview-value muted" data-cashback-pago>R$ 50,00</div>
                            <div class="cashback-preview-value" data-cashback-valor>R$ 0,00</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'impressao'): ?>
                  <div class="impressora-modal-body">
                    <div class="impressora-lista" id="listaImpressoras">
                      <div class="impressora-lista-vazio" id="listaImpressorasVazio">Nenhuma impressora configurada neste computador.</div>
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'clube-pontos'): ?>
                  <div class="pontos-modal-body">
                    <div class="pontos-info-card">
                      <div class="pontos-info-icon"><i class="bi bi-gift"></i></div>
                      <div>
                        <div class="pontos-info-title">Como funciona?</div>
                        <div class="pontos-info-text">
                          Com o clube de pontos habilitado, seus clientes acumulam pontos a cada compra e podem
                          troca-los por beneficios na sua loja. E uma forma de fidelizar e recompensar quem mais compra com voce.
                        </div>
                      </div>
                    </div>
                    <div class="pontos-info-card">
                      <div class="pontos-info-icon"><i class="bi bi-stars"></i></div>
                      <div>
                        <div class="pontos-info-title">Vantagens</div>
                        <div class="pontos-info-text">
                          O programa de fidelidade aumenta a recorrencia de compras e fortalece o relacionamento com seus clientes.
                        </div>
                      </div>
                    </div>
                    <div class="pontos-info-card">
                      <div class="pontos-info-icon"><i class="bi bi-list-check"></i></div>
                      <div>
                        <div class="pontos-info-title">Como configurar no produto</div>
                        <div class="pontos-info-text">
                          Va na aba de produtos e edite o que voce deseja configurar. Em cada item voce define:
                        </div>
                        <div class="pontos-info-list">
                          <div><strong>Ganho</strong> — pontos que o cliente acumula ao comprar.</div>
                          <div><strong>Custo</strong> — pontos que o cliente gasta para trocar pelo produto.</div>
                        </div>
                      </div>
                    </div>
                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Clube de pontos habilitado</div>
                        <label class="payment-toggle">
                          <input type="hidden" name="clube_pontos_ativo" value="0">
                          <input type="checkbox" name="clube_pontos_ativo" value="1" <?= $clube_pontos_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'cashback-job'): ?>
                  <div class="settings-form-grid">
                    <div class="settings-form-span">
                      <label class="form-label" for="cashbackJobToken">Token do job de cashback</label>
                      <div class="settings-token-row">
                        <input class="form-control" type="text" name="cashback_job_token" id="cashbackJobToken" value="<?= htmlspecialchars($cashback_job_token) ?>" placeholder="Ex.: cbx_12345_seu_token">
                        <button type="button" class="btn-diggy-ghost" id="btnGerarTokenCashback">Gerar token</button>
                      </div>
                    </div>
                    <div class="settings-form-span settings-placeholder">
                      Use este token para chamar o endpoint de expiracao automatica em background.
                    </div>
                    <div class="settings-form-span settings-placeholder">
                      Endpoint: admin/api/cashback_expirar.php?token=SEU_TOKEN
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'whatsapp'): ?>
                  <div class="settings-form-grid">
                    <div>
                      <label class="form-label" for="whatsappNumero">Numero (com DDI)</label>
                      <input class="form-control" type="text" name="whatsapp_numero" id="whatsappNumero" value="<?= htmlspecialchars($whatsapp_numero) ?>" placeholder="5511999999999">
                    </div>
                    <div class="settings-form-span">
                      <label class="form-label" for="whatsappMsg">Mensagem padrao</label>
                      <input class="form-control" type="text" name="whatsapp_msg" id="whatsappMsg" value="<?= htmlspecialchars($whatsapp_msg) ?>" placeholder="Sua mensagem padrao">
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'loja-info'): ?>
                  <div class="loja-media">
                    <div class="loja-capa-card" id="lojaCapaCard">
                      <span id="lojaCapaPlaceholder" class="<?= $loja_capa ? 'd-none' : '' ?>">Adicionar capa</span>
                      <img src="<?= htmlspecialchars($loja_capa) ?>" alt="" id="lojaCapaPreview" class="<?= $loja_capa ? '' : 'd-none' ?>">
                      <button type="button" class="loja-media-remove" id="lojaCapaRemover">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                    <div class="loja-perfil-card" id="lojaPerfilCard">
                      <span id="lojaPerfilPlaceholder" class="<?= $loja_perfil ? 'd-none' : '' ?>">Perfil</span>
                      <img src="<?= htmlspecialchars($loja_perfil) ?>" alt="" id="lojaPerfilPreview" class="<?= $loja_perfil ? '' : 'd-none' ?>">
                      <button type="button" class="loja-media-remove" id="lojaPerfilRemover">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                    <input type="file" id="lojaCapaInput" class="d-none" accept="image/*">
                    <input type="file" id="lojaPerfilInput" class="d-none" accept="image/png">
                    <input type="hidden" name="loja_capa_base64" id="lojaCapaBase64">
                    <input type="hidden" name="loja_capa_remover" id="lojaCapaRemoverFlag" value="0">
                    <input type="hidden" name="loja_perfil_base64" id="lojaPerfilBase64">
                    <input type="hidden" name="loja_perfil_remover" id="lojaPerfilRemoverFlag" value="0">
                  </div>

                  <div class="loja-section-title">Informacoes principais</div>
                  <div class="loja-field">
                    <label for="lojaNome">Nome da loja <span class="text-danger">*</span></label>
                    <input class="loja-input" type="text" name="nome_loja" id="lojaNome" value="<?= htmlspecialchars($loja_nome) ?>">
                  </div>
                  <div class="loja-field">
                    <label for="lojaContato">Numero de contato <span class="text-danger">*</span></label>
                    <input class="loja-input" type="text" name="loja_contato" id="lojaContato" value="<?= htmlspecialchars($loja_contato) ?>">
                  </div>
                  <div class="loja-field">
                    <label for="lojaDescricao">Descricao</label>
                    <textarea class="loja-textarea" name="loja_descricao" id="lojaDescricao" maxlength="300"><?= htmlspecialchars($loja_descricao) ?></textarea>
                    <div class="loja-counter" id="lojaDescricaoCount">0/300</div>
                  </div>
                  <div class="loja-field">
                    <label for="lojaBoasVindas">Mensagem de boas vindas</label>
                    <textarea class="loja-textarea" name="loja_boas_vindas" id="lojaBoasVindas" maxlength="300"><?= htmlspecialchars($loja_boas_vindas) ?></textarea>
                  </div>

                  <div class="loja-section-title">Documentos e link</div>
                  <div class="loja-field">
                    <label for="lojaCnpj">CNPJ</label>
                    <input class="loja-input" type="text" name="loja_cnpj" id="lojaCnpj" value="<?= htmlspecialchars($loja_cnpj) ?>" placeholder="CNPJ da sua loja caso tenha">
                  </div>
                  <div class="loja-field">
                    <label for="lojaLinkSlug">Link customizado</label>
                    <input class="loja-input" type="text" id="lojaLinkSlug" value="<?= htmlspecialchars($loja_link_slug) ?>" data-base="<?= htmlspecialchars($loja_link_base) ?>" placeholder="ex: tewconfeitaria">
                    <div class="loja-link-hint">
                      Customize seu link com o nome do seu estabelecimento, ficando mais facil para seus clientes identificarem a sua loja.
                    </div>
                    <div class="loja-link-preview">
                      <input type="text" id="lojaLinkPreview" readonly>
                      <button type="button" id="lojaLinkCopy"><i class="bi bi-clipboard"></i></button>
                    </div>
                    <input type="hidden" name="link_loja" id="lojaLinkHidden" value="<?= htmlspecialchars($loja_link) ?>">
                  </div>

                  <div class="loja-section-title">Redes sociais</div>
                  <div class="loja-field">
                    <label for="lojaInstagram">Instagram</label>
                    <input class="loja-input" type="text" name="loja_instagram" id="lojaInstagram" value="<?= htmlspecialchars($loja_instagram) ?>" placeholder="Ex.: tewconfeitaria">
                  </div>
                  <div class="loja-field">
                    <label for="lojaTiktok">Tiktok</label>
                    <input class="loja-input" type="text" name="loja_tiktok" id="lojaTiktok" value="<?= htmlspecialchars($loja_tiktok) ?>" placeholder="Ex.: diggymenu">
                  </div>

                  <div class="loja-section-title">Endereco</div>
                  <div class="loja-field">
                    <label for="lojaCep">CEP <span class="text-danger">*</span></label>
                    <input class="loja-input" type="text" name="loja_cep" id="lojaCep" value="<?= htmlspecialchars($loja_cep) ?>">
                  </div>
                  <div class="loja-field">
                    <label for="lojaRua">Rua <span class="text-danger">*</span></label>
                    <input class="loja-input" type="text" name="loja_rua" id="lojaRua" value="<?= htmlspecialchars($loja_rua) ?>">
                  </div>
                  <div class="loja-field">
                    <label for="lojaNumero">Numero <span class="text-danger">*</span></label>
                    <input class="loja-input" type="text" name="loja_numero" id="lojaNumero" value="<?= htmlspecialchars($loja_numero) ?>">
                  </div>
                  <div class="loja-field">
                    <label for="lojaBairro">Bairro <span class="text-danger">*</span></label>
                    <input class="loja-input" type="text" name="loja_bairro" id="lojaBairro" value="<?= htmlspecialchars($loja_bairro) ?>">
                  </div>
                  <div class="loja-field">
                    <label for="lojaCidade">Cidade <span class="text-danger">*</span></label>
                    <input class="loja-input" type="text" name="loja_cidade" id="lojaCidade" value="<?= htmlspecialchars($loja_cidade) ?>">
                  </div>
                  <div class="loja-field">
                    <label for="lojaEstado">Estado <span class="text-danger">*</span></label>
                    <input class="loja-input" type="text" name="loja_estado" id="lojaEstado" value="<?= htmlspecialchars($loja_estado) ?>">
                  </div>
                  <div class="loja-field">
                    <label for="lojaComplemento">Complemento</label>
                    <input class="loja-input" type="text" name="loja_complemento" id="lojaComplemento" value="<?= htmlspecialchars($loja_complemento) ?>">
                  </div>
                <?php elseif ($card['id'] === 'taxa-entrega'): ?>
                  <div class="taxa-modal">
                    <input type="hidden" name="taxa_entrega" value="<?= htmlspecialchars($taxa_entrega) ?>">
                    <input type="hidden" name="taxa_entrega_tipo" id="taxaEntregaTipo" value="<?= htmlspecialchars($taxa_entrega_tipo) ?>">
                    <div class="taxa-toggle-card">
                      <div>
                        <div class="taxa-toggle-title">Taxa de entrega gratis para pedidos com valor minimo</div>
                        <div class="taxa-toggle-desc">
                          Voce pode oferecer entrega gratis a partir de um valor minimo de pedido que voce configurar
                        </div>
                      </div>
                      <label class="payment-toggle">
                        <input type="hidden" name="taxa_entrega_gratis" value="0">
                        <input type="checkbox" name="taxa_entrega_gratis" value="1" <?= $taxa_entrega_gratis === '1' ? 'checked' : '' ?>>
                        <span class="payment-toggle-slider"></span>
                      </label>
                    </div>

                    <div class="taxa-tabs" data-taxa-tabs>
                      <button type="button" class="taxa-tab<?= $taxa_entrega_tipo === 'sem' ? ' active' : '' ?>" data-taxa-tab="sem">Sem taxa de entrega</button>
                      <button type="button" class="taxa-tab<?= $taxa_entrega_tipo === 'bairro' ? ' active' : '' ?>" data-taxa-tab="bairro">Taxa por bairro</button>
                      <button type="button" class="taxa-tab<?= $taxa_entrega_tipo === 'dinamica' ? ' active' : '' ?>" data-taxa-tab="dinamica">Taxa dinamica</button>
                      <button type="button" class="taxa-tab<?= $taxa_entrega_tipo === 'fixa' ? ' active' : '' ?>" data-taxa-tab="fixa">Taxa fixa</button>
                      <button type="button" class="taxa-tab<?= $taxa_entrega_tipo === 'area' ? ' active' : '' ?>" data-taxa-tab="area">Taxa por area/distancia</button>
                    </div>

                    <div class="taxa-pane<?= $taxa_entrega_tipo === 'sem' ? ' active' : '' ?>" data-taxa-pane="sem">
                      <div class="taxa-empty">
                        Defina sua loja sem taxa de entrega para pedidos de delivery.
                      </div>
                    </div>

                    <div class="taxa-pane<?= $taxa_entrega_tipo === 'bairro' ? ' active' : '' ?>" data-taxa-pane="bairro">
                      <div class="taxa-form d-none" data-taxa-form="bairro">
                        <input type="hidden" data-taxa-id="bairro" value="">
                        <div class="taxa-form-grid">
                          <div class="taxa-form-field">
                            <label>Bairro</label>
                            <input type="text" data-taxa-field="bairro_nome" placeholder="Ex.: Centro">
                          </div>
                          <div class="taxa-form-field">
                            <label>Valor da taxa</label>
                            <input type="number" step="0.01" data-taxa-field="bairro_valor" placeholder="0,00">
                          </div>
                          <div class="taxa-form-field">
                            <label>Tempo minimo (min)</label>
                            <input type="number" data-taxa-field="bairro_min" placeholder="40">
                          </div>
                          <div class="taxa-form-field">
                            <label>Tempo maximo (min)</label>
                            <input type="number" data-taxa-field="bairro_max" placeholder="60">
                          </div>
                        </div>
                        <div class="taxa-form-actions">
                          <button type="button" class="btn btn-outline-secondary" data-taxa-cancel="bairro">Cancelar</button>
                          <button type="button" class="btn btn-primary taxa-primary" data-taxa-save="bairro">Salvar taxa por bairro</button>
                        </div>
                      </div>
                      <div class="taxa-bairro-tools">
                        <input type="text" class="taxa-filter-input" data-taxa-filter="bairro" placeholder="Filtrar por bairro">
                        <div class="taxa-pagination">
                          <button type="button" class="taxa-page-btn" data-taxa-page="bairro-prev">Anterior</button>
                          <span class="taxa-page-info" data-taxa-page-info="bairro">Pagina 1 de 1</span>
                          <button type="button" class="taxa-page-btn" data-taxa-page="bairro-next">Proxima</button>
                        </div>
                      </div>
                      <div class="taxa-bairro-footer-space"></div>
                      <div class="taxa-table taxa-table--bairro" data-taxa-list="bairro">
                        <div class="taxa-table-head">
                          <div>Bairro</div>
                          <div>Valor da taxa</div>
                          <div>Tempo minimo</div>
                          <div>Tempo maximo</div>
                          <div>Acoes</div>
                        </div>
                        <?php if (empty($taxas_bairro_lista)): ?>
                          <div class="taxa-empty">Cadastre taxas diferentes por bairro para calculo automatico.</div>
                        <?php else: ?>
                          <?php foreach ($taxas_bairro_lista as $item): ?>
                            <div class="taxa-table-row"
                                 data-taxa-bairro-row
                                 data-id="<?= (int) $item['id'] ?>"
                                 data-bairro="<?= htmlspecialchars($item['bairro']) ?>"
                                 data-valor="<?= htmlspecialchars($item['taxa']) ?>"
                                 data-min="<?= htmlspecialchars($item['tempo_min'] ?? '') ?>"
                                 data-max="<?= htmlspecialchars($item['tempo_max'] ?? '') ?>">
                              <div><?= htmlspecialchars($item['bairro']) ?></div>
                              <div>R$ <?= number_format((float) $item['taxa'], 2, ',', '.') ?></div>
                              <div><?= htmlspecialchars($item['tempo_min'] ?? '-') ?></div>
                              <div><?= htmlspecialchars($item['tempo_max'] ?? '-') ?></div>
                              <div class="taxa-actions">
                                <button type="button" class="taxa-icon-btn" data-taxa-delete="bairro">
                                  <i class="bi bi-trash"></i>
                                </button>
                                <button type="button" class="taxa-icon-btn danger" data-taxa-edit="bairro">
                                  <i class="bi bi-pencil"></i>
                                </button>
                              </div>
                            </div>
                          <?php endforeach; ?>
                        <?php endif; ?>
                      </div>
                      <div class="taxa-footer">
                        <button type="button" class="btn btn-primary taxa-primary is-small" data-taxa-add="bairro">Adicionar taxa por bairro</button>
                      </div>
                    </div>

                    <div class="taxa-pane<?= $taxa_entrega_tipo === 'dinamica' ? ' active' : '' ?>" data-taxa-pane="dinamica">
                      <div class="taxa-form d-none" data-taxa-form="dinamica">
                        <input type="hidden" data-taxa-id="dinamica" value="">
                        <div class="taxa-form-grid">
                          <div class="taxa-form-field">
                            <label>Distancia (km)</label>
                            <input type="number" step="0.1" data-taxa-field="dinamica_distancia" placeholder="1">
                          </div>
                          <div class="taxa-form-field">
                            <label>Valor da taxa</label>
                            <input type="number" step="0.01" data-taxa-field="dinamica_valor" placeholder="0,00">
                          </div>
                          <div class="taxa-form-field">
                            <label>Tipo</label>
                            <select data-taxa-field="dinamica_tipo">
                              <option value="fixa">Taxa fixa</option>
                              <option value="por_km">Por km</option>
                            </select>
                          </div>
                          <div class="taxa-form-field">
                            <label>Tempo minimo (min)</label>
                            <input type="number" data-taxa-field="dinamica_min" placeholder="40">
                          </div>
                          <div class="taxa-form-field">
                            <label>Tempo maximo (min)</label>
                            <input type="number" data-taxa-field="dinamica_max" placeholder="60">
                          </div>
                        </div>
                        <div class="taxa-form-actions">
                          <button type="button" class="btn btn-outline-secondary" data-taxa-cancel="dinamica">Cancelar</button>
                          <button type="button" class="btn btn-primary taxa-primary" data-taxa-save="dinamica">Salvar taxa dinamica</button>
                        </div>
                      </div>
                      <div class="taxa-table" data-taxa-list="dinamica">
                        <div class="taxa-table-head">
                          <div>Distancia</div>
                          <div>Valor da taxa</div>
                          <div>Taxa</div>
                          <div>Tempo minimo</div>
                          <div>Tempo maximo</div>
                          <div>Acoes</div>
                        </div>
                        <?php if (empty($taxas_dinamicas_lista)): ?>
                          <div class="taxa-empty">Cadastre regras de taxa dinamica para distancia.</div>
                        <?php else: ?>
                          <?php foreach ($taxas_dinamicas_lista as $item): ?>
                            <?php
                              $tipo_label = ($item['tipo'] ?? 'fixa') === 'por_km' ? 'Por km' : 'Taxa fixa';
                            ?>
                            <div class="taxa-table-row"
                                 data-taxa-dinamica-row
                                 data-id="<?= (int) $item['id'] ?>"
                                 data-distancia="<?= htmlspecialchars($item['distancia_km']) ?>"
                                 data-valor="<?= htmlspecialchars($item['valor']) ?>"
                                 data-tipo="<?= htmlspecialchars($item['tipo'] ?? 'fixa') ?>"
                                 data-min="<?= htmlspecialchars($item['tempo_min'] ?? '') ?>"
                                 data-max="<?= htmlspecialchars($item['tempo_max'] ?? '') ?>">
                              <div><?= htmlspecialchars($item['distancia_km']) ?>km</div>
                              <div>R$ <?= number_format((float) $item['valor'], 2, ',', '.') ?></div>
                              <div><?= $tipo_label ?></div>
                              <div><?= htmlspecialchars($item['tempo_min'] ?? '-') ?> minutos</div>
                              <div><?= htmlspecialchars($item['tempo_max'] ?? '-') ?> minutos</div>
                              <div class="taxa-actions">
                                <button type="button" class="taxa-icon-btn" data-taxa-delete="dinamica">
                                  <i class="bi bi-trash"></i>
                                </button>
                                <button type="button" class="taxa-icon-btn danger" data-taxa-edit="dinamica">
                                  <i class="bi bi-pencil"></i>
                                </button>
                              </div>
                            </div>
                          <?php endforeach; ?>
                        <?php endif; ?>
                      </div>
                    </div>

                    <div class="taxa-pane<?= $taxa_entrega_tipo === 'fixa' ? ' active' : '' ?>" data-taxa-pane="fixa">
                      <div class="taxa-form">
                        <div class="taxa-form-grid">
                          <div class="taxa-form-field">
                            <label>Valor da taxa fixa</label>
                            <input type="number" step="0.01" id="taxaEntregaFixaValor" value="<?= htmlspecialchars($taxa_entrega) ?>" placeholder="0,00">
                          </div>
                          <div class="taxa-form-field">
                            <label>Tempo minimo (min)</label>
                            <input type="number" id="taxaEntregaFixaMin" value="<?= htmlspecialchars($taxa_entrega_tempo_min) ?>" placeholder="40">
                          </div>
                          <div class="taxa-form-field">
                            <label>Tempo maximo (min)</label>
                            <input type="number" id="taxaEntregaFixaMax" value="<?= htmlspecialchars($taxa_entrega_tempo_max) ?>" placeholder="60">
                          </div>
                        </div>
                        <div class="taxa-form-actions">
                          <button type="button" class="btn btn-primary taxa-primary" data-taxa-save="fixa">Salvar taxa fixa</button>
                        </div>
                      </div>
                    </div>

                    <div class="taxa-pane<?= $taxa_entrega_tipo === 'area' ? ' active' : '' ?>" data-taxa-pane="area">
                      <div class="taxa-empty">
                        Configure taxas por area/distancia conforme o raio da loja.
                      </div>
                    </div>

                    <div class="taxa-note" data-taxa-dinamica-note>
                      <strong>Atencao!</strong> Com a taxa dinamica habilitada, voce pode cobrar a taxa de entrega de
                      acordo com a distancia do local de entrega. Exemplo: ate 2km cobrar R$ 4,00.
                    </div>

                    <div class="taxa-footer" data-taxa-dinamica-footer>
                      <button type="button" class="btn btn-outline-secondary taxa-ghost">Redefinir local da loja</button>
                      <button type="button" class="btn btn-primary taxa-primary is-small" data-taxa-add="dinamica">Adicionar taxa dinamica</button>
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'valor-minimo'): ?>
                  <div class="payment-modal-body">
                    <p class="valor-minimo-desc">Para finalizar o pedido o valor precisará ser igual ou superior ao valor que você definir.</p>

                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Valor mínimo para entrega</div>
                        <label class="payment-toggle">
                          <input type="checkbox" name="pedido_minimo_entrega_ativo" value="1" data-extra-toggle="pedmin-entrega" <?= $pedido_minimo_entrega_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <div class="payment-card-body">
                        <div class="payment-help" style="margin-top:0">O pedido só poderá ser finalizado se o valor for igual ou superior ao valor configurado.</div>
                        <div class="payment-field-group">
                          <label class="form-label" for="pedidoMinimoEntrega">Valor mínimo (R$)</label>
                          <input class="form-control" type="number" step="0.01" name="pedido_minimo_entrega" id="pedidoMinimoEntrega" value="<?= htmlspecialchars($pedido_minimo_entrega) ?>" placeholder="0,00" data-extra-input="pedmin-entrega">
                        </div>
                      </div>
                    </div>

                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Valor mínimo para retirada</div>
                        <label class="payment-toggle">
                          <input type="checkbox" name="pedido_minimo_retirada_ativo" value="1" data-extra-toggle="pedmin-retirada" <?= $pedido_minimo_retirada_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <div class="payment-card-body">
                        <div class="payment-help" style="margin-top:0">O pedido só poderá ser finalizado se o valor for igual ou superior ao valor configurado.</div>
                        <div class="payment-field-group">
                          <label class="form-label" for="pedidoMinimoRetirada">Valor mínimo (R$)</label>
                          <input class="form-control" type="number" step="0.01" name="pedido_minimo_retirada" id="pedidoMinimoRetirada" value="<?= htmlspecialchars($pedido_minimo_retirada) ?>" placeholder="0,00" data-extra-input="pedmin-retirada">
                        </div>
                      </div>
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'receber-pedidos'): ?>
                  <div class="payment-modal-body">
                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Receber pedidos habilitado</div>
                        <label class="payment-toggle">
                          <input type="hidden" name="receber_pedidos_ativo" value="0">
                          <input type="checkbox" name="receber_pedidos_ativo" value="1" <?= $receber_pedidos_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <div class="payment-help" style="margin-top:6px">Seus clientes poderão realizar pedidos através do seu cardápio digital.</div>
                    </div>

                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Gestor de pedidos habilitado</div>
                        <label class="payment-toggle">
                          <input type="hidden" name="gestor_pedidos_ativo" value="0">
                          <input type="checkbox" name="gestor_pedidos_ativo" value="1" <?= $gestor_pedidos_ativo === '1' ? 'checked' : '' ?> <?= $ifood_ativo === '1' ? 'disabled' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <div class="payment-help" style="margin-top:6px">Com o gestor habilitado você poderá mover os pedidos entre etapas (aceito, em preparo, saiu para entrega).</div>
                      <?php if ($ifood_ativo === '1'): ?>
                      <div class="payment-help text-danger" style="margin-top:4px">Você possui integrações ativas. Para desabilitar o gestor de pedidos, remova ou desative essas integrações primeiro.</div>
                      <?php endif; ?>
                    </div>

                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Notificar pedidos no whatsapp habilitado</div>
                        <label class="payment-toggle">
                          <input type="hidden" name="notificar_pedido_whatsapp_ativo" value="0">
                          <input type="checkbox" name="notificar_pedido_whatsapp_ativo" value="1" <?= $notificar_pedido_whatsapp_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <div class="payment-help" style="margin-top:6px">Após o pedido ser finalizado, seu cliente terá a opção de encaminhar a mensagem para seu whatsapp.</div>
                    </div>

                    <div class="payment-card">
                      <div class="payment-card-head">
                        <div class="payment-card-title">Aceite automático de pedidos do Diggy <span data-diggy-status><?= $aceite_automatico_diggy_ativo === '1' ? 'habilitado' : 'desabilitado' ?></span></div>
                        <label class="payment-toggle">
                          <input type="hidden" name="aceite_automatico_diggy_ativo" value="0">
                          <input type="checkbox" name="aceite_automatico_diggy_ativo" value="1" data-diggy-toggle <?= $aceite_automatico_diggy_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <div class="payment-help" style="margin-top:6px">Todos os pedidos recebidos do Diggy serão aceitos automaticamente.</div>
                    </div>

                    <div class="payment-field-group">
                      <label class="form-label" for="receberPedidosWhatsapp">Número do Whatsapp para receber pedidos</label>
                      <input class="form-control" type="text" name="whatsapp_numero" id="receberPedidosWhatsapp" value="<?= htmlspecialchars($whatsapp_numero) ?>" placeholder="5511999999999">
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'horarios'): ?>
                  <div class="horarios-modal-body" data-default-inicio="<?= htmlspecialchars($default_horario_inicio) ?>" data-default-fim="<?= htmlspecialchars($default_horario_fim) ?>">
                    <p class="horarios-desc">
                      Sua loja ira abrir e fechar automaticamente de acordo com os horarios definidos.
                      Dias que nao tiverem horario configurado a loja ira permanecer fechada.
                    </p>
                    <div class="horarios-list">
                      <?php foreach ($dias_semana_full as $dia_id => $dia_nome): ?>
                        <?php
                          $horario_dia = $horarios_por_dia[$dia_id] ?? null;
                          $aberto = $horario_dia && !empty($horario_dia['inicio']) && !empty($horario_dia['fim']);
                          $inicio = $aberto ? $horario_dia['inicio'] : '';
                          $fim = $aberto ? $horario_dia['fim'] : '';
                        ?>
                        <div class="horario-row" data-horario-dia="<?= $dia_id ?>" data-aberto="<?= $aberto ? '1' : '0' ?>">
                          <div class="horario-dia"><?= $dia_nome ?></div>
                          <div>
                            <div class="horario-time<?= $aberto ? '' : ' d-none' ?>">
                              <input type="time" class="horario-input" data-role="inicio" value="<?= htmlspecialchars($inicio) ?>">
                              <span class="horario-sep">ate</span>
                              <input type="time" class="horario-input" data-role="fim" value="<?= htmlspecialchars($fim) ?>">
                            </div>
                            <button type="button" class="horario-closed<?= $aberto ? ' d-none' : '' ?>" data-horario-closed>Loja fechada</button>
                          </div>
                          <button type="button" class="horario-trash" data-horario-delete <?= $aberto ? '' : 'disabled' ?>>
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      <?php endforeach; ?>
                    </div>
                    <input type="hidden" name="horarios_semana" id="horariosSemanaInput" value="<?= htmlspecialchars($horarios_json_raw, ENT_QUOTES, 'UTF-8') ?>">
                    <input type="hidden" name="horario_abertura" id="horarioAbertura" value="<?= htmlspecialchars($horario_abertura) ?>">
                    <input type="hidden" name="horario_fechamento" id="horarioFechamento" value="<?= htmlspecialchars($horario_fechamento) ?>">
                    <div class="horarios-hidden" data-horario-dias-hidden>
                      <?php foreach ($dias_semana_full as $dia_id => $dia_nome): ?>
                        <?php $checked = in_array($dia_id, $dias_func, true) ? 'checked' : ''; ?>
                        <input type="checkbox" name="dias_funcionamento[]" value="<?= $dia_id ?>" <?= $checked ?>>
                      <?php endforeach; ?>
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'pedidos-agendados'): ?>
                  <div class="agendados-modal-body" data-default-inicio="<?= htmlspecialchars($default_horario_inicio) ?>" data-default-fim="<?= htmlspecialchars($default_horario_fim) ?>" data-agendados-dias="<?= htmlspecialchars(json_encode($dias_semana_full), ENT_QUOTES, 'UTF-8') ?>">
                    <div class="agendados-section" data-agendado-section="delivery">
                      <div class="agendados-header">
                        <div class="agendados-title">Delivery</div>
                        <label class="payment-toggle">
                          <input type="hidden" name="agendamento_delivery_ativo" value="0">
                          <input type="checkbox" name="agendamento_delivery_ativo" value="1" <?= $agendamento_delivery_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <p class="agendados-desc">
                        Ao habilitar essa funcao sua loja podera receber pedidos de delivery de forma agendada.
                      </p>
                      <div class="agendados-block">
                        <div class="agendados-pill-group" data-agendado-toggle>
                          <button type="button" class="agendados-pill<?= $agendamento_delivery_min_tipo === 'dias' ? ' active' : '' ?>" data-value="dias">Dias</button>
                          <button type="button" class="agendados-pill<?= $agendamento_delivery_min_tipo === 'horas' ? ' active' : '' ?>" data-value="horas">Horas</button>
                          <input type="hidden" name="agendamento_delivery_min_tipo" value="<?= htmlspecialchars($agendamento_delivery_min_tipo) ?>">
                        </div>
                        <div class="agendados-field">
                          <label>Antecedencia minima <span class="text-danger">*</span></label>
                          <input type="text" name="agendamento_delivery_min_valor" value="<?= htmlspecialchars($agendamento_delivery_min_valor) ?>" data-mask="dias">
                        </div>
                      </div>
                      <div class="agendados-block">
                        <div class="agendados-pill-group" data-agendado-toggle>
                          <button type="button" class="agendados-pill<?= $agendamento_delivery_max_tipo === 'dias' ? ' active' : '' ?>" data-value="dias">Dias</button>
                          <button type="button" class="agendados-pill<?= $agendamento_delivery_max_tipo === 'horas' ? ' active' : '' ?>" data-value="horas">Horas</button>
                          <input type="hidden" name="agendamento_delivery_max_tipo" value="<?= htmlspecialchars($agendamento_delivery_max_tipo) ?>">
                        </div>
                        <div class="agendados-field">
                          <label>Antecedencia maxima <span class="text-danger">*</span></label>
                          <input type="text" name="agendamento_delivery_max_valor" value="<?= htmlspecialchars($agendamento_delivery_max_valor) ?>" data-mask="dias">
                        </div>
                      </div>
                      <div class="agendados-schedule">
                        <div class="agendados-schedule-title">Horario customizado para delivery</div>
                        <p class="agendados-schedule-desc">
                          Crie um horario customizado para sua loja receber pedidos agendados.
                        </p>
                        <div class="horarios-list" data-agendados-list="delivery">
                          <?php foreach ($agendamento_delivery_horarios as $dia_id => $horario_dia): ?>
                            <?php if (!isset($dias_semana_full[$dia_id])) continue; ?>
                            <div class="horario-row" data-agendado-dia="<?= $dia_id ?>">
                              <div class="horario-dia"><?= $dias_semana_full[$dia_id] ?></div>
                              <div class="horario-time">
                                <input type="time" class="horario-input" data-role="inicio" value="<?= htmlspecialchars($horario_dia['inicio']) ?>">
                                <span class="horario-sep">ate</span>
                                <input type="time" class="horario-input" data-role="fim" value="<?= htmlspecialchars($horario_dia['fim']) ?>">
                              </div>
                              <button type="button" class="horario-trash" data-agendado-remove>
                                <i class="bi bi-trash"></i>
                              </button>
                            </div>
                          <?php endforeach; ?>
                        </div>
                        <button type="button" class="agendados-create" data-agendados-add="delivery">Criar horario customizado</button>
                        <input type="hidden" name="agendamento_delivery_horarios" value="<?= htmlspecialchars($agendamento_delivery_horarios_raw, ENT_QUOTES, 'UTF-8') ?>" data-agendados-store="delivery">
                      </div>
                    </div>

                    <div class="agendados-section" data-agendado-section="retirada">
                      <div class="agendados-header">
                        <div class="agendados-title">Retirada</div>
                        <label class="payment-toggle">
                          <input type="hidden" name="agendamento_retirada_ativo" value="0">
                          <input type="checkbox" name="agendamento_retirada_ativo" value="1" <?= $agendamento_retirada_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <p class="agendados-desc">
                        Ao habilitar essa funcao sua loja podera receber pedidos de retirada de forma agendada.
                      </p>
                      <div class="agendados-block">
                        <div class="agendados-pill-group" data-agendado-toggle>
                          <button type="button" class="agendados-pill<?= $agendamento_retirada_min_tipo === 'dias' ? ' active' : '' ?>" data-value="dias">Dias</button>
                          <button type="button" class="agendados-pill<?= $agendamento_retirada_min_tipo === 'horas' ? ' active' : '' ?>" data-value="horas">Horas</button>
                          <input type="hidden" name="agendamento_retirada_min_tipo" value="<?= htmlspecialchars($agendamento_retirada_min_tipo) ?>">
                        </div>
                        <div class="agendados-field">
                          <label>Antecedencia minima <span class="text-danger">*</span></label>
                          <input type="text" name="agendamento_retirada_min_valor" value="<?= htmlspecialchars($agendamento_retirada_min_valor) ?>" data-mask="dias">
                        </div>
                      </div>
                      <div class="agendados-block">
                        <div class="agendados-pill-group" data-agendado-toggle>
                          <button type="button" class="agendados-pill<?= $agendamento_retirada_max_tipo === 'dias' ? ' active' : '' ?>" data-value="dias">Dias</button>
                          <button type="button" class="agendados-pill<?= $agendamento_retirada_max_tipo === 'horas' ? ' active' : '' ?>" data-value="horas">Horas</button>
                          <input type="hidden" name="agendamento_retirada_max_tipo" value="<?= htmlspecialchars($agendamento_retirada_max_tipo) ?>">
                        </div>
                        <div class="agendados-field">
                          <label>Antecedencia maxima <span class="text-danger">*</span></label>
                          <input type="text" name="agendamento_retirada_max_valor" value="<?= htmlspecialchars($agendamento_retirada_max_valor) ?>" data-mask="dias">
                        </div>
                      </div>
                      <div class="agendados-schedule">
                        <div class="agendados-schedule-title">Horario customizado para retirada</div>
                        <p class="agendados-schedule-desc">
                          Crie um horario customizado para sua loja receber pedidos agendados.
                        </p>
                        <div class="horarios-list" data-agendados-list="retirada">
                          <?php foreach ($agendamento_retirada_horarios as $dia_id => $horario_dia): ?>
                            <?php if (!isset($dias_semana_full[$dia_id])) continue; ?>
                            <div class="horario-row" data-agendado-dia="<?= $dia_id ?>">
                              <div class="horario-dia"><?= $dias_semana_full[$dia_id] ?></div>
                              <div class="horario-time">
                                <input type="time" class="horario-input" data-role="inicio" value="<?= htmlspecialchars($horario_dia['inicio']) ?>">
                                <span class="horario-sep">ate</span>
                                <input type="time" class="horario-input" data-role="fim" value="<?= htmlspecialchars($horario_dia['fim']) ?>">
                              </div>
                              <button type="button" class="horario-trash" data-agendado-remove>
                                <i class="bi bi-trash"></i>
                              </button>
                            </div>
                          <?php endforeach; ?>
                        </div>
                        <button type="button" class="agendados-create" data-agendados-add="retirada">Criar horario customizado</button>
                        <input type="hidden" name="agendamento_retirada_horarios" value="<?= htmlspecialchars($agendamento_retirada_horarios_raw, ENT_QUOTES, 'UTF-8') ?>" data-agendados-store="retirada">
                      </div>
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'tipos-pedidos'): ?>
                  <div class="tipos-modal-body">
                    <div class="tipos-card">
                      <div class="tipos-card-head">
                        <div>
                          <div class="tipos-card-title">Receber pedidos de entrega</div>
                          <div class="tipos-card-desc">
                            Seus clientes poderao solicitar pedidos para entrega
                          </div>
                        </div>
                        <label class="payment-toggle">
                          <input type="hidden" name="pedido_entrega_ativo" value="0">
                          <input type="checkbox" name="pedido_entrega_ativo" value="1" <?= $pedido_entrega_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <div class="tipos-field">
                        <label>Tempo minimo estimado para entrega (minutos) <span class="text-danger">*</span></label>
                        <input type="text" name="tempo_entrega_min" value="<?= htmlspecialchars($tempo_entrega_min) ?>" data-mask="dias">
                      </div>
                      <div class="settings-error" data-error="tempo-entrega"></div>
                      <div class="tipos-field">
                        <label>Tempo maximo estimado para entrega (minutos) <span class="text-danger">*</span></label>
                        <input type="text" name="tempo_entrega_max" value="<?= htmlspecialchars($tempo_entrega_max) ?>" data-mask="dias">
                      </div>
                      <div class="tipos-field">
                        <label>Horario de funcionamento da entrega (opcional)</label>
                        <div class="d-flex align-items-center gap-2">
                          <input type="time" class="form-control" style="max-width:140px" name="horario_entrega_ini" value="<?= htmlspecialchars($horario_entrega_ini) ?>">
                          <span>ate</span>
                          <input type="time" class="form-control" style="max-width:140px" name="horario_entrega_fim" value="<?= htmlspecialchars($horario_entrega_fim) ?>">
                        </div>
                        <div class="tipos-card-desc" style="margin-top:6px">
                          Fora desse horario, "Receber pedidos de entrega" e desativado automaticamente. Deixe em branco para nao aplicar horario automatico.
                        </div>
                      </div>
                      <div class="settings-error" data-error="horario-entrega"></div>
                    </div>

                    <div class="tipos-card">
                      <div class="tipos-card-head">
                        <div>
                          <div class="tipos-card-title">Receber pedidos de retirada</div>
                          <div class="tipos-card-desc">
                            Seus clientes poderao solicitar pedidos para retirada no seu local
                          </div>
                        </div>
                        <label class="payment-toggle">
                          <input type="hidden" name="pedido_retirada_ativo" value="0">
                          <input type="checkbox" name="pedido_retirada_ativo" value="1" <?= $pedido_retirada_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                      <div class="tipos-field">
                        <label>Tempo minimo estimado para retirada (minutos) <span class="text-danger">*</span></label>
                        <input type="text" name="tempo_retirada_min" value="<?= htmlspecialchars($tempo_retirada_min) ?>" data-mask="dias">
                      </div>
                      <div class="settings-error" data-error="tempo-retirada"></div>
                      <div class="tipos-field">
                        <label>Tempo maximo estimado para retirada (minutos) <span class="text-danger">*</span></label>
                        <input type="text" name="tempo_retirada_max" value="<?= htmlspecialchars($tempo_retirada_max) ?>" data-mask="dias">
                      </div>
                    </div>

                    <div class="tipos-card">
                      <div class="tipos-card-head">
                        <div>
                          <div class="tipos-card-title">Consumo local</div>
                          <div class="tipos-card-desc">
                            Seus clientes poderao solicitar pedidos para consumir no seu local
                          </div>
                        </div>
                        <label class="payment-toggle">
                          <input type="hidden" name="pedido_local_ativo" value="0">
                          <input type="checkbox" name="pedido_local_ativo" value="1" <?= $pedido_local_ativo === '1' ? 'checked' : '' ?>>
                          <span class="payment-toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'limpar-banco'): ?>
                  <div class="settings-error" data-error="limpar-banco"></div>
                  <div class="settings-form-grid">
                    <div>
                      <label class="form-label" for="limparBancoInicio">Data inicial</label>
                      <input class="form-control" type="date" name="limpar_banco_inicio" id="limparBancoInicio">
                    </div>
                    <div>
                      <label class="form-label" for="limparBancoFim">Data final</label>
                      <input class="form-control" type="date" name="limpar_banco_fim" id="limparBancoFim">
                    </div>
                    <div class="settings-form-span settings-placeholder">
                      Escolha o periodo para limpar os registros do banco.
                    </div>
                    <div class="settings-form-span settings-placeholder text-danger">
                      Esta acao e irreversivel.
                    </div>
                  </div>
                <?php elseif ($card['id'] === 'menu-custom'): ?>
                  <div class="cores-modal-body">
                    <p class="cores-subtitle">
                      Escolha a cor que mais combina com a identidade da sua loja. A cor escolhida
                      será aplicada em todos os botões e ações dentro do menu.
                    </p>
                    <input type="hidden" name="tema_cor_menu" id="temaCorMenuInput" value="<?= htmlspecialchars($tema_cor_menu) ?>">
                    <div class="cores-list" id="coresList">
                      <?php foreach ($coresMenuOptions as $cor): ?>
                        <div class="cores-item<?= strcasecmp($cor['valor'], $tema_cor_menu) === 0 ? ' is-active' : '' ?>" data-cor="<?= htmlspecialchars($cor['valor']) ?>">
                          <span class="cores-swatch" style="background:<?= htmlspecialchars($cor['valor']) ?>"></span>
                          <div class="cores-info">
                            <div class="cores-nome"><?= htmlspecialchars($cor['nome']) ?></div>
                            <div class="cores-desc"><?= htmlspecialchars($cor['desc']) ?></div>
                          </div>
                          <i class="bi bi-check-circle-fill cores-check"></i>
                        </div>
                      <?php endforeach; ?>
                    </div>
                  </div>
                <?php endif; ?>
              </form>
            <?php elseif ($card['id'] === 'pausa'): ?>
              <div class="pausa-modal-body">
                <p class="pausa-desc">
                  Com essa ferramenta, é possível agendar pausas para manutenção, férias ou eventos especiais.
                  Com a pausa programada a loja irá aparecer fechada para seus clientes, sobrepondo o horário
                  de funcionamento da sua loja.
                </p>
                <div class="pausa-illustration">
                  <svg class="pausa-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <rect x="10" y="8" width="6" height="18" rx="3" fill="#1f3a5f"/>
                    <rect x="84" y="8" width="6" height="18" rx="3" fill="#1f3a5f"/>
                    <rect x="8" y="16" width="84" height="76" rx="10" fill="#22416b"/>
                    <rect x="8" y="16" width="84" height="22" rx="10" fill="#1a3257"/>
                    <rect x="8" y="28" width="84" height="10" fill="#1a3257"/>
                    <g fill="#3b5d8c">
                      <rect x="18" y="48" width="12" height="12" rx="3"/>
                      <rect x="36" y="48" width="12" height="12" rx="3"/>
                      <rect x="54" y="48" width="12" height="12" rx="3"/>
                      <rect x="72" y="48" width="12" height="12" rx="3"/>
                      <rect x="18" y="66" width="12" height="12" rx="3"/>
                      <rect x="36" y="66" width="12" height="12" rx="3"/>
                      <rect x="72" y="66" width="12" height="12" rx="3"/>
                    </g>
                    <rect x="54" y="66" width="12" height="12" rx="3" fill="#f43f5e"/>
                  </svg>
                </div>
                <div class="pausa-list" id="pausaList">
                  <div class="pausa-list-empty" id="pausaListEmpty">Nenhuma pausa programada.</div>
                </div>
              </div>
            <?php else: ?>
              <div class="settings-placeholder">Configuracao disponivel em breve.</div>
            <?php endif; ?>
          </div>
          <div class="modal-footer border-0<?= $card['id'] === 'taxa-entrega' ? ' d-none' : '' ?>">
            <?php if ($hasForm): ?>
              <?php if ($card['id'] === 'usuarios'): ?>
                <!-- acoes ficam dentro do corpo do modal (lista/formulario) -->
              <?php elseif ($card['id'] === 'permissoes'): ?>
                <button type="button" class="btn-diggy-primary" id="btnSalvarPermissao">Salvar</button>
              <?php else: ?>
                <?php if ($card['id'] === 'menu-custom'): ?>
                  <button type="button" class="btn-diggy-ghost" data-bs-dismiss="modal">Voltar</button>
                <?php elseif ($card['id'] !== 'horarios'): ?>
                  <button type="button" class="btn-diggy-ghost" data-bs-dismiss="modal">Cancelar</button>
                <?php endif; ?>
                <?php if ($card['id'] === 'limpar-banco'): ?>
                  <button type="button" class="btn-diggy-primary" id="btnLimparBanco">Limpar banco</button>
                <?php elseif ($card['id'] === 'impressao'): ?>
                  <button type="button" class="btn-diggy-primary" id="btnImpressoraAdicionar">Adicionar impressora</button>
                <?php elseif ($card['id'] === 'horarios'): ?>
                  <button type="button" class="btn-diggy-primary" id="btnHorarioCriar">
                    Criar horario de funcionamento
                  </button>
                <?php else: ?>
                  <button type="button" class="btn-diggy-primary" data-modal-save="<?= $modalId ?>">Salvar</button>
                <?php endif; ?>
              <?php endif; ?>
            <?php elseif ($card['id'] === 'pausa'): ?>
              <button type="button" class="btn-diggy-pause" id="btnPausaCriar">Criar pausa programada</button>
            <?php else: ?>
              <button type="button" class="btn-diggy-primary" data-bs-dismiss="modal">Ok</button>
            <?php endif; ?>
          </div>
        </div>
      </div>
    </div>
  <?php endforeach; ?>
<?php endforeach; ?>

<div class="modal fade settings-modal settings-modal--impressora-edit" id="modalImpressoraEditar" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content border-0">
      <div class="modal-header">
        <h5 class="modal-title" id="impressoraEditarTitulo">Adicionando impressora</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="impressoraId" value="">

        <div class="payment-field-group">
          <label class="form-label" for="impressoraNome">Nome <span class="text-danger">*</span></label>
          <input class="form-control" type="text" id="impressoraNome" placeholder="Ex: Cozinha, Caixa 1" required>
        </div>

        <div class="payment-field-group">
          <label class="form-label" for="impressoraSistema">Impressora do sistema <span class="text-danger">*</span></label>
          <select class="form-control" id="impressoraSistema">
            <option value="">Conectando ao QZ Tray...</option>
          </select>
          <button type="button" class="btn-diggy-ghost impressora-btn-atualizar" id="btnImpressoraAtualizarLista">Atualizar lista</button>
        </div>

        <div class="payment-field-group">
          <label class="form-label">Tipo</label>
          <div class="impressora-radio-row">
            <label class="impressora-radio"><input type="radio" name="impressoraTipo" value="nao_fiscal" checked> Não fiscal</label>
            <label class="impressora-radio impressora-radio--disabled"><input type="radio" name="impressoraTipo" value="fiscal" disabled> Fiscal (em breve)</label>
          </div>
        </div>

        <div class="payment-field-group">
          <label class="form-label">Usar para</label>
          <div class="impressora-radio-row">
            <label class="impressora-radio"><input type="radio" name="impressoraUso" value="cozinha" checked> Cozinha</label>
            <label class="impressora-radio"><input type="radio" name="impressoraUso" value="pdv"> PDV</label>
            <label class="impressora-radio"><input type="radio" name="impressoraUso" value="ambos"> Ambos</label>
          </div>
        </div>

        <div class="payment-field-group">
          <label class="form-label">Tamanho do papel</label>
          <div class="impressora-radio-row">
            <label class="impressora-radio"><input type="radio" name="impressoraPapel" value="50mm" checked> 50mm</label>
            <label class="impressora-radio"><input type="radio" name="impressoraPapel" value="80mm"> 80mm</label>
          </div>
        </div>

        <div class="payment-field-group">
          <label class="form-label">Número de cópias</label>
          <div class="impressora-radio-row">
            <label class="impressora-radio"><input type="radio" name="impressoraCopias" value="1" checked> 1</label>
            <label class="impressora-radio"><input type="radio" name="impressoraCopias" value="2"> 2</label>
            <label class="impressora-radio"><input type="radio" name="impressoraCopias" value="3"> 3</label>
            <label class="impressora-radio"><input type="radio" name="impressoraCopias" value="4"> 4</label>
          </div>
        </div>

        <div class="payment-field-group">
          <label class="form-label">Tipo de impressão</label>
          <div class="impressora-radio-row">
            <label class="impressora-radio"><input type="radio" name="impressoraTipoImpressao" value="simples" checked> Simples</label>
            <label class="impressora-radio"><input type="radio" name="impressoraTipoImpressao" value="completa"> Completa</label>
          </div>
          <div class="impressora-tipo-info" id="impressoraTipoInfo"></div>
        </div>

        <div class="payment-card">
          <div class="payment-card-head">
            <div class="payment-card-title">Impressão automática</div>
            <label class="payment-toggle">
              <input type="checkbox" id="impressoraAutomatica">
              <span class="payment-toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-error" id="impressoraEditarErro"></div>
      </div>
      <div class="modal-footer border-0">
        <button type="button" class="btn-diggy-ghost" id="btnImpressoraApagar">Apagar impressora</button>
        <button type="button" class="btn-diggy-ghost" id="btnImpressoraVisualizar">Visualizar</button>
        <button type="button" class="btn-diggy-ghost" id="btnImpressoraTeste">Imprimir teste</button>
        <button type="button" class="btn-diggy-primary" id="btnImpressoraSalvar">Salvar</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade settings-modal" id="modalImpressoraPreview" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0">
      <div class="modal-header">
        <h5 class="modal-title">Pré-visualização do cupom</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <p class="impressora-preview-aviso">Exemplo com dados fictícios, só pra conferir o formato — nada é impresso de verdade aqui.</p>
        <div class="impressora-preview-papel" id="impressoraPreviewConteudo"></div>
      </div>
      <div class="modal-footer border-0">
        <button type="button" class="btn-diggy-primary" data-bs-dismiss="modal">Fechar</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade settings-modal settings-modal--horarios-create" id="modal-horarios-criar" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0">
      <div class="modal-header">
        <h5 class="modal-title">Horario de funcionamento</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="horarios-modal-body">
          <p class="horarios-desc">
            Para definir um horario de atendimento selecione os dias e horarios,
            voce pode definir o mesmo horario para diferentes dias da semana.
          </p>
          <div class="horarios-create-days" id="horariosCreateDays">
            <?php foreach ($dias_semana_full as $dia_id => $dia_nome): ?>
              <button type="button" class="horario-day-pill" data-dia="<?= $dia_id ?>">
                <?= $dia_nome ?>
              </button>
            <?php endforeach; ?>
          </div>
          <div class="horario-create-field">
            <label for="horarioCreateInicio">Horario de abertura <span class="text-danger">*</span></label>
            <input type="time" id="horarioCreateInicio" value="00:00">
          </div>
          <div class="horario-create-field">
            <label for="horarioCreateFim">Horario de fechamento <span class="text-danger">*</span></label>
            <input type="time" id="horarioCreateFim" value="00:00">
          </div>
          <div class="settings-error" id="horarioCreateError"></div>
        </div>
      </div>
      <div class="modal-footer border-0">
        <button type="button" class="btn-diggy-primary" id="btnSalvarHorarioCreate">Salvar</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade settings-modal settings-modal--pausa-create" id="modal-pausa-criar" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0">
      <div class="modal-header">
        <h5 class="modal-title">Criar pausa programada</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="pausa-create-body">
          <div class="pausa-create-field">
            <label for="pausaTitulo">Título da pausa <span class="text-danger">*</span></label>
            <input type="text" class="pausa-input" id="pausaTitulo" maxlength="100" placeholder="Ex.: Natal">
            <div class="pausa-counter" id="pausaTituloCount">0/100</div>
          </div>
          <div class="pausa-calendar-field">
            <label>📅 Data da pausa:</label>
            <div id="pausaCalendar" class="pausa-calendar"></div>
          </div>
          <div class="pausa-create-row">
            <div class="pausa-create-field">
              <label for="pausaHoraInicio">Horário inicial <span class="text-danger">*</span></label>
              <div class="pausa-time-field">
                <input type="time" class="pausa-input" id="pausaHoraInicio" value="00:00">
                <span class="pausa-gmt">GMT-3</span>
              </div>
            </div>
            <div class="pausa-create-field">
              <label for="pausaHoraFim">Horário final <span class="text-danger">*</span></label>
              <div class="pausa-time-field">
                <input type="time" class="pausa-input" id="pausaHoraFim" value="00:00">
                <span class="pausa-gmt">GMT-3</span>
              </div>
            </div>
          </div>
          <div class="settings-error" id="pausaCreateError"></div>
        </div>
      </div>
      <div class="modal-footer border-0">
        <button type="button" class="btn-diggy-pause" id="btnSalvarPausaCreate">Salvar pausa programada</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade settings-modal settings-modal--confirm" id="modal-pausa-excluir" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0">
      <div class="modal-header">
        <h5 class="modal-title">Remover pausa</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <p class="settings-confirm-text">Deseja remover esta pausa programada?</p>
      </div>
      <div class="modal-footer border-0">
        <button type="button" class="btn-diggy-ghost" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="btn-diggy-pause" id="btnConfirmarExcluirPausa">Remover</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL SELO DE VERIFICAÇÃO -->
<div class="modal fade settings-modal" id="modal-selo-verificacao" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0">
      <div class="modal-header">
        <h5 class="modal-title">Selo de verificação</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">

        <?php if ($loja_verificada === '1'): ?>
        <!-- Estado: já verificado -->
        <div class="selo-verificado-state" id="seloEstadoVerificado">
          <div class="selo-check-icon"><i class="bi bi-patch-check-fill"></i></div>
          <div class="selo-verificado-title">Loja verificada!</div>
          <div class="selo-verificado-desc">Seu selo está ativo e visível no cardápio.</div>
          <button type="button" class="btn-diggy-ghost mt-3" onclick="removerVerificacao()">Remover verificação</button>
        </div>
        <?php else: ?>

        <!-- Passo 1: Inserir WhatsApp -->
        <div id="seloStep1">
          <p class="settings-modal-desc">
            Insira o número de WhatsApp cadastrado na criação da sua loja. Você receberá um código de 6 dígitos para confirmar.
          </p>
          <div class="settings-field">
            <label class="settings-label">Número de WhatsApp</label>
            <input type="tel" class="settings-input" id="seloWhatsappInput"
                   placeholder="Ex: 85999999999"
                   value="<?= htmlspecialchars(preg_replace('/\D/', '', $loja_contato_cadastro)) ?>">
            <div class="settings-hint">Apenas dígitos, com DDD. Ex: 85999998888</div>
          </div>
          <div class="settings-error" id="seloStep1Error"></div>
          <button type="button" class="btn-diggy-primary w-100 mt-2" id="btnEnviarCodigo" onclick="seloEnviarCodigo()">
            Verificar
          </button>
        </div>

        <!-- Passo 2: Inserir código (oculto inicialmente) -->
        <div id="seloStep2" style="display:none">
          <div id="seloAvisoInstancia" class="selo-aviso-instancia" style="display:none"></div>
          <p class="settings-modal-desc" id="seloStep2Desc">
            Um código de <strong>6 dígitos</strong> foi enviado para o seu WhatsApp. Digite-o abaixo.
            <span class="selo-timer" id="seloTimer">O código expira em <strong>4:00</strong></span>
          </p>
          <div class="settings-field">
            <label class="settings-label">Código de verificação</label>
            <input type="text" class="settings-input selo-codigo-input" id="seloCodigoInput"
                   maxlength="6" placeholder="000000" autocomplete="one-time-code" inputmode="numeric">
          </div>
          <div class="settings-error" id="seloStep2Error"></div>
          <button type="button" class="btn-diggy-primary w-100 mt-2" id="btnConfirmarCodigo" onclick="seloConfirmarCodigo()">
            Confirmar
          </button>
          <button type="button" class="btn-diggy-ghost w-100 mt-1" onclick="seloVoltarStep1()">Voltar</button>
        </div>

        <?php endif; ?>
      </div>
    </div>
  </div>
</div>

<div id="settingsToast" class="settings-toast" aria-live="polite"></div>

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/pt.js"></script>
<script src="./assets/js/configuracoes.js?v=<?= $configJsVer ?>"></script>
<script>const LOJA_NOME_IMPRESSAO = <?= json_encode($loja_nome, JSON_UNESCAPED_UNICODE) ?>;</script>
<script src="./assets/js/impressoras_config.js?v=<?= $impressorasConfigJsVer ?>"></script>
</body>
</html>

