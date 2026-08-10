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

    <div class="pay-pix-auto-box" id="pixAutoBox">
      <button type="button" class="pay-btn" id="pixAutoBtn">Pagar com Pix</button>
      <div class="pay-pix-auto-loading" id="pixAutoLoading" style="display:none">Gerando Pix...</div>
      <div class="pay-pix-auto-erro" id="pixAutoErro" style="display:none"></div>
      <div class="pay-pix-auto-resultado" id="pixAutoResultado" style="display:none">
        <img class="pay-pix-qr" id="pixAutoQrImg" alt="QR Code Pix">
        <div class="pay-pix-row">
          <span class="pay-pix-chave" id="pixAutoCopiaECola"></span>
          <button type="button" class="pay-pix-copy" id="pixAutoCopiarBtn">Copiar</button>
        </div>
        <div class="pay-pix-auto-status" id="pixAutoStatus">Aguardando confirmação do pagamento...</div>
      </div>
      <div class="pay-pix-auto-sucesso" id="pixAutoSucesso" style="display:none">Pagamento confirmado! Redirecionando...</div>
    </div>

    <button type="button" class="pay-toggle-manual" id="pagamentoManualToggle">Prefere pagar de outro jeito?</button>
    <div class="pay-manual-section" id="pagamentoManualSection" style="display:none">
      <?php if ($saasPixChave !== ''): ?>
      <div class="pay-pix-box">
        <div class="pay-pix-label">Chave PIX para pagamento</div>
        <div class="pay-pix-row">
          <span class="pay-pix-chave" id="pixChave"><?= htmlspecialchars($saasPixChave) ?></span>
          <button type="button" class="pay-pix-copy" onclick="copiarPix()">Copiar</button>
        </div>
        <?php if ($saasPixNome !== ''): ?>
          <div class="pay-pix-nome">Favorecido: <?= htmlspecialchars($saasPixNome) ?></div>
        <?php endif; ?>
      </div>
      <?php endif; ?>

      <?php if ($uploadMsg === 'enviado'): ?>
        <div class="pay-alert pay-alert-ok">Comprovante enviado com sucesso! Aguarde a aprovação.</div>
      <?php elseif ($uploadMsg === 'erro'): ?>
        <div class="pay-alert pay-alert-erro">Não foi possível enviar o comprovante. Verifique o arquivo (imagem ou PDF, até 5MB) e tente novamente.</div>
      <?php endif; ?>

      <?php if ($comprovanteEnviado): ?>
        <div class="pay-comprovante-status">
          <div>Comprovante enviado em <?= date('d/m/Y \à\s H:i', strtotime($cobrancaPendente['comprovante_enviado_em'])) ?> — aguardando aprovação.</div>
          <?php if (!empty($cobrancaPendente['motivo_rejeicao'])): ?>
            <div class="pay-comprovante-motivo">Motivo da última rejeição: <?= htmlspecialchars($cobrancaPendente['motivo_rejeicao']) ?></div>
          <?php endif; ?>
        </div>
      <?php elseif ($cobrancaPendente): ?>
        <?php if (!empty($cobrancaPendente['motivo_rejeicao'])): ?>
          <div class="pay-alert pay-alert-erro">Comprovante anterior rejeitado: <?= htmlspecialchars($cobrancaPendente['motivo_rejeicao']) ?></div>
        <?php endif; ?>
        <form class="pay-upload-form" method="POST" action="api/pagamento_comprovante_upload.php" enctype="multipart/form-data">
          <label class="pay-upload-label" for="comprovanteArquivo">Enviar comprovante (imagem ou PDF, até 5MB)</label>
          <input class="pay-upload-input" type="file" id="comprovanteArquivo" name="comprovante" accept=".jpg,.jpeg,.png,.webp,.pdf" required>
          <button class="pay-btn" type="submit">Enviar comprovante</button>
        </form>
      <?php endif; ?>

      <a class="pay-btn pay-btn-outline" href="<?= htmlspecialchars($whatsLink) ?>" target="_blank" rel="noopener">Enviar comprovante no WhatsApp</a>
    </div>

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
<script>
function copiarPix(){
  const el = document.getElementById('pixChave');
  navigator.clipboard.writeText(el.textContent.trim()).then(() => {
    const btn = document.querySelector('.pay-pix-copy');
    const original = btn.textContent;
    btn.textContent = 'Copiado!';
    setTimeout(() => { btn.textContent = original; }, 1500);
  });
}

document.getElementById('pagamentoManualToggle')?.addEventListener('click', () => {
  const secao = document.getElementById('pagamentoManualSection');
  secao.style.display = secao.style.display === 'none' ? 'block' : 'none';
});

(function () {
  const btn = document.getElementById('pixAutoBtn');
  const loading = document.getElementById('pixAutoLoading');
  const erroEl = document.getElementById('pixAutoErro');
  const resultado = document.getElementById('pixAutoResultado');
  const qrImg = document.getElementById('pixAutoQrImg');
  const copiaECola = document.getElementById('pixAutoCopiaECola');
  const copiarBtn = document.getElementById('pixAutoCopiarBtn');
  const statusEl = document.getElementById('pixAutoStatus');
  const sucessoEl = document.getElementById('pixAutoSucesso');
  if (!btn) return;

  let pollTimer = null;

  copiarBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(copiaECola.textContent.trim()).then(() => {
      const original = copiarBtn.textContent;
      copiarBtn.textContent = 'Copiado!';
      setTimeout(() => { copiarBtn.textContent = original; }, 1500);
    });
  });

  function verificarStatus(cobrancaId) {
    fetch('api/pagamento_pix_status.php?cobranca_id=' + cobrancaId)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.pago) {
          clearInterval(pollTimer);
          resultado.style.display = 'none';
          sucessoEl.style.display = 'block';
          setTimeout(() => { window.location.reload(); }, 1500);
        }
      })
      .catch(() => {});
  }

  btn.addEventListener('click', () => {
    btn.style.display = 'none';
    erroEl.style.display = 'none';
    loading.style.display = 'block';

    fetch('api/pagamento_pix_criar.php', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        loading.style.display = 'none';
        if (!data.ok) {
          erroEl.textContent = data.msg || 'Erro ao gerar o Pix.';
          erroEl.style.display = 'block';
          btn.style.display = 'block';
          return;
        }
        qrImg.src = 'data:image/png;base64,' + data.qr_code_base64;
        copiaECola.textContent = data.qr_code;
        resultado.style.display = 'block';
        clearInterval(pollTimer);
        pollTimer = setInterval(() => verificarStatus(data.cobranca_id), 5000);
      })
      .catch(() => {
        loading.style.display = 'none';
        erroEl.textContent = 'Erro ao gerar o Pix.';
        erroEl.style.display = 'block';
        btn.style.display = 'block';
      });
  });
})();
</script>
</body>
</html>
