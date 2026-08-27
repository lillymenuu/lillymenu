<?php
// Rota atual para menu ativo
$rota = basename($_SERVER['PHP_SELF']);
$emSuperadmin = strpos(str_replace('\\', '/', $_SERVER['PHP_SELF']), '/superadmin/') !== false;
$lojaNomeSess = $_SESSION['loja_nome'] ?? 'T&W Confeitaria';
$usuarioNome = $_SESSION['admin_nome'] ?? 'Admin';

$menuPermMap = [];
$menuRestrito = false;
if (isset($_SESSION['admin_id'])) {
  if (!isset($conn)) {
    require_once __DIR__ . '/../../config/database.php';
  }
  require_once __DIR__ . '/../helpers/garcom_module.php';
  garcomEnsureModule($conn);
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute(['permissoes_niveis']);
    $temPermissoes = (bool) $stmt->fetchColumn();
    $stmt->execute(['permissoes_usuarios']);
    $temPermUsuarios = (bool) $stmt->fetchColumn();
    if ($temPermissoes && $temPermUsuarios) {
      $stmt = $conn->prepare("
        SELECT pn.permissoes_json
        FROM permissoes_usuarios pu
        JOIN permissoes_niveis pn ON pn.id = pu.permissao_id
        WHERE pu.admin_id = ?
        LIMIT 1
      ");
      $stmt->execute([$_SESSION['admin_id']]);
      $permissoesJson = $stmt->fetchColumn();
      if ($permissoesJson) {
        $decoded = json_decode((string) $permissoesJson, true);
        if (is_array($decoded)) {
          foreach ($decoded as $perm) {
            $perm = (string) $perm;
            if (strpos($perm, 'menu.') === 0) {
              $menuPermMap[$perm] = true;
            }
          }
        }
      }
    }
  } catch (Exception $e) {
    $menuPermMap = [];
  }
}
$menuRestrito = !empty($menuPermMap);
$menuPode = function(string $chave) use ($menuRestrito, $menuPermMap): bool {
  if (!$menuRestrito) {
    return true;
  }
  return isset($menuPermMap[$chave]);
};

// Bloqueio de telas por plano contratado (independente da permissao por usuario acima)
$recursosPlano = null; // null = sem restricao (libera tudo)
if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin' && isset($_SESSION['admin_id'])) {
  try {
    if (!isset($conn)) {
      require_once __DIR__ . '/../../config/database.php';
    }
    $stmtPl = $conn->prepare("
      SELECT p.recursos_json
      FROM assinaturas a
      INNER JOIN planos p ON p.id = a.plano_id
      WHERE a.loja_id = ?
      ORDER BY a.id DESC
      LIMIT 1
    ");
    $stmtPl->execute([(int) ($_SESSION['loja_id'] ?? 0)]);
    $recursosJson = $stmtPl->fetchColumn();
    if ($recursosJson) {
      $decodedRecursos = json_decode((string) $recursosJson, true);
      if (is_array($decodedRecursos)) {
        $recursosPlano = $decodedRecursos;
      }
    }
  } catch (Exception $e) {
    $recursosPlano = null;
  }
}
$planoPode = function(string $chave) use ($recursosPlano): bool {
  if ($recursosPlano === null) {
    return true;
  }
  return $chave === 'menu.dashboard' || in_array($chave, $recursosPlano, true);
};

$lojaContato = '';
$lojaPerfil = '';
$lojaCapa = '';
$lojaRua = '';
$lojaNumero = '';
$lojaBairro = '';
$lojaCidade = '';
$lojaEstado = '';
$lojaCep = '';
$lojaComplemento = '';
$lojaCnpj = '';
$lojaEmail = '';
if (!isset($conn)) {
  require_once __DIR__ . '/../../config/database.php';
}
if (!function_exists('sidebarTabelaExiste')) {
  function sidebarTabelaExiste(PDO $conn, string $tabela): bool {
    try {
      $stmt = $conn->prepare("SHOW TABLES LIKE ?");
      $stmt->execute([$tabela]);
      return (bool) $stmt->fetchColumn();
    } catch (Exception) {
      return false;
    }
  }
}
if (file_exists(__DIR__ . '/../helpers/config.php')) {
  require_once __DIR__ . '/../helpers/config.php';
  if (isset($conn)) {
    $lojaNomeSess = config($conn, 'nome_loja', $lojaNomeSess);
    $lojaContato = (string) config($conn, 'loja_contato', '');
    $lojaPerfil = (string) config($conn, 'loja_perfil', '');
    $lojaCapa = (string) config($conn, 'loja_capa', '');
    $lojaRua = (string) config($conn, 'loja_rua', '');
    $lojaNumero = (string) config($conn, 'loja_numero', '');
    $lojaBairro = (string) config($conn, 'loja_bairro', '');
    $lojaCidade = (string) config($conn, 'loja_cidade', '');
    $lojaEstado = (string) config($conn, 'loja_estado', '');
    $lojaCep = (string) config($conn, 'loja_cep', '');
    $lojaComplemento = (string) config($conn, 'loja_complemento', '');
    $lojaCnpj = (string) config($conn, 'loja_cnpj', '');
    $lojaEmail = (string) config($conn, 'loja_email', '');
  }
}

$lojaNome = $lojaNomeSess;
$lojaInicial = strtoupper(substr($lojaNome, 0, 1));
$lojaSubLabel = 'Loja principal';
$lojaIdSidebar = (int) ($_SESSION['loja_id'] ?? 0);
$planoNome = 'Customizado';
$planoExpira = '';
$planoStatus = '';
$planoBadge = '';
try {
  if ($lojaIdSidebar > 0 && sidebarTabelaExiste($conn, 'assinaturas')) {
    $stmtPlano = $conn->prepare("
      SELECT a.status, a.trial_fim, a.ciclo_fim, p.nome AS plano_nome
      FROM assinaturas a
      LEFT JOIN planos p ON p.id = a.plano_id
      WHERE a.loja_id = ?
      ORDER BY a.id DESC
      LIMIT 1
    ");
    $stmtPlano->execute([$lojaIdSidebar]);
    $assinatura = $stmtPlano->fetch(PDO::FETCH_ASSOC) ?: [];
    if (!empty($assinatura['plano_nome'])) {
      $planoNome = $assinatura['plano_nome'];
    }
    $status = strtolower(trim((string) ($assinatura['status'] ?? '')));
    if ($status === 'ativo') {
      $status = 'ativa';
    }
    $expiraRaw = null;
    if ($status === 'trial') {
      $planoStatus = 'trial';
      $expiraRaw = $assinatura['trial_fim'] ?? null;
    } else {
      $expiraRaw = $assinatura['ciclo_fim'] ?? ($assinatura['trial_fim'] ?? null);
    }
    if ($expiraRaw) {
      $expiraTs = strtotime($expiraRaw);
      if ($expiraTs !== false && $expiraTs < strtotime(date('Y-m-d'))) {
        $planoExpira = 'Expirado';
        $planoStatus = 'expirado';
      } else {
        $planoExpira = 'ate ' . date('d/m', $expiraTs);
      }
    }
    if ($planoStatus === 'trial') {
      $planoBadge = 'Trial';
    }
  }
} catch (Exception $e) {
}
$enderecoLinha1 = trim(implode(', ', array_filter([$lojaRua, $lojaNumero])));
$cidadeEstado = trim(implode('/', array_filter([$lojaCidade, $lojaEstado])));
$enderecoLinha2 = trim(implode(' - ', array_filter([$lojaBairro, $cidadeEstado])));
$enderecoLinha3 = $lojaCep !== '' ? 'CEP: ' . $lojaCep : '';
$enderecoLinha4 = trim($lojaComplemento);
$enderecoTem = trim($enderecoLinha1 . $enderecoLinha2 . $enderecoLinha3 . $enderecoLinha4) !== '';

$mostrarDashboard = $menuPode('menu.dashboard') && $planoPode('menu.dashboard');
$mostrarPdv = $menuPode('menu.pdv') && $planoPode('menu.pdv');
$mostrarGestor = $menuPode('menu.gestor_pedidos') && $planoPode('menu.gestor_pedidos');
$mostrarPedidos = $menuPode('menu.pedidos') && $planoPode('menu.pedidos');
$mostrarProdutos = $menuPode('menu.produtos') && $planoPode('menu.produtos');
$mostrarPromo = $menuPode('menu.promo') && $planoPode('menu.promo');
$mostrarEstoque = $menuPode('menu.estoque') && $planoPode('menu.estoque');
$mostrarClientes = $menuPode('menu.clientes') && $planoPode('menu.clientes');
$mostrarRelatorios = $menuPode('menu.relatorios') && $planoPode('menu.relatorios');
$mostrarFidelidade = $menuPode('menu.relatorios_fidelidade') && $planoPode('menu.relatorios_fidelidade');
$mostrarOrcamentos = $menuPode('menu.orcamentos') && $planoPode('menu.orcamentos');
$mostrarControleCaixa = $menuPode('menu.controle_caixa') && $planoPode('menu.controle_caixa');
$mostrarControleFiado = $menuPode('menu.controle_fiado') && $planoPode('menu.controle_fiado');
$mostrarMotoboys = $menuPode('menu.motoboys') && $planoPode('menu.motoboys');
$mostrarModoGarcom = $menuPode('menu.modo_garcom') && $planoPode('menu.modo_garcom');
$mostrarEntradaSaida = false;
$mostrarMateriaPrima = false;
$mostrarMateriaPrimaControle = false;
$mostrarMateriaPrimaControleControl = false;
$mostrarFinanceiro = $menuPode('menu.financeiro') && $planoPode('menu.financeiro');
$mostrarCupons = $menuPode('menu.cupons') && $planoPode('menu.cupons');
$mostrarListaTransmissao = $menuPode('menu.lista_transmissao') && $planoPode('menu.lista_transmissao');
$mostrarWhatsLilly = $menuPode('menu.whatslilly') && $planoPode('menu.whatslilly');
$mostrarConfiguracoes = $menuPode('menu.configuracoes') && $planoPode('menu.configuracoes');
$mostrarCrossSellConfig = $menuPode('menu.cross_sell_config') && $planoPode('menu.cross_sell_config');
$mostrarCrossSellRelatorio = $menuPode('menu.relatorio_cross_sell') && $planoPode('menu.relatorio_cross_sell');
$mostrarLojas = ($_SESSION['admin_perfil'] ?? '') === 'superadmin';
$mostrarGerenciamento = ($_SESSION['admin_perfil'] ?? '') === 'superadmin';

// WhatsLilly — badge de não-lidas
$wlNaoLidas = 0;
try {
  if (isset($conn)) {
    $stmtWl = $conn->prepare("SHOW TABLES LIKE 'whats_conversas'");
    $stmtWl->execute();
    if ($stmtWl->fetchColumn()) {
      $stmtWl = $conn->prepare("SELECT COALESCE(SUM(nao_lidas),0) FROM whats_conversas WHERE loja_id = ?");
      $stmtWl->execute([$_SESSION['loja_id'] ?? 1]);
      $wlNaoLidas = (int) $stmtWl->fetchColumn();
    }
  }
} catch (Exception $e) {}

$secAcessoRapido = $mostrarDashboard;
$secDiaADia = $mostrarPdv || $mostrarGestor || $mostrarPedidos || $mostrarProdutos || $mostrarPromo || $mostrarEstoque || $mostrarClientes || $mostrarOrcamentos;
$secControle = $mostrarEntradaSaida || $mostrarMateriaPrimaControleControl;
$secFinanceiro = $mostrarFinanceiro;
$secRelatorios = $mostrarRelatorios || $mostrarFidelidade || $mostrarCrossSellRelatorio;
$secMonitorar = $mostrarWhatsLilly || $mostrarListaTransmissao;
$secGerenciar = $mostrarControleCaixa || $mostrarControleFiado || $mostrarMotoboys || $mostrarModoGarcom || $mostrarCupons || $mostrarConfiguracoes || $mostrarCrossSellConfig || $mostrarLojas || $mostrarGerenciamento;
?>

<script>
  (function(){
    const salvo = localStorage.getItem('sidebarCollapsed');
    if (salvo === '1' && window.innerWidth > 991) {
      document.documentElement.classList.add('sidebar-preload');
    }
  })();
</script>

<script>
  (function(){
    const warn = document.getElementById('trialWarning');
    if (!warn) return;
    const dismissed = localStorage.getItem('trialWhatsappDismissed');
    if (dismissed === '1') {
      warn.style.display = 'none';
      return;
    }
    const close = warn.querySelector('[data-dismiss-trial]');
    if (close) {
      close.addEventListener('click', () => {
        warn.style.display = 'none';
        localStorage.setItem('trialWhatsappDismissed','1');
      });
    }
  })();
</script>

<style>
  .sidebar-preload .sidebar,
  .sidebar-preload .content{
    transition:none !important;
  }
  .sidebar-plan .plan-sub{
    display:flex;
    align-items:center;
    gap:8px;
  }
  .sidebar-plan .plan-sub.is-expired{
    color:#dc2626;
    font-weight:700;
  }
  .sidebar-plan .plan-badge{
    background:#fef3c7;
    color:#92400e;
    font-size:10px;
    font-weight:700;
    padding:2px 8px;
    border-radius:999px;
    text-transform:uppercase;
    letter-spacing:.02em;
  }
  .brand-row{
    display:flex;
    align-items:center;
    gap:7px;
  }
  .brand-icon{
    width:24px;
    height:24px;
    border-radius:6px;
    flex-shrink:0;
    object-fit:contain;
    display:block;
  }
  .brand-title{
    font-weight:800;
    font-size:16px;
    line-height:1.2;
  }
  .sidebar-store{
    position:relative;
  }
  .store-notify{
    position:absolute;
    top:10px;
    right:10px;
    z-index:3;
  }
  .brand-notify{
    position:relative;
  }
  .notify-btn{
    border:0;
    background:#fff;
    width:30px;
    height:30px;
    border-radius:10px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    color:#0f172a;
    box-shadow:0 8px 16px rgba(15,23,42,.08);
    position:relative;
  }
  .notify-btn i{
    font-size:1rem;
  }
  .notify-badge{
    position:absolute;
    top:-4px;
    right:-4px;
    background:#ef4444;
    color:#fff;
    font-size:.6rem;
    font-weight:700;
    border-radius:999px;
    padding:1px 6px;
    min-width:16px;
    text-align:center;
    display:none;
  }
  .notify-badge.show{
    display:inline-flex;
  }
  .notify-dropdown{
    position:fixed;
    top:0;
    left:0;
    right:auto;
    width:300px;
    background:#fff;
    border:1px solid #e5e7eb;
    border-radius:14px;
    box-shadow:0 18px 40px rgba(15,23,42,.16);
    padding:12px;
    opacity:0;
    transform:translateY(-8px);
    pointer-events:none;
    transition:opacity .2s ease, transform .2s ease;
    z-index:9999;
  }
  .notify-dropdown.show{
    opacity:1;
    transform:translateY(0);
    pointer-events:auto;
  }
  .notify-head{
    font-weight:700;
    font-size:.95rem;
    margin-bottom:8px;
  }
  .notify-tabs{
    display:flex;
    gap:6px;
    background:#f3f4f6;
    border-radius:10px;
    padding:4px;
    margin-bottom:10px;
  }
  .notify-tab{
    flex:1;
    border:0;
    background:transparent;
    padding:6px 8px;
    font-size:.75rem;
    border-radius:8px;
    font-weight:600;
    color:#6b7280;
  }
  .notify-tab.active{
    background:#fff;
    color:#0f172a;
    box-shadow:0 6px 12px rgba(15,23,42,.08);
  }
  .notify-list{
    display:flex;
    flex-direction:column;
    gap:8px;
    max-height:260px;
    overflow:auto;
  }
  .notify-item{
    display:flex;
    gap:10px;
    padding:10px;
    border-radius:12px;
    background:#f9fafb;
  }
  .notify-item.is-editado{
    background:#fef3c7;
  }
  .notify-item.is-editado .notify-icon{
    background:#fde68a;
    color:#92400e;
  }
  .notify-item.is-clickable{
    cursor:pointer;
    transition:background .15s ease;
  }
  .notify-item.is-clickable:hover{
    background:#eef2f7;
  }
  .notify-icon{
    width:36px;
    height:36px;
    border-radius:50%;
    background:#e2e8f0;
    display:flex;
    align-items:center;
    justify-content:center;
    color:#64748b;
    flex:0 0 36px;
  }
  .notify-item-title{
    font-weight:600;
    font-size:.85rem;
    color:#0f172a;
  }
  .notify-item-sub{
    font-size:.75rem;
    color:#6b7280;
  }
  .notify-item-time{
    display:flex;
    align-items:center;
    gap:6px;
    font-size:.7rem;
    color:#94a3b8;
  }
  .notify-dot{
    width:6px;
    height:6px;
    background:#ef4444;
    border-radius:50%;
    display:inline-block;
    flex:0 0 6px;
  }
  .notify-empty{
    padding:10px;
    text-align:center;
    color:#94a3b8;
    font-size:.8rem;
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:6px;
  }
  .notify-empty i{
    font-size:1.4rem;
    color:#94a3b8;
  }
  .custom-select{
    position:relative;
    width:100%;
  }
  .custom-select-trigger{
    width:100%;
    border-radius:12px;
    border:1px solid #e2e8f0;
    background:linear-gradient(180deg,#ffffff 0%,#f6f7fb 100%);
    font-size:.85rem;
    padding:.55rem 2.6rem .55rem .8rem;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.6);
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    color:#0f172a;
    transition:box-shadow .2s ease, border-color .2s ease;
    position:relative;
  }
  .custom-select-trigger:focus{
    outline:none;
    border-color:#93c5fd;
    box-shadow:0 0 0 3px rgba(59,130,246,.15);
  }
  .custom-select-trigger .select-left{
    display:flex;
    align-items:center;
    gap:8px;
    min-width:0;
  }
  .custom-select-trigger .select-icon{
    font-size:.9rem;
    color:#94a3b8;
  }
  .custom-select-trigger .custom-select-value{
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    text-align:left;
    flex:1;
  }
  .custom-select-trigger .select-arrow{
    width:18px;
    height:18px;
    color:#94a3b8;
    display:flex;
    align-items:center;
    justify-content:center;
    transition:transform .2s ease;
    position:absolute;
    right:12px;
    top:50%;
    transform:translateY(-50%);
    pointer-events:none;
  }
  .custom-select.open .select-arrow{
    transform:translateY(-50%) rotate(180deg);
  }
  .custom-select-menu{
    position:absolute;
    top:calc(100% + 6px);
    left:0;
    right:0;
    background:#fff;
    border:1px solid #e2e8f0;
    border-radius:14px;
    box-shadow:0 16px 40px rgba(15,23,42,.12);
    padding:6px;
    max-height:260px;
    overflow:auto;
    opacity:0;
    transform:translateY(-6px);
    pointer-events:none;
    transition:opacity .2s ease, transform .2s ease;
    z-index:60;
  }
  .custom-select.open .custom-select-menu{
    opacity:1;
    transform:translateY(0);
    pointer-events:auto;
  }
  .custom-option{
    padding:8px 10px;
    border-radius:10px;
    font-size:.85rem;
    color:#0f172a;
    cursor:pointer;
    transition:background .15s ease, color .15s ease;
  }
  .custom-option:hover{
    background:#f1f5f9;
  }
  .custom-option.selected{
    background:#e0f2fe;
    color:#0f172a;
    font-weight:600;
  }
  .custom-select.is-disabled .custom-select-trigger{
    background:#f8fafc;
    color:#94a3b8;
    cursor:not-allowed;
  }
</style>


<div class="dashboard">

  <!-- SIDEBAR -->
  <aside class="sidebar" id="sidebar">
    
    <div class="sidebar-brand">
      <div class="brand-left">
        <img src="./assets/img/favicon_store.png" alt="Lilly" class="brand-icon">
        <div class="brand-text">
          <div class="brand-title">Lilly Menu</div>
          <div class="brand-subtitle">Sistema de Gestão</div>
        </div>
      </div>
      <button class="sidebar-collapse" type="button" onclick="toggleSidebar()" aria-label="Recolher menu">
        <i class="bi bi-chevron-left"></i>
      </button>
    </div>

    <div class="sidebar-store">
      <div class="store-notify">
        <button type="button" class="notify-btn" id="notifyToggle" aria-label="Notificações">
          <i class="bi bi-bell"></i>
          <span class="notify-badge" id="notifyBadge">0</span>
        </button>
        <div class="notify-dropdown" id="notifyDropdown" aria-hidden="true">
          <div class="notify-head">Notificações</div>
          <div class="notify-tabs">
            <button type="button" class="notify-tab active" data-notify-tab="all">Todas</button>
            <button type="button" class="notify-tab" data-notify-tab="unread">Não lidas</button>
          </div>
          <div class="notify-list" id="notifyList">
            <div class="notify-empty">Carregando...</div>
          </div>
        </div>
      </div>
      <button type="button" class="store-switch" id="openLojaInfo">
        <div class="store-avatar<?= !empty($lojaPerfil) ? ' has-logo' : '' ?>">
          <?php if (!empty($lojaPerfil)): ?>
            <img src="<?= htmlspecialchars($lojaPerfil) ?>" alt="Loja">
          <?php else: ?>
            <?= htmlspecialchars($lojaInicial) ?>
          <?php endif; ?>
        </div>
        <div class="store-info">
          <div class="store-name"><?= htmlspecialchars($lojaNome) ?></div>
          <div class="store-sub"><?= htmlspecialchars($lojaSubLabel) ?></div>
          
        </div>
      </button>

      <?php
        /* Ler estado manual da loja */
        $forceFechada = false;
        try {
          $stmtTog = $conn->prepare("SELECT valor FROM configuracoes WHERE chave='loja_force_fechada' AND loja_id=? LIMIT 1");
          $stmtTog->execute([$lojaIdSidebar ?: 1]);
          $valTog = $stmtTog->fetchColumn();
          $forceFechada = ($valTog === '1');
        } catch (Exception $e) {}
      ?>
      <div class="store-toggle">
        <span class="store-status-label <?= $forceFechada ? 'is-closed' : '' ?>" id="storeStatusLabel">
          <?= $forceFechada ? 'Loja fechada' : 'Loja aberta' ?>
        </span>
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" id="toggleLoja"
                 <?= $forceFechada ? '' : 'checked' ?>>
        </div>
      </div>
    </div>

    <div class="sidebar-plan">
      <div class="plan-icon">
        <i class="bi bi-gem"></i>
      </div>
      <div>
        <div class="plan-title"><?= htmlspecialchars($planoNome) ?></div>
        <div class="plan-sub<?= $planoStatus === 'expirado' ? ' is-expired' : '' ?>">
          <?= htmlspecialchars($planoExpira !== '' ? $planoExpira : '-') ?>
          <?php if ($planoBadge): ?>
            <span class="plan-badge"><?= htmlspecialchars($planoBadge) ?></span>
          <?php endif; ?>
        </div>
      </div>
    </div>

    <?php if ($secAcessoRapido): ?>
      <div class="sidebar-section-title">Acesso rapido</div>
      <ul class="sidebar-menu">
        <?php if ($mostrarDashboard): ?>
          <li>
            <a href="dashboard" class="<?= $rota=='dashboard.php'?'active':'' ?>">
              <i class="bi bi-house"></i>
              <span>Dashboard</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarMateriaPrima): ?>
          <li>
            <a href="cad_materia_prima" class="<?= $rota=='cad_materia_prima.php'?'active':'' ?>">
              <i class="bi bi-box-seam"></i>
              <span>Matéria-prima</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarMateriaPrimaControle): ?>
          <li>
            <a href="cad_materia_prima" class="<?= $rota=='cad_materia_prima.php'?'active':'' ?>">
              <i class="bi bi-box-seam"></i>
              <span>Materia-prima</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarMateriaPrimaControle): ?>
          <li>
            <a href="cad_materia_prima" class="<?= $rota=='cad_materia_prima.php'?'active':'' ?>">
              <i class="bi bi-box-seam"></i>
              <span>Materia-prima</span>
            </a>
          </li>
        <?php endif; ?>
      </ul>
    <?php endif; ?>

    <?php if ($secDiaADia): ?>
      <div class="sidebar-section-title">Dia a dia</div>
      <ul class="sidebar-menu">
        <?php if ($mostrarPdv): ?>
          <li>
            <a href="pdv" class="<?= $rota=='pdv.php'?'active':'' ?>" data-pdv-modal="1">
              <i class="bi bi-bag-check"></i>
              <span>Pedidos (PDV)</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarGestor): ?>
          <li>
            <a href="gestor_pedidos" class="<?= $rota=='gestor_pedidos.php'?'active':'' ?>">
              <i class="bi bi-kanban"></i>
              <span>Gestor de Pedidos</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarPedidos): ?>
          <li>
            <a href="pedidos" class="<?= ($rota=='pedidos.php' || $rota=='pedido.php')?'active':'' ?>">
              <i class="bi bi-receipt"></i>
              <span>Lista de Pedidos</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarOrcamentos): ?>
          <li>
            <a href="orcamentos" class="<?= $rota=='orcamentos.php'?'active':'' ?>">
              <i class="bi bi-file-earmark-text"></i>
              <span>Orçamento/Recibo</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarProdutos): ?>
          <div class="sidebar-section-title">Catálogo</div>
          <li>
            <a href="produtos" class="<?= ($rota=='produtos.php' || $rota=='produtos.php')?'active':'' ?>">
              <i class="bi bi-bag"></i>
              <span>Produtos</span>
            </a>
          </li>

        <?php endif; ?>
        <?php if ($mostrarPromo): ?>
          <li>
            <a href="promo" class="<?= $rota=='promo.php'?'active':'' ?>">
              <i class="bi bi-megaphone"></i>
              <span>Promo</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarEstoque): ?>
          <li>
            <a href="estoque" class="<?= $rota=='estoque.php'?'active':'' ?>">
              <i class="bi bi-box-seam"></i>
              <span>Estoque</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarClientes): ?>
          <li>
            <a href="clientes" class="<?= ($rota=='clientes.php' || $rota=='clientes.php')?'active':'' ?>">
              <i class="bi bi-grid-3x3-gap"></i>
              <span>Clientes</span>
            </a>
          </li>
        <?php endif; ?>
      </ul>
    <?php endif; ?>

    <?php if ($secRelatorios): ?>
      <div class="sidebar-section-title">Relatorios</div>
      <ul class="sidebar-menu">
        <?php if ($mostrarRelatorios): ?>
          <li>
            <a href="relatorios" class="<?= $rota=='relatorios.php'?'active':'' ?>">
              <i class="bi bi-bar-chart"></i>
              <span>Vendas</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarRelatorios): ?>
          <li>
            <a href="relatorios_clientes" class="<?= $rota=='relatorios_clientes.php'?'active':'' ?>">
              <i class="bi bi-people"></i>
              <span>Relatório de clientes</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarFidelidade): ?>
          <li>
            <a href="relatorios_fidelidade" class="<?= $rota=='relatorios_fidelidade.php'?'active':'' ?>">
              <i class="bi bi-award"></i>
              <span>Fidelidade</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarCrossSellRelatorio): ?>
          <li>
            <a href="relatorio_cross_sell" class="<?= $rota=='relatorio_cross_sell.php'?'active':'' ?>">
              <i class="bi bi-shuffle"></i>
              <span>Cross-sell</span>
            </a>
          </li>
        <?php endif; ?>
      </ul>
    <?php endif; ?>

    <?php if ($secControle): ?>
      <div class="sidebar-section-title">Controle</div>
      <ul class="sidebar-menu">
        <?php if ($mostrarMateriaPrimaControleControl): ?>
          <li>
            <a href="cad_materia_prima" class="<?= $rota=='cad_materia_prima.php'?'active':'' ?>">
              <i class="bi bi-box-seam"></i>
              <span>Materia-prima</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarEntradaSaida): ?>
          <li>
            <a href="entrada_saida" class="<?= $rota=='entrada_saida.php'?'active':'' ?>">
              <i class="bi bi-arrow-left-right"></i>
              <span>Entrada / saída</span>
            </a>
          </li>
        <?php endif; ?>
      </ul>
    <?php endif; ?>







    <?php if ($secFinanceiro): ?>
      <div class="sidebar-section-title">Financeiro</div>
      <ul class="sidebar-menu">
        <li>
          <a href="financeiro_dashboard" class="<?= $rota=='financeiro_dashboard.php'?'active':'' ?>">
            <i class="bi bi-pie-chart"></i>
            <span>Dashboard</span>
          </a>
        </li>
        <li>
          <a href="financeiro_lancamentos" class="<?= $rota=='financeiro_lancamentos.php'?'active':'' ?>">
            <i class="bi bi-arrow-left-right"></i>
            <span>Lancamentos</span>
          </a>
        </li>
        <li>
          <a href="financeiro_categorias" class="<?= $rota=='financeiro_categorias.php'?'active':'' ?>">
            <i class="bi bi-diagram-3"></i>
            <span>Categorias</span>
          </a>
        </li>
        <li>
          <a href="financeiro_contas" class="<?= $rota=='financeiro_contas.php'?'active':'' ?>">
            <i class="bi bi-bank"></i>
            <span>Contas</span>
          </a>
        </li>
        <li>
          <a href="financeiro_formas_pagamento" class="<?= $rota=='financeiro_formas_pagamento.php'?'active':'' ?>">
            <i class="bi bi-credit-card-2-front"></i>
            <span>Formas de pagamento</span>
          </a>
        </li>
        <li>
          <a href="financeiro_dre" class="<?= $rota=='financeiro_dre.php'?'active':'' ?>">
            <i class="bi bi-table"></i>
            <span>DRE</span>
          </a>
        </li>
      </ul>
    <?php endif; ?>

    <?php if ($secMonitorar): ?>
      <div class="sidebar-section-title">Monitorar</div>
      <ul class="sidebar-menu">
        <?php if ($mostrarWhatsLilly): ?>
        <li>
          <a href="whatslilly" class="<?= $rota=='whatslilly.php'?'active':'' ?>" style="display:flex;align-items:center;gap:8px;">
            <i class="bi bi-whatsapp" style="color:#25d366"></i>
            <span>WhatsLilly</span>
            <?php if ($wlNaoLidas > 0): ?>
            <span class="sidebar-wl-badge" id="wlSidebarBadge"><?= $wlNaoLidas > 99 ? '99+' : $wlNaoLidas ?></span>
            <?php else: ?>
            <span class="sidebar-wl-badge" id="wlSidebarBadge" style="display:none">0</span>
            <?php endif; ?>
          </a>
        </li>
        <?php endif; ?>

        <?php if ($mostrarListaTransmissao): ?>
          <li>
            <a href="lista_transmissao" class="<?= $rota=='lista_transmissao.php'?'active':'' ?>">
              <i class="bi bi-broadcast"></i>
              <span>Lista de Transmissão</span>
            </a>
          </li>
        <?php endif; ?>
      </ul>
    <?php endif; ?>

    <?php if ($secGerenciar): ?>
      <div class="sidebar-section-title">Gerenciar</div>
      <ul class="sidebar-menu">
        <?php if ($mostrarGerenciamento): ?>
          <li>
            <a href="superadmin/dashboard" class="<?= $emSuperadmin?'active':'' ?>">
              <i class="bi bi-building-gear"></i>
              <span>Gerenciamento</span>
            </a>
          </li>
        <?php endif; ?>

        <?php if ($mostrarMotoboys): ?>
          <li>
            <a href="motoboys" class="<?= $rota=='motoboys.php'?'active':'' ?>">
              <i class="bi bi-bicycle"></i>
              <span>Motoboys</span>
            </a>
          </li>
        <?php endif; ?>

        <?php if ($mostrarModoGarcom): ?>
          <li>
            <a href="modo_garcom" class="<?= $rota=='modo_garcom.php'?'active':'' ?>">
              <i class="bi bi-person-badge"></i>
              <span>Modo Garçom</span>
            </a>
          </li>
        <?php endif; ?>

        


        <?php if ($mostrarControleCaixa): ?>
          <li>
            <a href="controle_caixa" class="<?= $rota=='controle_caixa.php'?'active':'' ?>">
              <i class="bi bi-cash-stack"></i>
              <span>Controle de caixa</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarControleFiado): ?>
          <li>
            <a href="controle_fiado" class="<?= $rota=='controle_fiado.php'?'active':'' ?>">
              <i class="bi bi-journal-text"></i>
              <span>Controle de fiado</span>
            </a>
          </li>
        <?php endif; ?>

        

        <?php if ($mostrarCupons): ?>
          <li>
            <a href="cupons" class="<?= $rota=='cupons.php'?'active':'' ?>">
              <i class="bi bi-ticket-perforated"></i>
              <span>Cupons</span>
            </a>
          </li>
        <?php endif; ?>
        <?php if ($mostrarCrossSellConfig): ?>
          <li>
            <a href="#" id="btnAbrirCrossSell" onclick="event.preventDefault()">
              <i class="bi bi-shuffle"></i>
              <span>Cross-sell</span>
            </a>
          </li>
        <?php endif; ?>
        <li>
          <a href="avaliacoes" class="<?= $rota=='avaliacoes.php'?'active':'' ?>">
            <i class="bi bi-star-half"></i>
            <span>Avaliações</span>
          </a>
        </li>
        <li>
          <a href="plan-details" class="<?= $rota=='plan-details.php'?'active':'' ?>">
            <i class="bi bi-credit-card"></i>
            <span>Assinatura</span>
          </a>
        </li>
        <?php if ($mostrarConfiguracoes): ?>
          <li>
            <a href="configuracoes" class="<?= $rota=='configuracoes.php'?'active':'' ?>">
              <i class="bi bi-gear"></i>
              <span>Configurações</span>
            </a>
          </li>
        <?php endif; ?>
      </ul>
    <?php endif; ?>

    <div class="sidebar-user">
      <div class="user-info">
        <div class="user-name"><?= htmlspecialchars($usuarioNome) ?></div>
        <div class="user-email"><?= htmlspecialchars($lojaEmail) ?></div>
      </div>
      <a href="logout" class="user-logout" title="Sair">
        <i class="bi bi-box-arrow-right"></i>
        
      </a>
    </div>
  </aside>

  <!-- OVERLAY MOBILE -->
  <div class="sidebar-overlay" onclick="toggleSidebar()"></div>

  <div class="loja-info-overlay" id="lojaInfoOverlay" aria-hidden="true">
    <div class="loja-info-modal" role="dialog" aria-modal="true" aria-label="Informações da loja">
      <button type="button" class="loja-info-close" id="lojaInfoClose" aria-label="Fechar">×</button>
      <div class="loja-info-titlebar">
        <h3>Informacoes da loja</h3>
      </div>
      <?php if (!empty($lojaCapa)): ?>
        <div class="loja-info-banner">
          <img src="<?= htmlspecialchars($lojaCapa) ?>" alt="Capa da loja">
        </div>
      <?php else: ?>
        <div class="loja-info-banner is-placeholder">
          <div class="banner-placeholder-icon">
            <i class="bi bi-image"></i>
          </div>
          <div class="banner-placeholder-text">Sem capa cadastrada</div>
        </div>
      <?php endif; ?>
      <div class="loja-info-head">
        <div class="loja-info-avatar<?= !empty($lojaPerfil) ? ' has-logo' : '' ?>">
          <?php if (!empty($lojaPerfil)): ?>
            <img src="<?= htmlspecialchars($lojaPerfil) ?>" alt="Loja">
          <?php else: ?>
            <?= htmlspecialchars($lojaInicial) ?>
          <?php endif; ?>
        </div>
        <div>
          <div class="loja-info-title"><?= htmlspecialchars($lojaNome) ?></div>
          <div class="loja-info-sub"><?= htmlspecialchars($lojaSubLabel) ?></div>
        </div>
      </div>
      <div class="loja-info-body">
        <div class="loja-info-row">
          <span class="loja-info-label">Contato</span>
          <span class="loja-info-value"><?= htmlspecialchars($lojaContato !== '' ? $lojaContato : 'Não informado') ?></span>
        </div>
        <div class="loja-info-row">
          <span class="loja-info-label">CNPJ</span>
          <span class="loja-info-value"><?= htmlspecialchars($lojaCnpj !== '' ? $lojaCnpj : 'Não informado') ?></span>
        </div>
        <div class="loja-info-row loja-info-row--stack">
          <span class="loja-info-label">Endereço</span>
          <div class="loja-info-value">
            <?php if ($enderecoTem): ?>
              <?php if ($enderecoLinha1 !== ''): ?><div><?= htmlspecialchars($enderecoLinha1) ?></div><?php endif; ?>
              <?php if ($enderecoLinha2 !== ''): ?><div><?= htmlspecialchars($enderecoLinha2) ?></div><?php endif; ?>
              <?php if ($enderecoLinha3 !== ''): ?><div><?= htmlspecialchars($enderecoLinha3) ?></div><?php endif; ?>
              <?php if ($enderecoLinha4 !== ''): ?><div><?= htmlspecialchars($enderecoLinha4) ?></div><?php endif; ?>
            <?php else: ?>
              <div>Não informado</div>
            <?php endif; ?>
          </div>
        </div>
      </div>
    </div>
  </div>

  <style>
    body.dash-diggy .sidebar-user{
      display:flex;
      align-items:center;
      gap:10px;
      width:100%;
      max-width:209px;
      min-height:66px;
      padding:6px 10px;
      border-radius:14px;
      background:#fff;
      border:1px solid #e6e8ee;
      box-sizing:border-box;
    }
    body.dash-diggy .sidebar-user .user-info{
      flex:1;
      min-width:0;
      padding-top:1px;
    }
    body.dash-diggy .sidebar-user .user-name{
      font-size:.72rem;
      font-weight:600;
      color:#0f172a;
      line-height:1.2;
      white-space:normal;
      overflow:visible;
      text-overflow:clip;
      word-break:break-word;
    }
    body.dash-diggy .sidebar-user .user-email{
      font-size:.62rem;
      color:#64748b;
      line-height:1.2;
      white-space:normal;
      overflow:visible;
      text-overflow:clip;
      word-break:break-all;
    }
    body.dash-diggy .sidebar-user .user-logout{
      margin-left:auto;
      flex:0 0 auto;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:28px;
      height:28px;
      border-radius:8px;
      background:#fff;
      border:1px solid #e2e8f0;
      color:#111827;
    }
    body.dash-diggy .sidebar.collapsed{
      width:52px !important;
      padding-left:6px;
      padding-right:6px;
    }
    body.dash-diggy .sidebar.collapsed .sidebar-menu a{
      padding:7px 0;
      min-height:34px;
      justify-content:center;
    }
    body.dash-diggy .sidebar.collapsed .sidebar-menu i{
      width:16px;
      height:16px;
      font-size:14px;
    }
    body.dash-diggy .sidebar.collapsed .sidebar-user{
      display:flex;
      justify-content:center;
      width:100%;
      max-width:none;
      min-height:auto;
      padding:6px;
      background:transparent;
      border:0;
    }
    body.dash-diggy .sidebar.collapsed .sidebar-user .user-info{
      display:none;
    }
    body.dash-diggy .sidebar.collapsed .sidebar-user .user-logout{
      margin-left:0;
      width:32px;
      height:32px;
      border-radius:10px;
    }
    .trial-warning{
      background:#fff7ed;
      border:1px solid #fed7aa;
      color:#9a3412;
      padding:12px 14px;
      border-radius:14px;
      display:flex;
      align-items:center;
      gap:12px;
      justify-content:space-between;
      margin:12px 0 18px;
      box-shadow:0 10px 20px rgba(15,23,42,.08);
      font-size:.9rem;
    }
    .trial-warning strong{font-weight:700}
    .trial-warning .trial-actions{
      display:flex;
      align-items:center;
      gap:10px;
      flex:0 0 auto;
    }
    .trial-warning .trial-btn{
      background:#f97316;
      color:#fff;
      border-radius:10px;
      padding:8px 12px;
      text-decoration:none;
      font-weight:600;
      font-size:.85rem;
    }
    .trial-warning .trial-close{
      border:0;
      background:#fff;
      color:#9a3412;
      width:28px;
      height:28px;
      border-radius:9px;
      cursor:pointer;
      font-size:16px;
      line-height:1;
      box-shadow:0 6px 12px rgba(15,23,42,.08);
    }
    .pdv-modal-overlay{
      position:fixed;
      inset:0;
      background:rgba(15,23,42,.48);
      display:none;
      align-items:stretch;
      justify-content:stretch;
      z-index:1055;
      padding:0;
    }
    .pdv-modal-overlay.show{display:flex}
    .pdv-modal-card{
      background:#fff;
      border-radius:0;
      width:100vw;
      height:100vh;
      max-width:100vw;
      max-height:100vh;
      display:flex;
      flex-direction:column;
      box-shadow:none;
      overflow:hidden;
      position:relative;
      flex:1;
    }
    .pdv-modal-head{
      height:0;
      padding:0;
      border:0;
      overflow:hidden;
    }
    .pdv-modal-head span{display:none}
    .pdv-modal-close{
      border:1px solid #e2e5ea;
      background:#fff;
      width:22px;
      height:22px;
      border-radius:6px;
      color:#9ca3af;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      position:fixed;
      top:12px;
      right:14px;
      z-index:9999;
      box-shadow:none;
      cursor:pointer;
      font-size:.7rem;
      transition:background .15s ease, color .15s ease;
    }
    .pdv-modal-close:hover{
      background:#f3f4f6;
      color:#111827;
    }
    .pdv-modal-body{
      flex:1;
      background:#fff;
      position:relative;
    }
    .pdv-modal-loading{
      position:absolute;
      inset:0;
      display:flex;
      align-items:center;
      justify-content:center;
      flex-direction:column;
      gap:10px;
      background:rgba(248,250,252,.9);
      color:#64748b;
      font-size:.85rem;
      z-index:1;
    }
    .pdv-modal-spinner{
      width:36px;
      height:36px;
      border-radius:50%;
      border:3px solid #e5e7eb;
      border-top-color:#9C5523;
      animation:pdvSpin .9s linear infinite;
    }
    @keyframes pdvSpin{
      to{transform:rotate(360deg)}
    }
    .pdv-modal-iframe{
      width:100%;
      height:100%;
      border:0;
      background:#fff;
    }
    body.pdv-modal-open{
      overflow:hidden;
    }
    @media (max-width: 1280px){
      .pdv-modal-card{
        width:98vw;
        height:96vh;
      }
    }
    @media (max-width: 991px){
      .pdv-modal-card{
        width:99vw;
        height:97vh;
        border-radius:12px;
      }
    }
    @media (max-height: 700px){
      .pdv-modal-card{
        height:98vh;
        border-radius:10px;
      }
      .pdv-modal-overlay{
        padding:6px;
      }
    }

    /* ── Toast global de novo pedido ── */
    .gnotif-toast-container{
      position:fixed;
      top:20px;
      right:20px;
      z-index:99998;
      display:flex;
      flex-direction:column;
      gap:10px;
      pointer-events:none;
    }
    .gnotif-toast{
      pointer-events:auto;
      width:320px;
      max-width:calc(100vw - 40px);
      background:#2b2b2f;
      color:#f2f2f3;
      border-radius:14px;
      padding:14px 16px;
      box-shadow:0 12px 32px rgba(0,0,0,.35);
      cursor:pointer;
      display:flex;
      gap:12px;
      align-items:flex-start;
      transform:translateX(120%);
      opacity:0;
      transition:transform .35s cubic-bezier(.25,.8,.25,1), opacity .35s ease;
    }
    .gnotif-toast.show{
      transform:translateX(0);
      opacity:1;
    }
    .gnotif-toast.hide{
      transform:translateX(120%);
      opacity:0;
    }
    .gnotif-toast-icon{
      width:34px;
      height:34px;
      border-radius:50%;
      background:#9C5523;
      color:#fff;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:1rem;
      flex-shrink:0;
    }
    .gnotif-toast-body{flex:1;min-width:0}
    .gnotif-toast-title{font-size:.9rem;font-weight:700;color:#fff;margin-bottom:2px}
    .gnotif-toast-sub{font-size:.82rem;color:#d4d4d8;margin-bottom:4px}
    .gnotif-toast-meta{font-size:.74rem;color:#9a9aa2}
    .gnotif-toast-close{
      background:none;
      border:none;
      color:#9a9aa2;
      font-size:.85rem;
      line-height:1;
      padding:2px;
      flex-shrink:0;
    }
    .gnotif-toast-close:hover{color:#fff}
  </style>

  <script>
    (function(){
      function atualizarPreloadSidebar(){
        document.documentElement.classList.remove('sidebar-preload');
      }

      function aplicarEstadoSidebar(){
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        const salvo = localStorage.getItem('sidebarCollapsed');
        if (window.innerWidth > 991 && salvo === '1') {
          sidebar.classList.add('collapsed');
          document.body.classList.add('sidebar-collapsed');
        } else if (window.innerWidth > 991) {
          sidebar.classList.remove('collapsed');
          document.body.classList.remove('sidebar-collapsed');
        }
      }

      function aplicarTooltipsSidebar(){
        document.querySelectorAll('.sidebar-menu a').forEach((link) => {
          if (link.dataset.label) return;
          const labelEl = link.querySelector('span:not(.menu-badge)');
          if (!labelEl) return;
          const label = labelEl.textContent.trim();
          if (!label) return;
          link.setAttribute('data-label', label);
          if (!link.hasAttribute('aria-label')) {
            link.setAttribute('aria-label', label);
          }
          if (!link.dataset.tooltipReady) {
            const atualizarPosicao = () => {
              const rect = link.getBoundingClientRect();
              link.style.setProperty('--tooltip-top', `${rect.top + rect.height / 2}px`);
              link.style.setProperty('--tooltip-left', `${rect.right + 12}px`);
            };
            link.addEventListener('mouseenter', atualizarPosicao);
            link.addEventListener('focus', atualizarPosicao);
            link.dataset.tooltipReady = '1';
          }
        });
      }

      aplicarEstadoSidebar();
      aplicarTooltipsSidebar();
      atualizarPreloadSidebar();

      window.toggleSidebar = function(){
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (!sidebar) return;

        if (window.innerWidth <= 991) {
          sidebar.classList.toggle('show');
          if (overlay) {
            overlay.style.display = sidebar.classList.contains('show') ? 'block' : 'none';
          }
          return;
        }

        sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed', sidebar.classList.contains('collapsed'));
        localStorage.setItem(
          'sidebarCollapsed',
          sidebar.classList.contains('collapsed') ? '1' : '0'
        );
      };

      // Clicar no ícone do sistema quando colapsado expande o menu
      const brandLeft = sidebar.querySelector('.brand-left');
      if (brandLeft) {
        brandLeft.addEventListener('click', () => {
          if (sidebar.classList.contains('collapsed')) {
            window.toggleSidebar();
          }
        });
      }

      window.addEventListener('resize', () => {
        if (window.innerWidth <= 991) return;
        aplicarEstadoSidebar();
      });

      const toggleLoja = document.getElementById('toggleLoja');
      const statusLabel = document.getElementById('storeStatusLabel');
      const atualizarStatusLoja = (aberto) => {
        if (!statusLabel) return;
        statusLabel.textContent = aberto ? 'Loja aberta' : 'Loja fechada';
        statusLabel.classList.toggle('is-closed', !aberto);
      };
      const mostrarToastStatusLoja = (aberto) => {
        let container = document.querySelector('.gnotif-toast-container');
        if (!container) {
          container = document.createElement('div');
          container.className = 'gnotif-toast-container';
          document.body.appendChild(container);
        }
        const el = document.createElement('div');
        el.className = 'gnotif-toast';
        el.innerHTML = `
          <div class="gnotif-toast-icon" style="background:${aberto ? '#16a34a' : '#dc2626'}"><i class="bi ${aberto ? 'bi-door-open-fill' : 'bi-door-closed-fill'}"></i></div>
          <div class="gnotif-toast-body">
            <div class="gnotif-toast-title">${aberto ? 'Loja aberta' : 'Loja fechada'}</div>
            <div class="gnotif-toast-sub">${aberto ? 'Os clientes já podem fazer pedidos.' : 'Os clientes não conseguem mais fazer pedidos.'}</div>
          </div>
          <button class="gnotif-toast-close" type="button" aria-label="Fechar"><i class="bi bi-x-lg"></i></button>
        `;
        const remover = () => {
          el.classList.remove('show');
          el.classList.add('hide');
          setTimeout(() => el.remove(), 350);
        };
        el.querySelector('.gnotif-toast-close').addEventListener('click', e => {
          e.stopPropagation();
          remover();
        });
        container.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(remover, 4000);
      };
      if (toggleLoja) {
        toggleLoja.addEventListener('change', async () => {
          const aberto = toggleLoja.checked;
          atualizarStatusLoja(aberto);
          toggleLoja.disabled = true;
          try {
            const res = await fetch('api/loja_toggle.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ aberto })
            });
            const d = await res.json();
            if (!d.ok) {
              /* reverter se falhou */
              toggleLoja.checked = !aberto;
              atualizarStatusLoja(!aberto);
            } else {
              mostrarToastStatusLoja(aberto);
            }
          } catch (e) {
            toggleLoja.checked = !aberto;
            atualizarStatusLoja(!aberto);
          }
          toggleLoja.disabled = false;
        });
      }

      const lojaOverlay = document.getElementById('lojaInfoOverlay');
      const lojaOpen = document.getElementById('openLojaInfo');
      const lojaClose = document.getElementById('lojaInfoClose');
      const abrirLojaInfo = () => {
        if (!lojaOverlay) return;
        lojaOverlay.classList.add('show');
        lojaOverlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('loja-info-open');
      };
      const fecharLojaInfo = () => {
        if (!lojaOverlay) return;
        lojaOverlay.classList.remove('show');
        lojaOverlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('loja-info-open');
      };
      if (lojaOpen) {
        lojaOpen.addEventListener('click', (e) => {
          e.preventDefault();
          abrirLojaInfo();
        });
      }
      if (lojaClose) {
        lojaClose.addEventListener('click', fecharLojaInfo);
      }
      if (lojaOverlay) {
        lojaOverlay.addEventListener('click', (e) => {
          if (e.target === lojaOverlay) {
            fecharLojaInfo();
          }
        });
      }
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lojaOverlay && lojaOverlay.classList.contains('show')) {
          fecharLojaInfo();
        }
      });
    })();
  </script>

  <?php $impressaoQzJsVerSidebar = filemtime(__DIR__ . '/../assets/js/impressao_qz.js'); ?>
  <script>window.LOJA_NOME_IMPRESSAO = <?= json_encode($lojaNome ?? '', JSON_UNESCAPED_UNICODE) ?>;</script>
  <script src="assets/js/vendor/qz-tray.js"></script>
  <script src="assets/js/impressao_qz.js?v=<?= $impressaoQzJsVerSidebar ?>"></script>

  <div class="pdv-modal-overlay" id="pdvModalOverlay" aria-hidden="true">
    <div class="pdv-modal-card" role="dialog" aria-modal="true" aria-label="PDV">
      <div class="pdv-modal-head">
        <span>Pedidos balcao (PDV)</span>
      </div>
      <button type="button" class="pdv-modal-close" id="pdvModalClose" aria-label="Fechar PDV">
        <i class="bi bi-x"></i>
      </button>
      <div class="pdv-modal-body">
        <div class="pdv-modal-loading" id="pdvModalLoading">
          <div class="pdv-modal-spinner"></div>
          <div>Carregando PDV...</div>
        </div>
        <iframe class="pdv-modal-iframe" id="pdvModalFrame" title="PDV"></iframe>
      </div>
    </div>
  </div>

  <script>
    (function(){
      const overlay = document.getElementById('pdvModalOverlay');
      const frame = document.getElementById('pdvModalFrame');
      const closeBtn = document.getElementById('pdvModalClose');
      const loading = document.getElementById('pdvModalLoading');
      const pdvLink = document.querySelector('[data-pdv-modal="1"]');

      function abrirPdvModal(pedidoId){
        if (!overlay || !frame) return;
        if (loading) loading.style.display = 'flex';
        const editParam = pedidoId ? `&pedido_id=${pedidoId}` : '';
        frame.src = `pdv.php?modal=1${editParam}&v=${Date.now()}`;
        overlay.classList.add('show');
        document.body.classList.add('pdv-modal-open');
        overlay.setAttribute('aria-hidden', 'false');
      }

      function fecharPdvModal(){
        if (!overlay || !frame) return;
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('pdv-modal-open');
        frame.src = '';
        if (loading) loading.style.display = 'flex';
      }

      if (pdvLink) {
        pdvLink.addEventListener('click', (e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          abrirPdvModal();
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', fecharPdvModal);
      }
      if (frame) {
        frame.addEventListener('load', () => {
          if (loading) loading.style.display = 'none';
        });
      }

      if (overlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            fecharPdvModal();
          }
        });
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay && overlay.classList.contains('show')) {
          fecharPdvModal();
        }
      });

      window.abrirPdvModal = abrirPdvModal;
      window.fecharPdvModal = fecharPdvModal;
    })();
  </script>

  <script>
    (function(){
      const skipSelect = (select) => {
        if (!select) return true;
        if (select.dataset.native === '1' || select.dataset.native === 'true') return true;
        if (select.classList.contains('native-select') || select.classList.contains('no-custom-select')) return true;
        if (select.classList.contains('dash-select-native')) return true;
        if (select.closest('.dash-select')) return true;
        if (select.multiple || (select.size && Number(select.size) > 1)) return true;
        if (select.closest('.flatpickr-calendar')) return true;
        return false;
      };

      function buildCustomSelect(select){
        if (!select || select.dataset.customBuilt === '1') return;
        if (skipSelect(select)) return;
        select.dataset.customBuilt = '1';

        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select';
        const parent = select.parentElement;
        if (!parent) return;
        parent.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        select.style.display = 'none';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-select-trigger';

        const left = document.createElement('span');
        left.className = 'select-left';

        const iconClass = select.dataset.icon;
        if (iconClass) {
          const icon = document.createElement('i');
          icon.className = `bi ${iconClass}`;
          icon.classList.add('select-icon');
          left.appendChild(icon);
        }

        const value = document.createElement('span');
        value.className = 'custom-select-value';
        left.appendChild(value);
        trigger.appendChild(left);

        const arrow = document.createElement('span');
        arrow.className = 'select-arrow';
        arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
        trigger.appendChild(arrow);

        const menu = document.createElement('div');
        menu.className = 'custom-select-menu';

        const renderOptions = () => {
          menu.innerHTML = '';
          Array.from(select.options).forEach((opt) => {
            const item = document.createElement('div');
            item.className = 'custom-option' + (opt.selected ? ' selected' : '');
            item.dataset.value = opt.value;
            item.textContent = opt.textContent;
            item.addEventListener('click', () => {
              select.value = opt.value;
              value.textContent = opt.textContent;
              menu.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
              item.classList.add('selected');
              wrapper.classList.remove('open');
              select.dispatchEvent(new Event('change', { bubbles: true }));
            });
            menu.appendChild(item);
          });
        };

        const syncValue = () => {
          const selected = select.options[select.selectedIndex];
          const placeholder = select.dataset.placeholder || 'Selecionar';
          value.textContent = selected ? selected.textContent : placeholder;
          menu.querySelectorAll('.custom-option').forEach(o => {
            o.classList.toggle('selected', o.dataset.value === select.value);
          });
          if (select.disabled) {
            wrapper.classList.add('is-disabled');
            trigger.setAttribute('disabled', 'disabled');
          } else {
            wrapper.classList.remove('is-disabled');
            trigger.removeAttribute('disabled');
          }
        };

        renderOptions();
        syncValue();

        trigger.addEventListener('click', (e) => {
          if (select.disabled) return;
          e.preventDefault();
          document.querySelectorAll('.custom-select.open').forEach(cs => {
            if (cs !== wrapper) cs.classList.remove('open');
          });
          wrapper.classList.toggle('open');
        });

        select.addEventListener('change', syncValue);

        wrapper.appendChild(trigger);
        wrapper.appendChild(menu);
      }

      window.syncCustomSelect = function(select){
        if (!select) return;
        const wrapper = select.closest('.custom-select');
        const value = wrapper ? wrapper.querySelector('.custom-select-value') : null;
        const menu = wrapper ? wrapper.querySelector('.custom-select-menu') : null;
        if (!wrapper || !value || !menu) return;
        const selected = select.options[select.selectedIndex];
        const placeholder = select.dataset.placeholder || 'Selecionar';
        value.textContent = selected ? selected.textContent : placeholder;
        menu.querySelectorAll('.custom-option').forEach(o => {
          o.classList.toggle('selected', o.dataset.value === select.value);
        });
      };

      const initCustomSelects = (root = document) => {
        root.querySelectorAll('select').forEach(buildCustomSelect);
      };

      document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-select.open').forEach(cs => {
          if (!cs.contains(e.target)) cs.classList.remove('open');
        });
      });

      document.addEventListener('DOMContentLoaded', () => initCustomSelects(document));
      document.addEventListener('shown.bs.modal', (e) => initCustomSelects(e.target));
      window.refreshCustomSelects = initCustomSelects;
    })();
  </script>

  <script>
    (function(){
      const toggle = document.getElementById('notifyToggle');
      const dropdown = document.getElementById('notifyDropdown');
      if (dropdown) document.body.appendChild(dropdown);
      const badge = document.getElementById('notifyBadge');
      const list = document.getElementById('notifyList');
      const tabs = dropdown ? dropdown.querySelectorAll('[data-notify-tab]') : [];
      const lojaId = <?= (int)($_SESSION['loja_id'] ?? 0) ?>;
      const apiUrl = "<?= rtrim(dirname($_SERVER['PHP_SELF']), '/\\') ?>/api/notificacoes_pedidos.php";
      const storageKey = `notif_last_seen_${lojaId || 0}`;
      const readKey = `notif_read_${lojaId || 0}`;
      let itens = [];
      let tabAtual = 'unread';
      let lidas = new Set();
      let maiorIdVistoAlerta = null;

      /* ── Alarme sonoro de novo pedido (estilo alarme de celular) ── */
      let _alarmeCtx = null;
      const _obterAlarmeCtx = () => {
        if (_alarmeCtx) return _alarmeCtx;
        try { _alarmeCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
        return _alarmeCtx;
      };
      document.addEventListener('click', function desbloquearAudio(){
        const ctx = _obterAlarmeCtx();
        if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      }, { once: false });

      const tocarAlarmeNovoPedido = () => {
        const ctx = _obterAlarmeCtx();
        if (!ctx) return;
        if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
        const tocarBip = (freq, inicio, duracao, vol) => {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.value = freq;
            const t = ctx.currentTime + inicio;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
            osc.start(t);
            osc.stop(t + duracao + 0.02);
          } catch (e) {}
        };
        /* padrão de alarme: bipes agudos alternados, repetidos, volume alto */
        const passo = 0.16;
        for (let ciclo = 0; ciclo < 2; ciclo++) {
          for (let i = 0; i < 4; i++) {
            tocarBip(i % 2 === 0 ? 1174 : 1568, (ciclo * 4 + i) * passo, passo * 0.8, 0.55);
          }
        }
      };

      /* ── Toast global de novo pedido (aparece em qualquer tela do admin) ── */
      let gnotifToastContainer = document.querySelector('.gnotif-toast-container');
      if (!gnotifToastContainer) {
        gnotifToastContainer = document.createElement('div');
        gnotifToastContainer.className = 'gnotif-toast-container';
        document.body.appendChild(gnotifToastContainer);
      }

      const abrirPedidoNotificado = (item) => {
        marcarLida(+item.id);
        atualizarBadge();
        if (typeof window.abrirModalPedidoDetalhe === 'function') {
          window.abrirModalPedidoDetalhe(item.id);
        } else {
          window.location.href = `gestor_pedidos.php?pedido=${item.id}`;
        }
      };

      const mostrarToastGlobalPedido = (item) => {
        const el = document.createElement('div');
        el.className = 'gnotif-toast';
        const codigo = item.codigo ? item.codigo : item.id;
        el.innerHTML = `
          <div class="gnotif-toast-icon"><i class="bi bi-bag-check-fill"></i></div>
          <div class="gnotif-toast-body">
            <div class="gnotif-toast-title">Novo Pedido!</div>
            <div class="gnotif-toast-sub">Você recebeu um novo pedido!</div>
            <div class="gnotif-toast-meta">Pedido #${codigo} · ${item.cliente || 'Cliente'}</div>
          </div>
          <button class="gnotif-toast-close" type="button" aria-label="Fechar"><i class="bi bi-x-lg"></i></button>
        `;

        const remover = () => {
          el.classList.remove('show');
          el.classList.add('hide');
          setTimeout(() => el.remove(), 350);
        };

        el.addEventListener('click', () => {
          remover();
          abrirPedidoNotificado(item);
        });
        el.querySelector('.gnotif-toast-close').addEventListener('click', e => {
          e.stopPropagation();
          remover();
        });

        gnotifToastContainer.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
        setTimeout(remover, 8000);
      };

      const formatarTempo = (iso) => {
        if (!iso) return '';
        const data = new Date(iso.replace(' ', 'T'));
        if (Number.isNaN(data.getTime())) return '';
        const diff = Math.max(0, Date.now() - data.getTime());
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'agora';
        if (min < 60) return `há ${min} min`;
        const horas = Math.floor(min / 60);
        if (horas < 24) return `há ${horas} h`;
        const dias = Math.floor(horas / 24);
        return `há ${dias} dia${dias > 1 ? 's' : ''}`;
      };

      const obterLastSeen = () => Number(localStorage.getItem(storageKey) || 0);
      const definirLastSeen = (id) => {
        localStorage.setItem(storageKey, String(id));
      };
      const carregarLidas = () => {
        try {
          const raw = localStorage.getItem(readKey);
          if (!raw) return;
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            lidas = new Set(arr.map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n)));
          }
        } catch (e) {}
      };
      const salvarLidas = () => {
        const arr = Array.from(lidas).slice(-200);
        localStorage.setItem(readKey, JSON.stringify(arr));
      };
      const marcarLida = (id) => {
        if (!id) return;
        lidas.add(id);
        salvarLidas();
      };

      const atualizarBadge = () => {
        const naoLidas = itens.filter(i => !lidas.has(i.id));
        if (badge) {
          badge.textContent = naoLidas.length;
          badge.classList.toggle('show', naoLidas.length > 0);
        }
      };

      const renderizar = () => {
        if (!list) return;
        const visiveis = tabAtual === 'unread'
          ? itens.filter(i => !lidas.has(i.id))
          : itens;
        if (!visiveis.length) {
          const mensagem = tabAtual === 'unread'
            ? 'Nenhuma notificação no momento.'
            : 'Nenhuma notificação.';
          list.innerHTML = `<div class="notify-empty"><i class="bi bi-bell"></i><div>${mensagem}</div></div>`;
          return;
        }
        list.innerHTML = visiveis.map((item) => {
          const tempo = formatarTempo(item.criado_em);
          const codigo = item.codigo ? item.codigo : item.id;
          const pedidoLabel = `Pedido #${codigo} - ${item.cliente || 'Cliente'}`;
          const isEditado = item.tipo === 'editado';
          const isNaoLida = !lidas.has(item.id);
          const titulo = isEditado ? 'Pedido editado.' : 'Você recebeu um novo pedido.';
          const cls = isEditado ? 'notify-item is-clickable is-editado' : 'notify-item is-clickable';
          return `
            <div class="${cls}" data-pedido-id="${item.id}">
              <div class="notify-icon"><i class="bi bi-receipt"></i></div>
              <div>
                <div class="notify-item-title">${titulo}</div>
                <div class="notify-item-sub">${pedidoLabel}</div>
                <div class="notify-item-time">${tempo || ''}${isNaoLida ? '<span class="notify-dot"></span>' : ''}</div>
              </div>
            </div>
          `;
        }).join('');
      };

      const carregar = async () => {
        try {
          const res = await fetch(apiUrl, { cache: 'no-store', credentials: 'same-origin' });
          if (!res.ok) {
            return;
          }
          const data = await res.json();
          if (!data || !data.ok) {
            return;
          }
          itens = data.pedidos || [];
          atualizarBadge();
          renderizar();

          const novos = itens.filter(i => i.tipo === 'novo');
          const maiorId = novos.length ? Math.max(...novos.map(i => +i.id)) : 0;
          if (maiorIdVistoAlerta === null) {
            maiorIdVistoAlerta = maiorId;
          } else if (maiorId > maiorIdVistoAlerta) {
            const recemChegados = novos.filter(i => +i.id > maiorIdVistoAlerta);
            recemChegados.forEach(mostrarToastGlobalPedido);
            // Som de novo pedido: só toca para pedidos feitos pelo cliente em loja.php
            if (recemChegados.some(i => i.origem === 'loja')) {
              tocarAlarmeNovoPedido();
            }
            // Impressão automática do cupom de cozinha: só para pedidos feitos pelo cliente em loja.php
            if (typeof impressaoQZ !== 'undefined') {
              recemChegados.filter(i => i.origem === 'loja').forEach(i => {
                impressaoQZ.imprimirAutomaticoPedido('cozinha', i.id, <?= json_encode($lojaNome ?? '', JSON_UNESCAPED_UNICODE) ?>);
              });
            }
            maiorIdVistoAlerta = maiorId;
          }
        } catch (e) {
        }
      };

      const posicionarDropdown = () => {
        if (!toggle || !dropdown) return;
        const rect = toggle.getBoundingClientRect();
        const spacing = 6;
        const width = dropdown.offsetWidth || 300;
        let left = rect.right + spacing;
        const top = rect.bottom + spacing;
        if (left + width > window.innerWidth - 12) {
          left = rect.left - width - spacing;
        }
        if (left < 12) left = 12;
        dropdown.style.left = `${left}px`;
        dropdown.style.top = `${top}px`;
      };

      if (toggle && dropdown) {
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.toggle('show');
          dropdown.setAttribute('aria-hidden', dropdown.classList.contains('show') ? 'false' : 'true');
          if (dropdown.classList.contains('show')) {
            posicionarDropdown();
            tabs.forEach(t => t.classList.toggle('active', t.dataset.notifyTab === tabAtual));
            carregar();
            renderizar();
          }
        });
        window.addEventListener('resize', () => {
          if (dropdown.classList.contains('show')) posicionarDropdown();
        });
        document.addEventListener('click', () => {
          dropdown.classList.remove('show');
          dropdown.setAttribute('aria-hidden', 'true');
        });
        dropdown.addEventListener('click', (e) => e.stopPropagation());
      }

      if (list) {
        list.addEventListener('click', (e) => {
          const item = e.target.closest('.notify-item');
          if (!item) return;
          const id = item.dataset.pedidoId;
          if (!id) return;
          const idNum = parseInt(id, 10);
          if (!Number.isNaN(idNum)) {
            marcarLida(idNum);
          }
          atualizarBadge();
          tabAtual = 'all';
          tabs.forEach(t => t.classList.toggle('active', t.dataset.notifyTab === 'all'));
          dropdown.classList.remove('show');
          dropdown.setAttribute('aria-hidden', 'true');
          if (typeof window.abrirModalPedidoDetalhe === 'function') {
            window.abrirModalPedidoDetalhe(id);
          } else {
            window.location.href = `gestor_pedidos.php?pedido=${id}`;
          }
        });
      }

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabAtual = tab.dataset.notifyTab || 'all';
          tabs.forEach(t => t.classList.toggle('active', t === tab));
          renderizar();
        });
      });

      carregarLidas();
      tabs.forEach(t => t.classList.toggle('active', t.dataset.notifyTab === tabAtual));
      carregar();
      setInterval(carregar, 10000);
      window.addEventListener('focus', carregar);
    })();
  </script>

  <!-- ── Aviso de produtos proximos do prazo de validade (admin apenas) ── -->
  <script>
    (function(){
      const lojaId = <?= (int)($_SESSION['loja_id'] ?? 0) ?>;
      const apiUrl = "<?= rtrim(dirname($_SERVER['PHP_SELF']), '/\\') ?>/api/produtos_validade_check.php";
      const storageKey = `validade_notif_${lojaId || 0}`;

      const mostrarToastValidade = (produtos) => {
        let container = document.querySelector('.gnotif-toast-container');
        if (!container) {
          container = document.createElement('div');
          container.className = 'gnotif-toast-container';
          document.body.appendChild(container);
        }
        const el = document.createElement('div');
        el.className = 'gnotif-toast';
        const primeiro = produtos[0];
        const restante = produtos.length - 1;
        const sub = restante > 0
          ? `${primeiro.nome} e mais ${restante} produto${restante > 1 ? 's' : ''}`
          : primeiro.nome;
        el.innerHTML = `
          <div class="gnotif-toast-icon" style="background:#d97706"><i class="bi bi-exclamation-triangle-fill"></i></div>
          <div class="gnotif-toast-body">
            <div class="gnotif-toast-title">Prazo de validade</div>
            <div class="gnotif-toast-sub">${sub}</div>
            <div class="gnotif-toast-meta">Confira em Produtos › Prazo de validade</div>
          </div>
          <button class="gnotif-toast-close" type="button" aria-label="Fechar"><i class="bi bi-x-lg"></i></button>
        `;
        const remover = () => {
          el.classList.remove('show');
          el.classList.add('hide');
          setTimeout(() => el.remove(), 350);
        };
        el.addEventListener('click', () => {
          remover();
          window.location.href = 'produtos.php';
        });
        el.querySelector('.gnotif-toast-close').addEventListener('click', e => {
          e.stopPropagation();
          remover();
        });
        container.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
      };

      const verificarValidade = () => {
        if (!lojaId) return;
        fetch(apiUrl)
          .then(r => r.json())
          .then(d => {
            if (!d.ok || !Array.isArray(d.produtos) || !d.produtos.length) return;
            const chaveAtual = d.produtos.map(p => `${p.id}:${p.dias_restantes}`).sort().join(',');
            const chaveAnterior = sessionStorage.getItem(storageKey) || '';
            if (chaveAtual === chaveAnterior) return;
            sessionStorage.setItem(storageKey, chaveAtual);
            mostrarToastValidade(d.produtos);
          })
          .catch(() => {});
      };

      verificarValidade();
      setInterval(verificarValidade, 15 * 60 * 1000);
    })();
  </script>

  <!-- ── Modal: Configurações do Cross-sell (global, todas as telas) ── -->
  <style>
    .crosssell-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99990;display:none;align-items:center;justify-content:center;padding:16px}
    .crosssell-overlay.show{display:flex}
    .crosssell-modal{background:#fff;border-radius:20px;width:100%;max-width:460px;max-height:85vh;overflow-y:auto;box-shadow:0 24px 60px rgba(15,23,42,.25)}
    .crosssell-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 4px}
    .crosssell-head-title{font-size:1.05rem;font-weight:700;color:#0f172a}
    .crosssell-close{width:30px;height:30px;border-radius:50%;border:0;background:#f3f4f6;color:#555;display:flex;align-items:center;justify-content:center;font-size:1rem;cursor:pointer;flex-shrink:0}
    .crosssell-close:hover{background:#e5e7eb}
    .crosssell-body{padding:16px 22px 22px;display:flex;flex-direction:column;gap:14px}
    .crosssell-card{border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px}
    .crosssell-card-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .crosssell-card-title{font-size:.92rem;font-weight:700;color:#0f172a;margin-bottom:4px}
    .crosssell-card-desc{font-size:.8rem;color:#64748b;line-height:1.4}
    .crosssell-text{font-size:.82rem;color:#475569;line-height:1.55;margin-bottom:10px}
    .crosssell-text:last-child{margin-bottom:0}
    .crosssell-toggle{position:relative;width:42px;height:24px;flex-shrink:0;display:inline-block}
    .crosssell-toggle input{opacity:0;width:0;height:0}
    .crosssell-toggle-slider{position:absolute;inset:0;background:#cbd5e1;border-radius:999px;cursor:pointer;transition:background .2s}
    .crosssell-toggle-slider::before{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform .2s}
    .crosssell-toggle input:checked+.crosssell-toggle-slider{background:#e63770}
    .crosssell-toggle input:checked+.crosssell-toggle-slider::before{transform:translateX(18px)}
    .crosssell-stat-card{border:1px solid #e5e7eb;border-radius:14px;padding:18px;text-align:center}
    .crosssell-stat-label{font-size:.82rem;color:#475569;margin-bottom:6px}
    .crosssell-stat-value{font-size:1.6rem;font-weight:800;color:#0f172a;margin-bottom:4px}
    .crosssell-stat-sub{font-size:.78rem;color:#94a3b8}
    .crosssell-stat-link{display:inline-block;margin-top:10px;font-size:.78rem;font-weight:700;color:#9C5523;text-decoration:none}
    .crosssell-stat-link:hover{text-decoration:underline}
    .crosssell-grupo-badge{display:inline-flex;align-items:center;gap:6px;background:#0f172a;color:#fff;font-size:.76rem;font-weight:700;padding:5px 12px;border-radius:999px;margin-bottom:8px}
    .crosssell-grupo-item{border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin-top:10px}
    .crosssell-grupo-count{font-size:.86rem;font-weight:700;color:#0f172a;margin-bottom:3px}
    .crosssell-grupo-produtos{font-size:.78rem;color:#94a3b8}
    .crosssell-empty{font-size:.82rem;color:#94a3b8;text-align:center;padding:8px 0}
  </style>
  <div class="crosssell-overlay" id="crossSellOverlay">
    <div class="crosssell-modal" onclick="event.stopPropagation()">
      <div class="crosssell-head">
        <span class="crosssell-head-title">Configurações do Cross-sell</span>
        <button type="button" class="crosssell-close" id="btnFecharCrossSell"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="crosssell-body">
        <div class="crosssell-card">
          <div class="crosssell-card-row">
            <div>
              <div class="crosssell-card-title">Cross-sell</div>
              <div class="crosssell-card-desc">Gere automaticamente grupos de cross-sell para aumentar o faturamento da sua loja.</div>
            </div>
            <label class="crosssell-toggle">
              <input type="checkbox" id="crossSellToggle">
              <span class="crosssell-toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="crosssell-stat-card d-none" id="crossSellStatCard">
          <div class="crosssell-stat-label">Seu faturamento aumentou</div>
          <div class="crosssell-stat-value" id="crossSellFaturamento">R$ 0,00</div>
          <div class="crosssell-stat-sub">a mais com o cross-sell</div>
          <a href="relatorio_cross_sell" class="crosssell-stat-link">Ver relatório completo</a>
        </div>

        <div class="crosssell-card">
          <div class="crosssell-card-title">O que é o cross-sell?</div>
          <p class="crosssell-text">Cross-sell é uma estratégia de vendas que incentiva o cliente a adicionar produtos que combinam com o que ele já está comprando.</p>
          <p class="crosssell-text">Ex.: Cliente selecionou um hambúrguer → sugerir batata frita e refrigerante.</p>
          <p class="crosssell-text">O objetivo é aumentar o valor do pedido oferecendo itens relevantes para complementar a compra, sem mudar a escolha principal do cliente.</p>
        </div>

        <div class="crosssell-card">
          <div class="crosssell-card-title">Como funciona?</div>
          <p class="crosssell-text">Ao habilitar a funcionalidade de cross-sell, o sistema analisa o histórico de pedidos da sua loja e identifica quais produtos costumam ser comprados juntos, criando automaticamente os grupos de cross-sell mais relevantes.</p>
          <p class="crosssell-text">Enquanto sua loja ainda não tem pedidos suficientes de uma categoria, usamos bebidas como sugestão inicial, já que costumam combinar com qualquer pedido.</p>
          <p class="crosssell-text">Esses grupos serão exibidos na seção do carrinho do seu cardápio digital.</p>
        </div>

        <div class="crosssell-card d-none" id="crossSellGruposWrap">
          <div class="crosssell-card-title">Grupos cross-sell</div>
          <div id="crossSellGruposLista"></div>
        </div>
      </div>
    </div>
  </div>
  <script>
    (function(){
      const overlay = document.getElementById('crossSellOverlay');
      const btnAbrir = document.getElementById('btnAbrirCrossSell');
      const btnFechar = document.getElementById('btnFecharCrossSell');
      const toggle = document.getElementById('crossSellToggle');
      const statCard = document.getElementById('crossSellStatCard');
      const faturamentoEl = document.getElementById('crossSellFaturamento');
      const gruposWrap = document.getElementById('crossSellGruposWrap');
      const gruposLista = document.getElementById('crossSellGruposLista');
      if (!overlay || !btnAbrir) return;

      const fmtR = v => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');

      function renderGrupos(grupos){
        if (!gruposWrap || !gruposLista) return;
        if (!grupos || !grupos.length) {
          gruposWrap.classList.add('d-none');
          gruposLista.innerHTML = '';
          return;
        }
        gruposWrap.classList.remove('d-none');
        gruposLista.innerHTML = grupos.map(g => `
          <div class="crosssell-grupo-item">
            <span class="crosssell-grupo-badge"><i class="bi bi-cart-fill"></i> ${g.categoria}</span>
            <div class="crosssell-grupo-count">Contém ${g.total_produtos} produto${g.total_produtos === 1 ? '' : 's'}</div>
            <div class="crosssell-grupo-produtos">${(g.exemplos || []).join(', ')}</div>
          </div>
        `).join('');
      }

      function carregarStatus(){
        fetch('api/cross_sell_grupos.php')
          .then(r => r.json())
          .then(d => {
            if (!d.ok) return;
            if (toggle) toggle.checked = !!d.ativo;
            if (statCard) statCard.classList.toggle('d-none', !d.ativo);
            if (faturamentoEl) faturamentoEl.textContent = fmtR(d.faturamento_extra);
            renderGrupos(d.ativo ? d.grupos : []);
          })
          .catch(() => {});
      }

      btnAbrir.addEventListener('click', () => {
        overlay.classList.add('show');
        carregarStatus();
      });
      if (btnFechar) btnFechar.addEventListener('click', () => overlay.classList.remove('show'));
      overlay.addEventListener('click', () => overlay.classList.remove('show'));

      function mostrarToastCrossSell(ativo){
        let container = document.querySelector('.gnotif-toast-container');
        if (!container) {
          container = document.createElement('div');
          container.className = 'gnotif-toast-container';
          document.body.appendChild(container);
        }
        const el = document.createElement('div');
        el.className = 'gnotif-toast';
        el.innerHTML = `
          <div class="gnotif-toast-icon" style="background:${ativo ? '#16a34a' : '#dc2626'}"><i class="bi bi-shuffle"></i></div>
          <div class="gnotif-toast-body">
            <div class="gnotif-toast-title">${ativo ? 'Cross-sell habilitado' : 'Cross-sell desabilitado'}</div>
            <div class="gnotif-toast-sub">${ativo ? 'Os grupos de sugestão já estão sendo gerados para o seu cardápio.' : 'As sugestões de cross-sell não aparecerão mais para os clientes.'}</div>
          </div>
          <button class="gnotif-toast-close" type="button" aria-label="Fechar"><i class="bi bi-x-lg"></i></button>
        `;
        const remover = () => {
          el.classList.remove('show');
          el.classList.add('hide');
          setTimeout(() => el.remove(), 350);
        };
        el.querySelector('.gnotif-toast-close').addEventListener('click', e => {
          e.stopPropagation();
          remover();
        });
        container.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(remover, 4000);
      }

      if (toggle) {
        toggle.addEventListener('change', () => {
          const ativo = toggle.checked;
          toggle.disabled = true;
          const params = new URLSearchParams();
          params.set('ativo', ativo ? '1' : '0');
          fetch('api/cross_sell_toggle.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
            .then(r => r.json())
            .then(resp => {
              carregarStatus();
              if (resp && resp.ok) {
                mostrarToastCrossSell(ativo);
              }
            })
            .finally(() => { toggle.disabled = false; });
        });
      }
    })();
  </script>

  <!-- CONTEUDO PRINCIPAL -->
  <main class="content">

  <?php if (!empty($_SESSION['trial_whatsapp_link'])): ?>
    <div class="trial-warning" id="trialWarning">
      <div>
        <strong>Seu trial expira em <?= htmlspecialchars((string)($_SESSION['trial_whatsapp_dias'] ?? '')) ?> dia(s).</strong>
        <div>Entre em contato via WhatsApp para suporte.</div>
      </div>
      <div class="trial-actions">
        <a class="trial-btn" href="<?= htmlspecialchars((string)$_SESSION['trial_whatsapp_link']) ?>" target="_blank" rel="noopener">Enviar WhatsApp</a>
        <button class="trial-close" type="button" data-dismiss-trial>×</button>
      </div>
    </div>
  <?php endif; ?>

  <?php
    $broadcastNotifAtiva = null;
    $ehSuperadminBroadcast = (($_SESSION['admin_perfil'] ?? '') === 'superadmin');
    if (!$ehSuperadminBroadcast) {
      require_once __DIR__ . '/../helpers/notificacoes_broadcast.php';
      garantirNotificacoesBroadcastTabelas($conn);
      notificacoesMarcarProgramadasVencidas($conn);
      $broadcastNotifAtiva = notificacaoAtivaParaLoja($conn, (int) ($_SESSION['loja_id'] ?? 0));
    }
  ?>
  <?php if (!$ehSuperadminBroadcast): ?>
    <div class="broadcast-modal-backdrop" id="broadcastModalBackdrop" style="<?= $broadcastNotifAtiva ? '' : 'display:none' ?>">
      <div class="broadcast-modal-card">
        <button type="button" class="broadcast-modal-close" id="broadcastModalClose" aria-label="Fechar">&times;</button>
        <div class="broadcast-modal-image" id="broadcastModalImageWrap" style="<?= !empty($broadcastNotifAtiva['imagem']) ? '' : 'display:none' ?>">
          <img id="broadcastModalImage" src="<?= htmlspecialchars($broadcastNotifAtiva['imagem'] ?? '') ?>" alt="">
        </div>
        <div class="broadcast-modal-icon" id="broadcastModalIconWrap" style="<?= empty($broadcastNotifAtiva['imagem']) ? '' : 'display:none' ?>">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="1.8"><path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M9 21h6"/></svg>
        </div>
        <div class="broadcast-modal-body">
          <span class="broadcast-modal-eyebrow">Aviso da equipe LillyMenu</span>
          <h2 id="broadcastModalTitulo"><?= htmlspecialchars($broadcastNotifAtiva['titulo'] ?? '') ?></h2>
          <p id="broadcastModalMensagem"><?= nl2br(htmlspecialchars($broadcastNotifAtiva['mensagem'] ?? '')) ?></p>
          <a class="broadcast-modal-link-btn" id="broadcastModalLinkBtn" href="<?= htmlspecialchars($broadcastNotifAtiva['link'] ?? '') ?>" target="_blank" rel="noopener" style="<?= !empty($broadcastNotifAtiva['link']) ? '' : 'display:none' ?>">Acessar link</a>
        </div>
      </div>
    </div>
    <style>
      .broadcast-modal-backdrop{
        position:fixed;inset:0;background:rgba(20,15,10,.6);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);
        display:flex;align-items:center;justify-content:center;
        z-index:2000;padding:24px;
        animation:broadcastBackdropIn .25s ease;
      }
      .broadcast-modal-card{
        width:100%;max-width:620px;max-height:90vh;overflow-y:auto;
        background:#fff;border-radius:22px;position:relative;
        box-shadow:0 30px 70px rgba(20,15,10,.35), 0 4px 14px rgba(20,15,10,.12);
        animation:broadcastCardIn .32s cubic-bezier(.2,.9,.3,1.2);
        scrollbar-width:none;-ms-overflow-style:none;
      }
      .broadcast-modal-card::-webkit-scrollbar{display:none}
      @keyframes broadcastBackdropIn{from{opacity:0}to{opacity:1}}
      @keyframes broadcastCardIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      .broadcast-modal-close{
        position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;
        border:0;background:rgba(15,23,42,.45);color:#fff;font-size:18px;line-height:1;cursor:pointer;z-index:2;
        transition:background .15s ease, transform .15s ease;
      }
      .broadcast-modal-close:hover{background:rgba(15,23,42,.7);transform:scale(1.06)}
      .broadcast-modal-image{width:100%;max-height:320px;overflow:hidden;border-radius:22px 22px 0 0}
      .broadcast-modal-image img{width:100%;height:100%;object-fit:cover;display:block}
      .broadcast-modal-icon{
        width:100%;padding:30px 0 6px;display:flex;align-items:center;justify-content:center;
        background:linear-gradient(135deg,#b1662c,#9C5523 60%);border-radius:22px 22px 0 0;
      }
      .broadcast-modal-icon svg{
        width:52px;height:52px;padding:13px;border-radius:50%;
        background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);
      }
      .broadcast-modal-body{padding:26px 28px 28px;text-align:left}
      .broadcast-modal-eyebrow{
        display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
        color:#9C5523;background:rgba(156,85,35,.1);padding:4px 10px;border-radius:999px;margin-bottom:12px;
      }
      .broadcast-modal-body h2{margin:0 0 12px;font-size:1.4rem;font-weight:800;color:#1f1a17;letter-spacing:-.01em}
      .broadcast-modal-body p{margin:0;font-size:.95rem;line-height:1.7;color:#59524b;white-space:pre-wrap}
      .broadcast-modal-link-btn{
        display:inline-block;margin-top:18px;padding:11px 20px;border-radius:12px;
        background:#9C5523;color:#fff;font-size:.88rem;font-weight:700;text-decoration:none;
        transition:background .15s ease;
      }
      .broadcast-modal-link-btn:hover{background:#84461c}
      @media (max-width:560px){
        .broadcast-modal-card{max-width:100%}
        .broadcast-modal-image{max-height:200px}
      }
    </style>
    <script>
      (function(){
        const backdrop = document.getElementById('broadcastModalBackdrop');
        if (!backdrop) return;
        const tituloEl = document.getElementById('broadcastModalTitulo');
        const mensagemEl = document.getElementById('broadcastModalMensagem');
        const imgWrap = document.getElementById('broadcastModalImageWrap');
        const iconWrap = document.getElementById('broadcastModalIconWrap');
        const imgEl = document.getElementById('broadcastModalImage');
        const linkBtn = document.getElementById('broadcastModalLinkBtn');

        let notifAtualId = <?= $broadcastNotifAtiva ? (int) $broadcastNotifAtiva['id'] : 'null' ?>;
        let mostrando = <?= $broadcastNotifAtiva ? 'true' : 'false' ?>;

        const escapeHtml = (str) => {
          const div = document.createElement('div');
          div.textContent = str;
          return div.innerHTML;
        };

        const mostrarNotificacao = (n) => {
          notifAtualId = n.id;
          mostrando = true;
          if (tituloEl) tituloEl.textContent = n.titulo;
          if (mensagemEl) mensagemEl.innerHTML = escapeHtml(n.mensagem || '').replace(/\n/g, '<br>');
          if (n.imagem) {
            if (imgEl) imgEl.src = n.imagem;
            if (imgWrap) imgWrap.style.display = '';
            if (iconWrap) iconWrap.style.display = 'none';
          } else {
            if (imgWrap) imgWrap.style.display = 'none';
            if (iconWrap) iconWrap.style.display = '';
          }
          if (linkBtn) {
            if (n.link) {
              linkBtn.href = n.link;
              linkBtn.style.display = '';
            } else {
              linkBtn.style.display = 'none';
            }
          }
          backdrop.style.display = 'flex';
        };

        const dismiss = () => {
          backdrop.style.display = 'none';
          mostrando = false;
          if (!notifAtualId) return;
          fetch('api/notificacao_broadcast_dismiss.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'notificacao_id=' + notifAtualId
          }).catch(() => {});
          notifAtualId = null;
        };

        document.getElementById('broadcastModalClose')?.addEventListener('click', dismiss);

        const verificarNovaNotificacao = () => {
          if (mostrando) return;
          fetch('api/notificacao_broadcast_ativa.php')
            .then((r) => r.json())
            .then((data) => {
              if (data.ok && data.notificacao) mostrarNotificacao(data.notificacao);
            })
            .catch(() => {});
        };

        setInterval(verificarNovaNotificacao, 10000);
      })();
    </script>
  <?php endif; ?>
   
