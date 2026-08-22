  const landingForm = document.getElementById('landingForm');
  const landingMsg = document.getElementById('landingMsg');
  const landingWhatsappInput = landingForm?.querySelector('input[name="whatsapp_number"]');

  const presetButtons = document.querySelectorAll('.preset-btn');
  const presetMap = {
    navy: {
      theme_navy: '#102a43', theme_navy_deep: '#081d30',
      theme_blue_soft: '#cfe9f7', theme_blue_soft_text: '#0f4c75',
      theme_blue_btn: '#6fb8e0', theme_blue_btn_text: '#0a2e44',
      theme_pink: '#ec4899', theme_pink_dark: '#d6357f',
      theme_link: '#1f6fd6', theme_light_bg: '#f4f6f8',
      theme_text: '#16263a', theme_muted: '#5b6b7a', theme_border: '#e2e8ee'
    },
    azul: {
      theme_navy: '#0f1f4d', theme_navy_deep: '#070f2c',
      theme_blue_soft: '#dbeafe', theme_blue_soft_text: '#1e3a8a',
      theme_blue_btn: '#3b82f6', theme_blue_btn_text: '#ffffff',
      theme_pink: '#2563eb', theme_pink_dark: '#1d4ed8',
      theme_link: '#2563eb', theme_light_bg: '#eef4ff',
      theme_text: '#0f172a', theme_muted: '#64748b', theme_border: '#e2e8f0'
    },
    verde: {
      theme_navy: '#0d2b1f', theme_navy_deep: '#06170f',
      theme_blue_soft: '#dcfce7', theme_blue_soft_text: '#166534',
      theme_blue_btn: '#4ade80', theme_blue_btn_text: '#0b3a22',
      theme_pink: '#16a34a', theme_pink_dark: '#15803d',
      theme_link: '#15803d', theme_light_bg: '#f0fdf4',
      theme_text: '#0f172a', theme_muted: '#64748b', theme_border: '#dcfce7'
    },
    preto: {
      theme_navy: '#0f172a', theme_navy_deep: '#05080f',
      theme_blue_soft: '#e2e8f0', theme_blue_soft_text: '#1f2937',
      theme_blue_btn: '#475569', theme_blue_btn_text: '#ffffff',
      theme_pink: '#334155', theme_pink_dark: '#1e293b',
      theme_link: '#334155', theme_light_bg: '#f8fafc',
      theme_text: '#0f172a', theme_muted: '#64748b', theme_border: '#e2e8f0'
    },
    laranja: {
      theme_navy: '#3a1d0c', theme_navy_deep: '#220f05',
      theme_blue_soft: '#ffedd5', theme_blue_soft_text: '#9a3412',
      theme_blue_btn: '#fb923c', theme_blue_btn_text: '#431407',
      theme_pink: '#f97316', theme_pink_dark: '#c2410c',
      theme_link: '#c2410c', theme_light_bg: '#fff7ed',
      theme_text: '#1c1917', theme_muted: '#78716c', theme_border: '#fed7aa'
    },
    rosa: {
      theme_navy: '#3a2412', theme_navy_deep: '#26160b',
      theme_blue_soft: '#f5ede5', theme_blue_soft_text: '#7A3F10',
      theme_blue_btn: '#c98a52', theme_blue_btn_text: '#3a2412',
      theme_pink: '#9C5523', theme_pink_dark: '#7A3F10',
      theme_link: '#9C5523', theme_light_bg: '#fbf6f1',
      theme_text: '#2c1c10', theme_muted: '#7a6a5c', theme_border: '#ecdfd2'
    },
    indigo: {
      theme_navy: '#1e1b4b', theme_navy_deep: '#100d2e',
      theme_blue_soft: '#e0e7ff', theme_blue_soft_text: '#3730a3',
      theme_blue_btn: '#818cf8', theme_blue_btn_text: '#1e1b4b',
      theme_pink: '#6366f1', theme_pink_dark: '#4338ca',
      theme_link: '#4f46e5', theme_light_bg: '#eef2ff',
      theme_text: '#0f172a', theme_muted: '#64748b', theme_border: '#e0e7ff'
    },
    teal: {
      theme_navy: '#0c2e2a', theme_navy_deep: '#061a17',
      theme_blue_soft: '#ccfbf1', theme_blue_soft_text: '#115e59',
      theme_blue_btn: '#2dd4bf', theme_blue_btn_text: '#042f2e',
      theme_pink: '#14b8a6', theme_pink_dark: '#0f766e',
      theme_link: '#0f766e', theme_light_bg: '#f0fdfa',
      theme_text: '#0f172a', theme_muted: '#64748b', theme_border: '#ccfbf1'
    },
    dourado: {
      theme_navy: '#3a2a09', theme_navy_deep: '#231904',
      theme_blue_soft: '#fef3c7', theme_blue_soft_text: '#92400e',
      theme_blue_btn: '#fbbf24', theme_blue_btn_text: '#3a2a09',
      theme_pink: '#f59e0b', theme_pink_dark: '#b45309',
      theme_link: '#b45309', theme_light_bg: '#fffbeb',
      theme_text: '#1c1917', theme_muted: '#78716c', theme_border: '#fde68a'
    },
    fireside: {
      theme_navy: '#891A10', theme_navy_deep: '#5c110a',
      theme_blue_soft: '#D8D4BC', theme_blue_soft_text: '#714236',
      theme_blue_btn: '#DC8236', theme_blue_btn_text: '#3a1d09',
      theme_pink: '#E76814', theme_pink_dark: '#B8210F',
      theme_link: '#B8210F', theme_light_bg: '#fdf6ef',
      theme_text: '#2c1410', theme_muted: '#8a6a58', theme_border: '#ecdfd2'
    },
    safira: {
      theme_navy: '#06457F', theme_navy_deep: '#262B40',
      theme_blue_soft: '#A8C4EC', theme_blue_soft_text: '#06457F',
      theme_blue_btn: '#0474C4', theme_blue_btn_text: '#ffffff',
      theme_pink: '#5379AE', theme_pink_dark: '#06457F',
      theme_link: '#0474C4', theme_light_bg: '#eef4fb',
      theme_text: '#1b2330', theme_muted: '#5b6b7a', theme_border: '#dbe6f3'
    },
    lapis: {
      theme_navy: '#213885', theme_navy_deep: '#081849',
      theme_blue_soft: '#ECDFD2', theme_blue_soft_text: '#5F3475',
      theme_blue_btn: '#3d52a8', theme_blue_btn_text: '#ffffff',
      theme_pink: '#893172', theme_pink_dark: '#5F3475',
      theme_link: '#5F3475', theme_light_bg: '#f7f2ec',
      theme_text: '#1a1a2e', theme_muted: '#6b6378', theme_border: '#e3ddf0'
    },
    tinta: {
      theme_navy: '#252525', theme_navy_deep: '#141414',
      theme_blue_soft: '#CFCFCF', theme_blue_soft_text: '#3a3a3a',
      theme_blue_btn: '#545454', theme_blue_btn_text: '#ffffff',
      theme_pink: '#3a3a3a', theme_pink_dark: '#141414',
      theme_link: '#3a3a3a', theme_light_bg: '#f5f5f5',
      theme_text: '#1a1a1a', theme_muted: '#7D7D7D', theme_border: '#CFCFCF'
    },
    cobre: {
      theme_navy: '#9C5523', theme_navy_deep: '#5C2D0A',
      theme_blue_soft: '#F0E4D8', theme_blue_soft_text: '#5C2D0A',
      theme_blue_btn: '#C98A52', theme_blue_btn_text: '#3a1f0a',
      theme_pink: '#D97B3F', theme_pink_dark: '#9C5523',
      theme_link: '#9C5523', theme_light_bg: '#FBF3EC',
      theme_text: '#2c1810', theme_muted: '#8a7060', theme_border: '#ecdfd2'
    },
    minimalista: {
      /* Marrom padrao do sistema (mesma cor usada no painel admin) sobre
         fundo branco/claro — estilo minimalista, sem preenchimentos solidos
         grandes (nav e hero ja ficam brancos direto no CSS). */
      theme_navy: '#9C5523', theme_navy_deep: '#7A3F10',
      theme_blue_soft: '#f5ede5', theme_blue_soft_text: '#7A3F10',
      theme_blue_btn: '#f5ede5', theme_blue_btn_text: '#7A3F10',
      theme_pink: '#9C5523', theme_pink_dark: '#7A3F10',
      theme_link: '#9C5523', theme_light_bg: '#faf9f7',
      theme_text: '#1f2328', theme_muted: '#5b6169', theme_border: '#ece7e0'
    }
  };

  function applyPresetTheme(preset){
    if (!landingForm || !preset) return;
    Object.keys(preset).forEach((key) => {
      const input = landingForm.querySelector('[name="' + key + '"]');
      if (input) input.value = preset[key];
    });
  }

  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      if (presetKey && presetMap[presetKey]) {
        applyPresetTheme(presetMap[presetKey]);
      }
    });
  });

  const tabButtons = document.querySelectorAll('.landing-tab-btn');
  const tabSections = document.querySelectorAll('.landing-tab-section');
  const landingGrid = document.querySelector('.landing-grid');
  const imageCol = document.querySelector('.landing-tab-col');

  function setLandingTab(tab){
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    tabSections.forEach(section => section.classList.toggle('active', section.dataset.tab === tab));
    if (landingGrid) landingGrid.classList.toggle('is-images', tab === 'imagens');
    if (imageCol) imageCol.classList.toggle('active', tab === 'imagens');
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => setLandingTab(btn.dataset.tab));
  });

  setLandingTab('landing');

  document.querySelectorAll('.landing-file').forEach((card) => {
    let img = card.querySelector('.landing-preview');
    const placeholder = card.querySelector('.landing-placeholder');
    const sizeEl = card.querySelector('.landing-size');
    const reco = card.getAttribute('data-reco');
    const fileInput = card.querySelector('input[type="file"]');

    const setSize = () => {
      if (!sizeEl) return;
      if (img && img.naturalWidth) {
        sizeEl.textContent = `Tamanho atual: ${img.naturalWidth} x ${img.naturalHeight}px` + (reco ? ` — Recomendado: ${reco}` : '');
      } else if (reco) {
        sizeEl.textContent = `Tamanho recomendado: ${reco}`;
      } else {
        sizeEl.textContent = '';
      }
    };

    const renderPreview = (src) => {
      if (!img) {
        img = document.createElement('img');
        img.className = 'landing-preview';
        img.alt = 'Preview';
        if (placeholder) {
          placeholder.replaceWith(img);
        } else if (fileInput) {
          fileInput.insertAdjacentElement('beforebegin', img);
        } else {
          card.insertAdjacentElement('afterbegin', img);
        }
      }
      img.src = src;
      img.onload = setSize;
    };

    if (img) {
      if (img.complete) {
        setSize();
      } else {
        img.addEventListener('load', setSize);
      }
    } else {
      setSize();
    }

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          renderPreview(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    });
  });

  function formatWhatsapp(value){
    const digits = (value || '').replace(/\D/g, '').slice(0,13);
    if (!digits) return '';
    const hasDDI = digits.length > 11 && digits.startsWith('55');
    let body = hasDDI ? digits.slice(2) : digits;
    const ddd = body.slice(0,2);
    const mid = body.slice(2, body.length - 4);
    const last = body.slice(-4);
    const prefix = hasDDI ? '+55 ' : '';
    if (!ddd) return prefix + body;
    if (!mid) return `${prefix}(${ddd}) `;
    return `${prefix}(${ddd}) ${mid}-${last}`;
  }

  if (landingWhatsappInput) {
    landingWhatsappInput.addEventListener('input', () => {
      const formatted = formatWhatsapp(landingWhatsappInput.value);
      landingWhatsappInput.value = formatted;
    });
  }

  landingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!landingMsg) return;
    const brandValue = landingForm.querySelector('input[name="brand"]')?.value.trim();
    const heroTitleValue = landingForm.querySelector('input[name="hero_title"]')?.value.trim();
    const heroSubtitleValue = landingForm.querySelector('textarea[name="hero_subtitle"]')?.value.trim();
    const leadTitleValue = landingForm.querySelector('input[name="lead_title"]')?.value.trim();
    const leadBtnValue = landingForm.querySelector('input[name="lead_button_text"]')?.value.trim();
    const whatsappDigits = (landingWhatsappInput?.value || '').replace(/\D/g,'');

    if (!brandValue || !heroTitleValue || !heroSubtitleValue || !leadTitleValue || !leadBtnValue) {
      landingMsg.textContent = 'Preencha os campos obrigatorios do hero e formulario.';
      landingMsg.className = 'landing-msg error';
      return;
    }
    if (whatsappDigits && whatsappDigits.length < 10) {
      landingMsg.textContent = 'WhatsApp incompleto. Informe DDD e numero.';
      landingMsg.className = 'landing-msg error';
      return;
    }

    landingMsg.textContent = 'Salvando alteracoes...';
    landingMsg.className = 'landing-msg';
    const submitBtn = landingForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const formData = new FormData(landingForm);
      if (landingWhatsappInput) {
        formData.set('whatsapp_number', whatsappDigits);
      }
      const resp = await fetch('../api/landing_save.php', { method: 'POST', body: formData });
      const data = await resp.json();
      if (data.ok) {
        landingMsg.textContent = 'Alteracoes salvas com sucesso.';
        landingMsg.className = 'landing-msg success';
      } else {
        landingMsg.textContent = data.msg || 'Erro ao salvar.';
        landingMsg.className = 'landing-msg error';
      }
    } catch (err) {
      landingMsg.textContent = 'Erro ao salvar.';
      landingMsg.className = 'landing-msg error';
    }
    if (submitBtn) submitBtn.disabled = false;
  });
