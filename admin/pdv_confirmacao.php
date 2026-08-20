<?php
require_once __DIR__ . '/protect.php';
$pedidoId = $_GET['pedido_id'] ?? null;
if (!$pedidoId) {
  header('Location: pdv.php');
  exit;
}
$pdvConfirmacaoCssVer = filemtime(__DIR__ . '/assets/css/pdv_confirmacao.css');
$pdvConfirmacaoJsVer = filemtime(__DIR__ . '/assets/js/pdv_confirmacao.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Pedido confirmado</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css" rel="stylesheet">
<link href="./assets/css/pdv_confirmacao.css?v=<?= $pdvConfirmacaoCssVer ?>" rel="stylesheet">
</head>
<body>

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid">

  <div class="card rounded-4 shadow-sm border-0 p-5 mx-auto" style="max-width:720px">

    <div class="text-center mb-4">
      <i class="bi bi-check-circle-fill text-success fs-1"></i>
      <h4 class="mt-3">Pedido confirmado</h4>
      <p class="text-muted">Pedido #<?= $pedidoId ?> registrado com sucesso</p>
    </div>

    <div id="detalhePedido"></div>

    <div class="d-flex gap-2 mt-4 flex-wrap">
      <button class="btn btn-success rounded-pill flex-fill" onclick="enviarWhats()">
        <i class="bi bi-whatsapp"></i> WhatsApp
      </button>

      <button class="btn btn-outline-dark rounded-pill flex-fill" onclick="window.print()">
        <i class="bi bi-printer"></i> Imprimir
      </button>

      <a href="pdv.php" class="btn btn-dark rounded-pill flex-fill">
        Novo pedido
      </a>
    </div>

  </div>

  <div class="dash-footer" style="text-align:center;font-size:.75rem;color:#94a3b8;margin-top:6px">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<script>
const PDV_CONFIRMACAO_DATA = <?= json_encode(['pedidoId' => (int)$pedidoId], JSON_UNESCAPED_UNICODE) ?>;
</script>
<script src="./assets/js/pdv_confirmacao.js?v=<?= $pdvConfirmacaoJsVer ?>"></script>

</body>
</html>
