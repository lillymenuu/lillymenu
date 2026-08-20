<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.whatslilly');

$lojaId   = (int) ($_SESSION['loja_id'] ?? 1);
$cssVer   = filemtime(__DIR__ . '/assets/css/dashboard.css');
$wlCssVer = filemtime(__DIR__ . '/assets/css/whatslilly.css');
$wlJsVer  = filemtime(__DIR__ . '/assets/js/whatslilly.js');

$pixChave = config($conn, 'pagamento_pix_chave', '');
$pixNome  = config($conn, 'pagamento_pix_nome', '');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>WhatsLilly</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link href="./assets/css/whatslilly.css?v=<?= $wlCssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
</head>
<body class="dash-diggy">

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<!-- sidebar.php já abriu <div class="dashboard"> e <main class="content">.
     O .wl-layout usa position:fixed para ocupar o espaço ao lado do sidebar
     sem alterar nada do container pai. -->

<div class="wl-layout">

  <!-- ══════════════════════════════════════════════
       PAINEL ESQUERDO — Conversas
       ══════════════════════════════════════════════ -->
  <div class="wl-contacts-panel">

    <div class="wl-panel-header">
      <!-- Estado normal -->
      <div class="wl-panel-title" id="wlPanelTitle">
        <i class="bi bi-whatsapp"></i>
        WhatsLilly
      </div>
      <div class="wl-panel-header-btns" id="wlPanelBtns">
        <button class="wl-btn-nova" id="wlBtnSelecionarContatos" title="Selecionar conversas">
          <i class="bi bi-check2-square" style="font-size:18px"></i>
        </button>
        <button class="wl-btn-nova" id="wlBtnNova" title="Nova conversa">
          <i class="bi bi-pencil-square" style="font-size:18px"></i>
        </button>
      </div>
      <!-- Estado de seleção -->
      <div class="wl-panel-sel-state" id="wlContSelState">
        <button class="wl-sel-cancel-btn" id="wlContSelCancel" title="Cancelar">
          <i class="bi bi-x-lg"></i>
        </button>
        <span class="wl-sel-count" id="wlContSelCount">Selecionar</span>
        <button class="wl-sel-del-btn" id="wlContSelDelete" disabled>
          <i class="bi bi-trash3-fill"></i> Excluir
        </button>
      </div>
    </div>

    <div class="wl-search-wrap">
      <div class="wl-search">
        <i class="bi bi-search"></i>
        <input type="text" id="wlBusca" placeholder="Pesquisar ou começar uma conversa">
      </div>
    </div>

    <div class="wl-contacts-list" id="wlContactsList">
      <div class="wl-empty-contacts">
        <i class="bi bi-hourglass-split"></i>
        <p>Carregando...</p>
      </div>
    </div>

  </div>

  <!-- ══════════════════════════════════════════════
       PAINEL DIREITO — Chat
       ══════════════════════════════════════════════ -->
  <div class="wl-chat-panel">

    <!-- Estado vazio -->
    <div class="wl-empty-state" id="wlEmptyState">
      <div class="wl-empty-icon">
        <i class="bi bi-whatsapp"></i>
      </div>
      <h3>WhatsLilly</h3>
      <p>Selecione uma conversa para começar a responder.</p>
    </div>

    <!-- Chat ativo -->
    <div id="wlChatActive" style="display:none;flex-direction:column;flex:1;overflow:hidden;position:relative;">

      <!-- Header -->
      <div class="wl-chat-header">
        <div class="wl-avatar-wrap">
          <div class="wl-avatar" id="wlHeaderAvatar" style="width:42px;height:42px;font-size:15px">?</div>
          <span class="wl-avatar-wa"><i class="bi bi-whatsapp"></i></span>
        </div>
        <div class="wl-header-info">
          <div class="wl-header-name" id="wlHeaderName">—</div>
          <div class="wl-header-num"  id="wlHeaderNum">—</div>
        </div>
        <div class="wl-header-actions">
          <button class="wl-btn-pedidos" id="wlBtnSelecionarMsgs" title="Selecionar mensagens">
            <i class="bi bi-check2-square"></i>
          </button>
          <button class="wl-btn-pedidos" id="wlBtnPedidos" title="Ver pedidos do cliente">
            <i class="bi bi-receipt"></i>
          </button>
        </div>
      </div>

      <!-- Mensagens -->
      <div class="wl-messages-area" id="wlMessagesArea"></div>

      <!-- Barra de seleção de mensagens (substitui input em modo seleção) -->
      <div class="wl-msg-sel-bar" id="wlMsgSelBar">
        <button class="wl-sel-cancel-btn" id="wlMsgSelCancel">
          <i class="bi bi-x-lg"></i> Cancelar
        </button>
        <span class="wl-sel-count" id="wlMsgSelCount">Selecionar mensagens</span>
        <button class="wl-sel-del-btn" id="wlMsgSelDelete" disabled>
          <i class="bi bi-trash3-fill"></i> Excluir
        </button>
      </div>

      <!-- Input -->
      <div class="wl-input-bar" id="wlInputBar">
        <button class="wl-pix-btn" id="wlBtnPix" title="Inserir chave Pix"
                data-pix-chave="<?= htmlspecialchars($pixChave) ?>"
                data-pix-nome="<?= htmlspecialchars($pixNome) ?>">
          <i class="bi bi-qr-code"></i>
        </button>
        <textarea id="wlInput" placeholder="Digite uma mensagem" rows="1"></textarea>
        <button class="wl-send-btn" id="wlSendBtn" title="Enviar">
          <i class="bi bi-send-fill"></i>
        </button>
      </div>

      <!-- Drawer de pedidos -->
      <div class="wl-orders-drawer" id="wlOrdersDrawer">
        <div class="wl-drawer-header">
          <span class="wl-drawer-title">Pedidos do cliente</span>
          <button class="wl-drawer-close" id="wlDrawerClose">
            <i class="bi bi-x" style="font-size:22px"></i>
          </button>
        </div>
        <div class="wl-drawer-body" id="wlDrawerBody"></div>
      </div>

    </div>
  </div>

</div><!-- /wl-layout -->

<div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>

<!-- Modal de confirmação de exclusão -->
<div class="wl-modal-overlay" id="wlConfirmOverlay">
  <div class="wl-modal wl-confirm-modal">
    <div class="wl-confirm-icon">
      <i class="bi bi-trash3-fill"></i>
    </div>
    <h4 id="wlConfirmTitle">Excluir</h4>
    <p id="wlConfirmMsg"></p>
    <div class="wl-modal-actions">
      <button class="wl-modal-cancel" id="wlConfirmCancel">Cancelar</button>
      <button class="wl-modal-confirm wl-confirm-del" id="wlConfirmOk">
        <i class="bi bi-trash3-fill"></i> Excluir
      </button>
    </div>
  </div>
</div>

<!-- Modal nova conversa -->
<div class="wl-modal-overlay" id="wlModalOverlay">
  <div class="wl-modal">
    <h4>
      <i class="bi bi-chat-dots-fill" style="color:#00a884"></i>
      Nova Conversa
    </h4>
    <label>Número WhatsApp (com DDD)</label>
    <input type="tel" id="wlModalNumero" placeholder="85 99999-9999">
    <label>Nome (opcional)</label>
    <input type="text" id="wlModalNome" placeholder="Nome do contato">
    <div class="wl-modal-actions">
      <button class="wl-modal-cancel" id="wlModalCancel">CANCELAR</button>
      <button class="wl-modal-confirm" id="wlModalConfirm">INICIAR</button>
    </div>
  </div>
</div>

<script src="./assets/js/whatslilly.js?v=<?= $wlJsVer ?>"></script>
</body>
</html>
