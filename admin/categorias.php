<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';

$categorias = [];
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$stmt = $conn->prepare("
  SELECT id, nome, ativo
  FROM categorias
  WHERE loja_id = ?
  ORDER BY ordem IS NULL, ordem, nome
");
$stmt->execute([$lojaId]);
$categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);
$categoriasCssVer = filemtime(__DIR__ . '/assets/css/categorias.css');
$categoriasJsVer = filemtime(__DIR__ . '/assets/js/categorias.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Categorias</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css" rel="stylesheet">
<link href="./assets/css/categorias.css?v=<?= $categoriasCssVer ?>" rel="stylesheet">
</head>
<body>

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid">

  <div class="topbar mb-4 d-flex justify-content-between align-items-center">
    <h5 class="mb-0">Categorias</h5>

    <button class="btn btn-dark rounded-pill"
            onclick="abrirModalCategoria()">
      <i class="bi bi-plus-lg me-1"></i>
      Nova categoria
    </button>
  </div>

  <div class="card rounded-4 shadow-sm border-0">
    <div class="table-responsive">
      <table class="table align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Nome</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>

        <?php if(count($categorias)===0): ?>
          <tr>
            <td colspan="3" class="text-center text-muted py-4">
              Nenhuma categoria cadastrada
            </td>
          </tr>
        <?php endif; ?>

        <?php foreach($categorias as $c): ?>
          <tr>
            <td><?= htmlspecialchars($c['nome']) ?></td>
            <td>
              <span class="badge <?= $c['ativo']?'bg-success':'bg-secondary' ?>">
                <?= $c['ativo']?'Ativa':'Inativa' ?>
              </span>
            </td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-dark rounded-pill"
                      onclick="editarCategoria(<?= $c['id'] ?>)">
                Editar
              </button>
            </td>
          </tr>
        <?php endforeach; ?>

        </tbody>
      </table>
    </div>
  </div>

  <div class="dash-footer" style="text-align:center;font-size:.75rem;color:#94a3b8;margin-top:6px">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>

<!-- MODAL -->
<div class="modal fade" id="modalCategoria" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content rounded-4">

      <div class="modal-header border-0">
        <h5 class="modal-title">Nova categoria</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">
        <form id="formCategoria">
          <input type="hidden" name="id" id="categoriaId">

          <div class="mb-3">
            <label class="form-label">Nome da categoria</label>
            <input type="text" name="nome" id="categoriaNome"
                   class="form-control rounded-pill" required>
          </div>

          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox"
                   name="ativo" id="categoriaAtivo" checked>
            <label class="form-check-label">Categoria ativa</label>
          </div>
        </form>
      </div>

      <div class="modal-footer border-0">
        <button class="btn btn-outline-secondary rounded-pill"
                data-bs-dismiss="modal">
          Cancelar
        </button>
        <button class="btn btn-dark rounded-pill"
                onclick="salvarCategoria()">
          Salvar
        </button>
      </div>

    </div>
  </div>
</div>

</main>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<script src="./assets/js/categorias.js?v=<?= $categoriasJsVer ?>"></script>










</body>
</html>
