<?php
/**
 * Bloco de renovacao (Pix automatico via Mercado Pago + fallback manual com
 * comprovante). Compartilhado entre admin/pagamento.php (gate forcado quando
 * a assinatura vence) e admin/plan-details.php (tela de auto-atendimento).
 *
 * Espera que quem incluir este arquivo ja tenha calculado, no proprio escopo
 * (PHP include compartilha o escopo do arquivo includer, entao nao precisa
 * passar parametro): $cobrancaPendente, $comprovanteEnviado, $saasPixChave,
 * $saasPixNome, $whatsLink, $uploadMsg. $retornoUpload (opcional) define o
 * valor do campo oculto "retorno" enviado a api/pagamento_comprovante_upload.php
 * (default 'pagamento' se nao definido).
 */
$retornoUpload = $retornoUpload ?? 'pagamento';
?>
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
      <input type="hidden" name="retorno" value="<?= htmlspecialchars($retornoUpload) ?>">
      <label class="pay-upload-label" for="comprovanteArquivo">Enviar comprovante (imagem ou PDF, até 5MB)</label>
      <input class="pay-upload-input" type="file" id="comprovanteArquivo" name="comprovante" accept=".jpg,.jpeg,.png,.webp,.pdf" required>
      <button class="pay-btn" type="submit">Enviar comprovante</button>
    </form>
  <?php endif; ?>

  <a class="pay-btn pay-btn-outline" href="<?= htmlspecialchars($whatsLink) ?>" target="_blank" rel="noopener">Enviar comprovante no WhatsApp</a>
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
