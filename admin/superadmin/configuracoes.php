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

$planosAtivos = [];
try {
  $stmt = $conn->query("SELECT id, nome, valor, recursos_json FROM planos WHERE ativo = 1 ORDER BY (landing_slug IS NULL), landing_slug ASC");
  $planosAtivos = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
  foreach ($planosAtivos as &$pl) {
    $decoded = $pl['recursos_json'] !== null ? json_decode((string) $pl['recursos_json'], true) : null;
    $pl['recursos'] = is_array($decoded) ? $decoded : null;
    unset($pl['recursos_json']);
  }
  unset($pl);
} catch (Exception $e) {
  $planosAtivos = [];
}

$menuLabelsRecursos = [
  'menu.pdv' => 'PDV (venda balcão)',
  'menu.gestor_pedidos' => 'Gestor de pedidos',
  'menu.pedidos' => 'Lista de pedidos',
  'menu.orcamentos' => 'Orçamentos',
  'menu.produtos' => 'Produtos',
  'menu.promo' => 'Promoções',
  'menu.estoque' => 'Estoque',
  'menu.clientes' => 'Clientes (CRM)',
  'menu.relatorios' => 'Relatórios (vendas)',
  'menu.relatorios_fidelidade' => 'Fidelidade',
  'menu.controle_caixa' => 'Controle de caixa',
  'menu.controle_fiado' => 'Controle de fiado',
  'menu.financeiro' => 'Financeiro',
  'menu.motoboys' => 'Motoboys',
  'menu.cupons' => 'Cupons',
  'menu.whatslilly' => 'WhatsLilly',
  'menu.lista_transmissao' => 'Lista de Transmissão',
  'menu.configuracoes' => 'Configurações',
  'menu.cross_sell_config' => 'Configurações do Cross-sell',
  'menu.relatorio_cross_sell' => 'Relatório de Cross-sell',
];

$saasCfg = [];
try {
  $stmt = $conn->query("SELECT chave, valor FROM configuracoes WHERE loja_id = 0 AND chave IN ('saas_pix_chave','saas_pix_nome','saas_whatsapp_numero')");
  foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $saasCfg[$row['chave']] = $row['valor'];
  }
} catch (Exception $e) {
  $saasCfg = [];
}

$lojas = buscarLojasComDetalhes($conn);
$hoje = new DateTime('today');
foreach ($lojas as &$l) {
  $l = resolverStatusLoja($l, $hoje);
}
unset($l);

$leads = buscarLeadsRecentes($conn);

$notificacoes = superadminNotificacoes($conn);
$notifCount = count($notificacoes);
$paginaAtual = 'Configurações';
$chromeCssVer = filemtime(__DIR__ . '/assets/css/chrome.css');
$configCssVer = filemtime(__DIR__ . '/assets/css/configuracoes.css');
$chromeJsVer = filemtime(__DIR__ . '/assets/js/chrome.js');
$configJsVer = filemtime(__DIR__ . '/assets/js/configuracoes.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Configurações - Gerenciar lojas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="shortcut icon" href="../assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="../assets/img/favicon_store.png">

<link href="assets/css/chrome.css?v=<?= $chromeCssVer ?>" rel="stylesheet">
<link href="assets/css/configuracoes.css?v=<?= $configCssVer ?>" rel="stylesheet">
</head>
<body class="sidenav-dark">
<div class="layout">
<?php require __DIR__ . '/partials/sidebar.php'; ?>
  <main class="main">
<?php require __DIR__ . '/partials/header.php'; ?>

    <div id="configView">

      <section class="card cfg-card" id="pixConfigCard">
        <div class="cfg-card-head" id="pixConfigToggle">
          <div>
            <div class="cfg-card-title">Chave PIX para recebimento</div>
            <div class="cfg-card-sub">Usada na cobrança de mensalidade exibida para as lojas.</div>
          </div>
          <button class="action-btn ghost cfg-edit-btn" type="button" id="pixConfigChevron">Editar</button>
        </div>
        <div class="cfg-card-body" id="pixConfigBody" style="display:none">
          <form id="pixConfigForm">
            <div class="form-grid">
              <div>
                <label class="form-label">Chave PIX</label>
                <input class="form-control" type="text" id="pixChave" value="<?= htmlspecialchars($saasCfg['saas_pix_chave'] ?? '') ?>" placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatoria">
              </div>
              <div>
                <label class="form-label">Nome do favorecido</label>
                <input class="form-control" type="text" id="pixNome" value="<?= htmlspecialchars($saasCfg['saas_pix_nome'] ?? '') ?>" placeholder="Nome que aparece no PIX">
              </div>
              <div style="grid-column:1/-1">
                <label class="form-label">WhatsApp de suporte</label>
                <input class="form-control" type="text" id="pixWhats" value="<?= htmlspecialchars($saasCfg['saas_whatsapp_numero'] ?? '') ?>" placeholder="5585985049577">
              </div>
            </div>
            <div class="modal-actions">
              <button class="action-btn primary" type="submit">Salvar</button>
            </div>
            <div class="modal-msg" id="pixConfigMsg" aria-live="polite"></div>
          </form>
        </div>
      </section>

      <section class="card cfg-card" id="recursosPlanoCard">
        <div class="cfg-card-head" id="recursosPlanoToggle">
          <div>
            <div class="cfg-card-title">Recursos por plano</div>
            <div class="cfg-card-sub">Escolha quais telas cada plano libera para as lojas.</div>
          </div>
          <button class="action-btn ghost cfg-edit-btn" type="button" id="recursosPlanoChevron">Editar</button>
        </div>
        <div class="cfg-card-body" id="recursosPlanoBody" style="display:none">
          <form id="recursosPlanoForm">
            <div class="form-grid">
              <div>
                <label class="form-label">Plano</label>
                <select class="form-control" id="recursosPlanoSelect"></select>
              </div>
            </div>
            <label class="perm-check cfg-check-full">
              <input type="checkbox" id="recursosSemRestricao">
              <span>Sem restrição (libera todas as telas para este plano)</span>
            </label>
            <div class="form-grid cfg-recursos-grid" id="recursosPlanoGrid">
              <?php foreach ($menuLabelsRecursos as $chave => $label): ?>
                <label class="perm-check">
                  <input type="checkbox" class="recursos-plano-check" value="<?= htmlspecialchars($chave) ?>">
                  <span><?= htmlspecialchars($label) ?></span>
                </label>
              <?php endforeach; ?>
            </div>
            <div class="modal-actions">
              <button class="action-btn primary" type="submit">Salvar recursos do plano</button>
            </div>
            <div class="modal-msg" id="recursosPlanoMsg" aria-live="polite"></div>
          </form>
        </div>
      </section>

    </div>

    <section class="card table-card">
      <div class="table-actions">
        <input class="table-search" id="tableSearch" type="text" placeholder="Pesquisar loja">
      </div>
      <div class="table-wrap">
        <table class="table" id="lojasTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Loja</th>
              <th>Admin</th>
              <th>Status</th>
              <th>Expira</th>
              <th>Plano</th>
              <th>Valor</th>
              <th>Comprovante</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
          <?php if (!$lojas): ?>
            <tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:18px 0">Nenhuma loja cadastrada.</td></tr>
          <?php endif; ?>
          <?php foreach ($lojas as $l):
            $status = $l['status_resolvido'];
            $expiraData = $l['expira_em'] ? date('d/m/Y', strtotime($l['expira_em'])) : '-';
            $dias = $l['expira_dias'];
            $diasLabel = $dias !== null ? ($dias < 0 ? 'expirado' : $dias.' dias') : '-';
          ?>
            <tr data-loja="<?= htmlspecialchars($l['nome'] ?? '') ?>">
              <td><?= (int) $l['id'] ?></td>
              <td class="expira-col">
                <div style="font-weight:600"><?= htmlspecialchars($l['nome'] ?? '') ?></div>
                <small style="color:#94a3b8">Criada em <?= !empty($l['criado_em']) ? date('d/m/Y', strtotime($l['criado_em'])) : '-' ?></small>
              </td>
              <td>
                <?php
                  $lAdminNome = trim((string) ($l['admin_nome'] ?? 'Administrador'));
                  $lAdminIniciais = dashIniciais($lAdminNome);
                ?>
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="dash-list-avatar" style="width:28px;height:28px;font-size:10px"><?= htmlspecialchars($lAdminIniciais) ?></div>
                  <div>
                    <div><?= htmlspecialchars($lAdminNome) ?></div>
                    <small style="color:#94a3b8"><?= htmlspecialchars($l['admin_email'] ?? '-') ?></small>
                  </div>
                </div>
              </td>
              <td><span class="badge <?= htmlspecialchars($status) ?>"><?= htmlspecialchars($status) ?></span></td>
              <td>
                <?php if (!empty($l['is_trial_periodo']) || $status === 'trial'): ?>
                  <div class="expira-tag"><strong><?= $l['trial_inicio'] ? date('d/m/Y', strtotime($l['trial_inicio'])) : '-' ?></strong></div>
                  <small style="color:#94a3b8">Inicio do teste</small>
                  <div style="margin-top:6px">
                    <span class="badge trial" style="text-transform:none;font-size:10px">Periodo de teste</span>
                  </div>
                  <div style="margin-top:6px">
                    <div class="expira-tag"><strong><?= $l['trial_fim'] ? date('d/m/Y', strtotime($l['trial_fim'])) : '-' ?></strong></div>
                    <small style="color:#94a3b8">Fim do teste</small>
                  </div>
                <?php else: ?>
                  <div class="expira-tag"><strong><?= $expiraData ?></strong></div>
                  <small style="color:#94a3b8"><?= $diasLabel ?></small>
                <?php endif; ?>
              </td>
              <td>
                <?php if (!empty($l['plano_nome'])): ?>
                  <?= htmlspecialchars($l['plano_nome']) ?>
                <?php elseif (empty($l['status']) && !empty($l['plano_desejado_nome'])): ?>
                  <span class="badge trial" style="text-transform:none;font-size:10px">Plano desejado: <?= htmlspecialchars($l['plano_desejado_nome']) ?></span>
                <?php else: ?>
                  -
                <?php endif; ?>
              </td>
              <td><?= $l['plano_valor'] !== null ? 'R$ '.number_format((float)$l['plano_valor'],2,',','.') : '-' ?></td>
              <td>
                <?php $cobStatus = $l['cobranca_status'] ?? ''; ?>
                <?php if (!empty($l['comprovante_arquivo']) && in_array($cobStatus, ['pendente', 'atrasado'], true)): ?>
                  <span class="badge suspensa" style="text-transform:none;font-size:10px">Aguardando revisão</span>
                <?php elseif (!empty($l['comprovante_arquivo']) && $cobStatus === 'pago'): ?>
                  <span class="badge ativa" style="text-transform:none;font-size:10px">✓ Aprovado</span>
                <?php else: ?>
                  <span style="color:#cbd5e1">-</span>
                <?php endif; ?>
              </td>
              <td style="white-space:nowrap">
                <div style="display:flex;flex-wrap:nowrap;align-items:center;gap:6px">
                  <button class="action-btn icon-only" data-action="editar"
                    data-loja-id="<?= (int)$l['id'] ?>"
                    data-admin-id="<?= (int)($l['admin_id'] ?? 0) ?>"
                    data-nome="<?= htmlspecialchars($l['nome'] ?? '') ?>"
                    data-email="<?= htmlspecialchars($l['admin_email'] ?? '') ?>"
                    data-usuario="<?= htmlspecialchars($l['admin_usuario'] ?? '') ?>"
                    data-contato="<?= htmlspecialchars($l['loja_contato'] ?? '') ?>"
                    data-trial-inicio="<?= htmlspecialchars($l['trial_inicio'] ?? '') ?>"
                    data-trial-fim="<?= htmlspecialchars($l['trial_fim'] ?? '') ?>"
                    data-status="<?= htmlspecialchars($l['status_resolvido'] ?? '') ?>"
                    data-expira-em="<?= htmlspecialchars($l['expira_em'] ?? '') ?>"
                    data-expira-dias="<?= $l['expira_dias'] !== null ? (int) $l['expira_dias'] : '' ?>"
                    data-ativo="<?= (int)($l['ativo'] ?? 0) ?>"
                    data-plano-id="<?= (int)($l['plano_id'] ?? 0) ?>"
                    data-cobranca-id="<?= (int)($l['cobranca_id'] ?? 0) ?>"
                    data-cobranca-status="<?= htmlspecialchars($l['cobranca_status'] ?? '') ?>"
                    data-cobranca-valor="<?= htmlspecialchars($l['cobranca_valor'] ?? '') ?>"
                    data-cobranca-vencimento="<?= htmlspecialchars($l['cobranca_vencimento'] ?? '') ?>"
                    data-comprovante-arquivo="<?= htmlspecialchars($l['comprovante_arquivo'] ?? '') ?>"
                    data-comprovante-enviado-em="<?= htmlspecialchars($l['comprovante_enviado_em'] ?? '') ?>"
                    data-motivo-rejeicao="<?= htmlspecialchars($l['motivo_rejeicao'] ?? '') ?>"
                    title="Editar" aria-label="Editar"
                  ><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
                  <?php if (!empty($l['ativo'])): ?>
                  <form method="POST" action="../api/lojas_acao.php" class="inline-form">
                    <input type="hidden" name="loja_id" value="<?= (int)$l['id'] ?>">
                    <input type="hidden" name="acao" value="suspender">
                    <button class="action-btn warn icon-only" type="submit" title="Desativar" aria-label="Desativar"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/></svg></button>
                  </form>
                  <?php else: ?>
                  <form method="POST" action="../api/lojas_acao.php" class="inline-form">
                    <input type="hidden" name="loja_id" value="<?= (int)$l['id'] ?>">
                    <input type="hidden" name="acao" value="ativar">
                    <button class="action-btn primary icon-only" type="submit" title="Ativar" aria-label="Ativar"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg></button>
                  </form>
                  <?php endif; ?>
                  <button class="action-btn danger icon-only" data-action="excluir" data-loja-id="<?= (int)$l['id'] ?>" data-loja-nome="<?= htmlspecialchars($l['nome'] ?? '') ?>" title="Excluir" aria-label="Excluir"><svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <div class="table-info" id="lojasInfo"></div>
        <div class="table-pagination" id="lojasPagination"></div>
      </div>
    </section>

    <section class="card table-card">
  <div class="table-actions" style="justify-content:space-between;gap:12px">
    <div style="font-weight:700;color:#0f172a">Leads de cadastro</div>
    <input class="table-search" id="leadsSearch" type="text" placeholder="Pesquisar lead">
  </div>
  <div class="table-wrap">
    <table class="table" id="leadsTable">
      <thead>
        <tr>
          <th>Data</th>
          <th>Nome</th>
          <th>Empresa</th>
          <th>Email</th>
          <th>WhatsApp</th>
          <th>CNPJ</th>
          <th>CEP</th>
          <th>Cidade/UF</th>
          <th>Segmento</th>
        </tr>
      </thead>
      <tbody>
        <?php if (!$leads): ?>
          <tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:18px 0">Nenhum lead cadastrado.</td></tr>
        <?php endif; ?>
        <?php foreach ($leads as $lead): ?>
          <tr data-lead="<?= htmlspecialchars(($lead['nome'] ?? '') . ' ' . ($lead['empresa'] ?? '') . ' ' . ($lead['email'] ?? '')) ?>">
            <td><?= !empty($lead['criado_em']) ? date('d/m/Y', strtotime($lead['criado_em'])) : '-' ?></td>
            <td><?= htmlspecialchars($lead['nome'] ?? '-') ?></td>
            <td><?= htmlspecialchars($lead['empresa'] ?? '-') ?></td>
            <td><?= htmlspecialchars($lead['email'] ?? '-') ?></td>
            <td><?= htmlspecialchars($lead['whatsapp'] ?? '-') ?></td>
            <td><?= htmlspecialchars($lead['cnpj'] ?? '-') ?></td>
            <td><?= htmlspecialchars($lead['cep'] ?? '-') ?></td>
            <td><?= htmlspecialchars(($lead['cidade'] ?? '-') . '/' . ($lead['estado'] ?? '-')) ?></td>
            <td><?= htmlspecialchars($lead['segmento'] ?? '-') ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</section>

  </main>
</div>

<div class="modal-backdrop" id="editarLojaModal" aria-hidden="true">
  <div class="modal-card" role="dialog" aria-modal="true">
    <div class="modal-header">
      <div class="modal-title">Editar loja</div>
      <button class="action-btn ghost" type="button" data-close-modal>Fechar</button>
    </div>
    <form id="editarLojaForm">
      <input type="hidden" name="loja_id" id="editLojaId">
      <input type="hidden" name="admin_id" id="editAdminId">
      <div class="form-grid">
        <div>
          <label class="form-label">Nome da loja</label>
          <input class="form-control" type="text" name="nome" id="editNome" required>
        </div>
        <div>
          <label class="form-label">Contato</label>
          <input class="form-control" type="text" name="contato" id="editContato">
        </div>
        <div>
          <label class="form-label">Email</label>
          <input class="form-control" type="email" name="email" id="editEmail" required>
        </div>
        <div>
          <label class="form-label">Usuario</label>
          <input class="form-control" type="text" name="usuario" id="editUsuario" required>
        </div>
        <div style="grid-column:1/-1" id="editExpiraBox"></div>
        <div id="editTrialInicioWrap">
          <label class="form-label">Inicio do teste</label>
          <input class="form-control" type="date" name="trial_inicio" id="editTrialInicio">
        </div>
        <div id="editTrialFimWrap">
          <label class="form-label">Fim do teste</label>
          <input class="form-control" type="date" name="trial_fim" id="editTrialFim">
        </div>
        <div>
          <label class="form-label">Nova senha</label>
          <div class="password-group">
            <input class="form-control" type="password" name="senha" id="editSenha">
            <button class="password-toggle" type="button" data-toggle="editSenha" aria-label="Mostrar senha">
              <svg viewBox="0 0 24 24"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3.5"/></svg>
            </button>
          </div>
        </div>
        <div>
          <label class="form-label">Repita a senha</label>
          <div class="password-group">
            <input class="form-control" type="password" name="senha2" id="editSenha2">
            <button class="password-toggle" type="button" data-toggle="editSenha2" aria-label="Mostrar senha">
              <svg viewBox="0 0 24 24"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3.5"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="action-btn ghost" type="button" data-close-modal>Cancelar</button>
        <button class="action-btn primary" type="submit">Salvar</button>
      </div>
      <div class="modal-msg" id="editLojaMsg" aria-live="polite"></div>
    </form>

    <div class="modal-section-divider"></div>
    <div class="modal-subtitle">Plano</div>
    <div class="form-grid">
      <div>
        <label class="form-label">Plano atual</label>
        <select class="form-control" id="editPlanoSelect"></select>
      </div>
      <div style="display:flex;align-items:flex-end;">
        <button class="action-btn" type="button" id="btnSalvarPlano">Salvar plano</button>
      </div>
    </div>
    <div class="modal-msg" id="planoMsg" aria-live="polite"></div>

    <div class="modal-section-divider"></div>
    <div class="modal-subtitle">Pagamento pendente</div>
    <div id="pagamentoPendenteBox"></div>
    <div class="modal-msg" id="pagamentoMsg" aria-live="polite"></div>
  </div>
</div>

<div class="modal-backdrop" id="excluirModal" aria-hidden="true">
  <div class="modal-card" role="dialog" aria-modal="true">
    <div class="modal-header">
      <div class="modal-title">Excluir loja</div>
      <button class="action-btn ghost" type="button" data-close-modal>Fechar</button>
    </div>
    <p style="margin:0 0 8px;color:#475569">Tem certeza que deseja excluir a loja <strong id="excluirNome"></strong>?</p>
    <div class="modal-actions">
      <button class="action-btn ghost" type="button" data-close-modal>Cancelar</button>
      <button class="action-btn danger" type="button" id="confirmExcluir">Excluir</button>
    </div>
    <div class="modal-msg" id="excluirMsg" aria-live="polite"></div>
  </div>
</div>

<?php require __DIR__ . '/partials/modais_globais.php'; ?>

<script>
const CONFIG_PLANOS = <?= json_encode($planosAtivos, JSON_UNESCAPED_UNICODE) ?>;
</script>
<script src="assets/js/chrome.js?v=<?= $chromeJsVer ?>"></script>
<script src="assets/js/configuracoes.js?v=<?= $configJsVer ?>"></script>
</body>
</html>
