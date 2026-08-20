<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$adminId = (int) ($_SESSION['admin_id'] ?? 0);

function mpTabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

function mpGarantirEstrutura(PDO $conn): void {
  static $checked = false;
  if ($checked) return;
  $checked = true;

  $sqlPath = __DIR__ . '/sql/create_materia_prima.sql';
  if (!is_file($sqlPath)) return;

  $sql = (string) file_get_contents($sqlPath);
  $partes = preg_split('/;\s*(?:\r?\n|$)/', $sql);
  foreach ($partes as $parte) {
    $stmtSql = trim($parte);
    if ($stmtSql !== '') {
      $conn->exec($stmtSql);
    }
  }

  try {
    $stmt = $conn->query("SHOW COLUMNS FROM materia_prima_cadastros LIKE 'unidade'");
    $existe = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : false;
    if (!$existe) {
      $conn->exec("ALTER TABLE materia_prima_cadastros ADD COLUMN unidade VARCHAR(40) NOT NULL DEFAULT 'unidade' AFTER quantidade");
    }
  } catch (Throwable $e) {
  }
}

function mpMoeda($valor): string {
  return 'R$ ' . number_format((float) $valor, 2, ',', '.');
}

function mpRedirect(array $params = []): void {
  $qs = $params ? ('?' . http_build_query($params)) : '';
  header('Location: cad_materia_prima.php' . $qs);
  exit;
}

function mpJsonResponse(array $payload): void {
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

mpGarantirEstrutura($conn);

$flash = $_SESSION['materia_prima_flash'] ?? null;
unset($_SESSION['materia_prima_flash']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $action = trim((string) ($_POST['action'] ?? ''));
  try {
    if (!mpTabelaExiste($conn, 'materia_prima_cadastros')) {
      throw new RuntimeException('Tabela de materia-prima nao encontrada.');
    }

    if ($action === 'salvar_materia_prima' || $action === 'editar_materia_prima') {
      $id = (int) ($_POST['id'] ?? 0);
      $nome = trim((string) ($_POST['nome_produto'] ?? ''));
      $dataCompra = trim((string) ($_POST['data_compra'] ?? ''));
      $valorUnitario = (float) ($_POST['valor_unitario'] ?? 0);
      $quantidade = (float) ($_POST['quantidade'] ?? 0);
      $unidade = trim((string) ($_POST['unidade'] ?? 'unidade'));
      $desconto = max(0, (float) ($_POST['desconto'] ?? 0));
      $categoriaId = (int) ($_POST['categoria_id'] ?? 0);
      $subcategoriaId = (int) ($_POST['subcategoria_id'] ?? 0);
      $fornecedor = trim((string) ($_POST['fornecedor'] ?? ''));
      $observacao = trim((string) ($_POST['observacao'] ?? ''));

      if ($nome === '') throw new RuntimeException('Informe o nome do produto.');
      if ($dataCompra === '') throw new RuntimeException('Informe a data da compra.');
      if ($valorUnitario <= 0) throw new RuntimeException('Informe o valor unitario.');
      if ($quantidade <= 0) throw new RuntimeException('Informe a quantidade.');
      if ($unidade === '') $unidade = 'unidade';

      $valorTotal = max(0, ($valorUnitario * $quantidade) - $desconto);

      if ($action === 'salvar_materia_prima') {
        $stmt = $conn->prepare("
          INSERT INTO materia_prima_cadastros
            (loja_id, nome_produto, data_compra, valor_unitario, quantidade, unidade, desconto, categoria_id, subcategoria_id, fornecedor, observacao, valor_total, criado_por)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
          $lojaId,
          $nome,
          $dataCompra,
          $valorUnitario,
          $quantidade,
          $unidade,
          $desconto,
          $categoriaId > 0 ? $categoriaId : null,
          $subcategoriaId > 0 ? $subcategoriaId : null,
          $fornecedor !== '' ? $fornecedor : null,
          $observacao !== '' ? $observacao : null,
          $valorTotal,
          $adminId > 0 ? $adminId : null
        ]);
        $_SESSION['materia_prima_flash'] = ['ok' => true, 'msg' => 'Materia-prima cadastrada com sucesso.'];
      } else {
        if ($id <= 0) throw new RuntimeException('Registro invalido.');
        $stmt = $conn->prepare("
          UPDATE materia_prima_cadastros
             SET nome_produto = ?, data_compra = ?, valor_unitario = ?, quantidade = ?, unidade = ?, desconto = ?, categoria_id = ?, subcategoria_id = ?, fornecedor = ?, observacao = ?, valor_total = ?, atualizado_em = NOW()
           WHERE id = ? AND loja_id = ?
        ");
        $stmt->execute([
          $nome,
          $dataCompra,
          $valorUnitario,
          $quantidade,
          $unidade,
          $desconto,
          $categoriaId > 0 ? $categoriaId : null,
          $subcategoriaId > 0 ? $subcategoriaId : null,
          $fornecedor !== '' ? $fornecedor : null,
          $observacao !== '' ? $observacao : null,
          $valorTotal,
          $id,
          $lojaId
        ]);
        $_SESSION['materia_prima_flash'] = ['ok' => true, 'msg' => 'Cadastro atualizado com sucesso.'];
      }

      mpRedirect();
    }

    if ($action === 'excluir_materia_prima') {
      $id = (int) ($_POST['id'] ?? 0);
      if ($id <= 0) throw new RuntimeException('Registro invalido.');
      $stmt = $conn->prepare("DELETE FROM materia_prima_cadastros WHERE id = ? AND loja_id = ?");
      $stmt->execute([$id, $lojaId]);
      $_SESSION['materia_prima_flash'] = ['ok' => true, 'msg' => 'Registro excluido com sucesso.'];
      mpRedirect();
    }
  } catch (Throwable $e) {
    $_SESSION['materia_prima_flash'] = ['ok' => false, 'msg' => $e->getMessage()];
    mpRedirect();
  }
}

if (isset($_GET['ajax']) && $_GET['ajax'] === 'materia_prima_item') {
  $id = (int) ($_GET['id'] ?? 0);
  if ($id <= 0) {
    mpJsonResponse(['ok' => false, 'msg' => 'Registro invalido.']);
  }
  try {
    $stmt = $conn->prepare("
      SELECT mp.*, c.nome AS categoria_nome, s.nome AS subcategoria_nome
      FROM materia_prima_cadastros mp
      LEFT JOIN entrada_saida_categorias c ON c.id = mp.categoria_id
      LEFT JOIN entrada_saida_subcategorias s ON s.id = mp.subcategoria_id
      WHERE mp.id = ? AND mp.loja_id = ?
      LIMIT 1
    ");
    $stmt->execute([$id, $lojaId]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$item) {
      mpJsonResponse(['ok' => false, 'msg' => 'Registro nao encontrado.']);
    }
    mpJsonResponse(['ok' => true, 'item' => $item]);
  } catch (Throwable $e) {
    mpJsonResponse(['ok' => false, 'msg' => $e->getMessage()]);
  }
}

$categorias = [];
$subcategorias = [];
if (mpTabelaExiste($conn, 'entrada_saida_categorias')) {
  $stmt = $conn->prepare("
    SELECT id, nome, tipo
    FROM entrada_saida_categorias
    WHERE loja_id = ?
      AND ativo = 1
    ORDER BY nome ASC
  ");
  $stmt->execute([$lojaId]);
  $categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);
}
if (mpTabelaExiste($conn, 'entrada_saida_subcategorias') && mpTabelaExiste($conn, 'entrada_saida_categorias')) {
  $stmt = $conn->prepare("
    SELECT s.id, s.nome, s.categoria_id
    FROM entrada_saida_subcategorias s
    JOIN entrada_saida_categorias c ON c.id = s.categoria_id
    WHERE s.loja_id = ?
      AND s.ativo = 1
    ORDER BY s.nome ASC
  ");
  $stmt->execute([$lojaId]);
  $subcategorias = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$q = trim((string) ($_GET['q'] ?? ''));
$categoriaFiltro = (int) ($_GET['categoria_id'] ?? 0);
$dataInicio = trim((string) ($_GET['data_inicio'] ?? ''));
$dataFim = trim((string) ($_GET['data_fim'] ?? ''));
$pagina = max(1, (int) ($_GET['pagina'] ?? 1));
$porPagina = 5;

$where = ["mp.loja_id = ?"];
$params = [$lojaId];
if ($q !== '') {
  $where[] = "(mp.nome_produto LIKE ? OR mp.fornecedor LIKE ? OR mp.observacao LIKE ?)";
  $like = '%' . $q . '%';
  $params[] = $like;
  $params[] = $like;
  $params[] = $like;
}
if ($categoriaFiltro > 0) {
  $where[] = "mp.categoria_id = ?";
  $params[] = $categoriaFiltro;
}
if ($dataInicio !== '') {
  $where[] = "mp.data_compra >= ?";
  $params[] = $dataInicio;
}
if ($dataFim !== '') {
  $where[] = "mp.data_compra <= ?";
  $params[] = $dataFim;
}

$sqlBase = "
  FROM materia_prima_cadastros mp
  LEFT JOIN entrada_saida_categorias c ON c.id = mp.categoria_id
  LEFT JOIN entrada_saida_subcategorias s ON s.id = mp.subcategoria_id
  WHERE " . implode(' AND ', $where);

$stmt = $conn->prepare("SELECT COUNT(*) {$sqlBase}");
$stmt->execute($params);
$totalRegistros = (int) $stmt->fetchColumn();
$paginas = max(1, (int) ceil($totalRegistros / $porPagina));
if ($pagina > $paginas) $pagina = $paginas;
$offset = ($pagina - 1) * $porPagina;

$stmt = $conn->prepare("
  SELECT mp.*, c.nome AS categoria_nome, s.nome AS subcategoria_nome
  {$sqlBase}
  ORDER BY mp.data_compra DESC, mp.id DESC
  LIMIT {$porPagina} OFFSET {$offset}
");
$stmt->execute($params);
$itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stats = [
  'total_compras' => 0.0,
  'total_descontos' => 0.0,
  'total_liquido' => 0.0,
  'total_itens' => 0
];
$hojeMateriaPrima = date('Y-m-d');
if (mpTabelaExiste($conn, 'materia_prima_cadastros')) {
  $stmt = $conn->prepare("
    SELECT
      COUNT(*) AS total_itens,
      COALESCE(SUM(valor_unitario * quantidade),0) AS total_compras,
      COALESCE(SUM(desconto),0) AS total_descontos,
      COALESCE(SUM(valor_total),0) AS total_liquido
    FROM materia_prima_cadastros
    WHERE loja_id = ?
      AND DATE(criado_em) = ?
  ");
  $stmt->execute([$lojaId, $hojeMateriaPrima]);
  $stats = $stmt->fetch(PDO::FETCH_ASSOC) ?: $stats;
}

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$materiaPrimaCssVer = filemtime(__DIR__ . '/assets/css/cad_materia_prima.css');
$materiaPrimaJsVer = filemtime(__DIR__ . '/assets/js/cad_materia_prima.js');
$queryBase = $_GET;
unset($queryBase['pagina']);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Cadastro de materia-prima</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
<link href="./assets/css/cad_materia_prima.css?v=<?= $materiaPrimaCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy materia-prima-page">
<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid py-3">
  <div class="mp-page">
    <div class="mp-header">
      <div>
        <button class="dash-menu-btn mb-3" onclick="toggleSidebar()" aria-label="Abrir menu"><i class="bi bi-list"></i></button>
        <h1 class="mp-title">Cadastro de materia-prima</h1>
        <div class="mp-subtitle">Cadastre os insumos comprados para producao, acompanhe investimento, desconto e total liquido para usar essas informacoes nos lancamentos de saida.</div>
      </div>
      <div class="mp-actions">
        <a href="entrada_saida.php" class="mp-btn-outline"><i class="bi bi-arrow-left-right"></i>Ir para Entrada / saida</a>
      </div>
    </div>

    <?php if ($flash): ?>
      <div class="mp-toast <?= !empty($flash['ok']) ? 'ok' : 'err' ?>" id="mpToastFlash">
        <div class="mp-toast-icon"><i class="bi <?= !empty($flash['ok']) ? 'bi-stars' : 'bi-exclamation-triangle' ?>"></i></div>
        <div>
          <div class="mp-toast-title"><?= !empty($flash['ok']) ? 'Tudo certo por aqui' : 'Algo precisa de atenção' ?></div>
          <div class="mp-toast-text"><?= htmlspecialchars((string) ($flash['msg'] ?? '')) ?></div>
        </div>
        <button type="button" class="mp-toast-close" id="mpToastClose" aria-label="Fechar"><i class="bi bi-x-lg"></i></button>
      </div>
    <?php endif; ?>

    <div class="mp-stats">
      <div class="mp-stat"><div class="mp-stat-label">Compras brutas do dia</div><div class="mp-stat-value"><?= mpMoeda($stats['total_compras']) ?></div></div>
      <div class="mp-stat"><div class="mp-stat-label">Descontos do dia</div><div class="mp-stat-value red"><?= mpMoeda($stats['total_descontos']) ?></div></div>
      <div class="mp-stat"><div class="mp-stat-label">Total liquido do dia</div><div class="mp-stat-value blue"><?= mpMoeda($stats['total_liquido']) ?></div></div>
      <div class="mp-stat"><div class="mp-stat-label">Itens cadastrados hoje</div><div class="mp-stat-value green"><?= (int) $stats['total_itens'] ?></div></div>
    </div>

    <div class="mp-grid-top">
      <div class="mp-card">
        <div class="mp-card-body">
          <form method="post" class="mp-form-grid" id="mpFormCadastro">
            <input type="hidden" name="action" value="salvar_materia_prima">
            <div class="mp-field" style="grid-column:span 2;">
              <label class="mp-label">Nome do produto</label>
              <input type="text" class="form-control mp-input" name="nome_produto" id="mpNomeProduto" placeholder="Ex.: Creme de leite, chocolate, farinha..." required>
            </div>
            <div class="mp-field">
              <label class="mp-label">Data da compra</label>
              <input type="date" class="form-control mp-input" name="data_compra" value="<?= date('Y-m-d') ?>" required>
            </div>
            <div class="mp-field">
              <label class="mp-label">Valor unitario</label>
              <input type="number" step="0.01" min="0" class="form-control mp-input js-mp-unitario" name="valor_unitario" placeholder="0,00" required>
            </div>
            <div class="mp-field">
              <label class="mp-label">Quantidade</label>
              <input type="number" step="0.001" min="0.001" class="form-control mp-input js-mp-quantidade" name="quantidade" value="1" required>
            </div>
            <div class="mp-field">
              <label class="mp-label">Unidade</label>
              <select class="form-select mp-select" name="unidade" required>
                <option value="unidade">Unidade</option>
                <option value="caixa">Caixa</option>
                <option value="fardo">Fardo</option>
              </select>
            </div>
            <div class="mp-field">
              <label class="mp-label">Desconto</label>
              <input type="number" step="0.01" min="0" class="form-control mp-input js-mp-desconto" name="desconto" value="0">
            </div>
            <div class="mp-field">
              <label class="mp-label">Fornecedor</label>
              <input type="text" class="form-control mp-input" name="fornecedor" placeholder="Fornecedor">
            </div>
            <div class="mp-field">
              <label class="mp-label">Categoria</label>
              <select class="form-select mp-select" name="categoria_id" id="mpCategoriaSelect">
                <option value="">Selecione</option>
                <?php foreach ($categorias as $categoria): ?>
                  <option value="<?= (int) $categoria['id'] ?>"><?= htmlspecialchars($categoria['nome']) ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="mp-field">
              <label class="mp-label">Subcategoria</label>
              <select class="form-select mp-select" name="subcategoria_id" id="mpSubcategoriaSelect">
                <option value="">Selecione</option>
                <?php foreach ($subcategorias as $sub): ?>
                  <option value="<?= (int) $sub['id'] ?>" data-categoria="<?= (int) $sub['categoria_id'] ?>"><?= htmlspecialchars($sub['nome']) ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="mp-field" style="grid-column:1/-1;">
              <label class="mp-label">Observacao</label>
              <textarea class="form-control mp-textarea" name="observacao" placeholder="Observacoes da compra, lote, vencimento, condicoes especiais..."></textarea>
            </div>
            <div class="mp-field" style="grid-column:1/-1;">
              <button type="submit" class="mp-btn-primary mp-submit"><i class="bi bi-plus-circle"></i>Salvar materia-prima</button>
            </div>
          </form>
        </div>
      </div>

      <div class="mp-side-note">
        <div class="mp-card">
          <div class="mp-card-body">
            <div class="mp-tip-title">Resumo do lancamento</div>
            <p>Use quantidade e desconto para registrar o custo liquido real da compra. As categorias e subcategorias reaproveitam o cadastro ja criado na tela de Entrada / saida.</p>
            <div class="mp-calc">
              <div class="mp-calc-box">
                <div class="mp-calc-label">Bruto</div>
                <div class="mp-calc-value" id="mpCalcBruto">R$ 0,00</div>
              </div>
              <div class="mp-calc-box">
                <div class="mp-calc-label">Desconto</div>
                <div class="mp-calc-value pink" id="mpCalcDesconto">R$ 0,00</div>
              </div>
              <div class="mp-calc-box">
                <div class="mp-calc-label">Liquido</div>
                <div class="mp-calc-value blue" id="mpCalcLiquido">R$ 0,00</div>
              </div>
            </div>
          </div>
        </div>
        <div class="mp-card">
          <div class="mp-card-body">
            <div class="mp-tip-title">Como usar depois</div>
            <p>Os registros ficam salvos no banco e podem servir como base operacional para conferencias, compras e futuros lancamentos de saida em Entrada / saida.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="mp-card mp-table-card" id="mpTableSection">
      <div class="mp-table-head">
        <div class="mp-table-title-wrap">
          <div class="mp-title" style="font-size:1rem;">Cadastros de matéria-prima</div>
          <div class="mp-subtitle" style="font-size:.82rem;">Visualize, filtre e acompanhe os itens já cadastrados.</div>
        </div>
        <button type="button" class="mp-btn-outline mp-table-toggle" id="mpTableToggleBtn"><i class="bi bi-eye"></i><span>Ocultar tabela</span></button>
      </div>
      <div class="mp-table-panel" id="mpTablePanel">
      <form method="get" class="mp-filters" id="mpFiltersForm">
        <div class="mp-field">
          <label class="mp-label">Buscar</label>
          <input type="text" class="form-control mp-input" id="mpFilterSearch" name="q" value="<?= htmlspecialchars($q) ?>" placeholder="Produto, fornecedor ou observacao...">
        </div>

        <div class="mp-field">
          <label class="mp-label">Categoria</label>
          <div class="mp-custom-select" data-mp-custom-select>
            <input type="hidden" class="mp-custom-native" name="categoria_id" value="<?= (int) $categoriaFiltro ?>">

            <button type="button" class="mp-custom-trigger" data-mp-custom-trigger>
              <span class="mp-custom-label"><?= $categoriaFiltro > 0 ? htmlspecialchars((string) (($categorias[array_search($categoriaFiltro, array_column($categorias, 'id'))]['nome'] ?? 'Categoria'))) : 'Todas' ?></span>
            </button>

            <i class="bi bi-chevron-down mp-custom-icon"></i>
            <div class="mp-custom-menu" data-mp-custom-menu>
              <button type="button" class="mp-custom-option <?= $categoriaFiltro === 0 ? 'active' : '' ?>" data-value="0" data-label="Todas">
                <span>Todas</span><i class="bi bi-check2 mp-custom-option-check"></i>
              </button>
              <?php foreach ($categorias as $categoria): ?>
                <button type="button" class="mp-custom-option <?= $categoriaFiltro === (int) $categoria['id'] ? 'active' : '' ?>" data-value="<?= (int) $categoria['id'] ?>" data-label="<?= htmlspecialchars($categoria['nome'], ENT_QUOTES) ?>">
                  <span><?= htmlspecialchars($categoria['nome']) ?></span><i class="bi bi-check2 mp-custom-option-check"></i>
                </button>
              <?php endforeach; ?>
            </div>
          </div>
        </div>

        <div class="mp-field">
          <label class="mp-label">Periodo</label>
          <div class="mp-periodo">
            <input type="date" class="form-control mp-input" name="data_inicio" value="<?= htmlspecialchars($dataInicio) ?>">
            <input type="date" class="form-control mp-input" name="data_fim" value="<?= htmlspecialchars($dataFim) ?>">
          </div>
        </div>
        <div class="mp-field d-flex justify-content-end">
          <a href="cad_materia_prima.php" class="mp-btn-outline"><i class="bi bi-arrow-counterclockwise"></i>Limpar</a>
        </div>
      </form>

      <div class="mp-table-wrap">
        <table class="mp-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Fornecedor</th>
              <th>Categoria</th>
              <th>Subcategoria</th>
              <th>Qtd</th>
              <th>Unidade</th>
              <th>V. unitario</th>
              <th>Desconto</th>
              <th>Total</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            <?php if (!$itens): ?>
              <tr><td colspan="11" class="mp-empty">Nenhuma materia-prima cadastrada.</td></tr>
            <?php else: foreach ($itens as $row): ?>
              <tr>
                <td><?= htmlspecialchars(date('d/m/Y', strtotime((string) $row['data_compra']))) ?></td>
                <td>
                  <strong><?= htmlspecialchars($row['nome_produto']) ?></strong>
                  <?php if (!empty($row['observacao'])): ?>
                    <div class="mp-muted"><?= htmlspecialchars(mb_strimwidth((string) $row['observacao'], 0, 72, '...')) ?></div>
                  <?php endif; ?>
                </td>
                <td><?= htmlspecialchars((string) ($row['fornecedor'] ?: '—')) ?></td>
                <td><?= htmlspecialchars((string) ($row['categoria_nome'] ?: '—')) ?></td>
                <td><?= htmlspecialchars((string) ($row['subcategoria_nome'] ?: '—')) ?></td>
                <td><span class="mp-pill"><?= rtrim(rtrim(number_format((float) $row['quantidade'], 3, ',', '.'), '0'), ',') ?></span></td>
                <td><?= htmlspecialchars((string) ($row['unidade'] ?: 'unidade')) ?></td>
                <td><?= mpMoeda($row['valor_unitario']) ?></td>
                <td><?= mpMoeda($row['desconto']) ?></td>
                <td><strong><?= mpMoeda($row['valor_total']) ?></strong></td>
                <td>
                  <div class="mp-actions-row">
                    <?php
                      $descricaoSaida = 'Materia-prima: ' . $row['nome_produto'];
                      if (!empty($row['fornecedor'])) {
                        $descricaoSaida .= ' - ' . $row['fornecedor'];
                      }
                      $saidaUrl = 'entrada_saida.php?' . http_build_query([
                        'prefill_from' => 'materia_prima',
                        'prefill_tipo' => 'saida',
                        'prefill_data' => $row['data_compra'],
                        'prefill_descricao' => $descricaoSaida,
                        'prefill_valor' => $row['valor_total'],
                        'prefill_quantidade' => 1,
                        'prefill_categoria_id' => (int) ($row['categoria_id'] ?? 0),
                        'prefill_subcategoria_id' => (int) ($row['subcategoria_id'] ?? 0),
                      ]);
                    ?>
                    <a href="<?= htmlspecialchars($saidaUrl) ?>" class="mp-launch-btn">
                      <i class="bi bi-arrow-up-right-circle"></i>
                      <span>Lançar saída</span>
                    </a>
                    <button
                      type="button"
                      class="mp-icon-btn js-mp-edit"
                      data-id="<?= (int) $row['id'] ?>"
                      data-nome="<?= htmlspecialchars($row['nome_produto'], ENT_QUOTES) ?>"
                      data-data="<?= htmlspecialchars((string) $row['data_compra'], ENT_QUOTES) ?>"
                      data-unitario="<?= htmlspecialchars((string) $row['valor_unitario'], ENT_QUOTES) ?>"
                      data-quantidade="<?= htmlspecialchars((string) $row['quantidade'], ENT_QUOTES) ?>"
                      data-unidade="<?= htmlspecialchars((string) ($row['unidade'] ?? 'unidade'), ENT_QUOTES) ?>"
                      data-desconto="<?= htmlspecialchars((string) $row['desconto'], ENT_QUOTES) ?>"
                      data-categoria-id="<?= (int) ($row['categoria_id'] ?? 0) ?>"
                      data-categoria="<?= (int) ($row['categoria_id'] ?? 0) ?>"
                      data-categoria-nome="<?= htmlspecialchars((string) ($row['categoria_nome'] ?? ''), ENT_QUOTES) ?>"
                      data-subcategoria-id="<?= (int) ($row['subcategoria_id'] ?? 0) ?>"
                      data-subcategoria="<?= (int) ($row['subcategoria_id'] ?? 0) ?>"
                      data-subcategoria-nome="<?= htmlspecialchars((string) ($row['subcategoria_nome'] ?? ''), ENT_QUOTES) ?>"
                      data-fornecedor="<?= htmlspecialchars((string) ($row['fornecedor'] ?? ''), ENT_QUOTES) ?>"
                      data-observacao="<?= htmlspecialchars((string) ($row['observacao'] ?? ''), ENT_QUOTES) ?>"
                    ><i class="bi bi-pencil"></i></button>
                    <button type="button" class="mp-icon-btn js-mp-delete" data-id="<?= (int) $row['id'] ?>"><i class="bi bi-trash"></i></button>
                  </div>
                </td>
              </tr>
            <?php endforeach; endif; ?>
          </tbody>
        </table>
      </div>

      <?php if ($totalRegistros > $porPagina): ?>
        <div class="mp-pagination">
          <div class="mp-pagination-info">Mostrando <?= $totalRegistros ? ($offset + 1) : 0 ?>–<?= min($offset + $porPagina, $totalRegistros) ?> de <?= $totalRegistros ?> registros</div>
          <div class="mp-pagination-nav">
            <?php $mkUrl = function(int $p) use ($queryBase): string { return 'cad_materia_prima.php?' . http_build_query(array_merge($queryBase, ['pagina' => $p])); }; ?>
            <a class="mp-page-btn <?= $pagina <= 1 ? 'disabled' : '' ?>" href="<?= $pagina <= 1 ? '#' : htmlspecialchars($mkUrl($pagina - 1)) ?>"><i class="bi bi-chevron-left"></i></a>
            <?php for ($p = 1; $p <= $paginas; $p++): ?>
              <a class="mp-page-btn <?= $p === $pagina ? 'active' : '' ?>" href="<?= htmlspecialchars($mkUrl($p)) ?>"><?= $p ?></a>
            <?php endfor; ?>
            <a class="mp-page-btn <?= $pagina >= $paginas ? 'disabled' : '' ?>" href="<?= $pagina >= $paginas ? '#' : htmlspecialchars($mkUrl($pagina + 1)) ?>"><i class="bi bi-chevron-right"></i></a>
          </div>
        </div>
      <?php endif; ?>
      </div>
    </div>

    <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
  </div>
</div>

<form method="post" id="mpDeleteForm" class="d-none">
  <input type="hidden" name="action" value="excluir_materia_prima">
  <input type="hidden" name="id" id="mpDeleteId">
</form>

<div class="modal fade mp-modal" id="modalEditarMateriaPrima" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h5 class="modal-title">Editar materia-prima</h5>
          <div class="mp-subtitle" style="margin-top:2px;">Atualize os dados da compra sem perder o historico.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <form method="post" id="mpEditForm">
        <div class="modal-body">
          <input type="hidden" name="action" value="editar_materia_prima">
          <input type="hidden" name="id" id="mpEditId">
          <div class="mp-modal-grid">
            <div class="mp-field" style="grid-column:span 2;">
              <label class="mp-label">Nome do produto</label>
              <input type="text" class="form-control mp-input" name="nome_produto" id="mpEditNome" required>
            </div>
            <div class="mp-field">
              <label class="mp-label">Data da compra</label>
              <input type="date" class="form-control mp-input" name="data_compra" id="mpEditData" required>
            </div>
            <div class="mp-field">
              <label class="mp-label">Fornecedor</label>
              <input type="text" class="form-control mp-input" name="fornecedor" id="mpEditFornecedor">
            </div>
            <div class="mp-field">
              <label class="mp-label">Valor unitario</label>
              <input type="number" step="0.01" min="0" class="form-control mp-input js-mp-unitario" name="valor_unitario" id="mpEditUnitario" required>
            </div>
            <div class="mp-field">
              <label class="mp-label">Quantidade</label>
              <input type="number" step="0.001" min="0.001" class="form-control mp-input js-mp-quantidade" name="quantidade" id="mpEditQuantidade" required>
            </div>
            <div class="mp-field">
              <label class="mp-label">Unidade</label>
              <select class="form-select mp-select" name="unidade" id="mpEditUnidade" required>
                <option value="unidade">Unidade</option>
                <option value="caixa">Caixa</option>
                <option value="fardo">Fardo</option>
              </select>
            </div>
            <div class="mp-field">
              <label class="mp-label">Desconto</label>
              <input type="number" step="0.01" min="0" class="form-control mp-input js-mp-desconto" name="desconto" id="mpEditDesconto">
            </div>
            <div class="mp-field">
              <label class="mp-label">Categoria</label>
              <select class="form-select mp-select" name="categoria_id" id="mpEditCategoria">
                <option value="">Selecione</option>
                <?php foreach ($categorias as $categoria): ?>
                  <option value="<?= (int) $categoria['id'] ?>"><?= htmlspecialchars($categoria['nome']) ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="mp-field">
              <label class="mp-label">Subcategoria</label>
              <select class="form-select mp-select" name="subcategoria_id" id="mpEditSubcategoria">
                <option value="">Selecione</option>
                <?php foreach ($subcategorias as $sub): ?>
                  <option value="<?= (int) $sub['id'] ?>" data-categoria="<?= (int) $sub['categoria_id'] ?>"><?= htmlspecialchars($sub['nome']) ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="mp-field" style="grid-column:1/-1;">
              <label class="mp-label">Observacao</label>
              <textarea class="form-control mp-textarea" name="observacao" id="mpEditObservacao"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="mp-btn-outline" data-bs-dismiss="modal">Cancelar</button>
          <button type="submit" class="mp-btn-primary">Salvar alteracoes</button>
        </div>
      </form>
    </div>
  </div>
</div>

<div class="modal fade mp-modal" id="modalExcluirMateriaPrima" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:420px;">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Excluir registro</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body">
        <div class="mp-subtitle" style="margin-top:0;">Tem certeza que deseja excluir esta materia-prima cadastrada?</div>
      </div>
      <div class="modal-footer">
        <button type="button" class="mp-btn-outline" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="mp-btn-danger" id="mpDeleteConfirmBtn">Sim, excluir</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/cad_materia_prima.js?v=<?= $materiaPrimaJsVer ?>"></script>
</body>
</html>
