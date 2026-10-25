"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  PosCartItem,
  PosCatalogoResposta,
  PosClienteBusca,
  PosClienteStats,
  PosCombo,
  PosProduto,
  PosTipoPedido as PosTipoPedidoValor,
} from "@/lib/pos";
import type { CaixaResumoResposta } from "@/lib/caixa";
import { usePosCart } from "@/components/pos/use-pos-cart";
import { consumoDoCarrinho, estoqueRestanteProduto } from "@/components/pos/estoque-carrinho";
import { usePosReservaEstoque } from "@/components/pos/use-pos-reserva";
import type { PosEndereco } from "@/components/pos/pos-tipo-pedido";
import type { PosPagamentoDados } from "@/components/pos/pos-pagamento-panel";
import type { AgendamentoConfig } from "@/lib/agendamento";

export const ENDERECO_VAZIO: PosEndereco = { rua: "", numero: "", bairro: "", cidade: "", cep: "", complemento: "" };

function montarEnderecoTexto(e: PosEndereco): string {
  const partes: string[] = [];
  if (e.rua) partes.push(e.numero ? `${e.rua}, ${e.numero}` : e.rua);
  if (e.bairro) partes.push(`Bairro: ${e.bairro}`);
  if (e.cidade) partes.push(`Cidade: ${e.cidade}`);
  if (e.cep) partes.push(`CEP: ${e.cep}`);
  if (e.complemento) partes.push(`Complemento: ${e.complemento}`);
  return partes.join(" | ");
}

/* Estado e regras do lancamento de pedido no balcao, compartilhados pelo PDV de computador
   (pos-overlay.tsx) e pelo de celular (pos-mobile.tsx) — as duas telas mudam so o layout. */
export function usePosPedido({
  pedidoEditandoId,
  agendamentoPrefillData,
  onConcluido,
}: {
  pedidoEditandoId?: number | null;
  agendamentoPrefillData?: string | null;
  /** Chamado depois do pedido salvo (e do carrinho/cliente limpos). */
  onConcluido: (resultado: { codigo: number | string | null }) => void;
}) {
  const cart = usePosCart();
  /* Itens do Resumo reservam estoque na loja publica; pedido ja lancado (edicao) ja teve o estoque baixado. */
  usePosReservaEstoque(cart.itens, !!pedidoEditandoId);

  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [catalogo, setCatalogo] = useState<PosCatalogoResposta | null>(null);
  const [caixa, setCaixa] = useState<CaixaResumoResposta | null>(null);

  const [produtoVariacao, setProdutoVariacao] = useState<PosProduto | null>(null);
  const [itemVariacaoEditando, setItemVariacaoEditando] = useState<PosCartItem | null>(null);
  const [comboAberto, setComboAberto] = useState<PosCombo | null>(null);
  const [comboItemEditando, setComboItemEditando] = useState<PosCartItem | null>(null);
  const [avulsoAberto, setAvulsoAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState<PosCartItem | null>(null);

  const [etapa, setEtapa] = useState<"resumo" | "pagamento">("resumo");

  const [cliente, setCliente] = useState<PosClienteBusca | null>(null);
  const [clienteStats, setClienteStats] = useState<PosClienteStats | null>(null);
  const [cashbackAtivo, setCashbackAtivo] = useState(true);
  const [tipoPedido, setTipoPedido] = useState<PosTipoPedidoValor | null>(null);
  const [endereco, setEndereco] = useState<PosEndereco>(ENDERECO_VAZIO);
  const [cupom, setCupom] = useState<{ codigo: string; valor: number } | null>(null);

  const [pagamentoDados, setPagamentoDados] = useState<PosPagamentoDados | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [taxaEntregaConfig, setTaxaEntregaConfig] = useState<{ tipo: string; gratis: boolean; valorFixo: number } | null>(null);
  const [pagamentoConfig, setPagamentoConfig] = useState<{
    fiadoAtivo: boolean;
    taxaCredito: number;
    taxaDebito: number;
    taxaVoucher: number;
  }>({ fiadoAtivo: false, taxaCredito: 0, taxaDebito: 0, taxaVoucher: 0 });
  const [temCupomDisponivel, setTemCupomDisponivel] = useState(false);

  const [entregaModalAberto, setEntregaModalAberto] = useState(false);
  const [taxaEntregaCalculada, setTaxaEntregaCalculada] = useState<number | null>(null);

  const [agendamentoConfig, setAgendamentoConfig] = useState<{ delivery: AgendamentoConfig; retirada: AgendamentoConfig } | null>(null);
  const [agendamento, setAgendamento] = useState<{ data: string; hora: string } | null>(null);
  const [agendamentoModalAberto, setAgendamentoModalAberto] = useState(false);

  const [lojaLink, setLojaLink] = useState<string | null>(null);
  const [lojaNome, setLojaNome] = useState("");
  const [lojaLogo, setLojaLogo] = useState<string | null>(null);

  const [pedidoEditandoCodigo, setPedidoEditandoCodigo] = useState<number | null>(null);
  /* Mesa/garcom/origem do pedido ORIGINAL sendo editado — invisiveis nessa tela (o PDV nao tem UI
     de mesa/garcom), so preservados pra mandar de volta no salvar. Sem isso, editar um pedido de
     mesa do Modo Garcom "soltava" o pedido recriado da mesa/garcom original (ver pdvSalvar.ts). */
  const [mesaIdEdicao, setMesaIdEdicao] = useState<number | null>(null);
  const [garcomIdEdicao, setGarcomIdEdicao] = useState<number | null>(null);
  const [origemEdicao, setOrigemEdicao] = useState<string | null>(null);
  const [temItemComboNaEdicao, setTemItemComboNaEdicao] = useState(false);
  const [pagamentoValoresIniciais, setPagamentoValoresIniciais] = useState<
    { descontoTipo?: "valor" | "percent"; descontoValor?: number } | undefined
  >(undefined);
  const [cashbackUsarValor, setCashbackUsarValor] = useState(0);
  const [cashbackModalAberto, setCashbackModalAberto] = useState(false);
  const [cpfCnpjNota, setCpfCnpjNota] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    Promise.all([
      fetch("/api/pos/catalogo", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/cashcontrol/resumo", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/settings/detalhe", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/coupons", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([cat, cx, cfg, cup]) => {
        if (cat.ok) setCatalogo(cat);
        if (cx.ok) setCaixa(cx);
        if (cfg.ok) {
          setTaxaEntregaConfig({
            tipo: cfg.taxa_entrega.tipo,
            gratis: cfg.taxa_entrega.gratis,
            valorFixo: cfg.taxa_entrega.fixa.valor,
          });
          setAgendamentoConfig(cfg.agendamento);
          setPagamentoConfig({
            fiadoAtivo: Boolean(cfg.pagamento?.fiado_ativo),
            taxaCredito: cfg.pagamento?.credito?.taxa_ativa ? Number(cfg.pagamento.credito.taxa) || 0 : 0,
            taxaDebito: cfg.pagamento?.debito?.taxa_ativa ? Number(cfg.pagamento.debito.taxa) || 0 : 0,
            taxaVoucher: cfg.pagamento?.voucher?.taxa_ativa ? Number(cfg.pagamento.voucher.taxa) || 0 : 0,
          });
          if (cfg.loja?.link_slug) {
            setLojaLink(`${cfg.loja_link_base}${encodeURIComponent(cfg.loja.link_slug)}`);
          }
          if (cfg.loja?.nome) setLojaNome(cfg.loja.nome);
          if (cfg.loja?.perfil) setLojaLogo(cfg.loja.perfil);
        }
        if (cup.ok) {
          // Mesma regra do legado: cupom so aparece se houver pelo menos um
          // ativo e ainda nao esgotado (quantidade_total=0 = ilimitado).
          const disponivel = (cup.cupons as { ativo: boolean; quantidade_total: number; quantidade_usada: number }[]).some(
            (c) => c.ativo && (c.quantidade_total === 0 || c.quantidade_usada < c.quantidade_total)
          );
          setTemCupomDisponivel(disponivel);
        }
      })
      .finally(() => setCarregandoInicial(false));
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Modo edicao: carrega os dados do pedido existente e povoa o carrinho/
  // cliente/tipo. Combos/variacoes/extras nao sao reconstituiveis (o schema
  // legado nunca persistiu essa composicao pra leitura posterior — so texto
  // solto em observacoes) — cada item volta "achatado" (produtoId/nome/qtd/
  // preco/observacoes), igual ao que o PDV antigo tambem faz hoje.
  //
  // So roda depois do catalogo carregar (precisa dele pra achar o estoque
  // de cada produto restaurado — sem isso o campo de quantidade do carrinho
  // nao respeita o estoque em tempo real) e so uma vez (ref, nao dep no
  // array de deps) pra nao duplicar itens se o efeito rodar de novo.
  const itensEdicaoAplicadosRef = useRef(false);
  useEffect(() => {
    if (!pedidoEditandoId || !catalogo || itensEdicaoAplicadosRef.current) return;
    itensEdicaoAplicadosRef.current = true;
    fetch(`/api/ordermanager/pedido-detalhe?id=${pedidoEditandoId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          toast.error(data.msg ?? "Não foi possível carregar o pedido para edição.");
          return;
        }
        const pedido = data.pedido;
        const itens: {
          produto_id: number | null;
          produto_nome: string;
          quantidade: number;
          preco: number;
          observacoes: string | null;
          opcoes: { tipo: "variacao" | "grupo"; grupo_id: number | null; referencia_id: number; titulo: string; nome: string }[];
        }[] = data.itens ?? [];

        setPedidoEditandoCodigo(pedido.codigo ?? pedido.id);
        setMesaIdEdicao(pedido.mesa_id ?? null);
        setGarcomIdEdicao(pedido.garcom_id ?? null);
        setOrigemEdicao(pedido.origem ?? null);
        setCliente({ id: pedido.cliente_id, nome: pedido.nome, telefone: pedido.telefone });
        setCashbackAtivo(!!pedido.cashback_aplicado);
        if (pedido.tipo === "entrega" || pedido.tipo === "retirada" || pedido.tipo === "mesa") {
          setTipoPedido(pedido.tipo);
        }
        if (pedido.endereco_entrega) {
          setEndereco({ ...ENDERECO_VAZIO, rua: pedido.endereco_entrega });
        }

        // Taxa de entrega e desconto/cupom do pedido original precisam ser
        // restaurados pro total calculado aqui bater com o que o servidor
        // recalcula ao salvar — senao a soma dos pagamentos (montada em cima
        // desse total) diverge do total real e o servidor rejeita o salvamento
        // ("a soma dos pagamentos precisa ser igual ao total").
        const taxaEntregaOriginal = Number(pedido.taxa_entrega) || 0;
        if (taxaEntregaOriginal > 0) {
          setTaxaEntregaCalculada(taxaEntregaOriginal);
        }
        const descontoOriginal = Number(pedido.desconto) || 0;
        if (pedido.cupom) {
          // Cupom sobrescreve qualquer desconto manual no servidor (mutuamente
          // exclusivos) — o valor aqui e so uma estimativa pra fechar o total
          // client-side; ao salvar, o codigo e revalidado de verdade.
          setCupom({ codigo: pedido.cupom, valor: descontoOriginal });
        } else if (descontoOriginal > 0) {
          setPagamentoValoresIniciais({ descontoTipo: "valor", descontoValor: descontoOriginal });
        }
        const cashbackUsadoOriginal = Number(pedido.cashback_usado) || 0;
        if (cashbackUsadoOriginal > 0) {
          setCashbackUsarValor(cashbackUsadoOriginal);
        }

        setTemItemComboNaEdicao(itens.some((i) => (i.observacoes ?? "").startsWith("[combo]")));

        itens.forEach((i, idx) => {
          if (!i.produto_nome || i.quantidade <= 0) return;
          const produtoCatalogo = i.produto_id ? catalogo.produtos.find((p) => p.id === i.produto_id) : undefined;
          const variacaoId = i.opcoes.find((o) => o.tipo === "variacao")?.referencia_id ?? null;
          const selecoesGrupos: Record<number, number[]> = {};
          for (const o of i.opcoes) {
            if (o.tipo === "grupo" && o.grupo_id !== null) (selecoesGrupos[o.grupo_id] ??= []).push(o.referencia_id);
          }
          cart.adicionar({
            rowKey: `edicao-${pedidoEditandoId}-${idx}`,
            produtoId: i.produto_id,
            nome: i.produto_nome,
            qtd: i.quantidade,
            preco: Number(i.preco) || 0,
            observacoes: i.observacoes ?? "",
            usarPontos: false,
            imagem: produtoCatalogo?.imagem,
            estoque: produtoCatalogo?.estoque,
            variacaoId,
            selecoesGrupos,
            opcoesSnapshot: i.opcoes.map((o) => ({ tipo: o.tipo, titulo: o.titulo, nome: o.nome })),
          });
        });
      })
      .catch(() => toast.error("Não foi possível carregar o pedido para edição."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoEditandoId, catalogo]);

  function abrirVariacaoOuAdicionar(produto: PosProduto) {
    setItemVariacaoEditando(null);
    setProdutoVariacao(produto);
  }

  function editarItemCarrinho(item: PosCartItem) {
    const produtoDoItem = item.produtoId ? (catalogo?.produtos.find((p) => p.id === item.produtoId) ?? null) : null;
    /* Item de combo com composicao conhecida: reabre o mesmo modal de lancar, ja preenchido, pra trocar opcoes. */
    const comboDoItem = item.comboId && item.combosels?.length ? (catalogo?.combos.find((c) => c.id === item.comboId) ?? null) : null;
    if (comboDoItem) {
      setComboItemEditando(item);
      setComboAberto(comboDoItem);
    } else if (produtoDoItem?.tem_variacoes) {
      setItemVariacaoEditando(item);
      setProdutoVariacao(produtoDoItem);
    } else {
      setItemEditando(item);
    }
  }

  /* Quanto ainda cabe de `produto` considerando TUDO que o carrinho consome (produtos, variacoes e combos). */
  function restanteDoProduto(produto: PosProduto, ignorarRowKey?: string | null) {
    return Math.max(0, estoqueRestanteProduto(produto, catalogo?.produtos ?? [], consumoDoCarrinho(cart.itens, ignorarRowKey)));
  }

  function alterarQtdProduto(produto: PosProduto, delta: number) {
    const rowKey = `produto-${produto.id}`;
    const existente = cart.itens.find((i) => i.rowKey === rowKey);
    const restante = restanteDoProduto(produto);
    if (existente) {
      cart.alterarQtd(rowKey, delta > 0 ? existente.qtd + Math.min(delta, restante) : existente.qtd + delta);
    } else if (delta > 0 && restante > 0) {
      cart.adicionar({
        rowKey,
        produtoId: produto.id,
        nome: produto.nome,
        qtd: Math.min(1, restante),
        preco: produto.preco_promocional ?? produto.preco,
        observacoes: "",
        usarPontos: false,
        imagem: produto.imagem,
        estoque: produto.estoque,
      });
    }
  }

  function definirQtdProduto(produto: PosProduto, qtd: number) {
    const rowKey = `produto-${produto.id}`;
    const existente = cart.itens.find((i) => i.rowKey === rowKey);
    const qtdCapada = Math.min(qtd, (existente?.qtd ?? 0) + restanteDoProduto(produto));
    if (existente) {
      cart.alterarQtd(rowKey, qtdCapada);
    } else if (qtdCapada > 0) {
      cart.adicionar({
        rowKey,
        produtoId: produto.id,
        nome: produto.nome,
        qtd: qtdCapada,
        preco: produto.preco_promocional ?? produto.preco,
        observacoes: "",
        usarPontos: false,
        imagem: produto.imagem,
        estoque: produto.estoque,
      });
    }
  }

  // Pro modo "fixa" o preview e so o valor fixo configurado. Pros modos
  // "bairro"/"dinamica" o valor real vem do modal de entrega (que consulta
  // /api/pos/cep-lookup, mesma logica de geocodificacao/distancia do legado).
  const taxaEntrega =
    tipoPedido !== "entrega" || taxaEntregaConfig?.gratis
      ? 0
      : taxaEntregaCalculada !== null
        ? taxaEntregaCalculada
        : taxaEntregaConfig?.tipo === "fixa"
          ? taxaEntregaConfig.valorFixo
          : 0;

  const cashbackResumoNum = Math.max(0, Math.min(cashbackUsarValor, clienteStats?.cashback ?? cashbackUsarValor));
  const totalResumo = Math.max(0, cart.subtotal + taxaEntrega - (cupom?.valor ?? 0) - cashbackResumoNum);

  // Agendamento nao existe pra consumo local (mesa), igual ao legado.
  const agendamentoCfgAtual =
    tipoPedido === "entrega" ? agendamentoConfig?.delivery : tipoPedido === "retirada" ? agendamentoConfig?.retirada : null;

  // Pedido novo aberto a partir de um dia da tela ScheduledOrders: pre-seleciona
  // o dia e abre direto o modal de horario (so roda uma vez, quando a config de
  // agendamento do tipo atual estiver disponivel e ativa).
  const prefillAplicadoRef = useRef(false);
  useEffect(() => {
    if (!agendamentoPrefillData || prefillAplicadoRef.current || !agendamentoCfgAtual?.ativo) return;
    prefillAplicadoRef.current = true;
    setAgendamento({ data: agendamentoPrefillData, hora: "" });
    setAgendamentoModalAberto(true);
  }, [agendamentoPrefillData, agendamentoCfgAtual]);

  function onTipoPedidoChange(v: PosTipoPedidoValor) {
    const jaEraEntrega = tipoPedido === "entrega";
    setTipoPedido(v);
    if (v === "entrega" && !jaEraEntrega) {
      setEntregaModalAberto(true);
    }
  }

  function irParaPagamento() {
    if (!cliente) {
      toast.error("Selecione um cliente.");
      return;
    }
    if (cart.itens.length === 0) {
      toast.error("Adicione ao menos um item.");
      return;
    }
    if (tipoPedido === "entrega" && !endereco.rua.trim()) {
      toast.error("Informe o endereço de entrega.");
      return;
    }
    setEtapa("pagamento");
  }

  async function finalizarPedido(imprimir: boolean) {
    if (!pagamentoDados || !cliente) return;

    setFinalizando(true);
    try {
      const itensPayload = cart.itens.map((i) => ({
        id: i.produtoId,
        nome: i.nome,
        qtd: i.qtd,
        preco: i.preco,
        observacoes: i.observacoes,
        usar_pontos: i.usarPontos ? 1 : 0,
        ...(i.combosels ? { combosels: i.combosels } : {}),
        ...(i.variacaoId ? { variacao_id: i.variacaoId } : {}),
        ...(i.selecoesGrupos && Object.keys(i.selecoesGrupos).length > 0 ? { selecoes_grupos: i.selecoesGrupos } : {}),
      }));

      const res = await fetch("/api/pos/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: cliente.id,
          tipo: tipoPedido,
          venda_rapida: tipoPedido === "venda_rapida" ? "1" : "0",
          endereco: tipoPedido === "entrega" ? montarEnderecoTexto(endereco) : "",
          distancia_km: 0,
          itens: JSON.stringify(itensPayload),
          taxa_entrega: taxaEntrega,
          // Sempre manda "1" (nao so quando o operador mexeu manualmente na
          // taxa): o POS nunca envia a distancia_km real calculada no lookup
          // de CEP (so o valor final da taxa), entao se o servidor tentasse
          // recalcular do zero pro modo dinamica/area ele usaria distancia 0
          // — divergindo do valor que o operador viu na tela e usou pra
          // montar os pagamentos ("soma dos pagamentos precisa ser igual ao
          // total"). O valor mostrado na tela (calculado via /api/pos/cep-
          // lookup, que ja roda a mesma logica do servidor com a distancia
          // real) e sempre a fonte da verdade.
          taxa_editada: tipoPedido === "entrega" ? "1" : "0",
          agendamento: agendamentoCfgAtual?.ativo && agendamento ? `${agendamento.data}T${agendamento.hora}` : "",
          pagamento: pagamentoDados.pagamentos[0]?.forma ?? "dinheiro",
          pagamentos: JSON.stringify(pagamentoDados.pagamentos),
          pagamento_dividido: pagamentoDados.pagamentoDividido ? "1" : "0",
          valor_pago: String(pagamentoDados.valorPago),
          cupom: cupom?.codigo ?? "",
          desconto_tipo: pagamentoDados.descontoTipo,
          desconto_valor: pagamentoDados.descontoValor,
          cashback_aplicado: cashbackAtivo ? "1" : "0",
          cashback_usado: pagamentoDados.cashbackUsado,
          cpf_cnpj_nota: cpfCnpjNota,
          observacoes_cliente: "",
          caixa_id: caixa?.caixa?.id ?? null,
          offline_uuid: crypto.randomUUID(),
          pedido_edicao_id: pedidoEditandoId ?? null,
          mesa_id_original: mesaIdEdicao,
          garcom_id_original: garcomIdEdicao,
          origem_original: origemEdicao,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao finalizar pedido.");
        return;
      }
      toast.success(pedidoEditandoId ? "Pedido atualizado com sucesso!" : `Pedido #${data.codigo} criado com sucesso!`);
      if (imprimir && window.impressaoQZ) {
        try {
          await Promise.race([
            window.impressaoQZ.imprimirAutomaticoPedido("pdv", data.pedido_id, lojaNome),
            new Promise((resolve) => setTimeout(resolve, 6000)),
          ]);
        } catch (e) {
          console.warn("Falha na impressão automática:", e);
        }
      }
      cart.limpar();
      setCliente(null);
      setClienteStats(null);
      setCupom(null);
      setEndereco(ENDERECO_VAZIO);
      setTaxaEntregaCalculada(null);
      setAgendamento(null);
      setEtapa("resumo");
      onConcluido({ codigo: data.codigo ?? null });
    } catch {
      toast.error("Erro ao finalizar pedido.");
    } finally {
      setFinalizando(false);
    }
  }

  const caixaAberto = caixa?.caixa?.status === "aberto";

  function recarregarCaixa() {
    fetch("/api/cashcontrol/resumo")
      .then((r) => r.json())
      .then((d) => d.ok && setCaixa(d));
  }

  function copiarLojaLink() {
    if (!lojaLink) return;
    navigator.clipboard?.writeText(lojaLink).then(
      () => toast.success("Link copiado."),
      () => toast.error("Não foi possível copiar o link.")
    );
  }

  return {
    cart,
    carregandoInicial,
    catalogo,
    caixaAberto,
    recarregarCaixa,
    produtoVariacao,
    setProdutoVariacao,
    itemVariacaoEditando,
    setItemVariacaoEditando,
    comboAberto,
    setComboAberto,
    comboItemEditando,
    setComboItemEditando,
    avulsoAberto,
    setAvulsoAberto,
    itemEditando,
    setItemEditando,
    etapa,
    setEtapa,
    cliente,
    setCliente,
    clienteStats,
    setClienteStats,
    cashbackAtivo,
    setCashbackAtivo,
    tipoPedido,
    setTipoPedido,
    endereco,
    setEndereco,
    cupom,
    setCupom,
    setPagamentoDados,
    finalizando,
    pagamentoConfig,
    temCupomDisponivel,
    entregaModalAberto,
    setEntregaModalAberto,
    setTaxaEntregaCalculada,
    agendamento,
    setAgendamento,
    agendamentoModalAberto,
    setAgendamentoModalAberto,
    lojaLink,
    lojaNome,
    lojaLogo,
    pedidoEditandoCodigo,
    temItemComboNaEdicao,
    pagamentoValoresIniciais,
    cashbackUsarValor,
    setCashbackUsarValor,
    cashbackModalAberto,
    setCashbackModalAberto,
    cpfCnpjNota,
    setCpfCnpjNota,
    abrirVariacaoOuAdicionar,
    editarItemCarrinho,
    restanteDoProduto,
    alterarQtdProduto,
    definirQtdProduto,
    taxaEntrega,
    cashbackResumoNum,
    totalResumo,
    agendamentoCfgAtual,
    onTipoPedidoChange,
    irParaPagamento,
    finalizarPedido,
    copiarLojaLink,
  };
}

export type UsePosPedidoReturn = ReturnType<typeof usePosPedido>;
