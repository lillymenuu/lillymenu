(function () {
  document.querySelectorAll('.mg-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const alvo = tab.dataset.mgTab;
      document.querySelectorAll('.mg-tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.mg-panel').forEach((p) => p.classList.toggle('d-none', p.dataset.mgPanel !== alvo));
      if (alvo === 'pedidos') carregarPedidosMesa();
    });
  });
})();

function mgToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast-custom';
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

/* ── Mesas ── */
function mgSalvarMesa() {
  const nome = (document.getElementById('mesaNomeInput').value || '').trim();
  const msgEl = document.getElementById('mesaModalMsg');
  const btn = document.getElementById('mesaSalvarBtn');
  if (!nome) {
    msgEl.textContent = 'Informe o nome da mesa.';
    return;
  }
  msgEl.textContent = '';
  btn.disabled = true;
  fetch('api/mesas_salvar.php', { method: 'POST', body: new URLSearchParams({ nome }) })
    .then((r) => r.json())
    .then((data) => {
      btn.disabled = false;
      if (data.ok) {
        window.location.reload();
      } else {
        msgEl.textContent = data.msg || 'Erro ao salvar mesa.';
      }
    })
    .catch(() => {
      btn.disabled = false;
      msgEl.textContent = 'Erro ao salvar mesa.';
    });
}

document.querySelectorAll('[data-mesa-toggle]').forEach((input) => {
  input.addEventListener('change', () => {
    const id = input.dataset.mesaToggle;
    const ativo = input.checked ? '1' : '0';
    input.disabled = true;
    fetch('api/mesas_toggle.php', { method: 'POST', body: new URLSearchParams({ id, ativo }) })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          input.checked = !input.checked;
          mgToast('Erro ao atualizar a mesa.');
        } else {
          carregarStatsMg();
        }
      })
      .catch(() => {
        input.checked = !input.checked;
        mgToast('Erro ao atualizar a mesa.');
      })
      .finally(() => {
        input.disabled = false;
      });
  });
});

/* ── Garçons ── */
document.getElementById('mgNovoGarcomBtn')?.addEventListener('click', () => {
  document.getElementById('garcomIdInput').value = '';
  document.getElementById('garcomNomeInput').value = '';
  document.getElementById('garcomEmailInput').value = '';
  document.getElementById('garcomModalMsg').textContent = '';
  document.getElementById('modalGarcomTitle').textContent = 'Novo garçom';
  document.getElementById('garcomSalvarBtn').textContent = 'Salvar e gerar código';
});

document.querySelectorAll('[data-garcom-editar]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('garcomIdInput').value = btn.dataset.garcomEditar;
    document.getElementById('garcomNomeInput').value = btn.dataset.garcomNome || '';
    document.getElementById('garcomEmailInput').value = btn.dataset.garcomEmail || '';
    document.getElementById('garcomModalMsg').textContent = '';
    document.getElementById('modalGarcomTitle').textContent = 'Editar garçom';
    document.getElementById('garcomSalvarBtn').textContent = 'Salvar alterações';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGarcom')).show();
  });
});

document.querySelectorAll('[data-garcom-excluir]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const nome = btn.dataset.garcomExcluirNome || 'este garçom';
    if (!confirm(`Excluir ${nome}? Essa ação não pode ser desfeita.`)) return;
    const id = btn.dataset.garcomExcluir;
    btn.disabled = true;
    fetch('api/garcons_excluir.php', { method: 'POST', body: new URLSearchParams({ id }) })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          window.location.reload();
        } else {
          btn.disabled = false;
          mgToast(data.msg || 'Erro ao excluir garçom.');
        }
      })
      .catch(() => {
        btn.disabled = false;
        mgToast('Erro ao excluir garçom.');
      });
  });
});

function mgSalvarGarcom() {
  const id = document.getElementById('garcomIdInput').value || '';
  const nome = (document.getElementById('garcomNomeInput').value || '').trim();
  const email = (document.getElementById('garcomEmailInput').value || '').trim();
  const msgEl = document.getElementById('garcomModalMsg');
  const btn = document.getElementById('garcomSalvarBtn');
  if (!nome || !email) {
    msgEl.textContent = 'Preencha nome e e-mail.';
    return;
  }
  msgEl.textContent = '';
  btn.disabled = true;
  const params = { nome, email };
  if (id) params.id = id;
  fetch('api/garcons_salvar.php', { method: 'POST', body: new URLSearchParams(params) })
    .then((r) => r.json())
    .then((data) => {
      btn.disabled = false;
      if (data.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalGarcom'))?.hide();
        if (data.codigo_acesso) {
          mgMostrarCodigo(data.codigo_acesso, () => window.location.reload());
        } else {
          mgToast('Garçom atualizado com sucesso!');
          window.location.reload();
        }
      } else {
        msgEl.textContent = data.msg || 'Erro ao salvar garçom.';
      }
    })
    .catch(() => {
      btn.disabled = false;
      msgEl.textContent = 'Erro ao salvar garçom.';
    });
}

let mgGarcomCodigoPendenteBtn = null;

document.querySelectorAll('[data-garcom-codigo]').forEach((btn) => {
  btn.addEventListener('click', () => {
    mgGarcomCodigoPendenteBtn = btn;
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalConfirmarCodigo'));
    modal.show();
  });
});

document.getElementById('mgConfirmarCodigoBtn')?.addEventListener('click', () => {
  const btn = mgGarcomCodigoPendenteBtn;
  if (!btn) return;
  const id = btn.dataset.garcomCodigo;
  bootstrap.Modal.getInstance(document.getElementById('modalConfirmarCodigo'))?.hide();
  btn.disabled = true;
  fetch('api/garcons_gerar_codigo.php', { method: 'POST', body: new URLSearchParams({ id }) })
    .then((r) => r.json())
    .then((data) => {
      btn.disabled = false;
      if (data.ok) {
        mgToast('Novo código gerado com sucesso!');
        mgMostrarCodigo(data.codigo_acesso);
      } else {
        mgToast(data.msg || 'Erro ao gerar código.');
      }
    })
    .catch(() => {
      btn.disabled = false;
      mgToast('Erro ao gerar código.');
    });
});

document.querySelectorAll('[data-garcom-toggle]').forEach((input) => {
  input.addEventListener('change', () => {
    const id = input.dataset.garcomToggle;
    const ativo = input.checked ? '1' : '0';
    input.disabled = true;
    fetch('api/garcons_toggle.php', { method: 'POST', body: new URLSearchParams({ id, ativo }) })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          input.checked = !input.checked;
          mgToast('Erro ao atualizar o garçom.');
        } else {
          carregarStatsMg();
        }
      })
      .catch(() => {
        input.checked = !input.checked;
        mgToast('Erro ao atualizar o garçom.');
      })
      .finally(() => {
        input.disabled = false;
      });
  });
});

function mgMostrarCodigo(codigo, aoFechar) {
  document.getElementById('mgCodigoDisplay').textContent = codigo;
  const modalEl = document.getElementById('modalCodigoGerado');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  if (aoFechar) {
    modalEl.addEventListener('hidden.bs.modal', aoFechar, { once: true });
  }
  modal.show();
}

const mgLinkCopiarBtn = document.getElementById('mgLinkCopiarBtn');
mgLinkCopiarBtn?.addEventListener('click', () => {
  const input = document.getElementById('mgLinkAcesso');
  input.select();
  input.setSelectionRange(0, 99999);
  const copiar = () => mgToast('Link copiado!');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(input.value).then(copiar).catch(() => {
      document.execCommand('copy');
      copiar();
    });
  } else {
    document.execCommand('copy');
    copiar();
  }
});

/* ── Pedidos ── */
const MG_STATUS_LABEL = {
  pendente: 'Pendente',
  aceito: 'Aceito',
  preparando: 'Preparando',
  entrega: 'Pronto',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado'
};
const MG_PROXIMO_STATUS = { pendente: 'aceito', aceito: 'preparando', preparando: 'entrega' };
const MG_PROXIMO_LABEL = { pendente: 'Confirmar', aceito: 'Avançar', preparando: 'Marcar pronto' };

let mgPedidosPollTimer = null;

function carregarPedidosMesa() {
  fetch('api/mesas_pedidos.php')
    .then((r) => r.json())
    .then((data) => {
      if (!data.ok) return;
      renderPedidosMesa(data.pedidos || []);
    })
    .catch(() => {});
}

function renderPedidosMesa(pedidos) {
  const wrap = document.getElementById('mgPedidosLista');
  if (!wrap) return;
  if (!pedidos.length) {
    wrap.innerHTML = '<div class="mg-empty"><i class="bi bi-receipt"></i> Nenhum pedido de mesa ainda.</div>';
    return;
  }
  wrap.innerHTML = pedidos.map((p) => {
    const status = p.status || 'pendente';
    const label = MG_STATUS_LABEL[status] || status;
    const proximo = MG_PROXIMO_STATUS[status];
    const proximoLabel = MG_PROXIMO_LABEL[status];
    const podeCancelar = status !== 'finalizado' && status !== 'cancelado';
    const dataHora = p.criado_em ? new Date(p.criado_em.replace(' ', 'T')).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    return `<div class="mg-pedido-card" data-pedido-id="${p.id}">
      <div class="mg-pedido-mesa">${escapeHtmlMg(p.mesa_nome || '—')}</div>
      <div class="mg-pedido-info">
        <div class="mg-pedido-titulo">Pedido #${p.codigo}${p.garcom_nome ? ' · ' + escapeHtmlMg(p.garcom_nome) : ''}</div>
        <div class="mg-pedido-sub">${dataHora}</div>
      </div>
      <div class="mg-pedido-total">R$ ${Number(p.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
      <span class="mg-status-pill mg-status-${status}">${label}</span>
      <div class="mg-pedido-acoes">
        ${proximo ? `<button type="button" class="btn-diggy-primary btn-sm" onclick="mgAvancarPedido(${p.id},'${proximo}')">${proximoLabel}</button>` : ''}
        ${status === 'entrega' ? `<button type="button" class="btn-diggy-primary btn-sm" onclick="mgFinalizarPedido(${p.id})">Dar baixa</button>` : ''}
        ${podeCancelar ? `<button type="button" class="btn btn-outline-secondary btn-sm" onclick="mgCancelarPedido(${p.id})">Cancelar</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function escapeHtmlMg(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function mgAvancarPedido(id, status) {
  fetch('api/pedidos_status.php', { method: 'POST', body: new URLSearchParams({ id, status }) })
    .then((r) => r.json())
    .then((data) => {
      if (data.ok) { carregarPedidosMesa(); carregarStatsMg(); }
      else mgToast('Erro ao atualizar o pedido.');
    })
    .catch(() => mgToast('Erro ao atualizar o pedido.'));
}

function mgFinalizarPedido(id) {
  fetch('api/pedidos_finalizar.php', { method: 'POST', body: new URLSearchParams({ id }) })
    .then((r) => r.json())
    .then((data) => {
      if (data.ok) { carregarPedidosMesa(); carregarStatsMg(); }
      else mgToast('Erro ao finalizar o pedido.');
    })
    .catch(() => mgToast('Erro ao finalizar o pedido.'));
}

function mgCancelarPedido(id) {
  if (!confirm('Cancelar este pedido de mesa?')) return;
  fetch('api/pedidos_cancelar.php', { method: 'POST', body: new URLSearchParams({ id }) })
    .then((r) => r.json())
    .then((data) => {
      if (data.ok) { carregarPedidosMesa(); carregarStatsMg(); }
      else mgToast('Erro ao cancelar o pedido.');
    })
    .catch(() => mgToast('Erro ao cancelar o pedido.'));
}

/* ── Estatísticas do hero (pedidos pendentes / mesas ativas / garçons ativos) ── */
function carregarStatsMg() {
  fetch('api/modo_garcom_stats.php')
    .then((r) => r.json())
    .then((data) => {
      if (!data.ok) return;
      const pend = document.getElementById('mgStatPendentes');
      const mesas = document.getElementById('mgStatMesas');
      const garcons = document.getElementById('mgStatGarcons');
      const badge = document.getElementById('mgTabBadge');
      if (pend) pend.textContent = data.pedidos_pendentes;
      if (mesas) mesas.textContent = data.mesas_ativas;
      if (garcons) garcons.textContent = data.garcons_ativos;
      if (badge) {
        badge.textContent = data.pedidos_pendentes;
        badge.classList.toggle('d-none', data.pedidos_pendentes <= 0);
      }
    })
    .catch(() => {});
}

carregarPedidosMesa();
carregarStatsMg();
mgPedidosPollTimer = setInterval(() => {
  const painel = document.querySelector('.mg-panel[data-mg-panel="pedidos"]');
  if (painel && !painel.classList.contains('d-none')) carregarPedidosMesa();
  carregarStatsMg();
}, 15000);
