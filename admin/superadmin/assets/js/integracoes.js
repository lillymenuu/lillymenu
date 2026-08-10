  const integLojaSelect   = document.getElementById('integLojaSelect');
  const integForm         = document.getElementById('integForm');
  const integEmpty        = document.getElementById('integEmpty');
  const integSaveMsg      = document.getElementById('integSaveMsg');
  const btnSalvarInteg    = document.getElementById('btnSalvarInteg');
  const btnTestarZapi     = document.getElementById('btnTestarZapi');
  const btnTestarEvolution = document.getElementById('btnTestarEvolution');

  const integFields = ['zapi_instance','zapi_token','zapi_client_token','evolution_url','evolution_token','evolution_instance'];

  async function carregarConfigInteg(lojaId) {
    if (!lojaId) {
      integForm.style.display = 'none';
      integEmpty.style.display = 'block';
      return;
    }
    try {
      const resp = await fetch('../api/lojas_api_config.php?loja_id=' + lojaId);
      const data = await resp.json();
      if (data.ok && data.config) {
        integFields.forEach(key => {
          const el = document.getElementById('integ_' + key);
          if (el) el.value = data.config[key] || '';
        });
        integForm.style.display = 'block';
        integEmpty.style.display = 'none';
      }
    } catch (e) {
      integEmpty.textContent = 'Erro ao carregar configuracao.';
    }
  }

  integLojaSelect?.addEventListener('change', () => {
    if (integSaveMsg) integSaveMsg.textContent = '';
    const zapiMsg = document.getElementById('integZapiMsg');
    const evoMsg  = document.getElementById('integEvoMsg');
    if (zapiMsg) zapiMsg.textContent = '';
    if (evoMsg)  evoMsg.textContent = '';
    carregarConfigInteg(integLojaSelect.value);
  });

  // Carrega config global ao abrir a view
  if (integLojaSelect) carregarConfigInteg('0');

  btnSalvarInteg?.addEventListener('click', async () => {
    const lojaId = integLojaSelect?.value;
    if (!lojaId) return;
    integSaveMsg.textContent = 'Salvando...';
    integSaveMsg.style.color = '#64748b';
    const body = new FormData();
    body.append('loja_id', lojaId);
    integFields.forEach(key => {
      body.append(key, document.getElementById('integ_' + key)?.value || '');
    });
    try {
      const resp = await fetch('../api/lojas_api_config.php', { method: 'POST', body });
      const data = await resp.json();
      integSaveMsg.textContent = data.msg || (data.ok ? 'Salvo!' : 'Erro ao salvar.');
      integSaveMsg.style.color = data.ok ? '#16a34a' : '#ef4444';
    } catch (e) {
      integSaveMsg.textContent = 'Erro ao salvar.';
      integSaveMsg.style.color = '#ef4444';
    }
  });

  async function testarProvedor(provider, msgElId) {
    const lojaId = integLojaSelect?.value;
    if (!lojaId) return;
    const msgEl = document.getElementById(msgElId);
    if (!msgEl) return;
    msgEl.textContent = 'Testando...';
    msgEl.style.color = '#64748b';
    const body = new FormData();
    body.append('loja_id', lojaId);
    body.append('provider', provider);
    try {
      const resp = await fetch('../api/lojas_api_test.php', { method: 'POST', body });
      const data = await resp.json();
      if (!data.ok) {
        msgEl.textContent = data.msg || 'Erro na conexao.';
        msgEl.style.color = '#ef4444';
      } else if (data.connected) {
        msgEl.textContent = 'Conectado!';
        msgEl.style.color = '#16a34a';
      } else {
        const defaultMsg = provider === 'zapi'
          ? 'Instancia desconectada. Escaneie o QR em app.z-api.io'
          : 'Instancia desconectada. Escaneie o QR novamente.';
        msgEl.textContent = data.msg || defaultMsg;
        msgEl.style.color = '#f97316';
      }
    } catch (e) {
      msgEl.textContent = 'Nao foi possivel conectar.';
      msgEl.style.color = '#ef4444';
    }
  }

  btnTestarZapi?.addEventListener('click', () => testarProvedor('zapi', 'integZapiMsg'));
  btnTestarEvolution?.addEventListener('click', () => testarProvedor('evolution', 'integEvoMsg'));
