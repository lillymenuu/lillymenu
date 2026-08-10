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




