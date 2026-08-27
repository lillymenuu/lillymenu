<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.modo_garcom');
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/garcom_module.php';

garcomEnsureModule($conn);
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$stmt = $conn->prepare("SELECT id, nome, ativo, criado_em FROM mesas WHERE loja_id = ? ORDER BY nome");
$stmt->execute([$lojaId]);
$mesas = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("
  SELECT mesa_id, COUNT(*) AS qtd
  FROM pedidos
  WHERE loja_id = ? AND mesa_id IS NOT NULL AND status NOT IN ('finalizado','cancelado')
  GROUP BY mesa_id
");
$stmt->execute([$lojaId]);
$pedidosAbertosPorMesa = [];
foreach ($stmt as $r) {
  $pedidosAbertosPorMesa[(int) $r['mesa_id']] = (int) $r['qtd'];
}

$stmt = $conn->prepare("SELECT id, nome, email, ativo, criado_em FROM garcons WHERE loja_id = ? ORDER BY nome");
$stmt->execute([$lojaId]);
$garcons = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("
  SELECT COUNT(*) FROM pedidos
  WHERE loja_id = ? AND mesa_id IS NOT NULL AND status = 'pendente'
");
$stmt->execute([$lojaId]);
$pedidosPendentesCount = (int) $stmt->fetchColumn();

$mesasAtivasCount = count(array_filter($mesas, fn($m) => (int) $m['ativo'] === 1));
$garconsAtivosCount = count(array_filter($garcons, fn($g) => (int) $g['ativo'] === 1));

/* Link de acesso do garcom — curto, no mesmo formato do link do cardapio
   (dominio.com/nomedaloja/garcom_login), resolvido pelo .htaccess. Usa o
   mesmo slug configurado em "Link customizado" (Configuracoes > Loja); se a
   loja nunca customizou, cai no mesmo fallback que loja.php ja usa (nome da
   loja normalizado), garantindo que o link sempre resolva. */
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
$posAdmin = strrpos($scriptName, '/admin/');
$appBase = $posAdmin !== false ? substr($scriptName, 0, $posAdmin) : '';

$nomeLojaCfg = config($conn, 'nome_loja', '');
$linkLojaCfg = config($conn, 'link_loja', '');
$lojaLinkSlug = '';
if ($linkLojaCfg) {
  if (preg_match('#[?&]loja=([^&]+)#', $linkLojaCfg, $m)) {
    $lojaLinkSlug = urldecode($m[1]);
  } elseif (preg_match('#/([^/?]+)/?$#', $linkLojaCfg, $m)) {
    $lojaLinkSlug = $m[1];
  } else {
    $lojaLinkSlug = trim($linkLojaCfg, '/');
  }
  $lojaLinkSlug = preg_replace('/\.php$/i', '', $lojaLinkSlug);
}
if ($lojaLinkSlug === '') {
  $lojaLinkSlug = mb_strtolower($nomeLojaCfg, 'UTF-8');
  $lojaLinkSlug = preg_replace('/[^a-z0-9]+/', '-', $lojaLinkSlug);
  $lojaLinkSlug = trim($lojaLinkSlug, '-');
}
$garcomLoginUrl = $protocol . $host . $appBase . '/' . rawurlencode($lojaLinkSlug) . '/garcom_login';

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$mgCssVer = filemtime(__DIR__ . '/assets/css/modo_garcom.css');
$mgJsVer = filemtime(__DIR__ . '/assets/js/modo_garcom.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Modo Garçom</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

<link href="./assets/css/modo_garcom.css?v=<?= $mgCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy">

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid">
  <div class="mg-page">

    <div class="mg-hero">
      <div class="mg-hero-text">
        <h1 class="mg-hero-title">Modo Garçom</h1>
        <p class="mg-hero-sub">Mesas, garçons e pedidos do salão em um só lugar.</p>
      </div>
      <div class="mg-hero-stats">
        <div class="mg-hero-stat">
          <div class="mg-hero-stat-num" id="mgStatPendentes"><?= $pedidosPendentesCount ?></div>
          <div class="mg-hero-stat-lbl">Pedidos pendentes</div>
        </div>
        <div class="mg-hero-stat">
          <div class="mg-hero-stat-num" id="mgStatMesas"><?= $mesasAtivasCount ?></div>
          <div class="mg-hero-stat-lbl">Mesas ativas</div>
        </div>
        <div class="mg-hero-stat">
          <div class="mg-hero-stat-num" id="mgStatGarcons"><?= $garconsAtivosCount ?></div>
          <div class="mg-hero-stat-lbl">Garçons ativos</div>
        </div>
      </div>
    </div>

    <div class="mg-tabs" role="tablist">
      <button type="button" class="mg-tab active" data-mg-tab="pedidos">
        <i class="bi bi-receipt"></i> Pedidos
        <span class="mg-tab-badge<?= $pedidosPendentesCount > 0 ? '' : ' d-none' ?>" id="mgTabBadge"><?= $pedidosPendentesCount ?></span>
      </button>
      <button type="button" class="mg-tab" data-mg-tab="mesas"><i class="bi bi-grid-3x3-gap"></i> Mesas</button>
      <button type="button" class="mg-tab" data-mg-tab="garcons"><i class="bi bi-person-badge"></i> Garçons</button>
    </div>

    <!-- ══ ABA: PEDIDOS ══ -->
    <div class="mg-panel" data-mg-panel="pedidos">
      <div id="mgPedidosLista" class="mg-pedidos-lista">
        <div class="mg-empty"><i class="bi bi-hourglass-split"></i> Carregando pedidos...</div>
      </div>
    </div>

    <!-- ══ ABA: MESAS ══ -->
    <div class="mg-panel d-none" data-mg-panel="mesas">
      <div class="mg-panel-head">
        <div class="mg-panel-head-text">Toque em uma mesa pra ativar/desativar. Mesas desativadas não aparecem pro garçom.</div>
        <button type="button" class="btn-diggy-primary" data-bs-toggle="modal" data-bs-target="#modalMesa">
          <i class="bi bi-plus-lg"></i> Nova mesa
        </button>
      </div>
      <?php if (!$mesas): ?>
        <div class="mg-empty"><i class="bi bi-grid-3x3-gap"></i> Nenhuma mesa cadastrada ainda.</div>
      <?php else: ?>
        <div class="mg-mesas-grid">
          <?php foreach ($mesas as $m): ?>
            <?php $temPedido = ($pedidosAbertosPorMesa[(int) $m['id']] ?? 0) > 0; ?>
            <div class="mg-mesa-card<?= (int) $m['ativo'] === 0 ? ' mg-mesa-card--inativa' : '' ?><?= $temPedido ? ' mg-mesa-card--pedido' : '' ?>">
              <div class="mg-mesa-card-top">
                <div class="mg-mesa-card-nome"><?= htmlspecialchars($m['nome']) ?></div>
                <label class="mg-switch">
                  <input type="checkbox" data-mesa-toggle="<?= (int) $m['id'] ?>" <?= (int) $m['ativo'] === 1 ? 'checked' : '' ?>>
                  <span></span>
                </label>
              </div>
              <?php if ($temPedido): ?>
                <div class="mg-mesa-card-flag"><i class="bi bi-clock-history"></i> Pedido em aberto</div>
              <?php else: ?>
                <div class="mg-mesa-card-flag mg-mesa-card-flag--livre"><i class="bi bi-check2"></i> Livre</div>
              <?php endif; ?>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>

    <!-- ══ ABA: GARÇONS ══ -->
    <div class="mg-panel d-none" data-mg-panel="garcons">
      <div class="mg-panel-head">
        <div class="mg-panel-head-text">Compartilhe o link de acesso com a equipe — cada garçom entra com o próprio e-mail e código.</div>
        <button type="button" class="btn-diggy-primary" data-bs-toggle="modal" data-bs-target="#modalGarcom">
          <i class="bi bi-plus-lg"></i> Novo garçom
        </button>
      </div>

      <div class="mg-link-card">
        <div class="mg-link-card-icon"><i class="bi bi-link-45deg"></i></div>
        <div class="mg-link-card-body">
          <div class="mg-link-card-title">Link de acesso do garçom</div>
          <input type="text" id="mgLinkAcesso" value="<?= htmlspecialchars($garcomLoginUrl) ?>" readonly>
        </div>
        <button type="button" class="btn btn-outline-secondary mg-link-copy-btn" id="mgLinkCopiarBtn" title="Copiar link" aria-label="Copiar link"><i class="bi bi-clipboard"></i></button>
      </div>

      <?php if (!$garcons): ?>
        <div class="mg-empty"><i class="bi bi-person-badge"></i> Nenhum garçom cadastrado ainda.</div>
      <?php else: ?>
        <div class="mg-garcons-lista">
          <?php foreach ($garcons as $g): ?>
            <div class="mg-garcom-row<?= (int) $g['ativo'] === 0 ? ' mg-garcom-row--inativo' : '' ?>">
              <div class="mg-garcom-avatar"><?= htmlspecialchars(mb_substr($g['nome'], 0, 1, 'UTF-8')) ?></div>
              <div class="mg-garcom-info">
                <div class="mg-garcom-nome"><?= htmlspecialchars($g['nome']) ?></div>
                <div class="mg-garcom-email"><?= htmlspecialchars($g['email']) ?></div>
              </div>
              <button type="button" class="btn btn-outline-secondary btn-sm" data-garcom-codigo="<?= (int) $g['id'] ?>">Gerar novo código</button>
              <label class="mg-switch">
                <input type="checkbox" data-garcom-toggle="<?= (int) $g['id'] ?>" <?= (int) $g['ativo'] === 1 ? 'checked' : '' ?>>
                <span></span>
              </label>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>

  </div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>

<!-- ══ MODAL: NOVA MESA ══ -->
<div class="modal fade" id="modalMesa" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content mg-modal">
      <div class="modal-header">
        <h5 class="modal-title">Nova mesa</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="produto-field">
          <label class="form-label">Nome da mesa</label>
          <input type="text" class="form-control produto-input" id="mesaNomeInput" placeholder="Ex.: Mesa 1, Varanda 2...">
        </div>
        <div class="mg-modal-msg" id="mesaModalMsg"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-diggy-primary" id="mesaSalvarBtn" onclick="mgSalvarMesa()">Salvar</button>
      </div>
    </div>
  </div>
</div>

<!-- ══ MODAL: NOVO GARÇOM ══ -->
<div class="modal fade" id="modalGarcom" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content mg-modal">
      <div class="modal-header">
        <h5 class="modal-title">Novo garçom</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="produto-field">
          <label class="form-label">Nome</label>
          <input type="text" class="form-control produto-input" id="garcomNomeInput" placeholder="Nome do garçom">
        </div>
        <div class="produto-field">
          <label class="form-label">E-mail</label>
          <input type="email" class="form-control produto-input" id="garcomEmailInput" placeholder="email@exemplo.com">
        </div>
        <div class="mg-modal-msg" id="garcomModalMsg"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-diggy-primary" id="garcomSalvarBtn" onclick="mgSalvarGarcom()">Salvar e gerar código</button>
      </div>
    </div>
  </div>
</div>

<!-- ══ MODAL: CÓDIGO GERADO ══ -->
<div class="modal fade" id="modalCodigoGerado" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content mg-modal">
      <div class="modal-header">
        <h5 class="modal-title">Código de acesso gerado</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="mg-codigo-aviso"><i class="bi bi-info-circle"></i> Anote ou envie agora — por segurança, esse código não fica salvo em texto e não será mostrado de novo.</div>
        <div class="mg-codigo-display" id="mgCodigoDisplay">-----</div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-diggy-primary" data-bs-dismiss="modal">Entendi</button>
      </div>
    </div>
  </div>
</div>

<!-- ══ MODAL: CONFIRMAR NOVO CÓDIGO ══ -->
<div class="modal fade" id="modalConfirmarCodigo" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content mg-modal">
      <div class="modal-header">
        <h5 class="modal-title">Gerar novo código?</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <p class="mb-0">Gerar um novo código vai invalidar o código atual desse garçom. Continuar?</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="btn-diggy-primary" id="mgConfirmarCodigoBtn">Gerar novo código</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/modo_garcom.js?v=<?= $mgJsVer ?>"></script>
</body>
</html>
