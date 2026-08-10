const toastEl = document.getElementById('settingsToast');

function mostrarToast(msg, ok){
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.background = ok ? '#16a34a' : '#111827';
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function limparErros(modalEl){
  if (!modalEl) return;
  modalEl.querySelectorAll('.settings-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });
  modalEl.querySelectorAll('.is-invalid').forEach(el => {
    el.classList.remove('is-invalid');
  });
}

function mostrarErro(modalEl, key, msg, input){
  if (input) {
    input.classList.add('is-invalid');
  }
  const el = modalEl.querySelector(`[data-error="${key}"]`);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}

function lerNumeroCampo(form, name){
  const input = form ? form.querySelector(`[name="${name}"]`) : null;
  if (!input) return { valor: null, input: null };
  const raw = (input.value || '').toString().replace(/\D/g, '');
  const valor = raw ? parseInt(raw, 10) : null;
  return { valor, input };
}

function validarTiposPedidos(modalEl){
  if (!modalEl) return true;
  const form = modalEl.querySelector('form');
  if (!form) return true;
  limparErros(modalEl);
  let ok = true;

  const entregaAtiva = form.querySelector('input[name="pedido_entrega_ativo"][type="checkbox"]')?.checked;
  if (entregaAtiva) {
    const min = lerNumeroCampo(form, 'tempo_entrega_min');
    const max = lerNumeroCampo(form, 'tempo_entrega_max');
    if (!min.valor || !max.valor) {
      mostrarErro(modalEl, 'tempo-entrega', 'Informe os tempos de entrega.', min.input || max.input);
      ok = false;
    } else if (min.valor >= max.valor) {
      mostrarErro(modalEl, 'tempo-entrega', 'O tempo de entrega minimo deve ser menor que o maximo.', min.input);
      ok = false;
    }
  }

  const horEntIni = form.querySelector('input[name="horario_entrega_ini"]');
  const horEntFim = form.querySelector('input[name="horario_entrega_fim"]');
  if (horEntIni && horEntFim) {
    const ini = horEntIni.value || '';
    const fim = horEntFim.value || '';
    if ((ini && !fim) || (!ini && fim)) {
      mostrarErro(modalEl, 'horario-entrega', 'Informe o horario de inicio e fim, ou deixe os dois em branco.', ini ? horEntFim : horEntIni);
      ok = false;
    } else if (ini && fim && ini >= fim) {
      mostrarErro(modalEl, 'horario-entrega', 'O horario inicial deve ser menor que o final.', horEntIni);
      ok = false;
    }
  }

  const retiradaAtiva = form.querySelector('input[name="pedido_retirada_ativo"][type="checkbox"]')?.checked;
  if (retiradaAtiva) {
    const min = lerNumeroCampo(form, 'tempo_retirada_min');
    const max = lerNumeroCampo(form, 'tempo_retirada_max');
    if (!min.valor || !max.valor) {
      mostrarErro(modalEl, 'tempo-retirada', 'Informe os tempos de retirada.', min.input || max.input);
      ok = false;
    } else if (min.valor >= max.valor) {
      mostrarErro(modalEl, 'tempo-retirada', 'O tempo de retirada minimo deve ser menor que o maximo.', min.input);
      ok = false;
    }
  }

  return ok;
}

function atualizarHorariosSemana(modalEl){
  if (!modalEl) return;
  const dados = {};
  const diasAtivos = [];
  let primeiroInicio = '';
  let primeiroFim = '';

  modalEl.querySelectorAll('[data-horario-dia]').forEach(row => {
    const dia = row.dataset.horarioDia;
    const aberto = row.dataset.aberto === '1';
    const inicioInput = row.querySelector('[data-role="inicio"]');
    const fimInput = row.querySelector('[data-role="fim"]');
    if (!aberto || !inicioInput || !fimInput) return;
    const inicio = inicioInput.value || '';
    const fim = fimInput.value || '';
    if (!inicio || !fim) return;
    dados[dia] = { inicio, fim };
    diasAtivos.push(parseInt(dia, 10));
    if (!primeiroInicio) {
      primeiroInicio = inicio;
      primeiroFim = fim;
    }
  });

  const jsonInput = modalEl.querySelector('#horariosSemanaInput');
  if (jsonInput) jsonInput.value = JSON.stringify(dados);

  const diasHidden = modalEl.querySelector('[data-horario-dias-hidden]');
  if (diasHidden) {
    diasHidden.querySelectorAll('input[type="checkbox"]').forEach(input => {
      const val = parseInt(input.value, 10);
      input.checked = diasAtivos.includes(val);
    });
  }

  const aberturaInput = modalEl.querySelector('#horarioAbertura');
  const fechamentoInput = modalEl.querySelector('#horarioFechamento');
  if (aberturaInput) aberturaInput.value = primeiroInicio;
  if (fechamentoInput) fechamentoInput.value = primeiroFim;
}

function atualizarAgendadosSection(section){
  if (!section) return;
  const store = section.querySelector('[data-agendados-store]');
  if (!store) return;
  const dados = {};
  section.querySelectorAll('[data-agendado-dia]').forEach(row => {
    const dia = row.dataset.agendadoDia;
    const inicioInput = row.querySelector('[data-role="inicio"]');
    const fimInput = row.querySelector('[data-role="fim"]');
    const inicio = inicioInput ? inicioInput.value : '';
    const fim = fimInput ? fimInput.value : '';
    if (dia && inicio && fim) {
      dados[dia] = { inicio, fim };
    }
  });
  store.value = JSON.stringify(dados);
}

function criarAgendadoRow(diaId, diaNome, inicio, fim){
  const row = document.createElement('div');
  row.className = 'horario-row';
  row.dataset.agendadoDia = diaId;
  row.innerHTML = `
    <div class="horario-dia">${diaNome}</div>
    <div class="horario-time">
      <input type="time" class="horario-input" data-role="inicio" value="${inicio}">
      <span class="horario-sep">ate</span>
      <input type="time" class="horario-input" data-role="fim" value="${fim}">
    </div>
    <button type="button" class="horario-trash" data-agendado-remove>
      <i class="bi bi-trash"></i>
    </button>
  `;
  return row;
}

function configurarAgendadosModal(modalEl){
  if (!modalEl || modalEl.dataset.agendadosReady) return;
  const body = modalEl.querySelector('.agendados-modal-body');
  if (!body) return;
  modalEl.dataset.agendadosReady = '1';

  const dias = JSON.parse(body.dataset.agendadosDias || '{}');
  const diasOrdenados = Object.keys(dias).map(Number).filter(Boolean);
  const inicioPadrao = body.dataset.defaultInicio || '13:00';
  const fimPadrao = body.dataset.defaultFim || '19:00';

  body.querySelectorAll('[data-agendado-toggle]').forEach(group => {
    const hidden = group.querySelector('input[type="hidden"]');
    group.addEventListener('click', e => {
      const btn = e.target.closest('.agendados-pill');
      if (!btn) return;
      group.querySelectorAll('.agendados-pill').forEach(pill => {
        pill.classList.toggle('active', pill === btn);
      });
      if (hidden) hidden.value = btn.dataset.value || '';
    });
  });

  body.querySelectorAll('[data-agendado-section]').forEach(section => {
    const list = section.querySelector('[data-agendados-list]');
    const addBtn = section.querySelector('[data-agendados-add]');

    if (list) {
      list.addEventListener('change', () => atualizarAgendadosSection(section));
      list.addEventListener('click', e => {
        const btn = e.target.closest('[data-agendado-remove]');
        if (!btn) return;
        const row = btn.closest('[data-agendado-dia]');
        if (row) {
          row.remove();
          atualizarAgendadosSection(section);
        }
      });
    }

    if (addBtn && list) {
      addBtn.addEventListener('click', () => {
        const usados = new Set(Array.from(list.querySelectorAll('[data-agendado-dia]')).map(row => row.dataset.agendadoDia));
        const proximoDia = diasOrdenados.find(dia => !usados.has(String(dia)));
        if (!proximoDia) {
          mostrarToast('Todos os dias ja estao configurados.', false);
          return;
        }
        const row = criarAgendadoRow(proximoDia, dias[proximoDia], inicioPadrao, fimPadrao);
        list.appendChild(row);
        atualizarAgendadosSection(section);
      });
    }

    atualizarAgendadosSection(section);
  });
}

function abrirHorarioDia(row, inicioPadrao, fimPadrao){
  if (!row) return;
  row.dataset.aberto = '1';
  const box = row.querySelector('.horario-time');
  const closed = row.querySelector('[data-horario-closed]');
  if (box) box.classList.remove('d-none');
  if (closed) closed.classList.add('d-none');
  const inicioInput = row.querySelector('[data-role="inicio"]');
  const fimInput = row.querySelector('[data-role="fim"]');
  if (inicioInput && !inicioInput.value) inicioInput.value = inicioPadrao;
  if (fimInput && !fimInput.value) fimInput.value = fimPadrao;
  const del = row.querySelector('[data-horario-delete]');
  if (del) del.disabled = false;
}

function fecharHorarioDia(row){
  if (!row) return;
  row.dataset.aberto = '0';
  const box = row.querySelector('.horario-time');
  const closed = row.querySelector('[data-horario-closed]');
  if (box) box.classList.add('d-none');
  if (closed) closed.classList.remove('d-none');
  const inicioInput = row.querySelector('[data-role="inicio"]');
  const fimInput = row.querySelector('[data-role="fim"]');
  if (inicioInput) inicioInput.value = '';
  if (fimInput) fimInput.value = '';
  const del = row.querySelector('[data-horario-delete]');
  if (del) del.disabled = true;
}

function formatarDocumentoPix(valor){
  const digits = valor.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return valor.trim();
}

function normalizarPercentual(valor){
  const cleaned = valor.replace(',', '.').replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  const safe = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
  const numero = parseFloat(safe);
  if (Number.isNaN(numero)) return '';
  return Math.min(100, Math.max(0, numero)).toFixed(2);
}

function formatarMoeda(valor){
  const numero = Number(valor || 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numero);
}

function validarFormasPagamento(modalEl){
  if (!modalEl) return false;
  const form = modalEl.querySelector('form');
  if (!form) return false;
  limparErros(modalEl);

  const ativos = [
    'pagamento_dinheiro_ativo',
    'pagamento_pix_ativo',
    'pagamento_credito_ativo',
    'pagamento_debito_ativo',
    'pagamento_voucher_ativo',
    'pagamento_fiado_ativo'
  ];

  const algumAtivo = ativos.some(name => {
    const input = form.querySelector(`[name="${name}"]`);
    return input && input.checked;
  });

  let ok = true;
  if (!algumAtivo) {
    mostrarErro(modalEl, 'pagamento-geral', 'Ative pelo menos uma forma de pagamento.');
    ok = false;
  }

  const pixAtivo = form.querySelector('[name="pagamento_pix_ativo"]');
  const pixChave = form.querySelector('[name="pagamento_pix_chave"]');
  const pixNome = form.querySelector('[name="pagamento_pix_nome"]');
  if (pixAtivo && pixAtivo.checked) {
    if (!pixChave || pixChave.value.trim() === '') {
      mostrarErro(modalEl, 'pix-chave', 'Informe a chave pix.', pixChave);
      ok = false;
    }
    if (!pixNome || pixNome.value.trim() === '') {
      mostrarErro(modalEl, 'pix-nome', 'Informe o nome da chave pix.', pixNome);
      ok = false;
    }
  }

  const creditoAtivo = form.querySelector('[name="pagamento_credito_ativo"]');
  if (creditoAtivo && creditoAtivo.checked) {
    const bandeiras = Array.from(form.querySelectorAll('[data-bandeira-grupo="credito"]')).filter(el => el.checked);
    if (!bandeiras.length) {
      mostrarErro(modalEl, 'credito-bandeiras', 'Selecione ao menos uma bandeira de credito.');
      ok = false;
    }
  }

  const debitoAtivo = form.querySelector('[name="pagamento_debito_ativo"]');
  if (debitoAtivo && debitoAtivo.checked) {
    const bandeiras = Array.from(form.querySelectorAll('[data-bandeira-grupo="debito"]')).filter(el => el.checked);
    if (!bandeiras.length) {
      mostrarErro(modalEl, 'debito-bandeiras', 'Selecione ao menos uma bandeira de debito.');
      ok = false;
    }
  }

  const creditoTaxaToggle = form.querySelector('[name="pagamento_credito_taxa_ativa"]');
  const creditoTaxa = form.querySelector('[name="pagamento_credito_taxa"]');
  if (creditoTaxaToggle && creditoTaxaToggle.checked) {
    const valor = parseFloat((creditoTaxa ? creditoTaxa.value : '').replace(',', '.'));
    if (!creditoTaxa || Number.isNaN(valor) || valor <= 0 || valor > 100) {
      mostrarErro(modalEl, 'credito-taxa', 'Informe uma taxa valida (0 a 100).', creditoTaxa);
      ok = false;
    }
  }

  const debitoTaxaToggle = form.querySelector('[name="pagamento_debito_taxa_ativa"]');
  const debitoTaxa = form.querySelector('[name="pagamento_debito_taxa"]');
  if (debitoTaxaToggle && debitoTaxaToggle.checked) {
    const valor = parseFloat((debitoTaxa ? debitoTaxa.value : '').replace(',', '.'));
    if (!debitoTaxa || Number.isNaN(valor) || valor <= 0 || valor > 100) {
      mostrarErro(modalEl, 'debito-taxa', 'Informe uma taxa valida (0 a 100).', debitoTaxa);
      ok = false;
    }
  }

  return ok;
}

function pegarToggle(form, name){
  const input = form.querySelector(`[name="${name}"]`);
  return input && input.checked ? '1' : '0';
}

function pegarValor(form, name){
  const input = form.querySelector(`[name="${name}"]`);
  return input ? input.value.trim() : '';
}

function validarCashback(modalEl){
  if (!modalEl) return false;
  const form = modalEl.querySelector('form');
  if (!form) return false;
  limparErros(modalEl);

  const ativo = form.querySelector('[name="cashback_ativo"]');
  if (!ativo || !ativo.checked) {
    return true;
  }

  let ok = true;
  const diasInput = form.querySelector('[name="cashback_expira_dias"]');
  const dias = parseInt((diasInput ? diasInput.value : ''), 10);
  if (!diasInput || Number.isNaN(dias) || dias <= 0) {
    mostrarErro(modalEl, 'cashback-dias', 'Informe um numero de dias valido.', diasInput);
    ok = false;
  }

  const percentualInput = form.querySelector('[name="cashback_percentual"]');
  const percentual = parseFloat((percentualInput ? percentualInput.value : '').replace(',', '.'));
  if (!percentualInput || Number.isNaN(percentual) || percentual <= 0 || percentual > 100) {
    mostrarErro(modalEl, 'cashback-percentual', 'Informe um percentual valido (0 a 100).', percentualInput);
    ok = false;
  }

  return ok;
}

function atualizarPreviewCashback(modalEl){
  if (!modalEl) return;
  const preview = modalEl.querySelector('[data-cashback-preview]');
  if (!preview) return;
  const percentInput = modalEl.querySelector('[name="cashback_percentual"]');
  const ativo = modalEl.querySelector('[name="cashback_ativo"]');
  const pago = 50;
  const percentual = parseFloat((percentInput ? percentInput.value : '0').replace(',', '.'));
  const valido = ativo && ativo.checked && !Number.isNaN(percentual) ? Math.max(0, percentual) : 0;
  const valor = pago * (valido / 100);

  const pagoEl = preview.querySelector('[data-cashback-pago]');
  const valorEl = preview.querySelector('[data-cashback-valor]');
  if (pagoEl) pagoEl.textContent = formatarMoeda(pago);
  if (valorEl) valorEl.textContent = formatarMoeda(valor);
}

function salvarCashback(modalEl){
  if (!modalEl) return Promise.resolve(false);
  if (!validarCashback(modalEl)) return Promise.resolve(false);
  const form = modalEl.querySelector('form');
  if (!form) return Promise.resolve(false);

  const params = new URLSearchParams();
  const ativo = pegarToggle(form, 'cashback_ativo');
  const dias = pegarValor(form, 'cashback_expira_dias');
  const percentual = normalizarPercentual(pegarValor(form, 'cashback_percentual')) || '0';

  params.set('cashback_ativo', ativo);
  params.set('cashback_expira_dias', dias || '0');
  params.set('cashback_percentual', percentual);

  return fetch('api/configuracoes_save.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  })
    .then(r => r.json())
    .then(resp => {
      const ok = resp && resp.ok;
      const msg = ok ? 'Configuracoes salvas.' : (resp && resp.msg ? resp.msg : 'Erro ao salvar.');
      mostrarToast(msg, ok);
      return ok;
    })
    .catch(() => {
      mostrarToast('Erro ao salvar.', false);
      return false;
    });
}

function normalizarMoeda(valor){
  const numero = parseFloat(String(valor || '0').replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isNaN(numero) ? '0' : Math.max(0, numero).toFixed(2);
}

function salvarValorMinimo(modalEl){
  if (!modalEl) return Promise.resolve(false);
  const form = modalEl.querySelector('form');
  if (!form) return Promise.resolve(false);

  const params = new URLSearchParams();
  params.set('pedido_minimo_entrega_ativo', pegarToggle(form, 'pedido_minimo_entrega_ativo'));
  params.set('pedido_minimo_entrega', normalizarMoeda(pegarValor(form, 'pedido_minimo_entrega')));
  params.set('pedido_minimo_retirada_ativo', pegarToggle(form, 'pedido_minimo_retirada_ativo'));
  params.set('pedido_minimo_retirada', normalizarMoeda(pegarValor(form, 'pedido_minimo_retirada')));

  return fetch('api/configuracoes_save.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  })
    .then(r => r.json())
    .then(resp => {
      const ok = resp && resp.ok;
      const msg = ok ? 'Configuracoes salvas.' : (resp && resp.msg ? resp.msg : 'Erro ao salvar.');
      mostrarToast(msg, ok);
      return ok;
    })
    .catch(() => {
      mostrarToast('Erro ao salvar.', false);
      return false;
    });
}

function salvarFormasPagamento(modalEl){
  const form = modalEl.querySelector('form');
  if (!form) return Promise.resolve(false);
  if (!validarFormasPagamento(modalEl)) {
    return Promise.resolve(false);
  }
  const params = new URLSearchParams();

  params.set('pagamento_dinheiro_ativo', pegarToggle(form, 'pagamento_dinheiro_ativo'));
  params.set('pagamento_pix_ativo', pegarToggle(form, 'pagamento_pix_ativo'));
  params.set('pagamento_pix_chave', pegarValor(form, 'pagamento_pix_chave'));
  params.set('pagamento_pix_nome', pegarValor(form, 'pagamento_pix_nome'));
  params.set('pagamento_credito_ativo', pegarToggle(form, 'pagamento_credito_ativo'));
  params.set('pagamento_credito_taxa_ativa', pegarToggle(form, 'pagamento_credito_taxa_ativa'));
  const creditoTaxaValor = normalizarPercentual(pegarValor(form, 'pagamento_credito_taxa')) || '0';
  params.set('pagamento_credito_taxa', creditoTaxaValor);
  params.set('pagamento_debito_ativo', pegarToggle(form, 'pagamento_debito_ativo'));
  params.set('pagamento_debito_taxa_ativa', pegarToggle(form, 'pagamento_debito_taxa_ativa'));
  const debitoTaxaValor = normalizarPercentual(pegarValor(form, 'pagamento_debito_taxa')) || '0';
  params.set('pagamento_debito_taxa', debitoTaxaValor);
  params.set('pagamento_voucher_ativo', pegarToggle(form, 'pagamento_voucher_ativo'));
  params.set('pagamento_fiado_ativo', pegarToggle(form, 'pagamento_fiado_ativo'));

  const creditoBandeiras = Array.from(form.querySelectorAll('[data-bandeira-grupo="credito"]'))
    .filter(el => el.checked)
    .map(el => el.value);
  const debitoBandeiras = Array.from(form.querySelectorAll('[data-bandeira-grupo="debito"]'))
    .filter(el => el.checked)
    .map(el => el.value);

  params.set('pagamento_credito_bandeiras', creditoBandeiras.join(','));
  params.set('pagamento_debito_bandeiras', debitoBandeiras.join(','));
  const creditoCustom = pegarValor(form, 'pagamento_credito_bandeiras_custom');
  const debitoCustom = pegarValor(form, 'pagamento_debito_bandeiras_custom');
  params.set('pagamento_credito_bandeiras_custom', creditoCustom);
  params.set('pagamento_debito_bandeiras_custom', debitoCustom);

  return fetch('api/configuracoes_save.php', {
    method:'POST',
    headers:{ 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  })
  .then(r => r.json())
  .then(resp => {
    const ok = resp && resp.ok;
    const msg = ok ? 'Configuracoes salvas.' : (resp && resp.msg ? resp.msg : 'Erro ao salvar.');
    mostrarToast(msg, ok);
    return ok;
  })
  .catch(() => {
    mostrarToast('Erro ao salvar.', false);
    return false;
  });
}

function salvarModal(modalId){
  const modalEl = document.getElementById(modalId);
  if (!modalEl) return Promise.resolve(false);
  if (modalId === 'modal-formas-pagamento') {
    return salvarFormasPagamento(modalEl);
  }
  if (modalId === 'modal-cashback') {
    return salvarCashback(modalEl);
  }
  if (modalId === 'modal-valor-minimo') {
    return salvarValorMinimo(modalEl);
  }
  if (modalId === 'modal-horarios') {
    atualizarHorariosSemana(modalEl);
  }
    if (modalId === 'modal-pedidos-agendados') {
      modalEl.querySelectorAll('[data-agendado-section]').forEach(section => {
        atualizarAgendadosSection(section);
      });
    }
    if (modalId === 'modal-tipos-pedidos') {
      if (!validarTiposPedidos(modalEl)) {
        return Promise.resolve(false);
      }
    }
    const form = modalEl.querySelector('form');
  if (!form) return Promise.resolve(false);
  const dados = new FormData(form);
  return fetch('api/configuracoes_save.php',{
    method:'POST',
    body:dados
  })
  .then(r => r.json())
  .then(resp => {
    const ok = resp && resp.ok;
    const msg = ok ? 'Configuracoes salvas.' : (resp && resp.msg ? resp.msg : 'Erro ao salvar.');
    mostrarToast(msg, ok);
    return ok;
  })
  .catch(() => {
    mostrarToast('Erro ao salvar.', false);
    return false;
  });
}

function prepararTogglesTaxa(modalEl){
  if (!modalEl) return;
  const toggles = modalEl.querySelectorAll('[data-extra-toggle]');
  toggles.forEach(toggle => {
    const grupo = toggle.dataset.extraToggle;
    const input = modalEl.querySelector(`[data-extra-input="${grupo}"]`);
    const atualizar = () => {
      if (!input) return;
      input.disabled = !toggle.checked;
    };
    atualizar();
    toggle.addEventListener('change', atualizar);
  });
}

const modalPagamento = document.getElementById('modal-formas-pagamento');

function atualizarCustomStore(form, grupo, lista){
  const store = form.querySelector(`[data-custom-store="${grupo}"]`);
  if (store) {
    store.value = JSON.stringify(lista);
  }
}

function slugificar(valor){
  const normalizado = typeof valor.normalize === 'function'
    ? valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : valor;
  return normalizado
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function obterCustomLista(form, grupo){
  const store = form.querySelector(`[data-custom-store="${grupo}"]`);
  if (!store || !store.value) return [];
  try {
    const lista = JSON.parse(store.value);
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function adicionarBandeiraCustom(modalEl, grupo){
  const form = modalEl.querySelector('form');
  const input = modalEl.querySelector(`[data-custom-input="${grupo}"]`);
  const grid = modalEl.querySelector(`[data-bandeira-grupo="${grupo}"]`)?.closest('.payment-flag-grid');
  if (!form || !input || !grid) return;

  const valor = input.value.trim();
  limparErros(modalEl);
  if (!valor) {
    mostrarErro(modalEl, `${grupo}-custom`, 'Informe o nome da bandeira.', input);
    return;
  }

  const slugBase = slugificar(valor);
  if (!slugBase) {
    mostrarErro(modalEl, `${grupo}-custom`, 'Nome invalido.', input);
    return;
  }

  const existentes = Array.from(grid.querySelectorAll('input[type="checkbox"]')).map(el => el.value);
  let slug = slugBase;
  let contador = 2;
  while (existentes.includes(slug)) {
    slug = `${slugBase}-${contador}`;
    contador += 1;
  }

  const label = document.createElement('label');
  label.className = 'payment-flag';
  label.innerHTML = `<input type="checkbox" value="${slug}" data-bandeira-grupo="${grupo}" checked><span></span>`;
  label.querySelector('span').textContent = valor;
  grid.appendChild(label);

  const lista = obterCustomLista(form, grupo);
  lista.push({ slug, label: valor });
  atualizarCustomStore(form, grupo, lista);
  input.value = '';
}

function configurarCustomBandeiras(modalEl){
  if (!modalEl) return;
  modalEl.querySelectorAll('[data-custom-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const grupo = btn.dataset.customToggle;
      const form = modalEl.querySelector(`[data-custom-form="${grupo}"]`);
      if (!form) return;
      form.classList.toggle('show');
    });
  });

  modalEl.querySelectorAll('[data-custom-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const grupo = btn.dataset.customAdd;
      adicionarBandeiraCustom(modalEl, grupo);
    });
  });

  modalEl.querySelectorAll('[data-custom-input]').forEach(input => {
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const grupo = input.dataset.customInput;
      adicionarBandeiraCustom(modalEl, grupo);
    });
  });
}

function aplicarMascaras(modalEl){
  if (!modalEl) return;
  const pixInput = modalEl.querySelector('[data-mask="pix"]');
  if (pixInput) {
    pixInput.addEventListener('blur', () => {
      pixInput.value = formatarDocumentoPix(pixInput.value);
    });
  }

  modalEl.querySelectorAll('[data-mask="percent"]').forEach(input => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(',', '.').replace(/[^0-9.]/g, '');
    });
    input.addEventListener('blur', () => {
      const valor = normalizarPercentual(input.value);
      input.value = valor;
    });
  });

  modalEl.querySelectorAll('[data-mask="dias"]').forEach(input => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '');
    });
  });
}

if (modalPagamento) {
  prepararTogglesTaxa(modalPagamento);
  modalPagamento.addEventListener('show.bs.modal', () => {
    limparErros(modalPagamento);
    prepararTogglesTaxa(modalPagamento);
  });
  configurarCustomBandeiras(modalPagamento);
  aplicarMascaras(modalPagamento);
}

const modalValorMinimo = document.getElementById('modal-valor-minimo');
if (modalValorMinimo) {
  prepararTogglesTaxa(modalValorMinimo);
  modalValorMinimo.addEventListener('show.bs.modal', () => {
    prepararTogglesTaxa(modalValorMinimo);
  });
}

const modalReceberPedidos = document.getElementById('modal-receber-pedidos');
if (modalReceberPedidos) {
  const diggyToggle = modalReceberPedidos.querySelector('[data-diggy-toggle]');
  const diggyStatus = modalReceberPedidos.querySelector('[data-diggy-status]');
  if (diggyToggle && diggyStatus) {
    diggyToggle.addEventListener('change', () => {
      diggyStatus.textContent = diggyToggle.checked ? 'habilitado' : 'desabilitado';
    });
  }
}

  const modalCashback = document.getElementById('modal-cashback');
  if (modalCashback) {
    aplicarMascaras(modalCashback);
    const percentInput = modalCashback.querySelector('[name="cashback_percentual"]');
    const toggleInput = modalCashback.querySelector('[name="cashback_ativo"]');
    const diasInput = modalCashback.querySelector('[name="cashback_expira_dias"]');
    const atualizarEstadoCashback = () => {
      const ativo = !!(toggleInput && toggleInput.checked);
      if (diasInput) diasInput.disabled = !ativo;
      if (percentInput) percentInput.disabled = !ativo;
      modalCashback.classList.toggle('cashback-disabled', !ativo);
    };
    modalCashback.addEventListener('show.bs.modal', () => {
      limparErros(modalCashback);
      atualizarEstadoCashback();
      atualizarPreviewCashback(modalCashback);
    });

  if (percentInput) {
    percentInput.addEventListener('input', () => atualizarPreviewCashback(modalCashback));
    percentInput.addEventListener('blur', () => atualizarPreviewCashback(modalCashback));
  }
  if (toggleInput) {
    toggleInput.addEventListener('change', () => {
      atualizarEstadoCashback();
      atualizarPreviewCashback(modalCashback);
    });
  }
    if (diasInput) {
      diasInput.addEventListener('input', () => {
        diasInput.value = diasInput.value.replace(/\D/g, '');
      });
    }
    atualizarEstadoCashback();
  }

  const modalTipos = document.getElementById('modal-tipos-pedidos');
  if (modalTipos) {
    aplicarMascaras(modalTipos);
    modalTipos.addEventListener('show.bs.modal', () => {
      limparErros(modalTipos);
    });
    const toggleEntrega = modalTipos.querySelector('input[name="pedido_entrega_ativo"][type="checkbox"]');
    const toggleRetirada = modalTipos.querySelector('input[name="pedido_retirada_ativo"][type="checkbox"]');
    const entregaMin = modalTipos.querySelector('input[name="tempo_entrega_min"]');
    const entregaMax = modalTipos.querySelector('input[name="tempo_entrega_max"]');
    const retiradaMin = modalTipos.querySelector('input[name="tempo_retirada_min"]');
    const retiradaMax = modalTipos.querySelector('input[name="tempo_retirada_max"]');
    const entregaCard = entregaMin ? entregaMin.closest('.tipos-card') : null;
    const retiradaCard = retiradaMin ? retiradaMin.closest('.tipos-card') : null;

    const atualizarTiposEstado = () => {
      const entregaAtiva = !!(toggleEntrega && toggleEntrega.checked);
      const retiradaAtiva = !!(toggleRetirada && toggleRetirada.checked);
      [entregaMin, entregaMax].forEach(input => {
        if (input) input.disabled = !entregaAtiva;
      });
      [retiradaMin, retiradaMax].forEach(input => {
        if (input) input.disabled = !retiradaAtiva;
      });
      if (entregaCard) entregaCard.classList.toggle('is-disabled', !entregaAtiva);
      if (retiradaCard) retiradaCard.classList.toggle('is-disabled', !retiradaAtiva);
      const semCampos = !entregaAtiva && !retiradaAtiva;
      modalTipos.classList.toggle('tipos-compact', semCampos);
    };

    if (toggleEntrega) {
      toggleEntrega.addEventListener('change', atualizarTiposEstado);
    }
    if (toggleRetirada) {
      toggleRetirada.addEventListener('change', atualizarTiposEstado);
    }
    modalTipos.addEventListener('show.bs.modal', atualizarTiposEstado);
    atualizarTiposEstado();
  }

  const modalHorarios = document.getElementById('modal-horarios');
if (modalHorarios) {
  const container = modalHorarios.querySelector('[data-default-inicio]');
  const inicioPadrao = container ? container.dataset.defaultInicio : '13:00';
  const fimPadrao = container ? container.dataset.defaultFim : '19:00';
  let horariosSalvarTimer = null;
  const modalHorariosCriar = document.getElementById('modal-horarios-criar');
  const modalHorariosCriarInstance = modalHorariosCriar ? new bootstrap.Modal(modalHorariosCriar) : null;
  const btnHorarioCriar = document.getElementById('btnHorarioCriar');

  modalHorarios.addEventListener('show.bs.modal', () => {
    atualizarHorariosSemana(modalHorarios);
  });

  if (btnHorarioCriar && modalHorariosCriarInstance) {
    btnHorarioCriar.addEventListener('click', () => {
      const instance = bootstrap.Modal.getInstance(modalHorarios);
      if (instance) instance.hide();
      modalHorariosCriarInstance.show();
    });
  }

  if (modalHorariosCriar) {
    modalHorariosCriar.addEventListener('hidden.bs.modal', () => {
      const instance = bootstrap.Modal.getInstance(modalHorarios);
      if (instance) instance.show();
    });
  }

  const agendarSalvarHorarios = () => {
    atualizarHorariosSemana(modalHorarios);
    clearTimeout(horariosSalvarTimer);
    horariosSalvarTimer = setTimeout(() => {
      salvarModal('modal-horarios');
    }, 400);
  };

  modalHorarios.querySelectorAll('[data-horario-dia]').forEach(row => {
    const closedBtn = row.querySelector('[data-horario-closed]');
    const deleteBtn = row.querySelector('[data-horario-delete]');
    const inputs = row.querySelectorAll('[data-role]');

    if (closedBtn) {
      closedBtn.addEventListener('click', () => {
        abrirHorarioDia(row, inicioPadrao, fimPadrao);
        agendarSalvarHorarios();
      });
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        fecharHorarioDia(row);
        agendarSalvarHorarios();
      });
    }
    inputs.forEach(input => {
      input.addEventListener('change', agendarSalvarHorarios);
    });
  });

  if (modalHorariosCriar) {
    const dayButtons = modalHorariosCriar.querySelectorAll('[data-dia]');
    const inicioInput = modalHorariosCriar.querySelector('#horarioCreateInicio');
    const fimInput = modalHorariosCriar.querySelector('#horarioCreateFim');
    const erroEl = modalHorariosCriar.querySelector('#horarioCreateError');
    const salvarBtn = modalHorariosCriar.querySelector('#btnSalvarHorarioCreate');

    dayButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('is-active');
      });
    });

    if (salvarBtn) {
      salvarBtn.addEventListener('click', () => {
        if (erroEl) {
          erroEl.textContent = '';
          erroEl.classList.remove('show');
        }
        const selecionados = Array.from(dayButtons).filter(btn => btn.classList.contains('is-active'));
        const inicio = inicioInput ? inicioInput.value : '';
        const fim = fimInput ? fimInput.value : '';

        if (!selecionados.length) {
          if (erroEl) {
            erroEl.textContent = 'Selecione ao menos um dia.';
            erroEl.classList.add('show');
          }
          return;
        }
        if (!inicio || !fim) {
          if (erroEl) {
            erroEl.textContent = 'Informe horario de abertura e fechamento.';
            erroEl.classList.add('show');
          }
          return;
        }

        selecionados.forEach(btn => {
          const dia = btn.dataset.dia;
          const row = modalHorarios.querySelector(`[data-horario-dia="${dia}"]`);
          if (!row) return;
          abrirHorarioDia(row, inicio, fim);
          const inicioRow = row.querySelector('[data-role="inicio"]');
          const fimRow = row.querySelector('[data-role="fim"]');
          if (inicioRow) inicioRow.value = inicio;
          if (fimRow) fimRow.value = fim;
        });

        atualizarHorariosSemana(modalHorarios);
        salvarModal('modal-horarios').then(ok => {
          if (ok && modalHorariosCriarInstance) {
            modalHorariosCriarInstance.hide();
          }
        });
      });
    }
  }
}

const modalPausa = document.getElementById('modal-pausa');
if (modalPausa) {
  const modalPausaCriar = document.getElementById('modal-pausa-criar');
  const modalPausaCriarInstance = modalPausaCriar ? new bootstrap.Modal(modalPausaCriar) : null;
  const modalPausaExcluirEl = document.getElementById('modal-pausa-excluir');
  const modalPausaExcluirInstance = modalPausaExcluirEl ? new bootstrap.Modal(modalPausaExcluirEl) : null;
  const btnConfirmarExcluirPausa = document.getElementById('btnConfirmarExcluirPausa');
  const btnPausaCriar = document.getElementById('btnPausaCriar');
  const pausaList = modalPausa.querySelector('#pausaList');
  const pausaListEmpty = modalPausa.querySelector('#pausaListEmpty');
  let pausaExcluirId = null;

  const formatarDataBR = (iso) => {
    const partes = iso.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const carregarPausas = () => {
    if (!pausaList) return;
    fetch('api/pausas_list.php')
      .then(r => r.json())
      .then(data => {
        if (!data.ok) return;
        pausaList.querySelectorAll('.pausa-list-item').forEach(el => el.remove());
        if (!data.pausas.length) {
          if (pausaListEmpty) pausaListEmpty.style.display = '';
          return;
        }
        if (pausaListEmpty) pausaListEmpty.style.display = 'none';
        data.pausas.forEach(p => {
          const item = document.createElement('div');
          item.className = 'pausa-list-item';
          const periodo = `${formatarDataBR(p.data_inicio)} ${p.hora_inicio.slice(0, 5)} - ${formatarDataBR(p.data_fim)} ${p.hora_fim.slice(0, 5)}`;
          item.innerHTML = `
            <div class="pausa-list-item-info">
              <div class="pausa-list-item-title"></div>
              <div class="pausa-list-item-period"></div>
            </div>
            <button type="button" class="pausa-list-trash" data-pausa-delete="${p.id}">
              <i class="bi bi-trash"></i>
            </button>
          `;
          item.querySelector('.pausa-list-item-title').textContent = p.titulo;
          item.querySelector('.pausa-list-item-period').textContent = periodo;
          pausaList.appendChild(item);
        });
      })
      .catch(() => {});
  };

  modalPausa.addEventListener('show.bs.modal', carregarPausas);

  if (pausaList) {
    pausaList.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-pausa-delete]');
      if (!btn) return;
      pausaExcluirId = btn.dataset.pausaDelete;
      if (modalPausaExcluirInstance) {
        const instance = bootstrap.Modal.getInstance(modalPausa);
        if (instance) instance.hide();
        modalPausaExcluirInstance.show();
      }
    });
  }

  if (btnConfirmarExcluirPausa) {
    btnConfirmarExcluirPausa.addEventListener('click', () => {
      if (!pausaExcluirId) return;
      btnConfirmarExcluirPausa.disabled = true;
      fetch('api/pausa_delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pausaExcluirId })
      })
        .then(r => r.json())
        .then(data => {
          if (data.ok) {
            mostrarToast('Pausa removida.', true);
          } else {
            mostrarToast(data.msg || 'Erro ao remover pausa.', false);
          }
        })
        .catch(() => mostrarToast('Erro ao remover pausa.', false))
        .finally(() => {
          btnConfirmarExcluirPausa.disabled = false;
          pausaExcluirId = null;
          if (modalPausaExcluirInstance) modalPausaExcluirInstance.hide();
        });
    });
  }

  if (modalPausaExcluirEl) {
    modalPausaExcluirEl.addEventListener('hidden.bs.modal', () => {
      const instance = bootstrap.Modal.getInstance(modalPausa);
      if (instance) instance.show();
    });
  }

  if (btnPausaCriar && modalPausaCriarInstance) {
    btnPausaCriar.addEventListener('click', () => {
      const instance = bootstrap.Modal.getInstance(modalPausa);
      if (instance) instance.hide();
      modalPausaCriarInstance.show();
    });
  }

  if (modalPausaCriar) {
    modalPausaCriar.addEventListener('hidden.bs.modal', () => {
      const instance = bootstrap.Modal.getInstance(modalPausa);
      if (instance) instance.show();
    });
  }
}

const modalPausaCriar = document.getElementById('modal-pausa-criar');
if (modalPausaCriar) {
  const tituloInput = modalPausaCriar.querySelector('#pausaTitulo');
  const tituloCount = modalPausaCriar.querySelector('#pausaTituloCount');
  const horaInicioInput = modalPausaCriar.querySelector('#pausaHoraInicio');
  const horaFimInput = modalPausaCriar.querySelector('#pausaHoraFim');
  const erroEl = modalPausaCriar.querySelector('#pausaCreateError');
  const salvarBtn = modalPausaCriar.querySelector('#btnSalvarPausaCreate');
  const calendarEl = modalPausaCriar.querySelector('#pausaCalendar');
  let pausaFp = null;
  let datasPausaSelecionadas = [];

  const formatarDataISO = (date) => {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  if (tituloInput && tituloCount) {
    const atualizarContador = () => {
      tituloCount.textContent = `${tituloInput.value.length}/100`;
    };
    tituloInput.addEventListener('input', atualizarContador);
    atualizarContador();
  }

  modalPausaCriar.addEventListener('shown.bs.modal', () => {
    if (!pausaFp && calendarEl && typeof flatpickr === 'function') {
      const largura = calendarEl.offsetWidth || modalPausaCriar.querySelector('.modal-dialog').offsetWidth;
      pausaFp = flatpickr(calendarEl, {
        inline: true,
        mode: 'range',
        showMonths: largura < 560 ? 1 : 2,
        locale: 'pt',
        minDate: 'today',
        onChange: (selectedDates) => {
          datasPausaSelecionadas = selectedDates;
        }
      });
    }
  });

  if (salvarBtn) {
    salvarBtn.addEventListener('click', () => {
      if (erroEl) {
        erroEl.textContent = '';
        erroEl.classList.remove('show');
      }
      const titulo = tituloInput ? tituloInput.value.trim() : '';
      const horaInicio = horaInicioInput ? horaInicioInput.value : '';
      const horaFim = horaFimInput ? horaFimInput.value : '';

      if (!titulo) {
        if (erroEl) { erroEl.textContent = 'Informe o titulo da pausa.'; erroEl.classList.add('show'); }
        return;
      }
      if (!datasPausaSelecionadas.length) {
        if (erroEl) { erroEl.textContent = 'Selecione a data da pausa.'; erroEl.classList.add('show'); }
        return;
      }
      if (!horaInicio || !horaFim) {
        if (erroEl) { erroEl.textContent = 'Informe o horario inicial e final.'; erroEl.classList.add('show'); }
        return;
      }

      const dataInicio = formatarDataISO(datasPausaSelecionadas[0]);
      const dataFim = formatarDataISO(datasPausaSelecionadas[datasPausaSelecionadas.length - 1]);

      salvarBtn.disabled = true;
      fetch('api/pausa_save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          data_inicio: dataInicio,
          hora_inicio: horaInicio,
          data_fim: dataFim,
          hora_fim: horaFim
        })
      })
        .then(r => r.json())
        .then(data => {
          salvarBtn.disabled = false;
          if (data.ok) {
            mostrarToast('Pausa programada criada.', true);
            tituloInput.value = '';
            if (tituloCount) tituloCount.textContent = '0/100';
            if (pausaFp) pausaFp.clear();
            const instance = bootstrap.Modal.getInstance(modalPausaCriar);
            if (instance) instance.hide();
          } else if (erroEl) {
            erroEl.textContent = data.msg || 'Erro ao salvar pausa.';
            erroEl.classList.add('show');
          }
        })
        .catch(() => {
          salvarBtn.disabled = false;
          if (erroEl) {
            erroEl.textContent = 'Erro ao salvar pausa.';
            erroEl.classList.add('show');
          }
        });
    });
  }
}

const modalAgendados = document.getElementById('modal-pedidos-agendados');
if (modalAgendados) {
  aplicarMascaras(modalAgendados);
  configurarAgendadosModal(modalAgendados);
  modalAgendados.addEventListener('show.bs.modal', () => {
    limparErros(modalAgendados);
    modalAgendados.querySelectorAll('[data-agendado-section]').forEach(section => {
      atualizarAgendadosSection(section);
    });
  });
}

const modalLojaInfo = document.getElementById('modal-loja-info');
if (modalLojaInfo) {
  const capaCard = modalLojaInfo.querySelector('#lojaCapaCard');
  const perfilCard = modalLojaInfo.querySelector('#lojaPerfilCard');
  const capaInput = modalLojaInfo.querySelector('#lojaCapaInput');
  const perfilInput = modalLojaInfo.querySelector('#lojaPerfilInput');
  const capaPreview = modalLojaInfo.querySelector('#lojaCapaPreview');
  const perfilPreview = modalLojaInfo.querySelector('#lojaPerfilPreview');
  const capaPlaceholder = modalLojaInfo.querySelector('#lojaCapaPlaceholder');
  const perfilPlaceholder = modalLojaInfo.querySelector('#lojaPerfilPlaceholder');
  const capaRemove = modalLojaInfo.querySelector('#lojaCapaRemover');
  const perfilRemove = modalLojaInfo.querySelector('#lojaPerfilRemover');
  const capaBase64 = modalLojaInfo.querySelector('#lojaCapaBase64');
  const perfilBase64 = modalLojaInfo.querySelector('#lojaPerfilBase64');
  const capaRemoverFlag = modalLojaInfo.querySelector('#lojaCapaRemoverFlag');
  const perfilRemoverFlag = modalLojaInfo.querySelector('#lojaPerfilRemoverFlag');
  const descricaoInput = modalLojaInfo.querySelector('#lojaDescricao');
  const descricaoCount = modalLojaInfo.querySelector('#lojaDescricaoCount');
  const linkSlug = modalLojaInfo.querySelector('#lojaLinkSlug');
  const linkPreview = modalLojaInfo.querySelector('#lojaLinkPreview');
  const linkHidden = modalLojaInfo.querySelector('#lojaLinkHidden');
  const linkCopy = modalLojaInfo.querySelector('#lojaLinkCopy');

  const redimensionarImagemParaBase64 = (file, maxDim) => new Promise((resolve, reject) => {
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
      resolve(canvas.toDataURL(tipo, 0.92));
    };
    img.onerror = () => reject(new Error('Nao foi possivel processar a imagem.'));
    img.src = url;
  });

  const atualizarPreview = (src, preview, placeholder) => {
    if (!preview || !placeholder) return;
    if (src) {
      preview.src = src;
      preview.classList.remove('d-none');
      placeholder.classList.add('d-none');
    } else {
      preview.src = '';
      preview.classList.add('d-none');
      placeholder.classList.remove('d-none');
    }
  };

  if (capaPreview && capaPreview.getAttribute('src')) {
    atualizarPreview(capaPreview.getAttribute('src'), capaPreview, capaPlaceholder);
  }
  if (perfilPreview && perfilPreview.getAttribute('src')) {
    atualizarPreview(perfilPreview.getAttribute('src'), perfilPreview, perfilPlaceholder);
  }

  if (capaCard && capaInput) {
    capaCard.addEventListener('click', () => capaInput.click());
  }
  if (perfilCard && perfilInput) {
    perfilCard.addEventListener('click', () => perfilInput.click());
  }

  if (capaRemove) {
    capaRemove.addEventListener('click', event => {
      event.stopPropagation();
      if (capaBase64) capaBase64.value = '';
      if (capaRemoverFlag) capaRemoverFlag.value = '1';
      atualizarPreview('', capaPreview, capaPlaceholder);
    });
  }
  if (perfilRemove) {
    perfilRemove.addEventListener('click', event => {
      event.stopPropagation();
      if (perfilBase64) perfilBase64.value = '';
      if (perfilRemoverFlag) perfilRemoverFlag.value = '1';
      atualizarPreview('', perfilPreview, perfilPlaceholder);
    });
  }

  if (capaInput) {
    capaInput.addEventListener('change', () => {
      const file = capaInput.files && capaInput.files[0];
      if (!file) return;
      redimensionarImagemParaBase64(file, 1200).then(src => {
        if (capaBase64) capaBase64.value = src;
        if (capaRemoverFlag) capaRemoverFlag.value = '0';
        atualizarPreview(src, capaPreview, capaPlaceholder);
      }).catch(() => {});
      capaInput.value = '';
    });
  }
  if (perfilInput) {
    perfilInput.addEventListener('change', () => {
      const file = perfilInput.files && perfilInput.files[0];
      if (!file) return;
      redimensionarImagemParaBase64(file, 500).then(src => {
        if (perfilBase64) perfilBase64.value = src;
        if (perfilRemoverFlag) perfilRemoverFlag.value = '0';
        atualizarPreview(src, perfilPreview, perfilPlaceholder);
      }).catch(() => {});
      perfilInput.value = '';
    });
  }

  if (descricaoInput && descricaoCount) {
    const atualizarDescricao = () => {
      const tamanho = descricaoInput.value.length;
      descricaoCount.textContent = `${tamanho}/300`;
    };
    descricaoInput.addEventListener('input', atualizarDescricao);
    atualizarDescricao();
  }

  if (linkSlug && linkPreview && linkHidden) {
    const base = linkSlug.dataset.base || '';
    const atualizarLink = () => {
      const slug = linkSlug.value.trim().replace(/\s+/g, '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      linkSlug.value = slug;
      const url = base + encodeURIComponent(slug);
      linkPreview.value = url;
      linkHidden.value = url;
    };
    linkSlug.addEventListener('input', atualizarLink);
    atualizarLink();
  }
  if (linkCopy && linkPreview) {
    linkCopy.addEventListener('click', () => {
      const texto = linkPreview.value || '';
      if (!texto) return;
      const copiar = () => {
        /* fallback para http:// sem HTTPS */
        const el = document.createElement('input');
        el.value = texto;
        el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
        document.body.appendChild(el);
        el.focus();
        el.select();
        try {
          document.execCommand('copy');
          mostrarToast('Link copiado!', true);
        } catch (e) {
          mostrarToast('Não foi possível copiar.', false);
        }
        document.body.removeChild(el);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texto)
          .then(() => mostrarToast('Link copiado!', true))
          .catch(copiar);
      } else {
        copiar();
      }
      /* feedback visual no botão */
      const icon = linkCopy.querySelector('i');
      if (icon) {
        icon.className = 'bi bi-check-lg';
        setTimeout(() => { icon.className = 'bi bi-clipboard'; }, 2000);
      }
    });
  }
}

const settingsCards = document.getElementById('settingsCards');
const btnAtualizarCards = document.getElementById('btnAtualizarCards');

function configurarCards(){
  document.querySelectorAll('#settingsCards .settings-card[data-modal]').forEach(card => {
    card.addEventListener('click', event => {
      event.preventDefault();
      const modalId = card.dataset.modal;
      if (!modalId) return;
      const modalEl = document.getElementById(modalId);
      if (!modalEl) return;
      const instance = bootstrap.Modal.getOrCreateInstance(modalEl);
      instance.show();
    });
  });
}

function atualizarCards(){
  if (!settingsCards) return;
  if (btnAtualizarCards) btnAtualizarCards.disabled = true;
  fetch(window.location.href, { cache: 'no-store' })
    .then(r => r.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const novo = doc.getElementById('settingsCards');
      if (!novo) throw new Error('sem-cards');
      settingsCards.innerHTML = novo.innerHTML;
      configurarCards();
      configurarTaxaTabs();
      configurarTaxaCrud();
      mostrarToast('Cards atualizados.', true);
    })
    .catch(() => {
      mostrarToast('Nao foi possivel atualizar.', false);
    })
    .finally(() => {
      if (btnAtualizarCards) btnAtualizarCards.disabled = false;
    });
}

function configurarTaxaTabs(){
  document.querySelectorAll('[data-taxa-tabs]').forEach(tabsWrap => {
    const modal = tabsWrap.closest('.taxa-modal');
    if (!modal) return;
    const tabs = tabsWrap.querySelectorAll('.taxa-tab');
    const panes = modal.querySelectorAll('[data-taxa-pane]');
    const tipoInput = modal.querySelector('#taxaEntregaTipo');
    const dinamicaFooter = modal.querySelector('[data-taxa-dinamica-footer]');
    const dinamicaNote = modal.querySelector('[data-taxa-dinamica-note]');

    const ativar = alvo => {
      tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.taxaTab === alvo);
      });
      panes.forEach(pane => {
        pane.classList.toggle('active', pane.dataset.taxaPane === alvo);
      });
      if (tipoInput) tipoInput.value = alvo;
      if (dinamicaFooter) {
        dinamicaFooter.classList.toggle('d-none', alvo !== 'dinamica');
      }
      if (dinamicaNote) {
        dinamicaNote.classList.toggle('d-none', alvo !== 'dinamica');
      }
    };

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        ativar(tab.dataset.taxaTab);
      });
    });

    const ativoInicial = tabsWrap.querySelector('.taxa-tab.active');
    ativar(ativoInicial ? ativoInicial.dataset.taxaTab : 'sem');
  });
}

function formatarDinheiro(valor){
  return 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ',');
}

function configurarTaxaCrud(){
  const modal = document.getElementById('modal-taxa-entrega');
  if (!modal) return;

  const toggleGratis = modal.querySelector('input[type="checkbox"][name="taxa_entrega_gratis"]');
  const tipoInput = modal.querySelector('#taxaEntregaTipo');
  const fixaValor = modal.querySelector('#taxaEntregaFixaValor');
  const fixaMin = modal.querySelector('#taxaEntregaFixaMin');
  const fixaMax = modal.querySelector('#taxaEntregaFixaMax');

  const listaBairro = modal.querySelector('[data-taxa-list="bairro"]');
  const filtroBairroInput = modal.querySelector('[data-taxa-filter="bairro"]');
  const bairroPrevBtn = modal.querySelector('[data-taxa-page="bairro-prev"]');
  const bairroNextBtn = modal.querySelector('[data-taxa-page="bairro-next"]');
  const bairroPageInfo = modal.querySelector('[data-taxa-page-info="bairro"]');
  const listaDinamica = modal.querySelector('[data-taxa-list="dinamica"]');
  const formBairro = modal.querySelector('[data-taxa-form="bairro"]');
  const formDinamica = modal.querySelector('[data-taxa-form="dinamica"]');
  let bairrosCache = [];
  let bairroPagina = 1;
  const bairroPageSize = 4;

  const normalizarTexto = (texto) => {
    return (texto || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  };

  const renderizarBairros = () => {
    if (!listaBairro) return;
    const termo = filtroBairroInput ? normalizarTexto(filtroBairroInput.value) : '';
    const filtrados = termo
      ? bairrosCache.filter(item => normalizarTexto(item.bairro).includes(termo))
      : bairrosCache.slice();
    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / bairroPageSize));
    if (bairroPagina > totalPaginas) bairroPagina = totalPaginas;
    if (bairroPagina < 1) bairroPagina = 1;

    const inicio = (bairroPagina - 1) * bairroPageSize;
    const pagina = filtrados.slice(inicio, inicio + bairroPageSize);
    const head = `
      <div class="taxa-table-head">
        <div>Bairro</div>
        <div>Valor da taxa</div>
        <div>Tempo minimo</div>
        <div>Tempo maximo</div>
        <div>Acoes</div>
      </div>`;
    if (!pagina.length) {
      listaBairro.innerHTML = head + '<div class="taxa-empty">Cadastre taxas diferentes por bairro para calculo automatico.</div>';
    } else {
      const rows = pagina.map(item => `
        <div class="taxa-table-row" data-taxa-bairro-row
             data-id="${item.id}"
             data-bairro="${item.bairro || ''}"
             data-valor="${item.taxa}"
             data-min="${item.tempo_min ?? ''}"
             data-max="${item.tempo_max ?? ''}">
          <div>${item.bairro || ''}</div>
          <div>${formatarDinheiro(item.taxa)}</div>
          <div>${item.tempo_min ?? '-'}</div>
          <div>${item.tempo_max ?? '-'}</div>
          <div class="taxa-actions">
            <button type="button" class="taxa-icon-btn" data-taxa-delete="bairro"><i class="bi bi-trash"></i></button>
            <button type="button" class="taxa-icon-btn danger" data-taxa-edit="bairro"><i class="bi bi-pencil"></i></button>
          </div>
        </div>
      `).join('');
      listaBairro.innerHTML = head + rows;
    }
    if (bairroPageInfo) {
      bairroPageInfo.textContent = `Pagina ${bairroPagina} de ${totalPaginas}`;
    }
    if (bairroPrevBtn) {
      bairroPrevBtn.disabled = bairroPagina <= 1;
    }
    if (bairroNextBtn) {
      bairroNextBtn.disabled = bairroPagina >= totalPaginas;
    }
  };

  const salvarBasico = () => {
    const params = new FormData();
    params.set('taxa_entrega_gratis', toggleGratis && toggleGratis.checked ? '1' : '0');
    if (tipoInput) params.set('taxa_entrega_tipo', tipoInput.value || 'dinamica');
    if (fixaValor) params.set('taxa_entrega', fixaValor.value || '0');
    if (fixaMin) params.set('taxa_entrega_tempo_min', fixaMin.value || '');
    if (fixaMax) params.set('taxa_entrega_tempo_max', fixaMax.value || '');

    fetch('api/configuracoes_save.php', {
      method: 'POST',
      body: params
    })
      .then(r => r.json())
      .then(resp => {
        const ok = resp && resp.ok;
        mostrarToast(ok ? 'Configuracoes salvas.' : (resp && resp.msg ? resp.msg : 'Erro ao salvar.'), ok);
      })
      .catch(() => mostrarToast('Erro ao salvar.', false));
  };

  if (toggleGratis) {
    toggleGratis.addEventListener('change', salvarBasico);
  }
  if (fixaValor) {
    fixaValor.addEventListener('change', salvarBasico);
  }
  if (fixaMin) fixaMin.addEventListener('change', salvarBasico);
  if (fixaMax) fixaMax.addEventListener('change', salvarBasico);

  modal.querySelectorAll('.taxa-tab').forEach(tab => {
    tab.addEventListener('click', salvarBasico);
  });

  modal.querySelectorAll('[data-taxa-save="fixa"]').forEach(btn => {
    btn.addEventListener('click', salvarBasico);
  });

  const limparFormBairro = () => {
    if (!formBairro) return;
    formBairro.querySelector('[data-taxa-id="bairro"]').value = '';
    formBairro.querySelector('[data-taxa-field="bairro_nome"]').value = '';
    formBairro.querySelector('[data-taxa-field="bairro_valor"]').value = '';
    formBairro.querySelector('[data-taxa-field="bairro_min"]').value = '';
    formBairro.querySelector('[data-taxa-field="bairro_max"]').value = '';
  };

  const limparFormDinamica = () => {
    if (!formDinamica) return;
    formDinamica.querySelector('[data-taxa-id="dinamica"]').value = '';
    formDinamica.querySelector('[data-taxa-field="dinamica_distancia"]').value = '';
    formDinamica.querySelector('[data-taxa-field="dinamica_valor"]').value = '';
    formDinamica.querySelector('[data-taxa-field="dinamica_tipo"]').value = 'fixa';
    formDinamica.querySelector('[data-taxa-field="dinamica_min"]').value = '';
    formDinamica.querySelector('[data-taxa-field="dinamica_max"]').value = '';
  };

  modal.querySelectorAll('[data-taxa-add="bairro"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!formBairro) return;
      limparFormBairro();
      formBairro.classList.remove('d-none');
      formBairro.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  modal.querySelectorAll('[data-taxa-add="dinamica"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!formDinamica) return;
      limparFormDinamica();
      formDinamica.classList.remove('d-none');
      formDinamica.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  modal.querySelectorAll('[data-taxa-cancel="bairro"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (formBairro) formBairro.classList.add('d-none');
    });
  });
  modal.querySelectorAll('[data-taxa-cancel="dinamica"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (formDinamica) formDinamica.classList.add('d-none');
    });
  });

  const carregarBairros = () => {
    fetch('api/taxa_bairro_list.php')
      .then(r => r.json())
      .then(resp => {
        if (!listaBairro || !resp || !resp.ok) return;
        bairrosCache = resp.itens || [];
        renderizarBairros();
      });
  };

  const carregarDinamicas = () => {
    fetch('api/taxa_dinamica_list.php')
      .then(r => r.json())
      .then(resp => {
        if (!listaDinamica || !resp || !resp.ok) return;
        const itens = resp.itens || [];
        const head = `
          <div class="taxa-table-head">
            <div>Distancia</div>
            <div>Valor da taxa</div>
            <div>Taxa</div>
            <div>Tempo minimo</div>
            <div>Tempo maximo</div>
            <div>Acoes</div>
          </div>`;
        if (!itens.length) {
          listaDinamica.innerHTML = head + '<div class="taxa-empty">Cadastre regras de taxa dinamica para distancia.</div>';
          return;
        }
        const rows = itens.map(item => `
          <div class="taxa-table-row" data-taxa-dinamica-row
               data-id="${item.id}"
               data-distancia="${item.distancia_km}"
               data-valor="${item.valor}"
               data-tipo="${item.tipo || 'fixa'}"
               data-min="${item.tempo_min ?? ''}"
               data-max="${item.tempo_max ?? ''}">
            <div>${item.distancia_km}km</div>
            <div>${formatarDinheiro(item.valor)}</div>
            <div>${item.tipo === 'por_km' ? 'Por km' : 'Taxa fixa'}</div>
            <div>${item.tempo_min ?? '-'} minutos</div>
            <div>${item.tempo_max ?? '-'} minutos</div>
            <div class="taxa-actions">
              <button type="button" class="taxa-icon-btn" data-taxa-delete="dinamica"><i class="bi bi-trash"></i></button>
              <button type="button" class="taxa-icon-btn danger" data-taxa-edit="dinamica"><i class="bi bi-pencil"></i></button>
            </div>
          </div>
        `).join('');
        listaDinamica.innerHTML = head + rows;
      });
  };

  modal.addEventListener('click', event => {
    const editarBairro = event.target.closest('[data-taxa-edit="bairro"]');
    const apagarBairro = event.target.closest('[data-taxa-delete="bairro"]');
    const editarDinamica = event.target.closest('[data-taxa-edit="dinamica"]');
    const apagarDinamica = event.target.closest('[data-taxa-delete="dinamica"]');

    if (editarBairro && formBairro) {
      const row = editarBairro.closest('[data-taxa-bairro-row]');
      if (!row) return;
      formBairro.querySelector('[data-taxa-id="bairro"]').value = row.dataset.id || '';
      formBairro.querySelector('[data-taxa-field="bairro_nome"]').value = row.dataset.bairro || '';
      formBairro.querySelector('[data-taxa-field="bairro_valor"]').value = row.dataset.valor || '';
      formBairro.querySelector('[data-taxa-field="bairro_min"]').value = row.dataset.min || '';
      formBairro.querySelector('[data-taxa-field="bairro_max"]').value = row.dataset.max || '';
      formBairro.classList.remove('d-none');
      formBairro.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (apagarBairro) {
      const row = apagarBairro.closest('[data-taxa-bairro-row]');
      const id = row ? row.dataset.id : '';
      if (!id || !confirm('Deseja remover esta taxa de bairro?')) return;
      fetch('api/taxa_bairro_delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
        .then(r => r.json())
        .then(resp => {
          const ok = resp && resp.ok;
          mostrarToast(ok ? 'Taxa removida.' : (resp && resp.msg ? resp.msg : 'Erro ao remover.'), ok);
          if (ok) carregarBairros();
        });
    }

    if (editarDinamica && formDinamica) {
      const row = editarDinamica.closest('[data-taxa-dinamica-row]');
      if (!row) return;
      formDinamica.querySelector('[data-taxa-id="dinamica"]').value = row.dataset.id || '';
      formDinamica.querySelector('[data-taxa-field="dinamica_distancia"]').value = row.dataset.distancia || '';
      formDinamica.querySelector('[data-taxa-field="dinamica_valor"]').value = row.dataset.valor || '';
      formDinamica.querySelector('[data-taxa-field="dinamica_tipo"]').value = row.dataset.tipo || 'fixa';
      formDinamica.querySelector('[data-taxa-field="dinamica_min"]').value = row.dataset.min || '';
      formDinamica.querySelector('[data-taxa-field="dinamica_max"]').value = row.dataset.max || '';
      formDinamica.classList.remove('d-none');
      formDinamica.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (apagarDinamica) {
      const row = apagarDinamica.closest('[data-taxa-dinamica-row]');
      const id = row ? row.dataset.id : '';
      if (!id || !confirm('Deseja remover esta taxa dinamica?')) return;
      fetch('api/taxa_dinamica_delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
        .then(r => r.json())
        .then(resp => {
          const ok = resp && resp.ok;
          mostrarToast(ok ? 'Taxa removida.' : (resp && resp.msg ? resp.msg : 'Erro ao remover.'), ok);
          if (ok) carregarDinamicas();
        });
    }
  });

  modal.querySelectorAll('[data-taxa-save="bairro"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!formBairro) return;
      const id = formBairro.querySelector('[data-taxa-id="bairro"]').value || '';
      const bairro = formBairro.querySelector('[data-taxa-field="bairro_nome"]').value.trim();
      const valor = formBairro.querySelector('[data-taxa-field="bairro_valor"]').value;
      const tempoMin = formBairro.querySelector('[data-taxa-field="bairro_min"]').value;
      const tempoMax = formBairro.querySelector('[data-taxa-field="bairro_max"]').value;
      if (!bairro || !valor) {
        mostrarToast('Informe bairro e valor da taxa.', false);
        return;
      }
      const bairroNorm = normalizarTexto(bairro);
      const duplicado = bairrosCache.some(item => {
        if (String(item.id) === String(id)) return false;
        return normalizarTexto(item.bairro) === bairroNorm;
      });
      if (duplicado) {
        mostrarToast('Ja existe uma taxa cadastrada para este bairro.', false);
        return;
      }
      fetch('api/taxa_bairro_save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          bairro,
          taxa: valor,
          tempo_min: tempoMin,
          tempo_max: tempoMax
        })
      })
        .then(r => r.json())
        .then(resp => {
          const ok = resp && resp.ok;
          mostrarToast(ok ? 'Taxa salva.' : (resp && resp.msg ? resp.msg : 'Erro ao salvar.'), ok);
          if (ok) {
            formBairro.classList.add('d-none');
            carregarBairros();
          }
        });
    });
  });

  if (filtroBairroInput) {
    filtroBairroInput.addEventListener('input', () => {
      bairroPagina = 1;
      renderizarBairros();
    });
  }
  if (bairroPrevBtn) {
    bairroPrevBtn.addEventListener('click', () => {
      if (bairroPagina > 1) {
        bairroPagina -= 1;
        renderizarBairros();
      }
    });
  }
  if (bairroNextBtn) {
    bairroNextBtn.addEventListener('click', () => {
      bairroPagina += 1;
      renderizarBairros();
    });
  }

  modal.querySelectorAll('[data-taxa-save="dinamica"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!formDinamica) return;
      const id = formDinamica.querySelector('[data-taxa-id="dinamica"]').value || '';
      const distancia = formDinamica.querySelector('[data-taxa-field="dinamica_distancia"]').value;
      const valor = formDinamica.querySelector('[data-taxa-field="dinamica_valor"]').value;
      const tipo = formDinamica.querySelector('[data-taxa-field="dinamica_tipo"]').value;
      const tempoMin = formDinamica.querySelector('[data-taxa-field="dinamica_min"]').value;
      const tempoMax = formDinamica.querySelector('[data-taxa-field="dinamica_max"]').value;
      if (!distancia || !valor) {
        mostrarToast('Informe distancia e valor.', false);
        return;
      }
      fetch('api/taxa_dinamica_save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          distancia_km: distancia,
          valor,
          tipo,
          tempo_min: tempoMin,
          tempo_max: tempoMax
        })
      })
        .then(r => r.json())
        .then(resp => {
          const ok = resp && resp.ok;
          mostrarToast(ok ? 'Taxa salva.' : (resp && resp.msg ? resp.msg : 'Erro ao salvar.'), ok);
          if (ok) {
            formDinamica.classList.add('d-none');
            carregarDinamicas();
          }
        });
    });
  });

  modal.addEventListener('show.bs.modal', () => {
    carregarBairros();
    carregarDinamicas();
  });
}

configurarCards();
configurarTaxaTabs();
configurarTaxaCrud();
if (btnAtualizarCards) {
  btnAtualizarCards.addEventListener('click', atualizarCards);
}
document.addEventListener('keydown', event => {
  if (event.key === 'F5' || (event.ctrlKey && event.key.toLowerCase() === 'r')) {
    event.preventDefault();
    atualizarCards();
  }
});

const coresList = document.getElementById('coresList');
const temaCorMenuInput = document.getElementById('temaCorMenuInput');
if (coresList && temaCorMenuInput) {
  coresList.addEventListener('click', (event) => {
    const item = event.target.closest('.cores-item');
    if (!item) return;
    coresList.querySelectorAll('.cores-item').forEach(el => el.classList.toggle('is-active', el === item));
    temaCorMenuInput.value = item.dataset.cor || '';
  });
}

document.querySelectorAll('[data-modal-save]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modalId = btn.dataset.modalSave;
    salvarModal(modalId).then(ok => {
      if (!ok) return;
      const modalEl = document.getElementById(modalId);
      if (!modalEl) return;
      const instance = bootstrap.Modal.getInstance(modalEl);
      if (instance) instance.hide();
    });
  });
});

const modalLimparBanco = document.getElementById('modal-limpar-banco');
const btnLimparBanco = document.getElementById('btnLimparBanco');
if (modalLimparBanco) {
  modalLimparBanco.addEventListener('show.bs.modal', () => {
    limparErros(modalLimparBanco);
  });
}
if (btnLimparBanco && modalLimparBanco) {
  btnLimparBanco.addEventListener('click', () => {
    limparErros(modalLimparBanco);
    const inicioInput = modalLimparBanco.querySelector('#limparBancoInicio');
    const fimInput = modalLimparBanco.querySelector('#limparBancoFim');
    const inicio = inicioInput ? inicioInput.value : '';
    const fim = fimInput ? fimInput.value : '';

    if (!inicio || !fim) {
      mostrarErro(modalLimparBanco, 'limpar-banco', 'Informe a data inicial e final.', inicioInput || fimInput);
      return;
    }
    if (fim < inicio) {
      mostrarErro(modalLimparBanco, 'limpar-banco', 'A data final deve ser maior ou igual a inicial.', fimInput);
      return;
    }
    if (!confirm('Esta acao e irreversivel. Deseja continuar?')) return;

    btnLimparBanco.disabled = true;
    const params = new URLSearchParams();
    params.set('inicio', inicio);
    params.set('fim', fim);

    fetch('api/limpar_banco.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })
      .then(r => r.json())
      .then(resp => {
        const ok = resp && resp.ok;
        const msg = ok ? (resp.msg || 'Limpeza concluida.') : (resp && resp.msg ? resp.msg : 'Erro ao limpar.');
        mostrarToast(msg, ok);
        if (ok) {
          const instance = bootstrap.Modal.getInstance(modalLimparBanco);
          if (instance) instance.hide();
        }
      })
      .catch(() => {
        mostrarToast('Erro ao limpar.', false);
      })
      .finally(() => {
        btnLimparBanco.disabled = false;
      });
  });
}

const btnGerarTokenCashback = document.getElementById('btnGerarTokenCashback');
if (btnGerarTokenCashback) {
  btnGerarTokenCashback.addEventListener('click', () => {
    const input = document.getElementById('cashbackJobToken');
    if (!input) return;
    input.value = gerarTokenCashback();
    input.focus();
    input.select();
  });
}

function gerarTokenCashback(){
  const prefixo = 'cbx_';
  try {
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      const token = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return prefixo + token;
    }
  } catch (e) {}
  const fallback = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return prefixo + fallback.slice(0, 24);
}

document.addEventListener('click', event => {
  const btn = event.target.closest('[data-open-permissoes]');
  if (!btn) return;
  const modalEl = document.getElementById('modal-permissoes');
  if (!modalEl || typeof bootstrap === 'undefined') return;
  const usuariosModal = document.getElementById('modal-usuarios');
  const instance = bootstrap.Modal.getOrCreateInstance(modalEl);
  if (usuariosModal) {
    const usuariosInstance = bootstrap.Modal.getInstance(usuariosModal);
    if (usuariosInstance) {
      usuariosModal.addEventListener('hidden.bs.modal', () => {
        instance.show();
      }, { once: true });
      usuariosInstance.hide();
      return;
    }
  }
  instance.show();
});

document.querySelectorAll('.perm-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const alvo = tab.dataset.permTab;
    document.querySelectorAll('.perm-tab').forEach(btn => btn.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('[data-perm-panel]').forEach(panel => {
      panel.classList.toggle('d-none', panel.dataset.permPanel !== alvo);
    });
  });
});

document.querySelectorAll('[data-perm-all]').forEach(toggle => {
  toggle.addEventListener('change', () => {
    const grupo = toggle.dataset.permAll;
    const itens = document.querySelectorAll(`[data-perm-item="${grupo}"]`);
    itens.forEach(item => {
      item.checked = toggle.checked;
    });
  });
});

/* ================================================================
   SELO DE VERIFICAÇÃO
   ================================================================ */
let _seloTimerInterval = null;
let _seloSegundosRestantes = 240;

function seloEnviarCodigo() {
  const input = document.getElementById('seloWhatsappInput');
  const errEl = document.getElementById('seloStep1Error');
  const btn = document.getElementById('btnEnviarCodigo');
  if (!input || !errEl) return;
  errEl.textContent = '';
  const numero = input.value.replace(/\D/g, '');
  if (numero.length < 10 || numero.length > 13) {
    errEl.textContent = 'Informe um número válido com DDD.';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  fetch('api/verificacao_enviar.php', {
    method: 'POST',
    body: new URLSearchParams({ whatsapp: numero })
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        document.getElementById('seloStep1').style.display = 'none';
        document.getElementById('seloStep2').style.display = '';
        seloIniciarTimer();
        const avisoEl = document.getElementById('seloAvisoInstancia');
        if (res.instancia_off && res.codigo_manual && avisoEl) {
          avisoEl.innerHTML =
            '<strong>⚠️ WhatsApp desconectado na Z-API.</strong><br>' +
            'Conecte sua instância em <a href="https://app.z-api.io" target="_blank">app.z-api.io</a> ' +
            'ou use o código abaixo para testar:<br>' +
            '<span class="selo-codigo-aviso">' + res.codigo_manual + '</span>';
          avisoEl.style.display = '';
        } else if (avisoEl) {
          avisoEl.style.display = 'none';
        }
        document.getElementById('seloCodigoInput').focus();
      } else {
        errEl.textContent = res.msg || 'Erro ao enviar código.';
        btn.disabled = false;
        btn.textContent = 'Verificar';
      }
    })
    .catch(() => {
      errEl.textContent = 'Erro de conexão. Tente novamente.';
      btn.disabled = false;
      btn.textContent = 'Verificar';
    });
}

function seloConfirmarCodigo() {
  const input = document.getElementById('seloCodigoInput');
  const errEl = document.getElementById('seloStep2Error');
  const btn = document.getElementById('btnConfirmarCodigo');
  if (!input || !errEl) return;
  errEl.textContent = '';
  const codigo = input.value.trim();
  if (codigo.length !== 6) {
    errEl.textContent = 'Digite o código de 6 dígitos.';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Verificando...';
  fetch('api/verificacao_confirmar.php', {
    method: 'POST',
    body: new URLSearchParams({ codigo })
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        seloPararTimer();
        mostrarToast('Loja verificada com sucesso!', true);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        errEl.textContent = res.msg || 'Código inválido.';
        btn.disabled = false;
        btn.textContent = 'Confirmar';
      }
    })
    .catch(() => {
      errEl.textContent = 'Erro de conexão.';
      btn.disabled = false;
      btn.textContent = 'Confirmar';
    });
}

function seloVoltarStep1() {
  seloPararTimer();
  document.getElementById('seloStep2').style.display = 'none';
  document.getElementById('seloStep1').style.display = '';
  const btn = document.getElementById('btnEnviarCodigo');
  if (btn) { btn.disabled = false; btn.textContent = 'Verificar'; }
}

function seloIniciarTimer() {
  _seloSegundosRestantes = 240;
  seloPararTimer();
  const el = document.querySelector('#seloTimer strong');
  _seloTimerInterval = setInterval(() => {
    _seloSegundosRestantes--;
    if (el) {
      const m = Math.floor(_seloSegundosRestantes / 60);
      const s = String(_seloSegundosRestantes % 60).padStart(2, '0');
      el.textContent = m + ':' + s;
    }
    if (_seloSegundosRestantes <= 0) {
      seloPararTimer();
      const errEl = document.getElementById('seloStep2Error');
      if (errEl) errEl.textContent = 'Código expirado. Volte e solicite um novo.';
      const btn = document.getElementById('btnConfirmarCodigo');
      if (btn) btn.disabled = true;
    }
  }, 1000);
}

function seloPararTimer() {
  if (_seloTimerInterval) { clearInterval(_seloTimerInterval); _seloTimerInterval = null; }
}

function removerVerificacao() {
  if (!confirm('Deseja remover o selo de loja verificada?')) return;
  fetch('api/verificacao_remover.php', { method: 'POST' })
    .then(r => r.json())
    .then(res => {
      if (res.ok) { mostrarToast('Verificação removida.', true); setTimeout(() => window.location.reload(), 900); }
    });
}

document.getElementById('modal-selo-verificacao')?.addEventListener('hidden.bs.modal', seloPararTimer);

document.querySelectorAll('[data-perm-item]').forEach(item => {
  item.addEventListener('change', () => {
    const grupo = item.dataset.permItem;
    const itens = Array.from(document.querySelectorAll(`[data-perm-item="${grupo}"]`));
    const all = document.querySelector(`[data-perm-all="${grupo}"]`);
    if (all) {
      all.checked = itens.length > 0 && itens.every(el => el.checked);
    }
  });
});

const btnSalvarPermissao = document.getElementById('btnSalvarPermissao');
if (btnSalvarPermissao) {
  btnSalvarPermissao.addEventListener('click', () => {
    const modalEl = document.getElementById('modal-permissoes');
    if (!modalEl) return;
    mostrarToast('Permissao salva.', true);
    const instance = bootstrap.Modal.getInstance(modalEl);
    if (instance) instance.hide();
  });
}

const usuariosModal = document.getElementById('modal-usuarios');
if (usuariosModal) {
  const tituloModal = usuariosModal.querySelector('#usuariosModalTitle');
  const listaView = usuariosModal.querySelector('#usuariosLista');
  const formView = usuariosModal.querySelector('#usuariosForm');

  const btnNovoUsuario = usuariosModal.querySelector('#btnNovoUsuario');
  const btnSalvarUsuario = usuariosModal.querySelector('#btnSalvarUsuario');
  const btnExcluirUsuario = usuariosModal.querySelector('#btnExcluirUsuario');
  const btnGerarCodigoUsuario = usuariosModal.querySelector('#btnGerarCodigoUsuario');
  const usuarioId = usuariosModal.querySelector('#usuarioId');
  const usuarioNome = usuariosModal.querySelector('#usuarioFormNome');
  const usuarioEmail = usuariosModal.querySelector('#usuarioFormEmail');
  const radiosPermissao = () => Array.from(usuariosModal.querySelectorAll('input[name="usuarioPermissao"]'));

  const codigoBox = usuariosModal.querySelector('#usuarioCodigoBox');
  const codigoValor = usuariosModal.querySelector('#usuarioCodigoValor');

  function mostrarView(view){
    [listaView, formView].forEach(el => el && el.classList.add('d-none'));
    if (view) view.classList.remove('d-none');
  }

  function exibirCodigo(codigo){
    if (!codigoValor) return;
    codigoValor.textContent = codigo ? codigo.split('').join(' ') : '-----';
  }

  function abrirFormUsuarios(dados){
    if (!formView) return;
    mostrarView(formView);
    if (tituloModal) tituloModal.textContent = dados ? `Editando ${dados.nome || ''}` : 'Criando usu\u00e1rio';
    if (usuarioId) usuarioId.value = dados?.id || '';
    if (usuarioNome) usuarioNome.value = dados?.nome || '';
    if (usuarioEmail) usuarioEmail.value = dados?.email || '';
    const nivelAtual = dados?.nivel ? String(dados.nivel) : '';
    radiosPermissao().forEach(r => { r.checked = (r.value === nivelAtual); });
    if (btnSalvarUsuario) btnSalvarUsuario.textContent = dados ? 'Salvar altera\u00e7\u00f5es' : 'Criar usu\u00e1rio';
    if (btnExcluirUsuario) btnExcluirUsuario.classList.toggle('d-none', !dados);
    if (codigoBox) codigoBox.classList.toggle('d-none', !dados);
    if (dados) exibirCodigo(dados.codigo || '');
    limparErros(usuariosModal);
  }

  function voltarParaLista(){
    window.location.reload();
  }

  if (btnNovoUsuario) {
    btnNovoUsuario.addEventListener('click', () => abrirFormUsuarios(null));
  }

  usuariosModal.addEventListener('hidden.bs.modal', () => {
    mostrarView(listaView);
    if (tituloModal) tituloModal.textContent = 'Usu\u00e1rios';
  });

  usuariosModal.addEventListener('click', (event) => {
    const linhaUsuario = event.target.closest('[data-user-edit]');
    if (linhaUsuario) {
      abrirFormUsuarios({
        id: linhaUsuario.dataset.userId,
        nome: linhaUsuario.dataset.userNome,
        nivel: linhaUsuario.dataset.userPerm,
        email: linhaUsuario.dataset.userEmail,
        codigo: linhaUsuario.dataset.userCodigo
      });
    }
  });

  if (btnExcluirUsuario) {
    btnExcluirUsuario.addEventListener('click', () => {
      const adminId = usuarioId ? usuarioId.value : '';
      if (!adminId) return;
      btnExcluirUsuario.disabled = true;
      const params = new URLSearchParams();
      params.set('id', adminId);
      fetch('api/usuarios_delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      })
        .then(r => r.json())
        .then(resp => {
          const ok = resp && resp.ok;
          mostrarToast(ok ? 'Usuario excluido.' : (resp && resp.msg ? resp.msg : 'Erro ao excluir.'), ok);
          if (ok) setTimeout(voltarParaLista, 600);
        })
        .catch(() => mostrarToast('Erro ao excluir.', false))
        .finally(() => {
          btnExcluirUsuario.disabled = false;
        });
    });
  }

  if (btnGerarCodigoUsuario) {
    btnGerarCodigoUsuario.addEventListener('click', () => {
      const adminId = usuarioId ? usuarioId.value : '';
      if (!adminId) return;
      btnGerarCodigoUsuario.disabled = true;
      const params = new URLSearchParams();
      params.set('id', adminId);
      fetch('api/usuarios_gerar_codigo.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      })
        .then(r => r.json())
        .then(resp => {
          if (resp && resp.ok) {
            exibirCodigo(resp.codigo_acesso);
            mostrarToast('Novo codigo de acesso gerado.', true);
          } else {
            mostrarErro(usuariosModal, 'usuarios-form', (resp && resp.msg) || 'Erro ao gerar codigo de acesso.');
          }
        })
        .catch(() => mostrarErro(usuariosModal, 'usuarios-form', 'Erro ao gerar codigo de acesso.'))
        .finally(() => {
          btnGerarCodigoUsuario.disabled = false;
        });
    });
  }

  if (btnSalvarUsuario) {
    btnSalvarUsuario.addEventListener('click', () => {
      if (!usuarioNome) return;
      limparErros(usuariosModal);
      const nome = usuarioNome.value.trim();
      const email = usuarioEmail ? usuarioEmail.value.trim() : '';
      const radioMarcado = radiosPermissao().find(r => r.checked);
      const nivel = radioMarcado ? radioMarcado.value : '';
      if (!nome) {
        mostrarErro(usuariosModal, 'usuarios-form', 'Informe o nome do usuario.');
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        mostrarErro(usuariosModal, 'usuarios-form', 'Informe um e-mail valido para o usuario.');
        return;
      }
      if (!nivel) {
        mostrarErro(usuariosModal, 'usuarios-form', 'Selecione uma permissao para o usuario.');
        return;
      }

      const params = new URLSearchParams();
      const idAtual = usuarioId && usuarioId.value ? usuarioId.value : '';
      if (idAtual) params.set('id', idAtual);
      params.set('nome', nome);
      params.set('email', email);
      params.set('permissao_id', nivel);

      btnSalvarUsuario.disabled = true;
      fetch('api/usuarios_save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      })
        .then(r => r.json())
        .then(resp => {
          if (!resp || !resp.ok) {
            mostrarErro(usuariosModal, 'usuarios-form', (resp && resp.msg) || 'Erro ao salvar.');
            return;
          }
          if (!idAtual && resp.codigo_acesso) {
            /* usuario recem-criado: continua na mesma tela, agora em modo edicao,
               mostrando o codigo de acesso gerado */
            abrirFormUsuarios({ id: resp.id, nome: resp.nome, nivel: nivel, email: email, codigo: resp.codigo_acesso });
            mostrarToast('Usuario criado.', true);
          } else {
            mostrarToast('Usuario salvo.', true);
            setTimeout(voltarParaLista, 600);
          }
        })
        .catch(() => mostrarErro(usuariosModal, 'usuarios-form', 'Erro ao salvar.'))
        .finally(() => {
          btnSalvarUsuario.disabled = false;
        });
    });
  }
}
