<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$pedido_id = (int) ($_POST['pedido_id'] ?? 0);
$status    = $_POST['status'] ?? '';

if ($pedido_id <= 0 || $status === '') {
  echo json_encode(['ok'=>false,'msg'=>'Dados inválidos']);
  exit;
}

// Atualiza status do pedido
$stmt = $conn->prepare("
  UPDATE pedidos
  SET status = ?
  WHERE id = ? AND loja_id = ?
");
$stmt->execute([$status, $pedido_id, $lojaId]);

// ⚠️ SÓ QUANDO CONCLUIR
if ($status === 'concluido') {

  $conn->beginTransaction();

  try {

    // Itens do pedido
    $stmt = $conn->prepare("
      SELECT produto_id, quantidade
      FROM pedido_itens
      WHERE pedido_id = ? AND loja_id = ?
    ");
    $stmt->execute([$pedido_id, $lojaId]);
    $itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($itens as $item) {

      // Garante estoque
      $conn->prepare("
        INSERT IGNORE INTO estoque (produto_id, quantidade, loja_id)
        VALUES (?, 0, ?)
      ")->execute([$item['produto_id'], $lojaId]);

      // Baixa estoque
      $conn->prepare("
        UPDATE estoque
        SET quantidade = quantidade - ?
        WHERE produto_id = ? AND loja_id = ?
      ")->execute([
        $item['quantidade'],
        $item['produto_id'],
        $lojaId
      ]);

      // Registra saída
      $conn->prepare("
        INSERT INTO estoque_movimentacoes
          (produto_id, tipo, quantidade, origem, referencia_id, loja_id)
        VALUES (?, 'saida', ?, 'pedido', ?, ?)
      ")->execute([
        $item['produto_id'],
        $item['quantidade'],
        $pedido_id,
        $lojaId
      ]);
    }

    $conn->commit();

  } catch (Exception $e) {
    $conn->rollBack();
    echo json_encode(['ok'=>false,'msg'=>'Erro ao baixar estoque']);
    exit;
  }
}

echo json_encode(['ok'=>true]);
$estoqueMovimentacoesJsVer = filemtime(__DIR__ . '/assets/js/estoque_movimentacoes.js');
?>


<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Movimentações de Estoque</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css" rel="stylesheet">

</head>
<body>

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid">

  <div class="topbar mb-4 d-flex justify-content-between align-items-center">
    <h5>Movimentações de Estoque</h5>

    <form class="d-flex gap-2">
      <input type="text"
             name="busca"
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

        <?php foreach($movs as $m): ?>
          <tr>
            <td><?= htmlspecialchars($m['produto']) ?></td>
            <td>
              <span class="badge <?= $m['tipo']=='entrada'?'bg-success':'bg-danger' ?>">
                <?= ucfirst($m['tipo']) ?>
              </span>
            </td>
            <td><?= $m['quantidade'] ?></td>
            <td><?= $m['origem'] ?></td>
            <td><?= $m['referencia_id'] ?? '-' ?></td>
            <td><?= date('d/m/Y H:i', strtotime($m['criado_em'])) ?></td>
          </tr>
        <?php endforeach; ?>

        <?php if(!$movs): ?>
          <tr>
            <td colspan="6" class="text-center text-muted py-4">
              Nenhuma movimentação encontrada
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
             href="?pagina=<?= $i ?>&busca=<?= urlencode($busca) ?>">
            <?= $i ?>
          </a>
        </li>
      <?php endfor; ?>
    </ul>
  </nav>

  <div class="dash-footer" style="text-align:center;font-size:.75rem;color:#94a3b8;margin-top:6px">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>

</main>
</div>


<script src="./assets/js/estoque_movimentacoes.js?v=<?= $estoqueMovimentacoesJsVer ?>"></script>


</body>
</html>
