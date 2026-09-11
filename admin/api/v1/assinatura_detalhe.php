<?php
/*
 * Versao JSON de admin/plan-details.php (bloco PHP inicial) para o novo
 * frontend Next.js (/plan-details), trocando sessao por token Bearer.
 * Consolida num unico GET tudo que o legado calculava inline: assinatura
 * atual, plano atual, cobranca pendente (pro bloco de renovacao Pix),
 * planos disponiveis pra upgrade, config Pix da SaaS e perfil de cobranca.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/config.php';
require_once __DIR__ . '/../../helpers/gerenciamento_module.php';
require_once __DIR__ . '/../../helpers/mercadopago.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

gerenciamentoEnsureModule($conn);
garantirMercadopagoColunas($conn);

$lojaNome = config($conn, 'nome_loja', 'Minha loja');

$stmt = $conn->prepare("SELECT id, status, trial_inicio, trial_fim, ciclo_inicio, ciclo_fim, plano_id, criado_em FROM assinaturas WHERE loja_id = ? ORDER BY id DESC LIMIT 1");
$stmt->execute([$lojaId]);
$assinatura = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

$stmt = $conn->prepare("SELECT id, nome, valor FROM planos WHERE id = ? LIMIT 1");
$stmt->execute([(int) ($assinatura['plano_id'] ?? 1)]);
$plano = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['id' => 0, 'nome' => 'Mensal', 'valor' => 50.00];

$status = strtolower(trim((string) ($assinatura['status'] ?? 'trial')));
if ($status === 'ativo') {
  $status = 'ativa';
}

$assinaturaDesde = $assinatura['ciclo_inicio'] ?? ($assinatura['trial_inicio'] ?? ($assinatura['criado_em'] ?? null));

$cobrancaPendente = null;
if (!empty($assinatura['id'])) {
  $stmt = $conn->prepare("
    SELECT id, valor, vencimento, status, comprovante_arquivo, comprovante_enviado_em, motivo_rejeicao
    FROM cobrancas
    WHERE assinatura_id = ? AND status IN ('pendente','atrasado')
    ORDER BY id DESC LIMIT 1
  ");
  $stmt->execute([(int) $assinatura['id']]);
  $cobrancaPendente = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

$stmt = $conn->prepare("SELECT chave, valor FROM configuracoes WHERE loja_id = 0 AND chave IN ('saas_pix_chave','saas_pix_nome','saas_whatsapp_numero')");
$stmt->execute();
$saasCfg = [];
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
  $saasCfg[$row['chave']] = $row['valor'];
}

// Planos disponiveis pra troca — so upgrade (valor maior que o plano atual).
// Reduzir de plano nao e self-service: precisa passar pelo suporte, pra evitar
// downgrade acidental que corta recursos que a loja ja esta usando.
$stmt = $conn->prepare("SELECT id, nome, valor FROM planos WHERE ativo = 1 AND landing_slug IS NOT NULL AND id <> ? AND valor > ? ORDER BY valor ASC");
$stmt->execute([(int) ($assinatura['plano_id'] ?? 0), (float) $plano['valor']]);
$planosDisponiveis = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("SELECT chave, valor FROM configuracoes WHERE loja_id = ? AND chave IN ('cobranca_cpf','cobranca_telefone')");
$stmt->execute([$lojaId]);
$perfilCfg = [];
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
  $perfilCfg[$row['chave']] = $row['valor'];
}

echo json_encode([
  'ok' => true,
  'assinatura' => [
    'id' => (int) ($assinatura['id'] ?? 0),
    'status' => $status,
    'trial_fim' => $assinatura['trial_fim'] ?? null,
    'ciclo_fim' => $assinatura['ciclo_fim'] ?? null,
  ],
  'plano' => [
    'id' => (int) $plano['id'],
    'nome' => $plano['nome'],
    'valor' => (float) $plano['valor'],
  ],
  'assinatura_desde' => $assinaturaDesde,
  'loja_nome' => $lojaNome,
  'cobranca_pendente' => $cobrancaPendente ? [
    'id' => (int) $cobrancaPendente['id'],
    'valor' => (float) $cobrancaPendente['valor'],
    'vencimento' => $cobrancaPendente['vencimento'],
    'status' => $cobrancaPendente['status'],
    'comprovante_arquivo' => $cobrancaPendente['comprovante_arquivo'],
    'comprovante_enviado_em' => $cobrancaPendente['comprovante_enviado_em'],
    'motivo_rejeicao' => $cobrancaPendente['motivo_rejeicao'],
  ] : null,
  'planos_disponiveis' => array_map(function ($p) {
    return ['id' => (int) $p['id'], 'nome' => $p['nome'], 'valor' => (float) $p['valor']];
  }, $planosDisponiveis),
  'perfil_cobranca' => [
    'cpf' => $perfilCfg['cobranca_cpf'] ?? '',
    'telefone' => $perfilCfg['cobranca_telefone'] ?? '',
  ],
  'saas' => [
    'pix_chave' => $saasCfg['saas_pix_chave'] ?? '',
    'pix_nome' => $saasCfg['saas_pix_nome'] ?? '',
    'whatsapp_numero' => $saasCfg['saas_whatsapp_numero'] ?? '5585985049577',
  ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
