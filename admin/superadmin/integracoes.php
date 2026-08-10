
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

$lojas = [];
try {
  $stmt = $conn->query("SELECT id, nome FROM lojas ORDER BY nome ASC");
  $lojas = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
} catch (Exception $e) {
  $lojas = [];
}

$notificacoes = superadminNotificacoes($conn);
$notifCount = count($notificacoes);
$paginaAtual = 'IntegraÃ§Ãµes';
$chromeCssVer = filemtime(__DIR__ . '/assets/css/chrome.css');
$integracoesCssVer = filemtime(__DIR__ . '/assets/css/integracoes.css');
$chromeJsVer = filemtime(__DIR__ . '/assets/js/chrome.js');
$integracoesJsVer = filemtime(__DIR__ . '/assets/js/integracoes.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IntegraÃ§Ãµes - Gerenciar lojas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="shortcut icon" href="../assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="../assets/img/favicon_store.png">

<link href="assets/css/chrome.css?v=<?= $chromeCssVer ?>" rel="stylesheet">
<link href="assets/css/integracoes.css?v=<?= $integracoesCssVer ?>" rel="stylesheet">
</head>
<body class="sidenav-dark">
<div class="layout">
<?php require __DIR__ . '/partials/sidebar.php'; ?>
  <main class="main">
<?php require __DIR__ . '/partials/header.php'; ?>

    <div id="integracoesView">
      <section class="card integ-panel">
        <div class="integ-panel-head">
          <div>
            <h3>Integrações WhatsApp API</h3>
            <p>Configure os provedores de WhatsApp por loja para envio de mensagens.</p>
          </div>
        </div>

        <div class="integ-scope-row">
          <div class="integ-scope-row-select">
            <label class="form-label" style="margin:0">Escopo:</label>
            <select id="integLojaSelect" class="form-control" style="max-width:340px">
              <option value="0">Global (todas as lojas)</option>
              <?php foreach ($lojas as $l): ?>
                <option value="<?= (int)$l['id'] ?>"><?= htmlspecialchars($l['nome'] ?? '') ?> (ID: <?= (int)$l['id'] ?>)</option>
              <?php endforeach; ?>
            </select>
          </div>
          <p>Global = usado por todas as lojas. Selecione uma loja para sobrescrever individualmente.</p>
        </div>

        <div id="integEmpty" style="display:none"></div>

        <div id="integForm">

          <!-- Z-API -->
          <div class="integ-provider-block">
            <div class="integ-provider-head">
              <div class="integ-provider-icon integ-icon-zapi">Z</div>
              <div>
                <div class="integ-provider-title">Z-API</div>
                <div class="integ-provider-desc">Plataforma paga — app.z-api.io</div>
              </div>
            </div>
            <div class="form-grid" style="margin-top:14px">
              <div>
                <label class="form-label">Instance ID</label>
                <input class="form-control" type="text" id="integ_zapi_instance" placeholder="Ex: 3F57CA6DA82E...">
              </div>
              <div>
                <label class="form-label">Token</label>
                <input class="form-control" type="text" id="integ_zapi_token" placeholder="Ex: 4F9AB03C1AF1...">
              </div>
              <div style="grid-column:1/-1">
                <label class="form-label">Security Token (Client-Token)</label>
                <input class="form-control" type="text" id="integ_zapi_client_token" placeholder="Ex: F852abc9a...">
              </div>
            </div>
            <div style="margin-top:10px;display:flex;align-items:center;gap:10px">
              <button class="action-btn ghost" type="button" id="btnTestarZapi">Testar conexao</button>
              <span id="integZapiMsg" style="font-size:12px"></span>
            </div>
          </div>

          <!-- Evolution API -->
          <div class="integ-provider-block" style="margin-top:14px">
            <div class="integ-provider-head">
              <div class="integ-provider-icon integ-icon-evo">E</div>
              <div>
                <div class="integ-provider-title">Evolution API</div>
                <div class="integ-provider-desc">Self-hosted • Gratis e open source</div>
              </div>
            </div>
            <div class="form-grid" style="margin-top:14px">
              <div style="grid-column:1/-1">
                <label class="form-label">URL base da instancia</label>
                <input class="form-control" type="text" id="integ_evolution_url" placeholder="Ex: http://localhost:8080">
              </div>
              <div>
                <label class="form-label">API Key (Token)</label>
                <input class="form-control" type="text" id="integ_evolution_token" placeholder="Ex: minha-api-key">
              </div>
              <div>
                <label class="form-label">Nome da instancia</label>
                <input class="form-control" type="text" id="integ_evolution_instance" placeholder="Ex: minha-instancia">
              </div>
            </div>
            <div style="margin-top:10px;display:flex;align-items:center;gap:10px">
              <button class="action-btn ghost" type="button" id="btnTestarEvolution">Testar conexao</button>
              <span id="integEvoMsg" style="font-size:12px"></span>
            </div>
          </div>

          <div class="integ-form-footer">
            <span id="integSaveMsg" style="font-size:12px"></span>
            <button class="action-btn primary" type="button" id="btnSalvarInteg">Salvar configuracao</button>
          </div>

        </div>
      </section>
    </div>

  </main>
</div>

<?php require __DIR__ . '/partials/modais_globais.php'; ?>

<script src="assets/js/chrome.js?v=<?= $chromeJsVer ?>"></script>
<script src="assets/js/integracoes.js?v=<?= $integracoesJsVer ?>"></script>
</body>
</html>

