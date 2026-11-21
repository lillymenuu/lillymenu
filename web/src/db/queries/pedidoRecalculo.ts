import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { combos, produtos } from "@/db/schema";
import { promoAtiva } from "@/db/queries/catalogo";
import { variacoesProdutoPdv } from "@/db/queries/produtoVariacoesPdv";
import { complementosDoProduto } from "@/db/queries/complementosVenda";
import { montarPerfilLoja } from "@/db/queries/lojaPerfil";
import { validarCupom } from "@/db/queries/cupons";
import { checarCashback } from "@/db/queries/cashback";
import { buscarTaxaAreaPorCep } from "@/db/queries/cepLookup";
import { ignoraPrecoDoProduto, precoComplementos, selecaoDeEscolhidos } from "@/lib/complementos";
import type { CriarPedidoInput, ItemCarrinho } from "@/db/queries/pedidoCriar";

/*
 * Recalculo do pedido do cardapio publico no servidor. Antes, preco dos itens, subtotal, taxas,
 * desconto do cupom e total vinham do navegador e eram gravados como chegavam — qualquer um com o
 * DevTools aberto conseguia pedir um item de R$ 80 por R$ 0,50 ou inventar um desconto.
 *
 * Aqui a conta e refeita com as MESMAS fontes e formulas que o cardapio usa pra mostrar o valor ao
 * cliente (catalogo/promoAtiva, produto-variacoes, complementos, perfil da loja, validarCupom,
 * taxa por area, cashback). Se o total do navegador nao bate com o do servidor, o pedido e recusado
 * (preco mudou desde que o cardapio foi aberto, ou alguem mexeu no payload); se bate, os valores
 * gravados passam a ser os do servidor.
 */

const TOLERANCIA = 0.05;
const QTD_MAXIMA = 999;

const arred = (v: number) => Math.round(v * 100) / 100;

export const MSG_VALORES_ALTERADOS = "Os valores do cardápio foram atualizados. Atualize a página, revise o carrinho e tente de novo.";

type Falha = { ok: false; msg: string };
export type RecalculoResultado = { ok: true; input: CriarPedidoInput } | Falha;

function falha(msg: string): Falha {
  return { ok: false, msg };
}

/** Preco unitario de um item do carrinho, igual ao calculado em store-produto-dialog/store-combo-dialog. */
async function precoUnitarioItem(lojaId: number, item: ItemCarrinho): Promise<number | null> {
  const id = Number(item.id ?? 0);
  if (!id) return null;

  /* Resgate do clube de pontos entra no carrinho por R$ 0,00 (o custo em pontos e validado na transacao). */
  if (item.pontosPendente) return 0;

  const ehCombo = item.tipo === "combo" || (item.combosels != null && item.combosels.length > 0);
  if (ehCombo) {
    const [combo] = await db
      .select({ preco: combos.preco, precoPromocional: combos.preco_promocional, promoDesativado: combos.promo_desativado })
      .from(combos)
      .where(and(eq(combos.id, id), eq(combos.loja_id, lojaId), eq(combos.ativo, true)))
      .limit(1);
    if (!combo) return null;
    return promoAtiva(Number(combo.preco ?? 0), combo.precoPromocional, combo.promoDesativado, null, null).precoFinal;
  }

  const [produto] = await db
    .select({
      preco: produtos.preco,
      precoPromocional: produtos.preco_promocional,
      promoDesativado: produtos.promo_desativado,
      promoDias: produtos.promo_dias,
      promoInicio: produtos.promo_inicio,
      temVariacoes: produtos.tem_variacoes,
    })
    .from(produtos)
    .where(and(eq(produtos.id, id), eq(produtos.loja_id, lojaId), eq(produtos.ativo, true)))
    .limit(1);
  if (!produto) return null;

  const precoProduto = Number(produto.preco ?? 0);
  const precoFinal = promoAtiva(precoProduto, produto.precoPromocional, produto.promoDesativado, produto.promoDias, produto.promoInicio).precoFinal;

  const temSelecao =
    (item.variacaoId ?? 0) > 0 ||
    (item.complementos != null && item.complementos.length > 0) ||
    Object.values(item.selecoesGrupos ?? {}).some((ids) => Array.isArray(ids) && ids.length > 0);
  /* Produto sem opcoes (ou sugestao do cross-sell, que entra sem nada escolhido): preco final do card. */
  if (!produto.temVariacoes && !temSelecao) return precoFinal;

  const [variacoes, complementos] = await Promise.all([variacoesProdutoPdv(lojaId, id), complementosDoProduto(lojaId, id)]);

  let precoBase: number;
  if (produto.temVariacoes) {
    const variacaoId = Number(item.variacaoId ?? 0);
    if (variacaoId > 0) {
      const v = variacoes.variacoes.find((x) => x.id === variacaoId);
      if (!v) return null;
      precoBase = v.preco > 0 ? v.preco : precoProduto;
    } else {
      precoBase = variacoes.variacaoObrigatorio ? 0 : precoProduto;
    }
  } else {
    precoBase = ignoraPrecoDoProduto(complementos) ? 0 : precoFinal;
  }

  let precoGrupos = 0;
  for (const [grupoId, ids] of Object.entries(item.selecoesGrupos ?? {})) {
    if (!Array.isArray(ids) || ids.length === 0) continue;
    const grupo = variacoes.gruposOpcoes.find((g) => g.id === Number(grupoId));
    if (!grupo) return null;
    for (const itemId of ids) {
      const opcao = grupo.itens.find((it) => it.id === Number(itemId));
      if (!opcao) return null;
      precoGrupos += opcao.preco;
    }
  }

  const escolhidos = item.complementos ?? [];
  const selecao = selecaoDeEscolhidos(complementos, escolhidos);
  /* Complemento que nao existe mais (ou de outro produto) nao entra na selecao: recusa em vez de ignorar. */
  const encontrados = Object.values(selecao).reduce((s, g) => s + Object.keys(g).length, 0);
  if (encontrados !== new Set(escolhidos.map((e) => e.id)).size) return null;

  return arred(precoBase + precoGrupos + precoComplementos(complementos, selecao));
}

/**
 * Refaz a conta do pedido do cardapio publico. Devolve o input com os valores do servidor, ou uma
 * falha quando o total enviado nao bate (ou o pedido nao pode ser atendido como foi montado).
 */
export async function recalcularPedidoLoja(input: CriarPedidoInput): Promise<RecalculoResultado> {
  const { lojaId } = input;

  for (const item of input.itens) {
    if (!Number.isInteger(item.qtd) || item.qtd < 1 || item.qtd > QTD_MAXIMA) return falha("Quantidade inválida no carrinho.");
  }

  const itens: ItemCarrinho[] = [];
  for (const item of input.itens) {
    const preco = await precoUnitarioItem(lojaId, item);
    if (preco === null) return falha(`"${item.nome || "Um item"}" não está mais disponível. Atualize a página e revise o carrinho.`);
    itens.push({ ...item, preco });
  }
  const subtotal = arred(itens.reduce((s, i) => s + i.preco * i.qtd, 0));

  const perfil = await montarPerfilLoja(lojaId, { baseUrl: "" });
  const ehEntrega = input.tipo === "entrega";

  /* Pedido minimo: mesma regra do checkout (entrega usa o minimo de entrega; o resto, o de retirada). */
  const minimo = ehEntrega ? (perfil.pedidoMinEntregaAtivo ? perfil.pedidoMinEntrega : 0) : perfil.pedidoMinRetiradaAtivo ? perfil.pedidoMinRetirada : 0;
  if (minimo > 0 && subtotal < minimo) return falha("O pedido não atinge o valor mínimo da loja.");

  /* Taxa de entrega (antes do cupom) — espelha o useMemo taxaEntrega de store-checkout-dialog. */
  let taxaEntrega = 0;
  if (ehEntrega) {
    const entregaGratis = perfil.taxaEntregaGratis && perfil.pedidoMinEntregaAtivo && perfil.pedidoMinEntrega > 0 && subtotal >= perfil.pedidoMinEntrega;
    if (entregaGratis) {
      taxaEntrega = 0;
    } else if (perfil.taxaEntregaTipo === "bairro") {
      const bairro = (input.enderecoPartes?.bairro ?? "").trim().toLowerCase();
      const chave = Object.keys(perfil.taxasBairro).find((k) => k.toLowerCase() === bairro);
      if (chave === undefined) return falha("A loja não entrega no bairro informado.");
      taxaEntrega = Number(perfil.taxasBairro[chave] ?? 0);
    } else if (perfil.taxaEntregaTipo === "area") {
      const cep = (input.enderecoPartes?.cep ?? "").replace(/\D/g, "");
      const area = cep.length === 8 ? await buscarTaxaAreaPorCep(lojaId, cep) : null;
      if (area && !area.atendido) return falha("A loja não entrega no endereço informado.");
      /* As APIs de CEP as vezes falham/limitam a Vercel: sem conseguir localizar, mantem a taxa que o
         cardapio calculou (nunca negativa) em vez de travar o pedido do cliente. */
      taxaEntrega = area ? area.taxa : Math.max(0, Number(input.taxaEntrega ?? 0));
    } else {
      taxaEntrega = perfil.taxaEntrega;
    }
  }

  /* Cupom: revalidado com o subtotal/taxa do servidor. */
  let desconto = 0;
  let taxaFinal = taxaEntrega;
  const cupomCodigo = (input.cupomCodigo ?? "").trim();
  if (cupomCodigo !== "") {
    const cupom = await validarCupom({
      lojaId,
      codigo: cupomCodigo,
      subtotal,
      tipoPedido: input.tipoAgendamento || input.tipo,
      taxaEntrega,
      telefone: input.clienteTelefone,
    });
    if (!cupom.ok) return falha(cupom.msg);
    if (cupom.tipo === "frete") taxaFinal = Math.max(0, taxaEntrega - cupom.valor);
    else desconto = cupom.valor;
  }

  /* Cashback: nunca mais do que o saldo liberado do cliente. */
  let cashback = 0;
  if (input.cashbackUsar && (input.cashbackValor ?? 0) > 0) {
    const cb = await checarCashback(lojaId, input.clienteTelefone);
    const liberado = cb.ok && cb.ativo ? (cb.saldo ?? 0) : 0;
    cashback = arred(Math.min(Number(input.cashbackValor ?? 0), liberado));
  }

  const taxaServico = input.tipo === "mesa" && perfil.taxaServicoAtiva ? arred(subtotal * (perfil.taxaServicoPct / 100)) : 0;
  const totalAntesDaTaxaPagamento = Math.max(0, subtotal - desconto - cashback) + taxaFinal + taxaServico;
  const taxaPagamentoPct = input.formaPagamento === "credito" ? perfil.credTaxaPercent : input.formaPagamento === "debito" ? perfil.debTaxaPercent : 0;
  const taxaMaquininha = arred(totalAntesDaTaxaPagamento * (taxaPagamentoPct / 100));
  const total = arred(totalAntesDaTaxaPagamento + taxaMaquininha);

  if (!Number.isFinite(input.total) || Math.abs(total - input.total) > TOLERANCIA) {
    console.warn(`[pedido-criar] total divergente loja=${lojaId} cliente=${input.total} servidor=${total}`);
    return falha(MSG_VALORES_ALTERADOS);
  }

  return {
    ok: true,
    input: {
      ...input,
      itens,
      subtotal,
      taxaEntrega: taxaFinal,
      taxaServico,
      taxaMaquininha,
      total,
      cupomDesconto: desconto,
      cashbackUsar: cashback > 0,
      cashbackValor: cashback,
    },
  };
}
