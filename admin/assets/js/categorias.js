const modalCategoria = new bootstrap.Modal(
  document.getElementById('modalCategoria')
);

function abrirModalCategoria(){
  document.getElementById('formCategoria').reset();
  document.getElementById('categoriaId').value = '';
  document.querySelector('.modal-title').innerText = 'Nova categoria';
  modalCategoria.show();
}

function editarCategoria(id){
  fetch('api/categorias_get.php?id='+id)
    .then(r=>r.json())
    .then(c=>{
      categoriaId.value = c.id;
      categoriaNome.value = c.nome;
      categoriaAtivo.checked = c.ativo == 1;
      document.querySelector('.modal-title').innerText = 'Editar categoria';
      modalCategoria.show();
    });
}

function salvarCategoria(){
  const dados = new FormData(document.getElementById('formCategoria'));

  fetch('api/categorias_save.php', {
    method:'POST',
    body:dados
  })
  .then(r=>r.json())
  .then(resp=>{
    if(resp.ok){
      modalCategoria.hide();
      location.reload(); // na D6.5 removemos reload
    }else{
      alert('Erro ao salvar categoria');
    }
  });
}

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

