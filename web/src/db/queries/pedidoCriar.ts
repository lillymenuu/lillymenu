import "server-only";
import { and, eq, gt, inArray, or, sql } from "drizzle-orm";
import { db, withTransaction, type NeonTx } from "@/db";
import {
  lojas,
  clientes,
  pedidos,
  pedidoItens,
  pedidoPagamentos,
  produtos,
  estoque,
  cupons,
  cashbackMovimentacoes,
  pontosMovimentacoes,
} from "@/db/schema";
import { getConfig } from "@/db/queries/config";
import { estaAberto } from "@/db/queries/lojaStatus";
import { reservaMapaPdv, aplicarReservaPdv } from "@/db/queries/pdvReservas";
import { baixarEstoque, registrarComponentesCombo } from "@/db/queries/estoqueVinculo";

/*
 * Equivalente de public/api/pedido_criar.php — cria um pedido da loja publica
 * (retirada/entrega; mesa/garcom fica de fora por enquanto, tem endpoint e
 * regras proprias). Fora do escopo desta porta: notificacao por WhatsApp
 * (Evolution API) e o registro em whats_conversas/whats_mensagens, que
 * dependem dela — ficam para quando esse fluxo for portado.
 *
 * Mesma divisao de responsabilidade do PHP: pedido + itens + baixa de estoque
 * + resgate de pontos (se houver) rodam em UMA transacao. Cupom, debito/credito
 * de cashback e credito de pontos ganhos rodam DEPOIS do commit, cada um
 * isolado — se falharem, o pedido ja criado nao e desfeito (mesmo comportamento
 * do original, ver comentario no PHP sobre o bug historico de rollback).
 */

export type ItemCarrinho = {
  id?: number;
  nome: string;
  preco: number;
  qtd: number;
  obs?: string;
  combosels?: { id: number; qtd?: number }[] | null;
  crossSell?: boolean;
  pontosPendente?: boolean;
};

export type CriarPedidoInput = {
  lojaId: number;
  clienteNome: string;
  clienteTelefone: string;
  tipo: "retirada" | "entrega";
  formaPagamento: string;
  endereco?: string;
  subtotal: number;
  taxaEntrega?: number;
  total: number;
  itens: ItemCarrinho[];
  trocoSolicitado?: boolean;
  trocoValor?: number;
  cashbackUsar?: boolean;
  cashbackValor?: number;
  tipoAgendamento?: string;
  agendamento?: { data: string; slot: string } | null;
  cupomCodigo?: string;
  cupomDesconto?: number;
};

export type CriarPedidoResultado = { ok: true; id: number; codigo: number } | { ok: false; msg: string };

function apenasDigitos(tel: string): string {
  return tel.replace(/\D+/g, "");
}

function formatarTelefoneBR(tel: string): string {
  const d = apenasDigitos(tel);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

/** Remove mascara de telefone via SQL, pra comparar com o que foi digitado (com ou sem mascara). */
const telefoneSemMascara = sql<string>`replace(replace(replace(replace(replace(${clientes.telefone},'(',''),')',''),' ',''),'-',''),'+','')`;

async function obterOuCriarCliente(tx: NeonTx, lojaId: number, nome: string, telefoneBruto: string): Promise<number> {
  const telFormatado = formatarTelefoneBR(telefoneBruto);
  const telDigitos = apenasDigitos(telefoneBruto);

  const existente = await tx
    .select({ id: clientes.id })
    .from(clientes)
    .where(and(eq(clientes.loja_id, lojaId), or(eq(telefoneSemMascara, telDigitos), eq(clientes.telefone, telFormatado))))
    .limit(1);

  if (existente.length > 0) {
    await tx.update(clientes).set({ nome }).where(eq(clientes.id, existente[0].id));
    return existente[0].id;
  }

  const [novo] = await tx.insert(clientes).values({ nome, telefone: telFormatado, loja_id: lojaId }).returning({ id: clientes.id });
  return novo.id;
}

/** Soma, por produto, a quantidade necessaria (itens avulsos + componentes de combo). */
function calcularEstoqueNecessario(itens: ItemCarrinho[]): Map<number, number> {
  const mapa = new Map<number, number>();
  for (const item of itens) {
    const qtdItem = Math.max(1, item.qtd || 1);
    if (item.combosels && item.combosels.length > 0) {
      for (const sel of item.combosels) {
        const qtd = (sel.qtd ?? 1) * qtdItem;
        if (sel.id > 0 && qtd > 0) mapa.set(sel.id, (mapa.get(sel.id) ?? 0) + qtd);
      }
    } else if (item.id && item.id > 0) {
      mapa.set(item.id, (mapa.get(item.id) ?? 0) + qtdItem);
    }
  }
  return mapa;
}

function calcularCodigoDisplay(id: number, base: number): number {
  return base > 0 && id > base ? Math.max(1, id - base) : id;
}

/** Saldo de cashback ja liberado (fora do periodo de carencia) — mesma regra do PHP. Sempre chamada fora da transacao. */
async function saldoCashbackLiberado(clienteId: number, lojaId: number, saldoAtual: number): Promise<number> {
  const agora = new Date().toISOString();
  const hoje = agora.slice(0, 10);

  const naoLiberadas = await db.execute<{ valor: string; usado: string }>(sql`
    SELECT m.valor,
      COALESCE((
        SELECT SUM(u.valor) FROM cashback_movimentacoes u
        WHERE u.referencia_id = m.id AND u.tipo IN ('uso','resgate','expirado') AND u.loja_id = m.loja_id
      ), 0) AS usado
    FROM cashback_movimentacoes m
    WHERE m.cliente_id = ${clienteId} AND m.loja_id = ${lojaId} AND m.tipo IN ('entrada','ganho')
      AND m.disponivel_em IS NOT NULL
      AND m.disponivel_em > ${agora}
      AND (m.expira_em IS NULL OR m.expira_em >= ${hoje})
  `);

  let totalNaoLiberado = 0;
  for (const row of naoLiberadas.rows) {
    const d = Number(row.valor) - Number(row.usado);
    if (d > 0) totalNaoLiberado += d;
  }
  return Math.max(0, Math.min(saldoAtual, saldoAtual - totalNaoLiberado));
}

export async function criarPedidoLoja(input: CriarPedidoInput): Promise<CriarPedidoResultado> {
  const { lojaId } = input;
  const nome = input.clienteNome.trim();
  const telefone = apenasDigitos(input.clienteTelefone);

  if (!nome || !telefone) return { ok: false, msg: "Nome e telefone são obrigatórios" };
  if (!input.itens || input.itens.length === 0) return { ok: false, msg: "Nenhum item no carrinho" };

  const lojaAtiva = await db.select({ ativo: lojas.ativo }).from(lojas).where(eq(lojas.id, lojaId)).limit(1);
  if (lojaAtiva.length > 0 && lojaAtiva[0].ativo === false) {
    return { ok: false, msg: "Esta loja nao esta aceitando pedidos no momento." };
  }

  /* checagem de estoque (fecha a brecha de montar o pedido direto na API) */
  const necessario = calcularEstoqueNecessario(input.itens);
  if (necessario.size > 0) {
    const ids = [...necessario.keys()];
    const linhas = await db
      .select({ id: produtos.id, nome: produtos.nome, estoqueQtd: estoque.quantidade })
      .from(produtos)
      .leftJoin(estoque, and(eq(estoque.produto_id, produtos.id), eq(estoque.loja_id, produtos.loja_id)))
      .where(and(inArray(produtos.id, ids), eq(produtos.loja_id, lojaId)));
    const reservasPdv = await reservaMapaPdv(lojaId);
    for (const p of linhas) {
      const preciso = necessario.get(p.id) ?? 0;
      if (preciso > 0 && aplicarReservaPdv(p.estoqueQtd ?? 0, p.id, reservasPdv) < preciso) {
        return { ok: false, msg: `"${p.nome}" está sem estoque suficiente no momento.` };
      }
    }
  }

  /* loja fechada: bloqueia pedido imediato (agendado passa sempre) */
  const pedidoImediato = !(input.tipoAgendamento ?? "").includes("agendada");
  if (pedidoImediato) {
    const receberAtivo = (await getConfig(lojaId, "receber_pedidos_ativo", "1")) === "1";
    if (!receberAtivo || !(await estaAberto(lojaId))) {
      return { ok: false, msg: "A loja está fechada no momento. Escolha entrega agendada ou retirada agendada para continuar." };
    }
  }

  let agendamentoDt: string | null = null;
  if (input.agendamento?.data) {
    const slotStart = (input.agendamento.slot ?? "").split(" - ")[0]?.trim() || "00:00";
    agendamentoDt = `${input.agendamento.data} ${slotStart}:00`;
  }

  const cupomCodigo = (input.cupomCodigo ?? "").trim().toUpperCase();
  const cupomDesconto = input.cupomDesconto ?? 0;
  const cashbackUsar = Boolean(input.cashbackUsar) && (input.cashbackValor ?? 0) > 0;
  let cashbackValorUsar = cashbackUsar ? (input.cashbackValor ?? 0) : 0;

  let pedidoId = 0;
  let clienteId = 0;

  try {
    await withTransaction(async (tx) => {
      clienteId = await obterOuCriarCliente(tx, lojaId, nome, telefone);

      const [novoPedido] = await tx
        .insert(pedidos)
        .values({
          cliente_id: clienteId,
          forma_pagamento: input.formaPagamento,
          total: input.total,
          status: "pendente",
          loja_id: lojaId,
          tipo: input.tipo,
          subtotal: input.subtotal,
          taxa_entrega: input.taxaEntrega ?? 0,
          endereco_entrega: input.endereco ?? "",
          origem: "loja",
          troco: input.trocoSolicitado && (input.trocoValor ?? 0) > 0 ? input.trocoValor : null,
          cashback_usado: cashbackUsar ? cashbackValorUsar : 0,
          cashback_aplicado: cashbackUsar,
          agendamento: agendamentoDt,
          cupom: cupomCodigo || null,
          desconto: cupomDesconto > 0 ? cupomDesconto : 0,
        })
        .returning({ id: pedidos.id });
      pedidoId = novoPedido.id;

      /* codigo de exibicao (respeita sequencia zerada, se configurada) */
      const codigoBaseStr = await getConfig(lojaId, "pedido_codigo_base", "0");
      const codigoBase = parseInt(codigoBaseStr, 10) || 0;
      const codigoDisplay = calcularCodigoDisplay(pedidoId, codigoBase);
      await tx.update(pedidos).set({ codigo: String(codigoDisplay) }).where(eq(pedidos.id, pedidoId));

      /* itens + baixa de estoque */
      for (const item of input.itens) {
        const qtd = Math.max(1, item.qtd || 1);
        const isCombo = Boolean(item.combosels && item.combosels.length > 0);

        const [novoItem] = await tx
          .insert(pedidoItens)
          .values({
            pedido_id: pedidoId,
            produto_nome: item.nome.trim(),
            quantidade: qtd,
            preco: item.preco,
            loja_id: lojaId,
            produto_id: item.id ?? null,
            observacoes: item.obs?.trim() ?? "",
            cross_sell: Boolean(item.crossSell),
          })
          .returning({ id: pedidoItens.id });

        if (!isCombo && item.id) {
          await baixarEstoque(tx, item.id, lojaId, qtd, "pedido", pedidoId);
        }
        if (isCombo && item.combosels) {
          for (const sel of item.combosels) {
            const selQtd = (sel.qtd ?? 1) * qtd;
            if (sel.id > 0 && selQtd > 0) {
              await baixarEstoque(tx, sel.id, lojaId, selQtd, "pedido", pedidoId);
            }
          }
          await registrarComponentesCombo(tx, pedidoId, novoItem.id, item.combosels, qtd, lojaId);
        }
      }

      /* resgate do clube de pontos: debita agora (aborta o pedido inteiro se faltar saldo) */
      const resgates = input.itens.filter((i) => i.pontosPendente && (i.id ?? 0) > 0);
      if (resgates.length > 0) {
        let custoTotal = 0;
        for (const r of resgates) {
          const p = await tx
            .select({ pontosCusto: produtos.pontos_custo })
            .from(produtos)
            .where(and(eq(produtos.id, r.id!), eq(produtos.loja_id, lojaId), eq(produtos.ativo, true), gt(produtos.pontos_custo, 0)))
            .limit(1);
          if (p.length === 0) throw new Error("Um produto resgatado não está mais disponível para resgate.");
          custoTotal += p[0].pontosCusto * Math.max(1, r.qtd || 1);
        }
        const cli = await tx.select({ pontosSaldo: clientes.pontos_saldo }).from(clientes).where(eq(clientes.id, clienteId)).limit(1);
        const saldoAntes = cli[0]?.pontosSaldo ?? 0;
        if (saldoAntes < custoTotal) {
          throw new Error(`Pontos insuficientes. Você tem ${saldoAntes} pts e o resgate custa ${custoTotal} pts.`);
        }
        const saldoDepois = saldoAntes - custoTotal;
        await tx.update(clientes).set({ pontos_saldo: saldoDepois }).where(eq(clientes.id, clienteId));
        await tx.insert(pontosMovimentacoes).values({
          cliente_id: clienteId,
          tipo: "resgate",
          pontos: -custoTotal,
          saldo_antes: saldoAntes,
          saldo_depois: saldoDepois,
          loja_id: lojaId,
        });
      }

      await tx.insert(pedidoPagamentos).values({ pedido_id: pedidoId, forma: input.formaPagamento, valor: input.total, loja_id: lojaId });
    });
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : "Erro interno ao criar o pedido." };
  }

  /* A partir daqui o pedido ja existe — cada passo e independente (mesmo comportamento do PHP). */

  if (cupomCodigo) {
    try {
      await db
        .update(cupons)
        .set({ quantidade_usada: sql`coalesce(${cupons.quantidade_usada}, 0) + 1` })
        .where(and(eq(cupons.codigo, cupomCodigo), eq(cupons.loja_id, lojaId)));
    } catch {
      /* nao interrompe o pedido */
    }
  }

  try {
    const cashbackAtivo = (await getConfig(lojaId, "cashback_ativo", "0")) === "1";
    if (cashbackAtivo) {
      const cashbackPct = Number(await getConfig(lojaId, "cashback_percentual", "0"));

      if (cashbackUsar && cashbackValorUsar > 0) {
        const cli = await db.select({ saldo: clientes.cashback_saldo }).from(clientes).where(eq(clientes.id, clienteId)).limit(1);
        const saldoAtual = cli[0]?.saldo ?? 0;
        const saldoLiberado = await saldoCashbackLiberado(clienteId, lojaId, saldoAtual);
        if (cashbackValorUsar > saldoLiberado + 0.009) {
          cashbackValorUsar = Math.max(0, saldoLiberado);
        }
      }

      if (cashbackUsar && cashbackValorUsar > 0) {
        await db
          .update(clientes)
          .set({ cashback_saldo: sql`greatest(0, ${clientes.cashback_saldo} - ${cashbackValorUsar})` })
          .where(eq(clientes.id, clienteId));
        const cli = await db.select({ saldo: clientes.cashback_saldo }).from(clientes).where(eq(clientes.id, clienteId)).limit(1);
        const saldoDepoisUso = Math.max(0, cli[0]?.saldo ?? 0);
        const saldoAntesUso = saldoDepoisUso + cashbackValorUsar;
        await db.insert(cashbackMovimentacoes).values({
          cliente_id: clienteId,
          pedido_id: pedidoId,
          tipo: "uso",
          valor: cashbackValorUsar,
          saldo_antes: saldoAntesUso,
          saldo_depois: saldoDepoisUso,
          loja_id: lojaId,
        });
      }

      if (cashbackPct > 0) {
        const baseCalc = input.total - (cashbackUsar ? cashbackValorUsar : 0);
        const novoValor = Math.round(((baseCalc * cashbackPct) / 100) * 100) / 100;
        if (novoValor > 0) {
          const cli = await db.select({ saldo: clientes.cashback_saldo }).from(clientes).where(eq(clientes.id, clienteId)).limit(1);
          const saldoAtualPendente = cli[0]?.saldo ?? 0;
          await db.insert(cashbackMovimentacoes).values({
            cliente_id: clienteId,
            pedido_id: pedidoId,
            tipo: "pendente",
            valor: novoValor,
            saldo_antes: saldoAtualPendente,
            saldo_depois: saldoAtualPendente,
            loja_id: lojaId,
          });
        }
      }
    }
  } catch {
    /* mesmo comportamento do PHP: falha aqui nao desfaz o pedido ja criado */
  }

  try {
    const clubeAtivo = (await getConfig(lojaId, "clube_pontos_ativo", "0")) === "1";
    if (clubeAtivo && clienteId > 0) {
      const idsProdutos = [...new Set(input.itens.map((i) => i.id).filter((id): id is number => Boolean(id && id > 0)))];
      let pontosGanhoTotal = 0;
      if (idsProdutos.length > 0) {
        const linhas = await db
          .select({ id: produtos.id, pontosGanho: produtos.pontos_ganho })
          .from(produtos)
          .where(and(inArray(produtos.id, idsProdutos), eq(produtos.loja_id, lojaId)));
        const mapaPontos = new Map(linhas.map((l) => [l.id, l.pontosGanho]));
        for (const item of input.itens) {
          if (!item.id || item.id <= 0 || !item.qtd || item.qtd <= 0) continue;
          if ((item.obs ?? "").trim() === "[Resgate de pontos]") continue;
          pontosGanhoTotal += (mapaPontos.get(item.id) ?? 0) * item.qtd;
        }
      }
      if (pontosGanhoTotal > 0) {
        const cli = await db.select({ pontosSaldo: clientes.pontos_saldo }).from(clientes).where(eq(clientes.id, clienteId)).limit(1);
        const saldoAtual = cli[0]?.pontosSaldo ?? 0;
        await db.insert(pontosMovimentacoes).values({
          cliente_id: clienteId,
          pedido_id: pedidoId,
          tipo: "pendente",
          pontos: pontosGanhoTotal,
          saldo_antes: saldoAtual,
          saldo_depois: saldoAtual,
          loja_id: lojaId,
        });
      }
    }
  } catch {
    /* idem */
  }

  const codigoBaseFinal = parseInt(await getConfig(lojaId, "pedido_codigo_base", "0"), 10) || 0;
  return { ok: true, id: pedidoId, codigo: calcularCodigoDisplay(pedidoId, codigoBaseFinal) };
}
