<?php
require_once __DIR__ . '/protect.php';
?>

<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

// Datas
$hoje = date('Y-m-d');
$inicioMes = date('Y-m-01');

// Pedidos hoje
$qPedidosHoje = $conn->prepare(
  "SELECT COUNT(*) FROM pedidos WHERE DATE(criado_em) = ? AND loja_id = ?"
);
$qPedidosHoje->execute([$hoje, $lojaId]);
$pedidosHoje = $qPedidosHoje->fetchColumn();

// Faturamento hoje
$qFatHoje = $conn->prepare(
  "SELECT SUM(total) FROM pedidos WHERE DATE(criado_em) = ? AND loja_id = ?"
);
$qFatHoje->execute([$hoje, $lojaId]);
$faturamentoHoje = $qFatHoje->fetchColumn() ?? 0;

// Pedidos mês
$qPedidosMes = $conn->prepare(
  "SELECT COUNT(*) FROM pedidos 
   WHERE criado_em >= ? AND loja_id = ?"
);
$qPedidosMes->execute([$inicioMes, $lojaId]);
$pedidosMes = $qPedidosMes->fetchColumn();

// Faturamento mês
$qFatMes = $conn->prepare(
  "SELECT SUM(total) FROM pedidos 
   WHERE criado_em >= ? AND loja_id = ?"
);
$qFatMes->execute([$inicioMes, $lojaId]);
$faturamentoMes = $qFatMes->fetchColumn() ?? 0;


// Últimos pedidos
$stmtUlt = $conn->prepare("
  SELECT 
    p.id,
    p.total,
    p.tipo_entrega,
    p.status,
    p.criado_em,
    c.nome AS cliente
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  WHERE p.loja_id = ?
  ORDER BY p.criado_em DESC
  LIMIT 8
");
$stmtUlt->execute([$lojaId]);
$ultimosPedidos = $stmtUlt->fetchAll(PDO::FETCH_ASSOC);

$dashboard1JsVer = filemtime(__DIR__ . '/assets/js/dashboard1.js');
?>



<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">

<link href="./assets/css/dashboard.css" rel="stylesheet">

</head>
<body>
<?php include __DIR__ . '/partials/sidebar.php'; ?>
<div class="dashboard">



  

  <!-- CONTENT -->
 <div class="container-fluid">


    

<!-- KPIs -->
<div class="row g-4 mb-4">

  <!-- Pedidos Hoje -->
  <div class="col-xl-3 col-md-6">
    <div class="card kpi-card shadow-sm">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <small class="text-muted">Pedidos hoje</small>
          <h4 class="mt-1"><?= $pedidosHoje ?></h4>
        </div>
        <div class="kpi-icon bg-primary">
          <i class="bi bi-bag-check"></i>
        </div>
      </div>
    </div>
  </div>

  <!-- Faturamento Hoje -->
  <div class="col-xl-3 col-md-6">
    <div class="card kpi-card shadow-sm">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <small class="text-muted">Faturamento hoje</small>
          <h4 class="mt-1">
            R$ <?= number_format($faturamentoHoje, 2, ',', '.') ?>
          </h4>
        </div>
        <div class="kpi-icon bg-success">
          <i class="bi bi-cash-stack"></i>
        </div>
      </div>
    </div>
  </div>

  <!-- Pedidos do mês -->
  <div class="col-xl-3 col-md-6">
    <div class="card kpi-card shadow-sm">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <small class="text-muted">Pedidos no mês</small>
          <h4 class="mt-1"><?= $pedidosMes ?></h4>
        </div>
        <div class="kpi-icon bg-warning">
          <i class="bi bi-calendar-check"></i>
        </div>
      </div>
    </div>
  </div>

  <!-- Faturamento do mês -->
  <div class="col-xl-3 col-md-6">
    <div class="card kpi-card shadow-sm">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <small class="text-muted">Faturamento mês</small>
          <h4 class="mt-1">
            R$ <?= number_format($faturamentoMes, 2, ',', '.') ?>
          </h4>
        </div>
        <div class="kpi-icon bg-dark">
          <i class="bi bi-graph-up"></i>
        </div>
      </div>
    </div>
  </div>

</div>




<!-- ÚLTIMOS PEDIDOS -->
<div class="card rounded-4 shadow-sm border-0">
  <div class="card-body">

    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="mb-0">Últimos pedidos</h5>
      <a href="pedidos.php" class="btn btn-sm btn-outline-dark rounded-pill">
        Ver todos
      </a>
    </div>

    <div class="table-responsive">
      <table class="table align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>#</th>
            <th>Cliente</th>
            <th>Tipo</th>
            <th>Status</th>
            <th>Total</th>
            <th>Data</th>
            <th></th>
          </tr>
        </thead>
        <tbody>

        <?php foreach ($ultimosPedidos as $p): ?>
          <tr>
            <td>#<?= $p['id'] ?></td>
            <td><?= htmlspecialchars($p['cliente']) ?></td>
            <td>
              <?= $p['tipo_entrega'] === 'entrega' ? 'Entrega' : 'Retirada' ?>
            </td>
            <td>
              <span class="badge status-<?= $p['status'] ?>">
                <?= ucfirst($p['status']) ?>
              </span>
            </td>
            <td>
              R$ <?= number_format($p['total'], 2, ',', '.') ?>
            </td>
            <td>
              <?= date('d/m H:i', strtotime($p['criado_em'])) ?>
            </td>
            <td>
              <a href="pedido.php?id=<?= $p['id'] ?>" 
                 class="btn btn-sm btn-outline-secondary rounded-pill">
                Ver
              </a>
            </td>
          </tr>
        <?php endforeach; ?>

        </tbody>
      </table>
    </div>

  </div>
</div>






    <!-- CONTEÚDO INICIAL -->
    <div class="card rounded-4 p-4 shadow-sm">
      <h5>Bem-vindo ao Dashboard</h5>
      <p class="text-muted mb-0">
        Aqui você acompanha os pedidos e o desempenho do delivery.
      </p>
    </div>

  </main>

</div>

<script src="./assets/js/dashboard1.js?v=<?= $dashboard1JsVer ?>"></script>

</body>
</html>
