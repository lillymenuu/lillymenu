<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

/* =========================
   VALIDAR ID
========================= */
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
  header('Location: pedidos.php');
  exit;
}

/* =========================
   BUSCAR PEDIDO
========================= */
$stmt = $conn->prepare("
  SELECT 
    p.*,
    c.nome     AS cliente,
    c.telefone AS telefone,
    c.endereco AS endereco
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  WHERE p.id = ? AND p.loja_id = ?
");
$stmt->execute([$id, $lojaId]);
$pedido = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$pedido) {
  header('Location: pedidos.php');
  exit;
}

$cashbackValor = 0.0;
if (isset($pedido['cashback_valor']) && is_numeric($pedido['cashback_valor'])) {
  $cashbackValor = (float)$pedido['cashback_valor'];
}
if ($cashbackValor <= 0 && isset($pedido['cashback_percentual']) && is_numeric($pedido['cashback_percentual'])) {
  $cashbackPercentual = (float)$pedido['cashback_percentual'];
  if ($cashbackPercentual > 0) {
    $subtotalBase = (float)($pedido['subtotal'] ?? 0);
    $descontoBase = (float)($pedido['desconto'] ?? 0);
    if ($subtotalBase > 0) {
      $baseCashback = $subtotalBase - $descontoBase;
    } else {
      $baseCashback = (float)($pedido['total'] ?? 0) - (float)($pedido['taxa_entrega'] ?? 0) - $descontoBase;
    }
    if ($baseCashback < 0) {
      $baseCashback = 0;
    }
    $cashbackValor = $baseCashback * ($cashbackPercentual / 100);
  }
}

/* =========================
   BUSCAR ITENS
========================= */
$stmtItens = $conn->prepare("
  SELECT
    i.quantidade,
    i.preco,
    pr.nome
  FROM pedido_itens i
  JOIN produtos pr ON pr.id = i.produto_id AND pr.loja_id = i.loja_id
  WHERE i.pedido_id = ? AND i.loja_id = ?
");
$stmtItens->execute([$id, $lojaId]);
$itens = $stmtItens->fetchAll(PDO::FETCH_ASSOC);

/* =========================
   MENSAGEM WHATSAPP
========================= */
$msg  = "Pedido #{$pedido['id']}\n";
$msg .= "Cliente: {$pedido['cliente']}\n\n";
$msg .= "Itens:\n";

foreach ($itens as $item) {
  $subtotal = $item['quantidade'] * $item['preco'];
  $msg .= "• {$item['nome']} ({$item['quantidade']}x) - R$ "
       . number_format($subtotal,2,',','.') . "\n";
}

$msg .= "\nTotal: R$ " . number_format($pedido['total'],2,',','.');
$msg .= "\nTipo: " . ucfirst($pedido['tipo']);

//$msg .= "\nPagamento " . ucfirst($pedido['pagamento']);

$whatsMsg = urlencode($msg);
$telefoneWhats = preg_replace('/\D/', '', $pedido['telefone']);



function obterOuCriarCliente(PDO $conn, string $nome, string $telefone, ?string $email = null): int {
  // Normaliza telefone (remove espaços e símbolos comuns)
  $telefone = preg_replace('/\D+/', '', $telefone);

  // Procura cliente existente
  $stmt = $conn->prepare("SELECT id FROM clientes WHERE telefone = ? AND loja_id = ?");
  $stmt->execute([$telefone, (int) ($_SESSION['loja_id'] ?? 1)]);
  $id = $stmt->fetchColumn();

  if ($id) {
    return (int)$id;
  }

  // Cria novo cliente
  $stmt = $conn->prepare("
    INSERT INTO clientes (nome, telefone, email, loja_id)
    VALUES (?, ?, ?, ?)
  ");
  $stmt->execute([$nome, $telefone, $email, (int) ($_SESSION['loja_id'] ?? 1)]);

  return (int)$conn->lastInsertId();
}

$pedidoCssVer = filemtime(__DIR__ . '/assets/css/pedido.css');
$pedidoJsVer = filemtime(__DIR__ . '/assets/js/pedido.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Pedido #<?= $pedido['id'] ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
<link href="./assets/css/pedido.css?v=<?= $pedidoCssVer ?>" rel="stylesheet">
</head>
<body>

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid">

  <!-- TOPO -->
  <div class="topbar mb-4">
    <h5 class="mb-0">Pedido #<?= $pedido['id'] ?></h5>
  </div>

  <div class="row g-4">

    <!-- COLUNA ESQUERDA -->
    <div class="col-lg-8">

      <!-- DADOS -->
      <div class="card rounded-4 shadow-sm mb-4">
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <p><strong>Cliente:</strong><br><?= htmlspecialchars($pedido['cliente']) ?></p>
              <p><strong>Telefone:</strong><br><?= htmlspecialchars($pedido['telefone']) ?></p>
            </div>
            <div class="col-md-6">
              <p><strong>Tipo:</strong><br><?= ucfirst($pedido['tipo']) ?></p>
              <p><strong>Status:</strong><br>
                <span class="badge status-<?= $pedido['status'] ?>" id="statusBadge">
                  <?= ucfirst($pedido['status']) ?>
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- ITENS -->
      <div class="card rounded-4 shadow-sm">
        <div class="card-body">
          <h6 class="mb-3">Itens do pedido</h6>
          <div class="table-responsive">
            <table class="table align-middle">
              <thead class="table-light">
                <tr>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Preço</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
              <?php foreach ($itens as $item): ?>
                <tr>
                  <td><?= htmlspecialchars($item['nome']) ?></td>
                  <td><?= $item['quantidade'] ?></td>
                  <td>R$ <?= number_format($item['preco'],2,',','.') ?></td>
                  <td>R$ <?= number_format($item['quantidade']*$item['preco'],2,',','.') ?></td>
                </tr>
              <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>

    <!-- COLUNA DIREITA -->
    <div class="col-lg-4">

      <!-- RESUMO -->
      <div class="card rounded-4 shadow-sm mb-4">
        <div class="card-body">
          <h6 class="mb-3">Resumo</h6>
          <p class="d-flex justify-content-between">
            <span>Total</span>
            <strong>R$ <?= number_format($pedido['total'],2,',','.') ?></strong>
          </p>
          <?php if ($cashbackValor > 0): ?>
          <p class="d-flex justify-content-between">
            <span>Cashback gerado</span>
            <strong>R$ <?= number_format($cashbackValor,2,',','.') ?></strong>
          </p>
          <?php endif; ?>
         
          <p><strong>Endereço:</strong><br><?= nl2br(htmlspecialchars($pedido['endereco'])) ?></p>
        </div>
      </div>

      <!-- STATUS -->
      <div class="card rounded-4 shadow-sm mb-3">
        <div class="card-body">
          <h6 class="mb-3">Alterar status</h6>
          <select class="form-select rounded-pill"
                  id="statusSelect"
                  onchange="alterarStatus(this.value)">
            <option value="recebido"   <?= $pedido['status']=='recebido'?'selected':'' ?>>Recebido</option>
            <option value="producao"   <?= $pedido['status']=='producao'?'selected':'' ?>>Produção</option>
            <option value="entrega"    <?= $pedido['status']=='entrega'?'selected':'' ?>>Entrega</option>
            <option value="finalizado" <?= $pedido['status']=='finalizado'?'selected':'' ?>>Finalizado</option>
            <option value="cancelado"  <?= $pedido['status']=='cancelado'?'selected':'' ?>>Cancelado</option>
          </select>
        </div>
      </div>

      <!-- AÇÕES RÁPIDAS -->
      <div class="card rounded-4 shadow-sm">
        <div class="card-body">
          <h6 class="mb-3">Ações rápidas</h6>

          <a href="https://wa.me/55<?= $telefoneWhats ?>?text=<?= $whatsMsg ?>"
             target="_blank"
             class="btn btn-success rounded-pill w-100 mb-2">
            <i class="bi bi-whatsapp me-1"></i> Enviar WhatsApp
          </a>

          <button onclick="window.print()"
                  class="btn btn-outline-dark rounded-pill w-100 mb-2">
            <i class="bi bi-printer me-1"></i> Imprimir pedido
          </button>

          <button onclick="cancelarPedido()"
                  class="btn btn-outline-danger rounded-pill w-100">
            <i class="bi bi-x-circle me-1"></i> Cancelar pedido
          </button>
        </div>
      </div>

    </div>

  </div>
</div>

</main>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<script>
const PEDIDO_DATA = <?= json_encode(['pedidoId' => (int)$pedido['id']], JSON_UNESCAPED_UNICODE) ?>;
</script>
<script src="./assets/js/pedido.js?v=<?= $pedidoJsVer ?>"></script>

</body>
</html>
