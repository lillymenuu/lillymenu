<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';

$busca  = trim($_GET['busca'] ?? '');
$pagina = max(1,(int)($_GET['pagina'] ?? 1));
$limite = 10;
$offset = ($pagina - 1) * $limite;

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$where = 'WHERE m.loja_id = ?';
$params = [$lojaId];

if ($busca !== '') {
  $where = "WHERE m.loja_id = ? AND p.nome LIKE ?";
  $params = [$lojaId, "%$busca%"];
}

/* TOTAL */
$stmt = $conn->prepare("
  SELECT COUNT(*)
  FROM estoque_movimentacoes m
  JOIN produtos p ON p.id = m.produto_id AND p.loja_id = m.loja_id
  $where
");
$stmt->execute($params);
$total = $stmt->fetchColumn();
$paginas = ceil($total / $limite);

/* DADOS */
$stmt = $conn->prepare("
  SELECT
    p.nome AS produto,
    m.tipo,
    m.quantidade,
    m.origem,
    m.referencia_id,
    m.criado_em
  FROM estoque_movimentacoes m
  JOIN produtos p ON p.id = m.produto_id AND p.loja_id = m.loja_id
  $where
  ORDER BY m.criado_em DESC
  LIMIT $limite OFFSET $offset
");
$stmt->execute($params);
$dados = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>


<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatórios de Estoque</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css" rel="stylesheet">

</head>
<body>

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid">

  <div class="topbar mb-4 d-flex justify-content-between align-items-center">
    <h5>Relatórios de Estoque</h5>

    <form class="d-flex gap-2">
      <input name="busca"
             value="<?= htmlspecialchars($busca) ?>"
             class="form-control rounded-pill"
             placeholder="Buscar produto">
      <button class="btn btn-dark rounded-pill">Buscar</button>
    </form>
  </div>

  <div class="card rounded-4 shadow-sm border-0">
    <div class="table-responsive">
      <table class="table align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Produto</th>
            <th>Tipo</th>
            <th>Qtd</th>
            <th>Origem</th>
            <th>Ref.</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
        <?php foreach($dados as $d): ?>
          <tr>
            <td><?= htmlspecialchars($d['produto']) ?></td>
            <td>
              <span class="badge <?= $d['tipo']=='entrada'?'bg-success':'bg-danger' ?>">
                <?= ucfirst($d['tipo']) ?>
              </span>
            </td>
            <td><?= $d['quantidade'] ?></td>
            <td><?= $d['origem'] ?></td>
            <td><?= $d['referencia_id'] ?? '-' ?></td>
            <td><?= date('d/m/Y H:i', strtotime($d['criado_em'])) ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PAGINAÇÃO -->
  <nav class="mt-4">
    <ul class="pagination justify-content-center">
      <?php for($i=1;$i<=$paginas;$i++): ?>
        <li class="page-item <?= $i==$pagina?'active':'' ?>">
          <a class="page-link"
             href="?pagina=<?= $i ?>&busca=<?= urlencode($busca) ?>">
            <?= $i ?>
          </a>
        </li>
      <?php endfor; ?>
    </ul>
  </nav>

</div>

</main>
</div>


<script>
function toggleSidebar(){
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  if(window.innerWidth <= 991){
    sidebar.classList.toggle('show');
    overlay.style.display = sidebar.classList.contains('show') ? 'block' : 'none';
  }else{
    sidebar.classList.toggle('collapsed');
  }
}




</script>


</body>
</html>
