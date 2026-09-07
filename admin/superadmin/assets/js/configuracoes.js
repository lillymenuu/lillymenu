(function () {
  const planosDisponiveis = (typeof CONFIG_PLANOS !== 'undefined') ? CONFIG_PLANOS : [];

  // Caminho salvo no banco pode ser um caminho local relativo a admin/ (precisa
  // subir um nivel daqui, admin/superadmin/) ou uma URL completa do R2 (usa direto).
  function urlAdminSub(caminho) {
    if (!caminho) return '';
    if (/^https?:\/\//i.test(caminho)) return caminho;
    return '../' + caminho.replace(/^\/+/, '');
  }

  function formatMoneyBR(v) {
    const n = parseFloat(v || 0);
    return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function formatDateBR(v) {
    if (!v) return '-';
    const d = new Date(v + 'T00:00:00');
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  }
  function formatDateTimeBR(v) {
    if (!v) return '-';
    const d = new Date(v.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const pixConfigToggle = document.getElementById('pixConfigToggle');
  const pixConfigBody = document.getElementById('pixConfigBody');
  pixConfigToggle?.addEventListener('click', () => {
    pixConfigBody.style.display = pixConfigBody.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('nominatimAtivoToggle')?.addEventListener('change', async (e) => {
    const checkbox = e.target;
    const ativoAnterior = !checkbox.checked;
    checkbox.disabled = true;
    try {
      const body = new FormData();
      body.append('ativo', checkbox.checked ? '1' : '0');
      const resp = await fetch('../api/gerenciamento_nominatim_salvar.php', { method: 'POST', body });
      const data = await resp.json();
      if (!data.ok) {
        checkbox.checked = ativoAnterior;
      }
    } catch (e) {
      checkbox.checked = ativoAnterior;
    }
    checkbox.disabled = false;
  });

  document.getElementById('pixConfigForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('pixConfigMsg');
    msg.textContent = '';
    const body = new FormData();
    body.append('pix_chave', document.getElementById('pixChave').value);
    body.append('pix_nome', document.getElementById('pixNome').value);
    body.append('whats_numero', document.getElementById('pixWhats').value);
    const resp = await fetch('../api/gerenciamento_pix_salvar.php', { method: 'POST', body });
    const data = await resp.json();
    if (data.ok) {
      msg.textContent = 'Configuração de PIX salva.';
      msg.className = 'modal-msg success';
    } else {
      msg.textContent = data.msg || 'Erro ao salvar configuração.';
      msg.className = 'modal-msg error';
    }
  });

  const recursosPlanoModal = document.getElementById('recursosPlanoModal');
  const recursosPlanoOpenBtn = document.getElementById('recursosPlanoOpenBtn');
  const recursosPlanoSalvarBtn = document.getElementById('recursosPlanoSalvarBtn');

  recursosPlanoOpenBtn?.addEventListener('click', () => {
    if (recursosPlanoModal) abrirModal(recursosPlanoModal);
  });
  recursosPlanoModal?.addEventListener('click', (e) => {
    if (e.target === recursosPlanoModal) fecharModal(recursosPlanoModal);
  });

  // "Sem restrição" desativa (e desmarca visualmente, sem perder o valor salvo)
  // só as checagens daquele plano — cada coluna do comparativo é independente.
  document.querySelectorAll('.recursos-sem-restricao').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const planoId = toggle.dataset.planoId;
      document.querySelectorAll(`.recursos-plano-check[data-plano-id="${planoId}"]`).forEach(chk => {
        chk.disabled = toggle.checked;
      });
    });
  });

  recursosPlanoSalvarBtn?.addEventListener('click', async () => {
    const msg = document.getElementById('recursosPlanoMsg');
    msg.textContent = '';
    msg.className = 'modal-msg';
    recursosPlanoSalvarBtn.disabled = true;
    recursosPlanoSalvarBtn.textContent = 'Salvando...';

    const idsPlanos = Array.from(document.querySelectorAll('.recursos-sem-restricao')).map(t => t.dataset.planoId);
    try {
      const resultados = await Promise.all(idsPlanos.map(async (planoId) => {
        const semRestricao = document.querySelector(`.recursos-sem-restricao[data-plano-id="${planoId}"]`).checked;
        const checks = document.querySelectorAll(`.recursos-plano-check[data-plano-id="${planoId}"]`);
        const body = new FormData();
        body.append('plano_id', planoId);
        body.append('sem_restricao', semRestricao ? '1' : '0');
        checks.forEach(chk => { if (chk.checked) body.append('recursos[]', chk.value); });
        const resp = await fetch('../api/gerenciamento_plano_recursos_salvar.php', { method: 'POST', body });
        const data = await resp.json();
        if (data.ok) {
          const plano = planosDisponiveis.find(p => parseInt(p.id, 10) === parseInt(planoId, 10));
          if (plano) {
            plano.recursos = semRestricao ? null : Array.from(checks).filter(c => c.checked).map(c => c.value);
          }
        }
        return data.ok;
      }));
      if (resultados.every(Boolean)) {
        msg.textContent = 'Recursos salvos para todos os planos.';
        msg.className = 'modal-msg success';
      } else {
        msg.textContent = 'Alguns planos não foram salvos. Tente novamente.';
        msg.className = 'modal-msg error';
      }
    } catch (e) {
      msg.textContent = 'Erro de conexão ao salvar.';
      msg.className = 'modal-msg error';
    }
    recursosPlanoSalvarBtn.disabled = false;
    recursosPlanoSalvarBtn.textContent = 'Salvar recursos';
  });

  const modalEditar = document.getElementById('editarLojaModal');
  const modalExcluir = document.getElementById('excluirModal');
  const tableSearch = document.getElementById('tableSearch');
  const searchGlobal = document.getElementById('searchGlobal');

  [modalEditar, modalExcluir].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) fecharModal(modal);
    });
  });

  const editarForm = document.getElementById('editarLojaForm');
  const editMsg = document.getElementById('editLojaMsg');
  const editLojaId = document.getElementById('editLojaId');
  const editAdminId = document.getElementById('editAdminId');
  const editNome = document.getElementById('editNome');
  const editEmail = document.getElementById('editEmail');
  const editUsuario = document.getElementById('editUsuario');
  const editContato = document.getElementById('editContato');
  const editTrialInicio = document.getElementById('editTrialInicio');
  const editTrialFim = document.getElementById('editTrialFim');
  const editSenha = document.getElementById('editSenha');
  const editSenha2 = document.getElementById('editSenha2');

  const editPlanoSelect = document.getElementById('editPlanoSelect');
  const btnSalvarPlano = document.getElementById('btnSalvarPlano');
  const planoMsg = document.getElementById('planoMsg');
  const pagamentoPendenteBox = document.getElementById('pagamentoPendenteBox');
  const pagamentoMsg = document.getElementById('pagamentoMsg');

  const editExpiraBox = document.getElementById('editExpiraBox');

  function renderExpiraBox(btn) {
    const status = btn.dataset.status || 'trial';
    const expiraEm = btn.dataset.expiraEm || '';
    const dias = btn.dataset.expiraDias;
    const label = status === 'trial' ? 'Período de teste' : (status === 'ativa' ? 'Plano ativo' : 'Assinatura');

    if (!expiraEm) {
      editExpiraBox.innerHTML = `<div class="expira-box expira-neutro"><strong>${label}</strong> — sem data de expiração definida.</div>`;
      return;
    }

    const diasNum = dias !== '' ? parseInt(dias, 10) : null;
    let situacao = 'expira-ok';
    let texto = `expira em ${formatDateBR(expiraEm)}`;
    if (diasNum !== null) {
      if (diasNum < 0) {
        situacao = 'expira-vencido';
        texto = `expirou em ${formatDateBR(expiraEm)} (há ${Math.abs(diasNum)} dia${Math.abs(diasNum) === 1 ? '' : 's'})`;
      } else if (diasNum <= 7) {
        situacao = 'expira-perto';
        texto = `expira em ${formatDateBR(expiraEm)} (${diasNum} dia${diasNum === 1 ? '' : 's'} restante${diasNum === 1 ? '' : 's'})`;
      } else {
        texto = `expira em ${formatDateBR(expiraEm)} (${diasNum} dias restantes)`;
      }
    }
    editExpiraBox.innerHTML = `<div class="expira-box ${situacao}"><strong>${label}</strong> — ${texto}</div>`;
  }

  function renderPagamentoBox(btn) {
    const cobrancaId = parseInt(btn.dataset.cobrancaId || '0', 10);
    const cobrancaStatus = btn.dataset.cobrancaStatus || '';
    pagamentoMsg.textContent = '';
    if (!cobrancaId || (cobrancaStatus !== 'pendente' && cobrancaStatus !== 'atrasado')) {
      pagamentoPendenteBox.innerHTML = '<div class="pagamento-pendente-vazio">Nenhuma cobrança pendente.</div>';
      return;
    }
    const comprovante = btn.dataset.comprovanteArquivo || '';
    let html = `<div class="pagamento-pendente-box">
      <div><strong>Valor:</strong> ${formatMoneyBR(btn.dataset.cobrancaValor)}</div>
      <div><strong>Vencimento:</strong> ${formatDateBR(btn.dataset.cobrancaVencimento)}</div>`;
    if (comprovante) {
      html += `<a class="pagamento-comprovante-link" href="${urlAdminSub(comprovante)}" target="_blank" rel="noopener">Ver comprovante enviado em ${formatDateTimeBR(btn.dataset.comprovanteEnviadoEm)}</a>
      <div class="pagamento-acoes">
        <button class="action-btn danger" type="button" id="btnRejeitarComprovante">Rejeitar</button>
        <button class="action-btn primary" type="button" id="btnAprovarComprovante">Aprovar pagamento</button>
      </div>
      <textarea class="pagamento-rejeitar-motivo" id="rejeitarMotivo" placeholder="Motivo da rejeição (opcional)" style="display:none"></textarea>`;
    } else {
      html += `<div class="pagamento-pendente-vazio" style="margin-top:8px">Aguardando envio do comprovante pela loja.</div>`;
    }
    html += '</div>';
    pagamentoPendenteBox.innerHTML = html;

    const btnAprovar = document.getElementById('btnAprovarComprovante');
    if (btnAprovar) {
      btnAprovar.addEventListener('click', async () => {
        pagamentoMsg.textContent = '';
        const body = new FormData();
        body.append('cobranca_id', cobrancaId);
        const resp = await fetch('../api/gerenciamento_cobranca_aprovar.php', { method: 'POST', body });
        const data = await resp.json();
        if (data.ok) {
          pagamentoMsg.textContent = 'Pagamento aprovado. Loja reativada.';
          pagamentoMsg.className = 'modal-msg success';
          setTimeout(() => { window.location.reload(); }, 900);
        } else {
          pagamentoMsg.textContent = data.msg || 'Erro ao aprovar pagamento.';
          pagamentoMsg.className = 'modal-msg error';
        }
      });
    }
    const btnRejeitar = document.getElementById('btnRejeitarComprovante');
    if (btnRejeitar) {
      btnRejeitar.addEventListener('click', async () => {
        const motivoEl = document.getElementById('rejeitarMotivo');
        if (motivoEl.style.display === 'none') {
          motivoEl.style.display = 'block';
          motivoEl.focus();
          return;
        }
        pagamentoMsg.textContent = '';
        const body = new FormData();
        body.append('cobranca_id', cobrancaId);
        body.append('motivo', motivoEl.value || '');
        const resp = await fetch('../api/gerenciamento_cobranca_rejeitar.php', { method: 'POST', body });
        const data = await resp.json();
        if (data.ok) {
          pagamentoMsg.textContent = 'Comprovante rejeitado.';
          pagamentoMsg.className = 'modal-msg success';
          setTimeout(() => { window.location.reload(); }, 900);
        } else {
          pagamentoMsg.textContent = data.msg || 'Erro ao rejeitar comprovante.';
          pagamentoMsg.className = 'modal-msg error';
        }
      });
    }
  }

  let editLojaIdAtual = 0;

  document.querySelectorAll('[data-action="editar"]').forEach(btn => {
    btn.addEventListener('click', () => {
      editLojaId.value = btn.dataset.lojaId || '';
      editLojaIdAtual = parseInt(btn.dataset.lojaId || '0', 10);
      editAdminId.value = btn.dataset.adminId || '';
      editNome.value = btn.dataset.nome || '';
      editEmail.value = btn.dataset.email || '';
      editUsuario.value = btn.dataset.usuario || '';
      editContato.value = btn.dataset.contato || '';
      const statusAtual = btn.dataset.status || 'trial';
      editTrialInicio.value = statusAtual === 'ativa' ? '' : (btn.dataset.trialInicio || '');
      editTrialFim.value = statusAtual === 'ativa' ? '' : (btn.dataset.trialFim || '');
      editSenha.value = '';
      editSenha2.value = '';
      editMsg.textContent = '';

      renderExpiraBox(btn);

      const planoIdAtual = parseInt(btn.dataset.planoId || '0', 10);
      editPlanoSelect.innerHTML = planosDisponiveis.map(p =>
        `<option value="${p.id}" ${parseInt(p.id, 10) === planoIdAtual ? 'selected' : ''}>${p.nome} — ${formatMoneyBR(p.valor)}</option>`
      ).join('');
      planoMsg.textContent = '';

      renderPagamentoBox(btn);

      abrirModal(modalEditar);
    });
  });

  btnSalvarPlano?.addEventListener('click', async () => {
    planoMsg.textContent = '';
    const body = new FormData();
    body.append('loja_id', editLojaIdAtual);
    body.append('plano_id', editPlanoSelect.value);
    const resp = await fetch('../api/gerenciamento_plano.php', { method: 'POST', body });
    const data = await resp.json();
    if (data.ok) {
      planoMsg.textContent = 'Plano atualizado.';
      planoMsg.className = 'modal-msg success';
      setTimeout(() => { window.location.reload(); }, 800);
    } else {
      planoMsg.textContent = data.msg || 'Erro ao atualizar plano.';
      planoMsg.className = 'modal-msg error';
    }
  });

  editarForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    editMsg.textContent = '';
    const formData = new FormData(editarForm);
    const resp = await fetch('../api/lojas_update.php', { method:'POST', body: formData });
    const data = await resp.json();
    if (data.ok) {
      editMsg.textContent = 'Loja atualizada.';
      editMsg.className = 'modal-msg success';
      setTimeout(() => { window.location.reload(); }, 800);
    } else {
      editMsg.textContent = data.msg || 'Erro ao atualizar.';
      editMsg.className = 'modal-msg error';
    }
  });

  let excluirLojaId = null;
  const excluirNome = document.getElementById('excluirNome');
  const excluirMsg = document.getElementById('excluirMsg');
  const confirmExcluir = document.getElementById('confirmExcluir');

  document.querySelectorAll('[data-action="excluir"]').forEach(btn => {
    btn.addEventListener('click', () => {
      excluirLojaId = btn.dataset.lojaId;
      excluirNome.textContent = btn.dataset.lojaNome || '';
      excluirMsg.textContent = '';
      abrirModal(modalExcluir);
    });
  });

  confirmExcluir?.addEventListener('click', async () => {
    if (!excluirLojaId) return;
    excluirMsg.textContent = '';
    const body = new FormData();
    body.append('loja_id', excluirLojaId);
    const resp = await fetch('../api/lojas_delete.php', { method: 'POST', body });
    const data = await resp.json();
    if (data.ok) {
      excluirMsg.textContent = 'Loja excluida.';
      excluirMsg.className = 'modal-msg success';
      setTimeout(() => { window.location.reload(); }, 800);
    } else {
      excluirMsg.textContent = data.msg || 'Erro ao excluir.';
      excluirMsg.className = 'modal-msg error';
    }
  });

  const lojasPagination = document.getElementById('lojasPagination');
  const lojasInfo = document.getElementById('lojasInfo');
  const lojasRowsAll = Array.from(document.querySelectorAll('#lojasTable tbody tr'))
    .filter(row => row.hasAttribute('data-loja'));
  let lojasPage = 1;
  const lojasPerPage = 5;

  function renderLojasPagination(totalPages){
    if (!lojasPagination) return;
    if (totalPages <= 1) {
      lojasPagination.innerHTML = '';
      return;
    }
    let html = '';
    const prevDisabled = lojasPage <= 1 ? 'disabled' : '';
    const nextDisabled = lojasPage >= totalPages ? 'disabled' : '';
    html += `<button class="table-page ${prevDisabled}" data-page="${lojasPage - 1}" type="button">Anterior</button>`;
    for (let i = 1; i <= totalPages; i += 1) {
      html += `<button class="table-page ${i === lojasPage ? 'active' : ''}" data-page="${i}" type="button">${i}</button>`;
    }
    html += `<button class="table-page ${nextDisabled}" data-page="${lojasPage + 1}" type="button">Próximo</button>`;
    lojasPagination.innerHTML = html;
    lojasPagination.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled')) return;
        const page = parseInt(btn.dataset.page || '1', 10);
        if (!Number.isNaN(page)) {
          lojasPage = page;
          applyLojasPagination();
        }
      });
    });
  }

  function applyLojasPagination(){
    if (!lojasRowsAll.length) return;
    const visibles = lojasRowsAll.filter(row => row.dataset.match !== '0');
    const totalPages = Math.max(1, Math.ceil(visibles.length / lojasPerPage));
    if (lojasPage > totalPages) lojasPage = totalPages;
    if (lojasPage < 1) lojasPage = 1;
    const start = (lojasPage - 1) * lojasPerPage;
    const end = start + lojasPerPage;
    visibles.forEach((row, idx) => {
      row.style.display = idx >= start && idx < end ? '' : 'none';
    });
    lojasRowsAll.filter(row => row.dataset.match === '0').forEach(row => {
      row.style.display = 'none';
    });
    if (lojasInfo) {
      const shownStart = visibles.length ? start + 1 : 0;
      const shownEnd = Math.min(end, visibles.length);
      lojasInfo.textContent = `Mostrando ${shownStart}-${shownEnd} de ${visibles.length} lojas`;
    }
    renderLojasPagination(totalPages);
  }

  function filtrarTabela(valor){
    const termo = (valor || '').toLowerCase();
    if (!lojasRowsAll.length) return;
    lojasRowsAll.forEach(row => {
      const nome = (row.getAttribute('data-loja') || '').toLowerCase();
      row.dataset.match = nome.includes(termo) ? '1' : '0';
    });
    applyLojasPagination();
  }

  if (lojasRowsAll.length) {
    lojasRowsAll.forEach(row => { row.dataset.match = '1'; });
    applyLojasPagination();
  }

  tableSearch?.addEventListener('input', () => filtrarTabela(tableSearch.value));
  searchGlobal?.addEventListener('input', () => {
    const val = searchGlobal.value;
    if (tableSearch) tableSearch.value = val;
    filtrarTabela(val);
  });

  const leadsSearch = document.getElementById('leadsSearch');
  function filtrarLeads(valor){
    const termo = (valor || '').toLowerCase();
    document.querySelectorAll('#leadsTable tbody tr').forEach(row => {
      const texto = (row.getAttribute('data-lead') || '').toLowerCase();
      row.style.display = texto.includes(termo) ? '' : 'none';
    });
  }
  leadsSearch?.addEventListener('input', () => filtrarLeads(leadsSearch.value));
})();
