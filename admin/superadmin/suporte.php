
<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/gerenciamento_module.php';
require_once __DIR__ . '/helpers.php';

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo 'Acesso restrito.';
  exit;
}

gerenciamentoEnsureModule($conn);

$notificacoes = superadminNotificacoes($conn);
$notifCount = count($notificacoes);
$paginaAtual = 'Suporte';
$chromeCssVer = filemtime(__DIR__ . '/assets/css/chrome.css');
$suporteCssVer = filemtime(__DIR__ . '/assets/css/suporte.css');
$chromeJsVer = filemtime(__DIR__ . '/assets/js/chrome.js');
$suporteJsVer = filemtime(__DIR__ . '/assets/js/suporte.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Suporte - Gerenciar lojas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="shortcut icon" href="../assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="../assets/img/favicon_store.png">

<link href="assets/css/chrome.css?v=<?= $chromeCssVer ?>" rel="stylesheet">
<link href="assets/css/suporte.css?v=<?= $suporteCssVer ?>" rel="stylesheet">
</head>
<body class="sidenav-dark suporte-page-bg">
<div class="layout">
<?php require __DIR__ . '/partials/sidebar.php'; ?>
  <main class="main">
<?php require __DIR__ . '/partials/header.php'; ?>

    <div id="suporteView">
      <div class="suporte-split">
        <div class="card suporte-side">
          <div class="suporte-side-profile">
            <button type="button" class="suporte-side-settings" id="suporteSideSettingsBtn" aria-label="Editar perfil">
              <svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/><path d="M19.4 15a1.6 1.6 0 01.3 1.7l-.5.9a1.6 1.6 0 01-1.6.8l-1.1-.2a7 7 0 01-1.5.9l-.4 1a1.6 1.6 0 01-1.4 1h-1a1.6 1.6 0 01-1.4-1l-.4-1a7 7 0 01-1.5-.9l-1.1.2a1.6 1.6 0 01-1.6-.8l-.5-.9a1.6 1.6 0 01.3-1.7l.7-.8a7 7 0 010-1.8l-.7-.8a1.6 1.6 0 01-.3-1.7l.5-.9a1.6 1.6 0 011.6-.8l1.1.2a7 7 0 011.5-.9l.4-1a1.6 1.6 0 011.4-1h1a1.6 1.6 0 011.4 1l.4 1a7 7 0 011.5.9l1.1-.2a1.6 1.6 0 011.6.8l.5.9a1.6 1.6 0 01-.3 1.7l-.7.8a7 7 0 010 1.8z"/></svg>
            </button>
            <div class="suporte-side-avatar" data-iniciais="<?= htmlspecialchars($superadminIniciais ?? 'A') ?>" data-foto="<?= htmlspecialchars($superadminFotoUrl ?? '') ?>">
              <?php if (!empty($superadminFotoUrl)): ?>
                <img src="<?= htmlspecialchars($superadminFotoUrl) ?>" alt="">
              <?php else: ?>
                <?= htmlspecialchars($superadminIniciais ?? 'A') ?>
              <?php endif; ?>
            </div>
            <div class="suporte-side-name"><?= htmlspecialchars($superadminNome ?? 'Admin') ?></div>
            <div class="suporte-side-caption">Disponível</div>
          </div>
          <div class="suporte-side-search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
            <input type="text" id="suporteSearchConversas" placeholder="Procurar...">
          </div>
          <div class="suporte-side-tabs">
            <span class="suporte-side-tab active clickable" data-tab="chat">Bater papo</span>
            <span class="suporte-side-tab" aria-disabled="true">Grupos</span>
            <span class="suporte-side-tab clickable" data-tab="contatos">Contatos</span>
          </div>
          <div class="suporte-tab-panel" id="suporteTabChat">
            <div class="suporte-side-label">Recente</div>
            <div class="suporte-admin-list" id="suporteConversas">
              <div class="suporte-admin-list-empty" id="suporteConversasEmpty">Nenhuma conversa ainda.</div>
            </div>
          </div>
          <div class="suporte-tab-panel" id="suporteTabContatos" style="display:none">
            <div class="suporte-side-label">Todas as lojas</div>
            <div class="suporte-admin-list" id="suporteContatos">
              <div class="suporte-admin-list-empty" id="suporteContatosEmpty">Nenhuma loja encontrada.</div>
            </div>
          </div>
        </div>
        <div class="card suporte-admin-chat">
          <div class="suporte-admin-chat-placeholder" id="suporteChatPlaceholder">
            Selecione uma loja na lista para iniciar o atendimento.
          </div>
          <div class="suporte-admin-chat-active" id="suporteChatActive" style="display:none">
            <div class="suporte-admin-chat-header">
              <div class="suporte-chat-header-avatar" id="suporteChatAvatar"></div>
              <div class="suporte-admin-chat-headtext">
                <div class="suporte-admin-chat-title" id="suporteChatLojaNome"></div>
                <div class="suporte-admin-chat-status" id="suporteChatStatus"></div>
              </div>
              <div class="suporte-chat-header-actions">
                <button type="button" class="suporte-chat-header-icon" aria-label="Buscar na conversa">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                </button>
                <button type="button" class="suporte-chat-header-icon suporte-chat-header-icon--dots" aria-label="Mais opções">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
                </button>
              </div>
            </div>
            <div class="suporte-admin-chat-body" id="suporteAdminChatBody"></div>
            <div class="suporte-anexo-preview" id="suporteAnexoPreview" style="display:none">
              <img id="suporteAnexoPreviewImg" alt="Preview">
              <span class="suporte-anexo-preview-nome" id="suporteAnexoPreviewNome"></span>
              <button type="button" class="suporte-anexo-preview-remover" id="suporteAnexoRemover" aria-label="Remover imagem">&times;</button>
            </div>
            <form class="suporte-admin-chat-footer" id="suporteAdminChatForm">
              <button type="button" class="suporte-chat-attach" id="suporteAnexoBtn" aria-label="Anexar imagem">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 015 5l-9.2 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.48"/></svg>
              </button>
              <input type="file" id="suporteAnexoInput" accept="image/jpeg,image/png,image/webp" hidden>
              <input type="text" class="suporte-chat-input" id="suporteAdminChatInput" placeholder="Escreva sua mensagem..." maxlength="2000" autocomplete="off">
              <button type="submit" class="suporte-chat-send" aria-label="Enviar mensagem">
                <span>Enviar</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>

  </main>
</div>

<?php require __DIR__ . '/partials/modais_globais.php'; ?>

<script src="assets/js/chrome.js?v=<?= $chromeJsVer ?>"></script>
<script src="assets/js/suporte.js?v=<?= $suporteJsVer ?>"></script>
</body>
</html>

