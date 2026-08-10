<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/gerenciamento_module.php';
require_once __DIR__ . '/../helpers/notificacoes_broadcast.php';
require_once __DIR__ . '/helpers.php';

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo 'Acesso restrito.';
  exit;
}

gerenciamentoEnsureModule($conn);
garantirNotificacoesBroadcastTabelas($conn);
notificacoesMarcarProgramadasVencidas($conn);

$totalLojas = 0;
try {
  $totalLojas = (int) $conn->query("SELECT COUNT(*) FROM lojas")->fetchColumn();
} catch (Exception $e) {
  $totalLojas = 0;
}

$listaNotificacoes = [];
try {
  $stmt = $conn->query("
    SELECT nb.id, nb.titulo, nb.mensagem, nb.imagem, nb.link, nb.status, nb.agendado_para, nb.enviado_em, nb.criado_em,
           (SELECT COUNT(*) FROM notificacoes_broadcast_visualizacoes v WHERE v.notificacao_id = nb.id) AS total_visualizacoes
    FROM notificacoes_broadcast nb
    ORDER BY nb.id DESC
  ");
  $listaNotificacoes = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
} catch (Exception $e) {
  $listaNotificacoes = [];
}

$notificacoes = superadminNotificacoes($conn);
$notifCount = count($notificacoes);
$paginaAtual = 'Notificações';
$chromeCssVer = filemtime(__DIR__ . '/assets/css/chrome.css');
$notificacoesCssVer = filemtime(__DIR__ . '/assets/css/notificacoes.css');
$chromeJsVer = filemtime(__DIR__ . '/assets/js/chrome.js');
$notificacoesJsVer = filemtime(__DIR__ . '/assets/js/notificacoes.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Notificações - Gerenciar lojas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="shortcut icon" href="../assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="../assets/img/favicon_store.png">

<link href="assets/css/chrome.css?v=<?= $chromeCssVer ?>" rel="stylesheet">
<link href="assets/css/notificacoes.css?v=<?= $notificacoesCssVer ?>" rel="stylesheet">
</head>
<body class="sidenav-dark">
<div class="layout">
<?php require __DIR__ . '/partials/sidebar.php'; ?>
  <main class="main">
<?php require __DIR__ . '/partials/header.php'; ?>

    <div id="notifBroadcastView">

      <section class="card notif-compose-card">
        <div class="card-header">
          <div class="card-title">Nova notificação</div>
          <div class="card-meta"><strong><?= (int) $totalLojas ?></strong>&nbsp;loja(s) cadastrada(s)</div>
        </div>
        <div class="card-body notif-compose-grid">

          <form id="notifForm" class="notif-form" enctype="multipart/form-data">
            <div>
              <label class="form-label">Título</label>
              <input class="form-control" type="text" name="titulo" id="notifTitulo" maxlength="160" placeholder="Ex: Manutenção programada" required>
            </div>
            <div>
              <label class="form-label">Mensagem</label>
              <textarea class="form-control" name="mensagem" id="notifMensagem" rows="5" maxlength="2000" placeholder="Escreva o aviso que vai aparecer para os lojistas..." required></textarea>
            </div>
            <div>
              <label class="form-label">Imagem (opcional)</label>
              <div class="notif-image-row">
                <div class="notif-image-preview" id="notifImagePreview">
                  <span>Sem imagem</span>
                </div>
                <div>
                  <button type="button" class="action-btn ghost" id="notifImageBtn">Escolher imagem</button>
                  <button type="button" class="action-btn ghost" id="notifImageRemover" style="display:none">Remover</button>
                  <input type="file" name="imagem" id="notifImageInput" accept="image/jpeg,image/png,image/webp" hidden>
                  <div class="form-help">JPG, PNG ou WebP, até 5MB.</div>
                </div>
              </div>
            </div>
            <div>
              <label class="form-label">Link (opcional)</label>
              <input class="form-control" type="text" name="link" id="notifLink" maxlength="500" placeholder="https://exemplo.com">
              <div class="form-help">Mostra um botão na notificação que leva a loja até esse endereço.</div>
            </div>

            <div class="notif-modo-row">
              <label class="notif-modo-opcao">
                <input type="radio" name="modo" value="agora" checked>
                Enviar agora
              </label>
              <label class="notif-modo-opcao">
                <input type="radio" name="modo" value="programar">
                Programar envio
              </label>
            </div>
            <div id="notifAgendadoWrap" style="display:none">
              <label class="form-label">Data e hora do envio</label>
              <input class="form-control" type="datetime-local" name="agendado_para" id="notifAgendadoPara">
            </div>

            <div class="notif-form-footer">
              <span id="notifFormMsg" class="notif-form-msg"></span>
              <button type="submit" class="action-btn primary" id="notifSubmitBtn">Enviar para todas as lojas</button>
            </div>
          </form>

          <div class="notif-preview-col">
            <div class="notif-preview-label">Pré-visualização</div>
            <div class="notif-preview-stage">
              <div class="notif-preview-modal">
                <button type="button" class="notif-preview-close">&times;</button>
                <div class="notif-preview-image" id="notifPreviewImage" style="display:none">
                  <img src="" alt="">
                </div>
                <div class="notif-preview-body">
                  <h2 id="notifPreviewTitulo">Título da notificação</h2>
                  <p id="notifPreviewMensagem">A mensagem escrita aqui vai aparecer assim para o lojista.</p>
                  <span class="notif-preview-link-btn" id="notifPreviewLinkBtn" style="display:none">Acessar link</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <section class="card notif-lista-card">
        <div class="card-header">
          <div class="card-title">Notificações enviadas e programadas</div>
        </div>
        <div class="card-body">
          <?php if (!$listaNotificacoes): ?>
            <div class="notif-lista-empty">Nenhuma notificação criada ainda.</div>
          <?php else: ?>
            <div class="notif-lista">
              <?php foreach ($listaNotificacoes as $n): ?>
                <?php
                  $status = $n['status'];
                  $dataRef = $status === 'programada' ? $n['agendado_para'] : ($n['enviado_em'] ?? $n['criado_em']);
                  $dataLabel = $status === 'programada' ? 'Programada para' : ($status === 'enviada' ? 'Enviada em' : 'Criada em');
                ?>
                <div class="notif-lista-item">
                  <div class="notif-lista-thumb">
                    <?php if (!empty($n['imagem'])): ?>
                      <img src="../<?= htmlspecialchars($n['imagem']) ?>" alt="">
                    <?php else: ?>
                      <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M9 21h6"/></svg>
                    <?php endif; ?>
                  </div>
                  <div class="notif-lista-info">
                    <div class="notif-lista-titulo"><?= htmlspecialchars($n['titulo']) ?></div>
                    <div class="notif-lista-preview"><?= htmlspecialchars(mb_substr($n['mensagem'], 0, 120)) ?><?= mb_strlen($n['mensagem']) > 120 ? '…' : '' ?></div>
                    <div class="notif-lista-meta">
                      <span class="badge <?= htmlspecialchars($status) ?>"><?= htmlspecialchars($status) ?></span>
                      <span><?= htmlspecialchars($dataLabel) ?>: <?= $dataRef ? date('d/m/Y H:i', strtotime($dataRef)) : '-' ?></span>
                      <span>Visto por <?= (int) $n['total_visualizacoes'] ?> de <?= (int) $totalLojas ?> loja(s)</span>
                      <?php if (!empty($n['link'])): ?>
                        <a class="notif-lista-link" href="<?= htmlspecialchars($n['link']) ?>" target="_blank" rel="noopener">🔗 Link</a>
                      <?php endif; ?>
                    </div>
                  </div>
                  <div class="notif-lista-acoes">
                    <?php if (in_array($status, ['enviada', 'cancelada'], true)): ?>
                      <form method="POST" action="../api/notificacao_broadcast_acao.php" class="inline-form notif-form-confirmavel"
                            data-confirm-titulo="Reenviar notificação"
                            data-confirm-msg="Ela voltará a aparecer para todas as lojas, inclusive as que já visualizaram antes."
                            data-confirm-btn="Reenviar">
                        <input type="hidden" name="id" value="<?= (int) $n['id'] ?>">
                        <input type="hidden" name="acao" value="reenviar">
                        <button type="submit" class="action-btn ghost">Reenviar</button>
                      </form>
                    <?php endif; ?>
                    <?php if (in_array($status, ['programada', 'enviada'], true)): ?>
                      <form method="POST" action="../api/notificacao_broadcast_acao.php" class="inline-form notif-form-confirmavel"
                            data-confirm-titulo="Cancelar notificação"
                            data-confirm-msg="Essa notificação deixará de aparecer para as lojas que ainda não viram."
                            data-confirm-btn="Cancelar notificação">
                        <input type="hidden" name="id" value="<?= (int) $n['id'] ?>">
                        <input type="hidden" name="acao" value="cancelar">
                        <button type="submit" class="action-btn danger">Cancelar</button>
                      </form>
                    <?php endif; ?>
                    <form method="POST" action="../api/notificacao_broadcast_acao.php" class="inline-form notif-form-confirmavel"
                          data-confirm-titulo="Excluir notificação"
                          data-confirm-msg="Essa notificação será excluída definitivamente e não poderá ser recuperada."
                          data-confirm-btn="Excluir definitivamente">
                      <input type="hidden" name="id" value="<?= (int) $n['id'] ?>">
                      <input type="hidden" name="acao" value="excluir">
                      <button type="submit" class="action-btn ghost">Excluir</button>
                    </form>
                  </div>
                </div>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>
        </div>
      </section>

    </div>

  </main>
</div>

<div class="modal-backdrop" id="notifConfirmModal" aria-hidden="true">
  <div class="modal-card" role="dialog" aria-modal="true" style="max-width:380px">
    <div class="modal-header">
      <div class="modal-title" id="notifConfirmTitulo">Confirmar ação</div>
    </div>
    <p id="notifConfirmMsg" style="font-size:13px;color:#64748b;margin:0 0 6px;line-height:1.5"></p>
    <div class="modal-actions">
      <button class="action-btn ghost" type="button" id="notifConfirmCancelar">Voltar</button>
      <button class="action-btn danger" type="button" id="notifConfirmOk">Confirmar</button>
    </div>
  </div>
</div>

<?php require __DIR__ . '/partials/modais_globais.php'; ?>

<script src="assets/js/chrome.js?v=<?= $chromeJsVer ?>"></script>
<script src="assets/js/notificacoes.js?v=<?= $notificacoesJsVer ?>"></script>
</body>
</html>
