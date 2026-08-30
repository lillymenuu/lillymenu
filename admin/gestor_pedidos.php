<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.gestor_pedidos');
require_once __DIR__ . '/helpers/config.php';
require_once __DIR__ . '/helpers/motoboy_module.php';
$perfil = $_SESSION['admin_perfil'] ?? 'admin';
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$gestorCssVer = filemtime(__DIR__ . '/assets/css/gestor_pedidos.css');
$gestorJsVer = filemtime(__DIR__ . '/assets/js/gestor_pedidos.js');
$agendamentoDeliveryRaw = config($conn, 'agendamento_delivery_horarios', '');
$agendamentoRetiradaRaw = config($conn, 'agendamento_retirada_horarios', '');
$agendamentoDeliveryHorarios = json_decode((string) $agendamentoDeliveryRaw, true);
$agendamentoRetiradaHorarios = json_decode((string) $agendamentoRetiradaRaw, true);
$agendamentoDeliveryHorarios = is_array($agendamentoDeliveryHorarios) ? $agendamentoDeliveryHorarios : [];
$agendamentoRetiradaHorarios = is_array($agendamentoRetiradaHorarios) ? $agendamentoRetiradaHorarios : [];
$motoboysGestor = [];
try {
  motoboyEnsureModule($conn);
  if (motoboyTableExists($conn, 'motoboys')) {
    $stmtMotoboysGestor = $conn->prepare("
      SELECT id, nome, whatsapp
      FROM motoboys
      WHERE loja_id = ? AND ativo = 1
      ORDER BY nome ASC
    ");
    $stmtMotoboysGestor->execute([(int) ($_SESSION['loja_id'] ?? 1)]);
    $motoboysGestor = $stmtMotoboysGestor->fetchAll(PDO::FETCH_ASSOC) ?: [];
  }
} catch (Throwable $e) {
  $motoboysGestor = [];
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Gestor de Pedidos</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

<link href="./assets/css/gestor_pedidos.css?v=<?= $gestorCssVer ?>" rel="stylesheet">
</head>

<body class="dash-diggy">
  <?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="dash-page">

  <div class="gestor-header">
    <div class="gestor-header-left">
      <button class="dash-menu-btn" onclick="toggleSidebar()" aria-label="Abrir menu">
        <i class="bi bi-list"></i>
      </button>
      <h5 class="gestor-title">Gestor de Pedidos</h5>
    </div>
    <div class="gestor-toolbar">
      <div class="gestor-search-wrap" id="gestorSearchWrap">
        <div class="gestor-search-icon"><i class="bi bi-search"></i></div>
        <input class="gestor-search-input" id="gestorSearchInput" type="text" placeholder="Buscar pedido..." autocomplete="off" readonly>
      </div>
      <button class="btn btn-diggy-primary" onclick="novoPedido()">
        <i class="bi bi-plus-lg"></i> Novo pedido
      </button>
    </div>
  </div>

  <div class="gestor-filtros"></div>

  <div class="kanban" id="kanban"></div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div>

<!-- MODAL PEDIDO -->
<div class="modal fade" id="modalPedidoDetalhe" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
    <div class="modal-content pedido-detalhe-modal">
      <div class="modal-header">
        <div class="pedido-detalhe-header w-100">
          <h5 id="pedidoDetalheNumero">Pedido N. -</h5>
          <div class="pedido-detalhe-actions">
            <button class="btn btn-outline-secondary btn-sm" type="button" id="pedidoDetalheEditar">
              <i class="bi bi-pencil"></i> Editar pedido
            </button>
            <button class="btn btn-outline-secondary btn-sm" type="button" id="pedidoDetalheImprimir">
              <i class="bi bi-printer"></i> Imprimir
            </button>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div class="pedido-detalhe-tempo" id="pedidoDetalheTempo">feito ha -</div>
        <div class="pedido-detalhe-divider"></div>

        <div class="pedido-detalhe-agendamento-section d-none" id="pedidoDetalheAgendamentoWrap">
          <div class="pedido-detalhe-agendamento-title">
            <i class="bi bi-calendar-event"></i>
            <span id="pedidoDetalheAgendamentoTitulo">RETIRADA AGENDADA</span>
            <span class="pedido-detalhe-agendamento-sub" id="pedidoDetalheAgendamentoOrigem"></span>
          </div>
          <div class="pedido-detalhe-agendamento-box" id="pedidoDetalheAgendamentoBox">Agendado para: -</div>
        </div>

        <div class="pedido-detalhe-grid">
          <div class="pedido-detalhe-item">
            <span class="label-strong"><i class="bi bi-calendar-event"></i> Horario do pedido</span>
            <strong id="pedidoDetalheHorario">-</strong>
          </div>
          <div class="pedido-detalhe-item">
            <span class="label-strong"><i class="bi bi-display"></i> Status do pedido</span>
            <strong class="pedido-detalhe-status" id="pedidoDetalheStatus">-</strong>
          </div>
          <div class="pedido-detalhe-item">
            <span class="label-strong"><i class="bi bi-person"></i> Nome do cliente</span>
            <strong id="pedidoDetalheCliente">-</strong>
          </div>
          <div class="pedido-detalhe-item">
            <span class="label-strong"><i class="bi bi-telephone"></i> Telefone</span>
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

        <div class="pedido-detalhe-client-stats" id="pedidoDetalheStatsWrap">
          <div class="pedido-detalhe-client-grid">
            <div class="pedido-detalhe-client-metric">
              <i class="bi bi-receipt"></i>
              <div>
                <span>Pedidos feitos</span>
                <strong id="pedidoDetalhePedidosFeitos">0</strong>
              </div>
            </div>
            <div class="pedido-detalhe-client-metric">
              <i class="bi bi-bag-check"></i>
              <div>
                <span>Ticket medio</span>
                <strong id="pedidoDetalheTicketMedio">R$ 0,00</strong>
              </div>
            </div>
            <div class="pedido-detalhe-client-metric" id="pedidoDetalhePontosMetric">
              <i class="bi bi-star"></i>
              <div>
                <span>Pontos</span>
                <strong id="pedidoDetalhePontos">0</strong>
              </div>
            </div>
            <div class="pedido-detalhe-client-metric" id="pedidoDetalheCashbackMetric">
              <i class="bi bi-cash-coin"></i>
              <div>
                <span>Cashback</span>
                <strong id="pedidoDetalheCashbackTotal">R$ 0,00</strong>
                <small class="pedido-detalhe-client-expira d-none" id="pedidoDetalheCashbackExpira">Expira em -</small>
              </div>
            </div>
          </div>
          <button type="button" class="pedido-detalhe-client-action" id="pedidoDetalheVerCliente">
            Ver mais sobre o cliente
          </button>
          <div class="pedido-detalhe-client-expirado d-none" id="pedidoDetalheCashbackExpirado">Cashback expirado</div>
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
          <div class="pedido-detalhe-item d-none" id="pedidoDetalheMotoboyWrap">
            <span>Motoboy</span>
            <strong id="pedidoDetalheMotoboy">-</strong>
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
        <div class="pedido-detalhe-section d-none" id="pedidoDetalheObsWrap">
          <div class="pedido-detalhe-section-title outro">
            <i class="bi bi-chat-left-text"></i> Observacoes do cliente
          </div>
          <div class="pedido-detalhe-item" id="pedidoDetalheObsTexto">-</div>
        </div>

        <div class="pedido-detalhe-section">
          <div class="pedido-detalhe-section-title outro">Resumo do pedido</div>
          <div class="pedido-detalhe-itens" id="pedidoDetalheItens"></div>
          <div class="pedido-detalhe-totais">
            <div class="pedido-detalhe-total-strong"><span>Subtotal</span><strong id="pedidoDetalheSubtotal">R$ 0,00</strong></div>
            <div id="pedidoDetalheLinhaDesconto"><span>Desconto</span><strong id="pedidoDetalheDesconto">R$ 0,00</strong></div>
            <div id="pedidoDetalheLinhaTaxa"><span>Taxa de entrega</span><strong id="pedidoDetalheTaxaResumo">R$ 0,00</strong></div>
            <div id="pedidoDetalheLinhaMaquininha"><span>Taxa maquininha</span><strong id="pedidoDetalheMaquininha">R$ 0,00</strong></div>
            <div id="pedidoDetalheLinhaCashback" class="pedido-detalhe-total-strong"><span>Cashback usado</span><strong id="pedidoDetalheCashback">R$ 0,00</strong></div>
            <div class="pedido-detalhe-total-strong"><span>Total</span><strong id="pedidoDetalheTotal">R$ 0,00</strong></div>
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

<div class="modal fade" id="modalPedidoMotoboy" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:380px;">
    <div class="modal-content pedido-detalhe-modal">
      <div class="modal-header">
        <div class="pedido-detalhe-header">
          <h5>Vincular motoboy</h5>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="pedido-detalhe-item" style="margin-bottom:12px;">
          <span>Pedido</span>
          <strong id="pedidoMotoboyPedido">-</strong>
        </div>
        <div class="field">
          <label style="display:block;font-size:.8rem;font-weight:700;color:#7f8ca4;margin-bottom:6px;">Motoboy</label>
          <select id="pedidoMotoboySelect" class="pedido-motoboy-select">
            <option value="">Sem motoboy vinculado</option>
            <?php foreach ($motoboysGestor as $motoboyGestor): ?>
              <option value="<?= (int) $motoboyGestor['id'] ?>">
                <?= htmlspecialchars((string) $motoboyGestor['nome']) ?>  -  <?= htmlspecialchars((string) $motoboyGestor['whatsapp']) ?>
              </option>
            <?php endforeach; ?>
          </select>
        </div>
      </div>
      <div class="modal-footer pedido-detalhe-footer">
        <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-primary" type="button" id="pedidoMotoboySalvar">Salvar vinculo</button>
      </div>
    </div>
  </div>
</div>

<!-- Sem "fade" de propósito: a animação de abrir (transform/opacity) causava
     um bug de repintura no Chrome/Edge onde o <select> de motoboy ficava
     "fotografado" com a opção escolhida na vez anterior, mesmo com o valor
     real do campo correto por baixo — confirmado com diagnóstico ao vivo.
     Sem a transição, não existe a janela de composição de camada que causa
     esse travamento visual; o modal só aparece/some na hora, sem zoom. -->
<div class="modal pedido-alerta-modal" id="modalPedidoAlertaMotoboy" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Vincular motoboy</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p class="pedido-alerta-help">
          Esse pedido está em <strong>EM PREPARO</strong> e ainda não possui motoboy vinculado.
        </p>
        <div class="pedido-alerta-field">
          <label for="pedidoAlertaMotoboySelect">Motoboy</label>
          <select id="pedidoAlertaMotoboySelect" class="pedido-alerta-select">
            <option value="">Selecione um motoboy</option>
            <?php foreach ($motoboysGestor as $motoboyGestor): ?>
              <option value="<?= (int) $motoboyGestor['id'] ?>">
                <?= htmlspecialchars((string) $motoboyGestor['nome']) ?>  -  <?= htmlspecialchars((string) $motoboyGestor['whatsapp']) ?>
              </option>
            <?php endforeach; ?>
          </select>
          <div class="pedido-alerta-erro d-none" id="pedidoAlertaMotoboyErro">Selecione um motoboy para vincular.</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-soft" type="button" id="pedidoAlertaContinuarSemMotoboy">Sem vincular</button>
        <button class="btn btn-primary" type="button" id="pedidoAlertaVincularMotoboy">Vincular</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL BUSCAR PEDIDO -->
<div class="modal fade buscar-pedido-modal" id="modalBuscarPedido" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Buscar pedido</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <label class="buscar-pedido-label" for="buscarPedidoInput">Busque pelo pedido</label>
        <div class="buscar-pedido-input-wrap">
          <i class="bi bi-search"></i>
          <input type="text" id="buscarPedidoInput" placeholder="Número do pedido, nome ou telefone do cliente" autocomplete="off">
        </div>
        <div id="buscarPedidoResultados">
          <div class="buscar-pedido-empty">
            <div class="buscar-pedido-empty-icon"><i class="bi bi-search"></i></div>
            <div class="buscar-pedido-empty-title">Como buscar um pedido</div>
            <div class="buscar-pedido-empty-desc">Digite o número do pedido, o nome do cliente ou o telefone para encontrar pedidos rapidamente.</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-light" data-bs-dismiss="modal">Fechar</button>
      </div>
    </div>
  </div>
</div>


<!-- MODAL CLIENTE PERFIL -->
<div class="modal fade" id="modalClientePerfil" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header" style="border:0;padding:14px 16px 0;">
        <div class="cliente-perfil-header w-100">
          <div class="cliente-perfil-avatar" id="clientePerfilAvatar">C</div>
          <div>
            <div class="cliente-perfil-nome" id="clientePerfilNome">Cliente</div>
            <div class="cliente-perfil-desde" id="clientePerfilDesde">Cliente desde: -</div>
          </div>
          <button class="btn-close ms-auto" data-bs-dismiss="modal"></button>
        </div>
      </div>
      <div class="modal-body">
        <div class="cliente-perfil-tabs" id="clientePerfilTabs">
          <button class="cliente-tab active" type="button" data-tab="perfil"><i class="bi bi-person"></i> Perfil</button>
          <button class="cliente-tab" type="button" data-tab="pedidos"><i class="bi bi-receipt"></i> Pedidos</button>
          <button class="cliente-tab" type="button" data-tab="avaliacoes"><i class="bi bi-star"></i> Avaliacoes</button>
          <button class="cliente-tab" type="button" data-tab="pontos"><i class="bi bi-gift"></i> Historico de pontos</button>
        </div>

        <div class="cliente-tab-content active" data-tab-pane="perfil">
          <div class="cliente-perfil-grid">
            <div class="cliente-perfil-card">
              <i class="bi bi-cash-coin"></i>
              <div>
                <strong id="clientePerfilCashback">R$ 0,00</strong>
                <span>cashback acumulado</span>
                <div class="cliente-perfil-expira d-none" id="clientePerfilCashbackExpira">Expira em -</div>
                <div class="cliente-perfil-expirado d-none" id="clientePerfilCashbackExpirado">Cashback expirado</div>
              </div>
            </div>
            <div class="cliente-perfil-card">
              <i class="bi bi-calendar-event"></i>
              <div>
                <strong id="clientePerfilPontos">Sem dados</strong>
                <span>pontos</span>
              </div>
            </div>
            <div class="cliente-perfil-card">
              <i class="bi bi-wallet2"></i>
              <div>
                <strong id="clientePerfilFiado">R$ 0,00</strong>
                <span>saldo fiado</span>
              </div>
            </div>
            <div class="cliente-perfil-card">
              <i class="bi bi-bag-check"></i>
              <div>
                <strong id="clientePerfilTicket">R$ 0,00</strong>
                <span>ticket medio</span>
              </div>
            </div>
            <div class="cliente-perfil-card">
              <i class="bi bi-calendar2-week"></i>
              <div>
                <strong id="clientePerfilUltimoPedido">-</strong>
                <span>ultimo pedido</span>
              </div>
            </div>
            <div class="cliente-perfil-card">
              <i class="bi bi-list-check"></i>
              <div>
                <strong id="clientePerfilPedidos">0</strong>
                <span>pedidos feitos</span>
              </div>
            </div>
          </div>

          <div class="cliente-perfil-info">
            <h6>Informacoes pessoais</h6>
            <div class="info-item">
              Telefone
              <strong id="clientePerfilTelefone">-</strong>
            </div>
            <div class="info-item">
              Endereco
              <strong id="clientePerfilEndereco">-</strong>
            </div>
          </div>

          <div class="cliente-perfil-footer">
            
            <button class="btn btn-primary" type="button" id="clientePerfilEditar">Editar cliente</button>
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

        <div class="cliente-tab-content" data-tab-pane="pontos">
          <div class="cliente-pedidos">
            <div class="cliente-pedidos-title">Historico de pontos</div>
            <div id="clientePontosLista"></div>
            <div class="cliente-pedidos-pagination" id="clientePontosPaginacao"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
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

<!-- MODAL AVISO (substitui alert() nativo) -->
<div class="modal fade" id="modalAvisoGestor" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content rounded-4 p-4 text-center border-0 shadow">
      <div class="mb-3" style="font-size:36px"><i class="bi bi-exclamation-triangle-fill" style="color:#f59e0b"></i></div>
      <h5 class="mb-2 fw-bold" id="modalAvisoGestorTitulo">Aviso</h5>
      <p class="text-muted mb-4" id="modalAvisoGestorMsg">—</p>
      <button class="btn btn-dark rounded-3 w-100 py-2" data-bs-dismiss="modal">Entendi</button>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<script>
const GESTOR_DATA = <?= json_encode(['perfilOperador' => $perfil, 'agendamentoHorarios' => ['entrega' => $agendamentoDeliveryHorarios, 'retirada' => $agendamentoRetiradaHorarios], 'motoboysDisponiveis' => $motoboysGestor], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
</script>
<script src="./assets/js/gestor_pedidos.js?v=<?= $gestorJsVer ?>"></script>


<!-- ── Modal Recusar / Cancelar Pedido ── -->
<div class="recusar-overlay" id="recusarOverlay" onclick="fecharRecusarModal()">
  <div class="recusar-modal" onclick="event.stopPropagation()">
    <div class="recusar-icon"><i class="bi bi-x-lg"></i></div>
    <div class="recusar-title" id="recusarTitle">Recusar pedido?</div>
    <div class="recusar-sub" id="recusarSub">O pedido <span class="recusar-pedido-num" id="recusarPedidoNum"></span> será marcado como <strong>cancelado</strong> e não poderá ser revertido.</div>
    <div class="recusar-btns">
      <button class="recusar-btn-cancelar" onclick="fecharRecusarModal()">Voltar</button>
      <button class="recusar-btn-confirmar" id="recusarBtnConfirmar" onclick="confirmarRecusa()">Recusar pedido</button>
    </div>
  </div>
</div>
</body>
</html>

