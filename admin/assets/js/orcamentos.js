  const produtoCards = Array.from(document.querySelectorAll('.orc-product-card'));
  const resumoLista = document.getElementById('orcResumoLista');
  const resumoTotal = document.getElementById('orcResumoTotal');
  const itensInput = document.getElementById('itensJson');
  const totalInput = document.getElementById('orcTotalInput');
  const btnPdf = document.getElementById('btnGerarPdf');
  const btnPdfBottom = document.getElementById('btnGerarPdfBottom');
  const btnRecibo = document.getElementById('btnGerarRecibo');
  const btnReciboBottom = document.getElementById('btnGerarReciboBottom');
  const outputTypeInput = document.getElementById('outputType');
  const buscaInput = document.getElementById('orcBuscaProduto');
  const descontoTipoSelect = document.getElementById('orcDescontoTipo');
  const descontoValorInput = document.getElementById('orcDescontoValor');
  const descontoTipoHidden = document.getElementById('descontoTipo');
  const descontoValorHidden = document.getElementById('descontoValor');
  const descontoErro = document.getElementById('orcDescontoErro');

  const itens = new Map();
  const avulsoNome = document.getElementById('avulsoNome');
  const avulsoPreco = document.getElementById('avulsoPreco');
  const avulsoObs = document.getElementById('avulsoObs');
  const avulsoQtd = document.getElementById('avulsoQtd');
  const avulsoMinus = document.getElementById('avulsoMinus');
  const avulsoPlus = document.getElementById('avulsoPlus');
  const avulsoAddBtn = document.getElementById('avulsoAddBtn');

  const formatarMoeda = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const atualizarResumo = () => {
    resumoLista.innerHTML = '';
    let total = 0;
    if (itens.size === 0) {
      resumoLista.innerHTML = '<div class="text-muted">Adicione produtos para montar o orcamento.</div>';
    } else {
      itens.forEach(item => {
        const subtotal = item.preco * item.qtd;
        total += subtotal;
        const row = document.createElement('div');
        row.className = 'orc-resumo-item';
        const obsHtml = item.obs ? `<br><span>${item.obs}</span>` : '';
        row.innerHTML = `
          <div>
            <strong>${item.nome}</strong><br>
            <span>${item.qtd} x ${formatarMoeda(item.preco)}</span>${obsHtml}
          </div>
          <div>${formatarMoeda(subtotal)}</div>
        `;
        resumoLista.appendChild(row);
      });
    }
    const descontoTipo = descontoTipoSelect.value;
    const descontoValor = parseFloat(descontoValorInput.value || '0');
    let desconto = 0;
    if (descontoTipo === 'percent') {
      desconto = total * (descontoValor / 100);
    } else {
      desconto = descontoValor;
    }
    if (desconto < 0) desconto = 0;
    if (desconto > total) {
      desconto = total;
      descontoErro.classList.add('is-visible');
    } else {
      descontoErro.classList.remove('is-visible');
    }
    const totalFinal = total - desconto;

    resumoTotal.textContent = formatarMoeda(totalFinal);
    totalInput.value = totalFinal.toFixed(2);
    descontoTipoHidden.value = descontoTipo;
    descontoValorHidden.value = desconto.toFixed(2);
    itensInput.value = JSON.stringify(Array.from(itens.values()));
    const habilitar = itens.size > 0;
    btnPdf.disabled = !habilitar;
    btnPdfBottom.disabled = !habilitar;
    btnRecibo.disabled = !habilitar;
    btnReciboBottom.disabled = !habilitar;
  };

  const atualizarCard = (card, qtd) => {
    const input = card.querySelector('.orc-qty-value');
    if (input) input.value = qtd;
  };

  const processarQtd = (card, novaQtd) => {
    const id   = card.dataset.id;
    const nome = card.dataset.nome;
    const preco = parseFloat(card.dataset.preco || '0');
    const atual = itens.get(id) || { id, nome, preco, qtd: 0 };
    atual.qtd = Math.max(0, Math.round(novaQtd));
    if (atual.qtd === 0) {
      itens.delete(id);
    } else {
      itens.set(id, atual);
    }
    atualizarCard(card, atual.qtd);
    atualizarResumo();
  };

  produtoCards.forEach(card => {
    // Botões +/-
    card.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset?.action;
      if (!action || action === 'input') return;
      const id = card.dataset.id;
      const atual = itens.get(id) || { id, nome: card.dataset.nome, preco: parseFloat(card.dataset.preco || '0'), qtd: 0 };
      if (action === 'plus') {
        processarQtd(card, atual.qtd + 1);
      } else if (action === 'minus') {
        processarQtd(card, atual.qtd - 1);
      }
    });

    // Digitação direta no input
    const qtyInput = card.querySelector('.orc-qty-value');
    if (qtyInput) {
      qtyInput.addEventListener('input', () => {
        const val = parseInt(qtyInput.value, 10);
        processarQtd(card, isNaN(val) ? 0 : val);
      });
      qtyInput.addEventListener('blur', () => {
        const id = card.dataset.id;
        const item = itens.get(id);
        qtyInput.value = item ? item.qtd : 0;
      });
      qtyInput.addEventListener('click', (e) => e.stopPropagation());
      qtyInput.addEventListener('focus', () => qtyInput.select());
    }
  });

  buscaInput.addEventListener('input', (e) => {
    const termo = e.target.value.trim().toLowerCase();
    produtoCards.forEach(card => {
      if (!card.dataset.nome) return; // ignora card avulso (sem data-nome)
      const nome = card.dataset.nome.toLowerCase();
      card.style.display = nome.includes(termo) ? '' : 'none';
    });
  });

  descontoTipoSelect.addEventListener('change', atualizarResumo);
  descontoValorInput.addEventListener('input', atualizarResumo);

  const atualizarAvulsoTotal = () => {
    const qtd = parseInt(avulsoQtd.textContent || '1', 10);
    const preco = parseFloat(avulsoPreco.value || '0');
    avulsoAddBtn.textContent = `Adicionar ao pedido ${formatarMoeda(preco * qtd)}`;
  };
  avulsoMinus.addEventListener('click', () => {
    const atual = parseInt(avulsoQtd.textContent || '1', 10);
    avulsoQtd.textContent = Math.max(1, atual - 1);
    atualizarAvulsoTotal();
  });
  avulsoPlus.addEventListener('click', () => {
    avulsoQtd.textContent = atual + 1;
    atualizarAvulsoTotal();
  });
  avulsoPreco.addEventListener('input', atualizarAvulsoTotal);
  avulsoAddBtn.addEventListener('click', () => {
    const nome = avulsoNome.value.trim();
    const preco = parseFloat(avulsoPreco.value || '0');
    const qtd = parseInt(avulsoQtd.textContent || '1', 10);
    const obs = avulsoObs.value.trim();
    if (!nome || preco <= 0) {
      alert('Informe o nome e o preco do produto.');
      return;
    }
    const id = `avulso-${Date.now()}`;
    itens.set(id, { id, nome, preco, qtd, obs });
    atualizarResumo();
    avulsoNome.value = '';
    avulsoPreco.value = '';
    avulsoObs.value = '';
    avulsoQtd.textContent = '1';
    atualizarAvulsoTotal();
    const modalEl = document.getElementById('modalAvulso');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.hide();
  });

  atualizarAvulsoTotal();

  const whatsappInput = document.getElementById('clienteWhatsapp');
  const tipoDocumentoSelect = document.getElementById('clienteTipoDocumento');
  const cpfInput = document.getElementById('clienteCpf');
  const cnpjInput = document.getElementById('clienteCnpj');
  const cpfWrap = document.getElementById('clienteCpfWrap');
  const cnpjWrap = document.getElementById('clienteCnpjWrap');
  const documentoLabelHidden = document.getElementById('clienteDocumentoLabel');
  const documentoValorHidden = document.getElementById('clienteDocumentoValor');
  const btnCopiarWhatsapp = document.getElementById('btnCopiarWhatsapp');
  const cepInput = document.getElementById('clienteCep');
  const ruaInput = document.getElementById('clienteRua');
  const bairroInput = document.getElementById('clienteBairro');
  const cidadeInput = document.getElementById('clienteCidade');
  const estadoInput = document.getElementById('clienteEstado');
  const numeroInput = document.getElementById('clienteNumero');
  const complementoInput = document.getElementById('clienteComplemento');
  const enderecoHidden = document.getElementById('clienteEndereco');
  const enderecoResumo = document.getElementById('orcEnderecoResumo');
  const aplicarMascaraWhatsapp = (valor) => {
    const numeros = valor.replace(/\D/g, '').slice(0, 11);
    if (numeros.length <= 10) {
      return numeros.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (m, ddd, p1, p2) => {
        if (!ddd) return '';
        let out = `(${ddd}`;
        if (ddd.length === 2) out += ') ';
        if (p1) out += p1;
        if (p2) out += `-${p2}`;
        return out;
      }).trim();
    }
    return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };
  whatsappInput.addEventListener('input', (e) => {
    e.target.value = aplicarMascaraWhatsapp(e.target.value);
  });

  const aplicarMascaraCpf = (valor) => {
    const numeros = valor.replace(/\D/g, '').slice(0, 11);
    return numeros
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const aplicarMascaraCnpj = (valor) => {
    const numeros = valor.replace(/\D/g, '').slice(0, 14);
    return numeros
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const atualizarTipoDocumento = () => {
    const tipo = tipoDocumentoSelect.value === 'juridica' ? 'juridica' : 'fisica';
    const isJuridica = tipo === 'juridica';
    cpfWrap.classList.toggle('is-hidden', isJuridica);
    cnpjWrap.classList.toggle('is-hidden', !isJuridica);
    documentoLabelHidden.value = isJuridica ? 'CNPJ' : 'CPF';
    documentoValorHidden.value = isJuridica ? cnpjInput.value.trim() : cpfInput.value.trim();
  };

  cpfInput.addEventListener('input', (e) => {
    e.target.value = aplicarMascaraCpf(e.target.value);
    if (tipoDocumentoSelect.value !== 'juridica') {
      documentoValorHidden.value = e.target.value.trim();
    }
  });

  cnpjInput.addEventListener('input', (e) => {
    e.target.value = aplicarMascaraCnpj(e.target.value);
    if (tipoDocumentoSelect.value === 'juridica') {
      documentoValorHidden.value = e.target.value.trim();
    }
  });

  tipoDocumentoSelect.addEventListener('change', atualizarTipoDocumento);
  atualizarTipoDocumento();

  const aplicarMascaraCep = (valor) => {
    const numeros = valor.replace(/\D/g, '').slice(0, 8);
    if (numeros.length <= 5) return numeros;
    return `${numeros.slice(0,5)}-${numeros.slice(5)}`;
  };
  cepInput.addEventListener('input', (e) => {
    e.target.value = aplicarMascaraCep(e.target.value);
  });

  const atualizarEnderecoCompleto = () => {
    const partes = [];
    const rua = ruaInput.value.trim();
    const numero = numeroInput.value.trim();
    const bairro = bairroInput.value.trim();
    const cidade = cidadeInput.value.trim();
    const estado = estadoInput.value.trim();
    const cep = cepInput.value.trim();
    const complemento = complementoInput.value.trim();
    if (rua) partes.push(rua + (numero ? `, ${numero}` : ''));
    if (bairro) partes.push(bairro);
    if (cidade) partes.push(estado ? `${cidade}/${estado}` : cidade);
    if (cep) partes.push(`CEP: ${cep}`);
    if (complemento) partes.push(complemento);
    enderecoHidden.value = partes.join(' - ');
    if (enderecoHidden.value) {
      enderecoResumo.textContent = enderecoHidden.value;
      enderecoResumo.classList.remove('d-none');
    } else {
      enderecoResumo.textContent = '';
      enderecoResumo.classList.add('d-none');
    }
  };

  [ruaInput, numeroInput, bairroInput, cidadeInput, estadoInput, cepInput, complementoInput].forEach((input) => {
    input.addEventListener('input', atualizarEnderecoCompleto);
  });

  const buscarCep = async (cep) => {
    const limpo = cep.replace(/\D/g, '');
    if (limpo.length !== 8) return;
    try {
      const resp = await fetch(`api/cep_lookup.php?cep=${limpo}`);
      const data = await resp.json();
      if (data && data.ok) {
        if (data.logradouro) ruaInput.value = data.logradouro;
        if (data.bairro) bairroInput.value = data.bairro;
        if (data.cidade) cidadeInput.value = data.cidade;
        if (data.estado) estadoInput.value = data.estado;
        atualizarEnderecoCompleto();
      }
    } catch (err) {
      // silenciar erro de busca
    }
  };

  let cepTimer;
  cepInput.addEventListener('input', (e) => {
    const valor = e.target.value;
    clearTimeout(cepTimer);
    cepTimer = setTimeout(() => buscarCep(valor), 350);
  });

  btnCopiarWhatsapp.addEventListener('click', async () => {
    const valor = whatsappInput.value.trim();
    const apenasNumeros = valor.replace(/\D/g, '');
    if (!apenasNumeros) return;
    try {
      await navigator.clipboard.writeText(apenasNumeros);
      btnCopiarWhatsapp.classList.add('is-copied');
      btnCopiarWhatsapp.innerHTML = '<i class="bi bi-check2-circle"></i> Copiado';
      setTimeout(() => {
        btnCopiarWhatsapp.classList.remove('is-copied');
        btnCopiarWhatsapp.innerHTML = '<i class="bi bi-clipboard"></i> Copiar';
      }, 1400);
    } catch (err) {
      alert('Nao foi possivel copiar.');
    }
  });

  [btnPdf, btnPdfBottom, btnRecibo, btnReciboBottom].forEach((btn) => {
    btn?.addEventListener('click', () => {
      outputTypeInput.value = btn.dataset.outputType || 'orcamento';
    });
  });

  document.getElementById('formOrcamento').addEventListener('submit', (e) => {
    atualizarEnderecoCompleto();
    atualizarResumo();
    atualizarTipoDocumento();
    if (!enderecoHidden.value.trim()) {
      e.preventDefault();
      alert('Informe o endereco do cliente.');
      return;
    }
    const whatsappNumeros = whatsappInput.value.replace(/\D/g, '');
    if (whatsappNumeros.length < 10 || whatsappNumeros.length > 11) {
      e.preventDefault();
      alert('Informe um WhatsApp valido (10 ou 11 digitos).');
      whatsappInput.focus();
      return;
    }
    const cepNumeros = cepInput.value.replace(/\D/g, '');
    if (cepNumeros.length !== 8) {
      e.preventDefault();
      alert('Informe um CEP valido (8 digitos).');
      cepInput.focus();
      return;
    }
    const documentoNumeros = (tipoDocumentoSelect.value === 'juridica' ? cnpjInput.value : cpfInput.value).replace(/\D/g, '');
    if (tipoDocumentoSelect.value === 'juridica' && documentoNumeros.length !== 14) {
      e.preventDefault();
      alert('Informe um CNPJ valido.');
      cnpjInput.focus();
      return;
    }
    if (tipoDocumentoSelect.value !== 'juridica' && documentoNumeros.length !== 11) {
      e.preventDefault();
      alert('Informe um CPF valido.');
      cpfInput.focus();
      return;
    }
    if (itens.size === 0) {
      e.preventDefault();
      alert('Adicione pelo menos um produto ao orcamento.');
    }
  });
