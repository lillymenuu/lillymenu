let produtoAtual = {};
let quantidade = 1;
let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
let taxaEntregaAtual = 0;
let subtotalAtualGlobal = 0;
let distanciaKmAtual = 0;
let buscandoDistancia = false;
const LOJA_ID = window.LOJA_ID || document.body?.dataset?.lojaId || "";

function withLojaId(url) {
  if (!LOJA_ID) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}loja_id=${encodeURIComponent(LOJA_ID)}`;
}

const produtoModalEl = document.getElementById("produtoModal");
const modal = produtoModalEl ? new bootstrap.Modal(produtoModalEl) : null;

function abrirProduto(id) {
  if (!modal) return;
  fetch(withLojaId(`../controllers/produto.php?id=${id}`))
    .then(res => res.json())
    .then(p => {
      produtoAtual = p;
      quantidade = 1;

      const nomeEl = document.getElementById("produtoNome");
      const descEl = document.getElementById("produtoDescricao");
      const qtdEl = document.getElementById("produtoQtd");
      const precoEl = document.getElementById("produtoPreco");
      const obsEl = document.getElementById("produtoObs");
      if (nomeEl) nomeEl.innerText = p.nome;
      if (descEl) descEl.innerText = p.descricao;
      if (qtdEl) qtdEl.innerText = quantidade;
      if (precoEl) {
        precoEl.innerText = (p.preco * quantidade).toFixed(2).replace('.', ',');
      }
      if (obsEl) obsEl.value = "";

      modal.show();
    });
}

function alterarQtd(valor) {
  quantidade = Math.max(1, quantidade + valor);
  const qtdEl = document.getElementById("produtoQtd");
  const precoEl = document.getElementById("produtoPreco");
  if (qtdEl) qtdEl.innerText = quantidade;
  if (precoEl) {
    precoEl.innerText = (produtoAtual.preco * quantidade).toFixed(2).replace('.', ',');
  }
}

function adicionarCarrinho() {
  const obsEl = document.getElementById("produtoObs");
  carrinho.push({
    id: produtoAtual.id,
    nome: produtoAtual.nome,
    preco: produtoAtual.preco,
    quantidade: quantidade,
    observacoes: obsEl ? obsEl.value : ''
  });

  localStorage.setItem("carrinho", JSON.stringify(carrinho));
  modal.hide();
  atualizarBadge();
}

function atualizarBadge() {
  const badge = document.getElementById("cartCount");
  if (badge) {
    badge.innerText = carrinho.length;
  }
}
atualizarBadge();

function aplicarMascaraCep(valor) {
  const digits = (valor || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function obterCampoCep() {
  const seletores = [
    "#cep",
    "#cepEntrega",
    "#enderecoCep",
    "input[name='cep']",
    "input[name='cep_entrega']"
  ];
  for (const sel of seletores) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function obterCampoBairro() {
  const seletores = [
    "#bairro",
    "#enderecoBairro",
    "input[name='bairro']",
    "input[name='bairro_entrega']"
  ];
  for (const sel of seletores) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function obterCampoDistancia() {
  const seletores = [
    "#distanciaKm",
    "#distancia_km",
    "input[name='distancia_km']"
  ];
  for (const sel of seletores) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function atualizarTotalUI(subtotal, taxa) {
  const totalEl = document.getElementById("totalPedido");
  if (!totalEl) return;
  totalEl.innerText = (subtotal + taxa).toFixed(2).replace('.', ',');
}

function atualizarTaxaEntrega(subtotal) {
  const tipoEntregaEl = document.getElementById("tipoEntrega");
  if (!tipoEntregaEl) {
    taxaEntregaAtual = 0;
    atualizarTotalUI(subtotal, taxaEntregaAtual);
    return;
  }

  if (tipoEntregaEl.value !== "entrega") {
    taxaEntregaAtual = 0;
    atualizarTotalUI(subtotal, taxaEntregaAtual);
    return;
  }

  const cepEl = obterCampoCep();
  const bairroEl = obterCampoBairro();
  const distanciaEl = obterCampoDistancia();
  const cepDigits = cepEl ? cepEl.value.replace(/\D/g, "") : "";
  const distanciaValor = distanciaEl && distanciaEl.value
    ? Number(distanciaEl.value)
    : Number(distanciaKmAtual || 0);

  if (cepDigits.length === 8 && distanciaValor <= 0 && !buscandoDistancia) {
    buscandoDistancia = true;
    fetch(withLojaId(`../api/cep_lookup.php?cep=${encodeURIComponent(cepDigits)}`))
      .then(res => res.json())
      .then(resp => {
        if (resp && resp.ok) {
          distanciaKmAtual = Number(resp.distancia_km || 0);
          if (distanciaEl) {
            distanciaEl.value = distanciaKmAtual.toFixed(2);
          }
          if (bairroEl && resp.bairro && !bairroEl.value) {
            bairroEl.value = resp.bairro;
          }
        }
      })
      .finally(() => {
        buscandoDistancia = false;
        atualizarTaxaEntrega(subtotal);
      });
    return;
  }

  const dados = new FormData();
  dados.append("subtotal", subtotal);
  dados.append("tipo", "entrega");
  if (cepDigits) {
    dados.append("cep", cepDigits);
  }
  if (bairroEl && bairroEl.value) {
    dados.append("bairro", bairroEl.value);
  }
  if (distanciaValor > 0) {
    dados.append("distancia_km", distanciaValor);
  }

  fetch(withLojaId("../api/checkout_calculo.php"), {
    method: "POST",
    body: dados
  })
    .then(res => res.json())
    .then(resp => {
      taxaEntregaAtual = Number(resp.taxa_entrega || 0);
      atualizarTotalUI(subtotal, taxaEntregaAtual);
    })
    .catch(() => {
      taxaEntregaAtual = 0;
      atualizarTotalUI(subtotal, taxaEntregaAtual);
    });
}



const carrinhoModalEl = document.getElementById("carrinhoModal");
const modalCarrinho = carrinhoModalEl ? new bootstrap.Modal(carrinhoModalEl) : null;

function abrirCarrinho() {
  if (!modalCarrinho) return;
  renderCarrinho();
  modalCarrinho.show();
}

function renderCarrinho() {
  const lista = document.getElementById("listaCarrinho");
  lista.innerHTML = "";

  let subtotal = 0;

  carrinho.forEach((item, i) => {
    subtotal += item.preco * item.quantidade;

    lista.innerHTML += `
      <div class="d-flex justify-content-between mb-2">
        <div>
          <strong>${item.nome}</strong><br>
          <small>Qtd: ${item.quantidade}</small>
        </div>
        <div>
          R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}
          <button class="btn btn-sm btn-link text-danger"
            onclick="removerItem(${i})">remover</button>
        </div>
      </div>
    `;
  });

  calcularTotal(subtotal);
}

function removerItem(index) {
  carrinho.splice(index, 1);
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
  atualizarBadge();
  renderCarrinho();
}

function calcularTotal(subtotalAtual = null) {
  let subtotal = subtotalAtual ?? carrinho.reduce(
    (s, i) => s + i.preco * i.quantidade, 0
  );
  subtotalAtualGlobal = subtotal;

  const tipoEntregaEl = document.getElementById("tipoEntrega");
  if (tipoEntregaEl && tipoEntregaEl.value === "entrega") {
    document.getElementById("campoEndereco")?.classList.remove("d-none");
  } else {
    document.getElementById("campoEndereco")?.classList.add("d-none");
  }

  atualizarTaxaEntrega(subtotal);
}




function finalizarPedido() {
  if (!carrinho.length) return alert("Carrinho vazio");

  const dados = {
    nome: document.getElementById("nomeCliente").value,
    telefone: document.getElementById("telefoneCliente").value,
    endereco: document.getElementById("endereco").value,
    tipo_entrega: document.getElementById("tipoEntrega").value,
    pagamento: document.getElementById("pagamento").value,
    taxa: document.getElementById("tipoEntrega").value === "entrega"
      ? taxaEntregaAtual
      : 0,
    total: parseFloat(
      document.getElementById("totalPedido").innerText.replace(',', '.')
    ),
    loja_id: LOJA_ID || null,
    itens: carrinho
  };

  fetch("../controllers/pedido.php", {
    method: "POST",
    body: JSON.stringify(dados)
  })
  .then(res => res.json())
  .then(r => {
    localStorage.removeItem("carrinho");
    window.location.href = `finalizar.php?pedido=${r.pedido_id}`;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const tipoEntregaEl = document.getElementById("tipoEntrega");
  const cepEl = obterCampoCep();
  const bairroEl = obterCampoBairro();
  let cepTimer = null;

  if (tipoEntregaEl) {
    tipoEntregaEl.addEventListener("change", () => {
      calcularTotal(subtotalAtualGlobal);
    });
  }

  if (cepEl) {
    cepEl.addEventListener("input", () => {
      cepEl.value = aplicarMascaraCep(cepEl.value);
      if (cepTimer) clearTimeout(cepTimer);
      cepTimer = setTimeout(() => {
        distanciaKmAtual = 0;
        calcularTotal(subtotalAtualGlobal);
      }, 350);
    });
  }

  if (bairroEl) {
    bairroEl.addEventListener("input", () => {
      if (cepTimer) clearTimeout(cepTimer);
      cepTimer = setTimeout(() => {
        calcularTotal(subtotalAtualGlobal);
      }, 350);
    });
  }
});

