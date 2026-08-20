function alterarStatus(status){
  fetch('api/pedidos_status.php', {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:`id=${PEDIDO_DATA.pedidoId}&status=${status}`
  })
  .then(r=>r.json())
  .then(d=>{
    if(d.ok){
      atualizarBadge(status);
    }else{
      alert('Erro ao atualizar status');
    }
  });
}

function atualizarBadge(status){
  const badge = document.getElementById('statusBadge');
  badge.className = 'badge status-' + status;
  badge.innerText = status.charAt(0).toUpperCase() + status.slice(1);
}

function cancelarPedido(){
  if(!confirm('Deseja realmente cancelar este pedido?')) return;
  document.getElementById('statusSelect').value = 'cancelado';
  alterarStatus('cancelado');
}
