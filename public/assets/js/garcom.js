/* ── Estado ── */
let mesaAtualId = null;
let mesaAtualNome = '';
let carrinho = [];
let prodAtual = null;
const _estoqueConhecido = {}; // {produtoId: quantidade} — alimentado conforme os produtos/combos vao sendo abertos

function fmtR(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}
function gcToast(msg) {
  const wrap = document.getElementById('gcToastWrap');
  const t = document.createElement('div');
  t.className = 'gc-toast';
  t.textContent = msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 250);
  }, 2200);
}
function _escH(s) {
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
}

/* ── Mesas ── */
function gcEscolherMesa(id, nome) {
  mesaAtualId = id;
  mesaAtualNome = nome;
  carrinho = [];
  document.getElementById('gcMesasScreen').classList.add('d-none');
  document.getElementById('gcCardapioScreen').classList.remove('d-none');
  document.getElementById('gcTrocarMesaBtn').classList.remove('d-none');
  document.getElementById('gcMesaAtualLbl').textContent = nome;
  gcAtualizarCartBar();
}
function gcVoltarMesas() {
  if (carrinho.length && !confirm('Voltar agora descarta os itens ainda não enviados dessa mesa. Continuar?')) return;
  mesaAtualId = null;
  carrinho = [];
  document.getElementById('gcCardapioScreen').classList.add('d-none');
  document.getElementById('gcMesasScreen').classList.remove('d-none');
  document.getElementById('gcTrocarMesaBtn').classList.add('d-none');
  gcAtualizarCartBar();
}
function gcIrParaCategoria(id) {
  document.querySelectorAll('[data-cat-btn]').forEach((b) => b.classList.toggle('active', Number(b.dataset.catBtn) === id));
  document.getElementById('gcCat' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Sheets ── */
function gcAbrirSheet(id) {
  document.getElementById(id)?.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function gcFecharSheet(id) {
  document.getElementById(id)?.classList.remove('show');
  document.body.style.overflow = '';
}

/* ── Produto / combo modal ── */
function gcAbrirProduto(id, d) {
  if (d.tipo !== 'combo') {
    _estoqueConhecido[id] = d.estoque;
  }
  prodAtual = { ...d, q: 1, passos: null };
  document.getElementById('pdNome2').textContent = d.nome;
  const pdPrecoEl = document.getElementById('pdPreco');
  if (d.em_promo) {
    pdPrecoEl.innerHTML = '<span class="prod-modal-preco-old">' + fmtR(d.preco_base) + '</span> ' + fmtR(d.preco_final);
  } else {
    pdPrecoEl.textContent = fmtR(d.preco_final);
  }
  document.getElementById('pdQtd').textContent = 1;
  document.getElementById('pdObs').value = '';

  const img = document.getElementById('pdImg');
  const ph = document.getElementById('pdImgPh');
  if (d.imagem) {
    img.src = d.imagem;
    img.classList.remove('d-none');
    ph.classList.add('d-none');
  } else {
    img.classList.add('d-none');
    ph.classList.remove('d-none');
  }

  const comboSec = document.getElementById('pdComboSection');
  const addBtn = document.getElementById('pdAddBtn');
  if (d.tipo === 'combo') {
    comboSec.style.display = '';
    comboSec.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af;font-size:.83rem"><i class="bi bi-hourglass-split"></i> Carregando opções...</div>';
    addBtn.disabled = true;
    addBtn.innerHTML = 'Aguarde...';
    fetch(`api/combo_detalhe.php?id=${id}&loja_id=${CFG.lojaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.passos) {
          prodAtual.passos = data.passos.map((p) => ({ ...p, opcoes: p.opcoes.map((o) => ({ ...o, qty: 0 })) }));
          prodAtual.passos.forEach((p) => p.opcoes.forEach((o) => { _estoqueConhecido[o.id] = o.estoque; }));
          renderComboPassos();
        } else {
          comboSec.style.display = 'none';
          addBtn.disabled = false;
          addBtn.innerHTML = 'Adicionar <span id="pdTotal">' + fmtR(prodAtual.preco_final * prodAtual.q) + '</span>';
        }
      })
      .catch(() => {
        comboSec.style.display = 'none';
        addBtn.disabled = false;
        addBtn.innerHTML = 'Adicionar <span id="pdTotal">' + fmtR(prodAtual.preco_final * prodAtual.q) + '</span>';
      });
  } else {
    comboSec.style.display = 'none';
    comboSec.innerHTML = '';
    if (d.esgotado) {
      addBtn.disabled = true;
      addBtn.innerHTML = 'Esgotado';
    } else {
      addBtn.disabled = false;
      addBtn.innerHTML = 'Adicionar <span id="pdTotal">' + fmtR(d.preco_final * 1) + '</span>';
    }
  }

  const modal = document.getElementById('prodModal');
  modal.classList.toggle('combo-mode', d.tipo === 'combo');
  void modal.offsetHeight;
  document.getElementById('prodModalOverlay').classList.add('show');
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function fecharProdModal() {
  document.getElementById('prodModalOverlay').classList.remove('show');
  document.getElementById('prodModal').classList.remove('show');
  document.body.style.overflow = '';
  const comboSec = document.getElementById('pdComboSection');
  comboSec.style.display = 'none';
  comboSec.innerHTML = '';
  prodAtual = null;
}
function atualizarPdTotal() {
  if (!prodAtual) return;
  const el = document.getElementById('pdTotal');
  if (el) el.textContent = fmtR(prodAtual.preco_final * prodAtual.q);
}
function pdQtd(d) {
  if (!prodAtual) return;
  const novaQtd = Math.max(1, prodAtual.q + d);
  if (d > 0 && prodAtual.tipo !== 'combo' && typeof prodAtual.estoque === 'number') {
    const restante = _estoqueRestante(prodAtual.id, prodAtual.estoque);
    if (novaQtd > restante) {
      gcToast('Quantidade indisponível no momento.');
      return;
    }
  }
  prodAtual.q = novaQtd;
  document.getElementById('pdQtd').textContent = prodAtual.q;
  atualizarPdTotal();
}
function _estoqueRestante(id, estoqueTotal) {
  const jaNoCarrinho = carrinho.filter((i) => i.id === id).reduce((s, i) => s + i.q, 0);
  return Math.max(0, estoqueTotal - jaNoCarrinho);
}
function _consumoTotalNoCarrinho(id) {
  let total = 0;
  carrinho.forEach((item) => {
    if (item.id === id && !item.combo) total += item.q;
    if (item.combo && Array.isArray(item.combosels)) {
      item.combosels.forEach((s) => { if (s.id === id) total += s.qtd * item.q; });
    }
  });
  return total;
}

/* ── Combo: passos/opções ── */
function _passoSatisfeito(passo) {
  const totalSel = passo.opcoes.reduce((s, o) => s + o.qty, 0);
  if (passo.obrigatorio == 1) {
    const min = Math.max(1, parseInt(passo.min_itens || 1));
    return totalSel >= min;
  }
  const max = parseInt(passo.max_itens || 0);
  return max > 0 && totalSel >= max;
}
function renderComboPassos() {
  const sec = document.getElementById('pdComboSection');
  if (!sec || !prodAtual || !prodAtual.passos) return;
  sec.innerHTML = prodAtual.passos.map((passo, pi) => {
    const min = parseInt(passo.min_itens || 0);
    const max = parseInt(passo.max_itens || 0);
    const rep = passo.permite_repetir == 1;
    let sub = '';
    if (min > 0 && max > 0 && min === max) sub = `Escolha exatamente ${min} ${min === 1 ? 'opção' : 'opções'}`;
    else if (min > 0 && max > 0) sub = `Escolha entre ${min} e ${max} opções`;
    else if (min > 0) sub = `Escolha ao menos ${min} ${min === 1 ? 'opção' : 'opções'}`;
    else if (max > 0) sub = `Escolha até ${max} ${max === 1 ? 'opção' : 'opções'}`;
    if (!rep) sub += (sub ? '. Opções não podem ser repetidas' : 'Opções não podem ser repetidas');
    const obrig = passo.obrigatorio == 1;
    const badge = obrig ? `<span style="font-size:.67rem;background:#fff3cd;color:#b45309;border-radius:4px;padding:1px 7px;font-weight:700">Obrigatório</span>` : '';
    const totalSel = passo.opcoes.reduce((s, o) => s + o.qty, 0);
    const opcs = passo.opcoes.map((opc, oi) => {
      const esgotado = !!opc.esgotado;
      const podeAdd = !esgotado && (max === 0 || totalSel < max) && (rep || opc.qty === 0);
      const podeSub = opc.qty > 0;
      const imgHtml = opc.imagem
        ? `<img class="combo-opcao-img" src="${_escH(opc.imagem)}" alt="" loading="lazy">`
        : `<div class="combo-opcao-img-ph"><i class="bi bi-image"></i></div>`;
      return `<div class="combo-opcao-row${esgotado ? ' esgotado' : ''}" data-pi="${pi}" data-oi="${oi}">
        <div class="combo-opcao-info">
          <div class="combo-opcao-nome">${_escH(opc.nome)}</div>
          <div class="combo-opcao-inc">${esgotado ? '<span class="badge-esgotado">Esgotado</span>' : 'Incluído no valor do combo.'}</div>
        </div>
        ${imgHtml}
        <div class="combo-opcao-qty">
          <button class="co-btn" onclick="comboQty(${pi},${oi},-1)" ${podeSub ? '' : 'disabled'}><i class="bi bi-dash"></i></button>
          <span class="combo-opcao-qty-num">${opc.qty}</span>
          <button class="co-btn" onclick="comboQty(${pi},${oi},1)" ${podeAdd ? '' : 'disabled'}><i class="bi bi-plus"></i></button>
        </div>
      </div>`;
    }).join('');
    return `<div class="combo-passo">
      <div class="combo-passo-header">
        <div class="combo-passo-titulo">${_escH(passo.nome)}${badge}</div>
        ${sub ? `<div class="combo-passo-sub">${sub}</div>` : ''}
      </div>
      ${opcs}
    </div>`;
  }).join('');
  _validarComboBtn();
}
function comboQty(pi, oi, delta) {
  if (!prodAtual || !prodAtual.passos) return;
  const passo = prodAtual.passos[pi];
  const opc = passo.opcoes[oi];
  const max = parseInt(passo.max_itens || 0);
  const rep = passo.permite_repetir == 1;
  const totalSel = passo.opcoes.reduce((s, o) => s + o.qty, 0);
  if (delta > 0) {
    if (opc.esgotado) return;
    if (max > 0 && totalSel >= max) return;
    if (!rep && opc.qty > 0) return;
    opc.qty++;
  } else {
    if (opc.qty <= 0) return;
    opc.qty--;
  }
  renderComboPassos();
}
function _validarComboBtn() {
  const btn = document.getElementById('pdAddBtn');
  if (!btn || !prodAtual || !prodAtual.passos) return;
  const valido = prodAtual.passos.every((p) => p.obrigatorio != 1 || _passoSatisfeito(p));
  btn.disabled = !valido;
  btn.innerHTML = `Adicionar <span id="pdTotal">${fmtR(prodAtual.preco_final * prodAtual.q)}</span>`;
}

/* ── Adicionar ao carrinho ── */
function addCart() {
  if (!prodAtual) return;
  if (prodAtual.tipo === 'combo' && prodAtual.passos) {
    for (const passo of prodAtual.passos) {
      if (passo.obrigatorio != 1) continue;
      const min = Math.max(1, parseInt(passo.min_itens || 1));
      const total = passo.opcoes.reduce((s, o) => s + o.qty, 0);
      if (total < min) {
        gcToast('Selecione ao menos ' + min + ' opção em "' + passo.nome + '"');
        return;
      }
    }
    const obs = document.getElementById('pdObs').value.trim();
    const combosels = prodAtual.passos.flatMap((p) => p.opcoes.filter((o) => o.qty > 0).map((o) => ({ id: parseInt(o.id), nome: o.nome, qtd: o.qty })));
    carrinho.push({ id: prodAtual.id, n: prodAtual.nome, p: prodAtual.preco_final, img: prodAtual.imagem, q: prodAtual.q, obs, combosels, combo: true });
    fecharProdModal();
    gcAtualizarCartBar();
    gcToast(prodAtual ? 'Item adicionado!' : 'Item adicionado!');
    return;
  }
  const obs = document.getElementById('pdObs').value.trim();
  const idx = carrinho.findIndex((i) => i.id === prodAtual.id && i.obs === obs && !i.combo);
  if (idx >= 0) {
    carrinho[idx].q += prodAtual.q;
  } else {
    carrinho.push({ id: prodAtual.id, n: prodAtual.nome, p: prodAtual.preco_final, img: prodAtual.imagem, q: prodAtual.q, obs, estoque: prodAtual.estoque });
  }
  gcToast('Item adicionado!');
  fecharProdModal();
  gcAtualizarCartBar();
}

/* ── Barra + sheet do carrinho ── */
function gcAtualizarCartBar() {
  const bar = document.getElementById('gcCartBar');
  const cnt = carrinho.reduce((s, i) => s + i.q, 0);
  const total = carrinho.reduce((s, i) => s + i.p * i.q, 0);
  if (!cnt) {
    bar.classList.add('d-none');
    return;
  }
  bar.classList.remove('d-none');
  document.getElementById('gcCartCount').textContent = cnt;
  document.getElementById('gcCartTotal').textContent = fmtR(total);
}
function gcAbrirCarrinho() {
  gcRenderCarrinho();
  gcAbrirSheet('gcCartSheet');
}
function gcRenderCarrinho() {
  const body = document.getElementById('gcCartBody');
  const footer = document.getElementById('gcCartFooter');
  if (!carrinho.length) {
    body.innerHTML = '<div class="cart-empty"><i class="bi bi-bag"></i>Nenhum item</div>';
    footer.style.display = 'none';
    return;
  }
  footer.style.display = '';
  body.innerHTML = carrinho.map((item, i) => `
    <div class="gc-cart-item">
      <div class="gc-cart-item-img">${item.img ? `<img class="gc-cart-item-img" src="${_escH(item.img)}" alt="">` : '<i class="bi bi-image"></i>'}</div>
      <div class="gc-cart-item-info">
        <div class="gc-cart-item-name">${_escH(item.n)}</div>
        <div class="gc-cart-item-price">${fmtR(item.p * item.q)}</div>
        ${item.combosels && item.combosels.length ? `<div class="gc-cart-combo-sels">${item.combosels.map((s) => `${s.qtd}x ${_escH(s.nome)}`).join(', ')}</div>` : ''}
        ${item.obs ? `<div class="gc-cart-item-obs">${_escH(item.obs)}</div>` : ''}
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="gcAltQ(${i},-1)"><i class="bi bi-dash"></i></button>
        <span class="cart-item-qty-num">${item.q}</span>
        <button class="qty-btn plus" onclick="gcAltQ(${i},1)"><i class="bi bi-plus"></i></button>
      </div>
    </div>
  `).join('');
  document.getElementById('gcCartFooterTotal').textContent = fmtR(carrinho.reduce((s, i) => s + i.p * i.q, 0));
}
function gcAltQ(i, d) {
  const item = carrinho[i];
  if (!item) return;
  if (d > 0 && !item.combo && typeof item.estoque === 'number' && _estoqueRestante(item.id, item.estoque) < d) {
    gcToast('Quantidade indisponível no momento.');
    return;
  }
  if (d > 0 && item.combo && Array.isArray(item.combosels)) {
    for (const s of item.combosels) {
      const estoqueTotal = _estoqueConhecido[s.id];
      if (typeof estoqueTotal !== 'number') continue;
      const novoConsumo = _consumoTotalNoCarrinho(s.id) + s.qtd * d;
      if (novoConsumo > estoqueTotal) {
        gcToast(`Estoque insuficiente de "${s.nome}" para aumentar esse combo.`);
        return;
      }
    }
  }
  item.q += d;
  if (item.q <= 0) carrinho.splice(i, 1);
  gcRenderCarrinho();
  gcAtualizarCartBar();
}

/* ── Enviar pedido ── */
function gcEnviarPedido() {
  if (!mesaAtualId || !carrinho.length) return;
  const btn = document.getElementById('gcEnviarBtn');
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  fetch('api/garcom_pedido_criar.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loja_id: CFG.lojaId, mesa_id: mesaAtualId, itens: carrinho })
  })
    .then((r) => r.json())
    .then((data) => {
      btn.disabled = false;
      btn.textContent = 'Enviar pedido';
      if (data.ok) {
        gcFecharSheet('gcCartSheet');
        document.getElementById('gcConfirmSub').textContent = mesaAtualNome + ' · ' + fmtR(carrinho.reduce((s, i) => s + i.p * i.q, 0));
        document.getElementById('gcConfirmOverlay').classList.add('show');
        carrinho = [];
        gcAtualizarCartBar();
      } else {
        gcToast(data.msg || 'Erro ao enviar o pedido.');
      }
    })
    .catch(() => {
      btn.disabled = false;
      btn.textContent = 'Enviar pedido';
      gcToast('Erro de comunicação. Tente novamente.');
    });
}
function gcFecharConfirmacao() {
  document.getElementById('gcConfirmOverlay').classList.remove('show');
  gcVoltarMesasSemConfirmar();
}
function gcVoltarMesasSemConfirmar() {
  mesaAtualId = null;
  document.getElementById('gcCardapioScreen').classList.add('d-none');
  document.getElementById('gcMesasScreen').classList.remove('d-none');
  document.getElementById('gcTrocarMesaBtn').classList.add('d-none');
}
