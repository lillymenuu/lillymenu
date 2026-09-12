<?php
/*
 * Versao JSON do bloco de leitura de admin/configuracoes.php (2486 linhas)
 * para o novo frontend Next.js (/settings), trocando sessao por token
 * Bearer. Consolida todas as chaves de configuracoes usadas pela tela
 * inteira num unico GET, agrupadas por secao.
 *
 * Nota: todo uso de config() aqui passa $lojaId explicitamente (4o
 * parametro) — sem isso, config() cai em $_SESSION['loja_id'] ?? 1, que
 * nunca e setado nesse endpoint (Bearer token, sem sessao PHP), resolvendo
 * sempre a loja errada (mesmo bug ja corrigido em modo_garcom_detalhe.php).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/config.php';
require_once __DIR__ . '/../../helpers/operacao.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['admin_perfil'] = $auth['perfil'];
$_SESSION['loja_id'] = $lojaId;

function cfg(PDO $conn, int $lojaId, string $chave, $default = '') {
  return config($conn, $chave, $default, $lojaId);
}

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$lojaLinkBase = $protocol . $host . '/';
$lojaLinkBaseAntigo = $lojaLinkBase . 'lilly/';

$lojaLink = cfg($conn, $lojaId, 'link_loja', '');
$lojaLinkSlug = $lojaLink;
if (strpos($lojaLink, $lojaLinkBaseAntigo) === 0) {
  $lojaLinkSlug = urldecode(substr($lojaLink, strlen($lojaLinkBaseAntigo)));
} elseif (preg_match('#[?&]loja=([^&]+)#', $lojaLink, $m)) {
  $lojaLinkSlug = urldecode($m[1]);
} elseif (preg_match('#/([^/?]+)/?$#', $lojaLink, $m)) {
  $lojaLinkSlug = $m[1];
}
$lojaLinkSlug = preg_replace('/\.php$/i', '', $lojaLinkSlug);

$horariosSemanaRaw = cfg($conn, $lojaId, 'horarios_semana', '');
$horariosSemana = json_decode((string) $horariosSemanaRaw, true);
$horariosSemana = is_array($horariosSemana) ? $horariosSemana : [];

$horarioAbertura = cfg($conn, $lojaId, 'horario_abertura', '');
$horarioFechamento = cfg($conn, $lojaId, 'horario_fechamento', '');
$diasFuncRaw = cfg($conn, $lojaId, 'dias_funcionamento', '');
$diasFunc = array_filter(array_map('intval', explode(',', (string) $diasFuncRaw)));

$diasSemanaFull = [1 => 'Domingo', 2 => 'Segunda', 3 => 'Terca', 4 => 'Quarta', 5 => 'Quinta', 6 => 'Sexta', 7 => 'Sabado'];
$horariosPorDia = [];
foreach ($diasSemanaFull as $diaId => $diaNome) {
  $horarioDia = null;
  if (isset($horariosSemana[$diaId]) && is_array($horariosSemana[$diaId])) {
    $horarioDia = $horariosSemana[$diaId];
  } elseif (isset($horariosSemana[(string) $diaId]) && is_array($horariosSemana[(string) $diaId])) {
    $horarioDia = $horariosSemana[(string) $diaId];
  } elseif (in_array($diaId, $diasFunc, true) && $horarioAbertura && $horarioFechamento) {
    $horarioDia = ['inicio' => $horarioAbertura, 'fim' => $horarioFechamento];
  }
  if ($horarioDia && (!isset($horarioDia['inicio']) || !isset($horarioDia['fim']))) {
    $horarioDia = null;
  }
  $horariosPorDia[$diaId] = $horarioDia;
}

$defaultHorarioInicio = $horarioAbertura ?: '13:00';
$defaultHorarioFim = $horarioFechamento ?: '19:00';

function normalizarAgendadoHorariosV1(string $raw, array $fallback): array {
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
      $normalizado[$diaId] = ['inicio' => (string) $info['inicio'], 'fim' => (string) $info['fim']];
      continue;
    }
    if (is_array($info) && isset($info['dia'], $info['inicio'], $info['fim'])) {
      $diaId = (int) $info['dia'];
      if ($diaId <= 0) {
        continue;
      }
      $normalizado[$diaId] = ['inicio' => (string) $info['inicio'], 'fim' => (string) $info['fim']];
    }
  }
  return $normalizado ?: $fallback;
}

$agendamentoDefault = [];
foreach ($horariosPorDia as $diaId => $horarioDia) {
  if (!$horarioDia || empty($horarioDia['inicio']) || empty($horarioDia['fim'])) {
    continue;
  }
  $agendamentoDefault[$diaId] = ['inicio' => $horarioDia['inicio'], 'fim' => $horarioDia['fim']];
}
if (!$agendamentoDefault) {
  foreach ([3, 4, 5, 6, 7] as $diaId) {
    $agendamentoDefault[$diaId] = ['inicio' => $defaultHorarioInicio, 'fim' => $defaultHorarioFim];
  }
}

$pagCreditoBandeirasRaw = cfg($conn, $lojaId, 'pagamento_credito_bandeiras', 'visa,mastercard');
$pagCreditoBandeiras = array_values(array_filter(array_map('trim', explode(',', (string) $pagCreditoBandeirasRaw))));
$pagCreditoCustomRaw = cfg($conn, $lojaId, 'pagamento_credito_bandeiras_custom', '[]');
$pagCreditoCustom = json_decode((string) $pagCreditoCustomRaw, true);
$pagCreditoCustom = is_array($pagCreditoCustom) ? $pagCreditoCustom : [];

$pagDebitoBandeirasRaw = cfg($conn, $lojaId, 'pagamento_debito_bandeiras', 'visa,mastercard');
$pagDebitoBandeiras = array_values(array_filter(array_map('trim', explode(',', (string) $pagDebitoBandeirasRaw))));
$pagDebitoCustomRaw = cfg($conn, $lojaId, 'pagamento_debito_bandeiras_custom', '[]');
$pagDebitoCustom = json_decode((string) $pagDebitoCustomRaw, true);
$pagDebitoCustom = is_array($pagDebitoCustom) ? $pagDebitoCustom : [];

$agendDeliveryHorariosRaw = cfg($conn, $lojaId, 'agendamento_delivery_horarios', '');
$agendRetiradaHorariosRaw = cfg($conn, $lojaId, 'agendamento_retirada_horarios', '');
$agendDeliveryHorarios = normalizarAgendadoHorariosV1((string) $agendDeliveryHorariosRaw, $agendamentoDefault);
$agendRetiradaHorarios = normalizarAgendadoHorariosV1((string) $agendRetiradaHorariosRaw, $agendamentoDefault);

echo json_encode([
  'ok' => true,
  'sou_admin_principal' => souAdminPrincipal($conn),
  'loja_link_base' => $lojaLinkBase,
  'loja' => [
    'nome' => cfg($conn, $lojaId, 'nome_loja', ''),
    'contato' => cfg($conn, $lojaId, 'loja_contato', ''),
    'descricao' => cfg($conn, $lojaId, 'loja_descricao', ''),
    'cpf' => cfg($conn, $lojaId, 'cobranca_cpf', ''),
    'cnpj' => cfg($conn, $lojaId, 'loja_cnpj', ''),
    'link' => $lojaLink,
    'link_slug' => $lojaLinkSlug,
    'instagram' => cfg($conn, $lojaId, 'loja_instagram', ''),
    'tiktok' => cfg($conn, $lojaId, 'loja_tiktok', ''),
    'cep' => cfg($conn, $lojaId, 'loja_cep', ''),
    'rua' => cfg($conn, $lojaId, 'loja_rua', ''),
    'numero' => cfg($conn, $lojaId, 'loja_numero', ''),
    'bairro' => cfg($conn, $lojaId, 'loja_bairro', ''),
    'cidade' => cfg($conn, $lojaId, 'loja_cidade', ''),
    'estado' => cfg($conn, $lojaId, 'loja_estado', ''),
    'complemento' => cfg($conn, $lojaId, 'loja_complemento', ''),
    'capa' => cfg($conn, $lojaId, 'loja_capa', ''),
    'perfil' => cfg($conn, $lojaId, 'loja_perfil', ''),
    'verificada' => cfg($conn, $lojaId, 'loja_verificada', '0') === '1',
    'tema_cor_menu' => cfg($conn, $lojaId, 'tema_cor_menu', '#e63770'),
  ],
  'horarios' => [
    'abertura' => $horarioAbertura,
    'fechamento' => $horarioFechamento,
    'dias_funcionamento' => array_values($diasFunc),
    'por_dia' => (object) array_map(fn($h) => $h ?: null, $horariosPorDia),
  ],
  'pagamento' => [
    'dinheiro_ativo' => cfg($conn, $lojaId, 'pagamento_dinheiro_ativo', '1') === '1',
    'pix' => [
      'ativo' => cfg($conn, $lojaId, 'pagamento_pix_ativo', '1') === '1',
      'chave' => cfg($conn, $lojaId, 'pagamento_pix_chave', ''),
      'nome' => cfg($conn, $lojaId, 'pagamento_pix_nome', ''),
    ],
    'credito' => [
      'ativo' => cfg($conn, $lojaId, 'pagamento_credito_ativo', '1') === '1',
      'taxa_ativa' => cfg($conn, $lojaId, 'pagamento_credito_taxa_ativa', '0') === '1',
      'taxa' => (float) cfg($conn, $lojaId, 'pagamento_credito_taxa', '0'),
      'bandeiras' => $pagCreditoBandeiras,
      'bandeiras_custom' => $pagCreditoCustom,
    ],
    'debito' => [
      'ativo' => cfg($conn, $lojaId, 'pagamento_debito_ativo', '1') === '1',
      'taxa_ativa' => cfg($conn, $lojaId, 'pagamento_debito_taxa_ativa', '0') === '1',
      'taxa' => (float) cfg($conn, $lojaId, 'pagamento_debito_taxa', '0'),
      'bandeiras' => $pagDebitoBandeiras,
      'bandeiras_custom' => $pagDebitoCustom,
    ],
    'voucher_ativo' => cfg($conn, $lojaId, 'pagamento_voucher_ativo', '0') === '1',
    'fiado_ativo' => cfg($conn, $lojaId, 'pagamento_fiado_ativo', '0') === '1',
  ],
  'cashback' => [
    'ativo' => cfg($conn, $lojaId, 'cashback_ativo', '0') === '1',
    'expira_dias' => (int) cfg($conn, $lojaId, 'cashback_expira_dias', '20'),
    'carencia_horas' => (int) cfg($conn, $lojaId, 'cashback_carencia_horas', '12'),
    'percentual' => (float) cfg($conn, $lojaId, 'cashback_percentual', '1'),
  ],
  'clube_pontos_ativo' => cfg($conn, $lojaId, 'clube_pontos_ativo', '0') === '1',
  'pedidos' => [
    'receber_pedidos_ativo' => cfg($conn, $lojaId, 'receber_pedidos_ativo', '1') === '1',
    'gestor_pedidos_ativo' => cfg($conn, $lojaId, 'gestor_pedidos_ativo', '1') === '1',
    'notificar_pedido_whatsapp_ativo' => cfg($conn, $lojaId, 'notificar_pedido_whatsapp_ativo', '1') === '1',
    'aceite_automatico_diggy_ativo' => cfg($conn, $lojaId, 'aceite_automatico_diggy_ativo', '0') === '1',
    'whatsapp_numero' => cfg($conn, $lojaId, 'whatsapp_numero', ''),
    'entrega' => [
      'ativo' => cfg($conn, $lojaId, 'pedido_entrega_ativo', '1') === '1',
      'tempo_min' => (int) cfg($conn, $lojaId, 'tempo_entrega_min', '30'),
      'tempo_max' => (int) cfg($conn, $lojaId, 'tempo_entrega_max', '40'),
      'horario_ini' => cfg($conn, $lojaId, 'horario_entrega_ini', ''),
      'horario_fim' => cfg($conn, $lojaId, 'horario_entrega_fim', ''),
    ],
    'retirada' => [
      'ativo' => cfg($conn, $lojaId, 'pedido_retirada_ativo', '1') === '1',
      'tempo_min' => (int) cfg($conn, $lojaId, 'tempo_retirada_min', '15'),
      'tempo_max' => (int) cfg($conn, $lojaId, 'tempo_retirada_max', '30'),
    ],
    'local_ativo' => cfg($conn, $lojaId, 'pedido_local_ativo', '0') === '1',
    'pedido_minimo_entrega_ativo' => cfg($conn, $lojaId, 'pedido_minimo_entrega_ativo', '0') === '1',
    'pedido_minimo_entrega' => (float) cfg($conn, $lojaId, 'pedido_minimo_entrega', '0'),
    'pedido_minimo_retirada_ativo' => cfg($conn, $lojaId, 'pedido_minimo_retirada_ativo', '0') === '1',
    'pedido_minimo_retirada' => (float) cfg($conn, $lojaId, 'pedido_minimo_retirada', '0'),
  ],
  'agendamento' => [
    'delivery' => [
      'ativo' => cfg($conn, $lojaId, 'agendamento_delivery_ativo', '0') === '1',
      'min_tipo' => cfg($conn, $lojaId, 'agendamento_delivery_min_tipo', 'dias'),
      'min_valor' => (int) cfg($conn, $lojaId, 'agendamento_delivery_min_valor', '1'),
      'max_tipo' => cfg($conn, $lojaId, 'agendamento_delivery_max_tipo', 'dias'),
      'max_valor' => (int) cfg($conn, $lojaId, 'agendamento_delivery_max_valor', '30'),
      'horarios' => is_array($agendDeliveryHorarios) ? $agendDeliveryHorarios : new stdClass(),
    ],
    'retirada' => [
      'ativo' => cfg($conn, $lojaId, 'agendamento_retirada_ativo', '0') === '1',
      'min_tipo' => cfg($conn, $lojaId, 'agendamento_retirada_min_tipo', 'dias'),
      'min_valor' => (int) cfg($conn, $lojaId, 'agendamento_retirada_min_valor', '1'),
      'max_tipo' => cfg($conn, $lojaId, 'agendamento_retirada_max_tipo', 'dias'),
      'max_valor' => (int) cfg($conn, $lojaId, 'agendamento_retirada_max_valor', '30'),
      'horarios' => is_array($agendRetiradaHorarios) ? $agendRetiradaHorarios : new stdClass(),
    ],
  ],
  'taxa_entrega' => [
    'tipo' => cfg($conn, $lojaId, 'taxa_entrega_tipo', 'dinamica'),
    'gratis' => cfg($conn, $lojaId, 'taxa_entrega_gratis', '0') === '1',
    'fixa' => [
      'valor' => (float) cfg($conn, $lojaId, 'taxa_entrega', '0'),
      'tempo_min' => (int) cfg($conn, $lojaId, 'taxa_entrega_tempo_min', '40'),
      'tempo_max' => (int) cfg($conn, $lojaId, 'taxa_entrega_tempo_max', '60'),
    ],
  ],
  'whatsapp' => [
    'numero' => cfg($conn, $lojaId, 'whatsapp_numero', ''),
    'msg' => cfg($conn, $lojaId, 'whatsapp_msg', ''),
  ],
  'versiculo_dashboard_ativo' => cfg($conn, $lojaId, 'versiculo_dashboard_ativo', '1') === '1',
  'horarios_semana' => $horariosSemana ?: new stdClass(),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
