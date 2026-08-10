const toastEl = document.getElementById('cuponsToast');
function mostrarToast(msg, ok){
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.background = ok ? '#16a34a' : '#111827';
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2200);
}

const cupomCodigoInput = document.getElementById('cupomCodigoInput');
const cupomCodigoCounter = document.getElementById('cupomCodigoCounter');
const cupomTipoInput = document.getElementById('cupomTipoInput');
const cupomDescontoInput = document.getElementById('cupomDescontoInput');

const cupomEditId = document.getElementById('cupomEditId');
const cupomEditCodigoInput = document.getElementById('cupomEditCodigoInput');
const cupomEditCodigoCounter = document.getElementById('cupomEditCodigoCounter');
const cupomEditTipoInput = document.getElementById('cupomEditTipoInput');
const cupomEditDescontoInput = document.getElementById('cupomEditDescontoInput');
const cupomEditMinimoInput = document.getElementById('cupomEditMinimoInput');
const cupomEditQuantidadeInput = document.getElementById('cupomEditQuantidadeInput');
const cupomEditAtivoInput = document.getElementById('cupomEditAtivoInput');
const cupomEditPrimeiraInput = document.getElementById('cupomEditPrimeiraInput');
const cupomEditPublicoInput = document.getElementById('cupomEditPublicoInput');

function atualizarContadorCupom(inputEl, counterEl){
  if (!inputEl || !counterEl) return;
  const tamanho = inputEl.value.length;
  counterEl.textContent = `${tamanho}/15`;
}

function atualizarTipoCupom(selectEl, descontoEl){
  if (!selectEl || !descontoEl) return;
  const tipo = selectEl.value;
  if (tipo === 'frete') {
    descontoEl.value = '0';
    descontoEl.disabled = true;
  } else {
    descontoEl.disabled = false;
  }
}

if (cupomCodigoInput) {
  cupomCodigoInput.addEventListener('input', () => {
    cupomCodigoInput.value = cupomCodigoInput.value.toUpperCase();
    atualizarContadorCupom(cupomCodigoInput, cupomCodigoCounter);
  });
  atualizarContadorCupom(cupomCodigoInput, cupomCodigoCounter);
}
if (cupomTipoInput) {
  cupomTipoInput.addEventListener('change', () => atualizarTipoCupom(cupomTipoInput, cupomDescontoInput));
  atualizarTipoCupom(cupomTipoInput, cupomDescontoInput);
}
if (cupomEditCodigoInput) {
  cupomEditCodigoInput.addEventListener('input', () => {
    cupomEditCodigoInput.value = cupomEditCodigoInput.value.toUpperCase();
    atualizarContadorCupom(cupomEditCodigoInput, cupomEditCodigoCounter);
  });
}
if (cupomEditTipoInput) {
  cupomEditTipoInput.addEventListener('change', () => atualizarTipoCupom(cupomEditTipoInput, cupomEditDescontoInput));
}

const btnSalvarCupom = document.getElementById('btnSalvarCupom');
const formCupom = document.getElementById('formCupom');
if (btnSalvarCupom && formCupom) {
  btnSalvarCupom.addEventListener('click', () => {
    const codigo = formCupom.codigo.value.trim().toUpperCase();
    const tipo = formCupom.tipo.value;
    const desconto = parseFloat(formCupom.desconto.value || 0);
    const minimo = parseFloat(formCupom.minimo.value || 0);
    const quantidade = parseInt(formCupom.quantidade_total.value || 0, 10);
    const ativo = formCupom.ativo.checked ? '1' : '0';
    const primeira = formCupom.primeira_compra && formCupom.primeira_compra.checked ? '1' : '0';
    const publico = formCupom.publico && formCupom.publico.checked ? '1' : '0';

    if (!codigo) {
      mostrarToast('Informe o codigo do cupom.', false);
      return;
    }
    if (codigo.length > 15) {
      mostrarToast('Codigo deve ter no maximo 15 caracteres.', false);
      return;
    }
    if (tipo !== 'frete' && (!desconto || desconto <= 0)) {
      mostrarToast('Informe um desconto valido.', false);
      return;
    }
    if (tipo === 'percent' && desconto > 100) {
      mostrarToast('Percentual acima de 100%.', false);
      return;
    }
    if (quantidade < 0) {
      mostrarToast('Quantidade invalida.', false);
      return;
    }

    btnSalvarCupom.disabled = true;
    const params = new URLSearchParams();
    params.set('codigo', codigo);
    params.set('tipo', tipo);
    params.set('desconto', tipo === 'frete' ? '0.00' : desconto.toFixed(2));
    params.set('minimo', minimo.toFixed(2));
    params.set('quantidade_total', Number.isNaN(quantidade) ? '0' : String(quantidade));
    params.set('ativo', ativo);
    params.set('primeira_compra', primeira);
    params.set('publico', publico);

    fetch('api/cupons_save.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })
      .then(r => r.json())
      .then(resp => {
        const ok = resp && resp.ok;
        const msg = ok ? (resp.msg || 'Cupom salvo.') : (resp.msg || 'Erro ao salvar.');
        mostrarToast(msg, ok);
        if (ok) {
          window.location.reload();
        }
      })
      .catch(() => mostrarToast('Erro ao salvar.', false))
      .finally(() => {
        btnSalvarCupom.disabled = false;
      });
  });
}

const modalEditarEl = document.getElementById('modalCupomEditar');
const modalEditar = modalEditarEl ? new bootstrap.Modal(modalEditarEl) : null;
const modalExcluirEl = document.getElementById('modalCupomExcluir');
const modalExcluir = modalExcluirEl ? new bootstrap.Modal(modalExcluirEl) : null;
const formCupomEditar = document.getElementById('formCupomEditar');
const btnSalvarCupomEdicao = document.getElementById('btnSalvarCupomEdicao');
const btnApagarCupom = document.getElementById('btnApagarCupom');
const btnConfirmarExcluir = document.getElementById('btnConfirmarExcluir');
let cupomExcluirId = '';

document.querySelectorAll('.cupom-card').forEach(card => {
  card.addEventListener('click', event => {
    if (event.target.closest('.cupom-toggle') || event.target.closest('[data-cupom-copy]')) {
      return;
    }
    if (!modalEditar || !formCupomEditar || !cupomEditCodigoInput) return;
    const data = card.dataset || {};
    if (cupomEditId) cupomEditId.value = data.cupomId || '';
    cupomEditCodigoInput.value = data.cupomCodigo ? data.cupomCodigo.toUpperCase() : '';
    if (cupomEditTipoInput) cupomEditTipoInput.value = data.cupomTipo || 'percent';
    if (cupomEditDescontoInput) cupomEditDescontoInput.value = data.cupomDesconto || '0';
    if (cupomEditMinimoInput) cupomEditMinimoInput.value = data.cupomMinimo || '0';
    if (cupomEditQuantidadeInput) cupomEditQuantidadeInput.value = data.cupomQuantidade || '0';
    if (cupomEditAtivoInput) cupomEditAtivoInput.checked = data.cupomAtivo === '1';
    if (cupomEditPrimeiraInput) cupomEditPrimeiraInput.checked = data.cupomPrimeira === '1';
    if (cupomEditPublicoInput) cupomEditPublicoInput.checked = data.cupomPublico === '1';

    atualizarContadorCupom(cupomEditCodigoInput, cupomEditCodigoCounter);
    atualizarTipoCupom(cupomEditTipoInput, cupomEditDescontoInput);
    if (typeof window.syncCustomSelect === 'function') window.syncCustomSelect(cupomEditTipoInput);
    modalEditar.show();
  });
});

if (btnSalvarCupomEdicao && formCupomEditar) {
  btnSalvarCupomEdicao.addEventListener('click', () => {
    const id = cupomEditId ? cupomEditId.value : '';
    const codigo = formCupomEditar.codigo.value.trim().toUpperCase();
    const tipo = formCupomEditar.tipo.value;
    const desconto = parseFloat(formCupomEditar.desconto.value || 0);
    const minimo = parseFloat(formCupomEditar.minimo.value || 0);
    const quantidade = parseInt(formCupomEditar.quantidade_total.value || 0, 10);
    const ativo = formCupomEditar.ativo.checked ? '1' : '0';
    const primeira = formCupomEditar.primeira_compra && formCupomEditar.primeira_compra.checked ? '1' : '0';
    const publico = formCupomEditar.publico && formCupomEditar.publico.checked ? '1' : '0';

    if (!id) {
      mostrarToast('Cupom invalido.', false);
      return;
    }
    if (!codigo) {
      mostrarToast('Informe o codigo do cupom.', false);
      return;
    }
    if (codigo.length > 15) {
      mostrarToast('Codigo deve ter no maximo 15 caracteres.', false);
      return;
    }
    if (tipo !== 'frete' && (!desconto || desconto <= 0)) {
      mostrarToast('Informe um desconto valido.', false);
      return;
    }
    if (tipo === 'percent' && desconto > 100) {
      mostrarToast('Percentual acima de 100%.', false);
      return;
    }
    if (quantidade < 0) {
      mostrarToast('Quantidade invalida.', false);
      return;
    }

    btnSalvarCupomEdicao.disabled = true;
    const params = new URLSearchParams();
    params.set('id', id);
    params.set('codigo', codigo);
    params.set('tipo', tipo);
    params.set('desconto', tipo === 'frete' ? '0.00' : desconto.toFixed(2));
    params.set('minimo', minimo.toFixed(2));
    params.set('quantidade_total', Number.isNaN(quantidade) ? '0' : String(quantidade));
    params.set('ativo', ativo);
    params.set('primeira_compra', primeira);
    params.set('publico', publico);

    fetch('api/cupons_update.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })
      .then(r => r.json())
      .then(resp => {
        const ok = resp && resp.ok;
        const msg = ok ? (resp.msg || 'Cupom atualizado.') : (resp.msg || 'Erro ao atualizar.');
        mostrarToast(msg, ok);
        if (ok) {
          window.location.reload();
        }
      })
      .catch(() => mostrarToast('Erro ao atualizar.', false))
      .finally(() => {
        btnSalvarCupomEdicao.disabled = false;
      });
  });
}

if (btnApagarCupom && formCupomEditar) {
  btnApagarCupom.addEventListener('click', () => {
    const id = cupomEditId ? cupomEditId.value : '';
    if (!id) {
      mostrarToast('Cupom invalido.', false);
      return;
    }
    cupomExcluirId = id;
    if (modalExcluir) {
      modalExcluir.show();
    }
  });
}

if (btnConfirmarExcluir) {
  btnConfirmarExcluir.addEventListener('click', () => {
    if (!cupomExcluirId) {
      mostrarToast('Cupom invalido.', false);
      return;
    }

    btnConfirmarExcluir.disabled = true;
    fetch('api/cupons_delete.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id: cupomExcluirId })
    })
      .then(r => r.json())
      .then(resp => {
        const ok = resp && resp.ok;
        const msg = ok ? (resp.msg || 'Cupom apagado.') : (resp.msg || 'Erro ao apagar.');
        mostrarToast(msg, ok);
        if (ok) {
          window.location.reload();
        }
      })
      .catch(() => mostrarToast('Erro ao apagar.', false))
      .finally(() => {
        btnConfirmarExcluir.disabled = false;
        cupomExcluirId = '';
        if (modalExcluir) {
          modalExcluir.hide();
        }
      });
  });
}

document.querySelectorAll('[data-cupom-toggle]').forEach(toggle => {
  toggle.addEventListener('change', () => {
    const card = toggle.closest('[data-cupom-id]');
    if (!card) return;
    const id = card.dataset.cupomId;
    const ativo = toggle.checked ? '1' : '0';

    fetch('api/cupons_toggle.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id, ativo })
    })
      .then(r => r.json())
      .then(resp => {
        if (!resp || !resp.ok) {
          toggle.checked = !toggle.checked;
          mostrarToast(resp && resp.msg ? resp.msg : 'Erro ao atualizar.', false);
        }
      })
      .catch(() => {
        toggle.checked = !toggle.checked;
        mostrarToast('Erro ao atualizar.', false);
      });
  });
});

document.querySelectorAll('[data-cupom-copy]').forEach(btn => {
  btn.addEventListener('click', () => {
    const codigo = btn.dataset.cupomCopy || '';
    if (!codigo) return;
    const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
    const link = `${base}pdv.php?cupom=${encodeURIComponent(codigo)}`;
    navigator.clipboard.writeText(link)
      .then(() => mostrarToast('Link copiado.', true))
      .catch(() => mostrarToast('Nao foi possivel copiar.', false));
  });
});
