<div class="card rounded-4 shadow-sm border-0 mb-3">
  <div class="card-body">

    <div class="d-flex justify-content-between mb-2">
      <span>Subtotal</span>
      <strong id="resSubtotal">R$ 0,00</strong>
    </div>

    <div class="d-flex justify-content-between mb-2">
      <span>Taxa de entrega</span>
      <strong id="resTaxa">R$ 0,00</strong>
    </div>

    <hr>

    <div class="d-flex justify-content-between fs-5">
      <span>Total</span>
      <strong id="resTotal">R$ 0,00</strong>
    </div>

    <small id="msgMinimo" class="text-danger d-none">
      Pedido mínimo não atingido
    </small>

  </div>
</div>



<div id="statusLoja"
     class="alert d-none mb-3 rounded-3">
</div>


<button id="btnFinalizar"
        class="btn btn-success w-100">
  Finalizar pedido
</button>


<script>
const lojaIdCheckout = window.LOJA_ID || document.body?.dataset?.lojaId || '';
function withLojaIdCheckout(url) {
  if (!lojaIdCheckout) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}loja_id=${encodeURIComponent(lojaIdCheckout)}`;
}

document.getElementById('btnFinalizar')
  .addEventListener('click', () => {

  const dados = new FormData();

  // Exemplo de dados enviados
  dados.append('total', totalPedido);

  if (lojaIdCheckout) {
    dados.append('loja_id', lojaIdCheckout);
  }
  fetch('api/pedido_finalizar.php', {
    method: 'POST',
    body: dados
  })
  .then(r => r.json())
  .then(resp => {
    if (resp.ok) {
      // 🚀 REDIRECIONA PARA O WHATSAPP
      window.open(resp.whatsapp, '_blank');
    } else {
      alert(resp.msg);
    }
  });

});
</script>


<script>
function atualizarStatusLoja(){
  fetch(withLojaIdCheckout('api/status_funcionamento.php'))
    .then(r => r.json())
    .then(d => {
      const alertBox = document.getElementById('statusLoja');
      const btn = document.getElementById('btnFinalizar');

      if (!d.aberto) {
        alertBox.className =
          'alert alert-warning d-block rounded-3';
        alertBox.innerHTML =
          `⏰ Estamos fechados no momento.<br>
           Funcionamos das <strong>${d.abertura}</strong>
           às <strong>${d.fechamento}</strong>.`;

        btn.disabled = true;
        btn.classList.add('disabled');
      } else {
        alertBox.className =
          'alert alert-success d-block rounded-3';
        alertBox.innerHTML = '🟢 Estamos abertos e prontos para atender!';

        btn.disabled = false;
        btn.classList.remove('disabled');
      }
    });
}

/* Executa ao carregar a página */
document.addEventListener('DOMContentLoaded', atualizarStatusLoja);
</script>


<script>
function atualizarResumo(subtotal){
  const dados = new FormData();
  dados.append('subtotal', subtotal);
  const tipoEl = document.getElementById('tipoEntrega');
  if (tipoEl && tipoEl.value) {
    dados.append('tipo', tipoEl.value);
  }
  const numeroEl = document.querySelector('#numero, #enderecoNumero, input[name="numero"], input[name="numero_entrega"]');
  if (tipoEl && tipoEl.value === 'entrega' && numeroEl && !numeroEl.value.trim()) {
    document.getElementById('resSubtotal').innerText =
      'R$ ' + Number(subtotal || 0).toFixed(2).replace('.',',');
    document.getElementById('resTaxa').innerText = 'R$ 0,00';
    document.getElementById('resTotal').innerText =
      'R$ ' + Number(subtotal || 0).toFixed(2).replace('.',',');
    return;
  }
  const cepEl = document.querySelector('#cep, #cepEntrega, #enderecoCep, input[name="cep"], input[name="cep_entrega"]');
  if (cepEl && cepEl.value) {
    dados.append('cep', cepEl.value.replace(/\D/g, ''));
  }
  const bairroEl = document.querySelector('#bairro, #enderecoBairro, input[name="bairro"], input[name="bairro_entrega"]');
  if (bairroEl && bairroEl.value) {
    dados.append('bairro', bairroEl.value);
  }
  if (window.checkoutDistanciaKm && Number(window.checkoutDistanciaKm) > 0) {
    dados.append('distancia_km', window.checkoutDistanciaKm);
  }

  fetch(withLojaIdCheckout('api/checkout_calculo.php'), {
    method:'POST',
    body:dados
  })
  .then(r=>r.json())
  .then(d=>{
    document.getElementById('resSubtotal').innerText =
      'R$ ' + d.subtotal.toFixed(2).replace('.',',');

    document.getElementById('resTaxa').innerText =
      'R$ ' + d.taxa_entrega.toFixed(2).replace('.',',');

    document.getElementById('resTotal').innerText =
      'R$ ' + d.total.toFixed(2).replace('.',',');

    const msg = document.getElementById('msgMinimo');
    const btn = document.getElementById('btnFinalizar');

    if (!d.atinge_minimo) {
      msg.classList.remove('d-none');
      msg.innerText =
        'Pedido mínimo: R$ ' + d.pedido_minimo.toFixed(2).replace('.',',');

      btn.disabled = true;
    } else {
      msg.classList.add('d-none');
      btn.disabled = false;
    }
  });
}

function obterSubtotalAtualResumo(){
  const el = document.getElementById('resSubtotal');
  if (!el) return 0;
  const texto = (el.innerText || '').replace(/[^\d,.-]/g, '').replace(',', '.');
  const valor = parseFloat(texto);
  return Number.isFinite(valor) ? valor : 0;
}

document.addEventListener('DOMContentLoaded', () => {
  const tipoEl = document.getElementById('tipoEntrega');
  const cepEl = document.querySelector('#cep, #cepEntrega, #enderecoCep, input[name="cep"], input[name="cep_entrega"]');
  const bairroEl = document.querySelector('#bairro, #enderecoBairro, input[name="bairro"], input[name="bairro_entrega"]');
  window.checkoutDistanciaKm = 0;
  let timer = null;

  if (tipoEl) {
    tipoEl.addEventListener('change', () => {
      atualizarResumo(obterSubtotalAtualResumo());
    });
  }

  if (cepEl) {
    cepEl.addEventListener('input', () => {
      const digits = (cepEl.value || '').replace(/\D/g, '').slice(0, 8);
      cepEl.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const cepLimpo = (cepEl.value || '').replace(/\D/g, '');
        if (cepLimpo.length === 8) {
          fetch(withLojaIdCheckout(`api/cep_lookup.php?cep=${encodeURIComponent(cepLimpo)}`))
            .then(r => r.json())
            .then(resp => {
              if (resp && resp.ok) {
                window.checkoutDistanciaKm = Number(resp.distancia_km || 0);
                if (bairroEl && resp.bairro) {
                  bairroEl.value = resp.bairro;
                }
              }
            })
            .finally(() => {
              atualizarResumo(obterSubtotalAtualResumo());
            });
        } else {
          window.checkoutDistanciaKm = 0;
          atualizarResumo(obterSubtotalAtualResumo());
        }
      }, 350);
    });
  }

  const numeroEl = document.querySelector('#numero, #enderecoNumero, input[name="numero"], input[name="numero_entrega"]');
  if (numeroEl) {
    numeroEl.addEventListener('input', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        atualizarResumo(obterSubtotalAtualResumo());
      }, 300);
    });
  }

  if (bairroEl) {
    bairroEl.addEventListener('input', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        atualizarResumo(obterSubtotalAtualResumo());
      }, 350);
    });
  }
});
</script>
