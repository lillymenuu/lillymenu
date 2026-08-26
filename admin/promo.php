<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.promo');
require_once __DIR__ . '/helpers/config.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$lojaFlyers = json_decode((string) config($conn, 'loja_flyers', '[]'), true);
if (!is_array($lojaFlyers)) {
  $lojaFlyers = [];
}
$lojaFlyers = array_values(array_filter($lojaFlyers));

$produtoColunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
foreach ([
  'preco_promocional' => "ALTER TABLE produtos ADD COLUMN preco_promocional DECIMAL(10,2) NULL DEFAULT NULL",
  'promo_desativado'  => "ALTER TABLE produtos ADD COLUMN promo_desativado TINYINT(1) NOT NULL DEFAULT 1",
  'promo_dias'        => "ALTER TABLE produtos ADD COLUMN promo_dias INT NULL DEFAULT NULL",
  'promo_inicio'      => "ALTER TABLE produtos ADD COLUMN promo_inicio DATE NULL DEFAULT NULL",
  'promo_imagem'      => "ALTER TABLE produtos ADD COLUMN promo_imagem VARCHAR(255) NULL DEFAULT NULL",
  'promo_descricao'   => "ALTER TABLE produtos ADD COLUMN promo_descricao TEXT NULL DEFAULT NULL",
] as $coluna => $ddl) {
  if (!in_array($coluna, $produtoColunas, true)) {
    try { $conn->exec($ddl); $produtoColunas[] = $coluna; } catch (Throwable $e) {}
  }
}
$temImagem = in_array('imagem', $produtoColunas, true);

/* Desativa lazy as promocoes cuja data de expiracao (inicio + dias) ja passou */
try {
  $conn->prepare("
    UPDATE produtos
    SET promo_desativado = 1
    WHERE loja_id = ? AND promo_desativado = 0
      AND promo_dias IS NOT NULL AND promo_inicio IS NOT NULL
      AND DATE_ADD(promo_inicio, INTERVAL promo_dias DAY) <= CURDATE()
  ")->execute([$lojaId]);
} catch (Throwable $e) {
}

$selectCampos = [
  'p.id', 'p.nome', 'p.preco', 'p.categoria_id', 'c.nome AS categoria',
  'p.preco_promocional', 'p.promo_desativado', 'p.promo_dias', 'p.promo_inicio',
  'p.promo_imagem', 'p.promo_descricao',
];
if ($temImagem) {
  $selectCampos[] = 'p.imagem';
}

$stmt = $conn->prepare("
  SELECT " . implode(', ', $selectCampos) . "
  FROM produtos p
  LEFT JOIN categorias c ON c.id = p.categoria_id AND c.loja_id = p.loja_id
  WHERE p.loja_id = ? AND p.ativo = 1
  ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.nome
");
$stmt->execute([$lojaId]);
$produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

$hoje = new DateTime('today');
foreach ($produtos as &$p) {
  $p['preco'] = (float) $p['preco'];
  $p['preco_promocional'] = $p['preco_promocional'] !== null ? (float) $p['preco_promocional'] : null;
  $p['promo_desativado'] = (int) $p['promo_desativado'];
  $p['em_promo'] = !$p['promo_desativado'] && $p['preco_promocional'] > 0;
  $p['dias_restantes'] = null;
  if ($p['em_promo'] && $p['promo_dias'] && $p['promo_inicio']) {
    $fim = (new DateTime($p['promo_inicio']))->modify('+' . (int) $p['promo_dias'] . ' days');
    $p['dias_restantes'] = max(0, (int) $hoje->diff($fim)->format('%r%a'));
  }
}
unset($p);

$grupos = [];
$semCategoria = ['id' => 'sem', 'nome' => 'Sem categoria', 'produtos' => []];
foreach ($produtos as $p) {
  if ($p['categoria_id'] && $p['categoria']) {
    if (!isset($grupos[$p['categoria_id']])) {
      $grupos[$p['categoria_id']] = ['id' => $p['categoria_id'], 'nome' => $p['categoria'], 'produtos' => []];
    }
    $grupos[$p['categoria_id']]['produtos'][] = $p;
  } else {
    $semCategoria['produtos'][] = $p;
  }
}
$gruposList = array_values($grupos);
if ($semCategoria['produtos']) {
  $gruposList[] = $semCategoria;
}

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$produtosCssVer = filemtime(__DIR__ . '/assets/css/produtos.css');
$promoCssVer = filemtime(__DIR__ . '/assets/css/promo.css');
$promoJsVer = filemtime(__DIR__ . '/assets/js/promo.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Promo</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

<link href="./assets/css/produtos.css?v=<?= $produtosCssVer ?>" rel="stylesheet">
<link href="./assets/css/promo.css?v=<?= $promoCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy">

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid">
  <div class="produtos-page">
    <div class="produtos-header">
      <div>
        <h1 class="produtos-title">Promo</h1>
        <p class="produtos-subtitle">
          Escolha um produto e coloque ele em promoção por tempo limitado
        </p>
      </div>
      <div class="produtos-actions">
        <button type="button" class="btn btn-diggy-primary" data-bs-toggle="modal" data-bs-target="#modalFlyers">
          <i class="bi bi-images"></i> Gerenciar flyer de loja
        </button>
      </div>
    </div>

    <?php if (!$gruposList): ?>
      <div class="produtos-vazio">Nenhum produto cadastrado ainda.</div>
    <?php endif; ?>

    <?php foreach ($gruposList as $grupo): ?>
      <?php if (!$grupo['produtos']) continue; ?>
      <section class="categoria-bloco">
        <div class="categoria-head">
          <div class="categoria-left">
            <h2 class="categoria-title"><?= htmlspecialchars($grupo['nome']) ?></h2>
          </div>
        </div>
        <div class="produtos-grid">
          <?php foreach ($grupo['produtos'] as $p): ?>
            <?php
              $pj = htmlspecialchars(json_encode([
                'id' => $p['id'],
                'nome' => $p['nome'],
                'preco' => $p['preco'],
                'imagem' => $p['imagem'] ?? null,
                'preco_promocional' => $p['preco_promocional'],
                'em_promo' => $p['em_promo'],
                'promo_dias' => $p['promo_dias'],
                'promo_descricao' => $p['promo_descricao'],
                'promo_imagem' => $p['promo_imagem'],
              ], JSON_UNESCAPED_UNICODE), ENT_QUOTES);
            ?>
            <article class="produto-card promo-item-card<?= $p['em_promo'] ? ' promo' : '' ?>" onclick="abrirPromoModal(<?= $pj ?>, this)">
              <div class="produto-thumb">
                <?php if (!empty($p['imagem'])): ?>
                  <img src="<?= htmlspecialchars($p['imagem']) ?>" alt="">
                <?php else: ?>
                  <i class="bi bi-image"></i>
                <?php endif; ?>
              </div>
              <div class="produto-nome"><?= htmlspecialchars($p['nome']) ?></div>
              <?php if ($p['em_promo']): ?>
                <div class="produto-preco-wrap">
                  <span class="produto-preco-old">R$ <?= number_format($p['preco'], 2, ',', '.') ?></span>
                  <span class="produto-preco-promo">R$ <?= number_format($p['preco_promocional'], 2, ',', '.') ?></span>
                </div>
                <span class="produto-badge-promo">
                  <i class="bi bi-megaphone-fill"></i>
                  <?= $p['dias_restantes'] !== null ? 'Faltam ' . $p['dias_restantes'] . ' dia' . ($p['dias_restantes'] == 1 ? '' : 's') : 'Em promoção' ?>
                </span>
              <?php else: ?>
                <div class="produto-preco">R$ <?= number_format($p['preco'], 2, ',', '.') ?></div>
              <?php endif; ?>
            </article>
          <?php endforeach; ?>
        </div>
      </section>
    <?php endforeach; ?>
  </div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>

<!-- ══ MODAL DE PROMOCAO ══ -->
<div class="modal fade" id="modalPromo" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content promo-modal">
      <div class="modal-header">
        <h5 class="modal-title">Promoção do produto</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="promo-modal-produto">
          <div class="promo-modal-thumb" id="promoProdutoThumb"><i class="bi bi-image"></i></div>
          <div>
            <div class="promo-modal-nome" id="promoProdutoNome"></div>
            <div class="promo-modal-preco-atual">Preço atual: <strong id="promoProdutoPreco"></strong></div>
          </div>
        </div>

        <label class="promo-toggle-row">
          <span>Ativar esta promoção</span>
          <label class="switch">
            <input type="checkbox" id="promoAtivarInput">
            <span class="slider"></span>
          </label>
        </label>

        <div id="promoCamposAtivos">
          <div class="produto-field">
            <label class="form-label">Preço promocional</label>
            <input type="text" class="form-control produto-input" id="promoPrecoInput" placeholder="R$ 0,00" inputmode="decimal">
          </div>
          <div class="produto-field">
            <label class="form-label">Por quantos dias a promoção deve ficar ativa? (opcional)</label>
            <input type="number" class="form-control produto-input" id="promoDiasInput" min="1" placeholder="Deixe em branco para não expirar automaticamente">
          </div>
          <div class="produto-field">
            <label class="form-label">Descrição da promoção (opcional)</label>
            <textarea class="form-control produto-textarea" id="promoDescricaoInput" rows="3" placeholder="Alguma informação extra sobre essa promoção..."></textarea>
          </div>
          <div class="produto-field">
            <label class="form-label">Foto de propaganda (opcional)</label>
            <div class="promo-imagem-row">
              <div class="promo-imagem-preview" id="promoImagemPreview"><i class="bi bi-image"></i></div>
              <div>
                <button type="button" class="btn btn-diggy-ghost btn-sm" id="promoImagemBtn">Anexar foto</button>
                <button type="button" class="btn btn-outline-secondary btn-sm d-none" id="promoImagemRemoverBtn">Remover</button>
                <input type="file" id="promoImagemInput" accept="image/png,image/jpeg,image/webp" hidden>
              </div>
            </div>
          </div>
        </div>
        <div class="promo-modal-msg" id="promoModalMsg"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-diggy-ghost" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="btn btn-diggy-primary" id="promoSalvarBtn" onclick="salvarPromo()">Salvar</button>
      </div>
    </div>
  </div>
</div>

<!-- ══ MODAL: GERENCIAR FLYER DE LOJA ══ -->
<div class="modal fade" id="modalFlyers" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content promo-modal">
      <div class="modal-header">
        <h5 class="modal-title">Gerenciar flyer de loja</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="flyer-modal-desc">
          Essas imagens aparecem em um carrossel deslizante no topo do seu cardápio, acima das categorias. Você pode cadastrar até 3.
          <br>
          <strong>Dimensão recomendada: 1200 x 600px (proporção 2:1).</strong> Evite textos ou detalhes importantes muito perto das bordas — a imagem é recortada para preencher o espaço sem distorcer.
        </div>

        <?php for ($i = 1; $i <= 3; $i++): ?>
          <div class="produto-field flyer-field">
            <label class="form-label">Imagem <?= $i ?></label>
            <div class="promo-imagem-row">
              <div class="promo-imagem-preview flyer-imagem-preview" id="flyerPreview<?= $i ?>"><i class="bi bi-image"></i></div>
              <div>
                <button type="button" class="btn btn-diggy-ghost btn-sm" id="flyerBtn<?= $i ?>">Anexar imagem</button>
                <button type="button" class="btn btn-outline-secondary btn-sm d-none" id="flyerRemoverBtn<?= $i ?>">Remover</button>
                <input type="file" id="flyerInput<?= $i ?>" accept="image/png,image/jpeg,image/webp" hidden>
              </div>
            </div>
          </div>
        <?php endfor; ?>
        <div class="promo-modal-msg" id="flyerModalMsg"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-diggy-ghost" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="btn btn-diggy-primary" id="flyerSalvarBtn" onclick="salvarFlyers()">Salvar</button>
      </div>
    </div>
  </div>
</div>

<script>window.LOJA_FLYERS_ATUAIS = <?= json_encode($lojaFlyers, JSON_UNESCAPED_UNICODE) ?>;</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/promo.js?v=<?= $promoJsVer ?>"></script>
</body>
</html>
