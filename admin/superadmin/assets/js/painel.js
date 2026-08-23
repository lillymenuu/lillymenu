  const landingForm = document.getElementById('landingForm');
  const landingMsg = document.getElementById('landingMsg');
  const landingWhatsappInput = landingForm?.querySelector('input[name="whatsapp_number"]');

  const presetButtons = document.querySelectorAll('.preset-btn');
  const presetMap = {
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

  const previewFrame = document.getElementById('landingPreviewFrame');
  if (previewFrame && landingForm) {
    const LIST_FIELDS = ['nav_links_items', 'footer_menu_items', 'footer_para_voce_items'];
    const PLAIN_LIST_FIELDS = ['segmentos_items'];

    const parseLinkList = (raw) => String(raw || '').split(/\r\n|\r|\n/).map((line) => {
      line = line.trim();
      if (!line) return null;
      const parts = line.split('|');
      const label = (parts[0] || '').trim();
      const url = (parts[1] || '').trim();
      if (!label) return null;
      return { label, url: url || '#' };
    }).filter(Boolean);

    const parsePlainList = (raw) => String(raw || '').split(/\r\n|\r|\n/).map((s) => s.trim()).filter(Boolean);

    const getFieldValue = (name) => {
      const el = landingForm.querySelector('[name="' + name + '"]');
      return el ? el.value : '';
    };

    const currentBrand = () => getFieldValue('brand') || 'Lilly Menu';
    const withBrand = (text) => String(text || '').split('{brand}').join(currentBrand());

    const buildWhatsLink = () => {
      const number = getFieldValue('whatsapp_number').replace(/\D+/g, '');
      const message = withBrand(getFieldValue('whatsapp_message')) || ('Ola! Quero conhecer o ' + currentBrand() + '.');
      return 'https://wa.me/' + number + '?text=' + encodeURIComponent(message);
    };

    const postToPreview = (fields, lists) => {
      const win = previewFrame.contentWindow;
      if (!win) return;
      win.postMessage({ type: 'lillymenu-landing-preview', fields: fields || {}, lists: lists || {} }, window.location.origin);
    };

    const computeAndSendField = (name, rawValue) => {
      const fields = {};
      const lists = {};

      if (LIST_FIELDS.includes(name)) {
        let items = parseLinkList(rawValue);
        if (name === 'nav_links_items' || name === 'footer_para_voce_items') {
          items = items.map((it) => ({ label: withBrand(it.label), url: it.url }));
        }
        lists[name] = items;
      } else if (PLAIN_LIST_FIELDS.includes(name)) {
        lists[name] = parsePlainList(rawValue);
      } else if (name === 'whatsapp_number' || name === 'whatsapp_message') {
        fields.__whats_link = buildWhatsLink();
      } else if (name === 'segmentos_titulo' || name === 'cta_item2_titulo') {
        fields[name] = withBrand(rawValue);
      } else if (name === 'brand') {
        fields[name] = rawValue;
        fields.segmentos_titulo = withBrand(getFieldValue('segmentos_titulo'));
        fields.cta_item2_titulo = withBrand(getFieldValue('cta_item2_titulo'));
        fields.__whats_link = buildWhatsLink();
        lists.nav_links_items = parseLinkList(getFieldValue('nav_links_items')).map((it) => ({ label: withBrand(it.label), url: it.url }));
        lists.footer_para_voce_items = parseLinkList(getFieldValue('footer_para_voce_items')).map((it) => ({ label: withBrand(it.label), url: it.url }));
      } else {
        fields[name] = rawValue;
      }

      postToPreview(fields, lists);
    };

    const sendFullSync = () => {
      const fields = {};
      const lists = {};
      const seen = {};
      const formData = new FormData(landingForm);
      for (const [name, value] of formData.entries()) {
        if (seen[name] || typeof value !== 'string') continue;
        seen[name] = true;
        if (LIST_FIELDS.includes(name) || PLAIN_LIST_FIELDS.includes(name)) continue;
        fields[name] = value;
      }
      fields.segmentos_titulo = withBrand(getFieldValue('segmentos_titulo'));
      fields.cta_item2_titulo = withBrand(getFieldValue('cta_item2_titulo'));
      fields.__whats_link = buildWhatsLink();
      lists.nav_links_items = parseLinkList(getFieldValue('nav_links_items')).map((it) => ({ label: withBrand(it.label), url: it.url }));
      lists.footer_menu_items = parseLinkList(getFieldValue('footer_menu_items'));
      lists.footer_para_voce_items = parseLinkList(getFieldValue('footer_para_voce_items')).map((it) => ({ label: withBrand(it.label), url: it.url }));
      lists.segmentos_items = parsePlainList(getFieldValue('segmentos_items'));
      postToPreview(fields, lists);
    };

    previewFrame.addEventListener('load', sendFullSync);
    window.__landingPreviewFullSync = sendFullSync;

    const debounceTimers = {};
    landingForm.addEventListener('input', (ev) => {
      const el = ev.target;
      const name = el.name;
      if (!name || el.type === 'file') return;
      clearTimeout(debounceTimers[name]);
      debounceTimers[name] = setTimeout(() => computeAndSendField(name, el.value), 120);
    });

    landingForm.addEventListener('change', (ev) => {
      const el = ev.target;
      if (!el.name || el.type !== 'file') return;
      const file = el.files && el.files[0];
      if (!file) return;
      const fields = {};
      fields[el.name] = URL.createObjectURL(file);
      postToPreview(fields, {});
    });
  }

  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setTimeout(() => { if (window.__landingPreviewFullSync) window.__landingPreviewFullSync(); }, 0);
    });
  });
