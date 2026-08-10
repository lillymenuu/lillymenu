<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.estoque');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$stmt = $conn->prepare("
  SELECT 
    p.id,
    p.nome,
    IFNULL(e.quantidade, 0) AS quantidade
  FROM produtos p
  LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
  WHERE p.loja_id = ?
  ORDER BY p.nome
");
$stmt->execute([$lojaId]);
$estoque = $stmt->fetchAll(PDO::FETCH_ASSOC);
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$estoqueCssVer = filemtime(__DIR__ . '/assets/css/estoque.css');
$estoqueJsVer = filemtime(__DIR__ . '/assets/js/estoque.js');
?>


<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Estoque</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">


<link href="./assets/css/estoque.css?v=<?= $estoqueCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy">

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="dash-page estoque-page">
  <div class="estoque-header">
    <div>
      <h1 class="estoque-title">Estoque</h1>
      <div class="estoque-subtitle">
        Voce podera cadastrar os produtos no seu estoque e a quantidade do(s) item(s) sera decrementada a cada
        pedido feito se o produto(s) do pedido estiver no estoque.
      </div>
    </div>
    <div class="estoque-actions">
      <button class="btn-estoque-ghost" type="button" aria-label="Configurar estoque">
        <i class="bi bi-gear"></i>
      </button>
      <button class="btn-estoque-primary" type="button" id="btnAdicionarEstoque">
        <i class="bi bi-plus-circle"></i>
        Adicionar
      </button>
    </div>
  </div>

  <div class="estoque-filter">
    <div class="filter-title">Filtros</div>
    <div class="filter-grid">
      <div class="filter-field">
        <label for="estoqueBusca">Buscar item de estoque</label>
        <div class="filter-input-wrap">
          <input id="estoqueBusca" class="filter-input" type="text" placeholder="Pesquise pelo nome do item">
          <button class="filter-icon" type="button" aria-label="Buscar">
            <i class="bi bi-search"></i>
          </button>
        </div>
      </div>
      <div class="filter-field">
        <label for="estoqueOrdenar">Ordenar por</label>
        <select id="estoqueOrdenar" class="filter-select">
          <option value="quantidade_desc" selected>Quantidade de itens</option>
          <option value="quantidade_asc">Menor quantidade</option>
          <option value="nome_asc">Nome A-Z</option>
          <option value="nome_desc">Nome Z-A</option>
        </select>
      </div>
    </div>
  </div>

  <div class="estoque-grid" id="estoqueCards"></div>
</div>

</main>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
const estoqueInicial = <?php echo json_encode($estoque); ?>;
</script>
<script src="./assets/js/estoque.js?v=<?= $estoqueJsVer ?>"></script>



<div id="estoqueToast" class="estoque-toast"></div>

<!-- MODAL NOVO ESTOQUE -->
<div class="modal fade estoque-novo-modal" id="modalNovoEstoque" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header border-0">
        <h5 class="modal-title">Escolha o item para criacao de estoque</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="estoque-field">
          <label>Tipo do estoque</label>
          <select class="form-select" id="estoqueNovoTipo">
            <option value="produto" selected>Estoque para produto unitario</option>
            <option value="adicional">Estoque para adicional</option>
          </select>
        </div>

        <div class="estoque-novo-section">
          <button type="button" class="estoque-section-toggle" id="estoqueNovoToggle">
            <span id="estoqueNovoTitulo">Produtos</span>
            <i class="bi bi-chevron-down"></i>
          </button>
          <div id="estoqueNovoBody">
            <div class="estoque-novo-search">
              <label for="estoqueNovoBusca" id="estoqueNovoLabel">Buscar produto</label>
              <div class="filter-input-wrap">
                <input id="estoqueNovoBusca" class="filter-input" type="text" placeholder="Ex.: Produto">
                <button class="filter-icon" type="button" aria-label="Buscar">
                  <i class="bi bi-search"></i>
                </button>
              </div>
            </div>
            <div class="estoque-novo-list" id="estoqueNovoLista"></div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="estoque-btn-primary" type="button" id="btnConfirmarNovoEstoque">
          adicionar novo item de estoque
        </button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL PRODUCAO -->
<div class="modal fade estoque-modal" id="modalProducao" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content rounded-4">

      <div class="modal-header">
        <h5 class="modal-title" id="tituloModalProducao">Editar item de estoque</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">
        <form id="formProducao">
          <input type="hidden" name="produto_id" id="producaoProdutoId">

          <div class="estoque-field">
            <label>Quantidade em estoque</label>
            <input type="number" min="0" class="form-control"
                   name="quantidade" id="estoqueQuantidade" required>
          </div>

          <div class="estoque-field">
            <label>Quantidade minima para alerta</label>
            <input type="number" min="0" class="form-control"
                   name="quantidade_minima" id="estoqueMinimo" required>
          </div>

          <div class="estoque-note">
            Caso voce venda o mesmo item como produto ou item de complemento (adicional), voce podera vincular esse
            aqui e o mesmo tera um unico estoque
          </div>
          <button type="button" class="estoque-link">vincular outros itens</button>

          <div class="estoque-section-title">Produtos vinculados</div>
          <div class="estoque-list" id="estoqueVinculados">
            <div class="estoque-list-item">Nenhum item vinculado.</div>
          </div>

          <div class="estoque-section-title">Adicionais(complementos) vinculados</div>
          <div class="estoque-list" id="estoqueAdicionais">
            <div class="estoque-list-item">Nenhum item vinculado.</div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button class="estoque-btn-outline" type="button" onclick="deletarEstoque()">Deletar estoque</button>
        <button class="estoque-btn-primary" type="button" onclick="salvarEstoque()">Salvar estoque</button>
      </div>

    </div>
  </div>
</div>


</body>
</html>





