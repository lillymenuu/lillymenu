<?php
/*
 * Lista de lojas + leads + planos + configuracoes do SaaS para a tela
 * "Lojas" do superadmin (Next.js). Mesmos dados de admin/superadmin/configuracoes.php.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/superadmin_auth.php';
require_once __DIR__ . '/../../helpers/gerenciamento_module.php';
require_once __DIR__ . '/../../superadmin/helpers.php';

header('Content-Type: application/json; charset=utf-8');

apiSuperadminExigir($conn);
gerenciamentoEnsureModule($conn);

$planos = [];
try {
  $stmt = $conn->query("SELECT id, nome, valor, recursos_json FROM planos WHERE ativo = 1 ORDER BY (landing_slug IS NULL), landing_slug ASC");
  foreach ($stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [] as $p) {
    $decoded = $p['recursos_json'] !== null ? json_decode((string) $p['recursos_json'], true) : null;
    $planos[] = [
      'id'       => (int) $p['id'],
      'nome'     => (string) $p['nome'],
      'valor'    => (float) $p['valor'],
      /* null = plano sem restricao de recursos */
      'recursos' => is_array($decoded) ? array_values($decoded) : null,
    ];
  }
} catch (Exception $e) {
}

$recursosCategorias = [
  'Dia a dia'    => ['menu.pdv' => 'PDV (venda balcão)', 'menu.gestor_pedidos' => 'Gestor de pedidos', 'menu.pedidos' => 'Lista de pedidos', 'menu.orcamentos' => 'Orçamentos', 'menu.motoboys' => 'Motoboys', 'menu.modo_garcom' => 'Modo Garçom'],
  'Catálogo'     => ['menu.produtos' => 'Produtos', 'menu.promo' => 'Promoções', 'menu.estoque' => 'Estoque'],
  'Clientes'     => ['menu.clientes' => 'Clientes (CRM)', 'menu.relatorios_fidelidade' => 'Fidelidade', 'menu.cupons' => 'Cupons'],
  'Financeiro'   => ['menu.controle_caixa' => 'Controle de caixa', 'menu.controle_fiado' => 'Controle de fiado', 'menu.financeiro' => 'Financeiro'],
  'Relatórios'   => ['menu.relatorios' => 'Relatórios (vendas)', 'menu.relatorio_cross_sell' => 'Relatório de Cross-sell'],
  'Comunicação'  => ['menu.whatslilly' => 'WhatsLilly', 'menu.lista_transmissao' => 'Lista de Transmissão'],
  'Sistema'      => ['menu.configuracoes' => 'Configurações', 'menu.cross_sell_config' => 'Configurações do Cross-sell'],
];
$categorias = [];
foreach ($recursosCategorias as $titulo => $itens) {
  $categorias[] = [
    'titulo' => $titulo,
    'itens'  => array_map(fn($k, $v) => ['chave' => $k, 'label' => $v], array_keys($itens), array_values($itens)),
  ];
}

$cfg = ['pix_chave' => '', 'pix_nome' => '', 'whats_numero' => '', 'nominatim_ativo' => false];
try {
  $stmt = $conn->query("SELECT chave, valor FROM configuracoes WHERE loja_id = 0 AND chave IN ('saas_pix_chave','saas_pix_nome','saas_whatsapp_numero','saas_nominatim_ativo')");
  foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    if ($row['chave'] === 'saas_pix_chave') $cfg['pix_chave'] = (string) $row['valor'];
    if ($row['chave'] === 'saas_pix_nome') $cfg['pix_nome'] = (string) $row['valor'];
    if ($row['chave'] === 'saas_whatsapp_numero') $cfg['whats_numero'] = (string) $row['valor'];
    if ($row['chave'] === 'saas_nominatim_ativo') $cfg['nominatim_ativo'] = $row['valor'] === '1';
  }
} catch (Exception $e) {
}

$hoje = new DateTime('today');
$lojas = array_map(function ($l) use ($hoje) {
  $l = resolverStatusLoja($l, $hoje);
  $temComprovante = !empty($l['comprovante_arquivo']);
  $cobStatus = (string) ($l['cobranca_status'] ?? '');
  return [
    'id'            => (int) $l['id'],
    'nome'          => (string) ($l['nome'] ?? ''),
    'ativo'         => (bool) ($l['ativo'] ?? false),
    'criado_em'     => $l['criado_em'] ?? null,
    'status'        => (string) $l['status_resolvido'],
    'em_teste'      => (bool) ($l['is_trial_periodo'] || $l['status_resolvido'] === 'trial'),
    'trial_inicio'  => $l['trial_inicio'] ?? null,
    'trial_fim'     => $l['trial_fim'] ?? null,
    'expira_em'     => $l['expira_em'] ?? null,
    'expira_dias'   => $l['expira_dias'],
    'contato'       => (string) ($l['loja_contato'] ?? ''),
    'admin'         => [
      'id'      => (int) ($l['admin_id'] ?? 0),
      'nome'    => (string) ($l['admin_nome'] ?? ''),
      'email'   => (string) ($l['admin_email'] ?? ''),
      'usuario' => (string) ($l['admin_usuario'] ?? ''),
    ],
    'plano_id'      => (int) ($l['plano_id'] ?? 0),
    'plano_nome'    => $l['plano_nome'] ?? null,
    'plano_valor'   => $l['plano_valor'] !== null ? (float) $l['plano_valor'] : null,
    'plano_desejado' => empty($l['status']) ? ($l['plano_desejado_nome'] ?? null) : null,
    'cobranca'      => [
      'id'               => (int) ($l['cobranca_id'] ?? 0),
      'status'           => $cobStatus,
      'valor'            => $l['cobranca_valor'] !== null ? (float) $l['cobranca_valor'] : null,
      'vencimento'       => $l['cobranca_vencimento'] ?? null,
      'comprovante'      => $temComprovante ? (string) $l['comprovante_arquivo'] : null,
      'comprovante_em'   => $l['comprovante_enviado_em'] ?? null,
      'motivo_rejeicao'  => $l['motivo_rejeicao'] ?? null,
      'aguardando_revisao' => $temComprovante && in_array($cobStatus, ['pendente', 'atrasado'], true),
      'aprovado'         => $temComprovante && $cobStatus === 'pago',
    ],
  ];
}, buscarLojasComDetalhes($conn));

$leads = array_map(function ($lead) {
  return [
    'id'        => (int) $lead['id'],
    'criado_em' => $lead['criado_em'] ?? null,
    'nome'      => (string) ($lead['nome'] ?? ''),
    'empresa'   => (string) ($lead['empresa'] ?? ''),
    'email'     => (string) ($lead['email'] ?? ''),
    'whatsapp'  => (string) ($lead['whatsapp'] ?? ''),
    'cnpj'      => (string) ($lead['cnpj'] ?? ''),
    'cep'       => (string) ($lead['cep'] ?? ''),
    'cidade'    => (string) ($lead['cidade'] ?? ''),
    'estado'    => (string) ($lead['estado'] ?? ''),
    'segmento'  => (string) ($lead['segmento'] ?? ''),
  ];
}, buscarLeadsRecentes($conn));

echo json_encode([
  'ok'         => true,
  'lojas'      => $lojas,
  'leads'      => $leads,
  'planos'     => $planos,
  'categorias' => $categorias,
  'config'     => $cfg,
], JSON_UNESCAPED_UNICODE);
