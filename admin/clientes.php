<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.clientes');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$busca  = trim($_GET['busca'] ?? '');
$pagina = max(1, (int)($_GET['pagina'] ?? 1));
$limite = 10;
$offset = ($pagina - 1) * $limite;

$where  = 'WHERE c.loja_id = ?';
$params = [$lojaId];
$buscaTel = preg_replace('/\D+/', '', $busca);

if ($busca !== '') {
  $whereParts = ["c.nome LIKE ?"];
  $params[] = "%$busca%";
  if ($buscaTel !== '') {
    $whereParts[] = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.telefone,'(',''),')',''),'-',''),' ',''),'+','') LIKE ?";
    $params[] = "%$buscaTel%";
  }
  $where = "WHERE c.loja_id = ? AND (" . implode(' OR ', $whereParts) . ")";
}

/* TOTAL */
$stmt = $conn->prepare("
  SELECT COUNT(*)
  FROM clientes c
  $where
");
$stmt->execute($params);
$total = $stmt->fetchColumn();
$paginas = ceil($total / $limite);

$clientesColunas = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$temCashbackSaldoCliente = in_array('cashback_saldo', $clientesColunas, true);
$temPontosSaldoCliente = in_array('pontos_saldo', $clientesColunas, true);
$temPontosCliente = in_array('pontos', $clientesColunas, true);
$temSaldoFiadoCliente = in_array('saldo_fiado', $clientesColunas, true);
$selectCashbackSaldo = $temCashbackSaldoCliente ? 'c.cashback_saldo' : '0 AS cashback_saldo';
$selectPontosSaldo = $temPontosSaldoCliente
  ? 'c.pontos_saldo AS pontos_saldo'
  : ($temPontosCliente ? 'c.pontos AS pontos_saldo' : '0 AS pontos_saldo');
$selectSaldoFiado = $temSaldoFiadoCliente ? 'c.saldo_fiado' : '0 AS saldo_fiado';

/* LISTA */
$stmt = $conn->prepare("
  SELECT
    c.id,
    c.nome,
    c.telefone,
    c.endereco,
    c.aniversario,
    c.cep,
    c.rua,
    c.numero,
    c.bairro,
    c.cidade,
    c.estado,
    c.complemento,
    c.criado_em,
    $selectCashbackSaldo,
    $selectPontosSaldo,
    $selectSaldoFiado,
    COUNT(p.id) AS total_pedidos,
    IFNULL(SUM(p.total),0) AS total_gasto
  FROM clientes c
  LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.status = 'finalizado' AND p.loja_id = c.loja_id
  $where
  GROUP BY c.id
  ORDER BY total_gasto DESC
  LIMIT $limite OFFSET $offset
");
$stmt->execute($params);
$clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$clientesCssVer = filemtime(__DIR__ . '/assets/css/clientes.css');
$clientesJsVer = filemtime(__DIR__ . '/assets/js/clientes.js');

function montarEnderecoTexto($c){
  $partes = [];
  $rua = trim($c['rua'] ?? '');
  $numero = trim($c['numero'] ?? '');
  $bairro = trim($c['bairro'] ?? '');
  $cidade = trim($c['cidade'] ?? '');
  $estado = trim($c['estado'] ?? '');
  $cep = trim($c['cep'] ?? '');
  $complemento = trim($c['complemento'] ?? '');

  if ($rua !== '') {
    $partes[] = $numero !== '' ? "{$rua}, {$numero}" : $rua;
  }
  if ($bairro !== '') $partes[] = $bairro;
  $cidadeEstado = trim($cidade . ($estado ? " / {$estado}" : ''));
  if ($cidadeEstado !== '') $partes[] = $cidadeEstado;
  if ($cep !== '') $partes[] = $cep;
  if ($complemento !== '') $partes[] = $complemento;

  $texto = implode(' - ', $partes);
  return $texto !== '' ? $texto : ($c['endereco'] ?? '-');
}

function renderClientesResultados($clientes, $paginas, $pagina, $busca){
  ?>
  <div class="rc-card">
    <div class="rc-table-wrap">
      <table class="rc-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Aniversário</th>
            <th>Cashback </th>
            <th>Pontos</th>
            <th>Endereco</th>
          </tr>
        </thead>
        <tbody>
        <?php foreach($clientes as $c):
          $enderecoTexto = montarEnderecoTexto($c);
          $aniversarioTexto = !empty($c['aniversario'])
            ? date('d/m/Y', strtotime($c['aniversario']))
            : 'Nao informado';
        ?>
          <tr data-id="<?= $c['id'] ?>">
            <td class="td-nome">
              <button type="button" class="rc-btn-link js-editar-cliente"
                      data-id="<?= $c['id'] ?>"
                      data-nome="<?= htmlspecialchars($c['nome']) ?>"
                      data-telefone="<?= htmlspecialchars($c['telefone']) ?>"
                      data-endereco="<?= htmlspecialchars($c['endereco'] ?? '') ?>"
                      data-aniversario="<?= htmlspecialchars($c['aniversario'] ?? '') ?>"
                      data-cep="<?= htmlspecialchars($c['cep'] ?? '') ?>"
                      data-rua="<?= htmlspecialchars($c['rua'] ?? '') ?>"
                      data-numero="<?= htmlspecialchars($c['numero'] ?? '') ?>"
                      data-bairro="<?= htmlspecialchars($c['bairro'] ?? '') ?>"
                      data-cidade="<?= htmlspecialchars($c['cidade'] ?? '') ?>"
                      data-estado="<?= htmlspecialchars($c['estado'] ?? '') ?>"
                      data-complemento="<?= htmlspecialchars($c['complemento'] ?? '') ?>"
                      data-cashback="<?= (float) ($c['cashback_saldo'] ?? 0) ?>"
                      data-pontos="<?= (int) ($c['pontos_saldo'] ?? 0) ?>"
                      data-saldo-fiado="<?= (float) ($c['saldo_fiado'] ?? 0) ?>">
                <?= htmlspecialchars($c['nome']) ?>
              </button>
            </td>
            <td>
              <button type="button" class="rc-btn-link clientes-telefone js-detalhe-cliente"
                      data-id="<?= $c['id'] ?>"
                      data-nome="<?= htmlspecialchars($c['nome']) ?>"
                      data-telefone="<?= htmlspecialchars($c['telefone']) ?>"
                      data-endereco="<?= htmlspecialchars($enderecoTexto) ?>"
                      data-aniversario="<?= htmlspecialchars($c['aniversario'] ?? '') ?>"
                      data-cep="<?= htmlspecialchars($c['cep'] ?? '') ?>"
                      data-rua="<?= htmlspecialchars($c['rua'] ?? '') ?>"
                      data-numero="<?= htmlspecialchars($c['numero'] ?? '') ?>"
                      data-bairro="<?= htmlspecialchars($c['bairro'] ?? '') ?>"
                      data-cidade="<?= htmlspecialchars($c['cidade'] ?? '') ?>"
                      data-estado="<?= htmlspecialchars($c['estado'] ?? '') ?>"
                      data-complemento="<?= htmlspecialchars($c['complemento'] ?? '') ?>"
                      data-total-pedidos="<?= (int)$c['total_pedidos'] ?>"
                      data-total-gasto="<?= (float)$c['total_gasto'] ?>"
                      data-criado-em="<?= htmlspecialchars($c['criado_em'] ?? '') ?>"
                      data-cashback="<?= (float) ($c['cashback_saldo'] ?? 0) ?>"
                      data-pontos="<?= (int) ($c['pontos_saldo'] ?? 0) ?>"
                      data-saldo-fiado="<?= (float) ($c['saldo_fiado'] ?? 0) ?>">
                <?= htmlspecialchars($c['telefone']) ?>
              </button>
            </td>
            <td><?= htmlspecialchars($aniversarioTexto) ?></td>
            <td>R$ <?= number_format((float) ($c['cashback_saldo'] ?? 0), 2, ',', '.') ?></td>
            <td><?= (int) ($c['pontos_saldo'] ?? 0) ?> pts</td>
            <td><?= htmlspecialchars($enderecoTexto) ?></td>
          </tr>
        <?php endforeach; ?>
        <?php if(!$clientes): ?>
          <tr><td colspan="6" class="rc-empty"><i class="bi bi-people"></i>Nenhum cliente encontrado</td></tr>
        <?php endif; ?>
        </tbody>
      </table>
    </div>
    <?php if($paginas > 1): ?>
    <div class="rc-footer">
      <div class="rc-pagination">
        <a class="rc-page-btn" href="?pagina=1&busca=<?= urlencode($busca) ?>" <?= $pagina<=1?'style="opacity:.4;pointer-events:none"':'' ?>>«</a>
        <a class="rc-page-btn" href="?pagina=<?= max(1,$pagina-1) ?>&busca=<?= urlencode($busca) ?>" <?= $pagina<=1?'style="opacity:.4;pointer-events:none"':'' ?>>‹</a>
        <span class="rc-page-label">Página <?= $pagina ?> de <?= max(1,$paginas) ?></span>
        <a class="rc-page-btn" href="?pagina=<?= min($paginas,$pagina+1) ?>&busca=<?= urlencode($busca) ?>" <?= $pagina>=$paginas?'style="opacity:.4;pointer-events:none"':'' ?>>›</a>
        <a class="rc-page-btn" href="?pagina=<?= $paginas ?>&busca=<?= urlencode($busca) ?>" <?= $pagina>=$paginas?'style="opacity:.4;pointer-events:none"':'' ?>>»</a>
      </div>
    </div>
    <?php endif; ?>
  </div>
  <?php
}

if (isset($_GET['ajax']) && $_GET['ajax'] === '1') {
  renderClientesResultados($clientes, $paginas, $pagina, $busca);
  exit;
}



?>


<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Clientes </title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

<link href="./assets/css/clientes.css?v=<?= $clientesCssVer ?>" rel="stylesheet">

</head>
<body class="dash-diggy">

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid clientes-page">
  <div class="clientes-header">
    <div>
      <h1 class="clientes-title">Clientes</h1>
      <p class="clientes-subtitle">Aqui voce cadastra e gerencia seus clientes.</p>
    </div>
    <button type="button" class="btn btn-clientes" id="btnNovoCliente">
      Cadastrar cliente
    </button>
  </div>

  <div class="rc-card" style="margin-bottom:16px">
    <div class="rc-filters">
      <div class="rc-filters-head"><i class="bi bi-funnel-fill"></i> Filtros</div>
      <div class="rc-filters-row">
        <div class="rc-filter-group">
          <span class="rc-filter-label">Nome ou telefone</span>
          <form class="rc-filter-search-wrap" method="get" action="clientes.php">
            <input class="rc-filter-input" type="search" name="busca"
                   value="<?= htmlspecialchars($busca) ?>"
                   placeholder="Pesquise pelo nome ou telefone">
            <i class="bi bi-search rc-filter-search-icon"></i>
          </form>
        </div>
      </div>
    </div>
  </div>

  <div id="clientesResultados" class="clientes-results">
    <?php renderClientesResultados($clientes, $paginas, $pagina, $busca); ?>
  </div>
  <div class="clientes-skeleton" id="clientesSkeleton" aria-hidden="true">
    <div class="clientes-skeleton-card">
      <div class="clientes-skeleton-head">
        <div class="clientes-skeleton-line md"></div>
        <div class="clientes-skeleton-line md"></div>
        <div class="clientes-skeleton-line md"></div>
        <div class="clientes-skeleton-line md"></div>
        <div class="clientes-skeleton-line md"></div>
      </div>
      <?php for ($i = 0; $i < 6; $i++): ?>
        <div class="clientes-skeleton-row">
          <div class="clientes-skeleton-line"></div>
          <div class="clientes-skeleton-line"></div>
          <div class="clientes-skeleton-line sm"></div>
          <div class="clientes-skeleton-line sm"></div>
          <div class="clientes-skeleton-line"></div>
        </div>
      <?php endfor; ?>
    </div>
  </div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>

<div class="modal fade clientes-modal" id="modalClienteEdit" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Criar cliente</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body clientes-modal-body">
        <input type="hidden" id="clienteEditId">
        <div class="clientes-modal-section">
          <h6>Dados do cliente</h6>
          <div class="mb-3">
            <label class="form-label">Nome do cliente *</label>
            <input type="text" class="form-control" id="clienteEditNome" placeholder="Ex.: Felipe">
            <div class="invalid-feedback" id="clienteEditNomeErro"></div>
          </div>
          <div class="mb-3">
            <label class="form-label">Numero de contato *</label>
            <input type="text" class="form-control" id="clienteEditTelefone" placeholder="Ex.: (11) 9 3232-5454">
            <div class="invalid-feedback" id="clienteEditTelefoneErro"></div>
          </div>
          <div class="mb-3">
            <label class="form-label">Aniversario do cliente</label>
            <input type="date" class="form-control" id="clienteEditAniversario">
          </div>
        </div>

        <div class="clientes-modal-section">
          <h6>Endereco</h6>
          <div class="mb-3">
            <label class="form-label">CEP</label>
            <input type="text" class="form-control" id="clienteEditCep" placeholder="Ex.: 00000-000">
          </div>
          <div class="row g-2 mb-3">
            <div class="col-8">
              <label class="form-label">Rua</label>
              <input type="text" class="form-control" id="clienteEditRua" placeholder="Ex.: Santa Efigenia">
            </div>
            <div class="col-4">
              <label class="form-label">Numero</label>
              <input type="text" class="form-control" id="clienteEditNumero" placeholder="Ex.: 123">
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label">Bairro</label>
              <input type="text" class="form-control" id="clienteEditBairro" placeholder="Bairro">
            </div>
            <div class="col-6">
              <label class="form-label">Cidade</label>
              <input type="text" class="form-control" id="clienteEditCidade" placeholder="Cidade">
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label">Estado</label>
              <input type="text" class="form-control" id="clienteEditEstado" placeholder="Estado">
            </div>
            <div class="col-6">
              <label class="form-label">Complemento</label>
              <input type="text" class="form-control" id="clienteEditComplemento" placeholder="Complemento">
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer border-0">
        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-primary" id="clienteEditSalvar">Salvar</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade clientes-modal" id="modalClientePerfil" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content cliente-perfil-modal">
      <div class="modal-header">
        <div class="cliente-perfil-header">
          <div class="cliente-avatar" id="clientePerfilAvatar">C</div>
          <div>
            <div class="cliente-perfil-nome" id="clientePerfilNome">Cliente</div>
            <div class="cliente-perfil-desde" id="clientePerfilDesde">Cliente desde: -</div>
          </div>
        </div>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body cliente-perfil-body">
        <div class="cliente-perfil-tabs" id="clientePerfilTabs">
          <button type="button" class="cliente-tab active" data-tab="perfil">
            <i class="bi bi-person"></i> Perfil
          </button>
          <button type="button" class="cliente-tab" data-tab="pedidos">
            <i class="bi bi-receipt"></i> Pedidos
          </button>
          <button type="button" class="cliente-tab" data-tab="avaliacoes">
            <i class="bi bi-star"></i> Avaliacoes
          </button>
        </div>

        <div class="cliente-tab-content active" data-tab-pane="perfil">
          <div class="cliente-kpis">
            <div class="cliente-kpi-card">
              <div class="d-flex align-items-center mb-1">
                <i class="bi bi-cash-stack"></i>
                <div class="cliente-kpi-valor" id="clientePerfilCashback">R$ 0,00</div>
              </div>
              <div class="cliente-kpi-label">cashback acumulado</div>
            </div>
            <div class="cliente-kpi-card">
              <div class="d-flex align-items-center mb-1">
                <i class="bi bi-graph-up"></i>
                <div class="cliente-kpi-valor" id="clientePerfilTicket">R$ 0,00</div>
              </div>
              <div class="cliente-kpi-label">ticket medio</div>
            </div>
            <div class="cliente-kpi-card">
              <div class="d-flex align-items-center mb-1">
                <i class="bi bi-wallet2"></i>
                <div class="cliente-kpi-valor" id="clientePerfilFiado">R$ 0,00</div>
              </div>
              <div class="cliente-kpi-label">saldo fiado</div>
            </div>
            <div class="cliente-kpi-card">
              <div class="d-flex align-items-center mb-1">
                <i class="bi bi-receipt-cutoff"></i>
                <div class="cliente-kpi-valor" id="clientePerfilPedidos">0</div>
              </div>
              <div class="cliente-kpi-label">pedidos feitos</div>
            </div>
            <div class="cliente-kpi-card">
              <div class="d-flex align-items-center mb-1">
                <i class="bi bi-calendar-check"></i>
                <div class="cliente-kpi-valor" id="clientePerfilUltimoPedido">-</div>
              </div>
              <div class="cliente-kpi-label">ultimo pedido</div>
            </div>
            <div class="cliente-kpi-card">
              <div class="d-flex align-items-center mb-1">
                <i class="bi bi-star"></i>
                <div class="cliente-kpi-valor" id="clientePerfilAvaliacao">Sem dados</div>
              </div>
              <div class="cliente-kpi-label">avaliacao media</div>
            </div>
          </div>

          <div class="cliente-pessoais">
            <h6>Informacoes pessoais</h6>
            <div class="cliente-info-item">
              <span>Telefone</span>
              <strong id="clientePerfilTelefone">-</strong>
            </div>
            <div class="cliente-info-item">
              <span>Endereco</span>
              <strong id="clientePerfilEndereco">-</strong>
            </div>
          </div>
        </div>

        <div class="cliente-tab-content" data-tab-pane="pedidos">
          <div class="cliente-pedidos">
            <div class="cliente-pedidos-title">Pedidos feitos pelo cliente</div>
            <div class="cliente-pedidos-filtros">
              <div class="cliente-pedidos-filtro">
                <label for="clientePedidosPeriodo">Periodo dos pedidos</label>
                <select id="clientePedidosPeriodo">
                  <option value="7">7 dias</option>
                  <option value="15">15 dias</option>
                  <option value="30" selected>30 dias</option>
                  <option value="60">60 dias</option>
                </select>
              </div>
              <div class="cliente-pedidos-filtro">
                <label for="clientePedidosTipo">Tipo do pedido</label>
                <select id="clientePedidosTipo">
                  <option value="todos" selected>Todos os tipos</option>
                  <option value="entrega">Entrega</option>
                  <option value="retirada">Retirada</option>
                  <option value="mesa">Mesa</option>
                </select>
              </div>
            </div>
            <div id="clientePedidosLista"></div>
            <div class="cliente-pedidos-pagination" id="clientePedidosPaginacao"></div>
          </div>
        </div>
        <div class="cliente-tab-content" data-tab-pane="avaliacoes">
          <div class="cliente-pedidos-title">Avaliacoes feitas pelo cliente</div>
          <div class="cliente-avaliacoes-box">
            <i class="bi bi-chat-dots"></i>
            <span>Este cliente ainda nao deixou nenhuma avaliacao.</span>
          </div>
        </div>
      </div>
      <div class="modal-footer border-0 cliente-perfil-footer">
  
        <button class="btn btn-primary" type="button" id="clientePerfilEditar">Editar cliente</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade clientes-modal" id="modalPedidoDetalhe" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
    <div class="modal-content pedido-detalhe-modal">
      <div class="modal-header">
        <div class="pedido-detalhe-header w-100">
          <h5 id="pedidoDetalheNumero">Pedido N. -</h5>
          <div class="pedido-detalhe-actions">
            <a class="btn btn-outline-secondary btn-sm" href="#" id="pedidoDetalheEditar" target="_blank">
              <i class="bi bi-pencil"></i> Editar pedido
            </a>
            <button class="btn btn-outline-secondary btn-sm" type="button" id="pedidoDetalheImprimir">
              <i class="bi bi-printer"></i> Imprimir
            </button>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div class="pedido-detalhe-tempo" id="pedidoDetalheTempo">feito ha -</div>

        <div class="pedido-detalhe-grid">
          <div class="pedido-detalhe-item">
            <span>Horario do pedido</span>
            <strong id="pedidoDetalheHorario">-</strong>
          </div>
          <div class="pedido-detalhe-item">
            <span>Status do pedido</span>
            <strong class="pedido-detalhe-status" id="pedidoDetalheStatus">-</strong>
          </div>
          <div class="pedido-detalhe-item">
            <span>Nome do cliente</span>
            <strong id="pedidoDetalheCliente">-</strong>
          </div>
          <div class="pedido-detalhe-item">
            <span>Telefone</span>
            <strong id="pedidoDetalheTelefone">-</strong>
          </div>
        </div>

        <div class="pedido-detalhe-actions-row">
          <a class="btn btn-outline-secondary btn-sm" href="#" id="pedidoDetalheContato">
            <i class="bi bi-telephone"></i> Entrar em contato com o cliente
          </a>
          <a class="btn btn-outline-secondary btn-sm" href="#" id="pedidoDetalheWhatsapp" target="_blank">
            <i class="bi bi-whatsapp"></i> Enviar pedido ao WhatsApp
          </a>
        </div>

        <div class="pedido-detalhe-section">
          <div class="pedido-detalhe-section-title" id="pedidoDetalheTipoTitulo">ENTREGA</div>
          <div class="pedido-detalhe-item" id="pedidoDetalheEnderecoWrap">
            <span>Endereco</span>
            <strong id="pedidoDetalheEndereco">-</strong>
          </div>
          <div class="pedido-detalhe-item" id="pedidoDetalheTaxaWrap">
            <span>Taxa de entrega</span>
            <strong id="pedidoDetalheTaxa">R$ 0,00</strong>
          </div>
          <div class="pedido-detalhe-section-links" id="pedidoDetalheEntregaLinks">
            <button type="button" id="pedidoDetalheCopiarEndereco">Copiar endereco</button>
            <button type="button" id="pedidoDetalheVincularEntregador">Vincular entregador</button>
          </div>
        </div>

        <div class="pedido-detalhe-section">
          <div class="pedido-detalhe-section-title">
            <i class="bi bi-credit-card"></i> Pagamento
          </div>
          <div class="pedido-detalhe-pagamentos" id="pedidoDetalhePagamentos">-</div>
        </div>

        <div class="pedido-detalhe-section">
          <div class="pedido-detalhe-section-title">Resumo do pedido</div>
          <div class="pedido-detalhe-itens" id="pedidoDetalheItens"></div>
          <div class="pedido-detalhe-totais">
            <div><span>Subtotal</span><strong id="pedidoDetalheSubtotal">R$ 0,00</strong></div>
            <div id="pedidoDetalheLinhaDesconto"><span>Desconto</span><strong id="pedidoDetalheDesconto">R$ 0,00</strong></div>
            <div id="pedidoDetalheLinhaTaxa"><span>Taxa de entrega</span><strong id="pedidoDetalheTaxaResumo">R$ 0,00</strong></div>
            <div id="pedidoDetalheLinhaMaquininha"><span>Taxa maquininha</span><strong id="pedidoDetalheMaquininha">R$ 0,00</strong></div>
            <div id="pedidoDetalheLinhaCashback"><span>Cashback</span><strong id="pedidoDetalheCashback">R$ 0,00</strong></div>
            <div><span>Total</span><strong id="pedidoDetalheTotal">R$ 0,00</strong></div>
          </div>
        </div>
      </div>
      <div class="modal-footer pedido-detalhe-footer">
        <button class="btn btn-outline-secondary" type="button" id="pedidoDetalheCancelar">Cancelar pedido</button>
        <button class="btn btn-primary" type="button" id="pedidoDetalheFinalizar">Mover para finalizado</button>
      </div>
    </div>
  </div>
</div>

</main>
</div>



<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/clientes.js?v=<?= $clientesJsVer ?>"></script>
</body>
</html>
