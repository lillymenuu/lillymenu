<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.lista_transmissao');
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/lista_transmissao_module.php';

listaTransmissaoEnsureModule($conn);
$lojaId = listaTransmissaoTenantId();

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$finCssVer = filemtime(__DIR__ . '/assets/css/financial_module.css');
$finJsVer = filemtime(__DIR__ . '/assets/js/financial_module.js');
$ltCssVer = filemtime(__DIR__ . '/assets/css/lista_transmissao.css');
$ltJsVer = filemtime(__DIR__ . '/assets/js/lista_transmissao.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Lista de Transmissão</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
  <link href="./assets/css/financial_module.css?v=<?= $finCssVer ?>" rel="stylesheet">
  <link href="./assets/css/lista_transmissao.css?v=<?= $ltCssVer ?>" rel="stylesheet">
  <link rel="shortcut icon" href="./assets/img/favicon_store.png">
  <link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
</head>
<body class="dash-diggy fin-body">
<?php include __DIR__ . '/partials/sidebar.php'; ?>
<div class="fin-page">
  <div id="fin-toast-host" class="fin-toast-host"></div>

  <div class="fin-header">
    <div>
      <h1 class="fin-title">Lista de Transmissão</h1>
      <div class="fin-subtitle">Crie grupos de clientes com WhatsApp e envie promoções ou avisos para todos de uma vez.</div>
    </div>
    <div class="fin-actions">
      <button class="fin-btn fin-btn-primary fin-btn-sm" type="button" id="ltBtnNova"><i class="bi bi-plus-circle"></i> Nova lista</button>
    </div>
  </div>

  <div class="lt-grid" id="ltGrid"></div>
  <div class="fin-card d-none" id="ltEmpty">
    <div class="fin-card-body">
      <div class="fin-empty"><i class="bi bi-broadcast" style="font-size:1.6rem;display:block;margin-bottom:8px;"></i>Nenhuma lista de transmissão criada ainda.</div>
    </div>
  </div>
</div>

<!-- Modal criar/editar lista -->
<div class="modal fade" id="ltModalLista" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:560px;">
    <div class="modal-content fin-card" style="border-radius:22px;overflow:visible;">
      <div class="fin-card-head">
        <div>
          <h2 class="fin-card-title" id="ltModalListaTitulo">Nova lista</h2>
          <div class="fin-card-subtitle">Dê um nome ao grupo e escolha os clientes que vão receber suas mensagens.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="fin-card-body">
        <form id="ltFormLista">
          <input type="hidden" id="ltListaId" value="0">
          <div class="field mb-3">
            <label>Nome da lista</label>
            <input class="fin-input" type="text" id="ltListaNome" placeholder="Ex: Clientes VIP" required>
          </div>
          <div class="field">
            <label>Clientes</label>
            <input class="fin-input lt-cliente-busca" type="text" id="ltBuscaCliente" placeholder="Buscar por nome ou telefone...">
            <div class="lt-cliente-lista" id="ltClienteLista"></div>
            <div class="lt-selecionados-count" id="ltSelecionadosCount">0 clientes selecionados</div>
          </div>
          <div class="fin-modal-actions">
            <button class="fin-btn fin-btn-secondary fin-btn-sm" type="button" data-bs-dismiss="modal">Cancelar</button>
            <button class="fin-btn fin-btn-primary fin-btn-sm" type="submit" id="ltBtnSalvarLista">Salvar lista</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<!-- Modal excluir -->
<div class="modal fade" id="ltModalExcluir" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:420px;">
    <div class="modal-content fin-card" style="border-radius:22px;overflow:hidden;">
      <div class="fin-card-head" style="padding-bottom:8px;">
        <div>
          <h2 class="fin-card-title">Excluir lista</h2>
          <div class="fin-card-subtitle">Essa ação não pode ser desfeita.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="fin-card-body pt-0">
        <p style="font-size:.88rem;color:#5b6b85;">Tem certeza que deseja excluir a lista <strong id="ltExcluirNome"></strong>? Os clientes cadastrados nela não serão afetados.</p>
        <div class="fin-modal-actions">
          <button class="fin-btn fin-btn-secondary fin-btn-sm" type="button" data-bs-dismiss="modal">Cancelar</button>
          <button class="fin-btn fin-btn-primary fin-btn-sm" type="button" id="ltBtnConfirmarExcluir">Excluir</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Modal enviar mensagem -->
<div class="modal fade" id="ltModalEnviar" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:520px;">
    <div class="modal-content fin-card" style="border-radius:22px;overflow:visible;">
      <div class="fin-card-head">
        <div>
          <h2 class="fin-card-title">Enviar mensagem — <span id="ltEnviarNome"></span></h2>
          <div class="fin-card-subtitle">Escreva a promoção ou aviso que será enviado via WhatsApp.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="fin-card-body">
        <div class="lt-envio-destino" id="ltEnviarDestino"></div>
        <div class="field mb-2">
          <label>Mensagem</label>
          <textarea class="fin-textarea" id="ltMensagem" rows="5" placeholder="Ex: Hoje tem 10% de desconto em todos os produtos! Aproveite 🎉"></textarea>
        </div>
        <div class="lt-progresso-wrap" id="ltProgressoWrap">
          <div class="lt-progresso-bar-track"><div class="lt-progresso-bar-fill" id="ltProgressoFill"></div></div>
          <div class="lt-progresso-texto" id="ltProgressoTexto"></div>
          <div class="lt-progresso-aviso"><i class="bi bi-exclamation-triangle"></i> Não feche esta janela durante o envio.</div>
        </div>
        <div class="fin-modal-actions">
          <button class="fin-btn fin-btn-secondary fin-btn-sm" type="button" data-bs-dismiss="modal">Cancelar</button>
          <button class="fin-btn fin-btn-primary fin-btn-sm" type="button" id="ltBtnEnviar"><i class="bi bi-send-fill"></i> Enviar</button>
        </div>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/financial_module.js?v=<?= $finJsVer ?>"></script>
<script src="./assets/js/lista_transmissao.js?v=<?= $ltJsVer ?>"></script>
</body>
</html>
