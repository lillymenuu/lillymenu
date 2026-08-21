<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/gerenciamento_module.php';
require_once __DIR__ . '/helpers/mercadopago.php';

gerenciamentoEnsureModule($conn);
garantirMercadopagoColunas($conn);

$lojaId = (int) ($_SESSION['loja_id'] ?? 0);
$lojaNome = config($conn, 'nome_loja', 'Minha loja');

$stmt = $conn->prepare("SELECT id, status, trial_fim, ciclo_fim, plano_id FROM assinaturas WHERE loja_id = ? ORDER BY id DESC LIMIT 1");
$stmt->execute([$lojaId]);
$assinatura = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

$stmt = $conn->prepare("SELECT nome, valor FROM planos WHERE id = ? LIMIT 1");
$stmt->execute([(int)($assinatura['plano_id'] ?? 1)]);
$plano = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['nome'=>'Mensal','valor'=>50.00];

$status = $assinatura['status'] ?? 'trial';
$trialFim = $assinatura['trial_fim'] ?? null;
$cicloFim = $assinatura['ciclo_fim'] ?? null;

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
$comprovanteEnviado = $cobrancaPendente && !empty($cobrancaPendente['comprovante_arquivo']);

$historicoPagamentos = [];
if (!empty($assinatura['id'])) {
  $stmt = $conn->prepare("
    SELECT valor, status, origem, vencimento, pago_em, criado_em
    FROM cobrancas
    WHERE assinatura_id = ?
    ORDER BY id DESC
  ");
  $stmt->execute([(int) $assinatura['id']]);
  $historicoPagamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$stmt = $conn->prepare("SELECT chave, valor FROM configuracoes WHERE loja_id = 0 AND chave IN ('saas_pix_chave','saas_pix_nome','saas_whatsapp_numero')");
$stmt->execute();
$saasCfg = [];
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
  $saasCfg[$row['chave']] = $row['valor'];
}
$saasPixChave = $saasCfg['saas_pix_chave'] ?? '';
$saasPixNome = $saasCfg['saas_pix_nome'] ?? '';
$whatsNumeroSuporte = $saasCfg['saas_whatsapp_numero'] ?? '5585985049577';

$msgComprovante = "Ola, segue o comprovante do pagamento da mensalidade da loja {$lojaNome}.";
$whatsLink = 'https://wa.me/' . $whatsNumeroSuporte . '?text=' . urlencode($msgComprovante);
$pagamentoCssVer = filemtime(__DIR__ . '/assets/css/pagamento.css');

$uploadMsg = $_GET['msg'] ?? '';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pagamento pendente</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="./assets/css/pagamento.css?v=<?= $pagamentoCssVer ?>" rel="stylesheet">
</head>
<body>
<div class="pay-wrap">
  <div class="pay-card">
    <div class="pay-title">Pagamento pendente</div>
    <div class="pay-sub">Sua loja <strong><?= htmlspecialchars($lojaNome) ?></strong> precisa regularizar o acesso.</div>
    <div class="pay-row"><span>Plano</span><strong><?= htmlspecialchars($plano['nome']) ?></strong></div>
    <div class="pay-row"><span>Valor mensal</span><strong>R$ <?= number_format((float)$plano['valor'],2,',','.') ?></strong></div>
    <div class="pay-row"><span>Status</span><span class="pay-status">PIX pendente</span></div>
    <?php if ($status === 'trial' && $trialFim): ?>
      <div class="pay-row"><span>Trial até</span><strong><?= date('d/m/Y', strtotime($trialFim)) ?></strong></div>
    <?php elseif ($cicloFim): ?>
      <div class="pay-row"><span>Acesso até</span><strong><?= date('d/m/Y', strtotime($cicloFim)) ?></strong></div>
    <?php endif; ?>
    <div class="pay-note">Pague com Pix e seu acesso e liberado automaticamente assim que o pagamento for confirmado.</div>

    <?php include __DIR__ . '/partials/renovacao_pagamento.php'; ?>

    <?php if ($historicoPagamentos): ?>
    <div class="pay-historico">
      <div class="pay-historico-titulo">Histórico de pagamentos</div>
      <?php foreach ($historicoPagamentos as $h): ?>
        <div class="pay-historico-item">
          <div>
            <div class="pay-historico-valor">R$ <?= number_format((float) $h['valor'], 2, ',', '.') ?></div>
            <div class="pay-historico-meta">
              <?= $h['origem'] === 'mercadopago' ? 'Pix automático' : 'Comprovante manual' ?>
              &middot;
              <?= $h['pago_em'] ? 'pago em ' . date('d/m/Y', strtotime($h['pago_em'])) : 'vencimento ' . date('d/m/Y', strtotime($h['vencimento'])) ?>
            </div>
          </div>
          <span class="pay-historico-badge pay-historico-badge--<?= htmlspecialchars($h['status']) ?>"><?= htmlspecialchars($h['status']) ?></span>
        </div>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </div>
</div>
</body>
</html>
