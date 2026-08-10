<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';

$cliente_id = (int)($_GET['id'] ?? 0);
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

if ($cliente_id <= 0) {
  die('Cliente inválido');
}

/* DADOS DO CLIENTE */
$clienteCols = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$temPontosSaldo = in_array('pontos_saldo', $clienteCols, true);
$campoPontos = $temPontosSaldo ? 'pontos_saldo' : 'pontos';

$stmt = $conn->prepare("
  SELECT id, nome, telefone, email, nivel, {$campoPontos} AS pontos, criado_em
  FROM clientes
  WHERE id = ? AND loja_id = ?
");
$stmt->execute([$cliente_id, $lojaId]);
$cliente = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$cliente) {
  die('Cliente não encontrado');
}

/* KPIs */
$stmt = $conn->prepare("
  SELECT
    COUNT(*) AS total_pedidos,
    IFNULL(SUM(total),0) AS total_gasto
  FROM pedidos
  WHERE cliente_id = ? AND loja_id = ?
    AND status = 'finalizado'
");
$stmt->execute([$cliente_id, $lojaId]);
$kpi = $stmt->fetch(PDO::FETCH_ASSOC);

$ticket_medio = $kpi['total_pedidos'] > 0
  ? $kpi['total_gasto'] / $kpi['total_pedidos']
  : 0;

/* PAGINAÇÃO DOS PEDIDOS */
$pagina = max(1,(int)($_GET['pagina'] ?? 1));
$limite = 10;
$offset = ($pagina - 1) * $limite;

/* TOTAL */
$stmt = $conn->prepare("
  SELECT COUNT(*)
  FROM pedidos
  WHERE cliente_id = ? AND loja_id = ?
");
$stmt->execute([$cliente_id, $lojaId]);
$total = $stmt->fetchColumn();
$paginas = ceil($total / $limite);

/* LISTA DE PEDIDOS */
$stmt = $conn->prepare("
  SELECT id, total, status, criado_em
  FROM pedidos
  WHERE cliente_id = ? AND loja_id = ?
  ORDER BY criado_em DESC
  LIMIT $limite OFFSET $offset
");
$stmt->execute([$cliente_id, $lojaId]);
$pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);
$clienteDetalheJsVer = filemtime(__DIR__ . '/assets/js/cliente_detalhe.js');
?>


<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Cliente</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css" rel="stylesheet">

</head>
<body>

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid">

  <!-- TOPO -->
  <div class="mb-4">
    <a href="clientes.php" class="btn btn-sm btn-outline-secondary rounded-pill mb-3">
      ← Voltar
    </a>

    <h5><?= htmlspecialchars($cliente['nome']) ?></h5>
    <p class="text-muted mb-0">
      📞 <?= htmlspecialchars($cliente['telefone']) ?>
      <?php if($cliente['email']): ?>
        • ✉️ <?= htmlspecialchars($cliente['email']) ?>
      <?php endif; ?>
    </p>
  </div>

   


  <!-- KPIs -->
  <div class="row g-4 mb-4">

    <div class="col-md-4">
      <div class="card rounded-4 shadow-sm border-0 p-4">
        <p class="text-muted mb-1">Total gasto</p>
        <h4>R$ <?= number_format($kpi['total_gasto'],2,',','.') ?></h4>
      </div>
    </div>

     <div class="col-md-4">
        <div class="card rounded-4 shadow-sm border-0 p-4">
            <p class="text-muted mb-1">Nível</p>
            <h4><?= $cliente['nivel'] ?></h4>
            <small><?= $cliente['pontos'] ?> pontos</small>
        </div>
    </div>

    <div class="col-md-4">
      <div class="card rounded-4 shadow-sm border-0 p-4">
        <p class="text-muted mb-1">Pedidos</p>
        <h4><?= $kpi['total_pedidos'] ?></h4>
      </div>
    </div>

    <div class="col-md-4">
      <div class="card rounded-4 shadow-sm border-0 p-4">
        <p class="text-muted mb-1">Ticket médio</p>
        <h4>R$ <?= number_format($ticket_medio,2,',','.') ?></h4>
      </div>
    </div>

  </div>

  <!-- HISTÓRICO DE PEDIDOS -->
  <div class="card rounded-4 shadow-sm border-0">
    <div class="card-header bg-white border-0">
      <strong>Histórico de pedidos</strong>
    </div>

    <div class="table-responsive">
      <table class="table align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>#</th>
            <th>Total</th>
            <th>Status</th>
            <th>Data</th>
            <th></th>
          </tr>
        </thead>
        <tbody>

        <?php foreach($pedidos as $p): ?>
          <tr>
            <td>#<?= $p['id'] ?></td>
            <td>R$ <?= number_format($p['total'],2,',','.') ?></td>
            <td>
              <span class="badge bg-secondary">
                <?= ucfirst($p['status']) ?>
              </span>
            </td>
            <td><?= date('d/m/Y H:i', strtotime($p['criado_em'])) ?></td>
            <td class="text-end">
              <a href="pedido.php?id=<?= $p['id'] ?>"
                 class="btn btn-sm btn-outline-dark rounded-pill">
                Ver pedido
              </a>
            </td>
          </tr>
        <?php endforeach; ?>

        <?php if(!$pedidos): ?>
          <tr>
            <td colspan="5" class="text-center text-muted py-4">
              Nenhum pedido encontrado
            </td>
          </tr>
        <?php endif; ?>

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
             href="?id=<?= $cliente_id ?>&pagina=<?= $i ?>">
            <?= $i ?>
          </a>
        </li>
      <?php endfor; ?>
    </ul>
  </nav>

</div>

</main>
</div>

<script src="./assets/js/cliente_detalhe.js?v=<?= $clienteDetalheJsVer ?>"></script>

</body>
</html>
