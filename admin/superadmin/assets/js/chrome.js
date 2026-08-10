  const modalPerfil = document.getElementById('perfilModal');
  const btnEditarPerfil = document.getElementById('btnEditarPerfil');
  const toggleSidebar = document.getElementById('toggleSidebar');
  const closeBtns = document.querySelectorAll('[data-close-modal]');
  const perfilForm = document.getElementById('perfilForm');
  const perfilMsg = document.getElementById('perfilMsg');
  const perfilUsuario = document.getElementById('perfilUsuario');
  const toggles = document.querySelectorAll('[data-toggle]');
  const perfilFotoPreview = document.getElementById('perfilFotoPreview');
  const perfilFotoBtn = document.getElementById('perfilFotoBtn');
  const perfilFotoInput = document.getElementById('perfilFotoInput');
  const perfilFotoRemoverBtn = document.getElementById('perfilFotoRemoverBtn');
  const perfilFotoRemoverFlag = document.getElementById('perfilFotoRemoverFlag');

  function abrirModal(modal){
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
  }
  function fecharModal(modal){
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
  }

  btnEditarPerfil?.addEventListener('click', (e) => {
    e.preventDefault();
    abrirModal(modalPerfil);
  });

  if (toggleSidebar) {
    const collapsed = localStorage.getItem('wd_sidebar_collapsed') === '1';
    if (collapsed) document.body.classList.add('sidebar-collapsed');
    toggleSidebar.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem('wd_sidebar_collapsed', document.body.classList.contains('sidebar-collapsed') ? '1' : '0');
    });
  }

  closeBtns.forEach(btn => btn.addEventListener('click', () => {
    const modal = btn.closest('.modal-backdrop');
    if (modal) fecharModal(modal);
  }));
  [modalPerfil].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) fecharModal(modal);
    });
  });

  function normalizarUsuario(valor) {
    return (valor || '').toLowerCase().replace(/[^a-z0-9._@-]/g, '');
  }
  if (perfilUsuario) {
    perfilUsuario.addEventListener('input', () => {
      perfilUsuario.value = normalizarUsuario(perfilUsuario.value);
    });
  }

  toggles.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-toggle');
      const input = document.getElementById(id);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    });
  });

  perfilFotoBtn?.addEventListener('click', () => perfilFotoInput?.click());

  const redimensionarImagemParaBlob = (file, maxDim) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        } else {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas indisponivel.')); return; }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      const tipo = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Erro ao processar imagem.')); return; }
        resolve(blob);
      }, tipo, 0.92);
    };
    img.onerror = () => reject(new Error('Nao foi possivel processar a imagem.'));
    img.src = url;
  });

  perfilFotoInput?.addEventListener('change', () => {
    const file = perfilFotoInput.files && perfilFotoInput.files[0];
    if (!file || !perfilFotoPreview) return;
    redimensionarImagemParaBlob(file, 400).then((blob) => {
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';
      const resizedFile = new File([blob], `foto.${ext}`, { type: blob.type });
      if (typeof DataTransfer !== 'undefined' && perfilFotoInput) {
        const dt = new DataTransfer();
        dt.items.add(resizedFile);
        perfilFotoInput.files = dt.files;
      }
      if (perfilFotoRemoverFlag) perfilFotoRemoverFlag.value = '0';
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (!ev.target?.result) return;
        perfilFotoPreview.innerHTML = `<img src="${ev.target.result}" alt="">`;
      };
      reader.readAsDataURL(resizedFile);
      if (perfilFotoRemoverBtn) perfilFotoRemoverBtn.style.display = '';
    }).catch(() => {});
  });

  perfilFotoRemoverBtn?.addEventListener('click', () => {
    if (perfilFotoInput) perfilFotoInput.value = '';
    if (perfilFotoRemoverFlag) perfilFotoRemoverFlag.value = '1';
    if (perfilFotoPreview) {
      const iniciais = document.querySelector('.sidebar-profile .avatar')?.dataset.iniciais || 'A';
      perfilFotoPreview.innerHTML = `<span>${iniciais}</span>`;
    }
    perfilFotoRemoverBtn.style.display = 'none';
  });

  perfilForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    perfilMsg.textContent = '';
    const formData = new FormData(perfilForm);
    const resp = await fetch('../api/superadmin_update.php', { method:'POST', body: formData });
    const data = await resp.json();
    if (data.ok) {
      perfilMsg.textContent = 'Dados atualizados com sucesso.';
      perfilMsg.className = 'modal-msg success';
      setTimeout(() => { fecharModal(modalPerfil); }, 1200);
    } else {
      perfilMsg.textContent = data.msg || 'Erro ao salvar.';
      perfilMsg.className = 'modal-msg error';
    }
  });

  const settingsDrawer = document.getElementById('settingsDrawer');
  const settingsBackdrop = document.getElementById('settingsBackdrop');
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const closeSettings = document.getElementById('closeSettings');
  const sidenavTypes = document.querySelectorAll('[data-sidenav-type]');
  const colorDots = document.querySelectorAll('[data-color]');
  const toggleNavbarFixed = document.getElementById('toggleNavbarFixed');

  function openSettings(){
    settingsDrawer?.classList.add('show');
    settingsBackdrop?.classList.add('show');
    settingsDrawer?.setAttribute('aria-hidden','false');
    settingsBackdrop?.setAttribute('aria-hidden','false');
  }
  function closeSettingsPanel(){
    settingsDrawer?.classList.remove('show');
    settingsBackdrop?.classList.remove('show');
    settingsDrawer?.setAttribute('aria-hidden','true');
    settingsBackdrop?.setAttribute('aria-hidden','true');
  }

  btnOpenSettings?.addEventListener('click', openSettings);
  closeSettings?.addEventListener('click', closeSettingsPanel);
  settingsBackdrop?.addEventListener('click', closeSettingsPanel);

  function hexToRgba(hex, alpha){
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16);
    const g = parseInt(h.substring(2,4),16);
    const b = parseInt(h.substring(4,6),16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function applySidenavColor(color){
    document.documentElement.style.setProperty('--sidenav-accent', color);
    document.documentElement.style.setProperty('--sidenav-active-bg', hexToRgba(color, 0.12));
    document.documentElement.style.setProperty('--sidenav-active-text', color);
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-soft', hexToRgba(color, 0.12));
    localStorage.setItem('wd_sidenav_color', color);
  }

  function applySidenavType(type){
    document.body.classList.remove('sidenav-dark','sidenav-transparent','sidenav-white');
    document.body.classList.add(`sidenav-${type}`);
    localStorage.setItem('wd_sidenav_type', type);
    sidenavTypes.forEach(btn => btn.classList.toggle('active', btn.dataset.sidenavType === type));
  }

  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      applySidenavColor(dot.dataset.color || '#111827');
    });
  });

  sidenavTypes.forEach(btn => {
    btn.addEventListener('click', () => {
      applySidenavType(btn.dataset.sidenavType || 'white');
    });
  });

  toggleNavbarFixed?.addEventListener('change', () => {
    document.body.classList.toggle('navbar-fixed', toggleNavbarFixed.checked);
    localStorage.setItem('wd_navbar_fixed', toggleNavbarFixed.checked ? '1' : '0');
  });

  const savedColor = localStorage.getItem('wd_sidenav_color');
  const savedType = localStorage.getItem('wd_sidenav_type') || 'white';
  const savedNavbarFixed = localStorage.getItem('wd_navbar_fixed') === '1';
  if (savedColor) applySidenavColor(savedColor);
  applySidenavType(savedType);
  if (toggleNavbarFixed) {
    toggleNavbarFixed.checked = savedNavbarFixed;
    document.body.classList.toggle('navbar-fixed', savedNavbarFixed);
  }

  const btnNotif = document.getElementById('btnNotif');
  const notifMenu = document.getElementById('notifMenu');
  function closeNotif(){
    notifMenu?.classList.remove('show');
  }
  btnNotif?.addEventListener('click', (e) => {
    e.stopPropagation();
    notifMenu?.classList.toggle('show');
  });
  document.addEventListener('click', (e) => {
    if (!notifMenu) return;
    if (!notifMenu.contains(e.target) && e.target !== btnNotif) {
      closeNotif();
    }
  });

  const btnHeaderProfile = document.getElementById('btnHeaderProfile');
  const headerProfileMenu = document.getElementById('headerProfileMenu');
  const btnHeaderProfilePerfil = document.getElementById('btnHeaderProfilePerfil');
  const btnHeaderProfileConfig = document.getElementById('btnHeaderProfileConfig');
  function closeHeaderProfileMenu(){
    headerProfileMenu?.classList.remove('show');
  }
  btnHeaderProfile?.addEventListener('click', (e) => {
    e.stopPropagation();
    headerProfileMenu?.classList.toggle('show');
  });
  document.addEventListener('click', (e) => {
    if (!headerProfileMenu) return;
    if (!headerProfileMenu.contains(e.target) && e.target !== btnHeaderProfile && !btnHeaderProfile?.contains(e.target)) {
      closeHeaderProfileMenu();
    }
  });
  btnHeaderProfilePerfil?.addEventListener('click', () => {
    closeHeaderProfileMenu();
    if (modalPerfil) abrirModal(modalPerfil);
  });
  btnHeaderProfileConfig?.addEventListener('click', () => {
    closeHeaderProfileMenu();
    openSettings();
  });

  // Badge de mensagens nao lidas do Suporte na sidebar: em suporte.php quem atualiza
  // é o suporte.js completo (que ja faz polling da lista inteira). Nas demais paginas,
  // mantemos so o contador vivo com um polling leve reaproveitando o mesmo endpoint.
  const suporteNavBadge = document.getElementById('suporteNavBadge');
  if (suporteNavBadge && !document.getElementById('suporteConversas')) {
    const atualizarBadgeSuporte = () => {
      fetch('../api/suporte_conversas.php')
        .then(r => r.json())
        .then(data => {
          if (!data.ok) return;
          const lista = data.conversas || [];
          const total = lista.reduce((acc, c) => acc + (parseInt(c.nao_lidas || 0, 10) || 0), 0);
          if (total > 0) {
            suporteNavBadge.textContent = total > 9 ? '9+' : String(total);
            suporteNavBadge.style.display = '';
          } else {
            suporteNavBadge.style.display = 'none';
          }
        })
        .catch(() => {});
    };
    atualizarBadgeSuporte();
    setInterval(atualizarBadgeSuporte, 8000);
  }
