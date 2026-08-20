const pedidoId = PDV_CONFIRMACAO_DATA.pedidoId;

fetch(`api/pdv_detalhe.php?pedido_id=${pedidoId}`)
  .then(r=>r.json())
  .then(d=>{
    if(!d.ok) return;

    let html = `
      <h6 class="mb-3">Cliente</h6>
      <p><strong>${d.pedido.nome}</strong><br>${d.pedido.telefone}</p>

      <h6 class="mt-4 mb-3">Itens</h6>
      <ul class="list-group mb-3">
    `;

    d.itens.forEach(i=>{
      html += `
        <li class="list-group-item d-flex justify-content-between">
          <span>${i.quantidade}x ${i.produto_nome}</span>
          <strong>R$ ${(i.quantidade*i.preco).toFixed(2).replace('.',',')}</strong>
        </li>
      `;
    });

    html += `
      </ul>
    `;

    if (d.pagamentos && d.pagamentos.length) {
      html += `
        <h6 class="mt-3 mb-3">Pagamentos</h6>
        <ul class="list-group mb-3">
      `;
      d.pagamentos.forEach(p => {
        html += `
          <li class="list-group-item d-flex justify-content-between">
            <span>${(p.forma || '').toUpperCase()}</span>
            <strong>R$ ${parseFloat(p.valor).toFixed(2).replace('.',',')}</strong>
          </li>
        `;
      });
      html += `
        </ul>
      `;
    }

    const descontoValor = parseFloat(d.pedido.desconto || 0);
    const taxaMaqValor = parseFloat(d.pedido.taxa_maquininha || 0);

    html += `

      <div class="d-flex justify-content-between">
        <span>Subtotal</span>
        <strong>R$ ${parseFloat(d.pedido.subtotal).toFixed(2).replace('.',',')}</strong>
      </div>

      <div class="d-flex justify-content-between">
        <span>Taxa</span>
        <strong>R$ ${parseFloat(d.pedido.taxa_entrega).toFixed(2).replace('.',',')}</strong>
      </div>
    `;

    if (descontoValor > 0) {
      html += `
        <div class="d-flex justify-content-between">
          <span>Desconto</span>
          <strong>- R$ ${descontoValor.toFixed(2).replace('.',',')}</strong>
        </div>
      `;
    }

    if (taxaMaqValor > 0) {
      html += `
        <div class="d-flex justify-content-between">
          <span>Taxa maquininha</span>
          <strong>R$ ${taxaMaqValor.toFixed(2).replace('.',',')}</strong>
        </div>
      `;
    }

    html += `

      <hr>

      <div class="d-flex justify-content-between fs-5">
        <span>Total</span>
        <strong>R$ ${parseFloat(d.pedido.total).toFixed(2).replace('.',',')}</strong>
      </div>
    `;

    if(d.pedido.tipo === 'entrega'){
      html += `
        <h6 class="mt-4">Entrega</h6>
        <p>${d.pedido.endereco_entrega}</p>
      `;
    }

    document.getElementById('detalhePedido').innerHTML = html;
  });

function enviarWhats(){
  fetch(`api/pdv_whatsapp.php?pedido_id=${pedidoId}`)
    .then(r=>r.json())
    .then(w=>{
      if(w.ok) window.open(w.url,'_blank');
    });
}


  const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('print') === '1') {
  window.onload = () => window.print();
}

