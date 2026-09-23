import "server-only";
import { and, eq, gte, asc, desc, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pedidos, pedidoItens, pontosMovimentacoes } from "@/db/schema";
import { adicionarHorasFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de admin/api/v1/cliente_pedidos.php e cliente_pontos.php: abas
 * "Pedidos" e "Historico de pontos" do modal de cliente.
 */

export type PedidoClienteResumo = { id: number; total: number; tipo: string; criadoEm: string | null; resumo: string };
export type PedidosClienteResultado = { ok: true; pagina: number; paginas: number; total: number; pedidos: PedidoClienteResumo[] } | { ok: false; msg: string };

export async function pedidosCliente(lojaId: number, clienteId: number, periodoInput: number, tipoInput: string, paginaInput: number): Promise<PedidosClienteResultado> {
  if (clienteId <= 0) return { ok: false, msg: "Cliente invalido." };

  const periodo = periodoInput > 0 ? periodoInput : 30;
  const tipo = tipoInput.trim();
  const limite = 3;

  const condicoes = [eq(pedidos.cliente_id, clienteId), eq(pedidos.loja_id, lojaId)];
  if (periodo > 0) condicoes.push(gte(pedidos.criado_em, adicionarHorasFortaleza(-periodo * 24)));
  if (tipo !== "" && tipo !== "todos") condicoes.push(eq(pedidos.tipo, tipo as "retirada" | "entrega" | "mesa"));
  const condicao = and(...condicoes)!;

  const [{ total }] = await db.select({ total: sql<string>`count(*)` }).from(pedidos).where(condicao);
  const totalNum = Number(total);
  const paginas = Math.max(1, Math.ceil(totalNum / limite));
  const pagina = Math.min(Math.max(1, paginaInput), paginas);
  const offset = (pagina - 1) * limite;

  const linhas = await db
    .select({ id: pedidos.id, total: pedidos.total, tipo: pedidos.tipo, criadoEm: pedidos.criado_em })
    .from(pedidos)
    .where(condicao)
    .orderBy(desc(pedidos.criado_em))
    .limit(limite)
    .offset(offset);

  const resumos = new Map<number, string>();
  if (linhas.length > 0) {
    const ids = linhas.map((p) => p.id);

    const itensRaw = await db
      .select({ pedidoId: pedidoItens.pedido_id, produtoNome: pedidoItens.produto_nome, quantidade: pedidoItens.quantidade })
      .from(pedidoItens)
      .where(and(inArray(pedidoItens.pedido_id, ids), eq(pedidoItens.loja_id, lojaId)))
      .orderBy(asc(pedidoItens.id));

    const primeiros = new Map<number, { produtoNome: string | null; quantidade: number | null }>();
    for (const item of itensRaw) {
      if (item.pedidoId === null) continue;
      if (!primeiros.has(item.pedidoId)) primeiros.set(item.pedidoId, { produtoNome: item.produtoNome, quantidade: item.quantidade });
    }

    const contagemRaw = await db
      .select({ pedidoId: pedidoItens.pedido_id, itensTotal: sql<string>`count(*)` })
      .from(pedidoItens)
      .where(and(inArray(pedidoItens.pedido_id, ids), eq(pedidoItens.loja_id, lojaId)))
      .groupBy(pedidoItens.pedido_id);
    const contagem = new Map(contagemRaw.map((c) => [c.pedidoId, Number(c.itensTotal)]));

    for (const p of linhas) {
      const primeiro = primeiros.get(p.id);
      let resumo = "";
      if (primeiro) {
        resumo = `${primeiro.quantidade}x ${primeiro.produtoNome}`;
        const totalItens = contagem.get(p.id) ?? 0;
        if (totalItens > 1) resumo += ` + ${totalItens - 1} itens`;
      }
      resumos.set(p.id, resumo);
    }
  }

  return {
    ok: true,
    pagina,
    paginas,
    total: totalNum,
    pedidos: linhas.map((p) => ({ id: p.id, total: Number(p.total ?? 0), tipo: p.tipo ?? "", criadoEm: p.criadoEm, resumo: resumos.get(p.id) ?? "" })),
  };
}

export type PontoClienteMovimento = { id: number; pedidoId: number | null; tipo: string; pontos: number; saldoAntes: number; saldoDepois: number; criadoEm: string };
export type PontosClienteResultado = { ok: true; pagina: number; paginas: number; total: number; pontos: PontoClienteMovimento[] } | { ok: false; msg: string };

export async function pontosCliente(lojaId: number, clienteId: number, paginaInput: number): Promise<PontosClienteResultado> {
  if (clienteId <= 0) return { ok: false, msg: "Cliente invalido." };

  const limite = 6;
  const [{ total }] = await db.select({ total: sql<string>`count(*)` }).from(pontosMovimentacoes).where(and(eq(pontosMovimentacoes.cliente_id, clienteId), eq(pontosMovimentacoes.loja_id, lojaId)));
  const totalNum = Number(total);
  const paginas = Math.max(1, Math.ceil(totalNum / limite));
  const pagina = Math.min(Math.max(1, paginaInput), paginas);
  const offset = (pagina - 1) * limite;

  const linhas = await db
    .select({ id: pontosMovimentacoes.id, pedidoId: pontosMovimentacoes.pedido_id, tipo: pontosMovimentacoes.tipo, pontos: pontosMovimentacoes.pontos, saldoAntes: pontosMovimentacoes.saldo_antes, saldoDepois: pontosMovimentacoes.saldo_depois, criadoEm: pontosMovimentacoes.criado_em })
    .from(pontosMovimentacoes)
    .where(and(eq(pontosMovimentacoes.cliente_id, clienteId), eq(pontosMovimentacoes.loja_id, lojaId)))
    .orderBy(desc(pontosMovimentacoes.criado_em), desc(pontosMovimentacoes.id))
    .limit(limite)
    .offset(offset);

  return { ok: true, pagina, paginas, total: totalNum, pontos: linhas };
}
