<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.produtos');
require_once __DIR__ . '/helpers/config.php';

/* LISTAGEM INICIAL */
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$produtoColunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temOrdem = in_array('ordem', $produtoColunas, true);
$temPrecoPromocional = in_array('preco_promocional', $produtoColunas, true);
$temPromoDesativado = in_array('promo_desativado', $produtoColunas, true);
$temImagem = in_array('imagem', $produtoColunas, true);
$temPontosGanho = in_array('pontos_ganho', $produtoColunas, true);
$temPontosCusto = in_array('pontos_custo', $produtoColunas, true);
$temDataValidade = in_array('data_validade', $produtoColunas, true);
$clube_pontos_ativo = config($conn, 'clube_pontos_ativo', '0');

$precoExpr = ($temPrecoPromocional && $temPromoDesativado)
  ? "IF(p.promo_desativado = 0 AND p.preco_promocional IS NOT NULL AND p.preco_promocional > 0, p.preco_promocional, p.preco)"
  : "p.preco";

$promoExpr = ($temPrecoPromocional && $temPromoDesativado)
  ? "CASE WHEN p.promo_desativado = 0 AND p.preco_promocional IS NOT NULL AND p.preco_promocional > 0 THEN 1 ELSE 0 END"
  : "0";

$selectCampos = [
  'p.id',
  'p.nome',
  'p.preco AS preco_base',
  "$precoExpr AS preco",
  "$promoExpr AS em_promocao",
  'p.ativo',
  'p.categoria_id',
  'c.nome AS categoria',
  'IFNULL(e.quantidade, 0) AS estoque_quantidade'
];

if ($temPrecoPromocional) {
  $selectCampos[] = 'p.preco_promocional';
}
if ($temPromoDesativado) {
  $selectCampos[] = 'p.promo_desativado';
}
if ($temImagem) {
  $selectCampos[] = 'p.imagem';
}
if ($temPontosGanho) {
  $selectCampos[] = 'p.pontos_ganho';
}
if ($temPontosCusto) {
  $selectCampos[] = 'p.pontos_custo';
}
if ($temDataValidade) {
  $selectCampos[] = 'p.data_validade';
  $selectCampos[] = 'DATEDIFF(p.data_validade, CURDATE()) AS dias_validade_restantes';
}

$ordenacaoProdutos = $temOrdem
  ? "ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.ordem IS NULL, p.ordem, p.nome"
  : "ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.nome";

$stmt = $conn->prepare("
  SELECT " . implode(', ', $selectCampos) . "
  FROM produtos p
  LEFT JOIN categorias c ON c.id = p.categoria_id AND c.loja_id = p.loja_id
  LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
  WHERE p.loja_id = ?
  $ordenacaoProdutos
");
$stmt->execute([$lojaId]);
$produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("
  SELECT id, nome, ativo, dias_semana, horario_ini, horario_fim
  FROM categorias
  WHERE loja_id = ?
  ORDER BY ordem IS NULL, ordem, nome
");
$stmt->execute([$lojaId]);
$categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);

$grupos = [];
foreach ($categorias as $categoria) {
  $grupos[$categoria['id']] = [
    'id' => $categoria['id'],
    'nome' => $categoria['nome'],
    'ativo' => (int) $categoria['ativo'],
    'dias_semana' => $categoria['dias_semana'] ?? '',
    'horario_ini' => $categoria['horario_ini'] ?? '',
    'horario_fim' => $categoria['horario_fim'] ?? '',
    'produtos' => []
  ];
}

$semCategoria = [
  'id' => 'sem',
  'nome' => 'Sem categoria',
  'ativo' => 1,
  'produtos' => []
];

foreach ($produtos as $produto) {
  $categoriaId = $produto['categoria_id'];
  if ($categoriaId && isset($grupos[$categoriaId])) {
    $grupos[$categoriaId]['produtos'][] = $produto;
  } else {
    $semCategoria['produtos'][] = $produto;
  }
}

$gruposList = array_values($grupos);
if (count($semCategoria['produtos']) > 0) {
  $gruposList[] = $semCategoria;
}

/* ===== CATEGORIAS PARA FILTRO DE COMBOS ===== */
$categoriasCombo = [];
try {
  $stmtCats = $conn->prepare("SELECT id, nome FROM categorias WHERE loja_id = ? AND ativo = 1 ORDER BY ordem IS NULL, ordem, nome");
  $stmtCats->execute([$lojaId]);
  $categoriasCombo = $stmtCats->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) { $categoriasCombo = []; }

/* ===== COMBOS ===== */
$combosMap = [];
try {
  $stmtTbl = $conn->query("SHOW TABLES LIKE 'combos'");
  if ($stmtTbl && $stmtTbl->fetchColumn()) {
    $stmtCombos = $conn->prepare("
      SELECT id, nome, descricao, imagem, tipo_preco, preco, preco_promocional, promo_desativado, ativo, categoria_id
      FROM combos
      WHERE loja_id = ?
      ORDER BY ordem IS NULL, ordem, nome
    ");
    $stmtCombos->execute([$lojaId]);
    foreach ($stmtCombos->fetchAll(PDO::FETCH_ASSOC) as $combo) {
      $cid = $combo['categoria_id'] ?: 'sem';
      $combosMap[$cid][] = $combo;
    }
  }
} catch (Throwable $e) {
  $combosMap = [];
}

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$produtosCssVer = filemtime(__DIR__ . '/assets/css/produtos.css');
$produtosJsVer = filemtime(__DIR__ . '/assets/js/produtos.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Produtos</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

<link href="./assets/css/produtos.css?v=<?= $produtosCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy">

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid">
  <div class="produtos-page">
    <div class="produtos-header">
      <div>
        <h1 class="produtos-title">Produtos</h1>
        <p class="produtos-subtitle">
          Aqui voce cadastra e gerencia seus produtos e categorias
        </p>
      </div>
      <div class="produtos-actions">
        <button class="btn btn-diggy-primary" type="button" onclick="abrirModalCategoria()">
          <i class="bi bi-plus-circle me-1"></i>
          Adicionar categoria
        </button>
        <button class="btn btn-diggy-ghost" type="button" onclick="abrirModalReordenarCategorias()">
          <i class="bi bi-list-check me-1"></i>
          Reordenar categorias
        </button>
      </div>
    </div>

    <div class="produtos-search">
      <div class="produtos-search-row">
        <div class="produtos-search-group">
          <label for="buscaProduto">Buscar produto</label>
          <input id="buscaProduto" type="text"
                 placeholder="Buscar por nome ou codigo do produto"
                 autocomplete="off">
        </div>
        <div class="produtos-search-filter">
          <label class="form-check form-switch m-0">
            <input class="form-check-input" type="checkbox" id="filtroPromo">
            <span>Somente promo</span>
          </label>
        </div>
      </div>
    </div>

    <div id="produtosConteudo">
      <?php if (count($gruposList) === 0): ?>
        <div class="produtos-empty">Nenhum produto cadastrado.</div>
      <?php endif; ?>

      <?php foreach ($gruposList as $grupo): ?>
        <section class="categoria-bloco" data-categoria-id="<?= htmlspecialchars((string) $grupo['id'], ENT_QUOTES, 'UTF-8') ?>">
          <div class="categoria-head">
            <div class="categoria-left">
              <h2 class="categoria-title"><?= htmlspecialchars($grupo['nome'], ENT_QUOTES, 'UTF-8') ?></h2>
              <?php if ($grupo['id'] !== 'sem'): ?>
                <span class="categoria-badge <?= $grupo['ativo'] ? 'badge-ativa' : 'badge-inativa' ?>">
                  <?= $grupo['ativo'] ? 'ativa' : 'inativa' ?>
                </span>
                <label class="switch categoria-toggle" title="Disponivel no PDV">
                  <input type="checkbox" class="categoria-toggle-input"
                         data-id="<?= (int) $grupo['id'] ?>"
                         <?= $grupo['ativo'] ? 'checked' : '' ?>>
                  <span class="slider"></span>
                </label>
              <?php endif; ?>
            </div>
            <div class="categoria-actions">
              <button class="btn btn-diggy-primary btn-sm" type="button"
                      onclick="abrirModalProduto('<?= $grupo['id'] === 'sem' ? '' : $grupo['id'] ?>')">
                <i class="bi bi-plus-circle me-1"></i>
                Adicionar
              </button>
              <button class="btn btn-diggy-combo btn-sm" type="button"
                      onclick="abrirModalCombo('<?= $grupo['id'] === 'sem' ? '' : $grupo['id'] ?>')">
                <i class="bi bi-plus-circle me-1"></i>
                Combo
              </button>
              <?php if ($grupo['id'] !== 'sem'): ?>
                <button class="btn btn-diggy-combo btn-sm" type="button"
                        data-categoria-id="<?= htmlspecialchars((string) $grupo['id'], ENT_QUOTES, 'UTF-8') ?>"
                        data-dias-semana="<?= htmlspecialchars($grupo['dias_semana'], ENT_QUOTES, 'UTF-8') ?>"
                        data-horario-ini="<?= htmlspecialchars($grupo['horario_ini'], ENT_QUOTES, 'UTF-8') ?>"
                        data-horario-fim="<?= htmlspecialchars($grupo['horario_fim'], ENT_QUOTES, 'UTF-8') ?>"
                        onclick="abrirModalCronogramaCategoria(this)">
                  <i class="bi bi-calendar-week me-1"></i>
                  Configurar agendamento
                </button>
              <?php endif; ?>
              <?php if ($grupo['id'] !== 'sem'): ?>
                <div class="dropdown">
                  <button class="btn btn-outline-secondary btn-sm dropdown-toggle"
                          type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    Opções
                  </button>
                  <ul class="dropdown-menu">
                    <li>
                      <button class="dropdown-item" type="button"
                              onclick="editarCategoria('<?= htmlspecialchars((string) $grupo['id'], ENT_QUOTES, 'UTF-8') ?>')">
                        Editar categoria
                      </button>
                    </li>
                    <li>
                      <button class="dropdown-item" type="button"
                              onclick="reordenarItens('<?= htmlspecialchars((string) $grupo['id'], ENT_QUOTES, 'UTF-8') ?>')">
                        Reordenar items
                      </button>
                    </li>
                  </ul>
                </div>
                <button class="btn btn-sm" type="button"
                        title="Excluir categoria"
                        onclick="excluirCategoria(<?= (int)$grupo['id'] ?>, '<?= htmlspecialchars($grupo['nome'], ENT_QUOTES, 'UTF-8') ?>')"
                        style="color:#dc2626;border:1px solid #fee2e2;background:#fff;border-radius:8px;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;padding:0">
                  <i class="bi bi-trash3"></i>
                </button>
              <?php endif; ?>
            </div>
          </div>

          <div class="produtos-grid">
            <?php if (count($grupo['produtos']) === 0): ?>
              <div class="produtos-vazio">Nenhum produto nesta categoria.</div>
            <?php endif; ?>

            <?php foreach ($combosMap[$grupo['id']] ?? [] as $cb): ?>
              <article class="produto-card combo-card" data-id="combo_<?= (int)$cb['id'] ?>"
                       style="cursor:pointer" onclick="editarCombo(<?= (int)$cb['id'] ?>)">
                <div class="produto-thumb">
                  <?php if (!empty($cb['imagem'])): ?>
                    <img src="<?= htmlspecialchars($cb['imagem'], ENT_QUOTES, 'UTF-8') ?>" alt="">
                  <?php else: ?>
                    <i class="bi bi-layers"></i>
                  <?php endif; ?>
                  <span class="combo-badge"><i class="bi bi-columns-gap"></i>Combo</span>
                </div>
                <div class="produto-nome"><?= htmlspecialchars($cb['nome'], ENT_QUOTES, 'UTF-8') ?></div>
                <?php
                  $cbTemPromo = !$cb['promo_desativado'] && !empty($cb['preco_promocional']) && (float)$cb['preco_promocional'] > 0;
                ?>
                <?php if ($cbTemPromo): ?>
                  <div>
                    <span class="combo-preco-old">R$ <?= number_format((float)$cb['preco'], 2, ',', '.') ?></span>
                    <span class="combo-preco-promo">R$ <?= number_format((float)$cb['preco_promocional'], 2, ',', '.') ?></span>
                  </div>
                <?php else: ?>
                  <div class="produto-preco">R$ <?= number_format((float)$cb['preco'], 2, ',', '.') ?></div>
                <?php endif; ?>
                <div class="produto-footer" onclick="event.stopPropagation()">
                  <label class="switch" title="Ativar/desativar combo" onclick="event.stopPropagation()">
                    <input type="checkbox" class="combo-toggle"
                           data-id="<?= (int)$cb['id'] ?>"
                           <?= $cb['ativo'] ? 'checked' : '' ?>>
                    <span class="slider"></span>
                  </label>
                </div>
              </article>
            <?php endforeach; ?>

            <?php foreach ($grupo['produtos'] as $p): ?>
              <?php $produtoVencido = !empty($p['data_validade']) && (int) ($p['dias_validade_restantes'] ?? 0) < 0; ?>
              <article class="produto-card<?= ($p['em_promocao'] ?? 0) ? ' promo' : '' ?><?= $produtoVencido ? ' produto-vencido' : '' ?>"
                       data-id="<?= (int) $p['id'] ?>"
                       data-validade="<?= htmlspecialchars((string) ($p['data_validade'] ?? ''), ENT_QUOTES, 'UTF-8') ?>"
                       data-nome="<?= htmlspecialchars(strtolower($p['nome']), ENT_QUOTES, 'UTF-8') ?>"
                       style="cursor:pointer"
                       onclick="editarProduto(<?= $p['id'] ?>)">
                <div class="produto-thumb">
                  <?php if (!empty($p['imagem'])): ?>
                    <img src="<?= htmlspecialchars($p['imagem'], ENT_QUOTES, 'UTF-8') ?>" alt="">
                  <?php else: ?>
                    <i class="bi bi-image"></i>
                  <?php endif; ?>
                </div>
                <div class="produto-nome"><?= htmlspecialchars($p['nome'], ENT_QUOTES, 'UTF-8') ?></div>
                <div class="produto-estoque-info<?= ((int) $p['estoque_quantidade']) > 0 ? ' is-ok' : '' ?>">
                  <i class="bi <?= ((int) $p['estoque_quantidade']) > 0 ? 'bi-check-circle-fill' : 'bi-box-seam' ?>"></i>
                  <?= (int) $p['estoque_quantidade'] ?> em estoque
                </div>
                <?php if (($p['em_promocao'] ?? 0) == 1): ?>
                  <div class="produto-preco-wrap">
                    <span class="produto-preco-old">R$ <?= number_format($p['preco_base'], 2, ',', '.') ?></span>
                    <span class="produto-preco-promo">R$ <?= number_format($p['preco'], 2, ',', '.') ?></span>
                  </div>
                <?php else: ?>
                  <div class="produto-preco">R$ <?= number_format($p['preco'], 2, ',', '.') ?></div>
                <?php endif; ?>
                <?php
                  $pontosGanho = (int) ($p['pontos_ganho'] ?? 0);
                  $pontosCusto = (int) ($p['pontos_custo'] ?? 0);
                ?>
                <?php if ($pontosGanho > 0 || $pontosCusto > 0): ?>
                  <div class="produto-pontos">
                    <?php if ($pontosGanho > 0): ?>
                      <span class="produto-pontos-badge recompensa">
                        <i class="bi bi-gift"></i> Recompensa <?= $pontosGanho ?> pts
                      </span>
                    <?php endif; ?>
                    <?php if ($pontosCusto > 0): ?>
                      <span class="produto-pontos-badge custo">
                        <i class="bi bi-lightning-charge"></i> Custo: <?= $pontosCusto ?> pts
                      </span>
                    <?php endif; ?>
                  </div>
                <?php endif; ?>
                <div class="produto-footer" onclick="event.stopPropagation()">
                  <label class="switch" title="Ativar/desativar produto" onclick="event.stopPropagation()">
                    <input type="checkbox" class="produto-toggle"
                           data-id="<?= (int) $p['id'] ?>"
                           <?= $p['ativo'] ? 'checked' : '' ?>>
                    <span class="slider"></span>
                  </label>
                </div>
              </article>
            <?php endforeach; ?>
          </div>
        </section>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>

<div class="modal fade produto-imagem-modal" id="modalProdutoImagem" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Imagem do produto</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="produto-cropper-frame" id="produtoCropFrame">
          <img src="" alt="" id="produtoCropImg">
        </div>
        <div class="produto-cropper-actions">
          <span class="text-muted small">Zoom</span>
          <input type="range" id="produtoCropZoom" min="1" max="3" step="0.01" value="1">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-diggy-primary" type="button" id="produtoCropSalvar">OK</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL CATEGORIA -->
<div class="modal fade" id="modalCategoria" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-lg">
    <div class="modal-content categoria-modal">
      <div class="modal-header">
        <h5 class="modal-title" id="categoriaModalTitle">Criar categoria</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <form id="formCategoria">
          <input type="hidden" id="categoriaId" name="id">
          <input type="hidden" id="categoriaModo" name="modo_exibicao" value="vertical">

          <div class="mb-3">
            <label class="form-label">Nome da categoria<span class="text-danger">*</span></label>
            <input class="form-control rounded-3"
                   id="categoriaNome" name="nome" required>
          </div>

          <div class="mb-3">
            <label class="form-label">Modo de exibicao</label>
            <div class="categoria-modos">
              <button class="modo-card active" type="button" data-value="vertical">
                <div class="modo-preview modo-vertical">
                  <span></span><span></span><span></span>
                </div>
                <div class="modo-title">Lista vertical</div>
                <div class="modo-desc">Produtos um abaixo do outro.</div>
              </button>
              <button class="modo-card" type="button" data-value="horizontal">
                <div class="modo-preview modo-horizontal">
                  <span></span><span></span><span></span>
                </div>
                <div class="modo-title">Lista horizontal</div>
                <div class="modo-desc">Produtos ao lado, com scroll lateral.</div>
              </button>
              <button class="modo-card" type="button" data-value="grid">
                <div class="modo-preview modo-grid">
                  <span></span><span></span><span></span>
                  <span></span><span></span><span></span>
                </div>
                <div class="modo-title">Grade</div>
                <div class="modo-desc">Itens organizados em grade.</div>
              </button>
            </div>
          </div>

          <div class="categoria-disponivel">
            <div>
              <div class="disponivel-title">Categoria disponivel</div>
              <div class="disponivel-desc">
                Ao pausar a categoria ela nao estara disponivel no catalogo e PDV.
              </div>
            </div>
            <label class="switch">
              <input type="checkbox" id="categoriaAtivo" name="ativo" checked>
              <span class="slider"></span>
            </label>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-diggy-primary" type="button" id="categoriaSalvarBtn" onclick="salvarCategoria()">
          Adicionar
        </button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL REORDENAR CATEGORIAS -->
<div class="modal fade" id="modalReordenarCategorias" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content reorder-modal">
      <div class="modal-header">
        <h5 class="modal-title">Reordenar</h5>
        <div class="reorder-actions">
          <button class="btn btn-diggy-primary btn-sm" type="button" onclick="salvarReordenacaoCategorias()">
            Salvar
          </button>
          <button class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
        </div>
      </div>
      <div class="modal-body">
        <p class="reorder-help">
          Clique para selecionar e arraste os itens para reordenar a ordem em que eles aparecerao no menu.
        </p>
        <div class="reorder-list" id="ordenarLista">
          <?php foreach ($categorias as $index => $categoria): ?>
            <div class="reorder-item" draggable="true"
                 data-id="<?= htmlspecialchars((string) $categoria['id'], ENT_QUOTES, 'UTF-8') ?>">
              <span class="reorder-num"><?= $index + 1 ?> -</span>
              <span class="reorder-nome"><?= htmlspecialchars($categoria['nome'], ENT_QUOTES, 'UTF-8') ?></span>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL REORDENAR ITENS -->
<div class="modal fade" id="modalReordenarItens" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content reorder-modal">
      <div class="modal-header">
        <div>
          <h5 class="modal-title mb-1">Reordenar</h5>
          <div class="reorder-subtitle" id="ordenarItensCategoria"></div>
        </div>
        <div class="reorder-actions">
          <button class="btn btn-diggy-primary btn-sm" type="button" onclick="salvarReordenacaoItens()">
            Salvar
          </button>
          <button class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
        </div>
      </div>
      <div class="modal-body">
        <p class="reorder-help">
          Clique para selecionar e arraste os itens para reordenar a ordem em que eles aparecerao no menu.
        </p>
        <div class="reorder-list" id="ordenarItensLista"></div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL PRODUTO -->
<div class="modal fade" id="modalProduto" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:998px;width:calc(100% - 24px)">
    <div class="modal-content produto-modal">

      <div class="modal-header">
        <h5 class="modal-title" id="tituloModalProduto">Produto - detalhes</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">
        <ul class="nav produto-tabs" id="produtoTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="produtoTabDetalhes" data-bs-toggle="tab"
                    data-bs-target="#produtoDetalhes" type="button" role="tab">
              <i class="bi bi-grid"></i> Detalhes
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="produtoTabPreco" data-bs-toggle="tab"
                    data-bs-target="#produtoPrecoTab" type="button" role="tab">
              <i class="bi bi-tag"></i> Preço e variações
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="produtoTabDisponibilidade" data-bs-toggle="tab"
                    data-bs-target="#produtoDisponibilidade" type="button" role="tab">
              <i class="bi bi-calendar-check"></i> Disponibilidade
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="produtoTabPontos" data-bs-toggle="tab"
                    data-bs-target="#produtoPontos" type="button" role="tab">
              <i class="bi bi-star"></i> Pontos
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="produtoTabEstoque" data-bs-toggle="tab"
                    data-bs-target="#produtoEstoque" type="button" role="tab">
              <i class="bi bi-box-seam"></i> Estoque
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="produtoTabValidade" data-bs-toggle="tab"
                    data-bs-target="#produtoValidade" type="button" role="tab">
              <i class="bi bi-hourglass-split"></i> Prazo de validade
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="produtoTabOutros" data-bs-toggle="tab"
                    data-bs-target="#produtoOutros" type="button" role="tab">
              <i class="bi bi-info-circle"></i> Outros
            </button>
          </li>
        </ul>

        <form id="formProduto">
          <input type="hidden" id="produtoId" name="id">
          <input type="hidden" id="produtoImagemBase64" name="imagem_base64">
          <input type="hidden" id="produtoImagemRemover" name="imagem_remover" value="0">
          <input type="hidden" id="produtoDiasSemana" name="dias_semana" value="[]">
          <input type="hidden" id="produtoHorarioIni" name="horario_ini" value="">
          <input type="hidden" id="produtoHorarioFim" name="horario_fim" value="">

          <div class="tab-content">
            <div class="tab-pane fade show active" id="produtoDetalhes" role="tabpanel">
              <div class="row g-3">
                <div class="col-12 col-lg-4">
                  <div class="produto-image-card">
                    <div class="produto-image-placeholder" id="produtoImagemPlaceholder">
                      <i class="bi bi-image" id="produtoImagemIcon"></i>
                      <img src="" alt="" id="produtoImagemPreview" class="d-none">
                    </div>
                    <button class="produto-image-remove" type="button" title="Remover imagem" disabled>
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                  <input type="file" id="produtoImagemInput" class="d-none" accept="image/*">
                </div>
                <div class="col-12 col-lg-8">
                  <div class="produto-field">
                    <label class="form-label">Nome do produto <span class="text-danger">*</span></label>
                    <input class="form-control produto-input"
                           id="produtoNome" name="nome" required>
                  </div>
                  <div class="produto-field">
                    <label class="form-label">Codigo do produto (PDV)</label>
                    <input class="form-control produto-input"
                           id="produtoCodigo" name="codigo"
                           placeholder="Ex.: 123">
                  </div>
                  <div class="produto-field">
                    <label class="form-label">Descricao do produto</label>
                    <textarea class="form-control produto-textarea"
                              id="produtoDescricao" name="descricao"
                              rows="3" placeholder="Descreva o produto"></textarea>
                  </div>
                  <input type="hidden" id="produtoCategoria" name="categoria_id">

                  <!-- Produto apenas por agendamento -->
                  <div class="produto-section mt-3">
                    <div class="produto-toggle-row">
                      <div>
                        <div class="produto-section-title">Produto apenas por agendamento</div>
                        <div class="produto-section-desc">Ao marcar essa opção o produto só poderá ser vendido por agendamento.</div>
                      </div>
                      <div class="form-check form-switch m-0">
                        <input class="form-check-input" type="checkbox" id="produtoApenasAgendamento" name="apenas_agendamento" value="1">
                      </div>
                    </div>
                  </div>

                  <!-- Quantidade mínima para pedido -->
                  <div class="produto-section">
                    <div class="produto-toggle-row">
                      <div>
                        <div class="produto-section-title">Quantidade mínima para pedido</div>
                        <div class="produto-section-desc">Ao habilitar seus clientes terão que pedir uma quantidade mínima desse produto.</div>
                      </div>
                      <div class="form-check form-switch m-0">
                        <input class="form-check-input" type="checkbox" id="produtoQtdMinimaAtivo">
                      </div>
                    </div>
                    <div id="produtoQtdMinimaField" class="mt-2 d-none">
                      <label class="form-label" style="font-size:12px;color:#6b7280">Quantidade mínima</label>
                      <input type="number" class="form-control produto-input" id="produtoQtdMinima" name="quantidade_minima" min="1" value="1" style="max-width:140px">
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div class="tab-pane fade" id="produtoPrecoTab" role="tabpanel">
              <div class="produto-field">
                <label class="form-label">Preço</label>
                <input type="text" inputmode="decimal" placeholder="0,00"
                       class="form-control produto-input"
                       id="produtoPreco" name="preco" required>
              </div>

              <div class="produto-section">
                  <div class="produto-toggle-row">
                    <div>
                      <div class="produto-section-title">Habilitar preço promocional</div>
                    </div>
                    <div class="form-check form-switch m-0">
                      <input class="form-check-input" type="checkbox"
                             id="produtoPromoDesativado">
                    </div>
                  </div>
                <div class="produto-field mt-3" id="promoField">
                  <label class="form-label">Preço promocional</label>
                  <input type="text" inputmode="decimal" placeholder="0,00"
                         class="form-control produto-input"
                         id="produtoPrecoPromo" name="preco_promocional" disabled>
                </div>
              </div>

              <div class="produto-section">
                <div class="produto-toggle-row">
                  <div>
                    <div class="produto-section-title">Seu produto possui diferentes preços, tamanhos ou cores?</div>
                    <div class="produto-section-desc">
                      Habilite essa opção caso seu produto tenha diferentes preços, tamanhos, cores
                    </div>
                  </div>
                  <div class="form-check form-switch m-0">
                    <input class="form-check-input" type="checkbox"
                           id="produtoVariacoes" name="tem_variacoes">
                  </div>
                </div>
              </div>
              <div class="produto-variacoes-panel d-none" id="produtoVariacoesPanel">
                <div class="produto-variacoes-head">
                  <div>
                    <h6>Precos e variações</h6>
                    <p>Adicione tamanhos, cores ou precos diferentes para este produto.</p>
                    <div class="produto-variacoes-resumo" id="variacoesResumo">Nenhuma variacao cadastrada.</div>
                  </div>
                  <button type="button" class="btn btn-diggy-primary btn-sm" id="btnGerenciarVariacoes">
                    <i class="bi bi-plus-circle"></i> Gerenciar variações
                  </button>
                </div>
              </div>
              <div class="produto-variacoes-panel" id="produtoExtrasPanel">
                <div class="produto-variacoes-head">
                  <div>
                    <h6>Escolha seu extra</h6>
                    <p>Cadastre extras opcionais ou obrigatorios para este produto.</p>
                    <div class="produto-variacoes-resumo" id="extrasResumo">Nenhum extra cadastrado.</div>
                  </div>
                  <button type="button" class="btn btn-diggy-primary btn-sm" id="btnGerenciarExtras">
                    <i class="bi bi-plus-circle"></i> Gerenciar extras
                  </button>
                </div>
              </div>
              <div class="produto-variacoes-panel" id="produtoComplementoPrecoPanel">
                <div class="produto-variacoes-head">
                  <div>
                    <h6>Escolha o tipo</h6>
                    <p>Cadastre os tipos disponíveis para este produto (ex.: massa amanteigada, massa chocolate).</p>
                    <div class="produto-variacoes-resumo" id="complementoPrecoResumo">Nenhum tipo cadastrado.</div>
                  </div>
                  <button type="button" class="btn btn-diggy-primary btn-sm" id="btnGerenciarComplementoPreco">
                    <i class="bi bi-plus-circle"></i> Gerenciar tipo
                  </button>
                </div>
              </div>
            </div>
            <div class="tab-pane fade" id="produtoDisponibilidade" role="tabpanel">
              <div class="produto-section">
                <div class="produto-section-title">Produto para dias especificos</div>
                <div class="produto-section-desc">
                  Configure esse produto para que ele apareca apenas em dias especificos da semana.
                </div>
                <a class="produto-link" href="javascript:void(0)" onclick="abrirCronograma()">Configurar dias</a>
                <div class="cronograma-resumo" id="cronogramaResumo" style="display:none;margin-top:6px;font-size:.78rem;color:#555">
                  <span id="cronogramaResumoTxt"></span>
                  <button type="button" onclick="limparCronograma()" title="Remover configuração" style="background:none;border:none;padding:0 0 0 6px;cursor:pointer;color:#e11d48;vertical-align:middle;line-height:1">
                    <i class="bi bi-trash3" style="font-size:.85rem"></i>
                  </button>
                </div>
              </div>

              <div class="produto-section">
                <div class="produto-toggle-row">
                  <div>
                    <div class="produto-section-title">Produto disponivel</div>
                    <div class="produto-section-desc">
                      Ao pausar o produto o mesmo nao estara disponivel para venda.
                    </div>
                  </div>
                  <div class="form-check form-switch m-0">
                    <input class="form-check-input" type="checkbox"
                           id="produtoAtivo"
                           name="ativo" checked>
                  </div>
                </div>
              </div>

              <div class="produto-section">
                <div class="produto-toggle-row">
                  <div>
                    <div class="produto-section-title">Disponivel para compra no seu catalogo digital (menu)</div>
                    <div class="produto-section-desc">
                      Produto disponivel no link para compra no seu menu digital.
                    </div>
                  </div>
                  <div class="form-check form-switch m-0">
                    <input class="form-check-input" type="checkbox"
                           id="produtoCatalogo" name="disponivel_catalogo" checked>
                  </div>
                </div>
              </div>

              <div class="produto-section">
                <div class="produto-toggle-row">
                  <div>
                    <div class="produto-section-title">Disponivel para pedidos na mesa (qrcode mesa)</div>
                    <div class="produto-section-desc">
                      Produto disponivel para pedidos na mesa atraves do qrcode.
                    </div>
                  </div>
                  <div class="form-check form-switch m-0">
                    <input class="form-check-input" type="checkbox"
                           id="produtoMesa" name="disponivel_mesa" checked>
                  </div>
                </div>
              </div>
            </div>
            <div class="tab-pane fade" id="produtoPontos" role="tabpanel">
              <div class="produto-pontos-intro">
                No Lilly, o cliente ganha pontos em compras e usa o saldo para resgatar produtos.
                Abaixo voce configura quanto este produto gera de pontos ao ser comprado e quanto
                custa em pontos para ser resgatado. Os valores sao sempre por unidade e nao mudam
                com complementos ou variacoes.
              </div>
              <?php if ($clube_pontos_ativo !== '1'): ?>
                <div class="produto-section">
                  <div class="produto-section-title">Clube de pontos desativado</div>
                  <div class="produto-section-desc">
                    Ative o Clube de pontos em Configuracoes &gt; Fidelidade para configurar ganho e custo de pontos.
                  </div>
                </div>
              <?php endif; ?>
              <div class="produto-pontos-card">
                <div class="produto-pontos-head">
                  <div>
                    <div class="produto-pontos-title">Ativar ganho de pontos</div>
                    <div class="produto-pontos-desc">
                      O cliente acumula pontos no saldo dele a cada compra. Aqui voce define quantos
                      pontos ele ganha por cada unidade deste produto no pedido — independente de
                      complementos ou variacoes escolhidas.
                    </div>
                  </div>
                  <div class="form-check form-switch m-0">
                    <input class="form-check-input" type="checkbox" id="pontosGanhoAtivo"
                           <?= $clube_pontos_ativo !== '1' ? 'disabled' : '' ?>>
                  </div>
                </div>
                <div class="produto-field mt-2">
                  <label class="form-label">Pontos que o cliente ganha ao comprar <span class="text-danger">*</span></label>
                  <input type="number" min="0" step="1"
                         class="form-control produto-input"
                         id="produtoPontosGanho" name="pontos_ganho"
                         <?= $clube_pontos_ativo !== '1' ? 'disabled' : '' ?>>
                </div>
              </div>
              <div class="produto-pontos-card">
                <div class="produto-pontos-head">
                  <div>
                    <div class="produto-pontos-title">Ativar troca por pontos</div>
                    <div class="produto-pontos-desc">
                      O cliente pode usar o saldo de pontos para resgatar este produto. O valor definido
                      sera descontado do saldo dele por cada unidade — complementos e variacoes nao
                      alteram o custo em pontos.
                    </div>
                  </div>
                  <div class="form-check form-switch m-0">
                    <input class="form-check-input" type="checkbox" id="pontosCustoAtivo"
                           <?= $clube_pontos_ativo !== '1' ? 'disabled' : '' ?>>
                  </div>
                </div>
                <div class="produto-field mt-2">
                  <label class="form-label">Pontos que o cliente precisa para trocar <span class="text-danger">*</span></label>
                  <input type="number" min="0" step="1"
                         class="form-control produto-input"
                         id="produtoPontosCusto" name="pontos_custo"
                         <?= $clube_pontos_ativo !== '1' ? 'disabled' : '' ?>>
                </div>
              </div>
            </div>
            <div class="tab-pane fade" id="produtoEstoque" role="tabpanel">
              <div class="produto-field">
                <label class="form-label">Estoque</label>
              </div>
              <div class="produto-stock-card">
                <div>
                  <div class="produto-stock-title" id="estoqueProdutoNome">Produto</div>
                  <div class="produto-stock-meta">
                    <i class="bi bi-x-circle"></i>
                    <span id="estoqueProdutoQtd">0 em estoque</span>
                  </div>
                </div>
                <div class="produto-stock-actions">
                  <button class="produto-menu-dot" type="button">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                  <button class="btn-estoque" type="button" onclick="abrirModalEstoque()">Editar estoque</button>
                </div>
              </div>
            </div>
            <div class="tab-pane fade" id="produtoValidade" role="tabpanel">
              <div class="produto-section">
                <div class="produto-section-title">Prazo de validade</div>
                <div class="produto-section-desc">
                  Informe a data de fabricação e até quando o produto pode ser vendido. Quando a validade estiver próxima do vencimento, você recebe um aviso no painel administrativo — essa informação não aparece para o cliente no cardápio.
                </div>
              </div>
              <div class="row g-3">
                <div class="col-12 col-md-6">
                  <div class="produto-field">
                    <label class="form-label">Data de fabricação</label>
                    <input class="form-control produto-input" type="date"
                           id="produtoDataFabricacao" name="data_fabricacao">
                  </div>
                </div>
                <div class="col-12 col-md-6">
                  <div class="produto-field">
                    <label class="form-label">Data de validade</label>
                    <input class="form-control produto-input" type="date"
                           id="produtoDataValidade" name="data_validade">
                  </div>
                </div>
              </div>
            </div>
            <div class="tab-pane fade" id="produtoOutros" role="tabpanel">
              <div class="outros-action-list">
                <div class="outros-action-row" onclick="abrirTransferirProduto()">
                  <div class="outros-action-body">
                    <div class="outros-action-title">Transferir produto</div>
                    <div class="outros-action-desc">Criou o produto na categoria errada ou deseja movê-lo?</div>
                  </div>
                  <i class="bi bi-chevron-right outros-action-chevron"></i>
                </div>
                <div class="outros-action-row" onclick="duplicarProduto()">
                  <div class="outros-action-body">
                    <div class="outros-action-title">Duplicar produto</div>
                    <div class="outros-action-desc">Tem outro parecido e deseja duplicá-lo?</div>
                  </div>
                  <i class="bi bi-chevron-right outros-action-chevron"></i>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button class="btn btn-diggy-danger d-none" type="button" id="btnExcluirProduto"
                onclick="excluirProduto()">Deletar produto</button>
        <button class="btn btn-diggy-primary" type="button" onclick="salvarProduto()">Salvar</button>
      </div>

    </div>
  </div>
</div>

<!-- MODAL CRONOGRAMA DE DISPONIBILIDADE -->
<div class="modal fade" id="modalCronograma" tabindex="-1" data-bs-backdrop="false">
  <div class="modal-dialog modal-dialog-centered" style="max-width:500px;width:calc(100% - 32px)">
    <div class="modal-content cronograma-modal">
      <div class="cronograma-modal-header">
        <p class="cronograma-desc">
          Crie um cronograma para que esse produto apareça para seus clientes em
          apenas dias e horários específicos da semana
        </p>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body cronograma-body">
        <div class="cronograma-section-label">Dias da semana</div>
        <div class="cronograma-days" id="cronogramaDays">
          <button type="button" class="cronograma-day-btn" data-dia="dom">Domingo</button>
          <button type="button" class="cronograma-day-btn" data-dia="seg">Segunda</button>
          <button type="button" class="cronograma-day-btn" data-dia="ter">Terça</button>
          <button type="button" class="cronograma-day-btn" data-dia="qua">Quarta</button>
          <button type="button" class="cronograma-day-btn" data-dia="qui">Quinta</button>
          <button type="button" class="cronograma-day-btn" data-dia="sex">Sexta</button>
          <button type="button" class="cronograma-day-btn" data-dia="sab">Sábado</button>
        </div>

        <div class="cronograma-section-label mt-3">Horário</div>
        <div class="cronograma-time-label">Produto disponível a partir das:</div>
        <input type="time" class="cronograma-time-input" id="cronogramaHorarioIni" placeholder="Horário inicial">
        <div class="cronograma-time-label mt-2">Produto disponível até ou produto ficará indisponível a partir das:</div>
        <input type="time" class="cronograma-time-input" id="cronogramaHorarioFim" placeholder="Horário final">
      </div>
      <div class="modal-footer border-0 pt-0">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Fechar</button>
        <button type="button" class="btn btn-diggy-primary" onclick="salvarCronograma()">Salvar</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL VARIACOES PRODUTO -->
<div class="modal fade produto-variacao-modal" id="modalVariacoesProduto" tabindex="-1" style="z-index:1065">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header border-0">
        <div>
          <div class="produto-section-title">Variacoes do produto</div>
          <div class="produto-section-desc">Cadastre tamanhos, cores e precos para usar no pedido.</div>
        </div>
        <div class="produto-variacao-tools">
          <button type="button" class="produto-variacao-tool-btn" id="btnAddVariacaoModal" aria-label="Adicionar variacao">
            <i class="bi bi-plus"></i>
          </button>
          <button class="btn-close" data-bs-dismiss="modal"></button>
        </div>
      </div>
      <div class="modal-body">
        <div class="produto-variacao-list" id="variacoesModalLista"></div>
      </div>
      <div class="modal-footer border-0">
        <button type="button" class="btn btn-diggy-primary" id="btnSalvarVariacoes">Salvar variacoes</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL EXTRAS PRODUTO -->
<div class="modal fade produto-variacao-modal" id="modalExtrasProduto" tabindex="-1" style="z-index:1065">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header border-0">
        <div>
          <div class="produto-section-title">Extras do produto</div>
          <div class="produto-section-desc">Cadastre extras e marque quando forem obrigatorios.</div>
        </div>
        <div class="produto-variacao-tools">
          <button type="button" class="produto-variacao-tool-btn" id="btnAddExtraModal" aria-label="Adicionar extra">
            <i class="bi bi-plus"></i>
          </button>
          <button class="btn-close" data-bs-dismiss="modal"></button>
        </div>
      </div>
      <div class="modal-body">
        <div class="produto-variacao-list" id="extrasModalLista"></div>
      </div>
      <div class="modal-footer border-0">
        <button type="button" class="btn btn-diggy-primary" id="btnSalvarExtras">Salvar extras</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL COMPLEMENTOS (a partir da aba Preco e variacoes) -->
<div class="modal fade produto-variacao-modal" id="modalComplementosPreco" tabindex="-1" style="z-index:1065">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header border-0">
        <div>
          <div class="produto-section-title">Tipos do produto</div>
          <div class="produto-section-desc">Cadastre os tipos e marque quando forem obrigatorios.</div>
        </div>
        <div class="produto-variacao-tools">
          <button type="button" class="produto-variacao-tool-btn" id="btnAddComplementoPrecoModal" aria-label="Adicionar tipo">
            <i class="bi bi-plus"></i>
          </button>
          <button class="btn-close" data-bs-dismiss="modal"></button>
        </div>
      </div>
      <div class="modal-body">
        <div class="produto-variacao-list" id="complementoPrecoModalLista"></div>
      </div>
      <div class="modal-footer border-0">
        <button type="button" class="btn btn-diggy-primary" id="btnSalvarComplementoPreco">Salvar tipos</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL ESTOQUE -->
<div class="modal fade" id="modalEstoque" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content estoque-modal">
      <div class="modal-header">
        <h5 class="modal-title">Editar item de estoque</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <form id="formEstoque">
          <input type="hidden" id="estoqueProdutoId">

          <div class="estoque-field">
            <label class="form-label">Quantidade em estoque</label>
            <input type="number" min="0" class="form-control estoque-input" id="estoqueQuantidade">
          </div>
          <div class="estoque-field">
            <label class="form-label">Quantidade minima para alerta</label>
            <input type="number" min="0" class="form-control estoque-input" id="estoqueMinimo">
          </div>
          <div class="estoque-note">
            Caso voce venda o mesmo item como produto ou item de complemento, voce podera vincular esse aqui e o mesmo tera um unico estoque.
          </div>
          <div class="text-center mt-2">
            <a href="javascript:void(0)" class="estoque-link" id="btnVincularEstoque">vincular outros itens</a>
          </div>

          <div class="estoque-vinculados">
            <h6>Produtos vinculados</h6>
            <div class="estoque-vinculado-list" id="estoqueVinculadosLista">
              <div class="estoque-vinculado-row estoque-vinculado-empty">Nenhum item vinculado.</div>
            </div>
          </div>

          <div class="estoque-historico">
            <h6>Historico de movimentacoes</h6>
            <div class="estoque-historico-list" id="estoqueHistoricoLista"></div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn-outline-diggy" type="button" onclick="deletarEstoque()">Deletar estoque</button>
        <button class="btn btn-diggy-primary" type="button" onclick="salvarEstoque()">Salvar estoque</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL VINCULAR ESTOQUE -->
<div class="modal fade" id="modalVincularEstoque" tabindex="-1" style="z-index:1085">
  <div class="modal-dialog modal-dialog-centered modal-xl">
    <div class="modal-content combo-modal">
      <div class="modal-header">
        <div>
          <h5 class="modal-title fw-bold mb-1">Vincular outros itens ao estoque</h5>
          <div class="produto-section-desc">Nessa tela voce podera vincular mais de um produto ao mesmo item de estoque. Selecione abaixo os itens que voce quer vincular.</div>
        </div>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body" style="padding-bottom:8px">
        <div class="opcoes-picker-search">
          <input type="text" id="estVinculoSearch" placeholder="Pesquisar produto" autocomplete="off">
        </div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">
          <button class="opcoes-picker-selall" style="margin-bottom:0" onclick="_estVinculoSelecionarTodos()">
            <i class="bi bi-check2-all me-1"></i>Selecionar todos
          </button>
          <button class="opcoes-picker-selall" style="margin-bottom:0;color:#6b7280" onclick="_estVinculoDesmarcarTodos()">
            <i class="bi bi-x-circle me-1"></i>Desmarcar todos
          </button>
        </div>
        <div class="opcoes-grid" id="estVinculoGrid">
          <div class="text-center py-4" style="grid-column:1/-1;color:#9ca3af;font-size:13px">Carregando produtos...</div>
        </div>
      </div>
      <div class="modal-footer justify-content-between">
        <span id="estVinculoContador" style="font-size:12px;color:#6b7280"></span>
        <button class="btn btn-diggy-primary" onclick="_estVinculoSalvar()">Salvar</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL TRANSFERIR PRODUTO -->
<div class="modal fade" id="modalTransferirProduto" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content transferir-modal-content">
      <div class="modal-header border-0 pb-1">
        <div>
          <div class="produto-section-title">Transferir produto</div>
          <div class="produto-section-desc">Escolha para qual categoria deseja transferir seu produto</div>
        </div>
        <button class="btn-close" type="button" onclick="fecharTransferirProduto()"></button>
      </div>
      <div class="modal-body pt-2">
        <div class="transferir-aviso">
          <strong>Atenção!</strong> Só é possível transferir itens para o mesmo tipo de categoria. Você não poderá transferir um item que a categoria seja itens gerais para a categoria do tipo pizza.
        </div>
        <div class="transferir-lista">
          <?php foreach ($categorias as $cat): ?>
          <label class="transferir-item" data-cat-id="<?= (int)$cat['id'] ?>">
            <span class="transferir-nome"><?= htmlspecialchars($cat['nome']) ?></span>
            <input type="radio" class="form-check-input transferir-radio" name="transferir_cat" value="<?= (int)$cat['id'] ?>">
          </label>
          <?php endforeach; ?>
        </div>
      </div>
      <div class="modal-footer border-0 pt-1">
        <button type="button" class="btn btn-outline-diggy" onclick="fecharTransferirProduto()">Voltar</button>
        <button type="button" class="btn btn-diggy-primary" onclick="confirmarTransferencia()">Transferir</button>
      </div>
    </div>
  </div>
</div>

</main>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<script>
/* ===== VARIAVEIS (UMA UNICA VEZ) ===== */
let modalProduto;
let modalProdutoImagem;
let modalCategoria;
let modalReordenar;
let modalReordenarItens;
let modalEstoque;
let modalVincularEstoque;
const formProduto = document.getElementById('formProduto');
const produtoId = document.getElementById('produtoId');
const produtoNome = document.getElementById('produtoNome');
const produtoCodigo = document.getElementById('produtoCodigo');
const produtoDescricao = document.getElementById('produtoDescricao');
const produtoPreco = document.getElementById('produtoPreco');
const produtoPrecoPromo = document.getElementById('produtoPrecoPromo');
const produtoPromoDesativado = document.getElementById('produtoPromoDesativado');
const produtoPontosGanho = document.getElementById('produtoPontosGanho');
const produtoPontosCusto = document.getElementById('produtoPontosCusto');
const pontosGanhoAtivo = document.getElementById('pontosGanhoAtivo');
const pontosCustoAtivo = document.getElementById('pontosCustoAtivo');
const produtoVariacoes = document.getElementById('produtoVariacoes');
const produtoVariacoesPanel = document.getElementById('produtoVariacoesPanel');
const btnGerenciarVariacoes = document.getElementById('btnGerenciarVariacoes');
const variacoesResumo = document.getElementById('variacoesResumo');
const modalVariacoesProdutoEl = document.getElementById('modalVariacoesProduto');
const btnAddVariacaoModal = document.getElementById('btnAddVariacaoModal');
const variacoesModalLista = document.getElementById('variacoesModalLista');
const btnSalvarVariacoes = document.getElementById('btnSalvarVariacoes');
const produtoExtrasPanel = document.getElementById('produtoExtrasPanel');
const btnGerenciarExtras = document.getElementById('btnGerenciarExtras');
const extrasResumo = document.getElementById('extrasResumo');
const modalExtrasProdutoEl = document.getElementById('modalExtrasProduto');
const btnAddExtraModal = document.getElementById('btnAddExtraModal');
const extrasModalLista = document.getElementById('extrasModalLista');
const btnSalvarExtras = document.getElementById('btnSalvarExtras');
const btnGerenciarComplementoPreco = document.getElementById('btnGerenciarComplementoPreco');
const complementoPrecoResumo = document.getElementById('complementoPrecoResumo');
const modalComplementosPrecoEl = document.getElementById('modalComplementosPreco');
const btnSalvarComplementoPreco = document.getElementById('btnSalvarComplementoPreco');
const btnAddComplementoPrecoModal = document.getElementById('btnAddComplementoPrecoModal');
const complementoPrecoModalLista = document.getElementById('complementoPrecoModalLista');
const promoField = document.getElementById('promoField');
const produtoCategoria = document.getElementById('produtoCategoria');
let _categoriaSelecionada = '';
const produtoAtivo = document.getElementById('produtoAtivo');
const produtoApenasAgendamento = document.getElementById('produtoApenasAgendamento');
const produtoQtdMinimaAtivo = document.getElementById('produtoQtdMinimaAtivo');
const produtoQtdMinima = document.getElementById('produtoQtdMinima');
const produtoQtdMinimaField = document.getElementById('produtoQtdMinimaField');
const produtoCatalogo = document.getElementById('produtoCatalogo');
const produtoMesa = document.getElementById('produtoMesa');
const produtoImagemBase64 = document.getElementById('produtoImagemBase64');
const produtoImagemRemover = document.getElementById('produtoImagemRemover');
const produtoImagemInput = document.getElementById('produtoImagemInput');
const produtoImagemPreview = document.getElementById('produtoImagemPreview');
const produtoImagemIcon = document.getElementById('produtoImagemIcon');
const produtoImagemPlaceholder = document.getElementById('produtoImagemPlaceholder');
const produtoImagemCard = document.querySelector('.produto-image-card');
const produtoImagemRemoveBtn = document.querySelector('.produto-image-remove');
const modalProdutoImagemEl = document.getElementById('modalProdutoImagem');
const modalProdutoEl = document.getElementById('modalProduto');
const produtoCropFrame = document.getElementById('produtoCropFrame');
const produtoCropImg = document.getElementById('produtoCropImg');
const produtoCropZoom = document.getElementById('produtoCropZoom');
const produtoCropSalvar = document.getElementById('produtoCropSalvar');
const buscaProduto = document.getElementById('buscaProduto');
const filtroPromo = document.getElementById('filtroPromo');
const tituloModalProduto = document.getElementById('tituloModalProduto');
const btnExcluirProduto = document.getElementById('btnExcluirProduto');
const produtoTabDetalhes = document.getElementById('produtoTabDetalhes');
const estoqueProdutoNome = document.getElementById('estoqueProdutoNome');
const estoqueProdutoQtd = document.getElementById('estoqueProdutoQtd');
const estoqueProdutoId = document.getElementById('estoqueProdutoId');
const estoqueQuantidade = document.getElementById('estoqueQuantidade');
const estoqueMinimo = document.getElementById('estoqueMinimo');
const estoqueVinculadosLista = document.getElementById('estoqueVinculadosLista');
const estoqueHistoricoLista = document.getElementById('estoqueHistoricoLista');
const formCategoria = document.getElementById('formCategoria');
const categoriaId = document.getElementById('categoriaId');
const categoriaNome = document.getElementById('categoriaNome');
const categoriaModo = document.getElementById('categoriaModo');
const categoriaAtivo = document.getElementById('categoriaAtivo');
const modoCards = document.querySelectorAll('.modo-card');
const categoriaModalTitle = document.getElementById('categoriaModalTitle');
const categoriaSalvarBtn = document.getElementById('categoriaSalvarBtn');
const ordenarLista = document.getElementById('ordenarLista');
const ordenarItensLista = document.getElementById('ordenarItensLista');
const ordenarItensCategoria = document.getElementById('ordenarItensCategoria');
const produtoToggles = document.querySelectorAll('.produto-toggle');
const comboToggles = document.querySelectorAll('.combo-toggle');
const categoriaToggles = document.querySelectorAll('.categoria-toggle-input');
let categoriaAtualReordenar = null;
let retomarModalProduto = false;
let variacoesAtual = [];
let modalVariacoesProduto = null;
let extrasAtual = [];
let modalExtrasProduto = null;
let complementosPrecoAtual = [];
let modalComplementosPreco = null;
let variacoesModalAberto = false;
let extrasModalAberto = false;
const clubePontosAtivo = <?= $clube_pontos_ativo === '1' ? 'true' : 'false' ?>;
</script>
<script src="./assets/js/produtos.js?v=<?= $produtosJsVer ?>"></script>

<!-- ===== MODAL EDITAR COMBO ===== -->
<div class="modal fade" id="modalEditarCombo" tabindex="-1" data-bs-backdrop="static">
  <div class="modal-dialog modal-dialog-centered" style="max-width:min(1308px,calc(100vw - 24px));width:calc(100% - 24px)">
    <div class="modal-content" style="border-radius:16px;border:none;box-shadow:0 20px 60px rgba(0,0,0,.16);height:min(569px,calc(100dvh - 48px));display:flex;flex-direction:column">

      <!-- Header -->
      <div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid #f0f0f0">
        <span style="font-size:15px;font-weight:700;color:#111827" id="ecTitulo">Combo</span>
        <button data-bs-dismiss="modal" style="background:none;border:none;color:#9ca3af;cursor:pointer;padding:0;line-height:1;font-size:15px;display:flex;align-items:center">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- Body -->
      <div style="flex:1;overflow-y:auto;padding:16px 28px 20px;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.1) transparent">

        <!-- Tabs -->
        <div style="display:flex;gap:8px;margin-bottom:20px">
          <button class="ec-tab active" id="ecTabBtnInfo"   onclick="ecSwitchTab('info')"><i class="bi bi-info-circle"></i>Informações</button>
          <button class="ec-tab"        id="ecTabBtnPreco"  onclick="ecSwitchTab('preco')"><i class="bi bi-tag"></i>Preço</button>
          <button class="ec-tab"        id="ecTabBtnPassos" onclick="ecSwitchTab('passos')"><i class="bi bi-layers"></i>Passos</button>
        </div>

        <!-- Tab Informações: layout 2 colunas (imagem | campos) -->
        <div id="ecTabInfo">
          <div style="display:flex;gap:28px;align-items:flex-start">

            <!-- Coluna imagem -->
            <div style="position:relative;flex-shrink:0;width:240px">
              <div class="combo-img-area" id="ecImagemArea" style="width:240px;height:240px;cursor:pointer;border-radius:14px;overflow:hidden" onclick="document.getElementById('ecImagemInput').click()">
                <img src="" id="ecImagemPreview" style="display:none;width:100%;height:100%;object-fit:cover" alt="">
                <i class="bi bi-camera" id="ecImagemIcon" style="font-size:32px;color:#9ca3af"></i>
              </div>
              <button class="combo-img-btn" id="ecImagemDelBtn" type="button"
                      style="background:#fff;border:1px solid #e5e7eb;color:#374151;box-shadow:0 2px 6px rgba(0,0,0,.08)"
                      onclick="ecRemoverImagem(event)">
                <i class="bi bi-trash"></i>
              </button>
              <input type="file" id="ecImagemInput" accept="image/*" style="display:none">
            </div>

            <!-- Coluna campos -->
            <div style="flex:1;min-width:0">
              <div style="margin-bottom:12px">
                <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px">Nome do combo <span style="color:#ef4444">*</span></label>
                <input class="form-control" id="ecNome" style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;height:40px">
              </div>
              <div style="margin-bottom:12px">
                <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px">Descrição</label>
                <textarea class="form-control" id="ecDescricao" rows="3" style="resize:none;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;font-size:14px"></textarea>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px">
                <span style="font-size:13px;font-weight:500;color:#111827">Combo visível no cardápio</span>
                <label class="switch" style="flex-shrink:0;margin:0"><input type="checkbox" id="ecAtivo" checked><span class="slider"></span></label>
              </div>
            </div>

          </div>
        </div>

        <!-- Tab Preço -->
        <div id="ecTabPreco" class="d-none">
          <div class="combo-preco-cards" style="margin-bottom:12px">
            <div class="combo-preco-card active" id="ecPorComboCard" onclick="ecSetTipoPreco('por_combo')">
              <div class="combo-preco-card-radio" style="flex-shrink:0;margin-top:2px"><i class="bi bi-check-circle-fill" id="ecPorComboCheck"></i></div>
              <div>
                <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:4px">Preço por combo</div>
                <div style="font-size:12px;color:#6b7280;line-height:1.4">Os itens dos passos não têm preço próprio: o cliente paga apenas o valor definido aqui para o combo.</div>
              </div>
            </div>
            <div class="combo-preco-card" id="ecPorItemCard" onclick="ecSetTipoPreco('por_item')">
              <div class="combo-preco-card-radio" style="flex-shrink:0;margin-top:2px"><i class="bi bi-circle" id="ecPorItemCheck"></i></div>
              <div>
                <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:4px">Preço por item</div>
                <div style="font-size:12px;color:#6b7280;line-height:1.4">Cada opção pode ter preço nos passos; o valor do combo é calculado a partir dos preços dos itens que o cliente escolher.</div>
              </div>
            </div>
          </div>

          <div id="ecPrecoCampo" style="margin-bottom:12px">
            <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px">
              <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:3px">Preço</label>
              <input id="ecPreco" value="0,00" style="background:transparent;border:none;outline:none;font-size:14px;color:#111827;font-weight:500;width:100%;padding:0;font-family:inherit">
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;margin-bottom:10px">
            <span style="font-size:13px;font-weight:500;color:#111827">Habilitar preço promocional</span>
            <label class="switch" style="flex-shrink:0;margin:0"><input type="checkbox" id="ecPromoToggle"><span class="slider"></span></label>
          </div>

          <div id="ecPromoField" class="d-none">
            <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px">
              <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:3px">Preço promocional</label>
              <input id="ecPrecoPromo" value="0,00" style="background:transparent;border:none;outline:none;font-size:14px;color:#111827;font-weight:500;width:100%;padding:0;font-family:inherit">
            </div>
          </div>
        </div>

        <!-- Tab Passos -->
        <div id="ecTabPassos" class="d-none">
          <div class="combo-passos-info" style="margin-bottom:14px">
            <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="bi bi-layers"></i>O que são os passos?</div>
            <p style="font-size:12px;color:#6b7280;margin:0 0 6px">Os passos são as etapas de escolha do combo. Cada passo representa um momento em que o cliente escolhe itens — por exemplo: "Escolha sua pizza","Escolha sua bebida" ou "Escolha acompanhamento". Em cada passo você define quantos itens o cliente pode selecionar (mínimo e máximo) e quais produtos ou complementos estão disponíveis. Clique em um passo para editar suas opções.</p>
            <p style="font-size:12px;color:#6b7280;margin:0">Você também pode ordenar os passos para mudar a ordem em que serão exibidos para o cliente.</p>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
            <button class="btn btn-link p-0" style="font-size:12px;font-weight:500;text-decoration:none;color:#9C5523;display:inline-flex;align-items:center;gap:4px" onclick="abrirOrdenarPassos()"><i class="bi bi-arrow-down-up"></i>Ordenar passos</button>
          </div>
          <div id="ecPassosList"></div>
        </div>
      </div>

      <!-- Footer -->
      <div style="flex-shrink:0;display:flex;align-items:center;justify-content:flex-end;padding:12px 28px;border-top:1px solid #f0f0f0">
        <div style="display:flex;align-items:center;gap:8px">
          <button id="ecBtnExcluirCombo" onclick="ecExcluirCombo()" style="background:#fff;border:1.5px solid #e5e7eb;border-radius:999px;padding:7px 18px;font-size:13px;font-weight:500;color:#374151;cursor:pointer;line-height:1.4;font-family:inherit">Excluir combo</button>
          <button id="ecBtnCriarPasso" onclick="ecAbrirCriarPasso()" class="d-none" style="background:#9C5523;border:none;border-radius:999px;padding:7px 22px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;line-height:1.4;font-family:inherit">Criar passo</button>
          <button id="ecBtnSalvar" onclick="ecSalvarCombo()" style="background:#9C5523;border:none;border-radius:999px;padding:7px 22px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;line-height:1.4;font-family:inherit">Salvar</button>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- ===== MODAL EDITAR PASSO ===== -->
<div class="modal fade" id="modalEditarPasso" tabindex="-1" data-bs-backdrop="static" style="z-index:1070">
  <div class="modal-dialog modal-dialog-centered modal-lg">
    <div class="modal-content combo-modal">
      <div class="modal-header" style="padding:20px 24px 12px">
        <h5 class="modal-title fw-bold" id="epTitulo">Passo</h5>
        <button class="btn-close" id="epBtnFechar"></button>
      </div>
      <div class="modal-body" style="padding:4px 24px 20px;max-height:74vh;overflow-y:auto">
        <div class="d-flex gap-2 mb-4">
          <button class="ec-tab active" id="epTabBtnConfig" onclick="epSwitchTab('config')"><i class="bi bi-file-earmark-text"></i>Configurações gerais</button>
          <button class="ec-tab"        id="epTabBtnOpcoes" onclick="epSwitchTab('opcoes')"><i class="bi bi-bag"></i>Opções do passo</button>
        </div>

        <!-- Tab Configurações gerais -->
        <div id="epTabConfig">
          <div class="p-3 rounded mb-3" style="background:#f0f9ff;border:1px solid #bae6fd;font-size:12px;color:#0369a1">
            <strong>O que você está configurando aqui</strong><br>
            Este passo define as <strong>regras de seleção</strong> que o cliente vai seguir no combo (quantidade mínima e máxima), além do texto que será exibido para orientar a escolha.
            <ul class="mb-0 mt-2 ps-3">
              <li>Use o <strong>Nome</strong> como o título do passo (ex.: "Escolha o acompanhamento").</li>
              <li>Em <strong>Este passo é obrigatório?</strong>, defina se o cliente precisa escolher ao menos um item ou se o passo é opcional (mínimo zero).</li>
              <li>Quando o passo for obrigatório, ajuste a <strong>mínima</strong> e a <strong>máxima</strong> para limitar quantos itens podem ser selecionados.</li>
              <li>Ative <strong>O cliente pode repetir opções?</strong> se o cliente puder escolher o <strong>mesmo item</strong> mais de uma vez neste passo (ex.: 2x o mesmo lanche).</li>
              <li>Preencha a <strong>Descrição</strong> com instruções claras para o cliente (opcional, mas recomendado).</li>
            </ul>
          </div>
          <div class="mb-3">
            <label class="form-label" style="font-size:12px;color:#6b7280">Nome <span class="text-danger">*</span></label>
            <input class="form-control" id="epNome" placeholder="Ex: Escolha a bebida">
          </div>
          <div class="mb-3">
            <label class="form-label" style="font-size:12px;color:#6b7280">Descrição</label>
            <input class="form-control" id="epDescricao" placeholder="Explique para o cliente o que ele deve selecionar neste passo">
          </div>
          <div class="combo-promo-row mb-3">
            <div>
              <div style="font-size:13px;font-weight:600">Este passo é obrigatório?</div>
              <div id="epObrigatorioDesc" style="font-size:12px;color:#6b7280">Sim, o cliente deve selecionar pelo menos um item.</div>
            </div>
            <label class="switch"><input type="checkbox" id="epObrigatorio" checked><span class="slider"></span></label>
          </div>
          <div class="row g-3">
            <div class="col-6">
              <label class="form-label" style="font-size:12px;color:#6b7280">Quantidade mínima <span class="text-danger">*</span></label>
              <input class="form-control" type="number" id="epMin" value="1" min="0">
            </div>
            <div class="col-6">
              <label class="form-label" style="font-size:12px;color:#6b7280">Quantidade máxima <span class="text-danger">*</span></label>
              <input class="form-control" type="number" id="epMax" value="1" min="1">
            </div>
          </div>
        </div>

        <!-- Tab Opções do passo -->
        <div id="epTabOpcoes" class="d-none">
          <div id="epOpcoesList"></div>
        </div>
      </div>
      <div class="modal-footer justify-content-end gap-2">
        <button class="btn btn-outline-secondary" onclick="epExcluirPasso()" style="border-radius:999px;font-size:.85rem">Excluir passo</button>
        <button class="btn btn-outline-secondary d-none" id="epBtnAdcionar" onclick="epAbrirOpcoes()" style="border-radius:999px;font-size:.85rem">Adicionar opções</button>
        <button class="btn btn-diggy-primary" onclick="epSalvarPasso()">Salvar</button>
      </div>
    </div>
  </div>
</div>

<!-- ===== MODAL CRIANDO COMBO ===== -->
<div class="modal fade" id="modalCriandoCombo" tabindex="-1" data-bs-backdrop="static">
  <div class="modal-dialog modal-dialog-centered" style="max-width:min(1308px,calc(100vw - 24px));width:calc(100% - 24px)">
    <div class="modal-content" style="border-radius:16px;border:none;box-shadow:0 20px 60px rgba(0,0,0,.16);height:min(660px,calc(100dvh - 48px));display:flex;flex-direction:column">

      <!-- Header -->
      <div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid #f0f0f0">
        <span style="font-size:15px;font-weight:700;color:#111827">Criando combo</span>
        <button data-bs-dismiss="modal" style="background:none;border:none;color:#9ca3af;cursor:pointer;padding:0;line-height:1;font-size:15px;display:flex;align-items:center"><i class="bi bi-x-lg"></i></button>
      </div>

      <!-- Body -->
      <div style="flex:1;overflow-y:auto;padding:16px 28px 20px;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.1) transparent">

        <!-- Progress card -->
        <div class="cwp-card" style="margin-bottom:14px">
          <div class="d-flex justify-content-between align-items-center">
            <span style="font-size:13px;font-weight:600">Configuração do combo</span>
            <span id="cwComboCounter" style="font-size:12px;color:#9ca3af;font-weight:600">1/3</span>
          </div>
          <div class="cwp-bar" id="cwComboBar" style="background:#9C5523"></div>
          <div class="cwp-tabs">
            <div class="cwp-tab active" id="cwComboTab1">
              <div class="cwp-tab-icon"><i class="bi bi-file-earmark-text"></i></div>
              <div><div class="cwp-tab-label">ETAPA 01</div><div class="cwp-tab-name">Configurações gerais</div></div>
            </div>
            <div class="cwp-tab" id="cwComboTab2">
              <div class="cwp-tab-icon"><i class="bi bi-tag"></i></div>
              <div><div class="cwp-tab-label">ETAPA 02</div><div class="cwp-tab-name">Preço</div></div>
            </div>
            <div class="cwp-tab" id="cwComboTab3">
              <div class="cwp-tab-icon"><i class="bi bi-layers"></i></div>
              <div><div class="cwp-tab-label">ETAPA 03</div><div class="cwp-tab-name">Passos</div></div>
            </div>
          </div>
        </div>
        <p class="cwp-step-desc" id="cwComboDesc" style="margin-bottom:14px">Defina as informações principais do combo.</p>

        <!-- Step 1: layout 2 colunas igual ao modal de edição -->
        <div id="cwComboStep1">
          <div style="display:flex;gap:28px;align-items:flex-start">
            <div style="position:relative;flex-shrink:0;width:240px">
              <div class="combo-img-area" id="cwComboImagemArea" style="width:240px;height:240px;border-radius:14px;overflow:hidden;cursor:pointer">
                <img src="" alt="" id="cwComboImagemPreview" style="display:none;width:100%;height:100%;object-fit:cover">
                <i class="bi bi-camera" id="cwComboImagemIcon" style="font-size:32px;color:#9ca3af"></i>
              </div>
              <button class="combo-img-btn" id="cwComboImagemBtn" type="button" style="background:#fff;border:1px solid #e5e7eb;color:#374151;box-shadow:0 2px 6px rgba(0,0,0,.08)">
                <i class="bi bi-camera-fill"></i>
              </button>
              <input type="file" id="cwComboImagemInput" accept="image/*" style="display:none">
            </div>
            <div style="flex:1;min-width:0">
              <div style="margin-bottom:12px">
                <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px">Nome do combo <span style="color:#ef4444">*</span></label>
                <input class="form-control" id="cwComboNome" placeholder="Ex: Combo Família" style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;height:40px">
              </div>
              <div>
                <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px">Descrição</label>
                <textarea class="form-control" id="cwComboDescricao" rows="3" placeholder="Descreva o que inclui este combo..." style="resize:none;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;font-size:14px"></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2 -->
        <div id="cwComboStep2" class="d-none">
          <div class="combo-preco-cards" style="margin-bottom:12px">
            <div class="combo-preco-card active" data-tipo="por_combo" id="cwComboPorComboCard">
              <div class="combo-preco-card-radio" style="flex-shrink:0;margin-top:2px"><i class="bi bi-check-circle-fill" id="cwPorComboCheck"></i></div>
              <div>
                <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:4px">Preço por combo</div>
                <div style="font-size:12px;color:#6b7280;line-height:1.4">Os itens dos passos não têm preço próprio: o cliente paga apenas o valor definido aqui para o combo.</div>
              </div>
            </div>
            <div class="combo-preco-card" data-tipo="por_item" id="cwComboPorItemCard">
              <div class="combo-preco-card-radio" style="flex-shrink:0;margin-top:2px"><i class="bi bi-circle" id="cwPorItemCheck"></i></div>
              <div>
                <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:4px">Preço por item</div>
                <div style="font-size:12px;color:#6b7280;line-height:1.4">Cada opção pode ter preço nos passos; o valor do combo é calculado a partir dos preços dos itens que o cliente escolher.</div>
              </div>
            </div>
          </div>
          <div id="cwComboPrecoCampo" style="margin-bottom:12px">
            <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px">
              <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:3px">Preço</label>
              <input id="cwComboPreco" value="0,00" style="background:transparent;border:none;outline:none;font-size:14px;color:#111827;font-weight:500;width:100%;padding:0;font-family:inherit">
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;margin-bottom:10px">
            <span style="font-size:13px;font-weight:500;color:#111827">Habilitar preço promocional</span>
            <label class="switch" style="flex-shrink:0;margin:0"><input type="checkbox" id="cwComboPromoToggle"><span class="slider"></span></label>
          </div>
          <div id="cwComboPromoField" class="d-none">
            <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px">
              <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:3px">Preço promocional</label>
              <input id="cwComboPrecoPromo" value="0,00" style="background:transparent;border:none;outline:none;font-size:14px;color:#111827;font-weight:500;width:100%;padding:0;font-family:inherit">
            </div>
          </div>
        </div>

        <!-- Step 3 -->
        <div id="cwComboStep3" class="d-none">
          <div class="combo-passos-info" style="margin-bottom:14px">
            <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="bi bi-layers"></i>O que são os passos?</div>
            <p style="font-size:12px;color:#6b7280;margin:0">Os passos são as etapas de escolha do combo. Cada passo representa um momento em que o cliente escolhe itens — por exemplo: "Escolha sua pizza", "Escolha sua bebida" ou "Escolha acompanhamento". Em cada passo você define quantos itens o cliente pode selecionar (mínimo e máximo) e quais produtos estão disponíveis.</p>
          </div>
          <div id="cwComboPassosList"></div>
        </div>
      </div>

      <!-- Footer -->
      <div style="flex-shrink:0;display:flex;align-items:center;justify-content:flex-end;padding:12px 28px;border-top:1px solid #f0f0f0">
        <div style="display:flex;align-items:center;gap:8px">
          <button id="cwComboBtnSecundario" class="d-none" style="background:#fff;border:1.5px solid #e5e7eb;border-radius:999px;padding:7px 18px;font-size:13px;font-weight:500;color:#374151;cursor:pointer;line-height:1.4;font-family:inherit">Criar passo</button>
          <button id="cwComboBtnAvancar" style="background:#9C5523;border:none;border-radius:999px;padding:7px 22px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;line-height:1.4;font-family:inherit">Salvar e avançar</button>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- ===== MODAL CRIANDO PASSO ===== -->
<div class="modal fade" id="modalCriandoPasso" tabindex="-1" data-bs-backdrop="static" style="z-index:1070">
  <div class="modal-dialog modal-dialog-centered" style="max-width:min(1308px,calc(100vw - 24px));width:calc(100% - 24px)">
    <div class="modal-content" style="border-radius:16px;border:none;box-shadow:0 20px 60px rgba(0,0,0,.16);height:min(569px,calc(100dvh - 48px));display:flex;flex-direction:column">

      <!-- Header -->
      <div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid #f0f0f0">
        <span style="font-size:15px;font-weight:700;color:#111827">Criando novo passo do combo</span>
        <button id="cwPassoBtnFechar" style="background:none;border:none;color:#9ca3af;cursor:pointer;padding:0;line-height:1;font-size:15px;display:flex;align-items:center"><i class="bi bi-x-lg"></i></button>
      </div>

      <!-- Body -->
      <div style="flex:1;overflow-y:auto;padding:16px 28px 20px;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.1) transparent">

        <!-- Progress card -->
        <div class="cwp-card" style="margin-bottom:14px">
          <div class="d-flex justify-content-between align-items-center">
            <span style="font-size:13px;font-weight:600">Configuração do passo do combo</span>
            <span id="cwPassoCounter" style="font-size:12px;color:#9ca3af;font-weight:600">1/3</span>
          </div>
          <div class="cwp-bar" id="cwPassoBar" style="background:#9C5523"></div>
          <div class="cwp-tabs">
            <div class="cwp-tab active" id="cwPassoTab1">
              <div class="cwp-tab-icon"><i class="bi bi-file-earmark-text"></i></div>
              <div><div class="cwp-tab-label">ETAPA 01</div><div class="cwp-tab-name">Configurações gerais</div></div>
            </div>
            <div class="cwp-tab" id="cwPassoTab2">
              <div class="cwp-tab-icon"><i class="bi bi-arrow-down-up"></i></div>
              <div><div class="cwp-tab-label">ETAPA 02</div><div class="cwp-tab-name">Quantidades</div></div>
            </div>
            <div class="cwp-tab" id="cwPassoTab3">
              <div class="cwp-tab-icon"><i class="bi bi-bag"></i></div>
              <div><div class="cwp-tab-label">ETAPA 03</div><div class="cwp-tab-name">Produtos</div></div>
            </div>
          </div>
        </div>
        <p class="cwp-step-desc" id="cwPassoDesc" style="margin-bottom:14px">Este é o "texto" que o cliente verá nesta etapa do combo — o <strong>nome</strong> aparece como título e a <strong>descrição</strong> ajuda a explicar o que deve ser escolhido.</p>

        <!-- Passo Step 1 -->
        <div id="cwPassoStep1">
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px 14px;font-size:12px;color:#0369a1;margin-bottom:14px">
            <strong>O que você está configurando aqui</strong><br>
            Este é o "texto" que o cliente verá nesta etapa do combo — o <strong>nome</strong> aparece como título e a <strong>descrição</strong> ajuda a explicar o que deve ser escolhido.
            <ul class="mb-0 mt-2 ps-3">
              <li>Use um nome curto e claro (ex.: <strong>Escolha a bebida</strong>).</li>
              <li>Na descrição, você pode orientar o cliente (ex.: "Selecione 1 item").</li>
            </ul>
          </div>
          <div style="margin-bottom:12px">
            <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px">Qual será o nome desse passo? <span style="color:#ef4444">*</span></label>
            <input class="form-control" id="cwPassoNome" placeholder="Escolha um nome descritivo para este passo" style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;height:40px">
          </div>
          <div>
            <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px">Qual será a descrição desse passo? <span style="color:#9ca3af">(opcional)</span></label>
            <input class="form-control" id="cwPassoDescricao" placeholder="Descreva o que será incluído nesse passo" style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;height:40px">
          </div>
        </div>

        <!-- Passo Step 2 -->
        <div id="cwPassoStep2" class="d-none">
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px 14px;font-size:12px;color:#0369a1;margin-bottom:14px">
            <ul class="mb-0 ps-3">
              <li>Em <strong>Este passo é obrigatório?</strong>, defina se o cliente precisa escolher ao menos um item ou se o passo é opcional.</li>
              <li>Ajuste a <strong>mínima</strong> e a <strong>máxima</strong> para limitar quantos itens podem ser selecionados.</li>
              <li>Ative <strong>O cliente pode repetir opções?</strong> se o cliente puder escolher o mesmo item mais de uma vez.</li>
            </ul>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;margin-bottom:12px">
            <div>
              <div style="font-size:13px;font-weight:600;color:#111827">Este passo é obrigatório?</div>
              <div id="cwPassoObrigatorioDesc" style="font-size:12px;color:#6b7280">Sim, o cliente deve selecionar pelo menos um item.</div>
            </div>
            <label class="switch" style="flex-shrink:0;margin:0"><input type="checkbox" id="cwPassoObrigatorio" checked><span class="slider"></span></label>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px" id="cwPassoMinMaxWrap">
            <div>
              <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px">Quantidade mínima <span style="color:#ef4444">*</span></label>
              <input class="form-control" type="number" id="cwPassoMin" value="1" min="0" style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;height:40px">
            </div>
            <div>
              <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px">Quantidade máxima <span style="color:#ef4444">*</span></label>
              <input class="form-control" type="number" id="cwPassoMax" value="1" min="1" style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;height:40px">
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px">
            <div>
              <div style="font-size:13px;font-weight:600;color:#111827">O cliente pode repetir opções?</div>
              <div style="font-size:12px;color:#6b7280">Permite selecionar o mesmo item mais de uma vez.</div>
            </div>
            <label class="switch" style="flex-shrink:0;margin:0"><input type="checkbox" id="cwPassoRepetir"><span class="slider"></span></label>
          </div>
        </div>

        <!-- Passo Step 3 -->
        <div id="cwPassoStep3" class="d-none">
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px 14px;font-size:12px;color:#0369a1;margin-bottom:14px">
            Aqui você define quais itens (produtos) o cliente poderá <strong>escolher</strong> neste passo do combo.
            <ul class="mb-0 mt-1 ps-3">
              <li>Adicione pelo menos uma opção para este passo ficar disponível no combo.</li>
              <li>Você pode revisar as opções vinculadas abaixo e incluir novos itens quando necessário.</li>
            </ul>
          </div>
          <div id="cwPassoOpcoes"></div>
        </div>
      </div>

      <!-- Footer -->
      <div style="flex-shrink:0;display:flex;align-items:center;justify-content:flex-end;padding:12px 28px;border-top:1px solid #f0f0f0">
        <div style="display:flex;align-items:center;gap:8px">
          <button id="cwPassoBtnAdcionar" onclick="_cwAbrirOpcoes()" class="d-none" style="background:#fff;border:1.5px solid #e5e7eb;border-radius:999px;padding:7px 18px;font-size:13px;font-weight:500;color:#374151;cursor:pointer;line-height:1.4;font-family:inherit">Adicionar opções</button>
          <button id="cwPassoBtnAvancar" style="background:#9C5523;border:none;border-radius:999px;padding:7px 22px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;line-height:1.4;font-family:inherit">Avançar para o próximo passo</button>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- ===== MODAL CONFIRMAÇÃO ===== -->
<div class="modal fade" id="modalConfirm" tabindex="-1" style="z-index:1110">
  <div class="modal-dialog modal-dialog-centered" style="max-width:320px;width:calc(100% - 24px)">
    <div class="modal-content" style="border-radius:18px;border:none;box-shadow:0 24px 60px rgba(0,0,0,.22)">
      <div style="padding:28px 24px 0;text-align:center">
        <div style="width:48px;height:48px;border-radius:50%;background:#fdf5ee;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
          <i class="bi bi-trash3" style="font-size:20px;color:#9C5523"></i>
        </div>
        <div id="confirmTitle" style="font-size:15px;font-weight:700;color:#111827;margin-bottom:6px">Excluir</div>
        <div id="confirmMsg" style="font-size:13px;color:#6b7280;line-height:1.5">Esta ação não pode ser desfeita.</div>
      </div>
      <div style="display:flex;gap:8px;padding:22px 24px 24px">
        <button id="confirmCancelBtn" style="flex:1;border:1.5px solid #e5e7eb;background:#fff;border-radius:999px;padding:9px 0;font-size:13px;font-weight:500;color:#374151;cursor:pointer;font-family:inherit">Cancelar</button>
        <button id="confirmOkBtn"     style="flex:1;border:none;background:#9C5523;border-radius:999px;padding:9px 0;font-size:13px;font-weight:600;color:#fff;cursor:pointer;font-family:inherit">Excluir</button>
      </div>
    </div>
  </div>
</div>

<!-- ===== MODAL ORDENAR PASSOS ===== -->
<div class="modal fade" id="modalOrdenarPassos" tabindex="-1" data-bs-backdrop="static">
  <div class="modal-dialog modal-dialog-centered" style="max-width:560px;width:calc(100% - 24px)">
    <div class="modal-content" style="border-radius:16px;border:none;box-shadow:0 20px 60px rgba(0,0,0,.18)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 24px 14px;border-bottom:1px solid #f0f0f0">
        <span style="font-size:15px;font-weight:700;color:#111827">Ordenar passos</span>
        <button data-bs-dismiss="modal" style="background:none;border:none;color:#9ca3af;cursor:pointer;padding:0;font-size:15px;display:flex;align-items:center"><i class="bi bi-x-lg"></i></button>
      </div>
      <div style="padding:16px 24px 8px">
        <p style="font-size:13px;color:#6b7280;margin-bottom:16px">Arraste os passos para definir a ordem de exibição para o cliente. As alterações só serão aplicadas ao clicar em Salvar.</p>
        <div id="ordenarPassosLista"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:flex-end;padding:12px 24px;border-top:1px solid #f0f0f0;gap:8px">
        <button data-bs-dismiss="modal" style="background:#fff;border:1.5px solid #e5e7eb;border-radius:999px;padding:7px 18px;font-size:13px;font-weight:500;color:#374151;cursor:pointer">Cancelar</button>
        <button id="btnSalvarOrdem" onclick="salvarOrdemPassos()" style="background:#9C5523;border:none;border-radius:999px;padding:7px 22px;font-size:13px;font-weight:600;color:#fff;cursor:pointer">Salvar</button>
      </div>
    </div>
  </div>
</div>

<!-- ===== MODAL SELECIONAR OPÇÕES ===== -->
<div class="modal fade" id="modalSelecionarOpcoes" tabindex="-1" style="z-index:1085">
  <div class="modal-dialog modal-dialog-centered modal-xl">
    <div class="modal-content combo-modal">
      <div class="modal-header">
        <h5 class="modal-title fw-bold">Selecionar opções para o passo</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body" style="padding-bottom:8px">
        <div id="cwOpcoesTabContent">
          <div class="opcoes-picker-search">
            <input type="text" id="cwOpcoesSearch" placeholder="Pesquisar item" autocomplete="off">
            <select id="cwOpcoesCatFiltro" style="flex:2;min-width:0;max-width:none">
              <option value="0">Filtrar por categoria</option>
              <?php foreach ($categoriasCombo as $cat): ?>
              <option value="<?= (int)$cat['id'] ?>"><?= htmlspecialchars($cat['nome'], ENT_QUOTES, 'UTF-8') ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">
            <button class="opcoes-picker-selall" style="margin-bottom:0" onclick="_selecionarTodasOpcoes()">
              <i class="bi bi-check2-all me-1"></i>Selecionar todos
            </button>
            <button class="opcoes-picker-selall" style="margin-bottom:0;color:#6b7280" onclick="_desmarcarTodasOpcoes()">
              <i class="bi bi-x-circle me-1"></i>Desmarcar todos
            </button>
          </div>
          <div class="opcoes-grid" id="cwOpcoesGrid">
            <div class="text-center py-4" style="grid-column:1/-1;color:#9ca3af;font-size:13px">Carregando produtos...</div>
          </div>
        </div>
      </div>
      <div class="modal-footer justify-content-between">
        <span id="cwOpcoesContador" style="font-size:12px;color:#6b7280"></span>
        <button class="btn btn-diggy-primary" onclick="_salvarOpcoesEscolhidas()">Salvar</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL CRONOGRAMA DE DISPONIBILIDADE — CATEGORIA -->
<div class="modal fade" id="modalCronogramaCategoria" tabindex="-1" data-bs-backdrop="static">
  <div class="modal-dialog modal-dialog-centered" style="max-width:500px;width:calc(100% - 32px)">
    <div class="modal-content cronograma-modal">
      <div class="cronograma-modal-header">
        <p class="cronograma-desc">
          Crie um cronograma para que os produtos dessa categoria apareçam para seus clientes em
          apenas dias e horários específicos da semana
        </p>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body cronograma-body">
        <div class="cronograma-section-label">Dias da semana</div>
        <div class="cronograma-days" id="cronogramaCatDays">
          <button type="button" class="cronograma-day-btn" data-dia="dom">Domingo</button>
          <button type="button" class="cronograma-day-btn" data-dia="seg">Segunda</button>
          <button type="button" class="cronograma-day-btn" data-dia="ter">Terça</button>
          <button type="button" class="cronograma-day-btn" data-dia="qua">Quarta</button>
          <button type="button" class="cronograma-day-btn" data-dia="qui">Quinta</button>
          <button type="button" class="cronograma-day-btn" data-dia="sex">Sexta</button>
          <button type="button" class="cronograma-day-btn" data-dia="sab">Sábado</button>
        </div>

        <div class="cronograma-section-label mt-3">Horário</div>
        <div class="cronograma-time-label">Categoria disponível a partir das:</div>
        <input type="time" class="cronograma-time-input" id="cronogramaCatHorarioIni" placeholder="Horário inicial">
        <div class="cronograma-time-label mt-2">Categoria disponível até ou ficará indisponível a partir das:</div>
        <input type="time" class="cronograma-time-input" id="cronogramaCatHorarioFim" placeholder="Horário final">
      </div>
      <div class="modal-footer border-0 pt-0">
        <button type="button" class="btn btn-diggy-ghost me-auto" onclick="limparCronogramaCategoria()">Limpar</button>
        <button type="button" class="btn btn-diggy-primary" onclick="salvarCronogramaCategoria()">Salvar</button>
      </div>
      <input type="hidden" id="cronogramaCatId">
    </div>
  </div>
</div>

</body>
</html>

