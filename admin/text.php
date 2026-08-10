<?php
require_once __DIR__ . '/protect.php';

require_once __DIR__ . '/../config/database.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$pedidoId = $_GET['pedido_id'] ?? null;
$pedido = null;
$itens = [];

if ($pedidoId) {
  // Pedido + cliente
  $stmt = $conn->prepare("
    SELECT p.*, c.nome, c.telefone
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
    WHERE p.id = ? AND p.loja_id = ?
  ");
  $stmt->execute([$pedidoId, $lojaId]);
  $pedido = $stmt->fetch(PDO::FETCH_ASSOC);

  // Itens
  $stmt = $conn->prepare("
    SELECT produto_nome, quantidade, preco
    FROM pedido_itens
    WHERE pedido_id = ? AND loja_id = ?
  ");
  $stmt->execute([$pedidoId, $lojaId]);
  $itens = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>PDV</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css" rel="stylesheet">
</head>
<body>

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<!-- TOPO -->
<div class="d-flex justify-content-between align-items-center mb-4">
  <h5>PDV — Lançamento de Pedido</h5>

  <span class="badge bg-dark rounded-pill px-3 py-2">
    Pedido manual
  </span>
</div>

<div class="row g-4">

  <!-- COLUNA ESQUERDA -->
  <div class="col-lg-8">

    <!-- CLIENTE -->
    <div class="card rounded-4 shadow-sm border-0 p-4 mb-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">Cliente</h6>
        <button class="btn btn-outline-dark rounded-pill btn-sm"
                data-bs-toggle="modal"
                data-bs-target="#modalCliente">
          + Novo cliente
        </button>
      </div>

      <input type="text"
       id="buscarCliente"
       class="form-control rounded-pill"
       placeholder="Buscar cliente pelo nome ou telefone">

        <div id="resultadoClientes"
            class="list-group mt-2 d-none"></div>

        <input type="hidden" id="clienteId">

    </div>

    <!-- PRODUTOS -->
    <div class="card rounded-4 shadow-sm border-0 p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">Produtos</h6>
        <button class="btn btn-outline-dark rounded-pill btn-sm"
                data-bs-toggle="modal"
                data-bs-target="#modalProduto">
          + Adicionar produto
        </button>
      </div>

      <div class="table-responsive">
        <table class="table align-middle">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Valor</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
       <tbody id="listaProdutos">
  <tr>
    <td colspan="5" class="text-center text-muted py-4">
      Nenhum produto adicionado
    </td>
  </tr>
</tbody>

        </table>
      </div>
    </div>

  </div>

  <!-- COLUNA DIREITA -->
  <div class="col-lg-4">

    <!-- TIPO DE PEDIDO -->
    <div class="card rounded-4 shadow-sm border-0 p-4 mb-4">
      <h6 class="mb-3">Tipo de pedido</h6>

      <div class="form-check">
        <input class="form-check-input"
               type="radio"
               name="tipoPedido"
               id="retirada"
               checked>
        <label class="form-check-label" for="retirada">
          Retirada na loja
        </label>
      </div>

      <div class="form-check mt-2">
        <input class="form-check-input"
               type="radio"
               name="tipoPedido"
               id="entrega">
        <label class="form-check-label" for="entrega">
          Entrega
        </label>
      </div>

      <div id="blocoEntrega" class="mt-3 d-none">

  <div class="mb-3">
    <label class="form-label">Endereço de entrega</label>
    <textarea id="enderecoEntrega"
              class="form-control rounded-3"
              placeholder="Rua, número, bairro, referência"></textarea>
  </div>

  <div class="mb-2">
    <label class="form-label">Taxa de entrega</label>
    <input type="number"
           id="taxaCustom"
           class="form-control rounded-pill"
           step="0.01"
           placeholder="Ex: 5.00">
            <small class="text-muted">
            Deixe em branco para usar a taxa padrão
            </small>
  </div>

</div>





    </div>

<!-- PAGAMENTO -->
<div class="card rounded-4 shadow-sm border-0 p-4 mb-4">
  <h6 class="mb-3">Forma de pagamento</h6>

  <div class="row g-2">
    <div class="col-6">
      <input type="radio" class="btn-check" name="pagamento" id="pix" checked>
      <label class="btn btn-outline-dark w-100 rounded-pill" for="pix">
        Pix
      </label>
    </div>

    <div class="col-6">
      <input type="radio" class="btn-check" name="pagamento" id="dinheiro">
      <label class="btn btn-outline-dark w-100 rounded-pill" for="dinheiro">
        Dinheiro
      </label>
    </div>

    <div class="col-6">
      <input type="radio" class="btn-check" name="pagamento" id="credito">
      <label class="btn btn-outline-dark w-100 rounded-pill" for="credito">
        Crédito
      </label>
    </div>

    <div class="col-6">
      <input type="radio" class="btn-check" name="pagamento" id="debito">
      <label class="btn btn-outline-dark w-100 rounded-pill" for="debito">
        Débito
      </label>
    </div>

    <!-- TROCO (DINHEIRO) -->
<div id="blocoTroco" class="mt-3 d-none">

  <div class="mb-2">
    <label class="form-label">Valor pago</label>
    <input type="number"
           id="valorPago"
           class="form-control rounded-pill"
           step="0.01"
           placeholder="Ex: 50.00">
  </div>

  <div class="text-muted">
    Troco: <strong id="valorTroco">R$ 0,00</strong>
  </div>

</div>





  </div>
</div>



<!-- CUPOM -->
<div class="card rounded-4 shadow-sm border-0 p-4 mb-4">
  <h6 class="mb-3">Cupom de desconto</h6>

  <div class="input-group">
    <input type="text"
           id="cupom"
           class="form-control rounded-pill"
           placeholder="Ex: DESCONTO10">
    <button class="btn btn-outline-dark rounded-pill"
            onclick="aplicarCupom()">
      Aplicar
    </button>
  </div>

  <small id="cupomMsg" class="mt-2 d-block"></small>
</div>




    <!-- RESUMO -->
    <div class="card rounded-4 shadow-sm border-0 p-4">
      <h6 class="mb-3">Resumo do pedido</h6>

      <div class="d-flex justify-content-between mb-2">
        <span>Subtotal</span>
        <strong id="subtotal">R$ 0,00</strong>
      </div>

      <div class="d-flex justify-content-between mb-2">
        <span>Taxa de entrega</span>
        <strong id="taxaEntrega">R$ 0,00</strong>
      </div>

      <hr>

      <div class="d-flex justify-content-between fs-5">
        <span>Total</span>
        <strong id="totalPedido">R$ 0,00</strong>
      </div>

     <button class="btn btn-dark w-100 rounded-pill mt-4"
                onclick="finalizarPedido()">
        Finalizar pedido
        </button>

    </div>

  </div>

</div>

<!-- MODAIS -->
<?php include __DIR__ . '/partials/modais/modal_cliente.php'; ?>
<?php include __DIR__ . '/partials/modais/modal_produto.php'; ?>

</main>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/sidebar.js"></script>


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



<script>
const inputCliente = document.getElementById('buscarCliente');
const listaClientes = document.getElementById('resultadoClientes');
const clienteId = document.getElementById('clienteId');

inputCliente.addEventListener('input', () => {
  const q = inputCliente.value;

  if (q.length < 2) {
    listaClientes.classList.add('d-none');
    return;
  }

  fetch(`api/pdv_clientes.php?q=${q}`)
    .then(r => r.json())
    .then(clientes => {
      listaClientes.innerHTML = '';

      clientes.forEach(c => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'list-group-item list-group-item-action';
        item.innerHTML = `<strong>${c.nome}</strong><br><small>${c.telefone}</small>`;

        item.onclick = () => selecionarCliente(c);
        listaClientes.appendChild(item);
      });

      listaClientes.classList.remove('d-none');
    });
});

function selecionarCliente(c) {
  inputCliente.value = `${c.nome} (${c.telefone})`;
  clienteId.value = c.id;
  listaClientes.classList.add('d-none');
}

/* SALVAR CLIENTE */
function salvarCliente() {
  const dados = new FormData();
  dados.append('nome', cliNome.value);
  dados.append('telefone', cliTelefone.value);
  dados.append('endereco', cliEndereco.value);

  fetch('api/pdv_cliente_salvar.php', {
    method:'POST',
    body:dados
  })
  .then(r=>r.json())
  .then(res=>{
    if(!res.ok){
      alert(res.msg);
      return;
    }

    selecionarCliente(res.cliente);

    bootstrap.Modal.getInstance(
      document.getElementById('modalCliente')
    ).hide();
  });
}
</script>



<script>
let carrinho = [];

/* BUSCAR PRODUTOS */
buscarProduto.addEventListener('input', () => {
  const q = buscarProduto.value;

  if (q.length < 2) {
    listaBuscaProdutos.innerHTML = '';
    return;
  }

  fetch(`api/pdv_produtos.php?q=${q}`)
    .then(r => r.json())
    .then(produtos => {
      listaBuscaProdutos.innerHTML = '';

      produtos.forEach(p => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'list-group-item list-group-item-action';
        item.innerHTML = `
          <div class="d-flex justify-content-between">
            <span>${p.nome}</span>
            <strong>R$ ${parseFloat(p.preco).toFixed(2).replace('.',',')}</strong>
          </div>
        `;

        item.onclick = () => adicionarProduto(p);
        listaBuscaProdutos.appendChild(item);
      });
    });
});

/* ADICIONAR PRODUTO AO CARRINHO */
function adicionarProduto(p) {
  const existente = carrinho.find(i => i.id === p.id);

  if (existente) {
    existente.qtd++;
  } else {
    carrinho.push({
      id: p.id,
      nome: p.nome,
      preco: parseFloat(p.preco),
      qtd: 1
    });
  }

  renderCarrinho();

  bootstrap.Modal.getInstance(
    document.getElementById('modalProduto')
  ).hide();
}

/* REMOVER PRODUTO */
function removerProduto(id) {
  carrinho = carrinho.filter(i => i.id !== id);
  renderCarrinho();
}

/* ALTERAR QUANTIDADE */
function alterarQtd(id, delta) {
  const item = carrinho.find(i => i.id === id);
  if (!item) return;

  item.qtd += delta;
  if (item.qtd <= 0) {
    removerProduto(id);
  } else {
    renderCarrinho();
  }
}

/* RENDERIZAR TABELA */
function renderCarrinho() {
  const tbody = document.getElementById('listaProdutos');
  tbody.innerHTML = '';

  if (!carrinho.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          Nenhum produto adicionado
        </td>
      </tr>
    `;
    atualizarResumo();
    return;
  }

  carrinho.forEach(i => {
    const total = i.preco * i.qtd;

    tbody.innerHTML += `
      <tr>
        <td>${i.nome}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-light" onclick="alterarQtd(${i.id},-1)">−</button>
          <strong class="mx-2">${i.qtd}</strong>
          <button class="btn btn-sm btn-light" onclick="alterarQtd(${i.id},1)">+</button>
        </td>
        <td>R$ ${i.preco.toFixed(2).replace('.',',')}</td>
        <td>R$ ${total.toFixed(2).replace('.',',')}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger"
                  onclick="removerProduto(${i.id})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  atualizarResumo();




  const taxaLinha = document.getElementById('taxaEntrega').closest('.d-flex');

if (tipo === 'retirada') {
  taxaLinha.style.opacity = 0.4;
} else {
  taxaLinha.style.opacity = 1;
}

}

/* SUBTOTAL */

function atualizarResumo() {
  let subtotal = 0;
  carrinho.forEach(i => subtotal += i.preco * i.qtd);

  const tipo = document.getElementById('entrega').checked
    ? 'entrega'
    : 'retirada';

  const taxaCustom = document.getElementById('taxaCustom')?.value ?? '';
  const cupom = document.getElementById('cupom')?.value ?? '';

  const dados = new FormData();
  dados.append('subtotal', subtotal);
  dados.append('tipo', tipo);
  dados.append('taxa', taxaCustom);
  dados.append('cupom', cupom);

  fetch('api/pdv_calculo.php', {
    method: 'POST',
    body: dados
  })
  .then(r => r.json())
  .then(res => {
    document.getElementById('subtotal').innerText =
      'R$ ' + res.subtotal.toFixed(2).replace('.',',');

    document.getElementById('taxaEntrega').innerText =
      'R$ ' + res.taxa.toFixed(2).replace('.',',');

    document.getElementById('totalPedido').innerText =
      'R$ ' + res.total.toFixed(2).replace('.',',');

    if (res.desconto > 0) {
      document.getElementById('cupomMsg').innerText =
        `Desconto aplicado: R$ ${res.desconto.toFixed(2).replace('.',',')}`;
      document.getElementById('cupomMsg').className = 'text-success';
    }
  });
}

function aplicarCupom() {
  atualizarResumo();
}


/* MOSTRAR / ESCONDER ENTREGA */
const radioEntrega = document.getElementById('entrega');
const radioRetirada = document.getElementById('retirada');
const blocoEntrega = document.getElementById('blocoEntrega');

radioEntrega.addEventListener('change', () => {
  blocoEntrega.classList.remove('d-none');
  atualizarResumo();
});

radioRetirada.addEventListener('change', () => {
  blocoEntrega.classList.add('d-none');
  document.getElementById('taxaCustom').value = '';
  atualizarResumo();
});

/* ALTERAR TAXA MANUAL */
document.getElementById('taxaCustom')?.addEventListener(
  'input',
  atualizarResumo
);
</script>



<script>
function finalizarPedido() {

  if (!clienteId.value) {
    alert('Selecione um cliente');
    return;
  }

  if (!carrinho.length) {
    alert('Adicione produtos ao pedido');
    return;
  }

  const tipo = document.getElementById('entrega').checked
    ? 'entrega'
    : 'retirada';

  const endereco = tipo === 'entrega'
    ? document.getElementById('enderecoEntrega').value.trim()
    : '';

  if (tipo === 'entrega' && !endereco) {
    alert('Informe o endereço de entrega');
    return;
  }


  const taxa = document.getElementById('taxaCustom')?.value ?? '';

  const pagamento = document.querySelector('input[name="pagamento"]:checked').id;

  const valorPago = document.getElementById('valorPago')?.value ?? '';




  const dados = new FormData();
  dados.append('cliente_id', clienteId.value);
  dados.append('tipo', tipo);
  dados.append('endereco', endereco);
  dados.append('taxa', taxa);
  dados.append('itens', JSON.stringify(carrinho));
  dados.append('pagamento', pagamento);
  dados.append('valor_pago', valorPago);

  fetch('api/pdv_salvar.php', {
    method: 'POST',
    body: dados
  })
  .then(r => r.json())
  .then(res => {
  if (!res.ok) {
    alert(res.msg || 'Erro ao salvar pedido');
    return;
  }

  // 🔁 REDIRECIONA DIRETO PARA A TELA DE CONFIRMAÇÃO
  window.location.href =
    `pdv_confirmacao.php?pedido_id=${res.pedido_id}`;
});

}






</script>


<script>
const radiosPagamento = document.querySelectorAll('input[name="pagamento"]');
const blocoTroco = document.getElementById('blocoTroco');

radiosPagamento.forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.id === 'dinheiro' && radio.checked) {
      blocoTroco.classList.remove('d-none');
    } else {
      blocoTroco.classList.add('d-none');
      document.getElementById('valorPago').value = '';
      document.getElementById('valorTroco').innerText = 'R$ 0,00';
    }
    atualizarResumo();
  });
});

document.getElementById('valorPago')?.addEventListener('input', calcularTroco);

function calcularTroco() {
  const pago = parseFloat(document.getElementById('valorPago').value) || 0;
  const total = parseFloat(
    document.getElementById('totalPedido')
      .innerText.replace('R$','').replace(',','.')
  ) || 0;

  const troco = pago > total ? pago - total : 0;

  document.getElementById('valorTroco').innerText =
    'R$ ' + troco.toFixed(2).replace('.',',');

  return troco;
}
</script>



</body>
</html>
