(() => {
  const STORAGE_KEY = 'lm_impressoras';
  const ESC = '\x1B';
  const GS = '\x1D';

  function listarPerfis() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function salvarPerfis(perfis) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perfis));
  }

  function salvarPerfil(perfil) {
    const perfis = listarPerfis();
    if (!perfil.id) {
      perfil.id = 'imp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    }
    const idx = perfis.findIndex(p => p.id === perfil.id);
    if (idx >= 0) {
      perfis[idx] = perfil;
    } else {
      perfis.push(perfil);
    }
    salvarPerfis(perfis);
    return perfil;
  }

  function excluirPerfil(id) {
    salvarPerfis(listarPerfis().filter(p => p.id !== id));
  }

  function perfisPara(uso) {
    return listarPerfis().filter(p => p.impressaoAutomatica && (p.usoPara === uso || p.usoPara === 'ambos'));
  }

  async function garantirConexao() {
    if (typeof qz === 'undefined') {
      throw new Error('Biblioteca QZ Tray não carregada.');
    }
    // Chamada direta, sem timeout/Promise.race em volta — o teste isolado (teste_qz.php)
    // provou que essa chamada simples funciona; envolver com Promise.race parecia
    // deixar a conexão do QZ Tray num estado inconsistente nas chamadas seguintes.
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }
  }

  async function listarImpressorasSistema() {
    await garantirConexao();
    const encontradas = await qz.printers.find('');
    return Array.isArray(encontradas) ? encontradas : [encontradas];
  }

  function largura(papel) {
    return papel === '80mm' ? 48 : 32;
  }

  function quebrarTexto(texto, cols) {
    texto = String(texto || '');
    if (texto.length <= cols) return [texto];
    const linhas = [];
    let atual = '';
    texto.split(' ').forEach(palavra => {
      if ((atual + ' ' + palavra).trim().length > cols) {
        if (atual) linhas.push(atual.trim());
        atual = palavra;
      } else {
        atual = (atual + ' ' + palavra).trim();
      }
    });
    if (atual) linhas.push(atual);
    return linhas;
  }

  function linhaValor(rotulo, valor, cols) {
    const espaco = cols - rotulo.length - valor.length;
    return rotulo + (espaco > 0 ? ' '.repeat(espaco) : ' ') + valor;
  }

  function formatMoney(v) {
    return parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function tipoLabel(tipo) {
    return { entrega: 'Entrega', retirada: 'Retirada', mesa: 'Mesa' }[tipo] || 'Pedido';
  }

  function formaPagamentoLabel(forma) {
    const mapa = {
      pix: 'Pix', dinheiro: 'Dinheiro', credito: 'Cartão de crédito', debito: 'Cartão de débito',
      voucher: 'Voucher', outro: 'Outro', resgate: 'Resgate de pontos', fiado: 'Fiado',
    };
    return mapa[String(forma || '').toLowerCase()] || (forma || '-');
  }

  // O endereço vem em dois formatos possíveis, dependendo de onde o pedido foi criado:
  // PDV (admin/pdv.js): "Rua X, 600 | Bairro: Y | Cidade: Z | CEP: 12345678 | Complemento: W"
  // Loja pública (loja.js): "Rua X, 600, Complemento, Bairro, Cidade/UF, CEP 12345678"
  function parseEndereco(texto) {
    texto = String(texto || '').trim();
    const resultado = { ruaNumero: '', bairro: '', cidade: '', cep: '', complemento: '' };
    if (!texto) return resultado;

    if (texto.includes(' | ')) {
      texto.split(' | ').map(p => p.trim()).forEach((parte, i) => {
        if (i === 0) { resultado.ruaNumero = parte; return; }
        const m = parte.match(/^([^:]+):\s*(.*)$/);
        if (!m) return;
        const chave = m[1].trim().toLowerCase();
        const valor = m[2].trim();
        if (chave === 'bairro') resultado.bairro = valor;
        else if (chave === 'cidade') resultado.cidade = valor;
        else if (chave === 'cep') resultado.cep = valor;
        else if (chave === 'complemento') resultado.complemento = valor;
      });
      return resultado;
    }

    let restante = texto;
    const cepMatch = restante.match(/,?\s*CEP\s+([\d.\-]+)\s*$/i);
    if (cepMatch) {
      resultado.cep = cepMatch[1];
      restante = restante.slice(0, cepMatch.index);
    }
    const cidadeMatch = restante.match(/,\s*([^,]+\/[A-Za-z]{2})\s*$/);
    if (cidadeMatch) {
      resultado.cidade = cidadeMatch[1].trim();
      restante = restante.slice(0, cidadeMatch.index);
    }
    const partesRestantes = restante.split(',').map(p => p.trim()).filter(Boolean);
    let rua = partesRestantes.shift() || '';
    if (partesRestantes.length && /^\d+[A-Za-z]?$/.test(partesRestantes[0])) {
      rua += ', ' + partesRestantes.shift();
    }
    resultado.ruaNumero = rua;
    if (partesRestantes.length === 2) {
      resultado.complemento = partesRestantes[0];
      resultado.bairro = partesRestantes[1];
    } else if (partesRestantes.length === 1) {
      resultado.bairro = partesRestantes[0];
    }
    return resultado;
  }

  // Cada linha é {texto, bold, big, align, quebra} — "quebra" indica se o texto pode
  // ser quebrado em várias linhas (nomes/observações longas); label:valor já vem
  // pré-formatado com o espaçamento certo pra largura do papel.
  function linha(texto, opts = {}) {
    return { texto, bold: !!opts.bold, big: !!opts.big, align: opts.align || 'left', quebra: !!opts.quebra };
  }

  function construirLinhasCupom(dados, perfil) {
    const cols = largura(perfil.papel);
    const { pedido, itens, pagamentos } = dados;
    const completa = perfil.tipoImpressao === 'completa';
    const linhas = [];

    linhas.push(linha(dados.loja_nome || 'Pedido', { bold: true, big: true, align: 'center' }));
    linhas.push(linha('Pedido #' + sprintf4(pedido.id), { bold: true, big: true, align: 'center' }));
    linhas.push(linha(tipoLabel(pedido.tipo), { bold: true, big: true, align: 'center' }));
    if (pedido.criado_em) {
      linhas.push(linha(new Date(pedido.criado_em.replace(' ', 'T')).toLocaleString('pt-BR'), { align: 'center' }));
    }
    if (dados.id_curto) {
      linhas.push(linha('id: ' + dados.id_curto, { align: 'center' }));
    }
    linhas.push(linha(''));

    // Itens, forma de pagamento, cliente e endereço de entrega são essenciais pra
    // atender o pedido — aparecem sempre, em qualquer modo (Simples ou Completa).
    linhas.push(linha('Itens do pedido'));
    linhas.push(linha(''));
    (itens || []).forEach(item => {
      linhas.push(linha(linhaValor(item.quantidade + ' x ' + item.produto_nome, formatMoney(item.preco * item.quantidade), cols), { quebra: true }));
      if (item.observacoes) {
        const obsItem = item.observacoes;
        const prefixoSel = obsItem.startsWith('[combo]\n') ? '[combo]\n' : (obsItem.startsWith('[complementos]\n') ? '[complementos]\n' : null);
        if (prefixoSel) {
          obsItem.substring(prefixoSel.length).split('\n').filter(l => l.trim()).forEach(l => {
            linhas.push(linha('  • ' + l, { quebra: true }));
          });
        } else {
          linhas.push(linha('  obs: ' + obsItem, { quebra: true }));
        }
      }
      if (completa && item.pontos > 0) {
        linhas.push(linha('   +' + item.pontos + ' pts'));
      }
    });

    linhas.push(linha(''));
    if (completa) {
      linhas.push(linha(linhaValor('Valor dos itens:', formatMoney(pedido.subtotal), cols)));
      if (pedido.tipo === 'entrega' && parseFloat(pedido.taxa_entrega) > 0) {
        linhas.push(linha(linhaValor('Taxa de entrega:', formatMoney(pedido.taxa_entrega), cols)));
      }
      if (parseFloat(dados.cashback_usado) > 0) {
        linhas.push(linha(linhaValor('Cashback usado:', formatMoney(dados.cashback_usado), cols)));
      }
      if (dados.pontos_a_receber > 0) {
        linhas.push(linha(linhaValor('Pontos a receber:', dados.pontos_a_receber + ' pts', cols)));
      }
    }
    linhas.push(linha(linhaValor('Valor total:', formatMoney(pedido.total), cols), { bold: true }));

    const listaPagamentos = (pagamentos && pagamentos.length)
      ? pagamentos
      : (pedido.forma_pagamento ? [{ forma: pedido.forma_pagamento, valor: pedido.valor_pago || pedido.total }] : []);
    if (listaPagamentos.length) {
      linhas.push(linha(''));
      linhas.push(linha('Formas de pagamento:'));
      listaPagamentos.forEach(pg => {
        linhas.push(linha(linhaValor('Metodo:', formaPagamentoLabel(pg.forma), cols)));
        linhas.push(linha(linhaValor('Valor:', formatMoney(pg.valor), cols)));
        if (String(pg.forma || '').toLowerCase() === 'dinheiro') {
          linhas.push(linha(linhaValor('Precisa troco:', parseFloat(pedido.troco) > 0 ? 'Sim' : 'Nao', cols)));
        }
      });
    }

    linhas.push(linha(''));
    linhas.push(linha('Nome:'));
    if (pedido.nome) {
      linhas.push(linha(pedido.nome, { quebra: true }));
    }
    if (pedido.telefone) {
      linhas.push(linha(linhaValor('Telefone:', pedido.telefone, cols)));
    }
    if (completa) {
      if (dados.pedidos_na_loja !== undefined) {
        linhas.push(linha(linhaValor('Pedidos na loja:', String(dados.pedidos_na_loja), cols)));
      }
      if (parseFloat(dados.cashback_ganho) > 0) {
        linhas.push(linha(linhaValor('Cashback ganho:', formatMoney(dados.cashback_ganho), cols)));
      }
    }

    if (pedido.tipo === 'entrega') {
      linhas.push(linha(''));
      linhas.push(linha(pedido.motoboy_nome ? ('Entregador: ' + pedido.motoboy_nome) : 'Entrega da loja', { align: 'center' }));

      if (pedido.endereco_entrega) {
        const end = parseEndereco(pedido.endereco_entrega);
        linhas.push(linha(''));
        linhas.push(linha('Rua:'));
        if (end.ruaNumero) linhas.push(linha(end.ruaNumero, { quebra: true }));
        const bairroCidade = [end.bairro, end.cidade].filter(Boolean).join(' - ');
        if (bairroCidade) linhas.push(linha(bairroCidade, { quebra: true }));
        if (end.cep) {
          linhas.push(linha(''));
          linhas.push(linha(linhaValor('CEP:', end.cep, cols)));
        }
        if (end.complemento) {
          linhas.push(linha('Complemento:'));
          linhas.push(linha(end.complemento, { quebra: true }));
        }
      }
    }

    if (completa) {
      linhas.push(linha(''));
      linhas.push(linha('Loja: ' + (dados.loja_nome || ''), { quebra: true }));
      if (dados.loja_cnpj) {
        linhas.push(linha('CNPJ: ' + dados.loja_cnpj));
      }
    }

    return linhas;
  }

  function construirLinhasTeste(lojaNome) {
    return [
      linha(lojaNome || 'LillyMenu', { bold: true, big: true, align: 'center' }),
      linha('TESTE DE IMPRESSAO', { bold: true, align: 'center' }),
      linha(new Date().toLocaleString('pt-BR'), { align: 'center' }),
      linha(''),
      linha('Se você está lendo isso, a impressora está configurada corretamente.', { quebra: true }),
    ];
  }

  function sprintf4(n) {
    return String(parseInt(n, 10) || 0).padStart(4, '0');
  }

  function renderizarEscPos(linhas, papel) {
    const cols = largura(papel);
    let t = ESC + '@';
    linhas.forEach(l => {
      t += ESC + 'a' + (l.align === 'center' ? '\x01' : '\x00');
      if (l.bold) t += ESC + 'E' + '\x01';
      if (l.big) t += ESC + '!' + '\x30';
      const textos = l.quebra ? quebrarTexto(l.texto, cols) : [l.texto];
      textos.forEach(txt => { t += txt + '\n'; });
      if (l.big) t += ESC + '!' + '\x00';
      if (l.bold) t += ESC + 'E' + '\x00';
    });
    t += '\n\n\n';
    t += GS + 'V' + '\x01';
    return t;
  }

  function escapeHtmlCupom(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderizarHtmlPreview(linhas, papel) {
    const cols = largura(papel);
    return linhas.map(l => {
      const textos = l.quebra ? quebrarTexto(l.texto, cols) : [l.texto];
      return textos.map(txt => {
        let html = escapeHtmlCupom(txt) || '&nbsp;';
        if (l.bold) html = '<strong>' + html + '</strong>';
        if (l.big) html = '<span style="font-size:1.3em">' + html + '</span>';
        const alinhamento = l.align === 'center' ? 'text-align:center' : 'text-align:left';
        return `<div style="${alinhamento}">${html}</div>`;
      }).join('');
    }).join('');
  }

  async function enviar(perfil, textoEscPos) {
    await garantirConexao();
    const config = qz.configs.create(perfil.qzPrinterName, { copies: perfil.copias || 1 });
    await qz.print(config, [{ type: 'raw', format: 'plain', data: textoEscPos }]);
  }

  async function imprimirPedido(pedidoDetalhe, perfil, lojaNome) {
    const dados = Object.assign({}, pedidoDetalhe, { loja_nome: pedidoDetalhe.loja_nome || lojaNome });
    const texto = renderizarEscPos(construirLinhasCupom(dados, perfil), perfil.papel);
    return enviar(perfil, texto);
  }

  async function imprimirTeste(perfil, lojaNome) {
    const texto = renderizarEscPos(construirLinhasTeste(lojaNome), perfil.papel);
    return enviar(perfil, texto);
  }

  function visualizarPedido(pedidoDetalhe, perfil, lojaNome) {
    const dados = Object.assign({}, pedidoDetalhe, { loja_nome: pedidoDetalhe.loja_nome || lojaNome });
    return renderizarHtmlPreview(construirLinhasCupom(dados, perfil), perfil.papel);
  }

  function visualizarTeste(perfil, lojaNome) {
    return renderizarHtmlPreview(construirLinhasTeste(lojaNome), perfil.papel);
  }

  async function imprimirManual(pedidoId, lojaNome, uso) {
    uso = uso || 'cozinha';
    const perfis = listarPerfis().filter(p => p.usoPara === uso || p.usoPara === 'ambos');
    if (!perfis.length) {
      throw new Error('Nenhuma impressora configurada. Configure em Configurações > Impressão.');
    }
    const resp = await fetch('api/pdv_detalhe.php?pedido_id=' + pedidoId);
    const dados = await resp.json();
    if (!dados.ok) {
      throw new Error('Não foi possível carregar os dados do pedido.');
    }
    for (const perfil of perfis) {
      await imprimirPedido(dados, perfil, lojaNome);
    }
  }

  async function imprimirAutomaticoPedido(uso, pedidoId, lojaNome) {
    const perfis = perfisPara(uso);
    if (!perfis.length) return;
    try {
      const resp = await fetch('api/pdv_detalhe.php?pedido_id=' + pedidoId);
      const dados = await resp.json();
      if (!dados.ok) return;
      for (const perfil of perfis) {
        try {
          await imprimirPedido(dados, perfil, lojaNome);
        } catch (e) {
          console.warn('Falha ao imprimir automaticamente (' + perfil.nome + '):', e);
        }
      }
    } catch (e) {
      console.warn('Falha ao buscar detalhe do pedido para impressão automática:', e);
    }
  }

  window.impressaoQZ = {
    listarPerfis,
    salvarPerfil,
    excluirPerfil,
    listarImpressorasSistema,
    imprimirPedido,
    imprimirManual,
    imprimirTeste,
    imprimirAutomaticoPedido,
    visualizarPedido,
    visualizarTeste,
    garantirConexao,
  };
})();
