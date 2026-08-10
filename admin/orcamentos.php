<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/acesso_menu.php';
acessoExigirMenu($conn, 'menu.orcamentos');
require_once __DIR__ . '/helpers/config.php';

$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$orcamentosCssVer = filemtime(__DIR__ . '/assets/css/orcamentos.css');
$orcamentosJsVer = filemtime(__DIR__ . '/assets/js/orcamentos.js');
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

/* PRODUTOS */
$produtoColunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
$temOrdem = in_array('ordem', $produtoColunas, true);
$temPrecoPromocional = in_array('preco_promocional', $produtoColunas, true);
$temPromoDesativado = in_array('promo_desativado', $produtoColunas, true);
$temImagem = in_array('imagem', $produtoColunas, true);
$precoExpr = ($temPrecoPromocional && $temPromoDesativado)
  ? "IF(p.promo_desativado = 0 AND p.preco_promocional IS NOT NULL AND p.preco_promocional > 0, p.preco_promocional, p.preco)"
  : "p.preco";
$promoExpr = ($temPrecoPromocional && $temPromoDesativado)
  ? "CASE WHEN p.promo_desativado = 0 AND p.preco_promocional IS NOT NULL AND p.preco_promocional > 0 THEN 1 ELSE 0 END"
  : "0";
$ordenacaoProdutos = $temOrdem
  ? "ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.ordem IS NULL, p.ordem, p.nome"
  : "ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.nome";
$selectImagem = $temImagem ? ', p.imagem' : '';

$stmt = $conn->prepare("
  SELECT p.id, p.nome, p.preco AS preco_base, $precoExpr AS preco, $promoExpr AS em_promocao,
         IFNULL(e.quantidade, 0) AS estoque_quantidade{$selectImagem}
  FROM produtos p
  LEFT JOIN categorias c ON c.id = p.categoria_id AND c.loja_id = p.loja_id
  LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
  WHERE p.ativo = 1
    AND p.loja_id = ?
    AND c.ativo = 1
    AND LOWER(c.nome) LIKE '%encomenda%'
    AND IFNULL(e.quantidade, 0) >= 0
  $ordenacaoProdutos
");
$stmt->execute([$lojaId]);
$produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Orçamentos</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
  <link href="./assets/css/orcamentos.css?v=<?= $orcamentosCssVer ?>" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">

</head>
<body class="dash-diggy">
<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid orcamento-page">
  <form id="formOrcamento" method="post" action="api/orcamento_pdf.php" target="_blank">
    <div class="orcamento-header">
      <div>
        <h1 class="orcamento-title">Orçamento / Recibo</h1>
        <p class="orcamento-subtitle">Gere orçamentos e recibos para seus clientes.</p>
      </div>
      
    </div>

    <div class="orcamento-grid">
      <div class="orc-card fill">
        <div class="orc-card-header">
          <h2 class="orc-card-title">Produtos</h2>
        </div>
        <div class="orc-card-body fill">
          <div class="orc-products-tools">
            <div class="orc-search">
              <i class="bi bi-search"></i>
              <input type="text" id="orcBuscaProduto" placeholder="Buscar produto">
            </div>
          </div>
          <div class="orc-products-grid" id="orcProdutosGrid">
            <div class="orc-product-card avulso" data-bs-toggle="modal" data-bs-target="#modalAvulso">
              <div class="orc-avulso-label">Item avulso</div>
              <button type="button" class="orc-avulso-btn" aria-label="Adicionar item avulso">+</button>
            </div>
            <?php foreach($produtos as $p): ?>
              <div class="orc-product-card"
                   data-id="<?= $p['id'] ?>"
                   data-nome="<?= htmlspecialchars($p['nome']) ?>"
                   data-preco="<?= $p['preco'] ?>">
                <div class="orc-product-thumb">
                  <?php if (!empty($p['imagem'])): ?>
                    <img src="<?= htmlspecialchars($p['imagem'], ENT_QUOTES, 'UTF-8') ?>" alt="">
                  <?php else: ?>
                    <i class="bi bi-image"></i>
                  <?php endif; ?>
                </div>
                <div class="orc-product-name"><?= htmlspecialchars($p['nome']) ?></div>
                <div class="orc-product-price">R$ <?= number_format((float) $p['preco'], 2, ',', '.') ?></div>
                <div class="orc-qty">
                  <button type="button" class="orc-qty-btn" data-action="minus">-</button>
                  <input type="number" class="orc-qty-value" value="0" min="0" data-action="input">
                  <button type="button" class="orc-qty-btn" data-action="plus">+</button>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        </div>
      </div>

      <div class="orc-side">
        <div class="orc-card">
          <div class="orc-card-header">
            <h2 class="orc-card-title">Dados do cliente</h2>
          </div>
          <div class="orc-card-body">
            <div class="orc-field mb-3">
              <label for="clienteNome">Nome</label>
              <input type="text" id="clienteNome" name="cliente_nome" required>
            </div>
            <div class="orc-doc-grid mb-3">
              <div class="orc-field">
                <label for="clienteTipoDocumento">Tipo de cadastro</label>
                <select id="clienteTipoDocumento" name="cliente_tipo_documento">
                  <option value="fisica">Pessoa fisica</option>
                  <option value="juridica">Pessoa juridica</option>
                </select>
              </div>
              <div class="orc-field" id="clienteCpfWrap">
                <label for="clienteCpf">CPF</label>
                <input type="text" id="clienteCpf" name="cliente_cpf" placeholder="000.000.000-00">
              </div>
              <div class="orc-field is-hidden" id="clienteCnpjWrap">
                <label for="clienteCnpj">CNPJ</label>
                <input type="text" id="clienteCnpj" name="cliente_cnpj" placeholder="00.000.000/0000-00">
              </div>
            </div>
            <div class="orc-field mb-3">
              <label for="clienteWhatsapp">Contato de WhatsApp</label>
              <div class="orc-whatsapp-row">
                <input type="text" id="clienteWhatsapp" name="cliente_whatsapp" required placeholder="(00) 00000-0000">
                <button type="button" class="orc-copy-btn" id="btnCopiarWhatsapp">
                  <i class="bi bi-clipboard"></i>
                  Copiar
                </button>
              </div>
            </div>
            <button type="button" class="orc-address-btn" data-bs-toggle="modal" data-bs-target="#modalEndereco">
              <i class="bi bi-geo-alt"></i>
              Informar endereco
            </button>
            <div class="orc-address-summary d-none" id="orcEnderecoResumo"></div>
          </div>
        </div>

        <div class="orc-card fill">
          <div class="orc-card-header">
            <h2 class="orc-card-title">Resumo do orçamento</h2>
          </div>
          <div class="orc-card-body orc-resumo fill">
            <div class="orc-resumo-list" id="orcResumoLista">
              <div class="text-muted">Adicione produtos para montar o orçamento.</div>
            </div>
            <div class="orc-discount">
              <span>Desconto</span>
              <div class="orc-discount-controls">
                <select id="orcDescontoTipo">
                  <option value="valor">Valor (R$)</option>
                  <option value="percent">Percentual (%)</option>
                </select>
                <input type="number" step="0.01" id="orcDescontoValor" value="0">
              </div>
            </div>
            <div class="orc-discount-error" id="orcDescontoErro">O desconto nao pode ser maior que o total.</div>
            <div class="orc-total">
              <span>Total</span>
              <strong id="orcResumoTotal">R$ 0,00</strong>
            </div>
            <div class="orc-actions">
              <button class="btn btn-orc btn-orc-light" type="submit" id="btnGerarReciboBottom" disabled data-output-type="recibo">
                <i class="bi bi-receipt"></i>
                Gerar recibo
              </button>
              <button class="btn btn-orc" type="submit" id="btnGerarPdfBottom" disabled data-output-type="orcamento">
                <i class="bi bi-file-earmark-pdf"></i>
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <input type="hidden" name="cliente_endereco" id="clienteEndereco">
    <input type="hidden" name="cliente_documento_label" id="clienteDocumentoLabel" value="CPF">
    <input type="hidden" name="cliente_documento_valor" id="clienteDocumentoValor" value="">
    <input type="hidden" name="output_type" id="outputType" value="orcamento">
    <input type="hidden" name="desconto_tipo" id="descontoTipo" value="valor">
    <input type="hidden" name="desconto_valor" id="descontoValor" value="0">
    <input type="hidden" name="itens_json" id="itensJson" value="[]">
    <input type="hidden" name="total" id="orcTotalInput" value="0">
  </form>
</div>

<div class="modal fade orc-modal orc-modal-address" id="modalEndereco" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="width:520px;max-width:520px;">
    <div class="modal-content">
      <div class="modal-header border-0 pb-0">
        <h5 class="modal-title">Endereco do cliente</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body">
        <div class="orc-address-grid">
          <div class="orc-field">
            <label for="clienteCep">CEP</label>
            <input type="text" id="clienteCep" placeholder="00000-000" required>
          </div>
          <div class="orc-field">
            <label for="clienteNumero">Numero</label>
            <input type="text" id="clienteNumero" placeholder="Ex.: 120">
          </div>
          <div class="orc-field full">
            <label for="clienteRua">Rua/Avenida</label>
            <input type="text" id="clienteRua" placeholder="Rua, avenida">
          </div>
          <div class="orc-field">
            <label for="clienteBairro">Bairro</label>
            <input type="text" id="clienteBairro" placeholder="Bairro">
          </div>
          <div class="orc-field">
            <label for="clienteCidade">Cidade</label>
            <input type="text" id="clienteCidade" placeholder="Cidade">
          </div>
          <div class="orc-field">
            <label for="clienteEstado">Estado</label>
            <input type="text" id="clienteEstado" placeholder="UF">
          </div>
          <div class="orc-field full">
            <label for="clienteComplemento">Complemento</label>
            <input type="text" id="clienteComplemento" placeholder="Apartamento, bloco, referencia">
          </div>
        </div>
      </div>
      <div class="orc-modal-footer">
        <button type="button" class="btn btn-orc" data-bs-dismiss="modal">Salvar endereco</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade orc-modal" id="modalAvulso" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="width:448px;max-width:448px;">
    <div class="modal-content">
      <div class="modal-header border-0 pb-0">
        <h5 class="modal-title">Produto avulso</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body">
        <div class="orc-float">
          <label for="avulsoNome">Nome do produto</label>
          <input type="text" class="form-control" id="avulsoNome" placeholder="Ex.: Pastel de pizza">
        </div>
        <div class="orc-float">
          <label for="avulsoPreco">Preço do produto</label>
          <input type="number" step="0.01" class="form-control" id="avulsoPreco" placeholder="0,00">
        </div>
        <div class="orc-float">
          <label for="avulsoObs">Observações</label>
          <input type="text" class="form-control" id="avulsoObs" placeholder="Ex.: Sem tomate">
        </div>
      </div>
      <div class="orc-modal-footer">
        <div class="orc-modal-qty">
          <button type="button" id="avulsoMinus">-</button>
          <span id="avulsoQtd">1</span>
          <button type="button" id="avulsoPlus">+</button>
        </div>
        <button type="button" class="btn btn-orc" id="avulsoAddBtn">Adicionar ao pedido R$ 0,00</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/orcamentos.js?v=<?= $orcamentosJsVer ?>"></script>
</body>
</html>
