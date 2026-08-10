<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.cupons');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$stmt = $conn->prepare("SHOW TABLES LIKE 'cupons'");
$stmt->execute();
$temCupons = (bool) $stmt->fetchColumn();

$cupons = [];
$temPrimeiraCompra = false;
$temPublico = false;
if ($temCupons) {
  $colunasCupons = $conn->query("SHOW COLUMNS FROM cupons")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temPrimeiraCompra = in_array('primeira_compra', $colunasCupons, true);
  $temPublico = in_array('publico', $colunasCupons, true);
  $temLoja = in_array('loja_id', $colunasCupons, true);

  $select = "id, codigo, tipo, desconto, minimo, quantidade_total, quantidade_usada, ativo, criado_em";
  if ($temPrimeiraCompra) {
    $select .= ", primeira_compra";
  }
  if ($temPublico) {
    $select .= ", publico";
  }
  if ($temLoja) {
    $stmt = $conn->prepare("
      SELECT {$select}
      FROM cupons
      WHERE loja_id = ?
      ORDER BY criado_em DESC
    ");
    $stmt->execute([$lojaId]);
    $cupons = $stmt->fetchAll(PDO::FETCH_ASSOC);
  } else {
    $stmt = $conn->query("
      SELECT {$select}
      FROM cupons
      ORDER BY criado_em DESC
    ");
    $cupons = $stmt->fetchAll(PDO::FETCH_ASSOC);
  }
}

function formatarMoeda($valor) {
  return 'R$ ' . number_format((float) $valor, 2, ',', '.');
}
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$cuponsCssVer = filemtime(__DIR__ . '/assets/css/cupons.css');
$cuponsJsVer = filemtime(__DIR__ . '/assets/js/cupons.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Cupons de desconto</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

<link href="./assets/css/cupons.css?v=<?= $cuponsCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy cupons-page">

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="dash-page cupons-shell">
  <div class="cupons-header">
    <h1 class="cupons-title">Cupons de desconto</h1>
    <button class="cupons-btn" type="button" data-bs-toggle="modal" data-bs-target="#modalCupom">
      <i class="bi bi-plus-circle"></i>
      Adicionar cupom
    </button>
  </div>

  <?php if (!$temCupons): ?>
    <div class="cupons-empty">Tabela de cupons nao encontrada. Execute `admin/sql/create_cupons.sql`.</div>
  <?php elseif (!$cupons): ?>
    <div class="cupons-empty">Nenhum cupom cadastrado.</div>
  <?php else: ?>
    <div class="cupons-grid">
      <?php foreach ($cupons as $cupom): ?>
        <?php
          $tipo = $cupom['tipo'] === 'valor' ? 'valor' : ($cupom['tipo'] === 'frete' ? 'frete' : 'percent');
          if ($tipo === 'frete') {
            $descricao = "Frete gratis para compras acima de " . formatarMoeda($cupom['minimo']);
          } else {
            $descricao = $tipo === 'percent'
              ? number_format((float) $cupom['desconto'], 2, ',', '.') . "% de desconto para compras acima de " . formatarMoeda($cupom['minimo'])
              : formatarMoeda($cupom['desconto']) . " de desconto para compras acima de " . formatarMoeda($cupom['minimo']);
          }
          $total = (int) $cupom['quantidade_total'];
          $usada = (int) $cupom['quantidade_usada'];
          $disponivel = $total > 0 ? max(0, $total - $usada) : null;
          $disponivelTexto = $total > 0
            ? "{$disponivel} cupons disponiveis para seus clientes"
            : "Cupons ilimitados para seus clientes";
        ?>
        <div class="cupom-card"
          data-cupom-id="<?= (int) $cupom['id'] ?>"
          data-cupom-codigo="<?= htmlspecialchars($cupom['codigo'], ENT_QUOTES, 'UTF-8') ?>"
          data-cupom-tipo="<?= htmlspecialchars($cupom['tipo'], ENT_QUOTES, 'UTF-8') ?>"
          data-cupom-desconto="<?= htmlspecialchars((string) ($cupom['desconto'] ?? '0'), ENT_QUOTES, 'UTF-8') ?>"
          data-cupom-minimo="<?= htmlspecialchars((string) ($cupom['minimo'] ?? '0'), ENT_QUOTES, 'UTF-8') ?>"
          data-cupom-quantidade="<?= (int) ($cupom['quantidade_total'] ?? 0) ?>"
          data-cupom-ativo="<?= (int) ($cupom['ativo'] ?? 0) ?>"
          data-cupom-primeira="<?= (int) ($cupom['primeira_compra'] ?? 0) ?>"
          data-cupom-publico="<?= (int) ($cupom['publico'] ?? 0) ?>"
        >
          <div class="cupom-head">
            <div class="cupom-code">
              <i class="bi bi-ticket-perforated"></i>
              <?= htmlspecialchars($cupom['codigo']) ?>
            </div>
            <label class="cupom-toggle">
              <input type="checkbox" data-cupom-toggle value="1" <?= $cupom['ativo'] ? 'checked' : '' ?>>
              <span></span>
            </label>
          </div>
          <div class="cupom-desc"><?= $descricao ?></div>
          <div class="cupom-qty"><?= $disponivelTexto ?></div>
          <button class="cupom-link" type="button" data-cupom-copy="<?= htmlspecialchars($cupom['codigo']) ?>">
            <i class="bi bi-link-45deg"></i>
            Copiar link com o cupom
          </button>
        </div>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

  <div class="dash-footer">Cardapio Digital Will (c) 2026</div>
</div>

</main>
</div>

<div class="modal fade cupons-modal" id="modalCupom" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0">
      <div class="modal-header">
        <h5 class="modal-title">Adicionar cupom</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <form id="formCupom">
          <div class="cupons-form">
            <div class="cupom-field">
              <label class="cupom-field-label" for="cupomTipoInput">Tipo de desconto</label>
              <select class="form-select cupom-input" id="cupomTipoInput" name="tipo">
                <option value="valor">Valor fixo</option>
                <option value="percent">Percentagem (%)</option>
                <option value="frete">Frete gratis</option>
              </select>
            </div>

            <div class="cupom-field">
              <label class="cupom-field-label" for="cupomCodigoInput">Codigo do desconto (maximo 15 caracteres) *</label>
              <input class="form-control cupom-input" type="text" id="cupomCodigoInput" name="codigo" placeholder="Ex.: 15%OFF" maxlength="15">
              <div class="cupom-counter" id="cupomCodigoCounter">0/15</div>
            </div>

            <div class="cupom-field">
              <label class="cupom-field-label" for="cupomDescontoInput">Valor do desconto *</label>
              <input class="form-control cupom-input" type="number" step="0.01" id="cupomDescontoInput" name="desconto" placeholder="0,00">
            </div>

            <div class="cupom-field">
              <label class="cupom-field-label" for="cupomMinimoInput">Valor minimo do pedido *</label>
              <input class="form-control cupom-input" type="number" step="0.01" id="cupomMinimoInput" name="minimo" placeholder="0,00">
            </div>

            <div class="cupom-field">
              <label class="cupom-field-label" for="cupomQuantidadeInput">Quantidade de cupons disponiveis *</label>
              <input class="form-control cupom-input" type="number" step="1" id="cupomQuantidadeInput" name="quantidade_total" placeholder="0">
            </div>

            <div class="cupom-switch-card">
              <div>
                <div class="cupom-switch-title">Disponibilidade</div>
                <div class="cupom-switch-desc">Cupom disponivel para seus clientes utilizarem</div>
              </div>
              <label class="cupom-switch">
                <input type="checkbox" id="cupomAtivoInput" name="ativo" value="1" checked>
                <span></span>
              </label>
            </div>

            <div class="cupom-switch-card">
              <div>
                <div class="cupom-switch-title">Primeira compra</div>
                <div class="cupom-switch-desc">Habilite para dar desconto apenas para novos clientes</div>
              </div>
              <label class="cupom-switch">
                <input type="checkbox" id="cupomPrimeiraInput" name="primeira_compra" value="1">
                <span></span>
              </label>
            </div>

            <div class="cupom-switch-card">
              <div>
                <div class="cupom-switch-title">Cupom publico</div>
                <div class="cupom-switch-desc">Disponivel para todos no menu, sem compartilhar codigo</div>
              </div>
              <label class="cupom-switch">
                <input type="checkbox" id="cupomPublicoInput" name="publico" value="1">
                <span></span>
              </label>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer border-0">
        <button type="button" class="cupom-save" id="btnSalvarCupom">Salvar</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade cupons-modal cupons-modal-edit" id="modalCupomEditar" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0">
      <div class="modal-header">
        <h5 class="modal-title">Editar cupom</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <form id="formCupomEditar">
          <input type="hidden" id="cupomEditId" name="id">
          <div class="cupons-form">
            <div class="cupom-field">
              <label class="cupom-field-label" for="cupomEditTipoInput">Tipo de desconto</label>
              <select class="form-select cupom-input" id="cupomEditTipoInput" name="tipo">
                <option value="valor">Valor fixo</option>
                <option value="percent">Percentagem (%)</option>
                <option value="frete">Frete gratis</option>
              </select>
            </div>

            <div class="cupom-field">
              <label class="cupom-field-label" for="cupomEditCodigoInput">Codigo do desconto (maximo 15 caracteres) *</label>
              <input class="form-control cupom-input" type="text" id="cupomEditCodigoInput" name="codigo" placeholder="Ex.: 15%OFF" maxlength="15">
              <div class="cupom-counter" id="cupomEditCodigoCounter">0/15</div>
            </div>

            <div class="cupom-field">
              <label class="cupom-field-label" for="cupomEditDescontoInput">Valor do desconto *</label>
              <input class="form-control cupom-input" type="number" step="0.01" id="cupomEditDescontoInput" name="desconto" placeholder="0,00">
            </div>

            <div class="cupom-field">
              <label class="cupom-field-label" for="cupomEditMinimoInput">Valor minimo do pedido *</label>
              <input class="form-control cupom-input" type="number" step="0.01" id="cupomEditMinimoInput" name="minimo" placeholder="0,00">
            </div>

            <div class="cupom-field">
              <label class="cupom-field-label" for="cupomEditQuantidadeInput">Quantidade de cupons disponiveis *</label>
              <input class="form-control cupom-input" type="number" step="1" id="cupomEditQuantidadeInput" name="quantidade_total" placeholder="0">
            </div>

            <div class="cupom-switch-card">
              <div>
                <div class="cupom-switch-title">Disponibilidade</div>
                <div class="cupom-switch-desc">Cupom disponivel para seus clientes utilizarem</div>
              </div>
              <label class="cupom-switch">
                <input type="checkbox" id="cupomEditAtivoInput" name="ativo" value="1">
                <span></span>
              </label>
            </div>

            <div class="cupom-switch-card">
              <div>
                <div class="cupom-switch-title">Primeira compra</div>
                <div class="cupom-switch-desc">Habilite para dar desconto apenas para novos clientes</div>
              </div>
              <label class="cupom-switch">
                <input type="checkbox" id="cupomEditPrimeiraInput" name="primeira_compra" value="1">
                <span></span>
              </label>
            </div>

            <div class="cupom-switch-card">
              <div>
                <div class="cupom-switch-title">Cupom publico</div>
                <div class="cupom-switch-desc">Disponivel para todos no menu, sem compartilhar codigo</div>
              </div>
              <label class="cupom-switch">
                <input type="checkbox" id="cupomEditPublicoInput" name="publico" value="1">
                <span></span>
              </label>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer border-0">
        <button type="button" class="cupom-delete" id="btnApagarCupom">Apagar cupom</button>
        <button type="button" class="cupom-save" id="btnSalvarCupomEdicao">Salvar alteracoes</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade cupons-modal cupons-modal-confirm" id="modalCupomExcluir" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0">
      <div class="modal-header">
        <h5 class="modal-title">Apagar cupom</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <p class="mb-0">Deseja apagar este cupom? Essa acao nao podera ser desfeita.</p>
      </div>
      <div class="modal-footer border-0">
        <button type="button" class="cupom-delete" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="cupom-danger" id="btnConfirmarExcluir">Apagar cupom</button>
      </div>
    </div>
  </div>
</div>

<div id="cuponsToast" class="cupons-toast" aria-live="polite"></div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/cupons.js?v=<?= $cuponsJsVer ?>"></script>
</body>
</html>
