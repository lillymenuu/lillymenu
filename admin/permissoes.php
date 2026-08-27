<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$cols = $conn->query("SHOW COLUMNS FROM admins")->fetchAll(PDO::FETCH_COLUMN, 0);
$temAtivo = in_array('ativo', $cols, true);
$temLoja = in_array('loja_id', $cols, true);
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

$permsMenu = [
  'menu.dashboard',
  'menu.pdv',
  'menu.gestor_pedidos',
  'menu.pedidos',
  'menu.orcamentos',
  'menu.produtos',
  'menu.promo',
  'menu.estoque',
  'menu.clientes',
  'menu.relatorios',
  'menu.relatorios_fidelidade',
  'menu.controle_caixa',
  'menu.controle_fiado',
  'menu.financeiro',
  'menu.motoboys',
  'menu.modo_garcom',
  'menu.cupons',
  'menu.whatslilly',
  'menu.lista_transmissao',
  'menu.configuracoes',
  'menu.avaliacoes',
  'menu.cross_sell_config',
  'menu.relatorio_cross_sell',
];
$permsNivel1 = $permsMenu;
$permsNivel2 = [
  'menu.pdv',
  'menu.gestor_pedidos',
  'menu.clientes'
];
$permsNivel3 = [
  'menu.relatorios',
  'menu.relatorios_fidelidade'
];
$niveisPadrao = [
  'nivel-1' => [
    'nome' => 'Nivel 1',
    'descricao' => 'Acesso total ao sistema',
    'permissoes' => $permsNivel1
  ],
  'nivel-2' => [
    'nome' => 'Nivel 2',
    'descricao' => 'Operador de caixa',
    'permissoes' => $permsNivel2
  ],
  'nivel-3' => [
    'nome' => 'Nivel 3',
    'descricao' => 'Consulta de relatorios',
    'permissoes' => $permsNivel3
  ]
];

function garantirNiveisPadrao(PDO $conn, array $niveisPadrao): array {
  $niveisFixos = [];
  foreach ($niveisPadrao as $slug => $nivel) {
    $stmt = $conn->prepare("SELECT id, nome, permissoes_json FROM permissoes_niveis WHERE slug = ? LIMIT 1");
    $stmt->execute([$slug]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
      $permsJson = json_encode($nivel['permissoes'], JSON_UNESCAPED_UNICODE);
      $stmtIns = $conn->prepare("
        INSERT INTO permissoes_niveis (nome, slug, permissoes_json, criado_em)
        VALUES (?, ?, ?, NOW())
      ");
      $stmtIns->execute([$nivel['nome'], $slug, $permsJson]);
      $row = [
        'id' => (int) $conn->lastInsertId(),
        'nome' => $nivel['nome'],
        'permissoes_json' => $permsJson
      ];
    }
    $permissoesJson = $row['permissoes_json'] ?? json_encode($nivel['permissoes'], JSON_UNESCAPED_UNICODE);
    $decoded = json_decode((string) $permissoesJson, true);
    $atual = is_array($decoded) ? $decoded : [];
    $temMenu = false;
    foreach ($atual as $perm) {
      if (strpos((string) $perm, 'menu.') === 0) {
        $temMenu = true;
        break;
      }
    }

    $precisaAtualizar = false;
    if (!$temMenu) {
      /* nivel sem nenhuma permissao de menu ainda: aplica a lista padrao inteira */
      $atual = $nivel['permissoes'];
      $precisaAtualizar = true;
    } elseif ($slug === 'nivel-1') {
      /* "Acesso total ao sistema": inclui automaticamente as telas novas que
         foram adicionadas ao sistema depois que este nivel foi criado, sem
         remover nenhuma permissao extra que ja estivesse la */
      $faltando = array_diff($nivel['permissoes'], $atual);
      if ($faltando) {
        $atual = array_values(array_unique(array_merge($atual, $faltando)));
        $precisaAtualizar = true;
      }
    }

    if ($precisaAtualizar) {
      $permissoesJson = json_encode($atual, JSON_UNESCAPED_UNICODE);
      $stmtUp = $conn->prepare("
        UPDATE permissoes_niveis
        SET permissoes_json = ?, atualizado_em = NOW()
        WHERE slug = ?
      ");
      $stmtUp->execute([$permissoesJson, $slug]);
    }
    $niveisFixos[$slug] = [
      'id' => (int) ($row['id'] ?? 0),
      'slug' => $slug,
      'nome' => $row['nome'] ?? $nivel['nome'],
      'descricao' => $nivel['descricao'],
      'permissoes_json' => $permissoesJson
    ];
  }
  return $niveisFixos;
}

function atribuirNiveisPadrao(PDO $conn, array $usuarios, array $niveisFixos): void {
  $nivel1 = (int) ($niveisFixos['nivel-1']['id'] ?? 0);
  $nivel2 = (int) ($niveisFixos['nivel-2']['id'] ?? 0);
  $nivel3 = (int) ($niveisFixos['nivel-3']['id'] ?? 0);
  if (!$nivel1 || !$nivel2 || !$nivel3) {
    return;
  }
  $stmt = $conn->query("SELECT admin_id, permissao_id FROM permissoes_usuarios");
  $existentes = $stmt ? $stmt->fetchAll(PDO::FETCH_KEY_PAIR) : [];
  $nivelIds = [$nivel1, $nivel2, $nivel3];

  $stmtDel = $conn->prepare("DELETE FROM permissoes_usuarios WHERE admin_id = ?");
  $stmtIns = $conn->prepare("
    INSERT INTO permissoes_usuarios (permissao_id, admin_id, criado_em)
    VALUES (?, ?, NOW())
  ");

  foreach ($usuarios as $usuario) {
    $adminId = (int) ($usuario['id'] ?? 0);
    if ($adminId <= 0) {
      continue;
    }
    $permAtual = isset($existentes[$adminId]) ? (int) $existentes[$adminId] : 0;
    if ($permAtual && in_array($permAtual, $nivelIds, true)) {
      continue;
    }
    $perfil = strtolower(trim((string) ($usuario['perfil'] ?? '')));
    if (in_array($perfil, ['admin', 'gerente'], true)) {
      $nivelId = $nivel1;
    } elseif (in_array($perfil, ['garcom', 'operador', 'caixa'], true)) {
      $nivelId = $nivel2;
    } else {
      $nivelId = $nivel3;
    }
    if ($permAtual) {
      $stmtDel->execute([$adminId]);
    }
    $stmtIns->execute([$nivelId, $adminId]);
  }
}

$temPermissoes = tabelaExiste($conn, 'permissoes_niveis');
$temPermUsuarios = tabelaExiste($conn, 'permissoes_usuarios');

$sql = "SELECT id, nome, email, perfil FROM admins";
$whereUsuarios = [];
$paramsUsuarios = [];
if ($temAtivo) {
  $whereUsuarios[] = "ativo = 1";
}
if ($temLoja) {
  $whereUsuarios[] = "loja_id = ?";
  $paramsUsuarios[] = $lojaId;
}
if ($whereUsuarios) {
  $sql .= " WHERE " . implode(' AND ', $whereUsuarios);
}
$sql .= " ORDER BY nome";

$stmt = $conn->prepare($sql);
$stmt->execute($paramsUsuarios);
$usuariosLista = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

$niveisFixos = [];
if ($temPermissoes) {
  $niveisFixos = garantirNiveisPadrao($conn, $niveisPadrao);
}

if ($temPermUsuarios && $niveisFixos && $usuariosLista) {
  atribuirNiveisPadrao($conn, $usuariosLista, $niveisFixos);
}

$permUsuariosMap = [];
if ($temPermUsuarios) {
  $stmt = $conn->prepare("
    SELECT pu.permissao_id, pu.admin_id
    FROM permissoes_usuarios pu
    JOIN admins a ON a.id = pu.admin_id
    " . ($temLoja ? "WHERE a.loja_id = ?" : "")
  );
  $stmt->execute($temLoja ? [$lojaId] : []);
  $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
  foreach ($rows as $row) {
    $permId = (int) ($row['permissao_id'] ?? 0);
    $adminId = (int) ($row['admin_id'] ?? 0);
    if ($permId <= 0 || $adminId <= 0) {
      continue;
    }
    if (!isset($permUsuariosMap[$permId])) {
      $permUsuariosMap[$permId] = [];
    }
    $permUsuariosMap[$permId][] = $adminId;
  }
}

$usuarios = $usuariosLista;
if ($temPermissoes && $temPermUsuarios) {
  $sqlPerm = "
    SELECT
      a.id, a.nome, a.email, a.perfil,
      pn.id AS permissao_id,
      pn.nome AS permissao_nome,
      pn.permissoes_json
    FROM admins a
    LEFT JOIN permissoes_usuarios pu ON pu.admin_id = a.id
    LEFT JOIN permissoes_niveis pn ON pn.id = pu.permissao_id
  ";
  $wherePerm = [];
  $paramsPerm = [];
  if ($temAtivo) {
    $wherePerm[] = "a.ativo = 1";
  }
  if ($temLoja) {
    $wherePerm[] = "a.loja_id = ?";
    $paramsPerm[] = $lojaId;
  }
  if ($wherePerm) {
    $sqlPerm .= " WHERE " . implode(' AND ', $wherePerm);
  }
  $sqlPerm .= " ORDER BY a.nome";
  $stmt = $conn->prepare($sqlPerm);
  $stmt->execute($paramsPerm);
  $linhas = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
  $usuariosMap = [];
  foreach ($linhas as $row) {
    $id = (int) ($row['id'] ?? 0);
    if ($id <= 0 || isset($usuariosMap[$id])) {
      continue;
    }
    $usuariosMap[$id] = $row;
  }
  $usuarios = array_values($usuariosMap);
}

function perfilLabel($perfil){
  $perfil = trim((string) $perfil);
  if ($perfil === '') return 'Padrao';
  return ucfirst($perfil) . ' (Padrao)';
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Permissões</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">


<style>
  .permissoes-page{
    padding:22px 26px 40px;
  }
  .permissoes-header{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:16px;
    margin-bottom:20px;
  }
  .permissoes-title{
    font-size:22px;
    font-weight:700;
    color:#0f172a;
    margin:0;
  }
  .permissoes-grid{
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));
    gap:16px;
  }
  .perm-levels-section{
    margin-bottom:22px;
  }
  .perm-levels-title{
    font-size:1rem;
    font-weight:700;
    color:#0f172a;
    margin-bottom:10px;
  }
  .perm-levels-table{
    border:1px solid #e5e7eb;
    border-radius:16px;
    background:#fff;
    box-shadow:0 8px 22px rgba(15,23,42,.06);
    overflow:auto;
    -webkit-overflow-scrolling:touch;
  }
  .perm-levels-table table{
    width:100%;
    border-collapse:separate;
    border-spacing:0;
  }
  .perm-levels-table thead th{
    font-size:.78rem;
    text-transform:uppercase;
    letter-spacing:.04em;
    color:#64748b;
    background:#f8fafc;
    padding:12px 16px;
    border-bottom:1px solid #e5e7eb;
    font-weight:700;
  }
  .perm-levels-table tbody td{
    padding:14px 16px;
    border-bottom:1px solid #f1f5f9;
    vertical-align:middle;
    color:#0f172a;
    font-size:.9rem;
  }
  .perm-levels-table tbody tr:last-child td{
    border-bottom:none;
  }
  .perm-level-name{
    font-weight:700;
  }
  .perm-level-desc{
    color:#64748b;
    font-size:.85rem;
  }
  .perm-level-count{
    font-weight:600;
    color:#0f172a;
  }
  .perm-card{
    border:1px solid #e5e7eb;
    border-radius:16px;
    padding:18px;
    background:#fff;
    box-shadow:0 8px 22px rgba(15,23,42,.06);
    display:flex;
    flex-direction:column;
    gap:10px;
  }
  .perm-card-top{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
  }
  .perm-avatar{
    width:44px;
    height:44px;
    border-radius:50%;
    border:1px solid #e2e8f0;
    display:flex;
    align-items:center;
    justify-content:center;
    color:#64748b;
  }
  .perm-count{
    font-size:.75rem;
    color:#0f172a;
    background:#f3f4f6;
    padding:6px 10px;
    border-radius:10px;
    font-weight:600;
  }
  .perm-name{
    font-size:.95rem;
    font-weight:700;
    color:#0f172a;
  }
  .perm-actions{
    display:flex;
    gap:8px;
    margin-top:6px;
  }
  .perm-action-btn{
    border:1px solid #e2e8f0;
    background:#fff;
    color:#0f172a;
    border-radius:10px;
    padding:4px 10px;
    font-size:.75rem;
  }
  .perm-action-btn.danger{
    color:#dc2626;
    border-color:#fecaca;
    background:#fff5f5;
  }
  .perm-users-section{
    margin-top:26px;
  }
  .perm-users-section-title{
    font-size:1rem;
    font-weight:700;
    color:#0f172a;
    margin-bottom:12px;
  }
  .perm-users-table{
    border:1px solid #e5e7eb;
    border-radius:16px;
    background:#fff;
    box-shadow:0 8px 22px rgba(15,23,42,.06);
    overflow:auto;
    -webkit-overflow-scrolling:touch;
  }
  .perm-users-table table{
    width:100%;
    border-collapse:separate;
    border-spacing:0;
  }
  .perm-users-table thead th{
    font-size:.78rem;
    text-transform:uppercase;
    letter-spacing:.04em;
    color:#64748b;
    background:#f8fafc;
    padding:12px 16px;
    border-bottom:1px solid #e5e7eb;
    font-weight:700;
  }
  .perm-users-table tbody td{
    padding:14px 16px;
    border-bottom:1px solid #f1f5f9;
    vertical-align:middle;
    color:#0f172a;
    font-size:.9rem;
  }
  .perm-users-table tbody tr:last-child td{
    border-bottom:none;
  }
  .perm-user-name{
    font-weight:700;
    color:#0f172a;
  }
  .perm-user-level{
    font-size:.85rem;
    color:#334155;
  }
  .perm-user-row.is-updated{
    background:#f0fdf4;
  }
  .perm-user-row.is-error{
    background:#fff1f2;
  }
  .perm-user-select{
    min-width:200px;
    border-radius:12px;
    font-size:.82rem;
  }
  .perm-users-empty{
    border:1px dashed #e2e8f0;
    border-radius:16px;
    padding:18px;
    color:#64748b;
    background:#f8fafc;
  }
  .perm-users{
    border:1px solid #e5e7eb;
    border-radius:16px;
    padding:12px;
    background:#fff;
    margin-top:0;
    margin-bottom:12px;
  }
  .perm-users-title{
    font-weight:700;
    font-size:.85rem;
    color:#0f172a;
    margin-bottom:8px;
  }
  .perm-users-sub{
    font-size:.78rem;
    color:#64748b;
    margin-bottom:8px;
  }
  .perm-nome-preview{
    font-size:.75rem;
    color:#94a3b8;
    margin-top:6px;
  }
  .perm-users-grid{
    display:flex;
    flex-wrap:wrap;
    gap:10px 14px;
  }
  .perm-toast{
    position:fixed;
    top:18px;
    left:50%;
    transform:translateX(-50%);
    background:#111827;
    color:#fff;
    padding:10px 16px;
    border-radius:14px;
    box-shadow:0 10px 24px rgba(0,0,0,.25);
    z-index:1055;
    display:none;
  }
  .perm-toast.show{
    display:block;
    animation:fadeToast .25s ease;
  }
  @keyframes fadeToast{
    from{opacity:0; transform:translate(-50%, -6px);}
    to{opacity:1; transform:translate(-50%, 0);}
  }
  .settings-modal--permissoes .modal-dialog{
    width:min(980px, 96vw);
    max-width:980px;
  }
  .settings-modal--permissoes .modal-content{
    height:435px;
  }
  .settings-modal--permissoes .modal-body{
    overflow-y:auto;
    padding:16px 18px 12px;
  }
  .perm-field .form-control{
    background:#f8fafc;
    border-radius:14px;
  }
  .perm-tabs{
    display:flex;
    gap:8px;
    overflow-x:auto;
    padding-bottom:8px;
  }
  .perm-tab{
    border:1px solid #e2e8f0;
    background:#fff;
    color:#64748b;
    padding:6px 12px;
    border-radius:999px;
    font-size:.78rem;
    font-weight:600;
    white-space:nowrap;
  }
  .perm-tab.active{
    background:#f1f5f9;
    color:#0f172a;
    border-color:#e2e8f0;
  }
  .perm-panel{
    border:1px solid #e2e8f0;
    border-radius:16px;
    padding:14px;
    background:#fff;
    box-shadow:0 8px 20px rgba(15,23,42,.06);
  }
  .perm-panel + .perm-panel{
    margin-top:12px;
  }
  .perm-panel-head{
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:12px;
    margin-bottom:12px;
  }
  .perm-panel-title{
    font-weight:700;
    color:#0f172a;
    margin:0;
  }
  .perm-panel-sub{
    font-size:.78rem;
    color:#64748b;
  }
  .perm-check-grid{
    display:flex;
    flex-wrap:wrap;
    gap:14px 18px;
  }
  .perm-check{
    display:flex;
    align-items:center;
    gap:8px;
    font-size:.82rem;
    color:#0f172a;
  }
  .perm-check input{
    width:18px;
    height:18px;
  }
  @media (max-width: 768px){
    .permissoes-page{padding:18px 16px 32px;}
  }
</style>
</head>
<body class="dash-diggy">
  <?php include __DIR__ . '/partials/sidebar.php'; ?>

  <div class="dash-page permissoes-page">
    <div class="permissoes-header">
      <h1 class="permissoes-title">Permissões</h1>
    </div>

    <div class="perm-levels-section">
      <div class="perm-levels-title">Niveis de acesso</div>
      <?php if (!$niveisFixos): ?>
        <div class="perm-users-empty">Nenhum nivel configurado.</div>
      <?php else: ?>
        <div class="perm-levels-table">
          <table>
            <thead>
              <tr>
                <th>Nivel</th>
                <th>Descricao</th>
                <th>Permissoes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($niveisFixos as $nivel):
                $permJson = $nivel['permissoes_json'] ?? '';
                $permCount = 0;
                if ($permJson) {
                  $decoded = json_decode((string) $permJson, true);
                  if (is_array($decoded)) {
                    $permCount = count($decoded);
                  }
                }
                $permId = (int) ($nivel['id'] ?? 0);
                $permUsers = $permUsuariosMap[$permId] ?? [];
              ?>
                <tr>
                  <td class="perm-level-name"><?= htmlspecialchars($nivel['nome'] ?? '') ?></td>
                  <td class="perm-level-desc"><?= htmlspecialchars($nivel['descricao'] ?? '') ?></td>
                  <td class="perm-level-count"><?= $permCount ?> permissoes</td>
                  <td>
                    <button type="button"
                            class="perm-action-btn"
                            data-perm-edit="<?= $permId ?>"
                            data-perm-name="<?= htmlspecialchars($nivel['nome'] ?? '') ?>"
                            data-perm-json="<?= htmlspecialchars($permJson) ?>"
                            data-perm-users="<?= htmlspecialchars(json_encode($permUsers)) ?>">
                      Editar nivel
                    </button>
                  </td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      <?php endif; ?>
    </div>

    <div class="perm-users-section">
      <div class="perm-users-section-title">Usuarios com acesso</div>
      <?php if (!$usuarios): ?>
        <div class="perm-users-empty">Nenhum usuario cadastrado.</div>
      <?php else: ?>
        <div class="perm-users-table">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nivel atual</th>
                <th>Editar nivel</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($usuarios as $usuario):
                $perfil = $usuario['perfil'] ?? '';
                $permNome = $usuario['permissao_nome'] ?? '';
                $permId = (int) ($usuario['permissao_id'] ?? 0);
                $permLabel = $permNome !== '' ? $permNome : perfilLabel($perfil);
              ?>
                <tr class="perm-user-row" data-user-card="<?= (int) $usuario['id'] ?>">
                  <td class="perm-user-name"><?= htmlspecialchars($usuario['nome'] ?? '') ?></td>
                  <td class="perm-user-level"><?= htmlspecialchars($permLabel) ?></td>
                  <td>
                    <select class="form-select perm-user-select" data-user-id="<?= (int) $usuario['id'] ?>">
                      <?php foreach ($niveisFixos as $nivel): ?>
                        <?php $nivelId = (int) ($nivel['id'] ?? 0); ?>
                        <option value="perm:<?= $nivelId ?>" <?= $permId === $nivelId ? 'selected' : '' ?>>
                          <?= htmlspecialchars($nivel['nome'] ?? '') ?>
                        </option>
                      <?php endforeach; ?>
                    </select>
                  </td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      <?php endif; ?>
    </div>

    <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
  </div>

  <div class="modal fade settings-modal settings-modal--permissoes" id="modal-permissoes" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0">
        <div class="modal-header">
          <h5 class="modal-title">Nivel de acesso</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <input type="hidden" data-perm-nome>
          <div class="perm-users">
            <div class="perm-users-title">Usuarios com acesso</div>
            <div class="perm-users-sub">Selecione os usuarios que terao este nivel de acesso.</div>
            <div class="perm-users-grid">
              <?php foreach ($usuariosLista as $usuarioItem): ?>
                <label class="perm-check">
                  <input type="checkbox" data-perm-user value="<?= (int) $usuarioItem['id'] ?>">
                  <span><?= htmlspecialchars($usuarioItem['nome'] ?? '') ?></span>
                </label>
              <?php endforeach; ?>
            </div>
            <div class="perm-nome-preview" id="permNomePreview"></div>
          </div>

          <div class="perm-panel mt-3" data-perm-panel="menu">
            <div class="perm-panel-head">
              <div>
                <h6 class="perm-panel-title">Menu lateral</h6>
                <div class="perm-panel-sub">Selecione os itens do menu que este nivel pode acessar.</div>
              </div>
              <label class="perm-check">
                <input type="checkbox" data-perm-all="menu">
                <span>Selecionar todos</span>
              </label>
            </div>
            <div class="perm-check-grid">
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.dashboard">Dashboard</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.pdv">Pedidos (PDV)</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.gestor_pedidos">Gestor de pedidos</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.pedidos">Lista de pedidos</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.orcamentos">Orcamentos</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.produtos">Produtos</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.promo">Promocoes</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.estoque">Estoque</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.clientes">Clientes</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.relatorios">Relatorios (vendas)</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.relatorios_fidelidade">Fidelidade</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.controle_caixa">Controle de caixa</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.controle_fiado">Controle de fiado</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.financeiro">Financeiro</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.motoboys">Motoboys</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.modo_garcom">Modo Garcom</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.cupons">Cupons</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.whatslilly">WhatsLilly</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.lista_transmissao">Lista de Transmissao</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.configuracoes">Configuracoes</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.avaliacoes">Avaliacoes</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.cross_sell_config">Configuracoes do Cross-sell</label>
              <label class="perm-check"><input type="checkbox" data-perm-item="menu" data-perm-key value="menu.relatorio_cross_sell">Relatorio de Cross-sell</label>
            </div>
          </div>

          <input type="hidden" data-perm-id>
        </div>
        <div class="modal-footer border-0">
          <button type="button" class="btn-diggy-primary" id="btnSalvarPermissao">Salvar</button>
        </div>
      </div>
    </div>
  </div>

  <div id="permToast" class="perm-toast" aria-live="polite"></div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    document.querySelectorAll('.perm-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const alvo = tab.dataset.permTab;
        document.querySelectorAll('.perm-tab').forEach(btn => btn.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('[data-perm-panel]').forEach(panel => {
          panel.classList.toggle('d-none', panel.dataset.permPanel !== alvo);
        });
      });
    });

    document.querySelectorAll('[data-perm-all]').forEach(toggle => {
      toggle.addEventListener('change', () => {
        const grupo = toggle.dataset.permAll;
        const itens = document.querySelectorAll(`[data-perm-item="${grupo}"]`);
        itens.forEach(item => {
          item.checked = toggle.checked;
        });
      });
    });

    document.querySelectorAll('[data-perm-item]').forEach(item => {
      item.addEventListener('change', () => {
        const grupo = item.dataset.permItem;
        const itens = Array.from(document.querySelectorAll(`[data-perm-item="${grupo}"]`));
        const all = document.querySelector(`[data-perm-all="${grupo}"]`);
        if (all) {
          all.checked = itens.length > 0 && itens.every(el => el.checked);
        }
      });
    });

    function mostrarPermToast(msg, ok){
      const toast = document.getElementById('permToast');
      if (!toast) return;
      toast.textContent = msg;
      toast.style.background = ok ? '#16a34a' : '#111827';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2200);
    }

    function gerarNomePermissao(){
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const stamp = [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
        pad(now.getHours()),
        pad(now.getMinutes()),
        pad(now.getSeconds())
      ].join('');
      return `Nivel personalizado ${stamp}`;
    }

    const modalPerm = document.getElementById('modal-permissoes');
    function limparPermModal(){
      if (!modalPerm) return;
      const nomeInput = modalPerm.querySelector('[data-perm-nome]');
      const idInput = modalPerm.querySelector('[data-perm-id]');
      const preview = document.getElementById('permNomePreview');
      if (nomeInput) nomeInput.value = '';
      if (idInput) idInput.value = '';
      if (preview) preview.textContent = '';
      modalPerm.querySelectorAll('[data-perm-key]').forEach(el => { el.checked = false; });
      modalPerm.querySelectorAll('[data-perm-user]').forEach(el => { el.checked = false; });
      modalPerm.querySelectorAll('[data-perm-all]').forEach(el => { el.checked = false; });
    }

    if (modalPerm) {
      modalPerm.addEventListener('show.bs.modal', event => {
        if (!modalPerm.dataset.editing) {
          limparPermModal();
        }
      });
      modalPerm.addEventListener('hidden.bs.modal', () => {
        modalPerm.dataset.editing = '';
      });
    }

    const btnSalvarPermissao = document.getElementById('btnSalvarPermissao');
    if (btnSalvarPermissao) {
      btnSalvarPermissao.addEventListener('click', () => {
        const modalEl = document.getElementById('modal-permissoes');
        if (!modalEl) return;
        const nomeInput = modalEl.querySelector('[data-perm-nome]');
        const idInput = modalEl.querySelector('[data-perm-id]');
        let nome = nomeInput ? nomeInput.value.trim() : '';
        if (!nome) {
          nome = gerarNomePermissao();
          if (nomeInput) nomeInput.value = nome;
          const preview = document.getElementById('permNomePreview');
          if (preview) preview.textContent = `Nome gerado: ${nome}`;
        }

        const perms = Array.from(modalEl.querySelectorAll('[data-perm-key]'))
          .filter(el => el.checked)
          .map(el => el.value);
        const usuarios = Array.from(modalEl.querySelectorAll('[data-perm-user]'))
          .filter(el => el.checked)
          .map(el => el.value);
        const permId = idInput ? idInput.value : '';

        btnSalvarPermissao.disabled = true;
        const params = new URLSearchParams();
        params.set('nome', nome);
        params.set('permissoes', JSON.stringify(perms));
        params.set('usuarios', JSON.stringify(usuarios));
        if (permId) {
          params.set('id', permId);
        }

        fetch('api/permissoes_save.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        })
          .then(r => r.json())
          .then(resp => {
            const ok = resp && resp.ok;
            mostrarPermToast(ok ? 'Permissao salva.' : (resp && resp.msg ? resp.msg : 'Erro ao salvar.'), ok);
            if (ok && typeof bootstrap !== 'undefined') {
              const instance = bootstrap.Modal.getInstance(modalEl);
              if (instance) instance.hide();
              setTimeout(() => window.location.reload(), 600);
            }
          })
          .catch(() => {
            mostrarPermToast('Erro ao salvar.', false);
          })
          .finally(() => {
            btnSalvarPermissao.disabled = false;
          });
      });
    }

    document.querySelectorAll('[data-perm-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!modalPerm) return;
        const permId = btn.dataset.permEdit || '';
        const nome = btn.dataset.permName || '';
        const permsRaw = btn.dataset.permJson || '[]';
        const usersRaw = btn.dataset.permUsers || '[]';
        const nomeInput = modalPerm.querySelector('[data-perm-nome]');
        const idInput = modalPerm.querySelector('[data-perm-id]');
        const preview = document.getElementById('permNomePreview');
        modalPerm.dataset.editing = '1';
        limparPermModal();
        if (nomeInput) nomeInput.value = nome;
        if (idInput) idInput.value = permId;
        if (preview && nome) preview.textContent = `Nome: ${nome}`;
        let perms = [];
        let users = [];
        try { perms = JSON.parse(permsRaw); } catch (e) { perms = []; }
        try { users = JSON.parse(usersRaw); } catch (e) { users = []; }
        if (Array.isArray(perms)) {
          modalPerm.querySelectorAll('[data-perm-key]').forEach(el => {
            el.checked = perms.includes(el.value);
          });
        }
        if (Array.isArray(users)) {
          modalPerm.querySelectorAll('[data-perm-user]').forEach(el => {
            el.checked = users.includes(parseInt(el.value, 10));
          });
        }
        const instance = bootstrap.Modal.getOrCreateInstance(modalPerm);
        instance.show();
      });
    });

    document.querySelectorAll('[data-perm-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const permId = btn.dataset.permDelete;
        if (!permId) return;
        if (!confirm('Deseja excluir esta permissao?')) return;
        const params = new URLSearchParams();
        params.set('id', permId);
        fetch('api/permissoes_delete.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        })
          .then(r => r.json())
          .then(resp => {
            const ok = resp && resp.ok;
            mostrarPermToast(ok ? 'Permissao excluida.' : (resp && resp.msg ? resp.msg : 'Erro ao excluir.'), ok);
            if (ok) setTimeout(() => window.location.reload(), 600);
          })
          .catch(() => mostrarPermToast('Erro ao excluir.', false));
      });
    });

    document.querySelectorAll('.perm-user-select').forEach(select => {
      select.addEventListener('change', () => {
        const adminId = select.dataset.userId;
        if (!adminId) return;
        const wrapper = document.querySelector(`[data-user-card="${adminId}"]`);
        if (wrapper) {
          wrapper.classList.remove('is-updated', 'is-error');
        }
        let permId = '';
        const valor = select.value || 'default';
        if (valor.startsWith('perm:')) {
          permId = valor.replace('perm:', '');
        }
        const params = new URLSearchParams();
        params.set('admin_id', adminId);
        params.set('permissao_id', permId);
        fetch('api/permissoes_atribuir.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        })
          .then(r => r.json())
          .then(resp => {
            const ok = resp && resp.ok;
            mostrarPermToast(ok ? 'Permissao atualizada.' : (resp && resp.msg ? resp.msg : 'Erro ao atualizar.'), ok);
            if (wrapper) {
              wrapper.classList.add(ok ? 'is-updated' : 'is-error');
              setTimeout(() => wrapper.classList.remove('is-updated', 'is-error'), 2200);
            }
            if (ok) {
              const card = document.querySelector(`[data-user-card="${adminId}"] .perm-user-level`);
              if (card) {
                const texto = select.options[select.selectedIndex].textContent || 'Permissao padrao';
                card.textContent = texto;
              }
            }
          })
          .catch(() => {
            mostrarPermToast('Erro ao atualizar.', false);
            if (wrapper) {
              wrapper.classList.add('is-error');
              setTimeout(() => wrapper.classList.remove('is-error'), 2200);
            }
          });
      });
    });
  </script>
</body>
</html>
