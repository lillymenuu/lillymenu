<?php
/*
 * Dados do dashboard do superadmin (Next.js): mesmos calculos de
 * admin/superadmin/dashboard.php, devolvidos em JSON.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/superadmin_auth.php';
require_once __DIR__ . '/../../helpers/gerenciamento_module.php';
require_once __DIR__ . '/../../helpers/suporte_chat.php';
require_once __DIR__ . '/../../superadmin/helpers.php';

header('Content-Type: application/json; charset=utf-8');

$auth = apiSuperadminExigir($conn);

gerenciamentoEnsureModule($conn);
suporteGarantirTabelas($conn);

$lojas = buscarLojasComDetalhes($conn);
$hoje = new DateTime('today');

$totalAtivas = 0;
$totalTrial = 0;
$expira7 = 0;
$expira15 = 0;
$expira30 = 0;
$expiradas = 0;
$comprovantesPendentes = 0;
$receitaMes = 0.0;

foreach ($lojas as &$l) {
  $l = resolverStatusLoja($l, $hoje);
  $status = $l['status_resolvido'];

  $hasAccess = ($status === 'ativa');
  if (!$l['status'] && !empty($l['ativo'])) {
    $hasAccess = true;
  }
  if ($hasAccess) {
    $totalAtivas++;
    $receitaMes += (float) ($l['plano_valor'] ?? 0);
  }
  if (!empty($l['comprovante_arquivo']) && in_array($l['cobranca_status'] ?? '', ['pendente', 'atrasado'], true)) {
    $comprovantesPendentes++;
  }
  if ($l['is_trial_periodo'] || $status === 'trial') {
    $totalTrial++;
  }
  if ($l['expira_dias'] !== null) {
    if ($l['expira_dias'] < 0) {
      $expiradas++;
    } else {
      if ($l['expira_dias'] <= 7) $expira7++;
      if ($l['expira_dias'] <= 15) $expira15++;
      if ($l['expira_dias'] <= 30) $expira30++;
    }
  }
}
unset($l);

/* Novas lojas por mes — ultimos 12 meses corridos (meses sem cadastro = 0). */
$porMes = [];
try {
  $stmt = $conn->query("SELECT DATE_FORMAT(criado_em, '%Y-%m') AS mes, COUNT(*) AS total FROM lojas GROUP BY mes");
  foreach ($stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [] as $row) {
    $porMes[$row['mes']] = (int) $row['total'];
  }
} catch (Exception $e) {
}
$cadastros = [];
$cursor = new DateTime('first day of this month');
$cursor->modify('-11 months');
for ($i = 0; $i < 12; $i++) {
  $chave = $cursor->format('Y-m');
  $cadastros[] = ['mes' => $chave, 'total' => $porMes[$chave] ?? 0];
  $cursor->modify('+1 month');
}

$leads = array_map(function ($lead) {
  return [
    'id'        => (int) $lead['id'],
    'nome'      => (string) ($lead['nome'] ?: ($lead['empresa'] ?? 'Lead')),
    'contato'   => (string) ($lead['email'] ?: ($lead['whatsapp'] ?? '')),
    'criado_em' => $lead['criado_em'] ?? null,
  ];
}, array_slice(buscarLeadsRecentes($conn), 0, 5));

$destaque = $lojas;
usort($destaque, fn($a, $b) => (float) ($b['plano_valor'] ?? 0) <=> (float) ($a['plano_valor'] ?? 0));
$destaque = array_map(function ($l) {
  return [
    'id'     => (int) $l['id'],
    'nome'   => (string) ($l['nome'] ?? 'Loja'),
    'plano'  => (string) ($l['plano_nome'] ?? 'Sem plano'),
    'valor'  => (float) ($l['plano_valor'] ?? 0),
    'status' => (string) $l['status_resolvido'],
  ];
}, array_slice($destaque, 0, 5));

$suporteNaoLidas = 0;
try {
  $suporteNaoLidas = (int) $conn->query("SELECT COUNT(*) FROM suporte_mensagens WHERE remetente = 'loja' AND lida_suporte = 0")->fetchColumn();
} catch (Exception $e) {
}

$totalLojas = count($lojas);

echo json_encode([
  'ok'    => true,
  'admin' => ['nome' => $auth['nome']],
  'kpis'  => [
    'total_lojas'            => $totalLojas,
    'lojas_ativas'           => $totalAtivas,
    'receita_mes'            => round($receitaMes, 2),
    'lojas_trial'            => $totalTrial,
    'expira_7'               => $expira7,
    'expira_15'              => $expira15,
    'expira_30'              => $expira30,
    'expiradas'              => $expiradas,
    'comprovantes_pendentes' => $comprovantesPendentes,
    'outras'                 => max(0, $totalLojas - $totalAtivas - $totalTrial - $expiradas),
    'suporte_nao_lidas'      => $suporteNaoLidas,
  ],
  'cadastros_mes' => $cadastros,
  'leads'         => $leads,
  'destaque'      => $destaque,
], JSON_UNESCAPED_UNICODE);
